#!/usr/bin/env node

/**
 * Скрипт для запуску всіх бенчмарків
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

const BENCHMARK_CATEGORIES = [
  {
    name: 'Native Comparison',
    path: 'performance/benchmarks/comparisons/vs-native.spec.ts',
    description: 'Comparison with native JSON.parse'
  },
  {
    name: 'Custom Implementations',
    path: 'performance/benchmarks/comparisons/vs-custom.spec.ts',
    description: 'Comparison with manual implementations'
  },
  {
    name: 'Express Body Parser',
    path: 'performance/benchmarks/comparisons/vs-express-bp.spec.ts',
    description: 'Comparison with Express body-parser'
  },
  {
    name: 'Express Adapter',
    path: 'performance/benchmarks/adapters/express.spec.ts',
    description: 'Express adapter benchmarks'
  },
  {
    name: 'Fastify Adapter',
    path: 'performance/benchmarks/adapters/fastify.spec.ts',
    description: 'Fastify adapter benchmarks'
  },
  {
    name: 'Streaming Parser',
    path: 'performance/benchmarks/adapters/streaming.spec.ts',
    description: 'Streaming parser benchmarks'
  },
  {
    name: 'Duplicate Keys',
    path: 'performance/benchmarks/parser/duplicate-keys.spec.ts',
    description: 'Duplicate key detection benchmarks'
  },
  {
    name: 'Deep Nesting',
    path: 'performance/benchmarks/parser/deep-nesting.spec.ts',
    description: 'Deep nesting benchmarks'
  },
  {
    name: 'Large Payloads',
    path: 'performance/benchmarks/parser/large-payload.spec.ts',
    description: 'Large payload handling benchmarks'
  },
  {
    name: 'Memory Usage',
    path: 'performance/benchmarks/parser/memory-usage.spec.ts',
    description: 'Memory usage benchmarks'
  }
];

async function runBenchmark(category) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 Running: ${category.name}`);
  console.log(`   ${category.description}`);
  console.log('='.repeat(80));

  try {
    const { stdout, stderr } = await execAsync(
      `npx vitest run ${category.path} --reporter=verbose --config vitest.benchmark.config.ts`,
      { cwd: path.resolve('.') }
    );

    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.error(stderr);
    }

    console.log(`✅ ${category.name} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${category.name} failed:`, error.message);
    return false;
  }
}

async function runAllBenchmarks() {
  console.log('\n' + '█'.repeat(80));
  console.log('█'.repeat(20) + ' PERFORMANCE BENCHMARKS SUITE ' + '█'.repeat(33));
  console.log('█'.repeat(80) + '\n');

  const results = [];

  for (const category of BENCHMARK_CATEGORIES) {
    const success = await runBenchmark(category);
    results.push({ name: category.name, success });
  }

  // Summary
  console.log('\n' + '█'.repeat(80));
  console.log('█'.repeat(25) + ' BENCHMARKS SUMMARY ' + '█'.repeat(31));
  console.log('█'.repeat(80) + '\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  if (successful.length > 0) {
    successful.forEach(r => console.log(`   - ${r.name}`));
  }

  console.log(`\n❌ Failed: ${failed.length}/${results.length}`);
  if (failed.length > 0) {
    failed.forEach(r => console.log(`   - ${r.name}`));
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 Benchmarks completed!');
  console.log('📁 Reports saved to performance/reports/');
  console.log('='.repeat(80) + '\n');

  // Exit with error if any benchmark failed
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run benchmarks
runAllBenchmarks().catch(error => {
  console.error('Fatal error running benchmarks:', error);
  process.exit(1);
});
