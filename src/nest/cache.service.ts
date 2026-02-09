import { Injectable, Inject } from '@nestjs/common';
import type { ICache } from '../core/cache/index.js';
import { STRICT_JSON_CACHE } from './module.js';

/**
 * Символ токена для DI кешу StrictJson.
 * Експорт з module.ts для централізованого управління символами DI.
 */
export { STRICT_JSON_CACHE } from './module.js';

/**
 * Сервіс для управління кешем StrictJson.
 *
 * Цей сервіс надає інтерфейс для управління кешем парсингу JSON
 * через Dependency Injection, що дозволяє легко тестувати
 * та контролювати життєвий цикл кешу.
 *
 * @example
 * ```typescript
 * import { Controller, Get } from '@nestjs/common';
 * import { StrictJsonCacheService } from '@nestjs-strict-json/nest';
 *
 * @Controller('stats')
 * export class StatsController {
 *   constructor(private readonly cacheService: StrictJsonCacheService) {}
 *
 *   @Get()
 *   getStats() {
 *     return {
 *       size: this.cacheService.getSize(),
 *       maxSize: this.cacheService.getMaxSize(),
 *     };
 *   }
 * }
 * ```
 */
@Injectable()
export class StrictJsonCacheService {
  /**
   * Створює новий екземпляр StrictJsonCacheService.
   *
   * @param cache - Екземпляр кешу, що реалізує інтерфейс ICache
   */
  constructor(
    @Inject(STRICT_JSON_CACHE) private readonly cache: ICache,
  ) {}

  /**
   * Очищає всі записи з кешу.
   *
   * Цей метод видаляє всі елементи з кешу, скидаючи його в початковий стан.
   * Корисно для ручного очищення кешу або в критичних ситуаціях.
   *
   * @example
   * ```typescript
   * this.cacheService.clear();
   * console.log('Cache cleared');
   * ```
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Повертає поточну кількість записів в кеші.
   *
   * Цей метод дозволяє моніторити використання кешу та його ефективність.
   *
   * @returns Поточна кількість записів в кеші
   *
   * @example
   * ```typescript
   * const size = this.cacheService.getSize();
   * console.log(`Current cache size: ${size}`);
   * ```
   */
  public getSize(): number {
    return this.cache.size;
  }

  /**
   * Повертає максимальний розмір кешу.
   *
   * Це дозволяє дізнатися конфігурацію кешу та розуміти,
   * наскільки близько він до заповнення.
   *
   * @returns Максимальна кількість записів, яку може містити кеш
   *
   * @example
   * ```typescript
   * const maxSize = this.cacheService.getMaxSize();
   * const currentSize = this.cacheService.getSize();
   * const usagePercent = (currentSize / maxSize) * 100;
   * console.log(`Cache usage: ${usagePercent.toFixed(2)}%`);
   * ```
   */
  public getMaxSize(): number {
    return this.cache.maxSize;
  }

  /**
   * Перевіряє, чи існує ключ в кеші.
   *
   * @param key - Ключ для перевірки
   * @returns true, якщо ключ існує і запис не прострочено, інакше false
   *
   * @example
   * ```typescript
   * if (this.cacheService.hasKey('my-key')) {
   *   console.log('Key exists');
   * }
   * ```
   */
  public hasKey(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Отримує значення з кешу за ключем.
   *
   * @param key - Ключ для пошуку значення в кеші
   * @returns Значення з кешу або null, якщо ключ не знайдено або запис прострочено
   *
   * @example
   * ```typescript
   * const data = this.cacheService.get('my-key');
   * if (data) {
   *   console.log('Data found:', data);
   * }
   * ```
   */
  public get(key: string): unknown {
    return this.cache.get(key);
  }

  /**
   * Видаляє значення з кешу за ключем.
   *
   * @param key - Ключ для видалення
   * @returns true, якщо значення було видалено, false якщо ключ не знайдено
   *
   * @example
   * ```typescript
   * const wasDeleted = this.cacheService.delete('my-key');
   * if (wasDeleted) {
   *   console.log('Key was deleted');
   * }
   * ```
   */
  public delete(key: string): boolean {
    return this.cache.delete(key);
  }
}
