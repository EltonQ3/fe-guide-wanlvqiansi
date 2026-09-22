# -*- coding: utf-8 -*-
"""
生成《火焰纹章 万缕千丝》完全攻略手册 —— 多页站点版
- index.html         总目录首页
- p1.html ~ p6.html  六个正文篇
- 其后附录各自成页（每周速查等）
- 最后一页        资料源与可信度（每日更新 log + 1.1 + 来源/可靠度/译名）

特点：
- 纯 CSS 抽屉目录（checkbox 驱动），无 JS 也能打开
- 容器查询驱动的表格自适应
- 每页顶部上/下篇导航
- 人物头像色块、卡片化版面
"""
import re, html as ihtml, pathlib, shutil, json, sys
import markdown

# ---------- 路径解析（相对脚本自身，可在任意机器/沙箱运行）----------
HERE = pathlib.Path(__file__).resolve().parent   # tools/
ROOT = HERE.parent                               # 仓库根

# 允许命令行覆盖： --src <md> --out <dir>
def _opt(flag, default):
    if flag in sys.argv:
        return pathlib.Path(sys.argv[sys.argv.index(flag) + 1]).resolve()
    return default

SRC    = _opt('--src', ROOT / 'source' / '火焰纹章万缕千丝_完全攻略手册.md')
OUTDIR = _opt('--out', ROOT / 'docs')

sys.path.insert(0, str(HERE))
from site_css import CSS, PART_COLORS, PART_SOFTS

# 首页与各篇头图上的修订日期。内容有实质改动时改这里。
SITE_UPDATED = '2026-09-22'

# ---------- 人物美术资源映射 ----------
# docs/data/chars.json 手工维护（简繁别名都可命中）：
#   { "凯伊": {"n":"2","jp":"カイ","avatar":"assets/avatar/2.jpg",
#              "portrait":"assets/portrait/2.jpg"}, ... }
# 同时接受繁体名与简中别名，便于正文任意写法都能命中。
CHARS_JSON = ROOT / 'docs' / 'data' / 'chars.json'
try:
    CHAR_ART = json.loads(CHARS_JSON.read_text(encoding='utf-8'))
except Exception:
    CHAR_ART = {}

# 只保留文件名，运行时用 url_prefix 拼前缀，保证相对路径在任意部署根下可用。
CHAR_NAMES = sorted(CHAR_ART.keys(), key=len, reverse=True)

# 所有页面（index.html 与 p1~pN.html）都输出在同一层目录，
# 因此资源相对路径统一为 "assets/..."，无需按页面深度调整。
url_prefix = ''

raw = SRC.read_text(encoding='utf-8')

# ---------- 1) 按篇切分 ----------
lines = raw.split('\n')
# 找到所有 "# 第N篇" / "# 附录" 的位置
sections = []      # [(title, [lines])]
cur_title, cur_buf = None, []
for ln in lines:
    m = re.match(r'^#\s+(.*)$', ln)
    if m:
        t = m.group(1).strip()
        if t.startswith('火焰纹章'):
            continue           # 文档大标题丢弃
        if cur_title is not None:
            sections.append((cur_title, cur_buf))
        cur_title, cur_buf = t, []
    else:
        if cur_title is not None:
            cur_buf.append(ln)
if cur_title is not None:
    sections.append((cur_title, cur_buf))

print('切分出的段落：')
for t, b in sections:
    print(f'  {t}  ({len(b)} 行)')

# ---------- 2) 归并成页面 ----------
# 第一 ~ 第六篇各自成页；「附录·来源清单」「附录·情报可靠度提示」并入资料源页
def is_part(t):
    return bool(re.match(r'^第[一二三四五六七八九十]+篇', t))

part_secs = [s for s in sections if is_part(s[0])]
misc_secs = [s for s in sections if not is_part(s[0])]

# 从第一篇里抽出 1.1「资料来源总览」整节（从 ## 1.1 到下一个 ## 之前）
def split_out_source(lines_):
    start = None
    for i, ln in enumerate(lines_):
        if re.match(r'^##\s*1\.1\s', ln):
            start = i
            break
    if start is None:
        return lines_, None
    end = len(lines_)
    for j in range(start + 1, len(lines_)):
        if re.match(r'^##\s', lines_[j]):
            end = j
            break
    return lines_[:start] + lines_[end:], lines_[start:end]

# 把 1.1「资料来源总览」从第一篇抽出（它要移到资料源页）
_first_body, source_sec = split_out_source(part_secs[0][1])
part_secs[0] = (part_secs[0][0], _first_body)

# 1.1「资料来源总览」已被移到资料源页，第一篇篇内编号需整体前移：
# 1.2->1.1, 1.3->1.2 ... 1.7->1.6，保持「X.Y」从 1.1 起连续。
def renumber_first_part(lines_):
    """把第一篇里 ## 1.N 的 N 减 1（N>=2）。只在第一篇范围内调用。"""
    out = []
    for ln in lines_:
        m = re.match(r'^(##\s*)1\.(\d+)(\s.*)$', ln)
        if m:
            n = int(m.group(2))
            if n >= 2:
                ln = f'{m.group(1)}1.{n-1}{m.group(3)}'
        out.append(ln)
    return out

part_secs[0] = (part_secs[0][0], renumber_first_part(part_secs[0][1]))

PAGES = []
for i, (t, b) in enumerate(part_secs):
    PAGES.append({'file': f'p{i+1}.html', 'title': t, 'idx': i,
                  'color': PART_COLORS[i], 'soft': PART_SOFTS[i],
                  'sections': [b], 'kind': 'part'})

