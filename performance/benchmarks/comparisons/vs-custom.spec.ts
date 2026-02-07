/**
 * Порівняльні бенчмарки: @pas7/nestjs-strict-json vs популярні самописні рішення
 */

import { describe, it, expect } from 'vitest';
import { runBenchmark, BenchmarkSuite } from '../../utils/benchmark-runner.js';
import { saveReports } from '../../utils/reporters.js';
import {
  generateSmallJson,
  generateMediumJson,
  generateLargeJson,
  toJsonString
} from '../../utils/generators.js';
import { parseStrictJson } from '../../../src/index.js';

/**
 * Manual implementation 1: Recursive manual parsing
 * - Ручний рекурсивний парсинг для перевірки дублікатів
 */
function recursiveDuplicateCheck(obj: unknown, path = '$'): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return true;
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (!recursiveDuplicateCheck(obj[i], `${path}[${i}]`)) {
        return false;
      }
    }
    return true;
  }

  const seen = new Set<string>();
  for (const key in obj) {
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    if (!recursiveDuplicateCheck(obj[key as keyof typeof obj], `${path}.${key}`)) {
      return false;
    }
  }
  return true;
}

function parseWithRecursiveCheck(jsonString: string): unknown {
  const parsed = JSON.parse(jsonString);
  if (!recursiveDuplicateCheck(parsed)) {
    throw new Error('Duplicate keys found');
  }
  return parsed;
}

/**
 * Manual implementation 2: Object.keys() check
 * - Перевірка через Object.keys()
 */
function parseWithObjectKeysCheck(jsonString: string): unknown {
  const parsed = JSON.parse(jsonString);

  const checkObject = (obj: unknown): void => {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach(checkObject);
      return;
    }

    const keys = Object.keys(obj as object);
    const uniqueKeys = new Set(keys);

    if (keys.length !== uniqueKeys.size) {
      throw new Error('Duplicate keys found');
    }

    for (const key of keys) {
      checkObject((obj as Record<string, unknown>)[key]);
    }
  };

  checkObject(parsed);
  return parsed;
}

/**
 * Manual implementation 3: Set-based detection
 * - Перевірка через Set для кожного об'єкта
 */
function parseWithSetDetection(jsonString: string): unknown {
  const parsed = JSON.parse(jsonString);

  const checkObject = (obj: unknown, keySet: Set<string>): void => {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item) => checkObject(item, new Set()));
      return;
    }

    const newKeySet = new Set<string>();
    for (const key in obj) {
      if (keySet.has(key)) {
        throw new Error('Duplicate key found');
      }
      newKeySet.add(key);
      checkObject((obj as Record<string, unknown>)[key], newKeySet);
    }
  };

  checkObject(parsed, new Set());
  return parsed;
}

/**
 * Manual implementation 4: JSON.parse + jsonc-parser
 * - Використання jsonc-parser для перевірки дублікатів (те саме, що наша бібліотека)
 */
import { parseTree, type ParseError } from 'jsonc-parser';

function findDuplicateKeys(jsonString: string): boolean {
  const errors: ParseError[] = [];
  const root = parseTree(jsonString, errors, {
    allowTrailingComma: false,
    disallowComments: true,
    allowEmptyContent: false,
  });

  if (!root || errors.length > 0) return false;

  const checkNode = (node: ReturnType<typeof parseTree>): boolean => {
    if (!node) return true;

    if (node.type === 'object') {
      const seen = new Set<string>();
      for (const prop of node.children ?? []) {
        if (prop.type !== 'property' || !prop.children || prop.children.length < 2) continue;
        const key = String(prop.children[0].value ?? '');
        if (seen.has(key)) return false;
        seen.add(key);
        if (!checkNode(prop.children[1])) return false;
      }
    } else if (node.type === 'array') {
      for (const child of node.children ?? []) {
        if (!checkNode(child)) return false;
      }
    }

    return true;
  };

  return checkNode(root);
}

function parseWithJsoncParser(jsonString: string): unknown {
  if (!findDuplicateKeys(jsonString)) {
    throw new Error('Duplicate keys found');
  }
  return JSON.parse(jsonString);
}

