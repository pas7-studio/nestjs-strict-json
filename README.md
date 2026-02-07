# NestJS Strict JSON Parser for Security and Performance

`@pas7/nestjs-strict-json` is a strict JSON parser for **NestJS**, **Express**, and **Fastify**.

It blocks dangerous and ambiguous payloads at parser level:
- duplicate JSON keys
- prototype pollution keys (`__proto__`, `constructor`, `prototype`)
- excessive JSON depth (DoS-style payloads)
- disallowed key paths (whitelist/blacklist)

If you need secure JSON parsing in Node.js APIs, this package is built for that exact use case.

[![npm version](https://img.shields.io/npm/v/%40pas7%2Fnestjs-strict-json?style=flat-square)](https://www.npmjs.com/package/@pas7/nestjs-strict-json)
[![Release](https://img.shields.io/github/v/release/pas7-studio/nestjs-strict-json?sort=semver&style=flat-square)](https://github.com/pas7-studio/nestjs-strict-json/releases)
[![Build Status](https://github.com/pas7-studio/nestjs-strict-json/actions/workflows/ci.yml/badge.svg)](https://github.com/pas7-studio/nestjs-strict-json/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/pas7-studio/nestjs-strict-json?style=flat-square)](https://github.com/pas7-studio/nestjs-strict-json/blob/main/LICENSE)

## Why teams use this

- **Security first**: parser-level rejection of duplicate keys and prototype pollution attempts.
- **Production ready**: works with NestJS, vanilla Express, and vanilla Fastify.
- **Performance controls**: cache, lazy mode, streaming threshold, fast path.
- **Typed and explicit errors**: stable error codes for monitoring and incident response.

## Benchmark Snapshot (Large Payload)

Latest local benchmark (`2026-02-07`, payload `~1.24 MB`, 10,000 users):

| Implementation | Avg ms/op | Peak heap delta (MB) | Retained heap (MB) |
|---|---:|---:|---:|
| Native `JSON.parse` | 3.7878 | 9.62 | -0.01 |
| `jsonc-parser + JSON.parse` | 21.4828 | 49.11 | 0.00 |
| `@pas7 strict (baseline)` | 76.1405 | 253.60 | 0.00 |
| `@pas7 strict (optimized)` | 3.2743 | 61.80 | -0.00 |

Key takeaways:
- `@pas7 strict (optimized)` was faster than native in this run.
- `@pas7 strict (optimized)` was much faster than `jsonc-parser + JSON.parse`.
- Security checks and optimization profile significantly change results, so compare by scenario.

Reproduce:

```bash
npm run bench:compare
```

## Security Capability Comparison

| Capability | Native `JSON.parse` | `express.json()` / default parsers | `@pas7/nestjs-strict-json` |
|---|---|---|---|
| Duplicate key rejection | No | No | Yes |
| Prototype pollution key blocking | No | No | Yes |
| Max depth enforcement | No | No | Yes |
| Key whitelist/blacklist | No | No | Yes |
| Unified behavior across Nest/Express/Fastify | No | Partial | Yes |
| Structured parser error codes | No | Limited | Yes |

## Installation

```bash
npm install @pas7/nestjs-strict-json
```

## Quick Start

### NestJS + Fastify

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

## StrictJsonOptions

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

## Error Codes

- `STRICT_JSON_DUPLICATE_KEY`
- `STRICT_JSON_INVALID_JSON`
- `STRICT_JSON_BODY_TOO_LARGE`
- `STRICT_JSON_PROTOTYPE_POLLUTION`
- `STRICT_JSON_DEPTH_LIMIT`

## Recommended Production Profile

```ts
registerStrictJson(app, {
  maxBodySizeBytes: 1024 * 1024,
  enablePrototypePollutionProtection: true,
  maxDepth: 20,
  enableCache: true,
  enableFastPath: true,
});
```

## Compatibility

- Node.js 20+
- NestJS 10+
- Express 4+
- Fastify 4+

## License

Apache-2.0
