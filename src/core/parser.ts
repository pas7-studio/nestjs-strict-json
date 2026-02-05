import {
  BodyTooLargeError,
  DuplicateKeyError,
  InvalidJsonError,
} from "./errors.js";
import { parseTree, type Node, type ParseError } from "jsonc-parser";
import type { StrictJsonOptions } from "./types.js";

type Duplicate = { key: string; path: string } | null;

const findDuplicateInNode = (node: Node, path = "$"): Duplicate => {
  if (node.type === "object") {
    const seen = new Set<string>();

    for (const prop of node.children ?? []) {
      if (prop.type !== "property" || !prop.children || prop.children.length < 2)
        continue;

      const [keyNode, valueNode] = prop.children;
      const key = String(keyNode.value ?? "");

      if (seen.has(key)) {
        return { key, path: `${path}.${key}` };
      }
      seen.add(key);

      const nested = findDuplicateInNode(valueNode, `${path}.${key}`);
      if (nested) return nested;
    }
  }

  if (node.type === "array") {
    for (let i = 0; i < (node.children ?? []).length; i += 1) {
      const child = node.children?.[i];
      if (!child) continue;
      const nested = findDuplicateInNode(child, `${path}[${i}]`);
      if (nested) return nested;
    }
  }

  return null;
};

const findDuplicateKeysInJson = (jsonStr: string): Duplicate => {
  const errors: ParseError[] = [];
  const root = parseTree(jsonStr, errors, {
    allowTrailingComma: false,
    disallowComments: true,
    allowEmptyContent: false,
  });

  if (!root || errors.length > 0) return null;
  return findDuplicateInNode(root, "$");
};

export const parseStrictJson = (
  raw: string | Buffer,
  options?: StrictJsonOptions,
): unknown => {
  const maxBodySizeBytes = options?.maxBodySizeBytes;
  const buf = typeof raw === "string" ? Buffer.from(raw, "utf8") : raw;

  if (
    typeof maxBodySizeBytes === "number" &&
    buf.byteLength > maxBodySizeBytes
  ) {
    throw new BodyTooLargeError(maxBodySizeBytes);
  }

  try {
    const jsonStr = buf.toString("utf-8");

    // Check for duplicate keys before parsing
    const duplicate = findDuplicateKeysInJson(jsonStr);
    if (duplicate) {
      throw new DuplicateKeyError(duplicate.path, duplicate.key);
    }

    return JSON.parse(jsonStr);
  } catch (e) {
    if (e instanceof DuplicateKeyError || e instanceof BodyTooLargeError)
      throw e;
    throw new InvalidJsonError("Invalid JSON");
  }
};
