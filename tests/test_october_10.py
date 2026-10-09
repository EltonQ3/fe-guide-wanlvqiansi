"""Oct 10: route-scoped errands, conditional offence, and later-part availability."""
import json
import unittest
from pathlib import Path
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'docs/data.js').read_text().removeprefix('window.FE_DATA = ').strip().removesuffix(';').replace('<\\/', '</'))

class October10Tests(unittest.TestCase):
    def test_new_builds_keep_stable_identity_and_citations(self):
        chars={c['name']:c for c in DATA['characters']}
        self.assertEqual(len(chars),55)
        self.assertEqual(sum(bool(c.get('builds')) for c in chars.values()),39)
        for name,cid in [('哪吒','31'),('贝特朗','62')]:
            c=chars[name];b=c['builds']
            self.assertEqual(c['id'],cid)
            self.assertEqual(b['checkedAt'],'2026-10-10')
            self.assertIsNone(b['gameVersion']);self.assertIsNone(b['difficulty'])
            for key in ['early','middle','late','requirement','caution']:self.assertTrue(b[key])
            self.assertGreaterEqual(len(b['sources']),2)
            self.assertEqual(len(b['sources']),len({s['url'] for s in b['sources']}))
            self.assertTrue(all(s.get('evidenceLocation') and s['checkedAt']=='2026-10-10' for s in b['sources']))
        for s in DATA['story'][:4]:self.assertFalse(s['profile']['pilot']['publishBattles'])

    def test_bertrand_is_not_first_part_scout(self):
        c=next(c for c in DATA['characters'] if c['name']=='贝特朗')
        self.assertFalse(c['recruit'])
        for s in DATA['story'][:4]:
            self.assertFalse(any(x.get('name')=='贝特朗' for x in s['profile']['pilot']['scouts']))
        self.assertIn('第三部',c['builds']['early'])
        self.assertIn('外传',c['builds']['requirement'])

    def test_recruitment_thresholds_and_calendar_unchanged(self):
        c=next(c for c in DATA['characters'] if c['name']=='哪吒')
        self.assertEqual([c['plan'][r]['renown'] for r in ['kai','dietrich','theodora','leda']],[6,10,6,9])
        self.assertEqual([c['plan'][r]['support'] for r in ['kai','dietrich','theodora','leda']],[3,3,2,3])
        for r in c['plan'].values():self.assertEqual(r['needs'][0]['qty'],3)

    def test_naja_uses_conditional_effects(self):
        b=next(c['builds'] for c in DATA['characters'] if c['name']=='哪吒')
        self.assertIn('先攻攻击时50%',b['early'])
        for term in ['先触发','50%','不能计入保底击杀']:self.assertIn(term,b['caution'])
        self.assertIn('必杀击倒',b['middle'])
        self.assertNotIn('第2区分',b['late']);self.assertNotIn('第3区分',b['late'])

    def test_talimoon_execution_is_route_scoped(self):
        p=next(p for p in DATA['paralogues'] if p['id']=='talimoon')
        self.assertEqual(set(p['byRoute']),{'kai'})
        self.assertEqual(len(p['strategy']),3)
        self.assertEqual(len(p['byRoute']['kai']['strategy']),4)
        for term in ['ドラグデン峠','ヤーマン村','外伝','不需另返帝都回报']:
            self.assertIn(term,p['byRoute']['kai']['steps'])
        self.assertIn('两人任一败走',p['byRoute']['kai']['strategy'][-1])
        for route,windows in p['routes'].items():
            self.assertEqual(windows[-1]['end'],'10/10')
            self.assertEqual(windows[-1]['deadline'],None if route=='theodora' else '10/12')
        for route in ['kai','dietrich','theodora']:
            html=(ROOT/f'docs/route/{route}.html').read_text()
            self.assertEqual('ドラグデン峠' in html,route=='kai')
            self.assertEqual('fefw-secret-of-missing-carriage/' in html,route=='kai')
        n=next(n for n in DATA['negotiations'] if n['name']=='彼得')
        self.assertNotIn('東アイギーナ山',n['details'])
        self.assertIn('世界地图东部的「アイギーナ山」',n['details'])

    def test_daily_log_has_distinct_read_sources(self):
        e=DATA['logs'][0]
        self.assertEqual(e['date'],'2026-10-10')
        self.assertEqual(e['checked'],len({s['url'] for s in e['new_sources']}))
        self.assertGreaterEqual(len(e['merged']),3)
        for conflict in e['conflicts']:
            url=conflict['src'];self.assertIsInstance(url,str)
            self.assertEqual(url.count('://'),1)
            self.assertFalse(any(v.isspace() for v in url))
            self.assertIn(urlsplit(url).scheme,('http','https'));self.assertTrue(urlsplit(url).netloc)
        for term in ['杰斯特','米迦艾拉']:
            self.assertTrue(any(term in c['topic'] for c in e['conflicts']))

    def test_static_build_pages_match(self):
        for cid,name in [('31','哪吒'),('62','贝特朗')]:
            b=next(c['builds'] for c in DATA['characters'] if c['name']==name)
            page=(ROOT/f'docs/character/{cid}.html').read_text()
            self.assertIn(b['role'],page)
            self.assertIn(b['early'],page)
        self.assertIn('2026-10-10',(ROOT/'docs/data.js').read_text())

if __name__=='__main__':unittest.main()
