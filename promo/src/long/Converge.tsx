import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {colors, FPS, H, T, W} from '../timeline';
import {clamp, Copy, FateRing, Flash, Paint, embers, rand, SYNC} from './kit';
import {toTextures, usePreloaded} from './Tunnel';
import portraits from '../../public/portrait/index.json';

// 0:47-0:53 The four themes sound together: the four route threads spiral in from the edges of the frame and
// braid into one line ahead; the myriad threads follow, and with them the whole archive of companions (every
// portrait, twice over) is swept down the vortex into the knot; the ring of fate spins backwards, stops, and
// turns forward as the music lands in D major.
const ZA = 22, ZB = -110;
const radius = (z: number) => 0.12 + 6.2 * Math.pow(Math.min(1, Math.max(0, (z - ZB) / (ZA - ZB))), 1.6);
const helix = (k: number, n: number, phase = 0) => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const z = ZA + ((ZB - ZA) * i) / n, a = (k * Math.PI) / 2 + phase + z * 0.16, r = radius(z);
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z));
  }
  return new THREE.CatmullRomCurve3(pts);
};

// The camera: drifts down the vortex (0-95), eases in while the wheel forms around the frame (95-185), then
// dives through the wheel's hub into the light (185-200). Frames are local to the scene.
const camAtFrame = (f: number) => f < 185
  ? interpolate(f, [0, 95, 150, 185], [30, 17, 14, 12.5], {...clamp, easing: Easing.inOut(Easing.cubic)})
  : interpolate(f, [185, 200], [12.5, -14], {...clamp, easing: Easing.in(Easing.cubic)});
const camZ = (t: number) => camAtFrame(t * FPS);

// The surprise: from bar 15 the cards are pulled out of the vortex and lock, ring by ring on sixteenth notes,
// into a great wheel of fates facing the camera, the four protagonists at its hub. The wheel turns backwards,
// stops dead on the cadence, and turns forward as the music lands in D major.
const WHEEL_Z = -6, LOCK = 100, SIXTEENTH = 6.25, FLY = 18, STOP = 186;
type Slot = {k: number; a0: number; r: number; h: number};
const wheelSlots = (n: number) => {
  const out: Slot[] = [];
  for (let k = 0; out.length < n; k++) {
    const r = 3.9 + k * 1.9, h = 1.5 + 0.14 * k, count = Math.floor((2 * Math.PI * r) / (h * 0.75 * 1.14));
    for (let j = 0; j < count && out.length < n; j++) out.push({k, a0: ((j + (k % 2) * 0.5) / count) * Math.PI * 2, r, h});
  }
  return out;
};
const lockOf = (k: number) => LOCK + k * SIXTEENTH;
const ease3 = (u: number) => { const v = Math.min(1, Math.max(0, u)); return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
// how far the wheel has turned by frame f: backwards, slowing to a stop at STOP, then forwards
const omega = (fr: number) => fr < STOP ? -0.75 * (1 - ease3((fr - 140) / (STOP - 140))) : 1.6 * ease3((fr - STOP) / 6);
const spinAt = (f: number) => { let s = 0; for (let k = LOCK; k < f; k++) s += omega(k) / FPS; return s; };
const HUB = [[-2.0, 0], [0, 2.0], [2.0, 0], [0, -2.0]];

// The whole archive of companions (every portrait, three times over) streams into the vortex: each card enters
// ahead of the camera at its own moment, then flows down the braid, turning with the twist, its orbit shrinking
// with the vortex, and fades as it reaches the knot. Entries are spread over the shot so the stream never thins.
const SWARM = portraits.length * 3;
const swarm = (i: number, t: number) => {
  const born = -1.6 + ((i + rand(i, 41)) / SWARM) * 7.2, age = t - born;
  const z0 = camZ(Math.max(0, born)) - 10 - rand(i, 46) * 28, v = 6 + rand(i, 42) * 8, z = z0 - v * Math.max(0, age);
  const m = 1.1 + rand(i, 43) * 1.4, a = rand(i, 44) * Math.PI * 2 + z * 0.16, r = radius(z) * m;
  return {x: Math.cos(a) * r, y: Math.sin(a) * r, z, r, a, age, size: (1.25 + rand(i, 45) * 1.0) * Math.min(1, Math.max(0.28, r / 2.4))};
};

const glowTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.15, 'rgba(255,226,170,.55)'); gr.addColorStop(0.45, 'rgba(226,170,100,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
};

