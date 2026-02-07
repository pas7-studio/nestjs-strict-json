# Performance Benchmarks

This directory contains comprehensive performance benchmarks for `@pas7/nestjs-strict-json`.

## Overview

Our benchmarks compare `@pas7/nestjs-strict-json` against:
- **Native JSON.parse** - Standard JavaScript JSON parsing
- **Manual implementations** - Custom validation solutions
- **Popular libraries** - Express body-parser, Fastify
- **Custom solutions** - Various approaches to JSON security

## Running Benchmarks

```bash
# Run all benchmarks
npm run benchmark

# Run specific benchmark category
npm run benchmark:parser
npm run benchmark:adapters
npm run benchmark:comparisons

# Run individual benchmark files
npx vitest run performance/benchmarks/comparisons/vs-native.spec.ts
npx vitest run performance/benchmarks/parser/large-payload.spec.ts
```

## Benchmark Structure

```
performance/
├── benchmarks/              # Benchmark test files
│   ├── comparisons/         # Comparison benchmarks
│   │   ├── vs-native.spec.ts
│   │   ├── vs-custom.spec.ts
│   │   └── vs-express-bp.spec.ts
│   ├── adapters/            # Adapter benchmarks
│   │   ├── express.spec.ts
│   │   ├── fastify.spec.ts
│   │   └── streaming.spec.ts
│   └── parser/             # Parser feature benchmarks
│       ├── duplicate-keys.spec.ts
│       ├── deep-nesting.spec.ts
│       ├── large-payload.spec.ts
│       └── memory-usage.spec.ts
├── reports/                # Benchmark results
│   ├── summary.md          # Executive summary
│   ├── latest.md           # Latest detailed results
│   └── results.json       # Raw JSON data
├── utils/                  # Benchmark utilities
│   ├── generators.ts       # Test data generators
│   ├── reporters.ts       # Report generators
│   ├── chart-generator.ts # Visualization tools
│   └── benchmark-runner.ts # Benchmark framework
├── fixtures/               # Test data fixtures
│   ├── small.json         # ~1KB
│   ├── medium.json        # ~100KB
│   ├── large.json        # ~1MB
│   ├── duplicate-keys.json
│   └── deep-nested.json
├── run-all-benchmarks.mjs # Run all benchmarks
└── README.md
```

## Benchmark Methodology

### Test Payloads

| Payload | Size | Description |
|---------|------|-------------|
| **Small** | ~1KB | Simple object with 10 fields |
| **Medium** | ~100KB | Array of 1,000 objects |
| **Large** | ~1MB | Array of 10,000 objects |
| **Duplicate Keys** | Variable | Objects with duplicate keys |
| **Deep Nested** | Variable | Objects with 30+ levels |

### Metrics Measured

- **Parsing Time** - Time to parse JSON (ms)
- **Memory Usage** - Peak memory consumption (MB)
- **Operations/Second** - Throughput metric
- **Accuracy** - Duplicate detection accuracy
- **Overhead** - Security feature overhead

### Environment

- **Node.js**: 20.x or higher
- **OS**: Linux, macOS, or Windows
- **CPU**: Multi-core recommended
- **RAM**: 8GB+ recommended

## Results

### Latest Benchmark Results

See [`performance/reports/latest.md`](reports/latest.md) for the most recent detailed results.

### Summary

See [`performance/reports/summary.md`](reports/summary.md) for an executive summary.

### Raw Data

See [`performance/reports/results.json`](reports/results.json) for raw benchmark data.

## Benchmark Categories

### 1. Comparison Benchmarks

#### vs-native.spec.ts
Compares against native `JSON.parse`:
- Standard parsing performance
- Memory efficiency
- Security feature overhead

#### vs-custom.spec.ts
Compares against custom implementations:
- Recursive manual parsing
- Object.keys() checking
- Set-based detection
- jsonc-parser implementation

#### vs-express-bp.spec.ts
Compares against Express body-parser:
- Middleware overhead
- Request processing time
- Error handling

### 2. Adapter Benchmarks

#### express.spec.ts
Benchmarks Express adapter:
- Middleware creation overhead
- Request processing time
- Memory footprint
- Configuration options

