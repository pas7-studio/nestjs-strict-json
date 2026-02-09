import type { StrictJsonErrorHandler } from '../types';

/**
 * Error handler options for customizing error handling behavior.
 *
 * These options allow you to provide custom handlers for different types of
 * errors that can occur during JSON parsing and validation.
 * Each handler receives an error object and can optionally return a Promise.
 */
export interface ErrorHandlerOptions {
  /**
   * Custom handler for duplicate key errors.
   * Called when a JSON object contains duplicate keys.
   *
   * The error object includes details about the duplicate key, its location, and other context.
   *
   * @example
   * ```typescript
   * {
   *   onDuplicateKey: (error) => {
   *     console.error('Duplicate key:', error.key);
   *     throw error;
   *   }
   * }
   * ```
   */
  onDuplicateKey?: StrictJsonErrorHandler;

  /**
   * Custom handler for invalid JSON errors.
   * Called when the input cannot be parsed as valid JSON.
   *
   * The error object includes details about the syntax error, its position, and other context.
   *
   * @example
   * ```typescript
   * {
   *   onInvalidJson: (error) => {
   *     console.error('Invalid JSON:', error.message);
   *     throw error;
   *   }
   * }
   * ```
   */
  onInvalidJson?: StrictJsonErrorHandler;

  /**
   * Custom handler for body too large errors.
   * Called when the JSON payload exceeds `maxBodySizeBytes`.
   *
   * The error object includes details about the actual size and the limit.
   *
   * @example
   * ```typescript
   * {
   *   onBodyTooLarge: (error) => {
   *     console.error('Body too large:', error.message);
   *     throw new Error('Payload exceeds maximum size');
   *   }
   * }
   * ```
   */
  onBodyTooLarge?: StrictJsonErrorHandler;

  /**
   * Custom handler for prototype pollution errors.
   * Called when a dangerous key that could modify the Object prototype is detected.
   *
   * The error object includes details about the dangerous key and its location.
   *
   * @example
   * ```typescript
   * {
   *   onPrototypePollution: (error) => {
   *     console.error('Prototype pollution attempt:', error.dangerousKey);
   *     throw error;
   *   }
   * }
   * ```
   */
  onPrototypePollution?: StrictJsonErrorHandler;

  /**
   * Generic error handler for any type of error.
   * Called as a fallback when no specific handler is defined for an error type.
   * If specific handlers are provided, they take precedence over this generic handler.
   *
   * @example
   * ```typescript
   * {
   *   onError: (error) => {
   *     console.error('JSON parsing error:', error);
   *     throw error;
   *   }
   * }
   * ```
   */
  onError?: StrictJsonErrorHandler;
}
