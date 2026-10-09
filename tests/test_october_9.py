"""Oct 9: conditional magic/support builds and route-scoped Olimpia errands."""
import json
import unittest
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'docs/data.js').read_text().removeprefix('window.FE_DATA = ').strip().removesuffix(';').replace('<\\/', '</'))

class October9Tests(unittest.TestCase):
    def test_builds_have_stable_identity_and_evidence(self):
        chars={c['name']:c for c in DATA['characters']}
        self.assertEqual(len(chars),55)
        self.assertGreaterEqual(sum(bool(c.get('builds')) for c in chars.values()),37)
        for name,cid in [('但丁','22'),('乌修拉','24')]:
            self.assertEqual(chars[name]['id'],cid)
            b=chars[name]['builds']
            self.assertEqual(b['checkedAt'],'2026-10-09')
            self.assertIsNone(b['gameVersion']); self.assertIsNone(b['difficulty'])
            self.assertEqual(len(b['sources']),len({s['url'] for s in b['sources']}))
            self.assertTrue(all(s.get('evidenceLocation') and s['checkedAt']=='2026-10-09' for s in b['sources']))
        for story in DATA['story'][:4]:self.assertFalse(story['profile']['pilot']['publishBattles'])

    def test_dante_keeps_probability_and_class_tradeoffs(self):
        b=next(c['builds'] for c in DATA['characters'] if c['name']=='但丁')
        for term in ('该队友','魅力÷2','个人技能触发时','非常驻光环','8000G'):self.assertIn(term,b['caution'])
        for term in ('黑B','黑A','3射程','白B','白A'):self.assertIn(term,b['middle'])
        for term in ('不能用白魔','不能用黑魔','不自带两系次数翻倍','ジュラの依頼'):self.assertIn(term,b['late'])
        self.assertIn('凯伊名声10',b['requirement']); self.assertIn('蕾达',b['requirement'])
        self.assertNotIn('第2区分',b['late']); self.assertNotIn('第3区分',b['late'])

    def test_ursula_conditions_and_route_unlocks(self):
        c=next(c for c in DATA['characters'] if c['name']=='乌修拉');b=c['builds'];n=c['negotiations']
        self.assertIn('自身及周围2格',b['early']); self.assertIn('不会自动产生追击',b['middle'])
        self.assertIn('迪托利希线',b['middle']); self.assertIn('凯伊、赛奥朵拉线不默认',b['middle'])
        for term in ('攻击时','幸运÷2','1.5倍','不触发'):self.assertIn(term,b['caution'])
        self.assertEqual(n['condition'],'所有问题都选择「はい」')
        self.assertNotIn('四问',n['details']); self.assertNotIn('三次',n['details'])
        self.assertEqual(c['recruit']['蕾达线'],'—')
        self.assertEqual(n['routes'],['凯伊线','迪托利希线','赛奥朵拉线'])

    def test_olimpia_itineraries_are_separate(self):
        n=next(n for n in DATA['negotiations'] if n['name']=='奥林匹亚')
        self.assertEqual(n['routes'],['凯伊线','迪托利希线'])
        kai=n['byRoute']['凯伊线'];di=n['byRoute']['迪托利希线']
        for term in ('3S／8R','暁平原','クリュテイオス平原','ワルハラ鉱山','ダンジョン探索','地面发光点','回帝都交付','期限'):self.assertIn(term,kai)
        for term in ('碧晶洞穴','バイナのオアシス'):self.assertIn(term,di);self.assertNotIn(term,kai)
        self.assertNotIn('11/27',kai);self.assertNotIn('1400G',kai)
        self.assertEqual(len(n['sources']),len({s['url'] for s in n['sources']}))
        self.assertTrue(all(s.get('route') in n['routes'] for s in n['sources']))

    def test_current_log_has_single_url_citations(self):
        e=next(e for e in DATA['logs'] if e['date']=='2026-10-09')
        self.assertEqual(e['date'],'2026-10-09');self.assertEqual(e['checked'],54)
        self.assertEqual(e['checked'],len({s['url'] for s in e['new_sources']}))
        self.assertEqual(len(e['merged']),4)
        source=next(e for e in json.loads((ROOT/'source/_daily_log.json').read_text())['entries'] if e['date']=='2026-10-09')
        self.assertEqual(source['conflicts'],e['conflicts'])
        for c in e['conflicts']:
            url=c['src'];self.assertIsInstance(url,str)
            self.assertEqual(url.count('://'),1);self.assertFalse(any(v.isspace() for v in url))
            self.assertIn(urlsplit(url).scheme,('http','https'));self.assertTrue(urlsplit(url).netloc)
        for term in ('杰斯特','米迦艾拉','早期资格考试'):
            self.assertTrue(any(term in c['topic'] for c in e['conflicts']))

    def test_generated_pages_and_handbook_match(self):
        for cid,term in [('22','个人技能触发时'),('24','所有问题都选择'),('18','クリュテイオス平原')]:
            self.assertIn(term,(ROOT/f'docs/character/{cid}.html').read_text())
        manual=(ROOT/'source/火焰纹章万缕千丝_完全攻略手册.md').read_text()
        self.assertNotIn('四次都选择「はい」',manual);self.assertNotIn('交涉四问',manual)
        self.assertIn('矿山取物',(ROOT/'docs/guide/g5.html').read_text())
        self.assertLess(manual.index('- **奥林匹亚 · 凯伊线三段请求**'),manual.index('## 5.4'))

if __name__=='__main__':unittest.main()
