/**
 * Порівняльні бенчмарки: @pas7/nestjs-strict-json vs Express body-parser
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { runBenchmark, BenchmarkSuite } from '../../utils/benchmark-runner.js';
import { saveReports } from '../../utils/reporters.js';
import {
  generateSmallJson,
  generateMediumJson,
  generateLargeJson,
  toJsonString
} from '../../utils/generators.js';
import { parseStrictJson } from '../../../src/index.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';

/**
 * Simulate Express body-parser with JSON parsing
 */
function simulateExpressBodyParser(jsonString: string): unknown {
  // Express body-parser does basic JSON.parse with some validation
  const contentType = 'application/json';
  const limit = '100mb';

  // Check content type
  if (!contentType.includes('application/json')) {
    throw new Error('Unsupported content type');
  }

  // Parse JSON
  return JSON.parse(jsonString);
}

/**
 * Simulate Express body-parser with custom duplicate key middleware
 */
function simulateExpressWithCustomMiddleware(jsonString: string): unknown {
  // First, parse with body-parser
  const parsed = simulateExpressBodyParser(jsonString);

  // Then, apply custom duplicate key checking
  const checkDuplicates = (obj: unknown): void => {
    if (typeof obj !== 'object' || obj === null) {
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach(checkDuplicates);
      return;
    }

    const seen = new Set<string>();
    for (const key in obj) {
      if (seen.has(key)) {
        throw new Error('Duplicate keys detected');
      }
      seen.add(key);
      checkDuplicates((obj as Record<string, unknown>)[key]);
    }
  };

  checkDuplicates(parsed);
  return parsed;
}

/**
 * @pas7/nestjs-strict-json as Express middleware simulation
 */
function simulatePas7ExpressMiddleware(jsonString: string): unknown {
  // This simulates what happens in the Express adapter
  try {
    return parseStrictJson(jsonString);
  } catch (error) {
    // Express middleware would normally send error response
    throw error;
  }
}

/**
 * Simulate Express request processing with body-parser
 */
function simulateExpressRequestProcessing(
  jsonString: string,
  bodyParserFn: (json: string) => unknown
): unknown {
  // Simulate HTTP request overhead
  const requestStartTime = performance.now();

  // Parse headers
  const headers = {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(jsonString, 'utf8').toString()
  };

  // Process body
  const result = bodyParserFn(jsonString);

  // Simulate response preparation
  const processingTime = performance.now() - requestStartTime;

  return { result, processingTime };
}

