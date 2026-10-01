// Copy what the video uses from the site into public/ (git-ignored): portraits and the self-hosted Latin serif.
import {cpSync, mkdirSync} from 'node:fs';
const site = new URL('../../', import.meta.url).pathname;
const pub = new URL('../public/', import.meta.url).pathname;
mkdirSync(pub + 'portrait', {recursive: true});
for (const id of [2, 3, 4, 5]) cpSync(`${site}docs/assets/portrait/${id}.jpg`, `${pub}portrait/${id}.jpg`);
cpSync(`${site}web/assets/fonts`, `${pub}fonts`, {recursive: true});
console.log('assets copied to public/');
