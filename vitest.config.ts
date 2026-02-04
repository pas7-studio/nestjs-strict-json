// File: vitest.config.ts
import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "test/",
        "dist/",
        "**/*.spec.ts",
        "**/*.d.ts",
        "**/*.config.ts",
        "**/examples/**",
      ],
    },
    include: ["test/**/*.spec.ts"],
    exclude: [
      "node_modules",
      "dist",
      "test/**/*.e2e.spec.ts",
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
