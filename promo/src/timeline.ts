import data from '../timeline.json';
import geometry from '../public/capture/geometry.json';

export type Cut = 'long' | 'short';
export type Hero = (typeof data.heroes)[number];
export const T = data;
export const G = geometry;
export const FPS = data.fps;
export const W = 1920, H = 1080;

export const scene = (cut: Cut, id: string) => {
  const s = data[cut].scenes.find((x) => x.id === id);
  if (!s) throw new Error(`No scene ${id} in ${cut}`);
  return {from: s.from, duration: s.to - s.from};
};
export const heroById = (id: string) => data.heroes.find((h) => h.id === id)!;

export const colors = {
  night: '#0e1115',
  dark: '#171d24',
  ink: '#f3eee5',
  muted: '#aeb6bd',
  gold: '#d8b45a',
  goldSoft: '#cbb68e',
  thread: '#e2c58c',
};
export const serif = '"Libre Caslon Text", "Noto Serif SC", serif';

// Day of year in a non-leap year, as the site's paralogue tracker does.
export const monthDay = (n: number) => {
  const d = new Date(Date.UTC(2001, 0, 1 + n));
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};
