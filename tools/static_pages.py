"""Static, crawlable copies of the guide for search engines and link previews.

The interactive site is a hash-routed single page, so crawlers that do not run JavaScript (Baidu among them) and
chat link previews see one page with no content. These pages render the same data at real URLs: manual chapters,
routes, characters and classes, plus a directory, sitemap.xml and robots.txt. They add no content of their own,
and each one links back to its interactive view.
"""
import html, re
from urllib.parse import quote

SITE = '万缕千丝 · 战术手帖'
NAV = [('home', '探索首页'), ('story', '流程攻略'), ('characters', '角色图鉴'), ('planner', '招募规划'),
       ('classes', '兵种资料'), ('guides', '攻略手册'), ('weekly', '每周行动'), ('sources', '情报档案')]
ROUTES = {'凯伊线': 'kai', '迪托利希线': 'dietrich', '赛奥朵拉线': 'theodora', '蕾达线': 'leda'}
TIERS = ['基础', '初级', '中级', '上级与高级', '最上级', '神将']
PROTAGONISTS = {'2', '3', '4', '5'}

def esc(value): return html.escape(str(value or ''), quote=True)
def summary(text, limit=120):
    text = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html.unescape(str(text or '')))).strip()
    return text if len(text) <= limit else text[:limit - 1].rstrip('，。；、：· ') + '…'
def safe_url(url): return url if re.match(r'https?://', url or '') else '#'
def evidence(refs):
    if not refs: return ''
    links = ''.join(f'<a href="{esc(safe_url(s["url"]))}" target="_blank" rel="noopener noreferrer">{esc(s["label"])} ↗</a>' for s in refs)
    return f'<div class="evidence">{links}<span>攻略来源交叉参考 · 未作游戏内实测</span></div>'

def public_url(base, path):
    # Cloudflare Pages answers /page.html with a redirect to /page, so canonical links and the sitemap name the
    # extensionless address; relative links keep .html so a plain local file server still resolves them.
    return base.rstrip('/') + '/' + path.removesuffix('.html')

