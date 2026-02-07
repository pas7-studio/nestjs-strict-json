# Detailed Benchmark Results

Generated: 2026-02-07T03:52:04.713Z

## Shallow Duplicates

| Implementation | Time (ms) | Memory (MB) | Ops/sec | Status |
|----------------|-----------|-------------|---------|--------|
| No Duplicates | 0.003 | -0.00 | 387252 | ✅ |
| With Duplicates | 0.008 | 0.00 | 126622 | ✅ |

🏆 **Fastest**: No Duplicates (0.003ms)

---

## Deep Duplicates

| Implementation | Time (ms) | Memory (MB) | Ops/sec | Status |
|----------------|-----------|-------------|---------|--------|
| Level 2 | 0.012 | 0.00 | 86606 | ✅ |
| Level 5 | 0.015 | 0.00 | 65791 | ✅ |
| Level 10 | 0.028 | -0.01 | 35271 | ✅ |

🏆 **Fastest**: Level 2 (0.012ms)

---

## Large Duplicates

| Implementation | Time (ms) | Memory (MB) | Ops/sec | Status |
|----------------|-----------|-------------|---------|--------|
| 100 Items | 0.105 | 0.00 | 9525 | ✅ |
| 500 Items | 0.499 | 0.00 | 2006 | ✅ |

🏆 **Fastest**: 100 Items (0.105ms)

---

