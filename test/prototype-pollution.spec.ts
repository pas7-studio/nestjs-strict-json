import { describe, it, expect } from "vitest";
import { parseStrictJson, PrototypePollutionError } from "../src/index.js";

describe("Prototype Pollution Protection", () => {
  it("should detect __proto__ key", () => {
    const json = '{"user": "John", "__proto__": {"isAdmin": true}}';

    expect(() => parseStrictJson(json)).toThrow(PrototypePollutionError);
  });

  it("should detect constructor key", () => {
    const json = '{"data": {"constructor": {"prototype": {"polluted": true}}}}';

    expect(() => parseStrictJson(json)).toThrow(PrototypePollutionError);
  });

  it("should detect prototype key", () => {
    const json = '{"obj": {"prototype": {"malicious": true}}}';

    expect(() => parseStrictJson(json)).toThrow(PrototypePollutionError);
  });

  it("should reject when dangerous key is found", () => {
    const json = '{"user": "John", "__proto__": {"isAdmin": true}}';

    expect(() => parseStrictJson(json)).toThrow(PrototypePollutionError);
    try {
      parseStrictJson(json);
      expect.fail("Should have thrown PrototypePollutionError");
    } catch (error) {
      expect(error).toBeInstanceOf(PrototypePollutionError);
      if (error instanceof PrototypePollutionError) {
        expect(error.dangerousKey).toBe("__proto__");
        expect(error.path).toBe("$.__proto__");
        expect(error.code).toBe("STRICT_JSON_PROTOTYPE_POLLUTION");
      }
    }
  });

  it("should allow valid JSON without dangerous keys", () => {
    const json = '{"user": {"name": "John", "age": 30}, "data": {"active": true}}';

    const result = parseStrictJson(json);
    expect(result).toEqual({
      user: { name: "John", age: 30 },
      data: { active: true }
    });
  });

  it("should use custom dangerous keys", () => {
    const json = '{"user": "John", "customDangerousKey": "value"}';

    expect(() => parseStrictJson(json, {
      dangerousKeys: ["customDangerousKey"]
    })).toThrow(PrototypePollutionError);
  });

  it("should support multiple custom dangerous keys", () => {
    const json1 = '{"user": "John", "key1": "value"}';
    const json2 = '{"user": "John", "key2": "value"}';

    expect(() => parseStrictJson(json1, {
      dangerousKeys: ["key1", "key2"]
    })).toThrow(PrototypePollutionError);

    expect(() => parseStrictJson(json2, {
      dangerousKeys: ["key1", "key2"]
    })).toThrow(PrototypePollutionError);
  });

  it("should allow keys that are not in dangerous keys list", () => {
    const json = '{"user": "John", "safeKey": "value"}';

    const result = parseStrictJson(json, {
      dangerousKeys: ["__proto__", "constructor"]
    });
    expect(result).toEqual({ user: "John", safeKey: "value" });
  });

  it("can be disabled", () => {
    const json = '{"user": "John", "__proto__": {"isAdmin": true}}';

    // When disabled, should not throw an error
    expect(() => {
      parseStrictJson(json, {
        enablePrototypePollutionProtection: false
      });
    }).not.toThrow();
  });

  it("should detect dangerous keys in nested objects", () => {
    const json = '{"data": {"nested": {"__proto__": {"isAdmin": true}}}}';

    expect(() => parseStrictJson(json)).toThrow(PrototypePollutionError);
  });

  it("should provide correct path for nested dangerous keys", () => {
    const json = '{"data": {"nested": {"__proto__": {"isAdmin": true}}}}';

    try {
      parseStrictJson(json);
      expect.fail("Should have thrown PrototypePollutionError");
    } catch (error) {
      expect(error).toBeInstanceOf(PrototypePollutionError);
      if (error instanceof PrototypePollutionError) {
        expect(error.path).toBe("$.data.nested.__proto__");
      }
    }
  });

  it("should detect dangerous keys in arrays", () => {
    const json = '{"items": [{"name": "item1", "__proto__": {"isAdmin": true}}]}';

    expect(() => parseStrictJson(json)).toThrow(PrototypePollutionError);
  });

  it("should work with arrays of objects containing dangerous keys", () => {
    const json = '{"items": [{"__proto__": {"isAdmin": true}}, {"name": "safe"}]}';

    expect(() => parseStrictJson(json)).toThrow(PrototypePollutionError);
  });

  it("should handle empty JSON", () => {
    const json = '{}';

    const result = parseStrictJson(json);
    expect(result).toEqual({});
  });

  it("should handle JSON with only numbers and strings", () => {
    const json = '{"num": 123, "str": "test", "bool": true}';

    const result = parseStrictJson(json);
    expect(result).toEqual({ num: 123, str: "test", bool: true });
  });
});
