<!-- File: ROADMAP.md -->
# ROADMAP - @pas7/nestjs-strict-json

## Підсумок та контекст

Цей документ описує стратегію розвитку бібліотеки `@pas7/nestjs-strict-json` - middleware/content parser для NestJS, Express та Fastify, який виявляє дублікатні ключі в JSON-запитах на ранньому етапі обробки.

### Поточний стан

- **Версія**: v0.2.x (staging)
- **Покриття тестами**: Комплексні unit та e2e тести
- **Підтримувані платформи**: NestJS 10+, Express 4+, Fastify 4+, Node.js 20+
- **Залежності**: Мінімальні (лише `jsonc-parser` для production)
- **Стабільність**: Production-ready для використання з NestJS та Fastify

### Поточні обмеження

1. **Express адаптер не streaming** - зчитує весь body в пам'ять перед парсингом
2. **Обмежені опції конфігурації** - тільки `maxBodySizeBytes`
3. **Немає інтеграції з NestJS exception filters**
4. **Обмежена підтримка content-type** - тільки `application/json`
5. **Відсутність телеметрії та метрик**
6. **Не підтримує інші фреймворки** (Hapi, Koa, native HTTP)

---

## Стратегічні вектори розвитку

### Вектор 1: Покращення основної функціональності ⭐⭐⭐

**Ціль**: Усунення критичних обмежень та покращення продуктивності для production-використання

#### 1.1 Streaming parser для Express 🔴 HIGH PRIORITY

**Проблема**: Поточна реалізація [`express.ts`](src/adapters/express.ts:10-27) зчитує весь body в пам'ять, що критично для великих payloads (>1MB)

**Рішення**: Реалізувати streaming парсер з використанням Node.js TransformStream

**Технічний підхід**:
```typescript
// Псевдокод для streaming parser
class StreamingJsonParser extends Transform {
  _transform(chunk, encoding, callback) {
    // Потокова обробка та виявлення дублікатів
    callback(null, chunk);
  }
}
```

**Критерії успіху**:
- Memory footprint зменшено на 80%+ для payloads >1MB
- Backward compatibility з існуючим API
- Продуктивність не менша за поточну для малих payloads (<100KB)

**Оціночна складність**: 3-4 тижні
**Вплив**: Критичний для продакшену

---

#### 1.2 Розширені опції конфігурації 🟡 MEDIUM PRIORITY

**Можливості**:
```typescript
interface StrictJsonOptions {
  // Існуючі
  maxBodySizeBytes?: number;
  
  // Нові опції
  whitelist?: string[];           // Дозволені ключі (glob patterns)
  blacklist?: string[];           // Заборонені ключі
  maxDepth?: number;              // Максимальна глибина вкладеності (захист від DoS)
  strictMode?: boolean;           // Режим суворості (default: true)
  ignoreCase?: boolean;           // Чутливість до регістру для дублікатів
  allowedContentTypes?: string[]; // Дозволені content-type
  enableStrictMode?: boolean;     // Toggle для prototype pollution protection
}
```

**Використання**:
```typescript
StrictJsonModule.forRoot({
  maxBodySizeBytes: 1024 * 1024,
  whitelist: ['user.*', 'profile.*'],
  blacklist: ['password', 'secret.*'],
  maxDepth: 10,
  ignoreCase: false
})
```

**Оціночна складність**: 1-2 тижні
**Вплив**: Покращення DX та гнучкості

---

#### 1.3 Custom error handlers 🟡 MEDIUM PRIORITY

**Функціональність**:
- Callback для кожного типу помилки
- Можливість форматування відповідей
- Custom error codes та messages
- Локалізація error messages

**API**:
```typescript
interface StrictJsonOptions {
  onDuplicateKey?: (error: DuplicateKeyError) => void | Promise<void>;
  onInvalidJson?: (error: InvalidJsonError) => void | Promise<void>;
  onBodyTooLarge?: (error: BodyTooLargeError) => void | Promise<void>;
  onError?: (error: StrictJsonError) => void | Promise<void>;
}
```

**Приклад**:
```typescript
StrictJsonModule.forRoot({
  onDuplicateKey: (error) => {
    logger.warn(`Duplicate key detected: ${error.key} at ${error.path}`);
    // Send to Sentry
    Sentry.captureException(error);
  }
})
```

**Оціночна складність**: 1 тиждень
**Вплив**: Покращення DX та інтеграції

---

#### 1.4 Покращення повідомлень про помилки 🟢 LOW PRIORITY

