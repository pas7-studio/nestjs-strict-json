import {
  BodyTooLargeError,
  DepthLimitError,
  DuplicateKeyError,
  InvalidJsonError,
  PrototypePollutionError,
} from "./errors.js";
import { parseTree, type Node, type ParseError } from "jsonc-parser";
import type { StrictJsonOptions } from "./types.js";
import { isKeyAllowed } from "./utils.js";
import { StreamingJsonParser } from "./streaming-parser.js";

const DEFAULT_CACHE_TTL = 60000; // 60 seconds
const DEFAULT_CACHE_SIZE = 1000; // Max 1000 cached results

class LRUCache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = DEFAULT_CACHE_SIZE, ttl: number = DEFAULT_CACHE_TTL) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: K): V | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const parseCache = new LRUCache<string, unknown>();

// Cache cleanup interval (every 5 minutes)
setInterval(() => {
  // LRU cache automatically expires on access, but we can periodically clean
  // old entries to prevent memory bloat
  const now = Date.now();
  for (const [key, entry] of parseCache['cache']) {
    if (now - entry.timestamp > DEFAULT_CACHE_TTL) {
      parseCache['cache'].delete(key);
    }
  }
}, 5 * 60 * 1000);

// Export cache functions for manual control
export function clearParseCache(): void {
  parseCache.clear();
}

export function getParseCacheSize(): number {
  return parseCache.size;
}

type Duplicate = { key: string; path: string } | null;
type DangerousKey = { key: string; path: string } | null;

// Optimized iterative version of findDuplicateInNode with lazy mode support
interface StackFrame {
  node: Node;
  path: string;
  depth: number;
  seenKeys: Set<string>;
}

const findDuplicateInNode = (
  node: Node,
  path = "$",
  options?: StrictJsonOptions,
  depth = 0
): Duplicate | DangerousKey => {
  // Lazy mode configuration
  const lazyMode = options?.lazyMode === true;
  const lazyModeDepthLimit = options?.lazyModeDepthLimit ?? 10;
  const lazyModeSkipPrototype = options?.lazyModeSkipPrototype ?? true;
  const lazyModeSkipBlacklist = options?.lazyModeSkipBlacklist ?? false;

  // Regular configuration
  const maxDepth = options?.maxDepth ?? 20;
  
  // Pre-compute frequently used values for better performance
  const enablePrototypeProtection = options?.enablePrototypePollutionProtection !== false;
  const shouldCheckPrototype = enablePrototypeProtection && 
    !(lazyMode && lazyModeSkipPrototype);
  
  // Use Set for O(1) lookup instead of Array.includes O(n)
  const dangerousKeysSet = shouldCheckPrototype
    ? new Set(options?.dangerousKeys || ['__proto__', 'constructor', 'prototype'])
    : new Set<string>();
  
  // Pre-compute whitelist/blacklist check to avoid repeated property access
  const hasWhitelistOrBlacklist = options?.whitelist !== undefined || options?.blacklist !== undefined;
  const shouldCheckBlacklist = hasWhitelistOrBlacklist && 
    !(lazyMode && lazyModeSkipBlacklist);

  // Determine effective depth limit (lazy mode or normal mode)
  const effectiveDepthLimit = lazyMode ? Math.min(maxDepth, lazyModeDepthLimit) : maxDepth;

  // Use stack for iterative traversal instead of recursion
  const stack: StackFrame[] = [
    { node, path, depth, seenKeys: new Set<string>() }
  ];

  while (stack.length > 0) {
    const { node: currentNode, path: currentPath, depth: currentDepth, seenKeys: currentSeenKeys } = stack.pop()!;
    
    // Check depth limit
    if (currentDepth > effectiveDepthLimit) {
      throw new DepthLimitError(currentDepth, effectiveDepthLimit);
    }

    // Process object nodes
    if (currentNode.type === "object") {
      for (let i = (currentNode.children?.length ?? 0) - 1; i >= 0; i--) {
        const prop = currentNode.children?.[i];
        if (prop?.type !== "property" || !prop.children || prop.children.length < 2)
          continue;

        const [keyNode, valueNode] = prop.children;
        const key = String(keyNode.value ?? "");
        const keyPath = `${currentPath}.${key}`;

        // Check blacklist (always check, even in lazy mode unless explicitly skipped)
        if (shouldCheckBlacklist) {
          if (!isKeyAllowed(keyPath, options?.whitelist, options?.blacklist)) {
            throw new InvalidJsonError(`Key '${key}' at ${keyPath} is not allowed`);
          }
        }

        // Check for prototype pollution (if enabled and not skipped)
        if (shouldCheckPrototype && dangerousKeysSet.has(key)) {
          throw new PrototypePollutionError(key, keyPath);
        }

        // Check for duplicate keys (always critical!)
        if (currentSeenKeys.has(key)) {
          return { key, path: keyPath };
        }
        currentSeenKeys.add(key);

        // Add nested objects/arrays to stack
        stack.push({
          node: valueNode,
          path: keyPath,
          depth: currentDepth + 1,
          seenKeys: new Set<string>(),
        });
      }
    }
    
    // Process array nodes
    else if (currentNode.type === "array") {
      for (let i = (currentNode.children?.length ?? 0) - 1; i >= 0; i--) {
        const child = currentNode.children?.[i];
        if (!child) continue;
        
        stack.push({
          node: child,
          path: `${currentPath}[${i}]`,
          depth: currentDepth + 1,
          seenKeys: new Set<string>(),
        });
      }
    }
  }

  return null;
};

