import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {colors, FPS, G, H, Hero, monthDay, serif, W} from '../timeline';
import {homeBand, Weave} from '../components/Weave';
import {BrowserFrame} from '../components/Overlay';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.inOut(Easing.cubic);
const hero = G.home.hero;
const band = homeBand(G.home);
const copyMask = [{x: G.home.copy.x - 36, y: G.home.copy.y - hero.y, w: G.home.copy.w + 72, h: G.home.copy.h}, {x: G.home.meta.x, y: G.home.meta.y - hero.y + 8, w: G.home.meta.w, h: G.home.meta.h}];

// The home hero's weave, in page coordinates, exactly where the site draws it.
const HomeWeave: React.FC<{t: number; converge?: number; glow?: number; maskAlpha?: number}> = ({t, converge = 1, glow = 0, maskAlpha = 1}) => (
  <Weave width={hero.w} height={hero.h} t={t} strands={['#6f93d6', '#a58ad0', '#d8b45a', '#d9607f']} band={band}
    converge={converge} glow={[glow, glow, glow, glow]} mask={copyMask} maskAlpha={maskAlpha} style={{top: hero.y}} />
);

// 0:23 The four strands come together into one braid, in the very place the site's home page draws it.
export const Braid: React.FC<{duration: number}> = ({duration}) => {
  const f = useCurrentFrame(), t = 30 + f / FPS;
  return (
    <AbsoluteFill style={{background: colors.night}}>
      <AbsoluteFill style={{opacity: interpolate(f, [0, 10], [0, 1], clamp)}}>
        <HomeWeave t={t} converge={interpolate(f, [0, duration * 0.8], [0, 1], {...clamp, easing: ease})} glow={interpolate(f, [duration * 0.5, duration], [0.2, 0.9], clamp)}
          maskAlpha={interpolate(f, [duration - 25, duration], [0, 1], clamp)} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// A capture page inside the browser window: scale s (1 = full screen without chrome), scrolled by `scroll` px.
// Framed windows sit a little high, leaving the bottom of the screen to the subtitles.
const Window: React.FC<{s: number; chrome: number; dx?: number; children: React.ReactNode}> = ({s, chrome, dx = 0, children}) => (
  <BrowserFrame width={W * s} height={H * s} chrome={chrome} style={{left: (W - W * s) / 2 + dx, top: (H - H * s - 44 * chrome) / 2 - 50 * chrome * (1 - s) / 0.2}}>
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `scale(${s})`, transformOrigin: '0 0'}}>{children}</div>
  </BrowserFrame>
);

const Backdrop: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: colors.night}}>
    <Weave width={W} height={H} t={t} strands={[]} band={{y: 0, from: 0, spread: 0, up: 0, amp: 0}} field={0.6} />
  </AbsoluteFill>
);

// 0:27 The braid lands on the site's home page; the page settles into a browser window and scrolls gently.
export const Notebook: React.FC<{duration: number}> = ({duration}) => {
  const f = useCurrentFrame(), t = 30 + (f + 100) / FPS;
  const z = interpolate(f, [duration * 0.3, duration * 0.75], [0, 1], {...clamp, easing: ease});
  const s = 1 - 0.2 * z, scroll = interpolate(f, [duration * 0.45, duration], [0, 640], {...clamp, easing: ease});
  return (
    <AbsoluteFill>
      <Backdrop t={t} />
      <Window s={s} chrome={z}>
        <div style={{position: 'absolute', left: 0, top: -scroll, width: W}}>
          <Img src={staticFile('capture/home-full.png')} style={{width: W, display: 'block', opacity: interpolate(f, [0, 10], [0, 1], clamp)}} />
          <HomeWeave t={t} glow={interpolate(f, [0, 30], [0.9, 0], clamp)} />
        </div>
      </Window>
    </AbsoluteFill>
  );
};