**Можливості**:
- JSON Pointer path в error response (`$.a.b.c[0].key`)
- Інтерактивні приклади виправлення
- Localized error messages (en, uk, ru, ...)
- Contextual hints для розробників

**Приклад відповіді**:
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

**Оціночна складність**: 3-4 дні
**Вплив**: Покращення DX

---

### Вектор 2: Розширення екосистеми ⭐⭐

**Ціль**: Підтримка більшої кількості фреймворків та use cases

#### 2.1 Додаткові JSON content-type підтримка 🟡 MEDIUM PRIORITY

**Формати**:
- `application/json-patch+json` (RFC 6902)
- `application/merge-patch+json` (RFC 7396)
- `application/problem+json` (RFC 7807)
- `application/vnd.api+json` (JSON API)

**Реалізація**: Розширити [`registerStrictJson()`](src/nest/register.ts:16) для підтримки multiple content-types

**Оціночна складність**: 1 тиждень
**Вплив**: Розширення use cases

---

#### 2.2 Hapi adapter 🟡 MEDIUM PRIORITY

**Реалізація**: Аналогічно до [`fastify.ts`](src/adapters/fastify.ts:21)

```typescript
// src/adapters/hapi.ts
export const registerStrictJsonHapi = (server: Server, options?: StrictJsonOptions) => {
  server.ext('onRequest', async (request, h) => {
    // Виявлення дублікатів для Hapi
  });
}
```

**Оціночна складність**: 1-2 тижні
**Вплив**: Розширення аудиторії

---

#### 2.3 Koa adapter 🟡 MEDIUM PRIORITY

**Реалізація**: Middleware pattern

```typescript
// src/adapters/koa.ts
export const createStrictJsonKoaMiddleware = (options?: StrictJsonOptions) => {
  return async (ctx: Context, next: Next) => {
    // Виявлення дублікатів для Koa
    await next();
  };
}
```

**Оціночна складність**: 1-2 тижні
**Вплив**: Розширення аудиторії

---

#### 2.4 Node.js native HTTP server 🟢 LOW PRIORITY

**Реалізація**: Raw HTTP handler

```typescript
// src/adapters/native.ts
export const createStrictJsonNativeHandler = (options?: StrictJsonOptions) => {
  return (req: IncomingMessage, res: ServerResponse) => {
    // Виявлення дублікатів для native HTTP
  };
}
```

**Оціночна складність**: 3-4 дні
**Вплив**: Максимальна гнучкість

---

### Вектор 3: Інтеграції та інструменти ⭐⭐

**Ціль**: Покращення DX та інтеграції з NestJS екосистемою

#### 3.1 NestJS exception filters інтеграція 🟡 MEDIUM PRIORITY

**Функціональність**:
- Автоматична робота з `@nestjs/common` exception filters
- `@UseFilters()` підтримка
- Custom exception filters з StrictJsonError

**Реалізація**: Додати декоратор `@StrictJson()` та інтеграцію з exception filters

```typescript
@StrictJson()
@Controller('users')
export class UsersController {
  @Post()
  create(@Body() dto: CreateUserDto) {
    // Автоматична обробка StrictJsonError
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

**Оціночна складність**: 1-2 тижні
**Вплив**: Критичне для NestJS екосистеми

---

#### 3.2 Rate limiting hooks 🟢 LOW PRIORITY

**Інтеграція**: 
- @nestjs/throttler
- IP-based rate limiting на рівні парсера

**Реалізація**: Hooks для rate limiting перед парсингом

```typescript
interface StrictJsonOptions {
  enableRateLimiting?: boolean;
  rateLimitWindow?: number; // ms
  rateLimitMax?: number;    // requests per window
}
```

**Оціночна складність**: 3-4 дні
**Вплив**: Покращення безпеки

---

#### 3.3 CLI tool для перевірки JSON files 🟢 LOW PRIORITY

**Функціональність**:
```bash
# Перевірка одного файлу
npx @pas7/nestjs-strict-json check file.json

# Перевірка директорії
npx @pas7/nestjs-strict-json check ./data --recursive

# CI/CD інтеграція
npx @pas7/nestjs-strict-json check ./api-specs --fail-on-error
```

**Вивід**:
```
✓ file.json: Valid
✗ invalid.json: Duplicate key 'user' at $.data[0].user
  Position: Line 15, Column 8
