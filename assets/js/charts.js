/**
 * charts.js — Ava Judging System
 * Chart.js v4 wrapper. All charts use CSS variable colors.
 * Lazy-loads Chart.js from CDN on first call.
 *
 * Exports: renderBarChart, renderRadarChart, renderHistogram,
 *          renderLineChart, renderHeatmap, exportChartAsPNG, destroyChart
 */

import { CONFIG } from './config.js';

const CHART_JS_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';

let _chartJsLoaded = false;
const _instances = new Map(); // canvasId → Chart instance

async function _ensureChartJs() {
  if (_chartJsLoaded || typeof Chart !== 'undefined') {
    _chartJsLoaded = true;
    return;
  }
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHART_JS_CDN;
    script.onload = () => { _chartJsLoaded = true; resolve(); };
    script.onerror = () => reject(new Error('Failed to load Chart.js'));
    document.head.appendChild(script);
  });
}

/**
 * Destroys an existing Chart instance on a canvas before recreating.
 * @param {string} canvasId
 */
export function destroyChart(canvasId) {
  const existing = _instances.get(canvasId);
  if (existing) { existing.destroy(); _instances.delete(canvasId); }
}

function _cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function _baseDefaults() {
  const textMuted = _cssVar('--color-text-muted') || '#718096';
  const fontBody  = _cssVar('--font-body')        || 'sans-serif';
  const fontMono  = _cssVar('--font-mono')         || 'monospace';
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          font: { family: fontBody, size: 12 },
          color: textMuted,
          boxWidth: 12,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: _cssVar('--color-primary-900') || '#0d1b2e',
        titleColor: '#fff',
        bodyColor: 'rgba(255,255,255,0.8)',
        padding: 10,
        cornerRadius: 6,
        titleFont: { family: fontBody, weight: '600' },
        bodyFont:  { family: fontMono, size: 13 },
      },
    },
    scales: {
      x: {
        grid:  { color: 'rgba(0,0,0,0.05)', drawBorder: false },
        ticks: { color: textMuted, font: { family: fontBody, size: 12 } },
      },
      y: {
        grid:  { color: 'rgba(0,0,0,0.05)', drawBorder: false },
        ticks: { color: textMuted, font: { family: fontBody, size: 12 } },
        beginAtZero: true,
      },
    },
  };
}

/* ============================================================
   BAR CHART
   ============================================================ */

/**
 * Renders a vertical or horizontal bar chart.
 * @param {string} canvasId
 * @param {{ labels: string[], datasets: Array<{label?: string, data: number[], color?: string}> }} data
 * @param {{ horizontal?: boolean, stacked?: boolean, yMax?: number, yLabel?: string, xLabel?: string }} [options]
 * @returns {Promise<Chart>}
 */
export async function renderBarChart(canvasId, data, options = {}) {
  await _ensureChartJs();
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) throw new Error(`Canvas #${canvasId} not found`);

  const colors = CONFIG.CHART_COLORS.series;
  const base = _baseDefaults();

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: data.datasets.map((ds, i) => ({
        label: ds.label || '',
        data: ds.data,
        backgroundColor: (ds.color || colors[i % colors.length]) + 'CC',
        borderColor: ds.color || colors[i % colors.length],
        borderWidth: 1.5,
        borderRadius: 4,
        borderSkipped: false,
      })),
    },
    options: {
      ...base,
      indexAxis: options.horizontal ? 'y' : 'x',
      plugins: {
        ...base.plugins,
        legend: { ...base.plugins.legend, display: data.datasets.length > 1 },
      },
      scales: {
        x: {
          ...base.scales.x,
          stacked: options.stacked || false,
          title: options.xLabel ? { display: true, text: options.xLabel, color: base.scales.x.ticks.color, font: { size: 12 } } : undefined,
        },
        y: {
          ...base.scales.y,
          stacked: options.stacked || false,
          max: options.yMax,
          title: options.yLabel ? { display: true, text: options.yLabel, color: base.scales.y.ticks.color, font: { size: 12 } } : undefined,
        },
      },
    },
  });

  _instances.set(canvasId, chart);
  return chart;
}

/* ============================================================
   RADAR CHART
   ============================================================ */

