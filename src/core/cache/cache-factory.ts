import type { CacheOptions } from '../options/cache-options.js';
import type { ICache } from './interface.js';
import { LRUCache } from './lru-cache.js';
import { NoCache } from './no-cache.js';

/**
 * Створює екземпляр кешу на основі наданих опцій.
 *
 * Ця factory-функція дозволяє створювати кеш з різними конфігураціями
 * відповідно до опцій CacheOptions. Це дозволяє легко керувати
 * кешуванням через конфігурацію без зміни коду.
 *
 * @param options - Опції конфігурації кешу (опціонально)
 * @returns Екземпляр кешу, що реалізує ICache інтерфейс
 *
 * @example
 * ```typescript
 * // Кеш за замовчуванням (увімкнено, 1000 записів, 60 секунд TTL)
 * const cache1 = createCache();
 *
 * // Вимкнений кеш
 * const cache2 = createCache({ enableCache: false });
 *
 * // Кеш з кастомним розміром та TTL
 * const cache3 = createCache({
 *   enableCache: true,
 *   cacheSize: 2000,
 *   cacheTTL: 120000 // 2 хвилини
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Використання в додатку
 * import type { CacheOptions } from './options/cache-options';
 * import { createCache } from './cache/cache-factory';
 *
 * const options: CacheOptions = {
 *   enableCache: true,
 *   cacheSize: 500,
 *   cacheTTL: 30000
 * };
 *
 * const cache = createCache(options);
 * ```
 */
export function createCache(options?: CacheOptions): ICache {
  // Якщо кешування вимкнено, повертаємо NoCache (null-object)
  if (options?.enableCache === false) {
    return new NoCache();
  }

  // Отримуємо розмір кешу з опцій або використовуємо дефолтне значення
  const maxSize = options?.cacheSize || 1000;

  // Отримуємо TTL з опцій або використовуємо дефолтне значення
  const ttl = options?.cacheTTL || 60000;

  // Створюємо та повертаємо LRU кеш з налаштованими параметрами
  return new LRUCache(maxSize, ttl);
}
