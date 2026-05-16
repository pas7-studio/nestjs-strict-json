import type { StrictJsonOptions } from "../types.js";
import type { ICache } from "../cache/index.js";
import { createCache } from "../cache/cache-factory.js";
import { LRUCache } from "../cache/lru-cache.js";
import { createHash } from "node:crypto";

// Global cache instance using ICache interface
let parseCache: ICache<string, unknown> = createCache();

// Cache cleanup interval reference (null when not running)
let cacheCleanupInterval: NodeJS.Timeout | null = null;

/**
 * Starts the cache cleanup interval if not already running.
 * The interval runs every 5 minutes to prune expired entries from LRU cache.
 * 
 * This function is called automatically when the module is loaded.
 * It's safe to call multiple times - subsequent calls are no-ops.
 * 
 * @internal
 */
function startCleanupInterval(): void {
  if (cacheCleanupInterval) return;
  
  cacheCleanupInterval = setInterval(() => {
    // LRU cache automatically expires on access, but periodic cleanup
    // prevents stale entries from hanging in memory indefinitely.
    if (parseCache instanceof LRUCache) {
      parseCache.pruneExpired();
    }
  }, 5 * 60 * 1000);
  
  // Allow the process to exit even if this interval is still running
  cacheCleanupInterval.unref();
}

// Auto-start cleanup interval on module load
startCleanupInterval();

/**
 * Clears all entries from the parse cache.
 * This can be useful for testing or for manually managing memory usage.
 */
export function clearParseCache(): void {
  parseCache.clear();
}

/**
 * Returns the current number of entries in the parse cache.
 */
export function getParseCacheSize(): number {
  return parseCache.size;
}

/**
 * Checks if the cleanup interval is currently running.
 * Useful for testing and debugging.
 * 
 * @returns `true` if the cleanup interval is active, `false` otherwise
 * 
 * @example
 * ```ts
 * if (isCleanupIntervalRunning()) {
 *   console.log('Cleanup interval is active');
 * }
 * ```
 */
export function isCleanupIntervalRunning(): boolean {
  return cacheCleanupInterval !== null;
}

/**
 * Gracefully shuts down the cache manager.
 * 
 * This function stops the cleanup interval and clears all cache entries.
 * Use this for graceful shutdown scenarios, such as:
 * - Application shutdown
 * - Test teardown
 * - Worker termination
 * 
 * After calling this function, the cache will be empty and the cleanup
 * interval will be stopped. You can restart it by calling `resetCacheManager()`
 * or it will auto-restart on next module import.
 * 
 * @example
 * ```ts
 * // In application shutdown hook
 * process.on('SIGTERM', () => {
 *   shutdownCacheManager();
 *   process.exit(0);
 * });
 * ```
 * 
 * // In test teardown
 * afterEach(() => {
 *   shutdownCacheManager();
 * });
 * ```
 */
export function shutdownCacheManager(): void {
  if (cacheCleanupInterval) {
    clearInterval(cacheCleanupInterval);
    cacheCleanupInterval = null;
  }
  clearParseCache();
}

/**
 * Resets the cache manager to its initial state.
 * 
 * This function performs a complete reset:
 * 1. Stops the cleanup interval (if running)
 * 2. Creates a fresh cache instance
 * 3. Restarts the cleanup interval
 * 
 * Use this primarily in testing scenarios to ensure isolation between tests.
 * 
 * @example
 * ```ts
 * // In test setup
 * beforeEach(() => {
 *   resetCacheManager();
 * });
 * 
 * // Verify clean state
 * expect(getParseCacheSize()).toBe(0);
 * expect(isCleanupIntervalRunning()).toBe(true);
 * ```
 */
export function resetCacheManager(): void {
  // Stop existing interval
  if (cacheCleanupInterval) {
    clearInterval(cacheCleanupInterval);
    cacheCleanupInterval = null;
  }
  
  // Create fresh cache instance
  parseCache = createCache();
  
  // Restart cleanup interval
  startCleanupInterval();
}

/**
 * Builds a cache key from a JSON string and options using SHA-256 hashing.
 * 
 * This function uses SHA-256 hashing to create a compact, deterministic cache key that:
 * - Reduces memory usage significantly (hash is always 64 hex characters vs potentially large JSON strings)
 * - Improves get/set performance by comparing fixed-length hashes instead of large strings
 * - Eliminates collision risks (SHA-256 provides extremely low collision probability)
 * - Is deterministic (same input always produces the same hash)
 * 
 * The hash includes both the JSON string and all relevant parsing options to ensure
 * that different option configurations produce different cache entries.
 * 
 * @param jsonStr - The JSON string to parse
 * @param options - Optional parsing options that affect the parsing behavior
 * @returns A 64-character hexadecimal string representing the SHA-256 hash of the combined input
 * 
 * @example
 * ```ts
 * const key1 = buildCacheKey('{"foo":"bar"}', { maxDepth: 10 });
 * const key2 = buildCacheKey('{"foo":"bar"}', { maxDepth: 10 });
 * // key1 === key2 (deterministic)
 * 
 * const key3 = buildCacheKey('{"foo":"bar"}', { maxDepth: 5 });
 * // key1 !== key3 (different options produce different hash)
 * ```
 */
const OPTIONS_CACHE = new WeakMap<StrictJsonOptions, string>();

export function buildCacheKey(jsonStr: string, options?: StrictJsonOptions): string {
  if (!options) {
    return createHash('md5').update(jsonStr).digest('hex');
  }

  let optionsStr = OPTIONS_CACHE.get(options);
  if (!optionsStr) {
    const normalizedOptions = {
      md: options.maxDepth,
      epp: options.enablePrototypePollutionProtection,
      dk: options.dangerousKeys,
      wl: options.whitelist,
      bl: options.blacklist,
      ic: options.ignoreCase,
      es: options.enableStreaming,
      st: options.streamingThreshold,
      cs: options.chunkSize,
      lm: options.lazyMode,
      lmt: options.lazyModeThreshold,
      lmdl: options.lazyModeDepthLimit,
      lmsp: options.lazyModeSkipPrototype,
      lmsw: options.lazyModeSkipWhitelist,
      lmsb: options.lazyModeSkipBlacklist,
      efp: options.enableFastPath,
      mbsb: options.maxBodySizeBytes,
      ec: options.enableCache,
      csz: options.cacheSize,
      cttl: options.cacheTTL,
    };
    optionsStr = JSON.stringify(normalizedOptions);
    OPTIONS_CACHE.set(options, optionsStr);
  }

  const hash = createHash('md5')
    .update(jsonStr)
    .update(optionsStr)
    .digest('hex');
  
  return hash;
}

// Export cache instance getter for internal use
export function getParseCache(): ICache<string, unknown> {
  return parseCache;
}
// Re-export from cache module for backward compatibility
export { LRUCache, DEFAULT_CACHE_TTL, DEFAULT_CACHE_SIZE } from "../cache/index.js";
