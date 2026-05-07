# Getting Started

## Installation

```bash
npm install @pas7/nestjs-strict-json
```

Peer dependencies (optional - only needed for NestJS integration):

```bash
npm install @nestjs/common @nestjs/core
```

## Prerequisites

| Requirement | Minimum Version |
|---|---|
| Node.js | 20+ |
| NestJS | 10+ (optional) |
| Express | 5+ (optional) |
| Fastify | 5+ (optional) |

## Choose Your Integration

This library works in three modes:

1. **NestJS** - Drop-in replacement for the default body parser
2. **Vanilla Express** - Middleware for standalone Express apps
3. **Vanilla Fastify** - Content type parser for standalone Fastify apps

## NestJS Setup

### With Express Adapter

Disable the default body parser so duplicate keys are not lost before strict parsing:

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

### With Fastify Adapter

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

### Using the Module (Recommended)

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
    }),
  ],
})
export class AppModule {}
```

### Using `forRootAsync` with ConfigService

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
        cacheSize: config.get("STRICT_JSON_CACHE_SIZE", 1000),
        maxDepth: config.get("STRICT_JSON_MAX_DEPTH", 20),
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Injecting CacheService

```ts
import { Injectable } from "@nestjs/common";
import { StrictJsonCacheService } from "@pas7/nestjs-strict-json";

@Injectable()
export class MyService {
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

## Vanilla Express Setup

```ts
import express from "express";
import { createStrictJsonExpressMiddleware } from "@pas7/nestjs-strict-json";

const app = express();

app.use(
  createStrictJsonExpressMiddleware({
    maxBodySizeBytes: 1024 * 1024,
    enableStreaming: true,
  }),
);

app.post("/api", (req, res) => {
  res.json({ received: req.body });
});

app.listen(3000);
```

## Vanilla Fastify Setup

```ts
import Fastify from "fastify";
import { registerStrictJsonFastify } from "@pas7/nestjs-strict-json";

const server = Fastify();
registerStrictJsonFastify(server, { maxBodySizeBytes: 1024 * 1024 });

server.post("/api", async (request) => request.body);
server.listen({ port: 3000 });
```

## Verify It Works

Send a request with duplicate keys:

```bash
curl -X POST http://localhost:3000/api \
  -H "Content-Type: application/json" \
  -d '{"user": "John", "user": "Jane"}'
```

Expected response (400):

```json
{
  "statusCode": 400,
  "code": "STRICT_JSON_DUPLICATE_KEY",
  "message": "Duplicate JSON key \"user\" at $.user",
  "path": "$",
  "key": "user"
}
```

Send a request with prototype pollution:

```bash
curl -X POST http://localhost:3000/api \
  -H "Content-Type: application/json" \
  -d '{"__proto__": {"isAdmin": true}}'
```

Expected response (400):

```json
{
  "statusCode": 400,
  "code": "STRICT_JSON_PROTOTYPE_POLLUTION",
  "message": "Prototype pollution attempt detected: dangerous key '__proto__' at $"
}
```

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

## What Gets Protected By Default

| Threat | Default Protection |
|---|---|
| Duplicate keys | Blocked |
| `__proto__`, `constructor`, `prototype` | Blocked |
| Depth > 10 | Blocked |
| Body > 1MB | Blocked |
| Invalid JSON | Rejected |

## Next Steps

- [Options Reference](Options-Reference) - Fine-tune the parser behavior
- [Error Handling](Error-Handling) - Customize error responses
- [Security Guide](Security-Guide) - Understand the security model
- [Framework Integration](Framework-Integration) - Deep-dive per framework
- [Examples](Examples) - More code samples