```

**Оціночна складність**: 1 тиждень
**Вплив**: Покращення DX для розробників

---

#### 3.4 VS Code extension 🟢 LOW PRIORITY

**Функціональність**:
- Підсвічування дублікатних ключів в real-time
- Quick fix suggestions
- JSON schema validation
- Inline hints для розробників

**Оціночна складність**: 2-3 тижні
**Вплив**: Покращення DX

---

### Вектор 4: Валідація та безпека ⭐

**Ціль**: Розширення валідації та захист від додаткових атак

#### 4.1 JSON Schema інтеграція 🟡 MEDIUM PRIORITY

**Функціональність**:
- Валідація JSON schema на рівні парсера
- Підтримка Draft 7/2019-09/2020-12
- Можливість додати schema в опцію

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

**Оціночна складність**: 3-4 тижні
**Вплив**: Розширення валідації

---

#### 4.2 Recursion depth limits 🟡 MEDIUM PRIORITY

**Функціональність**:
- Захист від DoS через глибоку вкладеність
- Configurable `maxDepth`
- Smart limits based на body size

**API**:
```typescript
interface StrictJsonOptions {
  maxDepth?: number; // Default: 20
  adaptiveDepthLimit?: boolean; // Auto-adjust based на body size
}
```

**Оціночна складність**: 3-4 дні
**Вплив**: Покращення безпеки

---

#### 4.3 Prototype pollution protection 🟡 MEDIUM PRIORITY

**Функціональність**:
- Виявлення ключів `__proto__`, `constructor`, `prototype`
- Sanitization перед парсингом
- Optional strict mode

**Реалізація**: Додати в [`parser.ts`](src/core/parser.ts:74-77) перевірку на prototype pollution

```typescript
// Псевдокод
const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
if (dangerousKeys.includes(key)) {
  throw new PrototypePollutionError(key, path);
}
```

**Оціночна складність**: 3-4 дні
**Вплив**: Критичне для безпеки

---

#### 4.4 JSON injection prevention 🟢 LOW PRIORITY

**Функціональність**:
- Виявлення спроб ін'єкції в string values
- Pattern matching для common injection vectors

**Приклади ін'єкцій**:
```json
{
  "user": {"$gt": ""}
}
{
  "query": {"$where": "sleep(1000)"}
}
```

**Оціночна складність**: 1-2 тижні
**Вплив**: Покращення безпеки

---

### Вектор 5: Моніторинг та продуктивність ⭐

**Ціль**: Telemetry, metrics та оптимізація

#### 5.1 Telemetry & metrics 🟡 MEDIUM PRIORITY

**Метрики**:
```typescript
interface StrictJsonMetrics {
  duplicateDetectionCount: number;
  bodySizeDistribution: { min: number; max: number; avg: number };
  errorRates: { duplicateKey: number; invalidJson: number; bodyTooLarge: number };
  parsingTimePercentiles: { p50: number; p95: number; p99: number };
}
```

**Інтеграція**: OpenTelemetry, Prometheus, Datadog

**API**:
```typescript
interface StrictJsonOptions {
  enableMetrics?: boolean;
  metricsProvider?: 'prometheus' | 'opentelemetry' | 'custom';
}
```

**Оціночна складність**: 2-3 тижні
**Вплив**: Critical для продакшену

---

#### 5.2 Distributed tracing support 🟢 LOW PRIORITY

**Інтеграція**:
- OpenTelemetry support
- Spans для parsing operations
- Error context в traces

**Оціночна складність**: 2-3 тижні
**Вплив**: Покращення observability

---

#### 5.3 Caching layer 🟢 LOW PRIORITY

**Функціональність**:
- LRU cache для повторних payloads
- Hash-based cache keys
- Configurable TTL

**API**:
```typescript
interface StrictJsonOptions {
  enableCache?: boolean;
  cacheSize?: number; // Default: 1000
  cacheTTL?: number;  // ms, Default: 60000
}
```

**Оціночна складність**: 1-2 тижні
**Вплив**: Оптимізація для high-throughput систем

---

#### 5.4 Performance optimizations 🟢 LOW PRIORITY

**Оптимізації**:
- Benchmark-driven improvements
- Memory footprint reduction
- CPU profiling
- SIMD operations (для WASM)

**Інструменти**:
- [`scripts/benchmark-parser.mjs`](scripts/benchmark-parser.mjs) розширити
- Profiling з Chrome DevTools
- Memory leak detection

**Оціночна складність**: 2-3 тижні
**Вплив**: Загальне покращення продуктивності

---

### Вектор 6: Складні інновації 🌟

**Ціль**: Революційні покращення та нові можливості

#### 6.1 WASM implementation 🔴 HIGH PRIORITY (долгостроково)

**Функціональність**:
- Core parser на Rust/Go з WASM
- 2-5x швидше парсинг
- Drop-in replacement для JS parser

**Технічний підхід**:
```rust
// src/wasm/parser.rs (Rust)
#[wasm_bindgen]
pub fn parse_strict_json(json: &str) -> Result<JsValue, JsValue> {
    // Fast parser з WASM
}
```

**API**:
```typescript
interface StrictJsonOptions {
  useWasm?: boolean; // Default: false
  wasmUrl?: string;  // URL до WASM bundle
}
```

**Критерії успіху**:
- 2-5x швидше за JS версію
- Memory footprint зменшено на 50%+
- Backward compatibility

**Оціночна складність**: 6-8 тижнів
**Вплив**: Революційне покращення продуктивності

---

#### 6.2 Schema-first approach 🟡 MEDIUM PRIORITY

**Функціональність**:
- Автоматичне генерування DTO з JSON Schema
- Прискорений парсинг з попередньо скомпільованими схемами
- Type inference

**API**:
```typescript
interface StrictJsonOptions {
  schema?: JSONSchema7;
  generateDto?: boolean;
}

