# Security Guide

## Overview

This package addresses JSON parsing vulnerabilities that are not handled by standard `JSON.parse` or default body parsers in Express, Fastify, and NestJS.

## Threats Mitigated

### 1. Duplicate JSON Keys

**The Problem:** Standard `JSON.parse` silently uses the last value when duplicate keys are present. This can lead to logic bypasses, data corruption, and security issues.

```json
{
  "user": "admin",
  "user": "guest"
}
```

Most parsers will return `{ "user": "guest" }`, silently discarding the first value. An attacker can exploit this by:
- Overwriting authorization fields
- Bypassing validation by sending both valid and invalid values
- Creating ambiguous payloads that behave differently across systems

**How This Package Handles It:** Detects duplicate keys at all nesting levels and throws `STRICT_JSON_DUPLICATE_KEY` with the key name and JSON path.

```ts
parseStrictJson('{"user": "admin", "user": "guest"}');
// Throws: DuplicateKeyError
// details: { code: "STRICT_JSON_DUPLICATE_KEY", key: "user", path: "$" }
```

---

### 2. Prototype Pollution

**The Problem:** Keys like `__proto__`, `constructor`, and `prototype` can modify JavaScript's `Object.prototype`, affecting all objects in the application.

```json
{
  "__proto__": {
    "isAdmin": true
  }
}
```

If this payload reaches business logic that merges objects, every object in the process would have `isAdmin === true`, leading to privilege escalation.

**How This Package Handles It:** Rejects dangerous keys at the parser level before they can be used.

```ts
parseStrictJson('{"__proto__": {"isAdmin": true}}');
// Throws: PrototypePollutionError
// details: { code: "STRICT_JSON_PROTOTYPE_POLLUTION", dangerousKey: "__proto__", path: "$" }
```

**Default blocked keys:**
- `__proto__`
- `constructor`
- `prototype`

**Custom dangerous keys:**

```ts
parseStrictJson(json, {
  dangerousKeys: ["__proto__", "constructor", "prototype", "admin", "role"],
});
```

**Disabling protection** (not recommended for untrusted input):

```ts
parseStrictJson(json, {
  enablePrototypePollutionProtection: false,
});
```

---

### 3. Depth Attacks (DoS)

**The Problem:** Deeply nested JSON objects can cause stack overflow or excessive CPU usage during parsing.

```json
{
  "a": {
    "b": {
      "c": {
        // ... 1000 levels deep
      }
    }
  }
}
```

**How This Package Handles It:** Configurable depth limit (default: 10). Throws `STRICT_JSON_DEPTH_LIMIT` when exceeded.

```ts
parseStrictJson(deepJson, { maxDepth: 5 });
// Throws: DepthLimitError
// details: { code: "STRICT_JSON_DEPTH_LIMIT", currentDepth: 6, maxDepth: 5 }
```

---

### 4. Body Size (DoS)

**The Problem:** Extremely large request bodies can exhaust memory.

**How This Package Handles It:** Configurable body size limit (default: 1MB). Throws `STRICT_JSON_BODY_TOO_LARGE` when exceeded.

```ts
parseStrictJson(hugeJson, { maxBodySizeBytes: 1024 * 1024 });
// Throws: BodyTooLargeError with HTTP 413
```

---

### 5. Key Injection via Blacklist/Whitelist

**The Problem:** Unwanted keys may appear in request payloads, especially in public APIs.

**How This Package Handles It:** Glob-pattern-based whitelist and blacklist to control which keys are allowed.

```ts
parseStrictJson(apiRequest, {
  whitelist: ["name", "email", "profile.*"],
  blacklist: ["**.password", "**.secret", "**.token", "admin"],
});
```

## Security Feature Comparison

| Capability | `JSON.parse` | `express.json()` | Fastify default | This package |
|---|---|---|---|---|
| Duplicate key rejection | No | No | No | Yes |
| Prototype pollution blocking | No | No | No | Yes |
| Max depth enforcement | No | No | No | Yes |
| Key whitelist/blacklist | No | No | No | Yes |
| Body size limit | No | Optional | Optional | Yes (default 1MB) |
| Structured error codes | No | No | No | Yes |

