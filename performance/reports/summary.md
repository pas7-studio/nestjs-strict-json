# Performance Benchmark Summary

## Executive Summary

- **Total Benchmarks**: 12
- **Successful**: 12/12
- **Average Time**: 11.904ms
- **Average Memory**: 2.42MB
- **Fastest Implementation**: 100x5 Fields
- **Most Memory Efficient**: 500x500B

## Implementation Comparison

| Implementation | Avg Time (ms) | Avg Memory (MB) | Success Rate |
|----------------|---------------|-----------------|--------------|
| 100x5 Fields | 0.112 | -0.03 | 100% |
| 500x2 Fields | 0.194 | -0.01 | 100% |
| 1000x5 Fields | 0.683 | -0.02 | 100% |
| 2000x3 Fields | 1.167 | 0.02 | 100% |
| 10000x5 Fields | 8.493 | 0.73 | 100% |
| 5000x10 Fields | 6.880 | -0.34 | 100% |
| 20000x5 Fields | 13.937 | 0.44 | 100% |
| 50000x3 Fields | 21.448 | 3.22 | 100% |
| 100x1KB | 0.343 | -0.00 | 100% |
| 500x500B | 0.869 | -0.48 | 100% |
| 10000x10 | 25.700 | 5.32 | 100% |
| 50000x5 | 63.024 | 20.13 | 100% |
