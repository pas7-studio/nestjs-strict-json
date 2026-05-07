# Examples

## Table of Contents

- [Basic Parsing](#basic-parsing)
- [Duplicate Key Detection](#duplicate-key-detection)
- [Prototype Pollution Protection](#prototype-pollution-protection)
- [Custom Error Handlers](#custom-error-handlers)
- [Key Filtering (Whitelist/Blacklist)](#key-filtering-whitelistblacklist)
- [Depth Limit](#depth-limit)
- [Streaming Parser](#streaming-parser)
- [Lazy Mode](#lazy-mode)
- [Caching](#caching)
- [Fast Path](#fast-path)
- [Combined Optimizations](#combined-optimizations)
- [NestJS Module Integration](#nestjs-module-integration)
- [Vanilla Express](#vanilla-express)
- [Vanilla Fastify](#vanilla-fastify)
- [Graceful Shutdown](#graceful-shutdown)

---

## Basic Parsing

```ts
import { parseStrictJson } from "@pas7/nestjs-strict-json";

const json = '{"name": "John", "age": 30}';
const result = parseStrictJson(json);
// result: { name: "John", age: 30 }
```

---

## Duplicate Key Detection

```ts
import { parseStrictJson, DuplicateKeyError } from "@pas7/nestjs-strict-json";

try {
  parseStrictJson('{"user": "John", "user": "Jane"}');
} catch (error) {
  if (error instanceof DuplicateKeyError) {
    console.log(error.details.key);    // "user"
    console.log(error.details.path);   // "$"
  }
}
```

Nested duplicate keys:

```ts
try {
  parseStrictJson('{"data": {"id": 1, "id": 2}}');
} catch (error) {
  if (error instanceof DuplicateKeyError) {
    console.log(error.details.key);    // "id"
    console.log(error.details.path);   // "$.data"
  }
}
```

---

## Prototype Pollution Protection

```ts
import { parseStrictJson, PrototypePollutionError } from "@pas7/nestjs-strict-json";

// Blocked by default
try {
  parseStrictJson('{"__proto__": {"isAdmin": true}}');
} catch (error) {
  if (error instanceof PrototypePollutionError) {
    console.log(error.dangerousKey);    // "__proto__"
    console.log(error.path);            // "$"
  }
}

// Constructor key
try {
  parseStrictJson('{"data": {"constructor": {"prototype": {"polluted": true}}}}');
} catch (error) {
  if (error instanceof PrototypePollutionError) {
    console.log(error.dangerousKey);    // "constructor"
  }
}

// Custom dangerous keys
parseStrictJson('{"role": "admin"}', {
  dangerousKeys: ["__proto__", "constructor", "prototype", "role"],
});
// Throws: PrototypePollutionError (dangerousKey: "role")
```

---

## Custom Error Handlers

```ts
import { parseStrictJson, DuplicateKeyError, PrototypePollutionError } from "@pas7/nestjs-strict-json";

// Sync handler
parseStrictJson(json, {
  onDuplicateKey: (error) => {
    console.error(`Duplicate key: ${error.key} at ${error.path}`);
  },
});

// Async handler
parseStrictJson(json, {
  onPrototypePollution: async (error) => {
    await fetch("https://sentry.example.com/api/report", {
      method: "POST",
      body: JSON.stringify({
        code: error.details.code,
        key: error.dangerousKey,
        path: error.path,
      }),
    });
  },
});

// Comprehensive handlers
parseStrictJson(json, {
  onDuplicateKey: (error) => {
    metrics.increment("strict_json.duplicate_key");
    logger.warn({ key: error.key, path: error.path }, "Duplicate key");
  },
  onInvalidJson: (error) => {
    metrics.increment("strict_json.invalid_json");
    logger.warn("Invalid JSON received");
  },
  onBodyTooLarge: (error) => {
    metrics.increment("strict_json.body_too_large");
    logger.warn("Payload exceeds limit");
  },
  onPrototypePollution: async (error) => {
    metrics.increment("strict_json.prototype_pollution");
    await alertService.notify("PROTOTYPE_POLLUTION", error.dangerousKey);
  },
  onError: (error) => {
    Sentry.captureException(error);
  },
});
```

---

## Key Filtering (Whitelist/Blacklist)

```ts
import { parseStrictJson } from "@pas7/nestjs-strict-json";

// Whitelist: only allow specific keys
parseStrictJson('{"name": "John", "email": "john@example.com", "secret": "value"}', {
  whitelist: ["name", "email"],
});
// Throws: Key 'secret' at $.secret is not allowed

// Blacklist: block specific keys
parseStrictJson('{"user": "John", "password": "secret123", "api-key": "xyz"}', {
  blacklist: ["password", "api-key"],
});
// Throws: Key 'password' at $.password is not allowed

// Glob patterns
parseStrictJson(json, {
  whitelist: ["user.*", "profile.*"],          // user.name, user.email, etc.
  blacklist: ["*.password", "**.token"],       // any nested password/token
});

// Case-insensitive matching
parseStrictJson('{"User": "John", "PASSWORD": "secret"}', {
  blacklist: ["password"],
  ignoreCase: true,
});
// Throws: Key 'PASSWORD' at $.PASSWORD is not allowed
```

---

## Depth Limit

```ts
import { parseStrictJson, DepthLimitError } from "@pas7/nestjs-strict-json";

try {
  parseStrictJson('{"a": {"b": {"c": {"d": "deep"}}}}', { maxDepth: 3 });
} catch (error) {
  if (error instanceof DepthLimitError) {
    console.log(error.currentDepth);   // 4
    console.log(error.maxDepth);       // 3
  }
}
```

---

## Streaming Parser

```ts
import { parseStrictJsonAsync } from "@pas7/nestjs-strict-json";

// Async parsing with streaming for large payloads
const result = await parseStrictJsonAsync(largeJsonString, {
  enableStreaming: true,
  streamingThreshold: 100 * 1024,   // 100KB
  chunkSize: 64 * 1024,             // 64KB chunks
});

// With Express middleware
import { createStrictJsonExpressMiddleware } from "@pas7/nestjs-strict-json";
import express from "express";

const app = express();
app.use(createStrictJsonExpressMiddleware({
  enableStreaming: true,
  streamingThreshold: 100 * 1024,
  maxBodySizeBytes: 10 * 1024 * 1024,  // 10MB
}));
```

Using the `StreamingJsonParser` class directly:

```ts
import { createReadStream } from "fs";
import { StreamingJsonParser } from "@pas7/nestjs-strict-json";

const parser = new StreamingJsonParser({
  maxDepth: 20,
  enablePrototypePollutionProtection: true,
});

parser.on("data", (chunk) => {
  // Process validated chunk
});

parser.on("end", () => {
  console.log("Parsing complete");
});

parser.on("error", (error) => {
  console.error("Validation failed:", error.message);
});

createReadStream("large-file.json").pipe(parser);
```

---

## Lazy Mode

```ts
import { parseStrictJson } from "@pas7/nestjs-strict-json";

// Explicit lazy mode for large payloads
const result = parseStrictJson(largeJson, {
  lazyMode: true,
  lazyModeThreshold: 100 * 1024,     // 100KB
  lazyModeDepthLimit: 10,            // Only validate first 10 levels
  lazyModeSkipPrototype: true,       // Skip prototype check (trusted source)
  lazyModeSkipWhitelist: true,       // Skip whitelist
  lazyModeSkipBlacklist: false,      // ALWAYS check blacklist
});

// Auto-enable lazy mode based on payload size
const result = parseStrictJson(json, {
  lazyModeThreshold: 100 * 1024,     // Auto-enables for >=100KB payloads
});
```

---

## Caching

```ts
import {
  parseStrictJson,
  getParseCacheSize,
  clearParseCache,
  shutdownCacheManager,
} from "@pas7/nestjs-strict-json";

// Enable caching (on by default)
const result1 = parseStrictJson(repeatedJson, { enableCache: true });
console.log(getParseCacheSize());   // 1

const result2 = parseStrictJson(repeatedJson, { enableCache: true });
console.log(getParseCacheSize());   // 1 (cached hit)

// Custom cache settings
const result = parseStrictJson(json, {
  enableCache: true,
  cacheSize: 500,      // Max 500 entries
  cacheTTL: 120000,    // 2 minutes TTL
});

// Clear cache
clearParseCache();
console.log(getParseCacheSize());   // 0

// Graceful shutdown
process.on("SIGTERM", () => {
  shutdownCacheManager();
});
```

---

## Fast Path

```ts
import { parseStrictJson } from "@pas7/nestjs-strict-json";

// Fast path: only checks prototype pollution, skips duplicate key detection
// 4.38x faster for simple payloads, but ONLY use for trusted data
const result = parseStrictJson(simpleJson, {
  enableFastPath: true,
});

// Good for: internal APIs, trusted microservices
// Bad for: public APIs, user input, third-party webhooks
```

---

## Combined Optimizations

```ts
import { parseStrictJsonAsync } from "@pas7/nestjs-strict-json";

// Production config for large payloads from trusted sources
const result = await parseStrictJsonAsync(largeJson, {
  // Lazy mode for large payloads
  lazyMode: true,
  lazyModeThreshold: 100 * 1024,
  lazyModeDepthLimit: 10,
  lazyModeSkipPrototype: true,
  lazyModeSkipWhitelist: true,
  lazyModeSkipBlacklist: false,

  // Caching for repeated payloads
  enableCache: true,
  cacheSize: 500,

  // Streaming for very large payloads
  enableStreaming: true,
  streamingThreshold: 100 * 1024,
});

// Auto-enable optimizations based on size
const result = await parseStrictJsonAsync(json, {
  lazyModeThreshold: 100 * 1024,      // Auto lazy for large
  enableStreaming: true,
  streamingThreshold: 100 * 1024,     // Auto stream for large
  enableCache: true,
});
```

---

## NestJS Module Integration

```ts
import { Module } from "@nestjs/common";
import { StrictJsonModule } from "@pas7/nestjs-strict-json";

@Module({
  imports: [
    StrictJsonModule.forRoot({
      maxBodySizeBytes: 1024 * 1024,
      enablePrototypePollutionProtection: true,
      maxDepth: 20,
      enableCache: true,
      enableFastPath: true,
    }),
  ],
})
export class AppModule {}
```

```ts
import { Injectable } from "@nestjs/common";
import { StrictJsonCacheService } from "@pas7/nestjs-strict-json";

@Injectable()
export class MonitoringService {
  constructor(private readonly cache: StrictJsonCacheService) {}

  report() {
    return {
      cacheSize: this.cache.getSize(),
      maxCacheSize: this.cache.getMaxSize(),
    };
  }
}
```

---

## Vanilla Express

```ts
import express from "express";
import { createStrictJsonExpressMiddleware } from "@pas7/nestjs-strict-json";

const app = express();

app.use(createStrictJsonExpressMiddleware({
  maxBodySizeBytes: 1024 * 1024,
  enablePrototypePollutionProtection: true,
  onDuplicateKey: (error) => console.error(error.message),
}));

app.post("/api/users", (req, res) => {
  res.json({ created: req.body });
});

app.listen(3000);
```

---

## Vanilla Fastify

```ts
import Fastify from "fastify";
import { registerStrictJsonFastify } from "@pas7/nestjs-strict-json";

const server = Fastify();

registerStrictJsonFastify(server, {
  maxBodySizeBytes: 1024 * 1024,
  maxDepth: 20,
});

server.post("/api/users", async (request) => {
  return { created: request.body };
});

server.listen({ port: 3000 });
```

---

## Graceful Shutdown

```ts
import { shutdownCacheManager } from "@pas7/nestjs-strict-json";

const app = await NestFactory.create(AppModule, { bodyParser: false });
registerStrictJson(app);
await app.listen(3000);

async function gracefulShutdown(signal: string) {
  console.log(`${signal} received. Shutting down...`);
  shutdownCacheManager();
  await app.close();
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```
