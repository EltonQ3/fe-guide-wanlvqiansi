"""Oct 7: conditional bow/armor builds and practical, route-scoped errands."""
import json
import unittest
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'docs/data.js').read_text().removeprefix('window.FE_DATA = ').strip().removesuffix(';').replace('<\\/', '</'))

class October7Tests(unittest.TestCase):
    def test_current_conflict_citations_are_single_urls(self):
        source=next(e for e in json.loads((ROOT/'source/_daily_log.json').read_text())['entries'] if e['date']=='2026-10-07')
        for entry in (source, next(e for e in DATA['logs'] if e['date']=='2026-10-07')):
            self.assertEqual(entry['date'],'2026-10-07')
            for conflict in entry['conflicts']:
                with self.subTest(topic=conflict['topic']):
                    src=conflict['src']
                    self.assertIsInstance(src,str)
                    self.assertFalse(any(c.isspace() for c in src),src)
                    self.assertEqual(src.count('://'),1,src)
                    parsed=urlsplit(src)
                    self.assertIn(parsed.scheme,('http','https'))
                    self.assertTrue(parsed.netloc,src)

    def test_new_builds_keep_stable_ids_and_evidence(self):
        chars={c['name']:c for c in DATA['characters']}
        self.assertEqual(len(chars),55)
        self.assertGreaterEqual(sum(bool(c.get('builds')) for c in chars.values()),35)
        for name,cid in [('伊尼奥尼','text-5bc5d135'),('贾斯敏','58')]:
            self.assertEqual(chars[name]['id'],cid)
            b=chars[name]['builds']; self.assertEqual(b['checkedAt'],'2026-10-07')
            self.assertIsNone(b['gameVersion']);self.assertIsNone(b['difficulty'])
            self.assertEqual(len(b['sources']),len({s['url'] for s in b['sources']}))
            self.assertTrue(all(s.get('evidenceLocation') and s.get('checkedAt')=='2026-10-07' for s in b['sources']))
        i=chars['伊尼奥尼']['builds']
        for term in ('持弓','普通射击不享有'):self.assertIn(term,i['early'])
        self.assertIn('马术D',i['middle']);self.assertIn('3000–6000G',i['requirement'])
        self.assertIn('只在步兵',i['caution']);self.assertIn('本身不会',i['caution'])
        self.assertIn('カーラ',i['late']);self.assertNotIn('第2区分',i['late']);self.assertNotIn('第3区分',i['late'])
        j=chars['贾斯敏']['builds']
        self.assertIn('后攻战斗',j['early']);self.assertIn('不能回避',j['late']);self.assertIn('不能装备武器',j['late'])
        self.assertIn('不是第一部过渡职',j['late']);self.assertIn('专用战象兵考试票证',j['requirement'])
        self.assertNotIn('1500G',j['requirement']);self.assertNotIn('分歧',j['requirement'])

    def test_leda_card_removes_disputed_arrival_not_eligibility(self):
        s=next(s for s in DATA['story'] if s['id']=='leda')
        c=next(c for c in s['profile']['pilot']['scouts'] if c['name']=='贾斯敏')
        self.assertEqual((c['support'],c['fame'],c['condition']),(2,4,'支付500G。'))
        self.assertNotIn('章',c['arrival']);self.assertNotIn('分歧',c['caution'])
        self.assertIn('后攻',c['train']);self.assertIn('第三部',c['late'])
        for s in DATA['story'][:4]:self.assertFalse(s['profile']['pilot']['publishBattles'])

    def test_errands_preserve_route_and_item_boundaries(self):
        n={n['name']:n for n in DATA['negotiations']};u=n['乌尔坦德'];f=n['法比奥']
        self.assertEqual(list(u['byRoute']),['迪托利希线'])
        self.assertNotIn('コロイオス砦',u['details'])
        for term in ('地下城','发光','任务标记','回帝都','3S／5R'):self.assertIn(term,u['byRoute']['迪托利希线'])
        self.assertEqual(f['routes'],['蕾达线']);self.assertNotIn('第 11 章',f['condition'])
        self.assertIn('迪托利希外传',f['condition']);self.assertIn('3S／9R',f['details'])
        for term in ('清めの剣','第8章','主动拾取','不是通关后自动入包'):self.assertIn(term,f['details'])
        item=next(x for x in json.loads((ROOT/'source/trade_items.json').read_text())['items'] if x['name']=='合适武器')
        self.assertEqual(len(item['verified']),2)
        self.assertTrue(all(v['text'] in f['details'] for v in item['verified']))
        self.assertFalse(any('不会消耗' in v['text'] for v in item['verified']))
        for x in (u,f):self.assertEqual(len(x['sources']),len({s['url'] for s in x['sources']}))

    def test_log_and_static_pages_match(self):
        e=next(e for e in DATA['logs'] if e['date']=='2026-10-07');self.assertEqual(e['date'],'2026-10-07')
        self.assertEqual(e['checked'],65);self.assertEqual(e['checked'],len({s['url'] for s in e['new_sources']}))
        self.assertEqual(len(e['merged']),4)
        for term in ('伊尼奥尼','贾斯敏','乌尔坦德','法比奥','杰斯特','早期资格考试'):
            self.assertTrue(any(term in c['topic'] for c in e['conflicts']),term)
        for cid,term in [('text-5bc5d135','普通射击不享有'),('58','专用战象兵考试票证'),('8','发光拾取点'),('9','清めの剣')]:
            self.assertIn(term,(ROOT/f'docs/character/{cid}.html').read_text())
        self.assertIn('清めの剣',(ROOT/'docs/guide/g5.html').read_text())
        self.assertIn('专用票证与象坐骑',(ROOT/'docs/route/leda.html').read_text())
        manual=(ROOT/'source/火焰纹章万缕千丝_完全攻略手册.md').read_text()
        self.assertLess(manual.index('### 交涉明细补充'),manual.index('- **乌尔坦德 ·'))
        self.assertLess(manual.index('- **法比奥 ·'),manual.index('## 5.4'))

if __name__=='__main__':unittest.main()