/**
 * Renders a radar/spider chart for competitor scorecards.
 * @param {string} canvasId
 * @param {{ labels: string[], datasets: Array<{label?: string, data: number[], color?: string}> }} data
 * @param {{ max?: number }} [options]
 * @returns {Promise<Chart>}
 */
export async function renderRadarChart(canvasId, data, options = {}) {
  await _ensureChartJs();
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) throw new Error(`Canvas #${canvasId} not found`);

  const colors = CONFIG.CHART_COLORS.series;
  const base = _baseDefaults();
  const textMuted = _cssVar('--color-text-muted') || '#718096';
  const fontBody  = _cssVar('--font-body')        || 'sans-serif';

  const chart = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: data.labels,
      datasets: data.datasets.map((ds, i) => {
        const color = ds.color || colors[i % colors.length];
        return {
          label: ds.label || '',
          data: ds.data,
          backgroundColor: color + '22',
          borderColor: color,
          borderWidth: 2,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        };
      }),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: base.plugins.legend,
        tooltip: base.plugins.tooltip,
      },
      scales: {
        r: {
          min: 0,
          max: options.max,
          beginAtZero: true,
          grid:       { color: 'rgba(0,0,0,0.08)' },
          angleLines: { color: 'rgba(0,0,0,0.08)' },
          pointLabels: { font: { family: fontBody, size: 12 }, color: textMuted },
          ticks: { backdropColor: 'transparent', color: textMuted, font: { size: 10 } },
        },
      },
    },
  });

  _instances.set(canvasId, chart);
  return chart;
}

/* ============================================================
   HISTOGRAM
   ============================================================ */

/**
 * Renders a histogram (adjacent bars, frequency y-axis).
 * @param {string} canvasId
 * @param {{ labels: string[], counts: number[] }} data
 * @param {{ color?: string, yLabel?: string }} [options]
 * @returns {Promise<Chart>}
 */
export async function renderHistogram(canvasId, data, options = {}) {
  await _ensureChartJs();
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) throw new Error(`Canvas #${canvasId} not found`);

  const fillColor = options.color || CONFIG.CHART_COLORS.primary;
  const base = _baseDefaults();

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.labels,
      datasets: [{
        label: 'Frequency',
        data: data.counts,
        backgroundColor: fillColor + 'BB',
        borderColor: fillColor,
        borderWidth: 1.5,
        borderRadius: 2,
        borderSkipped: false,
      }],
    },
    options: {
      ...base,
      plugins: { ...base.plugins, legend: { display: false } },
      scales: {
        x: {
          ...base.scales.x,
          categoryPercentage: 1.0,
          barPercentage: 1.0,
          title: { display: true, text: 'Score Range', color: base.scales.x.ticks.color, font: { size: 12 } },
        },
        y: {
          ...base.scales.y,
          ticks: { ...base.scales.y.ticks, stepSize: 1, precision: 0 },
          title: { display: true, text: options.yLabel || 'Count', color: base.scales.y.ticks.color, font: { size: 12 } },
        },
      },
    },
  });

  _instances.set(canvasId, chart);
  return chart;
}

/* ============================================================
   LINE CHART
   ============================================================ */

/**
 * Renders a line chart (voting timeline, trends).
 * @param {string} canvasId
 * @param {{ labels: string[], datasets: Array<{label?: string, data: number[], color?: string}> }} data
 * @param {{ yLabel?: string, fill?: boolean }} [options]
 * @returns {Promise<Chart>}
 */
export async function renderLineChart(canvasId, data, options = {}) {
  await _ensureChartJs();
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) throw new Error(`Canvas #${canvasId} not found`);

  const colors = CONFIG.CHART_COLORS.series;
  const base = _baseDefaults();

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.labels,
      datasets: data.datasets.map((ds, i) => {
        const color = ds.color || colors[i % colors.length];
        return {
          label: ds.label || '',
          data: ds.data,
          borderColor: color,
          backgroundColor: options.fill ? (color + '22') : 'transparent',
          borderWidth: 2.5,
          pointBackgroundColor: color,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: options.fill || false,
          tension: 0.3,
        };
      }),
    },
    options: {
      ...base,
      plugins: {
        ...base.plugins,
        legend: { ...base.plugins.legend, display: data.datasets.length > 1 },
      },
      scales: {
        x: { ...base.scales.x },
        y: {
          ...base.scales.y,
          title: options.yLabel ? { display: true, text: options.yLabel, color: base.scales.y.ticks.color, font: { size: 12 } } : undefined,
        },
      },
    },
  });

  _instances.set(canvasId, chart);
  return chart;
}