# 资料源页：每日更新 log（新大类，置顶）+ 1.1 + 附录·来源清单 + 附录·情报可靠度提示
DAILY_LOG = ROOT / 'source' / '_daily_log.json'

def render_daily_log():
    """把 _daily_log.json 渲染成「每日更新 log」大类的 HTML。纯静态，无 JS。"""
    if not DAILY_LOG.exists():
        data = {'entries': []}
    else:
        try:
            data = json.loads(DAILY_LOG.read_text(encoding='utf-8'))
        except Exception as e:
            print(f'  ! _daily_log.json 解析失败（{e}），按空日志渲染')
            data = {'entries': []}
    entries = data.get('entries') or []

    head = ('<h2 id="每日更新-log">每日更新 log'
            '<span class="h2note">自动采集 · 逐日留档</span></h2>'
            '<p>本站每日 09:00 自动巡检三语系攻略站与 UGC 论坛，'
            '将变更分类后写入正文，并在此逐日留档。<br>'
            '新来源按三级分档：'
            '<span class="grade gA">A</span>高可信（可并入正文）、'
            '<span class="grade gB">B</span>参考（UGC 一手资料，待裁决）、'
            '<span class="grade gC">C</span>待观察（标题党／AI 痕迹／纯聚合）。</p>')

    if not entries:
        return (head + '<div class="dlog-empty">'
                '<span class="ic">◷</span>'
                '<b>尚无采集记录</b><br>'
                '首次采集将于 <b>2026-09-20 09:00</b> 执行，'
                '此后每天更新一条，历史记录保留在本页。'
                '</div>')

    # 倒序：最新在最上
    entries = sorted(entries, key=lambda e: e.get('date', ''), reverse=True)
    days = []
    for e in entries:
        date = ihtml.escape(str(e.get('date', '')))
        checked = e.get('checked')
        cnt = f'<span class="dlog-count">检查 {checked} 个来源</span>' if checked else ''
        secs = []

        merged = e.get('merged') or []
        if merged:
            lis = []
            for it in merged:
                txt = it.get('text', '') if isinstance(it, dict) else str(it)
                src = it.get('src', '') if isinstance(it, dict) else ''
                link = ''
                if src:
                    if src.startswith('http'):
                        link = f' <a class="src" href="{ihtml.escape(src, quote=True)}" target="_blank" rel="noopener">出处</a>'
                    else:
                        link = f' <span class="src">{ihtml.escape(src)}</span>'
                lis.append(f'<li>{txt}{link}</li>')
            secs.append('<div class="dlog-sec"><span class="lbl">'
                        f'<span class="n">{len(merged)}</span>并入正文</span>'
                        f'<ul>{"".join(lis)}</ul></div>')

        news = e.get('new_sources') or []
        if news:
            lis = []
            for s in news:
                g = str(s.get('grade', 'C')).upper()[:1]
                g = g if g in 'ABC' else 'C'
                nm = ihtml.escape(s.get('name', ''))
                url = s.get('url', '')
                note = s.get('note', '')
                body_ = f'<a href="{ihtml.escape(url, quote=True)}" target="_blank" rel="noopener">{nm}</a>' if url else nm
                if note:
                    body_ += f' <span class="note">— {ihtml.escape(note)}</span>'
                lis.append(f'<li><span class="grade g{g}">{g}</span>{body_}</li>')
            secs.append('<div class="dlog-sec"><span class="lbl">'
                        f'<span class="n">{len(news)}</span>新来源候选</span>'
                        + ('' if not e.get('_notip') else '')
                        + f'<ul class="dlog-src">{"".join(lis)}</ul></div>')

        confs = e.get('conflicts') or []
        if confs:
            blocks = []
            for c in confs:
                tp = ihtml.escape(c.get('topic', '待确认'))
                cur = ihtml.escape(c.get('current', ''))
                inc = ihtml.escape(c.get('incoming', ''))
                src = c.get('src', '')
                sl = (f' <a class="src" href="{ihtml.escape(src, quote=True)}" target="_blank" rel="noopener">出处</a>'
                      if src and str(src).startswith('http') else (f' <span class="src">{ihtml.escape(src)}</span>' if src else ''))
                blocks.append(f'<div class="dlog-conf"><div class="tp">{tp}</div>'
                              f'<div class="vs">现有：<b>{cur}</b><br>新说法：<b>{inc}</b>{sl}</div></div>')
            secs.append('<div class="dlog-sec"><span class="lbl">'
                        f'<span class="n">{len(confs)}</span>冲突待裁决（未改动正文）</span>'
                        f'{"".join(blocks)}</div>')

        lims = e.get('limited') or []
        if lims:
            blocks = []
            for l in lims:
                site = ihtml.escape(l.get('site', ''))
                rs = ihtml.escape(l.get('reason', ''))
                blocks.append(f'<div class="dlog-lim"><b>{site}</b>：{rs}</div>')
            secs.append('<div class="dlog-sec"><span class="lbl">'
                        f'<span class="n">{len(lims)}</span>采集受限</span>'
                        f'{"".join(blocks)}</div>')

        if not secs:
            secs.append('<div class="dlog-sec"><span class="none">本次未发现变更。</span></div>')

        days.append(f'''<div class="dlog-day">
  <div class="dlog-head"><span class="dlog-date">{date}</span>{cnt}</div>
  <div class="dlog-body">{''.join(secs)}</div>
</div>''')

    return head + '<div class="dlog">' + ''.join(days) + '</div>'

