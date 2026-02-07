/**
 * Бенчмарки для Streaming parser
 */

import { describe, it, expect } from 'vitest';
import { runBenchmark, runAsyncBenchmark, BenchmarkSuite } from '../../utils/benchmark-runner.js';
import { saveReports } from '../../utils/reporters.js';
import {
  generateSmallJson,
  generateMediumJson,
  generateLargeJson,
  toJsonString
} from '../../utils/generators.js';
import { parseStrictJson, parseJsonStream } from '../../../src/index.js';
import { Readable } from 'stream';

/**
 * Створює потік з JSON даними
 */
function createJsonStream(jsonString: string): Readable {
  return Readable.from([jsonString]);
}

/**
 * Створює потік з JSON даними, розділеними на чанки
 */
function createChunkedJsonStream(jsonString: string, chunkSize: number = 1024): Readable {
  const chunks: string[] = [];
  for (let i = 0; i < jsonString.length; i += chunkSize) {
    chunks.push(jsonString.slice(i, i + chunkSize));
  }
  return Readable.from(chunks);
}

describe('Streaming Parser Benchmarks', () => {
  const smallJson = toJsonString(generateSmallJson());
  const mediumJson = toJsonString(generateMediumJson());
  const largeJson = toJsonString(generateLargeJson());

  // Benchmark 1: Buffer vs Streaming for small payloads
  describe('Buffer vs Streaming (Small ~1KB)', () => {
    it('Buffer parsing', async () => {
      const result = runBenchmark(
        'Small (1KB)',
        'Buffer Parsing',
        () => {
          parseStrictJson(smallJson);
        },
        1000
      );
      console.log(`Buffer (small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Streaming parsing', async () => {
      const result = await runAsyncBenchmark(
        'Small (1KB)',
        'Streaming Parsing',
        async () => {
          const stream = createJsonStream(smallJson);
          await parseJsonStream(stream);
        },
        500
      );
      console.log(`Streaming (small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 2: Buffer vs Streaming for medium payloads
  describe('Buffer vs Streaming (Medium ~100KB)', () => {
    it('Buffer parsing', async () => {
      const result = runBenchmark(
        'Medium (100KB)',
        'Buffer Parsing',
        () => {
          parseStrictJson(mediumJson);
        },
        500
      );
      console.log(`Buffer (medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Streaming parsing', async () => {
      const result = await runAsyncBenchmark(
        'Medium (100KB)',
        'Streaming Parsing',
        async () => {
          const stream = createJsonStream(mediumJson);
          await parseJsonStream(stream);
        },
        200
      );
      console.log(`Streaming (medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 3: Buffer vs Streaming for large payloads
  describe('Buffer vs Streaming (Large ~1MB)', () => {
    it('Buffer parsing', async () => {
      const result = runBenchmark(
        'Large (1MB)',
        'Buffer Parsing',
        () => {
          parseStrictJson(largeJson);
        },
        100
      );
      console.log(`Buffer (large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Streaming parsing', async () => {
      const result = await runAsyncBenchmark(
        'Large (1MB)',
        'Streaming Parsing',
        async () => {
          const stream = createJsonStream(largeJson);
          await parseJsonStream(stream);
        },
        50
      );
      console.log(`Streaming (large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 4: Chunked streaming
  describe('Chunked Streaming', () => {
    it('Small chunked streaming', async () => {
      const result = await runAsyncBenchmark(
        'Chunked Streaming',
        'Small (1KB, chunked)',
        async () => {
          const stream = createChunkedJsonStream(smallJson, 100);
          await parseJsonStream(stream);
        },
        500
      );
      console.log(`Chunked (small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Medium chunked streaming', async () => {
      const result = await runAsyncBenchmark(
        'Chunked Streaming',
        'Medium (100KB, chunked)',
        async () => {
          const stream = createChunkedJsonStream(mediumJson, 1024);
          await parseJsonStream(stream);
        },
        100
      );
      console.log(`Chunked (medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Large chunked streaming', async () => {
      const result = await runAsyncBenchmark(
        'Chunked Streaming',
        'Large (1MB, chunked)',
        async () => {
          const stream = createChunkedJsonStream(largeJson, 4096);
          await parseJsonStream(stream);
        },
        30
      );
      console.log(`Chunked (large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 5: Memory efficiency comparison
  describe('Memory Efficiency', () => {
    it('Memory usage - Small (buffer vs streaming)', async () => {
      const bufferResult = runBenchmark(
        'Memory Efficiency',
        'Buffer (1KB)',
        () => {
          parseStrictJson(smallJson);
        },
        500
      );

      const streamingResult = await runAsyncBenchmark(
        'Memory Efficiency',
        'Streaming (1KB)',
        async () => {
          const stream = createJsonStream(smallJson);
          await parseJsonStream(stream);
        },
        500
      );

      const memoryDiff = bufferResult.memory - streamingResult.memory;
      console.log(`Memory difference (small): ${memoryDiff.toFixed(4)}MB`);
      expect(streamingResult.success).toBe(true);
    });

    it('Memory usage - Medium (buffer vs streaming)', async () => {
      const bufferResult = runBenchmark(
        'Memory Efficiency',
        'Buffer (100KB)',
        () => {
          parseStrictJson(mediumJson);
        },
        200
      );

      const streamingResult = await runAsyncBenchmark(
        'Memory Efficiency',
        'Streaming (100KB)',
        async () => {
          const stream = createJsonStream(mediumJson);
          await parseJsonStream(stream);
        },
        200
      );

      const memoryDiff = bufferResult.memory - streamingResult.memory;
      const improvement = (memoryDiff / bufferResult.memory) * 100;
      console.log(`Memory difference (medium): ${memoryDiff.toFixed(4)}MB (${improvement.toFixed(1)}% improvement)`);
      expect(streamingResult.success).toBe(true);
    });

    it('Memory usage - Large (buffer vs streaming)', async () => {
      const bufferResult = runBenchmark(
        'Memory Efficiency',
        'Buffer (1MB)',
        () => {
          parseStrictJson(largeJson);
        },
        50
      );

      const streamingResult = await runAsyncBenchmark(
        'Memory Efficiency',
        'Streaming (1MB)',
        async () => {
          const stream = createJsonStream(largeJson);
          await parseJsonStream(stream);
        },
        50
      );

      const memoryDiff = bufferResult.memory - streamingResult.memory;
      const improvement = (memoryDiff / bufferResult.memory) * 100;
      console.log(`Memory difference (large): ${memoryDiff.toFixed(4)}MB (${improvement.toFixed(1)}% improvement)`);
      expect(streamingResult.success).toBe(true);
    });
  });

  // Benchmark 6: Performance under load
  describe('Performance Under Load', () => {
    it('Concurrent small streams', async () => {
      const result = await runAsyncBenchmark(
        'Concurrent Streams',
        'Small Concurrent (10 streams)',
        async () => {
          const promises = Array.from({ length: 10 }, () =>
            parseJsonStream(createJsonStream(smallJson))
          );
          await Promise.all(promises);
        },
        100
      );
      console.log(`Concurrent small: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Concurrent medium streams', async () => {
      const result = await runAsyncBenchmark(
        'Concurrent Streams',
        'Medium Concurrent (5 streams)',
        async () => {
          const promises = Array.from({ length: 5 }, () =>
            parseJsonStream(createJsonStream(mediumJson))
          );
          await Promise.all(promises);
        },
        50
      );
      console.log(`Concurrent medium: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 7: Error handling in streaming
  describe('Streaming Error Handling', () => {
    const invalidJson = '{"invalid": json}';
    const duplicateKeyJson = '{\n  "id": 1,\n  "id": 2\n}';

    it('Invalid JSON in stream', async () => {
      const result = await runAsyncBenchmark(
        'Error Handling',
        'Invalid JSON (stream)',
        async () => {
          try {
            const stream = createJsonStream(invalidJson);
            await parseJsonStream(stream);
          } catch (e) {
            // Expected error
            return;
          }
        },
        1000
      );
      console.log(`Invalid JSON (stream): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Duplicate key in stream', async () => {
      const result = await runAsyncBenchmark(
        'Error Handling',
        'Duplicate Key (stream)',
        async () => {
          try {
            const stream = createJsonStream(duplicateKeyJson);
            await parseJsonStream(stream);
          } catch (e) {
            // Expected error
            return;
          }
        },
        1000
      );
      console.log(`Duplicate key (stream): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 8: Large payload handling (2MB+)
  describe('Large Payload Handling (>1MB)', () => {
    // Generate extra large JSON
    const extraLargeJson = toJsonString({
      items: Array.from({ length: 20000 }, (_, i) => ({
        id: i,
        name: `Extra Large Item ${i}`.repeat(10),
        data: { value: Math.random() }
      }))
    });

    it('Extra large - buffer', async () => {
      const result = runBenchmark(
        'Extra Large',
        'Buffer (2MB)',
        () => {
          parseStrictJson(extraLargeJson);
        },
        20
      );
      console.log(`Buffer (extra large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Extra large - streaming', async () => {
      const result = await runAsyncBenchmark(
        'Extra Large',
        'Streaming (2MB)',
        async () => {
          const stream = createChunkedJsonStream(extraLargeJson, 8192);
          await parseJsonStream(stream);
        },
        20
      );
      console.log(`Streaming (extra large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Full benchmark run with report generation
  it('Run full streaming benchmark and generate report', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('RUNNING FULL STREAMING PARSER BENCHMARK');
    console.log('='.repeat(80) + '\n');

    const fullSuite = new BenchmarkSuite();

    // Add all benchmarks to suite
    fullSuite
      // Small payloads
      .add('Small (1KB)', 'Buffer', () => parseStrictJson(smallJson), 1000)
      .addAsync('Small (1KB)', 'Streaming', async () => {
        await parseJsonStream(createJsonStream(smallJson));
      }, 500)
      // Medium payloads
      .add('Medium (100KB)', 'Buffer', () => parseStrictJson(mediumJson), 500)
      .addAsync('Medium (100KB)', 'Streaming', async () => {
        await parseJsonStream(createJsonStream(mediumJson));
      }, 200)
      // Large payloads
      .add('Large (1MB)', 'Buffer', () => parseStrictJson(largeJson), 100)
      .addAsync('Large (1MB)', 'Streaming', async () => {
        await parseJsonStream(createJsonStream(largeJson));
      }, 50)
      // Chunked streaming
      .addAsync('Chunked Small (1KB)', 'Streaming', async () => {
        await parseJsonStream(createChunkedJsonStream(smallJson, 100));
      }, 500)
      .addAsync('Chunked Medium (100KB)', 'Streaming', async () => {
        await parseJsonStream(createChunkedJsonStream(mediumJson, 1024));
      }, 100)
      .addAsync('Chunked Large (1MB)', 'Streaming', async () => {
        await parseJsonStream(createChunkedJsonStream(largeJson, 4096));
      }, 30)
      // Concurrent
      .addAsync('Concurrent Small', 'Streaming', async () => {
        const promises = Array.from({ length: 10 }, () =>
          parseJsonStream(createJsonStream(smallJson))
        );
        await Promise.all(promises);
      }, 100)
      .addAsync('Concurrent Medium', 'Streaming', async () => {
        const promises = Array.from({ length: 5 }, () =>
          parseJsonStream(createJsonStream(mediumJson))
        );
        await Promise.all(promises);
      }, 50);

    const results = await fullSuite.runAndPrint();
    saveReports(results, 'performance/reports');

    console.log('\n✅ Full streaming parser benchmark completed and reports saved!');
  });
});
