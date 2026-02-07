import { Transform, TransformCallback } from 'stream';
import type { StrictJsonOptions } from './types.js';
import { isKeyAllowed } from './utils.js';

interface ParserState {
  inString: boolean;
  escapeNext: boolean;
  inObject: boolean;
  inArray: boolean;
  objectDepth: number;
  arrayDepth: number;
  currentKey: string;
  keysInCurrentObject: Set<string>;
  pathStack: string[];
  buffer: string;
  completed: boolean;
  error: Error | null;
}

const INITIAL_STATE: ParserState = {
  inString: false,
  escapeNext: false,
  inObject: false,
  inArray: false,
  objectDepth: 0,
  arrayDepth: 0,
  currentKey: '',
  keysInCurrentObject: new Set(),
  pathStack: ['$'],
  buffer: '',
  completed: false,
  error: null,
};

/**
 * Streaming JSON parser that detects duplicate keys incrementally.
 * Processes data in chunks without storing the entire JSON in memory.
 */
export class StreamingJsonParser extends Transform {
  private state: ParserState;
  private options?: StrictJsonOptions;
  private readonly maxDepth: number;
  private readonly dangerousKeys: string[];
  private readonly enablePrototypeProtection: boolean;
  private readonly whitelist?: string[];
  private readonly blacklist?: string[];

