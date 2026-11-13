// Smoke test: boot the game, play several downs, fail on any page error.
// Usage: npm install && npx playwright install chromium && npm test
// Optional: CHROME_PATH=/path/to/chrome to use an installed browser instead.
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(url);
await page.waitForTimeout(4600);
await page.keyboard.press('Enter');           // loading -> menu
await page.waitForTimeout(400);
await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');           // menu -> DRIVE PRACTICE
await page.waitForTimeout(400);
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('Digit' + (1 + (i % 4))); await page.waitForTimeout(300);
  await page.keyboard.press('Space'); await page.waitForTimeout(1100);
  await page.keyboard.press('Digit1'); await page.waitForTimeout(2500);
  await page.keyboard.press('Enter'); await page.waitForTimeout(300);
}
const phase = await page.evaluate(() => SB._debugState().phase);
await browser.close();

if (errors.length) { console.error('FAIL: page errors\n' + errors.join('\n')); process.exit(1); }
console.log('PASS: no page errors; final phase =', phase);
