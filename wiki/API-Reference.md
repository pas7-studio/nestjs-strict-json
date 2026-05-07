# API Reference

## Exports Overview

All exports are available from the package root:

```ts
import {
  // Core parser
  parseStrictJson,
  parseStrictJsonAsync,

  // Cache management
  clearParseCache,
  getParseCacheSize,
  shutdownCacheManager,
  resetCacheManager,
  isCleanupIntervalRunning,

  // Streaming
  StreamingJsonParser,
  parseJsonStream,
  shouldUseStreaming,

  // Error classes
  StrictJsonError,
  DuplicateKeyError,
  InvalidJsonError,
  BodyTooLargeError,
  PrototypePollutionError,
  DepthLimitError,

  // Types
  type StrictJsonOptions,
  type StrictJsonErrorDetails,
  type StrictJsonErrorCode,
  type StrictJsonErrorHandler,
  type ParserOptions,
  type CacheOptions,
  type StreamingOptions,
  type LazyOptions,
  type FilteringOptions,
  type ErrorHandlerOptions,

  // Validation utilities
  isKeyAllowed,
  KeyPolicyValidator,
  PatternMatcher,
  createKeyPolicyValidator,
  createPatternMatcher,
  getCachedValidator,
  clearValidatorCache,
  getValidatorCacheSize,

  // Glob utilities
  globToRegex,
  matchGlobPattern,

  // NestJS integration
  registerStrictJson,
  StrictJsonModule,

  // Adapter integration
  registerStrictJsonFastify,
  createStrictJsonExpressMiddleware,
} from "@pas7/nestjs-strict-json";
```

---

## Core Parser

### `parseStrictJson(raw, options?)`

Synchronously parse a JSON string or Buffer with strict validation.

```ts
function parseStrictJson(
  raw: string | Buffer,
  options?: StrictJsonOptions,
): unknown;
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `raw` | `string \| Buffer` | JSON string or Buffer to parse |
| `options` | `StrictJsonOptions` | Optional configuration |

**Returns:** `unknown` - The parsed JSON value.

**Throws:**
- `DuplicateKeyError` - If duplicate keys are detected
- `PrototypePollutionError` - If dangerous prototype keys are found
- `DepthLimitError` - If nesting exceeds `maxDepth`
- `InvalidJsonError` - If the input is not valid JSON
- `BodyTooLargeError` - If the payload exceeds `maxBodySizeBytes`

**Example:**

```ts
const result = parseStrictJson('{"name": "John", "age": 30}', {
  maxDepth: 20,
  enablePrototypePollutionProtection: true,
});
```

---

### `parseStrictJsonAsync(raw, options?)`

Asynchronously parse a JSON string or Buffer with streaming support.

```ts
function parseStrictJsonAsync(
  raw: string | Buffer,
  options?: StrictJsonOptions,
): Promise<unknown>;
```

Same parameters and behavior as `parseStrictJson`, but returns a Promise. Supports streaming mode for large payloads when `enableStreaming` is enabled.

**Example:**

```ts
const result = await parseStrictJsonAsync(largeJsonString, {
  enableStreaming: true,
  streamingThreshold: 100 * 1024,
});
```

---

## Cache Management

### `clearParseCache()`

Clears all entries from the parse cache.

```ts
function clearParseCache(): void;
```

### `getParseCacheSize()`

Returns the current number of entries in the parse cache.

```ts
function getParseCacheSize(): number;
```

### `shutdownCacheManager()`

Gracefully shuts down the cache cleanup interval. Call this on application shutdown to prevent memory leaks.

```ts
function shutdownCacheManager(): void;
```

### `resetCacheManager()`

Fully resets the cache manager. Useful for testing.

```ts
function resetCacheManager(): void;
```

### `isCleanupIntervalRunning()`

Returns whether the cache cleanup interval is currently active.

```ts
function isCleanupIntervalRunning(): boolean;
```

---

## Streaming

### `StreamingJsonParser`

A Node.js Transform stream that validates JSON incrementally as it passes through.

```ts
class StreamingJsonParser extends Transform {
  constructor(options?: StrictJsonOptions);
}
```

**Events:**
- `data` - Emits validated chunks of data
- `end` - Emitted when parsing completes successfully
- `error` - Emitted on validation failure (duplicate keys, prototype pollution, etc.)

**Example:**

```ts
import { createReadStream } from "fs";
import { StreamingJsonParser } from "@pas7/nestjs-strict-json";

const parser = new StreamingJsonParser({ maxDepth: 20 });

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

### `parseJsonStream(stream, options?)`

Parses JSON from a readable stream with full validation.

