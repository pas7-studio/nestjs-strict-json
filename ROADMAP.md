<!-- File: ROADMAP.md -->
# ROADMAP - @pas7/nestjs-strict-json

## Summary & Context

This document describes the development strategy for `@pas7/nestjs-strict-json` — a middleware/content parser for NestJS, Express, and Fastify that detects duplicate keys in JSON requests at an early processing stage.

### Current State

- **Version**: v1.1.x (stable)
- **Test coverage**: Comprehensive unit and e2e tests (569 passing)
- **Supported platforms**: NestJS 10+, Express 4+/5+, Fastify 4+, Node.js 20+
- **Dependencies**: Minimal (only `jsonc-parser` for production)
- **Stability**: Production-ready for use with NestJS and Fastify

### Current Limitations

1. **Express adapter is not fully streaming** — reads the entire body into memory before parsing
2. **Limited content-type support** — now expanded to JSON variant types
3. **No integration with NestJS exception filters**
4. **No telemetry or metrics**
5. **Does not support other frameworks** (Hapi, Koa, native HTTP)

---

## Strategic Development Vectors

### Vector 1: Core Functionality Improvements ⭐⭐⭐

**Goal**: Eliminate critical limitations and improve performance for production use

#### 1.1 Streaming Parser for Express 🔴 HIGH PRIORITY

**Problem**: The current [`express.ts`](src/adapters/express.ts) implementation reads the entire body into memory, which is critical for large payloads (>1MB)

**Solution**: Implement a streaming parser using Node.js TransformStream

**Technical approach**:
```typescript
// Pseudocode for streaming parser
class StreamingJsonParser extends Transform {
  _transform(chunk, encoding, callback) {
    // Stream processing and duplicate detection
    callback(null, chunk);
  }
}
```

**Success criteria**:
- Memory footprint reduced by 80%+ for payloads >1MB
- Backward compatibility with existing API
- Performance not lower than current for small payloads (<100KB)

**Estimated complexity**: 3-4 weeks
**Impact**: Critical for production

---

#### 1.2 Extended Configuration Options 🟡 MEDIUM PRIORITY ✅ DONE

**Features**:
```typescript
interface StrictJsonOptions {
  // Existing
  maxBodySizeBytes?: number;
  
  // New options (implemented)
  whitelist?: string[];           // Allowed keys (glob patterns)
  blacklist?: string[];           // Forbidden keys
  maxDepth?: number;              // Maximum nesting depth (DoS protection)
  ignoreCase?: boolean;           // Case sensitivity for duplicate detection
  enableFastPath?: boolean;       // Optimized path for simple JSON
}
```

**Estimated complexity**: 1-2 weeks
**Impact**: DX and flexibility improvement

---

#### 1.3 Custom Error Handlers 🟡 MEDIUM PRIORITY ✅ DONE

**Features**:
- Callback for each error type
- Ability to format responses
- Custom error codes and messages
- Error message localization

**API**:
```typescript
interface StrictJsonOptions {
  onDuplicateKey?: (error: DuplicateKeyError) => void | Promise<void>;
  onInvalidJson?: (error: InvalidJsonError) => void | Promise<void>;
  onBodyTooLarge?: (error: BodyTooLargeError) => void | Promise<void>;
  onPrototypePollution?: (error: PrototypePollutionError) => void | Promise<void>;
  onError?: (error: StrictJsonError) => void | Promise<void>;
}
```

**Estimated complexity**: 1 week
**Impact**: DX and integration improvement

---

#### 1.4 Improved Error Messages 🟢 LOW PRIORITY

**Features**:
- JSON Pointer path in error response (`$.a.b.c[0].key`)
- Interactive fix suggestions
- Localized error messages (en, uk, ru, ...)
- Contextual hints for developers

**Example response**:
```json
{
  "statusCode": 400,
  "code": "STRICT_JSON_DUPLICATE_KEY",
  "message": "Duplicate key 'flag' detected",
  "details": {
    "path": "$.user.flags",
    "key": "flag",
    "position": { "line": 5, "column": 15 },
    "hint": "Remove duplicate key or rename one of them"
  }
}
```

**Estimated complexity**: 3-4 days
**Impact**: DX improvement

---

### Vector 2: Ecosystem Expansion ⭐⭐

**Goal**: Support more frameworks and use cases

#### 2.1 Additional JSON Content-Type Support 🟡 MEDIUM PRIORITY ✅ DONE

**Formats**:
- `application/json-patch+json` (RFC 6902)
- `application/merge-patch+json` (RFC 7396)
- `application/problem+json` (RFC 7807)
- `application/vnd.api+json` (JSON API)

