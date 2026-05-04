/**
 * Glob pattern matching utility for whitelist/blacklist filtering
 */

/**
 * Converts a glob pattern to a regular expression
 * @param pattern - Glob pattern (e.g., "user.*", "secret", "data.**.name")
 * @returns Regular expression for matching
 */
export function globToRegex(pattern: string): RegExp {
  const parts: string[] = [];
  let i = 0;

  while (i < pattern.length) {
    const part = processNextChar(pattern, i);
    parts.push(part.result);
    i = part.nextIndex;
  }

  return new RegExp(`^${parts.join('')}$`);
}

function processNextChar(pattern: string, i: number): { result: string; nextIndex: number } {
  if (pattern[i] === '*') {
    return processWildcardChar(pattern, i);
  }

  if (pattern[i] === '?') {
    return { result: '.', nextIndex: i + 1 };
  }

  const char = pattern[i];
  if ('.+^${}()|[]\\'.includes(char)) {
    return { result: '\\' + char, nextIndex: i + 1 };
  }

  return { result: char, nextIndex: i + 1 };
}

function processWildcardChar(pattern: string, i: number): { result: string; nextIndex: number } {
  if (i + 1 < pattern.length && pattern[i + 1] === '*') {
    return { result: '.*?', nextIndex: i + 2 };
  }

  const isAtEnd = i + 1 >= pattern.length;
  const nextIsDot = i + 1 < pattern.length && pattern[i + 1] === '.';
  const nextIsBracket = i + 1 < pattern.length && pattern[i + 1] === ']';

  if (isAtEnd) {
    return { result: '.*', nextIndex: i + 1 };
  }
  if (nextIsDot) {
    return { result: '[^.]*', nextIndex: i + 1 };
  }
  if (nextIsBracket) {
    return { result: '[^]]*', nextIndex: i + 1 };
  }

  return { result: '[^.]*', nextIndex: i + 1 };
}

/**
 * Tests if a key matches a glob pattern
 * @param key - Key to test
 * @param pattern - Glob pattern
 * @returns True if key matches pattern
 */
export function matchGlobPattern(key: string, pattern: string): boolean {
  const regex = globToRegex(pattern);
  const matches = regex.test(key);
  return matches;
}
