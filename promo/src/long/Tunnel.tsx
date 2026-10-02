import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import portraits from '../../public/portrait/index.json';
import {colors, FPS, H, T, W} from '../timeline';
import {clamp, Copy, Flash, rand} from './kit';

// 0:10-0:13 The rejoined thread becomes thousands, and every companion in the archive hangs in them: the camera
// flies down a tunnel of fates, through a turning ring, into the first chapter's downbeat.
const THREADS = 520, SEG = 74, Z0 = 14, Z1 = -150;
const HERO = T.heroes.map((h) => new THREE.Color(h.thread));

// Images are loaded before the 3D canvas mounts, so the very first render already has them (a texture that
// finishes loading later would not be redrawn: the canvas only renders when Remotion asks for a frame).
export const usePreloaded = (urls: string[]) => {
  const [handle] = useState(() => delayRender(`images ${urls.length}`));
  const [imgs, setImgs] = useState<HTMLImageElement[] | null>(null);
  useEffect(() => {
    Promise.all(urls.map((u) => new Promise<HTMLImageElement>((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(im); im.src = u; })))
      .then((list) => { setImgs(list); continueRender(handle); });
  }, []);
  return imgs;
};
export const toTextures = (imgs: HTMLImageElement[]) => imgs.map((im) => {
  const tex = new THREE.Texture(im); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.needsUpdate = true; return tex;
});

