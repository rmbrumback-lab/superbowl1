// Touch run-control test: HB Dive, then swipe up (juke), back (stutter), forward (dive).
import { chromium, devices } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } });
const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(e.message));
const cdp = await ctx.newCDPSession(page);
await page.goto(url); await page.waitForTimeout(4700);
const box = await page.locator('#game').boundingBox();
const g = (x, y) => ({ x: box.x + (x / 384) * box.width, y: box.y + (y / 216) * box.height });
const tap = async (x, y) => { const q = g(x, y); await page.touchscreen.tap(q.x, q.y); };
const swipe = async (x0, y0, x1, y1) => {
  const a = g(x0, y0), b = g(x1, y1);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
  for (let i = 1; i <= 4; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a.x + (b.x - a.x) * i / 4, y: a.y + (b.y - a.y) * i / 4 }] }); await page.waitForTimeout(15); }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
const st = () => page.evaluate(() => { const S = SB._debugState(); const c = S.carrier; return { ph: S.phase, role: c && c.role, juke: c ? +c.jukeT.toFixed(2) : null, stutter: c ? +c.stutterT.toFixed(2) : null, diving: c ? c.diving : null, msg: S.msg && S.msg.text, stick: S.stickActive }; });
await tap(192, 120); await page.waitForTimeout(500);                   // start -> menu
await tap(192, 127); await page.waitForTimeout(500);                   // DRIVE PRACTICE (3rd menu item)
await tap(320, 100); await page.waitForTimeout(400);                   // HB DIVE card (4th)
await tap(192, 120); await page.waitForTimeout(700);                   // snap; handoff at 0.5s
const results = {};
await swipe(200, 120, 200, 80); await page.waitForTimeout(60); results.afterUp = await st();
// Freeze defenders so stutter/dive can be checked in isolation.
await page.evaluate(() => { const S = SB._debugState(); if (S.phase !== 'live') return; for (const d of S.defense) d.stunT = 30; });
await page.waitForTimeout(500);
await swipe(220, 120, 170, 120); await page.waitForTimeout(60); results.afterBack = await st();
await page.waitForTimeout(400);
await swipe(170, 120, 230, 120); await page.waitForTimeout(60); results.afterFwd = await st();
await page.waitForTimeout(700); results.end = await st();
console.log(JSON.stringify(results, null, 1), 'errors', errors);
await browser.close();
