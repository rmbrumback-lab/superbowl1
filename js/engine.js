/* SUPERBOWL1 - canvas, pixel-perfect scaling, unified input, game loop, scenes. */
window.SB = window.SB || {};
(function (SB) {
  'use strict';

  const W = 384, H = 216;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  canvas.width = W;
  canvas.height = H;
  ctx.imageSmoothingEnabled = false;

  // ---- Scaling: fill the screen (minus notch safe areas), keeping 16:9. ----
  // Use a crisp integer pixel multiple when it fills at least 97% of the space;
  // otherwise (typical on phones) scale fractionally so the game fills the screen.
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const cs = getComputedStyle(document.body);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
    const vw = window.innerWidth - (padX || 0), vh = window.innerHeight - (padY || 0);
    const fit = Math.min(vw / W, vh / H);
    const crisp = Math.floor(fit * dpr) / dpr;
    const s = crisp >= fit * 0.97 && crisp > 0 ? crisp : fit;
    canvas.style.width = Math.floor(W * s) + 'px';
    canvas.style.height = Math.floor(H * s) + 'px';
    document.body.classList.toggle('portrait', window.innerHeight > window.innerWidth && window.innerWidth < 900);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 150));
  if (window.visualViewport) window.visualViewport.addEventListener('resize', resize);
  resize();

  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.navigator.standalone === true || (window.matchMedia && window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);

  // ---- Input: touch, mouse, keyboard and gamepad feed one state object. ----
  const input = {
    keys: {}, pressed: {}, released: {},
    pointer: { down: false, x: 0, y: 0, startX: 0, startY: 0, startT: 0, id: null },
    taps: [],      // {x, y} quick taps this frame
    swipes: [],    // {dx, dy} quick flicks this frame
    ups: [],       // {x, y, dx, dy, dt} every pointer release this frame
    downs: [],     // {x, y} every pointer press this frame
    lastDevice: (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ? 'touch' : 'mouse'
  };

  function toGame(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    SB.audioUnlock && SB.audioUnlock();
    input.lastDevice = e.pointerType === 'touch' ? 'touch' : 'mouse';
    const p = toGame(e);
    if (input.pointer.down) return; // track first pointer only
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    Object.assign(input.pointer, { down: true, swiped: false, x: p.x, y: p.y, startX: p.x, startY: p.y, startT: performance.now(), id: e.pointerId });
    input.downs.push({ x: p.x, y: p.y });
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = toGame(e);
    if (input.pointer.down && e.pointerId !== input.pointer.id) return;
    input.pointer.x = p.x; input.pointer.y = p.y;
    if (!input.pointer.down) { input.pointer.hoverX = p.x; input.pointer.hoverY = p.y; return; }
    // Early swipe: a quick flick registers mid-gesture, so jukes feel instant.
    if (!input.pointer.swiped) {
      const dx = p.x - input.pointer.startX, dy = p.y - input.pointer.startY;
      if (performance.now() - input.pointer.startT < 250 && Math.hypot(dx, dy) >= 12) {
        input.swipes.push({ dx, dy }); input.pointer.swiped = true;
      }
    }
  });
  function endPointer(e) {
    SB.audioUnlock && SB.audioUnlock(); // iOS Safari only unlocks audio on touch release
    if (!input.pointer.down || e.pointerId !== input.pointer.id) return;
    const p = toGame(e);
    const dt = performance.now() - input.pointer.startT;
    const dx = p.x - input.pointer.startX, dy = p.y - input.pointer.startY;
    const dist = Math.hypot(dx, dy);
    input.ups.push({ x: p.x, y: p.y, dx, dy, dt });
    if (dt < 260 && dist < 8) input.taps.push({ x: p.x, y: p.y });
    else if (!input.pointer.swiped && dt < 260 && dist >= 14) input.swipes.push({ dx, dy });
    input.pointer.down = false; input.pointer.id = null; input.pointer.swiped = false;
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('touchend', () => SB.audioUnlock && SB.audioUnlock(), { passive: true });
  canvas.addEventListener('click', () => SB.audioUnlock && SB.audioUnlock());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) resize(); });

  const KEYMAP = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    Space: 'action', Enter: 'start', NumpadEnter: 'start', Escape: 'pause', KeyP: 'pause',
    KeyQ: 'jukeUp', KeyE: 'jukeDown', ShiftLeft: 'dive', ShiftRight: 'dive',
    Digit1: 'k1', Digit2: 'k2', Digit3: 'k3', Digit4: 'k4',
    Numpad1: 'k1', Numpad2: 'k2', Numpad3: 'k3', Numpad4: 'k4',
    KeyF: 'fg', KeyU: 'punt', KeyR: 'restart', KeyT: 'title', KeyM: 'mute'
  };
  window.addEventListener('keydown', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    SB.audioUnlock && SB.audioUnlock();
    input.lastDevice = 'keyboard';
    if (!input.keys[a]) input.pressed[a] = true;
    input.keys[a] = true;
  });
  window.addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    input.keys[a] = false;
    input.released[a] = true;
  });
  window.addEventListener('blur', () => { input.keys = {}; });

  // Gamepad (standard mapping) folded into the same actions.
  const padPrev = {};
  function pollGamepad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = pads && pads[0];
    if (!gp) return;
    const map = { 0: 'action', 1: 'jukeDown', 2: 'jukeUp', 3: 'dive', 9: 'pause', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
    for (const b in map) {
      const on = !!(gp.buttons[b] && gp.buttons[b].pressed);
      const a = map[b];
      if (on && !padPrev[b]) { input.pressed[a] = true; if (a === 'action') input.pressed.start = true; input.lastDevice = 'gamepad'; }
      if (!on && padPrev[b]) input.released[a] = true;
      padPrev[b] = on;
    }
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    input.pad = { x: Math.abs(ax) > 0.2 ? ax : 0, y: Math.abs(ay) > 0.2 ? ay : 0 };
    const sx = gp.axes[2] || 0, sy = gp.axes[3] || 0;
    input.padAim = { x: Math.abs(sx) > 0.25 ? sx : 0, y: Math.abs(sy) > 0.25 ? sy : 0 };
    input.padThrow = !!(gp.buttons[7] && gp.buttons[7].pressed);
  }

  function endFrame() {
    input.pressed = {}; input.released = {};
    input.taps.length = 0; input.swipes.length = 0; input.ups.length = 0; input.downs.length = 0;
  }

  // ---- Scenes and loop ----
  let scene = null;
  let paused = false;
  function setScene(s, arg) {
    if (scene && scene.exit) scene.exit();
    scene = s;
    if (scene.enter) scene.enter(arg);
  }

  let last = performance.now();
  let time = 0;
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05; // clamp after tab switches
    pollGamepad();
    if (input.pressed.mute && SB.audio) SB.audio.toggleMute();
    if (scene) {
      if (!paused || scene.allowWhilePaused) { time += dt; scene.update(dt, time); }
      scene.draw(ctx, time);
    }
    endFrame();
    requestAnimationFrame(frame);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && scene && scene.onHide) scene.onHide();
  });

  /** Speaker icon button (13x12). Returns its rect. */
  function drawSpeaker(c, x, y) {
    const muted = SB.audio && SB.audio.isMuted();
    c.fillStyle = '#26262e'; c.fillRect(x, y, 15, 12);
    c.fillStyle = '#e9e2d6';
    c.fillRect(x + 3, y + 4, 2, 4); c.fillRect(x + 5, y + 3, 1, 6); c.fillRect(x + 6, y + 2, 1, 8);
    if (muted) { c.fillStyle = '#ff5a4f'; for (let i = 0; i < 4; i++) { c.fillRect(x + 9 + i, y + 4 + i, 1, 1); c.fillRect(x + 12 - i, y + 4 + i, 1, 1); } }
    else { c.fillRect(x + 9, y + 4, 1, 4); c.fillRect(x + 11, y + 3, 1, 6); }
    return { x, y, w: 15, h: 12 };
  }

  // Small helpers shared by scenes.
  function inRect(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  SB.W = W; SB.H = H; SB.ctx = ctx; SB.canvas = canvas;
  SB.input = input; SB.setScene = setScene; SB.drawSpeaker = drawSpeaker; SB.isIOS = isIOS; SB.standalone = standalone; SB.inRect = inRect; SB.rand = rand; SB.clamp = clamp;
  SB.start = function (firstScene) { setScene(firstScene); requestAnimationFrame((t) => { last = t; frame(t); }); };
})(window.SB);
