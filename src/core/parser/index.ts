import {
  BodyTooLargeError,
  DepthLimitError,
  DuplicateKeyError,
  InvalidJsonError,
  PrototypePollutionError,
} from "../errors.js";
import type { StrictJsonOptions } from "../types.js";
import { parseCache, buildCacheKey, clearParseCache, getParseCacheSize } from "./cache-manager.js";
import { findDuplicateKeysInJson } from "./parser-core.js";
import { parseWithFastPath } from "./fast-path.js";
import { shouldUseStreamingForPayload, parseLargePayload } from "./streaming.js";
import { errorHandler } from "./error-handler.js";

// Re-export public APIs from sub-modules
export * from "./cache-manager.js";
export * from "./parser-core.js";
export * from "./fast-path.js";
export * from "./streaming.js";
export * from "./error-handler.js";

/**
 * JsonParser class that provides unified JSON parsing with strict validation.
 * 
 * This class encapsulates the common logic for both synchronous and asynchronous
 * JSON parsing, with support for:
 * - Body size limit checking
 * - Duplicate key detection
 * - Prototype pollution protection
 * - Depth limit enforcement
 * - Whitelist/blacklist key validation
 * - Caching support (enabled by default)
 * - Fast path optimization (optional)
 * - Streaming support for large payloads
 * 
 * @class JsonParser
 */
class JsonParser {
  private options?: StrictJsonOptions;
  
  /**
   * Creates a new JsonParser instance with the specified options.
   * 
   * @param options - Strict JSON parsing options
   */
  constructor(options?: StrictJsonOptions) {
    this.options = options;
  }
  
