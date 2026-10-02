import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {colors, FPS, H, T, W} from '../timeline';
import {clamp, Copy, FateRing, Flash, Paint, embers, rand, SYNC} from './kit';
import {toTextures, usePreloaded} from './Tunnel';

// 0:47-0:53 The four themes sound together: the four route threads spiral in from the edges of the frame and
// braid into one line ahead; the myriad threads follow; the ring of fate spins backwards, stops, and turns
// forward as the music lands in D major.
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

const glowTexture = () => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d')!, gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(255,250,235,1)'); gr.addColorStop(0.15, 'rgba(255,226,170,.55)'); gr.addColorStop(0.45, 'rgba(226,170,100,.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
};

const Scene: React.FC<{f: number; imgs: HTMLImageElement[]}> = ({f, imgs}) => {
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
  // camera: down the braid, slow then rushing into the knot at the end
  const p = interpolate(f, [0, 200], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const z = 30 - 128 * p;
  cam.position.set(0.6 * Math.sin(t * 0.7), -0.5 + 0.3 * Math.cos(t * 0.5), z);
  cam.fov = 55 + 25 * Math.pow(p, 4); cam.updateProjectionMatrix();
  cam.lookAt(0, 0.9 * (1 - p), z - 20);
  // the ring turns backwards, slows to a stop just before D major, then turns forward
  const stop = SYNC.impacts[2] - SYNC.impacts[1] - 14;
  const turn = f < stop ? -(stop - f) * (stop - f) * 0.0009 - (stop - f) * 0.01 : (f - stop) * (f - stop) * 0.002;
  const ringOpacity = interpolate(f, [10, 40, 190, 200], [0, 0.85, 0.85, 0.2], clamp);
  return (
    <>
      <group rotation={[0, 0, t * 0.9]}>
        <lineSegments geometry={fine}><lineBasicMaterial vertexColors transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} /></lineSegments>
        {tubes.map((tb, k) => (
          <group key={k}>
            <mesh geometry={tb.halo}><meshBasicMaterial color={T.heroes[k].thread} transparent opacity={0.22} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
            <mesh geometry={tb.core}><meshBasicMaterial color={new THREE.Color(T.heroes[k].thread).lerp(new THREE.Color('#ffffff'), 0.45)} toneMapped={false} /></mesh>
          </group>
        ))}
      </group>
      {tex.map((tx, k) => {
        // the four protagonists frame the vortex at first, each in a corner, then the camera passes them
        const a = [Math.PI * 0.78, Math.PI * 0.22, Math.PI * 1.22, Math.PI * 1.78][k], r = 4.4, zc = 18 - k * 1.5;
        const o = interpolate(f, [4 + k * 5, 16 + k * 5], [0, 1], clamp);
        return (
          <group key={k} position={[Math.cos(a) * r * 1.25, Math.sin(a) * r * 0.62, zc]}>
            <mesh position={[0, 0, -0.02]}><planeGeometry args={[2.06, 2.72]} /><meshBasicMaterial color={T.heroes[k].thread} transparent opacity={0.7 * o} toneMapped={false} /></mesh>
            <mesh><planeGeometry args={[1.95, 2.6]} /><meshBasicMaterial map={tx} transparent opacity={o} toneMapped={false} /></mesh>
          </group>
        );
      })}
      <group position={[0, 0, ZB + 6]}>
        <group rotation={[0, 0, (turn * Math.PI) / 180]}>
          <lineSegments geometry={ticks}><lineBasicMaterial color={colors.thread} transparent opacity={ringOpacity} blending={THREE.AdditiveBlending} /></lineSegments>
          <mesh><torusGeometry args={[4.6, 0.03, 6, 200]} /><meshBasicMaterial color={colors.thread} transparent opacity={ringOpacity} toneMapped={false} /></mesh>
        </group>
        <mesh rotation={[0, 0, (-turn * 1.7 * Math.PI) / 180]}><torusGeometry args={[3.6, 0.018, 6, 200]} /><meshBasicMaterial color={colors.thread} transparent opacity={ringOpacity * 0.7} toneMapped={false} /></mesh>
        <sprite scale={[14 + 30 * Math.pow(p, 3), 14 + 30 * Math.pow(p, 3), 1]}><spriteMaterial map={glow} transparent opacity={0.6 + 0.4 * p} blending={THREE.AdditiveBlending} depthWrite={false} /></sprite>
      </group>
    </>
  );
};

export const Converge: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f;
  const imgs = usePreloaded(T.heroes.map((h) => staticFile(h.portrait)));
  return (
    <AbsoluteFill style={{background: colors.night}}>
      {imgs && (
        <ThreeCanvas width={W} height={H} camera={{fov: 55, position: [0, 0, 30], near: 0.1, far: 300}} gl={{antialias: true}}>
          <color attach="background" args={[colors.night]} />
          <fog attach="fog" args={[colors.night, 30, 150]} />
          <Scene f={f} imgs={imgs} />
        </ThreeCanvas>
      )}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 40% at 50% 40%, rgba(8,10,13,.55) 0%, rgba(8,10,13,0) 70%)'}} />
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
