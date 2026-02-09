import {
  DepthLimitError,
  InvalidJsonError,
  PrototypePollutionError,
} from "../errors.js";
import { parseTree, type Node, type ParseError } from "jsonc-parser";
import type { StrictJsonOptions } from "../types.js";
import { isKeyAllowed } from "../validation/index.js";

type Duplicate = { key: string; path: string } | null;
type DangerousKey = { key: string; path: string } | null;

// Optimized iterative version of findDuplicateInNode with lazy mode support
interface StackFrame {
  node: Node;
  path: string;
  depth: number;
  seenKeys: Set<string>;
}

/**
 * Finds duplicate keys, prototype pollution attempts, and validates whitelist/blacklist
 * in a JSON AST node. Uses an iterative approach for better performance and to avoid
 * stack overflow on deeply nested structures.
 *
 * @param node - The AST node to traverse
 * @param path - Current path in the JSON structure (defaults to "$")
 * @param options - Strict JSON parsing options
 * @param depth - Current depth level (defaults to 0)
 * @returns Information about a duplicate key or dangerous key, or null if none found
 * @throws {PrototypePollutionError} When prototype pollution is detected
 * @throws {DepthLimitError} When the maximum depth is exceeded
 * @throws {InvalidJsonError} When a key violates whitelist/blacklist policy
 */
export const findDuplicateInNode = (
  node: Node,
  path = "$",
  options?: StrictJsonOptions,
  depth = 0
): Duplicate | DangerousKey => {
  // Lazy mode configuration
  const lazyMode = options?.lazyMode === true;
  const lazyModeDepthLimit = options?.lazyModeDepthLimit ?? 10;
  const lazyModeSkipPrototype = options?.lazyModeSkipPrototype ?? true;
  const lazyModeSkipWhitelist = options?.lazyModeSkipWhitelist ?? true;
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
  const shouldCheckWhitelist = hasWhitelistOrBlacklist &&
    !(lazyMode && lazyModeSkipWhitelist);
  const shouldCheckBlacklist = hasWhitelistOrBlacklist && 
    !(lazyMode && lazyModeSkipBlacklist);
  const shouldValidateKeyPolicy = shouldCheckWhitelist || shouldCheckBlacklist;

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

        // Enforce whitelist/blacklist policy when enabled.
        if (shouldValidateKeyPolicy) {
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

/**
 * Parses a JSON string and checks for duplicate keys and other issues.
 * This function uses the jsonc-parser library to build an AST and then
 * traverses it to detect issues.
 *
 * @param jsonStr - The JSON string to parse
 * @param options - Strict JSON parsing options
 * @returns Information about a duplicate key if found, null otherwise
 * @throws {PrototypePollutionError} When prototype pollution is detected
 * @throws {DepthLimitError} When the maximum depth is exceeded
 * @throws {InvalidJsonError} When the JSON is invalid or violates whitelist/blacklist
 */
export const findDuplicateKeysInJson = (
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

// Export type for use in other modules
export type { Duplicate, DangerousKey };
