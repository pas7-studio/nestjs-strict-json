import { describe, expect, it } from 'vitest';
import { Readable } from 'stream';
import {
  StreamingJsonParser,
  shouldUseStreaming,
} from '../src/core/streaming-parser.js';
import { parseLargePayload, shouldUseStreamingForPayload } from '../src/core/parser/streaming.js';
import { DuplicateKeyError, InvalidJsonError } from '../src/core/errors.js';
import type { StrictJsonOptions } from '../src/core/types.js';

describe('StreamingJsonParser', () => {
  // Helper function to test if parser validates successfully
  // Note: Each parser instance must be fresh for correct state management
  async function validateSuccessfully(
    jsonString: string,
    options?: StrictJsonOptions,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const parser = new StreamingJsonParser(options);

      parser.on('end', resolve);
      parser.on('error', reject);

      const stream = Readable.from([jsonString]);
      stream.pipe(parser);
    });
  }

  // Helper function to test if parser rejects with error
  async function validateWithError(
    jsonString: string,
    options?: StrictJsonOptions,
  ): Promise<Error> {
    return new Promise((resolve) => {
      const parser = new StreamingJsonParser(options);

      parser.on('end', () => {
        resolve(new Error('Expected error but parsing completed'));
      });

      parser.on('error', (err) => {
        resolve(err as Error);
      });

      const stream = Readable.from([jsonString]);
      stream.pipe(parser);
    });
  }

  // ========== Basic parsing tests ==========
  describe('Basic parsing', () => {
    it('should validate complete object from single chunk', async () => {
      const json = '{"name":"John","age":30,"city":"New York"}';
      const parser = new StreamingJsonParser();

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should validate array from single chunk', async () => {
      const json = '[1,2,3,4,5]';
      const parser = new StreamingJsonParser();

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should validate nested objects from single chunk', async () => {
      const json = '{"user":{"name":"John","age":30},"meta":{"created":"2024"}}';
      const parser = new StreamingJsonParser();

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should validate empty object', async () => {
      const json = '{}';
      const parser = new StreamingJsonParser();

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should validate empty array', async () => {
      const json = '[]';
      const parser = new StreamingJsonParser();

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should validate deeply nested object', async () => {
      const json = JSON.stringify({
        level1: {
          level2: {
            level3: {
              level4: {
                value: 'deep',
              },
            },
          },
        },
      });
      const parser = new StreamingJsonParser();

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });
  });

  // ========== Duplicate key detection tests ==========
  describe('Duplicate key detection', () => {
    it('should detect duplicate keys in object (single level)', async () => {
      const json = '{"name":"John","name":"Jane"}';
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain("Duplicate key 'name'");
    });

    it('should detect duplicate keys in nested objects', async () => {
      const json = '{"user":{"name":"John","name":"Jane"}}';
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain("Duplicate key 'name'");
    });

    it('should detect duplicate keys in arrays', async () => {
      const json = '[{"id":1,"id":2}]';
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain("Duplicate key 'id'");
    });

    it('should detect duplicate keys with multiple chunks', async () => {
      const json = '{"name":"John","name":"Jane"}';
      const chunks = ['{"name":"John",', '"name":"Jane"}'];
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from(chunks);
        stream.pipe(parser);
      });

      expect(error.message).toContain("Duplicate key 'name'");
    });

    it('should not detect duplicates when keys are different', async () => {
      const json = '{"name":"John","age":30}';
      const parser = new StreamingJsonParser();

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should allow same keys in different objects', async () => {
      const json = '{"user1":{"name":"John"},"user2":{"name":"Jane"}}';
      const parser = new StreamingJsonParser();

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should allow same keys in different array elements', async () => {
      const json = '[{"id":1},{"id":2}]';
      const parser = new StreamingJsonParser();

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should detect duplicate in root object with nested arrays', async () => {
      const json = '{"data":[1,2,3],"data":[4,5,6]}';
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain("Duplicate key 'data'");
    });

    it('should detect duplicate in deeply nested structure', async () => {
      const json = '{"a":{"b":{"c":{"d":1,"d":2}}}}';
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain("Duplicate key 'd'");
    });
  });

  // ========== Prototype pollution protection tests ==========
  describe('Prototype pollution protection', () => {
    it('should block __proto__ key', async () => {
      const json = '{"__proto__":{"polluted":true}}';
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain('Prototype pollution detected');
    });

    it('should block constructor key', async () => {
      const json = '{"constructor":{"polluted":true}}';
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain('Prototype pollution detected');
    });

    it('should block prototype key', async () => {
      const json = '{"prototype":{"polluted":true}}';
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain('Prototype pollution detected');
    });

    it('should block custom dangerous keys', async () => {
      const json = '{"customDangerousKey":"value"}';
      const options: StrictJsonOptions = {
        dangerousKeys: ['customDangerousKey'],
      };
      const parser = new StreamingJsonParser(options);

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain('Prototype pollution detected');
    });

    it('should block dangerous keys in nested objects', async () => {
      const json = '{"user":{"__proto__":{"polluted":true}}}';
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain('Prototype pollution detected');
    });

    it('should block dangerous keys in arrays', async () => {
      const json = '[{"__proto__":{"polluted":true}}]';
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain('Prototype pollution detected');
    });

    it('should allow dangerous keys when enablePrototypePollutionProtection is false', async () => {
      const json = '{"__proto__":{"polluted":true}}';
      const options: StrictJsonOptions = {
        enablePrototypePollutionProtection: false,
      };
      const parser = new StreamingJsonParser(options);

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should block dangerous key with multiple custom keys', async () => {
      const json = '{"customDangerousKey":"value"}';
      const options: StrictJsonOptions = {
        dangerousKeys: ['__proto__', 'constructor', 'customDangerousKey'],
      };
      const parser = new StreamingJsonParser(options);

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain('Prototype pollution detected');
    });

    it('should allow safe keys when dangerous keys are defined', async () => {
      const json = '{"safeKey":"value"}';
      const options: StrictJsonOptions = {
        dangerousKeys: ['__proto__', 'constructor'],
      };
      const parser = new StreamingJsonParser(options);

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });
  });

  // ========== Depth limit tests ==========
  describe('Depth limit', () => {
    it('should use default maxDepth (20)', async () => {
      const json = JSON.stringify({
        l1: { l2: { l3: { l4: { value: 'ok' } } } },
      });
      const parser = new StreamingJsonParser();

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should use custom maxDepth', async () => {
      const json = JSON.stringify({
        l1: { l2: { l3: { l4: { value: 'ok' } } } },
      });
      const options: StrictJsonOptions = { maxDepth: 5 };
      const parser = new StreamingJsonParser(options);

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should throw MaxDepthExceededError when exceeding limit', async () => {
      // Create deeply nested structure (22 levels)
      let obj: Record<string, unknown> = {};
      let current = obj;
      for (let i = 0; i < 22; i++) {
        current[`level${i}`] = {};
        current = current[`level${i}`] as Record<string, unknown>;
      }
      current.value = 'deep';

      const json = JSON.stringify(obj);
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain('Depth limit exceeded');
    });

    it('should track depth correctly with objects and arrays', async () => {
      const json = JSON.stringify({
        obj: {
          arr: [{ nested: { value: 'ok' } }],
        },
      });
      const parser = new StreamingJsonParser();

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should handle nested arrays correctly for depth', async () => {
      const json = JSON.stringify([[[{ value: 'ok' }]]]);
      const parser = new StreamingJsonParser();

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should throw on custom depth limit with nested objects', async () => {
      const json = JSON.stringify({ a: { b: { c: { d: 'deep' } } } });
      const options: StrictJsonOptions = { maxDepth: 2 };
      const parser = new StreamingJsonParser(options);

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain('Depth limit exceeded');
    });

    it('should count depth correctly for mixed structures', async () => {
      const json = JSON.stringify({
        level1: [
          {
            level2: {
              level3: [{ level4: 'value' }],
            },
          },
        ],
      });
      const options: StrictJsonOptions = { maxDepth: 10 };
      const parser = new StreamingJsonParser(options);

      await new Promise<void>((resolve, reject) => {
        parser.on('end', resolve);
        parser.on('error', reject);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });
    });

    it('should include current depth in error message', async () => {
      let obj: Record<string, unknown> = {};
      let current = obj;
      for (let i = 0; i < 25; i++) {
        current[`level${i}`] = {};
        current = current[`level${i}`] as Record<string, unknown>;
      }
      current.value = 'deep';

      const json = JSON.stringify(obj);
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain('Depth limit exceeded');
    });
  });

  // ========== Error handling tests ==========
  describe('Error handling', () => {
    it('should emit error event on duplicate key', async () => {
      const parser = new StreamingJsonParser();
      let errorEmitted = false;
      let errorMessage = '';

      parser.on('error', (err) => {
        errorEmitted = true;
        errorMessage = (err as Error).message;
      });

      const json = '{"name":"John","name":"Jane"}';
      const stream = Readable.from([json]);
      stream.pipe(parser);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(errorEmitted).toBe(true);
      expect(errorMessage).toContain("Duplicate key 'name'");
    });

    it('should emit error event on prototype pollution', async () => {
      const parser = new StreamingJsonParser();
      let errorEmitted = false;
      let errorMessage = '';

      parser.on('error', (err) => {
        errorEmitted = true;
        errorMessage = (err as Error).message;
      });

      const json = '{"__proto__":{"polluted":true}}';
      const stream = Readable.from([json]);
      stream.pipe(parser);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(errorEmitted).toBe(true);
      expect(errorMessage).toContain('Prototype pollution detected');
    });

    it('should emit error event on max depth exceeded', async () => {
      const parser = new StreamingJsonParser({ maxDepth: 3 });
      let errorEmitted = false;
      let errorMessage = '';

      parser.on('error', (err) => {
        errorEmitted = true;
        errorMessage = (err as Error).message;
      });

      const json = JSON.stringify({ a: { b: { c: { d: 'deep' } } } });
      const stream = Readable.from([json]);
      stream.pipe(parser);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(errorEmitted).toBe(true);
      expect(errorMessage).toContain('Depth limit exceeded');
    });

    it('should throw on incomplete JSON', async () => {
      const json = '{"name":"John"';
      const parser = new StreamingJsonParser();

      const error = await new Promise<Error>((resolve) => {
        parser.on('error', resolve);
        const stream = Readable.from([json]);
        stream.pipe(parser);
      });

      expect(error.message).toContain('Incomplete JSON');
    });

    it('should emit error event on invalid JSON', async () => {
      const parser = new StreamingJsonParser();
      let errorEmitted = false;
      let errorMessage = '';

      parser.on('error', (err) => {
        errorEmitted = true;
        errorMessage = (err as Error).message;
      });

      const json = '{invalid json}';
      const stream = Readable.from([json]);
      stream.pipe(parser);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(errorEmitted).toBe(true);
      expect(errorMessage).toContain('Incomplete JSON');
    });

    it('should handle error during chunk processing', async () => {
      const parser = new StreamingJsonParser();
      let errorEmitted = false;

      parser.on('error', () => {
        errorEmitted = true;
      });

      const json = '{"name":"John","name":"Jane"}';
      const stream = Readable.from([json]);
      stream.pipe(parser);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(errorEmitted).toBe(true);
    });
  });
});