const Scene: React.FC<{f: number; imgs: HTMLImageElement[]; heroImgs: number[]}> = ({f, imgs, heroImgs}) => {
  const {camera} = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const t = f / FPS;
  const tubes = useMemo(() => T.heroes.map((_, k) => ({core: new THREE.TubeGeometry(helix(k, 260), 520, 0.05, 6), halo: new THREE.TubeGeometry(helix(k, 260), 520, 0.22, 6)})), []);
  const fine = useMemo(() => {
    const pos: number[] = [], col: number[] = [];
    const palette = [colors.thread, colors.thread, colors.gold, ...T.heroes.map((h) => h.thread)].map((c) => new THREE.Color(c));
    for (let i = 0; i < 380; i++) {
      const m = 1.15 + rand(i, 1) * 2.6, ph = rand(i, 2) * 6.28, tw = 0.08 + rand(i, 3) * 0.12, c = palette[i % palette.length].clone().multiplyScalar(0.2 + 0.45 * rand(i, 4));
      let prev: number[] | null = null;
      for (let j = 0; j <= 70; j++) {
        const z = ZA + ((ZB - ZA) * j) / 70, a = ph + z * tw, r = radius(z) * m;
        const p = [Math.cos(a) * r, Math.sin(a) * r, z];
        if (prev) { pos.push(...prev, ...p); col.push(c.r, c.g, c.b, c.r, c.g, c.b); }
        prev = p;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  }, []);
  const glow = useMemo(glowTexture, []);
  const tex = useMemo(() => toTextures(imgs), [imgs]);
  const ticks = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < 120; i++) { const a = (i / 120) * Math.PI * 2, l = i % 10 === 0 ? 0.5 : 0.22; pts.push(Math.cos(a) * 4.6, Math.sin(a) * 4.6, 0, Math.cos(a) * (4.6 - l), Math.sin(a) * (4.6 - l), 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g;
  }, []);
  const slots = useMemo(() => wheelSlots(SWARM), []);
  const ringCount = slots[slots.length - 1].k + 1;
  const circles = useMemo(() => Array.from({length: ringCount}, (_, k) => {
    const r = 3.9 + k * 1.9 - (1.5 + 0.14 * k) * 0.62, pts: number[] = [];
    for (let j = 0; j <= 128; j++) { const a = (j / 128) * Math.PI * 2; pts.push(Math.cos(a) * r, Math.sin(a) * r, 0); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g;
  }), []);
  const spokes = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SWARM * 6), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SWARM * 6), 3));
    return g;
  }, []);
  // camera
  const camZnow = camAtFrame(f), w = ease3((f - 90) / 45), dive = ease3((f - 185) / 15);
  cam.position.set(0.6 * Math.sin(t * 0.7) * (1 - w), (-0.5 + 0.3 * Math.cos(t * 0.5)) * (1 - w), camZnow);
  cam.fov = 55 + 30 * dive; cam.updateProjectionMatrix();
  const look = new THREE.Vector3(0, 0.9, camZnow - 20).lerp(new THREE.Vector3(0, 0, WHEEL_Z), w).lerp(new THREE.Vector3(0, 0, -60), dive);
  cam.lookAt(look);
  const spin = spinAt(f);
  // the far ring of fate turns with the wheel
  const ringOpacity = interpolate(f, [10, 40, 190, 200], [0, 0.85, 0.85, 0.2], clamp);
  const vortexFade = 1 - 0.6 * w * (1 - dive);
  const gold = new THREE.Color(colors.thread);
  const sp = spokes.getAttribute('position') as THREE.BufferAttribute, sc = spokes.getAttribute('color') as THREE.BufferAttribute;
  const cards = Array.from({length: SWARM}, (_, i) => {
    const c = swarm(i, t), sl = slots[i], u = ease3((f - lockOf(sl.k)) / FLY);
    const aw = c.a + t * 0.9;                                   // vortex position in world space (the vortex turns)
    const th = sl.a0 + spin * (1.25 - 0.07 * sl.k);
    const wx = Math.cos(th) * sl.r, wy = Math.sin(th) * sl.r;
    const x = Math.cos(aw) * c.r * (1 - u) + wx * u, y = Math.sin(aw) * c.r * (1 - u) + wy * u;
    const z = c.z * (1 - u) + (WHEEL_Z - 0.03 * sl.k) * u + Math.sin(Math.PI * u) * 4;
    const near = Math.min(1, Math.max(0, (camZnow - z - 4) / 6));
    const ov = interpolate(c.age, [0, 0.3], [0, 1], clamp) * Math.min(1, Math.max(0, (c.r - 0.3) / 0.9));
    const o = (ov * (1 - Math.min(1, u * 2)) + Math.min(1, u * 2)) * near;
    sp.setXYZ(i * 2, 0, 0, WHEEL_Z - 0.2); sp.setXYZ(i * 2 + 1, x, y, z - 0.05);
    const k = 0.32 * u * near; sc.setXYZ(i * 2, gold.r * k * 0.2, gold.g * k * 0.2, gold.b * k * 0.2); sc.setXYZ(i * 2 + 1, gold.r * k, gold.g * k, gold.b * k);
    if (o <= 0.01 || z > camZnow - 0.5) return null;
    const size = c.size * (1 - u) + (sl.h / 1.36) * u;
    const rz = 0.35 * Math.sin(c.a) * (1 - u) + (th - Math.PI / 2) * u;
    return (
      <group key={i} position={[x, y, z]} rotation={[-y * 0.04 * (1 - u), x * 0.04 * (1 - u), rz]} scale={[size, size, 1]}>
        <mesh position={[0, 0, -0.01]}><planeGeometry args={[1.08, 1.42]} /><meshBasicMaterial color={colors.gold} transparent opacity={0.5 * o} toneMapped={false} depthWrite={false} /></mesh>
        <mesh><planeGeometry args={[1.02, 1.36]} /><meshBasicMaterial map={tex[i % tex.length]} transparent opacity={o} toneMapped={false} depthWrite={false} /></mesh>
      </group>
    );
  });
  sp.needsUpdate = true; sc.needsUpdate = true;
  return (
    <>
      <group rotation={[0, 0, t * 0.9]}>
        <lineSegments geometry={fine}><lineBasicMaterial vertexColors transparent opacity={0.8 * vortexFade} blending={THREE.AdditiveBlending} depthWrite={false} /></lineSegments>
        {tubes.map((tb, k) => (
          <group key={k}>
            <mesh geometry={tb.halo}><meshBasicMaterial color={T.heroes[k].thread} transparent opacity={0.22 * vortexFade} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
            <mesh geometry={tb.core}><meshBasicMaterial color={new THREE.Color(T.heroes[k].thread).lerp(new THREE.Color('#ffffff'), 0.45)} transparent opacity={vortexFade} toneMapped={false} /></mesh>
          </group>
        ))}
      </group>
      <lineSegments geometry={spokes}><lineBasicMaterial vertexColors transparent blending={THREE.AdditiveBlending} depthWrite={false} /></lineSegments>
      {circles.map((g, k) => {
        const u = ease3((f - lockOf(k) - 4) / FLY);
        return u > 0 ? <lineLoop key={k} geometry={g} position={[0, 0, WHEEL_Z - 0.1]} rotation={[0, 0, spin * (1.25 - 0.07 * k)]}>
          <lineBasicMaterial color={colors.thread} transparent opacity={0.45 * u * (1 - dive)} blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineLoop> : null;
      })}
      {cards}
      {heroImgs.map((hi, k) => {
        const tx = tex[hi];
        // the four protagonists frame the vortex at first, each in a corner, then fly to the wheel's hub
        const a = [Math.PI * 0.78, Math.PI * 0.22, Math.PI * 1.22, Math.PI * 1.78][k], r = 4.4;
        const u = ease3((f - 88 - k * 2) / 26);
        const x = Math.cos(a) * r * 1.25 * (1 - u) + HUB[k][0] * u, y = Math.sin(a) * r * 0.62 * (1 - u) + HUB[k][1] * u;
        const z = (18 - k * 1.5) * (1 - u) + (WHEEL_Z + 0.4) * u + Math.sin(Math.PI * u) * 2;
        const o = interpolate(f, [4 + k * 5, 16 + k * 5], [0, 1], clamp) * Math.min(1, Math.max(0, (camZnow - z - 1.5) / 3));
        if (o <= 0.01) return null;
        return (
          <group key={k} position={[x, y, z]} scale={[1 - 0.2 * u, 1 - 0.2 * u, 1]}>
            <mesh position={[0, 0, -0.02]}><planeGeometry args={[2.06, 2.72]} /><meshBasicMaterial color={T.heroes[k].thread} transparent opacity={0.7 * o} toneMapped={false} /></mesh>
            <mesh><planeGeometry args={[1.95, 2.6]} /><meshBasicMaterial map={tx} transparent opacity={o} toneMapped={false} /></mesh>
          </group>
        );
      })}
      <sprite position={[0, 0, WHEEL_Z - 0.5]} scale={[7 + 5 * w + 40 * dive, 7 + 5 * w + 40 * dive, 1]}>
        <spriteMaterial map={glow} transparent opacity={(0.22 + 0.4 * w) * (f > STOP ? 1 : 0.85)} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <group position={[0, 0, ZB + 6]}>
        <group rotation={[0, 0, spin * 0.6]}>
          <lineSegments geometry={ticks}><lineBasicMaterial color={colors.thread} transparent opacity={ringOpacity * (1 - 0.5 * w)} blending={THREE.AdditiveBlending} /></lineSegments>
          <mesh><torusGeometry args={[4.6, 0.03, 6, 200]} /><meshBasicMaterial color={colors.thread} transparent opacity={ringOpacity * (1 - 0.5 * w)} toneMapped={false} /></mesh>
        </group>
        <sprite scale={[14, 14, 1]}><spriteMaterial map={glow} transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
      </group>
    </>
  );
};