// 0:33 "Who to meet": three people marked on the beat; a thread runs from each to the list, which fills in.
export const Planner: React.FC<{duration: number; marks: number[]}> = ({duration, marks}) => {
  const f = useCurrentFrame(), t = 40 + f / FPS;
  const n = marks.filter((m) => f >= m).length;
  const states = G.planner.states, sum = states[3].summary!;
  const push = interpolate(f, [0, duration], [0, 1], {easing: ease});
  return (
    <AbsoluteFill>
      <Backdrop t={t} />
      <Window s={0.8 + 0.03 * push} chrome={1}>
        {states.map((_, i) => (
          <Img key={i} src={staticFile(`capture/planner-${i}.png`)} style={{position: 'absolute', inset: 0, width: W, height: H,
            opacity: i === 0 ? 1 : interpolate(f, [marks[i - 1] ?? 9e9, (marks[i - 1] ?? 9e9) + 5], [0, 1], clamp)}} />
        ))}
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <defs><filter id="pg"><feGaussianBlur stdDeviation="4" /></filter></defs>
          {marks.map((m, i) => {
            const a = states[i + 1].avatars[i], b = (states[i + 1] as any).buttons?.[i];
            if (!a || !b || f < m) return null;
            // From the pressed "计划" button to the list it just joined: a short arc beside the rows, not across them.
            const x0 = b.x + b.w, y0 = b.y + b.h / 2, x1 = sum.x - 2, y1 = sum.y + 92 + i * 10;
            const d = `M ${x0} ${y0} C ${x0 + 40} ${y0}, ${x1 - 40} ${y1}, ${x1} ${y1}`;
            const p = interpolate(f, [m, m + 12], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)}), L = 1600;
            const o = interpolate(f, [m, m + 4, m + 40], [0, 1, 0.55], clamp);
            return (
              <g key={i} opacity={o}>
                <path d={d} fill="none" stroke={colors.gold} strokeWidth={9} strokeOpacity={0.35} filter="url(#pg)" strokeDasharray={L} strokeDashoffset={L * (1 - p)} />
                <path d={d} fill="none" stroke={colors.gold} strokeWidth={2.4} strokeDasharray={L} strokeDashoffset={L * (1 - p)} strokeLinecap="round" />
                <circle cx={a.x + a.w / 2} cy={a.y + a.h / 2} r={a.w / 2 + 6} fill="none" stroke={colors.gold} strokeWidth={2} opacity={interpolate(f, [m, m + 10, m + 30], [0, 1, 0.4], clamp)} />
                <circle cx={x1} cy={y1} r={4} fill={colors.gold} opacity={p} />
              </g>
            );
          })}
        </svg>
      </Window>
    </AbsoluteFill>
  );
};

// 0:40 The paralogue overview; "today" glides along the in-game calendar, ringing softly on the beats.
export const Paralogues: React.FC<{duration: number; bells: number[]}> = ({duration, bells}) => {
  const f = useCurrentFrame(), t = 50 + f / FPS, g = G.paralogues;
  const k = 1600 / g.figure.w, left = (W - 1600) / 2, top = (H - g.figure.h * k) / 2 - 20;
  const day = Math.round(interpolate(f, [6, duration - 6], [g.from + 10, g.to - 5], {...clamp, easing: ease}));
  const x = left + (g.track.x + ((day - g.from) / (g.to - g.from)) * g.track.w) * k;
  const ring = Math.max(0, ...bells.map((b) => (f >= b ? Math.exp(-(f - b) / 7) : 0)));
  return (
    <AbsoluteFill>
      <Backdrop t={t} />
      <div style={{position: 'absolute', left, top, width: 1600, opacity: interpolate(f, [0, 8], [0, 1], clamp), boxShadow: '0 40px 120px rgba(0,0,0,.55)', borderRadius: 8, overflow: 'hidden'}}>
        <Img src={staticFile('capture/paralogues.png')} style={{width: 1600, display: 'block'}} />
      </div>
      <div style={{position: 'absolute', left: x, top: top + (g.track.y - 10) * k, height: (g.track.h + 10) * k, borderLeft: `3px solid #a6502e`, boxShadow: `0 0 ${10 + 30 * ring}px rgba(230,120,80,${0.3 + 0.6 * ring})`}}>
        <span style={{position: 'absolute', bottom: '100%', left: -2, transform: 'translate(-50%, -6px)', padding: '4px 12px', background: '#a6502e', color: '#fff', fontFamily: serif, fontSize: 24, whiteSpace: 'nowrap', borderRadius: 3}}>今天 {monthDay(day)}</span>
      </div>
    </AbsoluteFill>
  );
};

// 0:43 Day to night: the theme toggle opens the dark page from where it sits; then the phone slides in.
export const Night: React.FC<{duration: number; at: number}> = ({duration, at}) => {
  const f = useCurrentFrame(), t = 60 + f / FPS, tg = G.toggle;
  const r = interpolate(f, [at, at + 20], [0, 2300], {...clamp, easing: Easing.in(Easing.quad)});
  const phone = interpolate(f, [at + 30, at + 58], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill>
      <Backdrop t={t} />
      <Window s={0.8} chrome={1} dx={-150 * phone}>
        <Img src={staticFile('capture/reading-light.png')} style={{position: 'absolute', inset: 0, width: W, height: H}} />
        <Img src={staticFile('capture/reading-dark.png')} style={{position: 'absolute', inset: 0, width: W, height: H, clipPath: `circle(${r}px at ${tg.x + tg.w / 2}px ${tg.y + tg.h / 2}px)`}} />
      </Window>
      <div style={{position: 'absolute', left: 1440 + 500 * (1 - phone), top: 150, width: 372, height: 790, borderRadius: 52, padding: 11, background: '#0a0c0f', boxShadow: '0 40px 100px rgba(0,0,0,.6)', opacity: phone}}>
        <Img src={staticFile('capture/phone.png')} style={{width: 350, height: 768, borderRadius: 42, objectFit: 'cover', objectPosition: 'top'}} />
      </div>
    </AbsoluteFill>
  );
};

export type {Hero};