describe('Comparison: @pas7/nestjs-strict-json vs Custom Implementations', () => {
  const smallJson = toJsonString(generateSmallJson());
  const mediumJson = toJsonString(generateMediumJson());
  const largeJson = toJsonString(generateLargeJson());

  // Benchmark 1: Small JSON
  describe('Small JSON (~1KB)', () => {
    it('Recursive manual parsing', async () => {
      const result = runBenchmark(
        'Small JSON (1KB)',
        'Recursive Manual Parsing',
        () => {
          parseWithRecursiveCheck(smallJson);
        },
        1000
      );
      console.log(`Recursive (Small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Object.keys() check', async () => {
      const result = runBenchmark(
        'Small JSON (1KB)',
        'Object.keys() Check',
        () => {
          parseWithObjectKeysCheck(smallJson);
        },
        1000
      );
      console.log(`Object.keys() (Small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Set-based detection', async () => {
      const result = runBenchmark(
        'Small JSON (1KB)',
        'Set-based Detection',
        () => {
          parseWithSetDetection(smallJson);
        },
        1000
      );
      console.log(`Set-based (Small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('jsonc-parser implementation', async () => {
      const result = runBenchmark(
        'Small JSON (1KB)',
        'jsonc-parser Implementation',
        () => {
          parseWithJsoncParser(smallJson);
        },
        1000
      );
      console.log(`jsonc-parser (Small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json', async () => {
      const result = runBenchmark(
        'Small JSON (1KB)',
        '@pas7/nestjs-strict-json',
        () => {
          parseStrictJson(smallJson);
        },
        1000
      );
      console.log(`@pas7 (Small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 2: Medium JSON
  describe('Medium JSON (~100KB)', () => {
    it('Recursive manual parsing', async () => {
      const result = runBenchmark(
        'Medium JSON (100KB)',
        'Recursive Manual Parsing',
        () => {
          parseWithRecursiveCheck(mediumJson);
        },
        200
      );
      console.log(`Recursive (Medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Object.keys() check', async () => {
      const result = runBenchmark(
        'Medium JSON (100KB)',
        'Object.keys() Check',
        () => {
          parseWithObjectKeysCheck(mediumJson);
        },
        200
      );
      console.log(`Object.keys() (Medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Set-based detection', async () => {
      const result = runBenchmark(
        'Medium JSON (100KB)',
        'Set-based Detection',
        () => {
          parseWithSetDetection(mediumJson);
        },
        200
      );
      console.log(`Set-based (Medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('jsonc-parser implementation', async () => {
      const result = runBenchmark(
        'Medium JSON (100KB)',
        'jsonc-parser Implementation',
        () => {
          parseWithJsoncParser(mediumJson);
        },
        200
      );
      console.log(`jsonc-parser (Medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json', async () => {
      const result = runBenchmark(
        'Medium JSON (100KB)',
        '@pas7/nestjs-strict-json',
        () => {
          parseStrictJson(mediumJson);
        },
        200
      );
      console.log(`@pas7 (Medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 3: Large JSON
  describe('Large JSON (~1MB)', () => {
    it('Recursive manual parsing', async () => {
      const result = runBenchmark(
        'Large JSON (1MB)',
        'Recursive Manual Parsing',
        () => {
          parseWithRecursiveCheck(largeJson);
        },
        50
      );
      console.log(`Recursive (Large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Object.keys() check', async () => {
      const result = runBenchmark(
        'Large JSON (1MB)',
        'Object.keys() Check',
        () => {
          parseWithObjectKeysCheck(largeJson);
        },
        50
      );
      console.log(`Object.keys() (Large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Set-based detection', async () => {
      const result = runBenchmark(
        'Large JSON (1MB)',
        'Set-based Detection',
        () => {
          parseWithSetDetection(largeJson);
        },
        50
      );
      console.log(`Set-based (Large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('jsonc-parser implementation', async () => {
      const result = runBenchmark(
        'Large JSON (1MB)',
        'jsonc-parser Implementation',
        () => {
          parseWithJsoncParser(largeJson);
        },
        50
      );
      console.log(`jsonc-parser (Large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json', async () => {
      const result = runBenchmark(
        'Large JSON (1MB)',
        '@pas7/nestjs-strict-json',
        () => {
          parseStrictJson(largeJson);
        },
        50
      );
      console.log(`@pas7 (Large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Full benchmark run with report generation
  it('Run full comparison and generate report', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('RUNNING FULL CUSTOM IMPLEMENTATIONS BENCHMARK');
    console.log('='.repeat(80) + '\n');

    const fullSuite = new BenchmarkSuite();

    // Add all benchmarks to suite
    fullSuite
      // Small JSON
      .add('Small JSON (1KB)', 'Recursive Manual', () => parseWithRecursiveCheck(smallJson), 1000)
      .add('Small JSON (1KB)', 'Object.keys()', () => parseWithObjectKeysCheck(smallJson), 1000)
      .add('Small JSON (1KB)', 'Set-based', () => parseWithSetDetection(smallJson), 1000)
      .add('Small JSON (1KB)', 'jsonc-parser', () => parseWithJsoncParser(smallJson), 1000)
      .add('Small JSON (1KB)', '@pas7', () => parseStrictJson(smallJson), 1000)
      // Medium JSON
      .add('Medium JSON (100KB)', 'Recursive Manual', () => parseWithRecursiveCheck(mediumJson), 200)
      .add('Medium JSON (100KB)', 'Object.keys()', () => parseWithObjectKeysCheck(mediumJson), 200)
      .add('Medium JSON (100KB)', 'Set-based', () => parseWithSetDetection(mediumJson), 200)
      .add('Medium JSON (100KB)', 'jsonc-parser', () => parseWithJsoncParser(mediumJson), 200)
      .add('Medium JSON (100KB)', '@pas7', () => parseStrictJson(mediumJson), 200)
      // Large JSON
      .add('Large JSON (1MB)', 'Recursive Manual', () => parseWithRecursiveCheck(largeJson), 50)
      .add('Large JSON (1MB)', 'Object.keys()', () => parseWithObjectKeysCheck(largeJson), 50)
      .add('Large JSON (1MB)', 'Set-based', () => parseWithSetDetection(largeJson), 50)
      .add('Large JSON (1MB)', 'jsonc-parser', () => parseWithJsoncParser(largeJson), 50)
      .add('Large JSON (1MB)', '@pas7', () => parseStrictJson(largeJson), 50);

    const results = await fullSuite.runAndPrint();
    saveReports(results, 'performance/reports');

    console.log('\n✅ Full custom implementations comparison completed and reports saved!');
  });
});
