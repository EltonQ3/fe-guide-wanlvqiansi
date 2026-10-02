import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import portraits from '../../public/portrait/index.json';
import {H, T, W} from '../timeline';
import {FateRing, Paint} from '../long/kit';
import {BEAT, CS, Flash, GLSL_NOISE, Line, Shake, clamp, fireGold, hexA, latin, rand, zh} from './ckit';
import {Tapestry} from './Tapestry';
import {BlackSun} from './End';

// ---- fire --------------------------------------------------------------------------------------------------------
const FIRE_FRAG = `
uniform float uTime, uHeat, uHeight; uniform vec2 uRes; varying vec2 vUv;
${GLSL_NOISE}
void main(){
  vec2 p = vUv * vec2(uRes.x / uRes.y, 1.0);
  float t = uTime;
  vec2 q = vec2(fbm(p * 2.0 + vec2(0.0, -t * 1.1)), fbm(p * 2.0 + vec2(5.2, -t * 1.3)));
  float n = fbm(p * 3.2 + q * 1.6 + vec2(0.0, -t * 2.3));
  float h = vUv.y / max(uHeight, 0.001);
  float flame = clamp(n * 1.7 - h * 1.15 + 0.12, 0.0, 1.0) * uHeat;
  flame = pow(flame, 1.3);
  vec3 col = mix(vec3(0.02, 0.0, 0.0), vec3(0.62, 0.07, 0.02), smoothstep(0.0, 0.25, flame));
  col = mix(col, vec3(1.0, 0.42, 0.07), smoothstep(0.22, 0.55, flame));
  col = mix(col, vec3(1.0, 0.82, 0.42), smoothstep(0.52, 0.85, flame));
  col = mix(col, vec3(1.0, 0.97, 0.88), smoothstep(0.86, 1.0, flame));
  col += vec3(0.3, 0.06, 0.0) * clamp(1.0 - h, 0.0, 1.0) * uHeat * 0.5;
  gl_FragColor = vec4(col, 1.0);
}`;

const FireQuad: React.FC<{f: number; heat: number; height: number}> = ({f, heat, height}) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: FIRE_FRAG,
    uniforms: {uTime: {value: 0}, uHeat: {value: 1}, uHeight: {value: 1}, uRes: {value: new THREE.Vector2(W, H)}}}), []);
  mat.uniforms.uTime.value = f / 30; mat.uniforms.uHeat.value = heat; mat.uniforms.uHeight.value = height;
  return <mesh material={mat}><planeGeometry args={[2, 2]} /></mesh>;
};

export const Fire: React.FC<{f: number; heat: number; height?: number; dpr?: number}> = ({f, heat, height = 0.9, dpr = 0.5}) => (
  <ThreeCanvas width={W} height={H} dpr={dpr} style={{position: 'absolute', inset: 0}}>
    <FireQuad f={f} heat={heat} height={height} />
  </ThreeCanvas>
);

