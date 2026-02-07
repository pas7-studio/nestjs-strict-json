/**
 * Бенчмарки для виявлення дублікатних ключів
 */

import { describe, it, expect } from 'vitest';
import { runBenchmark, BenchmarkSuite } from '../../utils/benchmark-runner.js';
import { saveReports } from '../../utils/reporters.js';
import { toJsonString } from '../../utils/generators.js';
import { parseStrictJson } from '../../../src/index.js';

/**
 * Генерує JSON з дублікатними ключами на різних рівнях
 */
function generateJsonWithDuplicateKeys(levels: number): string {
  let jsonStr = '{\n';

  for (let level = 0; level < levels; level++) {
    const indent = '  '.repeat(level + 1);
    jsonStr += `${indent}"level${level}": {\n`;

    // Додати дублікатні ключі
    jsonStr += `${indent}  "key1": "value1",\n`;
    jsonStr += `${indent}  "key2": "value2",\n`;
    jsonStr += `${indent}  "key1": "duplicate_value1",\n`; // Дублікат
    jsonStr += `${indent}  "key3": "value3",\n`;
    jsonStr += `${indent}  "key2": "duplicate_value2"`;

    if (level < levels - 1) {
      jsonStr += ',\n';
    }
  }

  for (let level = levels - 1; level >= 0; level--) {
    const indent = '  '.repeat(level + 1);
    jsonStr += `\n${indent}}`;
  }

  jsonStr += '\n}';
  return jsonStr;
}

/**
 * Генерує великий JSON з багатьма дублікатами
 */
function generateLargeJsonWithDuplicates(count: number): string {
  let jsonStr = '{\n';
  const entries: string[] = [];

  for (let i = 0; i < count; i++) {
    entries.push(`  "item${i}": {\n    "id": ${i},\n    "name": "Item ${i}",\n    "name": "Duplicate ${i}"\n  }`);
  }

  jsonStr += entries.join(',\n');
  jsonStr += '\n}';
  return jsonStr;
}

/**
 * Генерує JSON з дублікатами у вкладених масивах
 */
function generateNestedArrayWithDuplicates(arraySize: number, objectSize: number): string {
  let jsonStr = '{\n  "items": [\n';

  for (let i = 0; i < arraySize; i++) {
    jsonStr += '    {\n';
    const objEntries: string[] = [];

    for (let j = 0; j < objectSize; j++) {
      objEntries.push(`      "field${j}": "value${j}"`);
      if (j === Math.floor(objectSize / 2)) {
        objEntries.push(`      "field${j}": "duplicate${j}"`); // Дублікат
      }
    }

    jsonStr += objEntries.join(',\n');
    jsonStr += '\n    }';

    if (i < arraySize - 1) {
      jsonStr += ',\n';
    }
  }

  jsonStr += '\n  ]\n}';
  return jsonStr;
}

