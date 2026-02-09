# Parser Comparison Benchmark

Generated: 2026-02-09T20:40:57.198Z
Payload: ~1.24 MB (10,000 users)

| Implementation | Avg ms/op | Peak heap delta (MB) | Retained heap (MB) |
|---|---:|---:|---:|
| Native JSON.parse | 3.3041 | 9.53 | -0.14 |
| jsonc-parser + JSON.parse | 22.4995 | 49.27 | 0.00 |
| @pas7 strict (baseline) | 64.0493 | 234.64 | 0.02 |
| @pas7 strict (optimized) | 5.9372 | 65.56 | -0.02 |

Notes:
- `Peak heap delta` = max observed heap growth during the run.
- `Retained heap` = heap difference after explicit GC.