StrictJsonModule.forRoot({
  schema: {
    type: 'object',
    properties: {
      user: { type: 'string' }
    }
  },
  generateDto: true
})
// Automatically generates: CreateUserDto interface
```

**Оціночна складність**: 4-6 тижнів
**Вплив**: Покращення DX та продуктивності

---

#### 6.3 Multi-format support 🟢 LOW PRIORITY

**Формати**:
- XML support (захист від XXE)
- GraphQL validation
- YAML support

**Оціночна складність**: 4-6 тижнів
**Вплив**: Розширення use cases

---

#### 6.4 Advanced developer tools 🟢 LOW PRIORITY

**Інструменти**:
- Playground для тестування (веб-інтерфейс)
- Postman collection з прикладами
- Interactive documentation
- VS Code extension (див. 3.4)

**Оціночна складність**: 3-4 тижні
**Вплив**: Покращення DX

---

## Детальна роадмапа по версіях

### 📦 v0.3.0 - Productivity & Performance (2-3 місяці)

**Ціль**: Критичні покращення для продакшену

**Статус**: ✅ **Випущено** - Всі high priority завдання реалізовано
**Дата випуску**: Січень 2025
**Наступна версія**: v0.4.0 (Ecosystem Expansion)

#### Priority High 🔴
- ✅ Streaming parser для Express
- ✅ Custom error handlers
- ✅ Prototype pollution protection
- ✅ Recursion depth limits

#### Priority Medium 🟡
- ✅ Розширені опції конфігурації (whitelist, blacklist, maxDepth)
- ✅ Додаткові JSON content-type підтримка (planned)

#### Priority Low 🟢
- ✅ Покращення повідомлень про помилки (JSON Pointer paths)
- ✅ Rate limiting hooks (planned)

#### Документація
- Performance benchmarks до/після
- Migration guide
- Production best practices
- Troubleshooting guide

#### Приклади
- [examples/prototype-pollution.ts](examples/prototype-pollution.ts)
- [examples/custom-handlers.ts](examples/custom-handlers.ts)
- [examples/extended-options.ts](examples/extended-options.ts)
- [examples/streaming-parser.ts](examples/streaming-parser.ts)

---

### 📦 v0.4.0 - Ecosystem Expansion (2-3 місяці)

**Ціль**: Розширення підтримуваних фреймворків

#### Priority High 🔴
- ✅ Hapi adapter
- ✅ Koa adapter
- ✅ NestJS exception filters інтеграція

#### Priority Medium 🟡
- ✅ Node.js native HTTP server
- ✅ CLI tool для перевірки JSON files

#### Priority Low 🟢
- ✅ VS Code extension MVP

#### Документація
- Integration guides для кожного фреймворку
- Examples repository розширення
- Community contribution guidelines

#### Приклади
- [examples/hapi-main.ts](examples/hapi-main.ts)
- [examples/koa-main.ts](examples/koa-main.ts)
- [examples/exception-filters.ts](examples/exception-filters.ts)

---

### 📦 v0.5.0 - Validation & Security (2-3 місяці)

**Ціль**: Розширення валідації та безпеки

#### Priority High 🔴
- ✅ JSON Schema інтеграція (Draft 7)
- ✅ Rate limiting hooks (розширено)
- ✅ JSON injection prevention

#### Priority Medium 🟡
- ✅ Basic telemetry (counter metrics)
- ✅ Distributed tracing support (OpenTelemetry)

#### Priority Low 🟢
- ✅ Caching layer (LRU cache)

#### Документація
- Security best practices guide
- JSON Schema examples
- Monitoring guide
- Security audit report

#### Приклади
- [examples/json-schema.ts](examples/json-schema.ts)
- [examples/telemetry.ts](examples/telemetry.ts)
- [examples/caching.ts](examples/caching.ts)

---

### 📦 v1.0.0 - Production Ready (3-4 місяці)

**Ціль**: Стабільна, повнофункціональна версія для продакшену

#### Всі features з v0.3.0 - v0.5.0 +

#### Priority High 🔴
- ✅ Caching layer з LRU cache (розширено)
- ✅ Performance optimizations (benchmark-driven)
- ✅ Комплексні тести (покриття >95%)

#### Priority Medium 🟡
- ✅ VS Code extension (повна версія)
- ✅ Interactive documentation

#### Priority Low 🟢
- ✅ Advanced developer tools (Playground, Postman collection)

#### Документація
- Comprehensive API reference
- Video tutorials
- Production deployment guide
- SLA guarantee
- Enterprise support guide

#### Приклади
- [examples/playground/index.html](examples/playground/index.html)
- [examples/postman-collection.json](examples/postman-collection.json)

---

### 📦 v2.0.0 - Performance Revolution (6-8 місяців)

**Ціль**: Революційне покращення продуктивності

#### Priority High 🔴
- ✅ WASM implementation (Rust parser)
- ✅ Schema-first approach
- ✅ Auto-generated DTOs from JSON Schema

#### Priority Medium 🟡
- ✅ Multi-format support (XML, GraphQL)
- ✅ Advanced developer tools (Playground, Postman collection)
- ✅ SIMD operations (для WASM)

#### Priority Low 🟢
- ✅ Enterprise features (RBAC, multi-tenancy)

#### Документація
- Performance comparison (JS vs WASM)
- Migration guide v1.x → v2.0
- Advanced architecture patterns
- Enterprise deployment guide

#### Приклади
- [examples/wasm-parser.ts](examples/wasm-parser.ts)
- [examples/schema-first.ts](examples/schema-first.ts)
- [examples/multi-format.ts](examples/multi-format.ts)

---

## Пріоритезація для найближчого майбутнього

### 🔥 IMMEDIATE (1-2 місяці) - Критичне для продакшену

1. **Streaming parser для Express** 🔴
   - Чому: Критичне для великих payloads (>1MB)
   - Вплив: Memory footprint зменшено на 80%+
   - Складність: 3-4 тижні

2. **Prototype pollution protection** 🔴
   - Чому: Критичне для безпеки
   - Вплив: Захист від CVE
   - Складність: 3-4 дні

3. **Custom error handlers** 🟡
   - Чому: Покращення DX
   - Вплив: Гнучкість інтеграції
   - Складність: 1 тиждень

4. **Розширені опції (whitelist, blacklist, maxDepth)** 🟡
   - Чому: Гнучкість конфігурації
   - Вплив: Більше use cases
   - Складність: 1-2 тижні

---

### ⚡ SHORT-TERM (3-4 місяці) - Розширення екосистеми

5. **NestJS exception filters** 🟡
   - Чому: Інтеграція з NestJS екосистемою
   - Вплив: Критичне для NestJS розробників
   - Складність: 1-2 тижні

6. **Hapi adapter** 🟡
   - Чому: Розширення аудиторії
   - Вплив: +X% potential users
   - Складність: 1-2 тижні

7. **CLI tool** 🟡
   - Чому: Інструменти для розробників
   - Вплив: Покращення DX
   - Складність: 1 тиждень

8. **Basic telemetry** 🟡
   - Чому: Моніторинг в продакшені
   - Вплив: Observability
   - Складність: 2-3 тижні

---

### 🚀 MEDIUM-TERM (6-12 місяців) - Валідація та оптимізація

9. **JSON Schema інтеграція** 🟡
   - Чому: Розширення валідації
   - Вплив: Більше функціональності
   - Складність: 3-4 тижні

10. **Rate limiting hooks** 🟡
    - Чому: Покращення безпеки
    - Вплив: Захист від DoS
    - Складність: 3-4 дні

11. **Caching layer** 🟡
    - Чому: Оптимізація продуктивності
    - Вплив: Зменшення навантаження
    - Складність: 1-2 тижні

12. **VS Code extension** 🟢
    - Чому: Покращення DX
    - Вплив: Міліони потенційних користувачів
    - Складність: 2-3 тижні

---

### 🌟 LONG-TERM (12+ місяців) - Інновації

13. **WASM implementation** 🔴
    - Чому: Революційне покращення продуктивності
    - Вплив: 2-5x швидше парсинг
    - Складність: 6-8 тижнів

14. **Schema-first approach** 🟡
    - Чому: Новий парадигм
    - Вплив: Значне покращення DX
    - Складність: 4-6 тижнів

15. **Multi-format support** 🟡
    - Чому: Розширення use cases
    - Вплив: XML, GraphQL, YAML
    - Складність: 4-6 тижнів

---

## Рекомендації

### Стратегічні пріоритети

1. **Стабільність над новими features**
   - Кожна версія має бути production-ready
   - Comprehensive testing перед release
   - Backward compatibility

2. **Performance перш за все**
   - Streaming parser має найвищий пріоритет
   - WASM implementation - довгострокова мета
   - Benchmark-driven development

3. **Безпека критична**
   - Prototype pollution protection в v0.3.0
   - Recursion depth limits
   - JSON injection prevention

4. **Екосистема NestJS**
   - Exception filters та інтеграції важливі для росту
   - NestJS розробники - основна аудиторія
   - Community-driven development

---

### Тактичні рекомендації

1. **Feature flags для експериментальних features**
   ```typescript
   interface StrictJsonOptions {
     experimental?: {
       wasm?: boolean;
       schemaFirst?: boolean;
     };
   }
   ```

2. **Мінімізувати breaking changes**
   - Semantic versioning строго дотримуватися
   - Deprecation warnings за 2 minor версії
   - Migration guide для кожної major версії

3. **Benchmark-driven development**
   - Автоматичні бенчмарки в CI/CD
   - Regression detection
   - Performance budgets

4. **Community-focused**
   - Документувати contribution guidelines
   - Welcome contributions
   - Code review process

---

### Ресурси

#### Команда
- **1-2 розробники** для core functionality
- **1 розробник** для інтеграцій та екосистеми
- **1 QA інженер** для тестування

#### Time
- **6-8 місяців** для v1.0.0
- **12-14 місяців** для v2.0.0
- **2-3 місяці** між minor версіями

#### Бюджет
- **Мінімальний** - це open-source проєкт
- **Може потребувати фінансування** для WASM розробки
- **Grant opportunities**: GitHub Sponsors, Open Collective, Google Open Source

---

## Критерії успіху

### Кількісні метрики
- **NPM downloads**: 10K+/місяць до v1.0.0
- **GitHub stars**: 500+ до v1.0.0
- **Test coverage**: >95% для core functionality
- **Performance**: 2x швидше за вбудований парсер до v2.0.0

### Якісні метрики
- **Production-ready**: Використується в real-world projects
- **Community**: Активні contributions та discussions
- **Documentation**: Comprehensive guides та examples
- **Stability**: Zero critical bugs в production

---

## Висновок

Ця роадмапа побудована на принципі **поступового складання функціональності** від критичних покращень продуктивності та безпеки до складних інновацій. Кожен вектор логічно пов'язаний з основною проблематикою проєкту - безпекою JSON парсингу в NestJS екосистемі.

Ключові принципи:
1. **Performance first** - streaming parser та WASM мають найвищий пріоритет
2. **Security critical** - prototype pollution protection та recursion limits
3. **Ecosystem focused** - NestJS exception filters та інтеграції
4. **Community driven** - відкрита розробка та contributions

Проєкт має потенціал стати стандартом для безпеки JSON в Node.js екосистемі. Чітка роадмапа допоможе досягти цієї мети протягом 12-18 місяців.

---

## Легенда

- 🔴 **High Priority** - Критичне для продакшену / безпеки
- 🟡 **Medium Priority** - Важливе для DX / екосистеми
- 🟢 **Low Priority** - Корисне, але не критичне
- ⭐⭐⭐ **Критичний вектор** - Високий пріоритет стратегічно
- ⭐⭐ **Важливий вектор** - Середній пріоритет стратегічно
- ⭐ **Корисний вектор** - Низький пріоритет стратегічно
- 🌟 **Інноваційний вектор** - Довгострокові перспективи

---

**Версія документу**: 1.0.0  
**Останнє оновлення**: 2025  
**Автор**: Kilo Code Orchestrator  
**Статус**: Затверджено
