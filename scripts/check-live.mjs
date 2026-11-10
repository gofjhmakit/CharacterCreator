// Quick check that a deployed URL renders without console errors. Usage: node scripts/check-live.mjs <url>
import { chromium } from 'playwright-core';
const url = process.argv[2];
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await p.goto(url);
await p.getByRole('heading', { name: 'Characters', exact: true }).waitFor({ timeout: 15000 });
const sw = await p.evaluate(async () => { await new Promise((r) => setTimeout(r, 2000)); return !!(await navigator.serviceWorker.getRegistration()); });
console.log('rendered OK; service worker registered:', sw, errs.length ? `errors: ${errs.join(' | ')}` : 'no errors');
await b.close();
