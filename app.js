// Stats Calc BD — UI wiring. Depends on logic.js + i18n.js globals.
'use strict';
const LS_LANG = 'stats-calc-bd-lang';
const LS_SAVED = 'stats-calc-bd-saved-v1';
let lang = 'en';
try { lang = localStorage.getItem(LS_LANG) || 'en'; } catch (e) { lang = 'en'; }
if (lang !== 'en' && lang !== 'bn') lang = 'en';

const SAMPLES = {
  marks: [72, 85, 68, 90, 74, 85, 61, 77, 85, 69, 82, 74, 58, 91, 76],
  cricket: [12, 45, 0, 67, 23, 89, 34, 45, 102, 18, 45, 56, 7, 33, 45],
  rain: [0, 12, 5, 0, 0, 23, 8, 15, 0, 3, 42, 7, 0, 11, 6],
};

function t(key) { return (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key; }
function disp(s) { return lang === 'bn' ? toBnDigits(String(s)) : String(s); }
function dispNum(v) { return disp(fmtNum(v)); }
function $(id) { return document.getElementById(id); }

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function loadSaved() {
  try {
    const raw = localStorage.getItem(LS_SAVED);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((d) => d && typeof d.name === 'string' && Array.isArray(d.values)) : [];
  } catch (e) { return []; }
}
function storeSaved(arr) {
  try { localStorage.setItem(LS_SAVED, JSON.stringify(arr)); } catch (e) { /* storage full/blocked: ignore */ }
}

function renderSaved() {
  const list = $('savedList');
  const saved = loadSaved();
  if (saved.length === 0) {
    list.innerHTML = '<p class="muted">' + esc(t('noSaved')) + '</p>';
    return;
  }
  list.innerHTML = saved.map((d, i) =>
    '<div class="saved-row"><span class="saved-name">' + esc(d.name) + '</span>' +
    '<span class="muted">' + disp(d.values.length) + ' values</span>' +
    '<button class="btn small" data-load="' + i + '">' + esc(t('loadBtn')) + '</button>' +
    '<button class="btn small danger" data-del="' + i + '">' + esc(t('deleteBtn')) + '</button></div>'
  ).join('');
  list.querySelectorAll('[data-load]').forEach((b) => b.addEventListener('click', () => {
    const d = loadSaved()[Number(b.dataset.load)];
    if (d) { $('dataInput').value = d.values.join(', '); calculate(); }
  }));
  list.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
    if (!window.confirm(t('confirmDelete'))) return;
    const arr = loadSaved();
    arr.splice(Number(b.dataset.del), 1);
    storeSaved(arr);
    renderSaved();
  }));
}

function statRow(label, value) {
  return '<div class="stat"><span class="stat-label">' + esc(label) + '</span><span class="stat-value">' + esc(value) + '</span></div>';
}

function renderHistogram(bins) {
  const maxC = Math.max.apply(null, bins.map((b) => b.count));
  const W = 560, H = 200, padL = 8, padB = 26, padT = 10;
  const innerW = W - padL * 2, innerH = H - padT - padB;
  const bw = innerW / bins.length;
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="histogram">';
  bins.forEach((b, i) => {
    const h = maxC ? (b.count / maxC) * innerH : 0;
    const x = padL + i * bw + 1;
    const y = padT + (innerH - h);
    svg += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(1, bw - 2).toFixed(1) + '" height="' + h.toFixed(1) + '" fill="#0e7490" rx="2"/>';
    svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (padT + innerH + 16) + '" text-anchor="middle" font-size="9" fill="#475569">' + esc(disp(fmtNum(b.lo)) + '–' + disp(fmtNum(b.hi))) + '</text>';
    if (b.count > 0) svg += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle" font-size="10" fill="#0f172a">' + esc(disp(b.count)) + '</text>';
  });
  return svg + '</svg>';
}

function renderBoxPlot(s) {
  const W = 560, H = 110, padL = 30, padR = 30, mid = 55;
  let lo = s.min, hi = s.max;
  if (lo === hi) { lo -= 1; hi += 1; }
  const nonOut = s.sorted.filter((v) => v >= s.lowerFence && v <= s.upperFence);
  const wLo = nonOut.length ? nonOut[0] : s.min;
  const wHi = nonOut.length ? nonOut[nonOut.length - 1] : s.max;
  const x = (v) => padL + ((v - lo) / (hi - lo)) * (W - padL - padR);
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="box plot">';
  svg += '<line x1="' + x(wLo).toFixed(1) + '" y1="' + mid + '" x2="' + x(wHi).toFixed(1) + '" y2="' + mid + '" stroke="#0f172a" stroke-width="1.5"/>';
  svg += '<rect x="' + x(s.q1).toFixed(1) + '" y="30" width="' + Math.max(2, x(s.q3) - x(s.q1)).toFixed(1) + '" height="50" fill="#ccfbf1" stroke="#0e7490" stroke-width="1.5"/>';
  svg += '<line x1="' + x(s.median).toFixed(1) + '" y1="30" x2="' + x(s.median).toFixed(1) + '" y2="80" stroke="#0e7490" stroke-width="2.5"/>';
  svg += '<line x1="' + x(wLo).toFixed(1) + '" y1="22" x2="' + x(wLo).toFixed(1) + '" y2="88" stroke="#0f172a" stroke-width="1.5"/>';
  svg += '<line x1="' + x(wHi).toFixed(1) + '" y1="22" x2="' + x(wHi).toFixed(1) + '" y2="88" stroke="#0f172a" stroke-width="1.5"/>';
  s.outliers.forEach((v) => {
    svg += '<circle cx="' + x(v).toFixed(1) + '" cy="' + mid + '" r="5" fill="#dc2626"/>';
  });
  [[s.min, 'min'], [s.q1, 'Q1'], [s.median, 'med'], [s.q3, 'Q3'], [s.max, 'max']].forEach(([v]) => {
    svg += '<text x="' + x(v).toFixed(1) + '" y="102" text-anchor="middle" font-size="10" fill="#475569">' + esc(dispNum(v)) + '</text>';
  });
  return svg + '</svg>';
}

