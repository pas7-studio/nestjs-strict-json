/**
 * @module options
 *
 * This module exports all option interfaces used for configuring StrictJson parsing behavior.
 * Options are organized into logical groups following the Interface Segregation Principle,
 * making it easier to use and understand only the options you need.
 *
 * @example Import all options
 * ```typescript
 * import type {
 *   StrictJsonOptions,
 *   ParserOptions,
 *   CacheOptions,
 *   StreamingOptions,
 *   LazyOptions,
 *   FilteringOptions,
 *   ErrorHandlerOptions
 * } from 'nestjs-strict-json/core/options';
 * ```
 *
 * @example Import specific options
 * ```typescript
 * import type { ParserOptions, CacheOptions } from 'nestjs-strict-json/core/options';
 * ```
 */

// Export individual option groups
export * from './parser-options';
export * from './cache-options';
export * from './streaming-options';
export * from './lazy-options';
export * from './filtering-options';
export * from './error-handlers';

// Re-export StrictJsonOptions from types for convenience
export type { StrictJsonOptions } from '../types';
