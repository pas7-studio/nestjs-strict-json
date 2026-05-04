/**
 * Validation Module - Модуль для валідації ключів JSON
 * 
 * Цей модуль надає функції та класи для валідації ключів JSON
 * на основі whitelist та blacklist патернів з підтримкою glob синтаксису.
 */

import { KeyPolicyValidator } from './key-policy-validator.js';
import { PatternMatcher } from './pattern-matcher.js';

/**
 * Експорт класів для прямого використання
 */
export { KeyPolicyValidator } from './key-policy-validator.js';
export { PatternMatcher } from './pattern-matcher.js';

// ============================================================================
// Validator Cache Implementation
// ============================================================================

/**
 * Максимальний розмір кешу валідаторів
 * Обмежує кількість кешованих конфігурацій для уникнення memory leaks
 */
const MAX_CACHE_SIZE = 100;

/**
 * Кеш валідаторів для оптимізації продуктивності
 * Зберігає екземпляри KeyPolicyValidator за хешем конфігурації
 */
const validatorCache = new Map<string, KeyPolicyValidator>();

/**
 * Генерує унікальний хеш для конфігурації валідатора
 * 
 * @param whitelist - Масив whitelist патернів
 * @param blacklist - Масив blacklist патернів
 * @param ignoreCase - Чи ігнорувати регістр
 * @returns Унікальний рядок-хеш для конфігурації
 * 
 * @internal
 */
function getConfigHash(
  whitelist?: string[],
  blacklist?: string[],
  ignoreCase?: boolean
): string {
  // Сортуємо масиви для консистентного хешування
  const sortedWhitelist = whitelist ? [...whitelist].sort((a, b) => a.localeCompare(b)) : undefined;
  const sortedBlacklist = blacklist ? [...blacklist].sort((a, b) => a.localeCompare(b)) : undefined;
  
  return JSON.stringify({
    whitelist: sortedWhitelist,
    blacklist: sortedBlacklist,
    ignoreCase
  });
}

/**
 * Отримує або створює кешований валідатор
 * 
 * Ця функція реалізує патерн pooling для валідаторів,
 * що дозволяє уникнути повторного створення об'єктів та
 * повторної компіляції regex патернів.
 * 
 * @param whitelist - Масив glob патернів для whitelist (опціонально)
 * @param blacklist - Масив glob патернів для blacklist (опціонально)
 * @param ignoreCase - Чи ігнорувати регістр при порівнянні (за замовчуванням false)
 * @returns Кешований екземпляр KeyPolicyValidator
 * 
 * @example
 * ```typescript
 * // Отримати кешований валідатор
 * const validator1 = getCachedValidator(['user.*'], ['*.password']);
 * const validator2 = getCachedValidator(['user.*'], ['*.password']);
 * console.log(validator1 === validator2); // true (той самий екземпляр)
 * ```
 */
export function getCachedValidator(
  whitelist?: string[],
  blacklist?: string[],
  ignoreCase: boolean = false
): KeyPolicyValidator {
  const hash = getConfigHash(whitelist, blacklist, ignoreCase);
  
  let validator = validatorCache.get(hash);
  
  if (!validator) {
    // Створюємо новий валідатор якщо немає в кеші
    validator = new KeyPolicyValidator(whitelist, blacklist, ignoreCase);
    
    // Перевіряємо розмір кешу перед додаванням
    if (validatorCache.size >= MAX_CACHE_SIZE) {
      // Видаляємо найстаріший запис (перший в Map)
      const oldestKey = validatorCache.keys().next().value;
      if (oldestKey) {
        validatorCache.delete(oldestKey);
      }
    }
    
    validatorCache.set(hash, validator);
  }
  
  return validator;
}

/**
 * Очищає кеш валідаторів
 * 
 * Корисно для тестування або при зміні конфігурації
 * 
 * @example
 * ```typescript
 * // Очистити кеш перед тестами
 * clearValidatorCache();
 * ```
 */
export function clearValidatorCache(): void {
  validatorCache.clear();
}

/**
 * Отримує поточний розмір кешу валідаторів
 * 
 * @returns Кількість кешованих валідаторів
 * 
 * @example
 * ```typescript
 * console.log(getValidatorCacheSize()); // 5
 * ```
 */
export function getValidatorCacheSize(): number {
  return validatorCache.size;
}