src_blocks = [('RAWHTML', render_daily_log())]
if source_sec:
    src_blocks.append(source_sec)

# 归入「资料源与可信度」页的附录类章节
# 注意：新增附录时必须同步登记此表，否则会被当作独立篇章单独成页，导致全站序号错位
SRC_PAGE_KEYS = ('来源', '可靠度', '译名')

def _belongs_to_src_page(title):
    return any(k in title for k in SRC_PAGE_KEYS)

for t, b in misc_secs:
    if _belongs_to_src_page(t):
        # 切分时标题被消费掉了（存在 t 里，不在 b 里），这里补回去，
        # 否则该段会失去标题层级、并在目录里缺席。
        src_blocks.append([f'# {t}', ''] + list(b))
# 其余杂项（如每周速查卡）单独成页
others = [(t, b) for (t, b) in misc_secs if not _belongs_to_src_page(t)]

for t, b in others:
    PAGES.append({'file': f'p{len(PAGES)+1}.html', 'title': t, 'idx': len(PAGES),
                  'color': '#0f8a63', 'soft': '#eafaf4',
                  'sections': [b], 'kind': 'tool'})

PAGES.append({'file': f'p{len(PAGES)+1}.html', 'title': '资料源与可信度',
              'idx': len(PAGES), 'color': '#5b6472', 'soft': '#f2f4f7',
              'sections': src_blocks, 'kind': 'src'})

# 重排 idx，保证与文件序号一致
for i, p in enumerate(PAGES):
    p['idx'] = i

print('\n生成页面：')
for p in PAGES:
    print(f"  {p['file']}  {p['title']}")

# ---------- 3) markdown 转换与增强 ----------
slug_seen = {}
def make_id(text):
    s = re.sub(r'[^\w\u4e00-\u9fff]+', '-', text).strip('-') or 'sec'
    n = slug_seen.get(s, 0); slug_seen[s] = n + 1
    return s if n == 0 else f'{s}-{n}'

# 人物头像配色：按角色名分配稳定色
CHAR_COLORS = ['#b8123c', '#1f5fa8', '#7a4bbf', '#0e8f9e', '#0f8a63',
               '#c2790a', '#c2185b', '#5b6472', '#2f6f9f', '#8a5a1e']
char_color_map = {}
def char_color(name):
    if name not in char_color_map:
        char_color_map[name] = CHAR_COLORS[len(char_color_map) % len(CHAR_COLORS)]
    return char_color_map[name]

# 主角色系：同一条路线的主角与其核心班底共用同一色相，视觉上成组
CLUSTER_COLORS = {
    'kay':  '#b8123c',   # 凯伊篇
    'dito': '#1f5fa8',   # 迪托利希篇
    'theo': '#7a4bbf',   # 赛奥朵拉篇
    'leda': '#0e8f9e',   # 蕾达篇
    'div':  '#c2790a',   # 神 / 非主角
}

def char_cluster(name):
    """按角色名判断所属阵营"""
    if name in ('凯伊', '奥罗拉', '玛尔斯', '希露卡', '莱纳斯', '蕾娜', '艾尔'):
        return 'kay'
    if name in ('迪托利希', '朱拉', '卡莲'):
        return 'dito'
    if name in ('赛奥朵拉', '卡拉', '芙蕾雅'):
        return 'theo'
    if name in ('蕾达', '克蕾德娜', '芙托娜'):
        return 'leda'
    if name in ('斯米尔诺斯', '伊修玛尔', '奥尔赫尔'):
        return 'div'
    return None

def _art(name, kind='avatar'):
    """按中文名取美术资源相对路径；找不到返回 None"""
    rec = CHAR_ART.get(name.strip())
    if not rec:
        return None
    p = rec.get(kind)
    return p or None


def avatar(name, size=''):
    """
    人物头像。
    有立绘素材时输出真实图片；缺失则回退为同阵营配色的首字色块，
    保证版面不出现空洞。
    """
    name = name.strip()
    cl = char_cluster(name)
    c = CLUSTER_COLORS[cl] if cl else char_color(name)
    cls = 'avatar' + (f' {size}' if size else '')
    tip = ihtml.escape(name, quote=True)

    src = _art(name, 'avatar')
    if src:
        # 主角伊修玛尔为男女双人，标记后由 CSS 呈现并列头像
        dual = CHAR_ART.get(name, {}).get('avatar_f')
        dual_cls = ' is-dual' if dual else ''
        dual_img = (f'<img class="av-b" src="{url_prefix}{CHAR_ART[name]["avatar_f"]}" '
                    f'alt="{tip}（女）" loading="lazy">' if dual else '')
        return (f'<span class="{cls}{dual_cls}" style="--ac:{c}" title="{tip}" '
                f'data-name="{tip}">'
                f'<img class="av-a" src="{url_prefix}{src}" alt="{tip}" loading="lazy">'
                f'{dual_img}</span>')

    return (f'<span class="{cls}" style="--ac:{c}" title="{tip}" '
            f'data-name="{tip}" aria-hidden="true">{ihtml.escape(name[:1])}</span>')

