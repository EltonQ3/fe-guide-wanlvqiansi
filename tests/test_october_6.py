"""Oct 6: cavalry training costs, conditional finishing and Kai-only fish access."""
import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'docs/data.js').read_text().removeprefix('window.FE_DATA = ').strip().removesuffix(';').replace('<\\/', '</'))

class October6Tests(unittest.TestCase):
    def test_builds_keep_ids_and_skill_conditions(self):
        chars={c['name']:c for c in DATA['characters']}
        self.assertEqual(chars['努蒂奴']['id'],'35')
        self.assertEqual(chars['札可捏']['id'],'49')
        n=chars['努蒂奴']['builds']; z=chars['札可捏']['builds']
        self.assertIn('大型单位',n['early'])
        self.assertIn('不能只练斧',n['middle'])
        self.assertIn('剑或枪B',n['requirement'])
        self.assertIn('最低仍为1',n['caution'])
        self.assertIn('骑兵',n['caution'])
        self.assertIn('20%',n['caution'])
        self.assertIn('不能用白魔术',n['late'])
        self.assertNotIn('莱桑德',n['caution'])
        self.assertIn('莱桑达',n['caution'])
        self.assertIn('敌方剩余HP不超过一半',z['early'])
        self.assertIn('不必压低自己的HP',z['early'])
        self.assertIn('射程1–2',z['middle'])
        self.assertIn('距离敌人两格',z['middle'])
        self.assertIn('持剑时没有个人持斧命中加成',z['late'])
        self.assertIn('无须三修',z['requirement'])
        for b in (n,z):
            self.assertIsNone(b['gameVersion']); self.assertIsNone(b['difficulty'])
            self.assertEqual(b['checkedAt'],'2026-10-06')
            self.assertTrue(all(s.get('evidenceLocation') and s['checkedAt']=='2026-10-06' for s in b['sources']))
            self.assertNotIn('第2区分',b['requirement']); self.assertNotIn('第3区分',b['requirement'])
        self.assertEqual(sum(bool(c.get('builds')) for c in DATA['characters']),35)

    def test_route_cards_are_concise_and_preserve_eligibility(self):
        stories={s['id']:s for s in DATA['story']}
        expected={'kai':(1,6),'dietrich':(2,5),'theodora':(3,5)}
        for rid,eligibility in expected.items():
            c=next(c for c in stories[rid]['profile']['pilot']['scouts'] if c['name']=='努蒂奴')
            self.assertEqual((c['support'],c['fame']),eligibility)
            self.assertEqual(c['path'],['飞鸵兵','骑甲驼兵','荣光骑士'])
            self.assertIn('剑或枪B',c['train']); self.assertIn('不能只练斧',c['train'])
            self.assertIn('骑兵特性',c['caution']); self.assertNotIn('飞行职不沿用',c['caution'])
        for rid,eligibility in {'theodora':(1,4),'leda':(2,5)}.items():
            c=next(c for c in stories[rid]['profile']['pilot']['scouts'] if c['name']=='札可捏')
            self.assertEqual((c['support'],c['fame']),eligibility)
            self.assertIn('卑劣+',c['why']); self.assertIn('10G',c['condition'])
            self.assertNotIn('分歧',c['late'])
        for rid in ('kai','dietrich','theodora','leda'):
            self.assertFalse(stories[rid]['profile']['pilot']['publishBattles'])

    def test_fish_itinerary_is_kai_only_and_caveat_is_reused(self):
        n=next(n for n in DATA['negotiations'] if n['name']=='妮涅')
        self.assertEqual(list(n['byRoute']),['凯伊线'])
        for word in ('ワルハラ鉱山','未達出口','大房间左后方','ブロンテス湖','回帝都','3S／6R'):
            self.assertIn(word,n['byRoute']['凯伊线'])
        self.assertNotIn('ワルハラ鉱山',n['details'])
        self.assertIn('可探索南部ブロンテス湖取得。',n['details'])
        item=next(i for i in json.loads((ROOT/'source/trade_items.json').read_text())['items'] if i['name']=='カガヤキウオ')
        line=next(v for v in item['verified'] if '不能保证一次取得' in v['text'])
        self.assertIn(line['text'],n['details'])
        self.assertEqual(len(line['sources']),2)
        self.assertFalse(any('7/25' in t or '8/2' in t for t in [n['details'],*n['byRoute'].values()]))
        manual=(ROOT/'source/火焰纹章万缕千丝_完全攻略手册.md').read_text()
        body=next(x for x in manual.splitlines() if x.startswith('- **妮涅 · 物品**'))
        self.assertIn('凯伊线',body); self.assertIn('未達出口',body); self.assertNotIn('截图',body)

    def test_log_separates_source_evidence_from_unresolved_claims(self):
        e=next(e for e in DATA['logs'] if e.get('edition')=='努蒂奴与札可捏培养、荣光骑士备考成本与妮涅取鱼行程')
        self.assertEqual(e['date'],'2026-10-06')
        self.assertEqual(e['checked'],46)
        self.assertEqual(e['checked'],len({s['url'] for s in e['new_sources']}))
        self.assertFalse(any(s['url'] in ('https://gamewith.jp/fefw/577838','https://gamewith.jp/fefw/577837') for s in e['new_sources']))
        for term in ('努蒂奴','札可捏','妮涅','杰斯特','米迦艾拉'):
            self.assertTrue(any(term in c['topic'] for c in e['conflicts']))
        self.assertTrue(all(isinstance(c['src'],str) for c in e['conflicts']))

    def test_static_pages_use_same_facts(self):
        for name,term in [('努蒂奴','不能只练斧'),('札可捏','敌方剩余HP不超过一半'),('妮涅','未達出口')]:
            cid=next(c['id'] for c in DATA['characters'] if c['name']==name)
            self.assertIn(term,(ROOT/f'docs/character/{cid}.html').read_text())
        for rid in ('kai','dietrich','theodora'):
            self.assertIn('剑或枪B',(ROOT/f'docs/route/{rid}.html').read_text())
        for rid in ('theodora','leda'):
            self.assertIn('卑劣+',(ROOT/f'docs/route/{rid}.html').read_text())
        self.assertIn('未達出口',(ROOT/'docs/guide/g5.html').read_text())

if __name__=='__main__': unittest.main()
