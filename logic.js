// Stats Calc BD — pure descriptive-statistics engine (no DOM, no network).
// Quartiles use linear interpolation (type-7 / Excel PERCENTILE.INC method).
// Variance/std-dev are reported both ways: population (divide by n) and
// sample (divide by n-1, requires n >= 2). All money-free, all offline.
'use strict';

const BN_DIGIT_MAP = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
const MAX_VALUES = 5000;

function toAsciiDigits(str) {
  return String(str).replace(/[০-৯]/g, (d) => BN_DIGIT_MAP[d]);
}

function toBnDigits(str) {
  const map = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(str).replace(/[0-9]/g, (d) => map[Number(d)]);
}

// Parse pasted text into numbers. Separators: comma, semicolon, whitespace,
// newlines. Bengali digits are converted first. Returns { values } or
// { error: 'empty' | 'too-many' | 'invalid', invalid: [tokens] }.
function parseDataset(text) {
  const ascii = toAsciiDigits(text || '');
  const tokens = ascii.split(/[\s,;]+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return { error: 'empty', invalid: [] };
  if (tokens.length > MAX_VALUES) return { error: 'too-many', invalid: [] };
  const numRe = /^-?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/;
  const invalid = tokens.filter((t) => !numRe.test(t));
  if (invalid.length > 0) return { error: 'invalid', invalid: invalid.slice(0, 10) };
  const values = tokens.map(Number).filter((v) => Number.isFinite(v));
  if (values.length === 0) return { error: 'empty', invalid: [] };
  return { values };
}

function quantile(sorted, p) {
  // sorted: ascending array, n >= 1. Linear interpolation on (n-1)*p.
  const n = sorted.length;
  if (n === 1) return sorted[0];
  const pos = p * (n - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function histogramBins(sorted, binCount) {
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return [{ lo: min, hi: max, count: sorted.length }];
  const k = Math.max(1, Math.min(20, binCount));
  const width = (max - min) / k;
  const bins = [];
  for (let i = 0; i < k; i++) {
    bins.push({ lo: min + i * width, hi: min + (i + 1) * width, count: 0 });
  }
  for (const v of sorted) {
    let idx = Math.floor((v - min) / width);
    if (idx >= k) idx = k - 1;
    bins[idx].count++;
  }
  return bins;
}

function computeStats(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;
  const min = sorted[0];
  const max = sorted[n - 1];
  const sq = sorted.reduce((acc, v) => acc + (v - mean) * (v - mean), 0);
  const varPop = sq / n;
  const varSample = n >= 2 ? sq / (n - 1) : null;
  // Mode: every value attaining the max frequency, only if frequency > 1.
  const freqMap = new Map();
  for (const v of sorted) freqMap.set(v, (freqMap.get(v) || 0) + 1);
  let maxFreq = 0;
  for (const c of freqMap.values()) if (c > maxFreq) maxFreq = c;
  const modes = maxFreq > 1 ? [...freqMap.entries()].filter(([, c]) => c === maxFreq).map(([v]) => v) : [];
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);
  const freq = [...freqMap.entries()].map(([value, count]) => ({ value, count }));
  const bins = histogramBins(sorted, Math.ceil(Math.sqrt(n)));
  return {
    n, sum, mean, median, modes, hasMode: modes.length > 0,
    min, max, range: max - min,
    varPop, varSample,
    stdPop: Math.sqrt(varPop), stdSample: varSample === null ? null : Math.sqrt(varSample),
    q1, q3, iqr, lowerFence, upperFence, outliers,
    sorted, freq, bins,
  };
}

// Format a number for display: integers as-is, otherwise up to 4 decimals
// with trailing zeros stripped. null/undefined -> em dash.
function fmtNum(v) {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 10000) / 10000);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseDataset, computeStats, quantile, histogramBins, fmtNum, toAsciiDigits, toBnDigits, MAX_VALUES };
}
