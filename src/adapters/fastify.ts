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

export const registerStrictJsonFastify = (
  instance: FastifyLikeInstance,
  options?: StrictJsonOptions,
): void => {
  instance.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => {
      try {
        const parsed = parseStrictJson(body, options);
        done(null, parsed);
      } catch (e) {
        if (e instanceof StrictJsonError) {
          const d = e.details;
          const payload = {
            code: d.code,
            message: d.message,
            ...(d.path || d.key || typeof d.position === "number"
              ? {
                  details: {
                    ...(d.path ? { path: d.path } : {}),
                    ...(d.key ? { key: d.key } : {}),
                    ...(typeof d.position === "number"
                      ? { position: d.position }
                      : {}),
                  },
                }
              : {}),
          };

          if (d.code === "STRICT_JSON_BODY_TOO_LARGE") {
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
};
