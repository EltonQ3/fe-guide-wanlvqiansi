import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Cut, scene, T} from './timeline';
import {Fade, Subtitles} from './components/Overlay';
import {HeroCard, OneThread, Strands} from './scenes/Act1';
import {Myriad} from './scenes/Myriad';
import {Braid, Night, Notebook, Paralogues, Planner} from './scenes/Act2';
import {EndCard, WeaveBack} from './scenes/Act3';

// Scene times come from timeline.json; cue frames inside a scene are converted to that scene's own clock.
const rel = (cut: Cut, id: string, frames: number[]) => frames.map((f) => f - scene(cut, id).from);
const sfxAt = (cut: Cut, type: string) => T[cut].sfx.filter((e: any) => e.type === type).map((e: any) => e.at as number);

const S: React.FC<{cut: Cut; id: string; children: (duration: number) => React.ReactNode}> = ({cut, id, children}) => {
  const {from, duration} = scene(cut, id);
  return <Sequence from={from} durationInFrames={duration} name={id}>{children(duration)}</Sequence>;
};

export const Long: React.FC<{animatic: boolean}> = ({animatic}) => {
  const myriad = scene('long', 'myriad');
  return (
    <AbsoluteFill style={{background: '#0e1115'}}>
      <S cut="long" id="one">{(d) => <OneThread duration={d} />}</S>
      <Sequence from={myriad.from} durationInFrames={150} name="myriad-3d"><Fade duration={150} fadeIn={0} fadeOut={14}><Myriad duration={150} /></Fade></Sequence>
      <Sequence from={myriad.from + 136} durationInFrames={myriad.duration - 136} name="strands"><Fade duration={myriad.duration - 136} fadeIn={14} fadeOut={6}><Strands duration={myriad.duration - 136} heroes={T.heroes} /></Fade></Sequence>
      {T.heroes.map((h, i) => <S key={h.id} cut="long" id={`hero-${h.id}`}>{(d) => <HeroCard hero={h} duration={d} index={i} />}</S>)}
      <S cut="long" id="braid">{(d) => <Braid duration={d} />}</S>
      <S cut="long" id="notebook">{(d) => <Notebook duration={d} />}</S>
      <S cut="long" id="planner">{(d) => <Planner duration={d} marks={rel('long', 'planner', sfxAt('long', 'tick'))} />}</S>
      <S cut="long" id="paralogues">{(d) => <Paralogues duration={d} bells={rel('long', 'paralogues', sfxAt('long', 'bell'))} />}</S>
      <S cut="long" id="night">{(d) => <Night duration={d} at={rel('long', 'night', sfxAt('long', 'swish'))[0]} />}</S>
      <S cut="long" id="weave">{(d) => <WeaveBack duration={d} />}</S>
      <S cut="long" id="end">{(d) => <EndCard duration={d} pluckAt={125} />}</S>
      <Subtitles animatic={animatic} />
      <Audio src={staticFile('audio/long-mix.wav')} />
    </AbsoluteFill>
  );
};

export const Short: React.FC<{animatic: boolean}> = () => (
  <AbsoluteFill style={{background: '#0e1115'}}>
    <S cut="short" id="one">{(d) => <OneThread duration={d} />}</S>
    <S cut="short" id="myriad">{(d) => <Fade duration={d} fadeIn={0} fadeOut={8}><Myriad duration={d} /></Fade>}</S>
    {T.heroes.map((h, i) => <S key={h.id} cut="short" id={`hero-${h.id}`}>{(d) => <HeroCard hero={h} duration={d} index={i} />}</S>)}
    <S cut="short" id="notebook">{(d) => <Notebook duration={d} />}</S>
    <S cut="short" id="planner">{(d) => <Planner duration={d} marks={rel('short', 'planner', sfxAt('short', 'tick'))} />}</S>
    <S cut="short" id="end">{(d) => <EndCard duration={d} pluckAt={0} fadeFrom={d - 14} />}</S>
    <Audio src={staticFile('audio/short-mix.wav')} />
  </AbsoluteFill>
);
