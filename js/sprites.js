/* SUPERBOWL1 - procedural pixel-art sprites (no image files needed). */
window.SB = window.SB || {};
(function (SB) {
  'use strict';

  const OUT = '#070707';

  /** Render a list of parts [x, y, w, h, color, outline?] in two passes (outline, fill). */
  function renderParts(ctx, parts, ox, oy, u) {
    ctx.fillStyle = OUT;
    for (const p of parts) {
      if (p[5]) ctx.fillRect(ox + (p[0] - 1) * u, oy + (p[1] - 1) * u, (p[2] + 2) * u, (p[3] + 2) * u);
    }
    for (const p of parts) {
      ctx.fillStyle = p[4];
      ctx.fillRect(ox + p[0] * u, oy + p[1] * u, p[2] * u, p[3] * u);
    }
  }

  /**
   * Featured-duo player, front facing, 32x56 sprite units.
   * st: { breath: 0|1, look: -1|0|1, fidget: bool, celebrate: bool, frame: int }
   */
  function drawDuoPlayer(ctx, cx, footY, u, P, U, st) {
    const ox = Math.round(cx - 16 * u), oy = Math.round(footY - 56 * u);
    const b = st.breath ? -1 : 0;
    const L = st.look || 0;
    const parts = [];
    const add = (x, y, w, h, c, o) => parts.push([x, y, w, h, c, o]);
    const up = (x, y, w, h, c, o) => parts.push([x, y + b, w, h, c, o]);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.38)';
    ctx.fillRect(ox + 4 * u, oy + 55 * u, 24 * u, 2 * u);
    ctx.fillRect(ox + 7 * u, oy + 54 * u, 18 * u, 1 * u);

    // ---- Legs (static, except the WR celebration shuffle) ----
    let lLift = 0, rLift = 0, lx = 0, rx = 0;
    if (st.celebrate && P.pose === 'wr') {
      if (st.frame % 2 === 0) { lLift = -3; lx = 1; } else { rLift = -3; rx = -1; }
    }
    add(8 + lx, 52 + lLift, 7, 4, U.cleat, true);
    add(17 + rx, 52 + rLift, 7, 4, U.cleat, true);
    add(9 + lx, 42 + lLift, 5, 10, U.sock, true);
    add(18 + rx, 42 + rLift, 5, 10, U.sock, true);
    add(9 + lx, 45 + lLift, 5, 1, U.sockBand);
    add(18 + rx, 45 + rLift, 5, 1, U.sockBand);
    add(8 + lx, 34 + lLift, 7, 8, U.pants, true);
    add(17 + rx, 34 + rLift, 7, 8, U.pants, true);
    add(8, 29, 16, 7, U.pants, true);
    add(8 + lx, 34 + lLift, 1, 8, U.trim);
    add(23 + rx, 34 + rLift, 1, 8, U.trim);
    add(8, 30, 1, 5, U.trim);
    add(23, 30, 1, 5, U.trim);
    add(14 + lx, 36 + lLift, 1, 6, U.pantsShade);
    add(17 + rx, 36 + rLift, 1, 6, U.pantsShade);
    add(8, 29, 16, 1, '#202020');

    // ---- Upper body (moves with breathing) ----
    up(8, 17, 16, 13, U.jersey, true);
    up(5, 13, 22, 1, U.jersey, true);
    up(4, 14, 24, 6, U.jersey, true);
    up(4, 19, 4, 1, U.trim);
    up(24, 19, 4, 1, U.trim);
    up(9, 26, 14, 1, U.jerseyShade);
    up(14, 11, 4, 3, P.skinShade);
    up(13, 13, 6, 1, U.trim);
    up(14, 14, 4, 1, U.trim);

    if (P.pose === 'qb') {
      // Viewer-left arm holds the ball at the hip.
      up(4, 20, 4, 7, P.skin, true);
      up(4, 27, 4, 3, P.skin, true);
      if (st.fidget && st.frame % 2 === 1) {
        up(2, 24, 4, 7, '#7a3f1a', true);
        up(3, 26, 2, 1, '#f4f4f4'); up(3, 28, 2, 1, '#f4f4f4');
      } else {
        up(0, 26, 7, 4, '#7a3f1a', true);
        up(2, 27, 3, 1, '#f4f4f4');
      }
      if (st.celebrate) {
        // Viewer-right arm raised, pointing downfield.
        up(24, 7, 4, 7, U.jersey, true);
        up(24, 1, 4, 6, P.skin, true);
        up(25, -2, 2, 3, P.skin, true);
        up(24, 6, 4, 1, U.trim);
      } else {
        up(24, 20, 4, 7, P.skin, true);
        up(24, 27, 4, 3, P.skin, true);
        up(24, 26, 4, 1, '#f4f4f4');
      }
      // Helmet on.
      up(10, 1, 12, 10, U.helmet, true);
      up(12, 0, 8, 1, U.helmet, true);
      up(10, 9, 12, 1, U.helmetShade);
      up(15, 0, 2, 7, U.stripe);
      up(10, 6, 1, 1, '#222');
      up(21, 6, 1, 1, '#222');
      up(12, 5, 8, 6, P.skin);
      up(13 + L, 6, 2, 1, '#111');
      up(17 + L, 6, 2, 1, '#111');
      up(13 + L, 7, 2, 1, '#1a1a1a'); // eye black
      up(17 + L, 7, 2, 1, '#1a1a1a');
      up(11, 8, 10, 1, U.facemask);
      up(11, 10, 10, 1, U.facemask);
      up(12 + L, 5, 1, 6, U.facemask);
      up(19 + L, 5, 1, 6, U.facemask);
      up(14, 11, 4, 1, U.facemask);
    } else {
      // WR: helmet tucked under viewer-right arm, head bare.
      const gy = st.fidget ? -4 : 0;
      up(4, 20 + gy, 4, 6, P.skin, true);
      up(4, 26 + gy, 4, 4, U.glove, true);
      up(4, 26 + gy, 4, 1, U.gloveTrim);
      // Tucked helmet (side view).
      up(24, 21, 8, 8, U.helmet, true);
      up(25, 20, 6, 1, U.helmet, true);
      up(27, 20, 2, 7, U.stripe);
      up(24, 28, 8, 1, U.helmetShade);
      up(29, 25, 1, 1, '#222');
      up(21, 23, 3, 5, U.facemask, true);
      up(24, 20, 4, 3, P.skin, true);
      up(23, 26, 5, 3, U.glove, true);
      up(23, 26, 5, 1, U.gloveTrim);
      // Head.
      up(10, 5, 1, 3, P.skin, true);
      up(21, 5, 1, 3, P.skin, true);
      up(11, 1, 10, 10, P.skin, true);
      up(11, 0, 10, 3, P.hair, true);
      up(11, 3, 1, 3, P.hair);
      up(20, 3, 1, 3, P.hair);
      up(13 + L, 6, 2, 1, '#111');
      up(17 + L, 6, 2, 1, '#111');
      up(15, 9, 2, 1, P.skinShade);
      up(12, 10, 8, 1, P.skinShade);
    }
    renderParts(ctx, parts, ox, oy, u);

    // Chest number (drawn last so it sits on the jersey).
    SB.font.drawDigits(ctx, P.number, ox + 16 * u, oy + (19 + b) * u, U.number, u * 2 > 4 ? 2 : u);
  }

  /**
   * Small on-field player (7x12), feet anchored at (sx, sy).
   * opts: { team, facing (1|-1), frame, down, highlight }
   */
  function drawFieldPlayer(ctx, sx, sy, opts) {
    const T = opts.team, f = opts.facing || 1, fr = opts.frame || 0;
    const x0 = Math.round(sx - 3), y0 = Math.round(sy - 12);
    ctx.fillStyle = 'rgba(0,0,0,0.33)';
    ctx.fillRect(x0 - 1, y0 + 11, 9, 2);

    if (opts.down) {
      // Lying on the turf.
      ctx.fillStyle = OUT; ctx.fillRect(x0 - 3, y0 + 7, 14, 5);
      ctx.fillStyle = T.jersey; ctx.fillRect(x0 - 2, y0 + 8, 7, 3);
      ctx.fillStyle = T.pants; ctx.fillRect(x0 + 5, y0 + 8, 3, 3);
      ctx.fillStyle = T.helmet; ctx.fillRect(f > 0 ? x0 + 8 : x0 - 2, y0 + 8, 2, 3);
      return;
    }

    const leg = fr % 2;
    ctx.fillStyle = OUT;
    ctx.fillRect(x0, y0 - 1, 7, 4);
    ctx.fillRect(x0 - 1, y0 + 3, 9, 6);
    ctx.fillRect(x0, y0 + 9, 7, 3);
    // helmet
    ctx.fillStyle = T.helmet; ctx.fillRect(x0 + 1, y0, 5, 3);
    ctx.fillStyle = T.trim; ctx.fillRect(x0 + 3, y0, 1, 1);
    ctx.fillStyle = '#c7ccd2'; ctx.fillRect(f > 0 ? x0 + 5 : x0 + 1, y0 + 1, 1, 2);
    // jersey + arms
    ctx.fillStyle = T.jersey; ctx.fillRect(x0, y0 + 3, 7, 5);
    ctx.fillStyle = T.trim; ctx.fillRect(x0, y0 + 4, 7, 1);
    ctx.fillStyle = opts.skin || '#b07a52';
    ctx.fillRect(leg ? x0 - 1 : x0 + 7 - 1 + 1, y0 + 6, 1, 2);
    // pants
    ctx.fillStyle = T.pants; ctx.fillRect(x0 + 1, y0 + 8, 5, 2);
    // legs (2-frame stride)
    ctx.fillStyle = '#151515';
    if (leg) { ctx.fillRect(x0, y0 + 10, 2, 2); ctx.fillRect(x0 + 5, y0 + 10, 2, 2); }
    else { ctx.fillRect(x0 + 1, y0 + 10, 2, 2); ctx.fillRect(x0 + 4, y0 + 10, 2, 2); }

    if (opts.highlight) {
      ctx.fillStyle = opts.highlight;
      ctx.fillRect(x0 + 2, y0 - 5, 3, 1);
      ctx.fillRect(x0 + 3, y0 - 4, 1, 1);
    }
  }

  function drawBall(ctx, sx, sy) {
    ctx.fillStyle = OUT; ctx.fillRect(Math.round(sx) - 2, Math.round(sy) - 1, 5, 3);
    ctx.fillStyle = '#8a4a1f'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 3, 2);
    ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(sx), Math.round(sy) - 1, 1, 1);
  }

  SB.sprites = { drawDuoPlayer, drawFieldPlayer, drawBall };
})(window.SB);
