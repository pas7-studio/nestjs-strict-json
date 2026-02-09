/**
 * Parser options for controlling JSON parsing behavior.
 *
 * These options control how the JSON parser handles parsing operations,
 * including security measures and optimization strategies.
 */
export interface ParserOptions {
  /**
   * Maximum nesting depth allowed when parsing JSON.
   * Deeper nesting will trigger a STRICT_JSON_DEPTH_LIMIT error.
   *
   * @default 10
   */
  maxDepth?: number;

  /**
   * Enables protection against prototype pollution attacks.
   * When true, prevents JSON keys like `__proto__`, `constructor`, and `prototype`
   * from modifying the Object prototype.
   *
   * @default true
   */
  enablePrototypePollutionProtection?: boolean;

  /**
   * Enables fast path parsing for simple JSON structures.
   * Fast path skips validation for simple cases (no duplicate keys, shallow structure),
   * improving performance when security risks are known to be low.
   *
   * @default false
   */
  enableFastPath?: boolean;
}
