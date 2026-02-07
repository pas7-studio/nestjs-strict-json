/**
 * Бенчмарки для Fastify adapter
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
import { registerStrictJsonFastify } from '../../../src/adapters/fastify.js';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Створює фіктивний Fastify request об'єкт
 */
function createMockFastifyRequest(body: string): Partial<FastifyRequest> {
  return {
    headers: {
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body, 'utf8').toString()
    },
    body: undefined as any,
    raw: {
      // Mock raw request
    }
  };
}

/**
 * Створює фіктивний Fastify reply об'єкт
 */
function createMockFastifyReply(): Partial<FastifyReply> {
  return {
    code: () => ({ send: () => ({}) }),
    send: () => ({})
  };
}

/**
 * Simulates Fastify content type parser
 */
function simulateFastifyContentParser(
  body: string,
  parserFn: (str: string) => unknown
): unknown {
  return parserFn(body);
}

describe('Fastify Adapter Benchmarks', () => {
  const smallJson = toJsonString(generateSmallJson());
  const mediumJson = toJsonString(generateMediumJson());
  const largeJson = toJsonString(generateLargeJson());

  // Parser configurations
  const defaultParser = (str: string) => {
    // Simulate default Fastify JSON parsing with @pas7
    try {
      // In real scenario, this would be registered via registerStrictJsonFastify
      const { parseStrictJson } = require('../../../src/index.js');
      return parseStrictJson(str);
    } catch {
      // Fallback for benchmarking
      const { parseStrictJson } = require('../../../src/index.js');
      return parseStrictJson(str);
    }
  };

  const strictParser = (str: string) => {
    // Simulate strict parser with options
    try {
      const { parseStrictJson } = require('../../../src/index.js');
      return parseStrictJson(str, {
        maxDepth: 20,
        enablePrototypePollutionProtection: true,
        enableDuplicateKeyDetection: true
      });
    } catch {
      const { parseStrictJson } = require('../../../src/index.js');
      return parseStrictJson(str, {
        maxDepth: 20,
        enablePrototypePollutionProtection: true,
        enableDuplicateKeyDetection: true
      });
    }
  };

  // Benchmark 1: Content type parser overhead
  describe('Content Type Parser Overhead', () => {
    it('Default parser (small)', async () => {
      const result = runBenchmark(
        'Parser Overhead',
        'Default Parser (1KB)',
        () => {
          simulateFastifyContentParser(smallJson, defaultParser);
        },
        1000
      );
      console.log(`Default (small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Default parser (medium)', async () => {
      const result = runBenchmark(
        'Parser Overhead',
        'Default Parser (100KB)',
        () => {
          simulateFastifyContentParser(mediumJson, defaultParser);
        },
        500
      );
      console.log(`Default (medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Default parser (large)', async () => {
      const result = runBenchmark(
        'Parser Overhead',
        'Default Parser (1MB)',
        () => {
          simulateFastifyContentParser(largeJson, defaultParser);
        },
        100
      );
      console.log(`Default (large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 2: Strict parser overhead
  describe('Strict Parser Overhead', () => {
    it('Strict parser (small)', async () => {
      const result = runBenchmark(
        'Strict Parser',
        'Strict Parser (1KB)',
        () => {
          simulateFastifyContentParser(smallJson, strictParser);
        },
        1000
      );
      console.log(`Strict (small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Strict parser (medium)', async () => {
      const result = runBenchmark(
        'Strict Parser',
        'Strict Parser (100KB)',
        () => {
          simulateFastifyContentParser(mediumJson, strictParser);
        },
        500
      );
      console.log(`Strict (medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Strict parser (large)', async () => {
      const result = runBenchmark(
        'Strict Parser',
        'Strict Parser (1MB)',
        () => {
          simulateFastifyContentParser(largeJson, strictParser);
        },
        100
      );
      console.log(`Strict (large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 3: Parser comparison
  describe('Parser Comparison', () => {
    it('Default vs Strict (small)', async () => {
      const defaultResult = runBenchmark(
        'Parser Comparison',
        'Default (1KB)',
        () => {
          simulateFastifyContentParser(smallJson, defaultParser);
        },
        500
      );

      const strictResult = runBenchmark(
        'Parser Comparison',
        'Strict (1KB)',
        () => {
          simulateFastifyContentParser(smallJson, strictParser);
        },
        500
      );

      const overhead = ((strictResult.time - defaultResult.time) / defaultResult.time) * 100;
      console.log(`Strict overhead: ${overhead.toFixed(2)}%`);
      expect(strictResult.success).toBe(true);
    });

    it('Default vs Strict (medium)', async () => {
      const defaultResult = runBenchmark(
        'Parser Comparison',
        'Default (100KB)',
        () => {
          simulateFastifyContentParser(mediumJson, defaultParser);
        },
        200
      );

      const strictResult = runBenchmark(
        'Parser Comparison',
        'Strict (100KB)',
        () => {
          simulateFastifyContentParser(mediumJson, strictParser);
        },
        200
      );

      const overhead = ((strictResult.time - defaultResult.time) / defaultResult.time) * 100;
      console.log(`Strict overhead (medium): ${overhead.toFixed(2)}%`);
      expect(strictResult.success).toBe(true);
    });

    it('Default vs Strict (large)', async () => {
      const defaultResult = runBenchmark(
        'Parser Comparison',
        'Default (1MB)',
        () => {
          simulateFastifyContentParser(largeJson, defaultParser);
        },
        50
      );

      const strictResult = runBenchmark(
        'Parser Comparison',
        'Strict (1MB)',
        () => {
          simulateFastifyContentParser(largeJson, strictParser);
        },
        50
      );

      const overhead = ((strictResult.time - defaultResult.time) / defaultResult.time) * 100;
      console.log(`Strict overhead (large): ${overhead.toFixed(2)}%`);
      expect(strictResult.success).toBe(true);
    });
  });

  // Benchmark 4: Memory efficiency
  describe('Memory Efficiency', () => {
    it('Memory usage comparison (small)', async () => {
      const defaultResult = runBenchmark(
        'Memory Efficiency',
        'Default (1KB)',
        () => {
          simulateFastifyContentParser(smallJson, defaultParser);
        },
        500
      );

      const strictResult = runBenchmark(
        'Memory Efficiency',
        'Strict (1KB)',
        () => {
          simulateFastifyContentParser(smallJson, strictParser);
        },
        500
      );

      const memoryDiff = strictResult.memory - defaultResult.memory;
      console.log(`Memory difference (small): ${memoryDiff.toFixed(4)}MB`);
      expect(strictResult.success).toBe(true);
    });

    it('Memory usage comparison (large)', async () => {
      const defaultResult = runBenchmark(
        'Memory Efficiency',
        'Default (1MB)',
        () => {
          simulateFastifyContentParser(largeJson, defaultParser);
        },
        50
      );

      const strictResult = runBenchmark(
        'Memory Efficiency',
        'Strict (1MB)',
        () => {
          simulateFastifyContentParser(largeJson, strictParser);
        },
        50
      );

      const memoryDiff = strictResult.memory - defaultResult.memory;
      console.log(`Memory difference (large): ${memoryDiff.toFixed(4)}MB`);
      expect(strictResult.success).toBe(true);
    });
  });

  // Benchmark 5: Error handling
  describe('Error Handling', () => {
    const invalidJson = '{"invalid": json}';
    const duplicateKeyJson = '{\n  "id": 1,\n  "id": 2\n}';

    it('Invalid JSON handling', async () => {
      const result = runBenchmark(
        'Error Handling',
        'Invalid JSON',
        () => {
          try {
            simulateFastifyContentParser(invalidJson, defaultParser);
          } catch (e) {
            // Expected error
            return;
          }
        },
        1000
      );
      console.log(`Invalid JSON: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Duplicate key handling', async () => {
      const result = runBenchmark(
        'Error Handling',
        'Duplicate Key',
        () => {
          try {
            simulateFastifyContentParser(duplicateKeyJson, defaultParser);
          } catch (e) {
            // Expected error
            return;
          }
        },
        1000
      );
      console.log(`Duplicate key: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 6: Request processing simulation
  describe('Request Processing Simulation', () => {
    it('Small request processing', async () => {
      const result = runBenchmark(
        'Request Processing',
        'Small (1KB)',
        () => {
          const req = createMockFastifyRequest(smallJson);
          const parsed = simulateFastifyContentParser(smallJson, defaultParser);
          (req as any).body = parsed;
        },
        500
      );
      console.log(`Small request: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Medium request processing', async () => {
      const result = runBenchmark(
        'Request Processing',
        'Medium (100KB)',
        () => {
          const req = createMockFastifyRequest(mediumJson);
          const parsed = simulateFastifyContentParser(mediumJson, defaultParser);
          (req as any).body = parsed;
        },
        200
      );
      console.log(`Medium request: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Large request processing', async () => {
      const result = runBenchmark(
        'Request Processing',
        'Large (1MB)',
        () => {
          const req = createMockFastifyRequest(largeJson);
          const parsed = simulateFastifyContentParser(largeJson, defaultParser);
          (req as any).body = parsed;
        },
        50
      );
      console.log(`Large request: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Full benchmark run with report generation
  it('Run full adapter benchmark and generate report', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('RUNNING FULL FASTIFY ADAPTER BENCHMARK');
    console.log('='.repeat(80) + '\n');

    const fullSuite = new BenchmarkSuite();

    // Add all benchmarks to suite
    fullSuite
      // Small payloads
      .add('Small (1KB)', 'Default Parser', () => simulateFastifyContentParser(smallJson, defaultParser), 1000)
      .add('Small (1KB)', 'Strict Parser', () => simulateFastifyContentParser(smallJson, strictParser), 1000)
      // Medium payloads
      .add('Medium (100KB)', 'Default Parser', () => simulateFastifyContentParser(mediumJson, defaultParser), 500)
      .add('Medium (100KB)', 'Strict Parser', () => simulateFastifyContentParser(mediumJson, strictParser), 500)
      // Large payloads
      .add('Large (1MB)', 'Default Parser', () => simulateFastifyContentParser(largeJson, defaultParser), 100)
      .add('Large (1MB)', 'Strict Parser', () => simulateFastifyContentParser(largeJson, strictParser), 100)
      // Request processing
      .add('Request (1KB)', 'Default', () => {
        const req = createMockFastifyRequest(smallJson);
        const parsed = simulateFastifyContentParser(smallJson, defaultParser);
        (req as any).body = parsed;
      }, 500)
      .add('Request (100KB)', 'Default', () => {
        const req = createMockFastifyRequest(mediumJson);
        const parsed = simulateFastifyContentParser(mediumJson, defaultParser);
        (req as any).body = parsed;
      }, 200)
      .add('Request (1MB)', 'Default', () => {
        const req = createMockFastifyRequest(largeJson);
        const parsed = simulateFastifyContentParser(largeJson, defaultParser);
        (req as any).body = parsed;
      }, 50);

    const results = await fullSuite.runAndPrint();
    saveReports(results, 'performance/reports');

    console.log('\n✅ Full Fastify adapter benchmark completed and reports saved!');
  });
});
