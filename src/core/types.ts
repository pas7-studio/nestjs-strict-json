export type StrictJsonOptions = {
  maxBodySizeBytes?: number;
};

export type StrictJsonErrorCode =
  | "STRICT_JSON_DUPLICATE_KEY"
  | "STRICT_JSON_INVALID_JSON"
  | "STRICT_JSON_BODY_TOO_LARGE";

export type StrictJsonErrorDetails = {
  code: StrictJsonErrorCode;
  message: string;
  path?: string;
  key?: string;
  position?: number;
};