/**
 * Перевіряє чи дозволений ключ на основі whitelist та blacklist
 * 
 * Ця функція забезпечує зворотну сумісність з оригінальною реалізацією
 * isKeyAllowed. Вона використовує кешований KeyPolicyValidator для виконання валідації.
 * 
 * @param key - Ключ для перевірки (наприклад, "$.user" або "$.data.name")
 * @param whitelist - Масив glob патернів (опціонально, наприклад, "user" або "data.*")
 * @param blacklist - Масив glob патернів (опціонально, наприклад, "password" або "*.secret")
 * @param ignoreCase - Чи ігнорувати регістр при порівнянні (за замовчуванням false)
 * @returns true якщо ключ дозволений, інакше false
 * 
 * @example
 * ```typescript
 * // Базове використання без blacklist
 * isKeyAllowed('user.name', ['user.*']); // true
 * isKeyAllowed('user.password', ['user.*']); // true
 * 
 * // З blacklist
 * isKeyAllowed('user.password', ['user.*'], ['*.password']); // false
 * 
 * // Без whitelist (дозволяє все крім blacklist)
 * isKeyAllowed('data.value', undefined, ['*.secret']); // true
 * isKeyAllowed('data.secret', undefined, ['*.secret']); // false
 * 
 * // З JSON pointer префіксом
 * isKeyAllowed('$.user.name', ['user.*']); // true
 * 
 * // З масивними індексами
 * isKeyAllowed('users[0].name', ['users.*.name']); // true
 * 
 * // З подвійними wildcard
 * isKeyAllowed('data.users.items.name', ['data.**.name']); // true
 * 
 * // З ігноруванням регістру
 * isKeyAllowed('User.Name', ['user.*'], undefined, true); // true
 * ```
 * 
 * @remarks
 * Патерни підтримують наступний синтаксис:
 * - `*` - відповідає будь-якому символу крім крапки (один сегмент)
 * - `**` - відповідає будь-яким символам включно з крапками (множинні сегменти)
 * - `?` - відповідає одному символу
 * - `[x]` - відповідає конкретному індексу масиву
 * - `[*]` - відповідає будь-якому індексу масиву
 * 
 * Приклади патернів:
 * - `user` - точний збіг "user"
 * - `user.*` - "user.name", "user.email", тощо
 * - `data.**.name` - "data.name", "data.users.name", "data.users.items.name", тощо
 * - `*.password` - "user.password", "admin.password", тощо
 * - `users[*].id` - "users[0].id", "users[1].id", тощо
 * 
 * @see {@link KeyPolicyValidator} - Клас для більш складних сценаріїв валідації
 * @see {@link PatternMatcher} - Клас для патерн-матчингу
 * @see {@link getCachedValidator} - Функція для отримання кешованого валідатора
 */
export function isKeyAllowed(
  key: string,
  whitelist?: string[],
  blacklist?: string[],
  ignoreCase: boolean = false
): boolean {
  const validator = getCachedValidator(whitelist, blacklist, ignoreCase);
  return validator.isKeyAllowed(key);
}

/**
 * Повертає новий екземпляр KeyPolicyValidator
 * 
 * Ця фабрична функція надає зручний спосіб створення валідатора
 * з опціональними параметрами.
 * 
 * @param whitelist - Масив glob патернів для whitelist (опціонально)
 * @param blacklist - Масив glob патернів для blacklist (опціонально)
 * @param ignoreCase - Чи ігнорувати регістр при порівнянні (за замовчуванням false)
 * @returns Новий екземпляр KeyPolicyValidator
 * 
 * @example
 * ```typescript
 * const validator = createKeyPolicyValidator(
 *   ['user.*', 'data.*'],
 *   ['*.password', '*.secret'],
 *   false
 * );
 * 
 * validator.isKeyAllowed('user.name'); // true
 * validator.isKeyAllowed('user.password'); // false
 * ```
 */
export function createKeyPolicyValidator(
  whitelist?: string[],
  blacklist?: string[],
  ignoreCase: boolean = false
): KeyPolicyValidator {
  return new KeyPolicyValidator(whitelist, blacklist, ignoreCase);
}

/**
 * Повертає новий екземпляр PatternMatcher
 * 
 * Ця фабрична функція надає зручний спосіб створення матчера патернів.
 * 
 * @param patterns - Масив glob патернів для відповідності (за замовчуванням [])
 * @returns Новий екземпляр PatternMatcher
 * 
 * @example
 * ```typescript
 * const matcher = createPatternMatcher(['user.*', 'data.*']);
 * matcher.matches('user.name'); // true
 * matcher.matches('other'); // false
 * ```
 */
export function createPatternMatcher(patterns: string[] = []): PatternMatcher {
  return new PatternMatcher(patterns);
}
