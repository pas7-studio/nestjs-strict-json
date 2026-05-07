# Options Reference

`StrictJsonOptions` is composed of six focused option groups following the Interface Segregation Principle.

```ts
interface StrictJsonOptions extends
  ParserOptions,
  CacheOptions,
  StreamingOptions,
  LazyOptions,
  FilteringOptions,
  ErrorHandlerOptions {}
```

---

## ParserOptions

Controls core parsing behavior including security measures and optimization strategies.

| Option | Type | Default | Description |
|---|---|---|---|
| `maxDepth` | `number` | `20` | Maximum nesting depth. Deeper structures trigger `STRICT_JSON_DEPTH_LIMIT`. |
| `enablePrototypePollutionProtection` | `boolean` | `true` | Blocks `__proto__`, `constructor`, `prototype` keys from modifying Object prototype. |
| `enableFastPath` | `boolean` | `false` | Skips duplicate key validation for simple JSON. Only checks prototype pollution. Use for trusted, simple payloads only. |

**Example:**

```ts
parseStrictJson(json, {
  maxDepth: 20,
  enablePrototypePollutionProtection: true,
  enableFastPath: false,
});
```

---

## CacheOptions

Controls the LRU cache for repeated JSON parsing operations.

| Option | Type | Default | Description |
|---|---|---|---|
| `enableCache` | `boolean` | `true` | Enables LRU caching for parsed results. |
| `cacheSize` | `number` | `1000` | Maximum number of cached entries. |
| `cacheTTL` | `number` | `60000` | Time-to-live for cached entries in milliseconds (1 minute). |

**Example:**

```ts
parseStrictJson(json, {
  enableCache: true,
  cacheSize: 500,
  cacheTTL: 120000, // 2 minutes
});
```

**Performance impact:** 1.36x faster for repeated identical payloads.

---

## StreamingOptions

Controls streaming mode for handling large JSON payloads efficiently.

| Option | Type | Default | Description |
|---|---|---|---|
| `enableStreaming` | `boolean` | `false` | Enables automatic streaming for large payloads. |
| `streamingThreshold` | `number` | `102400` (100KB) | Payloads at or above this size use streaming mode. |
| `chunkSize` | `number` | `65536` (64KB) | Chunk size for streaming operations. |

**Example:**

```ts
parseStrictJsonAsync(largeJson, {
  enableStreaming: true,
  streamingThreshold: 50 * 1024, // 50KB
  chunkSize: 128 * 1024,          // 128KB chunks
});
```

**Note:** Streaming only activates when `Content-Length` header is present and >= `streamingThreshold`. For middleware usage, enable streaming and the adapter will auto-detect based on payload size.

---

## LazyOptions

Optimizes parsing of large payloads by selectively skipping non-critical validation checks.

| Option | Type | Default | Description |
|---|---|---|---|
| `lazyMode` | `boolean` | `false` | Enables lazy mode optimizations. |
| `lazyModeThreshold` | `number` | `102400` (100KB) | Auto-enables lazy mode for payloads at or above this size. |
| `lazyModeDepthLimit` | `number` | `10` | Validation is skipped for objects deeper than this limit. |
| `lazyModeSkipPrototype` | `boolean` | `true` | Skips prototype pollution checks in lazy mode. |
| `lazyModeSkipWhitelist` | `boolean` | `true` | Skips whitelist validation in lazy mode. |
| `lazyModeSkipBlacklist` | `boolean` | `false` | Skips blacklist validation in lazy mode. **Security-critical: keep `false` unless you fully trust the data source.** |

**Example:**

```ts
parseStrictJson(largeJson, {
  lazyMode: true,
  lazyModeThreshold: 100 * 1024,
  lazyModeDepthLimit: 10,
  lazyModeSkipPrototype: true,
  lazyModeSkipWhitelist: true,
  lazyModeSkipBlacklist: false, // ALWAYS check blacklist
});
```

**Performance impact:** 1.86x faster for 1MB payloads.

**Trade-offs:**
- Still checks duplicate keys (security-critical)
- Still checks blacklist if `lazyModeSkipBlacklist` is `false`
- Skips prototype pollution and whitelist checks when their skip flags are `true`
- Limits validation depth

---

## FilteringOptions

Controls JSON content validation including key-based filtering and size limits.

