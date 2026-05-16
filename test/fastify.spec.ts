import { BadRequestException, PayloadTooLargeException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
  type FastifyLikeInstance,
  registerStrictJsonFastify,
} from "../src/adapters/fastify.js";

function captureParser(
  instance: FastifyLikeInstance,
  options?: Record<string, unknown>,
): {
  parser: (
    req: unknown,
    body: string | Buffer,
    done: (err: Error | null, value?: unknown) => void,
  ) => void;
  doneCalls: Array<{ err: Error | null; value?: unknown }>;
} {
  let parser: (
    req: unknown,
    body: string | Buffer,
    done: (err: Error | null, value?: unknown) => void,
  ) => void;

  const mockInstance: FastifyLikeInstance = {
    addContentTypeParser: (_contentType, _opts, p) => {
      parser = p;
    },
  };

  registerStrictJsonFastify(mockInstance, options as never);

  const doneCalls: Array<{ err: Error | null; value?: unknown }> = [];

  return {
    get parser() { return parser!; },
    doneCalls,
  };
}

describe("registerStrictJsonFastify", () => {
  it("passes valid JSON through", () => {
    const { parser, doneCalls } = captureParser(
      { addContentTypeParser: () => {} } as never,
    );

    // Need to re-acquire parser after registerStrictJsonFastify
    let p: typeof parser;
    const instance: FastifyLikeInstance = {
      addContentTypeParser: (_contentType, _opts, cb) => {
        p = cb;
      },
    };
    registerStrictJsonFastify(instance);

    const calls: Array<{ err: Error | null; value?: unknown }> = [];
    (p!).call({}, {}, Buffer.from('{"valid":true}'), (err, value) => {
      calls.push({ err, value });
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.err).toBeNull();
    expect(calls[0]?.value).toEqual({ valid: true });
  });

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

  it("maps strict body-too-large errors to 413 with code in payload", () => {
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

    registerStrictJsonFastify(instance, { maxBodySizeBytes: 8 });

    const doneCalls: Array<{ err: Error | null; value?: unknown }> = [];
    parser?.({}, Buffer.from('{"payload":"this is too long"}'), (err, value) => {
      doneCalls.push({ err, value });
    });

    expect(doneCalls).toHaveLength(1);
    expect(doneCalls[0]?.err).toBeInstanceOf(PayloadTooLargeException);

    const err = doneCalls[0]?.err as PayloadTooLargeException;
    expect(err.getStatus()).toBe(413);
    expect(err.getResponse()).toMatchObject({
      code: "STRICT_JSON_BODY_TOO_LARGE",
    });
  });

  it("maps invalid JSON to BadRequestException with STRICT_JSON_INVALID_JSON", () => {
    let parser: ((req: unknown, body: string | Buffer, done: (err: Error | null, value?: unknown) => void) => void) | undefined;
    const instance: FastifyLikeInstance = {
      addContentTypeParser: (_contentType, _opts, p) => { parser = p; },
    };
    registerStrictJsonFastify(instance);

    const doneCalls: Array<{ err: Error | null; value?: unknown }> = [];
    parser?.({}, Buffer.from("{invalid}"), (err, value) => {
      doneCalls.push({ err, value });
    });

    expect(doneCalls).toHaveLength(1);
    expect(doneCalls[0]?.err).toBeInstanceOf(BadRequestException);
    const err = doneCalls[0]?.err as BadRequestException;
    expect(err.getStatus()).toBe(400);
    expect(err.getResponse()).toMatchObject({
      code: "STRICT_JSON_INVALID_JSON",
    });
  });

  it("maps prototype pollution to BadRequestException with STRICT_JSON_PROTOTYPE_POLLUTION", () => {
    let parser: ((req: unknown, body: string | Buffer, done: (err: Error | null, value?: unknown) => void) => void) | undefined;
    const instance: FastifyLikeInstance = {
      addContentTypeParser: (_contentType, _opts, p) => { parser = p; },
    };
    registerStrictJsonFastify(instance);

    const doneCalls: Array<{ err: Error | null; value?: unknown }> = [];
    parser?.({}, Buffer.from('{"__proto__": {"a":1}}'), (err, value) => {
      doneCalls.push({ err, value });
    });

    expect(doneCalls).toHaveLength(1);
    expect(doneCalls[0]?.err).toBeInstanceOf(BadRequestException);
    const err = doneCalls[0]?.err as BadRequestException;
    const response = err.getResponse() as Record<string, unknown>;
    expect(response.code).toBe("STRICT_JSON_PROTOTYPE_POLLUTION");
    expect(response.details).toBeDefined();
    expect((response.details as Record<string, unknown>).path).toBeDefined();
  });
});
