import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {colors, FPS, H, serif, T, W} from '../timeline';
import {Weave} from '../components/Weave';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const strands = T.heroes.map((h) => h.thread);

// 0:47 The interface folds back into a line; the four threads braid into one and carry the site's words.
export const WeaveBack: React.FC<{duration: number}> = ({duration}) => {
  const f = useCurrentFrame(), t = 70 + f / FPS;
  const fold = interpolate(f, [0, 22], [1, 0.004], {...clamp, easing: Easing.in(Easing.cubic)});
  const word = (d: number) => ({opacity: interpolate(f, [d, d + 18], [0, 1], clamp), transform: `translateY(${interpolate(f, [d, d + 24], [16, 0], {...clamp, easing: Easing.out(Easing.cubic)})}px)`});
  return (
    <AbsoluteFill style={{background: colors.night}}>
      <AbsoluteFill style={{opacity: interpolate(f, [16, 40], [0, 1], clamp)}}>
        <Weave width={W} height={H} t={t} strands={strands} field={0.9}
          band={{y: H * 0.64, from: W * 0.12, spread: 70, up: 0, amp: 15}} converge={interpolate(f, [16, duration * 0.7], [0.3, 1], clamp)}
          glow={strands.map(() => interpolate(f, [duration * 0.5, duration], [0.2, 0.8], clamp))} mask={[{x: 460, y: 250, w: 1000, h: 260}]} />
      </AbsoluteFill>
      {f < 30 && (
        <div style={{position: 'absolute', left: W * 0.1, top: H * 0.1, width: W * 0.8, height: H * 0.8, transform: `scaleY(${fold})`, opacity: interpolate(f, [14, 28], [1, 0], clamp), overflow: 'hidden', borderRadius: 10}}>
          <Img src={staticFile('capture/reading-dark.png')} style={{width: '100%', height: '100%'}} />
          <div style={{position: 'absolute', inset: 0, background: colors.thread, opacity: interpolate(f, [8, 22], [0, 1], clamp)}} />
        </div>
      )}
      <div style={{position: 'absolute', top: 290, width: W, textAlign: 'center', fontFamily: serif, fontSize: 86, lineHeight: 1.35, letterSpacing: '.08em'}}>
        <div style={{color: colors.ink, ...word(30)}}>于万缕命运间，</div>
        <div style={{color: colors.goldSoft, ...word(46)}}>走出你的胜局。</div>
      </div>
    </AbsoluteFill>
  );
};

// 0:53 End card: one braided thread, the site's name and address; the opening pluck returns once.
// `pace` < 1 brings the lines in sooner (the short cut needs the address on screen for at least two seconds).
export const EndCard: React.FC<{duration: number; pluckAt: number; fadeFrom?: number; pace?: number}> = ({duration, pluckAt, fadeFrom, pace = 1}) => {
  const f = useCurrentFrame(), t = 80 + f / FPS;
  const show = (d: number) => ({opacity: interpolate(f, [d * pace, d * pace + 20 * pace], [0, 1], clamp)});
  const out = interpolate(f, [fadeFrom ?? duration - 30, duration], [1, 0], clamp);
  return (
    <AbsoluteFill style={{background: colors.night, opacity: out}}>
      <Weave width={W} height={H} t={t} strands={[colors.thread]} field={0.45} band={{y: H * 0.64, from: 0, spread: 0, up: 0, amp: 8}}
        pluck={f >= pluckAt ? (f - pluckAt) / FPS : 99} glow={[0.6]} strandAlpha={interpolate(f, [0, 20], [0, 1], clamp)} />
      <div style={{position: 'absolute', top: 300, width: W, textAlign: 'center', fontFamily: serif, color: colors.ink}}>
        <div style={{fontSize: 120, letterSpacing: '.24em', paddingLeft: '.24em', ...show(6)}}>万缕千丝</div>
        <div style={{fontSize: 34, letterSpacing: '1em', paddingLeft: '1em', color: colors.goldSoft, marginTop: 18, ...show(18)}}>战术手帖</div>
        <div style={{fontSize: 44, letterSpacing: '.04em', color: colors.thread, marginTop: 230, fontStyle: 'italic', ...show(34)}}>fe-guide.pages.dev</div>
        <div style={{fontSize: 21, letterSpacing: '.12em', color: 'rgba(243,238,229,.55)', marginTop: 34, ...show(48)}}>玩家整理 · 非官方网站　｜　游戏与美术版权归 Nintendo / INTELLIGENT SYSTEMS 所有</div>
      </div>
    </AbsoluteFill>
  );
};
