"""Build the offline data bundle from the imported guide. Never fetch or publish."""
from pathlib import Path
import re, json, html, hashlib, argparse, shutil
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode
import markdown

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'source'
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--src', type=Path, default=SOURCE/'火焰纹章万缕千丝_完全攻略手册.md')
parser.add_argument('--log', type=Path, default=SOURCE/'_daily_log.json')
parser.add_argument('--out', type=Path, default=ROOT/'docs')
args = parser.parse_args()
OUT = args.out.resolve()
OUT.mkdir(parents=True, exist_ok=True)

def read(name):
    return json.loads((SOURCE / name).read_text())
def plain(text):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', markdown.markdown(text, extensions=['tables'])))).strip()
def render(text):
    result = markdown.markdown(text, extensions=['tables', 'fenced_code', 'sane_lists'])
    def wrap_table(match):
        table=match[0]
        columns=table.split('</tr>')[0].count('<th>')
        kind='compact' if columns<=3 else 'wide'
        return f'<div class="table-scroll {kind}" role="region" aria-label="数据表格，可横向滚动" tabindex="0">{table}</div>'
    return re.sub(r'<table>.*?</table>',wrap_table,result,flags=re.S)
def canonical(url):
    p = urlsplit(url.rstrip('。；，'))
    query = [(k,v) for k,v in parse_qsl(p.query) if not k.startswith('utm_')]
    return urlunsplit((p.scheme.lower(),p.netloc.lower(),p.path, urlencode(query),p.fragment))

raw = args.src.read_text()
art = json.loads((ROOT/'docs/data/chars.json').read_text())
logs = json.loads(args.log.read_text())['entries']
sections = re.split(r'^# ', raw, flags=re.M)[1:]
chapters = []
source_text = ''
weekly = []
for section in sections:
    title, _, body = section.partition('\n')
    if title.startswith('第'):
        n = len(chapters) + 1
        if n == 1:
            body = re.sub(r'## 1\.1 .*?(?=\n## )', '', body, count=1, flags=re.S)
        pieces = re.split(r'^## ', body, flags=re.M)
        parts = pieces[1:]
        chapter = {'id':f'g{n}','title':title.split('·')[-1].strip(),'number':n,'introHtml':render(pieces[0]),'sections':[]}
        for part in parts:
            heading, _, content = part.partition('\n')
            key = re.match(r'(\d+\.\d+)', heading)
            sid = 's' + key[1].replace('.', '-') if key else 's' + str(len(chapter['sections']))
            chapter['sections'].append({'id':sid,'title':re.sub(r'^\d+\.\d+\s*','',heading),'html':render(content),'text':plain(content)})
        chapters.append(chapter)
    elif '每周日常' in title:
        weekly = [{'id':f'week-{i+1}','html':render(t),'text':plain(t)} for i,t in enumerate(re.findall(r'^\d+\. (.+)$',body,re.M))]
    elif title.startswith('附录'):
        source_text += section + '\n'

# Join rows by existing artwork IDs / aliases rather than guessing names.
characters = {}
for name, info in art.items():
    cid = info['n']
    if cid not in characters:
        characters[cid] = dict(id=cid,name=name,aliases=[],jp=info.get('jp',''),avatar=info.get('avatar',''),portrait=info.get('portrait',''),gifts={},recruit={},faction='其他')
    characters[cid]['aliases'].append(name)
def resolve(name):
    name = re.split(r'[ A-Za-z（(]', plain(name))[0]
    info = art.get(name)
    cid = info['n'] if info else 'text-' + hashlib.sha1(name.encode()).hexdigest()[:8]
    if cid not in characters:
        characters[cid] = dict(id=cid,name=name,aliases=[name],jp='',avatar='',portrait='',gifts={},recruit={},faction='其他')
    characters[cid]['name'] = name
    if name not in characters[cid]['aliases']: characters[cid]['aliases'].append(name)
    return characters[cid]

heading = ''; headers = []
for line in raw.splitlines():
    if line.startswith('#'):
        heading = line.lstrip('# ').strip(); headers=[]
    if not line.startswith('|'): continue
    cells = [v.strip() for v in line.strip('|').split('|')]
    if cells[0] == '角色': headers=cells; continue
    if not headers or re.fullmatch(r'[-: ]+', cells[0]): continue
    row = dict(zip(headers,cells))
    if '推荐礼物' in headers:
        c=resolve(cells[0]); c['gifts']={k:plain(v) for k,v in row.items() if k!='角色'}
        c['giftRef']='#guide/g4/s4-4'
        if c['faction']=='其他': c['faction']=heading
    elif '凯伊线' in headers:
        c=resolve(cells[0]); c['recruit']={k:plain(v) for k,v in row.items() if k.endswith('线')}
        c['faction']=plain(row.get('派系',heading))
        c['recruitRef']='#guide/g5/s5-3'