---

#### 2.2 Hapi Adapter 🟡 MEDIUM PRIORITY

**Implementation**: Similar to [`fastify.ts`](src/adapters/fastify.ts)

```typescript
// src/adapters/hapi.ts
export const registerStrictJsonHapi = (server: Server, options?: StrictJsonOptions) => {
  server.ext('onRequest', async (request, h) => {
    // Duplicate detection for Hapi
  });
}
```

**Estimated complexity**: 1-2 weeks
**Impact**: Audience expansion

---

#### 2.3 Koa Adapter 🟡 MEDIUM PRIORITY

**Implementation**: Middleware pattern

```typescript
// src/adapters/koa.ts
export const createStrictJsonKoaMiddleware = (options?: StrictJsonOptions) => {
  return async (ctx: Context, next: Next) => {
    // Duplicate detection for Koa
    await next();
  };
}
```

**Estimated complexity**: 1-2 weeks
**Impact**: Audience expansion

---

#### 2.4 Node.js Native HTTP Server 🟢 LOW PRIORITY

**Implementation**: Raw HTTP handler

```typescript
// src/adapters/native.ts
export const createStrictJsonNativeHandler = (options?: StrictJsonOptions) => {
  return (req: IncomingMessage, res: ServerResponse) => {
    // Duplicate detection for native HTTP
  };
}
```

**Estimated complexity**: 3-4 days
**Impact**: Maximum flexibility

---

### Vector 3: Integrations & Tools ⭐⭐

**Goal**: Improve DX and integration with the NestJS ecosystem

#### 3.1 NestJS Exception Filters Integration 🟡 MEDIUM PRIORITY

**Features**:
- Automatic work with `@nestjs/common` exception filters
- `@UseFilters()` support
- Custom exception filters with StrictJsonError

**Implementation**: Add a `@StrictJson()` decorator and exception filter integration

```typescript
@StrictJson()
@Controller('users')
export class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {
    // Automatic StrictJsonError handling
  }
}

// Custom exception filter
@Catch(StrictJsonError)
export class StrictJsonExceptionFilter implements ExceptionFilter {
  catch(exception: StrictJsonError, host: ArgumentsHost) {
    // Custom handling
  }
}
```

**Estimated complexity**: 1-2 weeks
**Impact**: Critical for NestJS ecosystem

---

#### 3.2 Rate Limiting Hooks 🟢 LOW PRIORITY

**Integration**:
- @nestjs/throttler
- IP-based rate limiting at parser level

**Implementation**: Hooks for rate limiting before parsing

```typescript
interface StrictJsonOptions {
  enableRateLimiting?: boolean;
  rateLimitWindow?: number; // ms
  rateLimitMax?: number;    // requests per window
}
```

**Estimated complexity**: 3-4 days
**Impact**: Security improvement

---

#### 3.3 CLI Tool for JSON File Validation 🟢 LOW PRIORITY

**Features**:
```bash
# Check a single file
npx @pas7/nestjs-strict-json check file.json

# Check a directory
npx @pas7/nestjs-strict-json check ./data --recursive

# CI/CD integration
npx @pas7/nestjs-strict-json check ./api-specs --fail-on-error
```

**Output**:
```
✓ file.json: Valid
✗ invalid.json: Duplicate key 'user' at $.data[0].user
  Position: Line 15, Column 8
```

**Estimated complexity**: 1 week
**Impact**: Developer DX improvement

---

#### 3.4 VS Code Extension 🟢 LOW PRIORITY

**Features**:
- Real-time duplicate key highlighting
- Quick fix suggestions
- JSON schema validation
- Inline hints for developers

**Estimated complexity**: 2-3 weeks
**Impact**: DX improvement

---

### Vector 4: Validation & Security ⭐

**Goal**: Expand validation and protect against additional attacks

#### 4.1 JSON Schema Integration 🟡 MEDIUM PRIORITY

**Features**:
- JSON schema validation at parser level
- Support for Draft 7/2019-09/2020-12
- Ability to add schema via option

**API**:
```typescript
interface StrictJsonOptions {
  jsonSchema?: JSONSchema7;
  validateSchema?: boolean;
}

StrictJsonModule.forRoot({
  jsonSchema: {
    type: 'object',
    properties: {
      user: { type: 'string' }
    }
  }
})
```

**Estimated complexity**: 3-4 weeks
**Impact**: Validation expansion

---

#### 4.2 Recursion Depth Limits ✅ DONE

