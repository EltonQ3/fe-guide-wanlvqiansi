import React from 'react';
import {Composition} from 'remotion';
import {Short} from './Video';
import {LongCut} from './long/LongCut';
import {FPS, H, T, W} from './timeline';

export const Root: React.FC = () => (
  <>
    <Composition id="Long" component={LongCut} durationInFrames={T.long.frames} fps={FPS} width={W} height={H} />
    <Composition id="Short" component={Short} durationInFrames={T.short.frames} fps={FPS} width={W} height={H} defaultProps={{animatic: false}} />
  </>
);
