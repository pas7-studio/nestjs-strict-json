/**
 * KeyPolicyValidator - Клас для валідації ключів на основі whitelist та blacklist
 * 
 * Цей клас забезпечує перевірку дозволу ключів за допомогою glob патернів,
 * підтримує складні правила whitelist/blacklist та забезпечує зворотну сумісність
 * з оригінальною функцією isKeyAllowed.
 */

import { PatternMatcher } from './pattern-matcher.js';
import { globToRegex } from '../utils.js';

/**
 * Нормалізує ключ для патерн-матчингу
 * 
 * Замінює індекси масиву [x] з [*] для дозволу патернів як "users.*.id"
 * відповідати "users[0].id". Також обробляє вкладені структури масивів.
 * 
 * @param key - Ключ для нормалізації
 * @returns Нормалізований ключ
 * 
 * @private
 */
function normalizeKeyForPatternMatching(key: string): string {
  let normalized = key;

  // Замінюємо індекси масивів [0], [1], [2], тощо на [*]
  // Обробляємо вкладені структури масивів як users[0].profile[0].age
  normalized = normalized.replaceAll(/\[\d+\]/g, '[*]');

  return normalized;
}

/**
 * Клас KeyPolicyValidator для валідації ключів за політикою
 * 
 * @example
 * ```typescript
 * const validator = new KeyPolicyValidator(
 *   ['user.*', 'data.*.name'], // whitelist
 *   ['*.password', '*.secret'], // blacklist
 *   false // ignoreCase
 * );
 * validator.isKeyAllowed('user.name'); // true
 * validator.isKeyAllowed('user.password'); // false (в blacklist)
 * ```
 */
export class KeyPolicyValidator {
  private whitelistMatcher: PatternMatcher;
  private blacklistMatcher: PatternMatcher;
  private whitelistPatterns: string[];
  private blacklistPatterns: string[];
  private ignoreCase: boolean;
  private hasWhitelist: boolean;

  /**
   * Створює новий екземпляр KeyPolicyValidator
   * 
   * @param whitelist - Масив glob патернів для whitelist (опціонально)
   * @param blacklist - Масив glob патернів для blacklist (опціонально)
   * @param ignoreCase - Чи ігнорувати регістр при порівнянні (за замовчуванням false)
   * 
   * @example
   * ```typescript
   * const validator = new KeyPolicyValidator(
   *   ['user.*'],
   *   ['*.password'],
   *   false
   * );
   * ```
   */
  constructor(
    whitelist?: string[],
    blacklist?: string[],
    ignoreCase: boolean = false
  ) {
    this.whitelistPatterns = whitelist || [];
    this.blacklistPatterns = blacklist || [];
    this.hasWhitelist = whitelist !== undefined;
    this.whitelistMatcher = new PatternMatcher(this.whitelistPatterns);
    this.blacklistMatcher = new PatternMatcher(this.blacklistPatterns);
    this.ignoreCase = ignoreCase;
  }