def prep_table(m):
    tbl = m.group(0)
    head = re.search(r'<thead>.*?</thead>', tbl, re.S)
    labels = []
    if head:
        labels = [re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', th)).strip()
                  for th in re.findall(r'<th[^>]*>.*?</th>', head.group(0), re.S)]
    cols = len(labels)
    if cols == 0:
        ft = re.search(r'<tr>.*?</tr>', tbl, re.S)
        if ft:
            cols = len(re.findall(r'<th[^>]*>|<td[^>]*>', ft.group(0)))
    cls = f' class="c{cols}"' if 2 <= cols <= 12 else ''
    if cls:
        tbl = tbl.replace('<table>', f'<table{cls}>', 1)
    def row_fix(rm):
        row = rm.group(0); idx = [0]
        def td_fix(tm):
            i = idx[0]; idx[0] += 1
            lab = labels[i] if i < len(labels) else ''
            return tm.group(0).replace('<td', f'<td data-label="{ihtml.escape(lab, quote=True)}"', 1)
        return re.sub(r'<td[^>]*>', td_fix, row)
    tbl = re.sub(r'<tr>.*?</tr>', row_fix, tbl, flags=re.S)
    return tbl


def flatten_sections(sections):
    """把 sections 展平成 build_body 可消费的行列表。
    行列表 -> 展开为行；('RAWHTML', html) 元组 -> 原样保留（不去拆它）。"""
    out = []
    for sec in sections:
        if isinstance(sec, tuple):
            out.append(sec)
        else:
            out.extend(sec)
    return out

def build_body(src_lines, page):
    """把 md 行转成带 id 的 HTML。

    src_lines 元素既可以是 markdown 文本行，也可以是 ('RAWHTML', html) 元组
    ——后者跳过 markdown 转换，直接原样嵌入（用于动态生成的组件，如每日更新 log）。
    """
    raw = [x[1] for x in src_lines if isinstance(x, tuple) and x[0] == 'RAWHTML']
    md_lines = [x for x in src_lines if not (isinstance(x, tuple) and x[0] == 'RAWHTML')]

    md = markdown.Markdown(extensions=['tables', 'fenced_code', 'sane_lists', 'attr_list'])
    text = '\n'.join(md_lines)
    body = md.convert(text)

    toc = []
    def repl(m):
        level, attrs, content = int(m.group(1)), m.group(2), m.group(3)
        plain = re.sub(r'<[^>]+>', '', content)
        if level not in (1, 2, 3):
            return m.group(0)
        sid = make_id(plain)
        toc.append((level, sid, plain))
        return f'<h{level} id="{sid}"{attrs}>{content}</h{level}>'
    body = re.sub(r'<h([123])([^>]*)>(.*?)</h\1>', repl, body, flags=re.S)

    # 表格增强
    body = re.sub(r'<table>.*?</table>', prep_table, body, flags=re.S)
    def wrap_table(m):
        tbl = m.group(1)
        cm = re.search(r'<table class="c(\d+)"', tbl)
        cols = int(cm.group(1)) if cm else 0
        c = 'table-wrap scrollable cardmode' if cols >= 2 else 'table-wrap'
        return f'<div class="{c}">{tbl}</div>'
    body = re.sub(r'(<table[^>]*>.*?</table>)', wrap_table, body, flags=re.S)

    # 人物头像：给「角色」类列自动加头像
    body = enhance_characters(body)
    # 正文内联头像：表格之外的首次提及也配图，方便辨认
    body = enhance_inline_characters(body)
    # 速查流程：把紧随「标准流程」提示语的 <ol> 转成编号步骤卡
    body = enhance_steps(body)

    # 原始 HTML 片段：置顶（每日更新 log 需排在来源清单之前），并为其中的 h2 建目录锚点
    if raw:
        raw_html = '\n'.join(raw)
        for m in re.finditer(r'<h([12])[^>]*id="([^"]+)"[^>]*>(.*?)</h\1>', raw_html, re.S):
            lvl = int(m.group(1)); sid = m.group(2)
            inner = m.group(3)
            # 去掉 h2note 等徽章文字，目录只保留主标题
            inner = re.sub(r'<span class="h2note".*?</span>', '', inner, flags=re.S)
            plain = re.sub(r'<[^>]+>', '', inner).strip()
            toc.insert(0, (lvl, sid, plain))
        body = raw_html + '\n' + body

    return body, toc

# 已知角色名单（用于匹配加头像）
# 从 chars.json 自动汇总，并保留若干正文历史写法作为别名补充。
# 注意：不要加入单字别名（如「凯」），会与「凯旋」「凯甲」等普通词误匹配。
KNOWN_CHARS = list(CHAR_NAMES) + [
    '埃什梅尔', '皮特鲁',
]
# 去重并保持「长名优先」以便贪婪匹配
_seen_kc = set()
KNOWN_CHARS = [c for c in KNOWN_CHARS
               if not (c in _seen_kc or _seen_kc.add(c))]

# 「角色列」判定：除精确表头外，还接受含「角色/主角/心」的列名（如「路线」）
CHAR_HEAD_OK = ('角色', '主角', '神', '英雄', '路线', '对象', '名字', '名称')

