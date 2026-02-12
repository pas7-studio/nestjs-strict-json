export { 
  parseStrictJson, 
  parseStrictJsonAsync, 
  clearParseCache, 
  getParseCacheSize,
  shutdownCacheManager,
  resetCacheManager,
  isCleanupIntervalRunning,
} from "./core/parser.js";
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
} from "./core/utils.js";
export {
  isKeyAllowed,
  KeyPolicyValidator,
  PatternMatcher,
  createKeyPolicyValidator,
  createPatternMatcher,
  getCachedValidator,
  clearValidatorCache,
  getValidatorCacheSize,
} from "./core/validation/index.js";

export { registerStrictJson } from "./nest/register.js";
export { StrictJsonModule } from "./nest/module.js";

export { registerStrictJsonFastify } from "./adapters/fastify.js";
export { createStrictJsonExpressMiddleware } from "./adapters/express.js";
