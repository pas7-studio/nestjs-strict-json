import { describe, expect, it } from "vitest";
import { parseStrictJson } from "../src/core/parser.js";
import { DuplicateKeyError } from "../src/core/errors.js";

describe("parseStrictJson", () => {
  it("parses valid json", () => {
    expect(parseStrictJson(Buffer.from('{"a":1,"b":2}'))).toEqual({ a: 1, b: 2 });
  });

  it("throws on duplicate key", () => {
    expect(() => parseStrictJson(Buffer.from('{"flag":true,"flag":false}'))).toThrow(
      DuplicateKeyError,
    );
  });

  it("returns STRICT_JSON_DUPLICATE_KEY for real duplicate in one object", () => {
    try {
      parseStrictJson(Buffer.from('{"status":"a","status":"b"}'));
      throw new Error("Expected duplicate key error");
    } catch (error) {
      expect(error).toBeInstanceOf(DuplicateKeyError);
      expect((error as DuplicateKeyError).details.code).toBe(
        "STRICT_JSON_DUPLICATE_KEY",
      );
    }
  });

  it("throws on nested duplicate key", () => {
    expect(() => parseStrictJson(Buffer.from('{"a":{"b":1,"b":2}}'))).toThrow(
      DuplicateKeyError,
    );
  });

  it("does not treat same keys in different array elements as duplicate", () => {
    expect(
      parseStrictJson(
        Buffer.from('[{"type":"a","value":1},{"type":"b","value":2}]'),
      ),
    ).toEqual([
      { type: "a", value: 1 },
      { type: "b", value: 2 },
    ]);
  });

  it("parses arrays correctly", () => {
    expect(parseStrictJson(Buffer.from("[1,2,3]"))).toEqual([1, 2, 3]);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseStrictJson(Buffer.from("{invalid json}"))).toThrow(
      "Invalid JSON",
    );
  });

  it("respects maxBodySizeBytes", () => {
    expect(() =>
      parseStrictJson(Buffer.from('{"a":1}'), { maxBodySizeBytes: 5 }),
    ).toThrow("Request body exceeds max size");
  });

  it("allows JSON within maxBodySizeBytes", () => {
    expect(
      parseStrictJson(Buffer.from('{"a":1}'), { maxBodySizeBytes: 100 }),
    ).toEqual({ a: 1 });
  });

  it("handles empty object", () => {
    expect(parseStrictJson(Buffer.from("{}"))).toEqual({});
  });

  it("handles nested objects without duplicates", () => {
    expect(parseStrictJson(Buffer.from('{"a":{"b":1},"c":2}'))).toEqual({
      a: { b: 1 },
      c: 2,
    });
  });

  it("handles deep nested duplicate key", () => {
    expect(() => parseStrictJson(Buffer.from('{"a":{"b":{"c":1,"c":2}}}'))).toThrow(
      DuplicateKeyError,
    );
  });
});
