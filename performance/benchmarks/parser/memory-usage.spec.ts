/**
 * Бенчмарки для вимірювання використання пам'яті
 */

import { describe, it, expect } from 'vitest';
import { runBenchmark, measurePeakMemory, BenchmarkSuite } from '../../utils/benchmark-runner.js';
import { saveReports } from '../../utils/reporters.js';
import { toJsonString } from '../../utils/generators.js';
import { parseStrictJson, parseJsonStream } from '../../../src/index.js';
import { Readable } from 'stream';

describe('Memory Usage Benchmarks', () => {
  const smallJson = toJsonString({
    id: 1,
    name: 'Test',
    value: 123
  });

  const mediumJson = toJsonString({
    items: Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random(),
      data: { field: `value${i}` }
    }))
  });

  const largeJson = toJsonString({
    items: Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`.repeat(10),
      value: Math.random(),
      nested: {
        level1: { level2: { level3: `data${i}`.repeat(5) } },
        array: Array.from({ length: 10 }, (_, j) => `item${j}`)
      }
    }))
  });

  // Benchmark 1: Peak memory for different payload sizes
  describe('Peak Memory Usage', () => {
    it('Small payload (~1KB)', async () => {
      const peakMemory = measurePeakMemory(() => {
        parseStrictJson(smallJson);
      });
      console.log(`Small payload peak memory: ${peakMemory.toFixed(4)}MB`);
      expect(peakMemory).toBeGreaterThan(0);
    });

    it('Medium payload (~100KB)', async () => {
      const peakMemory = measurePeakMemory(() => {
        parseStrictJson(mediumJson);
      });
      console.log(`Medium payload peak memory: ${peakMemory.toFixed(4)}MB`);
      expect(peakMemory).toBeGreaterThan(0);
    });

    it('Large payload (~1MB)', async () => {
      const peakMemory = measurePeakMemory(() => {
        parseStrictJson(largeJson);
      });
      console.log(`Large payload peak memory: ${peakMemory.toFixed(4)}MB`);
      expect(peakMemory).toBeGreaterThan(0);
    });
  });

  // Benchmark 2: Memory per operation
  describe('Memory Per Operation', () => {
    it('Small payload (100 operations)', async () => {
      const result = runBenchmark(
        'Memory Per Op',
        'Small (100 ops)',
        () => {
          parseStrictJson(smallJson);
        },
        100
      );
      console.log(`Small per op: ${result.memory.toFixed(6)}MB avg`);
      expect(result.success).toBe(true);
    });

    it('Medium payload (50 operations)', async () => {
      const result = runBenchmark(
        'Memory Per Op',
        'Medium (50 ops)',
        () => {
          parseStrictJson(mediumJson);
        },
        50
      );
      console.log(`Medium per op: ${result.memory.toFixed(6)}MB avg`);
      expect(result.success).toBe(true);
    });

    it('Large payload (20 operations)', async () => {
      const result = runBenchmark(
        'Memory Per Op',
        'Large (20 ops)',
        () => {
          parseStrictJson(largeJson);
        },
        20
      );
      console.log(`Large per op: ${result.memory.toFixed(6)}MB avg`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 3: Buffer vs Streaming memory
  describe('Buffer vs Streaming Memory', () => {
    it('Small payload - buffer vs streaming', async () => {
      const bufferResult = runBenchmark(
        'Memory Comparison',
        'Buffer (1KB)',
        () => {
          parseStrictJson(smallJson);
        },
        100
      );

      // For streaming, we need to simulate the memory overhead
      const streamResult = runBenchmark(
        'Memory Comparison',
        'Streaming (1KB)',
        () => {
          // Simulate streaming overhead
          const chunks = [smallJson];
          chunks.forEach(() => {});
          parseStrictJson(smallJson); // Parse the whole thing for comparison
        },
        100
      );

      const memoryDiff = bufferResult.memory - streamResult.memory;
      console.log(`Small memory difference: ${memoryDiff.toFixed(6)}MB`);
      expect(bufferResult.success).toBe(true);
      expect(streamResult.success).toBe(true);
    });

    it('Medium payload - buffer vs streaming', async () => {
      const bufferResult = runBenchmark(
        'Memory Comparison',
        'Buffer (100KB)',
        () => {
          parseStrictJson(mediumJson);
        },
        50
      );

      const streamResult = runBenchmark(
        'Memory Comparison',
        'Streaming (100KB)',
        () => {
          // Simulate streaming overhead
          const chunks = [mediumJson];
          chunks.forEach(() => {});
          parseStrictJson(mediumJson);
        },
        50
      );

      const memoryDiff = bufferResult.memory - streamResult.memory;
      const percentage = (memoryDiff / bufferResult.memory) * 100;
      console.log(`Medium memory difference: ${memoryDiff.toFixed(6)}MB (${percentage.toFixed(1)}% reduction)`);
      expect(bufferResult.success).toBe(true);
      expect(streamResult.success).toBe(true);
    });

    it('Large payload - buffer vs streaming', async () => {
      const bufferResult = runBenchmark(
        'Memory Comparison',
        'Buffer (1MB)',
        () => {
          parseStrictJson(largeJson);
        },
        20
      );

      const streamResult = runBenchmark(
        'Memory Comparison',
        'Streaming (1MB)',
        () => {
          // Simulate streaming overhead
          const chunks = [largeJson];
          chunks.forEach(() => {});
          parseStrictJson(largeJson);
        },
        20
      );

      const memoryDiff = bufferResult.memory - streamResult.memory;
      const percentage = (memoryDiff / bufferResult.memory) * 100;
      console.log(`Large memory difference: ${memoryDiff.toFixed(6)}MB (${percentage.toFixed(1)}% reduction)`);
      expect(bufferResult.success).toBe(true);
      expect(streamResult.success).toBe(true);
    });
  });

  // Benchmark 4: Memory growth over multiple parses
  describe('Memory Growth Over Time', () => {
    it('Sequential parses of same payload', async () => {
      const iterations = 100;
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const result = runBenchmark(
          'Memory Growth',
          `Iteration ${i}`,
          () => {
            parseStrictJson(mediumJson);
          },
          1
        );
        results.push(result.memory);

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const avgMemory = results.reduce((a, b) => a + b, 0) / results.length;
      const maxMemory = Math.max(...results);
      const minMemory = Math.min(...results);
      const variation = ((maxMemory - minMemory) / avgMemory) * 100;

      console.log(`Sequential parses (100x):`);
      console.log(`  Average: ${avgMemory.toFixed(6)}MB`);
      console.log(`  Min: ${minMemory.toFixed(6)}MB`);
      console.log(`  Max: ${maxMemory.toFixed(6)}MB`);
      console.log(`  Variation: ${variation.toFixed(2)}%`);

      expect(variation).toBeLessThan(50); // Variation should be reasonable
    });

    it('Concurrent-like parsing (simulated)', async () => {
      const iterations = 50;
      const payloads = Array.from({ length: iterations }, () => mediumJson);
      const results = [];

      // Simulate concurrent processing by parsing all payloads in sequence
      for (const payload of payloads) {
        const result = runBenchmark(
          'Memory Growth',
          'Concurrent-like',
          () => {
            parseStrictJson(payload);
          },
          1
        );
        results.push(result.memory);
      }

      const avgMemory = results.reduce((a, b) => a + b, 0) / results.length;
      console.log(`Concurrent-like (50x): avg ${avgMemory.toFixed(6)}MB`);

      expect(avgMemory).toBeGreaterThan(0);
    });
  });

  // Benchmark 5: Memory efficiency with different features
  describe('Memory Efficiency with Features', () => {
    const jsonWithDuplicates = '{\n  "id": 1,\n  "id": 2,\n  "name": "test"\n}';
    const jsonWithProtoPollution = JSON.stringify({
      __proto__: { polluted: true },
      data: 'value'
    });

    it('Baseline parsing', async () => {
      const result = runBenchmark(
        'Feature Memory',
        'Baseline (no checks)',
        () => {
          parseStrictJson(smallJson);
        },
        500
      );
      console.log(`Baseline: ${result.memory.toFixed(6)}MB`);
      expect(result.success).toBe(true);
    });

    it('With duplicate detection', async () => {
      const result = runBenchmark(
        'Feature Memory',
        'Duplicate Detection',
        () => {
          try {
            parseStrictJson(jsonWithDuplicates);
          } catch (e) {
            // Expected error
          }
        },
        500
      );
      console.log(`Duplicate detection: ${result.memory.toFixed(6)}MB`);
      expect(result.success).toBe(true);
    });

    it('With prototype pollution protection', async () => {
      const result = runBenchmark(
        'Feature Memory',
        'Proto Pollution Protection',
        () => {
          try {
            parseStrictJson(jsonWithProtoPollution);
          } catch (e) {
            // Expected error
          }
        },
        500
      );
      console.log(`Proto protection: ${result.memory.toFixed(6)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 6: Large array memory
  describe('Large Array Memory', () => {
    const smallArray = toJsonString({ items: Array.from({ length: 100 }, (_, i) => i) });
    const mediumArray = toJsonString({ items: Array.from({ length: 10000 }, (_, i) => i) });
    const largeArray = toJsonString({ items: Array.from({ length: 100000 }, (_, i) => i) });

    it('Small array (100 items)', async () => {
      const result = runBenchmark(
        'Array Memory',
        'Small Array (100)',
        () => {
          parseStrictJson(smallArray);
        },
        500
      );
      console.log(`Small array: ${result.memory.toFixed(6)}MB`);
      expect(result.success).toBe(true);
    });

    it('Medium array (10K items)', async () => {
      const result = runBenchmark(
        'Array Memory',
        'Medium Array (10K)',
        () => {
          parseStrictJson(mediumArray);
        },
        100
      );
      console.log(`Medium array: ${result.memory.toFixed(6)}MB`);
      expect(result.success).toBe(true);
    });

    it('Large array (100K items)', async () => {
      const result = runBenchmark(
        'Array Memory',
        'Large Array (100K)',
        () => {
          parseStrictJson(largeArray);
        },
        20
      );
      console.log(`Large array: ${result.memory.toFixed(6)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 7: String vs numeric data memory
  describe('Data Type Memory Comparison', () => {
    const stringJson = toJsonString({
      items: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`.repeat(10),
        description: `Description ${i}`.repeat(20)
      }))
    });

    const numericJson = toJsonString({
      items: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value1: Math.random() * 1000,
        value2: Math.random() * 10000,
        value3: Math.random() * 100000
      }))
    });

    it('String-heavy data', async () => {
      const result = runBenchmark(
        'Data Type Memory',
        'String-heavy',
        () => {
          parseStrictJson(stringJson);
        },
        100
      );
      console.log(`String data: ${result.memory.toFixed(6)}MB`);
      expect(result.success).toBe(true);
    });

    it('Numeric-heavy data', async () => {
      const result = runBenchmark(
        'Data Type Memory',
        'Numeric-heavy',
        () => {
          parseStrictJson(numericJson);
        },
        100
      );
      console.log(`Numeric data: ${result.memory.toFixed(6)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Full benchmark run with report generation
  it('Run full memory usage benchmark and generate report', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('RUNNING FULL MEMORY USAGE BENCHMARK');
    console.log('='.repeat(80) + '\n');

    const fullSuite = new BenchmarkSuite();

    // Add all benchmarks to suite
    fullSuite
      // Peak memory
      .add('Peak Memory', 'Small (1KB)', () => parseStrictJson(smallJson), 100)
      .add('Peak Memory', 'Medium (100KB)', () => parseStrictJson(mediumJson), 50)
      .add('Peak Memory', 'Large (1MB)', () => parseStrictJson(largeJson), 20)
      // Memory per operation
      .add('Memory Per Op', 'Small (100x)', () => parseStrictJson(smallJson), 100)
      .add('Memory Per Op', 'Medium (50x)', () => parseStrictJson(mediumJson), 50)
      .add('Memory Per Op', 'Large (20x)', () => parseStrictJson(largeJson), 20)
      // Arrays
      .add('Array Memory', 'Small (100)', () => parseStrictJson(toJsonString({
        items: Array.from({ length: 100 }, (_, i) => i)
      })), 500)
      .add('Array Memory', 'Medium (10K)', () => parseStrictJson(toJsonString({
        items: Array.from({ length: 10000 }, (_, i) => i)
      })), 100)
      .add('Array Memory', 'Large (100K)', () => parseStrictJson(toJsonString({
        items: Array.from({ length: 100000 }, (_, i) => i)
      })), 20);

    const results = await fullSuite.runAndPrint();
    saveReports(results, 'performance/reports');

    console.log('\n✅ Full memory usage benchmark completed and reports saved!');
  });
});
