"""Browser regressions for the built guide; serves docs locally unless --base-url is supplied."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import threading
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ROUTES = ['#home', '#route/kai', '#route/dietrich', '#route/theodora', '#route/leda',
          '#story/war', '#story/salvation', '#planner', '#characters', '#classes',
          '#guide/g5', '#weekly', '#sources']
STATIC = ['directory.html', 'guide/g5.html', 'route/kai.html', 'character/59.html', 'classes.html',
          'character/58.html', 'character/text-5bc5d135.html', 'character/8.html', 'character/9.html',
          'character/22.html', 'character/24.html', 'character/18.html',
          'character/31.html', 'character/62.html', 'character/7.html', 'character/63.html']

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass

def require(condition, message):
    if not condition: raise AssertionError(message)

class Checks:
    def __init__(self, browser, base, output, name):
        self.browser, self.base, self.output, self.name = browser, base, output, name
        self.errors, self.requests, self.http_errors = [], [], []
        self.contexts, self.current = [], None
        self.origin = urlsplit(base).netloc
        self.visits = 0

    def context(self, **options):
        context = self.browser.new_context(**options)
        self.contexts.append(context)
        context.on('page', self.watch)
        context.on('request', lambda r: self.requests.append(r.url)
                   if urlsplit(r.url).scheme in ('http', 'https') and urlsplit(r.url).netloc != self.origin else None)
        context.on('response', lambda r: self.http_errors.append(f'{r.status} {r.url}') if r.status >= 400 else None)
        context.on('requestfailed', lambda r: self.http_errors.append(f'{r.failure} {r.url}'))
        return context

    def watch(self, page):
        page.on('pageerror', lambda e: self.errors.append(str(e)))

    def goto(self, page, path):
        self.current = page
        page.goto(self.base + path)
        expect(page.locator('main h1')).to_have_count(1)
        page.evaluate('document.fonts.ready')
        self.visits += 1

    def layout(self, page, width, label):
        info = page.evaluate('''() => ({body:document.body.scrollWidth,root:document.documentElement.scrollWidth,
          broken:[...document.images].filter(x=>x.complete&&!x.naturalWidth).map(x=>x.src)})''')
        require(max(info['body'], info['root']) <= width + 1, f'{label}: horizontal page overflow {info}')
        require(not info['broken'], f'{label}: broken images {info["broken"]}')

    def matrix(self):
        for mode in ('light', 'dark'):
            for width in (390, 900, 1366):
                context = self.context(viewport={'width': width, 'height': 844}, color_scheme=mode,
                                       reduced_motion='reduce', has_touch=width == 390)
                page = context.new_page()
                for route in ROUTES + STATIC:
                    self.goto(page, route)
                    expect(page.locator('html')).to_have_attribute('data-mode', mode)
                    self.layout(page, width, f'{self.name} {mode} {width} {route}')
                    if route in ('#route/kai', '#route/dietrich', '#route/theodora', '#route/leda', 'route/kai.html'):
                        expect(page.locator('#battles')).to_have_count(0)
                        require('培养重点' in page.locator('main').inner_text(), 'public training advice missing')
                    if width == 390 and mode == 'light' and route in ('character/22.html', 'character/24.html', 'character/18.html'):
                        page.screenshot(path=str(self.output / f'{self.name}-mobile-{Path(route).stem}.png'), full_page=True)
                    if width == 390 and route == '#planner':
                        require(page.locator('[data-plan-mark]').first.bounding_box()['y'] < 844,
                                'first mobile mark is below the initial screen')
                        require(not page.locator('#planner-own').evaluate('(e)=>e.open'), 'mobile native list should start collapsed')
                        require(not page.locator('#plan-backup-details').evaluate('(e)=>e.open'), 'mobile backup should start collapsed')
                        page.screenshot(path=str(self.output / f'{self.name}-{mode}-mobile-planner.png'))
                context.close()

    def planner(self):
        context = self.context(viewport={'width': 390, 'height': 844}, has_touch=True, reduced_motion='reduce')
        page = context.new_page()
        self.goto(page, '#planner/kai')
        first = page.locator('[data-plan-mark="target"]').first
        first.click()
        expect(first).to_have_attribute('aria-pressed', 'true')
        expect(page.locator('#planner-mobile-summary')).to_contain_text('计划 1')
        self.goto(page, '#planner/dietrich')
        page.locator('[data-plan-mark="done"]').first.click()
        page.evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:t=>{window.copied=t;return Promise.resolve()}}})")
        page.locator('#planner-mobile-summary [data-plan-backup]').click()
        expect(page.locator('.plan-backup')).to_contain_text('备份链接已是最新')
        snapshot = page.evaluate('({code:plannerData().backupCode,marks:plannerData().marks,link:window.copied})')
        require(snapshot['code'] in snapshot['link'], 'copied backup does not match stored snapshot')
        page.reload()
        expect(page.locator('main h1')).to_have_count(1)
        require(page.evaluate('plannerData().marks') == snapshot['marks'], 'marks did not survive reload')
        # Fresh device imports the whole plan and keeps the selected route after reload.
        other = self.context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        imported = other.new_page()
        self.goto(imported, '#planner?restore=' + snapshot['code'])
        imported.locator('[data-plan-restore="replace"]').click()
        expect(imported.locator('#planner-restore')).to_be_empty()
        require(imported.evaluate('plannerData().marks') == snapshot['marks'], 'backup import lost marks')
        selected = imported.evaluate('plannerData().route')
        imported.reload()
        expect(imported.locator('main h1')).to_have_count(1)
        require(imported.evaluate('plannerData().route') == selected, 'imported route was not saved')
        # Merge preserves a local recruited mark while adding marks on another route.
        mixed = self.context(reduced_motion='reduce').new_page()
        self.goto(mixed, '#planner/leda')
        mixed.locator('[data-plan-mark="done"]').first.click()
        local = mixed.evaluate('plannerData().marks.leda')
        self.goto(mixed, '#planner?restore=' + snapshot['code'])
        mixed.locator('[data-plan-restore="merge"]').click()
        combined = mixed.evaluate('plannerData().marks')
        require(combined['leda'] == local and combined['kai'] == snapshot['marks']['kai']
                and combined['dietrich'] == snapshot['marks']['dietrich'], 'merge discarded marks')
        # Completion deadlines are reminders only for readers who already accepted the quest.
        page.evaluate("localStorage.setItem('fe-next.gamedate.v1',JSON.stringify({kai:'10/11'}))")
        self.goto(page, '#home')
        reminders = page.locator('.resume-alerts').inner_text()
        require('已接者须在 10/12 前完成' in reminders, 'home omitted a known completion deadline')
        require(reminders.index('10/12') < reminders.index('7 天后开放'), 'completion deadline should precede next opening')

    def storage_and_clipboard(self):
        blocked = self.context(viewport={'width': 390, 'height': 844}, reduced_motion='reduce')
        blocked.add_init_script('''window.denyPlan=true;const originalSet=Storage.prototype.setItem;
          Storage.prototype.setItem=function(k,v){if(window.denyPlan&&k==='fe-next.planner.v1')throw new DOMException('blocked','QuotaExceededError');return originalSet.call(this,k,v)};''')
        page = blocked.new_page()
        self.goto(page, '#planner/kai')
        page.locator('[data-plan-mark="target"]').first.click()
        expect(page.locator('#planner-save-status')).to_be_visible()
        expect(page.locator('.plan-backup')).to_contain_text('浏览器未允许保存')
        require('已自动保存' not in page.locator('.plan-backup').inner_text(), 'failed storage claimed auto-save')
        require(page.evaluate('plannerData().savedAt') is None, 'failed write advanced saved timestamp')
        page.evaluate('window.denyPlan=false')
        page.locator('#plan-save-retry').click()
        expect(page.locator('#planner-save-status')).to_be_hidden()
        page.reload()
        expect(page.locator('#planner-mobile-summary')).to_contain_text('计划 1')
        rejected = self.context(reduced_motion='reduce')
        rejected.add_init_script("Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('denied'))}})")
        manual = rejected.new_page()
        self.goto(manual, '#planner/kai')
        manual.locator('[data-plan-mark="target"]').first.click()
        manual.locator('#plan-backup').click()
        expect(manual.locator('#plan-backup-out')).to_be_visible()
        expect(manual.locator('.plan-backup')).to_contain_text('备份尚未完成')
        require(manual.evaluate('plannerData().backupAt') is None, 'rejected copy advanced backup timestamp')
        old_code = manual.evaluate('plannerManualBackup.code')
        manual.locator('[data-plan-mark="target"]').nth(1).click()
        manual.locator('#plan-backup-confirm').click()
        require(manual.evaluate('plannerData().backupCode') == old_code, 'manual copy recorded a different plan')
        expect(manual.locator('.plan-backup')).to_contain_text('上次备份之后又有改动')

    def navigation(self):
        page = self.context(viewport={'width': 1366, 'height': 900}).new_page()
        self.goto(page, '#planner')
        page.locator('[data-character]').first.click()
        expect(page.locator('#character-dialog')).to_be_visible()
        page.evaluate("location.hash='#classes'")
        expect(page.locator('#class-results')).to_be_visible()
        expect(page.locator('dialog[open]')).to_have_count(0)
        # Exercise queued view transitions and the canvas lifecycle without reduced motion.
        for route in ('#home', '#route/kai', '#route/dietrich', '#home', '#route/theodora', '#home'):
            page.evaluate('(r)=>location.hash=r', route)
            page.wait_for_timeout(50)
        expect(page.locator('.hero-home')).to_be_visible()
        expect(page.locator('canvas.hero-weave')).to_have_count(1)

    def finish(self):
        require(not self.errors, f'JavaScript errors: {self.errors}')
        require(not self.http_errors, f'failed requests: {self.http_errors}')
        require(not self.requests, f'unexpected external requests: {sorted(set(self.requests))}')
        print(f'{self.name}: {self.visits} pages; layout, themes, planner, failures, deadlines and navigation passed.', flush=True)

    def close(self):
        for context in self.contexts: context.close()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', choices=['chromium', 'webkit', 'all'], default='chromium')
    parser.add_argument('--chromium-path', help='Use an installed Chromium instead of the Playwright download')
    parser.add_argument('--base-url', help='Existing HTTP preview or published site; no writes to the server')
    parser.add_argument('--output', type=Path, default=Path('/tmp/fe-guide-browser'))
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    server = None
    if args.base_url:
        base = args.base_url.rstrip('/') + '/'
    else:
        server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT / 'docs')))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{server.server_port}/'
    try:
        with sync_playwright() as pw:
            for name in (['chromium', 'webkit'] if args.browser == 'all' else [args.browser]):
                launch = {'headless': True}
                if name == 'chromium':
                    launch['args'] = ['--no-sandbox']
                    if args.chromium_path: launch['executable_path'] = args.chromium_path
                browser = getattr(pw, name).launch(**launch)
                checks = Checks(browser, base, args.output, name)
                try:
                    checks.matrix()
                    checks.planner()
                    checks.storage_and_clipboard()
                    checks.navigation()
                    checks.finish()
                except Exception:
                    if checks.current and not checks.current.is_closed():
                        checks.current.screenshot(path=str(args.output / f'{name}-failure.png'))
                    (args.output / f'{name}-errors.json').write_text(json.dumps({
                        'errors': checks.errors, 'http': checks.http_errors, 'external': checks.requests,
                    }, ensure_ascii=False, indent=2))
                    raise
                finally:
                    checks.close()
                    browser.close()
    finally:
        if server: server.shutdown(); server.server_close()

if __name__ == '__main__': main()