def enhance_characters(body):
    """
    给「角色」类列自动前置色块头像。规则：
    1. 只处理有 thead 的表；
    2. 找出表头命中 CHAR_HEAD_OK 的列（可能不止第一列）；
    3. 单元格纯文本以已知角色名开头时前置头像，且整表去重，同一角色只加一次；
    4. 纯数字/纯符号单元格跳过。
    """
    def fix_table(m):
        tbl = m.group(0)
        head = re.search(r'<thead>.*?</thead>', tbl, re.S)
        if not head:
            return tbl
        labels = [re.sub(r'\s+', '', re.sub(r'<[^>]+>', '', th)) .strip()
                  for th in re.findall(r'<th[^>]*>.*?</th>', head.group(0), re.S)]
        cols = [i for i, lab in enumerate(labels) if lab in CHAR_HEAD_OK]
        if not cols:
            return tbl
        seen = set()

        def fix_row(rm):
            row = rm.group(0)
            if '<th' in row:
                return row
            parts = re.findall(r'<td[^>]*>.*?</td>', row, re.S)
            if not parts:
                return row
            new_row = row
            for ci in cols:
                if ci >= len(parts):
                    continue
                cell = parts[ci]
                im = re.match(r'(<td[^>]*>)(.*?)(</td>)$', cell, re.S)
                if not im:
                    continue
                inner = im.group(2)
                plain = re.sub(r'<[^>]+>', '', inner).strip()
                plain = plain.lstrip('•·-—　 ').strip()
                if not plain or plain in seen:
                    continue
                name = None
                for k in sorted(KNOWN_CHARS, key=len, reverse=True):
                    if plain.startswith(k):
                        name = k
                        break
                if not name:
                    continue
                seen.add(plain)
                new_cell = im.group(1) + avatar(name, 'sm') + inner + im.group(3)
                new_row = new_row.replace(cell, new_cell, 1)
            return new_row

        return re.sub(r'<tr>.*?</tr>', fix_row, tbl, flags=re.S)
    return re.sub(r'<table[^>]*>.*?</table>', fix_table, body, flags=re.S)


# 哪些提示语后面的有序列表要转成步骤卡
STEP_TRIGGER = ('标准流程', '流程：', '流程:', '每周流程', '优先级判断')
CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩'


def enhance_inline_characters(body):
    """
    正文（表格之外）首次提到某角色时，在名字前插入小头像。
    规则：
      1. 只在文本节点中操作，跳过标签属性与已有头像（避免嵌套重复）；
      2. 每个角色整页只加一次，避免满屏头像反而干扰阅读；
      3. 表格内部已由 enhance_characters 处理，此处排除；
      4. 段落/列表/引用内才加，标题（h1~h4）不加，保持标题干净。
    """
    # 1) 先把表格整体挖出来占位，避免被本函数处理
    tables = []

    def stash(m):
        tables.append(m.group(0))
        return f'\x00TBL{len(tables) - 1}\x00'

    body = re.sub(r'<table[^>]*>.*?</table>', stash, body, flags=re.S)

    # 2) 把标题也挖出来，标题内不加头像
    heads = []

    def stash_h(m):
        heads.append(m.group(0))
        return f'\x00HED{len(heads) - 1}\x00'

    body = re.sub(r'<h[1-6][^>]*>.*?</h[1-6]>', stash_h, body, flags=re.S)

    # 3) 列表（来源清单、步骤、条目）不加内联头像，避免一屏人名都带头像。
    #    角色表仍由 enhance_characters 处理。
    lists = []

    def stash_list(m):
        lists.append(m.group(0))
        return f'\x00LST{len(lists) - 1}\x00'

    body = re.sub(r'<(ul|ol)[^>]*>.*?</\1>', stash_list, body, flags=re.S)

    used = set()

    def add_in_text(m):
        pre, text = m.group(1), m.group(2)
        for name in KNOWN_CHARS:          # 已按长度降序，保证贪婪匹配
            if name in used or name not in text:
                continue
            idx = text.index(name)
            # 名字前需为词首（行首、空白、标点或中文），避免截断词
            if idx > 0 and re.match(r'[\w\u4e00-\u9fff]', text[idx - 1]):
                continue
            used.add(name)
            text = (text[:idx] + avatar(name, 'sm') + text[idx:])
            # 插入后位置变化，重新从当前 used 状态继续
        return pre + text

    # 只在标签之间的纯文本里替换
    body = re.sub(r'(>)([^<>]+)(?=<)', add_in_text, body)

    # 4) 还原列表、标题与表格（列表在标题之后还原，避免占位符被包进标题）
    def restore_l(m):
        return lists[int(m.group(1))]

    def restore_h(m):
        return heads[int(m.group(1))]

    def restore_t(m):
        return tables[int(m.group(1))]

    body = re.sub(r'\x00LST(\d+)\x00', restore_l, body)
    body = re.sub(r'\x00HED(\d+)\x00', restore_h, body)
    body = re.sub(r'\x00TBL(\d+)\x00', restore_t, body)
    return body

def enhance_steps(body):
    """
    把「标准流程」等提示语后紧跟的 <ol> 转成编号步骤卡网格；
    把包含 ①②③ 的引用块标记为「优先级」强化样式。
    纯静态改写，不依赖 JS。
    """
    # 1) <p><strong>X 标准流程：</strong></p> + <ol>...</ol>
    def conv(m):
        pre, ol = m.group(1), m.group(2)
        items = re.findall(r'<li>(.*?)</li>', ol, re.S)
        if len(items) < 3:
            return m.group(0)
        cards = []
        for i, it in enumerate(items, 1):
            txt = it.strip()
            wide = ' wide' if len(re.sub(r'<[^>]+>', '', txt)) > 52 else ''
            cards.append(
                f'<div class="step{wide}" role="listitem"><span class="num" aria-hidden="true"><i>{i}</i></span>'
                f'<span class="tx">{txt}</span></div>')
        return (f'{pre}<div class="steps" role="list">' + ''.join(cards) + '</div>')
    pat = re.compile(r'(<p>(?:(?!</p>).)*?(?:' + '|'.join(map(re.escape, STEP_TRIGGER)) + r')(?:(?!</p>).)*?</p>)\s*<ol>(.*?)</ol>', re.S)
    body = pat.sub(conv, body)

    # 2) 优先级引用块：需同时含 ①②③ 与排序连接符（＞ / > / → ），避免误判普通列举
    def prio(m):
        inner = m.group(1)
        plain = re.sub(r'<[^>]+>', '', inner)
        hits = sum(1 for c in CIRCLED if c in plain)
        ranked = ('＞' in plain) or ('>' in plain)
        if hits < 3 or not ranked:
            return m.group(0)
        return ('<blockquote class="prio"><span class="pin">优先级</span>' + inner.strip() + '</blockquote>')
    body = re.sub(r'<blockquote>(.*?)</blockquote>', prio, body, flags=re.S)
    return body


