# SUPERBOWL1 — Franchise Mode Game Design Spec

Nov 12, 2026 · Ryan Brumback · Live version: https://claude.ai/artifact/RuJg4ZDW2EtiF3UGtNzSo6 (this file is a local snapshot)

## 1. Overview

SUPERBOWL1 is a browser-based, retro pixel-art football game: Tecmo/Retro Bowl-style arcade play on the field, wrapped in a deep franchise mode where **you make every decision** and every decision changes how players, fans, media and ownership see you. It runs locally first and adapts to phone, tablet and desktop from one codebase.

**Design pillars**

1. **You are the franchise.** No auto-sim of the front office. Draft, contracts, staff, play-calling, press, and locker-room calls all come to you, with a one-tap "delegate" option that has its own reputation cost.
2. **Decisions have memory.** Every choice writes to a reputation ledger. Players remember broken promises; fans remember ticket hikes; the owner remembers missed goals.
3. **Arcade on the field, depth off it.** Games play in 6–10 minutes (estimate, typical). Depth lives in the menus, not in the controls.
4. **Better UX than the genre.** Fewer taps per week, clear cause-and-effect feedback, no hidden ratings math, and a layout built for both thumbs and a mouse.

**Where it improves on Retro Bowl and Tecmo**

| Area | Retro Bowl / Tecmo today | SUPERBOWL1 |
| --- | --- | --- |
| Decision scope | Mostly roster and a few morale events | Every franchise lever is a player decision with visible consequences |
| Reputation | Single "coach credit" / morale bars | Five audience meters plus a ledger of past promises |
| Feedback | Outcomes appear without explanation | Every result shows "why" (which decision moved which meter) |
| Defense | Retro Bowl skips player-controlled defense | Optional player-controlled defense, or sim it per drive |
| Devices | Built mobile-first; desktop secondary | Responsive layout with touch, keyboard and gamepad as equals |
| Loading | Static splash | Madden-style idle loading scene with two featured players (Section 2) |

**Target platforms:** modern mobile Safari and Chrome, desktop Chrome, Edge, Firefox and Safari. Installable as a PWA for offline play.

## 2. Default loading screen: the featured duo