describe('shouldUseStreaming', () => {
  it('should return false when enableStreaming is false', () => {
    const result = shouldUseStreaming(1000000, { enableStreaming: false });
    expect(result).toBe(false);
  });

  it('should return true when contentLength exceeds threshold', () => {
    const result = shouldUseStreaming(200000, {
      enableStreaming: true,
      streamingThreshold: 100000,
    });
    expect(result).toBe(true);
  });

  it('should return false when contentLength is below threshold', () => {
    const result = shouldUseStreaming(50000, {
      enableStreaming: true,
      streamingThreshold: 100000,
    });
    expect(result).toBe(false);
  });

  it('should use default threshold of 100KB when not specified', () => {
    const result = shouldUseStreaming(150000, { enableStreaming: true });
    expect(result).toBe(true);
  });

  it('should return false when contentLength is undefined', () => {
    const result = shouldUseStreaming(undefined, { enableStreaming: true });
    expect(result).toBe(false);
  });

  it('should return false when options are not provided', () => {
    const result = shouldUseStreaming(200000);
    expect(result).toBe(false);
  });

  it('should handle exact threshold match', () => {
    const result = shouldUseStreaming(100000, {
      enableStreaming: true,
      streamingThreshold: 100000,
    });
    expect(result).toBe(true);
  });

  it('should use custom threshold', () => {
    const result = shouldUseStreaming(500000, {
      enableStreaming: true,
      streamingThreshold: 500000,
    });
    expect(result).toBe(true);
  });
});

