/**
 * Бенчмарки для обробки великих payloads
 */

import { describe, it, expect } from 'vitest';
import { runBenchmark, BenchmarkSuite } from '../../utils/benchmark-runner.js';
import { saveReports } from '../../utils/reporters.js';
import { toJsonString } from '../../utils/generators.js';
import { parseStrictJson } from '../../../src/index.js';

/**
 * Генерує JSON з великою кількістю об'єктів
 */
function generateLargeObjectArray(count: number, objectSize: number): string {
  const items = [];

  for (let i = 0; i < count; i++) {
    const obj: Record<string, unknown> = { id: i };

    for (let j = 0; j < objectSize; j++) {
      obj[`field${j}`] = `value${i}_${j}`;
    }

    items.push(obj);
  }

  return JSON.stringify({ items, total: items.length });
}

/**
 * Генерує JSON з довгими рядками
 */
function generateLargeStringArray(count: number, stringLength: number): string {
  const items = [];

  for (let i = 0; i < count; i++) {
    // Генеруємо довгий рядок
    const str = 'x'.repeat(stringLength) + i;
    items.push({ id: i, data: str });
  }

  return JSON.stringify({ items, total: items.length });
}

/**
 * Генерує JSON з вкладеними об'єктами
 */
function generateLargeNestedStructure(
  itemCount: number,
  nestedDepth: number,
  objectSize: number
): string {
  const items = [];

  for (let i = 0; i < itemCount; i++) {
    let nested: Record<string, unknown> = { id: i };

    for (let level = 0; level < nestedDepth; level++) {
      const levelObj: Record<string, unknown> = { level };

      for (let j = 0; j < objectSize; j++) {
        levelObj[`field${level}_${j}`] = `value${i}_${level}_${j}`;
      }

      nested = { ...nested, nested: levelObj };
    }

    items.push(nested);
  }

  return JSON.stringify({ items, total: items.length });
}

/**
 * Генерує JSON з числовими даними
 */
function generateLargeNumericData(count: number, fields: number): string {
  const items = [];

  for (let i = 0; i < count; i++) {
    const obj: Record<string, number> = { id: i };

    for (let j = 0; j < fields; j++) {
      obj[`value${j}`] = Math.random() * 1000000;
    }

    items.push(obj);
  }

  return JSON.stringify({ items, total: items.length });
}

