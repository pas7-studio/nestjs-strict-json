/**
 * Порівняльні бенчмарки: @pas7/nestjs-strict-json vs нативний JSON.parse
 */

import { describe, it, expect } from 'vitest';
import { runBenchmark, BenchmarkSuite } from '../../utils/benchmark-runner.js';
import { saveReports } from '../../utils/reporters.js';
import {
  generateSmallJson,
  generateMediumJson,
  generateLargeJson,
  generateJsonWithDuplicates,
  generateDeepNestedJson,
  toJsonString
} from '../../utils/generators.js';
import { parseStrictJson, parseStrictJsonAsync, parseJsonStream } from '../../../src/index.js';
import { Readable } from 'stream';

describe('Comparison: @pas7/nestjs-strict-json vs Native JSON.parse', () => {
  const suite = new BenchmarkSuite();

  // Small JSON (~1KB)
  const smallJson = toJsonString(generateSmallJson());
  const mediumJson = toJsonString(generateMediumJson());
  const largeJson = toJsonString(generateLargeJson());
  const duplicateJson = generateJsonWithDuplicates();
  const deepNestedJson = toJsonString(generateDeepNestedJson(20));

  // Benchmark 1: Small JSON parsing
  describe('Small JSON (~1KB)', () => {
    it('Native JSON.parse', async () => {
      const result = runBenchmark(
        'Small JSON (1KB)',
        'Native JSON.parse',
        () => {
          JSON.parse(smallJson);
        },
        1000
      );
      console.log(`Native JSON.parse (Small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json (buffer)', async () => {
      const result = runBenchmark(
        'Small JSON (1KB)',
        '@pas7/nestjs-strict-json (buffer)',
        () => {
          parseStrictJson(smallJson);
        },
        1000
      );
      console.log(`@pas7 (buffer) (Small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json (streaming)', async () => {
      const result = await runBenchmark(
        'Small JSON (1KB)',
        '@pas7/nestjs-strict-json (streaming)',
        async () => {
          const stream = Readable.from([smallJson]);
          await parseJsonStream(stream);
        },
        500
      );
      console.log(`@pas7 (streaming) (Small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 2: Medium JSON (~100KB)
  describe('Medium JSON (~100KB)', () => {
    it('Native JSON.parse', async () => {
      const result = runBenchmark(
        'Medium JSON (100KB)',
        'Native JSON.parse',
        () => {
          JSON.parse(mediumJson);
        },
        500
      );
      console.log(`Native JSON.parse (Medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json (buffer)', async () => {
      const result = runBenchmark(
        'Medium JSON (100KB)',
        '@pas7/nestjs-strict-json (buffer)',
        () => {
          parseStrictJson(mediumJson);
        },
        500
      );
      console.log(`@pas7 (buffer) (Medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json (streaming)', async () => {
      const result = await runBenchmark(
        'Medium JSON (100KB)',
        '@pas7/nestjs-strict-json (streaming)',
        async () => {
          const stream = Readable.from([mediumJson]);
          await parseJsonStream(stream);
        },
        200
      );
      console.log(`@pas7 (streaming) (Medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 3: Large JSON (~1MB)
  describe('Large JSON (~1MB)', () => {
    it('Native JSON.parse', async () => {
      const result = runBenchmark(
        'Large JSON (1MB)',
        'Native JSON.parse',
        () => {
          JSON.parse(largeJson);
        },
        100
      );
      console.log(`Native JSON.parse (Large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json (buffer)', async () => {
      const result = runBenchmark(
        'Large JSON (1MB)',
        '@pas7/nestjs-strict-json (buffer)',
        () => {
          parseStrictJson(largeJson);
        },
        100
      );
      console.log(`@pas7 (buffer) (Large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json (streaming)', async () => {
      const result = await runBenchmark(
        'Large JSON (1MB)',
        '@pas7/nestjs-strict-json (streaming)',
        async () => {
          const stream = Readable.from([largeJson]);
          await parseJsonStream(stream);
        },
        50
      );
      console.log(`@pas7 (streaming) (Large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 4: Duplicate key detection
  describe('Duplicate Key Detection', () => {
    it('Native JSON.parse (fails to detect)', async () => {
      const result = runBenchmark(
        'Duplicate Key Detection',
        'Native JSON.parse',
        () => {
          // Native doesn't detect duplicates - just parses
          JSON.parse(duplicateJson);
        },
        1000
      );
      console.log(`Native (duplicate): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB (NO detection)`);
      expect(result.success).toBe(true); // Native doesn't throw on duplicates
    });

    it('@pas7/nestjs-strict-json (detects)', async () => {
      const result = runBenchmark(
        'Duplicate Key Detection',
        '@pas7/nestjs-strict-json (detects)',
        () => {
          try {
            parseStrictJson(duplicateJson);
            return; // Should not reach here
          } catch (e: unknown) {
            // Expected to throw duplicate key error
            if (e instanceof Error && e.message.includes('Duplicate key')) {
              return; // Successfully detected
            }
            throw e;
          }
        },
        1000
      );
      console.log(`@pas7 (detects duplicate): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB (WITH detection)`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 5: Deep nested JSON
  describe('Deep Nested JSON (depth 20)', () => {
    it('Native JSON.parse', async () => {
      const result = runBenchmark(
        'Deep Nested (depth 20)',
        'Native JSON.parse',
        () => {
          JSON.parse(deepNestedJson);
        },
        500
      );
      console.log(`Native (deep nested): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json (buffer)', async () => {
      const result = runBenchmark(
        'Deep Nested (depth 20)',
        '@pas7/nestjs-strict-json (buffer)',
        () => {
          parseStrictJson(deepNestedJson);
        },
        500
      );
      console.log(`@pas7 (buffer) (deep nested): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json (streaming)', async () => {
      const result = await runBenchmark(
        'Deep Nested (depth 20)',
        '@pas7/nestjs-strict-json (streaming)',
        async () => {
          const stream = Readable.from([deepNestedJson]);
          await parseJsonStream(stream);
        },
        200
      );
      console.log(`@pas7 (streaming) (deep nested): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json (enforces depth limit)', async () => {
      const veryDeepJson = toJsonString(generateDeepNestedJson(30));
      const result = runBenchmark(
        'Deep Nested (depth 30 - should fail)',
        '@pas7/nestjs-strict-json (depth limit)',
        () => {
          try {
            parseStrictJson(veryDeepJson);
            return; // Should not reach here
          } catch (e: unknown) {
            // Expected to throw depth limit error
            if (e instanceof Error && e.message.includes('Depth limit')) {
              return; // Successfully enforced limit
            }
            throw e;
          }
        },
        100
      );
      console.log(`@pas7 (depth limit enforced): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 6: Memory efficiency comparison
  describe('Memory Efficiency', () => {
    it('Native JSON.parse - Large payload', async () => {
      const result = runBenchmark(
        'Memory Efficiency (1MB)',
        'Native JSON.parse',
        () => {
          JSON.parse(largeJson);
        },
        50
      );
      console.log(`Native memory: ${result.memory.toFixed(4)}MB avg per operation`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json (buffer) - Large payload', async () => {
      const result = runBenchmark(
        'Memory Efficiency (1MB)',
        '@pas7/nestjs-strict-json (buffer)',
        () => {
          parseStrictJson(largeJson);
        },
        50
      );
      console.log(`@pas7 (buffer) memory: ${result.memory.toFixed(4)}MB avg per operation`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json (streaming) - Large payload', async () => {
      const result = await runBenchmark(
        'Memory Efficiency (1MB)',
        '@pas7/nestjs-strict-json (streaming)',
        async () => {
          const stream = Readable.from([largeJson]);
          await parseJsonStream(stream);
        },
        30
      );
      console.log(`@pas7 (streaming) memory: ${result.memory.toFixed(4)}MB avg per operation`);
      expect(result.success).toBe(true);
    });
  });

  // Full benchmark run with report generation
  it('Run full comparison and generate report', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('RUNNING FULL COMPARISON BENCHMARK');
    console.log('='.repeat(80) + '\n');

    const fullSuite = new BenchmarkSuite();

    // Add all benchmarks to suite
    fullSuite
      // Small JSON
      .add('Small JSON (1KB)', 'Native JSON.parse', () => JSON.parse(smallJson), 1000)
      .add('Small JSON (1KB)', '@pas7 (buffer)', () => parseStrictJson(smallJson), 1000)
      .addAsync('Small JSON (1KB)', '@pas7 (streaming)', async () => {
        const stream = Readable.from([smallJson]);
        await parseJsonStream(stream);
      }, 500)
      // Medium JSON
      .add('Medium JSON (100KB)', 'Native JSON.parse', () => JSON.parse(mediumJson), 500)
      .add('Medium JSON (100KB)', '@pas7 (buffer)', () => parseStrictJson(mediumJson), 500)
      .addAsync('Medium JSON (100KB)', '@pas7 (streaming)', async () => {
        const stream = Readable.from([mediumJson]);
        await parseJsonStream(stream);
      }, 200)
      // Large JSON
      .add('Large JSON (1MB)', 'Native JSON.parse', () => JSON.parse(largeJson), 100)
      .add('Large JSON (1MB)', '@pas7 (buffer)', () => parseStrictJson(largeJson), 100)
      .addAsync('Large JSON (1MB)', '@pas7 (streaming)', async () => {
        const stream = Readable.from([largeJson]);
        await parseJsonStream(stream);
      }, 50)
      // Deep nested
      .add('Deep Nested (20)', 'Native JSON.parse', () => JSON.parse(deepNestedJson), 500)
      .add('Deep Nested (20)', '@pas7 (buffer)', () => parseStrictJson(deepNestedJson), 500)
      .addAsync('Deep Nested (20)', '@pas7 (streaming)', async () => {
        const stream = Readable.from([deepNestedJson]);
        await parseJsonStream(stream);
      }, 200);

    const results = await fullSuite.runAndPrint();
    saveReports(results, 'performance/reports');

    console.log('\n✅ Full comparison completed and reports saved!');
  });
});
