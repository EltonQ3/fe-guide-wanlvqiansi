"""Oct 5: healing, conditional archery and route-scoped recruitment errands."""
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'docs/data.js').read_text().removeprefix('window.FE_DATA = ').strip().removesuffix(';').replace('<\\/', '</'))

class October5Tests(unittest.TestCase):
    def test_new_builds_preserve_ids_and_conditional_effects(self):
        chars={x['name']:x for x in DATA['characters']}
        self.assertEqual(chars['索绯雅']['id'],'46')
        self.assertEqual(chars['基罗伊卡']['id'],'59')
        s=chars['索绯雅']['builds']; k=chars['基罗伊卡']['builds']
        self.assertIn('魔法回复队友',s['early'])
        self.assertIn('Lv20',s['middle']); self.assertIn('Lv35',s['middle'])
        self.assertIn('不能使用黑魔术',s['late']); self.assertIn('暂留主教',s['late'])
        self.assertNotIn('白魔术C',s['requirement'])
        self.assertNotIn('B／A',s['requirement'])
        self.assertIn('敌人处于异常状态',k['early']); self.assertIn('须命中',k['early'])
        self.assertIn('20%',k['caution']); self.assertIn('必杀回避',k['caution'])
        self.assertIn('必滅のオウコ',k['requirement']); self.assertIn('新商品兴行4',k['requirement'])
        self.assertIn('カーラ',k['late']); self.assertNotIn('第3区分',k['late'])
        for b in [s,k]:
            self.assertIsNone(b['gameVersion']); self.assertIsNone(b['difficulty'])
            self.assertTrue(all(x.get('checkedAt')=='2026-10-05' and x.get('evidenceLocation') for x in b['sources']))
        self.assertGreaterEqual(len([c for c in DATA['characters'] if c.get('builds')]),35)

    def test_route_cards_keep_eligibility_and_training_tradeoffs(self):
        stories={s['id']:s for s in DATA['story']}
        t=next(c for c in stories['theodora']['profile']['pilot']['native'] if c['name']=='索绯雅')
        self.assertIn('教学招募',t['arrival'])
        self.assertIn('失去黑魔术',t['late'])
        self.assertNotIn('分歧',t['train'])
        for rid in ['dietrich','leda']:
            c=next(c for c in stories[rid]['profile']['pilot']['scouts'] if c['name']=='基罗伊卡')
            self.assertEqual((c['support'],c['fame']),(1,4))
            self.assertIn('圣水',c['condition'])
            self.assertNotIn('Altema',c['caution'])
            self.assertIn('概率技能',c['caution'])
            self.assertIn('必滅のオウコ' if rid=='dietrich' else '新商品兴行4',c['train'])
        l=next(c for c in stories['leda']['profile']['pilot']['scouts'] if c['name']=='基罗伊卡')
        self.assertNotIn('第 7 章',l['arrival']); self.assertNotIn('第5',l['arrival'])
        for rid in ['kai','dietrich','theodora','leda']:
            self.assertFalse(stories[rid]['profile']['pilot']['publishBattles'])

    def test_recruitment_errands_do_not_generalize_route_evidence(self):
        entries={x['name']:x for x in DATA['negotiations']}
        s=entries['西提司']; l=entries['鲁鲁迪娅']
        self.assertNotIn('迪托利希线',s['routes'])
        self.assertIn('ウラノス山',s['byRoute']['凯伊线'])
        self.assertIn('オーガス山道',s['byRoute']['赛奥朵拉线'])
        self.assertNotIn('オーガス山道',s['byRoute']['蕾达线'])
        self.assertIn('任务栏',s['byRoute']['蕾达线'])
        self.assertEqual(list(l['byRoute']),['凯伊线'])
        text=l['byRoute']['凯伊线']
        for term in ['会話','船乗り','東アマルテア駅','フェロニア駅','回帝都','报告']:
            self.assertIn(term,text)
        self.assertIn('已经开放',text)
        for n in [s,l]:
            for text in [n['details'],*n['byRoute'].values()]:
                for unsupported in ['11/27','10/24','5回合','100G']:
                    self.assertNotIn(unsupported,text)
            self.assertEqual(len(n['sources']),len({x['url'] for x in n['sources']}))
        manual=(ROOT/'source/火焰纹章万缕千丝_完全攻略手册.md').read_text()
        self.assertIn('赛奥朵拉线为西南「オーガス山道」',manual)
        self.assertIn('会話→船乗り',manual)

    def test_log_and_generated_outputs(self):
        e=next(x for x in DATA['logs'] if x.get('edition')=='索绯雅与基罗伊卡培养、西提司分线目的地与鲁鲁迪娅行程')
        self.assertEqual(e['date'],'2026-10-05')
        self.assertEqual(e['checked'],len({x['url'] for x in e['new_sources']}))
        self.assertGreaterEqual(e['checked'],30)
        for term in ['索绯雅','基罗伊卡','牧师']:
            self.assertTrue(any(term in c['topic'] for c in e['conflicts']))
        self.assertTrue(all(isinstance(c['src'],str) for c in e['conflicts']))
        for cid,term in [('46','暂留主教'),('59','敌人处于异常状态')]:
            self.assertIn(term,(ROOT/f'docs/character/{cid}.html').read_text())
        self.assertIn('失去黑魔术',(ROOT/'docs/route/theodora.html').read_text())
        self.assertIn('必滅のオウコ',(ROOT/'docs/route/dietrich.html').read_text())
        self.assertIn('新商品兴行4',(ROOT/'docs/route/leda.html').read_text())

if __name__=='__main__': unittest.main()
