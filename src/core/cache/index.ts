/**
 * Пакет системи кешування.
 *
 * Цей модуль надає абстракцію для системи кешування, що дозволяє
 * легко замінювати стратегії кешування та покращує тестованість коду
 * через Dependency Inversion Principle.
 *
 * @module cache
 */

// Експорт інтерфейсу
export type { ICache } from './interface.js';

// Експорт реалізацій
export { LRUCache } from './lru-cache.js';
export { NoCache } from './no-cache.js';

// Експорт factory-функції
export { createCache } from './cache-factory.js';

// Експорт констант для зворотної сумісності
export {
  DEFAULT_CACHE_TTL,
  DEFAULT_CACHE_SIZE,
} from './lru-cache.js';