**Features**:
- DoS protection via deep nesting
- Configurable `maxDepth`
- Smart limits based on body size

---

#### 4.3 Prototype Pollution Protection ✅ DONE

**Features**:
- Detection of `__proto__`, `constructor`, `prototype` keys
- Sanitization before parsing
- Optional strict mode

---

#### 4.4 JSON Injection Prevention 🟢 LOW PRIORITY

**Features**:
- Detection of injection attempts in string values
- Pattern matching for common injection vectors

**Example injections**:
```json
{
  "user": {"$gt": ""}
}
{
  "query": {"$where": "sleep(1000)"}
}
```

**Estimated complexity**: 1-2 weeks
**Impact**: Security improvement

---

### Vector 5: Monitoring & Performance ⭐

**Goal**: Telemetry, metrics, and optimization

#### 5.1 Telemetry & Metrics 🟡 MEDIUM PRIORITY

**Metrics**:
```typescript
interface StrictJsonMetrics {
  duplicateDetectionCount: number;
  bodySizeDistribution: { min: number; max: number; avg: number };
  errorRates: { duplicateKey: number; invalidJson: number; bodyTooLarge: number };
  parsingTimePercentiles: { p50: number; p95: number; p99: number };
}
```

**Integration**: OpenTelemetry, Prometheus, Datadog

**Estimated complexity**: 2-3 weeks
**Impact**: Critical for production

---

#### 5.2 Distributed Tracing Support 🟢 LOW PRIORITY

**Integration**:
- OpenTelemetry support
- Spans for parsing operations
- Error context in traces

**Estimated complexity**: 2-3 weeks
**Impact**: Observability improvement

---

#### 5.3 Caching Layer ✅ DONE

**Features**:
- LRU cache for repeated payloads
- Hash-based cache keys
- Configurable TTL

---

#### 5.4 Performance Optimizations 🟢 LOW PRIORITY

**Optimizations**:
- Benchmark-driven improvements
- Memory footprint reduction
- CPU profiling
- SIMD operations (for WASM)

**Tools**:
- [`scripts/benchmark-parser.mjs`](scripts/benchmark-parser.mjs) — extend
- Profiling with Chrome DevTools
- Memory leak detection

**Estimated complexity**: 2-3 weeks
**Impact**: General performance improvement

---

### Vector 6: Advanced Innovation 🌟

**Goal**: Revolutionary improvements and new capabilities

#### 6.1 WASM Implementation 🔴 HIGH PRIORITY (long-term)

**Features**:
- Core parser in Rust/Go with WASM
- 2-5x faster parsing
- Drop-in replacement for JS parser

**Technical approach**:
```rust
// src/wasm/parser.rs (Rust)
#[wasm_bindgen]
pub fn parse_strict_json(json: &str) -> Result<JsValue, JsValue> {
    // Fast parser with WASM
}
```

**Estimated complexity**: 6-8 weeks
**Impact**: Revolutionary performance improvement

---

#### 6.2 Schema-First Approach 🟡 MEDIUM PRIORITY

**Features**:
- Automatic DTO generation from JSON Schema
- Accelerated parsing with pre-compiled schemas
- Type inference

---

#### 6.3 Multi-Format Support 🟢 LOW PRIORITY

**Formats**:
- XML support (XXE protection)
- GraphQL validation
- YAML support

**Estimated complexity**: 4-6 weeks
**Impact**: Use case expansion

---

## Recommendations

### Strategic Priorities

1. **Stability over new features** — every version must be production-ready
2. **Performance first** — streaming parser has the highest priority
3. **Security is critical** — prototype pollution protection and recursion limits
4. **NestJS ecosystem** — exception filters and integrations are important for growth

### Tactical Recommendations

1. **Feature flags for experimental features**
2. **Minimize breaking changes** — strict semantic versioning
3. **Benchmark-driven development** — automatic benchmarks in CI/CD
4. **Community-focused** — document contribution guidelines, welcome contributions

---

## Legend

- 🔴 **High Priority** — Critical for production / security
- 🟡 **Medium Priority** — Important for DX / ecosystem
- 🟢 **Low Priority** — Useful, but not critical
- ⭐⭐⭐ **Critical vector** — High strategic priority
- ⭐⭐ **Important vector** — Medium strategic priority
- ⭐ **Useful vector** — Low strategic priority
- 🌟 **Innovation vector** — Long-term perspective
- ✅ **DONE** — Already implemented

---

**Document version**: 2.0.0
**Last updated**: May 2026
**Status**: Approved
