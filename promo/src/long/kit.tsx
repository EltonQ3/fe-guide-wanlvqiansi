import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {colors, FPS, H, T, W} from '../timeline';

// Shared pieces for the long cut: easing, seeded randomness, on-screen copy, the ring of fate, embers, grain.
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const SYNC = T.long.sync;
export const rand = (i: number, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
export const smooth = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v * v * (3 - 2 * v); };
export const zh = '"Noto Serif SC", serif';
export const copy = (id: string) => {
  const c = T.long.copy.find((x) => x.id === id);
  if (!c) throw new Error(`No copy ${id}`);
  return c;
};
export const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// Keyframed value: [[frame, value], ...] with smooth in-out between keys.
export const keys = (f: number, k: [number, number][], easing = Easing.inOut(Easing.cubic)) =>
  interpolate(f, k.map((x) => x[0]), k.map((x) => x[1]), {...clamp, easing});

// A line of copy, revealed character by character (blur to sharp, a small rise), gone at its `to` frame.
// `frame` is the absolute frame of the long cut, so copy timings come straight from timeline.json.
export const Copy: React.FC<{id: string; frame: number; size?: number; color?: string; style?: React.CSSProperties; stagger?: number; glow?: string}> = (
  {id, frame, size = 64, color = colors.ink, style, stagger = 2.2, glow = 'rgba(226,197,140,.35)'}) => {
  const c = copy(id);
  if (frame < c.from - 1 || frame > c.to) return null;
  const out = interpolate(frame, [c.to - 10, c.to], [1, 0], clamp);
  return (
    <div style={{fontFamily: zh, fontSize: size, color, letterSpacing: '.14em', whiteSpace: 'nowrap', textShadow: `0 0 28px ${glow}, 0 2px 24px rgba(0,0,0,.9)`, opacity: out, ...style}}>
      {[...c.text].map((ch, i) => {
        const u = interpolate(frame - c.from - i * stagger, [0, 14], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        return <span key={i} style={{display: 'inline-block', opacity: u, filter: `blur(${(1 - u) * 10}px)`, transform: `translateY(${(1 - u) * 14}px)`}}>{ch}</span>;
      })}
    </div>
  );
};

// A small label for the guide section: gold caps line + Chinese copy, bottom left, like a lower third.
export const Label: React.FC<{id: string; frame: number; eyebrow: string}> = ({id, frame, eyebrow}) => {
  const c = copy(id);
  if (frame < c.from || frame > c.to) return null;
  const u = interpolate(frame - c.from, [0, 16], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const out = interpolate(frame, [c.to - 8, c.to], [1, 0], clamp);
  return (
    <>
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 420, opacity: out * u, pointerEvents: 'none',
      background: 'linear-gradient(to top, rgba(8,10,13,.94) 0%, rgba(8,10,13,.72) 40%, rgba(8,10,13,0) 100%)'}} />
    <div style={{position: 'absolute', left: 120, bottom: 110, opacity: out, fontFamily: zh}}>
      <div style={{width: 260 * u, height: 1, background: `linear-gradient(90deg, ${colors.gold}, transparent)`, marginBottom: 18}} />
      <div style={{fontFamily: '"Libre Caslon Text", serif', fontSize: 20, letterSpacing: '.32em', color: colors.gold, opacity: u}}>{eyebrow}</div>
      <div style={{fontSize: 52, letterSpacing: '.12em', color: colors.ink, marginTop: 10, opacity: u, transform: `translateX(${(1 - u) * -24}px)`,
        textShadow: '0 2px 30px rgba(0,0,0,.85), 0 0 2px rgba(0,0,0,.6)'}}>{c.text}</div>
    </div>
    </>
  );
};

