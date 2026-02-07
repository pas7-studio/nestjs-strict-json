import express, { Request, Response } from "express";
import { createStrictJsonExpressMiddleware } from "../src/index.js";

const app = express();

/**
 * Example 1: Basic usage with streaming enabled
 * Automatically uses streaming for payloads >100KB
 */
app.use(
  createStrictJsonExpressMiddleware({
    enableStreaming: true,
  }),
);

app.post("/api/data", (req: Request, res: Response) => {
  res.json({ success: true, data: req.body });
});

/**
 * Example 2: Custom streaming threshold
 * Use streaming for payloads >50KB instead of default 100KB
 */
const customThresholdMiddleware = createStrictJsonExpressMiddleware({
  enableStreaming: true,
  streamingThreshold: 50 * 1024, // 50KB
});

app.use("/api/custom", customThresholdMiddleware);

app.post("/api/custom/upload", (req: Request, res: Response) => {
  res.json({ success: true, size: JSON.stringify(req.body).length });
});

/**
 * Example 3: Streaming with prototype pollution protection
 * Large payloads with security checks
 */
const secureStreamingMiddleware = createStrictJsonExpressMiddleware({
  enableStreaming: true,
  streamingThreshold: 100 * 1024,
  enablePrototypePollutionProtection: true,
  maxDepth: 20,
});

app.use("/api/secure", secureStreamingMiddleware);

app.post("/api/secure/data", (req: Request, res: Response) => {
  res.json({ success: true, data: req.body });
});

/**
 * Example 4: Streaming with whitelist/blacklist
 * Filter allowed keys for large payloads
 */
const filteredStreamingMiddleware = createStrictJsonExpressMiddleware({
  enableStreaming: true,
  streamingThreshold: 100 * 1024,
  whitelist: ["$.name", "$.email", "$.age"],
});

app.use("/api/filtered", filteredStreamingMiddleware);

app.post("/api/filtered/user", (req: Request, res: Response) => {
  res.json({ success: true, user: req.body });
});

/**
 * Example 5: Streaming with custom chunk size
 * Adjust chunk size for optimal performance
 */
const optimizedStreamingMiddleware = createStrictJsonExpressMiddleware({
  enableStreaming: true,
  streamingThreshold: 100 * 1024,
  chunkSize: 128 * 1024, // 128KB chunks (default is 64KB)
});

app.use("/api/optimized", optimizedStreamingMiddleware);

app.post("/api/optimized/data", (req: Request, res: Response) => {
  res.json({ success: true, data: req.body });
});

/**
 * Example 6: Streaming with custom error handlers
 * Handle duplicate key errors for large payloads
 */
const errorHandlingMiddleware = createStrictJsonExpressMiddleware({
  enableStreaming: true,
  streamingThreshold: 100 * 1024,
  onDuplicateKey: (error) => {
    console.error("Duplicate key detected:", error.message);
    // You can log to monitoring service, send alerts, etc.
  },
  onPrototypePollution: (error) => {
    console.error("Prototype pollution attempt detected:", error.message);
    // Send security alert
  },
  onInvalidJson: (error) => {
    console.error("Invalid JSON received:", error.message);
    // Log parsing errors
  },
});

app.use("/api/error-handling", errorHandlingMiddleware);

app.post("/api/error-handling/data", (req: Request, res: Response) => {
  res.json({ success: true, data: req.body });
});

/**
 * Example 7: Adaptive parsing (backward compatible)
 * Small payloads use buffer parser, large payloads use streaming
 */
const adaptiveMiddleware = createStrictJsonExpressMiddleware({
  // enableStreaming is false by default
  // You can enable it conditionally
});

app.use("/api/adaptive", adaptiveMiddleware);

app.post("/api/adaptive/data", (req: Request, res: Response) => {
  // For payloads <100KB: uses buffer parser
  // For payloads >=100KB with enableStreaming=true: uses streaming parser
  res.json({ success: true, data: req.body });
});

/**
 * Example 8: Maximum body size with streaming
 * Prevent memory issues with extremely large payloads
 */
const sizeLimitedMiddleware = createStrictJsonExpressMiddleware({
  enableStreaming: true,
  streamingThreshold: 100 * 1024,
  maxBodySizeBytes: 10 * 1024 * 1024, // 10MB limit
});

app.use("/api/size-limited", sizeLimitedMiddleware);

app.post("/api/size-limited/data", (req: Request, res: Response) => {
  res.json({ success: true, data: req.body });
});

/**
 * Example 9: Generate test data for large payload testing
 */
app.get("/api/generate-large-payload", (req: Request, res: Response) => {
  const size = parseInt(req.query.size as string) || 200000; // default ~100KB
  const data: Record<string, number> = {};
  
  for (let i = 0; i < size; i++) {
    data[`key${i}`] = i;
  }
  
  res.json({ success: true, data, size: JSON.stringify(data).length });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Example server running on http://localhost:${PORT}`);
  console.log("\nAvailable endpoints:");
  console.log("  POST /api/data - Basic streaming");
  console.log("  POST /api/custom/upload - Custom threshold (50KB)");
  console.log("  POST /api/secure/data - Streaming with security");
  console.log("  POST /api/filtered/user - Whitelisted keys");
  console.log("  POST /api/optimized/data - Optimized chunk size");
  console.log("  POST /api/error-handling/data - Custom error handlers");
  console.log("  POST /api/adaptive/data - Adaptive parsing");
  console.log("  POST /api/size-limited/data - Size limited");
  console.log("  GET /api/generate-large-payload - Generate test data");
  console.log("\nExample usage:");
  console.log(`  curl -X POST http://localhost:${PORT}/api/data \\`);
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d \'{"name":"test","value":123}\'');
  console.log("\nLarge payload example:");
  console.log(`  curl -X POST http://localhost:${PORT}/api/data \\`);
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -d @large-payload.json');
});
