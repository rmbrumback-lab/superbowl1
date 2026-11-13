/* SUPERBOWL1 - Madden-style idle loading scene with the featured duo. */
window.SB = window.SB || {};
(function (SB) {
  'use strict';

  const W = 384, H = 216;
  const F = () => SB.font;

  // Pre-generated scenery (random once, then stable).
  const stars = [];
  const crowd = [];
  const CROWD_W = 384;
  const CROWD_COLORS = ['#f26a1b', '#151515', '#e9e2d6', '#f26a1b', '#2b2b33', '#c9541a', '#ffffff', '#3a3a46'];
  function buildScenery() {
    stars.length = 0; crowd.length = 0;
    for (let i = 0; i < 46; i++) stars.push({ x: Math.random() * W | 0, y: (Math.random() * 54) | 0, p: Math.random() * 6.28, r: 0.6 + Math.random() * 2 });
    for (let y = 76; y < 110; y += 3) {
      for (let x = 0; x < CROWD_W; x += 3) {
        crowd.push({ x: x + ((Math.random() * 2) | 0), y: y + ((Math.random() * 2) | 0), c: CROWD_COLORS[(Math.random() * CROWD_COLORS.length) | 0], p: Math.random() });
      }
    }
  }

  const steps = [
    { label: 'BUILDING SPRITES', fn: buildScenery },
    { label: 'PAINTING THE FIELD', fn: () => {} },
    { label: 'SCOUTING THE GULLS', fn: () => {} },
    { label: 'LOADING PLAYBOOK', fn: () => { if (!SB.playbook || !SB.playbook.length) throw new Error('Playbook missing'); } },
    { label: 'READY', fn: () => {} }
  ];

  const scene = {
    enter() {
      this.t = 0;
      this.stepIdx = 0;
      this.loaded = false;
      this.shownProgress = 0;
      this.celebrateUntil = 0;
      this.tipIdx = (Math.random() * SB.tips.length) | 0;
      this.nextTip = 4.5;
      this.idle = {
        left: { nextFidget: SB.rand(2, 5), fidgetEnd: 0, nextLook: SB.rand(6, 9), lookEnd: 0 },
        right: { nextFidget: SB.rand(3, 7), fidgetEnd: 0, nextLook: 999, lookEnd: 0 }
      };
      if (!stars.length) buildScenery();
      SB.audio.music('title');
      SB.audio.crowd(0.03);
    },

    update(dt) {
      this.t += dt;
      const t = this.t;

      // Real loading steps, one per frame; display is paced by a minimum time.
      if (this.stepIdx < steps.length) {
        steps[this.stepIdx].fn();
        this.stepIdx++;
      }
      const real = this.stepIdx / steps.length;
      const paced = Math.min(1, t / SB.tuning.loadingMinSeconds);
      const target = Math.min(real, paced);
      this.shownProgress += (target - this.shownProgress) * Math.min(1, dt * 6);
      if (target >= 1 && this.shownProgress > 0.985 && !this.loaded) {
        this.loaded = true;
        this.shownProgress = 1;
        this.celebrateUntil = t + 1.8;
        this.readyAt = t;
      }

      // Idle behaviour: fidgets, glances, and the WR nodding back.
      const L = this.idle.left, R = this.idle.right;
      if (t > L.nextFidget) { L.fidgetEnd = t + 1.0; L.nextFidget = t + SB.rand(4, 8); }
      if (t > R.nextFidget) { R.fidgetEnd = t + 0.9; R.nextFidget = t + SB.rand(4, 8); }
      if (t > L.nextLook) { L.lookEnd = t + 1.2; L.nextLook = t + SB.rand(10, 15); R.nextLook = t + 0.35; }
      if (t > R.nextLook) { R.lookEnd = t + 0.9; R.nextLook = 1e9; }

      if (t > this.nextTip) { this.tipIdx = (this.tipIdx + 1) % SB.tips.length; this.nextTip = t + 4.5; }

      // Start the game.
      const inp = SB.input;
      if (this.loaded && t - this.readyAt > 0.4 && (inp.taps.length || inp.pressed.start || inp.pressed.action)) {
        SB.audio.play('confirm');
        SB.setScene(SB.menuScene);
      }
    },

    draw(ctx) {
      const t = this.t;
      drawBackground(ctx, t);

      // Title block
      F().drawText(ctx, 'SUPERBOWL1', 10, 8, '#f26a1b', { scale: 2, shadow: '#2a1205' });
      F().drawText(ctx, 'FRANCHISE MODE', 11, 26, '#e9e2d6', { shadow: '#000' });
      F().drawText(ctx, 'NEW FRANCHISE', W - 10, 9, '#e9e2d6', { align: 'right', shadow: '#000' });
      F().drawText(ctx, 'YEAR 1 * WEEK 1', W - 10, 19, '#f2a46b', { align: 'right', shadow: '#000' });

      // Featured duo
      const duo = SB.featuredDuo, U = duo.uniform;
      const celebrate = t < this.celebrateUntil;
      const fr = Math.floor(t * 8);
      const L = this.idle.left, R = this.idle.right;
      SB.sprites.drawDuoPlayer(ctx, 143, 162, 2, duo.left, U, {
        breath: Math.floor(t * 1.3) % 2, look: t < L.lookEnd ? 1 : 0,
        fidget: t < L.fidgetEnd, celebrate, frame: Math.floor(t * 6)
      });
      SB.sprites.drawDuoPlayer(ctx, 241, 162, 2, duo.right, U, {
        breath: Math.floor(t * 1.3 + 0.5) % 2, look: t < R.lookEnd ? -1 : 0,
        fidget: t < R.fidgetEnd, celebrate, frame: fr
      });

      plate(ctx, 143, duo.left);
      plate(ctx, 241, duo.right);

      // Tip line
      const tip = 'TIP: ' + SB.tips[this.tipIdx];
      F().drawText(ctx, tip.slice(0, 62), W / 2, 188, '#cfc7b8', { align: 'center', shadow: '#000' });

      // Progress bar or start prompt
      if (!this.loaded) {
        const segs = 20, sw = 8, gap = 2, bw = segs * (sw + gap) - gap, bx = Math.round(W / 2 - bw / 2) - 14, by = 198;
        const filled = Math.floor(this.shownProgress * segs + 0.0001);
        for (let i = 0; i < segs; i++) {
          ctx.fillStyle = '#000';
          ctx.fillRect(bx + i * (sw + gap) - 1, by - 1, sw + 2, 8);
          ctx.fillStyle = i < filled ? (i === filled - 1 ? '#ffb070' : '#f26a1b') : '#2a2a32';
          ctx.fillRect(bx + i * (sw + gap), by, sw, 6);
        }
        F().drawText(ctx, Math.round(this.shownProgress * 100) + '%', bx + bw + 8, by - 1, '#e9e2d6', { shadow: '#000' });
      } else if (Math.floor(t * 2.2) % 2 === 0) {
        const msg = SB.input.lastDevice === 'touch' ? 'TAP TO START' : 'PRESS START  (ENTER / CLICK)';
        F().drawText(ctx, msg, W / 2, 198, '#ffffff', { align: 'center', shadow: '#7a2e05' });
      }
      if (SB.copyright) {
        F().drawText(ctx, SB.copyright, W / 2, 208, '#9a8f80', { align: 'center', shadow: '#000' });
      }
    }
  };

  function plate(ctx, cx, P) {
    const w = 96, h = 18, x = Math.round(cx - w / 2), y = 166;
    ctx.fillStyle = '#f26a1b'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#0d0d0f'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#f26a1b'; ctx.fillRect(x, y, 3, h);
    F().drawText(ctx, '#' + P.number + '  ' + P.position, cx + 1, y + 2, '#f26a1b', { align: 'center' });
    F().drawText(ctx, P.name, cx + 1, y + 10, '#ffffff', { align: 'center' });
  }

  function drawBackground(ctx, t) {
    // Night sky in dithered bands.
    const sky = ['#070b1c', '#0a0f25', '#0e1330', '#13163a', '#1a1840', '#221a45', '#2b1c47', '#341e46'];
    for (let i = 0; i < sky.length; i++) { ctx.fillStyle = sky[i]; ctx.fillRect(0, i * 9, W, 9); }
    for (const s of stars) {
      const tw = Math.sin(t * s.r + s.p);
      ctx.fillStyle = tw > 0.55 ? '#ffffff' : tw > -0.2 ? '#8f95b8' : '#3b3f60';
      ctx.fillRect(s.x, s.y, 1, 1);
    }

    // Stadium light towers with flicker and glow.
    tower(ctx, 34, t, 0);
    tower(ctx, W - 34, t, 1.7);

    // Upper deck + ribbon board.
    ctx.fillStyle = '#14141c'; ctx.fillRect(0, 60, W, 52);
    ctx.fillStyle = '#c24f0e'; ctx.fillRect(0, 64, W, 9);
    ctx.fillStyle = '#1b0b03'; ctx.fillRect(0, 65, W, 7);
    const board = '  RIVER CITY TIGERS  *  FRANCHISE MODE  *  YOUR CALL. YOUR LEGACY.  *';
    const bw = SB.font.textWidth(board);
    const off = -((t * 18) % bw);
    SB.font.drawText(ctx, board, Math.round(off), 65, '#ff8a3d');
    SB.font.drawText(ctx, board, Math.round(off + bw), 65, '#ff8a3d');

    // Crowd with 2-frame shimmer and slow parallax.
    const pan = (t * 0.3) % 3;
    const beat = Math.floor(t * 4);
    for (let i = 0; i < crowd.length; i++) {
      const c = crowd[i];
      const hop = ((i * 7 + beat) % 11 === 0) ? -1 : 0;
      ctx.fillStyle = c.c;
      ctx.fillRect((c.x - pan + CROWD_W) % CROWD_W, c.y + hop, 2, 2);
    }
    for (let y = 75; y < 112; y += 9) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, y, W, 1); }
    ctx.fillStyle = '#2a2a33'; ctx.fillRect(0, 110, W, 3);
    ctx.fillStyle = '#f26a1b'; ctx.fillRect(0, 112, W, 1);

    // Field with perspective yard lines and a slow pan.
    const greens = ['#1f6b2c', '#237a32'];
    for (let y = 113, i = 0; y < H; i++) {
      const h = 6 + i * 2;
      ctx.fillStyle = greens[i % 2];
      ctx.fillRect(0, y, W, h);
      y += h;
    }
    const vpY = 40, top = 113, span = H - top;
    const spacing = 44;
    const shift = (t * 0.5) % spacing;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let k = -6; k < 16; k++) {
      const xb = k * spacing + shift - 40;
      for (let y = top; y < H; y++) {
        const f = (y - vpY) / (H - vpY);
        const x = W / 2 + (xb - W / 2) * f;
        ctx.fillRect(Math.round(x), y, 1, 1);
      }
    }
    // Light haze from the towers.
    ctx.fillStyle = 'rgba(255,236,200,0.05)';
    ctx.fillRect(0, 113, W, span);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(0, H - 30, W, 30);
  }

  function tower(ctx, x, t, ph) {
    const y = 34; // below the title block
    ctx.fillStyle = '#3a3d48'; ctx.fillRect(x - 1, y + 10, 2, 20);
    ctx.fillStyle = '#23252e'; ctx.fillRect(x - 11, y, 22, 11);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 4; c++) {
        const flick = Math.sin(t * 9 + c * 1.3 + r * 2 + ph) > 0.97;
        ctx.fillStyle = flick ? '#b9a87a' : (c + r) % 2 ? '#fff6d6' : '#ffffff';
        ctx.fillRect(x - 9 + c * 5, y + 2 + r * 4, 4, 3);
      }
    }
    ctx.fillStyle = 'rgba(255,245,210,0.06)';
    ctx.fillRect(x - 22, y - 6, 44, 24);
    ctx.fillStyle = 'rgba(255,245,210,0.05)';
    ctx.fillRect(x - 34, y - 12, 68, 36);
  }

  SB.loadingScene = scene;
  SB.drawStadium = drawBackground;
  SB.drawNamePlate = plate;
})(window.SB);
