import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {colors, FPS, G, H, monthDay, serif, W} from '../timeline';
import {Weave} from '../components/Weave';
import {clamp, Flash, Label, rand, SYNC} from './kit';

// 0:27-0:47 The guide itself, never as a static full screen: a camera moves over 2x captures of the real site,
// close on type, avatars and the calendar, cutting on the beat. Geometry from the capture places every overlay.
type Cam = {x: number; y: number; z: number; rx?: number; ry?: number; rz?: number};
type Key = [number, Cam];
const ease = Easing.inOut(Easing.cubic);

const camAt = (f: number, ks: Key[]): Cam => {
  const pick = (k: keyof Cam) => interpolate(f, ks.map((x) => x[0]), ks.map((x) => x[1][k] ?? 0), {...clamp, easing: ease});
  return {x: pick('x'), y: pick('y'), z: pick('z'), rx: pick('rx'), ry: pick('ry'), rz: pick('rz')};
};
// Screen-space speed of the camera, for a touch of motion blur on fast moves.
const speed = (f: number, ks: Key[]) => {
  const a = camAt(f, ks), b = camAt(f - 1, ks);
  return Math.hypot((a.x - b.x) * a.z, (a.y - b.y) * a.z) + Math.abs(a.z - b.z) * 900;
};

// One capture under the camera. Zoom is done by layout size (not a scale transform), so Chrome rasterizes the 2x
// capture at the size it is shown and close-ups stay sharp; the tilt is a 3D transform about the focus point.
// A pre-blurred copy fills the frame's edges (depth of field), masked in screen space.
const Shot: React.FC<{name: string; w: number; h: number; cam: Cam; blur?: number; dof?: number; svg?: React.ReactNode; html?: (z: number) => React.ReactNode;
  under?: string; clip?: string; sheet?: boolean}> = ({name, w, h, cam, blur = 0, dof = 0.85, svg, html, under, clip, sheet = true}) => {
  const {x, y, z, rx = 0, ry = 0, rz = 0} = cam;
  const box = (src: string, extra?: React.ReactNode, clipPath?: string) => (
    <div style={{position: 'absolute', left: W / 2 - x * z, top: H / 2 - y * z, width: w * z, height: h * z, transformOrigin: `${x * z}px ${y * z}px`,
      transform: `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`, boxShadow: sheet ? '0 50px 160px rgba(0,0,0,.7)' : undefined, borderRadius: 6 * z, overflow: 'hidden', clipPath}}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', display: 'block'}} />
      {extra}
    </div>
  );
  const overlay = (
    <>
      {svg && <svg viewBox={`0 0 ${w} ${h}`} width={w * z} height={h * z} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>{svg}</svg>}
      {html && <div style={{position: 'absolute', left: 0, top: 0}}>{html(z)}</div>}
    </>
  );
  return (
    <AbsoluteFill style={{filter: blur > 0.3 ? `blur(${blur}px)` : undefined}}>
      <AbsoluteFill style={{perspective: 2400}}>
        {under && box(`capture/${under}.png`)}
        {box(`capture/${name}.png`, overlay, clip)}
      </AbsoluteFill>
      {dof > 0 && (
        <AbsoluteFill style={{perspective: 2400, opacity: dof, WebkitMaskImage: 'radial-gradient(ellipse 62% 58% at 50% 50%, transparent 45%, black 100%)'}}>
          {box(`capture/blur/${clip ? name : under ?? name}.jpg`)}
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

const Backdrop: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 40%, #18202a 0%, ${colors.night} 75%)`}}>
    <Weave width={W} height={H} t={t} strands={[colors.thread, '#6f93d6', '#a58ad0', '#d9607f']} field={0.9}
      band={{y: H * 0.86, from: 0, spread: 22, up: 0, amp: 14}} glow={[0.5, 0.2, 0.2, 0.2]} strandAlpha={0.7} />
  </AbsoluteFill>
);

const enter = (f: number) => interpolate(f, [0, 6], [9, 0], clamp);

// 0:27 The notebook opens on its own title line, then pulls back to the whole cover floating in the dark.
export const Book: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const ks: Key[] = [[0, {x: 440, y: 232, z: 3.1, rx: 9, ry: -14}], [42, {x: 640, y: 300, z: 2.5, rx: 6, ry: -10}],
    [70, {x: 880, y: 330, z: 1.4, rx: 4, ry: -8}], [100, {x: 960, y: 350, z: 0.86, rx: 3, ry: -7}]];
  return (
    <AbsoluteFill>
      <Backdrop t={f / FPS + 4} />
      <Shot name="home-weave" w={1920} h={1080} cam={camAt(f, ks)} blur={enter(f) + speed(f, ks) / 60} />
      <Label id="book" frame={from + f} eyebrow="THE FIELD NOTEBOOK" />
      <Flash frame={from + f} at={from} len={10} peak={0.8} />
    </AbsoluteFill>
  );
};

// 0:30 A route's notes: the chapter banner up close, then a cut down the page across screenshots and text.
export const Read: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), g = G.route;
  const a: Key[] = [[0, {x: 560, y: 270, z: 2.3, rx: 4, ry: 12}], [50, {x: 760, y: 320, z: 2.6, rx: 2, ry: 6}]];
  const img = g.sections[0].images;
  const b: Key[] = [[50, {x: img[0].x + 380, y: img[0].y + 80, z: 2.0, rx: 16, ry: -6}], [100, {x: img[1].x + 420, y: img[1].y + 200, z: 2.2, rx: 8, ry: -3}]];
  const second = f >= 50;
  return (
    <AbsoluteFill>
      <Backdrop t={f / FPS + 8} />
      <Shot name="route-kai" w={1920} h={2160} cam={camAt(f, second ? b : a)} blur={second ? enter(f - 50) : enter(f)} dof={second ? 0.55 : 0.85} />
      <Label id="read" frame={from + f} eyebrow="ROUTE NOTES" />
    </AbsoluteFill>
  );
};

