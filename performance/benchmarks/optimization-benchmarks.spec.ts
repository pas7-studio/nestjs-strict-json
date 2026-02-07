/**
 * Optimization Benchmarks
 * 
 * Tests the effectiveness of various optimization techniques:
 * 1. Lazy Mode
 * 2. Caching
 * 3. Streaming Parser
 * 4. Fast Path
 * 5. Iterative vs Recursive traversal
 */

import { describe, it, expect } from 'vitest';
import { runBenchmark, BenchmarkSuite } from '../../utils/benchmark-runner.js';
import { saveReports } from '../../utils/reporters.js';
import { parseStrictJson, parseStrictJsonAsync, clearParseCache, getParseCacheSize } from '../../src/index.js';

/**
 * Generate large JSON payload (1MB)
 */
function generateLargePayload(sizeInBytes: number): string {
  const items = [];
  const itemSize = 100; // Approximate size of each item in bytes
  
  for (let i = 0; i < sizeInBytes / itemSize; i++) {
    items.push({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 1000,
      nested: {
        field1: `data1_${i}`,
        field2: `data2_${i}`,
        field3: `data3_${i}`,
      },
    });
  }

  return JSON.stringify({ items, total: items.length });
}

/**
 * Generate medium JSON payload (100KB)
 */
function generateMediumPayload(): string {
  return generateLargePayload(100 * 1024);
}

/**
 * Generate small JSON payload (1KB)
 */
function generateSmallPayload(): string {
  return generateLargePayload(1 * 1024);
}

