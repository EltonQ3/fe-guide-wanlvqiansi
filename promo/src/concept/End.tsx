import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {useMemo} from 'react';
import {H, W} from '../timeline';
import {FateRing, Paint} from '../long/kit';
import {CS, Flash, GLSL_NOISE, Line, clamp, rand} from './ckit';
import {Tapestry, TILES} from './Tapestry';

// Act I (0:00-0:16) and the rewind (0:16-0:19). The tapestry of every companion, burnt and cold; on each tick of the
// clock four more of them fall (grey, a crack of light). The demon god's black sun rises on the braam. A soul's
// light; the clock stops and turns back; then the whole act plays backwards: colour returns, the holes close.
const FALL = Array.from({length: TILES * TILES}, (_, i) => i).sort((a, b) => rand(a, 51) - rand(b, 51));
const KILLS = CS.ticks.filter((t) => t < 400);
const fallFrame = (tile: number) => KILLS[Math.min(KILLS.length - 1, Math.floor(FALL.indexOf(tile) / 4))];

// The tapestry's state at frame f of Act I; the rewind reads it at a mirrored frame.
const actOneState = (f: number) => ({
  grey: Array.from({length: 64}, (_, i) => interpolate(f, [fallFrame(i), fallFrame(i) + 6], [0, 1], clamp)),
  crack: Array.from({length: 64}, (_, i) => (f >= fallFrame(i) ? Math.exp(-(f - fallFrame(i)) / 6) : 0)),
  burn: interpolate(f, [0, 320], [0.27, 0.36]),
  cam: {x: interpolate(f, [0, 320], [-2.6, 2.2]), y: interpolate(f, [0, 320], [-4.6, -3.9]), z: interpolate(f, [0, 320], [8.6, 7.2]),
    lx: interpolate(f, [0, 320], [-1.2, 1.4]), ly: interpolate(f, [0, 320], [-0.6, -1.0]), roll: 0.04, fov: 46},
});

// Ash drifting down (in the rewind it rises back up).
const ashFall = (ctx: CanvasRenderingContext2D, t: number, alpha: number) => {
  for (let i = 0; i < 90; i++) {
    const sp = 30 + rand(i, 1) * 70, y = ((t * sp + rand(i, 2) * (H + 60)) % (H + 60) + H + 60) % (H + 60) - 30;
    const x = rand(i, 3) * W + 30 * Math.sin(t * 0.7 + i), s = 1 + rand(i, 4) * 2.5, hot = rand(i, 5) < 0.18;
    ctx.fillStyle = hot ? `rgba(255,140,60,${0.5 * alpha})` : `rgba(180,186,196,${0.35 * alpha * (0.4 + rand(i, 6))})`;
    ctx.fillRect(x, y, s, s);
  }
};

const SUN_FRAG = `
uniform float uTime, uRise, uGlow; uniform vec2 uRes; varying vec2 vUv;
${GLSL_NOISE}
void main(){
  vec2 p = (vUv - vec2(0.5, 0.56 - 0.75 * (1.0 - uRise))) * vec2(uRes.x / uRes.y, 1.0);
  float r = length(p), a = atan(p.y, p.x), R = 0.2;
  float corona = exp(-max(r - R, 0.0) * 7.5) * (0.55 + 0.75 * fbm(vec2(a * 3.0, r * 5.0 - uTime * 0.5)));
  float rays = pow(fbm(vec2(a * 9.0 + 3.0, uTime * 0.15)), 3.2) * exp(-max(r - R, 0.0) * 2.4) * 2.4;
  float rim = exp(-abs(r - R) * 220.0);
  vec3 col = vec3(0.06, 0.01, 0.01) + vec3(1.0, 0.24, 0.06) * corona * uGlow + vec3(1.0, 0.42, 0.12) * rays * uGlow + vec3(1.0, 0.7, 0.4) * rim * uGlow;
  float disc = smoothstep(R, R - 0.003, r);
  col = mix(col, vec3(0.012, 0.0, 0.0) + 0.02 * fbm(p * 12.0 + uTime * 0.1), disc);
  gl_FragColor = vec4(col, 1.0);
}`;

const SunQuad: React.FC<{f: number; rise: number; glow: number}> = ({f, rise, glow}) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: SUN_FRAG,
    uniforms: {uTime: {value: 0}, uRise: {value: 0}, uGlow: {value: 1}, uRes: {value: new THREE.Vector2(W, H)}}}), []);
  mat.uniforms.uTime.value = f / 30; mat.uniforms.uRise.value = rise; mat.uniforms.uGlow.value = glow;
  return <mesh material={mat}><planeGeometry args={[2, 2]} /></mesh>;
};

export const BlackSun: React.FC<{f: number; rise: number; glow?: number; dpr?: number}> = ({f, rise, glow = 1, dpr = 0.6}) => (
  <ThreeCanvas width={W} height={H} dpr={dpr} style={{position: 'absolute', inset: 0}}>
    <SunQuad f={f} rise={rise} glow={glow} />
  </ThreeCanvas>
);

