/**
 * Бенчмарки для глибокої вкладеності
 */

import { describe, it, expect } from 'vitest';
import { runBenchmark, BenchmarkSuite } from '../../utils/benchmark-runner.js';
import { saveReports } from '../../utils/reporters.js';
import { toJsonString } from '../../utils/generators.js';
import { parseStrictJson } from '../../../src/index.js';

/**
 * Генерує вкладений JSON з заданою глибиною
 */
function generateNestedJsonDepth(depth: number): string {
  if (depth === 0) {
    return '"final_value"';
  }

  const nested = generateNestedJsonDepth(depth - 1);
  return JSON.stringify({ level: depth, nested });
}

/**
 * Генерує вкладений масив з заданою глибиною
 */
function generateNestedArrayDepth(depth: number): string {
  if (depth === 0) {
    return '"final_value"';
  }

  const nested = generateNestedArrayDepth(depth - 1);
  return JSON.stringify([nested, depth]);
}

/**
 * Генерує складну вкладену структуру з об'єктами та масивами
 */
function generateComplexNestedJson(depth: number): string {
  let json = '{\n';
  let current = json;

  for (let i = 0; i < depth; i++) {
    const indent = '  '.repeat(i + 1);
    if (i < depth - 1) {
      current += `${indent}"level${i}": {\n`;
    } else {
      current += `${indent}"level${i}": [\n`;
      current += `${indent}  "value1",\n`;
      current += `${indent}  {\n`;
      current += `${indent}    "final": "value"\n`;
      current += `${indent}  }\n`;
      current += `${indent}]\n`;
    }
  }

  for (let i = depth - 1; i >= 0; i--) {
    const indent = '  '.repeat(i);
    if (i > 0) {
      current += `${indent}},\n`;
    } else {
      current += `${indent}}\n`;
    }
  }

  return current;
}

/**
 * Генерує JSON з глибокою вкладеністю масивів
 */
function generateDeepArrayJson(arrayDepth: number, arraySize: number): string {
  let json = '[\n';

  if (arrayDepth === 0) {
    json += '  "value"\n';
  } else {
    for (let i = 0; i < arraySize; i++) {
      const nested = generateDeepArrayJson(arrayDepth - 1, arraySize);
      json += '  ' + nested + ',\n';
    }
    json = json.slice(0, -2) + '\n';
  }

  json += ']';
  return json;
}

