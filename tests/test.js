// Stats Calc BD — Node unit tests for logic.js. Run: node tests/test.js
'use strict';
const assert = require('assert');
const { parseDataset, computeStats, fmtNum, toBnDigits, toAsciiDigits } = require('../logic.js');

let passed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('ok - ' + name); }
  else { console.log('FAIL - ' + name + (extra ? ' :: ' + extra : '')); process.exitCode = 1; }
}
function close(a, b, eps) { return Math.abs(a - b) <= (eps || 1e-9); }

// Classic textbook dataset [2,4,4,4,5,5,7,9]
const s = computeStats([2, 4, 4, 4, 5, 5, 7, 9]);
check('classic n', s.n === 8, s.n);
check('classic sum', s.sum === 40, s.sum);
check('classic mean', s.mean === 5, s.mean);
check('classic median', s.median === 4.5, s.median);
check('classic mode', JSON.stringify(s.modes) === '[4]', JSON.stringify(s.modes));
check('classic min/max/range', s.min === 2 && s.max === 9 && s.range === 7);
check('classic varPop', s.varPop === 4, s.varPop);
check('classic varSample', close(s.varSample, 32 / 7, 1e-9), s.varSample);
check('classic stdPop', s.stdPop === 2, s.stdPop);
check('classic stdSample', close(s.stdSample, Math.sqrt(32 / 7), 1e-9), s.stdSample);
check('classic Q1 (type-7)', s.q1 === 4, s.q1);
check('classic Q3 (type-7)', s.q3 === 5.5, s.q3);
check('classic IQR', s.iqr === 1.5, s.iqr);
check('classic outlier [9]', JSON.stringify(s.outliers) === '[9]', JSON.stringify(s.outliers));
check('classic sorted', JSON.stringify(s.sorted) === '[2,4,4,4,5,5,7,9]');
check('classic freq of 4 is 3', s.freq.find((f) => f.value === 4).count === 3);
check('classic histogram counts sum to n', s.bins.reduce((a, b) => a + b.count, 0) === 8);

// Single value: sample variance undefined, quartiles equal the value
const one = computeStats([42]);
check('single n', one.n === 1);
check('single varSample null', one.varSample === null);
check('single stdSample null', one.stdSample === null);
check('single q1=q3=median=42', one.q1 === 42 && one.q3 === 42 && one.median === 42);
check('single no outliers', one.outliers.length === 0);
check('single no mode', one.hasMode === false);

// No mode / multimodal
check('all-unique has no mode', computeStats([1, 2, 3]).hasMode === false);
check('bimodal [1,2]', JSON.stringify(computeStats([1, 1, 2, 2, 3]).modes) === '[1,2]');

// Parsing
check('parse commas/spaces/newlines', JSON.stringify(parseDataset('1, 2\n3 4;5').values) === '[1,2,3,4,5]');
check('parse Bengali digits', JSON.stringify(parseDataset('১২, ১৫').values) === '[12,15]');
check('parse negatives+decimals', JSON.stringify(parseDataset('-2.5, 3.25').values) === '[-2.5,3.25]');
check('parse empty -> empty error', parseDataset('   ').error === 'empty');
const bad = parseDataset('12, abc, 5');
check('parse invalid flagged', bad.error === 'invalid' && bad.invalid.includes('abc'), JSON.stringify(bad));
check('parse too-many', parseDataset(Array(5001).fill('1').join(',')).error === 'too-many');
check('parse exactly 5000 ok', parseDataset(Array(5000).fill('1').join(',')).values.length === 5000);

// Formatting helpers
check('fmtNum integer', fmtNum(5) === '5');
check('fmtNum 4dp trim', fmtNum(2.50001) === '2.5', fmtNum(2.50001));
check('fmtNum null -> dash', fmtNum(null) === '—');
check('toBnDigits', toBnDigits('2026') === '২০২৬', toBnDigits('2026'));
check('toAsciiDigits', toAsciiDigits('১২৩') === '123');

console.log('passed: ' + passed);
