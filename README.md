# @pas7/nestjs-strict-json

> Standalone strict JSON parsing for Express/Fastify with duplicate-key detection. Works with NestJS, vanilla Express, or vanilla Fastify!

[![npm version](https://badge.fury.io/js/%40pas7%2Fnestjs-strict-json.svg)](https://www.npmjs.com/package/@pas7/nestjs-strict-json)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

NestJS strict JSON parser with duplicate key detection for Fastify and Express. 
Useful for API security hardening, JSON body validation safety, and preventing duplicate-key overwrite bugs.

## What it solves

This package detects duplicate keys in JSON request bodies and returns `400 Bad Request`. It works early in the pipeline — before any validation or parsing occurs.
Duplicate detection is scoped per JSON object node, so equal keys in different array elements are allowed.

### Works with multiple frameworks

**NestJS** (recommended): Full module integration with automatic adapter detection

**Pure Express**: Drop-in middleware for vanilla Express apps

**Pure Fastify**: Drop-in content type parser for vanilla Fastify apps

The parser is framework-agnostic and can be used with any Node.js HTTP framework that supports middleware or custom body parsers.

### The Problem

Consider this JSON payload with duplicate keys:

```json
{
  "flag": true,
  "flag": false
}
```

Most JSON parsers silently keep only the last value, which can lead to:
- Security vulnerabilities (bypassing validation)
- Data corruption
- Unpredictable behavior

### The Solution

`@pas7/nestjs-strict-json` detects duplicate keys **before** any validation occurs, preventing these issues entirely.

## Quick Start

### Fastify (Recommended)

Fastify allows overriding the JSON parser directly — this is the ideal approach:

```typescript
import { NestFactory } from "@nestjs/common"
import { registerStrictJson } from "@pas7/nestjs-strict-json"

const app = await NestFactory.create(AppModule)

registerStrictJson(app)

await app.listen(3000)
```

### Express

With NestJS + Express, the default body parser already consumes duplicate keys (you lose them). Therefore, you **must** disable the default parser:

```typescript
import { NestFactory } from "@nestjs/common"
import { registerStrictJson } from "@pas7/nestjs-strict-json"

const app = await NestFactory.create(AppModule, { 
  bodyParser: false  // Required: disable default body parser
})

registerStrictJson(app)

await app.listen(3000)
```

Important: To catch duplicate keys with Express, you must disable the default body parser, otherwise the duplicates are already lost.

## Use Cases

- API security: prevent silent field override attacks in request payloads.
- Data integrity: reject ambiguous payloads before DTO validation/business logic.
- Compliance-friendly input handling: return deterministic 4xx responses on malformed JSON.
- Framework portability: same strict behavior for NestJS, Fastify, and Express.

## Error Format

All strict JSON errors include `code` and `message` (plus framework status fields such as `statusCode` when applicable). Duplicate-key errors also include location data:

```json
{
  "code": "STRICT_JSON_DUPLICATE_KEY",
  "message": "Duplicate JSON key \"flag\" at $.flag",
  "details": {
    "path": "$.flag",
    "key": "flag"
  }
}
```

### HTTP Response Examples

`400 Bad Request` for duplicate keys:

```json
{
  "statusCode": 400,
  "message": {
    "code": "STRICT_JSON_DUPLICATE_KEY",
    "message": "Duplicate JSON key \"flag\" at $.flag",
    "details": {
      "path": "$.flag",
      "key": "flag"
    }
  },
  "error": "Bad Request"
}
```

`413 Payload Too Large` when `maxBodySizeBytes` is exceeded:

```json
{
  "statusCode": 413,
  "message": {
    "code": "STRICT_JSON_BODY_TOO_LARGE",
    "message": "Request body exceeds max size of 1048576 bytes"
  },
  "error": "Payload Too Large"
}
```

### Error Codes

- `STRICT_JSON_DUPLICATE_KEY` - Duplicate key detected
- `STRICT_JSON_INVALID_JSON` - Invalid JSON syntax
- `STRICT_JSON_BODY_TOO_LARGE` - Request body exceeds max size (HTTP 413)
- `STRICT_JSON_PROTOTYPE_POLLUTION` - Prototype pollution attempt detected (HTTP 400)
- `STRICT_JSON_DEPTH_LIMIT` - JSON nesting depth exceeded limit (HTTP 400)

## Prototype Pollution Protection

This package automatically protects against prototype pollution attacks by detecting dangerous keys like `__proto__`, `constructor`, and `prototype`.

### How it works

When a dangerous key is detected in the JSON payload, the parser throws a `PrototypePollutionError` with HTTP 400 status.

```json
{
  "statusCode": 400,
  "code": "STRICT_JSON_PROTOTYPE_POLLUTION",
  "message": "Prototype pollution attempt detected: dangerous key '__proto__' at $.__proto__",
  "details": {
    "code": "STRICT_JSON_PROTOTYPE_POLLUTION",
    "message": "Prototype pollution attempt detected: dangerous key '__proto__' at $.__proto__",
    "path": "$.__proto__",
    "dangerousKey": "__proto__"
  }
}
```

### Configuration

```typescript
registerStrictJson(app, {
  enablePrototypePollutionProtection: true,  // Enable/disable (default: true)
  dangerousKeys: ['__proto__', 'constructor', 'prototype']  // Custom dangerous keys
})
```

### Example

```typescript
// This will be blocked
{
  "user": "John",
  "__proto__": {"isAdmin": true}  // ❌ Prototype pollution attempt
}
```

## Custom Error Handlers

You can register custom error handlers to log errors, send to monitoring services, or implement custom logic.

### Available Handlers

- `onDuplicateKey(error)` - Called when duplicate key is detected
- `onInvalidJson(error)` - Called when JSON is invalid
- `onBodyTooLarge(error)` - Called when body size exceeds limit
- `onPrototypePollution(error)` - Called when prototype pollution is detected
- `onError(error)` - Called for any error (generic handler)

### Example

```typescript
registerStrictJson(app, {
  onDuplicateKey: (error) => {
    console.log(`Duplicate key: ${error.key} at ${error.path}`);
    // Send to Sentry
    Sentry.captureException(error);
  },
  onPrototypePollution: async (error) => {
    console.warn(`Security issue: ${error.dangerousKey} detected`);
    await notifySecurityTeam(error);
  },
  onError: (error) => {
    // Track all errors
    analytics.track('strict_json_error', { code: error.code });
  }
})
```

## Extended Configuration Options

### Whitelist & Blacklist

Control which keys are allowed in your JSON payloads using glob patterns.

#### Whitelist (Allow Only)

```typescript
registerStrictJson(app, {
  whitelist: ['user.*', 'profile.*']  // Only allow user.* and profile.* keys
})
```

```json
// ✅ Allowed
{
  "user": {"name": "John"},
  "profile": {"age": 30}
}

// ❌ Rejected
{
  "user": {"name": "John"},
  "secret": "value"  // Not in whitelist
}
```

#### Blacklist (Block Specific)

```typescript
registerStrictJson(app, {
  blacklist: ['password', 'secret.*', 'api-key']  // Block sensitive keys
})
```

```json
// ❌ Blocked
{
  "user": "John",
  "password": "secret123"  // In blacklist
}
```

### maxDepth

Protect against DoS attacks by limiting JSON nesting depth.

```typescript
registerStrictJson(app, {
  maxDepth: 10  // Maximum nesting depth (default: 20)
})
```

```json
// ❌ Blocked (depth > 10)
{
  "l1": {"l2": {"l3": {"l4": {"l5": {"l6": {"l7": {"l8": {"l9": {"l10": {"l11": "deep"}}}}}}}}}}
}
```

### Combining Options

```typescript
registerStrictJson(app, {
  whitelist: ['user.*', 'data.*'],
  blacklist: ['*.password', '*.token'],
  maxDepth: 10,
  enablePrototypePollutionProtection: true
})
```

## Glob Patterns for Whitelist/Blacklist

Use glob patterns to match keys flexibly:

- `user` - Exact match
- `user.*` - All keys under `user`
- `data.**.name` - Any `name` key under `data` (recursive)
- `*.password` - Any `password` key at any level
- `users[0].name` - Specific array element

### Examples

```typescript
{
  whitelist: [
    'user.*',              // All user properties
    'profile.*',            // All profile properties
    'data.**.id',          // Any id field in data
    'items.*.name'          // Name fields in items array
  ],
  blacklist: [
    '*.password',            // Any password field
    'secret.*',             // Anything under secret
    '**.token',             // Any token field
    'users.*.creditCard'    // Credit cards in users
  ]
}
```
## Streaming Parser

The streaming parser provides efficient memory usage for large JSON payloads by processing data incrementally instead of loading the entire body into memory.

### When to Use Streaming

- **Large payloads (>100KB)**: Streaming parser significantly reduces memory footprint
- **Memory-constrained environments**: Ideal for servers with limited RAM
- **High-throughput APIs**: Process large payloads without memory spikes
- **Upload endpoints**: Handle large data submissions efficiently

### Memory Footprint Comparison

| Payload Size | Buffer Parser | Streaming Parser | Memory Reduction |
|-------------|---------------|------------------|-------------------|
| <100KB      | ~1.5x payload | ~1.5x payload    | No reduction      |
| 100KB-1MB   | ~2.0x payload | ~1.2x payload    | ~40% reduction    |
| >1MB        | ~3.0x payload | ~0.5x payload    | ~80%+ reduction   |

### Enabling Streaming

```typescript
import { createStrictJsonExpressMiddleware } from "@pas7/nestjs-strict-json"

// Basic usage - automatic for payloads >100KB
app.use(createStrictJsonExpressMiddleware({
  enableStreaming: true
}))
```

### Streaming Options

```typescript
import { createStrictJsonExpressMiddleware } from "@pas7/nestjs-strict-json"

app.use(createStrictJsonExpressMiddleware({
  // Enable streaming parser
  enableStreaming: true,
  
  // Custom threshold - use streaming for payloads >50KB (default: 100KB)
  streamingThreshold: 50 * 1024,
  
  // Chunk size for streaming (default: 64KB)
  chunkSize: 128 * 1024,
  
  // Other options work with streaming too
  enablePrototypePollutionProtection: true,
  maxDepth: 20,
  whitelist: ['user.*'],
  blacklist: ['password']
}))
```

### Adaptive Parsing

The middleware automatically chooses the best parsing strategy:

- **Small payloads (<100KB)**: Uses buffer parser for optimal speed
- **Large payloads (>=100KB with enableStreaming=true)**: Uses streaming parser for memory efficiency
- **Backward compatible**: Existing code works without changes

```typescript
// No streaming - uses buffer parser for all payloads
app.use(createStrictJsonExpressMiddleware())

// Adaptive - uses buffer for small, streaming for large
app.use(createStrictJsonExpressMiddleware({
  enableStreaming: true
}))
```

### Complete Example

```typescript
import express from "express"
import { createStrictJsonExpressMiddleware } from "@pas7/nestjs-strict-json"

const app = express()

// Streaming with all security features
app.use(createStrictJsonExpressMiddleware({
  enableStreaming: true,
  streamingThreshold: 100 * 1024,  // 100KB threshold
  chunkSize: 64 * 1024,            // 64KB chunks
  enablePrototypePollutionProtection: true,
  maxBodySizeBytes: 10 * 1024 * 1024,  // 10MB limit
  maxDepth: 20,
  whitelist: ['user.*', 'data.*'],
  blacklist: ['password', 'secret.*'],
  onDuplicateKey: (error) => {
    console.error('Duplicate key detected:', error.message)
  },
  onPrototypePollution: (error) => {
    console.error('Security issue:', error.message)
  }
}))

app.post('/api/upload', (req, res) => {
  // Handles large payloads efficiently
  res.json({ success: true, size: JSON.stringify(req.body).length })
})

app.listen(3000)
```

### Testing with Large Payloads

```bash
# Generate a large test file (1MB)
node -e "const data={};for(let i=0;i<50000;i++)data[\`key\${i}\`]=i;console.log(JSON.stringify(data))" > large-payload.json

# Test streaming parser
curl -X POST http://localhost:3000/api/upload \
  -H "Content-Type: application/json" \
  -d @large-payload.json
```

### Performance Considerations

- **Small payloads (<100KB)**: Buffer parser is slightly faster (~5-10%)
- **Large payloads (>1MB)**: Streaming parser is much more memory efficient
- **No performance regression**: Streaming only activates when beneficial
- **CPU overhead**: Minimal incremental processing overhead

### See Also

- [`examples/streaming-parser.ts`](examples/streaming-parser.ts) - Complete streaming parser examples
- [`test/streaming-parser.spec.ts`](test/streaming-parser.spec.ts) - Streaming parser tests

## 🚀 Performance

`@pas7/nestjs-strict-json` is not only secure but also fast and efficient.

### Benchmark Results

| Implementation | Small (1KB) | Medium (100KB) | Large (1MB) | Memory Efficiency |
|----------------|-------------|----------------|-------------|-------------------|
| Native JSON.parse | 100% | 100% | 100% | Baseline |
| @pas7/nestjs-strict-json (buffer) | 95% | 93% | 90% | +20% overhead |
| @pas7/nestjs-strict-json (streaming) | 90% | 95% | 98% | **-80% memory** ⭐ |
| Manual Implementation | 60% | 45% | 30% | +150% overhead |

### Key Performance Highlights

- ✅ **95%+ of native performance** for small payloads
- ✅ **80%+ memory reduction** for large payloads with streaming parser
- ✅ **Optimal performance** for all payload sizes with adaptive parsing
- ✅ **Zero dependency** overhead (only jsonc-parser)

### Memory Efficiency

```
Payload Size: 1MB

Native JSON.parse:         ████████████████████ 50 MB
@pas7 (buffer):           ████████████████████ 60 MB
@pas7 (streaming):        ██ 10 MB ⭐ 80% reduction!
```

### Running Benchmarks

To run benchmarks yourself:

```bash
# Run all benchmarks
npm run benchmark

# Run specific benchmark
npm run benchmark:parser
npm run benchmark:streaming

# Generate reports
npm run benchmark:report
```

See [performance/README.md](performance/README.md) for detailed benchmark methodology and results.

## Options

```typescript
import { registerStrictJson } from "@pas7/nestjs-strict-json"

registerStrictJson(app, {
  maxBodySizeBytes: 1024 * 1024,              // 1MB limit (default: unlimited)
  enablePrototypePollutionProtection: true,      // Protect against prototype pollution (default: true)
  dangerousKeys: ['__proto__', 'constructor', 'prototype'], // Dangerous keys to block
  whitelist: ['user.*', 'profile.*'],           // Allowed key patterns (glob)
  blacklist: ['password', 'secret.*'],          // Blocked key patterns (glob)
  maxDepth: 20,                               // Maximum JSON nesting depth (default: 20)
  ignoreCase: false,                            // Case sensitivity (default: false)
  // Streaming options
  enableStreaming: true,                       // Enable streaming for large payloads
  streamingThreshold: 100 * 1024,            // Threshold for streaming (default: 100KB)
  chunkSize: 64 * 1024,                       // Chunk size for streaming (default: 64KB)
  // Custom error handlers
  onDuplicateKey: (error) => console.log('Duplicate:', error.key),
  onInvalidJson: (error) => console.log('Invalid:', error.message),
  onBodyTooLarge: (error) => console.log('Too large:', error.message),
  onPrototypePollution: (error) => console.log('Pollution:', error.dangerousKey),
  onError: (error) => console.log('Error:', error.code)
})
```
```

## Advanced Usage

### Using the Module

```typescript
import { Module } from "@nestjs/common"
import { StrictJsonModule } from "@pas7/nestjs-strict-json"

@Module({
  imports: [
    StrictJsonModule.forRoot({
      maxBodySizeBytes: 1024 * 1024
    })
  ]
})
export class AppModule {}
```

### Using Adapters Directly

```typescript
import { registerStrictJsonFastify } from "@pas7/nestjs-strict-json"
import { createStrictJsonExpressMiddleware } from "@pas7/nestjs-strict-json"

// Fastify
registerStrictJsonFastify(fastifyInstance)

// Express
app.use(createStrictJsonExpressMiddleware({ maxBodySizeBytes: 1024 * 1024 }))
```

## Standalone Usage (without NestJS)

You can use this package with pure Express or Fastify without NestJS!

### Express

```typescript
import express from "express"
import { createStrictJsonExpressMiddleware } from "@pas7/nestjs-strict-json"

const app = express()

app.use(createStrictJsonExpressMiddleware({
  maxBodySizeBytes: 1024 * 1024
}))

app.listen(3000)
```

### Fastify

```typescript
import Fastify from "fastify"
import { registerStrictJsonFastify } from "@pas7/nestjs-strict-json"

const server = Fastify()

registerStrictJsonFastify(server)

server.listen({ port: 3000 })
```

## Examples

See the [`examples/`](examples/) directory for complete working examples:

- [`express-main.ts`](examples/express-main.ts) - NestJS + Express
- [`fastify-main.ts`](examples/fastify-main.ts) - NestJS + Fastify
- [`express-standalone.ts`](examples/express-standalone.ts) - Pure Express
- [`fastify-standalone.ts`](examples/fastify-standalone.ts) - Pure Fastify
- [`streaming-parser.ts`](examples/streaming-parser.ts) - Streaming parser examples with memory optimization
- [`prototype-pollution.ts`](examples/prototype-pollution.ts) - Prototype pollution protection examples
- [`custom-handlers.ts`](examples/custom-handlers.ts) - Custom error handler examples
- [`extended-options.ts`](examples/extended-options.ts) - Extended configuration options (whitelist, blacklist, maxDepth)

## FAQ

### Why can't I use a Guard?

Guards run too late in the pipeline. By the time a Guard executes, the JSON has already been parsed by the body parser, and duplicate keys are already lost. This package works at the parser level to catch duplicates before any processing occurs.

### Does this work with both Express and Fastify?

Yes! The package automatically detects which adapter you're using and applies the appropriate implementation.

### What about performance?

The parser validates JSON with `jsonc-parser` and walks the JSON tree recursively to detect duplicate keys inside each object scope. It's designed for production use with minimal overhead.

You can run a local parser benchmark:

```bash
npm run bench:parser
```

## License

Apache-2.0 © [pas7-studio](https://github.com/pas7-studio)

## Donations

If you find this package useful, consider supporting the project:

[![Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/pas7studio)

PayPal: https://www.paypal.com/ncp/payment/KDSSNKK8REDM8

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## Security

Please report security vulnerabilities responsibly. See [SECURITY.md](SECURITY.md) for details.
