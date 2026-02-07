export { parseStrictJson, parseStrictJsonAsync, clearParseCache, getParseCacheSize } from "./core/parser.js";
export {
  StreamingJsonParser,
  parseJsonStream,
  shouldUseStreaming,
} from "./core/streaming-parser.js";
export {
  StrictJsonError,
  DuplicateKeyError,
  InvalidJsonError,
  BodyTooLargeError,
  PrototypePollutionError,
  DepthLimitError,
} from "./core/errors.js";
export type {
  StrictJsonOptions,
  StrictJsonErrorDetails,
  StrictJsonErrorCode,
} from "./core/types.js";
export {
  globToRegex,
  matchGlobPattern,
  isKeyAllowed,
} from "./core/utils.js";

export { registerStrictJson } from "./nest/register.js";
export { StrictJsonModule } from "./nest/module.js";

export { registerStrictJsonFastify } from "./adapters/fastify.js";
export { createStrictJsonExpressMiddleware } from "./adapters/express.js";
