# @pas7/nestjs-strict-json

Strict JSON security for NestJS, Express, and Fastify.

Reject malformed, ambiguous, and dangerous JSON payloads before they reach your DTO validation or business logic.

[![npm version](https://img.shields.io/npm/v/%40pas7%2Fnestjs-strict-json?style=flat-square)](https://www.npmjs.com/package/@pas7/nestjs-strict-json)
[![Release](https://img.shields.io/github/v/release/pas7-studio/nestjs-strict-json?sort=semver&style=flat-square)](https://github.com/pas7-studio/nestjs-strict-json/releases)
[![Build Status](https://github.com/pas7-studio/nestjs-strict-json/actions/workflows/ci.yml/badge.svg)](https://github.com/pas7-studio/nestjs-strict-json/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/pas7-studio/nestjs-strict-json?style=flat-square)](https://github.com/pas7-studio/nestjs-strict-json/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-brightgreen?style=flat-square)](https://www.typescriptlang.org/)

## Why This Library

Default JSON parsing in many stacks is permissive:
- Duplicate keys are silently overwritten.
- Prototype pollution keys may pass unless explicitly blocked.
- Deep nested payloads can be used for DoS-style pressure.

`@pas7/nestjs-strict-json` enforces strict behavior at parser level.

## What You Get

- Duplicate key detection (`STRICT_JSON_DUPLICATE_KEY`)
- Prototype pollution protection (`__proto__`, `constructor`, `prototype` by default)
- Configurable depth limit (`STRICT_JSON_DEPTH_LIMIT`)
- Whitelist/blacklist key filtering with glob patterns
- Configurable body size limits (`STRICT_JSON_BODY_TOO_LARGE`)
- Custom error hooks for monitoring/alerting
- Optional optimization profile: lazy mode, cache, streaming, fast path
- Works with NestJS, vanilla Express, and vanilla Fastify

## Implemented Achievements

### Verified in repository

- Security and validation
- Duplicate key detection across nested object scopes
- Prototype pollution protection
- Depth limit enforcement (DoS hardening)
- Whitelist/blacklist filtering with glob patterns
- Structured strict error codes and details

- Configuration and flexibility
- Lazy mode for large payloads
- Custom error handlers (`onDuplicateKey`, `onInvalidJson`, `onBodyTooLarge`, `onPrototypePollution`, `onError`)
- Adaptive middleware strategy (buffer vs streaming by threshold)
- Configurable streaming threshold and chunk size
- Parse result caching with LRU behavior
- Fast path option for trusted/simple payloads

- Documentation and delivery
- Full README, `ROADMAP.md`, `CHANGELOG.md`
- Performance benchmark suite and generated reports under `performance/reports/`
- Optimization guide in `docs/OPTIMIZATION-GUIDE.md`

### Performance claims from internal reports

The repository contains strong optimization claims (including `5,740x` and major memory reduction) in:
- `CHANGELOG.md`
- `performance/reports/optimization-final-report.md`

Use these as project claims with source attribution. For external/public positioning, re-run benchmarks and publish one canonical report snapshot to avoid mixed numbers across documents.

### Positioning summary

Compared with common defaults (native parser / default body parsers), this project prioritizes parser-level JSON security with production-focused configurability and benchmark coverage.

## Why It Wins vs Common Alternatives

| Capability | Native `JSON.parse` | `express.json()` / default parsers | `@pas7/nestjs-strict-json` |
|---|---|---|---|
| Duplicate key rejection | No | No | Yes |
| Prototype pollution protection | No | No | Yes |
| Depth limit enforcement | No | No | Yes |
| Key whitelist/blacklist | No | No | Yes |
| Unified security behavior across Nest/Express/Fastify | No | Partial | Yes |
| Custom parser-level error handlers | No | Limited | Yes |

For security-hardening use cases, this package is designed to be the stronger default.

## Installation

```bash
npm install @pas7/nestjs-strict-json
```

## Quick Start

### NestJS + Fastify (recommended)

```ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { registerStrictJson } from "@pas7/nestjs-strict-json";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  registerStrictJson(app);
  await app.listen(3000);
}
bootstrap();
```

### NestJS + Express

Important: disable default body parser so duplicate keys are not lost before strict parsing.

```ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { registerStrictJson } from "@pas7/nestjs-strict-json";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  registerStrictJson(app);
  await app.listen(3000);
}
bootstrap();
```

### Vanilla Express

```ts
import express from "express";
import { createStrictJsonExpressMiddleware } from "@pas7/nestjs-strict-json";

const app = express();

app.use(
  createStrictJsonExpressMiddleware({
    maxBodySizeBytes: 1024 * 1024,
    enableStreaming: true,
    streamingThreshold: 100 * 1024,
  }),
);

app.post("/api", (req, res) => {
  res.json({ received: req.body });
});

app.listen(3000);
```

### Vanilla Fastify

```ts
import Fastify from "fastify";
import { registerStrictJsonFastify } from "@pas7/nestjs-strict-json";

const server = Fastify();
registerStrictJsonFastify(server, { maxBodySizeBytes: 1024 * 1024 });

server.post("/api", async (request) => request.body);
server.listen({ port: 3000 });
```

## Add It to Your Existing Project

1. Install package: `npm i @pas7/nestjs-strict-json`
2. Register strict parser before app starts accepting traffic.
3. If using Nest + Express, set `{ bodyParser: false }`.
4. Start with secure defaults, then tune performance options.
5. Add a monitoring hook (`onError`) to track malformed traffic.
6. Verify behavior with duplicated-key and malformed JSON requests.

## API

### Nest integration

- `registerStrictJson(app, options?)`
- `StrictJsonModule.forRoot(options?)`

### Adapter integration

- `createStrictJsonExpressMiddleware(options?)`
- `registerStrictJsonFastify(instance, options?)`

### Core parser integration

- `parseStrictJson(raw, options?)`
- `parseStrictJsonAsync(raw, options?)`
- `clearParseCache()`
- `getParseCacheSize()`

## Configuration (`StrictJsonOptions`)

```ts
type StrictJsonOptions = {
  maxBodySizeBytes?: number;

  enablePrototypePollutionProtection?: boolean;
  dangerousKeys?: string[];

  whitelist?: string[];
  blacklist?: string[];
  maxDepth?: number;
  ignoreCase?: boolean;

  enableStreaming?: boolean;
  streamingThreshold?: number;
  chunkSize?: number;

  lazyMode?: boolean;
  lazyModeThreshold?: number;
  lazyModeDepthLimit?: number;
  lazyModeSkipPrototype?: boolean;
  lazyModeSkipWhitelist?: boolean;
  lazyModeSkipBlacklist?: boolean;

  enableCache?: boolean;
  cacheSize?: number;
  cacheTTL?: number;

  enableFastPath?: boolean;

  onDuplicateKey?: (error: unknown) => void | Promise<void>;
  onInvalidJson?: (error: unknown) => void | Promise<void>;
  onBodyTooLarge?: (error: unknown) => void | Promise<void>;
  onPrototypePollution?: (error: unknown) => void | Promise<void>;
  onError?: (error: unknown) => void | Promise<void>;
};
```

## Error Format

### Duplicate key

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

### Invalid JSON

```json
{
  "code": "STRICT_JSON_INVALID_JSON",
  "message": "Invalid JSON"
}
```

### Body too large

```json
{
  "code": "STRICT_JSON_BODY_TOO_LARGE",
  "message": "Request body exceeds max size of 1048576 bytes"
}
```

### Prototype pollution

```json
{
  "code": "STRICT_JSON_PROTOTYPE_POLLUTION",
  "message": "Prototype pollution attempt detected: dangerous key '__proto__' at $.__proto__"
}
```

### Depth limit

```json
{
  "code": "STRICT_JSON_DEPTH_LIMIT",
  "message": "JSON depth limit exceeded: 21 > 20"
}
```

## Benchmarks

### Current repository benchmark snapshots

Based on current in-repo reports:
- `performance/reports/latest.md`
- `performance/reports/final-summary.md`
- `performance/reports/results.json`

Latest generated timestamp in reports: `2026-02-07`.

Representative large payload results from `performance/reports/latest.md`:
- `5000x10 fields`: `6.880 ms`
- `10000x5 fields`: `8.493 ms`
- `20000x5 fields`: `13.937 ms`

Representative comparison insights from `performance/reports/final-summary.md`:
- Native parse remains faster on raw parsing throughput.
- This library adds parser-level security guarantees unavailable in default parsers.

### Important methodology note

Many benchmark scenarios include cache-enabled runs and security checks. Compare results by scenario, not as a single universal number.

### Run benchmarks locally

```bash
npm run benchmark
npx vitest run performance/benchmarks/parser --config vitest.benchmark.config.ts
npx vitest run performance/benchmarks/adapters --config vitest.benchmark.config.ts
npx vitest run performance/benchmarks/comparisons --config vitest.benchmark.config.ts
node performance/utils/generate-report.mjs
```

If you need deterministic non-cache baseline numbers, run benchmarks with `enableCache: false` in your benchmark cases.

## Practical Performance Profiles

### 1) Secure default profile (recommended for external traffic)

```ts
registerStrictJson(app, {
  enablePrototypePollutionProtection: true,
  maxDepth: 20,
  enableCache: true,
});
```

### 2) High-throughput trusted upstream profile

```ts
registerStrictJson(app, {
  lazyMode: true,
  lazyModeThreshold: 100 * 1024,
  lazyModeSkipPrototype: true,
  lazyModeSkipWhitelist: true,
  lazyModeSkipBlacklist: false,
  enableCache: true,
});
```

### 3) Large payload profile (Express)

```ts
app.use(
  createStrictJsonExpressMiddleware({
    enableStreaming: true,
    streamingThreshold: 100 * 1024,
    chunkSize: 64 * 1024,
    maxBodySizeBytes: 10 * 1024 * 1024,
  }),
);
```

## Security Model Summary

Always enforced in standard flow:
- Duplicate key detection
- Syntax validation
- Body size checks

Configurable hardening:
- Prototype pollution checks
- Key whitelist/blacklist
- Max depth

Optimization flags (`lazyMode`, `enableFastPath`) are powerful and should be used intentionally by trust level.

## Compatibility

- Node.js 20+
- NestJS 10+
- Express 4+
- Fastify 4+

## Project Docs

- `docs/OPTIMIZATION-GUIDE.md`
- `performance/README.md`
- `performance/reports/latest.md`
- `performance/reports/final-summary.md`
- `CHANGELOG.md`
- `ROADMAP.md`

## Examples

- `examples/express-main.ts`
- `examples/fastify-main.ts`
- `examples/express-standalone.ts`
- `examples/fastify-standalone.ts`
- `examples/streaming-parser.ts`
- `examples/prototype-pollution.ts`
- `examples/custom-handlers.ts`
- `examples/extended-options.ts`
- `examples/optimized-parsing.ts`

## Contributing

See `CONTRIBUTING.md`.

## Security

See `SECURITY.md`.

## License

Apache-2.0

## Donations

[Ko-fi](https://ko-fi.com/pas7studio)

PayPal: https://www.paypal.com/ncp/payment/KDSSNKK8REDM8
