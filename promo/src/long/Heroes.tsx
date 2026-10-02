import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {colors, FPS, H, Hero, serif, W} from '../timeline';
import {Weave} from '../components/Weave';
import {clamp, Flash, hexA, Paint, rand, zh} from './kit';

// 0:13-0:27 The four routes, one bar each, each on its own theme instrument. The portrait is woven in: strips
// of the picture slide in from alternate sides like weft through warp threads, then unweave at the bar's end.
const CW = 500, CH = 666, STRIPS = 18;

// Per-route weather, drawn on a canvas as functions of time: wind, a blade's flash, lanterns, rose petals.
const fx: Record<string, (ctx: CanvasRenderingContext2D, f: number, h: Hero) => void> = {
  kai: (ctx, f) => {
    const t = f / FPS;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let i = 0; i < 46; i++) {
      const sp = 900 + rand(i, 1) * 1400, len = 160 + rand(i, 2) * 520, y0 = H * (0.08 + 0.84 * rand(i, 3));
      const x = ((t * sp + rand(i, 4) * (W + 900)) % (W + 900)) - 600;
      const a = (0.05 + 0.12 * rand(i, 5)) * interpolate(f, [0, 10], [0, 1], clamp);
      const g = ctx.createLinearGradient(x, 0, x + len, 0);
      g.addColorStop(0, 'rgba(190,215,255,0)'); g.addColorStop(0.7, `rgba(200,222,255,${a})`); g.addColorStop(1, 'rgba(200,222,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1 + rand(i, 6) * 1.5;
      ctx.beginPath();
      for (let s = 0; s <= 8; s++) { const xx = x + (len * s) / 8, yy = y0 + 14 * Math.sin(xx / 240 + i); s ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
    }
    for (let i = 0; i < 26; i++) {                     // leaves carried on the wind
      const sp = 260 + rand(i, 7) * 420, x = ((t * sp + rand(i, 8) * (W + 200)) % (W + 200)) - 100;
      const y = H * rand(i, 9) + 60 * Math.sin(t * 2 + i), rot = t * (3 + rand(i, 10) * 4) + i;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, Math.sin(rot * 1.3));
      ctx.fillStyle = `rgba(170,205,240,${0.25 + 0.3 * rand(i, 11)})`;
      ctx.beginPath(); ctx.ellipse(0, 0, 7 + rand(i, 12) * 6, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.restore();
  },
  dietrich: (ctx, f) => {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // the blade's flash: a diagonal line drawn across in a few frames, then fading
    const u = interpolate(f, [0, 7], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)}), fade = interpolate(f, [6, 30], [1, 0], clamp);
    if (fade > 0) {
      const ax = W * 0.98, ay = H * 0.05, bx = W * 0.05, by = H * 0.95, ex = ax + (bx - ax) * u, ey = ay + (by - ay) * u;
      for (const [w, a] of [[26, 0.08], [8, 0.25], [2, 0.95]] as const) {
        ctx.strokeStyle = `rgba(235,228,255,${a * fade})`; ctx.lineWidth = w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
      }
    }
    for (let i = 0; i < 22; i++) {                      // cold glints
      const life = 26, ph = (f + rand(i, 1) * life) % life, a = Math.sin((Math.PI * ph) / life) * (0.4 + 0.6 * rand(i, 2));
      const x = W * rand(i, 3), y = H * rand(i, 4), r = 6 + 18 * rand(i, 5) * a;
      ctx.strokeStyle = `rgba(220,215,255,${0.55 * a})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
    }
    ctx.restore();
  },
  theodora: (ctx, f) => {
    const t = f / FPS;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 34; i++) {                      // lanterns rising
      const sp = 40 + rand(i, 1) * 70, r = 5 + rand(i, 2) * 16, x = W * rand(i, 3) + 20 * Math.sin(t * 0.8 + i);
      const y = H + 60 - ((t * sp + rand(i, 4) * (H + 120)) % (H + 120));
      const flick = 0.75 + 0.25 * Math.sin(t * (7 + rand(i, 5) * 5) + i), a = (0.25 + 0.45 * rand(i, 6)) * flick;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
      g.addColorStop(0, `rgba(255,226,160,${a})`); g.addColorStop(0.35, `rgba(240,170,80,${a * 0.45})`); g.addColorStop(1, 'rgba(240,160,70,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r * 3.2, y - r * 3.2, r * 6.4, r * 6.4);
    }
    ctx.restore();
  },
  leda: (ctx, f) => {
    const t = f / FPS;
    for (let i = 0; i < 48; i++) {                      // petals blown across
      const sp = 300 + rand(i, 1) * 500, x = W + 120 - ((t * sp + rand(i, 2) * (W + 240)) % (W + 240));
      const y = H * rand(i, 3) + 90 * Math.sin(t * 1.4 + i * 0.7), rot = t * (2 + 3 * rand(i, 4)) + i, s = 9 + 10 * rand(i, 5);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, 0.35 + 0.65 * Math.abs(Math.sin(rot * 1.7)));
      const g = ctx.createLinearGradient(-s, 0, s, 0);
      g.addColorStop(0, 'rgba(120,10,30,.85)'); g.addColorStop(0.6, 'rgba(210,60,90,.85)'); g.addColorStop(1, 'rgba(240,120,140,.7)');
      ctx.fillStyle = g; ctx.globalAlpha = 0.45 + 0.45 * rand(i, 6);
      ctx.beginPath(); ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 0.9, s, 0); ctx.quadraticCurveTo(0, s * 0.6, -s, 0); ctx.fill();
      ctx.restore();
    }
  },
};

const WovenCard: React.FC<{hero: Hero; f: number; duration: number; flip: boolean}> = ({hero, f, duration, flip}) => {
  const src = staticFile(hero.portrait);
  const swingY = interpolate(f, [0, duration], [flip ? -16 : 16, flip ? -6 : 6]);
  const push = interpolate(f, [0, duration], [1, 1.05]);
  const sweep = interpolate(f, [24, 44], [-0.4, 1.4], clamp);
  return (
    <div style={{position: 'absolute', left: (flip ? 1340 : 600) - CW / 2, top: H / 2 - CH / 2, width: CW, height: CH, perspective: 1600}}>
      <div style={{position: 'absolute', inset: 0, transform: `rotateY(${swingY}deg) scale(${push})`, transformStyle: 'preserve-3d'}}>
        <div style={{position: 'absolute', inset: -14, boxShadow: `0 60px 140px rgba(0,0,0,.65), 0 0 90px ${hexA(hero.thread, 0.25)}`, opacity: interpolate(f, [14, 26], [0, 1], clamp)}} />
        {Array.from({length: STRIPS}, (_, i) => {
          const order = Math.abs(i - (STRIPS - 1) / 2), d = 1 + order * 1.1;
          const dir = (i % 2 ? 1 : -1) * (flip ? -1 : 1);
          const inn = interpolate(f, [d, d + 15], [1, 0], {...clamp, easing: Easing.out(Easing.exp)});
          const out = interpolate(f, [duration - 12 + order * 0.5, duration - 2 + order * 0.5], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
          const off = (inn * (760 + rand(i, 1) * 320) - out * (900 + rand(i, 2) * 300)) * dir;
          const sh = CH / STRIPS, edge = interpolate(f, [d + 4, d + 16], [1, 0], clamp) + out;
          return (
            <div key={i} style={{position: 'absolute', left: 0, top: i * sh, width: CW, height: sh + 0.6, overflow: 'hidden', transform: `translateX(${off}px)`, opacity: 1 - out * 0.6}}>
              <Img src={src} style={{position: 'absolute', left: 0, top: -i * sh, width: CW, height: CH}} />
              {edge > 0 && <div style={{position: 'absolute', top: 0, bottom: 0, width: 3, [dir > 0 ? 'left' : 'right']: 0, background: hero.thread,
                boxShadow: `0 0 18px 4px ${hexA(hero.thread, 0.8)}`, opacity: Math.min(1, edge)}} />}
            </div>
          );
        })}
        <div style={{position: 'absolute', inset: 0, border: `1px solid ${hexA('#ffffff', 0.18)}`, outline: `1px solid ${hexA(hero.gold, 0.45)}`, outlineOffset: 10,
          opacity: interpolate(f, [18, 30, duration - 12, duration - 6], [0, 1, 1, 0], clamp)}} />
        {sweep > -0.4 && sweep < 1.4 && (
          <div style={{position: 'absolute', inset: 0, overflow: 'hidden', mixBlendMode: 'screen'}}>
            <div style={{position: 'absolute', top: -CH * 0.25, height: CH * 1.5, width: 120, left: `${sweep * 100}%`, transform: 'rotate(18deg)',
              background: 'linear-gradient(90deg, transparent, rgba(255,248,230,.5), transparent)'}} />
          </div>
        )}
      </div>
      {/* warp threads the strips weave through */}
      {Array.from({length: 9}, (_, k) => (
        <div key={k} style={{position: 'absolute', top: -60, bottom: -60, left: (CW * (k + 0.5)) / 9, width: 1, background: hero.thread,
          opacity: interpolate(f, [0, 6, 22, 30], [0, 0.55, 0.55, 0], clamp) * (0.5 + 0.5 * rand(k, 3))}} />
      ))}
    </div>
  );
};

export const HeroScene: React.FC<{hero: Hero; index: number; duration: number; from: number}> = ({hero, index, duration, from}) => {
  const f = useCurrentFrame(), t = f / FPS, flip = index % 2 === 1;
  const rise = (d: number) => {
    const u = interpolate(f, [d, d + 16], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)}), o = interpolate(f, [duration - 12, duration - 4], [1, 0], clamp);
    return {opacity: u * o, filter: `blur(${(1 - u) * 8}px)`, transform: `translateY(${(1 - u) * 22}px)`};
  };
  const textLeft = flip ? 250 : 1010;
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at ${flip ? 70 : 31}% 50%, ${hero.deep} 0%, ${hexA(hero.deep, 0.75)} 40%, ${colors.night} 82%)`, overflow: 'hidden'}}>
      <Img src={staticFile(hero.portrait)} style={{position: 'absolute', left: -100, top: -300, width: W + 200, height: (W + 200) * 1.333, objectFit: 'cover',
        filter: 'blur(46px) saturate(1.25)', opacity: 0.26, transform: `translateY(${-t * 30}px)`}} />
      <Weave width={W} height={H} t={t * 1.4 + index * 3} strands={[hero.thread, hexA(hero.thread, 0.5)]} field={0.45}
        band={{y: H * 0.82, from: 0, spread: 18, up: 0, amp: 16}} glow={[0.8, 0.2]} pluck={t} />
      <Paint draw={(ctx) => fx[hero.id](ctx, f, hero)} />
      <WovenCard hero={hero} f={f} duration={duration} flip={flip} />
      <div style={{position: 'absolute', left: textLeft, top: 330, fontFamily: serif, color: colors.ink}}>
        <div style={{fontSize: 22, letterSpacing: '.36em', color: hero.gold, ...rise(6)}}>PART I · ROUTE 0{index + 1}</div>
        <div style={{fontSize: 30, letterSpacing: '.2em', color: 'rgba(243,238,229,.62)', marginTop: 30, fontFamily: zh, ...rise(9)}}>{hero.jp}</div>
        <div style={{fontSize: 150, lineHeight: 1.08, letterSpacing: '.08em', fontFamily: zh, fontWeight: 600, marginTop: 4,
          textShadow: `0 0 60px ${hexA(hero.thread, 0.55)}, 0 4px 30px rgba(0,0,0,.6)`, ...rise(11)}}>{hero.name}</div>
        <div style={{fontSize: 54, letterSpacing: '.16em', color: hero.gold, marginTop: 24, fontFamily: zh, ...rise(18)}}>{hero.tagline}</div>
        <div style={{width: interpolate(f, [20, 44], [0, 380], {...clamp, easing: Easing.out(Easing.cubic)}), height: 1, marginTop: 30,
          background: `linear-gradient(90deg, ${hero.thread}, transparent)`, opacity: interpolate(f, [duration - 12, duration - 4], [1, 0], clamp)}} />
        <div style={{fontSize: 24, letterSpacing: '.3em', color: 'rgba(243,238,229,.55)', marginTop: 18, fontFamily: zh, ...rise(24)}}>{hero.faction}</div>
      </div>
      {/* the route's thread sweeps across as the bar ends */}
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div style={{position: 'absolute', top: H * 0.5, height: 2, left: interpolate(f, [duration - 10, duration], [-W, W], clamp), width: W,
          background: `linear-gradient(90deg, transparent, ${hero.thread} 70%, #fff)`, boxShadow: `0 0 24px 6px ${hexA(hero.thread, 0.6)}`}} />
      </AbsoluteFill>
      <Flash frame={from + f} at={from} len={9} peak={index === 0 ? 0.85 : 0.35} color={index === 0 ? '255,246,224' : '255,255,255'} />
    </AbsoluteFill>
  );
};
