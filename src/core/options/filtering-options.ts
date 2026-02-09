/**
 * Filtering options for controlling JSON content validation and filtering.
 *
 * These options control how JSON content is validated and filtered, including
 * key-based filtering, size limits, and security-related checks.
 */
export interface FilteringOptions {
  /**
   * Maximum allowed size of the JSON body in bytes.
   * JSON payloads larger than this limit will trigger a STRICT_JSON_BODY_TOO_LARGE error.
   *
   * @default 1048576 (1MB)
   */
  maxBodySizeBytes?: number;

  /**
   * List of allowed keys in the JSON.
   * If provided, only keys in this list will be allowed in the parsed JSON.
   * Keys not in the whitelist will be rejected.
   *
   * @default undefined (no whitelist applied)
   */
  whitelist?: string[];

  /**
   * List of forbidden keys in the JSON.
   * If provided, any key in this list will cause the parsing to fail.
   * Blacklisted keys take precedence over whitelisted keys.
   *
   * @default undefined (no blacklist applied)
   */
  blacklist?: string[];

  /**
   * Enables case-insensitive matching for whitelist and blacklist.
   * When true, key matching ignores case differences.
   *
   * @default false
   */
  ignoreCase?: boolean;

  /**
   * List of dangerous keys that should always be rejected.
   * These keys are typically related to security vulnerabilities like prototype pollution.
   * Default includes: `__proto__`, `constructor`, `prototype`.
   *
   * @default ['__proto__', 'constructor', 'prototype']
   */
  dangerousKeys?: string[];
}