#### fastify.spec.ts
Benchmarks Fastify adapter:
- Content type parser overhead
- Request processing time
- Memory efficiency
- Configuration options

#### streaming.spec.ts
Benchmarks streaming parser:
- Buffer vs streaming performance
- Memory usage comparison
- Large payload handling
- Chunked streaming
- Concurrent processing

### 3. Parser Benchmarks

#### duplicate-keys.spec.ts
Benchmarks duplicate key detection:
- Shallow duplicates
- Deep nested duplicates
- Large datasets
- Accuracy testing
- Performance impact

#### deep-nesting.spec.ts
Benchmarks deep nesting handling:
- Shallow nesting (<5 levels)
- Medium nesting (5-10 levels)
- Deep nesting (15-20 levels)
- Very deep nesting (>20 levels)
- Custom depth limits

#### large-payload.spec.ts
Benchmarks large payload handling:
- Small payloads (~10KB)
- Medium payloads (~100KB)
- Large payloads (~1MB)
- Extra large payloads (>1MB)
- String vs numeric data
- Nested structures
- Performance scaling

#### memory-usage.spec.ts
Benchmarks memory efficiency:
- Peak memory usage
- Memory per operation
- Buffer vs streaming
- Memory growth over time
- Feature-specific memory
- Large array handling

## Key Findings

### Performance Highlights

1. **95%+ of Native Performance** for small payloads
2. **80%+ Memory Reduction** for large payloads with streaming
3. **Minimal Overhead** for security features
4. **Linear Scaling** for payload size

### Security Features

| Feature | Performance Impact | Memory Impact |
|----------|------------------|---------------|
| Duplicate Detection | <5% overhead | <1MB overhead |
| Prototype Protection | <2% overhead | <0.5MB overhead |
| Depth Limit | <3% overhead | <0.5MB overhead |
| Whitelist/Blacklist | <4% overhead | <1MB overhead |

## Visualization

ASCII charts are generated in benchmark output for visual comparison:

```bash
Implementation    Time (ms)   Memory (MB)
───────────────────────────────────────────
Native           ████         ████████
@pas7 (buffer)   █████         █████████
@pas7 (streaming) ████████      ██
```

## Contributing

When adding benchmarks:

1. **Follow existing structure** - Use the established patterns
2. **Add comprehensive comments** - Document what's being tested
3. **Include multiple test cases** - Test various scenarios
4. **Update reports after running** - Keep results current
5. **Use the benchmark framework** - Leverage `BenchmarkSuite`
6. **Include error cases** - Test failure scenarios
7. **Document assumptions** - Explain test methodology

### Benchmark Template

```typescript
import { describe, it, expect } from 'vitest';
import { runBenchmark, BenchmarkSuite } from '../../utils/benchmark-runner.js';
import { saveReports } from '../../utils/reporters.js';

describe('Your Benchmark Category', () => {
  it('Your test case', async () => {
    const result = runBenchmark(
      'Benchmark Name',
      'Implementation Name',
      () => {
        // Your benchmark code here
      },
      100 // Number of iterations
    );
    console.log(`Result: ${result.time.toFixed(4)}ms, ${result.memory.toFixed(4)}MB`);
    expect(result.success).toBe(true);
  });

  it('Run full benchmark and generate report', async () => {
    const suite = new BenchmarkSuite();
    // Add benchmarks
    const results = await suite.runAndPrint();
    saveReports(results);
  });
});
```

## CI/CD Integration

Benchmarks run automatically in CI/CD:
- On push to main branch
- On pull requests
- Weekly schedule (Sundays at 00:00 UTC)

Results are uploaded as artifacts and posted as PR comments.

## Troubleshooting

### Benchmarks are slow

- Run with fewer iterations
- Use smaller payloads
- Disable GC measurements (not recommended)

### Inconsistent results

- Ensure no background processes
- Run multiple times and average
- Use `--expose-gc` for accurate memory measurements

### Out of memory errors

- Reduce payload sizes
- Run benchmarks individually
- Increase Node.js heap size: `node --max-old-space-size=4096`

## License

Same as main project.

## Related Documentation

- [Main README](../../README.md)
- [Security Documentation](../../SECURITY.md)
- [Contributing Guide](../../CONTRIBUTING.md)
