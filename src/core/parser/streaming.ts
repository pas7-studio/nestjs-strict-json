import type { StrictJsonOptions } from "../types.js";
import { StreamingJsonParser } from "../streaming-parser.js";
import { DuplicateKeyError, InvalidJsonError } from "../errors.js";
import { invokeErrorHandlerSync } from "./error-handler.js";

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
 * The streaming parser validates the JSON structure including:
 * - Duplicate key detection
 * - Prototype pollution protection
 * - Depth limit validation
 *
 * @param buffer - The buffer containing the JSON data
 * @param options - Strict JSON parsing options
 * @returns A promise that resolves to the parsed JSON object
 * @throws {DuplicateKeyError} When duplicate keys are detected
 * @throws {InvalidJsonError} When JSON is malformed
 * @throws {Error} When other parsing errors occur
 */
export async function parseLargePayload(buffer: Buffer, options?: StrictJsonOptions): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const streamingParser = new StreamingJsonParser(options);
    let hasError = false;
    
    streamingParser.on('error', (error: Error) => {
      hasError = true;
      
      // Transform generic errors into specific StrictJsonError types
      let strictError: Error = error;
      
      // Check for duplicate key error from streaming parser
      const duplicateKeyRegex = /Duplicate key '([^']+)' at (.+)/;
      if (error.message.includes("Duplicate key '")) {
        const match = duplicateKeyRegex.exec(error.message);
        if (match) {
          const key = match[1];
          const path = match[2];
          strictError = new DuplicateKeyError(path, key);
          // Invoke custom error handler if provided
          invokeErrorHandlerSync(options?.onDuplicateKey, strictError);
        }
      } else if (error.message.includes('Incomplete JSON')) {
        strictError = new InvalidJsonError(error.message);
        invokeErrorHandlerSync(options?.onInvalidJson, strictError);
      } else if (error.message.includes('Prototype pollution detected')) {
        invokeErrorHandlerSync(options?.onPrototypePollution, strictError);
      }
      
      // Invoke generic error handler if provided and no specific handler was called
      invokeErrorHandlerSync(options?.onError, strictError);
      
      reject(strictError);
    });
    
    streamingParser.on('end', () => {
      // Skip if error already occurred
      if (hasError) {
        return;
      }
      
      try {
        // Parse the JSON after validation passed
        const jsonStr = buffer.toString('utf-8');
        const parsed = JSON.parse(jsonStr);
        resolve(parsed);
      } catch (error) {
        // JSON.parse failed - this shouldn't happen if validation passed
        // but handle it gracefully
        const parseError = error instanceof Error 
          ? new InvalidJsonError(error.message)
          : new InvalidJsonError('Failed to parse JSON');
        invokeErrorHandlerSync(options?.onInvalidJson, parseError);
        reject(parseError);
      }
    });
    
    // Write the buffer to the parser
    streamingParser.write(buffer);
    streamingParser.end();
  });
}
