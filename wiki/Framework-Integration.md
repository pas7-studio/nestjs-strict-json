# Framework Integration

## NestJS

### Method 1: `registerStrictJson(app, options?)`

The simplest way to integrate. Automatically detects the HTTP adapter.

```ts
import { NestFactory } from "@nestjs/core";
import { registerStrictJson } from "@pas7/nestjs-strict-json";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  registerStrictJson(app, {
    maxBodySizeBytes: 1024 * 1024,
    enablePrototypePollutionProtection: true,
    maxDepth: 20,
  });
  await app.listen(3000);
}
bootstrap();
```

**Important:** Always pass `{ bodyParser: false }` when using Express to prevent the default parser from silently resolving duplicate keys.

### Method 2: `StrictJsonModule.forRoot(options?)`

Recommended for DI-based applications. Provides cache and options as injectable providers.

```ts
import { Module } from "@nestjs/common";
import { StrictJsonModule } from "@pas7/nestjs-strict-json";

@Module({
  imports: [
    StrictJsonModule.forRoot({
      enableCache: true,
      cacheSize: 2000,
      maxDepth: 20,
      maxBodySizeBytes: 5 * 1024 * 1024,
    }),
  ],
})
export class AppModule {}
```

Then in your `main.ts`:

```ts
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

const app = await NestFactory.create(AppModule, { bodyParser: false });
// Module auto-registers middleware on bootstrap
await app.listen(3000);
```

### Method 3: `StrictJsonModule.forRootAsync(options?)`

For dynamic configuration with `ConfigModule`:

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
        enableCache: config.get<boolean>("STRICT_JSON_CACHE_ENABLED", true),
        cacheSize: config.get<number>("STRICT_JSON_CACHE_SIZE", 1000),
        maxDepth: config.get<number>("STRICT_JSON_MAX_DEPTH", 20),
        maxBodySizeBytes: config.get<number>("STRICT_JSON_MAX_BODY_SIZE", 1048576),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Using StrictJsonCacheService

```ts
import { Injectable } from "@nestjs/common";
import { StrictJsonCacheService } from "@pas7/nestjs-strict-json";

@Injectable()
export class CacheMonitorService {
  constructor(private readonly cacheService: StrictJsonCacheService) {}

  getStats() {
    return {
      size: this.cacheService.getSize(),
      maxSize: this.cacheService.getMaxSize(),
    };
  }

  clearCache() {
    this.cacheService.clear();
  }
}
```

### Lifecycle

The `StrictJsonModule` implements:

- **`OnApplicationBootstrap`** - Registers the middleware automatically after all modules load
- **`OnModuleDestroy`** - Clears the cache when the module is destroyed (prevents memory leaks)

### Injecting Tokens Directly

```ts
import { Inject, Injectable } from "@nestjs/common";
import { STRICT_JSON_OPTIONS, STRICT_JSON_CACHE } from "@pas7/nestjs-strict-json";
import type { StrictJsonOptions } from "@pas7/nestjs-strict-json";

@Injectable()
export class MyService {
  constructor(
    @Inject(STRICT_JSON_OPTIONS) private readonly options: StrictJsonOptions,
    @Inject(STRICT_JSON_CACHE) private readonly cache: ICache,
  ) {}
}
```

---

## Express (Vanilla)

### Basic Setup

```ts
import express from "express";
import { createStrictJsonExpressMiddleware } from "@pas7/nestjs-strict-json";

const app = express();

app.use(createStrictJsonExpressMiddleware({
  maxBodySizeBytes: 1024 * 1024,
}));

app.post("/api", (req, res) => {
  res.json({ received: req.body });
});

app.listen(3000);
```

### With Streaming

```ts
app.use(createStrictJsonExpressMiddleware({
  enableStreaming: true,
  streamingThreshold: 100 * 1024,
  chunkSize: 64 * 1024,
}));
```

### With Custom Error Handlers

```ts
app.use(createStrictJsonExpressMiddleware({
  onDuplicateKey: (error) => {
    console.error(`Duplicate key: ${error.key} at ${error.path}`);
  },
  onPrototypePollution: (error) => {
    console.error(`Security alert: ${error.dangerousKey}`);
  },
}));
```

### Route-Specific Middleware

```ts
const publicMiddleware = createStrictJsonExpressMiddleware({
  maxBodySizeBytes: 100 * 1024,
  maxDepth: 10,
});

const internalMiddleware = createStrictJsonExpressMiddleware({
  maxBodySizeBytes: 10 * 1024 * 1024,
  enableFastPath: true,
});

app.use("/api/public", publicMiddleware);
app.use("/api/internal", internalMiddleware);
```

### Error Response Format

Express middleware returns JSON responses with these HTTP status codes:

