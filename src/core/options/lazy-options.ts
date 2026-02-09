/**
 * Lazy mode options for optimizing parsing of large JSON payloads.
 *
 * Lazy mode provides performance optimizations for large payloads by selectively
 * skipping certain validation checks based on configured thresholds and limits.
 * This can significantly improve parsing speed while maintaining acceptable security levels.
 */
export interface LazyOptions {
  /**
   * Enables lazy mode for large payload optimization.
   * When enabled, certain validation checks are skipped based on thresholds,
   * improving parsing performance for large payloads.
   *
   * @default false
   */
  lazyMode?: boolean;

  /**
   * Threshold in bytes for automatically enabling lazy mode.
   * Payloads larger than this threshold will use lazy mode optimizations.
   *
   * @default 102400 (100KB)
   */
  lazyModeThreshold?: number;

  /**
   * Maximum depth for validation in lazy mode.
   * Validation is skipped for objects deeper than this limit to improve performance.
   *
   * @default 10
   */
  lazyModeDepthLimit?: number;

  /**
   * Skips prototype pollution protection checks in lazy mode.
   * When true, prototype pollution checks are skipped to improve performance.
   * Use with caution and only for trusted data sources.
   *
   * @default true
   */
  lazyModeSkipPrototype?: boolean;

  /**
   * Skips whitelist validation in lazy mode.
   * When true, whitelist checks are skipped to improve performance.
   *
   * @default true
   */
  lazyModeSkipWhitelist?: boolean;

  /**
   * Skips blacklist validation in lazy mode.
   * When true, blacklist checks are skipped to improve performance.
   * Note: This is more risky than skipping whitelist checks, as blacklist
   * validation is critical for security.
   *
   * @default false (blacklist is critical and should not be skipped by default)
   */
  lazyModeSkipBlacklist?: boolean;
}