```ts
function parseJsonStream(
  stream: NodeJS.ReadableStream,
  options?: StrictJsonOptions,
): Promise<unknown>;
```

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `stream` | `NodeJS.ReadableStream` | The input stream |
| `options` | `StrictJsonOptions` | Optional configuration |

**Returns:** `Promise<unknown>` - The parsed JSON value.

### `shouldUseStreaming(contentLength, options?)`

Determines if streaming should be used based on content length and configuration.

```ts
function shouldUseStreaming(
  contentLength: number | undefined,
  options?: StrictJsonOptions,
): boolean;
```

Returns `true` when `enableStreaming` is enabled and `contentLength` >= `streamingThreshold`.

---

## Error Classes

### `StrictJsonError`

Base error class for all strict JSON errors.

```ts
class StrictJsonError extends Error {
  public readonly details: StrictJsonErrorDetails;
}
```

### `DuplicateKeyError`

Thrown when a duplicate JSON key is detected.

```ts
class DuplicateKeyError extends StrictJsonError {
  constructor(path: string, key: string, position?: number);
}
```

**Properties on `details`:**

| Property | Type | Description |
|---|---|---|
| `code` | `"STRICT_JSON_DUPLICATE_KEY"` | Error code |
| `message` | `string` | Human-readable message |
| `path` | `string` | JSON path where duplicate was found (e.g., `$.user`) |
| `key` | `string` | The duplicate key name |
| `position` | `number` (optional) | Character position in the input |

### `InvalidJsonError`

Thrown when the input is not valid JSON.

```ts
class InvalidJsonError extends StrictJsonError {
  constructor(message: string);
}
```

**Properties on `details`:**

| Property | Type | Description |
|---|---|---|
| `code` | `"STRICT_JSON_INVALID_JSON"` | Error code |
| `message` | `string` | Description of the syntax error |

### `BodyTooLargeError`

Thrown when the payload exceeds `maxBodySizeBytes`.

```ts
class BodyTooLargeError extends StrictJsonError {
  constructor(maxBodySizeBytes: number);
}
```

**Properties on `details`:**

| Property | Type | Description |
|---|---|---|
| `code` | `"STRICT_JSON_BODY_TOO_LARGE"` | Error code |
| `message` | `string` | Includes the max size limit |

### `PrototypePollutionError`

Thrown when a dangerous prototype pollution key is detected.

```ts
class PrototypePollutionError extends StrictJsonError {
  constructor(dangerousKey: string, path: string);
}
```

**Properties:**

| Property | Type | Description |
|---|---|---|
| `dangerousKey` | `string` | The dangerous key that was detected |
| `path` | `string` | JSON path where the key was found |
| `details.code` | `"STRICT_JSON_PROTOTYPE_POLLUTION"` | Error code |

### `DepthLimitError`

Thrown when nesting depth exceeds the configured limit.

```ts
class DepthLimitError extends StrictJsonError {
  constructor(currentDepth: number, maxDepth: number);
}
```

**Properties:**

| Property | Type | Description |
|---|---|---|
| `currentDepth` | `number` | The actual depth detected |
| `maxDepth` | `number` | The configured limit |
| `details.code` | `"STRICT_JSON_DEPTH_LIMIT"` | Error code |

---

## NestJS Integration

### `registerStrictJson(app, options?)`

Registers the strict JSON middleware on a NestJS application. Automatically detects the HTTP adapter (Express or Fastify) and applies the appropriate integration.

```ts
function registerStrictJson(
  app: NestAppLike,
  options?: StrictJsonOptions,
): void;
```

**Throws:** `Error` if the adapter type is not "express" or "fastify".

### `StrictJsonModule`

NestJS module that provides DI for cache and options.

```ts
class StrictJsonModule {
  static forRoot(options?: StrictJsonOptions): DynamicModule;
  static forRootAsync(asyncOptions: StrictJsonAsyncOptions): DynamicModule;
}

interface StrictJsonAsyncOptions {
  imports?: DynamicModule['imports'];
  useFactory: (...args: unknown[]) => Promise<StrictJsonOptions> | StrictJsonOptions;
  inject?: (InjectionToken | OptionalFactoryDependency)[];
}
```

**Lifecycle hooks:**
- `OnApplicationBootstrap` - Registers the middleware
- `OnModuleDestroy` - Clears the cache

**Exports:** `STRICT_JSON_CACHE`, `STRICT_JSON_OPTIONS`, `StrictJsonCacheService`

### `StrictJsonCacheService`

Injectable NestJS service for managing the parse cache.

```ts
class StrictJsonCacheService {
  getSize(): number;
  getMaxSize(): number;
  clear(): void;
}
```

---

## Adapter Integration

### `createStrictJsonExpressMiddleware(options?)`

