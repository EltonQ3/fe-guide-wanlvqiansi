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
        for value in goliath['recruit'].values(): self.assertIn('巨人肉 ×3',value)
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
        self.assertTrue(all(s['status'] in ('imported','page-reviewed') for s in DATA['sources']))
        self.assertTrue(any(s['status']=='page-reviewed' for s in DATA['sources']))
        self.assertEqual(len(DATA['logs']),len(json.loads((ROOT/'source'/'_daily_log.json').read_text())['entries']))
    def test_search_text_is_readable(self):
        self.assertNotIn('|---',DATA['chapters'][3]['sections'][-1]['text'])
        self.assertEqual(len(DATA['weekly']),9)

    def test_route_specific_requirements(self):
        chars={c['name']:c for c in DATA['characters']}
        self.assertIn('铁斧 ×3',chars['努蒂奴']['recruit']['蕾达线'])
        self.assertIn('青铜斧 ×2',chars['努蒂奴']['recruit']['凯伊线'])
        self.assertIn('圣水 ×8',chars['基罗伊卡']['recruit']['赛奥朵拉线'])
        self.assertIn('圣水 ×3',chars['基罗伊卡']['recruit']['迪托利希线'])
        self.assertIn('8R',chars['妮涅']['recruit']['蕾达线'])
        for name, route in zip(('凯伊','迪托利希','赛奥朵拉','蕾达'),('凯伊线','迪托利希线','赛奥朵拉线','蕾达线')):
            self.assertEqual(chars[name]['recruit'][route],'本路线主角')
            self.assertTrue(all(v=='—' for k,v in chars[name]['recruit'].items() if k!=route))
    def test_story_coverage_and_evidence(self):
        self.assertEqual([s['part'] for s in DATA['story']],[1,1,1,1,2,3])
        self.assertEqual(sum(len(s['battles']) for s in DATA['story']),20)
        registry={s['url'] for s in DATA['sources'] if s['status']=='page-reviewed'}
        for s in DATA['story']:
            if s['part']==1:self.assertEqual(len(s['chapters']),12)
            else:self.assertEqual([b['number'] for b in s['battles']],list(range(1,7)))
            for b in s['battles']:
                self.assertTrue(b['goal'] and b['team'] and b['steps'] and b['watch'])
                for ref in b['sources']:self.assertIn(ref['url'],registry)
        for kind in ('negotiations','builds'):
            for item in DATA[kind]:
                c=next(c for c in DATA['characters'] if c['id']==item['characterId'])
                self.assertIn(item['name'],c['aliases'])
                self.assertTrue(item['sources'])
                for ref in item['sources']:self.assertIn(ref['url'],registry)
    def test_correction_keeps_audit_trail(self):
        old=[x for e in DATA['logs'] if not e.get('edition') for x in e.get('merged',[]) if '歌利亚' in x['text']]
        self.assertTrue(old)
        self.assertTrue(all(x.get('superseded') for x in old))
        self.assertIn('巨人肉',DATA['logs'][0]['merged'][0]['text'])

    def test_route_portals_use_eligible_characters(self):
        characters={alias:c for c in DATA['characters'] for alias in c['aliases']}
        for s in DATA['story'][:4]:
            route=s['title'].replace('路线','线')
            profile=s['profile']
            self.assertTrue(profile['background'] and profile['fit'] and profile['strength'])
            self.assertTrue(profile['features'] and profile['notes'])
            native=[n['name'] for n in profile['native']]
            self.assertEqual(len(native),len(set(native)))
            for n in profile['native']:
                c=characters[n['name']]
                self.assertNotEqual(c['recruit'].get(route,'—'),'—')
                self.assertTrue(c['builds']['early'] and c['builds']['middle'])
                self.assertTrue(n['sources'] and n['arrival'])
            for name, purpose, reason in profile['scouts']:
                c=characters[name]
                self.assertNotEqual(c['recruit'].get(route,'—'),'—')
                self.assertNotIn(name,native)
                self.assertTrue(purpose and reason)
            self.assertIn('教学加入',characters[profile['teaching']]['recruit'][route])

if __name__=='__main__':unittest.main()
