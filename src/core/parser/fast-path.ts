import { PrototypePollutionError } from "../errors.js";
import type { StrictJsonOptions } from "../types.js";

/**
 * Fast path for simple JSON validation when enableFastPath is true.
 * This function performs a quick JSON.parse and only checks for prototype pollution,
 * skipping the full duplicate key and depth limit checks for better performance.
 *
 * This is useful when you know the JSON structure is safe and only need basic
 * prototype pollution protection.
 *
 * @param jsonStr - The JSON string to parse
 * @param options - Strict JSON parsing options
 * @returns The parsed JSON object
 * @throws {SyntaxError} When the JSON is invalid
 * @throws {PrototypePollutionError} When prototype pollution is detected
 */
export function parseWithFastPath(jsonStr: string, options?: StrictJsonOptions): unknown {
  try {
    const parsed = JSON.parse(jsonStr);
    
    // Only check for prototype pollution (fast check)
    if (options?.enablePrototypePollutionProtection !== false) {
      const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);
      
      function checkPrototypePollution(obj: unknown, path: string = '$'): void {
        if (obj && typeof obj === 'object') {
          const record = obj as Record<string, unknown>;
          for (const key of Object.keys(record)) {
            if (dangerousKeys.has(key)) {
              throw new PrototypePollutionError(key, path);
            }
            if (typeof record[key] === 'object' && record[key] !== null) {
              checkPrototypePollution(record[key], `${path}.${key}`);
            }
          }
        }
      }
      
      checkPrototypePollution(parsed);
    }
    
    return parsed;
  } catch (error) {
    // If anything fails, fall back to full parser
    throw error;
  }
}