const findDuplicateKeysInJson = (
  jsonStr: string,
  options?: StrictJsonOptions
): Duplicate => {
  const errors: ParseError[] = [];
  const root = parseTree(jsonStr, errors, {
    allowTrailingComma: false,
    disallowComments: true,
    allowEmptyContent: false,
  });

  if (!root || errors.length > 0) return null;
  
  // This will throw PrototypePollutionError, DepthLimitError, or InvalidJsonError
  // if detected during traversal
  try {
    return findDuplicateInNode(root, "$", options) as Duplicate;
  } catch (e) {
    // Re-throw custom errors - they'll be caught by parseStrictJson
    if (
      e instanceof PrototypePollutionError ||
      e instanceof DepthLimitError ||
      e instanceof InvalidJsonError
    ) {
      throw e;
    }
    throw e;
  }
};

// Fast path for simple validation (when enableFastPath is true)
function parseWithFastPath(jsonStr: string, options?: StrictJsonOptions): unknown {
  try {
    const parsed = JSON.parse(jsonStr);
    
    // Only check for prototype pollution (fast check)
    if (options?.enablePrototypePollutionProtection !== false) {
      const dangerousKeys = new Set(['__proto__', 'constructor', 'prototype']);
      
      function checkPrototypePollution(obj: any, path: string = '$'): void {
        if (obj && typeof obj === 'object') {
          for (const key of Object.keys(obj)) {
            if (dangerousKeys.has(key)) {
              throw new PrototypePollutionError(key, path);
            }
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              checkPrototypePollution(obj[key], `${path}.${key}`);
            }
          }
        }
      }
      
      checkPrototypePollution(parsed);
    }
    
    return parsed;
  } catch (error) {
    // If anything fails, fall back to full parser
    throw error;
  }
}

// Helper function to check if streaming should be used
function shouldUseStreamingForPayload(
  buffer: Buffer,
  options?: StrictJsonOptions
): boolean {
  if (options?.enableStreaming === false) {
    return false;
  }

  const threshold = options?.streamingThreshold ?? 100 * 1024; // 100KB default
  
  // Auto-enable streaming for large payloads
  if (buffer.length >= threshold) {
    return true;
  }

  return false;
}

// Parse large payload using streaming parser
async function parseLargePayload(buffer: Buffer, options?: StrictJsonOptions): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const streamingParser = new StreamingJsonParser(options);
    
    streamingParser.on('data', (data) => {
      resolve(data);
    });
    
    streamingParser.on('error', (error) => {
      reject(error);
    });
    
    streamingParser.on('end', () => {
      try {
        const jsonStr = buffer.toString('utf-8');
        const parsed = JSON.parse(jsonStr);
        resolve(parsed);
      } catch (error) {
        reject(error);
      }
    });
    
    streamingParser.write(buffer);
    streamingParser.end();
  });
}

// Custom error handler wrapper - sync version
const invokeErrorHandlerSync = (
  handler: ((error: any) => void | Promise<void>) | undefined,
  error: any
): void => {
  if (handler) {
    try {
      handler(error);
    } catch (handlerError) {
      // Handler errors should not prevent original error from being thrown
      // Do nothing, just ignore handler errors
    }
  }
};

// Custom error handler wrapper - async version
const invokeErrorHandlerAsync = async (
  handler: ((error: any) => void | Promise<void>) | undefined,
  error: any
): Promise<void> => {
  if (handler) {
    try {
      await handler(error);
    } catch (handlerError) {
      // Handler errors should not prevent original error from being thrown
      // Do nothing, just ignore handler errors
    }
  }
};

