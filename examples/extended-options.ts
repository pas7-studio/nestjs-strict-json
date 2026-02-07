/**
 * Example: Extended Configuration Options
 *
 * This example demonstrates advanced configuration options:
 * - Whitelist: Allow only specific keys
 * - Blacklist: Block specific keys
 * - maxDepth: Limit JSON nesting depth
 * - ignoreCase: Case-sensitive/insensitive matching
 */

import { parseStrictJson, DepthLimitError, InvalidJsonError } from "../src/index.js";

async function main() {
  console.log("=== Extended Configuration Options Example ===\n");

  // Example 1: Whitelist - allow only specific keys
  console.log("1. Whitelist - allow only 'user.*' and 'profile.*' keys:");
  try {
    const json = '{"user": {"name": "John", "email": "john@example.com"}, "profile": {"age": 30}, "secret": "value"}';
    const result = await parseStrictJson(json, {
      whitelist: ["user.*", "profile.*"]
    });
    console.log("✓ Parsed:", result);
  } catch (error) {
    if (error instanceof InvalidJsonError) {
      console.log("✗ Error:", error.message);
    } else {
      console.log("✗ Error:", error instanceof Error ? error.message : error);
    }
  }

  console.log("\n");

  // Example 2: Blacklist - block sensitive keys
  console.log("2. Blacklist - block 'password', 'secret.*', and 'api-key' keys:");
  try {
    const json = '{"user": "John", "email": "john@example.com", "password": "secret123", "secret": {"token": "abc"}, "api-key": "xyz"}';
    const result = await parseStrictJson(json, {
      blacklist: ["password", "secret.*", "api-key"]
    });
    console.log("✓ Parsed:", result);
  } catch (error) {
    if (error instanceof InvalidJsonError) {
      console.log("✗ Error:", error.message);
    } else {
      console.log("✗ Error:", error instanceof Error ? error.message : error);
    }
  }

  console.log("\n");

  // Example 3: maxDepth - limit JSON nesting depth
  console.log("3. maxDepth - limit nesting depth to 3:");
  try {
    // Create deeply nested JSON (depth: 1 -> 2 -> 3 -> 4)
    const deepJson = '{"level1": {"level2": {"level3": {"level4": "deep value"}}}}';
    const result = await parseStrictJson(deepJson, {
      maxDepth: 3
    });
    console.log("✓ Parsed:", result);
  } catch (error) {
    if (error instanceof DepthLimitError) {
      console.log("✗ Depth limit exceeded!");
      console.log(`  Current depth: ${error.currentDepth}`);
      console.log(`  Max depth: ${error.maxDepth}`);
      console.log(`  Message: ${error.message}`);
    } else {
      console.log("✗ Error:", error instanceof Error ? error.message : error);
    }
  }

  console.log("\n");

  // Example 4: Valid deep JSON within maxDepth limit
  console.log("4. Valid deep JSON within maxDepth limit of 5:");
  try {
    const deepJson = '{"l1": {"l2": {"l3": {"l4": {"l5": "value"}}}}}';
    const result = await parseStrictJson(deepJson, {
      maxDepth: 5
    });
    console.log("✓ Parsed successfully (depth 5, limit 5):", JSON.stringify(result).slice(0, 50) + "...");
  } catch (error) {
    console.log("✗ Error:", error instanceof Error ? error.message : error);
  }

  console.log("\n");

  // Example 5: Combining whitelist and blacklist
  console.log("5. Combining whitelist and blacklist:");
  try {
    const json = '{"user": {"name": "John", "password": "secret"}, "admin": {"role": "superuser"}}';
    const result = await parseStrictJson(json, {
      whitelist: ["user.*", "admin.*"],
      blacklist: ["*.password", "admin.role"]
    });
    console.log("✓ Parsed:", result);
  } catch (error) {
    if (error instanceof InvalidJsonError) {
      console.log("✗ Error:", error.message);
    } else {
      console.log("✗ Error:", error instanceof Error ? error.message : error);
    }
  }

  console.log("\n");

  // Example 6: Array with nested objects
  console.log("6. Array with nested objects and maxDepth:");
  try {
    const arrayJson = '{"data": [{"user": "John", "nested": {"deep": "value"}}, {"user": "Jane", "nested": {"deep": "value2"}}]}';
    const result = await parseStrictJson(arrayJson, {
      maxDepth: 4,
      whitelist: ["data.*.user", "data.*.nested.deep"]
    });
    console.log("✓ Parsed array:", JSON.stringify(result).slice(0, 60) + "...");
  } catch (error) {
    console.log("✗ Error:", error instanceof Error ? error.message : error);
  }

  console.log("\n");

  // Example 7: Glob pattern matching with wildcards
  console.log("7. Glob pattern matching - allow all 'data.**.name' keys:");
  try {
    const json = '{"data": {"users": [{"name": "John"}, {"name": "Jane"}], "admin": {"name": "Admin"}}}';
    const result = await parseStrictJson(json, {
      whitelist: ["data.**.name"]
    });
    console.log("✓ Parsed with glob pattern:", JSON.stringify(result).slice(0, 50) + "...");
  } catch (error) {
    if (error instanceof InvalidJsonError) {
      console.log("✗ Error:", error.message);
    } else {
      console.log("✗ Error:", error instanceof Error ? error.message : error);
    }
  }

  console.log("\n");

  // Example 8: Configuration for API request validation
  console.log("8. Complete API request validation configuration:");
  try {
    const apiRequest = JSON.stringify({
      endpoint: "/api/users",
      method: "POST",
      data: {
        user: {
          name: "John Doe",
          email: "john@example.com"
        },
        meta: {
          timestamp: Date.now()
        }
      }
    });

    const result = await parseStrictJson(apiRequest, {
      whitelist: [
        "endpoint",
        "method",
        "data.user.*",
        "data.meta.timestamp"
      ],
      blacklist: [
        "data.user.password",
        "data.user.secret",
        "**.token"
      ],
      maxDepth: 10,
      enablePrototypePollutionProtection: true
    });
    console.log("✓ API request validated successfully!");
    console.log("  Endpoint:", result.endpoint);
    console.log("  Method:", result.method);
  } catch (error) {
    console.log("✗ API request validation failed:", error instanceof Error ? error.message : error);
  }

  console.log("\n");
  console.log("=== End of Example ===");
}

main().catch(console.error);
