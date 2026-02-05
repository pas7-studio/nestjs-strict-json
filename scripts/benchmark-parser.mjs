import { performance } from "node:perf_hooks";
import { parseStrictJson } from "../dist/index.mjs";

const scenarios = [
  {
    label: "small-object (100 keys)",
    json: JSON.stringify(
      Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, i])),
    ),
    iterations: 2000,
  },
  {
    label: "medium-array (500 objects)",
    json: JSON.stringify(
      Array.from({ length: 500 }, (_, i) => ({
        id: i,
        type: i % 2 ? "odd" : "even",
        value: `v${i}`,
      })),
    ),
    iterations: 400,
  },
  {
    label: "deep-object (6 levels)",
    json: JSON.stringify({
      a: { b: { c: { d: { e: { f: { value: "ok" } } } } } },
      items: Array.from({ length: 120 }, (_, i) => ({ idx: i, data: `x${i}` })),
    }),
    iterations: 1000,
  },
];

for (const scenario of scenarios) {
  const payload = Buffer.from(scenario.json);

  const start = performance.now();
  for (let i = 0; i < scenario.iterations; i += 1) {
    parseStrictJson(payload);
  }
  const totalMs = performance.now() - start;
  const avgMs = totalMs / scenario.iterations;

  console.log(
    `${scenario.label}: ${scenario.iterations} iters, total=${totalMs.toFixed(
      2,
    )}ms, avg=${avgMs.toFixed(4)}ms`,
  );
}