A Madden-style idle scene: a retro pixel-art QB (#9, Noah Brumback) and WR (#1, Devon Chastain, invented) in River City Tigers orange-and-black stand side by side on a night-lit field while the game loads. They just stand there and breathe, the way Madden's cover athletes idle during load.

**Scene composition**

- **Background:** stadium at night — sky with flickering light towers, crowd band with 2-frame shimmer, field with yard lines. Slow pan.
- **Featured duo, center:** QB on the left holding the ball at his hip; WR on the right, helmet tucked under one arm. Integer scaling with nearest-neighbor filtering.
- **Name plates:** 8-bit plates under each player: number, position, name.
- **Bottom bar:** segmented progress bar, rotating tips tied to the reputation system, and "TAP / PRESS START" once loading finishes.
- **Top-left:** game logo; **top-right:** save slot and season.

**Idle animation set**

| Animation | QB (#9) | WR (#1) | Trigger |
| --- | --- | --- | --- |
| Breathe | Chest rise | Chest rise | Loop, offset so they don't sync |
| Fidget | Spins ball in hand | Adjusts glove | Random, every 4–8 s |
| Look | Glances at WR | Nods back | Random, every 10–15 s |
| Celebrate | Points downfield | Griddy-style shuffle | When loading hits 100% |

**Behavior rules**

- Shows on cold start and when loading a save; minimum display time so the scene registers; never blocks once assets are ready.
- Audio (M3): crowd murmur plus a chiptune loop, muted on mobile until first tap.
- Data-driven: the duo lives in `js/config.js` (`SB.featuredDuo`). Later it can auto-swap to your franchise's two highest-reputation players.

**Licensing note.** Real players' names, numbers and likenesses are licensed rights; players assign group licensing rights to the NFLPA, which licenses [name, number, likeness, signature and voice](https://nflpa.com/licensing) for products including video games. Team logos and uniforms are a separate NFL grant. Not legal advice. Practical guidance:

- **Current build (public):** no real NFL player names or likenesses and no NFL team names or logos. QB is Noah Brumback (family, with permission); every other name is invented.

## 3. Core loop and on-field gameplay

One in-game week takes 10–15 minutes (estimate, typical).

**Weekly loop**

1. **Inbox (Monday):** 2–4 decision cards (holdout threat, player wants targets, owner email, media question). Each card previews the meters it can move.
2. **Practice focus (Wednesday):** install plays, conditioning, rookie reps, or rest.
3. **Game plan (Friday):** pick 8 offensive and 6 defensive plays. Optional; a default plan exists.
4. **Game day:** play it, or sim by quarter, drive, or full game. Skipping big games has a small Owner/Fan effect.
5. **Postgame press:** credit the team, take the blame, or deflect. Moves Media and Locker Room.
6. **Week recap:** one screen showing every meter change and the decision that caused it.

**Season:** preseason (camp, cuts to 53) → 17-game regular season → playoffs → offseason (re-signings, free agency, 7-round draft, staff hiring). 20+ seasons per franchise.

**On-field play**

- Side-scrolling field like Retro Bowl, Tecmo-style sprites, 4 downs, accelerated clock (each quarter 2–3 real minutes, estimate).
- **Offense:** pick a play, drag-to-aim passes with trajectory preview, or hand off and steer.
- **Defense (new vs. Retro Bowl):** choose a call, control one defender; full-sim option.
- **Special teams:** timing-meter kicks and punts.
- **Difficulty:** Rookie, Pro, All-Pro, Legend — AI reaction and pass windows only, never hidden stat boosts.

**Controls**

| Action | Touch | Keyboard | Gamepad |
| --- | --- | --- | --- |
| Select play | Tap card | Arrows + Enter / 1-4 | D-pad + A |
| Snap | Tap field | Space | A |
| Pass | Drag to aim, release | Click-drag-release / 1-4 | Right stick + RT |
| Run / steer | Virtual stick | WASD | Left stick |
| Juke | Swipe up/down | Q / E | X / B |
| Pause | Top-right button | Esc | Start |

## 4. Franchise mode

You hold the head coach and GM jobs at once, answering to an AI owner. Nothing in the front office runs on autopilot unless you delegate it.

**Starting a franchise**

1. Pick a team from a 32-team fictional league.
2. Pick a background (starting meters + one perk):
    - **Former QB:** Locker Room +10, QB development +15%, Owner −5.
    - **Analytics Guru:** Owner +10, 4th-down AI insight, Locker Room −5.
    - **Players' Coach:** Locker Room +15, slower morale decay, Media −5.
    - **Disciplinarian:** Owner +5, fewer off-field incidents, Locker Room −10.
3. The owner sets a 3-season mandate — the job-security clock.

**Decision domains**

| Domain | Example decisions | Meters most affected |
| --- | --- | --- |
| Roster | Start the rookie or the veteran; cut a fan favorite; trade for a star | Locker Room, Fans |
| Contracts | Extend early; franchise tag; hold firm on a holdout | Player trust, Owner (cap) |
| Draft | BPA vs. need; trade up for a QB; character flags | Owner, Fans, Media |
| Staff | Hire/fire coordinators; promote from within | Locker Room, Owner |
| Game identity | Aggressive 4th downs; run-heavy vs. air raid | Fans, Owner, Locker Room |
| Discipline | Suspend a star, or keep it quiet | Locker Room, Media, Owner |
| Business | Ticket prices; facility vs. scoreboard; community events | Fans, Owner |
| Media | Press answers; trash-talk a rival; back a struggling player | Media, Locker Room, Rivals |

**Promises** go in a visible ledger with deadlines. Kept: bonus. Broken: hits that player's trust, spreads to teammates at 25%, can leak to the media.

**Delegation** hands a domain to a staffer whose skill and personality make the call. You lose the upside and keep the downside.

**Player model:** ratings plus three personality traits — **Ego**, **Loyalty**, **Leadership**.

## 5. Reputation system

Five audience meters (0–100) plus a per-player trust score.

| Meter | Who | High (70+) unlocks | Low (<30) triggers |
| --- | --- | --- | --- |
| Owner Trust | Your boss | Budget, facility upgrades, your extension | Hot seat, budget cuts, firing below 15 |
| Locker Room | Players | Morale boost, hometown discounts | Holdouts, trade requests, effort penalties |
| Fan Approval | Fans, city | Home noise bonus, revenue | Empty seats, boos |
| Media | Press | Good headlines, softer questions | Leaks, hostile press |
| League Respect | GMs, agents, FAs | Better trades, FA interest | Agent premiums, refused trades |

**Decision impact model**

```
ΔM = base × personality × context × credibility
```

- **Personality:** high-Ego reacts 1.5× to benching; high-Loyalty 0.5×.
- **Context:** winning softens negatives.
- **Credibility:** your promise record; broken promises shrink future positives.

**Memory:** ordinary events fade ~50% per season; **landmark events never fade** and resurface in dialogue.

**Emergent titles:** Players' Coach, Ruthless Executive, Fan Favorite, Media Darling, Win-Now Gambler, Builder — earned, never chosen.

**Consequences:** job reviews vs. mandate; FA prices ±20% (tunable); small visible on-field modifiers (±3 awareness, crowd noise); legacy and Hall of Fame case from the ledger.

**Transparency rule:** cards preview likely meter moves; the recap shows actual numbers and why. No hidden math.

## 6. UX/UI, art and audio

- **Hub, not menus:** one Franchise Hub (Inbox, Roster, Game Plan, Front Office, Reputation).
- **3-tap rule**, **consequence preview**, **undo window** until the week advances.
- **Readability:** ≥16 px body text on phones; colorblind-safe meters (shape + color); full keyboard/gamepad focus.
- **Interruptible:** auto-save after every decision and drive.

| Device | Layout | Field |
| --- | --- | --- |
| Phone portrait | Single column, bottom nav | Rotate prompt (M0); vertical field later |
| Phone landscape | Two columns | Horizontal field |
| Tablet | Hub + detail | Horizontal, larger sprites |
| Desktop | Hub, detail, reputation sidebar | Horizontal, 16:9 |

**Art:** SNES-era pixel art, integer scaling only, 4-color team palettes, pixel fonts, 1-second big-play cut-ins. **Audio:** chiptune score, crowd bed tied to Fan Approval, synthesized 8-bit announcer blips.

## 7. Technical architecture

**Planned stack:** TypeScript + Vite; Phaser 3 for field/loading; Preact DOM overlay for menus; sim core in a Web Worker; IndexedDB + JSON export saves; service worker for offline/PWA; Vitest + Playwright tests.

**Current (M0):** dependency-free canvas JavaScript, classic scripts so `index.html` runs by double-click. Same separation (scenes / config data / input abstraction) so it ports cleanly.

**Key rules:** deterministic seeded sim; data-driven content; one input action set for touch, keyboard and gamepad.

**Decision card format (example)**

```json
{
  "id": "holdout_star_wr",
  "trigger": { "phase": "preseason", "player": { "ego": ">=70", "contractYearsLeft": 1 } },
  "title": "{player} skips camp, wants a new deal",
  "options": [
    { "label": "Pay him now", "effects": { "owner": -6, "lockerRoom": 4, "playerTrust": 15 } },
    { "label": "Promise a deal after the season", "promise": { "deadline": "offseason" }, "effects": { "playerTrust": 5 } },
    { "label": "Hold firm, fine him", "effects": { "owner": 4, "lockerRoom": -5, "media": -3, "playerTrust": -20 } }
  ]
}
```

**Performance targets (estimates):** 60 fps on a ~2021 mid-range phone; first load <5 MB; full season sim <2 s.

## 8. Milestones, risks and decisions

| Milestone | Scope | Gate |
| --- | --- | --- |
| **M0 · Prototype** (done) | Featured-duo loading scene; one drive on phone and desktop | A drive feels fun on touch and keyboard |
| **M1 · Vertical slice** (next) | 17-week season, weekly loop, 20 decision cards, five meters, week recap | Every meter change is explained in the recap |
| M2 · Franchise depth | Offseason, draft, FA, contracts, promises ledger, staff | A 5-season run holds up with no dead weeks |
| M3 · Devices and polish | Player-controlled defense, gamepad polish, PWA, audio, accessibility | Passes phone/tablet/desktop test matrix |
| M4 · Content and balance | 150+ cards, titles, legacy/HoF, 20-season balance | — |

**Risks**

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Real player likeness in a shared build | Takedown or legal claim | Duo in config; generic default for public builds |
| Reputation feels random | Players stop caring | Transparency rule; recap; unit tests on the math |
| Content scope creep | Late, thin balance | Data-driven cards; M1 capped at 20 |
| Touch defense feels bad | Phone players skip defense | Sim toggle; prototype early |
| iOS PWA storage eviction | Lost saves | JSON export + backup reminder |

**Decisions (resolved Nov 12, 2026)**

- **League:** fully fictional 32-team league.
- **Role:** one combined coach + GM role only.
- **Online leagues / save sharing:** out of scope for v1.
- **Release:** shared publicly for family play-testing via GitHub Pages (Nov 12, 2026). Duo is Noah Brumback (#9) and invented WR Devon Chastain (#1); team renamed River City Tigers.

**Sources**

- [NFLPA: Licensing program](https://nflpa.com/licensing)
- [NFLPA: What is the Group Licensing Assignment (GLA)?](https://nflpa.com/active-players/faq/what-is-the-gla)
