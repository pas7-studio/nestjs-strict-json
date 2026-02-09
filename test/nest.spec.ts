import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Test, TestingModule, Injectable } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  StrictJsonModule,
  StrictJsonCacheService,
  STRICT_JSON_OPTIONS,
  STRICT_JSON_CACHE,
  NEST_APP,
} from '../src/nest/index.js';
import type { ICache } from '../src/core/cache/index.js';

/**
 * Mock for INestApplication
 */
const mockNestApplication = {
  getHttpAdapter: vi.fn(() => mockHttpAdapter),
  use: vi.fn(),
  close: vi.fn(),
};

/**
 * Mock for HTTP adapter
 */
const mockHttpAdapter = {
  getType: vi.fn(() => 'express'),
  getInstance: vi.fn(),
};

/**
 * Mock cache for testing
 */
const createMockCache = (): ICache => ({
  get: vi.fn(),
  set: vi.fn(),
  has: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  size: 0,
  maxSize: 1000,
});

describe('StrictJsonModule - forRoot', () => {
  it('should return a DynamicModule with options', () => {
    const module = StrictJsonModule.forRoot({
      enableCache: true,
      cacheSize: 500,
    });
    
    expect(module).toBeDefined();
    expect(module.module).toBe(StrictJsonModule);
    expect(module.providers).toBeDefined();
    expect(module.exports).toBeDefined();
    expect(module.global).toBe(true);
  });

  it('should return a DynamicModule without options', () => {
    const module = StrictJsonModule.forRoot();
    
    expect(module).toBeDefined();
    expect(module.module).toBe(StrictJsonModule);
    expect(module.providers).toBeDefined();
    expect(module.exports).toBeDefined();
    expect(module.global).toBe(true);
  });

  it('should export STRICT_JSON_OPTIONS in exports array', () => {
    const module = StrictJsonModule.forRoot();
    expect(module.exports).toContain(STRICT_JSON_OPTIONS);
  });

  it('should export STRICT_JSON_CACHE in exports array', () => {
    const module = StrictJsonModule.forRoot();
    expect(module.exports).toContain(STRICT_JSON_CACHE);
  });

  it('should export StrictJsonCacheService in exports array', () => {
    const module = StrictJsonModule.forRoot();
    expect(module.exports).toContain(StrictJsonCacheService);
  });

  it('should set global: true', () => {
    const module = StrictJsonModule.forRoot();
    expect(module.global).toBe(true);
  });

  it('should have providers array with 3 items', () => {
    const module = StrictJsonModule.forRoot();
    expect(module.providers).toHaveLength(3);
  });

  it('should have STRICT_JSON_CACHE provider', () => {
    const module = StrictJsonModule.forRoot();
    const cacheProvider = module.providers?.find((p: any) => p.provide === STRICT_JSON_CACHE);
    expect(cacheProvider).toBeDefined();
  });

  it('should have STRICT_JSON_OPTIONS provider', () => {
    const module = StrictJsonModule.forRoot();
    const optionsProvider = module.providers?.find((p: any) => p.provide === STRICT_JSON_OPTIONS);
    expect(optionsProvider).toBeDefined();
  });

  it('should have StrictJsonCacheService provider', () => {
    const module = StrictJsonModule.forRoot();
    const serviceProvider = module.providers?.find((p: any) => p === StrictJsonCacheService || p.provide === StrictJsonCacheService);
    expect(serviceProvider).toBeDefined();
  });
});

describe('StrictJsonModule - forRootAsync', () => {
  it('should return a DynamicModule with options', () => {
    const module = StrictJsonModule.forRootAsync({
      enableCache: true,
      cacheSize: 500,
    });
    
    expect(module).toBeDefined();
    expect(module.module).toBe(StrictJsonModule);
    expect(module.providers).toBeDefined();
    expect(module.exports).toBeDefined();
    expect(module.global).toBe(true);
  });

  it('should return a DynamicModule without options', () => {
    const module = StrictJsonModule.forRootAsync();
    
    expect(module).toBeDefined();
    expect(module.module).toBe(StrictJsonModule);
    expect(module.providers).toBeDefined();
    expect(module.exports).toBeDefined();
    expect(module.global).toBe(true);
  });

  it('should export STRICT_JSON_OPTIONS in exports array', () => {
    const module = StrictJsonModule.forRootAsync();
    expect(module.exports).toContain(STRICT_JSON_OPTIONS);
  });

  it('should export STRICT_JSON_CACHE in exports array', () => {
    const module = StrictJsonModule.forRootAsync();
    expect(module.exports).toContain(STRICT_JSON_CACHE);
  });

  it('should export StrictJsonCacheService in exports array', () => {
    const module = StrictJsonModule.forRootAsync();
    expect(module.exports).toContain(StrictJsonCacheService);
  });

  it('should set global: true', () => {
    const module = StrictJsonModule.forRootAsync();
    expect(module.global).toBe(true);
  });

  it('should have providers array with 3 items', () => {
    const module = StrictJsonModule.forRootAsync();
    expect(module.providers).toHaveLength(3);
  });

  it('should have STRICT_JSON_CACHE provider', () => {
    const module = StrictJsonModule.forRootAsync();
    const cacheProvider = module.providers?.find((p: any) => p.provide === STRICT_JSON_CACHE);
    expect(cacheProvider).toBeDefined();
  });

  it('should have STRICT_JSON_OPTIONS provider', () => {
    const module = StrictJsonModule.forRootAsync();
    const optionsProvider = module.providers?.find((p: any) => p.provide === STRICT_JSON_OPTIONS);
    expect(optionsProvider).toBeDefined();
  });

  it('should have StrictJsonCacheService provider', () => {
    const module = StrictJsonModule.forRootAsync();
    const serviceProvider = module.providers?.find((p: any) => p === StrictJsonCacheService || p.provide === StrictJsonCacheService);
    expect(serviceProvider).toBeDefined();
  });
});