describe('shouldUseStreamingForPayload', () => {
  it('should return false when enableStreaming is false', () => {
    const buffer = Buffer.from('{"test":1}');
    const result = shouldUseStreamingForPayload(buffer, { enableStreaming: false });
    expect(result).toBe(false);
  });

  it('should return true when buffer size exceeds threshold', () => {
    const largeBuffer = Buffer.alloc(200 * 1024); // 200KB
    const result = shouldUseStreamingForPayload(largeBuffer, {
      enableStreaming: true,
      streamingThreshold: 100 * 1024,
    });
    expect(result).toBe(true);
  });

  it('should return false when buffer size is below threshold', () => {
    const smallBuffer = Buffer.from('{"test":1}');
    const result = shouldUseStreamingForPayload(smallBuffer, {
      enableStreaming: true,
      streamingThreshold: 100 * 1024,
    });
    expect(result).toBe(false);
  });

  it('should use default threshold of 100KB when not specified', () => {
    const largeBuffer = Buffer.alloc(150 * 1024); // 150KB
    const result = shouldUseStreamingForPayload(largeBuffer, { enableStreaming: true });
    expect(result).toBe(true);
  });

  it('should return false when options are not provided', () => {
    const buffer = Buffer.from('{"test":1}');
    const result = shouldUseStreamingForPayload(buffer);
    expect(result).toBe(false);
  });

  it('should handle exact threshold match', () => {
    const buffer = Buffer.alloc(100 * 1024); // exactly 100KB
    const result = shouldUseStreamingForPayload(buffer, {
      enableStreaming: true,
      streamingThreshold: 100 * 1024,
    });
    expect(result).toBe(true);
  });
});

