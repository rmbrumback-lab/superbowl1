/* SUPERBOWL1 - 5x7 bitmap font (pixel-perfect at any integer scale). */
window.SB = window.SB || {};
(function (SB) {
  'use strict';

  // Each glyph: 7 rows, 5 bits per row (bit 4 = leftmost pixel).
  const G = {
    'A': [14, 17, 17, 31, 17, 17, 17], 'B': [30, 17, 17, 30, 17, 17, 30],
    'C': [14, 17, 16, 16, 16, 17, 14], 'D': [30, 17, 17, 17, 17, 17, 30],
    'E': [31, 16, 16, 30, 16, 16, 31], 'F': [31, 16, 16, 30, 16, 16, 16],
    'G': [14, 17, 16, 23, 17, 17, 15], 'H': [17, 17, 17, 31, 17, 17, 17],
    'I': [14, 4, 4, 4, 4, 4, 14], 'J': [7, 2, 2, 2, 2, 18, 12],
    'K': [17, 18, 20, 24, 20, 18, 17], 'L': [16, 16, 16, 16, 16, 16, 31],
    'M': [17, 27, 21, 21, 17, 17, 17], 'N': [17, 17, 25, 21, 19, 17, 17],
    'O': [14, 17, 17, 17, 17, 17, 14], 'P': [30, 17, 17, 30, 16, 16, 16],
    'Q': [14, 17, 17, 17, 21, 18, 13], 'R': [30, 17, 17, 30, 20, 18, 17],
    'S': [15, 16, 16, 14, 1, 1, 30], 'T': [31, 4, 4, 4, 4, 4, 4],
    'U': [17, 17, 17, 17, 17, 17, 14], 'V': [17, 17, 17, 17, 17, 10, 4],
    'W': [17, 17, 17, 21, 21, 21, 10], 'X': [17, 17, 10, 4, 10, 17, 17],
    'Y': [17, 17, 10, 4, 4, 4, 4], 'Z': [31, 1, 2, 4, 8, 16, 31],
    '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14],
    '2': [14, 17, 1, 2, 4, 8, 31], '3': [31, 2, 4, 2, 1, 17, 14],
    '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
    '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8],
    '8': [14, 17, 17, 14, 17, 17, 14], '9': [14, 17, 17, 15, 1, 2, 12],
    ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12],
    ',': [0, 0, 0, 0, 12, 4, 8], '!': [4, 4, 4, 4, 4, 0, 4],
    '?': [14, 17, 1, 2, 4, 0, 4], ':': [0, 12, 12, 0, 12, 12, 0],
    "'": [4, 4, 8, 0, 0, 0, 0], '-': [0, 0, 0, 31, 0, 0, 0],
    '/': [1, 1, 2, 4, 8, 16, 16], '#': [10, 10, 31, 10, 31, 10, 10],
    '+': [0, 4, 4, 31, 4, 4, 0], '%': [24, 25, 2, 4, 8, 19, 3],
    '&': [12, 18, 20, 8, 21, 18, 13], '(': [2, 4, 8, 8, 8, 4, 2],
    ')': [8, 4, 2, 2, 2, 4, 8], '>': [8, 4, 2, 1, 2, 4, 8],
    '<': [2, 4, 8, 16, 8, 4, 2], '*': [0, 0, 14, 14, 14, 0, 0],
    '"': [10, 10, 0, 0, 0, 0, 0], '=': [0, 0, 31, 0, 31, 0, 0],
    '\u00A9': [14, 17, 23, 21, 23, 17, 14]  // copyright sign
  };

  // 3x5 digits for jersey numbers.
  const D = {
    '0': [7, 5, 5, 5, 7], '1': [2, 6, 2, 2, 7], '2': [7, 1, 7, 4, 7],
    '3': [7, 1, 7, 1, 7], '4': [5, 5, 7, 1, 1], '5': [7, 4, 7, 1, 7],
    '6': [7, 4, 7, 5, 7], '7': [7, 1, 1, 2, 2], '8': [7, 5, 7, 5, 7],
    '9': [7, 5, 7, 1, 7]
  };

  function textWidth(str, scale) {
    scale = scale || 1;
    const n = String(str).length;
    return n ? (n * 6 - 1) * scale : 0;
  }

  function drawGlyph(ctx, rows, x, y, s, bits) {
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      if (!row) continue;
      for (let c = 0; c < bits; c++) {
        if (row & (1 << (bits - 1 - c))) ctx.fillRect(x + c * s, y + r * s, s, s);
      }
    }
  }

  /**
   * drawText(ctx, str, x, y, color, {scale, align, shadow})
   * align: 'left' | 'center' | 'right'. shadow: color string for a 1px drop shadow.
   */
  function drawText(ctx, str, x, y, color, opts) {
    opts = opts || {};
    const s = opts.scale || 1;
    str = String(str).toUpperCase();
    let w = textWidth(str, s);
    let sx = Math.round(x);
    if (opts.align === 'center') sx = Math.round(x - w / 2);
    else if (opts.align === 'right') sx = Math.round(x - w);
    const sy = Math.round(y);
    if (opts.shadow) {
      ctx.fillStyle = opts.shadow;
      for (let i = 0; i < str.length; i++) {
        const g = G[str[i]] || G['?'];
        drawGlyph(ctx, g, sx + i * 6 * s + s, sy + s, s, 5);
      }
    }
    ctx.fillStyle = color;
    for (let i = 0; i < str.length; i++) {
      const g = G[str[i]] || G['?'];
      drawGlyph(ctx, g, sx + i * 6 * s, sy, s, 5);
    }
    return w;
  }

  /** Small 3x5 jersey digits. Returns width in pixels. */
  function drawDigits(ctx, num, x, y, color, s) {
    s = s || 1;
    const str = String(num);
    ctx.fillStyle = color;
    const w = (str.length * 4 - 1) * s;
    let sx = Math.round(x - w / 2);
    for (let i = 0; i < str.length; i++) {
      const g = D[str[i]];
      if (g) drawGlyph(ctx, g, sx + i * 4 * s, Math.round(y), s, 3);
    }
    return w;
  }

  /** Word-wrap to a max character count per line. */
  function wrap(str, maxChars) {
    const words = String(str).split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > maxChars) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = (line + ' ' + w).trim();
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  SB.font = { drawText, drawDigits, textWidth, wrap };
})(window.SB);