describe('Comparison: @pas7/nestjs-strict-json vs Express body-parser', () => {
  const smallJson = toJsonString(generateSmallJson());
  const mediumJson = toJsonString(generateMediumJson());
  const largeJson = toJsonString(generateLargeJson());

  // Benchmark 1: Basic JSON parsing
  describe('Basic JSON Parsing', () => {
    it('Express body-parser (standard)', async () => {
      const result = runBenchmark(
        'Basic JSON Parsing',
        'Express body-parser (standard)',
        () => {
          simulateExpressBodyParser(smallJson);
        },
        1000
      );
      console.log(`Express body-parser: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Express + custom middleware', async () => {
      const result = runBenchmark(
        'Basic JSON Parsing',
        'Express + custom middleware',
        () => {
          simulateExpressWithCustomMiddleware(smallJson);
        },
        1000
      );
      console.log(`Express + custom: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7/nestjs-strict-json middleware', async () => {
      const result = runBenchmark(
        'Basic JSON Parsing',
        '@pas7/nestjs-strict-json middleware',
        () => {
          simulatePas7ExpressMiddleware(smallJson);
        },
        1000
      );
      console.log(`@pas7 middleware: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 2: Request processing overhead
  describe('Request Processing Overhead', () => {
    it('Express body-parser (small)', async () => {
      const result = runBenchmark(
        'Request Processing',
        'Express body-parser (1KB)',
        () => {
          simulateExpressRequestProcessing(smallJson, simulateExpressBodyParser);
        },
        500
      );
      console.log(`Express (small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Express + custom (small)', async () => {
      const result = runBenchmark(
        'Request Processing',
        'Express + custom (1KB)',
        () => {
          simulateExpressRequestProcessing(smallJson, simulateExpressWithCustomMiddleware);
        },
        500
      );
      console.log(`Express + custom (small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7 middleware (small)', async () => {
      const result = runBenchmark(
        'Request Processing',
        '@pas7 middleware (1KB)',
        () => {
          simulateExpressRequestProcessing(smallJson, simulatePas7ExpressMiddleware);
        },
        500
      );
      console.log(`@pas7 (small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 3: Medium payload processing
  describe('Medium Payload Processing (~100KB)', () => {
    it('Express body-parser', async () => {
      const result = runBenchmark(
        'Medium Payload',
        'Express body-parser (100KB)',
        () => {
          simulateExpressRequestProcessing(mediumJson, simulateExpressBodyParser);
        },
        200
      );
      console.log(`Express (medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Express + custom middleware', async () => {
      const result = runBenchmark(
        'Medium Payload',
        'Express + custom (100KB)',
        () => {
          simulateExpressRequestProcessing(mediumJson, simulateExpressWithCustomMiddleware);
        },
        200
      );
      console.log(`Express + custom (medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7 middleware', async () => {
      const result = runBenchmark(
        'Medium Payload',
        '@pas7 middleware (100KB)',
        () => {
          simulateExpressRequestProcessing(mediumJson, simulatePas7ExpressMiddleware);
        },
        200
      );
      console.log(`@pas7 (medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 4: Large payload processing
  describe('Large Payload Processing (~1MB)', () => {
    it('Express body-parser', async () => {
      const result = runBenchmark(
        'Large Payload',
        'Express body-parser (1MB)',
        () => {
          simulateExpressRequestProcessing(largeJson, simulateExpressBodyParser);
        },
        50
      );
      console.log(`Express (large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Express + custom middleware', async () => {
      const result = runBenchmark(
        'Large Payload',
        'Express + custom (1MB)',
        () => {
          simulateExpressRequestProcessing(largeJson, simulateExpressWithCustomMiddleware);
        },
        50
      );
      console.log(`Express + custom (large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7 middleware', async () => {
      const result = runBenchmark(
        'Large Payload',
        '@pas7 middleware (1MB)',
        () => {
          simulateExpressRequestProcessing(largeJson, simulatePas7ExpressMiddleware);
        },
        50
      );
      console.log(`@pas7 (large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 5: Error handling overhead
  describe('Error Handling Overhead', () => {
    const invalidJson = '{"invalid": json}';

    it('Express body-parser (invalid JSON)', async () => {
      const result = runBenchmark(
        'Error Handling',
        'Express body-parser (invalid)',
        () => {
          try {
            simulateExpressBodyParser(invalidJson);
          } catch (e) {
            // Expected error
            return;
          }
        },
        1000
      );
      console.log(`Express (invalid): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Express + custom (invalid JSON)', async () => {
      const result = runBenchmark(
        'Error Handling',
        'Express + custom (invalid)',
        () => {
          try {
            simulateExpressWithCustomMiddleware(invalidJson);
          } catch (e) {
            // Expected error
            return;
          }
        },
        1000
      );
      console.log(`Express + custom (invalid): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('@pas7 middleware (invalid JSON)', async () => {
      const result = runBenchmark(
        'Error Handling',
        '@pas7 middleware (invalid)',
        () => {
          try {
            simulatePas7ExpressMiddleware(invalidJson);
          } catch (e) {
            // Expected error
            return;
          }
        },
        1000
      );
      console.log(`@pas7 (invalid): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Full benchmark run with report generation
  it('Run full comparison and generate report', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('RUNNING FULL EXPRESS BODY-PARSER BENCHMARK');
    console.log('='.repeat(80) + '\n');

    const fullSuite = new BenchmarkSuite();

    // Add all benchmarks to suite
    fullSuite
      // Small payload
      .add('Small Payload (1KB)', 'Express body-parser', () => simulateExpressBodyParser(smallJson), 1000)
      .add('Small Payload (1KB)', 'Express + custom', () => simulateExpressWithCustomMiddleware(smallJson), 1000)
      .add('Small Payload (1KB)', '@pas7 middleware', () => simulatePas7ExpressMiddleware(smallJson), 1000)
      // Medium payload
      .add('Medium Payload (100KB)', 'Express body-parser', () => simulateExpressBodyParser(mediumJson), 200)
      .add('Medium Payload (100KB)', 'Express + custom', () => simulateExpressWithCustomMiddleware(mediumJson), 200)
      .add('Medium Payload (100KB)', '@pas7 middleware', () => simulatePas7ExpressMiddleware(mediumJson), 200)
      // Large payload
      .add('Large Payload (1MB)', 'Express body-parser', () => simulateExpressBodyParser(largeJson), 50)
      .add('Large Payload (1MB)', 'Express + custom', () => simulateExpressWithCustomMiddleware(largeJson), 50)
      .add('Large Payload (1MB)', '@pas7 middleware', () => simulatePas7ExpressMiddleware(largeJson), 50);

    const results = await fullSuite.runAndPrint();
    saveReports(results, 'performance/reports');

    console.log('\n✅ Full Express body-parser comparison completed and reports saved!');
  });
});