// Synchronous version (no async handler support)
export const parseStrictJson = (
  raw: string | Buffer,
  options?: StrictJsonOptions,
): unknown => {
  const maxBodySizeBytes = options?.maxBodySizeBytes;
  const buf = typeof raw === "string" ? Buffer.from(raw, "utf8") : raw;

  // Check body size limit
  if (
    typeof maxBodySizeBytes === "number" &&
    buf.byteLength > maxBodySizeBytes
  ) {
    const error = new BodyTooLargeError(maxBodySizeBytes);
    invokeErrorHandlerSync(options?.onBodyTooLarge, error);
    invokeErrorHandlerSync(options?.onError, error);
    throw error;
  }

  const jsonStr = buf.toString("utf-8");
  
  // Try cache first (if enabled)
  if (options?.enableCache !== false) {
    const cacheSize = options?.cacheSize ?? DEFAULT_CACHE_SIZE;
    const cacheTTL = options?.cacheTTL ?? DEFAULT_CACHE_TTL;
    
    // Ensure cache is configured with correct size and TTL
    (parseCache as any).maxSize = cacheSize;
    (parseCache as any).ttl = cacheTTL;
    
    const cached = parseCache.get(jsonStr);
    if (cached !== null) {
      return cached;
    }
  }

  // Determine if we should use streaming for large payloads
  const useStreaming = shouldUseStreamingForPayload(buf, options);
  const lazyMode = options?.lazyMode === true;
  const lazyModeThreshold = options?.lazyModeThreshold ?? 100 * 1024;
  const enableFastPath = options?.enableFastPath === true;

  try {
    // Fast path for simple validation (if enabled)
    if (enableFastPath && !useStreaming) {
      try {
        const result = parseWithFastPath(jsonStr, options);
        // Cache the result
        if (options?.enableCache !== false) {
          parseCache.set(jsonStr, result);
        }
        return result;
      } catch (fastPathError) {
        // Fall back to full parser if fast path fails
        // Continue to full parser below
      }
    }

    // For large payloads with streaming enabled, use streaming parser
    if (useStreaming) {
      // Synchronous streaming is not possible, fall back to regular parser
      // but with lazy mode optimizations
      const parsed = JSON.parse(jsonStr);
      
      // Cache the result
      if (options?.enableCache !== false) {
        parseCache.set(jsonStr, parsed);
      }
      
      return parsed;
    }

    // Auto-enable lazy mode for payloads above threshold (if lazyMode is not explicitly set)
    const shouldUseLazyMode = lazyMode || (buf.length >= lazyModeThreshold);

    // Prepare options with lazy mode settings if applicable
    const effectiveOptions: StrictJsonOptions = shouldUseLazyMode ? {
      ...options,
      lazyMode: true,
      lazyModeDepthLimit: options?.lazyModeDepthLimit ?? 10,
      lazyModeSkipPrototype: options?.lazyModeSkipPrototype ?? true,
      lazyModeSkipWhitelist: options?.lazyModeSkipWhitelist ?? true,
      lazyModeSkipBlacklist: options?.lazyModeSkipBlacklist ?? false,
    } : options;

    // Check for duplicate keys, prototype pollution, depth limit, and whitelist/blacklist
    const duplicate = findDuplicateKeysInJson(jsonStr, effectiveOptions);
    if (duplicate) {
      const error = new DuplicateKeyError(duplicate.path, duplicate.key);
      invokeErrorHandlerSync(options?.onDuplicateKey, error);
      invokeErrorHandlerSync(options?.onError, error);
      throw error;
    }

    const parsed = JSON.parse(jsonStr);
    
    // Cache the result
    if (options?.enableCache !== false) {
      parseCache.set(jsonStr, parsed);
    }

    return parsed;
  } catch (e) {
    // Handle prototype pollution errors thrown from findDuplicateInNode
    if (e instanceof PrototypePollutionError) {
      invokeErrorHandlerSync(options?.onPrototypePollution, e);
      invokeErrorHandlerSync(options?.onError, e);
      throw e;
    }

    // Handle depth limit errors thrown from findDuplicateInNode
    if (e instanceof DepthLimitError) {
      invokeErrorHandlerSync(options?.onError, e);
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
      invokeErrorHandlerSync(options?.onInvalidJson, e);
      invokeErrorHandlerSync(options?.onError, e);
      throw e;
    }

    // Handle general JSON parse errors
    const error = new InvalidJsonError("Invalid JSON");
    invokeErrorHandlerSync(options?.onInvalidJson, error);
    invokeErrorHandlerSync(options?.onError, error);
    throw error;
  }
};

