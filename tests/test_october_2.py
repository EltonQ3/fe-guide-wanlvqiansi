"""Guard Oct 2 additions, their evidence scopes, and unchanged deadlines."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'docs/data.js').read_text().removeprefix('window.FE_DATA = ').strip().removesuffix(';').replace('<\\/', '</'))


class October2Tests(unittest.TestCase):
    def test_new_build_uses_stable_character_and_conditional_skills(self):
        c = next(c for c in DATA['characters'] if c['name'] == '洛蕾塔')
        self.assertEqual(c['id'], '55')
        self.assertIn('至少一半', c['builds']['early'])
        self.assertIn('满血', c['builds']['early'])
        self.assertIn('必定闪避', c['builds']['early'])
        self.assertIn('省训练', c['builds']['middle'])
        self.assertIn('第三部', c['builds']['late'])
        self.assertNotIn('第三区分', c['builds']['requirement'])
        self.assertIn('第一部王都ブレストン', c['negotiations']['details'])
        self.assertIn('1500G', c['negotiations']['details'])

    def test_recruitment_locations_and_prices_are_route_scoped(self):
        items = {n['name']: n for n in DATA['negotiations']}
        self.assertIn('裏山道', items['穆']['byRoute']['迪托利希线'])
        self.assertIn('每个 5000G', items['穆']['details'])
        for route in ('凯伊线', '赛奥朵拉线'):
            self.assertNotIn('裏山道', items['穆']['byRoute'][route])
        self.assertIn('キラの村', items['哪吒']['byRoute']['凯伊线'])
        self.assertIn('当前存档', items['哪吒']['byRoute']['凯伊线'])
        for route in ('迪托利希线', '赛奥朵拉线', '蕾达线'):
            self.assertNotIn('库存5份', items['哪吒']['byRoute'][route])
        self.assertEqual(len(items['哪吒']['imageEvidence']), 2)
        self.assertTrue(all(r['url'].startswith('https://') for r in items['哪吒']['imageEvidence']))

    def test_tactics_keep_original_windows_and_deadlines(self):
        p = {p['id']: p for p in DATA['paralogues']}
        self.assertEqual([len(p[x]['strategy']) for x in ('dietrich', 'kai', 'talimoon')], [2, 2, 3])
        self.assertEqual(p['dietrich']['routes']['theodora'][0], {'chapter':'12','start':'10/16','end':'10/21','deadline':'10/24'})
        self.assertEqual(p['dietrich']['routes']['leda'][0], {'chapter':'11','start':'10/16','end':'10/29','deadline':'11/1'})
        for windows in p['kai']['routes'].values():
            self.assertEqual(windows[0]['end'], '10/22')
            self.assertIsNone(windows[0]['deadline'])
        for route, windows in p['talimoon']['routes'].items():
            self.assertEqual(windows[-1]['end'], '10/10')
            self.assertEqual(windows[-1]['deadline'], None if route == 'theodora' else '10/12')
        self.assertIn('10回合', p['dietrich']['strategy'][0])
        self.assertIn('3格', p['kai']['strategy'][1])
        self.assertIn('或击败全部敌人', p['talimoon']['strategy'][1])

    def test_new_content_keeps_evidence_and_unknown_scope(self):
        for kind in ('builds', 'negotiations', 'paralogues'):
            for item in DATA[kind]:
                if item.get('checkedAt') != '2026-10-02':
                    continue
                for field in ('gameVersion', 'difficulty', 'route', 'chapter', 'scope', 'status'):
                    self.assertIn(field, item)
                self.assertIsNone(item['gameVersion'])
                self.assertIsNone(item['difficulty'])
                fresh = [r for r in item['sources'] if r.get('checkedAt') == '2026-10-02']
                self.assertGreaterEqual(len(fresh), 2)
                self.assertTrue(all(r.get('evidenceLocation') for r in fresh))

    def test_log_counts_pages_not_search_snippets_or_images(self):
        log = next(e for e in DATA['logs'] if e.get('edition') == '三篇外传实战、洛蕾塔培养与两项招募物品路线')
        self.assertEqual(log['date'], '2026-10-02')
        self.assertEqual(log['checked'], 36)
        self.assertEqual(log['checked'], len({r['url'] for r in log['new_sources']}))
        for phrase in ('诺克裘拉', '米迦艾拉', '杰斯特', '刀剑将领'):
            self.assertTrue(any(phrase in c['topic'] for c in log['conflicts']))


if __name__ == '__main__':
    unittest.main()
