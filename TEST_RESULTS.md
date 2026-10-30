# Stats Calc BD — Test Results

Run date: 2026-10-30 (16:00 slot build).

## Unit tests — 37/37 pass

`node tests/test.js` — all green, 0 repairs needed.

Hand-verified reference dataset `[2, 4, 4, 4, 5, 5, 7, 9]`:
n=8, sum=40, mean=5, median=4.5, mode=4, min=2, max=9, range=7,
population variance=4, sample variance=32/7≈4.5714, population std=2,
sample std≈2.138, Q1=4, Q3=5.5, IQR=1.5, outliers=[9], histogram bins sum to 8.

Edge cases covered: single value (sample variance/std null, quartiles = value),
all-unique (no mode), bimodal [1,2], Bengali-digit parsing (১২, ১৫ → 12, 15),
negatives/decimals, empty input, invalid-token listing, 5000-value cap
(5000 accepted, 5001 rejected), fmtNum rounding, digit conversion both ways.

## Headless-Chrome smoke — 18/18 pass

`node tests/smoke.js` (raw CDP, /opt/meta-chromium/chrome, file:// page):
title/heading, classic-dataset UI flow (mean 5, median 4.5, sample std 2.138),
results visibility, histogram rects, box-plot rect, outlier 9, frequency table,
invalid-input error naming "abc", sample-marks button, বাংলা toggle (heading +
Bengali digits + localStorage persistence), save-dataset row, 390 px
no-horizontal-overflow, zero console/page errors. 0 repairs needed.

## Notes

- No network requests by design (no CDN, no fonts, no analytics).
- No fabricated data shipped: the app starts empty; the three sample datasets
  are labelled samples in the UI and README.
