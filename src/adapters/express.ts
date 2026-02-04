import type { IncomingMessage, ServerResponse } from "node:http";
import { parseStrictJson } from "../core/parser.js";
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
      const raw = await readBody(req, options?.maxBodySizeBytes);
      const parsed = parseStrictJson(raw, options);
      req.body = parsed;
      next();
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
