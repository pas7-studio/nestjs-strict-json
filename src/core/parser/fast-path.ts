import { PrototypePollutionError } from "../errors.js";
import type { StrictJsonOptions } from "../types.js";

const DEFAULT_DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const OBJECT_TYPE = 'object';

interface PCFrame {
  obj: Record<string, unknown>;
  path: string;
}

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

function checkPrototypePollution(root: unknown, _path: string, dangerousKeys: Set<string>): void {
  if (!root || typeof root !== OBJECT_TYPE) return;

  const stack: PCFrame[] = [{ obj: root as Record<string, unknown>, path: '$' }];

  while (stack.length > 0) {
    const frame = stack.pop()!;
    const keys = Object.keys(frame.obj);

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (dangerousKeys.has(key)) {
        throw new PrototypePollutionError(key, frame.path);
      }
      const val = frame.obj[key];
      if (typeof val === OBJECT_TYPE && val !== null) {
        stack.push({ obj: val as Record<string, unknown>, path: `${frame.path}.${key}` });
      }
    }
  }
}
