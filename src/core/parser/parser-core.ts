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

const DEFAULT_DANGEROUS_KEYS_SET = new Set(['__proto__', 'constructor', 'prototype']);
const EMPTY_SET = new Set<string>();

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
  const config = extractTraversalConfig(options);

  const stack: StackFrame[] = [
    { node, path, depth, seenKeys: new Set<string>() }
  ];

  while (stack.length > 0) {
    const frame = stack.pop()!;
    
    if (frame.depth > config.effectiveDepthLimit) {
      throw new DepthLimitError(frame.depth, config.effectiveDepthLimit);
    }

    if (frame.node.type === "object") {
      const duplicate = processObjectNode(stack, frame, config, options);
      if (duplicate) return duplicate;
    } else if (frame.node.type === "array") {
      processArrayNode(stack, frame);
    }
  }

  return null;
};

interface TraversalConfig {
  lazyMode: boolean;
  shouldCheckPrototype: boolean;
  shouldValidateKeyPolicy: boolean;
  dangerousKeysSet: Set<string>;
  effectiveDepthLimit: number;
}

function extractTraversalConfig(options?: StrictJsonOptions): TraversalConfig {
  const lazyMode = options?.lazyMode === true;
  const lazyModeDepthLimit = options?.lazyModeDepthLimit ?? 10;
  const lazyModeSkipPrototype = options?.lazyModeSkipPrototype ?? true;
  const lazyModeSkipWhitelist = options?.lazyModeSkipWhitelist ?? true;
  const lazyModeSkipBlacklist = options?.lazyModeSkipBlacklist ?? false;

  const maxDepth = options?.maxDepth ?? 20;
  const enablePrototypeProtection = options?.enablePrototypePollutionProtection !== false;
  const shouldCheckPrototype = enablePrototypeProtection && !(lazyMode && lazyModeSkipPrototype);

  let dangerousKeysSet = EMPTY_SET;
  if (shouldCheckPrototype) {
    dangerousKeysSet = options?.dangerousKeys
      ? new Set(options.dangerousKeys)
      : DEFAULT_DANGEROUS_KEYS_SET;
  }

  const hasWhitelistOrBlacklist = options?.whitelist !== undefined || options?.blacklist !== undefined;
  const shouldCheckWhitelist = hasWhitelistOrBlacklist && !(lazyMode && lazyModeSkipWhitelist);
  const shouldCheckBlacklist = hasWhitelistOrBlacklist && !(lazyMode && lazyModeSkipBlacklist);
  const shouldValidateKeyPolicy = shouldCheckWhitelist || shouldCheckBlacklist;
  const effectiveDepthLimit = lazyMode ? Math.min(maxDepth, lazyModeDepthLimit) : maxDepth;

  return {
    lazyMode,
    shouldCheckPrototype,
    shouldValidateKeyPolicy,
    dangerousKeysSet,
    effectiveDepthLimit,
  };
}

function processObjectNode(
  stack: StackFrame[],
  frame: StackFrame,
  config: TraversalConfig,
  options?: StrictJsonOptions,
): Duplicate {
  const { node: currentNode, path: currentPath, depth: currentDepth, seenKeys: currentSeenKeys } = frame;
  const children = currentNode.children?.length ?? 0;

  for (let i = children - 1; i >= 0; i--) {
    const prop = currentNode.children?.[i];
    if (prop?.type !== "property" || !prop.children || prop.children.length < 2) continue;

    const [keyNode, valueNode] = prop.children;
    const key = String(keyNode.value ?? "");
    const keyPath = `${currentPath}.${key}`;

    validateKeyForNode(key, keyPath, config, options);

    if (currentSeenKeys.has(key)) {
      return { key, path: keyPath };
    }
    currentSeenKeys.add(key);

    stack.push({
      node: valueNode,
      path: keyPath,
      depth: currentDepth + 1,
      seenKeys: new Set<string>(),
    });
  }

  return null;
}

function processArrayNode(stack: StackFrame[], frame: StackFrame): void {
  const { node: currentNode, path: currentPath, depth: currentDepth } = frame;
  const children = currentNode.children?.length ?? 0;

  for (let i = children - 1; i >= 0; i--) {
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

function validateKeyForNode(
  key: string,
  keyPath: string,
  config: TraversalConfig,
  options?: StrictJsonOptions,
): void {
  if (config.shouldValidateKeyPolicy) {
    if (!isKeyAllowed(keyPath, options?.whitelist, options?.blacklist, options?.ignoreCase)) {
      throw new InvalidJsonError(`Key '${key}' at ${keyPath} is not allowed`);
    }
  }

  if (config.shouldCheckPrototype && config.dangerousKeysSet.has(key)) {
    throw new PrototypePollutionError(key, keyPath);
  }
}

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
    return findDuplicateInNode(root, "$", options);
  } catch (e) {
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
