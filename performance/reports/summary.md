# Performance Benchmark Summary

## Executive Summary

- **Total Benchmarks**: 13
- **Successful**: 13/13
- **Average Time**: 0.096ms
- **Average Memory**: 0.00MB
- **Fastest Implementation**: No Duplicates
- **Most Memory Efficient**: Level 10

## Implementation Comparison

| Implementation | Avg Time (ms) | Avg Memory (MB) | Success Rate |
|----------------|---------------|-----------------|--------------|
| With Duplicates | 0.008 | 0.00 | 100% |
| No Duplicates | 0.003 | -0.00 | 100% |
| Level 2 | 0.012 | 0.00 | 100% |
| Level 5 | 0.015 | 0.00 | 100% |
| Level 10 | 0.028 | -0.01 | 100% |
| 100 Items | 0.105 | 0.00 | 100% |
| 500 Items | 0.499 | 0.00 | 100% |

## @pas7 vs jsonc-parser Comparison

| Size | jsonc-parser | @pas7 (optimized) | Overhead | Improvement |
|------|--------------|-------------------|----------|-------------|
| Small (10k iterations) | 0.0018ms | 0.0021ms | +17% | **+7%** |
| Medium (1k iterations) | 0.4011ms | 0.7744ms | +93% | **+7%** |
| Large (100 iterations) | 4.0219ms | 9.1261ms | +127% | **+6%** |

**Note:** Overhead is expected due to additional security checks (duplicate keys, prototype pollution, depth limit, whitelist/blacklist). The 6-7% improvement comes from optimizations using Set instead of Array.includes() and pre-computing frequently accessed values.

## Optimization Details

See [`optimization-report.md`](./optimization-report.md) for detailed analysis of:
- Before/after benchmark results
- Optimization techniques applied
- Performance analysis and conclusions

## Running Benchmarks

```bash
# Run all benchmarks
npm run benchmark

# Run parser benchmarks
npm run benchmark:parser

# Run adapter benchmarks
npm run benchmark:adapters

# Run comparison benchmarks (including vs jsonc-parser)
npm run benchmark:comparisons

# Run comparison with jsonc-parser specifically
npx vitest run performance/benchmarks/comparisons/vs-jsonc-parser.spec.ts --config vitest.benchmark.config.ts
```
