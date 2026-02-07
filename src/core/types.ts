export type StrictJsonErrorHandler = (
  error: unknown
) => void | Promise<void>;

export type StrictJsonOptions = {
  maxBodySizeBytes?: number;
  enablePrototypePollutionProtection?: boolean;
  dangerousKeys?: string[];
  onDuplicateKey?: StrictJsonErrorHandler;
  onInvalidJson?: StrictJsonErrorHandler;
  onBodyTooLarge?: StrictJsonErrorHandler;
  onPrototypePollution?: StrictJsonErrorHandler;
  onError?: StrictJsonErrorHandler;
  whitelist?: string[];
  blacklist?: string[];
  maxDepth?: number;
  ignoreCase?: boolean;
  
  // Streaming options
  enableStreaming?: boolean;        // Automatically enable streaming for large payloads
  streamingThreshold?: number;      // Threshold in bytes (default: 100KB)
  chunkSize?: number;               // Chunk size for streaming (default: 64KB)
  
  // Lazy mode options for large payloads optimization
  lazyMode?: boolean;              // Enable lazy mode for better performance with large payloads (default: false)
  lazyModeThreshold?: number;       // Threshold for enabling lazy mode in bytes (default: 100KB)
  lazyModeDepthLimit?: number;      // Skip validation beyond this depth (default: 10)
  lazyModeSkipPrototype?: boolean;  // Skip prototype pollution check in lazy mode (default: true)
  lazyModeSkipWhitelist?: boolean;  // Skip whitelist check in lazy mode (default: true)
  lazyModeSkipBlacklist?: boolean;  // Skip blacklist check in lazy mode (default: false - blacklist is critical)
  
  // Cache options
  enableCache?: boolean;            // Enable LRU cache for repeated parses (default: true)
  cacheSize?: number;               // Maximum cache entries (default: 1000)
  cacheTTL?: number;                // Cache time-to-live in ms (default: 60000)
  
  // Fast path options
  enableFastPath?: boolean;         // Enable fast path for simple validation (default: false)
};

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
