/**
 * PatternMatcher - Клас для патерн-матчингу з підтримкою glob патернів
 * 
 * Цей клас надає ефективний механізм для перевірки чи відповідає ключ
 * набору патернів, використовуючи прекомпільовані регулярні вирази
 * та мемоізацію для покращення продуктивності.
 */

import { globToRegex } from '../utils.js';

/**
 * Клас PatternMatcher для відповідності патернам
 * 
 * @example
 * ```typescript
 * const matcher = new PatternMatcher(['user.*', 'data.**.name']);
 * matcher.matches('user.name'); // true
 * matcher.matches('user.profile.age'); // true
 * matcher.matches('other'); // false
 * ```
 */
export class PatternMatcher {
  private patterns: string[];
  private compiledPatterns: Map<string, RegExp>;

  /**
   * Створює новий екземпляр PatternMatcher
   * 
   * @param patterns - Масив glob патернів для відповідності (за замовчуванням [])
   * 
   * @example
   * ```typescript
   * const matcher = new PatternMatcher(['user.*', 'data.*.name']);
   * ```
   */
  constructor(patterns: string[] = []) {
    this.patterns = patterns;
    this.compiledPatterns = new Map();
    this.precompilePatterns();
  }

  /**
   * Прекомпілює всі патерни в регулярні вирази та кешує їх
   * 
   * Цей метод викликається автоматично в конструкторі для покращення
   * продуктивності при наступних перевірках відповідності.
   * Використовує Map для кешування скомпільованих RegExp.
   * 
   * @private
   */
  private precompilePatterns(): void {
    for (const pattern of this.patterns) {
      if (!this.compiledPatterns.has(pattern)) {
        this.compiledPatterns.set(pattern, globToRegex(pattern));
      }
    }
  }

  /**
   * Перевіряє чи відповідає ключ будь-якому з патернів
   * 
   * Спочатку перевіряє точні збіги, потім перевіряє патерни
   * через прекомпільовані регулярні вирази.
   * 
   * @param key - Ключ для перевірки відповідності
   * @returns true якщо ключ відповідає будь-якому патерну, інакше false
   * 
   * @example
   * ```typescript
   * const matcher = new PatternMatcher(['user.*', 'admin']);
   * matcher.matches('user.name'); // true (через патерн)
   * matcher.matches('admin'); // true (точний збіг)
   * matcher.matches('other'); // false
   * ```
   */
  matches(key: string): boolean {
    // Спочатку перевіряємо точні збіги для швидкості
    for (const pattern of this.patterns) {
      if (pattern === key) {
        return true;
      }
    }

    // Потім перевіряємо патерни через precompiled regex
    for (const pattern of this.patterns) {
      const regex = this.compiledPatterns.get(pattern);
      if (regex && regex.test(key)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Перевіряє чи є ключ точним збігом з будь-яким патерном
   * 
   * На відміну від `matches()`, цей метод ігнорує патерни та
   * перевіряє лише точні збіги.
   * 
   * @param key - Ключ для перевірки
   * @returns true якщо ключ точно відповідає будь-якому патерну, інакше false
   * 
   * @example
   * ```typescript
   * const matcher = new PatternMatcher(['user.*', 'admin']);
   * matcher.matchesExact('admin'); // true
   * matcher.matchesExact('user.name'); // false
   * ```
   */
  matchesExact(key: string): boolean {
    for (const pattern of this.patterns) {
      if (pattern === key) {
        return true;
      }
    }
    return false;
  }

  /**
   * Перевіряє чи порожній список патернів
   * 
   * @returns true якщо немає патернів, інакше false
   * 
   * @example
   * ```typescript
   * const emptyMatcher = new PatternMatcher();
   * emptyMatcher.isEmpty(); // true
   * 
   * const matcher = new PatternMatcher(['user']);
   * matcher.isEmpty(); // false
   * ```
   */
  isEmpty(): boolean {
    return this.patterns.length === 0;
  }

  /**
   * Отримує список всіх патернів
   * 
   * @returns Копія масиву патернів
   * 
   * @example
   * ```typescript
   * const matcher = new PatternMatcher(['user.*', 'data.*']);
   * matcher.getPatterns(); // ['user.*', 'data.*']
   * ```
   */
  getPatterns(): string[] {
    return [...this.patterns];
  }

  /**
   * Додає новий патерн до списку патернів
   * 
   * Якщо патерн вже існує, він не буде доданий повторно.
   * Новий патерн буде прекомпільований.
   * 
   * @param pattern - Патерн для додавання
   * 
   * @example
   * ```typescript
   * const matcher = new PatternMatcher(['user.*']);
   * matcher.addPattern('admin');
   * matcher.matches('admin'); // true
   * ```
   */
  addPattern(pattern: string): void {
    if (!this.patterns.includes(pattern)) {
      this.patterns.push(pattern);
      if (!this.compiledPatterns.has(pattern)) {
        this.compiledPatterns.set(pattern, globToRegex(pattern));
      }
    }
  }

  /**
   * Додає кілька патернів до списку патернів
   * 
   * Дублікати патернів будуть пропущені.
   * Нові патерни будуть прекомпільовані.
   * 
   * @param patterns - Масив патернів для додавання
   * 
   * @example
   * ```typescript
   * const matcher = new PatternMatcher(['user.*']);
   * matcher.addPatterns(['admin', 'data.*']);
   * matcher.matches('admin'); // true
   * matcher.matches('data.name'); // true
   * ```
   */
  addPatterns(patterns: string[]): void {
    for (const pattern of patterns) {
      this.addPattern(pattern);
    }
  }

  /**
   * Очищає всі патерни
   * 
   * @example
   * ```typescript
   * const matcher = new PatternMatcher(['user.*', 'admin']);
   * matcher.clear();
   * matcher.isEmpty(); // true
   * ```
   */
  clear(): void {
    this.patterns = [];
    this.compiledPatterns.clear();
  }

  /**
   * Отримує кількість патернів
   * 
   * @returns Кількість патернів
   * 
   * @example
   * ```typescript
   * const matcher = new PatternMatcher(['user.*', 'admin']);
   * matcher.size(); // 2
   * ```
   */
  size(): number {
    return this.patterns.length;
  }
}