  /**
   * Перевіряє чи дозволений ключ згідно з whitelist та blacklist
   * 
   * Логіка валідації:
   * 1. Якщо whitelist не порожній - перевірити whitelist
   * 2. Якщо ключ пройшов whitelist - перевірити blacklist
   * 3. Повернути результат
   * 
   * @param key - Ключ для перевірки
   * @returns true якщо ключ дозволений, інакше false
   * 
   * @example
   * ```typescript
   * const validator = new KeyPolicyValidator(['user.*'], ['*.password']);
   * validator.isKeyAllowed('user.name'); // true
   * validator.isKeyAllowed('user.password'); // false
   * ```
   */
  isKeyAllowed(key: string): boolean {
    // Нормалізація ключа
    let normalizedKey = key;

    // Видаляємо префікс JSON pointer "$." для патерн-матчингу
    if (normalizedKey.startsWith('$.') || normalizedKey.startsWith('$.')) {
      normalizedKey = normalizedKey.slice(2);
    }

    // Застосовуємо ignoreCase якщо потрібно
    if (this.ignoreCase) {
      normalizedKey = normalizedKey.toLowerCase();
    }

    // Замінюємо індекси масивів [x] з [*] для патерн-матчингу
    // Це дозволяє патернам як "users.*.id" відповідати "users[0].id"
    const keyForPatternMatching = normalizeKeyForPatternMatching(normalizedKey);

    // Перевірка whitelist (дозволяти тільки якщо відповідає будь-якому патерну)
    // Якщо whitelist переданий але порожній, заборонити всі ключі
    if (this.hasWhitelist) {
      if (this.whitelistPatterns.length === 0) {
        return false; // Порожній whitelist забороняє все
      }

      const whitelisted = this.checkWhitelist(normalizedKey, keyForPatternMatching);
      
      // Якщо whitelist визначений і ключ не відповідає жодному патерну, заборонити
      if (!whitelisted) {
        return false;
      }
    }

    // Перевірка blacklist (заборонити якщо відповідає будь-якому патерну)
    // Тільки якщо і whitelist, і blacklist визначені, перевіряти blacklist для ключів
    // які не відповідають non-wildcard патернам
    if (this.blacklistPatterns.length > 0) {
      const blocked = this.checkBlacklist(normalizedKey, keyForPatternMatching);
      
      // Якщо ключ заблоковано blacklist, заборонити
      if (blocked) {
        return false;
      }
    }

    // Дозволено якщо:
    // 1. Whitelist відповідає (і або немає blacklist, або whitelist має пріоритет)
    // 2. Немає whitelist і проходить перевірку blacklist
    return true;
  }

