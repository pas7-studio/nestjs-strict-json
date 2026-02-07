/**
 * Генератор звітів з результатами бенчмарків
 */

import * as fs from 'fs';
import * as path from 'path';

export interface BenchmarkResult {
  name: string;
  implementation: string;
  time: number; // в мілісекундах
  memory: number; // в MB
  operationsPerSecond?: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ComparisonResult {
  name: string;
  implementations: BenchmarkResult[];
  winner: string;
  metrics: {
    timeImprovement: string;
    memoryImprovement: string;
  };
}

export interface SummaryMetrics {
  totalBenchmarks: number;
  successfulBenchmarks: number;
  averageTime: number;
  averageMemory: number;
  fastestImplementation: string;
  mostMemoryEfficient: string;
}

/**
 * Генерує зведений звіт
 */
export function generateSummary(results: BenchmarkResult[]): string {
  const summary = calculateSummaryMetrics(results);
  const grouped = groupByImplementation(results);

  let markdown = '# Performance Benchmark Summary\n\n';
  markdown += `## Executive Summary\n\n`;
  markdown += `- **Total Benchmarks**: ${summary.totalBenchmarks}\n`;
  markdown += `- **Successful**: ${summary.successfulBenchmarks}/${summary.totalBenchmarks}\n`;
  markdown += `- **Average Time**: ${summary.averageTime.toFixed(3)}ms\n`;
  markdown += `- **Average Memory**: ${summary.averageMemory.toFixed(2)}MB\n`;
  markdown += `- **Fastest Implementation**: ${summary.fastestImplementation}\n`;
  markdown += `- **Most Memory Efficient**: ${summary.mostMemoryEfficient}\n\n`;

  markdown += `## Implementation Comparison\n\n`;
  markdown += `| Implementation | Avg Time (ms) | Avg Memory (MB) | Success Rate |\n`;
  markdown += `|----------------|---------------|-----------------|--------------|\n`;

  for (const [impl, implResults] of Object.entries(grouped)) {
    const avgTime = average(implResults.map(r => r.time));
    const avgMemory = average(implResults.map(r => r.memory));
    const successRate = (implResults.filter(r => r.success).length / implResults.length * 100).toFixed(0);
    markdown += `| ${impl} | ${avgTime.toFixed(3)} | ${avgMemory.toFixed(2)} | ${successRate}% |\n`;
  }

  return markdown;
}

/**
 * Генерує детальний Markdown звіт
 */
export function generateMarkdownReport(results: BenchmarkResult[]): string {
  let markdown = '# Detailed Benchmark Results\n\n';
  markdown += `Generated: ${new Date().toISOString()}\n\n`;

  const grouped = groupByBenchmarkName(results);

  for (const [benchmarkName, implResults] of Object.entries(grouped)) {
    markdown += `## ${benchmarkName}\n\n`;
    markdown += `| Implementation | Time (ms) | Memory (MB) | Ops/sec | Status |\n`;
    markdown += `|----------------|-----------|-------------|---------|--------|\n`;

    implResults.sort((a, b) => a.time - b.time);

    for (const result of implResults) {
      const status = result.success ? '✅' : `❌ ${result.error || 'Failed'}`;
      const ops = result.operationsPerSecond ? result.operationsPerSecond.toFixed(0) : 'N/A';
      markdown += `| ${result.implementation} | ${result.time.toFixed(3)} | ${result.memory.toFixed(2)} | ${ops} | ${status} |\n`;
    }

    const fastest = implResults[0];
    markdown += `\n🏆 **Fastest**: ${fastest.implementation} (${fastest.time.toFixed(3)}ms)\n\n`;
    markdown += '---\n\n';
  }

  return markdown;
}

/**
 * Генерує JSON звіт
 */
export function generateJsonReport(results: BenchmarkResult[]): string {
  const summary = calculateSummaryMetrics(results);
  const grouped = groupByImplementation(results);

  const implementations = Object.entries(grouped).map(([impl, implResults]) => ({
    name: impl,
    averageTime: average(implResults.map(r => r.time)),
    averageMemory: average(implResults.map(r => r.memory)),
    successRate: implResults.filter(r => r.success).length / implResults.length,
    results: implResults
  }));

  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    summary,
    implementations,
    rawResults: results
  }, null, 2);
}

/**
 * Зберігає звіти в файли
 */
