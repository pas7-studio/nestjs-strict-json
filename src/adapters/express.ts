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

const sendJson = (res: ServerResponse, statusCode: number, payload: unknown): void => {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
};

const JSON_CONTENT_TYPES = new Set([
  'application/json',
  'application/json-patch+json',
  'application/vnd.api+json',
  'application/merge-patch+json',
  'application/problem+json',
]);

const isJsonContentType = (contentType: string): boolean => {
  const base = contentType.split(';')[0].trim().toLowerCase();
  return JSON_CONTENT_TYPES.has(base);
};

const resolveErrorCode = (e: Error): string | null => {  if (e.message.includes("Duplicate key")) return "STRICT_JSON_DUPLICATE_KEY";
  if (e.message.includes("Prototype pollution")) return "STRICT_JSON_PROTOTYPE_POLLUTION";
  if (e.message.includes("Depth limit")) return "STRICT_JSON_DEPTH_LIMIT";
  if (e.message.includes("is not allowed")) return "STRICT_JSON_KEY_NOT_ALLOWED";
  return null;
};

export const createStrictJsonExpressMiddleware =
  (options?: StrictJsonOptions) =>
  async (
    req: ExpressReq,
    res: ExpressRes,
    next: ExpressNext,
  ): Promise<void> => {
    const contentType = req.headers["content-type"] ?? "";
    if (!isJsonContentType(contentType)) {
      next();
      return;
    }

    try {
      const contentLength = req.headers["content-length"]
        ? Number.parseInt(req.headers["content-length"], 10)
        : undefined;

      if (shouldUseStreaming(contentLength, options)) {
        const parsed = await parseJsonStream(req, options);
        req.body = parsed;
      } else {
        const raw = await readBody(req, options?.maxBodySizeBytes);
        const parsed = parseStrictJson(raw, options);
        req.body = parsed;
      }
      next();
    } catch (e) {
      if (e instanceof StrictJsonError) {
        sendJson(res, 400, {
          statusCode: 400,
          code: e.details.code,
          message: e.details.message,
          path: e.details.path,
          key: e.details.key,
          position: e.details.position,
        });
        return;
      }

      if (e instanceof Error && e.message === "BODY_TOO_LARGE") {
        sendJson(res, 413, {
          statusCode: 413,
          code: "STRICT_JSON_BODY_TOO_LARGE",
          message: "Request body too large",
        });
        return;
      }

      if (e instanceof Error) {
        const code = resolveErrorCode(e);
        if (code) {
          sendJson(res, 400, { statusCode: 400, code, message: e.message });
          return;
        }
      }

      sendJson(res, 400, {
        statusCode: 400,
        code: "STRICT_JSON_INVALID_JSON",
        message: "Invalid JSON",
      });
    }
  };
