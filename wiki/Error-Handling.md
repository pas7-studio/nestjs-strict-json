# Error Handling

## Error Codes

| Code | Error Class | HTTP Status | Description |
|---|---|---|---|
| `STRICT_JSON_DUPLICATE_KEY` | `DuplicateKeyError` | 400 | JSON contains duplicate keys |
| `STRICT_JSON_INVALID_JSON` | `InvalidJsonError` | 400 | Input is not valid JSON |
| `STRICT_JSON_BODY_TOO_LARGE` | `BodyTooLargeError` | 413 | Payload exceeds `maxBodySizeBytes` |
| `STRICT_JSON_PROTOTYPE_POLLUTION` | `PrototypePollutionError` | 400 | Dangerous prototype key detected |
| `STRICT_JSON_DEPTH_LIMIT` | `DepthLimitError` | 400 | Nesting depth exceeds `maxDepth` |

## Error Response Format

### Express Middleware

Returns JSON responses automatically:

```json
{
  "statusCode": 400,
  "code": "STRICT_JSON_DUPLICATE_KEY",
  "message": "Duplicate JSON key \"user\" at $.user",
  "path": "$",
  "key": "user",
  "position": 42
}
```

Fields present depend on error type:
- All errors include `statusCode` and `code`
- `path`, `key`, `position` are included for `STRICT_JSON_DUPLICATE_KEY`
- `STRICT_JSON_BODY_TOO_LARGE` returns HTTP 413 instead of 400

### Fastify / NestJS

Uses `@nestjs/common` exceptions:
- `BadRequestException` for most errors
- `PayloadTooLargeException` for body too large

## Custom Error Handlers

Custom handlers are invoked **before** the error is thrown. They receive the error object and can perform logging, monitoring, or async operations.

### Basic Example

```ts
parseStrictJson(json, {
  onDuplicateKey: (error) => {
    console.error(`Duplicate key: ${error.key} at ${error.path}`);
  },
  onPrototypePollution: (error) => {
    console.error(`Security violation: ${error.dangerousKey}`);
  },
});
```

### Async Handlers

```ts
parseStrictJson(json, {
  onPrototypePollution: async (error) => {
    await fetch("https://sentry.example.com/api/report", {
      method: "POST",
      body: JSON.stringify({ code: error.details.code, message: error.message }),
    });
  },
});
```

### Handler Priority

When multiple handlers match, specific handlers take precedence over the generic `onError`:

1. Specific handler (`onDuplicateKey`, `onPrototypePollution`, etc.)
2. Generic handler (`onError`)

Both are called if both are defined.

### Comprehensive Example

```ts
parseStrictJson(requestBody, {
  onDuplicateKey: (error) => {
    metrics.increment("strict_json.duplicate_key");
    logger.warn({ key: error.key, path: error.path }, "Duplicate key detected");
  },
  onInvalidJson: (error) => {
    metrics.increment("strict_json.invalid_json");
  },
  onBodyTooLarge: (error) => {
    metrics.increment("strict_json.body_too_large");
    logger.warn("Request body exceeds limit");
  },
  onPrototypePollution: async (error) => {
    metrics.increment("strict_json.prototype_pollution");
    await securityService.alert({
      type: "PROTOTYPE_POLLUTION",
      dangerousKey: error.dangerousKey,
      path: error.path,
      ip: request.ip,
    });
  },
  onError: (error) => {
    Sentry.captureException(error);
  },
});
```

## Error Properties

### DuplicateKeyError

```ts
try {
  parseStrictJson('{"user": "John", "user": "Jane"}');
} catch (error) {
  if (error instanceof DuplicateKeyError) {
    error.details.code;       // "STRICT_JSON_DUPLICATE_KEY"
    error.details.key;        // "user"
    error.details.path;       // "$"
    error.details.position;   // 15 (optional)
    error.message;            // "Duplicate JSON key \"user\" at $"
  }
}
```

### PrototypePollutionError

```ts
try {
  parseStrictJson('{"__proto__": {"isAdmin": true}}');
} catch (error) {
  if (error instanceof PrototypePollutionError) {
    error.dangerousKey;        // "__proto__"
    error.path;                // "$"
    error.details.code;        // "STRICT_JSON_PROTOTYPE_POLLUTION"
    error.message;             // "Prototype pollution attempt detected..."
  }
}
```

### DepthLimitError

```ts
try {
  parseStrictJson('{"a": {"b": {"c": {"d": "deep"}}}}', { maxDepth: 3 });
} catch (error) {
  if (error instanceof DepthLimitError) {
    error.currentDepth;        // 4
    error.maxDepth;            // 3
    error.details.code;        // "STRICT_JSON_DEPTH_LIMIT"
  }
}
```

### BodyTooLargeError

```ts
try {
  parseStrictJson(hugeString, { maxBodySizeBytes: 1024 });
} catch (error) {
  if (error instanceof BodyTooLargeError) {
    error.details.code;        // "STRICT_JSON_BODY_TOO_LARGE"
    error.message;             // "Request body exceeds max size of 1024 bytes"
  }
}
```

## NestJS Exception Filters

Since NestJS adapters throw `@nestjs/common` exceptions, you can use standard NestJS exception filters:

```ts
import { Catch, ExceptionFilter, ArgumentsHost, HttpException } from "@nestjs/common";

@Catch(HttpException)
export class StrictJsonFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === "object" && "code" in exceptionResponse) {
      const { code } = exceptionResponse as any;
      if (code?.startsWith("STRICT_JSON_")) {
        response.status(status).json({
          statusCode: status,
          code,
          message: exception.message,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    response.status(status).json(exceptionResponse);
  }
}
```

## Monitoring Integration

### Counting Errors

```ts
const errorCounts = {
  duplicateKey: 0,
  invalidJson: 0,
  bodyTooLarge: 0,
  prototypePollution: 0,
};

app.use(
  createStrictJsonExpressMiddleware({
    onDuplicateKey: () => { errorCounts.duplicateKey++; },
    onInvalidJson: () => { errorCounts.invalidJson++; },
    onBodyTooLarge: () => { errorCounts.bodyTooLarge++; },
    onPrototypePollution: () => { errorCounts.prototypePollution++; },
  }),
);

// Periodic reporting
setInterval(() => {
  metrics.gauge("strict_json.errors", Object.values(errorCounts).reduce((a, b) => a + b, 0));
}, 60000);
```

### Prometheus Example

```ts
import { Counter } from "prom-client";

const strictJsonErrors = new Counter({
  name: "strict_json_parse_errors_total",
  help: "Total strict JSON parse errors",
  labelNames: ["code"],
});

app.use(
  createStrictJsonExpressMiddleware({
    onError: (error: any) => {
      strictJsonErrors.inc({ code: error.details?.code ?? "UNKNOWN" });
    },
  }),
);
```

## Best Practices

1. **Always handle `onPrototypePollution`** - Log and alert on every prototype pollution attempt, as these indicate active attack attempts.

2. **Use `onError` as a safety net** - Register a generic `onError` handler to catch anything that slips through specific handlers.

3. **Alert on body-too-large** - Repeated `STRICT_JSON_BODY_TOO_LARGE` errors may indicate DoS attempts.

4. **Don't suppress errors in handlers** - Custom handlers are called before the error is thrown; they cannot prevent the error from being thrown.

5. **Use stable error codes for monitoring** - All error codes are stable strings (`STRICT_JSON_*`) that can be used for alerting rules and dashboards.
