/**
 * Інтерфейс для абстракції системи кешування.
 * Цей інтерфейс дозволяє легко замінювати стратегію кешування
 * та покращує тестованість коду через Dependency Inversion Principle.
 *
 * @template K - Тип ключа кешу (за замовчуванням string)
 * @template V - Тип значення, що зберігається в кеші
 */
export interface ICache<K = string, V = unknown> {
  /**
   * Отримує значення з кешу за ключем.
   *
   * @param key - Ключ для пошуку значення в кеші
   * @returns Значення з кешу або null, якщо ключ не знайдено або запис прострочено
   *
   * @example
   * ```typescript
   * const cache: ICache<string, MyData> = createCache();
   * const data = cache.get('my-key');
   * if (data) {
   *   console.log('Data found:', data);
   * }
   * ```
   */
  get(key: K): V | null;

  /**
   * Зберігає значення в кеші за ключем.
   *
   * @param key - Ключ для збереження значення
   * @param value - Значення для збереження в кеші
   * @param ttl - Опціональний час життя запису в мілісекундах.
   *              Якщо не вказано, використовується default TTL кешу
   *
   * @example
   * ```typescript
   * const cache: ICache<string, MyData> = createCache();
   * cache.set('my-key', { id: 1, name: 'test' });
   *
   * // З кастомним TTL (5 секунд)
   * cache.set('temp-key', tempData, 5000);
   * ```
   */
  set(key: K, value: V, ttl?: number): void;

  /**
   * Перевіряє чи існує ключ в кеші і чи не прострочено запис.
   *
   * @param key - Ключ для перевірки
   * @returns true, якщо ключ існує і запис не прострочено, інакше false
   *
   * @example
   * ```typescript
   * const cache: ICache<string, MyData> = createCache();
   * if (cache.has('my-key')) {
   *   console.log('Key exists and is not expired');
   * }
   * ```
   */
  has(key: K): boolean;

  /**
   * Видаляє значення з кешу за ключем.
   *
   * @param key - Ключ для видалення
   * @returns true, якщо значення було видалено, false якщо ключ не знайдено
   *
   * @example
   * ```typescript
   * const cache: ICache<string, MyData> = createCache();
   * const wasDeleted = cache.delete('my-key');
   * if (wasDeleted) {
   *   console.log('Key was deleted');
   * }
   * ```
   */
  delete(key: K): boolean;

  /**
   * Очищає всі записи з кешу.
   *
   * Цей метод видаляє всі елементи з кешу, скидаючи його в початковий стан.
   *
   * @example
   * ```typescript
   * const cache: ICache<string, MyData> = createCache();
   * // Заповнюємо кеш
   * cache.set('key1', data1);
   * cache.set('key2', data2);
   * // Очищаємо
   * cache.clear();
   * console.log(cache.size); // 0
   * ```
   */
  clear(): void;

  /**
   * Поточна кількість записів в кеші.
   *
   * Це readonly властивість, яка повертає поточний розмір кешу.
   *
   * @example
   * ```typescript
   * const cache: ICache<string, MyData> = createCache();
   * console.log(`Cache size: ${cache.size}`);
   * ```
   */
  readonly size: number;

  /**
   * Максимальний розмір кешу.
   *
   * Це readonly властивість, яка повертає максимальну кількість записів,
   * яку може містити кеш. Коли кеш досягає цього розміру,
   * старіші записи автоматично видаляються згідно зі стратегією кешування.
   *
   * @example
   * ```typescript
   * const cache: ICache<string, MyData> = createCache({ cacheSize: 500 });
   * console.log(`Max cache size: ${cache.maxSize}`); // 500
   * ```
   */
  readonly maxSize: number;
}
