#!/usr/bin/env python3
"""Build a portable concept preview from current site facts + labelled candidates."""
import argparse
import base64
import json
from pathlib import Path
import sqlite3

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
STATS = [('hp','HP'), ('str','力量'), ('mag','魔力'), ('spd','速度'), ('dex','技巧'), ('def','防守'), ('res','魔防'), ('lck','幸运'), ('cha','魅力')]
CHARACTERS = [('Dietrich','迪托利希','3','lj96sv','挑战书与秘传战技'), ('Cai','凯伊','2','bxlbpf','骑乘与指导'),
              ('Theodora','赛奥朵拉','4','fdm9oj','军团兵与资源'), ('Leda','蕾达','5','d98iur','饮料与酒馆')]
NAMES = dict((en, cn) for en, cn, *_ in CHARACTERS)
NAMES.update({'Esmeralda':'艾丝梅拉尔达','Fabio':'法比奥','Mikaela':'米迦艾拉','Mu':'穆',
              'Sirocco':'西洛可','Olympia':'奥林匹亚','Tialla':'蒂亚拉','Peter':'彼得',
              'Ultand':'乌尔坦德','Tobias':'托比亚斯','Bonaventure':'波拿帕尔特','Lilian':'莉利安'})


def build(helper, publish=False):
    db = sqlite3.connect(Path(helper).resolve().joinpath('data/fwe.db').as_uri()+'?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    builds = {r['name']:r for r in json.loads((ROOT/'source/builds.json').read_text())}
    classes = {r['id']:r for r in json.loads((ROOT/'source/classes.json').read_text())}
    portraits = json.loads((ROOT/'docs/data/chars.json').read_text())
    data = {'characters':[], 'classes':[], 'stats':STATS}
    for en, cn, image, tab, system in CHARACTERS:
        unit = dict(db.execute('SELECT * FROM characters WHERE name=?',(en,)).fetchone())
        data['characters'].append({
            'id':en, 'name':cn, 'jp':portraits[cn]['jp'], 'build':builds[cn],
            'portrait':'data:image/jpeg;base64,'+base64.b64encode((ROOT/f'docs/assets/portrait/{image}.jpg').read_bytes()).decode(),
            'system':system, 'systemUrl':'https://docs.qq.com/sheet/DV0N0VUZLSXRmUWFq?tab='+tab,
            'growths':{s:unit['growth_'+s] for s,_ in STATS},
            'sourceUrl':'https://game8.co/games/Fire-Emblem-Fortunes-Weave/archives/'+unit['page_id'],
            'supports':[{'id':r['partner'],'name':NAMES[r['partner']],'rank':r['rank']}
                        for r in db.execute('SELECT partner,rank FROM char_supports WHERE name=? ORDER BY rank,partner',(en,)) if r['partner'] in NAMES],
        })
    for en, ident in [('Myrmidon','class-8'),('Shido','class-20'),('Archer','class-11'),('Warrior','class-22'),('Sniper','class-23')]:
        row = dict(db.execute('SELECT * FROM classes WHERE name=?',(en,)).fetchone())
        data['classes'].append({'id':en, 'site':classes[ident], 'growths':{s:row['growth_'+s] for s,_ in STATS},
                                'movement':row['movement'], 'idealLevel':row['ideal_lv'],
                                'sourceUrl':'https://game8.co/games/Fire-Emblem-Fortunes-Weave/archives/'+row['page_id']})
    db.close()
    html = (HERE/'preview.template.html').read_text().replace('__DATA__',json.dumps(data,ensure_ascii=False).replace('<','\\u003c'))
    (HERE/'index.html').write_text(html)
    print(f'Wrote {HERE / "index.html"} ({len(html.encode()):,} bytes)')
    if publish:
        preview = ROOT / 'docs/preview/source-integration/index.html'
        preview.parent.mkdir(parents=True, exist_ok=True)
        # Keep navigation within the branch deployment when reviewing online.
        preview.write_text(html.replace('href="https://fe-guide.pages.dev/', 'href="/'))
        print(f'Published branch preview to {preview}')


if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--helper',required=True)
    p.add_argument('--publish', action='store_true', help='Also copy the preview into the Pages docs output')
    args = p.parse_args()
    build(args.helper, args.publish)