/* ============================================================
   HEATMAP — custom canvas renderer (no Chart.js plugin needed)
   ============================================================ */

/**
 * Renders a pairwise correlation heatmap onto a canvas.
 * Values must be in [-1, 1]. Negative = red, zero = white, positive = blue.
 *
 * @param {string} canvasId
 * @param {number[][]} matrix - n×n correlation matrix
 * @param {string[]} labels - Row/column labels
 * @param {{ cellSize?: number }} [options]
 */
export async function renderHeatmap(canvasId, matrix, labels, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) throw new Error(`Canvas #${canvasId} not found`);

  const n = labels.length;
  const cellSize  = options.cellSize || 58;
  const labelPad  = 100;
  const legendH   = 40;

  canvas.width  = labelPad + n * cellSize;
  canvas.height = labelPad + n * cellSize + legendH;
  canvas.style.maxWidth = '100%';

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const fontFamily = _cssVar('--font-body') || 'sans-serif';
  const textColor  = _cssVar('--color-text-muted') || '#718096';

  // Cells
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const val = (matrix[row] && matrix[row][col] !== undefined) ? matrix[row][col] : 0;
      const cx = labelPad + col * cellSize;
      const cy = labelPad + row * cellSize;

      ctx.fillStyle = _heatColor(val);
      ctx.fillRect(cx, cy, cellSize - 1, cellSize - 1);

      ctx.fillStyle = Math.abs(val) > 0.55 ? '#fff' : '#1a202c';
      ctx.font = `600 11px ${fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(val.toFixed(2), cx + cellSize / 2, cy + cellSize / 2);
    }
  }

  // Column labels (45° rotated)
  ctx.fillStyle = textColor;
  ctx.font = `600 11px ${fontFamily}`;
  for (let col = 0; col < n; col++) {
    const cx = labelPad + col * cellSize + cellSize / 2;
    ctx.save();
    ctx.translate(cx, labelPad - 8);
    ctx.rotate(-Math.PI / 4);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(_truncate(labels[col], 14), 0, 0);
    ctx.restore();
  }

  // Row labels
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let row = 0; row < n; row++) {
    const cy = labelPad + row * cellSize + cellSize / 2;
    ctx.fillText(_truncate(labels[row], 14), labelPad - 8, cy);
  }

  // Legend
  const lgX = labelPad;
  const lgY = labelPad + n * cellSize + 14;
  const lgW = n * cellSize;
  const lgH = 10;

  const grad = ctx.createLinearGradient(lgX, 0, lgX + lgW, 0);
  grad.addColorStop(0,   _heatColor(-1));
  grad.addColorStop(0.5, _heatColor(0));
  grad.addColorStop(1,   _heatColor(1));
  ctx.fillStyle = grad;
  ctx.fillRect(lgX, lgY, lgW, lgH);
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = 1;
  ctx.strokeRect(lgX, lgY, lgW, lgH);

  ctx.fillStyle = textColor;
  ctx.font = `10px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('-1.0', lgX, lgY + lgH + 3);
  ctx.textAlign = 'center';
  ctx.fillText('0', lgX + lgW / 2, lgY + lgH + 3);
  ctx.textAlign = 'right';
  ctx.fillText('+1.0', lgX + lgW, lgY + lgH + 3);
}

function _heatColor(val) {
  const v = Math.max(-1, Math.min(1, val));
  if (v >= 0) {
    const t = v;
    return `rgb(${Math.round(255*(1-t*0.87))},${Math.round(255*(1-t*0.79))},${Math.round(255*(1-t*0.27))})`;
  } else {
    const t = -v;
    return `rgb(255,${Math.round(255*(1-t*0.81))},${Math.round(255*(1-t*0.81))})`;
  }
}

function _truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

/* ============================================================
   EXPORT AS PNG
   ============================================================ */

/**
 * Returns a PNG data URL from a chart canvas, for PDF embedding.
 * @param {string} canvasId
 * @returns {string|null}
 */
export function exportChartAsPNG(canvasId) {
  const canvas = document.getElementById(canvasId);
  return canvas ? canvas.toDataURL('image/png') : null;
}
