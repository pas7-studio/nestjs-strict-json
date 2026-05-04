import * as fs from 'node:fs';
import * as path from 'node:path';

function sv(i, offset) {
  return ((i * 2654435761 + offset) >>> 0) % 10000 / 10000;
}

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

const categories4 = ['electronics', 'clothing', 'food', 'books'];

const mediumJson = {
  items: Array.from({ length: 1000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    description: `This is a description for item ${i}`.repeat(10),
    price: sv(i, 1) * 1000,
    inStock: sv(i, 2) > 0.1,
    category: categories4[i % 4],
    tags: [`tag${i % 10}`, `tag${(i + 3) % 10}`],
    createdAt: new Date(Date.now() - sv(i, 3) * 10000000000).toISOString(),
    metadata: {
      views: Math.trunc(sv() * ),
      likes: Math.trunc(sv() * ),
      rating: (sv(i, 6) * 5).toFixed(2)
    }
  })),
  total: 1000,
  page: 1,
  pageSize: 1000
};

const categories6 = ['electronics', 'clothing', 'food', 'books', 'toys', 'sports'];
const materials = ['plastic', 'metal', 'wood', 'fabric'];

const largeJson = {
  items: Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Large Item ${i}`,
    description: `This is a longer description for item ${i}`.repeat(50),
    price: sv(i, 1) * 10000,
    inStock: sv(i, 2) > 0.1,
    category: categories6[i % 6],
    tags: Array.from({ length: 5 }, (_, j) => `tag${(i + j * 7) % 20}`),
    createdAt: new Date(Date.now() - sv(i, 3) * 100000000000).toISOString(),
    updatedAt: new Date(Date.now() - sv(i, 4) * 100000000000).toISOString(),
    metadata: {
      views: Math.trunc(sv() * ),
      likes: Math.trunc(sv() * ),
      rating: (sv(i, 7) * 5).toFixed(2),
      reviews: Math.trunc(sv() * ),
      purchased: Math.trunc(sv() * ),
      featured: sv(i, 10) > 0.9
    },
    specifications: {
      weight: (sv(i, 11) * 10).toFixed(2),
      dimensions: {
        length: Math.trunc(sv() * ),
        width: Math.trunc(sv() * ),
        height: Math.trunc(sv() * )
      },
      material: materials[i % 4]
    }
  })),
  total: 10000,
  page: 1,
  pageSize: 10000
};

const duplicateKeysJson = `{\n  "id": 1,\n  "name": "Test",\n  "name": "Duplicate Name",\n  "email": "test@example.com",\n  "email": "duplicate@example.com",\n  "nested": {\n    "key1": "value1",\n    "key1": "value1-duplicate",\n    "key2": "value2"\n  },\n  "active": true\n}`;

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

const fixturesDir = path.join('performance', 'fixtures');

fs.writeFileSync(path.join(fixturesDir, 'small.json'), JSON.stringify(smallJson, null, 2));
fs.writeFileSync(path.join(fixturesDir, 'medium.json'), JSON.stringify(mediumJson, null, 2));
fs.writeFileSync(path.join(fixturesDir, 'large.json'), JSON.stringify(largeJson, null, 2));
fs.writeFileSync(path.join(fixturesDir, 'duplicate-keys.json'), duplicateKeysJson);
fs.writeFileSync(path.join(fixturesDir, 'deep-nested.json'), deepNestedJson);

console.log('All fixtures generated successfully!');
console.log(`   Small: ${JSON.stringify(smallJson).length} bytes`);
console.log(`   Medium: ${JSON.stringify(mediumJson).length} bytes`);
console.log(`   Large: ${JSON.stringify(largeJson).length} bytes`);