  constructor(options?: StrictJsonOptions) {
    super({ decodeStrings: false, encoding: 'utf8' });
    this.state = { ...INITIAL_STATE };
    this.options = options;
    this.maxDepth = options?.maxDepth ?? 20;
    this.dangerousKeys = options?.dangerousKeys || ['__proto__', 'constructor', 'prototype'];
    this.enablePrototypeProtection = options?.enablePrototypePollutionProtection !== false;
    this.whitelist = options?.whitelist;
    this.blacklist = options?.blacklist;
  }

  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.state.completed || this.state.error) {
      callback();
      return;
    }

    try {
      this.state.buffer += chunk.toString('utf8');
      this.processBuffer();
      callback();
    } catch (error) {
      this.state.error = error as Error;
      this.emit('error', error);
      callback(error);
    }
  }

  _flush(callback: TransformCallback): void {
    if (this.state.error) {
      callback(this.state.error);
      return;
    }

    if (!this.state.completed) {
      const error = new Error('Incomplete JSON');
      this.state.error = error;
      this.emit('error', error);
      callback(error);
      return;
    }

    callback();
  }

  private processBuffer(): void {
    const { buffer } = this.state;
    let i = 0;

    while (i < buffer.length && !this.state.completed) {
      const char = buffer[i];

      if (this.state.inString) {
        if (this.state.escapeNext) {
          this.state.escapeNext = false;
          i++;
          continue;
        }

        if (char === '\\') {
          this.state.escapeNext = true;
          i++;
          continue;
        }

        if (char === '"') {
          this.state.inString = false;
        }
      } else {
        switch (char) {
          case '"':
            this.state.inString = true;
            this.processStringStart(buffer, i);
            break;

          case '{':
            this.state.objectDepth++;
            this.state.inObject = true;
            this.state.keysInCurrentObject = new Set();
            break;

          case '}':
            if (this.state.objectDepth > 0) {
              this.state.objectDepth--;
              this.state.keysInCurrentObject.clear();
              if (this.state.pathStack.length > 1) {
                this.state.pathStack.pop();
              }
            }
            // Check if we've returned to root level
            if (this.state.objectDepth === 0 && this.state.arrayDepth === 0) {
              this.state.completed = true;
            }
            break;

          case '[':
            this.state.arrayDepth++;
            this.state.inArray = true;
            break;

          case ']':
            if (this.state.arrayDepth > 0) {
              this.state.arrayDepth--;
              // Check if we've returned to root level
              if (this.state.objectDepth === 0 && this.state.arrayDepth === 0) {
                this.state.completed = true;
              }
            }
            break;

          case ':':
            this.processColon();
            break;
        }
      }

      i++;
    }

    // Keep only the last incomplete chunk for next iteration
    // This helps with memory efficiency
    if (!this.state.completed) {
      const lastBraceIndex = Math.max(
        buffer.lastIndexOf('{'),
        buffer.lastIndexOf('['),
        buffer.lastIndexOf(':'),
      );
      if (lastBraceIndex >= 0 && i > lastBraceIndex) {
        this.state.buffer = buffer.slice(Math.max(0, lastBraceIndex));
      } else {
        this.state.buffer = '';
      }
    } else {
      this.state.buffer = '';
    }
  }

  private processStringStart(buffer: string, pos: number): void {
    if (!this.state.inObject || this.state.currentKey !== '') {
      return;
    }

    // Find the end of this string
    let endPos = pos + 1;
    let escapeNext = false;

    while (endPos < buffer.length) {
      const char = buffer[endPos];
      
      if (escapeNext) {
        escapeNext = false;
        endPos++;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        endPos++;
        continue;
      }

      if (char === '"') {
        break;
      }

      endPos++;
    }

    if (endPos < buffer.length) {
      const keyValue = buffer.slice(pos + 1, endPos);
      this.state.currentKey = keyValue;
      this.validateKey(keyValue);
    }
  }

  private processColon(): void {
    if (!this.state.inObject || this.state.currentKey === '') {
      return;
    }

    // Check for duplicate key
    if (this.state.keysInCurrentObject.has(this.state.currentKey)) {
      const path = this.getCurrentPath();
      throw new Error(`Duplicate key '${this.state.currentKey}' at ${path}`);
    }

    this.state.keysInCurrentObject.add(this.state.currentKey);
    this.state.pathStack.push(this.state.currentKey);
    this.state.currentKey = '';

    // Check depth limit
    if (this.state.objectDepth + this.state.arrayDepth > this.maxDepth) {
      throw new Error(`Depth limit exceeded: ${this.state.objectDepth + this.state.arrayDepth}`);
    }
  }

  private getCurrentPath(): string {
    return this.state.pathStack.join('.');
  }

  private validateKey(key: string): void {
    const path = this.getCurrentPath();
    const keyPath = `${path}.${key}`;

    // Check whitelist/blacklist
    if (this.whitelist !== undefined || this.blacklist !== undefined) {
      if (!isKeyAllowed(keyPath, this.whitelist, this.blacklist)) {
        throw new Error(`Key '${key}' at ${keyPath} is not allowed`);
      }
    }

    // Check prototype pollution
    if (this.enablePrototypeProtection && this.dangerousKeys.includes(key)) {
      throw new Error(`Prototype pollution detected: dangerous key '${key}' at ${keyPath}`);
    }
  }
}

/**
 * Parse JSON from a stream with duplicate key detection.
 * @param stream Readable stream containing JSON data
 * @param options Parser options
 * @returns Promise that resolves with parsed JSON object
 */
export async function parseJsonStream(
  stream: NodeJS.ReadableStream,
  options?: StrictJsonOptions,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const parser = new StreamingJsonParser(options);
    const chunks: Buffer[] = [];

    parser.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    parser.on('end', () => {
      try {
        // Combine all chunks and parse
        const buffer = Buffer.concat(chunks);
        const jsonStr = buffer.toString('utf8');
        const parsed = JSON.parse(jsonStr);
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });

    parser.on('error', reject);

    stream.pipe(parser);
  });
}

/**
 * Check if streaming parser should be used based on body size and options.
 */
export function shouldUseStreaming(
  contentLength: number | undefined,
  options?: StrictJsonOptions,
): boolean {
  if (!options?.enableStreaming) {
    return false;
  }

  const threshold = options.streamingThreshold ?? 100 * 1024; // 100KB default

  if (typeof contentLength === 'number' && contentLength >= threshold) {
    return true;
  }

  return false;
}
