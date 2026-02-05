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

## Options

```typescript
import { registerStrictJson } from "@pas7/nestjs-strict-json"

registerStrictJson(app, {
  maxBodySizeBytes: 1024 * 1024  // 1MB limit (default: unlimited)
})
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
