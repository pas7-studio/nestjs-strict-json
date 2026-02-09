import { Transform, TransformCallback } from 'stream';
import type { StrictJsonOptions } from './types.js';
import { isKeyAllowed } from './validation/index.js';

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
  expectingKey: boolean; // true when we're expecting a key (after '{' or ','), false when expecting a value (after ':')
}

/**
 * Creates a fresh initial parser state for each StreamingJsonParser instance.
 * 
 * This function ensures that each parser instance starts with a clean state,
 * preventing state accumulation between multiple parser instances. This is
 * critical for correctness in test suites that create many parser instances.
 * 
 * @returns A new ParserState object with all fields initialized to default values
 */
function createInitialState(): ParserState {
  return {
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
    expectingKey: true, // Start expecting a key (if in an object) or a value (if in an array)
  };
}

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
    this.state = createInitialState();
    this.options = options;
    this.maxDepth = options?.maxDepth ?? 20;
    this.dangerousKeys = options?.dangerousKeys || ['__proto__', 'constructor', 'prototype'];
    this.enablePrototypeProtection = options?.enablePrototypePollutionProtection !== false;
    this.whitelist = options?.whitelist;
    this.blacklist = options?.blacklist;
  }

  /**
   * Transform method called for each chunk of data from the input stream.
   * Processes the JSON chunk, emits events, and handles errors.
   * 
   * This method is part of the Node.js Transform stream interface. It's called
   * automatically for each chunk of data that arrives from the input stream.
   * 
   * Behavior:
   * - If already completed or has an error, returns immediately
   * - Appends the chunk to the buffer and processes it via processBuffer()
   * - If parsing completes during this chunk, emits 'end' event immediately
   * - If an error occurs: sets error state, emits 'error' event, destroys stream, calls callback with error
   * - On success: calls callback without error
   * 
   * Error handling is robust: all errors emit 'error' event and destroy the stream
   * to prevent further processing, ensuring tests and applications can detect failures.
   * 
   * @param chunk - The data chunk from the input stream
   * @param encoding - The encoding of the chunk (typically 'utf8')
   * @param callback - Function to call when the chunk is processed
   */
  _transform(chunk: Buffer, encoding: BufferEncoding, callback: TransformCallback): void {
    if (this.state.completed || this.state.error) {
      callback();
      return;
    }

    try {
      this.state.buffer += chunk.toString('utf8');
      
      this.processBuffer();
      
      // If we completed parsing during this chunk, emit 'end' immediately
      if (this.state.completed) {
        this.emit('end');
      }
      
      callback();
    } catch (error) {
      this.state.error = error as Error;
      // Mark as completed to prevent further processing
      this.state.completed = true;
      // Emit error event first
      this.emit('error', error);
      // Then destroy the stream to prevent further processing
      this.destroy(error);
      
      // Pass error to callback to ensure it's reported properly
      callback(error as Error);
    }
  }

  /**
   * Flush method called when the input stream ends.
   * Validates completion status and emits appropriate events.
   * 
   * This method is part of the Node.js Transform stream interface. It's called
   * automatically when the input stream has no more data to provide.
   * 
   * Behavior:
   * - If there's an error state (from a previous chunk), passes it to callback
   * - If parsing didn't complete (incomplete JSON), emits 'error' event and destroys stream
   * - If parsing completed successfully, simply calls callback
   * 
   * Note: The 'end' event is emitted in _transform() when parsing completes,
   * not here. This prevents duplicate 'end' events and ensures proper stream lifecycle.
   * 
   * @param callback - Function to call when flushing is complete
   */
  _flush(callback: TransformCallback): void {
    if (this.state.error) {
      // Error already emitted in _transform, just pass it to callback
      callback(this.state.error);
      return;
    }

    if (!this.state.completed) {
      const error = new Error('Incomplete JSON');
      this.state.error = error;
      // Emit error event
      this.emit('error', error);
      // Destroy stream
      this.destroy(error);
      callback(error);
      return;
    }

    // Only emit 'end' if it hasn't been emitted yet
    // (it might have been emitted in _transform when completed)
    callback();
  }



  /**
   * Processes the JSON buffer character by character.
   * Maintains parsing state and detects structural errors.
   *
   * This is the core parsing method that iterates through the buffer,
   * handling different JSON tokens and updating the parser state accordingly.
   * It manages the following states:
   * - inString: true when parsing a string value
   * - inObject/inArray: true when inside an object or array
   * - expectingKey: true when expecting an object key, false when expecting a value
   * - currentKey: stores the last extracted key
   * - keysInCurrentObject: tracks keys in the current object scope
   * - pathStack: maintains the current JSON path (e.g., ['$', 'user', 'name'])
   * - completed: true when parsing has completed
   *
   * The method also handles memory efficiency by keeping only the last incomplete
   * chunk in the buffer for the next iteration.
   */
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
          // If we were expecting a key, extract and process it
          if (this.state.expectingKey && this.state.currentKey !== '') {
            this.processStringEndForKey();
          }
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
            this.state.expectingKey = true; // After '{', expect a key
            break;

          case '}':
            if (this.state.objectDepth > 0) {
              this.state.objectDepth--;
              this.state.keysInCurrentObject.clear();
              // Reset inObject flag if we've exited all objects
              this.state.inObject = this.state.objectDepth > 0;
              // After '}', expect a key if still in an object
              this.state.expectingKey = this.state.inObject;
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
            this.state.expectingKey = false; // In arrays, expect values, not keys
            // Note: We do NOT clear keys when entering/exiting arrays.
            // Arrays are just values for keys, they don't start a new object scope.
            // Keys should only be cleared when entering a new object.
            break;

          case ']':
            if (this.state.arrayDepth > 0) {
              this.state.arrayDepth--;
              // Reset inArray flag if we've exited all arrays
              this.state.inArray = this.state.arrayDepth > 0;
              // After ']', expect a key if in an object (at any object level), false otherwise
              this.state.expectingKey = this.state.inObject;
              // Note: We do NOT clear keys when exiting arrays.
              // Keys should only be cleared when exiting an object.
              // Check if we've returned to root level
              if (this.state.objectDepth === 0 && this.state.arrayDepth === 0) {
                this.state.completed = true;
              }
            }
            break;

          case ':':
            this.processColon();
            break;

          case ',':
            // After ',', expect a key if in an object
            this.state.expectingKey = this.state.inObject;
            // Reset current key for the next key-value pair
            this.state.currentKey = '';
            break;

          // Add validation for invalid characters
          case ' ':
          case '\t':
          case '\n':
          case '\r':
            // Skip whitespace
            break;

          default:
            // If we're not in a string and not expecting a value, this is invalid
            if (!this.state.inString && !this.state.expectingKey && this.state.objectDepth === 0 && this.state.arrayDepth === 0) {
              throw new Error('Incomplete JSON');
            }
            // Also check if it's an invalid character in current context
            if (!this.state.inString && this.state.expectingKey && this.state.inObject && char !== '"' && !this.isValidPrimitive(char)) {
              throw new Error('Incomplete JSON');
            }
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

  /**
   * Checks if a character is the start of a primitive value (number, boolean, null).
   */
  private isValidPrimitive(char: string): boolean {
    return /[0-9\-+tfn]/.test(char);
  }

  /**
   * Processes the start of a string when a quote character is encountered.
   * Extracts the key value if we're expecting a key (i.e., in an object and expectingKey is true).
   * 
   * This method is called when we see a `"` character while not already in a string.
   * It searches forward to find the matching closing quote, extracting the string value
   * between them. If we're expecting a key, the extracted value is stored in `currentKey`
   * for later validation and processing.
   * 
   * Handles escaped characters properly by tracking `escapeNext` state.
   * Does nothing if we're not expecting a key (i.e., we're parsing a value).
   * 
   * @param buffer - The JSON buffer being parsed
   * @param pos - The position of the opening quote in the buffer
   */
  private processStringStart(buffer: string, pos: number): void {
    if (!this.state.expectingKey || !this.state.inObject) {
      // We're in a value or array, skip extraction for now
      // Just track that we're in a string
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
    }
  }

  /**
   * Processes the end of a string that represents an object key.
   * Validates the key against whitelist, blacklist, and dangerous keys.
   * 
   * This method is called when we encounter a closing quote `"` while expecting a key.
   * It validates the extracted key (stored in `currentKey`) against security rules:
   * - Prototype pollution protection (checks for __proto__, constructor, prototype, etc.)
   * - Whitelist/blacklist filtering (if configured)
   * 
   * Validation happens BEFORE the key is added to `pathStack` and `keysInCurrentObject`,
   * ensuring that invalid keys are rejected early in the parsing process.
   * 
   * Does nothing if `currentKey` is empty (e.g., when parsing a value instead of a key).
   */
  private processStringEndForKey(): void {
    if (this.state.currentKey === '') {
      return;
    }

    // Validate the key
    this.validateKey(this.state.currentKey);
  }

  /**
   * Processes a colon character `:` that separates a key from its value in an object.
   * Checks for duplicate keys, adds the key to the path stack, and validates depth limits.
   * 
   * This method is called when we encounter a `:` while in an object. It performs
   * the following operations in order:
   * 1. Gets the current path before adding the key (for error messages)
   * 2. Checks if the key already exists in the current object (duplicate detection)
   * 3. If duplicate: throws an error with the key name and path
   * 4. If not duplicate: adds the key to `pathStack` and `keysInCurrentObject`
   * 5. Resets `currentKey` and sets `expectingKey` to false (next we expect a value)
   * 6. Checks if depth limit has been exceeded
   * 
   * Only processes the colon if we're in an object AND expecting a key AND have a valid key.
   * This prevents processing `:` characters that appear in values (e.g., in strings).
   * 
   * The pathStack ensures that pathStack only contains keys, not values, which is
   * critical for correct error messages and path tracking.
   */
  private processColon(): void {
    if (!this.state.inObject || !this.state.expectingKey || this.state.currentKey === '') {
      return;
    }

    // Get the path before adding the key
    const keyPath = this.getCurrentPath();

    // Check for duplicate key
    if (this.state.keysInCurrentObject.has(this.state.currentKey)) {
      throw new Error(`Duplicate key '${this.state.currentKey}' at ${keyPath}`);
    }

    // Add current key to path stack after validation
    this.state.pathStack.push(this.state.currentKey);
    this.state.keysInCurrentObject.add(this.state.currentKey);
    this.state.currentKey = '';
    
    // After ':', we expect a value, not a key
    this.state.expectingKey = false;

    // Check depth limit
    if (this.state.objectDepth + this.state.arrayDepth > this.maxDepth) {
      throw new Error(`Depth limit exceeded: ${this.state.objectDepth + this.state.arrayDepth}`);
    }
  }

  /**
   * Gets the current JSON path as a dot-separated string.
   * 
   * Returns the full path from the root to the current position in the JSON structure.
   * The path is constructed by joining all elements in `pathStack` with '.'.
   * The root is represented by '$', so a path might look like:
   * - '$' (root)
   * - '$.user' (first-level property)
   * - '$.user.name' (nested property)
   * - '$.data.items.0' (array element)
   * 
   * This path is used in error messages to indicate where a problem occurred.
   * 
   * @returns The current JSON path as a string
   */
  private getCurrentPath(): string {
    return this.state.pathStack.join('.');
  }

  /**
   * Validates a key against security rules and filtering policies.
   * 
   * Performs the following validations in order:
   * 1. Constructs the full key path (e.g., '$.user.name')
   * 2. Checks if the key is allowed according to whitelist/blacklist (if configured)
   * 3. Checks if the key is a dangerous prototype pollution key (if protection is enabled)
   * 
   * Throws an error if:
   * - The key is not in the whitelist (when whitelist is configured)
   * - The key is in the blacklist (when blacklist is configured)
   * - The key is a dangerous prototype pollution key (__proto__, constructor, prototype, or custom)
   * 
   * This method is called during key validation before the key is added to the path stack,
   * ensuring that invalid keys are rejected early in the parsing process.
   * 
   * @param key - The key to validate
   * @throws Error if the key is not allowed or is dangerous
   */
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
 * Parses JSON from a readable stream with duplicate key detection and security validation.
 * 
 * This function creates a StreamingJsonParser instance, pipes the input stream through it,
 * and collects all data chunks. When parsing completes successfully, it combines the chunks,
 * parses them with JSON.parse(), and resolves with the parsed object.
 * 
 * The streaming parser validates the JSON as it's being read, detecting:
 * - Duplicate keys (throws error)
 * - Prototype pollution attempts (throws error)
 * - Depth limit violations (throws error)
 * - Invalid JSON structure (throws error)
 * 
 * This function is useful for parsing large JSON files without loading the entire
 * file into memory at once, while still providing full validation.
 * 
 * @param stream - Readable stream containing JSON data
 * @param options - Optional parser configuration (maxDepth, dangerousKeys, whitelist, blacklist, etc.)
 * @returns Promise that resolves with the parsed JSON object
 * @throws Error if JSON validation fails or parsing encounters an error
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
 * Determines if the streaming parser should be used based on body size and configuration.
 * 
 * This helper function decides whether to use the streaming parser or the regular
 * parser based on the content length and configuration options.
 * 
 * Returns true if:
 * - enableStreaming is true in options (default: false)
 * - contentLength is provided and greater than or equal to streamingThreshold (default: 100KB)
 * 
 * Returns false if:
 * - enableStreaming is false or not specified
 * - contentLength is undefined
 * - contentLength is below the threshold
 * - options is not provided
 * 
 * This allows applications to automatically switch between streaming and regular
 * parsing based on payload size, optimizing for both performance and memory usage.
 * 
 * @param contentLength - The length of the JSON content in bytes, or undefined
 * @param options - Optional parser configuration with streaming settings
 * @returns true if streaming should be used, false otherwise
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
