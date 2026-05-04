import { NestFactory, Controller, Post, Body } from "@nestjs/common"
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
    bodyParser: false  // Важливо: вимикаємо default body parser
  })
  
  registerStrictJson(app)
  
  await app.listen(3000)
  console.log("🚀 Express app running on http://localhost:3000")
}

bootstrap()
