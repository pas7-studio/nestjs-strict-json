import {
  DynamicModule,
  Module,
  OnApplicationBootstrap,
  OnModuleDestroy,
  Inject,
  Optional,
  ValueProvider,
  Provider,
} from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import type { StrictJsonOptions } from "../core/types.js";
import type { ICache } from "../core/cache/index.js";
import { createCache } from "../core/cache/index.js";
import { registerStrictJson } from "./register.js";
import { StrictJsonCacheService } from "./cache.service.js";

/**
 * Символ токена для DI опцій StrictJson.
 */
export const STRICT_JSON_OPTIONS = Symbol("STRICT_JSON_OPTIONS");

/**
 * Символ токена для DI NestJS Application.
 */
export const NEST_APP = Symbol("NEST_APP");

/**
 * Символ токена для DI кешу StrictJson.
 * Цей символ використовується для ін'єкції екземпляра кешу в сервіси.
 */
export const STRICT_JSON_CACHE = Symbol("STRICT_JSON_CACHE");

/**
 * Створює провайдер для кешу з налаштуваннями.
 *
 * Ця factory-функція створює провайдер кешу на основі наданих опцій.
 * Використовується всередині методів StrictJsonModule.forRoot та forRootAsync.
 *
 * @param options - Опції конфігурації для створення кешу (опціонально)
 * @returns ValueProvider для кешу
 *
 * @internal
 */
function createCacheProvider(options?: StrictJsonOptions): ValueProvider<ICache> {
  return {
    provide: STRICT_JSON_CACHE,
    useValue: createCache(options),
  };
}

/**
 * NestJS модуль для інтеграції StrictJson.
 *
 * Цей модуль надає Dependency Injection для кешу та опцій StrictJson,
 * автоматично реєструє middleware для обробки JSON запитів та
 * забезпечує правильний життєвий цикл кешу з очищенням при знищенні модуля.
 *
 * @example
 * ```typescript
 * // Basic usage with default options
 * import { Module } from '@nestjs/common';
 * import { StrictJsonModule } from '@nestjs-strict-json/nest';
 *
 * @Module({
 *   imports: [StrictJsonModule.forRoot()],
 * })
 * export class AppModule {}
 * ```
 *
 * @example
 * ```typescript
 * // With custom options
 * import { Module } from '@nestjs/common';
 * import { StrictJsonModule } from '@nestjs-strict-json/nest';
 *
 * @Module({
 *   imports: [
 *     StrictJsonModule.forRoot({
 *       enableCache: true,
 *       cacheSize: 2000,
 *       maxDepth: 30,
 *       maxBodySizeBytes: 5 * 1024 * 1024, // 5MB
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @example
 * ```typescript
 * // Using forRootAsync for dynamic configuration
 * import { Module } from '@nestjs/common';
 * import { ConfigModule, ConfigService } from '@nestjs/config';
 * import { StrictJsonModule } from '@nestjs-strict-json/nest';
 *
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot(),
 *     StrictJsonModule.forRootAsync({
 *       imports: [ConfigModule],
 *       useFactory: (config: ConfigService) => ({
 *         enableCache: config.get('STRICT_JSON_CACHE_ENABLED'),
 *         cacheSize: config.get('STRICT_JSON_CACHE_SIZE'),
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @example
 * ```typescript
 * // Using StrictJsonCacheService in your services
 * import { Injectable } from '@nestjs/common';
 * import { StrictJsonCacheService } from '@nestjs-strict-json/nest';
 *
 * @Injectable()
 * export class MyService {
 *   constructor(private readonly cacheService: StrictJsonCacheService) {}
 *
 *   getCacheStats() {
 *     return {
 *       size: this.cacheService.getSize(),
 *       maxSize: this.cacheService.getMaxSize(),
 *     };
 *   }
 *
 *   clearCache() {
 *     this.cacheService.clear();
 *   }
 * }
 * ```
 */
@Module({})
export class StrictJsonModule implements OnApplicationBootstrap, OnModuleDestroy {
  /**
   * Створює новий екземпляр StrictJsonModule.
   *
   * @param cache - Інтерфейс кешу для управління
   * @param options - Опції конфігурації StrictJson (опціонально)
   * @param app - Екземпляр NestJS Application (опціонально)
   */
  public constructor(
    @Inject(STRICT_JSON_CACHE) private readonly cache: ICache,
    @Optional()
    @Inject(STRICT_JSON_OPTIONS)
    private readonly options?: StrictJsonOptions,
    @Optional()
    @Inject(NEST_APP)
    private readonly app?: INestApplication,
  ) {}

