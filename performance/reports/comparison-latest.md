# Parser Comparison Benchmark

Generated: 2026-02-12T21:55:51.571Z
Payload: ~1.24 MB (10,000 users)

| Implementation | Avg ms/op | Peak heap delta (MB) | Retained heap (MB) |
|---|---:|---:|---:|
| Native JSON.parse | 5.3646 | 0.00 | 7.34 |
| jsonc-parser + JSON.parse | 51.1827 | 112.88 | -18.31 |
| @pas7 strict (baseline) | 80.7089 | 146.61 | 52.25 |
| @pas7 strict (optimized) | 6.3039 | 21.03 | -187.27 |

Notes:
- `Peak heap delta` = max observed heap growth during the run.
- `Retained heap` = heap difference after explicit GC.