# ---------- 4) 组件 ----------
def topbar_html(page):
    return f'''<div class="topbar">
  <label class="menu-btn" for="navToggle" aria-label="打开目录" role="button" tabindex="0">
    <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
  </label>
  <div class="brand"><span class="dot"></span>火焰纹章 万缕千丝 <span class="seg">· {ihtml.escape(page['title'])}</span></div>
</div>'''

def sidebar_html(all_pages, cur_page, toc):
    """侧边栏 = 全站篇章（与首页同结构）+ 当前篇的章节。
    不再显示篇序号（正文已有「第N篇」标题），也不再分「总目录/本篇目录」两栏。"""
    items = []
    for p in all_pages:
        cur = p['file'] == cur_page['file']
        items.append(
            f'<a class="toc-link toc-part{" active" if cur else ""}" href="{p["file"]}"'
            f' style="--active-fg:{p["color"]};--active-bg:{p["soft"]}">{ihtml.escape(p["title"])}</a>')
        if cur:
            for lvl, sid, txt in toc:
                cls = 'toc-sec' if lvl >= 2 else ''
                items.append(
                    f'<a class="toc-link {cls}" href="#{sid}" data-target="{sid}"'
                    f' style="--active-fg:{p["color"]};--active-bg:{p["soft"]}">{ihtml.escape(txt)}</a>')
    return f'''<aside class="sidebar" id="sidebar">
  <div class="drawer-close"><label class="menu-btn" for="navToggle" aria-label="关闭目录" role="button" tabindex="0">
    <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
  </label></div>
  <div class="nav-scroll">
    <div class="sidebar-title">目录 · Contents</div>
    {''.join(items)}
  </div>
</aside>'''

def pager_html(all_pages, idx):
    out = []
    if idx > 0:
        p = all_pages[idx-1]
        out.append(f'<a class="prev" href="{p["file"]}" style="--pc:{p["color"]}">'
                   f'<span class="dir">← 上一篇</span>'
                   f'<span class="ttl"><span class="dotm"></span>{ihtml.escape(p["title"])}</span></a>')
    if idx < len(all_pages)-1:
        p = all_pages[idx+1]
        out.append(f'<a class="next" href="{p["file"]}" style="--pc:{p["color"]}">'
                   f'<span class="dir">下一篇 →</span>'
                   f'<span class="ttl"><span class="dotm"></span>{ihtml.escape(p["title"])}</span></a>')
    return f'<div class="pager">{"".join(out)}</div>'

def page_shell(page, all_pages, sidebar, hero, body_html, pager):
    color, soft = page['color'], page['soft']
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="{color}">
<meta name="format-detection" content="telephone=no">
<title>{ihtml.escape(page['title'])} · 火焰纹章 万缕千丝 完全攻略手册</title>
<style>{CSS}
:root{{--cur:{color};--cur-soft:{soft}}}
</style>
</head>
<body>
<input type="checkbox" id="navToggle" aria-hidden="true">
{topbar_html(page)}
<div class="scrim"><label for="navToggle" style="display:block;width:100%;height:100%"></label></div>
<div class="layout">
{sidebar}
  <main class="content">
    {hero}
    <article class="card">
{body_html}
    </article>
    {pager}
  </main>
</div>
<a class="to-top" id="toTop" href="#" aria-label="回到顶部">
  <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
