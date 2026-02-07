/**
 * Example: Prototype Pollution Protection
 *
 * This example demonstrates how to protect against prototype pollution attacks
 * by detecting dangerous keys like '__proto__', 'constructor', and 'prototype'.
 */

import { parseStrictJson, PrototypePollutionError } from "../src/index.js";

async function main() {
  console.log("=== Prototype Pollution Protection Example ===\n");

  // Example 1: Valid JSON (no dangerous keys)
  console.log("1. Valid JSON:");
  try {
    const validJson = '{"user": {"name": "John", "age": 30}}';
    const result = await parseStrictJson(validJson);
    console.log("✓ Parsed successfully:", result);
  } catch (error) {
    console.log("✗ Error:", error instanceof Error ? error.message : error);
  }

  console.log("\n");

  // Example 2: JSON with __proto__ key (prototype pollution attempt)
  console.log("2. JSON with '__proto__' key:");
  try {
    const maliciousJson = '{"user": "John", "__proto__": {"isAdmin": true}}';
    const result = await parseStrictJson(maliciousJson);
    console.log("✓ Parsed successfully:", result);
  } catch (error) {
    if (error instanceof PrototypePollutionError) {
      console.log("✗ Prototype pollution detected!");
      console.log("  Dangerous key:", error.dangerousKey);
      console.log("  Path:", error.path);
      console.log("  Message:", error.message);
    } else {
      console.log("✗ Error:", error instanceof Error ? error.message : error);
    }
  }

  console.log("\n");

  // Example 3: JSON with constructor key
  console.log("3. JSON with 'constructor' key:");
  try {
    const maliciousJson = '{"data": {"constructor": {"prototype": {"polluted": true}}}}';
    const result = await parseStrictJson(maliciousJson);
    console.log("✓ Parsed successfully:", result);
  } catch (error) {
    if (error instanceof PrototypePollutionError) {
      console.log("✗ Prototype pollution detected!");
      console.log("  Dangerous key:", error.dangerousKey);
      console.log("  Path:", error.path);
      console.log("  Message:", error.message);
    } else {
      console.log("✗ Error:", error instanceof Error ? error.message : error);
    }
  }

  console.log("\n");

  // Example 4: Custom dangerous keys
  console.log("4. Custom dangerous keys:");
  try {
    const jsonWithCustomKey = '{"user": "John", "dangerousKey": "value"}';
    const result = await parseStrictJson(jsonWithCustomKey, {
      dangerousKeys: ["dangerousKey", "sensitiveData"]
    });
    console.log("✓ Parsed successfully:", result);
  } catch (error) {
    if (error instanceof PrototypePollutionError) {
      console.log("✗ Prototype pollution detected!");
      console.log("  Dangerous key:", error.dangerousKey);
      console.log("  Path:", error.path);
      console.log("  Message:", error.message);
    } else {
      console.log("✗ Error:", error instanceof Error ? error.message : error);
    }
  }

  console.log("\n");

  // Example 5: Disable prototype pollution protection (not recommended)
  console.log("5. Prototype pollution protection disabled:");
  try {
    const jsonWithProto = '{"user": "John", "__proto__": {"isAdmin": true}}';
    const result = await parseStrictJson(jsonWithProto, {
      enablePrototypePollutionProtection: false
    });
    console.log("⚠ Parsed (protection disabled):", result);
    console.log("  Warning: This is insecure and should not be used in production!");
  } catch (error) {
    console.log("✗ Error:", error instanceof Error ? error.message : error);
  }

  console.log("\n");
  console.log("=== End of Example ===");
}

main().catch(console.error);