## Security Hardening Checklist

### Minimum (All Environments)

```ts
{
  enablePrototypePollutionProtection: true,  // Always on by default
  maxDepth: 20,
  maxBodySizeBytes: 1024 * 1024,
}
```

### For Public APIs

```ts
{
  enablePrototypePollutionProtection: true,
  maxDepth: 15,
  maxBodySizeBytes: 512 * 1024,              // Stricter limit
  blacklist: ["**.password", "**.secret", "**.token"],
  enableCache: false,                         // Don't cache untrusted data
}
```

### For Internal Services

```ts
{
  enablePrototypePollutionProtection: true,
  maxDepth: 20,
  maxBodySizeBytes: 5 * 1024 * 1024,
  enableCache: true,
  enableFastPath: true,                       // If data is from trusted internal source
}
```

## Why Parser-Level Protection Matters

### Layer Defense

Most applications validate JSON *after* parsing. This means:

1. `JSON.parse` silently resolves duplicate keys
2. The parsed (incorrect) object reaches validation
3. Validation may pass because it only sees the last value

Parser-level protection rejects malformed payloads *before* they become JavaScript objects, eliminating an entire class of vulnerabilities.

### The Express `bodyParser: false` Requirement

When using NestJS with Express, you **must** disable the default body parser:

```ts
// CORRECT
const app = await NestFactory.create(AppModule, { bodyParser: false });
registerStrictJson(app);

// WRONG - duplicates are lost before strict parsing
const app = await NestFactory.create(AppModule);
registerStrictJson(app);
```

The default Express body parser uses `JSON.parse` internally, which silently resolves duplicate keys. By the time the request reaches strict parsing, the duplicates are already gone.

### Fastify Is Safer by Default

Fastify's content type parser receives the raw body buffer before parsing, so strict parsing always sees the original JSON. No extra configuration needed:

```ts
const app = await NestFactory.create(AppModule);
registerStrictJson(app); // Works correctly with Fastify
```

## Performance vs Security Trade-offs

| Feature | Security Impact | Performance Impact |
|---|---|---|
| Duplicate key detection | High - prevents logic bypasses | Negligible overhead |
| Prototype pollution protection | Critical - prevents privilege escalation | Negligible overhead |
| `maxDepth` | Medium - prevents DoS | Negligible overhead |
| Whitelist/blacklist | Medium - controls allowed keys | Small overhead for pattern matching |
| `enableFastPath: true` | **Reduces** security (skips duplicate check) | **4.38x faster** |
| Lazy mode | **Reduces** security (skips some checks) | **1.86x faster** |

**Recommendation:** Only use `enableFastPath` or `lazyMode` for payloads from fully trusted sources.

## Common Attack Patterns

### Parameter Pollution

```bash
curl -X POST http://api.example.com/login \
  -H "Content-Type: application/json" \
  -d '{"user": "victim", "user": "admin", "password": "known"}'
```

**Blocked by:** Duplicate key detection

### Prototype Pollution via Nested Keys

```json
{
  "profile": {
    "constructor": {
      "prototype": {
        "isAdmin": true
      }
    }
  }
}
```

**Blocked by:** Prototype pollution protection (checks `constructor` key)

### DoS via Deep Nesting

```json
{"a":{"b":{"c":{"d":{"e":{"f":{"g":{"h":{"i":{"j":{"k":"overflow"}}}}}}}}}}}
```

**Blocked by:** `maxDepth` limit

### Data Exfiltration via Body Size

Sending massive payloads to exhaust server memory.

**Blocked by:** `maxBodySizeBytes` limit

## Further Reading

- [Blog: Understanding JSON Security Vulnerabilities](https://pas7.com.ua/blog/en/nestjs-strict-json) - Deep dive into the problems this package solves
- [OWASP: JSON Vulnerabilities](https://owasp.org/www-community/vulnerabilities/) - General web security guidance
