# Stats Calc BD

Offline bilingual (English / বাংলা) descriptive statistics calculator for Bangladesh.
Paste your own numbers and get the full summary — mean, median, mode, quartiles,
variance, standard deviation, outliers, frequency table, histogram and box plot.
No server, no account, no network calls: everything runs in your browser and your
datasets stay in your browser's localStorage.

Live site: https://fahad3235.github.io/stats-calc-bd/

## Why this exists

Students (statistics, economics, business, social science) constantly need the same
summary for a dataset — class marks, survey responses, lab readings — and most online
calculators either need an account, phone home, or hide their method. This one is
transparent: the exact quartile method is stated on the page, population and sample
variance are both shown (so you can see which one your course wants), and nothing
leaves your device.

## Features

1. **Dataset input** — paste numbers separated by commas, spaces, semicolons or new
   lines. Bengali digits (০–৯) are converted automatically. Up to 5000 numbers.
2. **Summary statistics** — count, sum, mean, median, mode(s), min, max, range,
   Q1, Q3, IQR, variance and standard deviation (population *and* sample).
3. **Outlier detection** — the 1.5 × IQR rule, with fences shown implicitly by the
   listed outliers.
4. **Frequency table + sorted values** — every distinct value with its count, and
   the full sorted list.
5. **Histogram** — automatic bins (√n, capped at 20) as an inline SVG chart.
6. **Box plot** — min – Q1 – median – Q3 – max with outliers as red dots.
7. **Sample datasets** — one tap loads class test marks, cricket scores, or
   rainfall (mm). All three are clearly labelled samples, not real data.
8. **Saved datasets** — name and save a dataset in localStorage, reload or delete
   it later; export the current dataset as JSON and import a file exported by
   this app (strict validation — a bad file changes nothing).
9. **Bilingual UI** — English / বাংলা toggle, persisted, with Bengali digits in
   results when বাংলা is active. Responsive down to 390 px.

## Method (stated on the page too)

- **Quartiles:** linear interpolation on position p·(n−1) — the type-7 method used
  by Excel's `PERCENTILE.INC` and NumPy's default. Q1 = 25th percentile,
  Q3 = 75th percentile, median = 50th percentile.
- **Variance:** population variance divides by n; sample variance divides by n−1
  and is shown as "—" for a single value.
- **Mode:** every value attaining the highest frequency, but only when that
  frequency is above 1; otherwise "No mode (all values unique)".
- **Outliers:** values strictly outside [Q1 − 1.5×IQR, Q3 + 1.5×IQR].
- **Histogram bins:** k = ⌈√n⌉, capped at 20; a constant dataset gets one bin.

## Tech stack

Vanilla HTML + CSS + JavaScript. No build step, no framework, no CDN, no network
requests. `logic.js` is a pure function module (usable from Node for tests);
`app.js` wires the DOM; `i18n.js` holds the EN/বাংলা strings.

## Run locally

```bash
# just open it — no server needed
open index.html
# or serve it
python3 -m http.server 8000
```

## Testing

```bash
node tests/test.js    # 37 unit tests for logic.js
node tests/smoke.js   # 18 headless-Chrome (CDP) UI checks
```

Verified results: 37/37 unit + 18/18 smoke, 0 console/page errors. Hand-verified
reference: dataset `[2, 4, 4, 4, 5, 5, 7, 9]` gives mean 5, median 4.5, mode 4,
population variance 4, sample variance 32/7 ≈ 4.5714, sample std ≈ 2.138,
Q1 = 4, Q3 = 5.5, IQR = 1.5, outlier [9]. See `TEST_RESULTS.md`.

## Limitations

- Descriptive statistics only: no hypothesis tests, regression, or confidence
  intervals. Results describe the numbers you entered; they are not a statistical
  inference about any wider population.
- Quartile conventions differ between textbooks (some use other interpolation
  rules), so Q1/Q3 may differ slightly from a textbook that uses a different
  method — the method used here is stated explicitly so you can compare.
- Sample datasets are illustrative examples only, not real measurements.
- Import accepts only files exported by this app (`app: "stats-calc-bd"`).

## Status

MVP complete. Offline static site, deployable on any static host / GitHub Pages.