const threadGeometry = () => {
  const pos = new Float32Array(THREADS * (SEG - 1) * 6), col = new Float32Array(THREADS * (SEG - 1) * 6);
  const gold = new THREE.Color(colors.thread), cool = new THREE.Color('#9aa7b8');
  let k = 0;
  for (let i = 0; i < THREADS; i++) {
    const r0 = 2.2 + 8 * Math.pow(rand(i, 1), 0.7), th = rand(i, 2) * Math.PI * 2, tw = (rand(i, 3) - 0.5) * 0.03, ph = rand(i, 4) * 6.28;
    const hero = rand(i, 5) < 0.24 ? HERO[i % 4] : null;
    const c = (hero ?? gold.clone().lerp(cool, rand(i, 6) * 0.6)).clone().multiplyScalar(0.18 + 0.5 * rand(i, 7));
    let prev: number[] | null = null;
    for (let j = 0; j < SEG; j++) {
      const z = Z0 + ((Z1 - Z0) * j) / (SEG - 1), r = r0 + 0.5 * Math.sin(z * 0.11 + ph), a = th + z * tw;
      const p = [Math.cos(a) * r, Math.sin(a) * r, z];
      if (prev) { pos.set([...prev, ...p], k * 3); col.set([c.r, c.g, c.b, c.r, c.g, c.b], k * 3); k += 2; }
      prev = p;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
};

// Where each portrait hangs: a spiral on the tunnel wall, facing the oncoming camera, turned a little inward.
const cardSpot = (i: number) => {
  const a = i * 2.39996 + 0.6, r = 3.4 + rand(i, 31) * 1.6, z = -5 - i * 1.45;
  return {x: Math.cos(a) * r, y: Math.sin(a) * r * 0.82, z, a};
};

const ringGeometry = () => {
  const pts: number[] = [];
  for (let i = 0; i < 180; i++) {
    const a = (i / 180) * Math.PI * 2, l = i % 15 === 0 ? 0.7 : i % 5 === 0 ? 0.4 : 0.18;
    pts.push(Math.cos(a) * 6.2, Math.sin(a) * 6.2, 0, Math.cos(a) * (6.2 - l), Math.sin(a) * (6.2 - l), 0);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g;
};

const Scene: React.FC<{f: number; imgs: HTMLImageElement[]}> = ({f, imgs}) => {
  const {camera} = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const threads = useMemo(threadGeometry, []);
  const ring = useMemo(ringGeometry, []);
  const tex = useMemo(() => toTextures(imgs), [imgs]);
  const links = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i < portraits.length - 3; i++) {
      const a = cardSpot(i), b = cardSpot(i + 3);
      for (let s = 0; s < 12; s++) {
        const u0 = s / 12, u1 = (s + 1) / 12, sag = (u: number) => -0.6 * Math.sin(Math.PI * u);
        pts.push(a.x + (b.x - a.x) * u0, a.y + (b.y - a.y) * u0 + sag(u0), a.z + (b.z - a.z) * u0, a.x + (b.x - a.x) * u1, a.y + (b.y - a.y) * u1 + sag(u1), a.z + (b.z - a.z) * u1);
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g;
  }, []);
  const t = f / FPS;
  // the threads open out of the single line (radius from 0), the camera accelerates down the tunnel
  const open = interpolate(f, [0, 22], [0.02, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const p = interpolate(f, [0, 100], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  cam.position.set(Math.sin(p * 2) * 0.35, Math.cos(p * 1.6) * 0.25, 9 - 72 * p);
  cam.fov = 48 + 30 * Math.pow(p, 3); cam.updateProjectionMatrix();
  cam.lookAt(0, 0, cam.position.z - 10);
  cam.rotation.z = -0.5 * p;
  return (
    <>
      <group scale={[open, open, 1]} rotation={[0, 0, -t * 0.22]}>
        <lineSegments geometry={threads}>
          <lineBasicMaterial vertexColors transparent opacity={interpolate(f, [0, 24], [0.25, 0.75], clamp)} blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineSegments>
      </group>
      <group scale={[open, open, 1]}>
        <lineSegments geometry={links}>
          <lineBasicMaterial color={colors.thread} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
        </lineSegments>
        {tex.map((tx, i) => {
          const s = cardSpot(i);
          const reveal = interpolate(f, [4 + i * 0.5, 16 + i * 0.5], [0, 1], clamp);
          return (
            <group key={i} position={[s.x, s.y, s.z]} rotation={[-s.y * 0.06, s.x * 0.08, 0]}>
              <mesh position={[0, 0, -0.01]}>
                <planeGeometry args={[1.32, 1.72]} />
                <meshBasicMaterial color={colors.gold} transparent opacity={0.55 * reveal} toneMapped={false} />
              </mesh>
              <mesh>
                <planeGeometry args={[1.26, 1.66]} />
                <meshBasicMaterial map={tx} transparent opacity={reveal} toneMapped={false} />
              </mesh>
            </group>
          );
        })}
      </group>
      <group position={[0, 0, -64]} rotation={[0, 0, t * 0.9]}>
        <lineSegments geometry={ring}><lineBasicMaterial color={colors.thread} transparent opacity={0.8} blending={THREE.AdditiveBlending} /></lineSegments>
        <mesh><torusGeometry args={[6.25, 0.02, 6, 220]} /><meshBasicMaterial color={colors.thread} toneMapped={false} /></mesh>
        <mesh rotation={[0, 0, -t * 2]}><torusGeometry args={[5.1, 0.012, 6, 200]} /><meshBasicMaterial color={colors.thread} transparent opacity={0.7} toneMapped={false} /></mesh>
      </group>
    </>
  );
};

export const Tunnel: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f;
  const imgs = usePreloaded(portraits.map((p) => staticFile(`portrait/${p}`)));
  return (
    <AbsoluteFill style={{background: colors.night}}>
{imgs && (
      <ThreeCanvas width={W} height={H} camera={{fov: 48, position: [0, 0, 9], near: 0.1, far: 220}} gl={{antialias: true}}>
        <color attach="background" args={[colors.night]} />
        <fog attach="fog" args={[colors.night, 10, 70]} />
        <Scene f={f} imgs={imgs} />
      </ThreeCanvas>
      )}
      <AbsoluteFill style={{background: `radial-gradient(ellipse at center, rgba(14,17,21,.55) 0%, transparent 34%, rgba(14,17,21,.7) 100%)`}} />
      <div style={{position: 'absolute', top: H / 2 - 50, width: W, display: 'flex', justifyContent: 'center'}}>
        <Copy id="weave" frame={abs} size={72} />
      </div>
      <Flash frame={abs} at={from} len={16} peak={0.95} />
      <Flash frame={abs} at={from + 100} len={10} peak={0.9} />
    </AbsoluteFill>
  );
};
