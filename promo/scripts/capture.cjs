// Capture real site states for the promo, plus element geometry so overlays line up exactly.
// Needs the built site served locally:  (cd docs && python3 -m http.server 8766 --bind 127.0.0.1)
// Uses the Playwright installed globally in this environment:  NODE_PATH=$(npm root -g) node scripts/capture.cjs
const {chromium} = require('playwright');
const fs = require('fs'), path = require('path');
const SITE = process.env.SITE || 'http://127.0.0.1:8766/';
const OUT = path.join(__dirname, '..', 'public', 'capture');
fs.mkdirSync(OUT, {recursive: true});
const geo = {};
const rect = el => { const r = el.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height}; };

// Desktop captures are 1920x1080 CSS pixels at 2x, so the video can push in on details and stay sharp; geometry
// stays in CSS pixels, so anything drawn over a capture shown at 1920 wide lines up either way.
async function page(browser, {width = 1920, height = 1080, scale = 2, theme = 'light', store = {}} = {}) {
  const p = await browser.newPage({viewport: {width, height}, deviceScaleFactor: scale, reducedMotion: 'reduce'});
  await p.goto(SITE);
  await p.evaluate(([t, s]) => { localStorage.clear(); localStorage.setItem('fe-next.theme', t); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v)); }, [theme, store]);
  return p;
}
async function open(p, hash, wait = 900) { await p.goto(SITE + hash); await p.reload(); await p.waitForTimeout(wait); }
// The promo draws its own threads, so the site's canvas is hidden in captures of the hero.
const hideWeave = p => p.addStyleTag({content: '.hero-weave{display:none!important}'});

