// Reuse the public route views at build time; no browser or npm dependency.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(0, 'utf8'));
const context = vm.createContext({
  window: { FE_DATA: data },
  document: { querySelector: () => null, querySelectorAll: () => [], activeElement: null },
  localStorage: { getItem: () => null },
});
for (const file of ['dietrich.js', 'campaign.js', 'reference.js', 'planner.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'web', file), 'utf8'), context, { filename: file });
}
vm.runInContext(fs.readFileSync(path.join(root, 'web/app.js'), 'utf8').split('function navigate()')[0], context);
const routes = Object.fromEntries(data.story.map(story => [story.id,
  vm.runInContext(`storyDetail(${JSON.stringify(story.id)})`, context)]));
process.stdout.write(JSON.stringify(routes));