| Option | Type | Default | Description |
|---|---|---|---|
| `maxBodySizeBytes` | `number` | `1048576` (1MB) | Maximum allowed JSON body size in bytes. |
| `whitelist` | `string[]` | `undefined` | Allowed key paths (glob patterns). Only these keys are permitted. |
| `blacklist` | `string[]` | `undefined` | Forbidden key paths (glob patterns). These keys are rejected. |
| `ignoreCase` | `boolean` | `false` | Case-insensitive matching for whitelist/blacklist. |
| `dangerousKeys` | `string[]` | `["__proto__", "constructor", "prototype"]` | Custom list of dangerous keys to always reject. |

### Glob Pattern Syntax

Patterns support wildcards:

| Pattern | Matches |
|---|---|
| `user` | Exact key `user` |
| `user.*` | Any key nested under `user` (one level) |
| `user.**` | Any key nested under `user` (any depth) |
| `*.password` | `password` key at any first-level path |
| `**.token` | `token` key at any nesting depth |

**Example:**

```ts
parseStrictJson(apiRequest, {
  whitelist: ["endpoint", "method", "data.user.*", "data.meta.timestamp"],
  blacklist: ["data.user.password", "**.token"],
  maxDepth: 10,
  ignoreCase: true,
});
```

---

## ErrorHandlerOptions

Custom error handlers for different types of parsing errors. Each handler receives the error object and can optionally return a Promise (async handlers are supported).

| Option | Type | Default | Description |
|---|---|---|---|
| `onDuplicateKey` | `StrictJsonErrorHandler` | `undefined` | Called when duplicate keys are detected. |
| `onInvalidJson` | `StrictJsonErrorHandler` | `undefined` | Called when input is not valid JSON. |
| `onBodyTooLarge` | `StrictJsonErrorHandler` | `undefined` | Called when payload exceeds `maxBodySizeBytes`. |
| `onPrototypePollution` | `StrictJsonErrorHandler` | `undefined` | Called when a dangerous prototype key is detected. |
| `onError` | `StrictJsonErrorHandler` | `undefined` | Generic fallback handler for any error type. Specific handlers take precedence. |

**Type:**

```ts
type StrictJsonErrorHandler = (error: unknown) => void | Promise<void>;
```

**Example:**

```ts
parseStrictJson(json, {
  onDuplicateKey: (error) => {
    logger.warn(`Duplicate key: ${error.key} at ${error.path}`);
  },
  onPrototypePollution: async (error) => {
    await securityAlert(error);
  },
  onError: (error) => {
    Sentry.captureException(error);
  },
});
```

**Important:** Custom handlers are invoked before the error is thrown. They do not prevent the error from being thrown.

---

## Presets

### Production (Recommended)

Balanced security and performance for production use.

```ts
{
  maxBodySizeBytes: 1024 * 1024,          // 1MB
  enablePrototypePollutionProtection: true,
  maxDepth: 20,
  enableCache: true,
  enableFastPath: false,                   // Keep duplicate detection
}
```

### High-Performance (Trusted Source)

Optimized for speed when data comes from a trusted source.

```ts
{
  maxDepth: 20,
  enableFastPath: true,                    // Skip duplicate check
  enableCache: true,
  cacheSize: 2000,
  enableStreaming: true,
  streamingThreshold: 50 * 1024,
}
```

### Maximum Security

Strictest validation for untrusted input.

```ts
{
  maxBodySizeBytes: 512 * 1024,            // 512KB
  enablePrototypePollutionProtection: true,
  dangerousKeys: ["__proto__", "constructor", "prototype", "admin"],
  maxDepth: 10,
  blacklist: ["**.password", "**.secret", "**.token"],
  enableFastPath: false,
  enableCache: false,                       // No cache for sensitive data
}
```

### Lazy Mode (Large Payloads)

Optimized for large payloads from semi-trusted sources.

```ts
{
  lazyMode: true,
  lazyModeThreshold: 100 * 1024,
  lazyModeDepthLimit: 10,
  lazyModeSkipPrototype: true,
  lazyModeSkipWhitelist: true,
  lazyModeSkipBlacklist: false,             // Keep blacklist check
  enableStreaming: true,
  streamingThreshold: 100 * 1024,
}
```
