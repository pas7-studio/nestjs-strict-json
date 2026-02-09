import type { ParserOptions } from './options/parser-options';
import type { CacheOptions } from './options/cache-options';
import type { StreamingOptions } from './options/streaming-options';
import type { LazyOptions } from './options/lazy-options';
import type { FilteringOptions } from './options/filtering-options';
import type { ErrorHandlerOptions } from './options/error-handlers';

export type StrictJsonErrorHandler = (
  error: unknown
) => void | Promise<void>;

/**
 * Configuration options for StrictJson parsing.
 *
 * This interface combines all option groups into a single type for convenience,
 * following the Interface Segregation Principle by being composed of smaller,
 * focused interfaces.
 *
 * @example Basic usage
 * ```typescript
 * const options: StrictJsonOptions = {
 *   maxDepth: 20,
 *   enableCache: true,
 *   enableStreaming: true
 * };
 * ```
 *
 * @example With all options
 * ```typescript
 * const options: StrictJsonOptions = {
 *   // Parser options
 *   maxDepth: 20,
 *   enablePrototypePollutionProtection: true,
 *   enableFastPath: false,
 *
 *   // Cache options
 *   enableCache: true,
 *   cacheSize: 1000,
 *   cacheTTL: 60000,
 *
 *   // Streaming options
 *   enableStreaming: true,
 *   streamingThreshold: 102400,
 *   chunkSize: 65536,
 *
 *   // Lazy mode options
 *   lazyMode: false,
 *   lazyModeThreshold: 102400,
 *   lazyModeDepthLimit: 10,
 *   lazyModeSkipPrototype: true,
 *   lazyModeSkipWhitelist: true,
 *   lazyModeSkipBlacklist: false,
 *
 *   // Filtering options
 *   maxBodySizeBytes: 1048576,
 *   whitelist: ['allowedKey'],
 *   blacklist: ['forbiddenKey'],
 *   ignoreCase: false,
 *   dangerousKeys: ['__proto__', 'constructor', 'prototype'],
 *
 *   // Error handlers
 *   onDuplicateKey: (error) => console.error(error),
 *   onInvalidJson: (error) => console.error(error),
 *   onBodyTooLarge: (error) => console.error(error),
 *   onPrototypePollution: (error) => console.error(error),
 *   onError: (error) => console.error(error)
 * };
 * ```
 *
 * @see {@link ParserOptions} - Parser-specific options
 * @see {@link CacheOptions} - Cache configuration
 * @see {@link StreamingOptions} - Streaming options
 * @see {@link LazyOptions} - Lazy mode options
 * @see {@link FilteringOptions} - Content filtering
 * @see {@link ErrorHandlerOptions} - Custom error handlers
 */
export interface StrictJsonOptions extends
  ParserOptions,
  CacheOptions,
  StreamingOptions,
  LazyOptions,
  FilteringOptions,
  ErrorHandlerOptions {}

export type StrictJsonErrorCode =
  | "STRICT_JSON_DUPLICATE_KEY"
  | "STRICT_JSON_INVALID_JSON"
  | "STRICT_JSON_BODY_TOO_LARGE"
  | "STRICT_JSON_PROTOTYPE_POLLUTION"
  | "STRICT_JSON_DEPTH_LIMIT";

export type StrictJsonErrorDetails = {
  code: StrictJsonErrorCode;
  message: string;
  path?: string;
  key?: string;
  position?: number;
  dangerousKey?: string;
  currentDepth?: number;
  maxDepth?: number;
};