  /**
   * Створює статичний DynamicModule з налаштуваннями за замовчуванням.
   *
   * Цей метод створює модуль з синхронним наданням опцій.
   * Модуль є глобальним і експортує кеш, опції та сервіс кешу.
   *
   * @param options - Опції конфігурації StrictJson (опціонально)
   * @returns DynamicModule з провайдерами та експортами
   *
   * @example
   * ```typescript
   * import { Module } from '@nestjs/common';
   * import { StrictJsonModule } from '@nestjs-strict-json/nest';
   *
   * @Module({
   *   imports: [
   *     StrictJsonModule.forRoot({
   *       enableCache: true,
   *       cacheSize: 1000,
   *     }),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  public static forRoot(options?: StrictJsonOptions): DynamicModule {
    return {
      module: StrictJsonModule,
      providers: [
        createCacheProvider(options),
        {
          provide: STRICT_JSON_OPTIONS,
          useValue: options,
        },
        StrictJsonCacheService,
      ],
      exports: [STRICT_JSON_CACHE, STRICT_JSON_OPTIONS, StrictJsonCacheService],
      global: true,
    };
  }

  /**
   * Створює асинхронний DynamicModule для динамічного налаштування.
   *
   * Цей метод дозволяє використовувати factory-функції для створення опцій,
   * що корисно при інтеграції з ConfigModule або іншими сервісами конфігурації.
   *
   * Примітка: Цей метод приймає `forRootAsync` патерн NestJS з `useFactory`,
   * але наразі реалізує простий варіант, який приймає опції напряму.
   *
   * @param options - Опції конфігурації StrictJson (опціонально)
   * @returns DynamicModule з провайдерами та експортами
   *
   * @example
   * ```typescript
   * import { Module } from '@nestjs/common';
   * import { ConfigModule, ConfigService } from '@nestjs/config';
   * import { StrictJsonModule } from '@nestjs-strict-json/nest';
   *
   * @Module({
   *   imports: [
   *     ConfigModule.forRoot(),
   *     StrictJsonModule.forRootAsync({
   *       imports: [ConfigModule],
   *       useFactory: async (config: ConfigService) => ({
   *         enableCache: config.get('STRICT_JSON_CACHE_ENABLED', true),
   *         cacheSize: config.get('STRICT_JSON_CACHE_SIZE', 1000),
   *         maxDepth: config.get('STRICT_JSON_MAX_DEPTH', 20),
   *       }),
   *       inject: [ConfigService],
   *     }),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  public static forRootAsync(options?: StrictJsonOptions): DynamicModule {
    return {
      module: StrictJsonModule,
      imports: [],
      providers: [
        {
          provide: STRICT_JSON_CACHE,
          useFactory: (opts?: StrictJsonOptions) => createCache(opts),
          inject: [STRICT_JSON_OPTIONS],
        },
        {
          provide: STRICT_JSON_OPTIONS,
          useValue: options,
        },
        StrictJsonCacheService,
      ],
      exports: [STRICT_JSON_CACHE, STRICT_JSON_OPTIONS, StrictJsonCacheService],
      global: true,
    };
  }

  /**
   * Хук життєвого циклу, що викликається після завантаження модуля.
   *
   * Реєструє StrictJson middleware для обробки JSON запитів.
   * Автоматично визначає тип адаптера (Express або Fastify) та
   * реєструє відповідний middleware/hook.
   *
   * Цей метод викликається NestJS після завантаження всіх модулів,
   * але до того, як додаток почне обробляти запити.
   */
  public onApplicationBootstrap(): void {
    if (!this.app) return;
    registerStrictJson(this.app as never, this.options);
  }

  /**
   * Хук життєвого циклу, що викликається перед знищенням модуля.
   *
   * Очищає всі записи з кешу перед знищенням модуля.
   * Це забезпечує правильне звільнення ресурсів та запобігає
   * витокам пам'яті при перезапуску або знищенні додатку.
   *
   * Цей метод викликається NestJS перед знищенням модуля,
   * що дозволяє коректно завершити роботу з кешем.
   */
  public onModuleDestroy(): void {
    // Очищення кешу при знищенні модуля
    this.cache.clear();
  }
}
