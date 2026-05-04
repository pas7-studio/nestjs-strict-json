import type { StrictJsonErrorHandler } from "../types.js";

/**
 * Error handler class for managing error invocations.
 * Provides both synchronous and asynchronous error handling methods.
 */
class ErrorHandler {
  /**
   * Invokes a custom error handler synchronously.
   * If the handler throws an error, it is silently ignored to prevent
   * interfering with the original error being thrown.
   *
   * @param handler - The custom error handler function (optional)
   * @param error - The error to pass to the handler
   */
  invokeSync(handler: StrictJsonErrorHandler | undefined, error: unknown): void {
    if (handler) {
      try {
        handler(error);
      } catch {
        // Handler errors should not prevent original error from being thrown
      }
    }
  }

  /**
   * Invokes a custom error handler asynchronously.
   * If the handler throws an error, it is silently ignored to prevent
   * interfering with the original error being thrown.
   *
   * @param handler - The custom error handler function (optional)
   * @param error - The error to pass to the handler
   */
  async invokeAsync(handler: StrictJsonErrorHandler | undefined, error: unknown): Promise<void> {
    if (handler) {
      try {
        await handler(error);
      } catch {
        // Handler errors should not prevent original error from being thrown
      }
    }
  }
}

// Export singleton instance and type
export const errorHandler = new ErrorHandler();
export type { ErrorHandler };

// Convenience functions for backward compatibility
/**
 * Invokes a custom error handler synchronously.
 * If the handler throws an error, it is silently ignored to prevent
 * interfering with the original error being thrown.
 *
 * @param handler - The custom error handler function (optional)
 * @param error - The error to pass to the handler
 */
export function invokeErrorHandlerSync(handler: StrictJsonErrorHandler | undefined, error: unknown): void {
  errorHandler.invokeSync(handler, error);
}

/**
 * Invokes a custom error handler asynchronously.
 * If the handler throws an error, it is silently ignored to prevent
 * interfering with the original error being thrown.
 *
 * @param handler - The custom error handler function (optional)
 * @param error - The error to pass to the handler
 */
export async function invokeErrorHandlerAsync(handler: StrictJsonErrorHandler | undefined, error: unknown): Promise<void> {
  await errorHandler.invokeAsync(handler, error);
}
