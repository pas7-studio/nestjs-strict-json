import type { StrictJsonErrorDetails } from "./types.js";

export class StrictJsonError extends Error {
  public readonly details: StrictJsonErrorDetails;

  public constructor(details: StrictJsonErrorDetails) {
    super(details.message);
    this.details = details;
  }
}

export class DuplicateKeyError extends StrictJsonError {
  public constructor(path: string, key: string, position?: number) {
    super({
      code: "STRICT_JSON_DUPLICATE_KEY",
      message: `Duplicate JSON key "${key}" at ${path}`,
      path,
      key,
      position,
    });
  }
}

export class InvalidJsonError extends StrictJsonError {
  public constructor(message: string) {
    super({
      code: "STRICT_JSON_INVALID_JSON",
      message,
    });
  }
}

export class BodyTooLargeError extends StrictJsonError {
  public constructor(maxBodySizeBytes: number) {
    super({
      code: "STRICT_JSON_BODY_TOO_LARGE",
      message: `Request body exceeds max size of ${maxBodySizeBytes} bytes`,
    });
  }
}

export class PrototypePollutionError extends StrictJsonError {
  readonly code = 'STRICT_JSON_PROTOTYPE_POLLUTION' as const;
  constructor(
    public readonly dangerousKey: string,
    public readonly path: string
  ) {
    super({
      code: 'STRICT_JSON_PROTOTYPE_POLLUTION',
      message: `Prototype pollution attempt detected: dangerous key '${dangerousKey}' at ${path}`,
      path,
      dangerousKey
    });
  }
}

export class DepthLimitError extends StrictJsonError {
  readonly code = 'STRICT_JSON_DEPTH_LIMIT' as const;
  constructor(
    public readonly currentDepth: number,
    public readonly maxDepth: number
  ) {
    super({
      code: 'STRICT_JSON_DEPTH_LIMIT',
      message: `JSON depth limit exceeded: ${currentDepth} > ${maxDepth}`,
      currentDepth,
      maxDepth
    });
  }
}
