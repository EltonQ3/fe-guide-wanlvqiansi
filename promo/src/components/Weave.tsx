import React, {useLayoutEffect, useRef} from 'react';

// The site's "fate threads" (web/weave.js), made deterministic: everything is a function of time t, so a frame
// renders the same every time. Faint warp threads drift; coloured strands start apart on the left (fanned
// upward by `up`, or spread by `spread`) and braid together from x = `from` onwards around y = `y`.
export type Band = {y: number; from: number; spread: number; up: number; amp: number};
type Rect = {x: number; y: number; w: number; h: number};

export const Weave: React.FC<{
  width: number; height: number; t: number;
  strands: string[]; band: Band;
  field?: number;            // opacity scale of the warp threads (0 hides them)
  glow?: number[];           // per-strand highlight 0..1
  strandAlpha?: number;      // overall strand opacity
  converge?: number;         // 0: strands far apart, 1: the band as given
  pluck?: number;            // seconds since the last pluck (strands shiver, then settle)
  mask?: Rect[];             // areas where threads fade out (text)
  maskAlpha?: number;        // strength of that fade, 0..1
  style?: React.CSSProperties;
}> = ({width, height, t, strands, band, field = 1, glow = [], strandAlpha = 1, converge = 1, pluck = 99, mask = [], maskAlpha = 1, style}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current!, ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    const line = (f: (x: number) => number) => {
      ctx.beginPath();
      for (let x = -20; x <= width + 20; x += 12) { const y = f(x); x === -20 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    };
    // warp field
    if (field > 0) {
      const n = Math.round(Math.min(40, Math.max(14, width / 42)));
      ctx.lineWidth = 1;
      for (let i = 0; i < n; i++) {
        const y0 = height * (0.06 + 0.88 * i / (n - 1)), a = 5 + (i * 7) % 9, l = 340 + (i * 137) % 380, s = 0.1 + (i % 5) * 0.035, p = i * 1.7;
        ctx.strokeStyle = `rgba(203,182,142,${(0.07 + (i % 4) * 0.025) * field})`;
        line((x) => y0 + a * Math.sin((x / l) * 6.283 + t * s + p));
      }
    }
    // strands
    const {y: yc, from, spread, up, amp} = band, span = Math.max(1, width - from), turn = (Math.PI * 2) / strands.length, mid = (strands.length - 1) / 2;
    const apartScale = 1 + (1 - converge) * 2.2, shiver = 26 * Math.exp(-pluck * 2.6) * Math.sin(pluck * 34);
    for (let pass = 0; pass < 2; pass++) strands.forEach((color, k) => {
      const lift = glow[k] ?? 0;
      ctx.strokeStyle = color;
      ctx.globalAlpha = (pass ? 0.66 + 0.34 * lift : 0.12 + 0.14 * lift) * strandAlpha;
      ctx.lineWidth = pass ? 1.6 + 1.4 * lift : 6 + 4 * lift;
      line((x) => {
        const u = Math.min(1, Math.max(0, (x - from) / span)), s = u * u * (3 - 2 * u), e = Math.min(1, s * 1.6) * converge;
        const apart = yc + ((k - mid) * spread - k * up) * apartScale * (1 - s) + amp * 0.8 * Math.sin(x / 260 + t * 0.35 + k * 2.1) * (1 - s);
        const braid = yc + amp * Math.sin(x / 62 - t * 0.6 + k * turn);
        return apart + (braid - apart) * e + shiver * Math.sin((Math.PI * x) / width) * (k % 2 ? -1 : 1);
      });
    });
    ctx.globalAlpha = 1;
    // fade threads out under text
    if (mask.length && maskAlpha > 0) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.filter = 'blur(28px)';
      ctx.fillStyle = `rgba(0,0,0,${0.92 * maskAlpha})`;
      for (const r of mask) ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.filter = 'none';
      ctx.globalCompositeOperation = 'source-over';
    }
  });
  return <canvas ref={ref} width={width} height={height} style={{position: 'absolute', left: 0, top: 0, width, height, ...style}} />;
};

// Band the site computes for the desktop home hero: braid where the staggered portraits end, fanned upward on the left.
export const homeBand = (g: {copy: Rect; art: Rect; meta: Rect; panels: Rect[]; hero: Rect}): Band => {
  const rel = (r: Rect) => ({l: r.x, t: r.y - g.hero.y, r: r.x + r.w, b: r.y - g.hero.y + r.h});
  const copy = rel(g.copy), meta = rel(g.meta), ends = g.panels.map((p) => rel(p).b);
  return {y: Math.min((Math.min(...ends) + Math.max(...ends)) / 2, meta.t - 24), from: copy.l, spread: 0, up: (Math.max(...ends) - copy.t) / 4.5, amp: 11};
};
