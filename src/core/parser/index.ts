import {
  BodyTooLargeError,
  DepthLimitError,
  DuplicateKeyError,
  InvalidJsonError,
  PrototypePollutionError,
} from "../errors.js";
import type { StrictJsonOptions, StrictJsonErrorHandler } from "../types.js";
import { getParseCache, buildCacheKey } from "./cache-manager.js";
import { findDuplicateKeysInJson } from "./parser-core.js";
import { parseWithFastPath } from "./fast-path.js";
import { shouldUseStreamingForPayload, parseLargePayload } from "./streaming.js";
import { errorHandler } from "./error-handler.js";

export * from "./cache-manager.js";
export * from "./parser-core.js";
export * from "./fast-path.js";
export * from "./streaming.js";
export * from "./error-handler.js";

class JsonParser {
  private readonly options?: StrictJsonOptions;

  constructor(options?: StrictJsonOptions) {
    this.options = options;
  }

  parse(input: string | Buffer, isAsync: boolean = false): unknown {
    const maxBodySizeBytes = this.options?.maxBodySizeBytes;
    const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;

    if (
      typeof maxBodySizeBytes === "number" &&
      buf.byteLength > maxBodySizeBytes
    ) {
      const error = new BodyTooLargeError(maxBodySizeBytes);
      if (isAsync) {
        return (async () => {
          await this.invokeHandlerAsync(this.options?.onBodyTooLarge, error);
          await this.invokeHandlerAsync(this.options?.onError, error);
          throw error;
        })();
      }
      this.invokeHandlerSync(this.options?.onBodyTooLarge, error);
      this.invokeHandlerSync(this.options?.onError, error);
      throw error;
    }

    const jsonStr = buf.toString("utf-8");
    const cachingEnabled = this.options?.enableCache !== false;
    const cacheKey = cachingEnabled ? buildCacheKey(jsonStr, this.options) : null;

    if (cacheKey !== null) {
      const cached = getParseCache().get(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    if (isAsync) {
      return this.parseAsync(buf, jsonStr, cacheKey);
    }
    return this.parseSync(buf, jsonStr, cacheKey);
  }

  private parseSync(buf: Buffer, jsonStr: string, cacheKey: string | null): unknown {
    const useStreaming = shouldUseStreamingForPayload(buf, this.options);

    if (this.options?.enableFastPath === true && !useStreaming) {
      try {
        const result = parseWithFastPath(jsonStr, this.options);
        this.cacheResult(cacheKey, result);
        return result;
      } catch {
        // Fall through to full parser
      }
    }

    if (useStreaming) {
      return this.fullParse(jsonStr, cacheKey, (h, e) => this.invokeHandlerSync(h, e));
    }

    return this.fullParse(jsonStr, cacheKey, (h, e) => this.invokeHandlerSync(h, e));
  }

  private async parseAsync(buf: Buffer, jsonStr: string, cacheKey: string | null): Promise<unknown> {
    const useStreaming = shouldUseStreamingForPayload(buf, this.options);

    if (this.options?.enableFastPath === true && !useStreaming) {
      try {
        const result = parseWithFastPath(jsonStr, this.options);
        this.cacheResult(cacheKey, result);
        return result;
      } catch {
        // Fall through to full parser
      }
    }

    if (useStreaming) {
      const result = await parseLargePayload(buf, this.options);
      this.cacheResult(cacheKey, result);
      return result;
    }

    return this.fullParse(jsonStr, cacheKey, async (h, e) => { await this.invokeHandlerAsync(h, e); });
  }

  private fullParse(
    jsonStr: string,
    cacheKey: string | null,
    invoke: (handler: StrictJsonErrorHandler | undefined, error: unknown) => void,
  ): unknown {
    const { effectiveOptions } = this.buildEffectiveOptions(jsonStr);

    try {
      const duplicate = findDuplicateKeysInJson(jsonStr, effectiveOptions);
      if (duplicate) {
        const error = new DuplicateKeyError(duplicate.path, duplicate.key);
        invoke(this.options?.onDuplicateKey, error);
        invoke(this.options?.onError, error);
        throw error;
      }

      const parsed = JSON.parse(jsonStr);
      this.cacheResult(cacheKey, parsed);
      return parsed;
    } catch (e) {
      let errorToThrow: unknown = e;

      if (e instanceof PrototypePollutionError) {
        invoke(this.options?.onPrototypePollution, e);
        invoke(this.options?.onError, e);
      } else if (e instanceof DepthLimitError) {
        invoke(this.options?.onError, e);
      } else if (e instanceof DuplicateKeyError || e instanceof BodyTooLargeError) {
        // No handler invocation for these errors
      } else if (e instanceof InvalidJsonError) {
        invoke(this.options?.onInvalidJson, e);
        invoke(this.options?.onError, e);
      } else {
        const error = new InvalidJsonError("Invalid JSON");
        invoke(this.options?.onInvalidJson, error);
        invoke(this.options?.onError, error);
        errorToThrow = error;
      }

      throw errorToThrow;
    }
  }

  private buildEffectiveOptions(jsonStr: string): { effectiveOptions: StrictJsonOptions | undefined } {
    const lazyMode = this.options?.lazyMode === true;
    const lazyModeThreshold = this.options?.lazyModeThreshold ?? 100 * 1024;
    const shouldUseLazyMode = lazyMode || (Buffer.byteLength(jsonStr, 'utf8') >= lazyModeThreshold);

    const effectiveOptions: StrictJsonOptions | undefined = shouldUseLazyMode ? {
      ...this.options,
      lazyMode: true,
      lazyModeDepthLimit: this.options?.lazyModeDepthLimit ?? 10,
      lazyModeSkipPrototype: this.options?.lazyModeSkipPrototype ?? true,
      lazyModeSkipWhitelist: this.options?.lazyModeSkipWhitelist ?? true,
      lazyModeSkipBlacklist: this.options?.lazyModeSkipBlacklist ?? false,
    } : this.options;

    return { effectiveOptions };
  }

  private cacheResult(cacheKey: string | null, result: unknown): void {
    if (cacheKey !== null) {
      getParseCache().set(cacheKey, result);
    }
  }

  private invokeHandlerSync(handler: StrictJsonErrorHandler | undefined, error: unknown): void {
    errorHandler.invokeSync(handler, error);
  }

  private invokeHandlerAsync(handler: StrictJsonErrorHandler | undefined, error: unknown): Promise<void> {
    return errorHandler.invokeAsync(handler, error);
  }
}

export function parseStrictJson(
  raw: string | Buffer,
  options?: StrictJsonOptions,
): unknown {
  return new JsonParser(options).parse(raw, false);
}

export async function parseStrictJsonAsync(
  raw: string | Buffer,
  options?: StrictJsonOptions,
): Promise<unknown> {
  const result = new JsonParser(options).parse(raw, true);
  if (result instanceof Promise) {
    return await result;
  }
  return result;
}