export function saveReports(results: BenchmarkResult[], outputDir: string = 'performance/reports'): void {
  // Переконаємося, що папка існує
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Зберігаємо summary
  const summary = generateSummary(results);
  fs.writeFileSync(path.join(outputDir, 'summary.md'), summary, 'utf-8');

  // Зберігаємо детальний звіт
  const detailed = generateMarkdownReport(results);
  fs.writeFileSync(path.join(outputDir, 'latest.md'), detailed, 'utf-8');

  // Зберігаємо JSON звіт
  const json = generateJsonReport(results);
  fs.writeFileSync(path.join(outputDir, 'results.json'), json, 'utf-8');

  console.log(`✅ Reports saved to ${outputDir}/`);
}

/**
 * Генерує таблицю порівняння
 */
export function generateComparisonTable(comparisons: ComparisonResult[]): string {
  let markdown = '# Benchmark Comparisons\n\n';

  for (const comparison of comparisons) {
    markdown += `## ${comparison.name}\n\n`;
    markdown += `### Results\n\n`;
    markdown += `| Implementation | Time (ms) | Memory (MB) |\n`;
    markdown += `|----------------|-----------|-------------|\n`;

    comparison.implementations.sort((a, b) => a.time - b.time);

    for (const impl of comparison.implementations) {
      const winner = impl.implementation === comparison.winner ? '🏆 ' : '';
      markdown += `| ${winner}${impl.implementation} | ${impl.time.toFixed(3)} | ${impl.memory.toFixed(2)} |\n`;
    }

    markdown += `\n### Metrics\n\n`;
    markdown += `- **Time Improvement**: ${comparison.metrics.timeImprovement}\n`;
    markdown += `- **Memory Improvement**: ${comparison.metrics.memoryImprovement}\n\n`;
    markdown += '---\n\n';
  }

  return markdown;
}

/**
 * Розраховує зведені метрики
 */
function calculateSummaryMetrics(results: BenchmarkResult[]): SummaryMetrics {
  const successful = results.filter(r => r.success);
  const grouped = groupByImplementation(results);

  let fastestImpl = '';
  let fastestTime = Infinity;
  let mostEfficientImpl = '';
  let leastMemory = Infinity;

  for (const [impl, implResults] of Object.entries(grouped)) {
    const avgTime = average(implResults.filter(r => r.success).map(r => r.time));
    const avgMemory = average(implResults.filter(r => r.success).map(r => r.memory));

    if (avgTime < fastestTime) {
      fastestTime = avgTime;
      fastestImpl = impl;
    }

    if (avgMemory < leastMemory) {
      leastMemory = avgMemory;
      mostEfficientImpl = impl;
    }
  }

  return {
    totalBenchmarks: results.length,
    successfulBenchmarks: successful.length,
    averageTime: average(successful.map(r => r.time)),
    averageMemory: average(successful.map(r => r.memory)),
    fastestImplementation: fastestImpl,
    mostMemoryEfficient: mostEfficientImpl
  };
}

/**
 * Групує результати за ім'ям бенчмарку
 */
function groupByBenchmarkName(results: BenchmarkResult[]): Record<string, BenchmarkResult[]> {
  const grouped: Record<string, BenchmarkResult[]> = {};
  for (const result of results) {
    if (!grouped[result.name]) {
      grouped[result.name] = [];
    }
    grouped[result.name].push(result);
  }
  return grouped;
}

/**
 * Групує результати за реалізацією
 */
function groupByImplementation(results: BenchmarkResult[]): Record<string, BenchmarkResult[]> {
  const grouped: Record<string, BenchmarkResult[]> = {};
  for (const result of results) {
    if (!grouped[result.implementation]) {
      grouped[result.implementation] = [];
    }
    grouped[result.implementation].push(result);
  }
  return grouped;
}

/**
 * Обчислює середнє значення
 */
function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

/**
 * Форматує число з відсотками
 */
export function formatPercentage(value: number, baseline: number): string {
  if (baseline === 0) return 'N/A';
  const percentage = ((value - baseline) / baseline * 100).toFixed(1);
  return percentage.startsWith('-') ? `${percentage}%` : `+${percentage}%`;
}

/**
 * Форматує розмір пам'яті
 */
export function formatMemorySize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  if (mb < 1) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${mb.toFixed(2)} MB`;
}