Creates an Express-compatible middleware for strict JSON parsing.

```ts
function createStrictJsonExpressMiddleware(
  options?: StrictJsonOptions,
): (req: ExpressReq, res: ExpressRes, next: ExpressNext) => Promise<void>;
```

**Behavior:**
- Processes requests with JSON content-types: `application/json`, `application/json-patch+json`, `application/vnd.api+json`, `application/merge-patch+json`, `application/problem+json`
- Supports streaming for large payloads
- Returns JSON error responses with appropriate HTTP status codes
- Sets `req.body` with the parsed result

**Error response format:**

```json
{
  "statusCode": 400,
  "code": "STRICT_JSON_DUPLICATE_KEY",
  "message": "Duplicate JSON key \"user\" at $.user",
  "path": "$",
  "key": "user"
}
```

**HTTP status codes:**
- `400` - Duplicate key, invalid JSON, prototype pollution, depth limit
- `413` - Body too large

### `registerStrictJsonFastify(instance, options?)`

Registers a strict JSON content type parser on a Fastify instance.

```ts
function registerStrictJsonFastify(
  instance: FastifyLikeInstance,
  options?: StrictJsonOptions,
): void;
```

**Behavior:**
- Registers content type parsers for: `application/json`, `application/json-patch+json`, `application/vnd.api+json`, `application/merge-patch+json`, `application/problem+json`
- Throws `BadRequestException` or `PayloadTooLargeException` from `@nestjs/common`
- Uses Fastify's `addContentTypeParser` API with `parseAs: "buffer"`

---

## Validation Utilities

### `isKeyAllowed(keyPath, whitelist?, blacklist?)`

Checks whether a key path is allowed by the whitelist/blacklist configuration.

```ts
function isKeyAllowed(
  keyPath: string,
  whitelist?: string[],
  blacklist?: string[],
): boolean;
```

### `createKeyPolicyValidator(whitelist?, blacklist?, ignoreCase?)`

Creates a reusable key policy validator.

```ts
function createKeyPolicyValidator(
  whitelist?: string[],
  blacklist?: string[],
  ignoreCase?: boolean,
): KeyPolicyValidator;
```

### `globToRegex(pattern)`

Converts a glob pattern (e.g., `user.*`) to a regular expression.

```ts
function globToRegex(pattern: string): RegExp;
```

### `matchGlobPattern(path, pattern)`

Tests whether a path matches a glob pattern.

```ts
function matchGlobPattern(path: string, pattern: string): boolean;
```

### Validator Cache

```ts
function getCachedValidator(key: string): KeyPolicyValidator;
function clearValidatorCache(): void;
function getValidatorCacheSize(): number;
```

---

## Types

### `StrictJsonOptions`

Combined options interface. See [Options Reference](Options-Reference) for full details.

### `StrictJsonErrorCode`

```ts
type StrictJsonErrorCode =
  | "STRICT_JSON_DUPLICATE_KEY"
  | "STRICT_JSON_INVALID_JSON"
  | "STRICT_JSON_BODY_TOO_LARGE"
  | "STRICT_JSON_PROTOTYPE_POLLUTION"
  | "STRICT_JSON_DEPTH_LIMIT";
```

### `StrictJsonErrorDetails`

```ts
type StrictJsonErrorDetails = {
  code: StrictJsonErrorCode;
  message: string;
  path?: string;
  key?: string;
  position?: number;
  dangerousKey?: string;
  currentDepth?: number;
  maxDepth?: number;
};
```

### `StrictJsonErrorHandler`

```ts
type StrictJsonErrorHandler<TError = unknown> = (error: TError) => void | Promise<void>;
```

### `TypedErrorHandlerOptions` (v1.1.0+)

Typed error handler options with per-error-type generics.

```ts
type TypedErrorHandlerOptions = {
  onDuplicateKey?: StrictJsonErrorHandler<DuplicateKeyError>;
  onInvalidJson?: StrictJsonErrorHandler<InvalidJsonError>;
  onBodyTooLarge?: StrictJsonErrorHandler<BodyTooLargeError>;
  onPrototypePollution?: StrictJsonErrorHandler<PrototypePollutionError>;
  onDepthLimit?: StrictJsonErrorHandler<DepthLimitError>;
  onError?: StrictJsonErrorHandler<StrictJsonError>;
};
```

### `StrictJsonAsyncOptions` (v1.1.0+)

```ts
interface StrictJsonAsyncOptions {
  imports?: DynamicModule['imports'];
  useFactory: (...args: unknown[]) => Promise<StrictJsonOptions> | StrictJsonOptions;
  inject?: (InjectionToken | OptionalFactoryDependency)[];
}
```
