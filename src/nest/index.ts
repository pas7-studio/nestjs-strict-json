/**
 * NestJS модуль для інтеграції StrictJson.
 *
 * Цей модуль надає Dependency Injection для кешу та опцій StrictJson,
 * автоматично реєструє middleware для обробки JSON запитів та
 * забезпечує правильний життєвий цикл кешу з очищенням при знищенні модуля.
 *
 * @module nest
 *
 * @example
 * ```typescript
 * import { Module } from '@nestjs/common';
 * import { StrictJsonModule } from '@nestjs-strict-json/nest';
 *
 * @Module({
 *   imports: [StrictJsonModule.forRoot()],
 * })
 * export class AppModule {}
 * ```
 */

// Експорт модуля та його методів
export { StrictJsonModule } from './module.js';

// Експорт символів токенів для DI
export { STRICT_JSON_OPTIONS, STRICT_JSON_CACHE } from './module.js';

// Експорт сервісу кешу
export { StrictJsonCacheService } from './cache.service.js';

// Експорт функції реєстрації
export { registerStrictJson } from './register.js';

// Експорт типів
export type { StrictJsonOptions } from '../core/types.js';