</a>
<script>
(function(){{
  // 抽屉在点击目录项后自动关闭（无 JS 时仅是不自动关，功能不受影响）
  var t=document.getElementById('navToggle');
  document.querySelectorAll('.sidebar a[href^="#"]').forEach(function(a){{
    a.addEventListener('click',function(){{ t.checked=false; }});
  }});
  // 回顶按钮显隐
  var tt=document.getElementById('toTop');
  tt.addEventListener('click',function(e){{e.preventDefault();window.scrollTo({{top:0,behavior:'smooth'}});}});
  var tick=false;
  window.addEventListener('scroll',function(){{
    if(!tick){{tick=true;requestAnimationFrame(function(){{
      tt.classList.toggle('show',window.scrollY>500);tick=false;}});}}
  }},{{passive:true}});
  // 侧栏高亮
  var links=[].slice.call(document.querySelectorAll('.sidebar a[data-target]'));
  var hs=links.map(function(a){{return document.getElementById(a.dataset.target);}});
  var cur=-1,sup=false,supT=null;
  function setA(i){{
    if(i===cur)return;cur=i;
    links.forEach(function(x,j){{x.classList.toggle('active',j===i);}});
  }}
  links.forEach(function(a,i){{
    a.addEventListener('click',function(e){{
      e.preventDefault();
      var el=document.getElementById(a.dataset.target); if(!el)return;
      t.checked=false;
      setA(i); sup=true;
      clearTimeout(supT); supT=setTimeout(function(){{sup=false;}},700);
      var mob=window.innerWidth<=860;
      var y=el.getBoundingClientRect().top+window.scrollY-(mob?80:74);
      window.scrollTo({{top:Math.max(0,Math.round(y)),behavior:'smooth'}});
      if(history.replaceState)history.replaceState(null,'','#'+a.dataset.target);
    }});
  }});
  function spy(){{
    if(sup)return;
    var y=window.scrollY||0, probe=y+(window.innerWidth<=860?150:100), idx=0;
    for(var i=0;i<hs.length;i++){{
      if(!hs[i])continue;
      if(hs[i].getBoundingClientRect().top+y<=probe+6)idx=i;
    }}
    if(idx!==cur)setA(idx);
  }}
  window.addEventListener('scroll',function(){{
    if(!tick){{tick=true;requestAnimationFrame(function(){{spy();tick=false;}});}}
  }},{{passive:true}});
  window.addEventListener('resize',spy);
  spy();

  /*
    抽屉滚动锁兜底：:has() 已可用时由 CSS 处理；
    不支持 :has() 的老 WebView 用 JS 补上，避免滑动穿透到主页面。
  */
  var hasSel = (function(){{
    try{{ return CSS.supports('selector(html:has(a))'); }}catch(e){{ return false; }}
  }})();
  if(!hasSel){{
    var y = 0;
    function lock(){{
      y = window.scrollY || 0;
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = (-y) + 'px';
      document.body.style.width = '100%';
    }}
    function unlock(){{
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, y);
    }}
    t.addEventListener('change', function(){{ t.checked ? lock() : unlock(); }});
  }}
}})();
</script>
</body>
</html>'''

# ---------- 5) 逐页生成 ----------
def part_hero(page, total_sections):
    n = page['idx'] + 1
    if page['kind'] == 'part':
        cn = '一二三四五六七八九十'[page['idx']] if page['idx'] < 10 else str(n)
        name = re.sub(r'^第[一二三四五六七八九十]+篇\s*·\s*', '', page['title'])
        eyebrow = f'第{cn}篇'
        pills = ['日文站 · 中文站 · 英文站 三语综合', f'{total_sections} 个章节', f'修订 {SITE_UPDATED}']
    elif page['kind'] == 'tool':
        eyebrow = '速查工具'
        pills = ['打印友好', '每周对照用', f'修订 {SITE_UPDATED}']
    else:
        eyebrow = '附录'
        pills = ['三语站来源', '各站特色与链接', '情报可靠度分级']
    name = re.sub(r'^第[一二三四五六七八九十]+篇\s*·\s*', '', page['title'])
    name = re.sub(r'^附录\s*·\s*', '', name)
    pill_html = ''.join(
        f'<span class="pill{" hot" if i == 0 else ""}">{ihtml.escape(p)}</span>'
        for i, p in enumerate(pills))
    return f'''<header class="hero">
  <h1>{ihtml.escape(eyebrow)} · <span class="accent">{ihtml.escape(name)}</span></h1>
  <div class="sub">火焰纹章 万缕千丝 ／ ファイアーエムブレム 万紫千紅 ｜ Fire Emblem: Fortune's Weave</div>
  <div class="pills">{pill_html}</div>
</header>'''

generated = []
for page in PAGES:
    merged = flatten_sections(page['sections'])
    body_html, toc = build_body(merged, page)
    hero = part_hero(page, len([t for t in toc if t[0] == 2]))
    side = sidebar_html(PAGES, page, toc)
    pager = pager_html(PAGES, page['idx'])
    html_out = page_shell(page, PAGES, side, hero, body_html, pager)
    (OUTDIR / page['file']).write_text(html_out, encoding='utf-8')
    generated.append((page['file'], len(html_out)))
    print(f"  写出 {page['file']}  ({len(html_out):,} 字符)")

# ---------- 6) 首页 ----------
def index_html():
    cards = []
    descs = {
        'p1.html': ('开局决策、难度选择、四主角路线顺序、时间与自由行动、名声系统', ['开局必读', '路线顺序']),
        'p2.html': ('支援等级全局机制与速刷法、战斗计算式、Blaze Arts 主角大招', ['核心机制', '速刷技巧']),
        'p3.html': ('七神加护效果全表、侍奉解锁优先级排序、专属日排程', ['优先级 T1–T5', '七神全表']),
        'p4.html': ('送礼的真实作用、机制规则、全角色喜好与推荐礼物', ['全角色', '礼物表']),
        'p5.html': ('资源分配、转职考试、挖角招募、跨路线进度、角色强度梯队', ['培养方向', '强度梯队']),
        'p6.html': ('路线切换的分歧点、不可挽回要素、可挽回的两种情况', ['避坑', '挽回机制']),
    }
    for p in PAGES:
        if p['title'].startswith('附录 · 每周'):
            d = '每周固定行动、自由行动、重点提醒的速查清单，适合对照游玩'
            chips = ['速查清单', '打印友好']
        elif p['kind'] == 'src':
            d = '每日更新记录、资料来源、情报可靠度，以及官方简体译名对照'
            chips = ['每日更新', '译名对照']
        else:
            d, chips = descs.get(p['file'], ('', []))
        chips_html = ''.join(f'<span>{ihtml.escape(c)}</span>' for c in chips)
        # 大序号从 1 开始（idx 是 0 基，附录保持「＊」）
        cards.append(f'''<a class="home-card" href="{p['file']}" style="--pc:{p['color']};--pcs:{p['soft']}">
  <div class="t"><span class="bd"></span>{ihtml.escape(p['title'])}</div>
  <div class="d">{ihtml.escape(d)}</div>
  <div class="chips">{chips_html}</div>