| Status | Code | Description |
|---|---|---|
| 400 | `STRICT_JSON_DUPLICATE_KEY` | Duplicate key detected |
| 400 | `STRICT_JSON_INVALID_JSON` | Invalid JSON syntax |
| 400 | `STRICT_JSON_PROTOTYPE_POLLUTION` | Dangerous key detected |
| 400 | `STRICT_JSON_DEPTH_LIMIT` | Depth limit exceeded |
| 413 | `STRICT_JSON_BODY_TOO_LARGE` | Body exceeds size limit |

### Content-Type Handling

The middleware processes requests with JSON content-types:

| Content-Type | Supported |
|---|---|
| `application/json` | Yes |
| `application/json-patch+json` (RFC 6902) | Yes |
| `application/vnd.api+json` (JSON API) | Yes |
| `application/merge-patch+json` (RFC 7396) | Yes |
| `application/problem+json` (RFC 7807) | Yes |

All other requests pass through to the next middleware.

---

## Fastify (Vanilla)

### Basic Setup

```ts
import Fastify from "fastify";
import { registerStrictJsonFastify } from "@pas7/nestjs-strict-json";

const server = Fastify();
registerStrictJsonFastify(server, { maxBodySizeBytes: 1024 * 1024 });

server.post("/api", async (request) => request.body);
server.listen({ port: 3000 });
```

### With Error Hooks

```ts
registerStrictJsonFastify(server, {
  maxDepth: 20,
  onDuplicateKey: (error) => {
    console.error(`Duplicate key: ${error.key}`);
  },
  onPrototypePollution: (error) => {
    console.error(`Prototype pollution: ${error.dangerousKey}`);
  },
});
```

### Error Handling

The Fastify adapter throws `@nestjs/common` exceptions:
- `BadRequestException` for validation errors (400)
- `PayloadTooLargeException` for body size violations (413)

**Important:** Even in vanilla Fastify (without NestJS), the adapter imports `BadRequestException` and `PayloadTooLargeException` from `@nestjs/common`. These are peer dependencies only used for error classes.

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Duplicate JSON key \"user\" at $.user",
  "error": "Bad Request",
  "code": "STRICT_JSON_DUPLICATE_KEY",
  "details": {
    "path": "$",
    "key": "user"
  }
}
```

### Custom Fastify Error Handler

```ts
server.setErrorHandler((error, request, reply) => {
  if (error.statusCode === 400 && error.code?.startsWith("STRICT_JSON_")) {
    reply.status(400).send({
      statusCode: 400,
      code: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }
  reply.send(error);
});
```

---

## NestJS Adapter Detection

The `registerStrictJson` function auto-detects the HTTP adapter type:

```ts
export const registerStrictJson = (app, options) => {
  const adapter = app.getHttpAdapter();
  const type = adapter.getType();

  if (type === "fastify") {
    registerStrictJsonFastify(adapter.getInstance(), options);
    return;
  }

  if (type === "express") {
    app.use(createStrictJsonExpressMiddleware(options));
    return;
  }

  throw new Error(`Unsupported Nest adapter type: ${type}`);
};
```

Supported adapter types:
- `"express"` - Uses Express middleware
- `"fastify"` - Uses Fastify content type parser

---

## Migration from Default Body Parser

### From Express `express.json()`

```ts
// Before
app.use(express.json({ limit: "1mb" }));

// After
app.use(createStrictJsonExpressMiddleware({
  maxBodySizeBytes: 1024 * 1024,
}));
```

### From Fastify Default

Fastify's default JSON parser is replaced automatically by `registerStrictJsonFastify`. No manual cleanup needed.

### From NestJS Default

```ts
// Before
const app = await NestFactory.create(AppModule);

// After
const app = await NestFactory.create(AppModule, { bodyParser: false });
registerStrictJson(app);
```

### Breaking Change: Error Responses

Default body parsers return different error formats. Update your error handling if you rely on specific error response shapes.

**Default Express error:**
```json
{ "error": "Unexpected token } in JSON" }
```

**This package's error:**
```json
{
  "statusCode": 400,
  "code": "STRICT_JSON_INVALID_JSON",
  "message": "Invalid JSON"
}
```

---

## Graceful Shutdown

Call `shutdownCacheManager()` on application shutdown to clean up the cache cleanup interval:

```ts
import { shutdownCacheManager } from "@pas7/nestjs-strict-json";

process.on("SIGTERM", async () => {
  shutdownCacheManager();
  await app.close();
  process.exit(0);
});
```

When using `StrictJsonModule`, the cache is cleared automatically via `OnModuleDestroy`. However, the cleanup interval still needs to be stopped explicitly:

```ts
process.on("SIGTERM", async () => {
  shutdownCacheManager();
  await app.close();
});
```