// Clock hands over the ring: they tick with the clock, then spin backwards.
const Hands: React.FC<{f: number; size: number}> = ({f, size}) => {
  const ticks = CS.ticks.filter((t) => t <= f).length;
  const back = f > 446 ? Math.pow(f - 446, 2) * 0.9 : 0;
  const m = ticks * 6 - back, h = ticks * 0.5 - back / 12, r = size / 2;
  const hand = (deg: number, len: number, w: number) => (
    <line x1={0} y1={0} x2={Math.sin((deg * Math.PI) / 180) * len} y2={-Math.cos((deg * Math.PI) / 180) * len} stroke="#f2dcae" strokeWidth={w} strokeLinecap="round" />
  );
  return (
    <svg width={size} height={size} viewBox={`${-r} ${-r} ${size} ${size}`} style={{position: 'absolute', left: W / 2 - r, top: H / 2 - r, overflow: 'visible'}}>
      {hand(m, r * 0.62, 3)}{hand(h * 12, r * 0.42, 5)}<circle r={8} fill="#f2dcae" />
    </svg>
  );
};

export const EndOfWorld: React.FC = () => {
  const f = useCurrentFrame(), t = f / 30;
  // which part: the tapestry (0-320), the black sun (320-400), the soul and the clock (400-480), the rewind (480-560)
  const rewinding = f >= CS.rewind;
  const mirror = rewinding ? interpolate(f, [CS.rewind, CS.drop - 4], [318, 0], {...clamp, easing: Easing.in(Easing.quad)}) : f;
  const s = actOneState(mirror);
  const showCloth = f < 320 || rewinding;
  const fadeIn = interpolate(f, [8, 70], [0, 1], clamp);
  const sunRise = interpolate(f, [318, 352], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const soul = interpolate(f, [CS.soul - 2, CS.soul + 10], [0, 1], clamp);
  return (
    <AbsoluteFill style={{background: '#050608'}}>
      {/* the world beyond the holes: a far, dim red */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 70%, rgba(120,30,10,.35) 0%, rgba(20,6,4,.2) 40%, rgba(0,0,0,0) 75%)'}} />
      {showCloth && (
        <AbsoluteFill style={{opacity: rewinding ? 1 : fadeIn, filter: rewinding ? `hue-rotate(${-12 * (1 - mirror / 318)}deg) saturate(${0.8 + 0.5 * (1 - mirror / 318)})` : undefined}}>
          <Tapestry s={{f: mirror, grey: s.grey, crack: s.crack, burn: s.burn, fire: 0, cold: rewinding ? mirror / 318 : 1, cam: s.cam}} />
        </AbsoluteFill>
      )}
      {f >= 318 && f < 400 && <BlackSun f={f} rise={sunRise} />}
      <Paint draw={(ctx) => ashFall(ctx, rewinding ? 10 - (f - CS.rewind) / 30 * 3 : t, f < 320 ? fadeIn : rewinding ? 0.8 : 1)} />
      {f >= 396 && f < CS.drop && (
        <AbsoluteFill style={{opacity: interpolate(f, [396, 410], [0, 1], clamp)}}>
          <div style={{position: 'absolute', left: W / 2 - 600, top: H / 2 - 600, opacity: rewinding ? interpolate(f, [CS.rewind, CS.drop - 6], [0.7, 0.2], clamp) : 0.45}}>
            <FateRing size={1200} turn={f > 446 ? -Math.pow(f - 446, 2) * 0.6 : (f - 396) * 0.2} />
          </div>
          <Hands f={f} size={1200} />
          {/* the soul: a small light */}
          <div style={{position: 'absolute', left: W / 2 - 160, top: H / 2 - 160, width: 320, height: 320, borderRadius: '50%', opacity: soul * (rewinding ? 0 : 1),
            background: 'radial-gradient(circle, rgba(255,250,235,1) 0%, rgba(255,226,170,.7) 8%, rgba(255,190,110,.18) 30%, rgba(0,0,0,0) 70%)',
            transform: `scale(${0.8 + 0.2 * Math.sin(t * 5) + interpolate(f, [440, 478], [0, 1.5], clamp)})`}} />
        </AbsoluteFill>
      )}
      {rewinding && (
        <svg width={W} height={H} style={{position: 'absolute', inset: 0, mixBlendMode: 'screen'}}>
          {Array.from({length: 26}, (_, i) => {
            const sp = 2600 + rand(i, 21) * 2400, y = H * rand(i, 22), x = W + 400 - (((f - CS.rewind) / 30) * sp + rand(i, 23) * W * 2) % (W + 800);
            return <rect key={i} x={x} y={y} width={300 + rand(i, 24) * 500} height={1 + rand(i, 25) * 2} fill="#cfe0ff" opacity={0.25 * interpolate(f, [CS.rewind, CS.rewind + 10], [0, 1], clamp)} />;
          })}
        </svg>
      )}
      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
        <div style={{position: 'absolute', top: H * 0.5 - 40}}><Line id="ended" frame={f} /></div>
        <div style={{position: 'absolute', top: H * 0.5 - 40}}><Line id="fallen" frame={f} /></div>
        <div style={{position: 'absolute', top: H * 0.5 - 40}}><Line id="gone" frame={f} /></div>
        <div style={{position: 'absolute', top: H * 0.72}}><Line id="balor" frame={f} size={110} color="#ffd9c0" glow="rgba(255,80,30,.6)" /></div>
        <div style={{position: 'absolute', top: H * 0.7}}><Line id="soul" frame={f} /></div>
        <div style={{position: 'absolute', top: H * 0.7}}><Line id="past" frame={f} color="#fff1d6" glow="rgba(255,210,140,.5)" /></div>
      </AbsoluteFill>
      <Flash f={f} at={320} len={10} peak={0.6} color="255,120,60" />
      <Flash f={f} at={CS.drop - 1} len={4} peak={0.9} />
    </AbsoluteFill>
  );
};
