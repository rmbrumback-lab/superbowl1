// Full quick-game test with short quarters (25 s). Usage: node tests/quickgame.mjs [--2p]
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'index.html')).href;
const shotDir = process.env.SHOTS || null;
const players = process.argv.includes('--2p') ? 2 : +(process.env.PLAYERS || 1);
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url);
await page.evaluate(() => { SB.quickGame.quarterSeconds = +(new URLSearchParams(location.search).get('q') || 25); });
await page.waitForTimeout(4600);
await page.keyboard.press('Enter'); await page.waitForTimeout(400);      // -> menu
if (shotDir) await page.screenshot({ path: shotDir + '/q_menu.png' });
if (players === 2) { await page.keyboard.press('ArrowDown'); await page.waitForTimeout(100); }
await page.keyboard.press('Enter'); await page.waitForTimeout(500);      // start quick game
const st = () => page.evaluate(() => { const S = SB._debugState(); return { ph: S.phase, q: S.g.q, clock: Math.round(S.g.clock), score: S.g.score, poss: S.g.poss, banner: S.banner && S.banner.title }; });
let last = '', shots = {};
for (let i = 0; i < 500; i++) {
  const s = await st();
  const key = s.ph + (s.banner || '');
  if (shotDir && !shots[key]) { shots[key] = 1; await page.screenshot({ path: `${shotDir}/q_${key.replace(/\W/g,'_')}.png` }); }
  const line = `${s.ph} Q${s.q} ${s.clock}s ${s.score.home}-${s.score.away} ${s.poss} ${s.banner || ''}`;
  if (line !== last && (s.ph === 'banner' || s.ph === 'final' || s.ph === 'sim')) console.log(line);
  last = line;
  if (s.ph === 'final') break;
  if (s.ph === 'banner') { await page.waitForTimeout(500); await page.keyboard.press('Enter'); }
  else if (s.ph === 'sim') { await page.waitForTimeout(700); await page.keyboard.press('Enter'); }
  else if (s.ph === 'select') { await page.keyboard.press('Digit' + (1 + (i % 4))); await page.waitForTimeout(250); }
  else if (s.ph === 'presnap') { await page.keyboard.press('Space'); await page.waitForTimeout(1100); }
  else if (s.ph === 'live') { await page.keyboard.press('Digit' + (1 + (i % 3))); await page.waitForTimeout(600); }
  else if (s.ph === 'fg') { await page.waitForTimeout(400 + (i % 5) * 100); await page.keyboard.press('Space'); await page.waitForTimeout(2200); }
  else { await page.waitForTimeout(400); await page.keyboard.press('Enter'); }
}
const fin = await st();
console.log('FINAL', JSON.stringify(fin), 'errors:', errors);
await browser.close();
if (errors.length || fin.ph !== 'final') process.exit(1);
