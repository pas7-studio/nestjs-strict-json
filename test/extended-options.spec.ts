import { describe, it, expect } from "vitest";
import { parseStrictJson, DepthLimitError, InvalidJsonError } from "../src/index.js";

describe("Extended Configuration Options", () => {
  describe("Whitelist", () => {
    it("should allow keys matching whitelist patterns", () => {
      const json = '{"user": {"name": "John"}, "profile": {"age": 30}}';
      const result = parseStrictJson(json, {
        whitelist: ["user.*", "profile.*"]
      });
      expect(result).toEqual({
        user: { name: "John" },
        profile: { age: 30 }
      });
    });

    it("should reject keys not in whitelist", () => {
      const json = '{"user": {"name": "John"}, "secret": "value"}';

      expect(() => parseStrictJson(json, {
        whitelist: ["user.*"]
      })).toThrow(InvalidJsonError);
    });

    it("should support exact match in whitelist", () => {
      const json = '{"user": "John"}';
      const result = parseStrictJson(json, {
        whitelist: ["user"]
      });
      expect(result).toEqual({ user: "John" });
    });

    it("should support wildcard patterns in whitelist", () => {
      const json = '{"user": {"name": "John", "email": "test@example.com"}}';
      const result = parseStrictJson(json, {
        whitelist: ["user.*"]
      });
      expect(result).toEqual({
        user: { name: "John", email: "test@example.com" }
      });
    });

    it("should support nested wildcard patterns (**)", () => {
      const json = '{"data": {"users": [{"name": "John"}], "config": {"deep": {"value": "test"}}}}';
      const result = parseStrictJson(json, {
        whitelist: ["data.**.name", "data.**.value"]
      });
      expect(result.data.users[0].name).toBe("John");
      expect(result.data.config.deep.value).toBe("test");
    });
  });

  describe("Blacklist", () => {
    it("should reject keys matching blacklist patterns", () => {
      const json = '{"user": "John", "password": "secret123"}';

      expect(() => parseStrictJson(json, {
        blacklist: ["password"]
      })).toThrow(InvalidJsonError);
    });

    it("should allow keys not in blacklist", () => {
      const json = '{"user": "John", "email": "test@example.com"}';
      const result = parseStrictJson(json, {
        blacklist: ["password"]
      });
      expect(result).toEqual({
        user: "John",
        email: "test@example.com"
      });
    });

    it("should support wildcard patterns in blacklist", () => {
      const json = '{"user": {"name": "John", "password": "secret"}}';

      expect(() => parseStrictJson(json, {
        blacklist: ["*.password"]
      })).toThrow(InvalidJsonError);
    });

    it("should reject nested keys matching blacklist patterns", () => {
      const json = '{"user": {"data": {"password": "secret"}}}';

      expect(() => parseStrictJson(json, {
        blacklist: ["password"]
      })).toThrow(InvalidJsonError);
    });
  });

  describe("Whitelist and Blacklist combination", () => {
    it("should check blacklist first, then whitelist", () => {
      const json = '{"user": {"name": "John", "password": "secret"}}';

      // Blacklist should reject keys not in whitelist
      expect(() => parseStrictJson(json, {
        whitelist: ["user.name"],
        blacklist: ["*.password"]
      })).toThrow(InvalidJsonError);
    });

    it("should allow keys in whitelist but not in blacklist", () => {
      const json = '{"user": {"name": "John", "email": "test@example.com"}}';
      const result = parseStrictJson(json, {
        whitelist: ["user.*"],
        blacklist: ["*.password"]
      });
      expect(result).toEqual({
        user: { name: "John", email: "test@example.com" }
      });
    });
  });

  describe("maxDepth", () => {
    it("should reject JSON exceeding maxDepth", () => {
      const json = '{"l1": {"l2": {"l3": {"l4": "value"}}}}';

      expect(() => parseStrictJson(json, {
        maxDepth: 3
      })).toThrow(DepthLimitError);
    });

    it("should allow JSON within maxDepth limit", () => {
      const json = '{"l1": {"l2": {"l3": "value"}}}';
      const result = parseStrictJson(json, {
        maxDepth: 3
      });
      expect(result).toEqual({
        l1: { l2: { l3: "value" } }
      });
    });

    it("should handle depth correctly for arrays", () => {
      const json = '{"items": [{"nested": {"deep": "value"}}]}';

      expect(() => parseStrictJson(json, {
        maxDepth: 3
      })).toThrow(DepthLimitError);
    });

    it("should provide correct depth information in error", () => {
      const json = '{"l1": {"l2": {"l3": {"l4": "value"}}}}';

      try {
        parseStrictJson(json, { maxDepth: 3 });
        expect.fail("Should have thrown DepthLimitError");
      } catch (error) {
        expect(error).toBeInstanceOf(DepthLimitError);
        if (error instanceof DepthLimitError) {
          expect(error.currentDepth).toBe(4);
          expect(error.maxDepth).toBe(3);
          expect(error.code).toBe("STRICT_JSON_DEPTH_LIMIT");
        }
      }
    });

    it("should use default maxDepth of 20 when not specified", () => {
      // Create valid JSON with depth 21
      let json = '"value"';
      for (let i = 0; i < 21; i++) {
        json = JSON.stringify({ [`l${i + 1}`]: JSON.parse(json) });
      }

      expect(() => parseStrictJson(json)).toThrow(DepthLimitError);
    });

    it("should handle shallow JSON with high maxDepth", () => {
      const json = '{"user": "John"}';
      const result = parseStrictJson(json, {
        maxDepth: 100
      });
      expect(result).toEqual({ user: "John" });
    });
  });

  describe("Complex scenarios", () => {
    it("should handle arrays with whitelist and blacklist", () => {
      const json = '{"users": [{"name": "John", "password": "secret"}, {"name": "Jane", "email": "jane@example.com"}]}';

      expect(() => parseStrictJson(json, {
        whitelist: ["users.*.name"],
        blacklist: ["*.password"]
      })).toThrow(InvalidJsonError);
    });

    it("should validate nested objects with multiple patterns", () => {
      const json = '{"data": {"user": {"name": "John", "email": "john@example.com"}, "settings": {"theme": "dark"}}}';

      const result = parseStrictJson(json, {
        whitelist: ["data.user.*", "data.settings.theme"],
        blacklist: ["*.email"]
      });

      expect(() => parseStrictJson(json, {
        whitelist: ["data.user.*"],
        blacklist: ["*.email"]
      })).toThrow(InvalidJsonError);
    });

    it("should work with empty whitelist (allow nothing)", () => {
      const json = '{"user": "John"}';

      expect(() => parseStrictJson(json, {
        whitelist: []
      })).toThrow(InvalidJsonError);
    });

    it("should work with empty blacklist (allow everything)", () => {
      const json = '{"user": "John", "password": "secret"}';
      const result = parseStrictJson(json, {
        blacklist: []
      });
      expect(result).toEqual({
        user: "John",
        password: "secret"
      });
    });

    it("should combine maxDepth with whitelist", () => {
      const json = '{"data": {"nested": {"deep": {"value": "test"}}}}';

      expect(() => parseStrictJson(json, {
        whitelist: ["data.*"],
        maxDepth: 3
      })).toThrow(DepthLimitError);
    });

    it("should handle complex nested structures", () => {
      const json = JSON.stringify({
        response: {
          data: {
            users: [
              { id: 1, name: "John", profile: { age: 30 } },
              { id: 2, name: "Jane", profile: { age: 25 } }
            ],
            metadata: { count: 2 }
          }
        }
      });

      const result = parseStrictJson(json, {
        whitelist: [
          "response.data.users[*].*",
          "response.data.metadata.*"
        ],
        maxDepth: 10
      });

      expect(result.response.data.users).toHaveLength(2);
      expect(result.response.data.users[0].name).toBe("John");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty JSON", () => {
      const json = '{}';
      const result = parseStrictJson(json, {
        whitelist: [],
        blacklist: []
      });
      expect(result).toEqual({});
    });

    it("should handle JSON with only arrays", () => {
      const json = '{"items": [1, 2, 3]}';
      const result = parseStrictJson(json, {
        whitelist: ["items"]
      });
      expect(result).toEqual({ items: [1, 2, 3] });
    });

    it("should handle numeric keys in patterns", () => {
      const json = '{"data": {"0": "value"}}';
      const result = parseStrictJson(json, {
        whitelist: ["data.0"]
      });
      expect(result).toEqual({ data: { "0": "value" } });
    });

    it("should handle special characters in keys", () => {
      const json = '{"user-name": "John", "user_email": "john@example.com"}';
      const result = parseStrictJson(json, {
        whitelist: ["user-name", "user_email"]
      });
      expect(result).toEqual({
        "user-name": "John",
        "user_email": "john@example.com"
      });
    });
  });
});
