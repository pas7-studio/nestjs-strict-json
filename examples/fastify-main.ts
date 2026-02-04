import { NestFactory } from "@nestjs/common"
import { Controller, Post, Body } from "@nestjs/common"
import { registerStrictJson } from "../src/nest/register.js"

@Controller()
class AppController {
  @Post("/test")
  test(@Body() body: unknown) {
    return { received: body }
  }
}

class AppModule {
  static get controllers() {
    return [AppController]
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: false,
    bufferLogs: true
  })
  
  registerStrictJson(app)
  
  await app.listen(3001)
  console.log("🚀 Fastify app running on http://localhost:3001")
}

bootstrap()
