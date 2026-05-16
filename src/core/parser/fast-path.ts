import { PrototypePollutionError } from "../errors.js";
import type { StrictJsonOptions } from "../types.js";

const DEFAULT_DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const OBJECT_TYPE = 'object';

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
  const parsed = JSON.parse(jsonStr);
  
  if (options?.enablePrototypePollutionProtection !== false) {
    checkPrototypePollution(parsed, '$', DEFAULT_DANGEROUS_KEYS);
  }
  
  return parsed;
}

function checkPrototypePollution(obj: unknown, path: string, dangerousKeys: Set<string>): void {
  if (obj && typeof obj === OBJECT_TYPE) {
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
      if (dangerousKeys.has(key)) {
        throw new PrototypePollutionError(key, path);
      }
      const val = record[key];
      if (typeof val === OBJECT_TYPE && val !== null) {
        checkPrototypePollution(val, `${path}.${key}`, dangerousKeys);
      }
    }
  }
}
