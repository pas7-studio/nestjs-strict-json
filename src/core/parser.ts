import {
  BodyTooLargeError,
  DuplicateKeyError,
  InvalidJsonError,
} from "./errors.js";
import type { StrictJsonOptions } from "./types.js";

const findDuplicateKeysInJson = (
  jsonStr: string,
): { key: string; path: string } | null => {
  const regex = /"(?:[^"\\]|\\.)*"(?=\s*:)/g;
  const stack: Array<{ key: string; start: number; children: string[] }> = [];
  const seenAtLevel = new Map<number, Set<string>>();
  let depth = 0;

  let match;
  while ((match = regex.exec(jsonStr)) !== null) {
    const key = match[0].slice(1, -1);
    const levelKeys = seenAtLevel.get(depth) || new Set<string>();

    if (levelKeys.has(key)) {
      const path = stack
        .slice(0, depth)
        .map((ctx) => ctx.key)
        .join(".");
      return { key, path: path ? `$.${path}.${key}` : `$.${key}` };
    }

    levelKeys.add(key);
    seenAtLevel.set(depth, levelKeys);
  }

  return null;
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
