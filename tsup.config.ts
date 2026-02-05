import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".js" }
  },
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  splitting: false,
  external: ["@nestjs/common", "@nestjs/core"],
  cjsInterop: true,
})
