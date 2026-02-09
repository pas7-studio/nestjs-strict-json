import type { ICache } from './interface.js';

/**
 * Null-об'єктна реалізація інтерфейсу ICache.
 *
 * Цей клас реалізує патерн Null Object для сценаріїв, коли кешування має бути відключено.
 * Всі операції є no-op (no operation), що дозволяє замінювати реальний кеш на цей
 * без зміни логіки коду, що використовує кеш.
 *
 * Ця реалізація корисна для:
 * - Відключення кешування при тестуванні
 * - Сценаріїв, де кешування не потрібно
 * - Тимчасового вимкнення кешування для дебагінгу
 *
 * @template K - Тип ключа кешу (за замовчуванням string)
 * @template V - Тип значення, що зберігається в кеші
 *
 * @example
 * ```typescript
 * const cache: ICache<string, MyData> = new NoCache();
 * cache.set('key1', data1); // Не зберігає нічого
 * const data = cache.get('key1'); // Завжди повертає null
 * console.log(cache.size); // 0
 * ```
 */
export class NoCache<K = string, V = unknown> implements ICache<K, V> {
  /**
   * Завжди повертає null, оскільки цей кеш не зберігає ніяких даних.
   *
   * @param _key - Ключ (ігнорується)
   * @returns Завжди null
   *
   * @example
   * ```typescript
   * const cache = new NoCache<string, MyData>();
   * const data = cache.get('any-key'); // null
   * ```
   */
  get(_key: K): V | null {
    return null;
  }

  /**
   * Не зберігає значення - no-op операція.
   *
   * @param _key - Ключ (ігнорується)
   * @param _value - Значення (ігнорується)
   * @param _ttl - TTL (ігнорується)
   *
   * @example
   * ```typescript
   * const cache = new NoCache<string, MyData>();
   * cache.set('key1', data1); // Ніякого ефекту
   * cache.set('key2', data2, 5000); // Ніякого ефекту
   * ```
   */
  set(_key: K, _value: V, _ttl?: number): void {
    // No-op: не зберігає нічого
  }

  /**
   * Завжди повертає false, оскільки цей кеш ніколи не містить даних.
   *
   * @param _key - Ключ (ігнорується)
   * @returns Завжди false
   *
   * @example
   * ```typescript
   * const cache = new NoCache<string, MyData>();
   * console.log(cache.has('any-key')); // false
   * ```
   */
  has(_key: K): boolean {
    return false;
  }

  /**
   * Завжди повертає false, оскільки нічого не видаляється.
   *
   * @param _key - Ключ (ігнорується)
   * @returns Завжди false
   *
   * @example
   * ```typescript
   * const cache = new NoCache<string, MyData>();
   * const wasDeleted = cache.delete('any-key'); // false
   * ```
   */
  delete(_key: K): boolean {
    return false;
  }

  /**
   * No-op операція - нічого не очищає, оскільки кеш завжди порожній.
   *
   * @example
   * ```typescript
   * const cache = new NoCache<string, MyData>();
   * cache.clear(); // Ніякого ефекту
   * console.log(cache.size); // 0
   * ```
   */
  clear(): void {
    // No-op: нічого не очищає
  }

  /**
   * Завжди повертає 0, оскільки цей кеш ніколи не містить записів.
   *
   * @example
   * ```typescript
   * const cache = new NoCache<string, MyData>();
   * console.log(cache.size); // 0
   * ```
   */
  get size(): number {
    return 0;
  }

  /**
   * Завжди повертає 0, оскільки цей кеш не має обмежень на розмір.
   *
   * @example
   * ```typescript
   * const cache = new NoCache<string, MyData>();
   * console.log(cache.maxSize); // 0
   * ```
   */
  get maxSize(): number {
    return 0;
  }
}