  /**
   * Parses a JSON string or buffer with strict validation.
   * 
   * This method contains all the common parsing logic for both synchronous and
   * asynchronous parsing. The `isAsync` parameter determines whether error handlers
   * are invoked synchronously or asynchronously.
   * 
   * @param input - The JSON string or buffer to parse
   * @param isAsync - Whether to use async error handlers (default: false)
   * @returns The parsed JSON object (or a promise resolving to it if isAsync is true)
   * @throws {BodyTooLargeError} When the input exceeds maxBodySizeBytes
   * @throws {DuplicateKeyError} When duplicate keys are detected
   * @throws {PrototypePollutionError} When prototype pollution is detected
   * @throws {DepthLimitError} When the maximum depth is exceeded
   * @throws {InvalidJsonError} When the JSON is invalid or violates whitelist/blacklist
   */
  parse(input: string | Buffer, isAsync: boolean = false): unknown | Promise<unknown> {
    const maxBodySizeBytes = this.options?.maxBodySizeBytes;
    const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;

    // Check body size limit
    if (
      typeof maxBodySizeBytes === "number" &&
      buf.byteLength > maxBodySizeBytes
    ) {
      const error = new BodyTooLargeError(maxBodySizeBytes);
      this.invokeHandler(this.options?.onBodyTooLarge, error, isAsync);
      this.invokeHandler(this.options?.onError, error, isAsync);
      throw error;
    }

    const jsonStr = buf.toString("utf-8");
    const cacheKey = buildCacheKey(jsonStr, this.options);
    
    // Try cache first (if enabled)
    if (this.options?.enableCache !== false) {
      const cached = parseCache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Determine if we should use streaming for large payloads
    const useStreaming = shouldUseStreamingForPayload(buf, this.options);
    const lazyMode = this.options?.lazyMode === true;
    const lazyModeThreshold = this.options?.lazyModeThreshold ?? 100 * 1024;
    const enableFastPath = this.options?.enableFastPath === true;

    try {
      // Fast path for simple validation (if enabled)
      if (enableFastPath && !useStreaming) {
        try {
          const result = parseWithFastPath(jsonStr, this.options);
          // Cache the result
          if (this.options?.enableCache !== false) {
            parseCache.set(cacheKey, result);
          }
          return result;
        } catch (fastPathError) {
          // Fall back to full parser if fast path fails
          // Continue to full parser below
        }
      }

      // For large payloads with streaming enabled, use streaming parser
      if (useStreaming) {
        if (isAsync) {
          return parseLargePayload(buf, this.options).then((result) => {
            // Cache the result
            if (this.options?.enableCache !== false) {
              parseCache.set(cacheKey, result);
            }
            return result;
          });
        } else {
          // Synchronous streaming is not possible, fall back to regular parser
          // but with lazy mode optimizations
          const parsed = JSON.parse(jsonStr);
          
          // Cache the result
          if (this.options?.enableCache !== false) {
            parseCache.set(cacheKey, parsed);
          }
          
          return parsed;
        }
      }

      // Auto-enable lazy mode for payloads above threshold (if lazyMode is not explicitly set)
      const shouldUseLazyMode = lazyMode || (buf.length >= lazyModeThreshold);

      // Prepare options with lazy mode settings if applicable
      const effectiveOptions: StrictJsonOptions | undefined = shouldUseLazyMode ? {
        ...this.options,
        lazyMode: true,
        lazyModeDepthLimit: this.options?.lazyModeDepthLimit ?? 10,
        lazyModeSkipPrototype: this.options?.lazyModeSkipPrototype ?? true,
        lazyModeSkipWhitelist: this.options?.lazyModeSkipWhitelist ?? true,
        lazyModeSkipBlacklist: this.options?.lazyModeSkipBlacklist ?? false,
      } : this.options;

      // Check for duplicate keys, prototype pollution, depth limit, and whitelist/blacklist
      const duplicate = findDuplicateKeysInJson(jsonStr, effectiveOptions);
      if (duplicate) {
        const error = new DuplicateKeyError(duplicate.path, duplicate.key);
        this.invokeHandler(this.options?.onDuplicateKey, error, isAsync);
        this.invokeHandler(this.options?.onError, error, isAsync);
        throw error;
      }

      const parsed = JSON.parse(jsonStr);
      
      // Cache the result
      if (this.options?.enableCache !== false) {
        parseCache.set(cacheKey, parsed);
      }

      return parsed;
    } catch (e) {
      // Handle prototype pollution errors thrown from findDuplicateInNode
      if (e instanceof PrototypePollutionError) {
        this.invokeHandler(this.options?.onPrototypePollution, e, isAsync);
        this.invokeHandler(this.options?.onError, e, isAsync);
        throw e;
      }

      // Handle depth limit errors thrown from findDuplicateInNode
      if (e instanceof DepthLimitError) {
        this.invokeHandler(this.options?.onError, e, isAsync);
        throw e;
      }

      // Handle custom errors that were already thrown
      if (
        e instanceof DuplicateKeyError ||
        e instanceof BodyTooLargeError
      ) {
        // Error handlers already invoked above, just rethrow
        throw e;
      }

      // Handle InvalidJsonError or other parsing errors
      if (e instanceof InvalidJsonError) {
        this.invokeHandler(this.options?.onInvalidJson, e, isAsync);
        this.invokeHandler(this.options?.onError, e, isAsync);
        throw e;
      }

      // Handle general JSON parse errors
      const error = new InvalidJsonError("Invalid JSON");
      this.invokeHandler(this.options?.onInvalidJson, error, isAsync);
      this.invokeHandler(this.options?.onError, error, isAsync);
      throw error;
    }
  }

  /**
   * Invokes an error handler either synchronously or asynchronously.
   * 
   * @param handler - The custom error handler function (optional)
   * @param error - The error to pass to the handler
   * @param isAsync - Whether to invoke the handler asynchronously
   */
  private invokeHandler(handler: unknown, error: unknown, isAsync: boolean): void {
    if (isAsync) {
      errorHandler.invokeAsync(handler as any, error);
    } else {
      errorHandler.invokeSync(handler as any, error);
    }
  }
}

/**
 * Synchronously parses a JSON string or buffer with strict validation.
 *
 * This function provides comprehensive JSON parsing with the following validations:
 * - Body size limit checking
 * - Duplicate key detection
 * - Prototype pollution protection
 * - Depth limit enforcement
 * - Whitelist/blacklist key validation
 * - Caching support (enabled by default)
 * - Fast path optimization (optional)
 * - Streaming support for large payloads (synchronous fallback)
 *
 * @param raw - The JSON string or buffer to parse
 * @param options - Strict JSON parsing options
 * @returns The parsed JSON object
 * @throws {BodyTooLargeError} When the input exceeds maxBodySizeBytes
 * @throws {DuplicateKeyError} When duplicate keys are detected
 * @throws {PrototypePollutionError} When prototype pollution is detected
 * @throws {DepthLimitError} When the maximum depth is exceeded
 * @throws {InvalidJsonError} When the JSON is invalid or violates whitelist/blacklist
 *
 * @example
 * ```ts
 * const result = parseStrictJson('{"name": "John"}');
 * const resultWithCache = parseStrictJson('{"name": "John"}', { enableCache: true });
 * const resultWithProtection = parseStrictJson('{"name": "John"}', { 
 *   enablePrototypePollutionProtection: true 
 * });
 * ```
 */
export function parseStrictJson(
  raw: string | Buffer,
  options?: StrictJsonOptions,
): unknown {
  return new JsonParser(options).parse(raw, false);
}

/**
 * Asynchronously parses a JSON string or buffer with strict validation.
 *
 * This function provides the same comprehensive JSON parsing validation as
 * parseStrictJson, but with full async support for error handlers. It also
 * supports true streaming for large payloads.
 *
 * @param raw - The JSON string or buffer to parse
 * @param options - Strict JSON parsing options
 * @returns A promise that resolves to the parsed JSON object
 * @throws {BodyTooLargeError} When the input exceeds maxBodySizeBytes
 * @throws {DuplicateKeyError} When duplicate keys are detected
 * @throws {PrototypePollutionError} When prototype pollution is detected
 * @throws {DepthLimitError} When the maximum depth is exceeded
 * @throws {InvalidJsonError} When the JSON is invalid or violates whitelist/blacklist
 *
 * @example
 * ```ts
 * const result = await parseStrictJsonAsync('{"name": "John"}');
 * const resultWithStreaming = await parseStrictJsonAsync(largeBuffer, { 
 *   enableStreaming: true,
 *   streamingThreshold: 1024 * 1024 // 1MB
 * });
 * ```
 */
export async function parseStrictJsonAsync(
  raw: string | Buffer,
  options?: StrictJsonOptions,
): Promise<unknown> {
  const result = new JsonParser(options).parse(raw, true);
  if (result instanceof Promise) {
    return await result;
  }
  return result;
}