// 0:33 The planner: three people marked on the beat; each mark sends a thread into the shopping list.
export const Planner: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f, g = G.planner;
  const marks = SYNC.marks.map((m) => m - from), n = marks.filter((m) => f >= m).length;
  const st = g.states[3], av = st.avatars, bt = st.buttons, sum = st.summary!;
  const ks: Key[] = [[0, {x: 760, y: 190, z: 2.3, rx: 6, ry: -10}], [22, {x: 820, y: 196, z: 2.3, rx: 5, ry: -9}], [42, {x: 820, y: 312, z: 2.2, rx: 5, ry: -8}],
    [60, {x: 860, y: 900, z: 2.0, rx: 4, ry: -8}], [80, {x: 1120, y: 570, z: 1.16, rx: 3, ry: -12}], [100, {x: 1140, y: 570, z: 1.08, rx: 3, ry: -11}]];
  const svg = (
    <>
      <defs><filter id="pglow"><feGaussianBlur stdDeviation="3" /></filter></defs>
      {marks.map((m, i) => {
        if (f < m || !av[i] || !bt[i]) return null;
        const age = f - m, ax = av[i]!.x + av[i]!.w / 2, ay = av[i]!.y + av[i]!.h / 2, bx = bt[i]!.x + bt[i]!.w / 2, by = bt[i]!.y + bt[i]!.h / 2;
        const tx = sum.x + 16, ty = sum.y + 150 + i * 46, d = `M ${ax} ${ay} C ${ax + 500} ${ay - 120}, ${tx - 260} ${ty + 80}, ${tx} ${ty}`;
        const len = 2600, draw = interpolate(age, [2, 18], [len, 0], {...clamp, easing: Easing.out(Easing.cubic)});
        return (
          <g key={i}>
            <circle cx={bx} cy={by} r={12 + age * 5} fill="none" stroke={colors.gold} strokeWidth={2} opacity={Math.max(0, 1 - age / 12)} />
            {[0, 1].map((p) => <path key={p} d={d} fill="none" stroke={p ? '#f3d9a0' : colors.gold} strokeWidth={p ? 1.6 : 6} opacity={p ? 0.95 : 0.4}
              filter={p ? undefined : 'url(#pglow)'} strokeDasharray={len} strokeDashoffset={draw} strokeLinecap="round" />)}
          </g>
        );
      })}
    </>
  );
  return (
    <AbsoluteFill>
      <Backdrop t={f / FPS + 12} />
      <Shot name={`planner-${n}`} w={1920} h={1080} cam={camAt(f, ks)} blur={enter(f) + speed(f, ks) / 70} svg={svg} dof={0.55} />
      <Label id="planner" frame={abs} eyebrow="RECRUIT PLANNER" />
    </AbsoluteFill>
  );
};

