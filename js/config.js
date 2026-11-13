/*
 * SUPERBOWL1 - game data.
 * Content lives here (not in code) so it can be changed without touching the engine.
 * Kept as a .js file rather than .json so the game runs by double-clicking index.html
 * (browsers block fetch() of local JSON files opened from disk).
 */
window.SB = window.SB || {};
(function (SB) {
  'use strict';

  /*
   * FEATURED DUO - the default loading screen.
   * QB: Noah Brumback (used with permission). WR: invented name.
   * No real NFL player names, likenesses, team names or logos anywhere in the game.
   */
  SB.featuredDuo = {
    left: {
      name: 'NOAH BRUMBACK', short: 'N. BRUMBACK', number: 9, position: 'QB',
      pose: 'qb', skin: '#e9b48e', skinShade: '#c98f6a', hair: '#8a5a2b'
    },
    right: {
      name: 'DEVON CHASTAIN', short: 'D. CHASTAIN', number: 1, position: 'WR',
      pose: 'wr', skin: '#8a5434', skinShade: '#6b3e25', hair: '#1b1210'
    },
    // Generic orange-and-black, no team logos or wordmarks.
    uniform: {
      helmet: '#f26a1b', helmetShade: '#c24f0e', stripe: '#141414',
      jersey: '#151515', jerseyShade: '#0a0a0a', number: '#f26a1b',
      trim: '#f26a1b', pants: '#f2efe8', pantsShade: '#cfc9bd',
      sock: '#151515', sockBand: '#f26a1b', cleat: '#1b1b1b',
      facemask: '#a7adb4', glove: '#151515', gloveTrim: '#f26a1b'
    }
  };

  // Fictional league teams.
  SB.teams = {
    home: {
      city: 'RIVER CITY', name: 'TIGERS', abbr: 'RCT',
      helmet: '#f26a1b', jersey: '#151515', pants: '#f2efe8', trim: '#f26a1b', endzone: '#1d1d1d',
      // Home QB/WR1 use the featured duo; these are fallbacks.
      qb: { name: 'N. BRUMBACK', number: 9, skin: '#e9b48e' }, wr1: { name: 'D. CHASTAIN', number: 1, skin: '#8a5434' }
    },
    away: {
      city: 'HARBOR CITY', name: 'GULLS', abbr: 'HCG',
      helmet: '#e8ecf2', jersey: '#1f3b73', pants: '#e8ecf2', trim: '#7fb2ff', endzone: '#1f3b73',
      qb: { name: 'R. HALVERSON', number: 12, skin: '#d9a27a' }, wr1: { name: 'D. OKAFOR', number: 11, skin: '#6b3e25' }
    }
  };

  // Loading-screen tips (tied to the reputation system).
  SB.tips = [
    'BROKEN PROMISES SPREAD. TEAMMATES FEEL 25% OF THE HIT.',
    'WINNING BUYS GOODWILL. FANS FORGIVE A 10-2 TEAM FASTER.',
    'DELEGATING SAVES TIME, BUT THE PRESS STILL BLAMES THE BOSS.',
    'LANDMARK DECISIONS NEVER FADE. CHOOSE CAREFULLY.',
    'HIGH-EGO PLAYERS REACT 1.5X TO BEING BENCHED.',
    'LEAGUE RESPECT LOWERS WHAT FREE AGENTS ASK FOR.',
    'TAP A RECEIVER TO THROW. DRAG TO AIM ANYWHERE.'
  ];

  /*
   * PLAYBOOK. Routes are lists of [downfield yards, "inside" yards] from the
   * player's alignment. Positive "inside" = toward the middle of the field.
   * end: 'stop' (settle) or 'continue' (keep running the last leg).
   */
  SB.playbook = [
    {
      id: 'slants', name: 'SLANTS', type: 'pass', key: '1',
      routes: {
        WR1: { pts: [[4, 0], [10, 6], [26, 11]], end: 'continue' },
        WR2: { pts: [[4, 0], [10, 6], [26, 11]], end: 'continue' },
        TE: { pts: [[4, 0], [7, -6], [8, -14]], end: 'continue' },
        RB: { pts: [[1, -3], [4, -10], [7, -15]], end: 'stop' }
      }
    },
    {
      id: 'deep', name: 'GO DEEP', type: 'pass', key: '2',
      routes: {
        WR1: { pts: [[45, 0]], end: 'continue' },
        WR2: { pts: [[10, 0], [32, 10]], end: 'continue' },
        TE: { pts: [[28, 1]], end: 'continue' },
        RB: { pts: [], end: 'block' }
      }
    },
    {
      id: 'curls', name: 'CURL FLAT', type: 'pass', key: '3',
      routes: {
        WR1: { pts: [[12, 0], [10, 1]], end: 'stop' },
        WR2: { pts: [[8, 0], [9, -9]], end: 'continue' },
        TE: { pts: [[3, 0], [5, 12], [6, 24]], end: 'continue' },
        RB: { pts: [[1, -3], [3, -10]], end: 'stop' }
      }
    },
    {
      id: 'dive', name: 'HB DIVE', type: 'run', key: '4',
      routes: {
        WR1: { pts: [[3, 0]], end: 'block' },
        WR2: { pts: [[3, 0]], end: 'block' },
        TE: { pts: [[1, 0]], end: 'block' },
        RB: { pts: [], end: 'carry' }
      }
    }
  ];

  // Tuning (yards per second unless noted). Estimates, tuned by play-testing.
  SB.tuning = {
    speed: { QB: 7.4, RB: 8.9, WR: 9.3, TE: 8.1, OL: 5.4, DL: 6.6, LB: 7.8, CB: 8.5, S: 8.4 },
    passSpeed: 24,          // yd/s
    tackleRadius: 0.95,     // yd
    catchRadius: 1.7,       // yd
    blockHoldMin: 2.4,      // s a lineman holds a block before shedding
    blockHoldMax: 3.6,
    loadingMinSeconds: 3.4  // minimum loading-scene time so the duo registers
  };

  // Quick game rules.
  SB.quickGame = {
    quarterSeconds: 120,     // 2:00 quarters
    runoffSeconds: 6,        // clock runoff after an in-bounds tackle
    cpuOffense: 0.5,         // 0-1 CPU drive strength (simulated drives)
    simPlaySeconds: [7, 13]  // game seconds each simulated play uses
  };
})(window.SB);
