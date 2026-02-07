/**
 * Example: Custom Error Handlers
 *
 * This example demonstrates how to use custom error handlers to:
 * - Log errors to console or external services
 * - Send errors to monitoring tools (Sentry, Datadog, etc.)
 * - Format custom error responses
 * - Implement retry logic or fallback mechanisms
 */

import { parseStrictJson, DuplicateKeyError, InvalidJsonError, BodyTooLargeError, PrototypePollutionError } from "../src/index.js";

async function main() {
  console.log("=== Custom Error Handlers Example ===\n");

  // Example 1: Log duplicate key errors
  console.log("1. Logging duplicate key errors:");
  try {
    const jsonWithDuplicates = '{"user": "John", "user": "Jane"}';
    await parseStrictJson(jsonWithDuplicates, {
      onDuplicateKey: (error) => {
        console.log(`[LOG] Duplicate key detected: ${error.key} at ${error.path}`);
      }
    });
  } catch (error) {
    if (error instanceof DuplicateKeyError) {
      console.log(`Error thrown: ${error.message}`);
    }
  }

  console.log("\n");

  // Example 2: Send errors to external monitoring service
  console.log("2. Send errors to monitoring service:");
  async function sendToMonitoring(error: any, level: "info" | "warning" | "error") {
    // Simulate sending to Sentry/Datadog
    console.log(`[MONITORING] Sending ${level}: ${error.message}`);
    console.log(`  Details:`, error.details);
  }

  try {
    const maliciousJson = '{"data": {"__proto__": {"isAdmin": true}}}';
    await parseStrictJson(maliciousJson, {
      onPrototypePollution: async (error) => {
        await sendToMonitoring(error, "error");
      },
      onError: async (error) => {
        await sendToMonitoring(error, "warning");
      }
    });
  } catch (error) {
    if (error instanceof PrototypePollutionError) {
      console.log(`Error thrown: ${error.message}`);
    }
  }

  console.log("\n");

  // Example 3: Comprehensive error handling for all error types
  console.log("3. Comprehensive error handling:");
  const errorCounts = {
    duplicateKey: 0,
    invalidJson: 0,
    bodyTooLarge: 0,
    prototypePollution: 0,
    other: 0
  };

  const testCases = [
    '{"user": "John", "user": "Jane"}', // Duplicate key
    '{"user": "John", age: 30}', // Invalid JSON
    '{"__proto__": {"isAdmin": true}}', // Prototype pollution
    '{"valid": "json"}', // Valid
  ];

  for (const testCase of testCases) {
    try {
      await parseStrictJson(testCase, {
        onDuplicateKey: (error) => {
          errorCounts.duplicateKey++;
          console.log(`  Duplicate key: ${error.key} at ${error.path}`);
        },
        onInvalidJson: (error) => {
          errorCounts.invalidJson++;
          console.log(`  Invalid JSON: ${error.message}`);
        },
        onPrototypePollution: (error) => {
          errorCounts.prototypePollution++;
          console.log(`  Prototype pollution: ${error.dangerousKey} at ${error.path}`);
        },
        onError: (error) => {
          errorCounts.other++;
          console.log(`  Other error: ${error.message}`);
        }
      });
    } catch (error) {
      // Error was already handled by custom handlers
    }
  }

  console.log(`\nError statistics:`, errorCounts);

  console.log("\n");

  // Example 4: Async error handlers with external API call
  console.log("4. Async error handlers with external API:");
  async function notifyErrorToSlack(error: any) {
    // Simulate sending to Slack webhook
    console.log(`[SLACK] Notifying team about error: ${error.code}`);
    console.log(`  Message: ${error.message}`);
    return new Promise<void>((resolve) => setTimeout(resolve, 100));
  }

  try {
    const largeJson = '{"data": "' + "x".repeat(1000) + '"}';
    await parseStrictJson(largeJson, {
      maxBodySizeBytes: 100,
      onBodyTooLarge: async (error) => {
        await notifyErrorToSlack(error);
      }
    });
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      console.log(`Error thrown: ${error.message}`);
    }
  }

  console.log("\n");

  // Example 5: Combining multiple handlers
  console.log("5. Combining multiple handlers:");
  const errorLog: any[] = [];

  try {
    const problematicJson = '{"user": "John", "__proto__": {"isAdmin": true}, "user": "Jane"}';
    await parseStrictJson(problematicJson, {
      onDuplicateKey: (error) => {
        errorLog.push({ type: "duplicate", error });
        console.log(`[DB] Saved duplicate key error to database`);
      },
      onPrototypePollution: (error) => {
        errorLog.push({ type: "pollution", error });
        console.log(`[SECURITY] Logged security violation`);
      },
      onError: (error) => {
        console.log(`[ANALYTICS] Error tracked: ${error.code}`);
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      console.log(`Final error: ${error.message}`);
    }
  }

  console.log(`Error log contains ${errorLog.length} entries`);

  console.log("\n");
  console.log("=== End of Example ===");
}

main().catch(console.error);