// The ring of fate: an astrolabe of thin gold rings, ticks and numerals. `turn` is in degrees; rings turn at
// different rates so the dial reads as machinery.
const NUM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export const FateRing: React.FC<{size: number; turn: number; opacity?: number; color?: string; style?: React.CSSProperties}> = ({size, turn, opacity = 1, color = colors.thread, style}) => {
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`${-r} ${-r} ${size} ${size}`} style={{opacity, overflow: 'visible', ...style}}>
      <defs><filter id="ringglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={size / 260} /></filter></defs>
      {[0, 1].map((pass) => (
        <g key={pass} stroke={color} fill="none" filter={pass ? undefined : 'url(#ringglow)'} opacity={pass ? 0.9 : 0.6}>
          <g transform={`rotate(${turn})`}>
            <circle r={r * 0.98} strokeWidth={size / 700} />
            <circle r={r * 0.9} strokeWidth={size / 1100} />
            {Array.from({length: 120}, (_, i) => {
              const a = (i / 120) * Math.PI * 2, l = i % 10 === 0 ? 0.06 : i % 5 === 0 ? 0.035 : 0.018;
              return <line key={i} x1={Math.cos(a) * r * 0.9} y1={Math.sin(a) * r * 0.9} x2={Math.cos(a) * r * (0.9 + l)} y2={Math.sin(a) * r * (0.9 + l)} strokeWidth={size / 1400} />;
            })}
          </g>
          <g transform={`rotate(${-turn * 1.6})`}>
            <circle r={r * 0.72} strokeWidth={size / 900} strokeDasharray={`${size / 90} ${size / 140}`} />
            {NUM.map((n, i) => {
              const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
              return pass ? <text key={n} x={Math.cos(a) * r * 0.81} y={Math.sin(a) * r * 0.81} fill={color} stroke="none" fontSize={size / 34}
                fontFamily='"Libre Caslon Text", serif' textAnchor="middle" dominantBaseline="central"
                transform={`rotate(${(i / 12) * 360} ${Math.cos(a) * r * 0.81} ${Math.sin(a) * r * 0.81})`}>{n}</text> : null;
            })}
          </g>
          <g transform={`rotate(${turn * 2.4})`}>
            <circle r={r * 0.55} strokeWidth={size / 1300} />
            {Array.from({length: 8}, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return <line key={i} x1={Math.cos(a) * r * 0.2} y1={Math.sin(a) * r * 0.2} x2={Math.cos(a) * r * 0.55} y2={Math.sin(a) * r * 0.55} strokeWidth={size / 1500} />;
            })}
            <circle r={r * 0.2} strokeWidth={size / 1100} />
          </g>
        </g>
      ))}
    </svg>
  );
};

// Canvas helper: draw with a callback every frame (deterministic, so renders are repeatable).
export const Paint: React.FC<{draw: (ctx: CanvasRenderingContext2D) => void; style?: React.CSSProperties; width?: number; height?: number}> = ({draw, style, width = W, height = H}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);
    draw(ctx);
  });
  return <canvas ref={ref} width={width} height={height} style={{position: 'absolute', left: 0, top: 0, width, height, ...style}} />;
};

// Embers rising (or, with negative time, sinking back): each a function of time only.
export const embers = (ctx: CanvasRenderingContext2D, t: number, n: number, alpha = 1, color = '255,196,120') => {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const life = 5 + rand(i, 1) * 6, age = (((t + rand(i, 2) * life) % life) + life) % life, u = age / life;
    const x = rand(i, 3) * W + Math.sin(age * (0.6 + rand(i, 4)) + i) * 40 * u;
    const y = H * (1.05 - u * (0.9 + rand(i, 5) * 0.5));
    const a = Math.sin(Math.PI * u) * (0.35 + 0.65 * rand(i, 6)) * alpha, r = 1 + rand(i, 7) * 2.2;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 5);
    g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(0.3, `rgba(${color},${a * 0.35})`); g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r * 5, y - r * 5, r * 10, r * 10);
  }
  ctx.restore();
};

// Film grain and a vignette over everything; the grain pattern changes every frame.
export const Grain: React.FC<{amount?: number}> = ({amount = 0.07}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 48%, transparent 52%, rgba(4,6,9,.55) 100%)'}} />
      <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: amount, mixBlendMode: 'overlay'}}>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 97} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
        <rect width={W} height={H} filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

// A white-gold flash: peaks at `at` (absolute frame), fades over `len` frames each side.
export const Flash: React.FC<{frame: number; at: number; len?: number; peak?: number; color?: string}> = ({frame, at, len = 8, peak = 1, color = '255,246,224'}) => {
  const a = interpolate(frame, [at - len * 0.4, at, at + len], [0, peak, 0], clamp);
  if (a <= 0) return null;
  return <AbsoluteFill style={{background: `radial-gradient(ellipse at center, rgba(${color},${a}) 0%, rgba(${color},${a * 0.7}) 45%, rgba(${color},${a * 0.35}) 100%)`, pointerEvents: 'none'}} />;
};

export const t30 = (f: number) => f / FPS;
