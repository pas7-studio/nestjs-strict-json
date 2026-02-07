import {
  BodyTooLargeError,
  DepthLimitError,
  DuplicateKeyError,
  InvalidJsonError,
  PrototypePollutionError,
} from "./errors.js";
import { parseTree, getNodeValue, type Node, type ParseError } from "jsonc-parser";
import type { StrictJsonOptions } from "./types.js";
import { isKeyAllowed } from "./utils.js";

type Duplicate = { key: string; path: string } | null;
type DangerousKey = { key: string; path: string } | null;

const findDuplicateInNode = (
  node: Node,
  path = "$",
  options?: StrictJsonOptions,
  depth = 0
): Duplicate | DangerousKey => {
  // Check depth limit
  const maxDepth = options?.maxDepth ?? 20;
  if (depth > maxDepth) {
    throw new DepthLimitError(depth, maxDepth);
  }

  // Pre-compute frequently used values for better performance
  const enablePrototypeProtection = options?.enablePrototypePollutionProtection !== false;
  
  // Use Set for O(1) lookup instead of Array.includes O(n)
  const dangerousKeysSet = enablePrototypeProtection
    ? new Set(options?.dangerousKeys || ['__proto__', 'constructor', 'prototype'])
    : new Set<string>();
  
  // Pre-compute whitelist/blacklist check to avoid repeated property access
  const hasWhitelistOrBlacklist = options?.whitelist !== undefined || options?.blacklist !== undefined;

  if (node.type === "object") {
    const seen = new Set<string>();

    for (const prop of node.children ?? []) {
      if (prop.type !== "property" || !prop.children || prop.children.length < 2)
        continue;

      const [keyNode, valueNode] = prop.children;
      const key = String(keyNode.value ?? "");

      // Check whitelist/blacklist (but only if whitelist or blacklist is specified)
      // Use keyPath for pattern matching (e.g., "user.*" matches "$.user.name")
      const keyPath = `${path}.${key}`;
      if (hasWhitelistOrBlacklist && !isKeyAllowed(keyPath, options?.whitelist, options?.blacklist)) {
        throw new InvalidJsonError(`Key '${key}' at ${keyPath} is not allowed`);
      }

      // Check for prototype pollution (only checks the key name, not the path)
      // Using Set.has() for O(1) lookup instead of Array.includes O(n)
      if (enablePrototypeProtection && dangerousKeysSet.has(key)) {
        throw new PrototypePollutionError(key, keyPath);
      }

      // Check for duplicate keys
      if (seen.has(key)) {
        return { key, path: keyPath };
      }
      seen.add(key);

      // Recursively check nested objects
      const nested = findDuplicateInNode(valueNode, keyPath, options, depth + 1);
      if (nested) return nested;
    }
  }

  if (node.type === "array") {
    for (let i = 0; i < (node.children ?? []).length; i += 1) {
      const child = node.children?.[i];
      if (!child) continue;
      const nested = findDuplicateInNode(child, `${path}[${i}]`, options, depth + 1);
      if (nested) return nested;
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
try {
  const jsonStr = buf.toString("utf-8");

  // Check for duplicate keys, prototype pollution, depth limit, and whitelist/blacklist
  const duplicate = findDuplicateKeysInJson(jsonStr, options);
  if (duplicate) {
    const error = new DuplicateKeyError(duplicate.path, duplicate.key);
    invokeErrorHandlerSync(options?.onDuplicateKey, error);
    invokeErrorHandlerSync(options?.onError, error);
    throw error;
  }

  return JSON.parse(jsonStr);
    return parsedValue;
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

  try {
    const jsonStr = buf.toString("utf-8");

    // Check for duplicate keys, prototype pollution, depth limit, and whitelist/blacklist
    const duplicate = findDuplicateKeysInJson(jsonStr, options);
    if (duplicate) {
      const error = new DuplicateKeyError(duplicate.path, duplicate.key);
      await invokeErrorHandlerAsync(options?.onDuplicateKey, error);
      await invokeErrorHandlerAsync(options?.onError, error);
      throw error;
    }

    return JSON.parse(jsonStr);
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
