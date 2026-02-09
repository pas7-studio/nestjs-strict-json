/**
 * Cache options for managing the LRU cache system.
 *
 * These options control how caching works for repeated JSON parsing operations,
 * which can significantly improve performance for the same JSON payloads being parsed multiple times.
 */
export interface CacheOptions {
  /**
   * Enables or disables the LRU (Least Recently Used) cache for parsed JSON results.
   * When enabled, successfully parsed JSON payloads are cached and reused for subsequent
   * identical payloads.
   *
   * @default true
   */
  enableCache?: boolean;

  /**
   * Maximum number of entries to store in the LRU cache.
   * When the cache is full, the least recently used entry is evicted.
   *
   * @default 1000
   */
  cacheSize?: number;

  /**
   * Time-to-live (TTL) for cached entries in milliseconds.
   * Cached entries older than this value will be evicted from the cache.
   *
   * @default 60000 (1 minute)
   */
  cacheTTL?: number;
}
