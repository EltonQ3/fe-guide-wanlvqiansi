import React, {useMemo} from 'react';
import {staticFile} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import portraits from '../../public/portrait/index.json';
import {H, W} from '../timeline';
import {usePreloaded} from '../long/Tunnel';
import {GLSL_NOISE} from './ckit';

// The tapestry of fate: every companion's portrait woven into one cloth (an 8x8 atlas with a thread texture),
// drawn by a shader that can grey out each portrait, crack it, burn holes in the cloth with glowing edges, and,
// in Act III, let real fire sweep up through it. Every input is a function of the frame.
export const TILES = 8;
export const ORDER = portraits.slice(0, TILES * TILES);

const atlasFrom = (imgs: HTMLImageElement[]) => {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S * TILES;
  const g = c.getContext('2d')!;
  g.fillStyle = '#1a140f'; g.fillRect(0, 0, c.width, c.height);
  imgs.forEach((im, i) => {
    const x = (i % TILES) * S, y = Math.floor(i / TILES) * S;
    g.drawImage(im, 0, 30, 400, 400, x + 6, y + 6, S - 12, S - 12);
  });
  // the weave: fine warp and weft over everything, heavier gold threads between portraits
  g.globalAlpha = 0.08; g.fillStyle = '#000';
  for (let k = 0; k < c.width; k += 4) { g.fillRect(k, 0, 1, c.height); g.fillRect(0, k + 2, c.width, 1); }
  g.globalAlpha = 0.55; g.strokeStyle = '#c9a86a'; g.lineWidth = 4;
  for (let k = 0; k <= TILES; k++) { g.beginPath(); g.moveTo(k * S, 0); g.lineTo(k * S, c.height); g.moveTo(0, k * S); g.lineTo(c.width, k * S); g.stroke(); }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.flipY = true;
  return tex;
};

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `
uniform sampler2D uAtlas; uniform sampler2D uState;
uniform float uBurn, uFire, uTime, uCold;
varying vec2 vUv;
${GLSL_NOISE}
void main(){
  vec2 cell = vec2(floor(vUv.x * ${TILES}.0), floor((1.0 - vUv.y) * ${TILES}.0));
  vec4 st = texture2D(uState, (cell + 0.5) / ${TILES}.0);          // r: grey (fallen), g: crack flash
  vec3 c = texture2D(uAtlas, vUv).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  vec3 col = mix(c, vec3(l) * vec3(0.6, 0.64, 0.72) * 0.5, st.r);
  col = mix(col, vec3(dot(col, vec3(0.333))) * vec3(0.78, 0.86, 1.0), uCold * 0.4);
  // a crack across a portrait at the moment it falls
  vec2 lu = fract(vec2(vUv.x, 1.0 - vUv.y) * ${TILES}.0);
  float crack = abs(lu.y - (0.15 + 0.7 * lu.x) - 0.06 * (noise(lu * 18.0) - 0.5));
  col += vec3(1.0, 0.85, 0.6) * st.g * (smoothstep(0.03, 0.0, crack) * 2.0 + 0.25);
  // burning: a noise field (sweeping up from the bottom once it is real fire)
  float n = fbm(vUv * 4.0 + vec2(0.0, uTime * 0.03)) * 0.75 + fbm(vUv * 17.0 - uTime * 0.05) * 0.25;
  float field = mix(n, n * 0.5 + vUv.y * 0.55, uFire);              // real fire burns from the bottom up
  float d = field - uBurn;
  float charred = 1.0 - smoothstep(0.0, 0.06 + 0.05 * uFire, d);
  col = mix(col, vec3(0.04, 0.025, 0.02), charred * 0.85);
  float rim = 1.0 - smoothstep(0.0, 0.012 + 0.03 * uFire, d);
  vec3 glow = mix(vec3(1.0, 0.33, 0.08) * 0.9, vec3(1.0, 0.72, 0.3) * 2.6, uFire);
  col += glow * rim * (0.55 + 0.45 * noise(vUv * 90.0 + uTime * 2.0));
  gl_FragColor = vec4(col, smoothstep(-0.004, 0.0, d));
}`;

export type Cam = {x: number; y: number; z: number; lx: number; ly: number; roll?: number; fov?: number};
export type TapestryState = {f: number; grey: number[]; crack: number[]; burn: number; fire: number; cold: number; cam: Cam; tilt?: number};

const Cloth: React.FC<{s: TapestryState; imgs: HTMLImageElement[]}> = ({s, imgs}) => {
  const {camera} = useThree();
  const cam = camera as THREE.PerspectiveCamera;
  const atlas = useMemo(() => atlasFrom(imgs), [imgs]);
  const state = useMemo(() => { const t = new THREE.DataTexture(new Uint8Array(TILES * TILES * 4), TILES, TILES, THREE.RGBAFormat); t.magFilter = t.minFilter = THREE.NearestFilter; return t; }, []);
  const mat = useMemo(() => new THREE.ShaderMaterial({vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    uniforms: {uAtlas: {value: atlas}, uState: {value: state}, uBurn: {value: 0}, uFire: {value: 0}, uTime: {value: 0}, uCold: {value: 0}}}), [atlas, state]);
  const data = state.image.data as Uint8Array;
  for (let i = 0; i < TILES * TILES; i++) {
    const x = i % TILES, y = i / TILES | 0, k = (y * TILES + x) * 4;
    data[k] = Math.round(255 * Math.min(1, Math.max(0, s.grey[i] ?? 0))); data[k + 1] = Math.round(255 * Math.min(1, Math.max(0, s.crack[i] ?? 0)));
  }
  state.needsUpdate = true;
  mat.uniforms.uBurn.value = s.burn; mat.uniforms.uFire.value = s.fire; mat.uniforms.uTime.value = s.f / 30; mat.uniforms.uCold.value = s.cold;
  cam.position.set(s.cam.x, s.cam.y, s.cam.z); cam.fov = s.cam.fov ?? 40; cam.updateProjectionMatrix();
  cam.lookAt(s.cam.lx, s.cam.ly, 0); cam.rotation.z += s.cam.roll ?? 0;
  return (
    <mesh rotation={[-(s.tilt ?? 0.42), 0, 0.06]} material={mat}>
      <planeGeometry args={[16, 16]} />
    </mesh>
  );
};

export const Tapestry: React.FC<{s: TapestryState; dpr?: number}> = ({s, dpr = 1}) => {
  const imgs = usePreloaded(ORDER.map((p) => staticFile(`portrait/${p}`)));
  if (!imgs) return null;
  return (
    <ThreeCanvas width={W} height={H} dpr={dpr} camera={{fov: 40, position: [0, 0, 12], near: 0.1, far: 100}} gl={{antialias: true, alpha: true}} style={{position: 'absolute', inset: 0}}>
      <Cloth s={s} imgs={imgs} />
    </ThreeCanvas>
  );
};
