# @pas7/nestjs-strict-json

A strict JSON parser for **NestJS**, **Express**, and **Fastify** that blocks dangerous and ambiguous payloads at the parser level.

**npm**: [`@pas7/nestjs-strict-json`](https://www.npmjs.com/package/@pas7/nestjs-strict-json)

## What It Does

| Protection | How |
|---|---|
| **Duplicate JSON keys** | Detects and rejects duplicate keys in request body JSON |
| **Prototype pollution** | Blocks `__proto__`, `constructor`, `prototype` keys |
| **Depth attacks** | Configurable max nesting depth to prevent DoS |
| **Key filtering** | Whitelist/blacklist support with glob patterns |

## Why Use It

Standard `JSON.parse` and default body parsers silently accept duplicate keys and prototype pollution attempts. This package rejects those payloads before they reach your business logic.

**Performance**: Only **18% slower** than native `JSON.parse` (v0.5.0 optimized), down from 24x slower in earlier versions.

## Quick Start

```bash
npm install @pas7/nestjs-strict-json
```

```ts
// NestJS (Express or Fastify)
import { NestFactory } from "@nestjs/core";
import { registerStrictJson } from "@pas7/nestjs-strict-json";
import { AppModule } from "./app.module";

const app = await NestFactory.create(AppModule, { bodyParser: false });
registerStrictJson(app);
await app.listen(3000);
```

## Compatibility

| Platform | Version |
|---|---|
| Node.js | 20+ |
| NestJS | 10+ |
| Express | 5+ |
| Fastify | 5+ |
| TypeScript | 5.x / 6.x |

## Wiki Pages

| Page | Description |
|---|---|
| [Getting Started](Getting-Started) | Installation and first steps |
| [API Reference](API-Reference) | All exported functions, classes, and types |
| [Options Reference](Options-Reference) | Full configuration options reference |
| [Error Handling](Error-Handling) | Error codes, custom handlers, and best practices |
| [Security Guide](Security-Guide) | Security features explained in depth |
| [Framework Integration](Framework-Integration) | NestJS, Express, and Fastify setup guides |
| [Examples](Examples) | Code examples for common use cases |

## Resources

- [README](https://github.com/pas7-studio/nestjs-strict-json#readme) - Full documentation
- [Optimization Guide](https://github.com/pas7-studio/nestjs-strict-json/blob/main/docs/OPTIMIZATION-GUIDE.md) - Performance tuning
- [Performance Report](https://github.com/pas7-studio/nestjs-strict-json/blob/main/performance/reports/comparison-latest.md) - Benchmarks
- [Blog: JSON Security Vulnerabilities](https://pas7.com.ua/blog/en/nestjs-strict-json) - Deep dive into the problems this package solves
- [Issues](https://github.com/pas7-studio/nestjs-strict-json/issues) - Report bugs or request features

## License

Apache-2.0 | Maintained by [PAS7](https://pas7.com.ua/)
