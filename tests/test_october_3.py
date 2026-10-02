"""Oct 3 evidence scopes, route windows, and additive character coverage."""
import json
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT/'docs/data.js').read_text().removeprefix('window.FE_DATA = ').strip().removesuffix(';').replace('<\\/', '</'))
class October3Tests(unittest.TestCase):
    def test_new_builds_use_stable_ids_and_conditioned_skills(self):
        chars={c['name']:c for c in DATA['characters']}
        self.assertEqual(chars['杨界']['id'],'45')
        self.assertEqual(chars['伊欧']['id'],'33')
        y=chars['杨界']['builds']; i=chars['伊欧']['builds']
        self.assertIn('击倒敌人',y['early'])
        self.assertIn('幸运的一半百分比',y['early'])
        self.assertIn('远程治疗',y['middle'])
        self.assertIn('不能使用黑魔术',y['late'])
        self.assertIn('骑兵先手',i['early'])
        self.assertIn('必杀回避+30',i['early'])
        self.assertIn('不是普通回避',i['early'])
        self.assertNotIn('第3区分',i['requirement'])
        for b in (y,i):
            self.assertIsNone(b['gameVersion']); self.assertIsNone(b['difficulty'])
            self.assertTrue(all(s.get('evidenceLocation') and s['checkedAt']=='2026-10-03' for s in b['sources']))

    def test_all_nine_paralogues_have_tactics_without_new_dates(self):
        p={p['id']:p for p in DATA['paralogues']}
        self.assertEqual(len(p),9);self.assertTrue(all(x.get('strategy') for x in p.values()))
        self.assertIn('先击倒4名巨人',p['bertrand']['strategy'][0])
        self.assertIn('下次己方阶段',p['bertrand']['strategy'][1])
        self.assertIn('红色特殊敌人',p['anatolia']['strategy'][1])
        self.assertIn('不会使用传送阵',p['anatolia']['strategy'][3])
        self.assertIn('同一己方阶段',p['orhel']['strategy'][0])
        self.assertEqual(p['bertrand']['routes']['dietrich'][0],{'chapter':'9','start':'9/17','end':'9/17','deadline':None})
        for w in p['anatolia']['routes'].values():
            self.assertEqual((w[0]['end'],w[0]['deadline']),('10/14','10/17'))
        self.assertEqual(p['orhel']['routes']['kai'][0],{'chapter':'11','start':'10/18','end':'10/19','deadline':'10/21'})
        self.assertEqual(p['orhel']['routes']['theodora'][0],{'chapter':'12','start':'10/18','end':'10/22','deadline':'10/24'})
        self.assertEqual(p['bertrand']['steps'],'向大斗技场前的委托人接取。')

    def test_noctula_is_page_reviewed_not_free_recruitment(self):
        d=next(s for s in DATA['story'] if s['id']=='dietrich')['profile']['pilot']
        n=next(c for c in d['scouts'] if c['name']=='诺克裘拉')
        self.assertEqual(n['arrival'],'第 4 章起 · 帝都出现')
        self.assertEqual((n['support'],n['fame']),(1,6))
        self.assertIn('不能据此认定无条件',n['condition'])
        self.assertIn('未作游戏内实测',n['scope'])
        self.assertEqual(len([r for r in n['sources'] if r.get('checkedAt')=='2026-10-03']),2)
        self.assertFalse(d['publishBattles'])

    def test_log_and_static_outputs(self):
        e=DATA['logs'][0]
        self.assertEqual(e['date'],'2026-10-03')
        self.assertEqual(e['checked'],35)
        self.assertEqual(e['checked'],len(set(x['url'] for x in e['new_sources'])))
        for name in ['米迦艾拉','杰斯特','牧师','菲亚娜']:
            self.assertTrue(any(name in c['topic'] for c in e['conflicts']))
        for cid,phrase in [('45','远程治疗'),('33','必杀回避+30')]:
            self.assertIn(phrase,(ROOT/f'docs/character/{cid}.html').read_text())
        self.assertIn('同一己方阶段',(ROOT/'docs/route/kai.html').read_text())
        self.assertNotIn('红色特殊敌人',(ROOT/'docs/route/kai.html').read_text())
        self.assertIn('红色特殊敌人',(ROOT/'docs/route/leda.html').read_text())
if __name__=='__main__':unittest.main()
