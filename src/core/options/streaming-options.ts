/**
 * Streaming options for handling large JSON payloads efficiently.
 *
 * These options control how streaming is used to parse large JSON payloads,
 * which can significantly reduce memory usage for big payloads.
 */
export interface StreamingOptions {
  /**
   * Enables automatic streaming for large payloads.
   * When true, payloads larger than `streamingThreshold` will be processed using
   * streaming mode, which reduces memory usage by processing data in chunks.
   *
   * @default true
   */
  enableStreaming?: boolean;

  /**
   * Threshold in bytes for enabling streaming mode.
   * Payloads smaller than this threshold are parsed normally for better performance,
   * while larger payloads use streaming to save memory.
   *
   * @default 102400 (100KB)
   */
  streamingThreshold?: number;

  /**
   * Chunk size in bytes for streaming operations.
   * Larger chunks use more memory but may improve performance, while smaller
   * chunks reduce memory usage but may increase processing time.
   *
   * @default 65536 (64KB)
   */
  chunkSize?: number;
}
