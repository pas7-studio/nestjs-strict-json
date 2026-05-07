import {
  BadRequestException,
  PayloadTooLargeException,
} from "@nestjs/common";
import type { StrictJsonOptions } from "../core/types.js";
import { StrictJsonError } from "../core/errors.js";
import { parseStrictJson } from "../core/parser.js";

export type FastifyLikeInstance = {
  addContentTypeParser: (
    contentType: string,
    opts: { parseAs: "string" | "buffer" },
    parser: (
      req: unknown,
      body: string | Buffer,
      done: (err: Error | null, value?: unknown) => void,
    ) => void,
  ) => void;
};

const buildErrorPayload = (d: { code: string; message: string; path?: string; key?: string; position?: number }) => {
  const hasDetails = d.path || d.key || typeof d.position === "number";
  if (!hasDetails) return { code: d.code, message: d.message };

  return {
    code: d.code,
    message: d.message,
    details: {
      ...(d.path ? { path: d.path } : {}),
      ...(d.key ? { key: d.key } : {}),
      ...(typeof d.position === "number" ? { position: d.position } : {}),
    },
  };
};

const JSON_CONTENT_TYPES = [
  'application/json',
  'application/json-patch+json',
  'application/vnd.api+json',
  'application/merge-patch+json',
  'application/problem+json',
];

export const registerStrictJsonFastify = (
  instance: FastifyLikeInstance,
  options?: StrictJsonOptions,
): void => {
  for (const contentType of JSON_CONTENT_TYPES) {
    instance.addContentTypeParser(
      contentType,
      { parseAs: "buffer" },
      (_req, body, done) => {
        try {
          const parsed = parseStrictJson(body, options);
          done(null, parsed);
        } catch (e) {
          if (e instanceof StrictJsonError) {
            const payload = buildErrorPayload(e.details);

            if (e.details.code === "STRICT_JSON_BODY_TOO_LARGE") {
              done(new PayloadTooLargeException(payload));
              return;
            }

            done(new BadRequestException(payload));
            return;
          }

          done(e instanceof Error ? e : new Error("Strict JSON error"));
        }
      },
    );
  }
};