describe('StrictJsonModule - lifecycle', () => {
  let mockCache: ICache;

  beforeEach(() => {
    mockCache = createMockCache();
  });

  it('should call onApplicationBootstrap method', () => {
    const moduleInstance = new StrictJsonModule(
      mockCache,
      { enableCache: true },
      mockNestApplication as never
    );

    expect(() => moduleInstance.onApplicationBootstrap()).not.toThrow();
  });

  it('should call onModuleDestroy method', () => {
    const clearSpy = vi.spyOn(mockCache, 'clear');
    const moduleInstance = new StrictJsonModule(
      mockCache,
      { enableCache: true },
      mockNestApplication as never
    );

    moduleInstance.onModuleDestroy();

    expect(clearSpy).toHaveBeenCalled();
  });

  it('should clear cache in onModuleDestroy', () => {
    mockCache.size = 5;
    const moduleInstance = new StrictJsonModule(
      mockCache,
      { enableCache: true },
      mockNestApplication as never
    );

    moduleInstance.onModuleDestroy();

    expect(mockCache.clear).toHaveBeenCalled();
  });

  it('should not throw in onApplicationBootstrap when app is null', () => {
    const moduleInstance = new StrictJsonModule(
      mockCache,
      { enableCache: true },
      undefined
    );

    expect(() => moduleInstance.onApplicationBootstrap()).not.toThrow();
  });
});

