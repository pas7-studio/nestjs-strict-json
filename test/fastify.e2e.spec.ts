import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  Body,
  Controller,
  INestApplication,
  Module,
  Post,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { registerStrictJson } from "../src/nest/register.js";

@Controller()
class TestController {
  @Post("/test")
  test(@Body() body: unknown) {
    return { received: body };
  }
}

@Module({
  controllers: [TestController],
})
class TestModule {}

describe("Fastify E2E", () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    app = await NestFactory.create(TestModule, new FastifyAdapter(), {
      bodyParser: false,
      logger: false,
    });

    registerStrictJson(app as never, { maxBodySizeBytes: 64 });

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
    const res = await fetch(url + "/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ valid: true }),
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ received: { valid: true } });
  });

  it("rejects duplicate keys with 400", async () => {
    const res = await fetch(url + "/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"flag":true,"flag":false}',
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      code: "STRICT_JSON_DUPLICATE_KEY",
    });
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await fetch(url + "/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{invalid}",
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      code: "STRICT_JSON_INVALID_JSON",
    });
  });

  it("rejects oversized JSON with 413", async () => {
    const oversized = JSON.stringify({ payload: "x".repeat(200) });
    const res = await fetch(url + "/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: oversized,
    });
    expect(res.status).toBe(413);
    expect(await res.json()).toMatchObject({
      code: "STRICT_JSON_BODY_TOO_LARGE",
    });
  });
});
