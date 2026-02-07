/**
 * Генерація тестових фіксатур для бенчмарків
 */

import * as fs from 'fs';
import * as path from 'path';

// Small JSON (~1KB) - already created
const smallJson = {
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

// Medium JSON (~100KB)
const mediumJson = {
  items: Array.from({ length: 1000 }, (_, i) => ({
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
  })),
  total: 1000,
  page: 1,
  pageSize: 1000
};

// Large JSON (~1MB)
const largeJson = {
  items: Array.from({ length: 10000 }, (_, i) => ({
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
  })),
  total: 10000,
  page: 1,
  pageSize: 10000
};

// JSON with duplicate keys (manual construction)
const duplicateKeysJson = `{\n  "id": 1,\n  "name": "Test",\n  "name": "Duplicate Name",\n  "email": "test@example.com",\n  "email": "duplicate@example.com",\n  "nested": {\n    "key1": "value1",\n    "key1": "value1-duplicate",\n    "key2": "value2"\n  },\n  "active": true\n}`;

// Deep nested JSON (depth 30)
function generateDeepNestedJson(depth) {
  if (depth <= 0) {
    return { final: 'value' };
  }
  return {
    level: depth,
    nested: generateDeepNestedJson(depth - 1)
  };
}

const deepNestedJson = JSON.stringify(generateDeepNestedJson(30), null, 2);

// Write all fixtures
const fixturesDir = path.join('performance', 'fixtures');

fs.writeFileSync(
  path.join(fixturesDir, 'small.json'),
  JSON.stringify(smallJson, null, 2)
);

fs.writeFileSync(
  path.join(fixturesDir, 'medium.json'),
  JSON.stringify(mediumJson, null, 2)
);

fs.writeFileSync(
  path.join(fixturesDir, 'large.json'),
  JSON.stringify(largeJson, null, 2)
);

fs.writeFileSync(
  path.join(fixturesDir, 'duplicate-keys.json'),
  duplicateKeysJson
);

fs.writeFileSync(
  path.join(fixturesDir, 'deep-nested.json'),
  deepNestedJson
);

console.log('✅ All fixtures generated successfully!');
console.log(`   Small: ${JSON.stringify(smallJson).length} bytes`);
console.log(`   Medium: ${JSON.stringify(mediumJson).length} bytes`);
console.log(`   Large: ${JSON.stringify(largeJson).length} bytes`);
