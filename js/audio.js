/* SUPERBOWL1 - synthesized audio: SFX, chiptune music, crowd bed. No audio files. */
window.SB = window.SB || {};
(function (SB) {
  'use strict';

  let ac = null, master, sfxG, musG, crowdG, noiseBuf, brownBuf;
  let muted = false;
  try { muted = localStorage.getItem('sb1.muted') === '1'; } catch (e) { /* storage blocked */ }
  let wantMusic = null, musicTimer = null, musicStep = 0, nextNoteT = 0;
  let crowdBase = 0;

  let htmlAudio = null;

  /** A short silent WAV, used to switch iOS into "playback" audio so the silent switch doesn't mute the game. */
  function silentWav() {
    const n = 2205, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 22050, true); v.setUint32(28, 22050, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    w(36, 'data'); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    let bin = ''; const u = new Uint8Array(buf);
    for (let i = 0; i < u.length; i++) bin += String.fromCharCode(u[i]);
    return 'data:audio/wav;base64,' + btoa(bin);
  }

  /** Called on every press/release. iOS requires audio to start inside a user gesture. */
  function unlock() {
    // iOS 17+: play through the silent switch like a game/video would.
    try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) { /* unsupported */ }
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { ac = new AC(); } catch (e) { return; }
      build();
    }
    if (ac.state !== 'running') {
      try { ac.resume(); } catch (e) { /* ignore */ }
      // Starting a (silent) sound inside the gesture is what actually unlocks iOS Safari.
      try {
        const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource();
        s.buffer = b; s.connect(ac.destination); s.start(0);
      } catch (e) { /* ignore */ }
    }
    // Older iOS: a looping silent <audio> element moves the page to the playback session.
    if (SB.isIOS && !htmlAudio) {
      try {
        htmlAudio = new Audio(silentWav());
        htmlAudio.loop = true;
        htmlAudio.setAttribute('playsinline', '');
        htmlAudio.setAttribute('x-webkit-airplay', 'deny');
        const p = htmlAudio.play();
        if (p && p.catch) p.catch(() => { htmlAudio = null; });
      } catch (e) { htmlAudio = null; }
    }
  }

  function mkGain(v, dest) { const g = ac.createGain(); g.gain.value = v; g.connect(dest); return g; }

  function build() {
    master = mkGain(muted ? 0 : 0.8, ac.destination);
    sfxG = mkGain(0.5, master);
    musG = mkGain(0.22, master);
    crowdG = mkGain(crowdBase, master);
    const n = ac.sampleRate * 2;
    noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
    brownBuf = ac.createBuffer(1, n, ac.sampleRate);
    const w = noiseBuf.getChannelData(0), b = brownBuf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const r = Math.random() * 2 - 1;
      w[i] = r;
      last = (last + 0.02 * r) / 1.02;
      b[i] = last * 3.5;
    }
    // Crowd bed: looping brown noise through a band-pass, level set by crowd().
    const src = ac.createBufferSource();
    src.buffer = brownBuf; src.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 650; bp.Q.value = 0.5;
    src.connect(bp); bp.connect(crowdG); src.start();
    if (wantMusic) startMusic();
  }

  const now = () => ac.currentTime;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function tone(type, f0, f1, t0, dur, vol, dest) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || sfxG);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  function noise(t0, dur, vol, type, f0, f1, q, dest) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest || sfxG);
    s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.02);
  }

  function arp(notes, step, type, vol, t0) {
    notes.forEach((m, i) => { if (m) tone(type || 'square', mtof(m), mtof(m), t0 + i * step, step * 0.95, vol || 0.18); });
  }

  // ---- Sound effects ----
  const SFX = {
    blip: (t) => tone('square', 880, 880, t, 0.05, 0.12),
    confirm: (t) => { tone('square', 660, 660, t, 0.06, 0.15); tone('square', 990, 990, t + 0.06, 0.08, 0.15); },
    whistle: (t) => {
      const o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
      o.type = 'sine'; o.frequency.value = 2850;
      lfo.frequency.value = 32; lg.gain.value = 0.12;
      lfo.connect(lg); lg.connect(g.gain);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
      g.gain.setValueAtTime(0.16, t + 0.28); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
      o.connect(g); g.connect(sfxG);
      o.start(t); lfo.start(t); o.stop(t + 0.4); lfo.stop(t + 0.4);
    },
    hike: (t) => { noise(t, 0.09, 0.4, 'bandpass', 1300, 900, 2); tone('square', 150, 110, t, 0.07, 0.15); },
    throw: (t) => noise(t, 0.28, 0.22, 'bandpass', 400, 2200, 1.5),
    catch: (t) => { tone('triangle', 240, 110, t, 0.09, 0.45); noise(t, 0.03, 0.2, 'highpass', 3000, 3000, 1); },
    tackle: (t) => { noise(t, 0.2, 0.65, 'lowpass', 1000, 180, 1); tone('square', 95, 50, t, 0.13, 0.25); },
    juke: (t) => noise(t, 0.08, 0.18, 'highpass', 2500, 5000, 1),
    firstDown: (t) => arp([72, 76, 79], 0.07, 'square', 0.16, t),
    incomplete: (t) => tone('square', 440, 200, t, 0.22, 0.14),
    turnover: (t) => { tone('sawtooth', 190, 80, t, 0.4, 0.2); tone('sawtooth', 140, 60, t + 0.05, 0.4, 0.15); },
    goodNews: (t) => arp([67, 72, 76, 79, 84], 0.07, 'square', 0.16, t),
    badNews: (t) => arp([64, 60, 55, 52], 0.11, 'triangle', 0.3, t),
    touchdown: (t) => {
      arp([72, 76, 79, 84, 0, 79, 84, 84], 0.11, 'square', 0.17, t);
      arp([48, 0, 55, 0, 60, 0, 55, 60], 0.11, 'triangle', 0.35, t);
      swell(0.4, 2.6);
    },
    kick: (t) => { tone('sine', 140, 55, t, 0.14, 0.7); noise(t, 0.05, 0.3, 'lowpass', 1500, 400, 1); },
    fgGood: (t) => { arp([72, 79, 84], 0.09, 'square', 0.16, t); swell(0.3, 2); },
    noGood: (t) => arp([67, 63, 60], 0.13, 'square', 0.14, t),
    horn: (t) => {
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900; f.connect(sfxG);
      tone('sawtooth', 220, 220, t, 1.0, 0.22, f); tone('sawtooth', 277, 277, t, 1.0, 0.18, f);
    },
    tick: (t) => tone('square', 1600, 1600, t, 0.025, 0.07),
    cheer: () => swell(0.28, 1.6)
  };

  function play(name) {
    if (!ac || muted) return;
    const f = SFX[name];
    if (f) { try { f(now() + 0.005); } catch (e) { /* ignore */ } }
  }

  function swell(peak, secs) {
    if (!ac) return;
    const t = now(), g = crowdG.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(peak, t + 0.25);
    g.linearRampToValueAtTime(crowdBase, t + secs);
  }

  function crowd(level) {
    crowdBase = level;
    if (!ac) return;
    const t = now();
    crowdG.gain.cancelScheduledValues(t);
    crowdG.gain.setValueAtTime(crowdG.gain.value, t);
    crowdG.gain.linearRampToValueAtTime(level, t + 0.6);
  }

  // ---- Music: original 4-bar chiptune loop ----
  const BPM = 132, STEP = 60 / BPM / 4;
  const LEAD = [
    64, 0, 67, 0, 72, 0, 71, 72, 74, 0, 72, 0, 67, 0, 64, 0,
    65, 0, 69, 0, 72, 0, 74, 0, 76, 0, 74, 0, 72, 0, 69, 0,
    67, 0, 71, 0, 74, 0, 72, 71, 69, 0, 67, 0, 71, 0, 74, 0,
    72, 0, 0, 0, 76, 0, 74, 72, 71, 0, 67, 0, 72, 0, 0, 0
  ];
  const BASS = [36, 41, 43, 36];

  function scheduleStep(i, t) {
    const s = i % 64, bar = Math.floor(s / 16), inBar = s % 16;
    const m = LEAD[s];
    if (m) tone('square', mtof(m), mtof(m), t, STEP * 1.8, 0.11, musG);
    if (inBar % 2 === 0) {
      const root = BASS[bar] + (inBar % 4 === 2 ? 12 : 0);
      tone('triangle', mtof(root), mtof(root), t, STEP * 1.7, 0.32, musG);
    }
    if (inBar % 8 === 0) tone('sine', 150, 50, t, 0.12, 0.5, musG);
    if (inBar % 8 === 4) noise(t, 0.09, 0.25, 'highpass', 1800, 1800, 0.7, musG);
    if (inBar % 2 === 1) noise(t, 0.025, 0.08, 'highpass', 7000, 7000, 0.7, musG);
  }

  function startMusic() {
    if (!ac || musicTimer) return;
    musicStep = 0; nextNoteT = now() + 0.1;
    musicTimer = setInterval(() => {
      while (nextNoteT < now() + 0.15) {
        if (!muted) scheduleStep(musicStep, nextNoteT);
        musicStep++; nextNoteT += STEP;
      }
    }, 25);
  }
  function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }

  function music(name) {
    wantMusic = name;
    if (!name) return stopMusic();
    if (ac) startMusic();
  }

  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('sb1.muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
    if (ac) master.gain.setValueAtTime(muted ? 0 : 0.8, now());
    return muted;
  }

  SB.audio = { unlock, play, crowd, swell, music, toggleMute, isMuted: () => muted, state: () => (ac ? ac.state : 'none') };
  SB.audioUnlock = unlock;
})(window.SB);
