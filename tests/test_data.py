"""Guard the imported data and deep links against accidental losses."""
import json, re, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'docs/data.js').read_text().removeprefix('window.FE_DATA = ').strip().removesuffix(';').replace('<\\/','</'))

class DataTests(unittest.TestCase):
    def test_all_guide_sections_survive(self):
        raw=(ROOT/'source'/'火焰纹章万缕千丝_完全攻略手册.md').read_text().split('# 附录')[0]
        headings=re.findall(r'^## (\d+\.\d+) ',raw,re.M)
        self.assertEqual(len(headings)-1,sum(len(c['sections']) for c in DATA['chapters']))
        self.assertEqual(len(DATA['chapters']),6)
    def test_deep_links_and_assets_exist(self):
        targets={f"{c['id']}/{s['id']}" for c in DATA['chapters'] for s in c['sections']}
        links=re.findall(r'#guide/(g\d+/s\d+-\d+)',(ROOT/'web/app.js').read_text())
        for link in links:self.assertIn(link,targets)
        for c in DATA['characters']:
            for key in ('avatar','portrait'):
                if c[key]:self.assertTrue((ROOT/'docs'/c[key]).is_file(),c[key])
            for key in ('giftRef','recruitRef'):
                if key in c:self.assertIn(c[key].removeprefix('#guide/'),targets)
    def test_important_route_distinctions(self):
        loretta=next(c for c in DATA['characters'] if c['name']=='洛蕾塔')
        self.assertIn('9R',loretta['recruit']['迪托利希线'])
        self.assertIn('5R',loretta['recruit']['赛奥朵拉线'])
        self.assertIn('甜食',loretta['gifts']['推荐礼物'])
        goliath=next(c for c in DATA['characters'] if c['name']=='歌利亚')
        self.assertNotIn('巨人肉',json.dumps(goliath['recruit'],ensure_ascii=False))
        self.assertIn('交涉',json.dumps(goliath['recruit'],ensure_ascii=False))
    def test_aliases_join_and_unknown_stays_unknown(self):
        ids=[c['id'] for c in DATA['characters']]
        self.assertEqual(len(ids),len(set(ids)))
        for alias in ('艾丝梅拉达','艾丝梅拉尔达'):
            matches=[c for c in DATA['characters'] if alias in c['aliases']]
            self.assertEqual(len(matches),1)
            self.assertTrue(matches[0]['recruit'])
            self.assertTrue(matches[0]['gifts'])
        anna=next(c for c in DATA['characters'] if c['name']=='安娜')
        self.assertEqual(anna['gifts']['推荐礼物'],'—')
    def test_source_registry_deduplicated_not_verified(self):
        urls=[s['url'] for s in DATA['sources']]
        self.assertEqual(len(urls),len(set(urls)))
        self.assertTrue(all(s['status']=='imported' for s in DATA['sources']))
        self.assertEqual(len(DATA['logs']),len(json.loads((ROOT/'source'/'_daily_log.json').read_text())['entries']))
    def test_search_text_is_readable(self):
        self.assertNotIn('|---',DATA['chapters'][3]['sections'][-1]['text'])
        self.assertEqual(len(DATA['weekly']),9)

if __name__=='__main__':unittest.main()
