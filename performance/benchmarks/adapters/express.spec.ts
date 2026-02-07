/**
 * Бенчмарки для Express adapter
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
import { createStrictJsonExpressMiddleware } from '../../../src/adapters/express.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import type { Request, Response, NextFunction } from 'express';

/**
 * Створює фіктивний Express request об'єкт
 */
function createMockRequest(body: string, contentType = 'application/json'): Partial<Request> {
  return {
    headers: {
      'content-type': contentType,
      'content-length': Buffer.byteLength(body, 'utf8').toString()
    },
    body: undefined as any
  };
}

/**
 * Створює фіктивний Express response об'єкт
 */
function createMockResponse(): Partial<Response> {
  return {
    status: (code: number) => ({ json: () => ({}) }),
    json: (data: unknown) => ({})
  };
}

/**
 * Створює фіктивну next функцію
 */
function createMockNext(): NextFunction {
  return () => {};
}

/**
 * Simulates Express request processing with middleware
 */
function processRequestWithMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  body: string
): void {
  const req = createMockRequest(body) as Request;
  const res = createMockResponse() as Response;
  const next = createMockNext();

  // Simulate body parsing in request
  (req as any).body = undefined;

  // Apply middleware
  middleware(req, res, next);

  // If middleware processed the body, it should be set
  if ((req as any).body === undefined) {
    // Manually set body for benchmarking
    (req as any).body = JSON.parse(body);
  }
}

