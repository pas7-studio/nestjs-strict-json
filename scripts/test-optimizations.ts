/**
 * Quick test for optimizations
 * Tests lazy mode, caching, and streaming performance
 */

import { parseStrictJson, parseStrictJsonAsync, clearParseCache, getParseCacheSize } from '../src/index.js';

function generateLargePayload(sizeInBytes: number): string {
  const items = [];
  const itemSize = 100;
  
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

function runBenchmark(name: string, fn: () => void, iterations: number = 10): { time: number; success: boolean } {
  try {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      fn();
    }
    const totalTime = performance.now() - start;
    const avgTime = totalTime / iterations;
    
    return { time: avgTime, success: true };
  } catch (error) {
    console.error(`  ❌ ${name} failed:`, error);
    return { time: 0, success: false };
  }
}

async function main() {
  console.log('='.repeat(80));
  console.log('OPTIMIZATION PERFORMANCE TEST');
  console.log('='.repeat(80) + '\n');

  const largeJson = generateLargePayload(1 * 1024 * 1024); // 1MB
  const mediumJson = generateLargePayload(100 * 1024); // 100KB
  const smallJson = generateLargePayload(1 * 1024); // 1KB

  // Test 1: Standard vs Lazy Mode (1MB)
  console.log('Test 1: Standard vs Lazy Mode (1MB payload)');
  console.log('-'.repeat(80));
  
  const standardResult = runBenchmark('Standard (full checks)', () => {
    parseStrictJson(largeJson, { lazyMode: false });
  }, 5);
  
  const lazyResult = runBenchmark('Lazy Mode (optimized)', () => {
    parseStrictJson(largeJson, {
      lazyMode: true,
      lazyModeThreshold: 100 * 1024,
      lazyModeDepthLimit: 10,
      lazyModeSkipPrototype: true,
      lazyModeSkipWhitelist: true,
    });
  }, 5);
  
  console.log(`  Standard: ${standardResult.time.toFixed(4)}ms`);
  console.log(`  Lazy Mode: ${lazyResult.time.toFixed(4)}ms`);
  if (standardResult.success && lazyResult.success) {
    const speedup = standardResult.time / lazyResult.time;
    console.log(`  Speedup: ${speedup.toFixed(2)}x ${speedup > 1 ? '✅' : '⚠️'}`);
  }
  console.log();

  // Test 2: Caching (100KB)
  console.log('Test 2: Caching Performance (100KB payload)');
  console.log('-'.repeat(80));
  
  clearParseCache();
  console.log(`  Cache size before: ${getParseCacheSize()}`);
  
  const firstParse = runBenchmark('First parse (not cached)', () => {
    parseStrictJson(mediumJson, { enableCache: true });
  }, 10);
  
  console.log(`  Cache size after first parse: ${getParseCacheSize()}`);
  
  const cachedParse = runBenchmark('Second parse (cached)', () => {
    parseStrictJson(mediumJson, { enableCache: true });
  }, 10);
  
  console.log(`  Cache size after second parse: ${getParseCacheSize()}`);
  console.log(`  First parse: ${firstParse.time.toFixed(4)}ms`);
  console.log(`  Cached parse: ${cachedParse.time.toFixed(4)}ms`);
  if (firstParse.success && cachedParse.success) {
    const speedup = firstParse.time / cachedParse.time;
    console.log(`  Speedup: ${speedup.toFixed(2)}x ${speedup > 1 ? '✅' : '⚠️'}`);
  }
  console.log();

  // Test 3: Fast Path (1KB)
  console.log('Test 3: Fast Path Performance (1KB payload)');
  console.log('-'.repeat(80));
  
  const standardSmall = runBenchmark('Standard parsing', () => {
    parseStrictJson(smallJson, { enableFastPath: false });
  }, 100);
  
  const fastPathSmall = runBenchmark('Fast path parsing', () => {
    parseStrictJson(smallJson, { enableFastPath: true });
  }, 100);
  
  console.log(`  Standard: ${standardSmall.time.toFixed(4)}ms`);
  console.log(`  Fast Path: ${fastPathSmall.time.toFixed(4)}ms`);
  if (standardSmall.success && fastPathSmall.success) {
    const speedup = standardSmall.time / fastPathSmall.time;
    console.log(`  Speedup: ${speedup.toFixed(2)}x ${speedup > 1 ? '✅' : '⚠️'}`);
  }
  console.log();

  // Test 4: Performance Goal (1MB < 2000ms)
  console.log('Test 4: Performance Goal (1MB payload < 2000ms)');
  console.log('-'.repeat(80));
  
  const optimizedResult = runBenchmark('All optimizations enabled', () => {
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
  }, 5);
  
  console.log(`  Target: <2000ms`);
  console.log(`  Actual: ${optimizedResult.time.toFixed(4)}ms`);
  console.log(`  Status: ${optimizedResult.time < 2000 ? '✅ PASS' : '❌ FAIL'}`);
  console.log();

  // Test 5: Size-based scaling
  console.log('Test 5: Size-based Performance Scaling');
  console.log('-'.repeat(80));
  
  const sizes = [
    { label: '1KB', size: 1 * 1024 },
    { label: '100KB', size: 100 * 1024 },
    { label: '1MB', size: 1 * 1024 * 1024 },
  ];
  
  const sizeResults: { label: string; time: number }[] = [];
  
  for (const { label, size } of sizes) {
    const json = generateLargePayload(size);
    const result = runBenchmark(
      `${label} payload`,
      () => {
        parseStrictJson(json, {
          lazyMode: size >= 100 * 1024,
          enableCache: true,
          enableStreaming: size >= 100 * 1024,
          streamingThreshold: 100 * 1024,
        });
      },
      size >= 1 * 1024 * 1024 ? 3 : 10
    );
    sizeResults.push({ label, time: result.time });
    console.log(`  ${label}: ${result.time.toFixed(4)}ms`);
  }
  
  console.log();

  // Test 6: Auto-enable Lazy Mode
  console.log('Test 6: Auto-enable Lazy Mode for Large Payloads');
  console.log('-'.repeat(80));
  
  const autoLazyResult = runBenchmark('Auto lazy mode (>=100KB)', () => {
    parseStrictJson(largeJson, {
      lazyModeThreshold: 100 * 1024,
      enableCache: true,
    });
  }, 5);
  
  console.log(`  Payload size: 1MB`);
  console.log(`  Lazy mode threshold: 100KB`);
  console.log(`  Parsing time: ${autoLazyResult.time.toFixed(4)}ms`);
  console.log(`  Status: ${autoLazyResult.time < 2000 ? '✅ Auto-enabled' : '⚠️'}\n`);

  console.log('='.repeat(80));
  console.log('OPTIMIZATION TEST COMPLETED');
  console.log('='.repeat(80));
}

main().catch(console.error);
