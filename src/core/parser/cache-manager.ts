import type { StrictJsonOptions } from "../types.js";
import type { ICache } from "../cache/index.js";
import { createCache } from "../cache/cache-factory.js";
import { LRUCache } from "../cache/lru-cache.js";
import { createHash } from "crypto";

// Global cache instance using ICache interface
let parseCache: ICache<string, unknown> = createCache();

// Cache cleanup interval (every 5 minutes)
const cacheCleanupInterval = setInterval(() => {
  // LRU cache automatically expires on access, but periodic cleanup
  // prevents stale entries from hanging in memory indefinitely.
  if (parseCache instanceof LRUCache) {
    parseCache.pruneExpired();
  }
}, 5 * 60 * 1000);
cacheCleanupInterval.unref();

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
export function buildCacheKey(jsonStr: string, options?: StrictJsonOptions): string {
  if (!options) {
    // When no options, hash only the JSON string
    return createHash('sha256').update(jsonStr).digest('hex');
  }

  // Normalize and include all options that affect parsing behavior
  // This ensures different option configurations produce different cache entries
  const normalizedOptions = {
    // Depth-related options
    maxDepth: options.maxDepth,
    
    // Security options
    enablePrototypePollutionProtection: options.enablePrototypePollutionProtection,
    dangerousKeys: options.dangerousKeys,
    
    // Filtering options
    whitelist: options.whitelist,
    blacklist: options.blacklist,
    ignoreCase: options.ignoreCase,
    
    // Streaming options
    enableStreaming: options.enableStreaming,
    streamingThreshold: options.streamingThreshold,
    chunkSize: options.chunkSize,
    
    // Lazy mode options
    lazyMode: options.lazyMode,
    lazyModeThreshold: options.lazyModeThreshold,
    lazyModeDepthLimit: options.lazyModeDepthLimit,
    lazyModeSkipPrototype: options.lazyModeSkipPrototype,
    lazyModeSkipWhitelist: options.lazyModeSkipWhitelist,
    lazyModeSkipBlacklist: options.lazyModeSkipBlacklist,
    
    // Performance options
    enableFastPath: options.enableFastPath,
    
    // Size limits
    maxBodySizeBytes: options.maxBodySizeBytes,
    
    // Cache options
    enableCache: options.enableCache,
    cacheSize: options.cacheSize,
    cacheTTL: options.cacheTTL,
    
    // Error handlers (included as they can affect error behavior)
    onDuplicateKey: options.onDuplicateKey,
    onInvalidJson: options.onInvalidJson,
    onBodyTooLarge: options.onBodyTooLarge,
    onPrototypePollution: options.onPrototypePollution,
    onError: options.onError,
  };

  const optionsStr = JSON.stringify(normalizedOptions);
  
  // Create SHA-256 hash of the combined JSON string and options
  // This ensures the key is deterministic and collision-resistant
  const hash = createHash('sha256')
    .update(jsonStr)
    .update(optionsStr)
    .digest('hex');
  
  return hash;
}

// Export cache instance and defaults for internal use
export { parseCache };
// Re-export from cache module for backward compatibility
export { LRUCache, DEFAULT_CACHE_TTL, DEFAULT_CACHE_SIZE } from "../cache/index.js";
