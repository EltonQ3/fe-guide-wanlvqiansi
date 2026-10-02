import React from 'react';
import {AbsoluteFill, Easing, interpolate} from 'remotion';
import {T, W, H} from '../timeline';

// Shared pieces for the second promo (逆命): its clock, trailer typography, letterbox, shake and flashes.
export const CT = T.concept;
export const CS = CT.sync;
export const BEAT = CT.beatFrames, BAR = CT.barFrames, STEP = BEAT / 4;
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const rand = (i: number, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
export const zh = '"Noto Serif SC", serif';
export const latin = '"Libre Caslon Text", serif';
export const ccopy = (id: string) => {
  const c = CT.copy.find((x) => x.id === id);
  if (!c) throw new Error(`No concept copy ${id}`);
  return c;
};
export const hexA = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
export const ember = '#ff9a3c', fireGold = '#ffd27a', ash = '#9aa3ad', night = '#07080b';

// Decaying punch after each hit frame: 1 on the hit, falling off over `len` frames.
export const punch = (f: number, hits: number[], len = 10) => hits.reduce((m, h) => (f >= h && f < h + len * 4 ? Math.max(m, Math.exp(-(f - h) / len)) : m), 0);

// Camera shake: a deterministic jitter scaled by the latest hit's punch.
export const Shake: React.FC<{f: number; hits: number[]; amount?: number; children: React.ReactNode}> = ({f, hits, amount = 22, children}) => {
  const p = punch(f, hits, 6);
  const x = (rand(f, 1) - 0.5) * 2 * amount * p, y = (rand(f, 2) - 0.5) * 2 * amount * p, r = (rand(f, 3) - 0.5) * 1.2 * p;
  return <AbsoluteFill style={{transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${1 + 0.03 * p})`}}>{children}</AbsoluteFill>;
};

// Trailer type. "whisper": thin, wide-spaced, fading in; "slam": huge, punched in with a colour split on the hit.
export const Line: React.FC<{id: string; frame: number; size?: number; color?: string; style?: React.CSSProperties; glow?: string}> = ({id, frame, size, color = '#f4efe6', style, glow}) => {
  const c = ccopy(id);
  if (frame < c.from - 1 || frame > c.to) return null;
  const local = frame - c.from, out = interpolate(frame, [c.to - 8, c.to], [1, 0], clamp);
  if (c.style === 'slam') {
    const s = interpolate(local, [0, 4], [1.45, 1], {...clamp, easing: Easing.out(Easing.cubic)}), split = interpolate(local, [0, 8], [14, 0], clamp);
    const o = interpolate(local, [0, 1], [0, 1], clamp) * out;
    return (
      <div style={{fontFamily: zh, fontWeight: 600, fontSize: size ?? 120, letterSpacing: '.08em', color, whiteSpace: 'nowrap', opacity: o, transform: `scale(${s})`,
        textShadow: `${split}px 0 0 rgba(255,60,40,.7), ${-split}px 0 0 rgba(60,160,255,.7), 0 0 50px ${glow ?? 'rgba(255,170,90,.35)'}, 0 6px 40px rgba(0,0,0,.9)`, ...style}}>{c.text}</div>
    );
  }
  const u = interpolate(local, [0, 18], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <div style={{fontFamily: zh, fontSize: size ?? 54, letterSpacing: `${0.5 - 0.25 * u}em`, color, whiteSpace: 'nowrap', opacity: u * out, filter: `blur(${(1 - u) * 6}px)`,
      textShadow: `0 0 30px ${glow ?? 'rgba(170,190,220,.35)'}, 0 2px 24px rgba(0,0,0,.9)`, ...style}}>{c.text}</div>
  );
};

// 2.39:1 bars for the first two acts; they snap open on the second braam.
export const Letterbox: React.FC<{f: number}> = ({f}) => {
  const bar = (H - W / 2.39) / 2;
  const open = interpolate(f, [CS.ignite, CS.ignite + 8], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const h = bar * (1 - open);
  if (h < 0.5) return null;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: h, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: h, background: '#000'}} />
    </AbsoluteFill>
  );
};

export const Flash: React.FC<{f: number; at: number; len?: number; peak?: number; color?: string}> = ({f, at, len = 8, peak = 1, color = '255,248,236'}) => {
  const a = interpolate(f, [at - 1, at, at + len], [0, peak, 0], clamp);
  if (a <= 0) return null;
  return <AbsoluteFill style={{background: `rgba(${color},${a})`, pointerEvents: 'none'}} />;
};

export const Grain: React.FC<{f: number; amount?: number}> = ({f, amount = 0.08}) => (
  <AbsoluteFill style={{pointerEvents: 'none'}}>
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,.6) 100%)'}} />
    <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity: amount, mixBlendMode: 'overlay'}}>
      <filter id="cgrain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f % 89} stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width={W} height={H} filter="url(#cgrain)" />
    </svg>
  </AbsoluteFill>
);

// GLSL noise shared by the shaders.
export const GLSL_NOISE = `
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*noise(p); p = p*2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
`;
