#!/usr/bin/env node

import { performance } from "node:perf_hooks";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseTree } from "jsonc-parser";
import { parseStrictJson } from "../dist/index.mjs";

const MB = 1024 * 1024;
const REPORT_JSON_PATH = resolve("performance/reports/comparison-latest.json");
const REPORT_MD_PATH = resolve("performance/reports/comparison-latest.md");

function generateLargePayload() {
  const users = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `user-${i}`,
    email: `user-${i}@example.com`,
    role: i % 7 === 0 ? "admin" : "user",
    active: i % 3 !== 0,
    score: i % 100,
    tags: [`tag-${i % 10}`, `group-${i % 20}`],
  }));
  return JSON.stringify({ orgId: "acme", generatedAt: Date.now(), users });
}

function forceGc() {
  if (typeof global.gc === "function") {
    global.gc();
  }
}

function benchmark(name, fn, iterations, warmup = 30) {
  for (let i = 0; i < warmup; i += 1) {
    fn();
  }

  forceGc();
  const heapStart = process.memoryUsage().heapUsed;
  let heapPeak = heapStart;

  const t0 = performance.now();
  for (let i = 0; i < iterations; i += 1) {
    fn();
    if ((i & 7) === 0) {
      const current = process.memoryUsage().heapUsed;
      if (current > heapPeak) heapPeak = current;
    }
  }
  const totalMs = performance.now() - t0;

  forceGc();
  const heapEnd = process.memoryUsage().heapUsed;

  return {
    name,
    iterations,
    avgMs: totalMs / iterations,
    peakHeapDeltaMb: (heapPeak - heapStart) / MB,
    retainedHeapMb: (heapEnd - heapStart) / MB,
  };
}

function formatRow(result) {
  return `| ${result.name} | ${result.avgMs.toFixed(4)} | ${result.peakHeapDeltaMb.toFixed(2)} | ${result.retainedHeapMb.toFixed(2)} |`;
}

function main() {
  const payload = generateLargePayload();
  const payloadSizeMb = Buffer.byteLength(payload, "utf8") / MB;
  const baselineOptions = {
    enableCache: false,
    enableStreaming: false,
    lazyMode: false,
    enableFastPath: false,
  };
  const optimizedOptions = {
    enableCache: true,
    enableStreaming: false,
    lazyMode: true,
    enableFastPath: true,
  };

  const jsoncParserStrict = () => {
    const root = parseTree(payload);
    if (!root) {
      throw new Error("jsonc-parser failed to parse payload");
    }
    JSON.parse(payload);
  };

  const results = [
    benchmark("Native JSON.parse", () => {
      JSON.parse(payload);
    }, 80),
    benchmark("jsonc-parser + JSON.parse", jsoncParserStrict, 25),
    benchmark("@pas7 strict (baseline)", () => {
      parseStrictJson(payload, baselineOptions);
    }, 35),
    benchmark("@pas7 strict (optimized)", () => {
      parseStrictJson(payload, optimizedOptions);
    }, 140),
  ];

  const generatedAt = new Date().toISOString();
  const report = {
    generatedAt,
    payload: {
      users: 10000,
      approximateSizeMb: Number(payloadSizeMb.toFixed(2)),
    },
    notes: {
      node: process.version,
      gcExposed: typeof global.gc === "function",
    },
    results,
  };

  const md = [
    "# Parser Comparison Benchmark",
    "",
    `Generated: ${generatedAt}`,
    `Payload: ~${payloadSizeMb.toFixed(2)} MB (10,000 users)`,
    "",
    "| Implementation | Avg ms/op | Peak heap delta (MB) | Retained heap (MB) |",
    "|---|---:|---:|---:|",
    ...results.map(formatRow),
    "",
    "Notes:",
    "- `Peak heap delta` = max observed heap growth during the run.",
    "- `Retained heap` = heap difference after explicit GC.",
  ].join("\n");

  mkdirSync(dirname(REPORT_JSON_PATH), { recursive: true });
  writeFileSync(REPORT_JSON_PATH, JSON.stringify(report, null, 2));
  writeFileSync(REPORT_MD_PATH, `${md}\n`);

  console.log(md);
  console.log("");
  console.log(`Saved JSON report: ${REPORT_JSON_PATH}`);
  console.log(`Saved Markdown report: ${REPORT_MD_PATH}`);
}

main();
