import { parseStrictJson, PrototypePollutionError } from "../src/index.js";

function logProtoError(error: unknown): void {
  if (error instanceof PrototypePollutionError) {
    console.log("✗ Prototype pollution detected!");
    console.log("  Dangerous key:", error.dangerousKey);
    console.log("  Path:", error.path);
    console.log("  Message:", error.message);
  } else {
    console.log("✗ Error:", error instanceof Error ? error.message : error);
  }
}

function logError(error: unknown): void {
  console.log("✗ Error:", error instanceof Error ? error.message : error);
}

async function main() {
  console.log("=== Prototype Pollution Protection Example ===\n");

  console.log("1. Valid JSON:");
  try {
    const validJson = '{"user": {"name": "John", "age": 30}}';
    const result = await parseStrictJson(validJson);
    console.log("✓ Parsed successfully:", result);
  } catch (error) {
    logError(error);
  }

  console.log("\n");

  console.log("2. JSON with '__proto__' key:");
  try {
    const maliciousJson = '{"user": "John", "__proto__": {"isAdmin": true}}';
    const result = await parseStrictJson(maliciousJson);
    console.log("✓ Parsed successfully:", result);
  } catch (error) {
    logProtoError(error);
  }

  console.log("\n");

  console.log("3. JSON with 'constructor' key:");
  try {
    const maliciousJson = '{"data": {"constructor": {"prototype": {"polluted": true}}}}';
    const result = await parseStrictJson(maliciousJson);
    console.log("✓ Parsed successfully:", result);
  } catch (error) {
    logProtoError(error);
  }

  console.log("\n");

  console.log("4. Custom dangerous keys:");
  try {
    const jsonWithCustomKey = '{"user": "John", "dangerousKey": "value"}';
    const result = await parseStrictJson(jsonWithCustomKey, {
      dangerousKeys: ["dangerousKey", "sensitiveData"]
    });
    console.log("✓ Parsed successfully:", result);
  } catch (error) {
    logProtoError(error);
  }

  console.log("\n");

  console.log("5. Prototype pollution protection disabled:");
  try {
    const jsonWithProto = '{"user": "John", "__proto__": {"isAdmin": true}}';
    const result = await parseStrictJson(jsonWithProto, {
      enablePrototypePollutionProtection: false
    });
    console.log("⚠ Parsed (protection disabled):", result);
    console.log("  Warning: This is insecure and should not be used in production!");
  } catch (error) {
    logError(error);
  }

  console.log("\n");
  console.log("=== End of Example ===");
}

main().catch(console.error);