function calculate() {
  const errBox = $('errorBox');
  const statusBox = $('statusBox');
  errBox.textContent = '';
  statusBox.textContent = '';
  const parsed = parseDataset($('dataInput').value);
  if (parsed.error) {
    $('resultsSection').hidden = true;
    if (parsed.error === 'empty') errBox.textContent = t('errEmpty');
    else if (parsed.error === 'too-many') errBox.textContent = t('errTooMany');
    else errBox.textContent = t('errInvalid') + parsed.invalid.join(', ');
    return;
  }
  const s = computeStats(parsed.values);
  const rows = [
    [t('statCount'), disp(s.n)],
    [t('statSum'), dispNum(s.sum)],
    [t('statMean'), dispNum(s.mean)],
    [t('statMedian'), dispNum(s.median)],
    [t('statMode'), s.hasMode ? s.modes.map(dispNum).join(', ') : t('statNoMode')],
    [t('statMin'), dispNum(s.min)],
    [t('statMax'), dispNum(s.max)],
    [t('statRange'), dispNum(s.range)],
    [t('statQ1'), dispNum(s.q1)],
    [t('statQ3'), dispNum(s.q3)],
    [t('statIQR'), dispNum(s.iqr)],
    [t('statVarPop'), dispNum(s.varPop)],
    [t('statVarSample'), s.varSample === null ? '—' : dispNum(s.varSample)],
    [t('statStdPop'), dispNum(s.stdPop)],
    [t('statStdSample'), s.stdSample === null ? '—' : dispNum(s.stdSample)],
  ];
  $('statsGrid').innerHTML = rows.map(([l, v]) => statRow(l, v)).join('');
  $('sortedBox').textContent = s.sorted.map(dispNum).join(', ');
  $('freqBody').innerHTML = s.freq.map((f) =>
    '<tr><td>' + esc(dispNum(f.value)) + '</td><td>' + esc(disp(f.count)) + '</td></tr>').join('');
  $('histSvg').innerHTML = renderHistogram(s.bins);
  $('boxSvg').innerHTML = renderBoxPlot(s);
  $('outliersBox').textContent = s.outliers.length ? s.outliers.map(dispNum).join(', ') : t('noOutliers');
  if (s.n === 1) statusBox.textContent = t('errMin2');
  $('resultsSection').hidden = false;
  $('resultsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function applyLang() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (key === 'placeholder') return;
    el.textContent = t(key);
  });
  const input = $('dataInput');
  input.placeholder = t('placeholder');
  $('saveName').placeholder = t('saveName');
  document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
  $('langBtn').textContent = lang === 'bn' ? 'English' : 'বাংলা';
  try { localStorage.setItem(LS_LANG, lang); } catch (e) { /* ignore */ }
  renderSaved();
  // Re-render results in the new language if visible.
  if (!$('resultsSection').hidden) calculate();
}

document.addEventListener('DOMContentLoaded', () => {
  applyLang();
  $('calcBtn').addEventListener('click', calculate);
  $('clearBtn').addEventListener('click', () => {
    $('dataInput').value = '';
    $('errorBox').textContent = '';
    $('statusBox').textContent = '';
    $('resultsSection').hidden = true;
  });
  document.querySelectorAll('[data-sample]').forEach((b) => b.addEventListener('click', () => {
    $('dataInput').value = SAMPLES[b.dataset.sample].join(', ');
    calculate();
  }));
  $('langBtn').addEventListener('click', () => {
    lang = lang === 'en' ? 'bn' : 'en';
    applyLang();
  });
  $('saveBtn').addEventListener('click', () => {
    const parsed = parseDataset($('dataInput').value);
    if (parsed.error) { $('errorBox').textContent = t('errEmpty'); return; }
    const saved = loadSaved();
    const name = ($('saveName').value || '').trim() || ('Dataset ' + (saved.length + 1));
    saved.push({ name, values: parsed.values, savedAt: new Date().toISOString() });
    storeSaved(saved);
    $('saveName').value = '';
    $('statusBox').textContent = t('savedOk');
    renderSaved();
  });
  $('exportBtn').addEventListener('click', () => {
    const parsed = parseDataset($('dataInput').value);
    if (parsed.error) { $('errorBox').textContent = t('errEmpty'); return; }
    const payload = { app: 'stats-calc-bd', version: 1, name: ($('saveName').value || '').trim() || 'Dataset', values: parsed.values };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'stats-calc-bd-dataset.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('importFile').addEventListener('change', (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || data.app !== 'stats-calc-bd' || !Array.isArray(data.values) ||
            data.values.length < 1 || data.values.length > MAX_VALUES ||
            data.values.some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
          throw new Error('bad import');
        }
        $('dataInput').value = data.values.join(', ');
        $('statusBox').textContent = t('importOk');
        calculate();
      } catch (e) {
        $('errorBox').textContent = t('importBad');
      }
      ev.target.value = '';
    };
    reader.readAsText(file);
  });
});
