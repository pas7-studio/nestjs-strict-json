/**
 * Генератори тестових даних для бенчмарків
 */

/**
 * Генерує маленький JSON об'єкт (~1KB)
 */
export function generateSmallJson(): object {
  return {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    age: 30,
    active: true,
    createdAt: '2024-01-01T00:00:00Z',
    settings: {
      theme: 'dark',
      notifications: true,
      language: 'uk'
    },
    tags: ['user', 'test'],
    metadata: {
      source: 'benchmark',
      version: '1.0.0'
    }
  };
}

/**
 * Генерує середній JSON (~100KB)
 */
export function generateMediumJson(): object {
  const items = [];
  for (let i = 0; i < 1000; i++) {
    items.push({
      id: i,
      name: `Item ${i}`,
      description: `This is a description for item ${i}`.repeat(10),
      price: Math.random() * 1000,
      inStock: Math.random() > 0.1,
      category: ['electronics', 'clothing', 'food', 'books'][Math.floor(Math.random() * 4)],
      tags: [`tag${Math.floor(Math.random() * 10)}`, `tag${Math.floor(Math.random() * 10)}`],
      createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      metadata: {
        views: Math.floor(Math.random() * 10000),
        likes: Math.floor(Math.random() * 1000),
        rating: (Math.random() * 5).toFixed(2)
      }
    });
  }
  return { items, total: items.length, page: 1, pageSize: 1000 };
}

/**
 * Генерує великий JSON (~1MB)
 */
export function generateLargeJson(): object {
  const items = [];
  for (let i = 0; i < 10000; i++) {
    items.push({
      id: i,
      name: `Large Item ${i}`,
      description: `This is a longer description for item ${i}`.repeat(50),
      price: Math.random() * 10000,
      inStock: Math.random() > 0.1,
      category: ['electronics', 'clothing', 'food', 'books', 'toys', 'sports'][Math.floor(Math.random() * 6)],
      tags: Array.from({ length: 5 }, () => `tag${Math.floor(Math.random() * 20)}`),
      createdAt: new Date(Date.now() - Math.random() * 100000000000).toISOString(),
      updatedAt: new Date(Date.now() - Math.random() * 100000000000).toISOString(),
      metadata: {
        views: Math.floor(Math.random() * 100000),
        likes: Math.floor(Math.random() * 10000),
        rating: (Math.random() * 5).toFixed(2),
        reviews: Math.floor(Math.random() * 500),
        purchased: Math.floor(Math.random() * 1000),
        featured: Math.random() > 0.9
      },
      specifications: {
        weight: (Math.random() * 10).toFixed(2),
        dimensions: {
          length: Math.floor(Math.random() * 100),
          width: Math.floor(Math.random() * 100),
          height: Math.floor(Math.random() * 100)
        },
        material: ['plastic', 'metal', 'wood', 'fabric'][Math.floor(Math.random() * 4)]
      }
    });
  }
  return { items, total: items.length, page: 1, pageSize: 10000 };
}

/**
 * Генерує JSON з дублікатними ключами (створює JSON рядок з дублікатами)
 * Примітка: Це створює рядок JSON з дублікатними ключами, які не можна представити як об'єкт JS
 */
export function generateJsonWithDuplicates(): string {
  // Створюємо вручну рядок JSON з дублікатними ключами
  let jsonStr = `{\n`;
  jsonStr += `  "id": 1,\n`;
  jsonStr += `  "name": "Test",\n`;
  jsonStr += `  "name": "Duplicate Name",\n`; // Дублікат
  jsonStr += `  "email": "test@example.com",\n`;
  jsonStr += `  "email": "duplicate@example.com",\n`; // Дублікат
  jsonStr += `  "nested": {\n`;
  jsonStr += `    "key1": "value1",\n`;
  jsonStr += `    "key1": "value1-duplicate",\n`; // Дублікат
  jsonStr += `    "key2": "value2"\n`;
  jsonStr += `  },\n`;
  jsonStr += `  "active": true\n`;
  jsonStr += `}`;
  return jsonStr;
}

/**
 * Генерує глибоко вкладений JSON
 */
export function generateDeepNestedJson(depth: number): object {
  if (depth <= 0) {
    return { final: 'value' };
  }

  return {
    level: depth,
    nested: generateDeepNestedJson(depth - 1)
  };
}

/**
 * Генерує JSON для тестування whitelist
 */
export function generateWhitelistTestJson(): object {
  return {
    id: 1,
    name: 'Allowed Field',
    email: 'test@example.com',
    // Ці поля не будуть у whitelist
    password: 'secret123',
    secretToken: 'abc123def456',
    internalData: {
      admin: true,
      apiKey: 'key-12345'
    }
  };
}

/**
 * Генерує JSON для тестування prototype pollution
 */
export function generatePrototypePollutionJson(): string {
  // Створюємо рядок JSON з prototype pollution
  return JSON.stringify({
    __proto__: { polluted: true },
    constructor: { prototype: { polluted: true } },
    normal: 'field'
  });
}

/**
 * Генерує масив JSON об'єктів для бенчмарків
 */
export function generateJsonArray(size: number): object[] {
  const array = [];
  for (let i = 0; i < size; i++) {
    array.push({
      id: i,
      value: Math.random(),
      name: `Item ${i}`
    });
  }
  return array;
}

/**
 * Конвертує об'єкт в JSON рядок
 */
export function toJsonString(obj: object | object[]): string {
  return JSON.stringify(obj, null, 2);
}

/**
 * Отримує розмір JSON рядка в байтах
 */
export function getJsonSize(jsonString: string): number {
  return Buffer.byteLength(jsonString, 'utf8');
}
