import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import portraits from '../../public/portrait/index.json';
import {H, T, W} from '../timeline';
import {BEAT, CS, Flash, Line, STEP, Shake, clamp, hexA, latin, rand, zh} from './ckit';

// 0:29 "改写他们的命运。" — a stop-time hit on the four, side by side, then the panels tear apart on the tom run.
export const Rewrite: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f;
  const tear = interpolate(f, [BEAT * 3, BEAT * 4], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  return (
    <AbsoluteFill style={{background: '#07080b', overflow: 'hidden'}}>
      <Shake f={f} hits={[0]} amount={30}>
        {T.heroes.map((h, i) => {
          const pulse = interpolate(f, [0, 10], [1, 0], clamp);
          return (
            <div key={h.id} style={{position: 'absolute', top: -40, height: H + 80, left: (W / 4) * i - 20, width: W / 4 + 40, overflow: 'hidden',
              transform: `translateY(${(i % 2 ? 1 : -1) * tear * 900}px) skewX(-6deg)`, borderRight: '4px solid #07080b'}}>
              <Img src={staticFile(h.portrait)} style={{position: 'absolute', left: -60, top: 40, width: W / 4 + 160, height: (W / 4 + 160) * 1.333, objectFit: 'cover',
                transform: `scale(${1.05 + 0.04 * (f / 80)})`, filter: `saturate(${0.6 + 0.6 * pulse}) brightness(${0.55 + 0.6 * pulse})`}} />
              <div style={{position: 'absolute', inset: 0, background: `linear-gradient(to top, ${hexA(h.deep, 0.9)} 0%, ${hexA(h.deep, 0.15)} 55%, rgba(0,0,0,.4) 100%)`}} />
              <div style={{position: 'absolute', bottom: 120, width: '100%', textAlign: 'center', fontFamily: zh, fontSize: 40, letterSpacing: '.3em', color: h.gold, opacity: 0.9}}>{h.name}</div>
            </div>
          );
        })}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', background: 'radial-gradient(ellipse 50% 22% at 50% 50%, rgba(0,0,0,.7), rgba(0,0,0,0))'}}>
          <Line id="rewrite" frame={abs} size={128} color="#fff6e8" />
        </AbsoluteFill>
      </Shake>
      <Flash f={f} at={0} len={6} peak={1} />
    </AbsoluteFill>
  );
};

// 0:32 "集结万千同伴。" — every companion strobes in on sixteenths, four at a time, each tied to the nearest ones by a
// gold thread, until the web fills the frame.
const NODES = portraits.map((p, i) => {
  const a = i * 2.39996, r = 70 * Math.sqrt(i + 1.5);
  return {p, x: Math.cos(a) * r * 1.5, y: Math.sin(a) * r * 0.86, step: Math.floor(i / 4)};
});
const LINKS = NODES.flatMap((n, i) => NODES.slice(0, i).map((m, j) => ({j, d: Math.hypot(n.x - m.x, n.y - m.y)})).sort((a, b) => a.d - b.d).slice(0, 2).map((l) => [l.j, i]));

