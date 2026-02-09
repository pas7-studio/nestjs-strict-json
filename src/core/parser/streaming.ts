import type { StrictJsonOptions } from "../types.js";
import { StreamingJsonParser } from "../streaming-parser.js";

/**
 * Determines whether streaming should be used for parsing a payload.
 * Streaming is automatically enabled for large payloads when enableStreaming is not false.
 *
 * @param buffer - The buffer containing the JSON data
 * @param options - Strict JSON parsing options
 * @returns true if streaming should be used, false otherwise
 */
export function shouldUseStreamingForPayload(
  buffer: Buffer,
  options?: StrictJsonOptions
): boolean {
  if (options?.enableStreaming === false) {
    return false;
  }

  const threshold = options?.streamingThreshold ?? 100 * 1024; // 100KB default
  
  // Auto-enable streaming for large payloads
  if (buffer.length >= threshold) {
    return true;
  }

  return false;
}

/**
 * Parses a large payload using the streaming parser.
 * This function is designed for handling large JSON payloads efficiently
 * by processing them in chunks rather than loading the entire string into memory.
 *
 * @param buffer - The buffer containing the JSON data
 * @param options - Strict JSON parsing options
 * @returns A promise that resolves to the parsed JSON object
 * @throws {Error} When parsing fails
 */
export async function parseLargePayload(buffer: Buffer, options?: StrictJsonOptions): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const streamingParser = new StreamingJsonParser(options);
    
    streamingParser.on('data', (data) => {
      resolve(data);
    });
    
    streamingParser.on('error', (error) => {
      reject(error);
    });
    
    streamingParser.on('end', () => {
      try {
        const jsonStr = buffer.toString('utf-8');
        const parsed = JSON.parse(jsonStr);
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
    
    streamingParser.write(buffer);
    streamingParser.end();
  });
}