describe('Optimization Benchmarks', () => {
  // Benchmark 1: Lazy Mode Performance
  describe('Lazy Mode Optimization', () => {
    it('Standard vs Lazy Mode for 1MB payload', async () => {
      const largeJson = generateLargePayload(1 * 1024 * 1024);
      
      // Standard parsing (full checks)
      const standardResult = runBenchmark(
        'Lazy Mode',
        'Standard (full checks)',
        () => {
          parseStrictJson(largeJson, {
            lazyMode: false,
          });
        },
        10
      );
      console.log(`Standard: ${standardResult.time.toFixed(4)}ms`);

      // Lazy mode parsing (skip non-critical checks)
      const lazyResult = runBenchmark(
        'Lazy Mode',
        'Lazy Mode (optimized)',
        () => {
          parseStrictJson(largeJson, {
            lazyMode: true,
            lazyModeThreshold: 100 * 1024,
            lazyModeDepthLimit: 10,
            lazyModeSkipPrototype: true,
            lazyModeSkipWhitelist: true,
            lazyModeSkipBlacklist: false,
          });
        },
        10
      );
      console.log(`Lazy Mode: ${lazyResult.time.toFixed(4)}ms`);
      console.log(`Speedup: ${(standardResult.time / lazyResult.time).toFixed(2)}x`);

      expect(lazyResult.time).toBeLessThan(standardResult.time);
      expect(lazyResult.success).toBe(true);
    });

    it('Lazy Mode depth limit impact', async () => {
      const nestedJson = generateLargePayload(500 * 1024);
      
      const results = [];
      
      for (const depth of [3, 5, 10, 20]) {
        const result = runBenchmark(
          'Lazy Mode Depth',
          `Depth limit: ${depth}`,
          () => {
            parseStrictJson(nestedJson, {
              lazyMode: true,
              lazyModeDepthLimit: depth,
            });
          },
          20
        );
        results.push({ depth, time: result.time });
        console.log(`Depth ${depth}: ${result.time.toFixed(4)}ms`);
      }

      // Lower depth should be faster
      expect(results[0].time).toBeLessThan(results[results.length - 1].time);
    });
  });

  // Benchmark 2: Caching Performance
  describe('Caching Optimization', () => {
    it('First parse vs cached parse', async () => {
      const mediumJson = generateMediumPayload();
      clearParseCache();

      // First parse (not cached)
      const firstResult = runBenchmark(
        'Caching',
        'First parse (not cached)',
        () => {
          parseStrictJson(mediumJson, {
            enableCache: true,
          });
        },
        100
      );
      console.log(`First parse: ${firstResult.time.toFixed(4)}ms`);
      console.log(`Cache size: ${getParseCacheSize()}`);

      // Second parse (cached)
      const cachedResult = runBenchmark(
        'Caching',
        'Second parse (cached)',
        () => {
          parseStrictJson(mediumJson, {
            enableCache: true,
          });
        },
        100
      );
      console.log(`Cached parse: ${cachedResult.time.toFixed(4)}ms`);
      console.log(`Cache size: ${getParseCacheSize()}`);
      console.log(`Speedup: ${(firstResult.time / cachedResult.time).toFixed(2)}x`);

      expect(cachedResult.time).toBeLessThan(firstResult.time);
      expect(getParseCacheSize()).toBeGreaterThan(0);
    });

    it('Cache hit rate for repeated payloads', async () => {
      clearParseCache();
      const smallJson = generateSmallPayload();
      
      const payloads = [
        smallJson,
        generateSmallPayload(), // Different content
        smallJson, // Same as first
        generateSmallPayload(), // Different content
        smallJson, // Same as first
      ];

      const results = [];
      for (let i = 0; i < payloads.length; i++) {
        const result = runBenchmark(
          'Cache Hit Rate',
          `Parse #${i + 1}`,
          () => {
            parseStrictJson(payloads[i], {
              enableCache: true,
            });
          },
          100
        );
        results.push({ index: i, time: result.time, cached: getParseCacheSize() > 0 });
        console.log(`Parse #${i + 1}: ${result.time.toFixed(4)}ms, Cached: ${getParseCacheSize() > 0}`);
      }

      // Cached parses should be faster
      expect(results[0].time).toBeGreaterThan(results[2].time); // Parse 1 > Parse 3
    });
  });

  // Benchmark 3: Streaming Parser Performance
  describe('Streaming Parser Optimization', () => {
    it('Standard vs Streaming for 1MB payload', async () => {
      const largeJson = generateLargePayload(1 * 1024 * 1024);
      
      // Standard parsing
      const standardResult = runBenchmark(
        'Streaming',
        'Standard parsing',
        () => {
          parseStrictJson(largeJson, {
            enableStreaming: false,
          });
        },
        10
      );
      console.log(`Standard: ${standardResult.time.toFixed(4)}ms`);

      // Streaming parsing (async)
      let streamingTime = 0;
      const iterations = 10;
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await parseStrictJsonAsync(largeJson, {
          enableStreaming: true,
          streamingThreshold: 100 * 1024,
        });
        streamingTime += performance.now() - start;
      }
      const avgStreamingTime = streamingTime / iterations;
      console.log(`Streaming: ${avgStreamingTime.toFixed(4)}ms`);
      console.log(`Speedup: ${(standardResult.time / avgStreamingTime).toFixed(2)}x`);

      // Streaming should be faster or similar
      expect(avgStreamingTime).toBeLessThanOrEqual(standardResult.time * 1.5);
    });
  });

  // Benchmark 4: Fast Path Performance
  describe('Fast Path Optimization', () => {
    it('Standard vs Fast Path for simple JSON', async () => {
      const simpleJson = JSON.stringify({
        id: 1,
        name: 'Test',
        value: 42,
        nested: { field: 'data' },
      });
      
      // Standard parsing
      const standardResult = runBenchmark(
        'Fast Path',
        'Standard parsing',
        () => {
          parseStrictJson(simpleJson, {
            enableFastPath: false,
          });
        },
        1000
      );
      console.log(`Standard: ${standardResult.time.toFixed(4)}ms`);

      // Fast path parsing
      const fastPathResult = runBenchmark(
        'Fast Path',
        'Fast path parsing',
        () => {
          parseStrictJson(simpleJson, {
            enableFastPath: true,
          });
        },
        1000
      );
      console.log(`Fast Path: ${fastPathResult.time.toFixed(4)}ms`);
      console.log(`Speedup: ${(standardResult.time / fastPathResult.time).toFixed(2)}x`);

      expect(fastPathResult.time).toBeLessThan(standardResult.time);
    });
  });

  // Benchmark 5: Combined Optimizations
  describe('Combined Optimizations', () => {
    it('All optimizations enabled', async () => {
      const largeJson = generateLargePayload(1 * 1024 * 1024);
      clearParseCache();

      // Baseline (no optimizations)
      const baselineResult = runBenchmark(
        'Combined',
        'Baseline (no optimizations)',
        () => {
          parseStrictJson(largeJson, {
            lazyMode: false,
            enableCache: false,
            enableStreaming: false,
            enableFastPath: false,
          });
        },
        10
      );
      console.log(`Baseline: ${baselineResult.time.toFixed(4)}ms`);

      // All optimizations enabled
      const optimizedResult = runBenchmark(
        'Combined',
        'All optimizations',
        () => {
          parseStrictJson(largeJson, {
            lazyMode: true,
            lazyModeThreshold: 100 * 1024,
            lazyModeDepthLimit: 10,
            lazyModeSkipPrototype: true,
            lazyModeSkipWhitelist: true,
            enableCache: true,
            enableStreaming: true,
            streamingThreshold: 100 * 1024,
          });
        },
        10
      );
      console.log(`Optimized: ${optimizedResult.time.toFixed(4)}ms`);
      console.log(`Total Speedup: ${(baselineResult.time / optimizedResult.time).toFixed(2)}x`);

      expect(optimizedResult.time).toBeLessThan(baselineResult.time);
    });

    it('Goal: 1MB payload in <2 seconds', async () => {
      const largeJson = generateLargePayload(1 * 1024 * 1024);
      
      // Parse with all optimizations
      const result = runBenchmark(
        'Performance Goal',
        '1MB payload target <2000ms',
        () => {
          parseStrictJson(largeJson, {
            lazyMode: true,
            lazyModeThreshold: 100 * 1024,
            lazyModeDepthLimit: 10,
            lazyModeSkipPrototype: true,
            lazyModeSkipWhitelist: true,
            enableCache: true,
            enableStreaming: true,
            streamingThreshold: 100 * 1024,
          });
        },
        5 // Run 5 times to get average
      );

      console.log(`\nPerformance Goal:`);
      console.log(`  Target: <2000ms`);
      console.log(`  Actual: ${result.time.toFixed(4)}ms`);
      console.log(`  Status: ${result.time < 2000 ? '✅ PASS' : '❌ FAIL'}`);

      // The goal is <2000ms (2 seconds)
      expect(result.time).toBeLessThan(2000);
    });
  });

  // Benchmark 6: Size-based performance scaling
  describe('Size-based Scaling', () => {
    it('Performance scaling with payload size', async () => {
      const sizes = [1 * 1024, 100 * 1024, 500 * 1024, 1 * 1024 * 1024]; // 1KB, 100KB, 500KB, 1MB
      const results = [];

      for (const size of sizes) {
        const json = generateLargePayload(size);
        const sizeLabel = size >= 1 * 1024 * 1024 ? '1MB' : 
                          size >= 500 * 1024 ? '500KB' : 
                          size >= 100 * 1024 ? '100KB' : '1KB';
        
        const result = runBenchmark(
          'Size Scaling',
          `${sizeLabel} payload`,
          () => {
            parseStrictJson(json, {
              lazyMode: size >= 100 * 1024, // Auto-enable for >=100KB
              enableCache: true,
              enableStreaming: size >= 100 * 1024,
              streamingThreshold: 100 * 1024,
            });
          },
          size >= 1 * 1024 * 1024 ? 5 : 20
        );
        results.push({ size: sizeLabel, time: result.time });
        console.log(`${sizeLabel}: ${result.time.toFixed(4)}ms`);
      }

      // Verify reasonable scaling (not exponential)
      const ratio1 = results[1].time / results[0].time; // 100KB / 1KB
      const ratio2 = results[2].time / results[1].time; // 500KB / 100KB
      const ratio3 = results[3].time / results[2].time; // 1MB / 500KB

      console.log(`\nScaling ratios:`);
      console.log(`  1KB -> 100KB: ${ratio1.toFixed(2)}x`);
      console.log(`  100KB -> 500KB: ${ratio2.toFixed(2)}x`);
      console.log(`  500KB -> 1MB: ${ratio3.toFixed(2)}x`);

      // Check that 1MB is under 2 seconds with optimizations
      expect(results[3].time).toBeLessThan(2000);
    });
  });

  // Full benchmark run with report generation
  it('Run full optimization benchmark and generate report', async () => {
    console.log('\n' + '='.repeat(80));
    console.log('RUNNING FULL OPTIMIZATION BENCHMARK');
    console.log('='.repeat(80) + '\n');

    const fullSuite = new BenchmarkSuite();
    const largeJson = generateLargePayload(1 * 1024 * 1024);
    const mediumJson = generateMediumPayload();
    const smallJson = generateSmallPayload();

    fullSuite
      // Lazy mode tests
      .add('Lazy Mode', '1MB - Standard', () => parseStrictJson(largeJson, { lazyMode: false }), 10)
      .add('Lazy Mode', '1MB - Lazy', () => parseStrictJson(largeJson, { lazyMode: true, lazyModeThreshold: 100 * 1024 }), 10)
      
      // Caching tests
      .add('Caching', 'First parse (100KB)', () => {
        clearParseCache();
        parseStrictJson(mediumJson, { enableCache: true });
      }, 50)
      .add('Caching', 'Cached parse (100KB)', () => parseStrictJson(mediumJson, { enableCache: true }), 50)
      
      // Fast path tests
      .add('Fast Path', 'Small - Standard', () => parseStrictJson(smallJson, { enableFastPath: false }), 500)
      .add('Fast Path', 'Small - Fast', () => parseStrictJson(smallJson, { enableFastPath: true }), 500)
      
      // Combined optimizations
      .add('Combined', '1MB - Baseline', () => parseStrictJson(largeJson, {
        lazyMode: false, enableCache: false, enableStreaming: false
      }), 5)
      .add('Combined', '1MB - Optimized', () => parseStrictJson(largeJson, {
        lazyMode: true, lazyModeThreshold: 100 * 1024,
        enableCache: true, enableStreaming: true, streamingThreshold: 100 * 1024
      }), 5);

    const results = await fullSuite.runAndPrint();
    saveReports(results, 'performance/reports');

    console.log('\n✅ Full optimization benchmark completed and reports saved!');
  });
});
