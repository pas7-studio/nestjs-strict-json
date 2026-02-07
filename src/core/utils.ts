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
 * Normalizes a key by replacing array indices [x] with [*]
 * This allows patterns like "users.*.id" to match "users[0].id"
 * Also handles nested array indices like "users[0].profile.age"
 * @param key - Key to normalize
 * @returns Normalized key
 */
function normalizeKeyForPatternMatching(key: string): string {
  let normalized = key;
  
  // Replace array indices [0], [1], [2], etc. with [*]
  // Handle nested array structures like users[0].profile[0].age
  normalized = normalized.replace(/\[\d+\]/g, '[*]');
  
  // Also handle the case where * should match array brackets
  // For pattern "users.*.id", it should match "users[*].id"
  // But it shouldn't match "users[0].id" (after normalization, both become "users[*].id")
  // Actually, this is correct - after normalization both should match
  
  return normalized;
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

/**
 * Checks if a key is allowed based on whitelist and blacklist
 * @param key - Key to check (e.g., "$.user" or "$.data.name")
 * @param whitelist - Array of glob patterns (optional, e.g., "user" or "data.*")
 * @param blacklist - Array of glob patterns (optional, e.g., "password" or "*.secret")
 * @returns True if key is allowed
 */
export function isKeyAllowed(key: string, whitelist?: string[], blacklist?: string[]): boolean {
  // Remove JSON pointer prefix "$." for pattern matching
  let normalizedKey = key.startsWith('$.') ? key.slice(2) : key;

  // Replace array indices [x] with [*] for pattern matching
  // This allows patterns like "users.*.id" to match "users[0].id"
  // Also handles nested array indices like "users[0].profile[0].age"
  const keyForPatternMatching = normalizeKeyForPatternMatching(normalizedKey);

  // Check whitelist (allow only if matches any pattern)
  // If whitelist is defined but empty, deny all keys
  let whitelisted = false;
  if (whitelist) {
    if (whitelist.length === 0) {
      return false; // Empty whitelist denies all
    }
    for (const pattern of whitelist) {
      // Check if key is an exact match or prefix of the pattern
      // This allows parent keys to be implicitly allowed when deeper patterns exist
      // e.g., if whitelist contains "data.users", then "data" and "data.users" are allowed
      if (pattern === normalizedKey || pattern.startsWith(normalizedKey + '.') || pattern.startsWith(normalizedKey + '[')) {
        whitelisted = true;
        break;
      }
      // Special case: patterns ending with .* should also match prefix
      // e.g., "user.*" should match "user", "user.name", etc.
      if (pattern.endsWith('.*') && normalizedKey === pattern.slice(0, -2)) {
        whitelisted = true;
        break;
      }
      // Check glob pattern match
      if (matchGlobPattern(keyForPatternMatching, pattern)) {
        whitelisted = true;
        break;
      }
      // Special case: "*.key" should match any parent path followed by key
      if (pattern.startsWith('*.')) {
        const keyPart = pattern.slice(2);
        const keyParts = normalizedKey.split('.');
        if (keyParts[keyParts.length - 1] === keyPart) {
          whitelisted = true;
          break;
        }
      }
      // Check if key matches prefix before ** in patterns like "data.**.name"
      // e.g., "data" or "data.users" should match "data.**.name"
      if (pattern.includes('**')) {
        const parts = pattern.split('**');
        if (normalizedKey.startsWith(parts[0]) && parts[0].length > 0) {
          whitelisted = true;
          break;
        }
      }
      // Check if key matches prefix before any * in the pattern
      // e.g., "response" or "response.data" should match "response.data.users.*.id"
      const starIndex = pattern.indexOf('*');
      if (starIndex > 0) {
        const prefix = pattern.slice(0, starIndex);
        const normalizedPrefix = prefix.endsWith('.') ? prefix.slice(0, -1) : prefix;
        if (normalizedKey === normalizedPrefix || normalizedKey.startsWith(normalizedPrefix + '.') || normalizedKey.startsWith(normalizedPrefix + '[')) {
          whitelisted = true;
          break;
        }
      }
      // Also allow exact prefix match for patterns like "data.user.*"
      // e.g., "data.user" should match "data.user.*"
      if (pattern !== normalizedKey && pattern.startsWith(normalizedKey + '.') &&
          pattern.endsWith('.*')) {
        whitelisted = true;
        break;
      }
    }
    // If whitelist is defined and key doesn't match any pattern, deny
    if (!whitelisted) {
      return false;
    }
  }

  // Check blacklist (deny if matches any pattern)
  // Only if both whitelist and blacklist are defined, check blacklist for keys NOT matching non-wildcard patterns
  if (blacklist && blacklist.length > 0) {
    // Check if whitelist has non-wildcard patterns that would override blacklist
    const hasNonWildcardWhitelist = whitelist && whitelist.some(w => !w.includes('*'));
    
    if (whitelist && hasNonWildcardWhitelist) {
      // Only apply blacklist if key doesn't match non-wildcard whitelist patterns
      const matchesNonWildcardWhitelist = whitelist && whitelist.some(w => {
        if (w.includes('*')) return false;
        return normalizedKey === w || normalizedKey.startsWith(w + '.');
      });
      
      if (matchesNonWildcardWhitelist) {
        // Key matches non-wildcard whitelist, so whitelist takes precedence
        return true;
      }
    }
    
    // Also check if key matches any wildcard whitelist pattern
    // If it does, only apply blacklist if the key doesn't match the specific whitelist pattern
    if (whitelist) {
      const matchesWildcardWhitelist = whitelist.some(w => {
        if (!w.includes('*')) return false;
        return matchGlobPattern(keyForPatternMatching, w);
      });
      
      if (matchesWildcardWhitelist) {
        // Key matches a wildcard whitelist pattern, so check if it also matches blacklist
        // Only reject if key doesn't match the whitelist pattern
        // e.g., "data.user.email" matches whitelist "data.user.*" but is blocked by "*.email"
        const matchesBlacklist = blacklist.some(pattern => {
          return matchGlobPattern(keyForPatternMatching, pattern);
        });
        
        // If key matches blacklist, reject it
        if (matchesBlacklist) {
          return false;
        }
        
        // Otherwise, allow it (whitelist takes precedence)
        return true;
      }
    }
    
    // Apply blacklist rules
    for (const pattern of blacklist) {
      // Special case: "*.key" should match any parent path followed by key
      if (pattern.startsWith('*.')) {
        const keyPart = pattern.slice(2);
        const keyParts = normalizedKey.split('.');
        if (keyParts[keyParts.length - 1] === keyPart) {
          return false;
        }
      }
      // Check if key ends with pattern (for cases like "password" matching "user.data.password")
      if (!pattern.includes('*') && normalizedKey.endsWith('.' + pattern)) {
        return false;
      }
      // Check glob pattern match
      if (matchGlobPattern(keyForPatternMatching, pattern)) {
        return false;
      }
    }
    
    // Also check if key's last part matches blacklist pattern with wildcard prefix
    // e.g., "users[*].password" should match "*.password"
    const keyParts = normalizedKey.split('.');
    const lastKeyPart = keyParts[keyParts.length - 1];
    for (const pattern of blacklist) {
      if (pattern.startsWith('*.')) {
        const patternKeyPart = pattern.slice(2);
        if (lastKeyPart === patternKeyPart) {
          return false;
        }
      }
    }
  }

  // Allowed if:
  // 1. Whitelist matches (and either no blacklist or whitelist overrides blacklist)
  // 2. No whitelist and passes blacklist check
  return true;
}
