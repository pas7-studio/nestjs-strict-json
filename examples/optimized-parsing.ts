/**
 * Optimized JSON Parsing Examples
 * 
 * This file demonstrates various optimization techniques for parsing large JSON payloads:
 * 1. Lazy Mode - Skip non-critical checks for better performance
 * 2. Streaming Parser - Process large payloads in chunks
 * 3. Caching - Cache results for repeated parses
 * 4. Fast Path - Quick validation for simple cases
 */

import { parseStrictJson, parseStrictJsonAsync, clearParseCache, getParseCacheSize } from '../src/index.js';

// Example 1: Lazy Mode for Large Payloads
console.log('=== Example 1: Lazy Mode ===');
const largeJson = JSON.stringify({
  data: Array.from({ length: 10000 }, (_, i) => ({ id: i, value: `item-${i}` }))
});

// Parse with lazy mode (skips prototype pollution, whitelist checks beyond depth limit)
const lazyModeResult = parseStrictJson(largeJson, {
  lazyMode: true,
  lazyModeThreshold: 100 * 1024, // 100KB
  lazyModeDepthLimit: 5, // Only check first 5 levels deep
  lazyModeSkipPrototype: true, // Skip prototype pollution check
  lazyModeSkipWhitelist: true, // Skip whitelist check
  lazyModeSkipBlacklist: false, // Always check blacklist (security-critical)
});
console.log(`Parsed with lazy mode: ${JSON.stringify(lazyModeResult).slice(0, 100)}...`);

// Example 2: Streaming Parser for Very Large Payloads
console.log('\n=== Example 2: Streaming Parser ===');
const veryLargeJson = JSON.stringify({
  data: Array.from({ length: 100000 }, (_, i) => ({ id: i, value: `item-${i}` }))
});

// Parse with streaming parser (for payloads > 100KB)
async function streamingExample() {
  const streamingResult = await parseStrictJsonAsync(veryLargeJson, {
    enableStreaming: true,
    streamingThreshold: 100 * 1024, // 100KB
    chunkSize: 64 * 1024, // 64KB chunks
  });
  console.log(`Parsed with streaming: ${JSON.stringify(streamingResult).slice(0, 100)}...`);
}

streamingExample().catch(console.error);

// Example 3: Caching for Repeated Parses
console.log('\n=== Example 3: Caching ===');
const repeatedJson = JSON.stringify({ id: 1, name: 'Test', value: 42 });

// First parse (not cached)
console.log('Cache size before:', getParseCacheSize());
const firstResult = parseStrictJson(repeatedJson, {
  enableCache: true,
  cacheSize: 1000,
  cacheTTL: 60000, // 60 seconds
});
console.log('Cache size after first parse:', getParseCacheSize());

// Second parse (cached - much faster!)
const secondResult = parseStrictJson(repeatedJson, {
  enableCache: true,
});
console.log('Cache size after second parse:', getParseCacheSize());
console.log('Results are equal:', JSON.stringify(firstResult) === JSON.stringify(secondResult));

// Clear cache
clearParseCache();
console.log('Cache size after clear:', getParseCacheSize());

// Example 4: Fast Path for Simple Validation
console.log('\n=== Example 4: Fast Path ===');
const simpleJson = JSON.stringify({ id: 1, name: 'Test', nested: { value: 42 } });

// Parse with fast path (only checks prototype pollution, not duplicates)
const fastPathResult = parseStrictJson(simpleJson, {
  enableFastPath: true,
});
console.log(`Parsed with fast path: ${JSON.stringify(fastPathResult)}`);

// Example 5: Combined Optimizations
console.log('\n=== Example 5: Combined Optimizations ===');
const complexLargeJson = JSON.stringify({
  metadata: {
    version: '1.0',
    timestamp: Date.now(),
  },
  data: Array.from({ length: 50000 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    profile: {
      age: 25 + (i % 30),
      role: i % 2 === 0 ? 'admin' : 'user',
    },
  })),
});

async function combinedOptimizations() {
  const result = await parseStrictJsonAsync(complexLargeJson, {
    lazyMode: true,
    lazyModeThreshold: 100 * 1024,
    lazyModeDepthLimit: 10,
    lazyModeSkipPrototype: true,
    lazyModeSkipWhitelist: true,
    enableCache: true,
    cacheSize: 500,
    enableStreaming: true,
    streamingThreshold: 100 * 1024,
  });
  console.log(`Parsed with combined optimizations:`, {
    dataCount: (result as any).data.length,
    firstItem: (result as any).data[0],
  });
}

combinedOptimizations().catch(console.error);

// Example 6: Auto-Enable Lazy Mode for Large Payloads
console.log('\n=== Example 6: Auto-Enable Lazy Mode ===');
const autoLazyJson = JSON.stringify({
  data: Array.from({ length: 20000 }, (_, i) => ({ id: i, value: `item-${i}` }))
});

// Lazy mode is auto-enabled for payloads >= 100KB (default threshold)
const autoLazyResult = parseStrictJson(autoLazyJson, {
  // lazyMode not set - will be auto-enabled based on payload size
  lazyModeThreshold: 100 * 1024,
});
console.log(`Parsed with auto lazy mode:`, {
  dataCount: (autoLazyResult as any).data.length,
  firstItem: (autoLazyResult as any).data[0],
});

console.log('\n=== All Examples Completed ===');
