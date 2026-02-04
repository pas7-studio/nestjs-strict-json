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