(async () => {
  const browser = await chromium.launch();

  // Home: hero without the canvas (the video weaves over it), plus the whole page for a slow scroll.
  {
    const p = await page(browser, {store: {'fe-next.last.v1': {hash: '#route/kai/paralogues', label: '凯伊篇 · 外传日历', at: Date.now() - 864e5}}});
    await open(p, '#home'); await hideWeave(p); await p.waitForTimeout(200);
    await p.screenshot({path: path.join(OUT, 'home.png')});
    await p.screenshot({path: path.join(OUT, 'home-full.png'), fullPage: true});
    await p.addStyleTag({content: '.hero-weave{display:block!important}'}); await p.waitForTimeout(300);
    await p.screenshot({path: path.join(OUT, 'home-weave.png')});
    geo.home = await p.evaluate(r => {
      const q = s => document.querySelector(s), R = eval(r);
      return {page: document.documentElement.scrollHeight, hero: R(q('.hero-home')), copy: R(q('.hero-copy')), art: R(q('.hero-art')), meta: R(q('.meta-strip')),
        panels: [...document.querySelectorAll('.portrait-panel')].map(R), title: R(q('.hero-copy h1'))};
    }, rect.toString());
    await p.close();
  }

  // Planner, Kai's route: three people marked one after another (the shopping list fills in).
  {
    // Magidi (an answer to choose), Michaela (gold), Nine (an item with a checked source): three rows on one screen
    // and a list that fills in. Scroll so the first of them sits below the header.
    const ids = ['48', '11', '28'];
    let y = 0;
    geo.planner = {states: []};
    for (let n = 0; n <= ids.length; n++) {
      const marks = Object.fromEntries(ids.slice(0, n).map(id => [id, 'target']));
      const p = await page(browser, {store: {'fe-next.planner.v1': {route: 'kai', renown: {kai: 5}, marks: {kai: marks, dietrich: {}, theodora: {}, leda: {}}}}});
      await open(p, '#planner/kai');
      if (!n) y = await p.evaluate(ids => Math.min(...ids.map(id => document.querySelector(`[data-plan-row="${id}"]`).getBoundingClientRect().top + scrollY)) - 150, ids);
      await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(400);
      await p.screenshot({path: path.join(OUT, `planner-${n}.png`)});
      geo.planner.states.push(await p.evaluate(([r, ids]) => {
        const R = eval(r), pick = (id, sel) => { const el = document.querySelector(`[data-plan-row="${id}"] ${sel}`); return el ? R(el) : null; };
        const summary = document.querySelector('#planner-summary');
        return {avatars: ids.map(id => pick(id, '.plan-person img')), buttons: ids.map(id => pick(id, '[data-plan-mark="target"]')), summary: summary ? R(summary) : null};
      }, [rect.toString(), ids]));
      await p.close();
    }
    geo.planner.scrollY = y;
  }

  // Kai's route page: the banner and the first chapter section, for slow pans across text and screenshots.
  {
    const p = await page(browser);
    await open(p, '#route/kai', 1200);
    await p.screenshot({path: path.join(OUT, 'route-kai.png'), clip: {x: 0, y: 0, width: 1920, height: 2160}, fullPage: true});
    geo.route = await p.evaluate(r => {
      const R = eval(r), q = s => document.querySelector(s), A = (el) => { const b = R(el); return {...b, y: b.y + scrollY}; };
      const sec = [...document.querySelectorAll('section.route-section')].slice(0, 2);
      return {hero: A(q('.route-hero')), title: A(q('.route-hero h1')), lead: A(q('.route-hero p')),
        sections: sec.map(e => ({box: A(e), title: A(e.querySelector('h2')), images: [...e.querySelectorAll('img')].slice(0, 2).map(A)}))};
    }, rect.toString());
    await p.close();
  }

  // The companion archive: the first rows of portraits.
  {
    const p = await page(browser);
    await open(p, '#characters', 1200);
    await p.screenshot({path: path.join(OUT, 'characters.png'), clip: {x: 0, y: 0, width: 1920, height: 1800}, fullPage: true});
    geo.characters = await p.evaluate(r => [...document.querySelectorAll('.character-card')].slice(0, 24).map(el => { const b = eval(r)(el); return {...b, y: b.y + scrollY}; }), rect.toString());
    await p.close();
  }

  // Classes with their pixel icons, the weekly list, and one companion's dossier.
  {
    const p = await page(browser);
    await open(p, '#classes', 1200);
    await p.screenshot({path: path.join(OUT, 'classes.png'), clip: {x: 0, y: 0, width: 1920, height: 2160}, fullPage: true});
    geo.classes = await p.evaluate(r => [...document.querySelectorAll('.class-icon')].slice(0, 30).map(el => { const b = eval(r)(el); return {...b, y: b.y + scrollY}; }), rect.toString());
    await open(p, '#weekly', 1000);
    await p.screenshot({path: path.join(OUT, 'weekly.png')});
    await open(p, '#characters', 1000);
    await p.click('.character-card:nth-child(4)'); await p.waitForTimeout(700);
    await p.screenshot({path: path.join(OUT, 'dossier.png')});
    geo.dossier = await p.evaluate(r => { const el = document.querySelector('#character-dialog .character-detail'); return el ? eval(r)(el) : null; }, rect.toString());
    await p.close();
  }

  // Paralogue overview on Dietrich's route (eight rows), captured sharp; the video sweeps its own "today" line.
  {
    const p = await page(browser, {scale: 2});
    await open(p, '#route/dietrich/paralogues');
    const fig = await p.$('.pg'); await fig.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    await fig.screenshot({path: path.join(OUT, 'paralogues.png')});
    geo.paralogues = await p.evaluate(r => {
      const R = eval(r), fig = document.querySelector('.pg'), f = R(fig), grid = R(fig.querySelector('.pg-grid'));
      // Same date range as paralogueGantt(): two days either side of the earliest and latest dates.
      const rows = routeParalogues('dietrich'), days = rows.flatMap(p => p.routes.dietrich.flatMap(w => [w.start, w.end, w.deadline].filter(Boolean).map(dayOfYear)));
      return {figure: f, track: {x: grid.x - f.x, y: grid.y - f.y, w: grid.w, h: grid.h}, from: Math.min(...days) - 2, to: Math.max(...days) + 2};
    }, rect.toString());
    await p.close();
  }

  // Day and night: Kai's company (second section of the route page), light and dark at the same scroll, plus where
  // the theme toggle sits.
  for (const theme of ['light', 'dark']) {
    const p = await page(browser, {theme});
    await open(p, '#route/kai', 1200);
    await p.evaluate(() => { const s = document.querySelectorAll('section.route-section')[1]; window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 110); });
    await p.waitForTimeout(500);
    await p.screenshot({path: path.join(OUT, `reading-${theme}.png`)});
    if (theme === 'light') geo.toggle = await p.evaluate(r => eval(r)(document.querySelector('#theme-toggle')), rect.toString());
    await p.close();
  }

  // Phone: Kai's route page at night.
  {
    const p = await page(browser, {width: 390, height: 844, scale: 3, theme: 'dark'});
    await open(p, '#route/kai', 1200);
    await p.screenshot({path: path.join(OUT, 'phone.png')});
    await p.close();
  }

  fs.writeFileSync(path.join(OUT, 'geometry.json'), JSON.stringify(geo, null, 2));
  await browser.close();
  console.log('captured', fs.readdirSync(OUT).join(', '));
})();
