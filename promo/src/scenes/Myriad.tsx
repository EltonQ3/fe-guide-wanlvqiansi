import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {colors, FPS, H, W} from '../timeline';

// 0:03 "Myriad threads": the single thread fans out into hundreds in depth, and the camera drifts through them.
// three.js earns its place here: real perspective and parallax, rendered offline, so no phone ever pays for it.
const COUNT = 320, POINTS = 72;
const rand = (i: number, s: number) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

const Threads: React.FC<{f: number; duration: number}> = ({f, duration}) => {
  const {camera} = useThree();
  const t = f / FPS;
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * (POINTS - 1) * 2 * 3), 3));
    const col = new Float32Array(COUNT * (POINTS - 1) * 2 * 3), warm = new THREE.Color(colors.thread), cool = new THREE.Color('#8f9aa6');
    for (let i = 0; i < COUNT; i++) {
      const c = warm.clone().lerp(cool, rand(i, 3) * 0.7).multiplyScalar(0.25 + 0.75 * rand(i, 4));
      for (let j = 0; j < (POINTS - 1) * 2; j++) col.set([c.r, c.g, c.b], (i * (POINTS - 1) * 2 + j) * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  // Each thread starts on the original line (y = 0, z = 0) and opens out to its own height and depth.
  const open = interpolate(f, [0, duration * 0.42], [0, 1], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const pos = geo.getAttribute('position') as THREE.BufferAttribute, arr = pos.array as Float32Array;
  let k = 0;
  for (let i = 0; i < COUNT; i++) {
    const y0 = (rand(i, 1) - 0.5) * 7, z0 = -14 + rand(i, 2) * 17, a = 0.12 + rand(i, 5) * 0.35, w = 0.25 + rand(i, 6) * 0.5, ph = rand(i, 7) * 6.28, sp = 0.15 + rand(i, 8) * 0.3;
    let px = 0, py = 0, pz = 0;
    for (let j = 0; j < POINTS; j++) {
      const x = -16 + (32 * j) / (POINTS - 1);
      const y = open * (y0 + a * Math.sin(x * w + ph + t * sp)), z = open * (z0 + 0.6 * Math.sin(x * 0.2 + ph));
      if (j > 0) { arr.set([px, py, pz, x, y, z], k); k += 6; }
      px = x; py = y; pz = z;
    }
  }
  pos.needsUpdate = true;
  // Camera: from the flat view of the single line, slowly forward and slightly round, into the threads.
  const p = interpolate(f, [0, duration], [0, 1], {easing: Easing.inOut(Easing.quad)});
  camera.position.set(Math.sin(p * 0.9) * 2.2, 0.4 * p, 10 - 7.5 * p);
  camera.lookAt(0, 0, -4 * p);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial vertexColors transparent opacity={interpolate(f, [0, 12], [0.6, 1], {extrapolateRight: 'clamp'})} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
  );
};

export const Myriad: React.FC<{duration: number}> = ({duration}) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: colors.night}}>
      <ThreeCanvas width={W} height={H} camera={{fov: 34, position: [0, 0, 10], near: 0.1, far: 100}} gl={{antialias: true}}>
        <fog attach="fog" args={[colors.night, 6, 26]} />
        <Threads f={f} duration={duration} />
      </ThreeCanvas>
      <AbsoluteFill style={{background: `radial-gradient(ellipse at center, transparent 45%, ${colors.night} 100%)`}} />
    </AbsoluteFill>
  );
};
