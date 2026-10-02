import React from 'react';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame, continueRender, delayRender} from 'remotion';
import {colors, serif} from '../timeline';

// Self-hosted Latin serif (the site's Libre Caslon Text); Chinese falls back to Noto Serif SC.
const fontHandle = delayRender('fonts');
Promise.all([
  new FontFace('Libre Caslon Text', `url(${staticFile('fonts/libre-caslon-text-latin-400-normal.woff2')})`, {weight: '400'}).load(),
  new FontFace('Libre Caslon Text', `url(${staticFile('fonts/libre-caslon-text-latin-400-italic.woff2')})`, {weight: '400', style: 'italic'}).load(),
  new FontFace('Libre Caslon Text', `url(${staticFile('fonts/libre-caslon-text-latin-700-normal.woff2')})`, {weight: '700'}).load(),
]).then((fonts) => { fonts.forEach((f) => document.fonts.add(f)); continueRender(fontHandle); }).catch(() => continueRender(fontHandle));

export const BrowserFrame: React.FC<{width: number; height: number; chrome?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({width, height, chrome = 1, children, style}) => (
  <div style={{position: 'absolute', width, height: height + 44 * chrome, borderRadius: 12 * chrome, overflow: 'hidden', boxShadow: `0 40px 120px rgba(0,0,0,${0.55 * chrome})`, background: '#1d232b', ...style}}>
    <div style={{height: 44 * chrome, opacity: chrome, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', background: '#1d232b', borderBottom: '1px solid rgba(255,255,255,.06)'}}>
      {['#4b525a', '#4b525a', '#4b525a'].map((c, i) => <span key={i} style={{width: 11, height: 11, borderRadius: '50%', background: c}} />)}
      <span style={{marginLeft: 18, padding: '5px 16px', borderRadius: 6, background: 'rgba(255,255,255,.06)', color: '#aeb6bd', fontFamily: serif, fontSize: 16, letterSpacing: '.02em'}}>fe-guide.pages.dev</span>
    </div>
    <div style={{position: 'relative', width, height, overflow: 'hidden'}}>{children}</div>
  </div>
);

export const Fade: React.FC<{duration: number; fadeIn?: number; fadeOut?: number; children: React.ReactNode}> = ({duration, fadeIn = 8, fadeOut = 8, children}) => {
  const f = useCurrentFrame();
  const o = Math.min(fadeIn ? interpolate(f, [0, fadeIn], [0, 1], {extrapolateRight: 'clamp'}) : 1, fadeOut ? interpolate(f, [duration - fadeOut, duration], [1, 0], {extrapolateLeft: 'clamp'}) : 1);
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};