describe('Duplicate Key Detection Benchmarks', () => {
  // Benchmark 1: Shallow duplicate detection
  describe('Shallow Duplicate Detection', () => {
    const shallowDuplicates = '{\n  "id": 1,\n  "id": 2,\n  "name": "test"\n}';

    it('Shallow duplicates', async () => {
      const result = runBenchmark(
        'Duplicate Detection',
        'Shallow Duplicates',
        () => {
          try {
            parseStrictJson(shallowDuplicates);
            return; // Should not reach here
          } catch (e) {
            // Expected error - duplicate detected
            return;
          }
        },
        1000
      );
      console.log(`Shallow: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('No duplicates (baseline)', async () => {
      const noDuplicates = '{\n  "id": 1,\n  "name": "test"\n}';
      const result = runBenchmark(
        'Duplicate Detection',
        'No Duplicates (Baseline)',
        () => {
          parseStrictJson(noDuplicates);
        },
        1000
      );
      console.log(`No duplicates: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 2: Deep nested duplicates
  describe('Deep Nested Duplicates', () => {
    it('Level 2 duplicates', async () => {
      const json = generateJsonWithDuplicateKeys(2);
      const result = runBenchmark(
        'Deep Duplicates',
        'Level 2',
        () => {
          try {
            parseStrictJson(json);
            return; // Should not reach here
          } catch (e) {
            // Expected error
            return;
          }
        },
        1000
      );
      console.log(`Level 2: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Level 5 duplicates', async () => {
      const json = generateJsonWithDuplicateKeys(5);
      const result = runBenchmark(
        'Deep Duplicates',
        'Level 5',
        () => {
          try {
            parseStrictJson(json);
            return; // Should not reach here
          } catch (e) {
            // Expected error
            return;
          }
        },
        500
      );
      console.log(`Level 5: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Level 10 duplicates', async () => {
      const json = generateJsonWithDuplicateKeys(10);
      const result = runBenchmark(
        'Deep Duplicates',
        'Level 10',
        () => {
          try {
            parseStrictJson(json);
            return; // Should not reach here
          } catch (e) {
            // Expected error
            return;
          }
        },
        200
      );
      console.log(`Level 10: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 3: Large JSON with many duplicates
  describe('Large JSON with Many Duplicates', () => {
    it('100 items with duplicates', async () => {
      const json = generateLargeJsonWithDuplicates(100);
      const result = runBenchmark(
        'Large Duplicates',
        '100 Items',
        () => {
          try {
            parseStrictJson(json);
            return; // Should not reach here
          } catch (e) {
            // Expected error
            return;
          }
        },
        200
      );
      console.log(`100 items: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('500 items with duplicates', async () => {
      const json = generateLargeJsonWithDuplicates(500);
      const result = runBenchmark(
        'Large Duplicates',
        '500 Items',
        () => {
          try {
            parseStrictJson(json);
            return; // Should not reach here
          } catch (e) {
            // Expected error
            return;
          }
        },
        50
      );
      console.log(`500 items: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 4: Nested arrays with duplicates
  describe('Nested Arrays with Duplicates', () => {
    it('10 arrays x 5 fields', async () => {
      const json = generateNestedArrayWithDuplicates(10, 5);
      const result = runBenchmark(
        'Array Duplicates',
        '10 Arrays x 5 Fields',
        () => {
          try {
            parseStrictJson(json);
            return; // Should not reach here
          } catch (e) {
            // Expected error
            return;
          }
        },
        500
      );
      console.log(`10 arrays: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('50 arrays x 10 fields', async () => {
      const json = generateNestedArrayWithDuplicates(50, 10);
      const result = runBenchmark(
        'Array Duplicates',
        '50 Arrays x 10 Fields',
        () => {
          try {
            parseStrictJson(json);
            return; // Should not reach here
          } catch (e) {
            // Expected error
            return;
          }
        },
        200
      );
      console.log(`50 arrays: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 5: Accuracy of duplicate detection
  describe('Accuracy Testing', () => {
    it('All duplicates detected correctly', async () => {
      const testCases = [
        { json: '{"a": 1, "a": 2}', hasDuplicate: true },
        { json: '{"a": {"b": 1, "b": 2}}', hasDuplicate: true },
        { json: '{"a": [1, 2], "b": 3}', hasDuplicate: false },
        { json: '{"a": 1, "b": 2, "c": 3}', hasDuplicate: false },
        { json: '{"nested": {"deep": {"duplicate": 1, "duplicate": 2}}}', hasDuplicate: true },
      ];

      const result = runBenchmark(
        'Accuracy',
        'All Test Cases',
        () => {
          testCases.forEach(({ json, hasDuplicate }) => {
            try {
              parseStrictJson(json);
              if (hasDuplicate) {
                throw new Error(`Failed to detect duplicate in: ${json}`);
              }
            } catch (e) {
              if (!hasDuplicate) {
                throw new Error(`False positive in: ${json}`);
              }
            }
          });
        },
        100
      );
      console.log(`Accuracy test: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 6: Performance comparison with/without duplicate detection
  describe('Performance Impact of Detection', () => {
    const largeJsonWithoutDuplicates = toJsonString({
      items: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        value: Math.random()
      }))
    });

    const largeJsonWithEarlyDuplicate = JSON.stringify({
      items: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        name: `Duplicate ${i}`, // Duplicate at every level
        value: Math.random()
      }))
    });

    it('Large JSON without duplicates', async () => {
      const result = runBenchmark(
        'Performance Impact',
        'No Duplicates (1K items)',
        () => {
          parseStrictJson(largeJsonWithoutDuplicates);
        },
        100
      );
      console.log(`No duplicates: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Large JSON with early duplicates', async () => {
      const result = runBenchmark(
        'Performance Impact',
        'Early Duplicates (1K items)',
        () => {
          try {
            parseStrictJson(largeJsonWithEarlyDuplicate);
            return; // Should not reach here
          } catch (e) {
            // Expected error
            return;
          }
        },
        100
      );
      console.log(`Early duplicates: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Full benchmark run with report generation
  it('Run full duplicate detection benchmark and generate report', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('RUNNING FULL DUPLICATE KEY DETECTION BENCHMARK');
    console.log('='.repeat(80) + '\n');

    const fullSuite = new BenchmarkSuite();

    // Add all benchmarks to suite
    fullSuite
      // Shallow duplicates
      .add('Shallow Duplicates', 'With Duplicates', () => {
        try {
          parseStrictJson('{\n  "id": 1,\n  "id": 2\n}');
        } catch (e) {
          // Expected error
        }
      }, 1000)
      .add('Shallow Duplicates', 'No Duplicates', () => {
        parseStrictJson('{\n  "id": 1,\n  "name": "test"\n}');
      }, 1000)
      // Deep duplicates
      .add('Deep Duplicates', 'Level 2', () => {
        try {
          parseStrictJson(generateJsonWithDuplicateKeys(2));
        } catch (e) {
          // Expected error
        }
      }, 1000)
      .add('Deep Duplicates', 'Level 5', () => {
        try {
          parseStrictJson(generateJsonWithDuplicateKeys(5));
        } catch (e) {
          // Expected error
        }
      }, 500)
      .add('Deep Duplicates', 'Level 10', () => {
        try {
          parseStrictJson(generateJsonWithDuplicateKeys(10));
        } catch (e) {
          // Expected error
        }
      }, 200)
      // Large duplicates
      .add('Large Duplicates', '100 Items', () => {
        try {
          parseStrictJson(generateLargeJsonWithDuplicates(100));
        } catch (e) {
          // Expected error
        }
      }, 200)
      .add('Large Duplicates', '500 Items', () => {
        try {
          parseStrictJson(generateLargeJsonWithDuplicates(500));
        } catch (e) {
          // Expected error
        }
      }, 50);

    const results = await fullSuite.runAndPrint();
    saveReports(results, 'performance/reports');

    console.log('\n✅ Full duplicate key detection benchmark completed and reports saved!');
  });
});
