import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {H, Hero, W} from '../timeline';
import {Paint} from '../long/kit';
import {BEAT, Flash, Shake, clamp, hexA, latin, rand, zh} from './ckit';

// 0:19-0:29 The four protagonists, one bar each, cut in like a critical hit: a blade flash across the frame, a white
// frame, a slanted band rushing in with the portrait and speed lines, the name slammed onto it; on beat 3 the band
// tears away to the left for the next one.
export const CritCutIn: React.FC<{hero: Hero; index: number}> = ({hero, index}) => {
  const f = useCurrentFrame(), dur = BEAT * 4;
  const inn = interpolate(f, [0, 5], [1, 0], {...clamp, easing: Easing.out(Easing.cubic)});
  const out = interpolate(f, [dur - 12, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
  const bandX = inn * 2600 - out * 2900;
  const drift = interpolate(f, [0, dur], [140, -80]);
  const slash = interpolate(f, [0, 4], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)}), slashFade = interpolate(f, [3, 16], [1, 0], clamp);
  const name = interpolate(f, [5, 9], [1.5, 1], {...clamp, easing: Easing.out(Easing.cubic)}), split = interpolate(f, [5, 13], [16, 0], clamp);
  const tag = interpolate(f, [BEAT, BEAT + 8], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  const rush = (ctx: CanvasRenderingContext2D) => {                 // speed lines rushing to the centre
    ctx.save(); ctx.translate(W / 2, H / 2);
    for (let i = 0; i < 90; i++) {
      const a = rand(i, 1) * Math.PI * 2, sp = 0.6 + rand(i, 2) * 1.4, ph = (f * 0.06 * sp + rand(i, 3)) % 1;
      const r0 = 1400 * (1 - ph), r1 = r0 - 120 - rand(i, 4) * 260;
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + 0.12 * rand(i, 5)})`; ctx.lineWidth = 1 + rand(i, 6) * 3;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); ctx.lineTo(Math.cos(a) * Math.max(r1, 160), Math.sin(a) * Math.max(r1, 160)); ctx.stroke();
    }
    ctx.restore();
  };
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, ${hexA(hero.deep, 1)} 0%, #07080b 75%)`, overflow: 'hidden'}}>
      <Shake f={f} hits={[0]} amount={26}>
        <Paint draw={rush} />
        {/* the band */}
        <div style={{position: 'absolute', left: -300, top: H / 2 - 230, width: W + 600, height: 460, transform: `translateX(${bandX}px) rotate(-7deg)`, overflow: 'hidden',
          background: `linear-gradient(100deg, ${hexA(hero.deep, 0.95)} 0%, ${hexA(hero.thread, 0.95)} 55%, ${hexA(hero.gold, 0.9)} 100%)`,
          boxShadow: `0 0 0 3px ${hexA('#ffffff', 0.85)}, 0 0 80px ${hexA(hero.thread, 0.7)}`}}>
          <div style={{position: 'absolute', inset: 0, opacity: 0.25, backgroundImage: 'radial-gradient(rgba(0,0,0,.6) 1.2px, transparent 1.6px)', backgroundSize: '9px 9px'}} />
          <div style={{position: 'absolute', inset: 0, opacity: 0.35, backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,.0) 0px, rgba(255,255,255,.0) 9px, rgba(255,255,255,.55) 10px, rgba(255,255,255,0) 12px)',
            backgroundPosition: `${-f * 90}px 0`, maskImage: 'linear-gradient(90deg, transparent, black 30%, black 70%, transparent)'}} />
          <div style={{position: 'absolute', left: 1020 + drift, top: -150, width: 720, height: 960, transform: 'rotate(7deg)'}}>
            <Img src={staticFile(hero.portrait)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'contrast(1.12) saturate(1.15)'}} />
            <div style={{position: 'absolute', inset: 0, background: `linear-gradient(90deg, ${hexA(hero.deep, 0.95)} 0%, ${hexA(hero.deep, 0)} 30%)`}} />
          </div>
        </div>
        {/* the blade's flash */}
        {slashFade > 0 && (
          <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
            <defs><filter id={`sg${index}`}><feGaussianBlur stdDeviation="10" /></filter></defs>
            {[[34, hero.thread, 0.6, true], [6, '#ffffff', 1, false]].map(([w, c, o, g], k) => (
              <line key={k} x1={W * 1.05} y1={H * -0.05} x2={W * 1.05 - (W * 1.15) * (slash as number)} y2={H * -0.05 + H * 1.15 * (slash as number)}
                stroke={c as string} strokeWidth={w as number} opacity={(o as number) * slashFade} filter={g ? `url(#sg${index})` : undefined} strokeLinecap="round" />
            ))}
          </svg>
        )}
        {/* the name, slammed onto the band */}
        <div style={{position: 'absolute', left: 230, top: H / 2 - 150, transform: `translateX(${bandX * 0.9}px)`}}>
          <div style={{fontFamily: latin, fontSize: 24, letterSpacing: '.4em', color: '#fff', opacity: 0.85}}>PART I · ROUTE 0{index + 1}</div>
          <div style={{fontFamily: zh, fontWeight: 600, fontSize: 176, lineHeight: 1.1, color: '#fff', transform: `scale(${name})`, transformOrigin: 'left center', marginTop: 8,
            WebkitTextStroke: '2px rgba(0,0,0,.55)',
            textShadow: `${split}px 0 0 rgba(255,60,40,.75), ${-split}px 0 0 rgba(60,160,255,.75), 0 8px 0 ${hexA(hero.deep, 0.9)}, 0 0 60px ${hexA(hero.thread, 0.8)}`}}>{hero.name}</div>
          <div style={{fontFamily: zh, fontSize: 52, letterSpacing: '.16em', color: '#fff', marginTop: 10, opacity: tag, transform: `translateX(${(1 - tag) * 60}px)`,
            textShadow: '0 3px 18px rgba(0,0,0,.8)'}}>{hero.tagline}</div>
        </div>
      </Shake>
      <Flash f={f} at={0} len={5} peak={0.95} />
    </AbsoluteFill>
  );
};
