import type { INestApplication } from "@nestjs/common";
import type { StrictJsonOptions } from "../core/types.js";
import { registerStrictJsonFastify } from "../adapters/fastify.js";
import { createStrictJsonExpressMiddleware } from "../adapters/express.js";

type NestHttpAdapterLike = {
  getType: () => string;
  getInstance: () => unknown;
};

type NestAppLike = INestApplication & {
  getHttpAdapter: () => NestHttpAdapterLike;
  use: (middleware: unknown) => void;
};

export const registerStrictJson = (
  app: NestAppLike,
  options?: StrictJsonOptions,
): void => {
  const adapter = app.getHttpAdapter();
  const type = adapter.getType();

  if (type === "fastify") {
    const instance = adapter.getInstance();
    registerStrictJsonFastify(instance as never, options);
    return;
  }

  if (type === "express") {
    app.use(createStrictJsonExpressMiddleware(options));
    return;
  }

  throw new Error(`Unsupported Nest adapter type: ${type}`);
};
