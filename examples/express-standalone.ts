// File: examples/express-standalone.ts
import express from "express"
import { createStrictJsonExpressMiddleware } from "../src/adapters/express.js"

const app = express()

app.use(createStrictJsonExpressMiddleware({
  maxBodySizeBytes: 1024 * 1024  // 1MB
}))

app.post("/test", (req, res) => {
  res.json({ received: req.body })
})

app.listen(3000, () => {
  console.log("🚀 Express server running on http://localhost:3000")
})