export const Converge: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f;
  const imgs = usePreloaded(portraits.map((p) => staticFile(`portrait/${p}`)));
  const heroImgs = T.heroes.map((h) => portraits.indexOf(h.portrait.split('/').pop()!));
  return (
    <AbsoluteFill style={{background: colors.night}}>
      {imgs && (
        <ThreeCanvas width={W} height={H} camera={{fov: 55, position: [0, 0, 30], near: 0.1, far: 300}} gl={{antialias: true}}>
          <color attach="background" args={[colors.night]} />
          <fog attach="fog" args={[colors.night, 30, 150]} />
          <Scene f={f} imgs={imgs} heroImgs={heroImgs} />
        </ThreeCanvas>
      )}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 40% at 50% 40%, rgba(8,10,13,.55) 0%, rgba(8,10,13,0) 70%)'}} />
      {/* a title band under the slogan: the wheel shows above and below it */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 590, height: 330, opacity: interpolate(abs, [1434, 1450, 1588, 1598], [0, 1, 1, 0], clamp),
        background: 'linear-gradient(to bottom, rgba(8,10,13,0) 0%, rgba(8,10,13,.74) 28%, rgba(8,10,13,.78) 72%, rgba(8,10,13,0) 100%)'}} />
      <div style={{position: 'absolute', top: 640, width: W, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26}}>
        <Copy id="line1" frame={abs} size={96} stagger={2.6} />
        <Copy id="line2" frame={abs} size={96} stagger={2.6} color="#f1d49a" glow="rgba(241,212,154,.5)" />
      </div>
      <Flash frame={abs} at={from} len={12} peak={1} />
    </AbsoluteFill>
  );
};

