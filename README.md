# NestJS Strict JSON Parser for Security and Performance

`@pas7/nestjs-strict-json` is a strict JSON parser for **NestJS**, **Express**, and **Fastify**.

> **Read our article**: [Understanding JSON Security Vulnerabilities and How We Solve Them](https://pas7.com.ua/blog/en/nestjs-strict-json) - deep dive into the problems this package solves.

It blocks dangerous and ambiguous payloads at parser level:
- duplicate JSON keys
- prototype pollution keys (`__proto__`, `constructor`, `prototype`)
- excessive JSON depth (DoS-style payloads)
- disallowed key paths (whitelist/blacklist)

If you need secure JSON parsing in Node.js APIs, this package is built for that exact use case.

[![npm version](https://img.shields.io/npm/v/%40pas7%2Fnestjs-strict-json?style=flat-square)](https://www.npmjs.com/package/@pas7/nestjs-strict-json)
[![Release](https://img.shields.io/github/v/release/pas7-studio/nestjs-strict-json?sort=semver&style=flat-square)](https://github.com/pas7-studio/nestjs-strict-json/releases)
[![Build Status](https://github.com/pas7-studio/nestjs-strict-json/actions/workflows/ci.yml/badge.svg)](https://github.com/pas7-studio/nestjs-strict-json/actions/workflows/ci.yml)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=pas7-studio_nestjs-strict-json&metric=alert_status&style=flat-square)](https://sonarcloud.io/summary/new_code?id=pas7-studio_nestjs-strict-json)
[![Security Rating](https://sonarcloud.io/api/project_badges/measure?project=pas7-studio_nestjs-strict-json&metric=security_rating&style=flat-square)](https://sonarcloud.io/summary/new_code?id=pas7-studio_nestjs-strict-json)
[![Reliability Rating](https://sonarcloud.io/api/project_badges/measure?project=pas7-studio_nestjs-strict-json&metric=reliability_rating&style=flat-square)](https://sonarcloud.io/summary/new_code?id=pas7-studio_nestjs-strict-json)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=pas7-studio_nestjs-strict-json&metric=coverage&style=flat-square)](https://sonarcloud.io/summary/new_code?id=pas7-studio_nestjs-strict-json)
[![License](https://img.shields.io/github/license/pas7-studio/nestjs-strict-json?style=flat-square)](https://github.com/pas7-studio/nestjs-strict-json/blob/main/LICENSE)
[![Tests](https://img.shields.io/badge/tests-569%20passing-brightgreen.svg)](https://github.com/pas7-studio/nestjs-strict-json/actions/workflows/ci.yml)
[![Performance](https://img.shields.io/badge/performance-3.1x%20vs%20jsonc--parser-blue.svg)](performance/reports/comparison-latest.md)

## Why teams use this

- **Security first**: parser-level rejection of duplicate keys and prototype pollution attempts.
- **Production ready**: works with NestJS, vanilla Express, and vanilla Fastify.
- **Performance controls**: cache, lazy mode, streaming threshold, fast path.
- **Typed and explicit errors**: stable error codes for monitoring and incident response.

## Security

| Capability | Native `JSON.parse` | `express.json()` / default parsers | `@pas7/nestjs-strict-json` |
|---|---|---|---|
| Duplicate key rejection | No | No | Yes |
| Prototype pollution key blocking | No | No | Yes |
| Max depth enforcement | No | No | Yes |
| Key whitelist/blacklist | No | No | Yes |
| Unified behavior across Nest/Express/Fastify | No | Partial | Yes |
| Structured parser error codes | No | Limited | Yes |

## Supported JSON Content-Types

| Content-Type | RFC | Supported |
|---|---|---|
| `application/json` | - | Yes |
| `application/json-patch+json` | RFC 6902 | Yes |
| `application/vnd.api+json` | JSON API | Yes |
| `application/merge-patch+json` | RFC 7396 | Yes |
| `application/problem+json` | RFC 7807 | Yes |

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

### NestJS Module (DI)

```ts
import { Module } from "@nestjs/common";
import { StrictJsonModule } from "@pas7/nestjs-strict-json";

@Module({
  imports: [
    StrictJsonModule.forRoot({
      enableCache: true,
      maxDepth: 20,
      maxBodySizeBytes: 5 * 1024 * 1024,
    }),
  ],
})
export class AppModule {}
```

### NestJS Module (Async / ConfigModule)

```ts
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { StrictJsonModule } from "@pas7/nestjs-strict-json";

@Module({
  imports: [
    ConfigModule.forRoot(),
    StrictJsonModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        enableCache: config.get("STRICT_JSON_CACHE_ENABLED", true),
        maxDepth: config.get("STRICT_JSON_MAX_DEPTH", 20),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Vanilla Express

```ts
import express from "express";
import { createStrictJsonExpressMiddleware } from "@pas7/nestjs-strict-json";

const app = express();

app.use(createStrictJsonExpressMiddleware({
  maxBodySizeBytes: 1024 * 1024,
  enableStreaming: true,
  streamingThreshold: 100 * 1024,
}));

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
- `StrictJsonModule.forRootAsync(asyncOptions?)`

### Adapter integration

- `createStrictJsonExpressMiddleware(options?)`
- `registerStrictJsonFastify(instance, options?)`

### Core parser

- `parseStrictJson(raw, options?)`
- `parseStrictJsonAsync(raw, options?)`
- `clearParseCache()`
- `getParseCacheSize()`
- `shutdownCacheManager()`
- `resetCacheManager()`
- `isCleanupIntervalRunning()`

### Validation utilities

- `isKeyAllowed(keyPath, whitelist?, blacklist?, ignoreCase?)`
- `createKeyPolicyValidator(whitelist?, blacklist?, ignoreCase?)`
- `globToRegex(pattern)`
- `matchGlobPattern(path, pattern)`

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

## Recommended Production Configuration

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

| Platform | Version |
|---|---|
| Node.js | 20+ |
| NestJS | 10+ |
| Express | 5+ |
| Fastify | 5+ |
| TypeScript | 5.x / 6.x |

## Performance

How fast is strict JSON validation? Compared to the typical approach of using `jsonc-parser` for duplicate key detection (which is the common alternative), this package is significantly faster while providing the same security guarantees.

| Implementation | Avg ms/op (1MB) | vs Native | vs jsonc-parser | Validation scope |
|---|---|---|---|---|
| Native `JSON.parse` | 5.36 | 1.0x (baseline) | — | No validation |
| **@pas7/nestjs-strict-json** | **6.30** | **0.85x (18% slower)** | **8.1x faster** | Duplicate keys, prototype pollution, depth limit, whitelist/blacklist |
| `jsonc-parser` + `JSON.parse` | 51.18 | 0.10x (10x slower) | 1.0x (baseline) | Duplicate keys only |

In other words: **with this package you get more security checks (prototype pollution, depth limit, key filtering) and still parse 8x faster than the minimal alternative that only checks duplicates.**

### Throughput benchmarks (Node.js 24, v1.1.5)

| Scenario | Payload | Ops/sec | μs/op | Note |
|----------|---------|--------:|------:|------|
| Cache HIT (repeated body) | 1 KB | 2,000,000 | 0.5 | Hot path, hash cache |
| Cache HIT (repeated body) | 50 KB | 125,000 | 8.0 | Hot path, hash cache |
| Cache MISS (unique body) | 1 KB | 27,000 | 37 | Cold path, AST + validation |
| Cache MISS (unique body) | 50 KB | 1,110 | 900 | Cold path, AST + validation |
| Fast path (prototype only) | 1 KB | 154,000 | 6.5 | JSON.parse + pollution check |
| Fast path (prototype only) | 50 KB | 4,350 | 230 | JSON.parse + pollution check |

**v1.1.5 improvements over v1.1.4:** cache-hit throughput improved **300–712%** via hash caching; cold path **up to 32% faster** via direct AST-to-value conversion.

Reproduce:

```bash
npm run bench:compare
```

## Documentation

- [Wiki](https://github.com/pas7-studio/nestjs-strict-json/wiki) - comprehensive guides
- [CHANGELOG](CHANGELOG.md) - version history and release notes
- [Optimization Guide](docs/OPTIMIZATION-GUIDE.md) - detailed tuning
- [Performance Report](performance/reports/comparison-latest.md) - benchmarks
- [Article: JSON Security Vulnerabilities](https://pas7.com.ua/blog/en/nestjs-strict-json) - deep dive

## Support

- [Issues](https://github.com/pas7-studio/nestjs-strict-json/issues) - report bugs or request features
- [Contact](https://pas7.com.ua/contact) - via our website

## License

[Apache-2.0](LICENSE) | Maintained by [PAS7](https://pas7.com.ua/)
