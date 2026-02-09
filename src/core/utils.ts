/**
 * Glob pattern matching utility for whitelist/blacklist filtering
 */

/**
 * Converts a glob pattern to a regular expression
 * @param pattern - Glob pattern (e.g., "user.*", "secret", "data.**.name")
 * @returns Regular expression for matching
 */
export function globToRegex(pattern: string): RegExp {
  let result = '';
  let i = 0;

  while (i < pattern.length) {
    if (pattern[i] === '*') {
      // Check for ** (double wildcard)
      if (i + 1 < pattern.length && pattern[i + 1] === '*') {
        result += '.*?'; // Non-greedy match of any characters including dots
        i += 2;
        continue;
      }

      // Single * - match any characters EXCEPT dots
      // This ensures patterns like "users.*.name" work correctly
      // Also handle special case: * at end of pattern or before a dot
      const isAtEnd = i + 1 >= pattern.length;
      const nextIsDot = i + 1 < pattern.length && pattern[i + 1] === '.';
      const nextIsBracket = i + 1 < pattern.length && pattern[i + 1] === ']';

      if (isAtEnd) {
        result += '.*'; // At end, allow empty or any chars (including dots)
      } else if (nextIsDot) {
        result += '[^.]*'; // Before dot, only match non-dot chars (a single segment)
      } else if (nextIsBracket) {
        result += '[^]]*'; // Before ], only match non-] chars (a single array element)
      } else {
        result += '[^.]*'; // Otherwise, only non-dot chars
      }
      i++;
    } else if (pattern[i] === '?') {
      // ? matches any single character
      result += '.';
      i++;
    } else {
      // Escape special regex characters
      const char = pattern[i];
      if ('.+^${}()|[]\\'.includes(char)) {
        result += '\\' + char;
      } else {
        result += char;
      }
      i++;
    }
  }

  return new RegExp(`^${result}$`);
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