// 0:53-1:00 D major: one thread again, steady and warm. The harp plays the motif once more and the thread answers
// each note. The name comes in first and the address right after it (from about 0:54.5), so it stays readable for 5 s.
const LY = H * 0.66;
export const End: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f, t = f / FPS;
  const plucks = [...SYNC.endMotif, SYNC.endMotif[3] + 25].map((p, i) => ({f: p - from, x: W * (0.3 + 0.1 * i), a: 16}));
  const show = (d: number, len = 22) => {
    const u = interpolate(f, [d, d + len], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    return {opacity: u, filter: `blur(${(1 - u) * 10}px)`, transform: `translateY(${(1 - u) * 16}px)`};
  };
  const draw = (ctx: CanvasRenderingContext2D) => {
    embers(ctx, t + 3, 40, 0.8);
    const swing = (x: number) => plucks.reduce((s, p) => {
      if (f < p.f) return s;
      const a = p.a * Math.exp(-((f - p.f) / FPS) * 1.4);
      return s + a * (x < p.x ? (x + 40) / (p.x + 40) : (W + 40 - x) / (W + 40 - p.x));
    }, 0);
    const reach = interpolate(f, [0, 18], [0.05, 1], {...clamp, easing: Easing.out(Easing.cubic)});
    for (let pass = 0; pass < 2; pass++) for (let k = 0; k < 7; k++) {
      const ph = Math.cos((Math.PI * k) / 6);
      ctx.beginPath();
      for (let i = 0; i <= 96; i++) {
        const x = W / 2 + (i / 96 - 0.5) * (W + 80) * reach, y = LY + ph * swing(x);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = pass ? 'rgba(255,236,196,.42)' : 'rgba(226,197,140,.07)';
      ctx.lineWidth = pass ? 1.6 : 14; ctx.stroke();
    }
  };
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 64%, #221c16 0%, ${colors.night} 62%)`, opacity: interpolate(f, [170, 200], [1, 0], clamp)}}>
      <div style={{position: 'absolute', left: W / 2 - 760, top: LY - 760}}>
        <FateRing size={1520} turn={t * 6} opacity={interpolate(f, [0, 40], [0, 0.16], clamp)} />
      </div>
      <Paint draw={draw} />
      <div style={{position: 'absolute', top: 250, width: W, textAlign: 'center', color: colors.ink}}>
        <div style={{fontFamily: '"Noto Serif SC", serif', fontWeight: 600, fontSize: 128, letterSpacing: '.3em', paddingLeft: '.3em',
          textShadow: '0 0 50px rgba(226,197,140,.35)', ...show(10, 28)}}>万缕千丝</div>
        <div style={{fontFamily: '"Noto Serif SC", serif', fontSize: 36, letterSpacing: '1em', paddingLeft: '1em', color: colors.goldSoft, marginTop: 22, ...show(26)}}>战术手帖</div>
      </div>
      <div style={{position: 'absolute', top: LY + 70, width: W, textAlign: 'center'}}>
        <div style={{fontFamily: '"Libre Caslon Text", serif', fontStyle: 'italic', fontSize: 50, letterSpacing: '.04em', color: colors.thread, ...show(38)}}>fe-guide.pages.dev</div>
        <div style={{fontFamily: '"Noto Serif SC", serif', fontSize: 20, letterSpacing: '.12em', color: 'rgba(243,238,229,.55)', marginTop: 30, ...show(58)}}>
          玩家整理 · 非官方网站　｜　游戏与美术版权归 Nintendo / INTELLIGENT SYSTEMS 所有
        </div>
      </div>
      <Flash frame={abs} at={from} len={16} peak={1} />
    </AbsoluteFill>
  );
};
