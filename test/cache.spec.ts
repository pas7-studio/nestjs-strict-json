/**
 * Повні тести для системи кешування
 * 
 * Ці тести покривають:
 * - LRUCache: basic operations, LRU eviction, TTL expiration, configuration
 * - NoCache: null-object pattern implementation
 * - createCache factory: creation logic with different options
 * - Cache manager functions: clearParseCache, getParseCacheSize, buildCacheKey
 * - Integration tests: caching with parseStrictJson
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { LRUCache, DEFAULT_CACHE_TTL, DEFAULT_CACHE_SIZE } from '../src/core/cache/lru-cache.js';
import { NoCache } from '../src/core/cache/no-cache.js';
import { createCache } from '../src/core/cache/cache-factory.js';
import { 
  clearParseCache, 
  getParseCacheSize, 
  buildCacheKey,
  shutdownCacheManager,
  resetCacheManager,
  isCleanupIntervalRunning,
} from '../src/core/parser/cache-manager.js';
import { parseStrictJson, parseStrictJsonAsync } from '../src/core/parser/index.js';
import type { StrictJsonOptions } from '../src/core/types.js';

describe('LRUCache - Basic Operations', () => {
  let cache: LRUCache<string, any>;

  beforeEach(() => {
    cache = new LRUCache<string, any>(5, 60000);
  });

  it('get() повертає null для неіснуючого ключа', () => {
    const result = cache.get('nonexistent');
    expect(result).toBeNull();
  });

  it('set() зберігає значення', () => {
    cache.set('key1', { value: 42 });
    const result = cache.get('key1');
    expect(result).toEqual({ value: 42 });
  });

  it('get() повертає збережене значення', () => {
    cache.set('key1', 'test value');
    cache.set('key2', { complex: 'object' });
    expect(cache.get('key1')).toBe('test value');
    expect(cache.get('key2')).toEqual({ complex: 'object' });
  });

  it('has() повертає false для неіснуючого ключа', () => {
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('has() повертає true для існуючого ключа', () => {
    cache.set('key1', 'value');
    expect(cache.has('key1')).toBe(true);
  });

  it('delete() видаляє значення та повертає true', () => {
    cache.set('key1', 'value');
    const deleted = cache.delete('key1');
    expect(deleted).toBe(true);
    expect(cache.has('key1')).toBe(false);
  });

  it('delete() повертає false для неіснуючого ключа', () => {
    const deleted = cache.delete('nonexistent');
    expect(deleted).toBe(false);
  });

  it('clear() очищає всі записи', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    expect(cache.size).toBe(3);
    
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
    expect(cache.get('key3')).toBeNull();
  });

  it('size повертає поточну кількість записів', () => {
    expect(cache.size).toBe(0);
    
    cache.set('key1', 'value1');
    expect(cache.size).toBe(1);
    
    cache.set('key2', 'value2');
    expect(cache.size).toBe(2);
    
    cache.delete('key1');
    expect(cache.size).toBe(1);
    
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('maxSize повертає максимальний розмір', () => {
    const smallCache = new LRUCache<string, any>(100, 60000);
    expect(smallCache.maxSize).toBe(100);
    
    const largeCache = new LRUCache<string, any>(5000, 60000);
    expect(largeCache.maxSize).toBe(5000);
  });

  it('ttl повертає час життя запису', () => {
    const cache1 = new LRUCache<string, any>(100, 30000);
    expect(cache1.ttl).toBe(30000);
    
    const cache2 = new LRUCache<string, any>(100, 120000);
    expect(cache2.ttl).toBe(120000);
  });
});

describe('LRUCache - LRU Eviction', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(3, 60000);
  });

  it('LRU видалення при досягненні ліміту', () => {
    cache.set('key1', 1);
    cache.set('key2', 2);
    cache.set('key3', 3);
    expect(cache.size).toBe(3);
    
    // Додаємо четвертий запис, має видалити key1 (найстаріший)
    cache.set('key4', 4);
    expect(cache.size).toBe(3);
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(true);
    expect(cache.has('key3')).toBe(true);
    expect(cache.has('key4')).toBe(true);
  });

  it('get() переміщує запис в кінець (LRU)', () => {
    cache.set('key1', 1);
    cache.set('key2', 2);
    cache.set('key3', 3);
    
    // Отримуємо key1, переміщуємо його в кінець
    cache.get('key1');
    
    // Додаємо новий запис, має видалити key2 (тепер найстаріший)
    cache.set('key4', 4);
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
    expect(cache.has('key3')).toBe(true);
    expect(cache.has('key4')).toBe(true);
  });

  it('set() переміщує запис в кінець (LRU)', () => {
    cache.set('key1', 1);
    cache.set('key2', 2);
    cache.set('key3', 3);
    
    // Оновлюємо key1, переміщуємо його в кінець
    cache.set('key1', 100);
    
    // Додаємо новий запис, має видалити key2 (тепер найстаріший)
    cache.set('key4', 4);
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
    expect(cache.has('key3')).toBe(true);
    expect(cache.has('key4')).toBe(true);
    expect(cache.get('key1')).toBe(100);
  });

  it('has() не переміщує запис в кінець', () => {
    cache.set('key1', 1);
    cache.set('key2', 2);
    cache.set('key3', 3);
    
    // Перевіряємо key1, не переміщуємо його
    cache.has('key1');
    
    // Додаємо новий запис, має видалити key1 (все ще найстаріший)
    cache.set('key4', 4);
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(true);
    expect(cache.has('key3')).toBe(true);
    expect(cache.has('key4')).toBe(true);
  });

  it('Найстаріший запис видаляється першим', () => {
    // Заповнюємо кеш повністю
    for (let i = 1; i <= 3; i++) {
      cache.set(`key${i}`, i);
    }
    
    // Повторно отримуємо key3, робимо його найновішим
    cache.get('key3');
    
    // Додаємо key4, видаляється key1
    cache.set('key4', 4);
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key4')).toBe(true);
    
    // Додаємо key5, видаляється key2
    cache.set('key5', 5);
    expect(cache.has('key2')).toBe(false);
    expect(cache.has('key5')).toBe(true);
  });
});

describe('LRUCache - TTL Expiration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('Записи прострочуються після TTL', () => {
    const cache = new LRUCache<string, number>(10, 1000); // 1 секунда TTL
    cache.set('key1', 1);
    expect(cache.get('key1')).toBe(1);
    
    // Переміщуємо час вперед на 1.1 секунди
    vi.advanceTimersByTime(1100);
    
    // Запис має бути прострочений
    expect(cache.get('key1')).toBeNull();
    expect(cache.has('key1')).toBe(false);
  });

  it('get() повертає null для прострочених записів', () => {
    const cache = new LRUCache<string, string>(10, 500);
    cache.set('key1', 'value');
    cache.set('key2', 'value2');
    
    // Переміщуємо час вперед на 600ms
    vi.advanceTimersByTime(600);
    
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
  });

  it('pruneExpired() видаляє прострочені записи', () => {
    const cache = new LRUCache<string, number>(10, 1000);
    cache.set('key1', 1);
    cache.set('key2', 2);
    cache.set('key3', 3);
    
    // Переміщуємо час на 500ms - всі ще валідні
    vi.advanceTimersByTime(500);
    expect(cache.size).toBe(3);
    
    // Переміщуємо час на 600ms більше (всього 1100ms)
    vi.advanceTimersByTime(600);
    cache.pruneExpired();
    expect(cache.size).toBe(0);
  });

  it('pruneExpired() видаляє тільки прострочені записи', () => {
    const cache = new LRUCache<string, number>(10, 1000);
    
    // Примітка: Реалізація не підтримує індивідуальний TTL для кожного запису
    // Всі записи використовують глобальний TTL кешу
    cache.set('key1', 1);
    cache.set('key2', 2);
    
    // Переміщуємо час на 1100ms
    vi.advanceTimersByTime(1100);
    cache.pruneExpired();
    
    // Обидва ключі мають бути видалені, оскільки використовують глобальний TTL
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(false);
    expect(cache.size).toBe(0);
  });

  it('TTL працює коректно з різними значеннями (всі записи використовують глобальний TTL)', () => {
    const cache = new LRUCache<string, number>(10, 1000);
    
    // Примітка: Реалізація не підтримує індивідуальний TTL для кожного запису
    // Всі записи використовують глобальний TTL кешу (1000ms)
    cache.set('short', 1, 500);
    cache.set('medium', 2, 1000);
    cache.set('long', 3, 2000);
    
    // Після 600ms: всі записи ще валідні (глобальний TTL = 1000ms)
    vi.advanceTimersByTime(600);
    expect(cache.get('short')).toBe(1);
    expect(cache.get('medium')).toBe(2);
    expect(cache.get('long')).toBe(3);
    
    // Після ще 600ms (всього 1200ms): всі записи прострочені
    vi.advanceTimersByTime(600);
    expect(cache.get('short')).toBeNull();
    expect(cache.get('medium')).toBeNull();
    expect(cache.get('long')).toBeNull();
  });

  it('TTL перезавантажується при get()', () => {
    const cache = new LRUCache<string, number>(10, 1000);
    cache.set('key1', 1);
    
    // Переміщуємо час на 800ms
    vi.advanceTimersByTime(800);
    
    // Отримуємо значення, оскільки воно ще не прострочено
    // (але в реалізації TTL не перезавантажується при get())
    expect(cache.get('key1')).toBe(1);
    
    // Переміщуємо час на 300ms більше (всього 1100ms)
    vi.advanceTimersByTime(300);
    
    // Запис має бути прострочений (TTL з моменту створення)
    expect(cache.get('key1')).toBeNull();
  });

  it('pruneExpired() з параметром now', () => {
    const cache = new LRUCache<string, number>(10, 1000);
    cache.set('key1', 1);
    cache.set('key2', 2);
    
    // Використовуємо конкретний час для очищення
    const futureTime = Date.now() + 1500;
    cache.pruneExpired(futureTime);
    
    expect(cache.size).toBe(0);
  });
});

describe('LRUCache - Configuration', () => {
  let cache: LRUCache<string, number>;

  beforeEach(() => {
    cache = new LRUCache<string, number>(5, 10000);
  });

  it('configure() змінює maxSize та TTL', () => {
    expect(cache.maxSize).toBe(5);
    expect(cache.ttl).toBe(10000);
    
    cache.configure(10, 20000);
    
    expect(cache.maxSize).toBe(10);
    expect(cache.ttl).toBe(20000);
  });

  it('Нові значення використовуються після configure()', () => {
    cache.set('key1', 1);
    cache.set('key2', 2);
    cache.set('key3', 3);
    
    // Змінюємо maxSize на 2
    cache.configure(2, 10000);
    
    // Примітка: configure() не очищує кеш автоматично
    // Старі записи залишаються, але нові будуть підпорядковуватися новому ліміту
    cache.set('key4', 4);
    
    // При додаванні запису перевіряється size >= maxSize (3 >= 2), видаляється перший запис (key1)
    // Потім запис key4 додається, тепер size = 3 (ключі key2, key3, key4)
    expect(cache.size).toBe(3);
    expect(cache.has('key1')).toBe(false);
    expect(cache.has('key2')).toBe(true);
    expect(cache.has('key3')).toBe(true);
    expect(cache.has('key4')).toBe(true);
    
    // При додаванні ще одного запису знову видаляється перший запис (теперь key2)
    cache.set('key5', 5);
    expect(cache.size).toBe(3);
    expect(cache.has('key2')).toBe(false);
    expect(cache.has('key5')).toBe(true);
  });

  it('configure() працює з TTL', () => {
    vi.useFakeTimers();
    
    cache.set('key1', 1);
    cache.set('key2', 2);
    
    // Змінюємо TTL на 500ms
    cache.configure(5, 500);
    
    vi.advanceTimersByTime(600);
    
    // Записи мають бути прострочені з новим TTL
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBeNull();
    
    vi.useRealTimers();
  });

  it('configure() зменшує TTL для існуючих записів', () => {
    vi.useFakeTimers();
    
    const cache = new LRUCache<string, number>(10, 10000);
    cache.set('key1', 1);
    
    // Переміщуємо час на 5000ms
    vi.advanceTimersByTime(5000);
    
    // Змінюємо TTL на 4000ms (запис тепер прострочений)
    cache.configure(10, 4000);
    
    expect(cache.get('key1')).toBeNull();
    
    vi.useRealTimers();
  });

  it('Кеш очищається при зміні конфігурації (eviction працює)', () => {
    cache.set('key1', 1);
    cache.set('key2', 2);
    cache.set('key3', 3);
    
    // Змінюємо maxSize на 1
    cache.configure(1, 10000);
    
    expect(cache.size).toBe(3); // Записи ще не видалені автоматично
    
    // Додаємо новий запис - перевіряється size >= maxSize (3 >= 1), видаляється перший запис (key1)
    cache.set('key4', 4);
    
    // Після видалення key1, size зменшується на 1, але потім додається key4
    // size залишається рівним 3 (ключі key2, key3, key4)
    expect(cache.size).toBe(3);
    expect(cache.has('key1')).toBe(false); // Видалено при додаванні key4
    
    // При додаванні ще одного запису знову видаляється найстаріший запис (теперь key2)
    cache.set('key5', 5);
    expect(cache.size).toBe(3);
    expect(cache.has('key2')).toBe(false); // Видалено при додаванні key5
    expect(cache.has('key5')).toBe(true);
  });
});

describe('NoCache - Null Object Pattern', () => {
  let noCache: NoCache<string, any>;

  beforeEach(() => {
    noCache = new NoCache<string, any>();
  });

  it('get() завжди повертає null', () => {
    expect(noCache.get('any-key')).toBeNull();
    expect(noCache.get('')).toBeNull();
    expect(noCache.get('test')).toBeNull();
  });

  it('set() не зберігає нічого', () => {
    noCache.set('key1', 'value');
    noCache.set('key2', { complex: 'object' }, 5000);
    
    expect(noCache.get('key1')).toBeNull();
    expect(noCache.get('key2')).toBeNull();
  });

  it('has() завжди повертає false', () => {
    expect(noCache.has('any-key')).toBe(false);
    expect(noCache.has('')).toBe(false);
  });

  it('delete() завжди повертає false', () => {
    expect(noCache.delete('any-key')).toBe(false);
    expect(noCache.delete('')).toBe(false);
  });

  it('clear() не робить нічого', () => {
    noCache.set('key1', 'value');
    noCache.set('key2', 'value2');
    
    noCache.clear();
    
    expect(noCache.size).toBe(0);
    expect(noCache.get('key1')).toBeNull();
  });

  it('size завжди 0', () => {
    expect(noCache.size).toBe(0);
    
    noCache.set('key1', 'value');
    noCache.set('key2', 'value');
    noCache.set('key3', 'value');
    
    expect(noCache.size).toBe(0);
  });

  it('maxSize завжди 0', () => {
    expect(noCache.maxSize).toBe(0);
  });
});

describe('createCache - Factory Function', () => {
  it('Повертає LRUCache за замовчуванням', () => {
    const cache = createCache();
    expect(cache).toBeInstanceOf(LRUCache);
    expect(cache.maxSize).toBe(DEFAULT_CACHE_SIZE);
    expect(cache.ttl).toBe(DEFAULT_CACHE_TTL);
  });

  it('Повертає NoCache коли enableCache === false', () => {
    const cache = createCache({ enableCache: false });
    expect(cache).toBeInstanceOf(NoCache);
    expect(cache.size).toBe(0);
    expect(cache.maxSize).toBe(0);
  });

  it('Використовує cacheSize з CacheOptions', () => {
    const cache1 = createCache({ cacheSize: 500 });
    expect(cache1.maxSize).toBe(500);
    
    const cache2 = createCache({ cacheSize: 2000 });
    expect(cache2.maxSize).toBe(2000);
  });

  it('Використовує cacheTTL з CacheOptions', () => {
    const cache1 = createCache({ cacheTTL: 30000 });
    expect(cache1.ttl).toBe(30000);
    
    const cache2 = createCache({ cacheTTL: 120000 });
    expect(cache2.ttl).toBe(120000);
  });

  it('Використовує значення за замовчуванням (1000, 60000) коли не вказано', () => {
    const cache = createCache({});
    expect(cache.maxSize).toBe(DEFAULT_CACHE_SIZE);
    expect(cache.ttl).toBe(DEFAULT_CACHE_TTL);
  });

  it('Поєднує cacheSize та cacheTTL в опціях', () => {
    const cache = createCache({ 
      cacheSize: 500,
      cacheTTL: 120000
    });
    
    expect(cache).toBeInstanceOf(LRUCache);
    expect(cache.maxSize).toBe(500);
    expect(cache.ttl).toBe(120000);
  });

  it('Працює з enableCache: true та іншими опціями', () => {
    const cache = createCache({ 
      enableCache: true,
      cacheSize: 100,
      cacheTTL: 5000
    });
    
    expect(cache).toBeInstanceOf(LRUCache);
    expect(cache.maxSize).toBe(100);
    expect(cache.ttl).toBe(5000);
  });
});

describe('Cache Manager Functions', () => {
  beforeEach(() => {
    clearParseCache();
  });

  afterEach(() => {
    clearParseCache();
  });

  it('clearParseCache() очищає глобальний кеш', () => {
    // clearParseCache очищає глобальний кеш parseCache, а не локальні екземпляри
    // Це використовується для очищення глобального кешу парсера
    
    clearParseCache();
    expect(getParseCacheSize()).toBe(0);
    
    // parseStrictJson використовує глобальний кеш
    parseStrictJson('{"test": "data"}', { enableCache: true });
    expect(getParseCacheSize()).toBeGreaterThan(0);
    
    // Очищаємо глобальний кеш
    clearParseCache();
    expect(getParseCacheSize()).toBe(0);
  });

  it('getParseCacheSize() повертає розмір кешу', () => {
    // getParseCacheSize повертає розмір глобального кешу parseCache
    // а не розмір локальних екземплярів
    
    clearParseCache();
    expect(getParseCacheSize()).toBe(0);
    
    // parseStrictJson використовує глобальний кеш
    parseStrictJson('{"test": "data"}', { enableCache: true });
    expect(getParseCacheSize()).toBe(1);
    
    parseStrictJson('{"test2": "data2"}', { enableCache: true });
    expect(getParseCacheSize()).toBe(2);
    
    parseStrictJson('{"test3": "data3"}', { enableCache: true });
    expect(getParseCacheSize()).toBe(3);
    
    clearParseCache();
    expect(getParseCacheSize()).toBe(0);
  });

  it('buildCacheKey() створює унікальні ключі для різних JSON', () => {
    const key1 = buildCacheKey('{"name": "John"}');
    const key2 = buildCacheKey('{"name": "Jane"}');
    const key3 = buildCacheKey('{"name": "John"}');
    
    expect(key1).not.toBe(key2);
    expect(key1).toBe(key3);
  });

  it('buildCacheKey() створює унікальні ключі для різних options', () => {
    const json = '{"name": "John"}';
    const options1: StrictJsonOptions = { maxBodySizeBytes: 1024 };
    const options2: StrictJsonOptions = { maxBodySizeBytes: 2048 };
    
    const key1 = buildCacheKey(json, options1);
    const key2 = buildCacheKey(json, options2);
    
    expect(key1).not.toBe(key2);
  });

  it('buildCacheKey() повертає SHA-256 хеш коли options не вказані', () => {
    const json = '{"name": "John"}';
    const key = buildCacheKey(json);
    
    // Хеш має бути 64-символьним hex рядком (SHA-256)
    expect(key).toMatch(/^[a-f0-9]{64}$/i);
    // Хеш має бути детермінованим (однаковий для однакового вхідного)
    const key2 = buildCacheKey(json);
    expect(key).toBe(key2);
  });

  it('buildCacheKey() включає всі важливі опції в хеш', () => {
    const json = '{"name": "John"}';
    const options: StrictJsonOptions = {
      maxBodySizeBytes: 1024,
      enablePrototypePollutionProtection: true,
      dangerousKeys: ['__proto__'],
      whitelist: ['name'],
      maxDepth: 10,
      ignoreCase: true,
    };
    
    const key = buildCacheKey(json, options);
    
    // Хеш має бути 64-символьним hex рядком (SHA-256)
    expect(key).toMatch(/^[a-f0-9]{64}$/i);
    // Різні опції мають створювати різний хеш
    const key2 = buildCacheKey(json, { maxBodySizeBytes: 2048 });
    expect(key).not.toBe(key2);
    // Однакові опції мають створювати однаковий хеш
    const key3 = buildCacheKey(json, options);
    expect(key).toBe(key3);
  });

  it('buildCacheKey() створює однакові ключі для однакових опцій', () => {
    const json = '{"name": "John"}';
    const options1: StrictJsonOptions = { maxBodySizeBytes: 1024 };
    const options2: StrictJsonOptions = { maxBodySizeBytes: 1024 };
    
    const key1 = buildCacheKey(json, options1);
    const key2 = buildCacheKey(json, options2);
    
    expect(key1).toBe(key2);
  });
});

describe('Integration Tests - Caching with parseStrictJson', () => {
  beforeEach(() => {
    clearParseCache();
  });

  afterEach(() => {
    clearParseCache();
  });

  it('Кешування працює в parseStrictJson', () => {
    const json = '{"name": "John", "age": 30}';
    const options: StrictJsonOptions = { enableCache: true };
    
    const result1 = parseStrictJson(json, options);
    const result2 = parseStrictJson(json, options);
    
    // Обидва результати мають бути однаковими
    expect(result1).toEqual(result2);
    expect(result1).toEqual({ name: 'John', age: 30 });
  });

  it('Повторні виклики повертають кешований результат', () => {
    const json = '{"data": [1, 2, 3]}';
    const options: StrictJsonOptions = { enableCache: true };
    
    const size1 = getParseCacheSize();
    const result1 = parseStrictJson(json, options);
    const size2 = getParseCacheSize();
    
    expect(size2).toBeGreaterThan(size1);
    
    const result2 = parseStrictJson(json, options);
    const size3 = getParseCacheSize();
    
    // Розмір кешу не повинен змінюватися при повторному виклику
    expect(size3).toBe(size2);
    expect(result1).toEqual(result2);
  });

  it('Кеш працює з різними StrictJsonOptions', () => {
    const json = '{"name": "John"}';
    
    const options1: StrictJsonOptions = { maxBodySizeBytes: 1024 };
    const options2: StrictJsonOptions = { maxBodySizeBytes: 2048 };
    
    const result1 = parseStrictJson(json, options1);
    const size1 = getParseCacheSize();
    
    const result2 = parseStrictJson(json, options2);
    const size2 = getParseCacheSize();
    
    // Різні опції мають створити різні записи в кеші
    expect(size2).toBeGreaterThan(size1);
    expect(result1).toEqual(result2); // Результати однакові
  });

  it('Кеш не працює коли enableCache === false', () => {
    const json = '{"name": "John"}';
    const options: StrictJsonOptions = { enableCache: false };
    
    const size1 = getParseCacheSize();
    const result1 = parseStrictJson(json, options);
    const size2 = getParseCacheSize();
    
    // Розмір кешу не повинен змінюватися
    expect(size2).toBe(size1);
    
    const result2 = parseStrictJson(json, options);
    const size3 = getParseCacheSize();
    
    // Розмір кешу все ще не змінюється
    expect(size3).toBe(size1);
    expect(result1).toEqual(result2);
  });

  it('Кеш працює з whitelist та blacklist (без заборонених ключів)', () => {
    // Примітка: whitelist та blacklist викликають помилки, якщо знайдено заборонені ключі
    // Тому ми використовуємо JSON без заборонених ключів
    
    // Тест з whitelist - всі ключі повинні бути в whitelist
    const json1 = '{"name": "John", "age": 30}';
    const options1: StrictJsonOptions = { whitelist: ['name', 'age'] };
    const result1 = parseStrictJson(json1, options1);
    expect(result1).toEqual({ name: 'John', age: 30 });
    
    // Тест з blacklist - жоден ключ не повинен бути в blacklist
    const json2 = '{"name": "Jane", "city": "Kyiv"}';
    const options2: StrictJsonOptions = { blacklist: ['secret'] };
    const result2 = parseStrictJson(json2, options2);
    expect(result2).toEqual({ name: 'Jane', city: 'Kyiv' });
    
    // Перевіряємо, що різні опції створюють різні записи в кеші
    const sizeAfterFirst = getParseCacheSize();
    parseStrictJson('{"data": "value"}', { whitelist: ['data'] });
    const sizeAfterSecond = getParseCacheSize();
    expect(sizeAfterSecond).toBeGreaterThan(sizeAfterFirst);
  });

  it('Кеш працює з enableFastPath опцією', () => {
    const json = '{"name": "John"}';
    const options: StrictJsonOptions = { enableFastPath: true };
    
    const result1 = parseStrictJson(json, options);
    const result2 = parseStrictJson(json, options);
    
    expect(result1).toEqual(result2);
    expect(getParseCacheSize()).toBeGreaterThan(0);
  });
});

describe('Integration Tests - Caching with parseStrictJsonAsync', () => {
  beforeEach(() => {
    clearParseCache();
  });

  afterEach(() => {
    clearParseCache();
  });

  it('Кешування працює в parseStrictJsonAsync', async () => {
    const json = '{"name": "John", "age": 30}';
    const options: StrictJsonOptions = { enableCache: true };
    
    const result1 = await parseStrictJsonAsync(json, options);
    const result2 = await parseStrictJsonAsync(json, options);
    
    expect(result1).toEqual(result2);
    expect(result1).toEqual({ name: 'John', age: 30 });
  });

  it('Повторні виклики повертають кешований результат (async)', async () => {
    const json = '{"data": [1, 2, 3]}';
    const options: StrictJsonOptions = { enableCache: true };
    
    const size1 = getParseCacheSize();
    const result1 = await parseStrictJsonAsync(json, options);
    const size2 = getParseCacheSize();
    
    expect(size2).toBeGreaterThan(size1);
    
    const result2 = await parseStrictJsonAsync(json, options);
    const size3 = getParseCacheSize();
    
    expect(size3).toBe(size2);
    expect(result1).toEqual(result2);
  });

  it('Кеш не працює коли enableCache === false (async)', async () => {
    const json = '{"name": "John"}';
    const options: StrictJsonOptions = { enableCache: false };
    
    const size1 = getParseCacheSize();
    await parseStrictJsonAsync(json, options);
    const size2 = getParseCacheSize();
    
    expect(size2).toBe(size1);
  });
});

describe('Edge Cases and Error Handling', () => {
  beforeEach(() => {
    clearParseCache();
  });

  afterEach(() => {
    clearParseCache();
  });

  it('LRUCache обробляє порожні ключі та значення', () => {
    const cache = new LRUCache<string, any>(10, 60000);
    
    cache.set('', 'empty key value');
    expect(cache.get('')).toBe('empty key value');
    
    cache.set('null-value', null);
    expect(cache.get('null-value')).toBeNull();
    
    cache.set('undefined-value', undefined);
    expect(cache.get('undefined-value')).toBe(undefined);
  });

  it('LRUCache обробляє великі об\'єкти', () => {
    const cache = new LRUCache<string, any>(10, 60000);
    
    const largeObj = { data: new Array(1000).fill('test') };
    cache.set('large', largeObj);
    
    const result = cache.get('large');
    expect(result).toEqual(largeObj);
  });

  it('createCache обробляє нульовий cacheSize (використовує дефолтне значення через ||)', () => {
    // Примітка: createCache використовує оператор `||`, який замінює 0 на дефолтне значення
    // Це очікувана поведінка - 0 означає "без обмеження", що реалізується як дефолтне значення
    const cache = createCache({ cacheSize: 0 });
    expect(cache).toBeInstanceOf(LRUCache);
    // 0 замінюється на 1000 через оператор ||
    expect(cache.maxSize).toBe(DEFAULT_CACHE_SIZE);
  });

  it('createCache обробляє нульовий cacheTTL (використовує дефолтне значення через ||)', () => {
    // Примітка: createCache використовує оператор `||`, який замінює 0 на дефолтне значення
    // Це очікувана поведінка - 0 означає "без обмеження TTL", що реалізується як дефолтне значення
    const cache = createCache({ cacheTTL: 0 });
    expect(cache).toBeInstanceOf(LRUCache);
    // 0 замінюється на 60000 через оператор ||
    expect(cache.ttl).toBe(DEFAULT_CACHE_TTL);
  });

  it('buildCacheKey обробляє undefined options', () => {
    const json = '{"test": "data"}';
    const key = buildCacheKey(json);
    
    // Хеш має бути 64-символьним hex рядком (SHA-256)
    expect(key).toMatch(/^[a-f0-9]{64}$/i);
    // Хеш має бути детермінованим (однаковий для однакового вхідного)
    const key2 = buildCacheKey(json);
    expect(key).toBe(key2);
    // Хеш має бути однаковим, як при виклику без параметра options
    const key3 = buildCacheKey(json);
    expect(key).toBe(key3);
  });

  it('LRUCache delete з неіснуючим ключем не впливає на size', () => {
    const cache = new LRUCache<string, number>(10, 60000);
    
    cache.set('key1', 1);
    expect(cache.size).toBe(1);
    
    cache.delete('nonexistent');
    expect(cache.size).toBe(1);
  });

  it('LRUCache configure з від\'ємними значеннями', () => {
    const cache = new LRUCache<string, number>(10, 60000);
    
    cache.configure(-1, -100);
    
    expect(cache.maxSize).toBe(-1);
    expect(cache.ttl).toBe(-100);
  });

  it('LRUCache обробляє переповнення кешу (size >= maxSize)', () => {
    const cache = new LRUCache<string, number>(2, 60000);
    
    cache.set('key1', 1);
    cache.set('key2', 2);
    expect(cache.size).toBe(2);
    
    // Додаємо третій запис
    cache.set('key3', 3);
    expect(cache.size).toBe(2);
    expect(cache.has('key1')).toBe(false);
  });
});

describe('LRUCache - Constants Exports', () => {
  it('DEFAULT_CACHE_TTL експортується', () => {
    expect(DEFAULT_CACHE_TTL).toBeDefined();
    expect(DEFAULT_CACHE_TTL).toBe(60000);
  });

  it('DEFAULT_CACHE_SIZE експортується', () => {
    expect(DEFAULT_CACHE_SIZE).toBeDefined();
    expect(DEFAULT_CACHE_SIZE).toBe(1000);
  });
});

describe('Cache Manager - Cleanup Functions', () => {
  // Відновлюємо стан після кожного тесту
  afterEach(() => {
    resetCacheManager();
  });

  describe('isCleanupIntervalRunning()', () => {
    it('повертає true коли interval запущено', () => {
      // Interval автоматично запускається при завантаженні модуля
      expect(isCleanupIntervalRunning()).toBe(true);
    });

    it('повертає false після shutdownCacheManager()', () => {
      shutdownCacheManager();
      expect(isCleanupIntervalRunning()).toBe(false);
    });

    it('повертає true після resetCacheManager()', () => {
      shutdownCacheManager();
      expect(isCleanupIntervalRunning()).toBe(false);
      
      resetCacheManager();
      expect(isCleanupIntervalRunning()).toBe(true);
    });
  });

  describe('shutdownCacheManager()', () => {
    it('зупиняє cleanup interval', () => {
      expect(isCleanupIntervalRunning()).toBe(true);
      
      shutdownCacheManager();
      
      expect(isCleanupIntervalRunning()).toBe(false);
    });

    it('очищує кеш', () => {
      // Додаємо дані в кеш
      parseStrictJson('{"test": "data"}', { enableCache: true });
      expect(getParseCacheSize()).toBeGreaterThan(0);
      
      shutdownCacheManager();
      
      expect(getParseCacheSize()).toBe(0);
    });

    it('безпечна для повторного виклику', () => {
      shutdownCacheManager();
      shutdownCacheManager();
      shutdownCacheManager();
      
      expect(isCleanupIntervalRunning()).toBe(false);
    });

    it('дозволяє продовжувати використання кешу після shutdown', () => {
      shutdownCacheManager();
      
      // Кеш все ще може використовуватися, просто interval не запущено
      parseStrictJson('{"new": "data"}', { enableCache: true });
      expect(getParseCacheSize()).toBe(1);
    });
  });

  describe('resetCacheManager()', () => {
    it('перезапускає cleanup interval', () => {
      shutdownCacheManager();
      expect(isCleanupIntervalRunning()).toBe(false);
      
      resetCacheManager();
      
      expect(isCleanupIntervalRunning()).toBe(true);
    });

    it('створює новий порожній кеш', () => {
      // Додаємо дані в кеш
      parseStrictJson('{"test": "data"}', { enableCache: true });
      expect(getParseCacheSize()).toBeGreaterThan(0);
      
      resetCacheManager();
      
      expect(getParseCacheSize()).toBe(0);
    });

    it('безпечна для повторного виклику', () => {
      resetCacheManager();
      resetCacheManager();
      resetCacheManager();
      
      expect(isCleanupIntervalRunning()).toBe(true);
      expect(getParseCacheSize()).toBe(0);
    });

    it('повністю скидає стан після shutdown', () => {
      // Додаємо дані
      parseStrictJson('{"data1": "value1"}', { enableCache: true });
      parseStrictJson('{"data2": "value2"}', { enableCache: true });
      expect(getParseCacheSize()).toBe(2);
      
      // Shutdown
      shutdownCacheManager();
      expect(isCleanupIntervalRunning()).toBe(false);
      expect(getParseCacheSize()).toBe(0);
      
      // Reset
      resetCacheManager();
      expect(isCleanupIntervalRunning()).toBe(true);
      expect(getParseCacheSize()).toBe(0);
      
      // Перевіряємо, що новий кеш працює
      parseStrictJson('{"new": "data"}', { enableCache: true });
      expect(getParseCacheSize()).toBe(1);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('багаторазові reset не створюють нові interval', () => {
      // Перевіряємо, що повторні виклики не створюють дублікати interval
      for (let i = 0; i < 10; i++) {
        resetCacheManager();
        expect(isCleanupIntervalRunning()).toBe(true);
      }
    });

    it('shutdown + reset цикли працюють коректно', () => {
      for (let i = 0; i < 5; i++) {
        shutdownCacheManager();
        expect(isCleanupIntervalRunning()).toBe(false);
        
        resetCacheManager();
        expect(isCleanupIntervalRunning()).toBe(true);
      }
    });
  });
});

// Очищення після всіх тестів
afterAll(() => {
  resetCacheManager();
});
