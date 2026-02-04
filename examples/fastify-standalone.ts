// File: examples/fastify-standalone.ts
import Fastify from "fastify"
import { registerStrictJsonFastify } from "../src/adapters/fastify.js"

const server = Fastify()

registerStrictJsonFastify(server, {
  maxBodySizeBytes: 1024 * 1024  // 1MB
})

server.post("/test", async (request, reply) => {
  return { received: request.body }
})

server.listen({ port: 3001 }, () => {
  console.log("🚀 Fastify server running on http://localhost:3001")
})