describe('Large Payload Benchmarks', () => {
  // Benchmark 1: Small payloads (~10KB)
  describe('Small Payloads (~10KB)', () => {
    it('100 objects with 5 fields', async () => {
      const json = generateLargeObjectArray(100, 5);
      const result = runBenchmark(
        'Small Payloads',
        '100 Objects x 5 Fields',
        () => {
          parseStrictJson(json);
        },
        1000
      );
      console.log(`100x5: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('500 objects with 2 fields', async () => {
      const json = generateLargeObjectArray(500, 2);
      const result = runBenchmark(
        'Small Payloads',
        '500 Objects x 2 Fields',
        () => {
          parseStrictJson(json);
        },
        1000
      );
      console.log(`500x2: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 2: Medium payloads (~100KB)
  describe('Medium Payloads (~100KB)', () => {
    it('1000 objects with 5 fields', async () => {
      const json = generateLargeObjectArray(1000, 5);
      const result = runBenchmark(
        'Medium Payloads',
        '1000 Objects x 5 Fields',
        () => {
          parseStrictJson(json);
        },
        500
      );
      console.log(`1000x5: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('2000 objects with 3 fields', async () => {
      const json = generateLargeObjectArray(2000, 3);
      const result = runBenchmark(
        'Medium Payloads',
        '2000 Objects x 3 Fields',
        () => {
          parseStrictJson(json);
        },
        500
      );
      console.log(`2000x3: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 3: Large payloads (~1MB)
  describe('Large Payloads (~1MB)', () => {
    it('10000 objects with 5 fields', async () => {
      const json = generateLargeObjectArray(10000, 5);
      const result = runBenchmark(
        'Large Payloads',
        '10000 Objects x 5 Fields',
        () => {
          parseStrictJson(json);
        },
        100
      );
      console.log(`10000x5: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('5000 objects with 10 fields', async () => {
      const json = generateLargeObjectArray(5000, 10);
      const result = runBenchmark(
        'Large Payloads',
        '5000 Objects x 10 Fields',
        () => {
          parseStrictJson(json);
        },
        100
      );
      console.log(`5000x10: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 4: Extra large payloads (>1MB)
  describe('Extra Large Payloads (>1MB)', () => {
    it('20000 objects with 5 fields (~2MB)', async () => {
      const json = generateLargeObjectArray(20000, 5);
      const result = runBenchmark(
        'Extra Large Payloads',
        '20000 Objects x 5 Fields',
        () => {
          parseStrictJson(json);
        },
        50
      );
      console.log(`20000x5: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('50000 objects with 3 fields (~3MB)', async () => {
      const json = generateLargeObjectArray(50000, 3);
      const result = runBenchmark(
        'Extra Large Payloads',
        '50000 Objects x 3 Fields',
        () => {
          parseStrictJson(json);
        },
        20
      );
      console.log(`50000x3: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 5: String data payloads
  describe('String Data Payloads', () => {
    it('100 objects with long strings (1KB each)', async () => {
      const json = generateLargeStringArray(100, 1024);
      const result = runBenchmark(
        'String Payloads',
        '100 Objects x 1KB Strings',
        () => {
          parseStrictJson(json);
        },
        200
      );
      console.log(`100x1KB: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('500 objects with medium strings (500B each)', async () => {
      const json = generateLargeStringArray(500, 500);
      const result = runBenchmark(
        'String Payloads',
        '500 Objects x 500B Strings',
        () => {
          parseStrictJson(json);
        },
        200
      );
      console.log(`500x500B: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 6: Numeric data payloads
  describe('Numeric Data Payloads', () => {
    it('10000 objects with 10 numeric fields', async () => {
      const json = generateLargeNumericData(10000, 10);
      const result = runBenchmark(
        'Numeric Payloads',
        '10000 Objects x 10 Numeric Fields',
        () => {
          parseStrictJson(json);
        },
        100
      );
      console.log(`10000x10: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('50000 objects with 5 numeric fields', async () => {
      const json = generateLargeNumericData(50000, 5);
      const result = runBenchmark(
        'Numeric Payloads',
        '50000 Objects x 5 Numeric Fields',
        () => {
          parseStrictJson(json);
        },
        20
      );
      console.log(`50000x5: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 7: Nested structure payloads
  describe('Nested Structure Payloads', () => {
    it('1000 objects with depth 3', async () => {
      const json = generateLargeNestedStructure(1000, 3, 3);
      const result = runBenchmark(
        'Nested Payloads',
        '1000 Objects x Depth 3 x 3 Fields',
        () => {
          parseStrictJson(json);
        },
        200
      );
      console.log(`1000x3x3: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('500 objects with depth 5', async () => {
      const json = generateLargeNestedStructure(500, 5, 2);
      const result = runBenchmark(
        'Nested Payloads',
        '500 Objects x Depth 5 x 2 Fields',
        () => {
          parseStrictJson(json);
        },
        100
      );
      console.log(`500x5x2: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 8: Performance scaling
  describe('Performance Scaling', () => {
    it('Scale test: 1K -> 10K -> 100K objects', async () => {
      const results = [];

      for (const count of [1000, 10000, 100000]) {
        const json = generateLargeObjectArray(count, 5);
        const result = runBenchmark(
          'Scaling Test',
          `${count} Objects`,
          () => {
            parseStrictJson(json);
          },
          count === 1000 ? 100 : count === 10000 ? 50 : 10
        );
        results.push({ count, time: result.time, memory: result.memory });
        console.log(`${count} objects: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      }

      // Verify performance scales reasonably (not exponentially)
      const time1k = results[0].time;
      const time10k = results[1].time;
      const time100k = results[2].time;

      const ratio10k = time10k / time1k;
      const ratio100k = time100k / time10k;

      console.log(`\nScaling analysis:`);
      console.log(`  1K -> 10K: ${ratio10k.toFixed(2)}x (should be ~10x)`);
      console.log(`  10K -> 100K: ${ratio100k.toFixed(2)}x (should be ~10x)`);

      expect(ratio10k).toBeLessThan(20); // Should not be >20x
      expect(ratio100k).toBeLessThan(20); // Should not be >20x
    });
  });

  // Benchmark 9: Body size limit enforcement
  describe('Body Size Limit Enforcement', () => {
    it('Enforce 100KB limit on 1MB payload', async () => {
      const json = generateLargeObjectArray(10000, 5);
      const result = runBenchmark(
        'Size Limit',
        '1MB with 100KB limit',
        () => {
          try {
            parseStrictJson(json, { maxBodySizeBytes: 100 * 1024 });
            return; // Should not reach here
          } catch (e) {
            // Expected error - body too large
            return;
          }
        },
        50
      );
      console.log(`Size limit enforced: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Allow 1MB with 2MB limit', async () => {
      const json = generateLargeObjectArray(10000, 5);
      const result = runBenchmark(
        'Size Limit',
        '1MB with 2MB limit',
        () => {
          parseStrictJson(json, { maxBodySizeBytes: 2 * 1024 * 1024 });
        },
        100
      );
      console.log(`Size limit allowed: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Full benchmark run with report generation
  it('Run full large payload benchmark and generate report', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('RUNNING FULL LARGE PAYLOAD BENCHMARK');
    console.log('='.repeat(80) + '\n');

    const fullSuite = new BenchmarkSuite();

    // Add all benchmarks to suite
    fullSuite
      // Small payloads
      .add('Small Payloads', '100x5 Fields', () => parseStrictJson(generateLargeObjectArray(100, 5)), 1000)
      .add('Small Payloads', '500x2 Fields', () => parseStrictJson(generateLargeObjectArray(500, 2)), 1000)
      // Medium payloads
      .add('Medium Payloads', '1000x5 Fields', () => parseStrictJson(generateLargeObjectArray(1000, 5)), 500)
      .add('Medium Payloads', '2000x3 Fields', () => parseStrictJson(generateLargeObjectArray(2000, 3)), 500)
      // Large payloads
      .add('Large Payloads', '10000x5 Fields', () => parseStrictJson(generateLargeObjectArray(10000, 5)), 100)
      .add('Large Payloads', '5000x10 Fields', () => parseStrictJson(generateLargeObjectArray(5000, 10)), 100)
      // Extra large
      .add('Extra Large', '20000x5 Fields', () => parseStrictJson(generateLargeObjectArray(20000, 5)), 50)
      .add('Extra Large', '50000x3 Fields', () => parseStrictJson(generateLargeObjectArray(50000, 3)), 20)
      // String data
      .add('String Data', '100x1KB', () => parseStrictJson(generateLargeStringArray(100, 1024)), 200)
      .add('String Data', '500x500B', () => parseStrictJson(generateLargeStringArray(500, 500)), 200)
      // Numeric data
      .add('Numeric Data', '10000x10', () => parseStrictJson(generateLargeNumericData(10000, 10)), 100)
      .add('Numeric Data', '50000x5', () => parseStrictJson(generateLargeNumericData(50000, 5)), 20);

    const results = await fullSuite.runAndPrint();
    saveReports(results, 'performance/reports');

    console.log('\n✅ Full large payload benchmark completed and reports saved!');
  });
});
