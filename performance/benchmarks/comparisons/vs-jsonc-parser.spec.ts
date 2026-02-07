import { describe, it } from 'vitest';
import { parseStrictJson } from '../../../src/core/parser';
import { parseTree } from 'jsonc-parser';
import { performance } from 'perf_hooks';

describe('Performance: @pas7 vs jsonc-parser', () => {
  const smallJson = '{"name":"John","age":30}';
  const mediumJson = JSON.stringify({ users: Array(1000).fill({ name: 'John', age: 30 }) });
  const largeJson = JSON.stringify({ users: Array(10000).fill({ name: 'John', age: 30 }) });

  it('small json - jsonc-parser parseTree', () => {
    const iterations = 10000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      parseTree(smallJson);
    }
    const time = performance.now() - start;
    console.log(`jsonc-parser (small, ${iterations} iterations): ${time.toFixed(2)}ms`);
    console.log(`Average: ${(time / iterations).toFixed(4)}ms per parse`);
  });

  it('small json - @pas7 parseStrictJson', () => {
    const iterations = 10000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      parseStrictJson(smallJson);
    }
    const time = performance.now() - start;
    console.log(`@pas7 (small, ${iterations} iterations): ${time.toFixed(2)}ms`);
    console.log(`Average: ${(time / iterations).toFixed(4)}ms per parse`);
  });

  it('medium json - jsonc-parser parseTree', () => {
    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      parseTree(mediumJson);
    }
    const time = performance.now() - start;
    console.log(`jsonc-parser (medium, ${iterations} iterations): ${time.toFixed(2)}ms`);
    console.log(`Average: ${(time / iterations).toFixed(4)}ms per parse`);
  });

  it('medium json - @pas7 parseStrictJson', () => {
    const iterations = 1000;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      parseStrictJson(mediumJson);
    }
    const time = performance.now() - start;
    console.log(`@pas7 (medium, ${iterations} iterations): ${time.toFixed(2)}ms`);
    console.log(`Average: ${(time / iterations).toFixed(4)}ms per parse`);
  });

  it('large json - jsonc-parser parseTree', () => {
    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      parseTree(largeJson);
    }
    const time = performance.now() - start;
    console.log(`jsonc-parser (large, ${iterations} iterations): ${time.toFixed(2)}ms`);
    console.log(`Average: ${(time / iterations).toFixed(4)}ms per parse`);
  });

  it('large json - @pas7 parseStrictJson', () => {
    const iterations = 100;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      parseStrictJson(largeJson);
    }
    const time = performance.now() - start;
    console.log(`@pas7 (large, ${iterations} iterations): ${time.toFixed(2)}ms`);
    console.log(`Average: ${(time / iterations).toFixed(4)}ms per parse`);
  });
});
