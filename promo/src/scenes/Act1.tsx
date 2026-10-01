import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {colors, FPS, H, Hero, serif, W} from '../timeline';
import {Weave} from '../components/Weave';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Dust motes drifting in the dark, seeded so every render matches.
const Dust: React.FC<{t: number; count?: number; opacity?: number}> = ({t, count = 70, opacity = 1}) => (
  <svg width={W} height={H} style={{position: 'absolute', inset: 0, opacity}}>
    {Array.from({length: count}, (_, i) => {
      const r = (i * 9301 + 49297) % 233280 / 233280, q = (i * 4241 + 1013) % 9973 / 9973;
      const x = (r * W + t * (8 + q * 14)) % W, y = (q * H + Math.sin(t * 0.4 + i) * 18) % H;
      return <circle key={i} cx={x} cy={y} r={0.8 + q * 1.6} fill={colors.thread} opacity={0.08 + 0.25 * r} />;
    })}
  </svg>
);

// 0:00 One gold thread is drawn across the dark and plucked; it shivers, then rests.
export const OneThread: React.FC<{duration: number}> = ({duration}) => {
  const f = useCurrentFrame(), t = f / FPS;
  const reveal = interpolate(f, [0, duration * 0.45], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const shake = 34 * Math.exp(-t * 1.4) * Math.sin(t * 2 * Math.PI * 3.2);
  const pts = Array.from({length: 97}, (_, i) => { const x = (i / 96) * W; return `${x},${H / 2 + shake * Math.sin((Math.PI * x) / W)}`; }).join(' ');
  const len = W * 1.02;
  return (
    <AbsoluteFill style={{background: colors.night}}>
      <Dust t={t} opacity={interpolate(f, [10, duration], [0, 1], clamp)} />
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <defs><filter id="glow"><feGaussianBlur stdDeviation="6" /></filter></defs>
        {[{w: 10, o: 0.35, glow: true}, {w: 2.2, o: 0.95}].map((s, i) => (
          <polyline key={i} points={pts} fill="none" stroke={colors.thread} strokeWidth={s.w} strokeOpacity={s.o} strokeLinecap="round"
            filter={s.glow ? 'url(#glow)' : undefined} strokeDasharray={len} strokeDashoffset={len * (1 - reveal)} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};

// 0:03 Four route colours rise out of the field: one strand per protagonist, still apart.
export const Strands: React.FC<{duration: number; heroes: Hero[]}> = ({duration, heroes}) => {
  const f = useCurrentFrame(), t = f / FPS;
  const converge = interpolate(f, [0, duration], [0.15, 0.55], clamp);
  return (
    <AbsoluteFill style={{background: colors.night}}>
      <Weave width={W} height={H} t={t + 3} strands={heroes.map((h) => h.thread)} field={0.9}
        band={{y: H * 0.55, from: W * 0.55, spread: 120, up: 0, amp: 16}} converge={converge}
        strandAlpha={interpolate(f, [0, 20], [0, 1], clamp)} glow={heroes.map((_, i) => interpolate(f, [10 + i * 8, 30 + i * 8], [0, 0.6], clamp))} />
      <Dust t={t + 3} opacity={0.6} />
    </AbsoluteFill>
  );
};

// 0:10 One protagonist per bar: their thread, their portrait (as on the site), their name and the route's tagline.
export const HeroCard: React.FC<{hero: Hero; duration: number; index: number}> = ({hero, duration, index}) => {
  const f = useCurrentFrame(), t = f / FPS;
  const fade = Math.min(interpolate(f, [0, 8], [0, 1], clamp), interpolate(f, [duration - 8, duration], [1, 0], clamp));
  const rise = (d: number) => ({opacity: interpolate(f, [d, d + 12], [0, 1], clamp), transform: `translateY(${interpolate(f, [d, d + 16], [18, 0], {...clamp, easing: Easing.out(Easing.cubic)})}px)`});
  const push = interpolate(f, [0, duration], [1, 1.06]);
  return (
    <AbsoluteFill style={{opacity: fade, background: `radial-gradient(ellipse at 68% 46%, ${hero.deep} 0%, ${hero.deep}cc 38%, ${colors.night} 78%)`}}>
      <Weave width={W} height={H} t={t + index * 2} strands={[hero.thread]} field={0.55}
        band={{y: H * 0.8, from: 0, spread: 0, up: 0, amp: 14}} pluck={t} glow={[0.5]}
        mask={[{x: 140, y: 300, w: 760, h: 420}]} />
      <div style={{position: 'absolute', left: 1180, top: 540, width: 450, height: 600, opacity: rise(2).opacity,
        transform: `translate(-50%, calc(-50% + ${interpolate(f, [2, 18], [18, 0], {...clamp, easing: Easing.out(Easing.cubic)})}px)) scale(${push})`,
        boxShadow: '0 50px 120px rgba(0,0,0,.6)', border: '1px solid rgba(255,255,255,.14)', overflow: 'hidden'}}>
        <Img src={staticFile(hero.portrait)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
      </div>
      <div style={{position: 'absolute', left: 200, top: 360, color: colors.ink, fontFamily: serif}}>
        <div style={{fontSize: 22, letterSpacing: '.3em', color: hero.gold, ...rise(4)}}>PART I · {hero.faction}</div>
        <div style={{fontSize: 30, letterSpacing: '.18em', color: 'rgba(243,238,229,.6)', marginTop: 34, fontFamily: '"Noto Serif SC", "IPAGothic", serif', ...rise(8)}}>{hero.jp}</div>
        <div style={{fontSize: 128, lineHeight: 1.1, letterSpacing: '.06em', marginTop: 6, ...rise(8)}}>{hero.name}</div>
        <div style={{fontSize: 50, letterSpacing: '.14em', color: hero.gold, marginTop: 26, ...rise(16)}}>{hero.tagline}</div>
      </div>
    </AbsoluteFill>
  );
};
