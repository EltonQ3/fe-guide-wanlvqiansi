import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Cut, scene, T} from './timeline';
import {Fade} from './components/Overlay';
import {HeroCard, OneThread} from './scenes/Act1';
import {Myriad} from './scenes/Myriad';
import {Notebook, Planner} from './scenes/Act2';
import {EndCard} from './scenes/Act3';

// Scene times come from timeline.json; cue frames inside a scene are converted to that scene's own clock.
const rel = (cut: Cut, id: string, frames: number[]) => frames.map((f) => f - scene(cut, id).from);
const sfxAt = (_cut: Cut, type: string) => T.short.sfx.filter((e: any) => e.type === type).map((e: any) => e.at as number);

const S: React.FC<{cut: Cut; id: string; children: (duration: number) => React.ReactNode}> = ({cut, id, children}) => {
  const {from, duration} = scene(cut, id);
  return <Sequence from={from} durationInFrames={duration} name={id}>{children(duration)}</Sequence>;
};

export const Short: React.FC<{animatic: boolean}> = () => (
  <AbsoluteFill style={{background: '#0e1115'}}>
    <S cut="short" id="one">{(d) => <OneThread duration={d} />}</S>
    <S cut="short" id="myriad">{(d) => <Fade duration={d} fadeIn={0} fadeOut={8}><Myriad duration={d} /></Fade>}</S>
    {T.heroes.map((h, i) => <S key={h.id} cut="short" id={`hero-${h.id}`}>{(d) => <HeroCard hero={h} duration={d} index={i} />}</S>)}
    <S cut="short" id="notebook">{(d) => <Notebook duration={d} />}</S>
    <S cut="short" id="planner">{(d) => <Planner duration={d} marks={rel('short', 'planner', sfxAt('short', 'tick'))} />}</S>
    <S cut="short" id="end">{(d) => <EndCard duration={d} pluckAt={0} fadeFrom={d - 10} pace={0.35} />}</S>
    <Audio src={staticFile('audio/short-mix.wav')} />
  </AbsoluteFill>
);
