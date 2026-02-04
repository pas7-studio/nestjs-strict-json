export { parseStrictJson } from "./core/parser.js";
export {
  StrictJsonError,
  DuplicateKeyError,
  InvalidJsonError,
  BodyTooLargeError,
} from "./core/errors.js";
export type {
  StrictJsonOptions,
  StrictJsonErrorDetails,
  StrictJsonErrorCode,
} from "./core/types.js";

export { registerStrictJson } from "./nest/register.js";
export { StrictJsonModule } from "./nest/module.js";

export { registerStrictJsonFastify } from "./adapters/fastify.js";
export { createStrictJsonExpressMiddleware } from "./adapters/express.js";
