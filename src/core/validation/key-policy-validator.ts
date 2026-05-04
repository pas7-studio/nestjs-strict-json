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
  private readonly ignoreCase: boolean;
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
    if (normalizedKey.startsWith('$.') || normalizedKey.startsWith('$[')) {
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
        return false;
      }

      const whitelisted = this.checkWhitelist(normalizedKey, keyForPatternMatching);
      
      if (!whitelisted) {
        return false;
      }
    }

    // Перевірка blacklist (заборонити якщо відповідає будь-якому патерну)
    // Тільки якщо і whitelist, і blacklist визначені, перевіряти blacklist для ключів
    // які не відповідають non-wildcard патернам
    if (this.blacklistPatterns.length > 0) {
      const blocked = this.checkBlacklist(normalizedKey, keyForPatternMatching);
      
      if (blocked) {
        return false;
      }
    }

    return true;
  }

  private normalizePattern(pattern: string): string {
    return this.ignoreCase ? pattern.toLowerCase() : pattern;
  }

  private matchesExactOrPrefix(pattern: string, key: string): boolean {
    return pattern === key || pattern.startsWith(key + '.') || pattern.startsWith(key + '[');
  }

  private matchesWildcardSuffix(pattern: string, key: string): boolean {
    return pattern.endsWith('.*') && key === pattern.slice(0, -2);
  }

  private matchesStarPrefixLastPart(pattern: string, key: string): boolean {
    const keyPart = pattern.slice(2);
    const keyParts = key.split('.');
    return keyParts.at(-1) === keyPart;
  }

  private matchesDoubleStarPrefix(pattern: string, key: string): boolean {
    const parts = pattern.split('**');
    return parts[0].length > 0 && key.startsWith(parts[0]);
  }

  private matchesStarPrefix(pattern: string, key: string): boolean {
    const starIndex = pattern.indexOf('*');
    if (starIndex <= 0) return false;
    const prefix = pattern.slice(0, starIndex);
    const normalizedPrefix = prefix.endsWith('.') ? prefix.slice(0, -1) : prefix;
    return key === normalizedPrefix || key.startsWith(normalizedPrefix + '.') || key.startsWith(normalizedPrefix + '[');
  }

  private checkWhitelist(normalizedKey: string, keyForPatternMatching: string): boolean {
    for (const pattern of this.whitelistPatterns) {
      const normalizedPattern = this.normalizePattern(pattern);

      if (this.matchesExactOrPrefix(normalizedPattern, normalizedKey)) return true;
      if (this.matchesWildcardSuffix(normalizedPattern, normalizedKey)) return true;
      if (globToRegex(normalizedPattern).test(keyForPatternMatching)) return true;
      if (normalizedPattern.startsWith('*.') && this.matchesStarPrefixLastPart(normalizedPattern, normalizedKey)) return true;
      if (normalizedPattern.includes('**') && this.matchesDoubleStarPrefix(normalizedPattern, normalizedKey)) return true;
      if (this.matchesStarPrefix(normalizedPattern, normalizedKey)) return true;

      if (normalizedPattern !== normalizedKey && 
          normalizedPattern.startsWith(normalizedKey + '.') &&
          normalizedPattern.endsWith('.*')) {
        return true;
      }
    }

    return false;
  }

  private hasNonWildcardWhitelistMatch(key: string): boolean {
    return this.hasWhitelist && this.whitelistPatterns.some(w => {
      const normalizedPattern = this.normalizePattern(w);
      return !normalizedPattern.includes('*') && this.matchesExactOrPrefix(normalizedPattern, key);
    });
  }

  private hasWildcardWhitelistMatch(keyForPatternMatching: string): boolean {
    return this.hasWhitelist && this.whitelistPatterns.some(w => {
      const normalizedPattern = this.normalizePattern(w);
      return normalizedPattern.includes('*') && globToRegex(normalizedPattern).test(keyForPatternMatching);
    });
  }

  private matchesBlacklistPattern(pattern: string, keyForPatternMatching: string): boolean {
    return globToRegex(pattern).test(keyForPatternMatching);
  }

  private matchesBlacklistStarPrefix(pattern: string, normalizedKey: string): boolean {
    return pattern.startsWith('*.') && this.matchesStarPrefixLastPart(pattern, normalizedKey);
  }

  private matchesBlacklistSuffix(pattern: string, normalizedKey: string): boolean {
    return !pattern.includes('*') && normalizedKey.endsWith('.' + pattern);
  }

  private checkBlacklist(normalizedKey: string, keyForPatternMatching: string): boolean {
    if (this.hasNonWildcardWhitelistMatch(normalizedKey)) {
      return false;
    }

    if (this.hasWildcardWhitelistMatch(keyForPatternMatching)) {
      const matchesBlacklist = this.blacklistPatterns.some(pattern =>
        this.matchesBlacklistPattern(this.normalizePattern(pattern), keyForPatternMatching),
      );
      return matchesBlacklist;
    }

    for (const pattern of this.blacklistPatterns) {
      const normalizedPattern = this.normalizePattern(pattern);

      if (this.matchesBlacklistStarPrefix(normalizedPattern, normalizedKey)) return true;
      if (this.matchesBlacklistSuffix(normalizedPattern, normalizedKey)) return true;
      if (globToRegex(normalizedPattern).test(keyForPatternMatching)) return true;
    }

    const lastKeyPart = normalizedKey.split('.').at(-1);
    return this.blacklistPatterns.some(pattern => {
      const normalizedPattern = this.normalizePattern(pattern);
      return normalizedPattern.startsWith('*.') && normalizedPattern.slice(2) === lastKeyPart;
    });
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
    if (normalized.startsWith('$.') || normalized.startsWith('$[')) {
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
