// File: vitest.benchmark.config.ts
// Конфігурація для запуску бенчмарків продуктивності
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
    // Включаємо файли бенчмарків
    include: [
      "performance/benchmarks/**/*.spec.ts"
    ],
    exclude: [
      "node_modules",
      "dist",
      "test",
    ],
    reporter: ["verbose"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