// 0:37 The paralogue calendar: a "today" line walks the windows; the bells ring as it reaches them.
export const Calendar: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f, g = G.paralogues;
  const day = interpolate(f, [0, 100], [g.from + 6, g.to - 8], {...clamp, easing: Easing.inOut(Easing.quad)});
  const lx = g.track.x + ((day - g.from) / (g.to - g.from)) * g.track.w;
  const ring = Math.max(0, ...SYNC.bells.map((b) => (abs >= b ? Math.exp(-(abs - b) / 7) : 0)));
  const ks: Key[] = [[0, {x: 260, y: 165, z: 2.5, rx: 16, ry: -12}], [100, {x: 700, y: 175, z: 2.0, rx: 6, ry: -5}]];
  const cam = camAt(f, ks); cam.x = cam.x * 0.4 + lx * 0.6;
  const html = (z: number) => (
    <div style={{position: 'absolute', left: lx * z, top: (g.track.y - 10) * z, height: (g.track.h + 12) * z, borderLeft: `${2 * z}px solid #b4552f`,
      boxShadow: `0 0 ${(8 + 26 * ring) * z}px rgba(236,128,84,${0.35 + 0.6 * ring})`}}>
      <span style={{position: 'absolute', bottom: '100%', left: 0, transform: `translate(-50%, ${-4 * z}px)`, padding: `${2 * z}px ${7 * z}px`, background: '#b4552f', color: '#fff',
        fontFamily: serif, fontSize: 12 * z, whiteSpace: 'nowrap', borderRadius: 2 * z}}>今天 {monthDay(Math.round(day))}</span>
    </div>
  );
  return (
    <AbsoluteFill>
      <Backdrop t={f / FPS + 16} />
      <Shot name="paralogues" w={g.figure.w} h={g.figure.h} cam={cam} blur={enter(f)} html={html} dof={0.7} />
      <Label id="calendar" frame={abs} eyebrow="PARALOGUE CALENDAR" />
    </AbsoluteFill>
  );
};

// 0:40 Day to night: the page turns dark in a sweep from the theme switch's corner; then the phone slides in.
export const Night: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f, tg = G.toggle, at = SYNC.wipe - from;
  const ks: Key[] = [[0, {x: 700, y: 430, z: 1.75, rx: 5, ry: -9}], [100, {x: 820, y: 470, z: 1.45, rx: 3, ry: -5}]];
  const cam = camAt(f, ks);
  const r = interpolate(f, [at, at + 16], [0, 2600], {...clamp, easing: Easing.in(Easing.quad)});
  const cx = tg.x + tg.w / 2, cy = tg.y + tg.h / 2;
  const phone = interpolate(f, [at + 8, at + 28], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const svg = r > 0 && r < 2600 ? <circle cx={cx} cy={cy} r={r} fill="none" stroke={colors.gold} strokeWidth={3} opacity={0.8} /> : null;
  return (
    <AbsoluteFill>
      <Backdrop t={f / FPS + 20} />
      <Shot name="reading-dark" under="reading-light" w={1920} h={1080} cam={cam} blur={enter(f)} dof={f < at ? 0.5 : 0.85} clip={`circle(${r * cam.z}px at ${cx * cam.z}px ${cy * cam.z}px)`} svg={svg} />
      <div style={{position: 'absolute', left: 1400 + 600 * (1 - phone), top: 120, width: 380, height: 800, perspective: 1600, opacity: phone}}>
        <div style={{width: 380, height: 800, borderRadius: 54, padding: 12, background: '#07090c', boxShadow: '0 60px 140px rgba(0,0,0,.75), 0 0 0 1px rgba(255,255,255,.08)',
          transform: `rotateY(${-26 + 12 * phone}deg) rotateZ(${2 * (1 - phone)}deg)`}}>
          <Img src={staticFile('capture/phone.png')} style={{width: 356, height: 776, borderRadius: 44, objectFit: 'cover', objectPosition: 'top'}} />
        </div>
      </div>
      <Label id="night" frame={abs} eyebrow="DAY & NIGHT" />
    </AbsoluteFill>
  );
};