# Discard art-only entries: a card must offer actual guide data.
characters = [c for c in characters.values() if c['gifts'] or c['recruit']]
characters.sort(key=lambda c: (int(c['id']) if c['id'].isdigit() else 1000,c['name']))
sources={}
def add_source(url,title='',grade='',note='',date=''):
    if not url.startswith(('https://','http://')): return
    url=canonical(url)
    key=hashlib.sha256(url.encode()).hexdigest()[:12]
    host=urlsplit(url).netloc
    if key not in sources:
        kind='官方' if host in ['www.nintendo.com','ec.nintendo.com','store.nintendo.com.hk'] else ('社区' if any(x in host for x in ['qq.com','reddit.com','nga.cn','smzdm.com','baike.','moegirl.']) else '攻略 / 媒体')
        sources[key]={'id':key,'url':url,'title':title or host,'host':host,'kind':kind,'originalGrade':grade,'note':note,'lastListed':date,'status':'imported'}
    elif date and date > sources[key]['lastListed']:
        sources[key].update(title=title or sources[key]['title'],lastListed=date,note=note,originalGrade=grade)
for line in source_text.splitlines():
    m=re.match(r'\d+\. (.+?)：(https?://\S+)',line)
    if m: add_source(m[2],m[1])
for log in logs:
    for s in log.get('new_sources',[]):
        add_source(s.get('url',''),s.get('name',''),s.get('grade',''),s.get('note',''),log['date'])
curated = {name: read(name+'.json') for name in ('negotiations', 'builds', 'story', 'paralogues', 'classes')}
for kind in ('negotiations', 'builds'):
    for item in curated[kind]:
        matches = [c for c in characters if item['name'] in c['aliases']]
        if len(matches) != 1: raise ValueError('Unmatched curated character: '+item['name'])
        item['characterId'] = matches[0]['id']
        matches[0][kind] = item
for collection in curated.values():
    for item in collection:
        refs = item.get('sources', []) + [s for b in item.get('battles', []) for s in b['sources']] + [s for n in item.get('profile', {}).get('native', []) for s in n['sources']]
        pilot = item.get('profile', {}).get('pilot', {})
        refs += pilot.get('sources', []) + [ref for n in pilot.get('native', []) + pilot.get('scouts', []) for ref in n['sources']]
        for s in refs:
            add_source(s['url'], s['label'], note='2026-09-29 核对所引页面；不是游戏内实测。', date='2026-09-29')
            key=hashlib.sha256(canonical(s['url']).encode()).hexdigest()[:12]
            sources[key]['status']='page-reviewed'
            sources[key]['note']='已核对本次条目所引页面；不代表该站全部结论已验证。'
            if 'docs.qq.com' in s['url']: sources[key]['note']='2026-09-29 可见表格核对外传窗口与部分兵种条件；表格禁止复制，未批量导出，兵种基础资料仍含此前站内收录。'
latest=max(e['date'] for e in logs)
payload={'snapshot':'35dfba9b2300efc28c4a84e720bc9b9f35e12b0b','updated':latest,'chapters':chapters,'characters':characters,'weekly':weekly,'sources':list(sources.values()),'logs':logs,**curated}
(OUT/'data.js').write_text('window.FE_DATA = '+json.dumps(payload,ensure_ascii=False).replace('</','<\\/')+';\n')
(SOURCE/'sources.json').write_text(json.dumps(list(sources.values()),ensure_ascii=False,indent=2)+'\n')
print(f'Built {len(chapters)} chapters, {sum(len(c["sections"]) for c in chapters)} sections, {len(characters)} characters, {len(sources)} sources, {len(weekly)} weekly tasks.')

# Retain the established build command and canonical input paths for daily updates.
for file in (ROOT/'web').iterdir():
    if file.is_file(): shutil.copy2(file, OUT/file.name)
shutil.copytree(ROOT/'web/assets', OUT/'assets', dirs_exist_ok=True)
if OUT != ROOT/'docs':
    for directory in ['assets', 'data', 'archive']:
        if (ROOT/'docs'/directory).exists():
            shutil.copytree(ROOT/'docs'/directory, OUT/directory, dirs_exist_ok=True)
(OUT/'source').mkdir(exist_ok=True)
shutil.copy2(args.src, OUT/'source/guide.md')
# Old inbound page links retain their original anchors inside the frozen archive.
for n in range(1,9):
    target=f'archive/2026-09-29-before-redesign/p{n}.html'
    (OUT/f'p{n}.html').write_text(f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>旧版攻略存档</title><script>location.replace({json.dumps(target)}+location.hash)</script><p>这份旧版攻略已存档。<a href="{target}">打开原页面</a> · <a href="index.html">新版首页</a></p></html>''')
