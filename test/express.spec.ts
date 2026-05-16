import { describe, it, expect, vi } from "vitest";
import {
  createStrictJsonExpressMiddleware,
  type ExpressReq,
  type ExpressRes,
  type ExpressNext,
} from "../src/adapters/express.js";

function createMockRes(): ExpressRes {
  const res = {} as ExpressRes;
  res.statusCode = 200;
  res.setHeader = vi.fn();
  res.end = vi.fn();
  return res;
}

function createMockReq(
  body?: string,
  contentType = "application/json",
  contentLength?: string,
): ExpressReq {
  const req = { body: undefined } as ExpressReq;
  req.headers = {
    "content-type": contentType,
    "content-length": contentLength,
  };
  req[Symbol.asyncIterator] = async function* () {
    if (body) {
      yield Buffer.from(body);
    }
  };
  return req;
}

describe("createStrictJsonExpressMiddleware", () => {
  it("skips non-JSON content types", async () => {
    const middleware = createStrictJsonExpressMiddleware();
    const req = createMockReq("{}", "text/plain");
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it("accepts valid JSON and sets req.body", async () => {
    const middleware = createStrictJsonExpressMiddleware();
    const req = createMockReq(JSON.stringify({ key: "value" }));
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);

    expect(req.body).toEqual({ key: "value" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("accepts JSON patch content type", async () => {
    const middleware = createStrictJsonExpressMiddleware();
    const req = createMockReq(
      JSON.stringify([{ op: "replace", path: "/a", value: 1 }]),
      "application/json-patch+json",
    );
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);

    expect(req.body).toEqual([{ op: "replace", path: "/a", value: 1 }]);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("accepts JSON API content type", async () => {
    const middleware = createStrictJsonExpressMiddleware();
    const req = createMockReq(
      JSON.stringify({ data: { id: "1" } }),
      "application/vnd.api+json",
    );
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);
    expect(req.body).toEqual({ data: { id: "1" } });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("accepts merge-patch content type", async () => {
    const middleware = createStrictJsonExpressMiddleware();
    const req = createMockReq(
      JSON.stringify({ name: "test" }),
      "application/merge-patch+json",
    );
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);
    expect(req.body).toEqual({ name: "test" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("accepts problem+json content type", async () => {
    const middleware = createStrictJsonExpressMiddleware();
    const req = createMockReq(
      JSON.stringify({ title: "Error" }),
      "application/problem+json",
    );
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);
    expect(req.body).toEqual({ title: "Error" });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("rejects duplicate keys with 400 and STRICT_JSON_DUPLICATE_KEY code", async () => {
    const middleware = createStrictJsonExpressMiddleware();
    const req = createMockReq('{"a":1,"a":2}');
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.setHeader).toHaveBeenCalledWith(
      "content-type",
      "application/json; charset=utf-8",
    );
    const responseBody = JSON.parse((res.end as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(responseBody).toMatchObject({
      code: "STRICT_JSON_DUPLICATE_KEY",
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects prototype pollution with 400', async () => {
    const middleware = createStrictJsonExpressMiddleware();
    const req = createMockReq('{"__proto__": {"polluted": true}}');
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    const responseBody = JSON.parse((res.end as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(responseBody).toMatchObject({
      code: "STRICT_JSON_PROTOTYPE_POLLUTION",
    });
  });

  it('rejects depth limit violations with 400', async () => {
    const middleware = createStrictJsonExpressMiddleware({ maxDepth: 3 });
    const req = createMockReq('{"a":{"b":{"c":{"d":1}}}}');
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    const responseBody = JSON.parse((res.end as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(responseBody).toMatchObject({
      code: "STRICT_JSON_DEPTH_LIMIT",
    });
  });

  it('rejects blacklisted keys with 400', async () => {
    const middleware = createStrictJsonExpressMiddleware({
      blacklist: ["password"],
    });
    const req = createMockReq('{"user":"John","password":"secret"}');
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    const responseBody = JSON.parse((res.end as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(responseBody).toMatchObject({
      code: "STRICT_JSON_INVALID_JSON",
    });
  });

  it('rejects BODY_TOO_LARGE with 413', async () => {
    const middleware = createStrictJsonExpressMiddleware({
      maxBodySizeBytes: 10,
    });
    const req = createMockReq(JSON.stringify({ payload: "this is way too long for a 10 byte limit" }));
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);

    expect(res.statusCode).toBe(413);
    const responseBody = JSON.parse((res.end as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(responseBody).toMatchObject({
      code: "STRICT_JSON_BODY_TOO_LARGE",
    });
  });

  it("uses streaming when enabled and payload exceeds threshold", async () => {
    const middleware = createStrictJsonExpressMiddleware({
      enableStreaming: true,
      streamingThreshold: 10,
    });
    const req = createMockReq(
      JSON.stringify({ data: "x".repeat(100) }),
      "application/json",
    );
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);

    expect(req.body).toBeDefined();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("handles invalid JSON with generic 400", async () => {
    const middleware = createStrictJsonExpressMiddleware();
    const req = createMockReq("{invalid}");
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);

    expect(res.statusCode).toBe(400);
    const responseBody = JSON.parse((res.end as ReturnType<typeof vi.fn>).mock.calls[0][0]);
    expect(responseBody.code).toBe("STRICT_JSON_INVALID_JSON");
  });

  it("handles content-type with charset suffix", async () => {
    const middleware = createStrictJsonExpressMiddleware();
    const req = createMockReq(
      JSON.stringify({ ok: true }),
      "application/json; charset=utf-8",
    );
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);

    expect(req.body).toEqual({ ok: true });
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("handles empty body correctly", async () => {
    const middleware = createStrictJsonExpressMiddleware();
    const req = createMockReq('', "application/json");
    const res = createMockRes();
    const next = vi.fn() as ExpressNext;

    await middleware(req, res, next);

    expect(res.statusCode).toBe(400);
  });
});