export const Web: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f;
  const step = Math.floor(f / STEP), scale = interpolate(f, [0, 76], [1.9, 0.92], {...clamp, easing: Easing.out(Easing.quad)});
  const rushIn = interpolate(f, [70, 80], [1, 4], {...clamp, easing: Easing.in(Easing.cubic)});
  const vis = (n: (typeof NODES)[number]) => step >= n.step;
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, #1b130c 0%, #07080b 70%)', overflow: 'hidden'}}>
      <AbsoluteFill style={{transform: `scale(${scale * rushIn}) rotate(${f * 0.15}deg)`, opacity: interpolate(f, [72, 80], [1, 0], clamp)}}>
        <svg width={W} height={H} viewBox={`${-W / 2} ${-H / 2} ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
          {LINKS.map(([a, b], k) => {
            if (!vis(NODES[b])) return null;
            const age = f - NODES[b].step * STEP, hot = Math.exp(-age / 4);
            return <line key={k} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} stroke={hot > 0.2 ? '#fff1c8' : '#d8b45a'} strokeWidth={1.5 + 3 * hot} opacity={0.45 + 0.5 * hot} />;
          })}
        </svg>
        {NODES.map((n, i) => {
          if (!vis(n)) return null;
          const age = f - n.step * STEP, pop = interpolate(age, [0, 3], [1.6, 1], {...clamp, easing: Easing.out(Easing.cubic)}), hot = Math.exp(-age / 4);
          return (
            <div key={i} style={{position: 'absolute', left: W / 2 + n.x - 46, top: H / 2 + n.y - 46, width: 92, height: 92, borderRadius: '50%', overflow: 'hidden',
              transform: `scale(${pop})`, boxShadow: `0 0 0 3px ${hot > 0.2 ? '#fff6dc' : '#d8b45a'}, 0 0 ${30 * hot + 8}px rgba(255,200,120,${0.3 + 0.6 * hot})`}}>
              <Img src={staticFile(`portrait/${n.p}`)} style={{width: 92, height: 122, objectFit: 'cover', filter: `brightness(${1 + hot})`}} />
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', background: 'radial-gradient(ellipse 46% 16% at 50% 50%, rgba(0,0,0,.75), rgba(0,0,0,0))'}}>
        <Line id="gather" frame={abs} size={120} color="#fff6e8" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// 0:35 The battlefield: a tactics board in perspective; blue movement and red attack ranges bloom on the beat;
// sword, lance and axe clash in the weapon triangle; a level-up rolls in on sixteenths.
const COLS = 15, ROWS = 9, TILE = 104;
const UNITS = [{id: 0, c: 4, r: 4}, {id: 1, c: 7, r: 2}, {id: 2, c: 6, r: 6}, {id: 3, c: 10, r: 4}];
const ENEMIES = [{c: 12, r: 3}, {c: 12, r: 6}, {c: 9, r: 1}];
const STATS = ['HP', '力量', '魔力', '速度', '守备', '魔防'];

const Icon: React.FC<{kind: 'sword' | 'lance' | 'axe'; color: string}> = ({kind, color}) => (
  <svg width={110} height={110} viewBox="-55 -55 110 110">
    <g stroke={color} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round" transform="rotate(-45)">
      {kind === 'sword' && <><line x1={0} y1={-44} x2={0} y2={24} /><line x1={-16} y1={24} x2={16} y2={24} /><line x1={0} y1={24} x2={0} y2={42} /><path d="M -5 -40 L 0 -50 L 5 -40" /></>}
      {kind === 'lance' && <><line x1={0} y1={-30} x2={0} y2={46} /><path d="M -9 -28 L 0 -52 L 9 -28 Z" fill={color} /></>}
      {kind === 'axe' && <><line x1={0} y1={-44} x2={0} y2={46} /><path d="M 0 -40 C 26 -46, 34 -14, 0 -8 Z" fill={color} /></>}
    </g>
  </svg>
);

export const Battle: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f;
  const clashes = CS.clashes.map((c) => c - from), lv = CS.levelup - from;
  const range = (u: (typeof UNITS)[number], r: number, c: number, row: number) => Math.abs(c - u.c) + Math.abs(row - u.r) <= r;
  const active = Math.min(UNITS.length - 1, Math.floor(f / BEAT));
  const moveR = interpolate(f % BEAT, [0, 6], [0, 3], clamp), atk = f % BEAT >= BEAT / 2;
  const turn = interpolate(f, [0, 80], [-28, -18]);
  const pair = [['sword', 'axe'], ['axe', 'lance'], ['lance', 'sword']] as const;
  const hitNow = clashes.map((c) => (f >= c ? Math.exp(-(f - c) / 5) : 0));
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, #121a24 0%, #050608 75%)', overflow: 'hidden'}}>
      <Shake f={f} hits={clashes} amount={14}>
        <div style={{position: 'absolute', left: W / 2 - (COLS * TILE) / 2, top: H / 2 - (ROWS * TILE) / 2 + 60, width: COLS * TILE, height: ROWS * TILE,
          transform: `perspective(1500px) rotateX(54deg) rotateZ(${turn}deg) scale(${interpolate(f, [0, 80], [1.55, 1.8])})`, transformStyle: 'preserve-3d'}}>
          {Array.from({length: COLS * ROWS}, (_, k) => {
            const c = k % COLS, r = Math.floor(k / COLS), u = UNITS[active];
            const blue = range(u, moveR, c, r), red = atk && range(u, moveR + 1, c, r) && !range(u, moveR - 0.5, c, r);
            const base = (c + r) % 2 ? '#1a222c' : '#161d26';
            return <div key={k} style={{position: 'absolute', left: c * TILE, top: r * TILE, width: TILE - 2, height: TILE - 2, background: red ? 'rgba(230,70,60,.55)' : blue ? 'rgba(70,130,240,.5)' : base,
              boxShadow: red ? 'inset 0 0 0 2px rgba(255,140,120,.8)' : blue ? 'inset 0 0 0 2px rgba(150,190,255,.8)' : 'inset 0 0 0 1px rgba(216,180,90,.18)'}} />;
          })}
          {ENEMIES.map((e, i) => <div key={i} style={{position: 'absolute', left: e.c * TILE + 22, top: e.r * TILE + 22, width: TILE - 44, height: TILE - 44, transform: 'rotate(45deg)',
            background: 'linear-gradient(135deg, #8a1c1c, #3a0909)', boxShadow: '0 0 20px rgba(220,40,40,.6)'}} />)}
          {UNITS.map((u, i) => {
            const h = T.heroes[i], hop = i === active ? Math.abs(Math.sin(((f % BEAT) / BEAT) * Math.PI)) * 30 : 0;
            return (
              <div key={i} style={{position: 'absolute', left: u.c * TILE + 6, top: u.r * TILE + 6, width: TILE - 12, height: TILE - 12, transformStyle: 'preserve-3d',
                transform: `translateZ(${40 + hop}px) rotateZ(${-turn}deg) rotateX(-56deg)`, transformOrigin: '50% 100%'}}>
                <div style={{width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', boxShadow: `0 0 0 4px ${h.thread}, 0 0 26px ${hexA(h.thread, 0.8)}`}}>
                  <Img src={staticFile(h.portrait)} style={{width: '100%', height: '133%', objectFit: 'cover'}} />
                </div>
              </div>
            );
          })}
        </div>
      </Shake>
      {/* the weapon triangle */}
      <div style={{position: 'absolute', right: 150, top: 200, width: 340, height: 300, transform: 'scale(1.35)', transformOrigin: 'right top'}}>
        <svg width={340} height={300} style={{position: 'absolute', inset: 0}}>
          <polygon points="170,40 300,260 40,260" fill="none" stroke="rgba(216,180,90,.6)" strokeWidth={2} />
        </svg>
        {(['sword', 'lance', 'axe'] as const).map((k, i) => {
          const pos = [[115, -15], [245, 205], [-15, 205]][i];
          const lit = Math.max(...pair.map((p, j) => ((p as readonly string[]).includes(k) ? hitNow[j] : 0)));
          return <div key={k} style={{position: 'absolute', left: pos[0], top: pos[1], transform: `scale(${1 + 0.35 * lit})`, filter: `drop-shadow(0 0 ${8 + 30 * lit}px rgba(255,210,140,${0.4 + 0.6 * lit}))`}}>
            <Icon kind={k} color={lit > 0.3 ? '#fff4d8' : '#d8b45a'} />
          </div>;
        })}
        {hitNow.map((h, j) => h > 0.05 && <div key={j} style={{position: 'absolute', left: 170 - 90, top: 150 - 90, width: 180, height: 180, borderRadius: '50%', opacity: h,
          background: 'radial-gradient(circle, rgba(255,250,230,1) 0%, rgba(255,200,120,.5) 25%, rgba(0,0,0,0) 70%)', transform: `scale(${1 + (1 - h) * 1.5})`}} />)}
      </div>
      {/* level up */}
      {f >= lv - 2 && (
        <div style={{position: 'absolute', left: 130, top: 190, width: 460, padding: '28px 34px', background: 'rgba(10,12,16,.86)', border: '2px solid #d8b45a',
          boxShadow: '0 0 40px rgba(216,180,90,.35)', transform: `scale(${interpolate(f, [lv - 2, lv + 3], [0.6, 1], {...clamp, easing: Easing.out(Easing.back(2))})})`, transformOrigin: 'left top'}}>
          <div style={{fontFamily: latin, fontSize: 40, letterSpacing: '.18em', color: '#ffd27a'}}>LEVEL UP</div>
          {STATS.map((s, i) => {
            const on = f >= lv + i * 3, pop = on ? interpolate(f - lv - i * 3, [0, 4], [1.6, 1], clamp) : 0;
            return (
              <div key={s} style={{display: 'flex', justifyContent: 'space-between', fontFamily: zh, fontSize: 30, color: '#e9e3d6', marginTop: 10, borderBottom: '1px solid rgba(216,180,90,.2)'}}>
                <span>{s}</span><span style={{color: '#7fd0ff', opacity: on ? 1 : 0, transform: `scale(${pop})`, fontFamily: latin}}>+1</span>
              </div>
            );
          })}
        </div>
      )}
    </AbsoluteFill>
  );
};
