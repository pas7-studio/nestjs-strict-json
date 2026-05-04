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

  parse(input: string | Buffer, isAsync: boolean = false): Promise<unknown> | unknown {
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
    const cacheKey = buildCacheKey(jsonStr, this.options);

    if (this.options?.enableCache !== false) {
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

  private parseSync(buf: Buffer, jsonStr: string, cacheKey: string): unknown {
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
      const parsed = JSON.parse(jsonStr);
      this.cacheResult(cacheKey, parsed);
      return parsed;
    }

    return this.fullParseSync(jsonStr, cacheKey);
  }

  private async parseAsync(buf: Buffer, jsonStr: string, cacheKey: string): Promise<unknown> {
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

    return this.fullParseAsync(jsonStr, cacheKey);
  }

  private fullParseSync(jsonStr: string, cacheKey: string): unknown {
    const { effectiveOptions } = this.buildEffectiveOptions(jsonStr);

    try {
      const duplicate = findDuplicateKeysInJson(jsonStr, effectiveOptions);
      if (duplicate) {
        const error = new DuplicateKeyError(duplicate.path, duplicate.key);
        this.invokeHandlerSync(this.options?.onDuplicateKey, error);
        this.invokeHandlerSync(this.options?.onError, error);
        throw error;
      }

      const parsed = JSON.parse(jsonStr);
      this.cacheResult(cacheKey, parsed);
      return parsed;
    } catch (e) {
      if (e instanceof PrototypePollutionError) {
        this.invokeHandlerSync(this.options?.onPrototypePollution, e);
        this.invokeHandlerSync(this.options?.onError, e);
        throw e;
      }

      if (e instanceof DepthLimitError) {
        this.invokeHandlerSync(this.options?.onError, e);
        throw e;
      }

      if (e instanceof DuplicateKeyError || e instanceof BodyTooLargeError) {
        throw e;
      }

      if (e instanceof InvalidJsonError) {
        this.invokeHandlerSync(this.options?.onInvalidJson, e);
        this.invokeHandlerSync(this.options?.onError, e);
        throw e;
      }

      const error = new InvalidJsonError("Invalid JSON");
      this.invokeHandlerSync(this.options?.onInvalidJson, error);
      this.invokeHandlerSync(this.options?.onError, error);
      throw error;
    }
  }

  private async fullParseAsync(jsonStr: string, cacheKey: string): Promise<unknown> {
    const { effectiveOptions } = this.buildEffectiveOptions(jsonStr);

    try {
      const duplicate = findDuplicateKeysInJson(jsonStr, effectiveOptions);
      if (duplicate) {
        const error = new DuplicateKeyError(duplicate.path, duplicate.key);
        await this.invokeHandlerAsync(this.options?.onDuplicateKey, error);
        await this.invokeHandlerAsync(this.options?.onError, error);
        throw error;
      }

      const parsed = JSON.parse(jsonStr);
      this.cacheResult(cacheKey, parsed);
      return parsed;
    } catch (e) {
      if (e instanceof PrototypePollutionError) {
        await this.invokeHandlerAsync(this.options?.onPrototypePollution, e);
        await this.invokeHandlerAsync(this.options?.onError, e);
        throw e;
      }

      if (e instanceof DepthLimitError) {
        await this.invokeHandlerAsync(this.options?.onError, e);
        throw e;
      }

      if (e instanceof DuplicateKeyError || e instanceof BodyTooLargeError) {
        throw e;
      }

      if (e instanceof InvalidJsonError) {
        await this.invokeHandlerAsync(this.options?.onInvalidJson, e);
        await this.invokeHandlerAsync(this.options?.onError, e);
        throw e;
      }

      const error = new InvalidJsonError("Invalid JSON");
      await this.invokeHandlerAsync(this.options?.onInvalidJson, error);
      await this.invokeHandlerAsync(this.options?.onError, error);
      throw error;
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

  private cacheResult(cacheKey: string, result: unknown): void {
    if (this.options?.enableCache !== false) {
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
