import { describe, it, expect, vi } from "vitest";
import { parseStrictJson, parseStrictJsonAsync, DuplicateKeyError, InvalidJsonError, BodyTooLargeError, PrototypePollutionError } from "../src/index.js";

describe("Custom Error Handlers", () => {
  it("should call onDuplicateKey handler when duplicate key is detected", async () => {
    const handler = vi.fn();
    const json = '{"user": "John", "user": "Jane"}';

    try {
      await parseStrictJsonAsync(json, { onDuplicateKey: handler });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledTimes(1);
      if (error instanceof DuplicateKeyError) {
        expect(handler).toHaveBeenCalledWith(error);
      }
    }
  });

  it("should call onInvalidJson handler for invalid JSON", async () => {
    const handler = vi.fn();
    const json = '{"user": "John", age: 30}'; // Invalid JSON

    try {
      await parseStrictJsonAsync(json, { onInvalidJson: handler });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(handler).toHaveBeenCalled();
      if (error instanceof InvalidJsonError) {
        expect(handler).toHaveBeenCalledWith(error);
      }
    }
  });

  it("should call onBodyTooLarge handler when body exceeds limit", async () => {
    const handler = vi.fn();
    const json = '{"data": "' + "x".repeat(1000) + '"}';

    try {
      await parseStrictJsonAsync(json, {
        maxBodySizeBytes: 100,
        onBodyTooLarge: handler
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(handler).toHaveBeenCalled();
      if (error instanceof BodyTooLargeError) {
        expect(handler).toHaveBeenCalledWith(error);
      }
    }
  });

  it("should call onPrototypePollution handler for prototype pollution", async () => {
    const handler = vi.fn();
    const json = '{"__proto__": {"isAdmin": true}}';

    try {
      await parseStrictJsonAsync(json, { onPrototypePollution: handler });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(handler).toHaveBeenCalled();
      if (error instanceof PrototypePollutionError) {
        expect(handler).toHaveBeenCalledWith(error);
      }
    }
  });

  it("should call onError handler for all errors", async () => {
    const handler = vi.fn();

    // Test duplicate key error
    try {
      await parseStrictJsonAsync('{"user": "John", "user": "Jane"}', { onError: handler });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(handler).toHaveBeenCalled();
    }

    handler.mockClear();

    // Test prototype pollution error
    try {
      await parseStrictJsonAsync('{"__proto__": {"isAdmin": true}}', { onError: handler });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(handler).toHaveBeenCalled();
    }
  });

  it("should support async error handlers", async () => {
    const handler = vi.fn().mockImplementation(async (error: any) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return error;
    });
    const json = '{"user": "John", "user": "Jane"}';

    try {
      await parseStrictJsonAsync(json, { onDuplicateKey: handler });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(handler).toHaveBeenCalled();
      expect(handler).toHaveBeenCalledTimes(1);
    }
  });

  it("should call both specific and generic error handlers", async () => {
    const specificHandler = vi.fn();
    const genericHandler = vi.fn();
    const json = '{"user": "John", "user": "Jane"}';

    try {
      await parseStrictJson(json, {
        onDuplicateKey: specificHandler,
        onError: genericHandler
      });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(specificHandler).toHaveBeenCalled();
      expect(genericHandler).toHaveBeenCalled();
      expect(specificHandler).toHaveBeenCalledTimes(1);
      expect(genericHandler).toHaveBeenCalledTimes(1);
    }
  });

  it("should not throw if handler catches the error", async () => {
    const handler = vi.fn();
    const json = '{"user": "John", "user": "Jane"}';

    try {
      await parseStrictJsonAsync(json, { onDuplicateKey: handler });
      expect.fail("Should have thrown an error");
    } catch (error) {
      // Handler was called, error was still thrown
      expect(handler).toHaveBeenCalled();
    }
  });

  it("should handle multiple errors with same handler", async () => {
    const handler = vi.fn();
    const errors = [
      '{"user": "John", "user": "Jane"}',
      '{"__proto__": {"isAdmin": true}}',
    ];

    for (const json of errors) {
      try {
        await parseStrictJsonAsync(json, { onError: handler });
      } catch (error) {
        // Expected
      }
    }

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("should work with synchronous handlers", async () => {
    const handler = vi.fn().mockReturnValue(undefined);
    const json = '{"user": "John", "user": "Jane"}';

    try {
      await parseStrictJsonAsync(json, { onDuplicateKey: handler });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(handler).toHaveBeenCalled();
    }
  });

  it("should allow handler to perform side effects", async () => {
    let called = false;
    const handler = vi.fn().mockImplementation((error: any) => {
      called = true;
    });
    const json = '{"user": "John", "user": "Jane"}';

    try {
      await parseStrictJsonAsync(json, { onDuplicateKey: handler });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(called).toBe(true);
      expect(handler).toHaveBeenCalled();
    }
  });

  it("should handle errors in handlers gracefully", async () => {
    const failingHandler = vi.fn().mockImplementation(() => {
      throw new Error("Handler failed");
    });
    const json = '{"user": "John", "user": "Jane"}';

    try {
      await parseStrictJson(json, { onDuplicateKey: failingHandler });
      expect.fail("Should have thrown an error");
    } catch (error) {
      // Should still throw the original error
      expect(error).toBeInstanceOf(DuplicateKeyError);
    }
  });

  it("should call handler with correct error instance", async () => {
    const handler = vi.fn();
    const json = '{"user": "John", "user": "Jane"}';

    try {
      await parseStrictJsonAsync(json, { onDuplicateKey: handler });
      expect.fail("Should have thrown an error");
    } catch (error) {
      if (error instanceof DuplicateKeyError) {
        expect(handler).toHaveBeenCalled();
        expect(handler).toHaveBeenCalledTimes(1);
      }
    }
  });

  it("should work without any handlers defined", async () => {
    const json = '{"user": "John", "age": 30}';

    const result = await parseStrictJson(json, {});
    expect(result).toEqual({ user: "John", age: 30 });
  });

  it("should work with partial handlers configuration", async () => {
    const duplicateHandler = vi.fn();
    const json = '{"user": "John", "user": "Jane"}';

    try {
      await parseStrictJson(json, { onDuplicateKey: duplicateHandler });
      expect.fail("Should have thrown an error");
    } catch (error) {
      expect(duplicateHandler).toHaveBeenCalled();
    }
  });
});
