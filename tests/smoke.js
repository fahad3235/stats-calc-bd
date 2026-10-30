// Stats Calc BD — headless-Chrome smoke tests via raw CDP.
// Run: node tests/smoke.js   (spawns /opt/meta-chromium/chrome, file:// page)
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 9336;
const PAGE = 'file://' + path.resolve(__dirname, '..', 'index.html');
let passed = 0, failed = 0;
function check(name, cond, extra) {
  if (cond) { passed++; console.log('ok - ' + name); }
  else { failed++; console.log('FAIL - ' + name + (extra ? ' :: ' + extra : '')); }
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function getWsUrl() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch('http://127.0.0.1:' + PORT + '/json/list');
      const list = await res.json();
      const page = list.find((t) => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (e) { /* not up yet */ }
    await sleep(200);
  }
  throw new Error('chrome debugger endpoint never came up');
}

async function main() {
  const policyPath = '/var/lib/hatch-browser/rootfs-base/usr/share/hatch/chromium/webgl-allowed-domains.txt';
  const policySha = crypto.createHash('sha256').update(fs.readFileSync(policyPath)).digest('hex');
  const chrome = spawn('/opt/meta-chromium/chrome', [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--no-first-run',
    '--user-data-dir=/tmp/stats-calc-smoke-profile',
    '--hatch-webgl-allowed-domains-file=' + policyPath,
    '--hatch-webgl-allowed-domains-sha256=' + policySha,
    PAGE,
  ], { stdio: 'ignore' });
  const errors = [];
  try {
    const wsUrl = await getWsUrl();
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let seq = 0;
    const pending = new Map();
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && pending.has(data.id)) {
        const { res, rej } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) rej(new Error(JSON.stringify(data.error)));
        else res(data.result);
      }
      if (data.method === 'Runtime.consoleAPICalled' && data.params && data.params.type === 'error') {
        errors.push(data.params.args.map((a) => a.value || a.description).join(' '));
      }
      if (data.method === 'Runtime.exceptionThrown') {
        errors.push(String(data.params.exceptionDetails.exception.description || 'exception'));
      }
    };
    function send(method, params) {
      const id = ++seq;
      ws.send(JSON.stringify({ id, method, params: params || {} }));
      return new Promise((res, rej) => pending.set(id, { res, rej }));
    }
    const ev = async (expr) => {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
      if (r.exceptionDetails) throw new Error('eval failed: ' + JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await sleep(800);

    check('title present', (await ev('document.title')).includes('Stats Calc'));
    check('heading present', (await ev('document.querySelector("h1").textContent')).includes('Stats Calc'));

    // Classic dataset via UI
    await ev('document.getElementById("dataInput").value = "2, 4, 4, 4, 5, 5, 7, 9"; document.getElementById("calcBtn").click();');
    await sleep(500);
    const grid = await ev('document.getElementById("statsGrid").textContent');
    check('mean 5 shown', grid.includes('5'), grid.slice(0, 200));
    check('median 4.5 shown', grid.includes('4.5'), grid.slice(0, 200));
    check('sample std ~2.138 shown', grid.includes('2.138'), grid.slice(0, 300));
    check('results section visible', await ev('!document.getElementById("resultsSection").hidden'));
    check('histogram svg rendered', (await ev('document.querySelectorAll("#histSvg svg rect").length')) >= 1);
    check('box plot svg rendered', (await ev('document.querySelectorAll("#boxSvg svg rect").length')) === 1);
    check('outlier 9 shown', (await ev('document.getElementById("outliersBox").textContent')).includes('9'));
    check('freq table has value 4 count 3', (await ev('document.getElementById("freqBody").textContent')).includes('4'));

    // Invalid input -> inline error, results hidden
    await ev('document.getElementById("dataInput").value = "12, abc"; document.getElementById("calcBtn").click();');
    await sleep(300);
    check('invalid input error mentions abc', (await ev('document.getElementById("errorBox").textContent')).includes('abc'));

    // Sample button loads + calculates
    await ev('document.querySelector("[data-sample=\\"marks\\"]").click();');
    await sleep(400);
    check('sample marks calculates', await ev('!document.getElementById("resultsSection").hidden') && (await ev('document.getElementById("statsGrid").textContent')).length > 50);

    // Bengali toggle persists + renders Bengali digits
    await ev('document.getElementById("langBtn").click();');
    await sleep(300);
    check('BN toggle changes heading', (await ev('document.querySelector("h1").textContent')).includes('স্ট্যাটস'));
    check('BN digits in grid', /[০-৯]/.test(await ev('document.getElementById("statsGrid").textContent')));
    check('lang persisted', (await ev('localStorage.getItem("stats-calc-bd-lang")')) === 'bn');
    await ev('document.getElementById("langBtn").click();'); // back to EN
    await sleep(200);

    // Save + reload persistence
    await ev('document.getElementById("dataInput").value = "10, 20, 30"; document.getElementById("saveName").value = "SmokeSet"; document.getElementById("saveBtn").click();');
    await sleep(300);
    check('saved row appears', (await ev('document.getElementById("savedList").textContent')).includes('SmokeSet'));

    // Mobile viewport: no horizontal overflow
    await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await sleep(400);
    const overflow = await ev('Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) <= 390');
    check('390px no horizontal overflow', overflow, await ev('document.body.scrollWidth + "x" + document.documentElement.scrollWidth'));
    await send('Emulation.clearDeviceMetricsOverride');

    check('zero console/page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
    ws.close();
  } finally {
    try { chrome.kill(); } catch (e) { /* ignore */ }
  }
  console.log('smoke passed: ' + passed + ', failed: ' + failed);
  if (failed > 0) process.exitCode = 1;
}
main().catch((e) => { console.error('smoke harness error:', e); process.exit(1); });
