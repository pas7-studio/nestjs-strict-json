/**
 * Генератор ASCII графіків для терміналу та звітів
 */

export interface ChartData {
  label: string;
  value: number;
  maxValue?: number;
}

export interface ComparisonData {
  implementation: string;
  value: number;
  baseline?: number;
}

/**
 * Генерує стовпчасту діаграму в ASCII
 */
export function generateBarChart(data: ChartData[], options?: { width?: number; showValue?: boolean }): string {
  const width = options?.width || 50;
  const showValue = options?.showValue !== false;

  if (data.length === 0) {
    return 'No data to display';
  }

  const maxValue = data.reduce((max, d) => Math.max(max, d.value), data[0].maxValue || data[0].value);
  const maxLabelLength = Math.max(...data.map(d => d.label.length));

  let chart = '';

  for (const item of data) {
    const barLength = Math.round((item.value / maxValue) * width);
    const bar = '█'.repeat(barLength) + '░'.repeat(width - barLength);
    const label = item.label.padEnd(maxLabelLength);
    const valueStr = showValue ? ` ${item.value.toFixed(2)}` : '';

    chart += `${label} │${bar}│${valueStr}\n`;
  }

  return chart;
}

/**
 * Генерує горизонтальну діаграму порівняння
 */
export function generateComparisonChart(data: ComparisonData[]): string {
  if (data.length === 0) {
    return 'No data to display';
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const maxLabelLength = Math.max(...data.map(d => d.implementation.length));
  const width = 40;

  let chart = '';

  for (const item of data) {
    const barLength = Math.round((item.value / maxValue) * width);
    const bar = '█'.repeat(barLength);
    const label = item.implementation.padEnd(maxLabelLength);
    const value = item.value.toFixed(2);
    const baseline = item.baseline ? `(vs ${item.baseline.toFixed(2)})` : '';

    chart += `${label} │${bar.padEnd(width)}│ ${value}${baseline}\n`;
  }

  return chart;
}

/**
 * Генерує графік порівняння з відсотками
 */
export function generatePercentageChart(data: ComparisonData[]): string {
  if (data.length === 0) {
    return 'No data to display';
  }

  const baseline = data[0].baseline || data[0].value;
  const maxLabelLength = Math.max(...data.map(d => d.implementation.length));

  let chart = '';
  chart += 'Implementation | Performance | % of Baseline\n';
  chart += '---------------|-------------|---------------\n';

  for (const item of data) {
    const percentage = (item.value / baseline * 100).toFixed(1);
    const performance = item.value.toFixed(3);
    const label = item.implementation.padEnd(maxLabelLength);

    chart += `${label} | ${performance.padStart(12)} | ${percentage.padStart(12)}%\n`;
  }

  return chart;
}

/**
 * Генерує графік пам'яті
 */
export function generateMemoryChart(data: ChartData[], options?: { unit?: string }): string {
  const unit = options?.unit || 'MB';

  let chart = 'Memory Usage Comparison\n';
  chart += '======================\n\n';

  chart += generateBarChart(data, { width: 40, showValue: true });
  chart += `\nUnit: ${unit}\n`;

  return chart;
}

/**
 * Генерує графік часу виконання
 */
export function generateTimeChart(data: ChartData[]): string {
  let chart = 'Execution Time Comparison\n';
  chart += '==========================\n\n';

  chart += generateBarChart(data, { width: 40, showValue: true });
  chart += '\nUnit: milliseconds\n';

  return chart;
}

/**
 * Генерує комбінований графік для Markdown
 */
export function generateMarkdownTable(data: ComparisonData[], metricName: string): string {
  if (data.length === 0) {
    return 'No data to display';
  }

  const baseline = data[0].baseline || data[0].value;

  let markdown = `### ${metricName}\n\n`;
  markdown += '| Implementation | Value | % of Baseline |\n';
  markdown += '|----------------|-------|---------------|\n';

  for (const item of data) {
    const percentage = (item.value / baseline * 100).toFixed(1);
    markdown += `| ${item.implementation} | ${item.value.toFixed(3)} | ${percentage}% |\n`;
  }

  return markdown;
}

/**
 * Генерує візуалізацію для терміналу
 */
export function generateTerminalChart(data: ChartData[]): string {
  let output = '';

  // Заголовок
  output += '\n' + '═'.repeat(60) + '\n';
  output += '📊 BENCHMARK RESULTS'.padStart(45) + '\n';
  output += '═'.repeat(60) + '\n\n';

  // Графік
  output += generateBarChart(data, { width: 40, showValue: true });

  // Футер
  output += '\n' + '═'.repeat(60) + '\n';

  return output;
}

/**
 * Створює візуалізацію прискорення (speedup)
 */
export function generateSpeedupChart(baseline: number, optimized: number, label: string): string {
  const speedup = baseline / optimized;
  const improvement = ((baseline - optimized) / baseline * 100).toFixed(1);

  let chart = `## ${label}\n\n`;
  chart += `**Baseline**: ${baseline.toFixed(3)}ms\n`;
  chart += `**Optimized**: ${optimized.toFixed(3)}ms\n`;
  chart += `**Speedup**: ${speedup.toFixed(2)}x faster\n`;
  chart += `**Improvement**: ${improvement}%\n\n`;

  // Візуалізація
  const baselineBar = '█'.repeat(30);
  const optimizedBar = '█'.repeat(Math.round(30 * (optimized / baseline)));

  chart += `Baseline: │${baselineBar}│\n`;
  chart += `Optimized: │${optimizedBar}${'░'.repeat(30 - Math.round(30 * (optimized / baseline)))}│\n\n`;

  return chart;
}

/**
 * Генерує radar chart у текстовому форматі (спрощена версія)
 */
export function generateRadarChart(data: Array<{ label: string; value: number; max: number }>): string {
  let chart = 'Radar Comparison Chart\n';
  chart += '======================\n\n';

  const maxLabelLength = Math.max(...data.map(d => d.label.length));

  for (const item of data) {
    const percentage = (item.value / item.max) * 100;
    const label = item.label.padEnd(maxLabelLength);
    const bar = '█'.repeat(Math.round(percentage / 10));

    chart += `${label} [${bar.padEnd(10)}] ${percentage.toFixed(0)}%\n`;
  }

  return chart;
}

/**
 * Генерує heatmap у текстовому форматі
 */
export function generateHeatmap(data: Array<{ label: string; value: number }>, maxValue?: number): string {
  if (!maxValue) {
    maxValue = Math.max(...data.map(d => d.value));
  }

  let chart = 'Performance Heatmap\n';
  chart += '====================\n\n';

  const intensityChars = ['░', '▒', '▓', '█'];

  for (const item of data) {
    const intensity = Math.min(3, Math.floor((item.value / maxValue) * 4));
    const char = intensityChars[intensity];
    const label = item.label.padEnd(20);

    chart += `${label} ${char.repeat(10)} ${item.value.toFixed(2)}\n`;
  }

  return chart;
}
