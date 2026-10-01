import {Config} from '@remotion/cli/config';

// Rendering uses the Chromium that ships with this environment (Remotion's own browser download is blocked here),
// and software WebGL for the three.js scene, since the container has no GPU.
Config.setBrowserExecutable(process.env.REMOTION_CHROME ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell');
Config.setChromiumOpenGlRenderer('swangle');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setConcurrency(4);
