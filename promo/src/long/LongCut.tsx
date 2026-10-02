import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {scene} from '../timeline';
import {Grain} from './kit';
import {ActOne} from './ActOne';
import {Tunnel} from './Tunnel';
import {HeroScene} from './Heroes';
import {Book, Calendar, Gather, Night, Planner, Read} from './Site';
import {Converge, End} from './Converge';
import {T} from '../timeline';

// The long cut, scene by scene from timeline.json; the score (audio/score.py) runs on the same clock.
const S: React.FC<{id: string; to?: string; children: (from: number, duration: number) => React.ReactNode}> = ({id, to, children}) => {
  const a = scene('long', id), b = to ? scene('long', to) : a;
  const duration = b.from + b.duration - a.from;
  return <Sequence from={a.from} durationInFrames={duration} name={to ? `${id}–${to}` : id}>{children(a.from, duration)}</Sequence>;
};

export const LongCut: React.FC = () => (
  <AbsoluteFill style={{background: '#0e1115'}}>
    <S id="one" to="rewind">{() => <ActOne />}</S>
    <S id="myriad">{(from) => <Tunnel from={from} />}</S>
    {T.heroes.map((h, i) => <S key={h.id} id={`hero-${h.id}`}>{(from, d) => <HeroScene hero={h} index={i} duration={d} from={from} />}</S>)}
    <S id="book">{(from) => <Book from={from} />}</S>
    <S id="read">{(from) => <Read from={from} />}</S>
    <S id="planner">{(from) => <Planner from={from} />}</S>
    <S id="calendar">{(from) => <Calendar from={from} />}</S>
    <S id="night">{(from) => <Night from={from} />}</S>
    <S id="gather">{(from) => <Gather from={from} />}</S>
    <S id="converge">{(from) => <Converge from={from} />}</S>
    <S id="end">{(from) => <End from={from} />}</S>
    <Grain />
    <Audio src={staticFile('audio/long-mix.wav')} />
  </AbsoluteFill>
);
