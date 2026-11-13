/* SUPERBOWL1 - on-field gameplay: quick game (4 x 2:00, simulated defense) and drive practice. */
window.SB = window.SB || {};
(function (SB) {
  'use strict';

  const W = 384, H = 216;
  const XS = 8, YS = 3, TOP = 41;         // px per yard (x), px per yard (y), field top
  const FW = 53.33, CEN = 26.67;          // field width, middle
  const F = () => SB.font;
  const TU = () => SB.tuning;
  const SKINS = ['#e9b48e', '#c98f6a', '#8a5434', '#6b3e25', '#b07a52', '#5a3520', '#d9a27a'];
  const DOWNS = ['1ST', '2ND', '3RD', '4TH'];

  let S = null; // scene state

  // ---------- helpers ----------
  const sx = (x) => Math.round((x - S.camX) * XS + W / 2);
  const sy = (y) => Math.round(TOP + y * YS);
  const toWorld = (px, py) => ({ x: (px - W / 2) / XS + S.camX, y: (py - TOP) / YS });
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clampCam = (x) => SB.clamp(x, 24, 96);
  const rand = (a, b) => SB.rand(a, b);

  function spotText(x) {
    const yl = Math.round(x - 10);
    if (yl === 50) return '50';
    return yl < 50 ? 'OWN ' + yl : 'OPP ' + (100 - yl);
  }
  function downText() {
    const goal = S.firstDownX >= 110;
    const togo = Math.max(1, Math.round(S.firstDownX - S.los));
    return DOWNS[S.down - 1] + ' & ' + (goal ? 'GOAL' : togo);
  }

  // ---------- setup ----------
  function mk(team, role, x, y, num, extra) {
    const p = Object.assign({
      team, role, x, y, num, vx: 0, vy: 0, facing: team === 'O' ? 1 : -1, anim: 0,
      speed: TU().speed[role], route: [], ri: 0, routeEnd: 'stop', mode: 'idle',
      stunT: 0, blockedT: 0, jukeT: 0, jukeCd: 0, brokeT: 0, stutterT: 0, stutterCd: 0, diveT: 0, diving: false, down: false,
      skin: SKINS[(Math.random() * SKINS.length) | 0]
    }, extra || {});
    S.players.push(p);
    return p;
  }

  function setupFormation(play) {
    S.players = [];
    const los = S.los;
    const duo = SB.featuredDuo;
    const home = S.offTeam === SB.teams.home;
    const qb = home ? { name: duo.left.short, number: duo.left.number, skin: duo.left.skin } : S.offTeam.qb;
    const wr = home ? { name: duo.right.short, number: duo.right.number, skin: duo.right.skin } : S.offTeam.wr1;
    const P = {};
    P.OL1 = mk('O', 'OL', los - 0.7, CEN - 3.2, 71);
    P.OL2 = mk('O', 'OL', los - 0.7, CEN, 64);
    P.OL3 = mk('O', 'OL', los - 0.7, CEN + 3.2, 77);
    P.QB = mk('O', 'QB', los - 4.5, CEN, qb.number, { name: qb.name, skin: qb.skin });
    P.RB = mk('O', 'RB', los - 6.2, play.type === 'run' ? CEN : CEN + 2.6, 28, { name: 'D. MORALES' });
    P.WR1 = mk('O', 'WR', los - 0.7, 7, wr.number, { name: wr.name, skin: wr.skin, slot: 'WR1' });
    P.WR2 = mk('O', 'WR', los - 0.7, 46.5, 80, { name: 'T. HOLLOWAY', slot: 'WR2' });
    P.TE = mk('O', 'TE', los - 0.7, CEN + 6.2, 85, { name: 'M. GRANGER' });

    P.DL1 = mk('D', 'DL', los + 1.1, CEN - 3.6, 97);
    P.DL2 = mk('D', 'DL', los + 1.1, CEN, 93);
    P.DL3 = mk('D', 'DL', los + 1.1, CEN + 3.6, 91);
    P.LB1 = mk('D', 'LB', los + 5, CEN - 5, 54);
    P.LB2 = mk('D', 'LB', los + 5, CEN + 6.5, 50);
    P.CB1 = mk('D', 'CB', los + 6, 7, 24);
    P.CB2 = mk('D', 'CB', los + 6, 46.5, 21);
    P.S1 = mk('D', 'S', los + 14, CEN, 31);

    // Routes
    for (const slot of ['WR1', 'WR2', 'TE', 'RB']) {
      const p = P[slot];
      const r = play.routes[slot];
      const inDir = p.y < CEN ? 1 : -1;
      p.route = (r.pts || []).map(([dx, din]) => ({ x: p.x + dx, y: SB.clamp(p.y + inDir * din, 1, FW - 1) }));
      p.routeEnd = r.end;
      p.mode = r.end === 'carry' ? 'carry' : (p.route.length ? 'route' : 'block');
      p.eligible = true;
    }
    // Coverage
    P.CB1.man = P.WR1; P.CB2.man = P.WR2; P.LB2.man = P.TE;
    P.LB1.man = play.routes.RB.pts.length ? P.RB : null;
    S.P = P;
    S.offense = S.players.filter((p) => p.team === 'O');
    S.defense = S.players.filter((p) => p.team === 'D');
    S.receivers = [P.WR1, P.WR2, P.TE, P.RB];
    S.ball = { state: 'held', holder: P.QB, x: P.QB.x, y: P.QB.y, h: 0 };
    S.carrier = null;
  }

  function newDrive() {
    S.offTeam = SB.teams.home; S.defTeam = SB.teams.away;
    S.drive = { points: 0, plays: 0, yards: 0, comp: 0, att: 0, startLos: 35 };
    S.los = 35; S.down = 1; S.firstDownX = 45;
    S.focus = 0;
    S.play = SB.playbook[0];
    setupFormation(S.play);
    S.camX = clampCam(S.los + 10);
    S.phase = 'select'; S.phaseT = 0;
    S.msg = null; S.flash = null; S.particles = [];
  }

  // ---------- quick game: clock, possessions, simulated drives ----------
  const other = (t) => (t === 'home' ? 'away' : 'home');
  const QG = () => SB.quickGame;
  const isHuman = (t) => t === 'home' || S.g.players === 2;
  function clockText(c) {
    c = Math.max(0, Math.ceil(c));
    return Math.floor(c / 60) + ':' + String(c % 60).padStart(2, '0');
  }
  function freshDrive() { return { points: 0, plays: 0, yards: 0, comp: 0, att: 0 }; }

  function newGame(players) {
    S.g = {
      players, score: { home: 0, away: 0 }, q: 1, clock: QG().quarterSeconds, poss: 'home', ot: false, over: false,
      stats: { home: { yards: 0, comp: 0, att: 0 }, away: { yards: 0, comp: 0, att: 0 } }
    };
    S.msg = null; S.flash = null; S.focus = 0;
    S.g.receiveFirst = Math.random() < 0.5 ? 'home' : 'away';
    S.offTeam = SB.teams.home; S.defTeam = SB.teams.away;
    S.los = 35; S.down = 1; S.firstDownX = 45;
    S.drive = freshDrive(); S.play = SB.playbook[0]; setupFormation(S.play);
    S.camX = clampCam(45);
    const r = S.g.receiveFirst;
    banner('COIN TOSS', SB.teams[r].name + ' WIN THE TOSS AND RECEIVE', () => startPossession(r, 35));
  }

  function banner(title, sub, then, color) {
    S.phase = 'banner'; S.phaseT = 0;
    S.banner = { title, sub, then, color: color || '#ffffff' };
  }
  function updateBanner() {
    const inp = SB.input;
    const go = S.phaseT > 2.4 || (S.phaseT > 0.45 && (inp.taps.length || inp.pressed.action || inp.pressed.start));
    if (go) { const f = S.banner.then; S.banner = null; f(); }
  }

  function startPossession(team, spot) {
    const g = S.g;
    g.poss = team;
    S.offTeam = SB.teams[team]; S.defTeam = SB.teams[other(team)];
    S.los = spot; S.down = 1; S.firstDownX = Math.min(spot + 10, 110);
    S.drive = freshDrive(); S.msg = null; S.flash = null; S.focus = 0;
    S.play = SB.playbook[0]; setupFormation(S.play);
    S.camX = clampCam(S.los + 10);
    SB.audio.music(null);
    if (!isHuman(team)) return startSim(team, spot);
    const toSelect = () => { S.phase = 'select'; S.phaseT = 0; };
    if (g.players === 2) {
      banner(team === 'home' ? 'PLAYER 1' : 'PLAYER 2', S.offTeam.name + ' BALL  *  ' + spotText(spot), toSelect, team === 'home' ? '#ffb070' : '#8fb3ff');
    } else toSelect();
  }

  /** Called when a human drive ends (score, turnover, punt, FG). */
  function possessionOver() {
    const g = S.g, e = S.driveEnd || { kind: 'downs' };
    const off = g.poss, def = other(off);
    const st = g.stats[off];
    st.yards += S.drive.yards; st.comp += S.drive.comp; st.att += S.drive.att;
    if (e.kind === 'td') g.score[off] += 7;
    else if (e.kind === 'fg') g.score[off] += 3;
    else if (e.kind === 'safety') g.score[def] += 2;
    let spot = 35;
    switch (e.kind) {
      case 'fgmiss': spot = Math.max(30, 120 - (S.los - 7)); break;
      case 'punt': { const land = S.los + rand(38, 48); spot = land >= 110 ? 30 : 120 - land; break; }
      case 'int': spot = SB.clamp(120 - (e.x != null ? e.x : S.los), 12, 105); break;
      case 'downs': spot = 120 - S.los; break;
      case 'safety': spot = 45; break;
      default: spot = 35; // kickoff touchback after a score
    }
    S.driveEnd = null;
    afterPossession(def, Math.round(spot));
  }

  function afterPossession(next, spot) {
    const g = S.g;
    if (g.ot && g.score.home !== g.score.away) return gameOver();
    if (g.clock <= 0) return endQuarter(next, spot);
    startPossession(next, spot);
  }

  function endQuarter(next, spot) {
    const g = S.g;
    SB.audio.play('horn');
    const line = SB.teams.home.name + ' ' + g.score.home + '  -  ' + SB.teams.away.name + ' ' + g.score.away;
    if (g.q === 2) {
      g.q = 3; g.clock = QG().quarterSeconds;
      const recv = other(g.receiveFirst);
      SB.audio.music('title');
      return banner('HALFTIME', line, () => startPossession(recv, 35));
    }
    if (g.q >= 4) {
      if (g.ot || g.score.home !== g.score.away) return gameOver();
      g.q = 5; g.ot = true; g.clock = QG().quarterSeconds;
      const recv = Math.random() < 0.5 ? 'home' : 'away';
      return banner('OVERTIME', 'FIRST SCORE WINS  *  ' + SB.teams[recv].name + ' RECEIVE', () => startPossession(recv, 35), '#ffd23c');
    }
    g.q++; g.clock = QG().quarterSeconds;
    banner('END OF Q' + (g.q - 1), line, () => {
      if (next) startPossession(next, spot);
      else { setupFormation(S.play); S.phase = 'select'; S.phaseT = 0; S.msg = null; }
    });
  }

  function gameOver() {
    const g = S.g;
    g.over = true;
    S.phase = 'final'; S.phaseT = 0;
    SB.audio.music('title');
    const h = g.score.home, a = g.score.away;
    if (g.players === 1) SB.audio.play(h > a ? 'goodNews' : h < a ? 'badNews' : 'horn');
    else SB.audio.play('cheer');
  }

  /** Simulate a CPU drive from `start` (yards, offense frame) with `avail` game seconds. */
  function simulateDrive(start, avail) {
    const ev = [];
    let x = start, down = 1, fdx = Math.min(start + 10, 110), t = 0, result = null;
    const str = QG().cpuOffense, [p0, p1] = QG().simPlaySeconds;
    const sit = () => DOWNS[down - 1] + ' & ' + (fdx >= 110 ? 'GOAL' : Math.max(1, Math.round(fdx - x)));
    for (let n = 0; n < 18 && !result; n++) {
      if (t >= avail) { result = { kind: 'clock' }; break; }
      const pre = sit() + ' ' + spotText(x) + ': ';
      if (down === 4) {
        const kick = Math.round((110 - x) + 17);
        if (kick <= 52) {
          const ok = Math.random() < SB.clamp(1.08 - kick * 0.012, 0.35, 0.97);
          ev.push({ text: pre + kick + ' YD FG... ' + (ok ? "IT'S GOOD" : 'NO GOOD'), dt: 5, big: true, good: !ok });
          t += 5; result = { kind: ok ? 'fg' : 'fgmiss' }; break;
        }
        if (!(fdx - x <= 2 && x > 55)) { ev.push({ text: pre + 'PUNT', dt: 6 }); t += 6; result = { kind: 'punt' }; break; }
      }
      let gain = 0, txt, dt = rand(p0, p1);
      const r = Math.random();
      if (Math.random() < 0.56) {
        if (r < 0.035 - (str - 0.5) * 0.02) {
          ev.push({ text: pre + 'PASS INTERCEPTED!', dt, big: true, good: true });
          t += dt; result = { kind: 'int', x: Math.min(105, x + rand(6, 16)) }; break;
        }
        if (r < 0.09) { gain = -Math.round(rand(4, 9)); txt = 'SACKED, LOSS OF ' + (-gain); }
        else if (r < 0.42 - str * 0.1) { txt = 'PASS INCOMPLETE'; dt = 5; }
        else { gain = Math.round(Math.random() < 0.07 ? rand(20, 55) : rand(3, 14) + str * 3); txt = 'PASS COMPLETE +' + gain; }
      } else {
        if (r < 0.015) { ev.push({ text: pre + 'FUMBLE! RECOVERED BY YOU', dt, big: true, good: true }); t += dt; result = { kind: 'int', x }; break; }
        gain = Math.round(Math.random() < 0.05 ? rand(15, 45) : rand(-2, 7) + str * 2);
        txt = 'RUN ' + (gain >= 0 ? '+' : '') + gain;
      }
      t += dt; x += gain;
      if (x >= 110) { ev.push({ text: pre + txt + '  TOUCHDOWN!', dt, big: true }); result = { kind: 'td' }; break; }
      if (x <= 10) { ev.push({ text: pre + txt + '  SAFETY!', dt, big: true, good: true }); result = { kind: 'safety' }; break; }
      ev.push({ text: pre + txt, dt });
      if (x >= fdx) { down = 1; fdx = Math.min(x + 10, 110); }
      else if (++down > 4) { ev.push({ text: 'TURNOVER ON DOWNS', dt: 0, big: true, good: true }); result = { kind: 'downs' }; break; }
    }
    if (!result) result = { kind: 'punt' };
    return { ev, result, endX: SB.clamp(x, 10, 110), start };
  }

  function startSim(team, spot) {
    const g = S.g;
    const halfEnds = g.q === 2 || g.q >= 4;
    const avail = halfEnds ? g.clock : g.clock + QG().quarterSeconds;
    S.sim = Object.assign(simulateDrive(spot, avail), {
      shown: 0, t: 0, real: 0, doneReal: null, fast: false,
      lines: [S.offTeam.name + ' BALL ON ' + spotText(spot)]
    });
    S.phase = 'sim'; S.phaseT = 0;
  }

  function updateSim(dt) {
    const sim = S.sim, g = S.g, inp = SB.input;
    const tapped = inp.taps.some((t) => !SB.inRect(t, PAUSE_BTN) && !SB.inRect(t, MUTE_BTN)) || inp.pressed.action || inp.pressed.start;
    sim.real += dt;
    if (tapped && sim.doneReal != null && sim.real - sim.doneReal > 0.3) return finishSim();
    if (tapped) sim.fast = true;
    sim.t += dt * (sim.fast ? 10 : 1);
    while (sim.shown < sim.ev.length && sim.t >= 0.65 * (sim.shown + 1)) {
      const e = sim.ev[sim.shown++];
      sim.lines.push(e.text);
      g.clock -= e.dt;
      if (g.clock <= 0 && (g.q === 1 || g.q === 3)) {
        g.q++; g.clock += QG().quarterSeconds;
        sim.lines.push('-- END OF Q' + (g.q - 1) + ' --');
        SB.audio.play('horn');
      }
      g.clock = Math.max(0, g.clock);
      if (!sim.fast || e.big) SB.audio.play(e.big ? (e.good ? 'goodNews' : 'badNews') : 'tick');
    }
    if (sim.shown >= sim.ev.length && sim.doneReal == null) sim.doneReal = sim.real;
    if (sim.doneReal != null && sim.real - sim.doneReal > 1.8) finishSim();
  }

  function finishSim() {
    const g = S.g, sim = S.sim;
    // Apply any lines not yet shown (skip-ahead safety).
    while (sim.shown < sim.ev.length) {
      const e = sim.ev[sim.shown++];
      g.clock -= e.dt;
      if (g.clock <= 0 && (g.q === 1 || g.q === 3)) { g.q++; g.clock += QG().quarterSeconds; }
      g.clock = Math.max(0, g.clock);
    }
    g.stats[g.poss].yards += Math.round(sim.endX - sim.start);
    S.los = sim.endX;
    S.drive = freshDrive();
    S.sim = null;
    if (sim.result.kind === 'clock') { S.driveEnd = null; return endQuarter(null); }
    S.driveEnd = sim.result;
    possessionOver();
  }

  function finalButtons() {
    return [
      { id: 'again', label: 'PLAY AGAIN', rect: { x: W / 2 - 128, y: 168, w: 120, h: 18 } },
      { id: 'menu', label: 'MAIN MENU', rect: { x: W / 2 + 8, y: 168, w: 120, h: 18 } }
    ];
  }
  function updateFinal() {
    const inp = SB.input;
    if (S.phaseT < 0.8) return;
    let pick = null;
    for (const t of inp.taps) for (const b of finalButtons()) if (SB.inRect(t, b.rect)) pick = b.id;
    if (inp.pressed.start || inp.pressed.action || inp.pressed.restart) pick = 'again';
    if (inp.pressed.title) pick = 'menu';
    if (pick === 'again') { SB.audio.play('confirm'); newGame(S.g.players); }
    if (pick === 'menu') SB.setScene(SB.menuScene);
  }

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = '#f26a1b'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = 'rgba(10,10,14,0.94)'; ctx.fillRect(x, y, w, h);
  }

  function drawBanner(ctx) {
    const b = S.banner;
    if (!b) return;
    ctx.fillStyle = 'rgba(5,6,10,0.7)'; ctx.fillRect(0, 17, W, H - 17);
    F().drawText(ctx, b.title, W / 2, 86, b.color, { align: 'center', scale: 3, shadow: '#000' });
    F().drawText(ctx, b.sub, W / 2, 116, '#e9e2d6', { align: 'center', shadow: '#000' });
    if (S.phaseT > 0.45 && Math.floor(S.phaseT * 2.4) % 2 === 0) {
      F().drawText(ctx, SB.input.lastDevice === 'touch' ? 'TAP TO CONTINUE' : 'PRESS ENTER', W / 2, 150, '#8a8a96', { align: 'center' });
    }
  }

  function drawSim(ctx) {
    const sim = S.sim;
    if (!sim) return;
    ctx.fillStyle = 'rgba(5,6,10,0.55)'; ctx.fillRect(0, 17, W, H - 17);
    const x = 22, y = 40, w = W - 44, h = 150;
    panel(ctx, x, y, w, h);
    F().drawText(ctx, S.offTeam.name + ' DRIVE', x + 8, y + 7, '#8fb3ff');
    F().drawText(ctx, 'DEFENSE SIMULATED', x + w - 8, y + 7, '#8a8a96', { align: 'right' });
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(x + 6, y + 18, w - 12, 1);
    const shown = sim.lines.slice(-10);
    shown.forEach((ln, i) => {
      const last = i === shown.length - 1;
      const big = /TOUCHDOWN|FG|INTERCEPT|FUMBLE|SAFETY|DOWNS|PUNT|END OF/.test(ln);
      const col = !last ? '#8a8a96' : big ? (/TOUCHDOWN|IT'S GOOD/.test(ln) ? '#ff5a4f' : '#7dff8a') : '#ffffff';
      F().drawText(ctx, ln.slice(0, 54), x + 8, y + 24 + i * 11, col);
    });
    const done = sim.doneReal != null;
    if (Math.floor(S.phaseT * 2.4) % 2 === 0) {
      F().drawText(ctx, done ? 'TAP TO TAKE THE BALL' : 'TAP TO SKIP', x + w / 2, y + h - 10, '#ffd23c', { align: 'center' });
    }
  }

  function drawFinal(ctx) {
    const g = S.g;
    ctx.fillStyle = 'rgba(5,6,10,0.85)'; ctx.fillRect(0, 17, W, H - 17);
    const h = g.score.home, a = g.score.away;
    let title, col;
    if (h === a) { title = 'TIE GAME'; col = '#e9e2d6'; }
    else if (g.players === 1) { title = h > a ? 'YOU WIN!' : 'YOU LOSE'; col = h > a ? '#7dff8a' : '#ff5a4f'; }
    else { title = (h > a ? 'PLAYER 1' : 'PLAYER 2') + ' WINS!'; col = h > a ? '#ffb070' : '#8fb3ff'; }
    F().drawText(ctx, 'FINAL' + (g.ot ? ' / OT' : ''), W / 2, 30, '#8a8a96', { align: 'center' });
    F().drawText(ctx, title, W / 2, 42, col, { align: 'center', scale: 2, shadow: '#000' });
    F().drawText(ctx, SB.teams.home.name + '  ' + h, W / 2 - 16, 72, '#ffb070', { align: 'right', scale: 2 });
    F().drawText(ctx, a + '  ' + SB.teams.away.name, W / 2 + 16, 72, '#8fb3ff', { scale: 2 });
    F().drawText(ctx, '-', W / 2, 72, '#ffffff', { align: 'center', scale: 2 });
    const sh = g.stats.home, sa = g.stats.away;
    const rows = [
      ['TOTAL YARDS', sh.yards, sa.yards],
      ['PASSING', sh.comp + '/' + sh.att, g.players === 2 ? sa.comp + '/' + sa.att : 'SIM']
    ];
    rows.forEach(([k, l, r], i) => {
      const yy = 104 + i * 14;
      F().drawText(ctx, String(l), W / 2 - 70, yy, '#ffffff', { align: 'right' });
      F().drawText(ctx, k, W / 2, yy, '#8a8a96', { align: 'center' });
      F().drawText(ctx, String(r), W / 2 + 70, yy, '#ffffff');
    });
    for (const b of finalButtons()) {
      const r = b.rect;
      ctx.fillStyle = '#f26a1b'; ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      ctx.fillStyle = '#1c120b'; ctx.fillRect(r.x, r.y, r.w, r.h);
      F().drawText(ctx, b.label, r.x + r.w / 2, r.y + 6, '#ffffff', { align: 'center' });
    }
  }


  // ---------- play selection ----------
  function options() {
    const opts = SB.playbook.map((p) => ({ kind: 'play', play: p }));
    const kick = (110 - S.los) + 17;
    if (kick <= 58) opts.push({ kind: 'fg', dist: Math.round(kick) });
    if (S.down === 4) opts.push({ kind: 'punt' });
    // layout
    const cw = 86, ch = 86, gap = 6, x0 = Math.round((W - (4 * cw + 3 * gap)) / 2), y0 = 62;
    let si = 0;
    const specials = opts.filter((o) => o.kind !== 'play').length;
    const bw = 124, bgap = 8, bx0 = Math.round((W - (specials * bw + (specials - 1) * bgap)) / 2);
    opts.forEach((o, i) => {
      if (o.kind === 'play') o.rect = { x: x0 + i * (cw + gap), y: y0, w: cw, h: ch };
      else { o.rect = { x: bx0 + si * (bw + bgap), y: 154, w: bw, h: 15 }; si++; }
    });
    return opts;
  }

  function choose(o) {
    SB.audio.play('confirm');
    if (o.kind === 'play') {
      S.play = o.play;
      setupFormation(S.play);
      S.phase = 'presnap'; S.phaseT = 0;
    } else if (o.kind === 'fg') {
      S.phase = 'fg'; S.phaseT = 0;
      S.fg = { dist: o.dist, w: SB.clamp(0.36 - (o.dist - 20) * 0.0068, 0.09, 0.36), speed: 2.6 + o.dist * 0.035, stopped: false, needle: 0, flight: 0 };
    } else if (o.kind === 'punt') {
      SB.audio.play('kick');
      endDrive('PUNT', '#cfc7b8', 0, 'punt');
    }
  }

  function updateSelect(dt) {
    const inp = SB.input;
    const opts = options();
    if (S.focus >= opts.length) S.focus = 0;
    if (inp.pressed.right || inp.pressed.down) { S.focus = (S.focus + 1) % opts.length; SB.audio.play('blip'); }
    if (inp.pressed.left || inp.pressed.up) { S.focus = (S.focus - 1 + opts.length) % opts.length; SB.audio.play('blip'); }
    const hv = inp.pointer.hoverX != null ? { x: inp.pointer.hoverX, y: inp.pointer.hoverY } : null;
    if (hv && inp.lastDevice === 'mouse') opts.forEach((o, i) => { if (SB.inRect(hv, o.rect)) S.focus = i; });
    for (let k = 1; k <= 4; k++) if (inp.pressed['k' + k]) return choose(opts[k - 1]);
    if (inp.pressed.fg) { const o = opts.find((x) => x.kind === 'fg'); if (o) return choose(o); }
    if (inp.pressed.punt) { const o = opts.find((x) => x.kind === 'punt'); if (o) return choose(o); }
    if (inp.pressed.start || inp.pressed.action) return choose(opts[S.focus]);
    for (const t of inp.taps) for (const o of opts) if (SB.inRect(t, o.rect)) return choose(o);
  }

  // ---------- snap + live play ----------
  function snap() {
    S.phase = 'live'; S.liveT = 0;
    SB.audio.play('hike');
    S.qbPhase = S.play.type === 'pass';
    S.carrier = S.P.QB;
    S.aiming = false; S.stickActive = false; S.thrown = false;
    S.padAim = null;
    for (const d of S.defense) {
      d.holdT = rand(TU().blockHoldMin, TU().blockHoldMax) * (S.play.type === 'run' ? 0.75 : 1);
      d.react = d.role === 'CB' ? rand(0.18, 0.38) : rand(0.25, 0.45);
    }
    S.P.LB1.blitz = !S.P.LB1.man && Math.random() < 0.35;
    // Linemen pick the defender in front of them.
    for (const o of [S.P.OL1, S.P.OL2, S.P.OL3]) {
      let best = null, bd = 1e9;
      for (const d of [S.P.DL1, S.P.DL2, S.P.DL3]) { const dd = Math.abs(d.y - o.y); if (dd < bd && !d.taken) { bd = dd; best = d; } }
      if (best) { best.taken = true; o.assign = best; }
    }
  }

  function steer(p, tx, ty, spd, dt, accel) {
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
    let dvx = 0, dvy = 0;
    if (d > 0.04) { const v = Math.min(spd, d * 6); dvx = (dx / d) * v; dvy = (dy / d) * v; }
    const k = Math.min(1, dt * (accel || 9));
    p.vx += (dvx - p.vx) * k; p.vy += (dvy - p.vy) * k;
    integrate(p, dt);
  }
  function integrate(p, dt) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    const sp = Math.hypot(p.vx, p.vy);
    if (Math.abs(p.vx) > 0.6) p.facing = p.vx > 0 ? 1 : -1;
    p.anim += sp * dt * 1.5;
  }

  function intercept(chaser, target) {
    const d = dist(chaser, target);
    const lead = SB.clamp(d / Math.max(1, chaser.speed), 0, 0.8);
    return { x: target.x + target.vx * lead, y: target.y + target.vy * lead };
  }

  function throwTo(raw) {
    const QB = S.P.QB;
    let target = { x: raw.x, y: raw.y };
    let best = null, bd = 3.6;
    for (const r of S.receivers) {
      if (r.mode === 'block' && r.role === 'RB' && !r.route.length) continue;
      const d = dist(r, target);
      if (d < bd) { bd = d; best = r; }
    }
    if (best) {
      let est = { x: best.x, y: best.y };
      for (let i = 0; i < 3; i++) {
        const tt = 0.22 + dist(QB, est) / TU().passSpeed;
        est = predict(best, tt);
      }
      target = est;
    }
    target.y = SB.clamp(target.y, -2, FW + 2);
    const d = Math.max(2, dist(QB, target));
    S.ball = { state: 'air', fromX: QB.x + 0.3, fromY: QB.y, to: target, x: QB.x, y: QB.y, t: 0, T: 0.22 + d / TU().passSpeed, peak: Math.min(30, 4 + d * 0.85), h: 0, intended: best };
    S.qbPhase = false; S.carrier = null; S.thrown = true; S.aiming = false;
    S.drive.att++;
    SB.audio.play('throw');
  }

  /** Where a receiver will be in tt seconds, following the rest of his route. */
  function predict(r, tt) {
    if (r.mode !== 'route') return { x: r.x + r.vx * tt, y: r.y + r.vy * tt };
    let x = r.x, y = r.y, left = tt * r.speed * 0.92;
    for (let i = r.ri; i < r.route.length && left > 0; i++) {
      const wp = r.route[i], d = Math.hypot(wp.x - x, wp.y - y);
      if (d >= left) return { x: x + ((wp.x - x) / d) * left, y: y + ((wp.y - y) / d) * left };
      x = wp.x; y = wp.y; left -= d;
    }
    if (left > 0 && r.routeEnd === 'continue' && r.route.length) {
      const a = r.route.length > 1 ? r.route[r.route.length - 2] : { x: r.route[0].x - 5, y: r.route[0].y };
      const b = r.route[r.route.length - 1];
      const vx = b.x - a.x, vy = b.y - a.y, d = Math.hypot(vx, vy) || 1;
      x += (vx / d) * left; y += (vy / d) * left;
    }
    return { x, y: SB.clamp(y, 1, FW - 1) };
  }

  function resolvePass() {
    const pt = S.ball.to;
    if (pt.y < 0 || pt.y > FW || pt.x > 120) return endPlay({ type: 'inc', why: 'OUT OF BOUNDS' });
    let ro = null, rod = 1e9, rd = null, rdd = 1e9;
    for (const r of S.receivers) { const d = dist(r, pt); if (d < rod) { rod = d; ro = r; } }
    for (const d of S.defense) { const dd = dist(d, pt); if (dd < rdd) { rdd = dd; rd = d; } }
    const R = TU().catchRadius;
    if (rod <= R && rod <= rdd) {
      const contested = rdd < 1.3;
      if (!contested || Math.random() < 0.7) {
        S.drive.comp++;
        SB.audio.play('catch');
        S.carrier = ro; ro.mode = 'carry'; ro.vx *= 0.7; ro.vy *= 0.7;
        S.ball = { state: 'held', holder: ro, x: ro.x, y: ro.y, h: 0 };
        S.flash = { text: (ro.name || ('#' + ro.num)) + ' CATCH!', t: 1.1 };
        for (const r of S.offense) if (r !== ro && r.role !== 'OL') r.mode = 'block';
        if (ro.x >= 110) endPlay({ type: 'td' });
        return;
      }
      return endPlay({ type: 'inc', why: 'BROKEN UP' });
    }
    if (rdd <= 1.3 && rdd < rod && Math.random() < 0.25) return endPlay({ type: 'int' });
    endPlay({ type: 'inc', why: rdd < 1.8 ? 'BROKEN UP' : 'INCOMPLETE' });
  }

  function juke(p, dir) {
    if (p.jukeCd > 0) return;
    p.jukeT = 0.28; p.jukeDir = dir; p.jukeCd = 0.75;
    SB.audio.play('juke');
    for (const d of S.defense) if (dist(d, p) < 2.8 && Math.random() < 0.55) d.stunT = 0.6;
  }

  /** Swipe back: stutter step. Runner hesitates; defenders closing fast can overrun. */
  function stutter(p) {
    if (p.stutterCd > 0) return;
    p.stutterT = 0.45; p.stutterCd = 0.9;
    SB.audio.play('juke');
    for (const d of S.defense) {
      const dd = dist(d, p);
      const closing = (d.vx * (p.x - d.x) + d.vy * (p.y - d.y)) / (dd || 1);
      if (dd < 3.6 && closing > 3 && Math.random() < 0.5) d.stunT = 0.4;
    }
  }

  /** Swipe forward: dive. Lunges ~2 yards; can't be tackled mid-air; play ends where he lands. */
  function dive(p) {
    if (p.diveT > 0 || p.diving) return;
    p.diving = true; p.diveT = 0.32;
    p.vx = p.speed * 1.25; p.vy *= 0.3;
    SB.audio.play('juke');
    S.flash = { text: 'DIVE!', t: 0.6 };
  }

  function controlRunner(p, dt) {
    const inp = SB.input;
    let dx = 1, dy = 0;
    let kx = (inp.keys.right ? 1 : 0) - (inp.keys.left ? 1 : 0);
    let ky = (inp.keys.down ? 1 : 0) - (inp.keys.up ? 1 : 0);
    if (inp.pad && (inp.pad.x || inp.pad.y)) { kx = inp.pad.x; ky = inp.pad.y; }
    if (kx || ky) { dx = kx; dy = ky; }
    const P = inp.pointer;
    if (P.down && S.stickActive) {
      const ddx = P.x - P.startX, ddy = P.y - P.startY;
      if (Math.hypot(ddx, ddy) > 5) { dx = ddx / XS; dy = ddy / YS; }
    }
    if (inp.pressed.jukeUp) juke(p, -1);
    if (inp.pressed.jukeDown) juke(p, 1);
    if (inp.pressed.dive) dive(p);
    // Retro Bowl swipes: up/down = juke, back = stutter, forward = dive.
    for (const s of inp.swipes) {
      if (Math.abs(s.dy) > Math.abs(s.dx) * 0.8) juke(p, s.dy < 0 ? -1 : 1);
      else if (s.dx > 0) dive(p);
      else stutter(p);
    }
    if (p.diving) {
      p.diveT -= dt;
      p.vx *= Math.pow(0.4, dt); p.vy *= Math.pow(0.2, dt);
      integrate(p, dt);
      return;
    }

    let n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    let spd = p.speed * (p.brokeT > 0 ? 1.15 : 1);
    if (p.jukeT > 0) { dx = 0.65; dy = p.jukeDir; n = Math.hypot(dx, dy); dx /= n; dy /= n; spd *= 1.35; }
    if (p.stutterT > 0) spd *= 0.3;
    const k = Math.min(1, dt * 10);
    p.vx += (dx * spd - p.vx) * k; p.vy += (dy * spd - p.vy) * k;
    integrate(p, dt);
  }

  function updateOffenseAI(p, dt) {
    const QB = S.P.QB;
    const ref = S.carrier || QB;
    if (p.engaged) {
      const e = p.engaged;
      if (e.blockedT > 0 && dist(p, e) < 2) { steer(p, e.x - 0.6 * e.facing, e.y, p.speed * 0.5, dt); return; }
      p.engaged = null;
    }
    if (p.role === 'OL') {
      const a = p.assign;
      if (a && !a.free && S.phase === 'live') {
        const vx = ref.x - a.x, vy = ref.y - a.y, d = Math.hypot(vx, vy) || 1;
        steer(p, a.x + (vx / d) * 1.1, a.y + (vy / d) * 1.1, p.speed, dt);
      } else {
        // Pocket clock: linemen can't re-engage forever once the play breaks down.
        const t = S.liveT < 3.8 || S.carrier !== QB ? nearestFreeDefender(p, ref, 5) : null;
        if (t) engageOrChase(p, t, dt); else steer(p, p.x + 0.5, p.y, 2, dt);
      }
      return;
    }
    if (p.role === 'QB') {
      if (S.play.type === 'run' && S.liveT < 0.6) steer(p, S.los - 4.4, CEN - 0.6, p.speed, dt);
      else if (S.play.type === 'run') steer(p, S.los - 6, CEN - 6, 4, dt);
      else steer(p, p.x, p.y, 0, dt);
      return;
    }
    // Skill players
    if (p.mode === 'carry' && S.play.type === 'run' && S.carrier !== p) {
      steer(p, S.los - 4.6, CEN + 0.3, p.speed, dt); // to the mesh point
      return;
    }
    if (S.ball.state === 'air' && dist(p, S.ball.to) < 9 && p.eligible) {
      steer(p, S.ball.to.x, S.ball.to.y, p.speed, dt);
      return;
    }
    if (p.mode === 'route') {
      const wp = p.route[p.ri];
      if (wp) {
        steer(p, wp.x, wp.y, p.speed, dt, 12);
        if (dist(p, wp) < 0.7) p.ri++;
      } else if (p.routeEnd === 'continue' && p.route.length) {
        const a = p.route.length > 1 ? p.route[p.route.length - 2] : { x: p.route[0].x - 5, y: p.route[0].y };
        const b = p.route[p.route.length - 1];
        const vx = b.x - a.x, vy = b.y - a.y, d = Math.hypot(vx, vy) || 1;
        steer(p, p.x + (vx / d) * 10, SB.clamp(p.y + (vy / d) * 10, 1, FW - 1), p.speed, dt);
      } else if (p.routeEnd === 'block') {
        p.mode = 'block';
      } else {
        steer(p, p.x, p.y, 0, dt);
      }
      return;
    }
    if (p.mode === 'block') {
      const t = nearestFreeDefender(p, ref, p.role === 'RB' ? 4 : 7);
      if (t) engageOrChase(p, t, dt);
      else if (p.role === 'RB' && S.qbPhase) steer(p, QB.x + 0.8, QB.y + 1.5, p.speed, dt);
      else steer(p, p.x + 0.3, p.y, 2, dt);
    }
  }

  function nearestFreeDefender(p, ref, radius) {
    let best = null, bd = 1e9;
    for (const d of S.defense) {
      if (d.blockedT > 0 || d.stunT > 0) continue;
      if (dist(d, ref) > radius + 4) continue;
      const dd = dist(d, p);
      if (dd < bd) { bd = dd; best = d; }
    }
    return bd < radius + 6 ? best : null;
  }
  function engageOrChase(p, d, dt) {
    if (dist(p, d) < 1.15) { d.blockedT = rand(0.8, 1.6); p.engaged = d; return; }
    steer(p, d.x - 0.5 * d.facing, d.y, p.speed, dt);
  }

  function updateDefenseAI(p, dt) {
    if (p.stunT > 0) { p.stunT -= dt; steer(p, p.x, p.y, 0, dt, 4); return; }
    let f = 1;
    if (p.blockedT > 0) { p.blockedT -= dt; f = 0.18; }
    const QB = S.P.QB;
    const runner = S.carrier && !(S.carrier === QB && S.qbPhase) ? S.carrier : null;

    if (p.role === 'DL' && !p.free) {
      if (S.liveT > p.holdT) p.free = true;
      else {
        const engaged = S.offense.some((o) => o.role === 'OL' && dist(o, p) < 1.7);
        if (engaged) f *= 0.12;
      }
    }

    let target;
    if (S.ball.state === 'air') {
      const react = S.ball.t > 0.28 && dist(p, S.ball.to) < 7;
      target = react ? S.ball.to : coverageTarget(p);
    } else if (runner) {
      target = intercept(p, runner);
    } else if (p.role === 'DL') {
      target = { x: QB.x, y: QB.y };
    } else {
      target = coverageTarget(p);
    }
    steer(p, target.x, target.y, p.speed * f, dt, 8);
  }

  function coverageTarget(p) {
    const QB = S.P.QB;
    if (S.liveT < (p.react || 0)) return { x: p.x, y: p.y };
    if (p.role === 'CB' || (p.role === 'LB' && p.man)) {
      const m = p.man;
      // Trail the receiver's current spot (no anticipation) so sharp breaks create separation.
      const cushion = p.role === 'CB' ? 1.0 : 0.5;
      return { x: m.x + cushion, y: m.y };
    }
    if (p.role === 'LB') {
      if (p.blitz && S.liveT > 0.8) return { x: QB.x, y: QB.y };
      return { x: S.los + 4, y: SB.clamp(QB.y, CEN - 8, CEN + 8) };
    }
    if (p.role === 'S') {
      let deep = S.P.WR1;
      for (const r of [S.P.WR1, S.P.WR2, S.P.TE]) if (r.x > deep.x) deep = r;
      return { x: Math.max(S.los + 12, deep.x + 4), y: CEN + (deep.y - CEN) * 0.6 };
    }
    return { x: QB.x, y: QB.y };
  }

  function updateLive(dt) {
    const inp = SB.input;
    S.liveT += dt;
    const QB = S.P.QB;
    if (S.mode === 'quick') {
      const g = S.g, before = g.clock;
      g.clock = Math.max(0, g.clock - dt);
      if ((g.q === 2 || g.q >= 4) && g.clock < 10 && Math.ceil(before) !== Math.ceil(g.clock)) SB.audio.play('tick');
    }

    // Handoff on run plays.
    if (S.play.type === 'run' && S.carrier === QB && S.liveT >= 0.5) {
      const RB = S.P.RB;
      S.carrier = RB; S.ball = { state: 'held', holder: RB, x: RB.x, y: RB.y, h: 0 };
      for (const r of S.offense) if (r.role !== 'OL' && r !== RB && r.role !== 'QB') r.mode = 'block';
    }

    // Pointer press starts aiming (pass) or the virtual stick (runner).
    for (const d of inp.downs) {
      if (SB.inRect(d, PAUSE_BTN)) continue;
      if (S.qbPhase) { S.aiming = true; S.aim = toWorld(d.x, d.y); }
      else if (S.carrier && S.carrier.team === 'O' && SB.input.lastDevice !== 'touch') S.stickActive = true;
    }

    if (S.qbPhase) {
      if (S.aiming && inp.pointer.down) S.aim = toWorld(inp.pointer.x, inp.pointer.y);
      for (const u of inp.ups) {
        if (S.aiming && S.qbPhase) throwTo(toWorld(u.x, u.y));
      }
      const keys = { k1: S.P.WR1, k2: S.P.WR2, k3: S.P.TE, k4: S.P.RB };
      for (const k in keys) if (inp.pressed[k] && S.qbPhase && keys[k].eligible && keys[k].route.length) throwTo({ x: keys[k].x, y: keys[k].y });
      // Gamepad right-stick aim + RT.
      if (inp.padAim && (inp.padAim.x || inp.padAim.y)) {
        if (!S.padAim) S.padAim = { x: S.P.WR1.x, y: S.P.WR1.y };
        S.padAim.x += inp.padAim.x * 28 * dt; S.padAim.y += inp.padAim.y * 22 * dt;
      }
      if (inp.padThrow && !S.padThrowPrev && S.padAim && S.qbPhase) throwTo(S.padAim);
      S.padThrowPrev = inp.padThrow;
    }
    if (!inp.pointer.down) S.stickActive = false;

    // Movement
    for (const p of S.players) {
      if (p.jukeT > 0) p.jukeT -= dt;
      if (p.jukeCd > 0) p.jukeCd -= dt;
      if (p.brokeT > 0) p.brokeT -= dt;
      if (p.stutterT > 0) p.stutterT -= dt;
      if (p.stutterCd > 0) p.stutterCd -= dt;
      if (p === S.carrier && p.team === 'O') {
        if (p === QB && S.qbPhase) {
          // QB: auto drop-back, or player-moved with keys / stick.
          let kx = (inp.keys.right ? 1 : 0) - (inp.keys.left ? 1 : 0);
          let ky = (inp.keys.down ? 1 : 0) - (inp.keys.up ? 1 : 0);
          if (inp.pad && (inp.pad.x || inp.pad.y)) { kx = inp.pad.x; ky = inp.pad.y; }
          if (kx || ky) { const n = Math.hypot(kx, ky); p.vx = (kx / n) * p.speed; p.vy = (ky / n) * p.speed; integrate(p, dt); }
          else if (S.liveT < 0.75) steer(p, S.los - 7.2, CEN, p.speed, dt);
          else steer(p, p.x, p.y, 0, dt);
          if (p.x > S.los + 0.2) { S.qbPhase = false; S.aiming = false; S.flash = { text: 'SCRAMBLE!', t: 0.9 }; }
        } else if (p === QB && S.play.type === 'run') {
          updateOffenseAI(p, dt);
        } else {
          controlRunner(p, dt);
        }
      } else if (p.team === 'O') {
        updateOffenseAI(p, dt);
      } else {
        updateDefenseAI(p, dt);
      }
    }

    // Ball
    const b = S.ball;
    if (b.state === 'held') { b.x = b.holder.x + 0.4 * b.holder.facing; b.y = b.holder.y; }
    else if (b.state === 'air') {
      b.t += dt;
      const f = Math.min(1, b.t / b.T);
      b.x = b.fromX + (b.to.x - b.fromX) * f;
      b.y = b.fromY + (b.to.y - b.fromY) * f;
      b.h = 4 * b.peak * f * (1 - f);
      if (f >= 1) { resolvePass(); return; }
    }

    // Whistles
    const c = S.carrier;
    if (!c || S.phase !== 'live') return;
    if (c.x >= 110) return endPlay({ type: 'td' });
    if (c.y < 0 || c.y > FW) return endPlay({ type: 'oob', x: c.x });
    if (c.x <= 10) return endPlay({ type: 'safety' });
    if (c.diving) {
      if (c.diveT <= 0) return endPlay({ type: 'tackle', x: c.x });
      return; // airborne: can't be tackled
    }
    for (const d of S.defense) {
      if (d.stunT > 0 || d.blockedT > 0) continue;
      if (dist(d, c) < TU().tackleRadius) {
        if (c.jukeT > 0 && Math.random() < 0.55) { d.stunT = 0.6; continue; }
        const brk = c.role === 'RB' ? 0.14 : c.role === 'QB' ? 0.04 : 0.08;
        if (Math.random() < brk) { d.stunT = 0.8; c.brokeT = 0.5; S.flash = { text: 'BROKEN TACKLE!', t: 0.9 }; SB.audio.play('cheer'); continue; }
        const sack = c === QB && S.qbPhase;
        return endPlay({ type: sack ? 'sack' : 'tackle', x: c.x + (sack ? 0 : 0.6 * Math.sign(c.vx || 1)) });
      }
    }
  }

  // ---------- results ----------
  function endPlay(r) {
    if (S.phase !== 'live') return;
    S.phase = 'dead'; S.phaseT = 0;
    S.drive.plays++;
    S.aiming = false; S.stickActive = false;
    if (S.carrier && (r.type === 'tackle' || r.type === 'sack')) S.carrier.down = true;
    SB.audio.play(r.type === 'tackle' || r.type === 'sack' ? 'tackle' : 'whistle');
    if (r.type === 'tackle' || r.type === 'sack') setTimeout(() => SB.audio.play('whistle'), 180);
    let next = 'select';
    const d = S.drive;
    switch (r.type) {
      case 'inc':
        S.msg = { text: r.why === 'OUT OF BOUNDS' ? 'INCOMPLETE' : r.why, color: '#e9e2d6', sub: 'BALL ON ' + spotText(S.los) };
        SB.audio.play('incomplete');
        advanceDown(0);
        break;
      case 'int':
        S.msg = { text: 'INTERCEPTED!', color: '#ff5a4f' };
        S.driveEnd = { kind: 'int', x: S.ball.to ? S.ball.to.x : S.los };
        SB.audio.play('turnover');
        next = 'end'; S.endInfo = { title: 'INTERCEPTED', color: '#ff5a4f' };
        break;
      case 'td':
        d.yards += Math.round(110 - S.los);
        d.points += 7;
        S.msg = { text: 'TOUCHDOWN!', color: '#ff8a3d', big: true, sub: 'PAT IS GOOD' };
        spawnConfetti();
        S.driveEnd = { kind: 'td' };
        SB.audio.play('touchdown');
        next = 'end'; S.endInfo = { title: 'TOUCHDOWN', color: '#ff8a3d' };
        break;
      case 'safety':
        S.msg = { text: 'SAFETY', color: '#ff5a4f' };
        S.driveEnd = { kind: 'safety' };
        SB.audio.play('turnover');
        next = 'end'; S.endInfo = { title: 'SAFETY', color: '#ff5a4f' };
        break;
      default: {
        const spot = SB.clamp(r.x, 10.5, 109.5);
        const gain = Math.round(spot - S.los);
        d.yards += gain;
        const sack = r.type === 'sack';
        S.los = spot;
        if (S.mode === 'quick' && r.type !== 'oob') S.g.clock = Math.max(0, S.g.clock - SB.quickGame.runoffSeconds);
        const label = sack ? 'SACKED! LOSS OF ' + Math.abs(gain) : gain > 0 ? 'GAIN OF ' + gain : gain === 0 ? 'NO GAIN' : 'LOSS OF ' + Math.abs(gain);
        if (S.los >= S.firstDownX) {
          S.down = 1; S.firstDownX = Math.min(S.los + 10, 110);
          S.msg = { text: 'FIRST DOWN!', color: '#ffd23c', sub: label };
          SB.audio.play('firstDown');
        } else {
          S.msg = { text: label, color: sack ? '#ff5a4f' : '#ffffff', sub: r.type === 'oob' ? 'OUT OF BOUNDS' : null };
          advanceDown(1);
        }
      }
    }
    if (S.down > 4 && next === 'select') {
      S.msg = { text: 'TURNOVER ON DOWNS', color: '#ff5a4f' };
      S.driveEnd = { kind: 'downs' };
      SB.audio.play('turnover');
      next = 'end'; S.endInfo = { title: 'TURNOVER ON DOWNS', color: '#ff5a4f' };
    }
    S.next = next;
  }
  function advanceDown() { S.down++; }

  function endDrive(title, color, pts, kind) {
    if (S.mode === 'quick') { S.driveEnd = { kind }; return possessionOver(); }
    S.drive.points += pts;
    S.endInfo = { title, color };
    S.phase = 'end'; S.phaseT = 0;
    finishSession();
  }
  function finishSession() {
    if (S.sessionCounted) return;
    S.sessionCounted = true;
    SB.session.drives++; SB.session.points += S.drive.points;
  }

  function spawnConfetti() {
    const cols = ['#f26a1b', '#ffffff', '#151515', '#ffd23c'];
    for (let i = 0; i < 90; i++) S.particles.push({ x: Math.random() * W, y: rand(-40, 0), vy: rand(30, 70), vx: rand(-12, 12), c: cols[i % cols.length], life: rand(2, 3.5) });
  }

  // ---------- scene ----------
  const PAUSE_BTN = { x: W - 17, y: 2, w: 15, h: 12 };
  const MUTE_BTN = { x: W - 34, y: 2, w: 15, h: 12 };

  const scene = {
    enter(arg) {
      S = { paused: false, mode: (arg && arg.mode) || 'drive', particles: [] };
      SB.session = SB.session || { drives: 0, points: 0 };
      SB.audio.music(null);
      SB.audio.crowd(0.07);
      if (S.mode === 'quick') newGame(arg.players || 1); else newDrive();
      document.body.classList.add('in-field');
    },
    exit() { document.body.classList.remove('in-field'); },
    onHide() { if (S && S.phase === 'live') S.paused = true; },

    update(dt) {
      const inp = SB.input;
      // Pause toggle
      if (inp.taps.some((t) => SB.inRect(t, MUTE_BTN))) SB.audio.toggleMute();
      const pauseTap = inp.taps.some((t) => SB.inRect(t, PAUSE_BTN));
      if (inp.pressed.pause || (pauseTap && !S.paused)) { S.paused = !S.paused; return; }
      if (S.paused) return updatePause();

      S.phaseT += dt;
      if (S.flash) { S.flash.t -= dt; if (S.flash.t <= 0) S.flash = null; }
      for (const p of S.particles) { p.y += p.vy * dt; p.x += p.vx * dt; p.life -= dt; }
      S.particles = S.particles.filter((p) => p.life > 0 && p.y < H);

      switch (S.phase) {
        case 'select': updateSelect(dt); break;
        case 'presnap':
          if (S.phaseT > 0.25 && (inp.taps.some((t) => !SB.inRect(t, PAUSE_BTN) && !SB.inRect(t, MUTE_BTN)) || inp.pressed.action || inp.pressed.start)) snap();
          break;
        case 'live': updateLive(dt); break;
        case 'dead':
          for (const p of S.players) if (!p.down) steer(p, p.x, p.y, 0, dt, 5);
          if (S.phaseT > 1.8 || (S.phaseT > 0.6 && (inp.taps.length || inp.pressed.action || inp.pressed.start))) {
            if (S.next === 'end') {
              if (S.mode === 'quick') possessionOver();
              else { S.phase = 'end'; S.phaseT = 0; finishSession(); }
            } else if (S.mode === 'quick' && S.g.clock <= 0) endQuarter(null);
            else { setupFormation(S.play); S.phase = 'select'; S.phaseT = 0; S.msg = null; }
          }
          break;
        case 'fg': updateFG(dt); break;
        case 'end': updateEnd(); break;
        case 'banner': updateBanner(); break;
        case 'sim': updateSim(dt); break;
        case 'final': updateFinal(); break;
      }

      // Camera
      let cx = S.los + 10;
      if (S.phase === 'live' || S.phase === 'dead') cx = S.ball.state === 'air' ? S.ball.x + 4 : (S.carrier ? S.carrier.x + 6 : S.ball.x + 6);
      if (S.phase === 'fg') cx = S.fg.flight > 0 ? S.fgBall.x : S.los + 8;
      S.camX += (clampCam(cx) - S.camX) * Math.min(1, dt * 4);
    },

    draw(ctx, time) {
      drawField(ctx);
      drawPlayers(ctx, time);
      if (S.phase === 'live') drawAim(ctx);
      if (S.phase === 'fg') drawFG(ctx);
      drawParticles(ctx);
      drawHUD(ctx, time);
      if (S.phase === 'select') drawSelect(ctx, time);
      if (S.phase === 'presnap') drawPresnap(ctx, time);
      if (S.phase === 'dead' && S.msg) drawMsg(ctx, time);
      if (S.flash && S.phase === 'live') F().drawText(ctx, S.flash.text, W / 2, 46, '#ffd23c', { align: 'center', shadow: '#000' });
      if (S.phase === 'end') drawEnd(ctx, time);
      if (S.phase === 'sim') drawSim(ctx, time);
      if (S.phase === 'banner') drawBanner(ctx, time);
      if (S.phase === 'final') drawFinal(ctx, time);
      if (S.paused) drawPause(ctx);
    }
  };

  // ---------- field goal ----------
  function updateFG(dt) {
    const inp = SB.input;
    const fg = S.fg;
    if (!fg.stopped) {
      fg.needle = 0.5 + 0.5 * Math.sin(S.phaseT * fg.speed);
      if (S.phaseT > 0.3 && (inp.taps.some((t) => !SB.inRect(t, PAUSE_BTN)) || inp.pressed.action || inp.pressed.start)) {
        fg.stopped = true;
        fg.good = Math.abs(fg.needle - 0.5) < fg.w / 2;
        fg.miss = fg.needle < 0.5 ? -1 : 1;
        S.fgBall = { x: S.los - 7, y: CEN, h: 0 };
        SB.audio.play('kick');
        fg.flight = 0.0001;
      }
    } else {
      fg.flight += dt;
      const f = Math.min(1, fg.flight / 1.2);
      const endY = fg.good ? CEN : CEN + fg.miss * rand(4.2, 4.6);
      S.fgBall.x = (S.los - 7) + (120 - (S.los - 7)) * f;
      S.fgBall.y = CEN + (endY - CEN) * f;
      S.fgBall.h = 4 * 26 * f * (1 - f) + f * 14;
      if (fg.flight > 1.25 && !fg.sounded) { fg.sounded = true; SB.audio.play(fg.good ? 'fgGood' : 'noGood'); }
      if (fg.flight > 1.9) endDrive(fg.good ? "IT'S GOOD!" : 'NO GOOD', fg.good ? '#7dff8a' : '#ff5a4f', fg.good ? 3 : 0, fg.good ? 'fg' : 'fgmiss');
    }
  }

  function drawFG(ctx) {
    const fg = S.fg;
    if (S.fgBall && fg.flight > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(sx(S.fgBall.x) - 1, sy(S.fgBall.y), 3, 1);
      SB.sprites.drawBall(ctx, sx(S.fgBall.x), sy(S.fgBall.y) - S.fgBall.h);
    }
    if (fg.stopped && fg.flight > 1.25) {
      F().drawText(ctx, fg.good ? "IT'S GOOD!" : 'NO GOOD', W / 2, 100, fg.good ? '#7dff8a' : '#ff5a4f', { align: 'center', scale: 2, shadow: '#000' });
      return;
    }
    const bw = 170, bx = Math.round(W / 2 - bw / 2), by = 182;
    ctx.fillStyle = '#000'; ctx.fillRect(bx - 2, by - 2, bw + 4, 12);
    ctx.fillStyle = '#3a1d10'; ctx.fillRect(bx, by, bw, 8);
    const ww = Math.round(bw * fg.w);
    ctx.fillStyle = '#2f8f3c'; ctx.fillRect(Math.round(bx + bw / 2 - ww / 2), by, ww, 8);
    ctx.fillStyle = '#7dff8a'; ctx.fillRect(Math.round(bx + bw / 2), by, 1, 8);
    const nx = Math.round(bx + fg.needle * bw);
    ctx.fillStyle = '#fff'; ctx.fillRect(nx - 1, by - 3, 3, 14);
    F().drawText(ctx, fg.dist + ' YD FIELD GOAL', W / 2, by - 12, '#ffffff', { align: 'center', shadow: '#000' });
    if (!fg.stopped) F().drawText(ctx, 'TAP / SPACE IN THE GREEN', W / 2, 205, '#ffd23c', { align: 'center' });
  }

  // ---------- end + pause ----------
  function endButtons() {
    return [
      { id: 'again', label: 'RUN IT BACK', rect: { x: W / 2 - 128, y: 162, w: 120, h: 18 } },
      { id: 'title', label: 'MAIN MENU', rect: { x: W / 2 + 8, y: 162, w: 120, h: 18 } }
    ];
  }
  function updateEnd() {
    const inp = SB.input;
    if (S.phaseT < 0.5) return;
    let pick = null;
    for (const t of inp.taps) for (const b of endButtons()) if (SB.inRect(t, b.rect)) pick = b.id;
    if (inp.pressed.start || inp.pressed.action || inp.pressed.restart) pick = 'again';
    if (inp.pressed.title) pick = 'title';
    if (pick === 'again') { S.sessionCounted = false; newDrive(); }
    if (pick === 'title') SB.setScene(SB.menuScene);
  }
  function pauseButtons() {
    return [
      { id: 'resume', label: 'RESUME', rect: { x: W / 2 - 60, y: 80, w: 120, h: 18 } },
      { id: 'restart', label: S.mode === 'quick' ? 'RESTART GAME' : 'RESTART DRIVE', rect: { x: W / 2 - 60, y: 104, w: 120, h: 18 } },
      { id: 'title', label: 'MAIN MENU', rect: { x: W / 2 - 60, y: 128, w: 120, h: 18 } }
    ];
  }
  function updatePause() {
    const inp = SB.input;
    let pick = null;
    for (const t of inp.taps) for (const b of pauseButtons()) if (SB.inRect(t, b.rect)) pick = b.id;
    if (inp.pressed.start || inp.pressed.action) pick = 'resume';
    if (inp.pressed.restart) pick = 'restart';
    if (inp.pressed.title) pick = 'title';
    if (pick === 'resume') S.paused = false;
    if (pick === 'restart') { S.paused = false; if (S.mode === 'quick') newGame(S.g.players); else newDrive(); }
    if (pick === 'title') SB.setScene(SB.menuScene);
  }

  // ---------- drawing ----------
  function drawField(ctx) {
    ctx.fillStyle = '#163f1d'; ctx.fillRect(0, 0, W, H);
    const x0 = S.camX - 26, x1 = S.camX + 26;
    // 5-yard turf stripes
    for (let x = Math.floor(x0 / 5) * 5; x < x1; x += 5) {
      if (x < 0 || x >= 120) continue;
      ctx.fillStyle = x < 10 || x >= 110 ? (x < 10 ? S.offTeam.endzone : S.defTeam.endzone)
        : ((x / 5) % 2 === 0 ? '#2b8a3a' : '#309641');
      ctx.fillRect(sx(x), sy(0), 5 * XS, FW * YS);
    }
    // Endzone text
    if (x0 < 10) F().drawText(ctx, S.offTeam.name, sx(5), sy(CEN) - 7, S.offTeam.helmet, { align: 'center', scale: 2 });
    if (x1 > 110) F().drawText(ctx, S.defTeam.name, sx(115), sy(CEN) - 7, S.defTeam.helmet, { align: 'center', scale: 2 });
    // Yard lines
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let x = 10; x <= 110; x += 5) {
      if (x < x0 || x > x1) continue;
      ctx.fillRect(sx(x), sy(0), x === 10 || x === 110 ? 2 : 1, FW * YS);
    }
    // Hash marks
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (let x = 11; x < 110; x++) {
      if (x < x0 || x > x1 || x % 5 === 0) continue;
      for (const hy of [0.6, 23.6, 29.4, FW - 1.2]) ctx.fillRect(sx(x), sy(hy), 1, 2);
    }
    // Numbers
    for (let x = 20; x <= 100; x += 10) {
      if (x < x0 - 2 || x > x1 + 2) continue;
      const n = x <= 60 ? x - 10 : 110 - x;
      F().drawText(ctx, String(n), sx(x) + 1, sy(5), 'rgba(255,255,255,0.75)', { align: 'center' });
      F().drawText(ctx, String(n), sx(x) + 1, sy(FW - 7.5), 'rgba(255,255,255,0.75)', { align: 'center' });
    }
    // Sidelines
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, sy(0) - 1, W, 1); ctx.fillRect(0, sy(FW), W, 1);
    // Goal posts (back of right endzone)
    if (x1 > 117) {
      const gx = sx(120);
      ctx.fillStyle = '#ffd23c';
      ctx.fillRect(gx, sy(CEN - 3.1), 2, Math.round(6.2 * YS));
      ctx.fillRect(gx, sy(CEN - 3.1) - 18, 2, 18);
      ctx.fillRect(gx, sy(CEN + 3.1) - 18, 2, 18);
    }
    // Line of scrimmage + line to gain
    if (S.phase !== 'end') {
      ctx.fillStyle = '#3d7dff'; ctx.fillRect(sx(S.los), sy(0), 1, FW * YS);
      if (S.firstDownX < 110) { ctx.fillStyle = '#ffd23c'; ctx.fillRect(sx(S.firstDownX), sy(0), 1, FW * YS); }
    }
  }

  function drawPlayers(ctx, time) {
    const list = S.players.slice().sort((a, b) => a.y - b.y);
    const home = S.offTeam, away = S.defTeam;
    const kb = SB.input.lastDevice === 'keyboard';
    for (const p of list) {
      const px = sx(p.x), py = sy(p.y);
      if (px < -10 || px > W + 10) continue;
      let hl = null;
      if (p === S.carrier && S.phase === 'live') hl = '#ffd23c';
      SB.sprites.drawFieldPlayer(ctx, px, py, {
        team: p.team === 'O' ? home : away, facing: p.facing, frame: Math.floor(p.anim) , down: p.down, highlight: hl, skin: p.skin
      });
      if (p.stunT > 0 && S.phase === 'live') { ctx.fillStyle = '#fff'; ctx.fillRect(px - 2 + (Math.floor(time * 10) % 4), py - 16, 1, 1); }
      if (kb && S.qbPhase && S.phase === 'live') {
        const idx = S.receivers.indexOf(p);
        if (idx >= 0) F().drawText(ctx, String(idx + 1), px, py - 22, '#ffd23c', { align: 'center', shadow: '#000' });
      }
    }
    // Ball
    const b = S.ball;
    if (b.state === 'air') {
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(sx(b.x) - 1, sy(b.y), 3, 1);
      SB.sprites.drawBall(ctx, sx(b.x), sy(b.y) - 7 - b.h);
    } else if (b.state === 'held' && S.phase !== 'select' && S.phase !== 'presnap') {
      SB.sprites.drawBall(ctx, sx(b.x), sy(b.y) - 6);
    }
  }

  function drawAim(ctx) {
    const QB = S.P.QB;
    if (S.qbPhase && (S.aiming || S.padAim)) {
      const a = S.aiming ? S.aim : S.padAim;
      const x0 = sx(QB.x), y0 = sy(QB.y) - 8, x1 = sx(a.x), y1 = sy(a.y) - 4;
      const d = dist(QB, a), peak = Math.min(30, 4 + d * 0.85);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 1; i < 14; i++) {
        const f = i / 14;
        ctx.fillRect(Math.round(x0 + (x1 - x0) * f), Math.round(y0 + (y1 - y0) * f - 4 * peak * f * (1 - f)), 1, 1);
      }
      ctx.fillStyle = '#ffd23c';
      ctx.fillRect(x1 - 4, y1, 3, 1); ctx.fillRect(x1 + 2, y1, 3, 1);
      ctx.fillRect(x1, y1 - 3, 1, 2); ctx.fillRect(x1, y1 + 2, 1, 2);
      // Highlight the receiver the assist will target.
      let best = null, bd = 3.6;
      for (const r of S.receivers) { const dd = dist(r, a); if (dd < bd) { bd = dd; best = r; } }
      if (best) { ctx.fillStyle = '#ffd23c'; ctx.fillRect(sx(best.x) - 4, sy(best.y) + 2, 9, 1); }
    }
    const P = SB.input.pointer;
    if (S.stickActive && P.down) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(Math.round(P.startX) - 8, Math.round(P.startY) - 1, 17, 3);
      ctx.fillRect(Math.round(P.startX) - 1, Math.round(P.startY) - 8, 3, 17);
      ctx.fillStyle = 'rgba(255,210,60,0.9)';
      ctx.fillRect(Math.round(P.x) - 2, Math.round(P.y) - 2, 5, 5);
    }
  }

  function drawParticles(ctx) {
    for (const p of S.particles) { ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 2); }
  }

  function drawHUD(ctx, time) {
    // Top scoreboard
    ctx.fillStyle = '#0b0b0e'; ctx.fillRect(0, 0, W, 16);
    ctx.fillStyle = '#f26a1b'; ctx.fillRect(0, 16, W, 1);
    const home = SB.teams.home, away = SB.teams.away;
    const quick = S.mode === 'quick';
    const hs = quick ? S.g.score.home : S.drive.points, as = quick ? S.g.score.away : 0;
    ctx.fillStyle = home.helmet; ctx.fillRect(4, 3, 3, 10);
    F().drawText(ctx, home.name + ' ' + hs, 10, 5, '#ffffff');
    ctx.fillStyle = away.trim; ctx.fillRect(66, 3, 3, 10);
    F().drawText(ctx, away.name + ' ' + as, 72, 5, '#ffffff');
    if (quick) {
      // possession marker
      const px = S.g.poss === 'home' ? 10 + F().textWidth(home.name + ' ' + hs) + 5 : 72 + F().textWidth(away.name + ' ' + as) + 5;
      SB.sprites.drawBall(ctx, px, 8);
      const low = (S.g.q === 2 || S.g.q >= 4) && S.g.clock < 30;
      F().drawText(ctx, (S.g.ot ? 'OT' : 'Q' + S.g.q) + ' ' + clockText(S.g.clock), 168, 5, low ? '#ff5a4f' : '#ffffff', { align: 'center' });
    }
    if (!(quick && (S.phase === 'sim' || S.phase === 'banner' || S.phase === 'final'))) {
      F().drawText(ctx, downText() + ' * ' + spotText(S.los), W - 38, 5, '#ffd23c', { align: 'right' });
    }
    SB.drawSpeaker(ctx, MUTE_BTN.x, MUTE_BTN.y);
    // Pause button
    ctx.fillStyle = '#26262e'; ctx.fillRect(PAUSE_BTN.x, PAUSE_BTN.y, PAUSE_BTN.w, PAUSE_BTN.h);
    ctx.fillStyle = '#e9e2d6'; ctx.fillRect(PAUSE_BTN.x + 5, PAUSE_BTN.y + 3, 2, 6); ctx.fillRect(PAUSE_BTN.x + 9, PAUSE_BTN.y + 3, 2, 6);
    // Sideline strip
    ctx.fillStyle = '#123517'; ctx.fillRect(0, 17, W, sy(0) - 18);
    F().drawText(ctx, (quick ? S.offTeam.name + (S.g.players === 2 ? (S.g.poss === 'home' ? ' (P1)' : ' (P2)') : '') + ' BALL   ' : '') + 'DRIVE  ' + S.drive.plays + ' PLAYS  ' + S.drive.yards + ' YDS', 6, 24, 'rgba(233,226,214,0.75)');
    F().drawText(ctx, 'PASS ' + S.drive.comp + '/' + S.drive.att, W - 6, 24, 'rgba(233,226,214,0.75)', { align: 'right' });
    // Bottom bar
    const by = sy(FW) + 1;
    ctx.fillStyle = '#0b0b0e'; ctx.fillRect(0, by, W, H - by);
    let hint = '';
    const touch = SB.input.lastDevice === 'touch';
    if (S.phase === 'live') {
      if (S.qbPhase) hint = touch ? 'DRAG TO AIM, RELEASE TO THROW. TAP A RECEIVER.' : 'CLICK-DRAG TO AIM  *  1-4 QUICK THROW  *  WASD MOVE';
      else if (S.carrier && S.carrier.team === 'O') {
        const gain = Math.round(S.carrier.x - S.los);
        hint = (S.carrier.name || '#' + S.carrier.num) + ' ' + (gain >= 0 ? '+' : '') + gain + '  ' + (touch ? 'SWIPE: UP/DN JUKE * BACK STUTTER * FWD DIVE' : 'WASD STEER * Q/E JUKE * SHIFT DIVE');
      } else hint = 'BALL IN THE AIR...';
    } else if (S.phase === 'presnap') {
      hint = S.play.type === 'run' ? (touch ? 'HE RUNS ON HIS OWN. SWIPE UP/DOWN, BACK OR FORWARD' : 'RUN: WASD STEER, Q/E JUKE, SHIFT DIVE')
        : (touch ? 'PASS: DRAG TO AIM, RELEASE TO THROW' : 'PASS: CLICK-DRAG TO AIM OR PRESS 1-4');
    } else if (S.phase === 'select') {
      hint = touch ? 'TAP A PLAY' : 'CLICK A PLAY  *  KEYS 1-4  *  ARROWS + ENTER';
    }
    F().drawText(ctx, hint, W / 2, by + 4, '#cfc7b8', { align: 'center' });
  }

  function drawSelect(ctx, time) {
    ctx.fillStyle = 'rgba(5,6,10,0.72)'; ctx.fillRect(0, 30, W, sy(FW) - 29);
    F().drawText(ctx, downText() + '  *  ' + spotText(S.los) + '  *  CALL A PLAY', W / 2, 48, '#ffffff', { align: 'center', shadow: '#000' });
    const opts = options();
    opts.forEach((o, i) => {
      const r = o.rect, focus = i === S.focus;
      ctx.fillStyle = focus ? '#f26a1b' : '#4a4a55'; ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      ctx.fillStyle = focus ? '#1c120b' : '#111116'; ctx.fillRect(r.x, r.y, r.w, r.h);
      if (o.kind === 'play') {
        F().drawText(ctx, o.play.name, r.x + 4, r.y + 4, focus ? '#ffb070' : '#ffffff');
        F().drawText(ctx, o.play.key, r.x + r.w - 4, r.y + 4, '#8a8a96', { align: 'right' });
        miniDiagram(ctx, o.play, r);
        F().drawText(ctx, o.play.type.toUpperCase(), r.x + 4, r.y + r.h - 10, o.play.type === 'run' ? '#7dff8a' : '#8fb3ff');
      } else {
        const label = o.kind === 'fg' ? 'FIELD GOAL ' + o.dist + ' (F)' : 'PUNT (U)';
        F().drawText(ctx, label, r.x + r.w / 2, r.y + 4, focus ? '#ffb070' : '#ffffff', { align: 'center' });
      }
    });
  }

  function miniDiagram(ctx, play, r) {
    const ox = r.x + 14, oy = r.y + 44, k = 1.25;
    ctx.fillStyle = 'rgba(61,125,255,0.6)'; ctx.fillRect(ox, r.y + 14, 1, 58);
    const start = { WR1: [-0.7, 7], WR2: [-0.7, 46.5], TE: [-0.7, CEN + 6.2], RB: [-6.2, play.type === 'run' ? CEN : CEN + 2.6], QB: [-4.5, CEN] };
    const colors = { WR1: '#ffb070', WR2: '#ffffff', TE: '#ffffff', RB: '#7dff8a' };
    const yy = (y) => Math.round(oy + (y - CEN) * k * 0.95);
    const xx = (dx) => Math.round(ox + dx * k);
    ctx.fillStyle = '#e9e2d6';
    for (const o of [-3.2, 0, 3.2]) ctx.fillRect(xx(-0.7) - 1, yy(CEN + o) - 1, 2, 2);
    ctx.fillRect(xx(-4.5) - 1, yy(CEN) - 1, 2, 2);
    for (const slot of ['WR1', 'WR2', 'TE', 'RB']) {
      const [sx0, sy0] = start[slot];
      const inDir = sy0 < CEN ? 1 : -1;
      const pts = [[sx0, sy0]].concat((play.routes[slot].pts || []).map(([dx, din]) => [sx0 + dx, SB.clamp(sy0 + inDir * din, 1, FW - 1)]));
      ctx.fillStyle = colors[slot];
      ctx.fillRect(xx(sx0) - 1, yy(sy0) - 1, 3, 3);
      if (play.type === 'run' && slot === 'RB') {
        for (let i = 0; i < 40; i++) ctx.fillRect(Math.min(r.x + r.w - 4, xx(sx0) + i), yy(sy0), 1, 1);
        continue;
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const n = 30;
        for (let j = 0; j <= n; j++) {
          const f = j / n;
          const px = Math.min(r.x + r.w - 4, xx(a[0] + (b[0] - a[0]) * f));
          const py = SB.clamp(yy(a[1] + (b[1] - a[1]) * f), r.y + 14, r.y + r.h - 14);
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }
  }

  function drawPresnap(ctx, time) {
    if (Math.floor(time * 2.4) % 2 === 0) {
      const touch = SB.input.lastDevice === 'touch';
      F().drawText(ctx, touch ? 'TAP TO SNAP' : 'SPACE / CLICK TO SNAP', W / 2, 46, '#ffffff', { align: 'center', shadow: '#000' });
    }
    F().drawText(ctx, S.play.name, W / 2, 56, '#ffb070', { align: 'center', shadow: '#000' });
  }

  function drawMsg(ctx, time) {
    const m = S.msg;
    const s = m.big ? 3 : 2;
    if (m.big && Math.floor(time * 6) % 2) return drawSub();
    F().drawText(ctx, m.text, W / 2, 92, m.color, { align: 'center', scale: s, shadow: '#000' });
    drawSub();
    function drawSub() { if (m.sub) F().drawText(ctx, m.sub, W / 2, 92 + 9 * s, '#ffffff', { align: 'center', shadow: '#000' }); }
  }

  function drawEnd(ctx) {
    ctx.fillStyle = 'rgba(5,6,10,0.8)'; ctx.fillRect(0, 17, W, H - 17);
    const e = S.endInfo || { title: 'DRIVE OVER', color: '#fff' };
    F().drawText(ctx, 'DRIVE RESULT', W / 2, 40, '#8a8a96', { align: 'center' });
    F().drawText(ctx, e.title, W / 2, 54, e.color, { align: 'center', scale: 2, shadow: '#000' });
    const d = S.drive;
    const rows = [
      ['PLAYS', d.plays], ['TOTAL YARDS', d.yards], ['PASSING', d.comp + '/' + d.att],
      ['POINTS', d.points], ['SESSION', SB.session.drives + ' DRIVES, ' + SB.session.points + ' PTS']
    ];
    rows.forEach(([k, v], i) => {
      F().drawText(ctx, k, W / 2 - 80, 82 + i * 13, '#cfc7b8');
      F().drawText(ctx, String(v), W / 2 + 80, 82 + i * 13, '#ffffff', { align: 'right' });
    });
    for (const b of endButtons()) {
      const r = b.rect;
      ctx.fillStyle = '#f26a1b'; ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      ctx.fillStyle = '#1c120b'; ctx.fillRect(r.x, r.y, r.w, r.h);
      F().drawText(ctx, b.label, r.x + r.w / 2, r.y + 6, '#ffffff', { align: 'center' });
    }
    F().drawText(ctx, 'ENTER / R: RUN IT BACK   *   T: MENU', W / 2, 192, '#8a8a96', { align: 'center' });
  }

  function drawPause(ctx) {
    ctx.fillStyle = 'rgba(5,6,10,0.8)'; ctx.fillRect(0, 0, W, H);
    F().drawText(ctx, 'PAUSED', W / 2, 52, '#ffffff', { align: 'center', scale: 2, shadow: '#000' });
    for (const b of pauseButtons()) {
      const r = b.rect;
      ctx.fillStyle = '#f26a1b'; ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
      ctx.fillStyle = '#1c120b'; ctx.fillRect(r.x, r.y, r.w, r.h);
      F().drawText(ctx, b.label, r.x + r.w / 2, r.y + 6, '#ffffff', { align: 'center' });
    }
  }

  SB.fieldScene = scene;
  SB._debugState = () => S; // test hook
})(window.SB);
