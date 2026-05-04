/**
 * Фреймворк для бенчмарків
 */

import { BenchmarkResult } from './reporters.js';

export type BenchmarkFn = () => void | Promise<void>;

/**
 * Запускає один бенчмарк і повертає результат
 */
export function runBenchmark(
  name: string,
  implementation: string,
  fn: BenchmarkFn,
  iterations: number = 100
): BenchmarkResult {
  // Warmup
  try {
    for (let i = 0; i < Math.min(10, iterations); i++) {
      fn();
    }
  } catch (error) {
    return {
      name,
      implementation,
      time: 0,
      memory: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // Force garbage collection if available
  if (globalThis.gc) {
    globalThis.gc();
  }

  // Measure memory before
  const memoryBefore = process.memoryUsage().heapUsed;

  // Run benchmark
  const startTime = performance.now();
  try {
    for (let i = 0; i < iterations; i++) {
      fn();
    }
  } catch (error) {
    return {
      name,
      implementation,
      time: 0,
      memory: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
  const endTime = performance.now();

  // Measure memory after
  const memoryAfter = process.memoryUsage().heapUsed;
  const memoryUsed = (memoryAfter - memoryBefore) / 1024 / 1024; // Convert to MB

  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  const opsPerSecond = (1000 / avgTime);

  return {
    name,
    implementation,
    time: avgTime,
    memory: memoryUsed / iterations,
    operationsPerSecond: opsPerSecond,
    success: true
  };
}

/**
 * Запускає асинхронний бенчмарк
 */
export async function runAsyncBenchmark(
  name: string,
  implementation: string,
  fn: () => Promise<void>,
  iterations: number = 100
): Promise<BenchmarkResult> {
  // Warmup
  try {
    for (let i = 0; i < Math.min(10, iterations); i++) {
      await fn();
    }
  } catch (error) {
    return {
      name,
      implementation,
      time: 0,
      memory: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  // Force garbage collection if available
  if (globalThis.gc) {
    globalThis.gc();
  }

  // Measure memory before
  const memoryBefore = process.memoryUsage().heapUsed;

  // Run benchmark
  const startTime = performance.now();
  try {
    for (let i = 0; i < iterations; i++) {
      await fn();
    }
  } catch (error) {
    return {
      name,
      implementation,
      time: 0,
      memory: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
  const endTime = performance.now();

  // Measure memory after
  const memoryAfter = process.memoryUsage().heapUsed;
  const memoryUsed = (memoryAfter - memoryBefore) / 1024 / 1024; // Convert to MB

  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;
  const opsPerSecond = (1000 / avgTime);

  return {
    name,
    implementation,
    time: avgTime,
    memory: memoryUsed / iterations,
    operationsPerSecond: opsPerSecond,
    success: true
  };
}

/**
 * Клас для запуску набору бенчмарків
 */
export class BenchmarkSuite {
  private readonly benchmarks: Array<{
    name: string;
    implementation: string;
    fn: BenchmarkFn;
    iterations?: number;
  }> = [];
  private readonly asyncBenchmarks: Array<{
    name: string;
    implementation: string;
    fn: () => Promise<void>;
    iterations?: number;
  }> = [];

  /**
   * Додає синхронний бенчмарк
   */
  add(name: string, implementation: string, fn: BenchmarkFn, iterations?: number): this {
    this.benchmarks.push({ name, implementation, fn, iterations });
    return this;
  }

  /**
   * Додає асинхронний бенчмарк
   */
  addAsync(name: string, implementation: string, fn: () => Promise<void>, iterations?: number): this {
    this.asyncBenchmarks.push({ name, implementation, fn, iterations });
    return this;
  }

  /**
   * Запускає всі бенчмарки
   */
  async run(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    for (const benchmark of this.benchmarks) {
      const result = runBenchmark(
        benchmark.name,
        benchmark.implementation,
        benchmark.fn,
        benchmark.iterations || 100
      );
      results.push(result);
    }

    for (const benchmark of this.asyncBenchmarks) {
      const result = await runAsyncBenchmark(
        benchmark.name,
        benchmark.implementation,
        benchmark.fn,
        benchmark.iterations || 100
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Запускає бенчмарки і виводить результати в консоль
   */
  async runAndPrint(): Promise<BenchmarkResult[]> {
    const results = await this.run();
    this.printResults(results);
    return results;
  }

  /**
   * Виводить результати в консоль
   */
  private printResults(results: BenchmarkResult[]): void {
    console.log('\n' + '═'.repeat(80));
    console.log('BENCHMARK RESULTS'.padStart(50));
    console.log('═'.repeat(80) + '\n');

    const grouped = this.groupByBenchmark(results);

    for (const [benchmarkName, implResults] of Object.entries(grouped)) {
      console.log(`\n📊 ${benchmarkName}`);
      console.log('─'.repeat(80));
      console.log('Implementation'.padEnd(40) + 'Time (ms)'.padStart(15) + 'Memory (MB)'.padStart(15) + 'Status');
      console.log('─'.repeat(80));

      implResults.sort((a, b) => a.time - b.time);

      for (const result of implResults) {
        const status = result.success ? '✅' : `❌ ${result.error || 'Failed'}`;
        const impl = result.implementation.padEnd(40);
        const time = result.time.toFixed(4).padStart(12);
        const memory = result.memory.toFixed(4).padStart(13);
        console.log(`${impl}${time}${memory}${status}`);
      }

      const fastest = implResults[0];
      console.log(`\n🏆 Fastest: ${fastest.implementation} (${fastest.time.toFixed(4)}ms)`);
    }

    console.log('\n' + '═'.repeat(80) + '\n');
  }

  /**
   * Групує результати за назвою бенчмарку
   */
  private groupByBenchmark(results: BenchmarkResult[]): Record<string, BenchmarkResult[]> {
    const grouped: Record<string, BenchmarkResult[]> = {};
    for (const result of results) {
      if (!grouped[result.name]) {
        grouped[result.name] = [];
      }
      grouped[result.name].push(result);
    }
    return grouped;
  }
}

/**
 * Порівнює дві реалізації
 */
export function compareImplementations(
  name: string,
  impl1: { name: string; fn: BenchmarkFn },
  impl2: { name: string; fn: BenchmarkFn },
  iterations: number = 100
): { name: string; result1: BenchmarkResult; result2: BenchmarkResult; improvement: number } {
  const result1 = runBenchmark(name, impl1.name, impl1.fn, iterations);
  const result2 = runBenchmark(name, impl2.name, impl2.fn, iterations);

  const improvement = ((result1.time - result2.time) / result1.time) * 100;

  return {
    name,
    result1,
    result2,
    improvement
  };
}

/**
 * Запускає порівняльний бенчмарк з кількома реалізаціями
 */
export function runComparison(
  name: string,
  implementations: Array<{ name: string; fn: BenchmarkFn }>,
  iterations: number = 100
): BenchmarkResult[] {
  return implementations.map(impl =>
    runBenchmark(name, impl.name, impl.fn, iterations)
  );
}

/**
 * Запускає всі бенчмарки з файлів
 */
export async function runAllBenchmarks(): Promise<BenchmarkResult[]> {
  const allResults: BenchmarkResult[] = [];

  // Import and run all benchmark files
  const benchmarkCategories = [
    './benchmarks/comparisons/vs-native.spec.js',
    './benchmarks/comparisons/vs-custom.spec.js',
    './benchmarks/comparisons/vs-express-bp.spec.js',
    './benchmarks/parser/duplicate-keys.spec.js',
    './benchmarks/parser/deep-nesting.spec.js',
    './benchmarks/parser/large-payload.spec.js',
    './benchmarks/parser/memory-usage.spec.js',
    './benchmarks/adapters/express.spec.js',
    './benchmarks/adapters/fastify.spec.js',
    './benchmarks/adapters/streaming.spec.js'
  ];

  for (const category of benchmarkCategories) {
    try {
      // Dynamic import will be done when benchmark files exist
      // For now, return empty array
      console.log(`Running benchmarks for ${category}...`);
    } catch (error) {
      console.warn(`Could not load ${category}:`, error);
    }
  }

  return allResults;
}

/**
 * Вимірює пікове споживання пам'яті
 */
export function measurePeakMemory(fn: BenchmarkFn): number {
  if (!globalThis.gc) {
    console.warn('Garbage collection not available. Run with --expose-gc for accurate memory measurements.');
  }

  const initialMemory = process.memoryUsage().heapUsed;
  let peakMemory = initialMemory;

  const interval = setInterval(() => {
    const currentMemory = process.memoryUsage().heapUsed;
    if (currentMemory > peakMemory) {
      peakMemory = currentMemory;
    }
  }, 1);

  try {
    fn();
  } finally {
    clearInterval(interval);
  }

  const memoryUsed = (peakMemory - initialMemory) / 1024 / 1024; // Convert to MB
  return memoryUsed;
}