// 0:43 Gathering: eight half-beat cuts across the whole guide, faster and faster, then everything is pulled
// into threads toward the centre for the convergence.
const CUTS: {name: string; w: number; h: number; a: Cam; b: Cam}[] = [
  {name: 'characters', w: 1920, h: 1800, a: {x: 560, y: 580, z: 2.0, ry: -8}, b: {x: 760, y: 590, z: 2.15, ry: -6}},
  {name: 'classes', w: 1920, h: 2160, a: {x: 640, y: 730, z: 3.0, rx: 10}, b: {x: 700, y: 740, z: 3.4, rx: 6}},
  {name: 'dossier', w: 1920, h: 1080, a: {x: 900, y: 330, z: 2.1, ry: 8}, b: {x: 940, y: 380, z: 2.3, ry: 5}},
  {name: 'weekly', w: 1920, h: 1080, a: {x: 620, y: 480, z: 2.1, rx: 10, ry: -6}, b: {x: 720, y: 520, z: 2.3, rx: 6}},
  {name: 'route-kai', w: 1920, h: 2160, a: {x: 900, y: 2060, z: 2.0, ry: 10}, b: {x: 1100, y: 2070, z: 2.2, ry: 6}},
  {name: 'planner-3', w: 1920, h: 1080, a: {x: 1390, y: 300, z: 2.2, ry: -10}, b: {x: 1390, y: 420, z: 2.4, ry: -6}},
  {name: 'home-weave', w: 1920, h: 1080, a: {x: 1180, y: 320, z: 1.9, rx: 6}, b: {x: 1260, y: 330, z: 2.1, rx: 3}},
];
export const Gather: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f, step = 12.5;
  const i = Math.min(CUTS.length, Math.floor(f / step)), local = f - i * step;
  const pull = interpolate(f, [CUTS.length * step, 100], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const c = CUTS[Math.min(i, CUTS.length - 1)];
  const u = interpolate(i < CUTS.length ? local : step + f - CUTS.length * step, [0, step], [0, 1]);
  const cam: Cam = {x: c.a.x + (c.b.x - c.a.x) * u, y: c.a.y + (c.b.y - c.a.y) * u, z: c.a.z + (c.b.z - c.a.z) * u, rx: c.a.rx ?? 0, ry: c.a.ry ?? 0};
  return (
    <AbsoluteFill>
      <Backdrop t={f / FPS + 24} />
      <AbsoluteFill style={{transform: `scaleX(${1 + pull * 2.5}) scaleY(${1 - pull * 0.6})`, opacity: 1 - pull, filter: `brightness(${1 + pull * 2})`}}>
        <Shot name={c.name} w={c.w} h={c.h} cam={cam} blur={interpolate(local, [0, 3], [6, 0], clamp) + pull * 14} dof={0.8} />
      </AbsoluteFill>
      <ThreadRush f={f} pull={pull} />
      <Flash frame={abs} at={from + 100} len={8} peak={1} />
    </AbsoluteFill>
  );
};

// Gold streaks that thicken as the cuts speed up and finally all run to the centre.
const ThreadRush: React.FC<{f: number; pull: number}> = ({f, pull}) => (
  <svg width={W} height={H} style={{position: 'absolute', inset: 0, mixBlendMode: 'screen'}}>
    {Array.from({length: 60}, (_, i) => {
      const y = H * rand(i, 1), dir = rand(i, 2) < 0.5 ? -1 : 1, sp = 40 + rand(i, 3) * 90, len = 200 + rand(i, 4) * 600;
      const x = dir > 0 ? ((f * sp + rand(i, 5) * W * 2) % (W + len)) - len : W - (((f * sp + rand(i, 5) * W * 2) % (W + len)) - len) - len;
      const ty = y + (H / 2 - y) * pull, a = (0.12 + 0.35 * rand(i, 6)) * interpolate(f, [0, 90], [0.3, 1], clamp);
      return <line key={i} x1={x} y1={ty} x2={x + len} y2={ty + (H / 2 - y) * pull * 0.2} stroke={['#e2c58c', '#6f93d6', '#a58ad0', '#d8b45a', '#d9607f'][i % 5]}
        strokeWidth={1 + rand(i, 7) * 2} opacity={a} />;
    })}
  </svg>
);
