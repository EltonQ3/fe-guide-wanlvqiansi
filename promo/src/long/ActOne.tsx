import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {colors, FPS, H, W} from '../timeline';
import {clamp, Copy, embers, FateRing, Flash, Paint, rand, SYNC} from './kit';

// 0:00-0:10 One thread. It is plucked (the harp), sings the fate motif, and snaps on the motif's last note.
// Then time runs backwards: the same snap plays in reverse until the two ends meet again on bar 3.
// Drawn on a canvas as a vibrating string: several faint copies across the swing read as the blurred
// envelope a real string shows when it rings.
const Y0 = H * 0.54, X0 = -40, X1 = W + 40, XB = W * 0.52;
const PLUCKS = [{f: 0, x: W * 0.5, a: 34}, {f: 100, x: W * 0.3, a: 22}, {f: 125, x: W * 0.42, a: 22}, {f: 150, x: W * 0.6, a: 26}, {f: SYNC.snap, x: XB, a: 46}];
const SPARKS = 90;

// Displacement envelope (px) at x, frame f, from the plucks so far (triangle shape, damped).
const swing = (x: number, f: number) => {
  let y = 0;
  for (const p of PLUCKS) {
    if (f < p.f) continue;
    const dt = (f - p.f) / FPS, a = p.a * Math.exp(-dt * 1.15);
    y += a * (x < p.x ? (x - X0) / (p.x - X0) : (X1 - x) / (X1 - p.x));
  }
  return y;
};
const glowAt = (f: number) => PLUCKS.reduce((g, p) => g + (f >= p.f ? Math.exp(-((f - p.f) / FPS) * 2.4) : 0), 0);

// The thread as polylines: whole (before the snap) or two halves recoiling `tau` seconds after it.
function drawThread(ctx: CanvasRenderingContext2D, f: number, tau: number | null, alpha: number, reach = 1) {
  const g = Math.min(1.6, glowAt(f));
  const copies = 9;
  const strokeHalf = (from: number, to: number, end: number, whip: number, fade: number) => {
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < copies; k++) {
        const phase = Math.cos((Math.PI * k) / (copies - 1));
        ctx.beginPath();
        const n = 90;
        for (let i = 0; i <= n; i++) {
          const x = from + ((to - from) * i) / n, u = i / n;
          const y = Y0 + phase * swing(x, f) * (tau === null ? 1 : 0.4) + whip * Math.pow(u, 2.2);
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.strokeStyle = pass ? `rgba(255,238,200,${(0.34 + 0.18 * g) * alpha * fade})` : `rgba(226,197,140,${(0.05 + 0.05 * g) * alpha * fade})`;
        ctx.lineWidth = pass ? 1.5 + g * 0.6 : 10 + g * 10;
        ctx.stroke();
      }
    }
    void end;
  };
  if (tau === null) {
    const half = (X1 - X0) / 2 * reach, c = (X0 + X1) / 2;
    strokeHalf(c - half, c + half, 0, 0, 1);
    return;
  }
  const pull = 1 - Math.exp(-tau * 2.6), fade = 0.35 + 0.65 * Math.exp(-tau * 1.8);
  const whip = 70 * Math.exp(-tau * 2.2) * Math.sin(tau * 13);
  strokeHalf(X0, XB - W * 0.36 * pull, 0, whip, fade);
  strokeHalf(X1, XB + W * 0.34 * pull, 0, -whip * 0.8, fade);
}

// Sparks thrown from the break, as short streaks along their (slowing) motion.
function drawSparks(ctx: CanvasRenderingContext2D, tau: number, alpha: number) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (let i = 0; i < SPARKS; i++) {
    const ang = rand(i, 11) * Math.PI * 2, sp = 220 + rand(i, 12) * 900, k = 2.2 + rand(i, 13) * 1.5;
    const d = (sp * (1 - Math.exp(-k * tau))) / k, vx = Math.cos(ang), vy = Math.sin(ang) * 0.7;
    const x = XB + vx * d, y = Y0 + vy * d + 40 * tau * tau;
    const v = sp * Math.exp(-k * tau), len = Math.min(60, v * 0.05) + 2;
    const a = Math.exp(-tau * (1.2 + rand(i, 14))) * alpha;
    if (a < 0.01) continue;
    ctx.strokeStyle = `rgba(255,${200 + Math.round(rand(i, 15) * 50)},${140 + Math.round(rand(i, 16) * 80)},${a})`;
    ctx.lineWidth = 1 + rand(i, 17) * 1.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx * len, y - vy * len); ctx.stroke();
  }
  const fl = Math.exp(-tau * 7) * alpha;
  if (fl > 0.01) {
    const gr = ctx.createRadialGradient(XB, Y0, 0, XB, Y0, 260);
    gr.addColorStop(0, `rgba(255,244,220,${fl})`); gr.addColorStop(0.25, `rgba(255,214,150,${fl * 0.4})`); gr.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = gr; ctx.fillRect(XB - 260, Y0 - 260, 520, 520);
  }
  ctx.restore();
}