describe('StrictJsonCacheService - methods', () => {
  let cacheService: StrictJsonCacheService;
  let mockCache: ICache;

  beforeEach(() => {
    mockCache = createMockCache();
    cacheService = new StrictJsonCacheService(mockCache);
  });

  describe('clear()', () => {
    it('should call cache.clear()', () => {
      cacheService.clear();
      expect(mockCache.clear).toHaveBeenCalledTimes(1);
    });

    it('should be called correctly with non-empty cache', () => {
      mockCache.size = 5;
      cacheService.clear();
      expect(mockCache.clear).toHaveBeenCalled();
    });
  });

  describe('getSize()', () => {
    it('should return cache size', () => {
      mockCache.size = 42;
      const size = cacheService.getSize();
      expect(size).toBe(42);
    });

    it('should be called correctly with empty cache', () => {
      mockCache.size = 0;
      const size = cacheService.getSize();
      expect(size).toBe(0);
    });
  });

  describe('getMaxSize()', () => {
    it('should return max cache size', () => {
      mockCache.maxSize = 1000;
      const maxSize = cacheService.getMaxSize();
      expect(maxSize).toBe(1000);
    });

    it('should be called correctly', () => {
      mockCache.maxSize = 500;
      const maxSize = cacheService.getMaxSize();
      expect(maxSize).toBe(500);
    });
  });

  describe('hasKey()', () => {
    it('should return true if key exists', () => {
      (mockCache.has as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const hasKey = cacheService.hasKey('test-key');
      expect(hasKey).toBe(true);
      expect(mockCache.has).toHaveBeenCalledWith('test-key');
    });

    it('should return false if key does not exist', () => {
      (mockCache.has as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const hasKey = cacheService.hasKey('non-existent-key');
      expect(hasKey).toBe(false);
      expect(mockCache.has).toHaveBeenCalledWith('non-existent-key');
    });
  });

  describe('get()', () => {
    it('should get value from cache', () => {
      const testValue = { id: 1, name: 'test' };
      (mockCache.get as ReturnType<typeof vi.fn>).mockReturnValue(testValue);
      const value = cacheService.get('test-key');
      expect(value).toEqual(testValue);
      expect(mockCache.get).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent key', () => {
      (mockCache.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const value = cacheService.get('non-existent-key');
      expect(value).toBeNull();
      expect(mockCache.get).toHaveBeenCalledWith('non-existent-key');
    });

    it('should be called correctly', () => {
      (mockCache.get as ReturnType<typeof vi.fn>).mockReturnValue(null);
      const value = cacheService.get('missing-key');
      expect(value).toBeNull();
    });
  });

  describe('delete()', () => {
    it('should delete key from cache', () => {
      (mockCache.delete as ReturnType<typeof vi.fn>).mockReturnValue(true);
      const deleted = cacheService.delete('test-key');
      expect(deleted).toBe(true);
      expect(mockCache.delete).toHaveBeenCalledWith('test-key');
    });

    it('should return false for non-existent key', () => {
      (mockCache.delete as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const deleted = cacheService.delete('non-existent-key');
      expect(deleted).toBe(false);
      expect(mockCache.delete).toHaveBeenCalledWith('non-existent-key');
    });

    it('should be called correctly', () => {
      (mockCache.delete as ReturnType<typeof vi.fn>).mockReturnValue(false);
      const deleted = cacheService.delete('missing-key');
      expect(deleted).toBe(false);
    });
  });
});

describe('StrictJsonCacheService - integration', () => {
  let cacheService: StrictJsonCacheService;
  let mockCache: ICache;

  beforeEach(() => {
    mockCache = createMockCache();
    cacheService = new StrictJsonCacheService(mockCache);
  });

  it('should clear cache through service', () => {
    (mockCache.size as number) = 5;
    cacheService.clear();
    expect(mockCache.clear).toHaveBeenCalled();
  });

  it('should return cache size through service', () => {
    (mockCache.size as number) = 3;
    const size = cacheService.getSize();
    expect(size).toBe(3);
  });

  it('should work with different cache implementations', () => {
    const customCache: ICache = {
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(() => false),
      delete: vi.fn(() => false),
      clear: vi.fn(),
      size: 0,
      maxSize: 1000,
    };

    const testService = new StrictJsonCacheService(customCache);
    expect(testService.getSize()).toBe(0);
    expect(testService.getMaxSize()).toBe(1000);
    expect(testService.hasKey('test')).toBe(false);
  });
});

describe('StrictJsonModule - edge cases', () => {
  it('should work with empty options', () => {
    const module = StrictJsonModule.forRoot({});
    expect(module).toBeDefined();
    expect(module.module).toBe(StrictJsonModule);
  });

  it('should work with null options', () => {
    const module = StrictJsonModule.forRoot(null as never);
    expect(module).toBeDefined();
    expect(module.module).toBe(StrictJsonModule);
  });

  it('should work with cache options', () => {
    const cacheOptions = {
      enableCache: true,
      cacheSize: 2500,
      cacheTTL: 120000,
    };

    const module = StrictJsonModule.forRoot(cacheOptions);
    expect(module).toBeDefined();
    expect(module.module).toBe(StrictJsonModule);
  });

  it('should work with lazy mode options', () => {
    const lazyOptions = {
      lazyMode: true,
      lazyModeThreshold: 204800,
      lazyModeDepthLimit: 15,
    };

    const module = StrictJsonModule.forRoot(lazyOptions);
    expect(module).toBeDefined();
    expect(module.module).toBe(StrictJsonModule);
  });

  it('should work with whitelist/blacklist options', () => {
    const filterOptions = {
      whitelist: ['allowedKey1', 'allowedKey2'],
      blacklist: ['forbiddenKey1', 'forbiddenKey2'],
      ignoreCase: true,
    };

    const module = StrictJsonModule.forRoot(filterOptions);
    expect(module).toBeDefined();
    expect(module.module).toBe(StrictJsonModule);
  });

  it('should work with error handlers', () => {
    const errorHandlerOptions = {
      onDuplicateKey: vi.fn(),
      onInvalidJson: vi.fn(),
      onBodyTooLarge: vi.fn(),
      onPrototypePollution: vi.fn(),
      onError: vi.fn(),
    };

    const module = StrictJsonModule.forRoot(errorHandlerOptions);
    expect(module).toBeDefined();
    expect(module.module).toBe(StrictJsonModule);
  });

  it('should allow calling forRoot() multiple times', () => {
    const module1 = StrictJsonModule.forRoot({ cacheSize: 1000 });
    const module2 = StrictJsonModule.forRoot({ cacheSize: 2000 });
    const module3 = StrictJsonModule.forRoot();

    expect(module1).toBeDefined();
    expect(module2).toBeDefined();
    expect(module3).toBeDefined();
    expect(module1).not.toBe(module2);
  });

  it('should allow calling forRootAsync() multiple times', () => {
    const module1 = StrictJsonModule.forRootAsync({ cacheSize: 1500 });
    const module2 = StrictJsonModule.forRootAsync({ cacheSize: 2500 });
    const module3 = StrictJsonModule.forRootAsync();

    expect(module1).toBeDefined();
    expect(module2).toBeDefined();
    expect(module3).toBeDefined();
    expect(module1).not.toBe(module2);
  });
});

describe('StrictJsonModule - provider values', () => {
  it('should set correct options value in provider', () => {
    const options = { maxDepth: 30, enableCache: true };
    const module = StrictJsonModule.forRoot(options);
    
    const optionsProvider = module.providers?.find((p: any) => p.provide === STRICT_JSON_OPTIONS);
    expect(optionsProvider?.useValue).toEqual(options);
  });

  it('should set undefined options when none provided', () => {
    const module = StrictJsonModule.forRoot();
    
    const optionsProvider = module.providers?.find((p: any) => p.provide === STRICT_JSON_OPTIONS);
    expect(optionsProvider?.useValue).toBeUndefined();
  });

  it('should include StrictJsonCacheService as a provider class', () => {
    const module = StrictJsonModule.forRoot();
    
    const serviceProvider = module.providers?.find((p: any) => p === StrictJsonCacheService || p.provide === StrictJsonCacheService);
    expect(serviceProvider).toBeDefined();
    // If it's a provider object, check useClass; if it's a class directly, check itself
    if (serviceProvider?.useClass) {
      expect(serviceProvider.useClass).toBe(StrictJsonCacheService);
    } else {
      expect(serviceProvider).toBe(StrictJsonCacheService);
    }
  });
});

describe('StrictJsonModule - forRootAsync factory', () => {
  it('should have useFactory for STRICT_JSON_CACHE', () => {
    const module = StrictJsonModule.forRootAsync();
    
    const cacheProvider = module.providers?.find((p: any) => p.provide === STRICT_JSON_CACHE);
    expect(cacheProvider?.useFactory).toBeDefined();
    expect(typeof cacheProvider?.useFactory).toBe('function');
  });

  it('should inject STRICT_JSON_OPTIONS into cache factory', () => {
    const module = StrictJsonModule.forRootAsync();
    
    const cacheProvider = module.providers?.find((p: any) => p.provide === STRICT_JSON_CACHE);
    expect(cacheProvider?.inject).toContain(STRICT_JSON_OPTIONS);
  });

  it('should set correct options value for forRootAsync', () => {
    const options = { maxDepth: 25, enableCache: true };
    const module = StrictJsonModule.forRootAsync(options);
    
    const optionsProvider = module.providers?.find((p: any) => p.provide === STRICT_JSON_OPTIONS);
    expect(optionsProvider?.useValue).toEqual(options);
  });
});

describe('StrictJsonCacheService - complete coverage', () => {
  let cacheService: StrictJsonCacheService;
  let mockCache: ICache;

  beforeEach(() => {
    mockCache = createMockCache();
    cacheService = new StrictJsonCacheService(mockCache);
  });

  it('should call get on cache when calling service.get', () => {
    const testData = { key: 'value' };
    (mockCache.get as ReturnType<typeof vi.fn>).mockReturnValue(testData);
    
    const result = cacheService.get('test-key');
    expect(mockCache.get).toHaveBeenCalledWith('test-key');
    expect(result).toBe(testData);
  });

  it('should call delete on cache when calling service.delete', () => {
    (mockCache.delete as ReturnType<typeof vi.fn>).mockReturnValue(true);
    
    const result = cacheService.delete('test-key');
    expect(mockCache.delete).toHaveBeenCalledWith('test-key');
    expect(result).toBe(true);
  });

  it('should call has on cache when calling service.hasKey', () => {
    (mockCache.has as ReturnType<typeof vi.fn>).mockReturnValue(true);
    
    const result = cacheService.hasKey('test-key');
    expect(mockCache.has).toHaveBeenCalledWith('test-key');
    expect(result).toBe(true);
  });

  it('should call clear on cache when calling service.clear', () => {
    cacheService.clear();
    expect(mockCache.clear).toHaveBeenCalled();
  });

  it('should return correct size from cache', () => {
    (mockCache.size as number) = 100;
    const result = cacheService.getSize();
    expect(result).toBe(100);
  });

  it('should return correct maxSize from cache', () => {
    (mockCache.maxSize as number) = 5000;
    const result = cacheService.getMaxSize();
    expect(result).toBe(5000);
  });
});
