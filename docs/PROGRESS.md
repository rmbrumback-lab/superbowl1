# Progress log

## 2026-11-12 — v0.3.2: copyright line

- "COPYRIGHT © 2026 NOAH BRUMBACK" on the start screen and main menu (new © glyph in the pixel font; text in `SB.copyright`, js/config.js).

## 2026-11-12 — v0.3.1: iPhone full screen + sound

- Scales to fill the screen (fractional when integer scaling would waste space), respects notch safe areas, uses dynamic viewport height.
- Add to Home Screen opens full screen (web manifest, apple-touch-icon, standalone meta); menu shows the tip on iPhone Safari.
- Sound on iPhone: audio session set to playback (ignores the silent switch on iOS 17+), silent-buffer unlock inside the tap, looping silent audio element for older iOS.

## 2026-11-12 — v0.3.0: licensing-clean build, published for family testing

- QB is now Noah Brumback #9 (with permission); WR is invented (Devon Chastain #1). Home team renamed River City Tigers (same orange/black). Backup roster names replaced with invented ones.
- Published to GitHub Pages: https://rmbrumback-lab.github.io/superbowl1/

## 2026-11-12 — v0.2.1: iPhone audio fix

- Audio also unlocks on touch release (iOS Safari requirement). Published a private test page for iPhone play-testing.

## 2026-11-12 — v0.2.0: Quick Game + sound

- Main menu: Quick Game 1P vs CPU, Quick Game 2P pass & play, Drive practice, Sound toggle.
- Quick Game: coin toss, 4 x 2:00 quarters, clock runoff on in-bounds tackles, halftime (other team receives), sudden-death OT, final screen with team stats.
- Defense simulated (Retro Bowl style): CPU drives play out on a ticker (tap to skip); scores, punts, FGs, turnovers, safeties set the next spot.
- Synthesized audio: SFX for every play event, crowd bed and swells, quarter horn, original chiptune title theme; M key / speaker button, remembered.
- Tests: full 1P and 2P games reach the final screen with no errors; pass probe 24/36 complete, 0 INT.
- Backup rule adopted: every change committed, versions tagged.

## 2026-11-12 — M0 prototype complete (v0.1.0-m0)

- Design spec written; decisions resolved (fictional league, combined role, no online in v1, personal project).
- Featured-duo loading scene: breathing, fidgets, glances, 100% celebration, rotating tips, stadium backdrop.
- One playable drive: 4 plays, downs/distance, sacks, INTs, broken tackles, jukes, FG timing meter, punt, TD, drive summary, pause.
- Input: touch (drag-to-aim, tap receiver, virtual stick, swipe juke), mouse, keyboard, gamepad.
- Balance pass: 36-throw test → 19 complete, 0 INT, 11 broken up (estimate of feel, not final).
- Headless tests pass on desktop 1152x648, phone landscape 844x390, phone portrait 390x844.

**Known gaps:** 8-on-8 (not 11), no player-controlled defense, no audio, no saves, no PWA, portrait shows rotate prompt.

## Next

- M1 vertical slice (see CLAUDE.md).
