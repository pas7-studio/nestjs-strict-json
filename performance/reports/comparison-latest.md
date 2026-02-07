# Parser Comparison Benchmark

Generated: 2026-02-07T17:48:12.154Z
Payload: ~1.24 MB (10,000 users)

| Implementation | Avg ms/op | Peak heap delta (MB) | Retained heap (MB) |
|---|---:|---:|---:|
| Native JSON.parse | 3.7878 | 9.62 | -0.01 |
| jsonc-parser + JSON.parse | 21.4828 | 49.11 | 0.00 |
| @pas7 strict (baseline) | 76.1405 | 253.60 | 0.00 |
| @pas7 strict (optimized) | 3.2743 | 61.80 | -0.00 |

Notes:
- `Peak heap delta` = max observed heap growth during the run.
- `Retained heap` = heap difference after explicit GC.