  /**
   * Перевіряє чи відповідає ключ жодному з whitelist патернів
   * 
   * @param normalizedKey - Нормалізований ключ
   * @param keyForPatternMatching - Ключ для патерн-матчингу
   * @returns true якщо ключ відповідає whitelist, інакше false
   * 
   * @private
   */
  private checkWhitelist(normalizedKey: string, keyForPatternMatching: string): boolean {
    for (const pattern of this.whitelistPatterns) {
      const normalizedPattern = this.ignoreCase ? pattern.toLowerCase() : pattern;

      // Перевіряємо точний збіг або префікс патерну
      // Це дозволяє батьківським ключам бути неявно дозволеними коли існують глибші патерни
      // наприклад, якщо whitelist містить "data.users", то "data" і "data.users" дозволені
      if (normalizedPattern === normalizedKey || 
          normalizedPattern.startsWith(normalizedKey + '.') || 
          normalizedPattern.startsWith(normalizedKey + '[')) {
        return true;
      }

      // Спеціальний випадок: патерни що закінчуються на .* також мають відповідати префіксу
      // наприклад, "user.*" має відповідати "user", "user.name", тощо
      if (normalizedPattern.endsWith('.*') && normalizedKey === normalizedPattern.slice(0, -2)) {
        return true;
      }

      // Перевірка glob патерну
      if (globToRegex(normalizedPattern).test(keyForPatternMatching)) {
        return true;
      }

      // Спеціальний випадок: "*.key" має відповідати будь-якому батьківському шляху за яким слідує ключ
      if (normalizedPattern.startsWith('*.')) {
        const keyPart = normalizedPattern.slice(2);
        const keyParts = normalizedKey.split('.');
        if (keyParts[keyParts.length - 1] === keyPart) {
          return true;
        }
      }

      // Перевіряємо чи відповідає ключ префіксу перед ** в патернах як "data.**.name"
      // наприклад, "data" або "data.users" має відповідати "data.**.name"
      if (normalizedPattern.includes('**')) {
        const parts = normalizedPattern.split('**');
        if (normalizedKey.startsWith(parts[0]) && parts[0].length > 0) {
          return true;
        }
      }

      // Перевіряємо чи відповідає ключ префіксу перед будь-яким * в патерні
      // наприклад, "response" або "response.data" має відповідати "response.data.users.*.id"
      const starIndex = normalizedPattern.indexOf('*');
      if (starIndex > 0) {
        const prefix = normalizedPattern.slice(0, starIndex);
        const normalizedPrefix = prefix.endsWith('.') ? prefix.slice(0, -1) : prefix;
        if (normalizedKey === normalizedPrefix || 
            normalizedKey.startsWith(normalizedPrefix + '.') || 
            normalizedKey.startsWith(normalizedPrefix + '[')) {
          return true;
        }
      }

      // Також дозволяємо точний префіксний збіг для патернів як "data.user.*"
      // наприклад, "data.user" має відповідати "data.user.*"
      if (normalizedPattern !== normalizedKey && 
          normalizedPattern.startsWith(normalizedKey + '.') &&
          normalizedPattern.endsWith('.*')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Перевіряє чи заблоковано ключ жодним з blacklist патернів
   * 
   * @param normalizedKey - Нормалізований ключ
   * @param keyForPatternMatching - Ключ для патерн-матчингу
   * @returns true якщо ключ заблоковано blacklist, інакше false
   * 
   * @private
   */
  private checkBlacklist(normalizedKey: string, keyForPatternMatching: string): boolean {
    // Перевіряємо чи є non-wildcard whitelist патерни які мають пріоритет над blacklist
    const hasNonWildcardWhitelist = this.hasWhitelist && this.whitelistPatterns.some(w => !w.includes('*'));

    if (hasNonWildcardWhitelist) {
      // Тільки застосовувати blacklist якщо ключ не відповідає non-wildcard whitelist патернам
      const matchesNonWildcardWhitelist = this.whitelistPatterns.some(w => {
        const normalizedPattern = this.ignoreCase ? w.toLowerCase() : w;
        if (normalizedPattern.includes('*')) return false;
        return normalizedKey === normalizedPattern || normalizedKey.startsWith(normalizedPattern + '.');
      });

      if (matchesNonWildcardWhitelist) {
        // Ключ відповідає non-wildcard whitelist, тому whitelist має пріоритет
        return false;
      }
    }

    // Також перевіряємо чи відповідає ключ будь-якому wildcard whitelist патерну
    // Якщо так, тільки застосовувати blacklist якщо ключ не відповідає конкретному whitelist патерну
    if (this.hasWhitelist) {
      const matchesWildcardWhitelist = this.whitelistPatterns.some(w => {
        const normalizedPattern = this.ignoreCase ? w.toLowerCase() : w;
        if (!normalizedPattern.includes('*')) return false;
        return globToRegex(normalizedPattern).test(keyForPatternMatching);
      });

      if (matchesWildcardWhitelist) {
        // Ключ відповідає wildcard whitelist патерну, тому перевіряємо чи він також відповідає blacklist
        // Тільки відхилити якщо ключ не відповідає whitelist патерну
        // наприклад, "data.user.email" відповідає whitelist "data.user.*" але заблокований "*.email"
        const matchesBlacklist = this.blacklistPatterns.some(pattern => {
          const normalizedPattern = this.ignoreCase ? pattern.toLowerCase() : pattern;
          return globToRegex(normalizedPattern).test(keyForPatternMatching);
        });

        // Якщо ключ відповідає blacklist, відхилити
        if (matchesBlacklist) {
          return true;
        }

        // В іншому випадку дозволити (whitelist має пріоритет)
        return false;
      }
    }

    // Застосовуємо правила blacklist
    for (const pattern of this.blacklistPatterns) {
      const normalizedPattern = this.ignoreCase ? pattern.toLowerCase() : pattern;

      // Спеціальний випадок: "*.key" має відповідати будь-якому батьківському шляху за яким слідує ключ
      if (normalizedPattern.startsWith('*.')) {
        const keyPart = normalizedPattern.slice(2);
        const keyParts = normalizedKey.split('.');
        if (keyParts[keyParts.length - 1] === keyPart) {
          return true;
        }
      }

      // Перевіряємо чи ключ закінчується патерном (для випадків як "password" що відповідає "user.data.password")
      if (!normalizedPattern.includes('*') && normalizedKey.endsWith('.' + normalizedPattern)) {
        return true;
      }

      // Перевірка glob патерну
      if (globToRegex(normalizedPattern).test(keyForPatternMatching)) {
        return true;
      }
    }

    // Також перевіряємо чи остання частина ключа відповідає патерну blacklist з префіксом wildcard
    // наприклад, "users[*].password" має відповідати "*.password"
    const keyParts = normalizedKey.split('.');
    const lastKeyPart = keyParts[keyParts.length - 1];
    for (const pattern of this.blacklistPatterns) {
      const normalizedPattern = this.ignoreCase ? pattern.toLowerCase() : pattern;
      if (normalizedPattern.startsWith('*.')) {
        const patternKeyPart = normalizedPattern.slice(2);
        if (lastKeyPart === patternKeyPart) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Нормалізує ключ залежно від налаштування ignoreCase
   * 
   * @param key - Ключ для нормалізації
   * @returns Нормалізований ключ
   * 
   * @private
   */
  private normalizeKey(key: string): string {
    let normalized = key;
    
    // Видаляємо префікс JSON pointer "$."
    if (normalized.startsWith('$.') || normalized.startsWith('$.')) {
      normalized = normalized.slice(2);
    }

    // Застосовуємо ignoreCase якщо потрібно
    if (this.ignoreCase) {
      normalized = normalized.toLowerCase();
    }

    return normalized;
  }

  /**
   * Оновлює whitelist патерни
   * 
   * @param whitelist - Новий масив whitelist патернів
   * 
   * @example
   * ```typescript
   * const validator = new KeyPolicyValidator(['user.*']);
   * validator.updateWhitelist(['admin.*', 'data.*']);
   * ```
   */
  updateWhitelist(whitelist: string[]): void {
    this.whitelistPatterns = whitelist || [];
    this.hasWhitelist = whitelist !== undefined;
    this.whitelistMatcher = new PatternMatcher(this.whitelistPatterns);
  }

  /**
   * Оновлює blacklist патерни
   * 
   * @param blacklist - Новий масив blacklist патернів
   * 
   * @example
   * ```typescript
   * const validator = new KeyPolicyValidator(undefined, ['*.password']);
   * validator.updateBlacklist(['*.secret', '*.token']);
   * ```
   */
  updateBlacklist(blacklist: string[]): void {
    this.blacklistPatterns = blacklist || [];
    this.blacklistMatcher = new PatternMatcher(this.blacklistPatterns);
  }

  /**
   * Додає патерн до whitelist
   * 
   * @param pattern - Патерн для додавання
   * 
   * @example
   * ```typescript
   * const validator = new KeyPolicyValidator(['user.*']);
   * validator.addToWhitelist('admin.*');
   * ```
   */
  addToWhitelist(pattern: string): void {
    if (!this.whitelistPatterns.includes(pattern)) {
      this.whitelistPatterns.push(pattern);
      this.whitelistMatcher = new PatternMatcher(this.whitelistPatterns);
    }
  }

  /**
   * Додає патерн до blacklist
   * 
   * @param pattern - Патерн для додавання
   * 
   * @example
   * ```typescript
   * const validator = new KeyPolicyValidator(undefined, ['*.password']);
   * validator.addToBlacklist('*.token');
   * ```
   */
  addToBlacklist(pattern: string): void {
    if (!this.blacklistPatterns.includes(pattern)) {
      this.blacklistPatterns.push(pattern);
      this.blacklistMatcher = new PatternMatcher(this.blacklistPatterns);
    }
  }

  /**
   * Отримує поточний список whitelist патернів
   * 
   * @returns Копія масиву whitelist патернів
   */
  getWhitelist(): string[] {
    return [...this.whitelistPatterns];
  }

  /**
   * Отримує поточний список blacklist патернів
   * 
   * @returns Копія масиву blacklist патернів
   */
  getBlacklist(): string[] {
    return [...this.blacklistPatterns];
  }

  /**
   * Отримує поточне значення ignoreCase
   * 
   * @returns true якщо регістр ігнорується, інакше false
   */
  getIgnoreCase(): boolean {
    return this.ignoreCase;
  }

  /**
   * Очищає всі whitelist та blacklist патерни
   * 
   * @example
   * ```typescript
   * const validator = new KeyPolicyValidator(['user.*'], ['*.password']);
   * validator.clearAll();
   * validator.isKeyAllowed('user.name'); // true (немає обмежень)
   * ```
   */
  clearAll(): void {
    this.whitelistPatterns = [];
    this.blacklistPatterns = [];
    this.hasWhitelist = false;
    this.whitelistMatcher = new PatternMatcher([]);
    this.blacklistMatcher = new PatternMatcher([]);
  }
}
