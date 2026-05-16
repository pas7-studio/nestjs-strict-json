import type { StrictJsonOptions } from "../types.js";
import { StreamingJsonParser } from "../streaming-parser.js";
import { DuplicateKeyError, InvalidJsonError } from "../errors.js";
import { invokeErrorHandlerSync } from "./error-handler.js";

const DUPLICATE_KEY_MSG = "Duplicate key '";
const INCOMPLETE_JSON_MSG = 'Incomplete JSON';
const PP_MSG = 'Prototype pollution detected';

/**
 * Determines whether streaming should be used for parsing a payload.
 * Streaming is automatically enabled for large payloads when enableStreaming is not false.
 *
 * @param input - The input data (string or Buffer)
 * @param isStringInput - Whether the input is a string
 * @param options - Strict JSON parsing options
 * @returns true if streaming should be used, false otherwise
 */
export function shouldUseStreamingForPayload(
  input: string | Buffer,
  isStringInput: boolean,
  options?: StrictJsonOptions
): boolean {
  if (options?.enableStreaming === false) {
    return false;
  }

  const threshold = options?.streamingThreshold ?? 100 * 1024; // 100KB default
  
  const byteLength = isStringInput ? Buffer.byteLength(input as string, "utf8") : (input as Buffer).byteLength;
  if (byteLength >= threshold) {
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
      if (error.message.startsWith(DUPLICATE_KEY_MSG)) {
        const keyEnd = error.message.indexOf("' at ", 15);
        if (keyEnd > 15) {
          const key = error.message.slice(15, keyEnd);
          const path = error.message.slice(keyEnd + 5);
          strictError = new DuplicateKeyError(path, key);
          invokeErrorHandlerSync(options?.onDuplicateKey, strictError);
        }
      } else if (error.message.startsWith(INCOMPLETE_JSON_MSG)) {
        strictError = new InvalidJsonError(error.message);
        invokeErrorHandlerSync(options?.onInvalidJson, strictError);
      } else if (error.message.startsWith(PP_MSG)) {
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
