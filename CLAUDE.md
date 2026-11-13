# SUPERBOWL1 — project notes for development sessions

Retro (Tecmo / Retro Bowl style) browser football game with a decision-driven franchise mode. Personal project of Ryan Brumback. Full design: `docs/DESIGN_SPEC.md`. Progress log: `docs/PROGRESS.md`.

## Backups (Ryan's standing rule)

**After every change, back it up:** commit to git with a clear message, and tag each user-visible version (`v0.2.0`, `v0.3.0`, ...). Never rewrite history (no force-push, no `reset --hard` on shared commits) so any prior version can be restored. Also export a visible zip of each tagged version: `git archive --format=zip --prefix=SUPERBOWL1_vX.Y.Z/ -o backups/SUPERBOWL1_vX.Y.Z.zip vX.Y.Z` (`backups/` is git-ignored). Bump `SB.version` in `js/main.js`, `package.json` version, and add a line to `docs/PROGRESS.md` with each version.

## Run

- Double-click `start.bat` (Windows) or `index.html`. No build step, no dependencies.
- Phone on same Wi-Fi: `start.bat` serves on port 8000 when Python is installed; open `http://<PC-IP>:8000`.

## Test

- `npm install` then `npx playwright install chromium` (one time), then `npm test`.
- `tests/smoke.mjs`: boots to drive practice, plays several downs, fails on any page error.
- `tests/quickgame.mjs [--2p]`: plays a full quick game with 25 s quarters; must reach the final screen with no errors.
- `tests/pass-balance.mjs`: throws ~36 passes and prints the outcome mix (target: roughly 50-65% complete, few INTs).
- `SB._debugState()` (in `js/field.js`) exposes field-scene state to tests.

## Architecture (M0)

- Dependency-free canvas JS, **classic scripts** (no ES modules) so `file://` works. Load order is in `index.html`.
- Global namespace `window.SB`. Base resolution 384x216, integer CSS scaling, `image-rendering: pixelated`.
- `js/engine.js`: scaling, unified input (pointer/keyboard/gamepad → `SB.input`), loop, `SB.setScene`.
- `js/config.js`: ALL content/data (featured duo, teams, tips, playbook routes, tuning). Prefer adding data here over code.
- `js/font.js`: 5x7 bitmap font (`SB.font.drawText`) + 3x5 jersey digits.
- `js/sprites.js`: procedural pixel sprites (no image files).
- `js/audio.js`: WebAudio synth (`SB.audio.play(name)`, `music('title'|null)`, `crowd(level)`, `swell`, `toggleMute`). Unlocked on first input.
- `js/loading.js` (featured duo) → `js/menu.js` (mode select) → `js/field.js`.
- `js/field.js` phases: select → presnap → live → dead, plus fg, pause, end (drive practice), and quick-game phases banner / sim / final. Quick-game state is `S.g` (score, quarter, clock, possession, stats). Each possession is drawn from the offense's perspective (always drives +x; `S.offTeam` / `S.defTeam`). CPU possessions run `simulateDrive()` and show a ticker.
- Field coords are yards: x 0-120 (endzones 0-10 / 110-120, offense drives +x), y 0-53.33.

## Decisions (do not revisit without asking Ryan)

- Fictional 32-team league; home team "River City Tigers" (orange/black), opponent "Harbor City Gulls", no real team names or logos.
- One combined coach + GM role. Online leagues out of scope for v1.
- Loading-screen duo: QB **Noah Brumback #9** (Ryan's son, used with permission) and WR **Devon Chastain #1** (invented). Never use real NFL player names/likenesses, NFL team names, logos or wordmarks (all other roster names are invented too).
- Public build: GitHub Pages at https://rmbrumback-lab.github.io/superbowl1/ (repo rmbrumback-lab/superbowl1). Publish = push a snapshot of the current version; local git history stays local (older versions contain real player names).
- Avoid the phrase "vibe coding" in any docs; use "AI-augmented development".

## Conventions

- Keep the game runnable by double-clicking `index.html` until the planned move to TypeScript + Vite + Phaser (spec §7).
- Every content change goes through `js/config.js`. Label tuning numbers as estimates.
- Run `npm test` before committing. Commit with clear messages.

## Next up: M1 vertical slice (franchise season)

17-week season, weekly hub (Inbox → Practice → Game Plan → Game → Press → Recap), 20 decision cards as data, five reputation meters with transparent recap, save/load (localStorage + JSON export). See spec §3-§5.