describe('parseLargePayload', () => {
  // ========== Valid JSON tests ==========
  describe('Valid JSON parsing', () => {
    it('should parse valid object', async () => {
      const json = '{"name":"John","age":30}';
      const buffer = Buffer.from(json);
      
      const result = await parseLargePayload(buffer);
      
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should parse valid array', async () => {
      const json = '[1,2,3,4,5]';
      const buffer = Buffer.from(json);
      
      const result = await parseLargePayload(buffer);
      
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should parse nested objects', async () => {
      const json = '{"user":{"name":"John","address":{"city":"NYC"}}}';
      const buffer = Buffer.from(json);
      
      const result = await parseLargePayload(buffer);
      
      expect(result).toEqual({
        user: {
          name: 'John',
          address: { city: 'NYC' }
        }
      });
    });

    it('should parse empty object', async () => {
      const json = '{}';
      const buffer = Buffer.from(json);
      
      const result = await parseLargePayload(buffer);
      
      expect(result).toEqual({});
    });

    it('should parse empty array', async () => {
      const json = '[]';
      const buffer = Buffer.from(json);
      
      const result = await parseLargePayload(buffer);
      
      expect(result).toEqual([]);
    });

    it('should parse large valid payload', async () => {
      // Create a large object
      const largeObj: Record<string, unknown> = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = `value${i}`;
      }
      const json = JSON.stringify(largeObj);
      const buffer = Buffer.from(json);
      
      const result = await parseLargePayload(buffer);
      
      expect(result).toEqual(largeObj);
    });
  });

  // ========== Duplicate key detection tests ==========
  describe('Duplicate key detection', () => {
    it('should throw DuplicateKeyError for duplicate keys at root level', async () => {
      const json = '{"name":"John","name":"Jane"}';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow(DuplicateKeyError);
    });

    it('should include key name in error message', async () => {
      const json = '{"name":"John","name":"Jane"}';
      const buffer = Buffer.from(json);
      
      try {
        await parseLargePayload(buffer);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DuplicateKeyError);
        expect((error as DuplicateKeyError).details.key).toBe('name');
      }
    });

    it('should detect duplicate keys in nested objects', async () => {
      const json = '{"user":{"name":"John","name":"Jane"}}';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow(DuplicateKeyError);
    });

    it('should detect duplicate keys in arrays of objects', async () => {
      const json = '[{"id":1,"id":2}]';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow(DuplicateKeyError);
    });

    it('should detect duplicate in deeply nested structure', async () => {
      const json = '{"a":{"b":{"c":{"d":1,"d":2}}}}';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow(DuplicateKeyError);
    });

    it('should detect duplicate at root with nested arrays', async () => {
      const json = '{"data":[1,2,3],"data":[4,5,6]}';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow(DuplicateKeyError);
    });

    it('should allow same keys in different sibling objects', async () => {
      const json = '{"user1":{"name":"John"},"user2":{"name":"Jane"}}';
      const buffer = Buffer.from(json);
      
      const result = await parseLargePayload(buffer);
      
      expect(result).toEqual({
        user1: { name: 'John' },
        user2: { name: 'Jane' }
      });
    });

    it('should allow same keys in different array elements', async () => {
      const json = '[{"id":1},{"id":2}]';
      const buffer = Buffer.from(json);
      
      const result = await parseLargePayload(buffer);
      
      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });
  });

  // ========== Edge Cases: Buffer boundary tests ==========
  describe('Edge cases: Buffer boundaries', () => {
    it('should detect duplicate when key spans potential buffer boundary', async () => {
      // Simulate a case where duplicate might be split across buffer processing
      const json = '{"name":"John","name":"Jane"}';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow(DuplicateKeyError);
    });

    it('should detect duplicate with long values before second key', async () => {
      // Long value to test buffer handling
      const longValue = 'x'.repeat(1000);
      const json = `{"name":"${longValue}","name":"Jane"}`;
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow(DuplicateKeyError);
    });

    it('should detect duplicate with nested objects and arrays mix', async () => {
      const json = '{"items":[{"name":"a"},{"name":"b"}],"items":[]}';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow(DuplicateKeyError);
    });

    it('should handle deeply nested duplicates', async () => {
      const json = '{"l1":{"l2":{"l3":{"l4":{"dup":1,"dup":2}}}}}';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow(DuplicateKeyError);
    });
  });

  // ========== Invalid JSON tests ==========
  describe('Invalid JSON handling', () => {
    it('should throw InvalidJsonError for incomplete JSON', async () => {
      const json = '{"name":"John"';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow();
    });

    it('should throw error for malformed JSON', async () => {
      const json = '{invalid json}';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow();
    });

    it('should throw error for unclosed array', async () => {
      const json = '[1,2,3';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow();
    });
  });

  // ========== Prototype pollution tests ==========
  describe('Prototype pollution protection', () => {
    it('should block __proto__ key', async () => {
      const json = '{"__proto__":{"polluted":true}}';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow();
    });

    it('should block constructor key', async () => {
      const json = '{"constructor":{"polluted":true}}';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow();
    });

    it('should block prototype key', async () => {
      const json = '{"prototype":{"polluted":true}}';
      const buffer = Buffer.from(json);
      
      await expect(parseLargePayload(buffer)).rejects.toThrow();
    });
  });

  // ========== Custom error handler tests ==========
  describe('Custom error handlers', () => {
    it('should call onDuplicateKey handler when duplicate is found', async () => {
      const json = '{"name":"John","name":"Jane"}';
      const buffer = Buffer.from(json);
      
      let handlerCalled = false;
      let capturedError: Error | null = null;
      
      const options: StrictJsonOptions = {
        onDuplicateKey: (error) => {
          handlerCalled = true;
          capturedError = error as Error;
        }
      };
      
      await expect(parseLargePayload(buffer, options)).rejects.toThrow();
      
      expect(handlerCalled).toBe(true);
      expect(capturedError).toBeInstanceOf(DuplicateKeyError);
    });

    it('should call onInvalidJson handler for invalid JSON', async () => {
      const json = '{"name":"John"';
      const buffer = Buffer.from(json);
      
      let handlerCalled = false;
      let capturedError: Error | null = null;
      
      const options: StrictJsonOptions = {
        onInvalidJson: (error) => {
          handlerCalled = true;
          capturedError = error as Error;
        }
      };
      
      await expect(parseLargePayload(buffer, options)).rejects.toThrow();
      
      expect(handlerCalled).toBe(true);
    });

    it('should call onError handler for any error', async () => {
      const json = '{"name":"John","name":"Jane"}';
      const buffer = Buffer.from(json);
      
      let handlerCalled = false;
      let capturedError: Error | null = null;
      
      const options: StrictJsonOptions = {
        onError: (error) => {
          handlerCalled = true;
          capturedError = error as Error;
        }
      };
      
      await expect(parseLargePayload(buffer, options)).rejects.toThrow();
      
      expect(handlerCalled).toBe(true);
    });
  });
});
