import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  type FastifyLikeInstance,
  registerStrictJsonFastify,
} from "../src/adapters/fastify.js";

describe("registerStrictJsonFastify", () => {
  it("maps strict duplicate-key errors to 400 with code in payload", () => {
    let parser:
      | ((
          req: unknown,
          body: string | Buffer,
          done: (err: Error | null, value?: unknown) => void,
        ) => void)
      | undefined;

    const instance: FastifyLikeInstance = {
      addContentTypeParser: (_contentType, _opts, p) => {
        parser = p;
      },
    };

    registerStrictJsonFastify(instance);

    const doneCalls: Array<{ err: Error | null; value?: unknown }> = [];
    parser?.({}, Buffer.from('{"status":"a","status":"b"}'), (err, value) => {
      doneCalls.push({ err, value });
    });

    expect(doneCalls).toHaveLength(1);
    expect(doneCalls[0]?.err).toBeInstanceOf(BadRequestException);

    const err = doneCalls[0]?.err as BadRequestException;
    expect(err.getStatus()).toBe(400);
    expect(err.getResponse()).toMatchObject({
      code: "STRICT_JSON_DUPLICATE_KEY",
    });
  });
});