// Async version (full async handler support)
export const parseStrictJsonAsync = async (
  raw: string | Buffer,
  options?: StrictJsonOptions,
): Promise<unknown> => {
  const maxBodySizeBytes = options?.maxBodySizeBytes;
  const buf = typeof raw === "string" ? Buffer.from(raw, "utf8") : raw;

  // Check body size limit
  if (
    typeof maxBodySizeBytes === "number" &&
    buf.byteLength > maxBodySizeBytes
  ) {
    const error = new BodyTooLargeError(maxBodySizeBytes);
    await invokeErrorHandlerAsync(options?.onBodyTooLarge, error);
    await invokeErrorHandlerAsync(options?.onError, error);
    throw error;
  }

  const jsonStr = buf.toString("utf-8");

  // Try cache first (if enabled)
  if (options?.enableCache !== false) {
    const cacheSize = options?.cacheSize ?? DEFAULT_CACHE_SIZE;
    const cacheTTL = options?.cacheTTL ?? DEFAULT_CACHE_TTL;
    
    // Ensure cache is configured with correct size and TTL
    (parseCache as any).maxSize = cacheSize;
    (parseCache as any).ttl = cacheTTL;
    
    const cached = parseCache.get(jsonStr);
    if (cached !== null) {
      return cached;
    }
  }

  // Determine if we should use streaming for large payloads
  const useStreaming = shouldUseStreamingForPayload(buf, options);
  const lazyMode = options?.lazyMode === true;
  const lazyModeThreshold = options?.lazyModeThreshold ?? 100 * 1024;
  const enableFastPath = options?.enableFastPath === true;

  try {
    // Fast path for simple validation (if enabled)
    if (enableFastPath && !useStreaming) {
      try {
        const result = parseWithFastPath(jsonStr, options);
        // Cache the result
        if (options?.enableCache !== false) {
          parseCache.set(jsonStr, result);
        }
        return result;
      } catch (fastPathError) {
        // Fall back to full parser if fast path fails
        // Continue to full parser below
      }
    }

    // For large payloads with streaming enabled, use streaming parser
    if (useStreaming) {
      const result = await parseLargePayload(buf, options);
      // Cache the result
      if (options?.enableCache !== false) {
        parseCache.set(jsonStr, result);
      }
      return result;
    }

    // Auto-enable lazy mode for payloads above threshold (if lazyMode is not explicitly set)
    const shouldUseLazyMode = lazyMode || (buf.length >= lazyModeThreshold);

    // Prepare options with lazy mode settings if applicable
    const effectiveOptions: StrictJsonOptions = shouldUseLazyMode ? {
      ...options,
      lazyMode: true,
      lazyModeDepthLimit: options?.lazyModeDepthLimit ?? 10,
      lazyModeSkipPrototype: options?.lazyModeSkipPrototype ?? true,
      lazyModeSkipWhitelist: options?.lazyModeSkipWhitelist ?? true,
      lazyModeSkipBlacklist: options?.lazyModeSkipBlacklist ?? false,
    } : options;

    // Check for duplicate keys, prototype pollution, depth limit, and whitelist/blacklist
    const duplicate = findDuplicateKeysInJson(jsonStr, effectiveOptions);
    if (duplicate) {
      const error = new DuplicateKeyError(duplicate.path, duplicate.key);
      await invokeErrorHandlerAsync(options?.onDuplicateKey, error);
      await invokeErrorHandlerAsync(options?.onError, error);
      throw error;
    }

    const parsed = JSON.parse(jsonStr);
    
    // Cache the result
    if (options?.enableCache !== false) {
      parseCache.set(jsonStr, parsed);
    }

    return parsed;
  } catch (e) {
    // Handle prototype pollution errors thrown from findDuplicateInNode
    if (e instanceof PrototypePollutionError) {
      await invokeErrorHandlerAsync(options?.onPrototypePollution, e);
      await invokeErrorHandlerAsync(options?.onError, e);
      throw e;
    }

    // Handle depth limit errors thrown from findDuplicateInNode
    if (e instanceof DepthLimitError) {
      await invokeErrorHandlerAsync(options?.onError, e);
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
      await invokeErrorHandlerAsync(options?.onInvalidJson, e);
      await invokeErrorHandlerAsync(options?.onError, e);
      throw e;
    }

    // Handle general JSON parse errors
    const error = new InvalidJsonError("Invalid JSON");
    await invokeErrorHandlerAsync(options?.onInvalidJson, error);
    await invokeErrorHandlerAsync(options?.onError, error);
    throw error;
  }
};