export const ActOne: React.FC = () => {
  const f = useCurrentFrame();
  const snap = SYNC.snap, rejoin = SYNC.rejoin, t = f / FPS;
  const rewinding = f >= 200;
  // Rewind: from the state 25 frames after the snap back to the snap itself, slow at first, then rushing.
  const back = rewinding ? interpolate(f, [200, rejoin - 4], [(200 - snap) / FPS, 0], {...clamp, easing: Easing.in(Easing.cubic)}) : 0;
  const draw = (ctx: CanvasRenderingContext2D) => {
    embers(ctx, rewinding ? 200 / FPS - (f - 200) / FPS * 2.2 : t, 46, interpolate(f, [0, 60], [0.2, 0.9], clamp));
    if (!rewinding) {
      if (f < snap) drawThread(ctx, f, null, 1, interpolate(f, [0, 14], [0.02, 1], {...clamp, easing: Easing.out(Easing.cubic)}));
      else { const tau = (f - snap) / FPS; drawThread(ctx, f, tau, 1); drawSparks(ctx, tau, 1); }
      return;
    }
    // ghosts of where the thread is going (rewinding), then the thread itself
    const at = (tau: number) => snap + Math.round(tau * FPS);
    for (const [lag, a] of [[0.12, 0.18], [0.06, 0.32]] as const) drawThread(ctx, at(back + lag), back + lag, a);
    drawThread(ctx, at(back), back, 1);
    drawSparks(ctx, back, 0.9);
    // time streaks running right to left
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const sp = 900 + rand(i, 21) * 1600, y = H * (0.12 + 0.76 * rand(i, 22)), x = W + 300 - ((f - 200) / FPS * sp + rand(i, 23) * W) % (W + 600);
      const g = ctx.createLinearGradient(x, 0, x + 260, 0);
      g.addColorStop(0, 'rgba(210,225,255,0)'); g.addColorStop(0.2, `rgba(210,225,255,${0.12 * interpolate(f, [200, 230], [0, 1], clamp)})`); g.addColorStop(1, 'rgba(210,225,255,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, 260, 1.2);
    }
    ctx.restore();
  };
  const ringOpacity = interpolate(f, [195, 240, rejoin - 10, rejoin + 2], [0, 0.5, 0.6, 0], clamp);
  const ringTurn = -Math.pow(Math.max(0, f - 196), 1.7) * 0.35;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 56%, #131a22 0%, ${colors.night} 70%)`}}>
      {ringOpacity > 0 && (
        <div style={{position: 'absolute', left: W / 2 - 560, top: Y0 - 560}}>
          <FateRing size={1120} turn={ringTurn} opacity={ringOpacity} />
        </div>
      )}
      {rewinding && <AbsoluteFill style={{background: 'rgba(60,90,140,.10)', mixBlendMode: 'screen', opacity: interpolate(f, [200, 225, rejoin - 6, rejoin], [0, 1, 1, 0], clamp)}} />}
      <Paint draw={draw} />
      <div style={{position: 'absolute', top: Y0 - 230, right: W / 2 + 4}}><Copy id="thread" frame={f} size={66} /></div>
      <div style={{position: 'absolute', top: Y0 - 230, left: W / 2 + 4}}><Copy id="broke" frame={f} size={66} color="#f6dcae" stagger={1.4} /></div>
      <div style={{position: 'absolute', top: Y0 - 230, width: W, display: 'flex', justifyContent: 'center'}}>
        <Copy id="back" frame={f} size={66} color="#dfe7f2" glow="rgba(160,190,240,.35)" />
      </div>
      <Flash frame={f} at={rejoin} len={14} peak={0.95} />
    </AbsoluteFill>
  );
};