const sparks = (ctx: CanvasRenderingContext2D, t: number, n: number, alpha: number) => {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sp = 120 + rand(i, 1) * 380, life = (H + 100) / sp, age = ((t + rand(i, 2) * life) % life + life) % life;
    const x = rand(i, 3) * W + Math.sin(age * 3 + i) * 30, y = H + 40 - age * sp, r = 1 + rand(i, 4) * 2.4;
    const a = alpha * (0.4 + 0.6 * rand(i, 5)) * Math.min(1, (H - y) / 200 + 0.2);
    ctx.fillStyle = `rgba(255,${150 + Math.round(rand(i, 6) * 90)},${60 + Math.round(rand(i, 7) * 60)},${a})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
};

// ---- 0:37-0:43 "命运，早已写定——" and the silence ----------------------------------------------------------------
export const Written: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f, silent = abs >= CS.silence;
  const u = interpolate(f, [0, 80], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  const flicker = abs >= CS.silence - 20 && abs < CS.silence && Math.floor((abs - CS.silence + 20) / 5) % 2 === 1;
  const beatPulse = [CS.silence + 2, CS.silence + 42].reduce((m, b) => (abs >= b ? Math.max(m, Math.exp(-(abs - b) / 8)) : m), 0);
  const crackLight = interpolate(abs, [CS.ignite - 34, CS.ignite], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {!silent && (
        <Shake f={abs} hits={Array.from({length: 16}, (_, k) => from + k * 5).filter((k) => k <= abs)} amount={4 + 18 * u}>
          <Tapestry s={{f: abs, grey: Array(64).fill(0.35), crack: Array(64).fill(0), burn: 0, fire: 0, cold: 1,
            cam: {x: 0, y: -2.6 + 1.2 * u, z: 12 - 8.5 * u, lx: 0, ly: 0.4, roll: 0.25 * u, fov: 40 + 25 * u}, tilt: 0.3}} />
          <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', opacity: 0.25 + 0.5 * u}}>
            <FateRing size={1500} turn={-f * f * 0.05} color="#dfe8ff" />
          </AbsoluteFill>
          <AbsoluteFill style={{background: 'rgba(120,150,210,.18)', mixBlendMode: 'screen'}} />
        </Shake>
      )}
      {flicker && <AbsoluteFill style={{background: '#fff'}} />}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', background: silent ? undefined : 'radial-gradient(ellipse 40% 14% at 50% 50%, rgba(0,0,0,.7), rgba(0,0,0,0))'}}>
        <div style={{opacity: silent ? 0.75 + 0.25 * beatPulse : 1}}><Line id="written" frame={abs} size={62} color="#f2f5fb" /></div>
      </AbsoluteFill>
      {crackLight > 0 && (
        <div style={{position: 'absolute', left: W / 2 - 900 * crackLight, width: 1800 * crackLight, bottom: 120, height: 6 + 40 * crackLight * crackLight,
          background: 'radial-gradient(ellipse at 50% 100%, rgba(255,230,170,1) 0%, rgba(255,140,50,.8) 35%, rgba(255,80,20,0) 70%)', filter: 'blur(6px)'}} />
      )}
    </AbsoluteFill>
  );
};

// ---- 0:43-0:48 "那就，烧掉它。" — the fire takes the tapestry; the four rise out of it on the beats ---------------
export const Burn: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f, t = abs / 30;
  const heat = interpolate(f, [0, 3], [0.7, 1.05], clamp);
  const burn = interpolate(f, [0, 8, 130], [0.12, 0.3, 1.15], {...clamp, easing: Easing.out(Easing.quad)});
  const hits = [0, 40, 80, 100, 120, 140].map((k) => from + k);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shake f={abs} hits={hits} amount={26}>
        <Tapestry s={{f: abs, grey: Array(64).fill(0), crack: Array(64).fill(0), burn, fire: 1, cold: 0,
          cam: {x: 0, y: -1.8 + f * 0.004, z: 11.5 - f * 0.012, lx: 0, ly: 0.2, fov: 46}, tilt: 0.22}} />
        {/* the fire in front, screen-blended: it erupts on the hit and keeps climbing as the cloth burns away */}
        <AbsoluteFill style={{mixBlendMode: 'screen'}}><Fire f={abs} heat={heat} height={interpolate(f, [0, 4, 60, 160], [0.2, 0.75, 1.0, 1.15], clamp)} /></AbsoluteFill>
        <Paint draw={(ctx) => sparks(ctx, t, 140, 1)} />
        {T.heroes.map((h, i) => {
          const at = 80 + i * 20, u = interpolate(f, [at, at + 5], [1.5, 1], {...clamp, easing: Easing.out(Easing.cubic)});
          if (f < at) return null;
          return (
            <div key={h.id} style={{position: 'absolute', left: W * (0.17 + 0.22 * i) - 150, top: H / 2 - 170, width: 300, height: 400, transform: `scale(${u}) rotate(${(i - 1.5) * 2}deg)`,
              boxShadow: `0 0 0 3px ${fireGold}, 0 0 60px rgba(255,140,40,.9), 0 30px 80px rgba(0,0,0,.8)`, overflow: 'hidden', opacity: interpolate(f, [at, at + 2], [0, 1], clamp)}}>
              <Img src={staticFile(h.portrait)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(255,90,20,.45), rgba(255,90,20,0) 45%)'}} />
              <Flash f={f} at={at} len={4} peak={0.8} />
            </div>
          );
        })}
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div style={{position: 'absolute', top: H * 0.16}}><Line id="burn" frame={abs} size={150} color={fireGold} glow="rgba(255,120,30,.8)" /></div>
        </AbsoluteFill>
      </Shake>
      <Flash f={abs} at={CS.ignite} len={8} peak={1} color="255,230,190" />
    </AbsoluteFill>
  );
};

// ---- 0:48-0:53 the emblem forms in fire over the black sun; everyone rises as sparks; the sun cracks and shatters ---
// An original crest, not the series logo: a heater shield, a sword through a three-tongued flame, a ring of fate.
const SHIELD = 'M 0 -330 C 170 -330 270 -300 290 -260 L 290 -40 C 290 140 160 260 0 330 C -160 260 -290 140 -290 -40 L -290 -260 C -270 -300 -170 -330 0 -330 Z';
const FLAME = 'M 0 230 C -150 180 -170 40 -90 -50 C -84 10 -56 34 -30 44 C -54 -60 -20 -170 36 -246 C 34 -150 86 -100 112 -36 C 124 -84 118 -120 104 -160 C 196 -60 176 150 0 230 Z';
const SWORD = 'M 0 -300 L 16 -262 L 16 128 L -16 128 L -16 -262 Z M -96 128 L 96 128 M 0 128 L 0 206';
const SUN = {x: W / 2, y: H * 0.44, r: H * 0.2};

const Emblem: React.FC<{draw: number; fill: number; glow: number; size: number}> = ({draw, fill, glow, size}) => (
  <svg width={size} height={size * 1.2} viewBox="-420 -500 840 1000" style={{overflow: 'visible'}}>
    <defs>
      <linearGradient id="egold" x1="0" y1="-1" x2="0" y2="1"><stop offset="0" stopColor="#fff2c8" /><stop offset="0.5" stopColor="#ffb347" /><stop offset="1" stopColor="#d1491c" /></linearGradient>
      <filter id="eglow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14" /></filter>
    </defs>
    <g opacity={fill}><path d={SHIELD} fill="rgba(40,10,4,.55)" /><path d={FLAME} fill="url(#egold)" /></g>
    {[0, 1].map((k) => (
      <g key={k} fill="none" stroke={k ? '#fff4dc' : '#ff8a2a'} strokeWidth={k ? 7 : 26} strokeLinecap="round" strokeLinejoin="round" filter={k ? undefined : 'url(#eglow)'} opacity={k ? 1 : glow}>
        <circle r={410} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} strokeWidth={k ? 3 : 12} />
        <path d={SHIELD} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - draw} />
        <path d={FLAME} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - Math.max(0, draw * 1.3 - 0.3)} />
        <path d={SWORD} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - Math.max(0, draw * 1.5 - 0.5)} />
      </g>
    ))}
    {Array.from({length: 24}, (_, i) => {
      const a = (i / 24) * Math.PI * 2, o = Math.max(0, Math.min(1, draw * 24 - i));
      return <line key={i} x1={Math.cos(a) * 410} y1={Math.sin(a) * 410} x2={Math.cos(a) * 440} y2={Math.sin(a) * 440} stroke="#ffd27a" strokeWidth={3} opacity={o} />;
    })}
  </svg>
);

export const Ascend: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f, t = abs / 30;
  const draw = interpolate(f, [0, 76], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)}), fill = interpolate(f, [74, 90], [0, 1], clamp);
  const crack = interpolate(abs, [CS.shatter - 50, CS.shatter], [0, 1], {...clamp, easing: Easing.in(Easing.quad)});
  const shatter = interpolate(abs, [CS.shatter, CS.shatter + 12], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const hits = [0, 40, 80, 120].map((k) => from + k);
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Shake f={abs} hits={hits} amount={14}>
        {shatter < 1 && <AbsoluteFill style={{opacity: 1 - shatter}}><BlackSun f={abs} rise={1} glow={1 + 0.6 * crack} /></AbsoluteFill>}
        <AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 40% at 50% 105%, rgba(255,110,30,.75) 0%, rgba(160,40,10,.35) 40%, rgba(0,0,0,0) 75%)'}} />
        {/* cracks across the black sun, then its shards */}
        {crack > 0 && shatter < 1 && (
          <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
            {Array.from({length: 9}, (_, i) => {
              const a = rand(i, 61) * Math.PI * 2, len = SUN.r * (0.6 + rand(i, 62) * 0.9) * crack, bend = (rand(i, 63) - 0.5) * 0.6;
              const x1 = SUN.x + Math.cos(a) * SUN.r * 1.02, y1 = SUN.y + Math.sin(a) * SUN.r * 1.02;
              const pts = [0, 0.33, 0.66, 1].map((u) => [x1 - Math.cos(a + bend * u) * len * u, y1 - Math.sin(a + bend * u) * len * u]);
              return <polyline key={i} points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#ffe0a0" strokeWidth={2 + 3 * crack} style={{filter: 'drop-shadow(0 0 8px #ff8a2a)'}} />;
            })}
          </svg>
        )}
        {shatter > 0 && (
          <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
            {Array.from({length: 26}, (_, i) => {
              const a = (i / 26) * Math.PI * 2 + rand(i, 71) * 0.2, d = shatter * (300 + rand(i, 72) * 700), s = SUN.r * (0.25 + rand(i, 73) * 0.3);
              const cx = SUN.x + Math.cos(a) * (SUN.r * 0.5 + d), cy = SUN.y + Math.sin(a) * (SUN.r * 0.5 + d);
              return <polygon key={i} points={`${cx},${cy - s} ${cx + s * 0.8},${cy + s * 0.5} ${cx - s * 0.6},${cy + s * 0.7}`} fill="#050203" stroke="#ffb35c" strokeWidth={2}
                opacity={1 - shatter * 0.8} transform={`rotate(${shatter * 300 * (rand(i, 74) - 0.5)} ${cx} ${cy})`} />;
            })}
          </svg>
        )}
        {/* everyone rises as sparks around the crest */}
        {portraits.map((p, i) => {
          const born = (i / portraits.length) * 60, age = f - born;
          if (age < 0) return null;
          const a = rand(i, 81) * Math.PI * 2 + t * (0.6 + rand(i, 82) * 0.6), rx = 560 + rand(i, 83) * 380, ry = 200 + rand(i, 84) * 160;
          const x = W / 2 + Math.cos(a) * rx, y = H * 0.52 + Math.sin(a) * ry - age * (2 + rand(i, 85) * 3);
          const o = Math.min(1, age / 8) * (y < -100 ? 0 : 1), front = Math.sin(a) > 0;
          return (
            <div key={i} style={{position: 'absolute', left: x - 34, top: y - 45, width: 68, height: 90, opacity: o * (front ? 1 : 0.55), zIndex: 0,
              boxShadow: '0 0 0 2px rgba(255,200,120,.9), 0 0 18px rgba(255,120,40,.8)', transform: `scale(${front ? 1 : 0.7})`}}>
              <Img src={staticFile(`portrait/${p}`)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(.35) saturate(1.3) brightness(1.1)'}} />
            </div>
          );
        })}
        <div style={{position: 'absolute', left: W / 2 - 330, top: H * 0.44 - 396, zIndex: 2}}>
          <Emblem draw={draw} fill={fill} glow={0.6 + 0.4 * Math.sin(t * 9) * 0.5 + 0.2 * crack} size={660} />
        </div>
        <Paint draw={(ctx) => sparks(ctx, t * 1.4, 160, 1)} style={{zIndex: 3}} />
      </Shake>
      <Flash f={abs} at={CS.major} len={10} peak={1} />
    </AbsoluteFill>
  );
};

// ---- 0:53-1:00 the title, the piano in major, and the signature ----------------------------------------------------
export const Title: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame(), abs = from + f, t = abs / 30;
  const c = T.concept.copy.find((x) => x.id === 'title')!;
  const u = interpolate(abs, [c.from, c.from + 30], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const sig = interpolate(abs, [CS.coda[0], CS.coda[0] + 20], [0, 1], clamp);
  const out = interpolate(f, [170, 200], [1, 0], clamp);
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 60% at 50% 110%, #8a3412 0%, #2a0f07 45%, #07080b 80%)', opacity: out}}>
      <Paint draw={(ctx) => sparks(ctx, t, 90, 0.8)} />
      <div style={{position: 'absolute', left: W / 2 - 150, top: 130, opacity: 0.85 * u}}>
        <Emblem draw={1} fill={1} glow={0.5} size={300} />
      </div>
      <div style={{position: 'absolute', top: 520, width: W, textAlign: 'center'}}>
        <div style={{fontFamily: zh, fontWeight: 600, fontSize: 124, letterSpacing: '.2em', paddingLeft: '.2em', opacity: u, filter: `blur(${(1 - u) * 10}px)`,
          background: 'linear-gradient(180deg, #fff3d0 0%, #ffc66b 55%, #e0742c 100%)', WebkitBackgroundClip: 'text', color: 'transparent',
          textShadow: '0 0 60px rgba(255,150,60,.35)'}}>{c.text}</div>
        <div style={{fontFamily: latin, fontSize: 26, letterSpacing: '.5em', paddingLeft: '.5em', color: 'rgba(255,220,170,.75)', marginTop: 18, opacity: u}}>FIRE EMBLEM · FORTUNE'S WEAVE</div>
      </div>
      <div style={{position: 'absolute', bottom: 70, width: W, textAlign: 'center', opacity: sig}}>
        <div style={{fontFamily: zh, fontSize: 30, letterSpacing: '.3em', color: '#f4e7d0'}}>万缕千丝 · 战术手帖</div>
        <div style={{fontFamily: latin, fontStyle: 'italic', fontSize: 40, color: fireGold, marginTop: 8}}>fe-guide.pages.dev</div>
        <div style={{fontFamily: zh, fontSize: 18, letterSpacing: '.12em', color: 'rgba(243,238,229,.5)', marginTop: 16}}>玩家整理 · 非官方网站　｜　游戏与美术版权归 Nintendo / INTELLIGENT SYSTEMS 所有</div>
      </div>
      <Flash f={abs} at={from} len={14} peak={1} />
    </AbsoluteFill>
  );
};
