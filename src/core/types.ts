export type StrictJsonOptions = {
  maxBodySizeBytes?: number;
  enablePrototypePollutionProtection?: boolean;
  dangerousKeys?: string[];
  onDuplicateKey?: (error: any) => void | Promise<void>;
  onInvalidJson?: (error: any) => void | Promise<void>;
  onBodyTooLarge?: (error: any) => void | Promise<void>;
  onPrototypePollution?: (error: any) => void | Promise<void>;
  onError?: (error: any) => void | Promise<void>;
  whitelist?: string[];
  blacklist?: string[];
  maxDepth?: number;
  ignoreCase?: boolean;
  
  // Streaming options
  enableStreaming?: boolean;        // Automatically enable streaming for large payloads
  streamingThreshold?: number;      // Threshold in bytes (default: 100KB)
  chunkSize?: number;               // Chunk size for streaming (default: 64KB)
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