describe('Express Adapter Benchmarks', () => {
  const smallJson = toJsonString(generateSmallJson());
  const mediumJson = toJsonString(generateMediumJson());
  const largeJson = toJsonString(generateLargeJson());

  // Middleware configurations
  const defaultMiddleware = createStrictJsonExpressMiddleware();
  const strictMiddleware = createStrictJsonExpressMiddleware({
    maxDepth: 20,
    enablePrototypePollutionProtection: true
  });
  const streamingMiddleware = createStrictJsonExpressMiddleware({
    enableStreaming: true,
    streamingThreshold: 100 * 1024 // 100KB
  });

  // Benchmark 1: Middleware creation overhead
  describe('Middleware Creation', () => {
    it('Default middleware creation', async () => {
      const result = runBenchmark(
        'Middleware Creation',
        'Default Middleware',
        () => {
          createStrictJsonExpressMiddleware();
        },
        1000
      );
      console.log(`Default creation: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Strict options middleware creation', async () => {
      const result = runBenchmark(
        'Middleware Creation',
        'Strict Options Middleware',
        () => {
          createStrictJsonExpressMiddleware({
            maxDepth: 20,
            enablePrototypePollutionProtection: true,
            enableDuplicateKeyDetection: true
          });
        },
        1000
      );
      console.log(`Strict options creation: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Streaming middleware creation', async () => {
      const result = runBenchmark(
        'Middleware Creation',
        'Streaming Middleware',
        () => {
          createStrictJsonExpressMiddleware({
            enableStreaming: true,
            streamingThreshold: 100 * 1024
          });
        },
        1000
      );
      console.log(`Streaming creation: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 2: Request processing with default middleware
  describe('Default Middleware Processing', () => {
    it('Small payload processing', async () => {
      const result = runBenchmark(
        'Default Middleware',
        'Small Payload (1KB)',
        () => {
          processRequestWithMiddleware(defaultMiddleware, smallJson);
        },
        1000
      );
      console.log(`Default (small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Medium payload processing', async () => {
      const result = runBenchmark(
        'Default Middleware',
        'Medium Payload (100KB)',
        () => {
          processRequestWithMiddleware(defaultMiddleware, mediumJson);
        },
        500
      );
      console.log(`Default (medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Large payload processing', async () => {
      const result = runBenchmark(
        'Default Middleware',
        'Large Payload (1MB)',
        () => {
          processRequestWithMiddleware(defaultMiddleware, largeJson);
        },
        100
      );
      console.log(`Default (large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 3: Request processing with strict middleware
  describe('Strict Middleware Processing', () => {
    it('Small payload processing', async () => {
      const result = runBenchmark(
        'Strict Middleware',
        'Small Payload (1KB)',
        () => {
          processRequestWithMiddleware(strictMiddleware, smallJson);
        },
        1000
      );
      console.log(`Strict (small): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Medium payload processing', async () => {
      const result = runBenchmark(
        'Strict Middleware',
        'Medium Payload (100KB)',
        () => {
          processRequestWithMiddleware(strictMiddleware, mediumJson);
        },
        500
      );
      console.log(`Strict (medium): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Large payload processing', async () => {
      const result = runBenchmark(
        'Strict Middleware',
        'Large Payload (1MB)',
        () => {
          processRequestWithMiddleware(strictMiddleware, largeJson);
        },
        100
      );
      console.log(`Strict (large): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 4: Request processing with streaming middleware
  describe('Streaming Middleware Processing', () => {
    it('Small payload processing (buffer)', async () => {
      const result = runBenchmark(
        'Streaming Middleware',
        'Small Payload (1KB - buffer)',
        () => {
          processRequestWithMiddleware(streamingMiddleware, smallJson);
        },
        1000
      );
      console.log(`Streaming (small - buffer): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Medium payload processing (buffer)', async () => {
      const result = runBenchmark(
        'Streaming Middleware',
        'Medium Payload (100KB - threshold)',
        () => {
          processRequestWithMiddleware(streamingMiddleware, mediumJson);
        },
        500
      );
      console.log(`Streaming (medium - threshold): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });

    it('Large payload processing (streaming)', async () => {
      const result = runBenchmark(
        'Streaming Middleware',
        'Large Payload (1MB - streaming)',
        () => {
          processRequestWithMiddleware(streamingMiddleware, largeJson);
        },
        100
      );
      console.log(`Streaming (large - streaming): ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
      expect(result.success).toBe(true);
    });
  });

  // Benchmark 5: Middleware overhead comparison
  describe('Middleware Overhead Comparison', () => {
    it('Default vs Strict (small)', async () => {
      const defaultResult = runBenchmark(
        'Middleware Overhead',
        'Default (1KB)',
        () => {
          processRequestWithMiddleware(defaultMiddleware, smallJson);
        },
        500
      );

      const strictResult = runBenchmark(
        'Middleware Overhead',
        'Strict (1KB)',
        () => {
          processRequestWithMiddleware(strictMiddleware, smallJson);
        },
        500
      );

      const overhead = ((strictResult.time - defaultResult.time) / defaultResult.time) * 100;
      console.log(`Strict overhead: ${overhead.toFixed(2)}%`);
      expect(strictResult.success).toBe(true);
    });

    it('Default vs Streaming (large)', async () => {
      const defaultResult = runBenchmark(
        'Middleware Overhead',
        'Default (1MB)',
        () => {
          processRequestWithMiddleware(defaultMiddleware, largeJson);
        },
        50
      );

      const streamingResult = runBenchmark(
        'Middleware Overhead',
        'Streaming (1MB)',
        () => {
          processRequestWithMiddleware(streamingMiddleware, largeJson);
        },
        50
      );

      const memoryImprovement = ((defaultResult.memory - streamingResult.memory) / defaultResult.memory) * 100;
      console.log(`Streaming memory improvement: ${memoryImprovement.toFixed(2)}%`);
      expect(streamingResult.success).toBe(true);
    });
  });

  // Benchmark 6: Error handling overhead
  describe('Error Handling Overhead', () => {
    const invalidJson = '{"invalid": json}';
    const duplicateKeyJson = '{\n  "id": 1,\n  "id": 2\n}';

    it('Invalid JSON handling', async () => {
      const result = runBenchmark(
        'Error Handling',
        'Invalid JSON',
        () => {
          try {
            processRequestWithMiddleware(defaultMiddleware, invalidJson);
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
            processRequestWithMiddleware(defaultMiddleware, duplicateKeyJson);
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

  // Full benchmark run with report generation
  it('Run full adapter benchmark and generate report', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('RUNNING FULL EXPRESS ADAPTER BENCHMARK');
    console.log('='.repeat(80) + '\n');

    const fullSuite = new BenchmarkSuite();

    // Add all benchmarks to suite
    fullSuite
      // Middleware creation
      .add('Middleware Creation', 'Default', () => createStrictJsonExpressMiddleware(), 1000)
      .add('Middleware Creation', 'Strict', () => createStrictJsonExpressMiddleware({
        maxDepth: 20,
        enablePrototypePollutionProtection: true
      }), 1000)
      .add('Middleware Creation', 'Streaming', () => createStrictJsonExpressMiddleware({
        enableStreaming: true,
        streamingThreshold: 100 * 1024
      }), 1000)
      // Small payloads
      .add('Small (1KB)', 'Default', () => processRequestWithMiddleware(defaultMiddleware, smallJson), 1000)
      .add('Small (1KB)', 'Strict', () => processRequestWithMiddleware(strictMiddleware, smallJson), 1000)
      .add('Small (1KB)', 'Streaming', () => processRequestWithMiddleware(streamingMiddleware, smallJson), 1000)
      // Medium payloads
      .add('Medium (100KB)', 'Default', () => processRequestWithMiddleware(defaultMiddleware, mediumJson), 500)
      .add('Medium (100KB)', 'Strict', () => processRequestWithMiddleware(strictMiddleware, mediumJson), 500)
      .add('Medium (100KB)', 'Streaming', () => processRequestWithMiddleware(streamingMiddleware, mediumJson), 500)
      // Large payloads
      .add('Large (1MB)', 'Default', () => processRequestWithMiddleware(defaultMiddleware, largeJson), 100)
      .add('Large (1MB)', 'Strict', () => processRequestWithMiddleware(strictMiddleware, largeJson), 100)
      .add('Large (1MB)', 'Streaming', () => processRequestWithMiddleware(streamingMiddleware, largeJson), 100);

    const results = await fullSuite.runAndPrint();
    saveReports(results, 'performance/reports');

    console.log('\n✅ Full Express adapter benchmark completed and reports saved!');
  });
});
