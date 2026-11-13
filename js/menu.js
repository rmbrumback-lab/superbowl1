/* SUPERBOWL1 - main menu. */
window.SB = window.SB || {};
(function (SB) {
  'use strict';
  const W = 384;
  const F = () => SB.font;
  const SPK = { x: W - 19, y: 4, w: 15, h: 12 };

  function items() {
    return [
      { id: 'q1', label: 'QUICK GAME  -  1P VS CPU', sub: '4 X 2:00 QUARTERS. YOU PLAY OFFENSE, CPU DRIVES ARE SIMULATED.' },
      { id: 'q2', label: 'QUICK GAME  -  2P PASS & PLAY', sub: 'TWO PLAYERS, ONE DEVICE. EACH PLAYS THEIR OWN OFFENSE.' },
      { id: 'drive', label: 'DRIVE PRACTICE', sub: 'ONE DRIVE FROM YOUR 25. NO CLOCK.' },
      { id: 'sound', label: 'SOUND: ' + (SB.audio.isMuted() ? 'OFF' : 'ON'), sub: 'M KEY TOGGLES SOUND ANYWHERE.' }
    ].map((it, i) => Object.assign(it, { rect: { x: W / 2 - 110, y: 70 + i * 24, w: 220, h: 18 } }));
  }

  function pick(id) {
    if (id === 'sound') { SB.audio.toggleMute(); SB.audio.play('blip'); return; }
    SB.audio.play('confirm');
    if (id === 'q1') SB.setScene(SB.fieldScene, { mode: 'quick', players: 1 });
    if (id === 'q2') SB.setScene(SB.fieldScene, { mode: 'quick', players: 2 });
    if (id === 'drive') SB.setScene(SB.fieldScene, { mode: 'drive' });
  }

  const scene = {
    enter() {
      this.t = 0; this.focus = this.focus || 0;
      SB.audio.music('title');
      SB.audio.crowd(0.03);
    },
    update(dt) {
      this.t += dt;
      const inp = SB.input, list = items();
      if (inp.pressed.down || inp.pressed.right) { this.focus = (this.focus + 1) % list.length; SB.audio.play('blip'); }
      if (inp.pressed.up || inp.pressed.left) { this.focus = (this.focus - 1 + list.length) % list.length; SB.audio.play('blip'); }
      const hv = inp.pointer.hoverX != null ? { x: inp.pointer.hoverX, y: inp.pointer.hoverY } : null;
      if (hv && inp.lastDevice === 'mouse') list.forEach((it, i) => { if (SB.inRect(hv, it.rect)) this.focus = i; });
      if (this.t > 0.3 && (inp.pressed.start || inp.pressed.action)) return pick(list[this.focus].id);
      for (const t of inp.taps) {
        if (SB.inRect(t, SPK)) { SB.audio.toggleMute(); return; }
        for (let i = 0; i < list.length; i++) if (SB.inRect(t, list[i].rect)) { this.focus = i; return pick(list[i].id); }
      }
      if (inp.pressed.title) SB.setScene(SB.loadingScene);
    },
    draw(ctx) {
      SB.drawStadium(ctx, this.t);
      ctx.fillStyle = 'rgba(5,6,12,0.62)'; ctx.fillRect(0, 0, W, 216);
      F().drawText(ctx, 'SUPERBOWL1', W / 2, 18, '#f26a1b', { align: 'center', scale: 3, shadow: '#2a1205' });
      F().drawText(ctx, 'FRANCHISE FOOTBALL', W / 2, 44, '#e9e2d6', { align: 'center', shadow: '#000' });
      const list = items();
      list.forEach((it, i) => {
        const r = it.rect, f = i === this.focus;
        ctx.fillStyle = f ? '#f26a1b' : '#4a4a55'; ctx.fillRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
        ctx.fillStyle = f ? '#1c120b' : '#111116'; ctx.fillRect(r.x, r.y, r.w, r.h);
        F().drawText(ctx, it.label, W / 2, r.y + 6, f ? '#ffb070' : '#ffffff', { align: 'center' });
      });
      const sub = list[this.focus].sub;
      F().drawText(ctx, sub, W / 2, 172, '#cfc7b8', { align: 'center', shadow: '#000' });
      const touch = SB.input.lastDevice === 'touch';
      F().drawText(ctx, touch ? 'TAP TO CHOOSE' : 'ARROWS + ENTER  *  CLICK  *  M: SOUND', W / 2, 200, '#8a8a96', { align: 'center' });
      SB.drawSpeaker(ctx, SPK.x, SPK.y);
    }
  };

  SB.menuScene = scene;
})(window.SB);