</a>''')

    # 首页目录（按篇列出章节）
    nav_blocks = []
    for page in PAGES:
        _, toc = build_body(flatten_sections(page['sections']), page)
        subs = [t for t in toc if t[0] == 2]
        lis = ''.join(
            f'<a class="toc-link toc-sec" href="{page["file"]}#{sid}">{ihtml.escape(txt)}</a>'
            for _, sid, txt in subs)
        nav_blocks.append(
            f'<a class="toc-link toc-part" href="{page["file"]}" style="--pc:{page["color"]}">'
            f'{ihtml.escape(page["title"])}</a>{lis}')

    fake_page = {'title': '总目录', 'color': '#b8123c', 'soft': '#fdf1f4', 'file': 'index.html', 'idx': 0}
    return f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#b8123c">
<title>火焰纹章 万缕千丝 · 完全攻略手册</title>
<style>{CSS}</style>
</head>
<body>
<input type="checkbox" id="navToggle" aria-hidden="true">
{topbar_html(fake_page)}
<div class="scrim"><label for="navToggle" style="display:block;width:100%;height:100%"></label></div>
<div class="layout">
<aside class="sidebar" id="sidebar">
  <div class="drawer-close"><label class="menu-btn" for="navToggle" aria-label="关闭目录" role="button" tabindex="0">
    <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>
  </label></div>
  <div class="nav-scroll">
    <div class="sidebar-title">全站目录 · Contents</div>
    {''.join(nav_blocks)}
  </div>
</aside>
  <main class="content">
    <header class="hero">
      <h1>火焰纹章 万缕千丝 · <span class="accent">完全攻略手册</span></h1>
      <div class="sub">ファイアーエムブレム 万紫千紅 ／ Fire Emblem: Fortune's Weave ｜ Nintendo Switch 2 ｜ 2026-09-17 发售</div>
      <div class="pills">
        <span class="pill hot">日文站 · 中文站 · 英文站 三语综合</span>
        <span class="pill">{sum(1 for p in PAGES if p['kind']=='part')} 篇正文 · {len(PAGES)} 个页面</span>
        <span class="pill">加护 · 送礼 · 培养 全收录</span>
        <span class="pill">修订 {SITE_UPDATED}</span>
      </div>
    </header>
    <article class="card">
      <h1 style="border-bottom-color:var(--brand)">按篇章阅读</h1>
      <p>每篇独立成页，页面内可跳转章节；页面底部有上/下篇导航，也可以随时从左侧目录切换。</p>
      <div class="home-grid">{''.join(cards)}</div>
      <blockquote>
        <p><strong>关于本作</strong>：中文译名有「万缕千丝」（官方简体／繁体）与「万紫千红」（日文原名直译）两种写法。2026 年 9 月 17 日 Nintendo Switch 2 独占发售，Intelligent Systems 开发、任天堂发行，支持繁简中文。</p>
        <p><strong>时效提醒</strong>：游戏刚发售，各站内容仍在更新，部分数值为暂定版；加护效果等数据来自社区整理，非官方公布。</p>
      </blockquote>
    </article>
  </main>
</div>
<a class="to-top" id="toTop" href="#" aria-label="回到顶部">
  <svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
</a>
<script>
(function(){{
  var t=document.getElementById('navToggle');
  var tt=document.getElementById('toTop');
  tt.addEventListener('click',function(e){{e.preventDefault();window.scrollTo({{top:0,behavior:'smooth'}});}});
  var tick=false;
  window.addEventListener('scroll',function(){{
    if(!tick){{tick=true;requestAnimationFrame(function(){{
      tt.classList.toggle('show',window.scrollY>500);tick=false;}});}}
  }},{{passive:true}});
  // 抽屉项点击后自动收起
  document.querySelectorAll('.sidebar a').forEach(function(a){{
    a.addEventListener('click',function(){{ if(t) t.checked=false; }});
  }});
  // 抽屉滚动锁兜底（同主页脚本，兼容无 :has() 的老 WebView）
  var hasSel = (function(){{
    try{{ return CSS.supports('selector(html:has(a))'); }}catch(e){{ return false; }}
  }})();
  if(!hasSel){{
    var y = 0;
    function lock(){{
      y = window.scrollY || 0;
      document.documentElement.style.overflow='hidden';
      document.body.style.overflow='hidden';
      document.body.style.position='fixed';
      document.body.style.top=(-y)+'px';
      document.body.style.width='100%';
    }}
    function unlock(){{
      document.documentElement.style.overflow='';
      document.body.style.overflow='';
      document.body.style.position='';
      document.body.style.top='';
      document.body.style.width='';
      window.scrollTo(0,y);
    }}
    t.addEventListener('change',function(){{ t.checked ? lock() : unlock(); }});
  }}
}})();
</script>
</body>
</html>'''

idx_html = index_html()
(OUTDIR / 'index.html').write_text(idx_html, encoding='utf-8')
print(f"  写出 index.html  ({len(idx_html):,} 字符)")
print('\n完成。')
