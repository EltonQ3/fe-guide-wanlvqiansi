// Copy what the video uses from the site into public/ (git-ignored): every portrait, the class pixel icons and the
// self-hosted Latin serif, plus small index files so scenes can list them.
import {cpSync, mkdirSync, readdirSync, writeFileSync} from 'node:fs';
const site = new URL('../../', import.meta.url).pathname;
const pub = new URL('../public/', import.meta.url).pathname;
const copyAll = (from, to, test) => {
  mkdirSync(pub + to, {recursive: true});
  const names = readdirSync(site + from).filter(test).sort((a, b) => a.localeCompare(b, 'en', {numeric: true}));
  for (const n of names) cpSync(`${site}${from}/${n}`, `${pub}${to}/${n}`);
  writeFileSync(`${pub}${to}/index.json`, JSON.stringify(names));
  return names.length;
};
const portraits = copyAll('docs/assets/portrait', 'portrait', (n) => n.endsWith('.jpg'));
const icons = copyAll('docs/assets/icon/class', 'icon/class', (n) => n.endsWith('.png'));
cpSync(`${site}web/assets/fonts`, `${pub}fonts`, {recursive: true});
console.log(`copied ${portraits} portraits, ${icons} class icons and the fonts to public/`);
