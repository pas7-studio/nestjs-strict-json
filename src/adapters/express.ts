import type { IncomingMessage, ServerResponse } from "node:http";
import { parseStrictJson } from "../core/parser.js";
import { parseJsonStream, shouldUseStreaming } from "../core/streaming-parser.js";
import type { StrictJsonOptions } from "../core/types.js";
import { StrictJsonError } from "../core/errors.js";

export type ExpressReq = IncomingMessage & { body?: unknown };
export type ExpressRes = ServerResponse;
export type ExpressNext = (err?: unknown) => void;

const readBody = async (
  req: IncomingMessage,
  maxBodySizeBytes?: number,
): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.byteLength;
    if (typeof maxBodySizeBytes === "number" && total > maxBodySizeBytes) {
      throw new Error("BODY_TOO_LARGE");
    }
    chunks.push(buf);
  }

  return Buffer.concat(chunks);
};

export const createStrictJsonExpressMiddleware =
  (options?: StrictJsonOptions) =>
  async (
    req: ExpressReq,
    res: ExpressRes,
    next: ExpressNext,
  ): Promise<void> => {
    const contentType = req.headers["content-type"] ?? "";
    if (!String(contentType).startsWith("application/json")) {
      next();
      return;
    }

    try {
      // Check content-length header to determine if streaming should be used
      const contentLength = req.headers["content-length"]
        ? parseInt(req.headers["content-length"], 10)
        : undefined;

      // Determine which parsing strategy to use
      if (shouldUseStreaming(contentLength, options)) {
        // Use streaming parser for large payloads
        const parsed = await parseJsonStream(req, options);
        req.body = parsed;
        next();
      } else {
        // Use buffer parser for small payloads (backward compatible)
        const raw = await readBody(req, options?.maxBodySizeBytes);
        const parsed = parseStrictJson(raw, options);
        req.body = parsed;
        next();
      }
    } catch (e) {
      if (e instanceof StrictJsonError) {
        const payload = {
          statusCode: 400,
          code: e.details.code,
          message: e.details.message,
          path: e.details.path,
          key: e.details.key,
          position: e.details.position,
        };
        res.statusCode = 400;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify(payload));
        return;
      }

      if (e instanceof Error && e.message === "BODY_TOO_LARGE") {
        res.statusCode = 413;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(
          JSON.stringify({
            statusCode: 413,
            code: "STRICT_JSON_BODY_TOO_LARGE",
            message: "Request body too large",
          }),
        );
        return;
      }

      // Handle streaming parser errors
      if (e instanceof Error) {
        const isDuplicateKey = e.message.includes("Duplicate key");
        const isPrototypePollution = e.message.includes("Prototype pollution");
        const isDepthLimit = e.message.includes("Depth limit");
        const isKeyNotAllowed = e.message.includes("is not allowed");

        if (isDuplicateKey || isPrototypePollution || isDepthLimit || isKeyNotAllowed) {
          const code = isDuplicateKey
            ? "STRICT_JSON_DUPLICATE_KEY"
            : isPrototypePollution
              ? "STRICT_JSON_PROTOTYPE_POLLUTION"
              : isDepthLimit
                ? "STRICT_JSON_DEPTH_LIMIT"
                : "STRICT_JSON_INVALID_JSON";

          res.statusCode = 400;
          res.setHeader("content-type", "application/json; charset=utf-8");
          res.end(
            JSON.stringify({
              statusCode: 400,
              code,
              message: e.message,
            }),
          );
          return;
        }
      }

      res.statusCode = 400;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          statusCode: 400,
          code: "STRICT_JSON_INVALID_JSON",
          message: "Invalid JSON",
        }),
      );
    }
  };
