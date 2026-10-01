import React from 'react';
import {Composition} from 'remotion';
import {Long, Short} from './Video';
import {FPS, H, T, W} from './timeline';

export const Root: React.FC = () => (
  <>
    <Composition id="Long" component={Long} durationInFrames={T.long.frames} fps={FPS} width={W} height={H} defaultProps={{animatic: false}} />
    <Composition id="Short" component={Short} durationInFrames={T.short.frames} fps={FPS} width={W} height={H} defaultProps={{animatic: false}} />
  </>
);
