import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { INestApplication } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Controller, Post, Body } from "@nestjs/common";
import { registerStrictJson } from "../src/nest/register.js";
import { request } from "undici";

class TestController {
  @Post("/test")
  test(@Body() body: unknown) {
    return { received: body };
  }
}

class TestModule {
  static get providers() {
    return [TestController];
  }
}

describe("Express E2E", () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    const module = new TestModule();
    app = await NestFactory.create(module, { bodyParser: false });

    registerStrictJson(app as never);

    await app.listen(0);
    const addr = app.getHttpServer().address();
    url = `http://localhost:${
      typeof addr === "string" ? addr : addr.port
    }`;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it("accepts valid JSON", async () => {
    const { body } = await request(url + "/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ valid: true }),
    });
    expect(body).toEqual({ received: { valid: true } });
  });

  it("rejects duplicate keys with 400", async () => {
    const res = await request(url + "/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ flag: true, flag: false }),
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("STRICT_JSON_DUPLICATE_KEY");
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await request(url + "/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid}",
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe("STRICT_JSON_INVALID_JSON");
  });
});
