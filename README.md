# SUPERBOWL1 (v0.2.0)

Retro football with a decision-driven franchise mode (in development). Current build: featured-duo loading screen, main menu, **Quick Game** (4 x 2:00 quarters, defense simulated like Retro Bowl, 1P vs CPU or 2P pass & play), drive practice, and synthesized sound.

## Run it

- **Windows:** double-click `start.bat` (uses Python's built-in server if installed, otherwise opens `index.html`).
- **Any desktop:** double-click `index.html`. No install or server needed.
- **Phone on the same Wi-Fi:** in this folder run `python -m http.server 8000`, then open `http://<your-PC-IP>:8000` on the phone. Landscape is best.

## Controls

| Action | Touch | Keyboard / mouse | Gamepad |
| --- | --- | --- | --- |
| Pick a play | Tap a card | Click, keys 1-4, or arrows + Enter | D-pad + A |
| Snap | Tap | Space or click | A |
| Throw | Drag to aim, release (or tap a receiver) | Click-drag-release, or 1-4 quick throw | Right stick aim + RT |
| Move QB | (aim only) | WASD / arrows | Left stick |
| Run with the ball | Runs forward on his own (Retro Bowl style) | WASD / arrows to steer | Left stick |
| Juke / sidestep | Swipe up or down | Q / E | X / B |
| Stutter step | Swipe back | Steer back | |
| Dive | Swipe forward | Shift | Y |
| Field goal / punt | Tap button | F / U | |
| Pause | Top-right button | Esc or P | Start |
| Sound on/off | Speaker button | M | |

## Game modes

- **Quick Game, 1P vs CPU:** you are the Tigers. Coin toss, four 2:00 quarters, halftime, sudden-death overtime. You play every offensive snap; the Gulls' drives are simulated play by play on a ticker (tap to skip).
- **Quick Game, 2P pass & play:** same rules, two people on one device. Each player runs their own team's offense; a handover screen appears at every change of possession.
- **Drive practice:** one drive from your 25, no clock.

Clock rules: the clock runs during live plays and runs off 6 seconds after an in-bounds tackle; incompletions and out-of-bounds stop it. Tunable in `SB.quickGame` in `js/config.js`.

## Sound

All audio is synthesized in the browser (no audio files): whistles, hike, throw, catch, tackles, crowd swells, touchdown fanfare, quarter horn, and an original chiptune title theme. Toggle with **M** or the speaker button; the setting is remembered.

## What was in M0

- Madden-style idle loading scene: #9 QB and #1 WR breathe, fidget, glance at each other, and celebrate at 100%.
- One drive from your own 25: 4 plays (Slants, Go Deep, Curl Flat, HB Dive), downs and distance, sacks, interceptions, broken tackles, jukes, field-goal timing meter, punt, touchdown, drive summary.
- Pixel-perfect integer scaling on any screen; touch, mouse, keyboard and gamepad.

## Differences from the spec (deliberate for M0)

- **No Phaser / Vite / TypeScript yet.** The build environment couldn't install packages, so M0 is dependency-free canvas JavaScript. The structure (scenes, data-driven config, input abstraction) maps directly onto the planned stack.
- **8-on-8**, not 11-on-11, so the field reads clearly at prototype scale.
- Player-controlled defense, audio, PWA install and saves are M3 items.

## Where to change things

- `js/config.js`: featured duo (names, numbers, skin tones, uniform colors), teams, tips, playbook routes, speed tuning.
- **Before any public release**, swap the featured duo in `js/config.js` to invented names (see spec Section 2).

## Tests

One-time: `npm install` then `npx playwright install chromium`. Then `npm test` (smoke + full 1P quick game), `npm run test:quick2p` (2P game), or `npm run test:balance` (pass outcome mix).

## Versions and backups

Every change is committed to git and each version is tagged (`git tag` lists them). To go back: `git checkout v0.1.0` to look at an old version, or `git revert <commit>` to undo one change. The `backups/` folder also holds a plain zip of every version (e.g. `SUPERBOWL1_v0.1.0.zip`) you can unzip and open without git. The folder is in OneDrive, so it is backed up off this PC.

## Continuing development

`CLAUDE.md` holds the project context, decisions and conventions for any future session; `docs/DESIGN_SPEC.md` is the full spec; `docs/PROGRESS.md` is the log.

## Play online

https://rmbrumback-lab.github.io/superbowl1/ (works in Safari on iPhone: open the link, then Share > Add to Home Screen for full screen).

## License

All rights reserved. Viewing and personal play only; see `LICENSE`. Not affiliated with the NFL, NFLPA or any team.

## Files

```
index.html        entry point
LICENSE           all rights reserved
.gitignore        excludes node_modules/, backups/, test output
css/style.css     layout, pixel scaling, rotate hint
js/font.js        5x7 bitmap font
js/config.js      all game data
js/engine.js      canvas, scaling, input, loop
js/audio.js       synthesized SFX, music, crowd
js/menu.js        main menu
js/sprites.js     procedural pixel-art players and ball
js/loading.js     featured-duo loading scene
js/field.js       on-field gameplay, quick-game clock/possessions/sim drives
js/main.js        boot
```