class Site:
    def __init__(self, data, base, theme_script):
        self.d, self.base, self.theme_script = data, base.rstrip('/') + '/', theme_script
        self.pages = []  # (path, html, priority)
        self.people = {c['name']: c for c in data['characters']}
        for c in data['characters']:
            for alias in c['aliases']: self.people.setdefault(alias, c)
        names = sorted(self.people, key=len, reverse=True)
        self.name_pattern = re.compile('(' + '|'.join(map(re.escape, names)) + ')') if names else None

    def linked(self, text, rel):
        """Escape text and link character names to their static pages (the SPA turns them into chips)."""
        if not self.name_pattern: return esc(text)
        out = []
        for part in self.name_pattern.split(str(text or '')):
            c = self.people.get(part)
            out.append(f'<a href="{rel}character/{c["id"]}.html">{esc(part)}</a>' if c else esc(part))
        return ''.join(out)

    def shell(self, path, title, description, body, spa, crumbs=(), image=None, kind='article'):
        rel = '../' * path.count('/')
        url = public_url(self.base, path)
        nav = ''.join(f'<a href="{rel}index.html#{h}">{t}</a>' for h, t in NAV)
        trail = ''.join(f'<a href="{rel}{h}">{esc(t)}</a><span>/</span>' if h else f'<span>{esc(t)}</span>' for h, t in crumbs)
        og_image = f'\n  <meta property="og:image" content="{esc(self.base + image)}">' if image else ''
        return f'''<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#171d24">
  <meta name="color-scheme" content="light dark">
  {self.theme_script}
  <title>{esc(title)} · {SITE}</title>
  <meta name="description" content="{esc(description)}">
  <link rel="canonical" href="{esc(url)}">
  <meta property="og:site_name" content="{SITE}">
  <meta property="og:type" content="{kind}">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:url" content="{esc(url)}">
  <meta property="og:locale" content="zh_CN">{og_image}
  <link rel="icon" href="{rel}favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="{rel}styles.css">
</head>
<body class="static-page">
  <a href="#main" class="skip-link">跳到内容</a>
  <header class="site-header">
    <a href="{rel}index.html#home" class="brand" aria-label="万缕千丝 战术手帖首页">
      <img class="game-logo" src="{rel}assets/game-logo.webp" width="172" height="51" alt="Fire Emblem 万紫千红（万缕千丝）官方标志">
      <span class="brand-caption">万缕千丝<small>战 术 手 帖</small></span>
    </a>
    <nav class="main-nav" aria-label="主导航">{nav}</nav>
  </header>
  <main id="main" tabindex="-1"><div class="container page">
    <div class="breadcrumbs"><a href="{rel}index.html">首页</a><span>/</span>{trail}</div>
    <p class="static-note">这是便于搜索与分享的静态版本，内容与交互版同步生成。<a href="{rel}index.html#{spa}">打开交互版 →</a></p>
{body}
  </div></main>
  <footer class="site-footer"><a href="{rel}index.html#home">{SITE}</a><span>玩家整理，持续校对。资料快照 {esc(self.d["updated"])}。游戏与美术版权归 Nintendo / INTELLIGENT SYSTEMS 所有。</span><a href="{rel}directory.html">全站目录</a><a href="{rel}index.html#sources">资料与出处 ↗</a></footer>
</body>
</html>
'''

    def add(self, path, priority, *args, **kwargs):
        self.pages.append((path, self.shell(path, *args, **kwargs), priority))

    # ---- pages -------------------------------------------------------------------------------------------
    def guide(self, c, chapters):
        rel = '../'
        toc = ''.join(f'<a href="#{s["id"]}">{esc(s["title"])}</a>' for s in c['sections'])
        sections = ''.join(f'<section class="reading-section" id="{s["id"]}"><h2>{esc(s["title"])}</h2><div class="prose">{s["html"]}</div></section>' for s in c['sections'])
        prev = chapters[c['number'] - 2] if c['number'] > 1 else None
        nxt = chapters[c['number']] if c['number'] < len(chapters) else None
        end = (f'<a href="{prev["id"]}.html"><small>← 上一篇</small>{esc(prev["title"])}</a>' if prev else f'<a href="{rel}directory.html"><small>← 返回</small>全站目录</a>') + \
              (f'<a href="{nxt["id"]}.html"><small>下一篇 →</small>{esc(nxt["title"])}</a>' if nxt else f'<a href="{rel}index.html#weekly"><small>接着看 →</small>每周行动清单</a>')
        body = f'''<div class="reading-layout"><aside class="reading-nav"><h2>本篇目录 <span class="eyebrow">{c["number"]:02d}</span></h2><nav aria-label="本篇目录">{toc}</nav></aside><article class="reading-content"><header class="reading-title"><div class="eyebrow">CHAPTER {c["number"]:02d} / FIELD NOTES</div><h1>{esc(c["title"])}</h1><div class="article-meta"><span>资料快照 {esc(self.d["updated"])}</span><span>{len(c["sections"])} 个主题</span></div></header>{f'<div class="prose">{c["introHtml"]}</div>' if c["introHtml"] else ''}{sections}<nav class="page-end" aria-label="上一篇与下一篇">{end}</nav></article></div>'''
        topics = '、'.join(s['title'] for s in c['sections'])
        desc = summary(f'火焰纹章 万缕千丝攻略手册第 {c["number"]} 篇「{c["title"]}」：{topics}。' + (c['sections'][0]['text'] if c['sections'] else ''))
        self.add(f'guide/{c["id"]}.html', '0.8', f'{c["title"]} · 攻略手册', desc, body, f'guide/{c["id"]}',
                 crumbs=[('directory.html#guides', '攻略手册'), ('', f'第 {c["number"]} 篇')])

    def character(self, c):
        rel = '../'
        gift = c['gifts'].get('推荐礼物')
        likes = ''.join(f'<p class="aliases">{k}：{esc(c["gifts"][k])}</p>' for k in ('喜欢的东西', '兴趣') if c['gifts'].get(k))
        recruit = ''.join(f'<div><dt>{esc(n)}</dt><dd>{esc(c["recruit"].get(n) or "原表未收录")}</dd></div>' for n in ROUTES) if c['recruit'] else ''
        n, b = c.get('negotiations'), c.get('builds')
        if c['id'] in PROTAGONISTS:
            trade = '<p>第一部仅作为对应路线主角使用，其他三线不可招募；第三部加入取决于此前路线通关与剧情进度。</p>'
        elif n:
            by_route = ''.join(f'<div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>' for k, v in n['byRoute'].items())
            trade = f'<span class="tag">{esc(n["kind"])}</span><h4>{esc(n["condition"])}</h4><p>{esc(n["details"])}</p><p class="aliases">适用：{" / ".join(map(esc, n["routes"]))}</p>{f"<dl>{by_route}</dl>" if by_route else ""}{evidence(n["sources"])}'
        else:
            trade = '<p class="notice">本批尚未独立核对该角色交涉流程。先看上方原表的物品、金钱、外传与 S／R 门槛；没有写出明细不代表无条件加入。</p>'
        trade = trade + self.trade_sources(c, (n or {}).get('details', ''))
        if b:
            rows = ''.join(f'<div><dt>{k}</dt><dd>{esc(v)}</dd></div>' for k, v in [('前期', b['early']), ('中期', b['middle']), ('后期目标', b['late']), ('考试与解锁', b['requirement']), ('取舍与限制', b['caution'])])
            build = f'<div class="build-plan"><span class="tag amber">编辑培养建议</span><h4>{esc(b["role"])}</h4><dl>{rows}</dl><p class="notice">这些是阶段性培养方向，并非必须逐级转职的固定链。适用难度及版本未做独立实测；优先满足当前队伍缺口。</p>{evidence(b["sources"])}</div>'
        else:
            build = '<p class="notice">该角色的分阶段培养方案待补，暂不从同类角色直接套用。</p>'
        art = f'<img src="{rel}{esc(c["portrait"])}" alt="{esc(c["name"])}立绘">' if c.get('portrait') else ''
        body = f'''<article class="character-detail static-dossier"><div class="detail-art">{art}</div><div class="detail-body"><div class="eyebrow">COMPANION DOSSIER</div><h1>{esc(c["name"])}</h1><p class="jp">{esc(c["jp"])} · {esc(c["faction"])}</p><p class="aliases">检索别名：{" / ".join(map(esc, c["aliases"]))}</p><h2>喜欢什么，送什么</h2><p>{esc(gift) if gift and gift != "—" else "原手册尚未收录明确的推荐礼物。"}</p>{likes}<a class="text-link" href="{rel}guide/g4.html#s4-4">查看送礼原文与例外 →</a><h2>第一部 · 各路线加入条件</h2>{f'<dl>{recruit}</dl><p class="aliases">S = 支援等级 · R = 名声等级 · — = 无法招募</p>' if recruit else '<p>原手册未提供此角色的四路线招募表。</p>'}<a class="text-link" href="{rel}guide/g5.html#s5-3">查看招募原文与附加说明 →</a><section class="negotiation-detail"><h2>交涉要准备什么</h2>{trade}</section><section class="training-detail"><h2>怎么养，怎么转职</h2>{build}</section><div class="notice">本次新增条目经过来源页面核对，未逐项游戏内实测。没有补充明细的“交涉”仍待核验，不表示没有额外要求。</div></div></article>'''
        where = '；'.join(f'{k} {v}' for k, v in c['recruit'].items() if v and v != '—')
        desc = summary(f'火焰纹章 万缕千丝角色{c["name"]}（{c["jp"]}）· {c["faction"]}。' + (f'第一部加入条件：{where}。' if where else '') + (f'推荐礼物：{gift}。' if gift and gift != '—' else ''))
        has_gift = bool(gift and gift != '—')
        topic = '招募条件与推荐礼物' if c['recruit'] and has_gift else '招募条件' if c['recruit'] else '推荐礼物' if has_gift else '角色档案'
        self.add(f'character/{c["id"]}.html', '0.6', f'{c["name"]} · {topic}', desc, body,
                 'characters?name=' + quote(c['name']), crumbs=[('directory.html#characters', '角色图鉴'), ('', c['name'])],
                 image=c.get('portrait') or None, kind='profile')

    def route(self, s):
        rel = '../'
        t = lambda text: self.linked(text, rel)
        p = s.get('profile') or {}
        parts = []
        if p:
            parts.append(f'<section class="route-section"><h2>背景与特色</h2><p>{t(p.get("background"))}</p><p>{t(p.get("fit"))}</p><dl>{"".join(f"<div><dt>{esc(k)}</dt><dd>{t(v)}</dd></div>" for k, v in p.get("features", []))}</dl></section>')
            parts.append(f'<section class="route-section"><h2>人物培养</h2><p>{t(p.get("strength"))}</p>{"<ul>" + "".join(f"<li>{t(x)}</li>" for x in p.get("notes", [])) + "</ul>" if p.get("notes") else ""}</section>')
        if s.get('team'): parts.append(f'<p class="aliases">初始队伍：{"、".join(t(x) for x in s["team"])}</p>')
        if s.get('priorities'): parts.append('<section class="route-section"><h2>推进要点</h2><ol>' + ''.join(f'<li>{t(x)}</li>' for x in s['priorities']) + '</ol></section>')
        if s.get('battles'):
            parts.append('<section class="route-section"><h2>关卡笔记</h2>' + ''.join(self.battle(b, t) for b in s['battles']) + '</section>')
        paras = sorted((x for x in self.d['paralogues'] if s['id'] in x['routes']), key=lambda x: tuple(map(int, x['routes'][s['id']][0]['start'].split('/'))))
        if paras:
            cards = ''.join(self.paralogue(x, s['id'], t) for x in paras)
            parts.append(f'<section class="route-section"><h2>外传日历 · {len(paras)} 篇</h2><p>日期均为游戏内 1449 年；接取窗口结束后，即使完成期限未到，也可能接不到任务。</p>{cards}</section>')
        if s.get('chapters'):
            parts.append('<section class="route-section"><h2>各章资料来源</h2><p class="evidence">' + ''.join(f'<a href="{esc(safe_url(ch["url"]))}" target="_blank" rel="noopener noreferrer">第 {ch["number"]} 章 ↗</a>' for ch in s['chapters']) + '</p></section>')
        parts.append(evidence(s.get('sources')))
        head = f'<header class="reading-title"><div class="eyebrow">{"PART I · " + esc(p.get("tagline")) if p else "PART " + ("II" if s["part"] == 2 else "III")}</div><h1>{esc(s["title"])}</h1><p>{t(p.get("intro") or s.get("subtitle"))}</p></header>'
        title = s['title'] if s['part'] == 1 else f'第{"二" if s["part"] == 2 else "三"}部 · {s["title"]}'
        desc = summary(f'火焰纹章 万缕千丝 {title}攻略：{p.get("intro") or s.get("subtitle")}' + (s['priorities'][0] if s.get('priorities') else ''))
        spa = ('route/' if s['part'] == 1 else 'story/') + s['id']
        self.add(f'route/{s["id"]}.html', '0.8', f'{title}攻略', desc, f'<article class="reading-content static-route">{head}{"".join(parts)}</article>', spa,
                 crumbs=[('directory.html#routes', '流程攻略'), ('', title)])

    def trade_sources(self, c, shown):
        names = list(dict.fromkeys(x['item'] for p in c.get('plan', {}).values() for x in p.get('needs', []) if x['type'] == 'item'))
        rows = []
        for name in names:
            t = self.d.get('tradeItems', {}).get(name)
            known = ' '.join(v['text'] for v in t['verified'] if v['text'] not in shown) if t else ''
            if not t or not (known or t['pages']): continue
            pages = ' '.join(f'<a href="{esc(safe_url(p["url"]))}" target="_blank" rel="noopener noreferrer">{esc(p["label"].split(" · ")[0])} ↗</a>' for p in t['pages'])
            lead = '详见' if t['verified'] else '可先查'
            found = f'取得：{esc(known)}' if known else '取得方式见上方交涉说明' if t['verified'] else '取得方式本站尚未核对'
            more = f'<span>{lead} {pages}</span>' if pages else ''
            rows.append(f'<p><strong>{esc(name)}</strong><small class="plan-source">{found}{more}</small></p>')
        return f'<div class="trade-sources"><h4>物品去哪里找</h4>{"".join(rows)}</div>' if rows else ''

    @staticmethod
    def battle(b, t):
        team = f'<p><b>阵容</b> {t(b["team"])}</p>' if b.get('team') else ''
        watch = f'<p><b>留意</b> {t(b["watch"])}</p>' if b.get('watch') else ''
        steps = ''.join(f'<li>{t(x)}</li>' for x in b.get('steps', []))
        return f'<article class="static-battle"><h3>第 {esc(b.get("number"))} 章 · {esc(b.get("title"))}</h3><p><b>目标</b> {t(b.get("goal"))}</p>{team}<ol>{steps}</ol>{watch}{evidence(b.get("sources"))}</article>'

    @staticmethod
    def paralogue(x, route, t):
        def window(w):
            span = w['start'] if w['start'] == w['end'] else f'{w["start"]}—{w["end"]}'
            return f'<li>第 {esc(w["chapter"])} 章 · 可接取 {esc(span)} · 完成期限 {esc(w.get("deadline") or "来源未单列")}</li>'
        windows = ''.join(window(w) for w in x['routes'][route])
        return f'<article class="static-battle"><h3>{esc(x["person"])}外传 · {esc(x["title"])}</h3><ul>{windows}</ul><p><b>去哪里接</b> {esc(x["place"])}</p><p>{t(x["consequence"])}</p><p><b>道具奖励</b> {esc(x["reward"])}</p>{evidence(x.get("sources"))}</article>'

    @staticmethod
    def class_row(c):
        icon = f'<img class="class-icon" src="{esc(c["icon"])}" alt="" width="20" height="20" loading="lazy"> ' if c.get('icon') else ''
        cells = ''.join(f'<td>{esc(c[k])}</td>' for k in ('movement', 'exam', 'unlock', 'features', 'mastery', 'phase'))
        return f'<tr id="{esc(c["id"])}"><th scope="row">{icon}{esc(c["name"])}</th>{cells}</tr>'

    def classes(self):
        groups = []
        for tier in TIERS:
            rows = [c for c in self.d['classes'] if c['tier'] == tier]
            if not rows: continue
            body = ''.join(self.class_row(c) for c in rows)
            groups.append(f'<section class="route-section"><h2>{esc(tier)} · {len(rows)} 种</h2><div class="table-scroll wide" role="region" aria-label="{esc(tier)}兵种表，可横向滚动" tabindex="0"><table><thead><tr><th>兵种</th><th>移动</th><th>考试</th><th>开放条件</th><th>特性</th><th>精通技能</th><th>可用阶段</th></tr></thead><tbody>{body}</tbody></table></div></section>')
        refs = {s['url']: s for c in self.d['classes'] for s in c.get('sources', [])}
        body = f'<article class="reading-content static-route"><header class="reading-title"><div class="eyebrow">CLASS LIBRARY</div><h1>兵种资料</h1><p>{len(self.d["classes"])} 种兵种的考试、开放条件、特性与精通技能，按阶段排列。</p></header>{"".join(groups)}{evidence(list(refs.values()))}</article>'
        desc = summary(f'火焰纹章 万缕千丝全 {len(self.d["classes"])} 种兵种资料：' + '、'.join(c['name'] for c in self.d['classes'][:24]) + '等兵种的考试、开放条件与精通技能。')
        self.add('classes.html', '0.7', '兵种资料 · 考试与精通技能', desc, body, 'classes', crumbs=[('', '兵种资料')])

    def directory(self):
        d = self.d
        chapters = ''.join(f'<li><a href="guide/{c["id"]}.html">第 {c["number"]} 篇 · {esc(c["title"])}</a></li>' for c in d['chapters'])
        routes = ''.join(f'<li><a href="route/{s["id"]}.html">{esc(s["title"]) if s["part"] == 1 else "第" + ("二" if s["part"] == 2 else "三") + "部 · " + esc(s["title"])}</a></li>' for s in d['story'])
        people = ''.join(f'<li><a href="character/{c["id"]}.html">{esc(c["name"])}</a></li>' for c in d['characters'])
        body = f'''<article class="reading-content static-route"><header class="reading-title"><div class="eyebrow">SITE DIRECTORY</div><h1>全站目录</h1><p>攻略手册、四条路线与第二三部、{len(d["characters"])} 位角色和兵种资料的静态页面。招募规划、每周清单与搜索请用<a href="index.html">交互版</a>。</p></header>
<section class="route-section" id="guides"><h2>攻略手册</h2><ul class="static-list">{chapters}</ul></section>
<section class="route-section" id="routes"><h2>流程攻略</h2><ul class="static-list">{routes}</ul></section>
<section class="route-section" id="characters"><h2>角色图鉴 · {len(d["characters"])} 位</h2><ul class="static-list people">{people}</ul></section>
<section class="route-section" id="classes"><h2>兵种资料</h2><ul class="static-list"><li><a href="classes.html">全部 {len(d["classes"])} 种兵种</a></li></ul></section></article>'''
        self.add('directory.html', '0.5', '全站目录', f'火焰纹章 万缕千丝攻略站全站目录：攻略手册 {len(d["chapters"])} 篇、路线攻略 {len(d["story"])} 篇、角色 {len(d["characters"])} 位与兵种资料。', body, 'home', crumbs=[('', '全站目录')])

    def build(self):
        for c in self.d['chapters']: self.guide(c, self.d['chapters'])
        for s in self.d['story']: self.route(s)
        for c in self.d['characters']: self.character(c)
        self.classes()
        self.directory()
        return self.pages

def sitemap(base, pages, updated):
    urls = [(base.rstrip('/') + '/', '1.0')] + [(public_url(base, path), priority) for path, _, priority in pages]
    rows = ''.join(f'<url><loc>{esc(u)}</loc><lastmod>{updated}</lastmod><priority>{p}</priority></url>\n' for u, p in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{rows}</urlset>\n'

def robots(base):
    return f'User-agent: *\nAllow: /\n\nSitemap: {base.rstrip("/")}/sitemap.xml\n'

def write(out, data, base, index_html):
    """Write the static pages, sitemap.xml and robots.txt into `out`; return the page count."""
    theme = re.search(r'<script>\(function\(\)\{var m;.*?</script>', index_html)[0]
    pages = Site(data, base, theme).build()
    for directory in ('guide', 'route', 'character'):
        target = out / directory
        if target.exists():
            for old in target.glob('*.html'): old.unlink()  # drop pages whose source entry was removed
    for path, page, _ in pages:
        (out / path).parent.mkdir(parents=True, exist_ok=True)
        (out / path).write_text(page)
    (out / 'sitemap.xml').write_text(sitemap(base, pages, data['updated']))
    (out / 'robots.txt').write_text(robots(base))
    return len(pages)
