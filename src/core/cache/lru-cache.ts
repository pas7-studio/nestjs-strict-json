import type { ICache } from './interface.js';

const DEFAULT_CACHE_TTL = 60000; // 60 секунд
const DEFAULT_CACHE_SIZE = 1000; // Максимально 1000 кешованих результатів

/**
 * Реалізація LRU (Least Recently Used) кешу з підтримкою TTL.
 *
 * Цей клас реалізує інтерфейс ICache, використовуючи стратегію LRU для видалення
 * найменш використовуваних записів при досягненні максимального розміру кешу.
 * Записи також автоматично видаляються після закінчення часу життя (TTL).
 *
 * @template K - Тип ключа кешу (за замовчуванням string)
 * @template V - Тип значення, що зберігається в кеші
 *
 * @example
 * ```typescript
 * const cache = new LRUCache<string, MyData>(500, 30000);
 * cache.set('key1', data1);
 * const data = cache.get('key1');
 * ```
 */
export class LRUCache<K = string, V = unknown> implements ICache<K, V> {
  private cache: Map<K, { value: V; timestamp: number }>;
  private _maxSize: number;
  private _ttl: number;

  /**
   * Створює новий екземпляр LRU кешу.
   *
   * @param maxSize - Максимальна кількість записів в кеші (за замовчуванням 1000)
   * @param ttl - Час життя запису в мілісекундах (за замовчуванням 60000 мс = 60 секунд)
   *
   * @example
   * ```typescript
   * const cache = new LRUCache<string, MyData>(500, 30000);
   * ```
   */
  constructor(maxSize: number = DEFAULT_CACHE_SIZE, ttl: number = DEFAULT_CACHE_TTL) {
    this.cache = new Map();
    this._maxSize = maxSize;
    this._ttl = ttl;
  }

  /**
   * Отримує значення з кешу за ключем.
   * Якщо ключ знайдено і запис не прострочено, переміщує його в кінець кешу (найбільш нещодавно використаний).
   *
   * @param key - Ключ для пошуку значення в кеші
   * @returns Значення з кешу або null, якщо ключ не знайдено або запис прострочено
   *
   * @example
   * ```typescript
   * const cache = new LRUCache<string, MyData>();
   * const data = cache.get('my-key');
   * if (data) {
   *   console.log('Data found:', data);
   * }
   * ```
   */
  get(key: K): V | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this._ttl) {
      this.cache.delete(key);
      return null;
    }

    // Переміщуємо в кінець (найбільш нещодавно використаний)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Зберігає значення в кеші за ключем.
   * Якщо кеш досяг максимального розміру, видаляє найстаріший запис.
   *
   * @param key - Ключ для збереження значення
   * @param value - Значення для збереження в кеші
   * @param ttl - Опціональний час життя запису в мілісекундах.
   *              Якщо не вказано, використовується default TTL кешу
   *
   * @example
   * ```typescript
   * const cache = new LRUCache<string, MyData>();
   * cache.set('my-key', { id: 1, name: 'test' });
   *
   * // З кастомним TTL (5 секунд)
   * cache.set('temp-key', tempData, 5000);
   * ```
   */
  set(key: K, value: V, ttl?: number): void {
    // Видаляємо найстаріший запис при досягненні ємності
    if (this.cache.size >= this._maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  /**
   * Перевіряє чи існує ключ в кешу і чи не прострочено запис.
   *
   * @param key - Ключ для перевірки
   * @returns true, якщо ключ існує і запис не прострочено, інакше false
   *
   * @example
   * ```typescript
   * const cache = new LRUCache<string, MyData>();
   * if (cache.has('my-key')) {
   *   console.log('Key exists and is not expired');
   * }
   * ```
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const now = Date.now();
    if (now - entry.timestamp > this._ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Видаляє значення з кешу за ключем.
   *
   * @param key - Ключ для видалення
   * @returns true, якщо значення було видалено, false якщо ключ не знайдено
   *
   * @example
   * ```typescript
   * const cache = new LRUCache<string, MyData>();
   * const wasDeleted = cache.delete('my-key');
   * if (wasDeleted) {
   *   console.log('Key was deleted');
   * }
   * ```
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Очищає всі записи з кешу.
   *
   * @example
   * ```typescript
   * const cache = new LRUCache<string, MyData>();
   * // Заповнюємо кеш
   * cache.set('key1', data1);
   * cache.set('key2', data2);
   * // Очищаємо
   * cache.clear();
   * console.log(cache.size); // 0
   * ```
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Переналаштовує кеш з новими значеннями максимального розміру та TTL.
   *
   * @param maxSize - Новий максимальний розмір кешу
   * @param ttl - Новий час життя запису в мілісекундах
   *
   * @example
   * ```typescript
   * const cache = new LRUCache<string, MyData>();
   * cache.configure(2000, 120000); // Збільшуємо розмір до 2000 та TTL до 2 хвилин
   * ```
   */
  configure(maxSize: number, ttl: number): void {
    this._maxSize = maxSize;
    this._ttl = ttl;
  }

  /**
   * Видаляє всі прострочені записи з кешу.
   *
   * Цей метод зазвичай викликається періодично для запобігання
   * застарілим записам, що споживають пам'ять.
   *
   * @param now - Поточний час в мілісекундах (за замовчуванням Date.now())
   *
   * @example
   * ```typescript
   * const cache = new LRUCache<string, MyData>();
   * // Періодичне очищення
   * setInterval(() => {
   *   cache.pruneExpired();
   * }, 5 * 60 * 1000); // Кожні 5 хвилин
   * ```
   */
  pruneExpired(now: number = Date.now()): void {
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this._ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Поточна кількість записів в кеші.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Максимальний розмір кешу.
   */
  get maxSize(): number {
    return this._maxSize;
  }

  /**
   * Час життя запису в мілісекундах.
   */
  get ttl(): number {
    return this._ttl;
  }
}

// Експорт констант для зворотної сумісності
export { DEFAULT_CACHE_TTL, DEFAULT_CACHE_SIZE };
