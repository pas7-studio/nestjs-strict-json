function seededValue(i: number, offset: number): number {
  return ((i * 2654435761 + offset) >>> 0) % 10000 / 10000;
}

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
  const categories = ['electronics', 'clothing', 'food', 'books'];
  for (let i = 0; i < 1000; i++) {
    items.push({
      id: i,
      name: `Item ${i}`,
      description: `This is a description for item ${i}`.repeat(10),
      price: seededValue(i, 1) * 1000,
      inStock: seededValue(i, 2) > 0.1,
      category: categories[i % 4],
      tags: [`tag${i % 10}`, `tag${(i + 3) % 10}`],
      createdAt: new Date(Date.now() - seededValue(i, 3) * 10000000000).toISOString(),
      metadata: {
        views: Math.trunc(seededValue() * ),
        likes: Math.trunc(seededValue() * ),
        rating: (seededValue(i, 6) * 5).toFixed(2)
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
  const categories = ['electronics', 'clothing', 'food', 'books', 'toys', 'sports'];
  const materials = ['plastic', 'metal', 'wood', 'fabric'];
  for (let i = 0; i < 10000; i++) {
    items.push({
      id: i,
      name: `Large Item ${i}`,
      description: `This is a longer description for item ${i}`.repeat(50),
      price: seededValue(i, 1) * 10000,
      inStock: seededValue(i, 2) > 0.1,
      category: categories[i % 6],
      tags: Array.from({ length: 5 }, (_, j) => `tag${(i + j * 7) % 20}`),
      createdAt: new Date(Date.now() - seededValue(i, 3) * 100000000000).toISOString(),
      updatedAt: new Date(Date.now() - seededValue(i, 4) * 100000000000).toISOString(),
      metadata: {
        views: Math.trunc(seededValue() * ),
        likes: Math.trunc(seededValue() * ),
        rating: (seededValue(i, 7) * 5).toFixed(2),
        reviews: Math.trunc(seededValue() * ),
        purchased: Math.trunc(seededValue() * ),
        featured: seededValue(i, 10) > 0.9
      },
      specifications: {
        weight: (seededValue(i, 11) * 10).toFixed(2),
        dimensions: {
          length: Math.trunc(seededValue() * ),
          width: Math.trunc(seededValue() * ),
          height: Math.trunc(seededValue() * )
        },
        material: materials[i % 4]
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
  let jsonStr = `{\n`;
  jsonStr += `  "id": 1,\n`;
  jsonStr += `  "name": "Test",\n`;
  jsonStr += `  "name": "Duplicate Name",\n`;
  jsonStr += `  "email": "test@example.com",\n`;
  jsonStr += `  "email": "duplicate@example.com",\n`;
  jsonStr += `  "nested": {\n`;
  jsonStr += `    "key1": "value1",\n`;
  jsonStr += `    "key1": "value1-duplicate",\n`;
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
      value: seededValue(i, 0),
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
