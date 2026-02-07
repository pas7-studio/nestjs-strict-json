# Detailed Benchmark Results

Generated: 2026-02-07T14:49:29.884Z

## Small Payloads

| Implementation | Time (ms) | Memory (MB) | Ops/sec | Status |
|----------------|-----------|-------------|---------|--------|
| 100x5 Fields | 0.112 | -0.03 | 8894 | ✅ |
| 500x2 Fields | 0.194 | -0.01 | 5156 | ✅ |

🏆 **Fastest**: 100x5 Fields (0.112ms)

---

## Medium Payloads

| Implementation | Time (ms) | Memory (MB) | Ops/sec | Status |
|----------------|-----------|-------------|---------|--------|
| 1000x5 Fields | 0.683 | -0.02 | 1465 | ✅ |
| 2000x3 Fields | 1.167 | 0.02 | 857 | ✅ |

🏆 **Fastest**: 1000x5 Fields (0.683ms)

---

## Large Payloads

| Implementation | Time (ms) | Memory (MB) | Ops/sec | Status |
|----------------|-----------|-------------|---------|--------|
| 5000x10 Fields | 6.880 | -0.34 | 145 | ✅ |
| 10000x5 Fields | 8.493 | 0.73 | 118 | ✅ |

🏆 **Fastest**: 5000x10 Fields (6.880ms)

---

## Extra Large

| Implementation | Time (ms) | Memory (MB) | Ops/sec | Status |
|----------------|-----------|-------------|---------|--------|
| 20000x5 Fields | 13.937 | 0.44 | 72 | ✅ |
| 50000x3 Fields | 21.448 | 3.22 | 47 | ✅ |

🏆 **Fastest**: 20000x5 Fields (13.937ms)

---

## String Data

| Implementation | Time (ms) | Memory (MB) | Ops/sec | Status |
|----------------|-----------|-------------|---------|--------|
| 100x1KB | 0.343 | -0.00 | 2913 | ✅ |
| 500x500B | 0.869 | -0.48 | 1151 | ✅ |

🏆 **Fastest**: 100x1KB (0.343ms)

---

## Numeric Data

| Implementation | Time (ms) | Memory (MB) | Ops/sec | Status |
|----------------|-----------|-------------|---------|--------|
| 10000x10 | 25.700 | 5.32 | 39 | ✅ |
| 50000x5 | 63.024 | 20.13 | 16 | ✅ |

🏆 **Fastest**: 10000x10 (25.700ms)

---

