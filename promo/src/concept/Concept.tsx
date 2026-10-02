import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {T} from '../timeline';
import {CT, Grain, Letterbox} from './ckit';
import {EndOfWorld} from './End';
import {CritCutIn} from './Crit';
import {Battle, Rewrite, Web} from './Gather';
import {Ascend, Burn, Title, Written} from './Climax';

// The second promo, 逆命: a 60-second concept trailer. Scenes and sync points come from timeline.json's `concept`
// section; the score (audio/concept.py) runs on the same clock.
const at = (id: string) => {
  const s = CT.scenes.find((x) => x.id === id)!;
  return {from: s.from, durationInFrames: s.to - s.from};
};

const Overlays: React.FC = () => {
  const f = useCurrentFrame();
  return (<><Letterbox f={f} /><Grain f={f} amount={f < 560 ? 0.1 : 0.06} /></>);
};

export const Concept: React.FC = () => (
  <AbsoluteFill style={{background: '#050608'}}>
    <Sequence from={0} durationInFrames={560} name="end-of-world → rewind"><EndOfWorld /></Sequence>
    {T.heroes.map((h, i) => <Sequence key={h.id} {...at(`crit-${h.id}`)} name={`crit-${h.id}`}><CritCutIn hero={h} index={i} /></Sequence>)}
    <Sequence {...at('rewrite')} name="rewrite"><Rewrite from={at('rewrite').from} /></Sequence>
    <Sequence {...at('gather')} name="gather"><Web from={at('gather').from} /></Sequence>
    <Sequence {...at('battle')} name="battle"><Battle from={at('battle').from} /></Sequence>
    <Sequence {...at('written')} name="written + silence"><Written from={at('written').from} /></Sequence>
    <Sequence {...at('burn')} name="burn"><Burn from={at('burn').from} /></Sequence>
    <Sequence {...at('emblem')} name="emblem"><Ascend from={at('emblem').from} /></Sequence>
    <Sequence {...at('title')} name="title"><Title from={at('title').from} /></Sequence>
    <Overlays />
    <Audio src={staticFile('audio/concept-mix.wav')} />
  </AbsoluteFill>
);
