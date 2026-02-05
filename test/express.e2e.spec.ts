import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  Body,
  Controller,
  INestApplication,
  Module,
  Post,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import express from "express";
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

describe("Express E2E", () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    app = await NestFactory.create(
      TestModule,
      new ExpressAdapter(express()),
      {
        bodyParser: false,
        logger: false,
      },
    );

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
});