describe('Deep Nesting Benchmarks', () => {
  // Benchmark 1: Shallow nesting
  describe('Shallow Nesting (depth < 5)', () => {
    it('Depth 1', async () => {
      const json = generateNestedJsonDepth(1);
      const result = runBenchmark(
        'Shallow Nesting',
        'Depth 1',
        () => {
          parseStrictJson(json);
        },
        1000
      );
      console.log(`Depth 1: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Depth 2', async () => {
      const json = generateNestedJsonDepth(2);
      const result = runBenchmark(
        'Shallow Nesting',
        'Depth 2',
        () => {
          parseStrictJson(json);
        },
        1000
      );
      console.log(`Depth 2: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Depth 3', async () => {
      const json = generateNestedJsonDepth(3);
      const result = runBenchmark(
        'Shallow Nesting',
        'Depth 3',
        () => {
          parseStrictJson(json);
        },
        1000
      );
      console.log(`Depth 3: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Depth 4', async () => {
      const json = generateNestedJsonDepth(4);
      const result = runBenchmark(
        'Shallow Nesting',
        'Depth 4',
        () => {
          parseStrictJson(json);
        },
        1000
      );
      console.log(`Depth 4: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 2: Medium nesting
  describe('Medium Nesting (depth 5-10)', () => {
    it('Depth 5', async () => {
      const json = generateNestedJsonDepth(5);
      const result = runBenchmark(
        'Medium Nesting',
        'Depth 5',
        () => {
          parseStrictJson(json);
        },
        500
      );
      console.log(`Depth 5: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Depth 7', async () => {
      const json = generateNestedJsonDepth(7);
      const result = runBenchmark(
        'Medium Nesting',
        'Depth 7',
        () => {
          parseStrictJson(json);
        },
        500
      );
      console.log(`Depth 7: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Depth 10', async () => {
      const json = generateNestedJsonDepth(10);
      const result = runBenchmark(
        'Medium Nesting',
        'Depth 10',
        () => {
          parseStrictJson(json);
        },
        500
      );
      console.log(`Depth 10: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 3: Deep nesting
  describe('Deep Nesting (depth 15-20)', () => {
    it('Depth 15', async () => {
      const json = generateNestedJsonDepth(15);
      const result = runBenchmark(
        'Deep Nesting',
        'Depth 15',
        () => {
          parseStrictJson(json);
        },
        200
      );
      console.log(`Depth 15: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Depth 20', async () => {
      const json = generateNestedJsonDepth(20);
      const result = runBenchmark(
        'Deep Nesting',
        'Depth 20',
        () => {
          parseStrictJson(json);
        },
        200
      );
      console.log(`Depth 20: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 4: Very deep nesting (should hit depth limit)
  describe('Very Deep Nesting (depth > 20)', () => {
    it('Depth 25 (should fail)', async () => {
      const json = generateNestedJsonDepth(25);
      const result = runBenchmark(
        'Very Deep Nesting',
        'Depth 25 (limit exceeded)',
        () => {
          try {
            parseStrictJson(json);
            return; // Should not reach here
          } catch (e) {
            // Expected error - depth limit exceeded
            return;
          }
        },
        100
      );
      console.log(`Depth 25 (limit): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Depth 30 (should fail)', async () => {
      const json = generateNestedJsonDepth(30);
      const result = runBenchmark(
        'Very Deep Nesting',
        'Depth 30 (limit exceeded)',
        () => {
          try {
            parseStrictJson(json);
            return; // Should not reach here
          } catch (e) {
            // Expected error - depth limit exceeded
            return;
          }
        },
        100
      );
      console.log(`Depth 30 (limit): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 5: Custom depth limit
  describe('Custom Depth Limit', () => {
    it('Depth 10 with limit 5 (should fail)', async () => {
      const json = generateNestedJsonDepth(10);
      const result = runBenchmark(
        'Custom Limit',
        'Depth 10, Limit 5',
        () => {
          try {
            parseStrictJson(json, { maxDepth: 5 });
            return; // Should not reach here
          } catch (e) {
            // Expected error - depth limit exceeded
            return;
          }
        },
        200
      );
      console.log(`Custom limit 5: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Depth 30 with limit 50 (should pass)', async () => {
      const json = generateNestedJsonDepth(30);
      const result = runBenchmark(
        'Custom Limit',
        'Depth 30, Limit 50',
        () => {
          parseStrictJson(json, { maxDepth: 50 });
        },
        50
      );
      console.log(`Custom limit 50: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 6: Complex nested structures
  describe('Complex Nested Structures', () => {
    it('Mixed objects and arrays', async () => {
      const json = generateComplexNestedJson(10);
      const result = runBenchmark(
        'Complex Nesting',
        'Mixed (depth 10)',
        () => {
          parseStrictJson(json);
        },
        200
      );
      console.log(`Mixed structure: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Deep arrays', async () => {
      const json = generateDeepArrayJson(15, 3);
      const result = runBenchmark(
        'Complex Nesting',
        'Deep Arrays (depth 15)',
        () => {
          parseStrictJson(json);
        },
        200
      );
      console.log(`Deep arrays: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 7: Depth limit performance overhead
  describe('Depth Limit Performance Overhead', () => {
    const mediumDepthJson = generateNestedJsonDepth(10);

    it('Without depth limit', async () => {
      const result = runBenchmark(
        'Limit Overhead',
        'No Limit',
        () => {
          parseStrictJson(mediumDepthJson);
        },
        500
      );
      console.log(`No limit: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('With depth limit (20)', async () => {
      const result = runBenchmark(
        'Limit Overhead',
        'Limit 20',
        () => {
          parseStrictJson(mediumDepthJson, { maxDepth: 20 });
        },
        500
      );
      console.log(`Limit 20: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('With depth limit (10)', async () => {
      const result = runBenchmark(
        'Limit Overhead',
        'Limit 10',
        () => {
          parseStrictJson(mediumDepthJson, { maxDepth: 10 });
        },
        500
      );
      console.log(`Limit 10: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Full benchmark run with report generation
  it('Run full deep nesting benchmark and generate report', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('RUNNING FULL DEEP NESTING BENCHMARK');
    console.log('='.repeat(80) + '\n');

    const fullSuite = new BenchmarkSuite();

    // Add all benchmarks to suite
    fullSuite
      // Shallow nesting
      .add('Shallow Nesting', 'Depth 1', () => parseStrictJson(generateNestedJsonDepth(1)), 1000)
      .add('Shallow Nesting', 'Depth 2', () => parseStrictJson(generateNestedJsonDepth(2)), 1000)
      .add('Shallow Nesting', 'Depth 3', () => parseStrictJson(generateNestedJsonDepth(3)), 1000)
      .add('Shallow Nesting', 'Depth 4', () => parseStrictJson(generateNestedJsonDepth(4)), 1000)
      // Medium nesting
      .add('Medium Nesting', 'Depth 5', () => parseStrictJson(generateNestedJsonDepth(5)), 500)
      .add('Medium Nesting', 'Depth 7', () => parseStrictJson(generateNestedJsonDepth(7)), 500)
      .add('Medium Nesting', 'Depth 10', () => parseStrictJson(generateNestedJsonDepth(10)), 500)
      // Deep nesting
      .add('Deep Nesting', 'Depth 15', () => parseStrictJson(generateNestedJsonDepth(15)), 200)
      .add('Deep Nesting', 'Depth 20', () => parseStrictJson(generateNestedJsonDepth(20)), 200)
      // Very deep (should fail)
      .add('Very Deep', 'Depth 25', () => {
        try {
          parseStrictJson(generateNestedJsonDepth(25));
        } catch (e) {
          // Expected error
        }
      }, 100)
      .add('Very Deep', 'Depth 30', () => {
        try {
          parseStrictJson(generateNestedJsonDepth(30));
        } catch (e) {
          // Expected error
        }
      }, 100);

    const results = await fullSuite.runAndPrint();
    saveReports(results, 'performance/reports');

    console.log('\n✅ Full deep nesting benchmark completed and reports saved!');
  });
});
