// Pass-balance probe: throws ~36 quick passes from a fixed spot and prints the outcome mix.
// Target feel (estimate): roughly 50-65% complete, few interceptions.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(url);
await page.waitForTimeout(4600);
await page.keyboard.press('Enter');           // loading -> menu
await page.waitForTimeout(400);
await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');           // menu -> DRIVE PRACTICE
await page.waitForTimeout(400);

const tally = {};
for (let i = 0; i < 36; i++) {
  await page.evaluate(() => { const S = SB._debugState(); S.phase = 'select'; S.down = 1; S.los = 35; S.firstDownX = 45; });
  await page.keyboard.press('Digit' + (1 + (i % 3))); await page.waitForTimeout(300);
  await page.keyboard.press('Space'); await page.waitForTimeout(900 + (i % 4) * 350);
  await page.keyboard.press('Digit' + (1 + (i % 4)));
  let r = null;
  for (let k = 0; k < 40 && !r; k++) {
    await page.waitForTimeout(150);
    r = await page.evaluate(() => { const S = SB._debugState(); return S.phase === 'dead' || S.phase === 'end' ? (S.msg && S.msg.text) : null; });
  }
  const key = r ? r.replace(/\d+/g, 'N') : 'NO RESULT';
  tally[key] = (tally[key] || 0) + 1;
  await page.waitForTimeout(300);
}
await browser.close();
console.log(JSON.stringify(tally, null, 2));
if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exit(1); }
