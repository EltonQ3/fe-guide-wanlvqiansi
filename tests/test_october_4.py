"""Oct 4: conditional builds, route-specific errands and exam-cost context."""
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'docs/data.js').read_text().removeprefix('window.FE_DATA = ').strip().removesuffix(';').replace('<\\/', '</'))

class October4Tests(unittest.TestCase):
    def test_new_builds_have_stable_ids_and_scoped_evidence(self):
        chars={x['name']:x for x in DATA['characters']}
        self.assertEqual(chars['菲亚娜']['id'],'53')
        self.assertEqual(chars['诺克裘拉']['id'],'44')
        f=chars['菲亚娜']['builds']; n=chars['诺克裘拉']['builds']
        self.assertIn('魔法回复队友',f['early']);self.assertIn('幸运百分比',f['early'])
        self.assertIn('不能使用黑魔术',f['late']);self.assertIn('名声10',f['requirement'])
        self.assertIn('新商品兴行4',f['requirement']);self.assertNotIn('第3区分',f['requirement'])
        self.assertIn('战斗结束后',n['early']);self.assertIn('下次己方阶段',n['early'])
        self.assertIn('使用战技的战斗',n['middle']);self.assertIn('装备护手',n['late'])
        self.assertIn('20%',n['caution']);self.assertIn('白魔术 D',n['requirement'])
        for b in [f,n]:
            self.assertIsNone(b['gameVersion']);self.assertIsNone(b['difficulty'])
            self.assertTrue(all(x.get('checkedAt')=='2026-10-04' and x.get('evidenceLocation') for x in b['sources']))

    def test_route_advice_keeps_eligibility_and_avoids_disputed_arrival(self):
        stories={s['id']:s for s in DATA['story']}
        l=next(n for n in stories['leda']['profile']['pilot']['scouts'] if n['name']=='菲亚娜')
        self.assertEqual((l['support'],l['fame']),(3,5));self.assertIn('3000G',l['condition'])
        self.assertNotIn('第 4 章',l['arrival']);self.assertNotIn('第 5 章',l['arrival'])
        self.assertIn('新商品兴行4',l['train']);self.assertIn('不能用黑魔术',l['late'])
        d=next(n for n in stories['dietrich']['profile']['pilot']['scouts'] if n['name']=='诺克裘拉')
        self.assertEqual(d['arrival'],'第 4 章起 · 帝都出现')
        self.assertEqual((d['support'],d['fame']),(1,6))
        for s in list(stories.values())[:4]:self.assertFalse(s['profile']['pilot']['publishBattles'])

    def test_exam_guidance_separates_probability_from_availability(self):
        chapter=next(c for c in DATA['chapters'] if c['id']=='g5')
        sec=next(s for s in chapter['sections'] if s['id']=='s5-2')['text']
        self.assertIn('普通考试并非一定要把所有建议值练满才能报名',sec)
        self.assertIn('名声 8',sec);self.assertIn('3000G／张',sec)
        self.assertIn('下一章',sec);self.assertIn('不把补货当成每日或每周刷新',sec)
        self.assertNotIn('需满足技能 Rank 要求',sec)

    def test_recruitment_guidance_is_route_scoped(self):
        entries={x['name']:x for x in DATA['negotiations']}
        s=entries['西洛可'];e=entries['艾丝梅拉尔达']
        self.assertIn('秘奥の祭壇',s['byRoute']['凯伊线'])
        self.assertNotIn('アトラ山頂',s['byRoute']['凯伊线'])
        self.assertIn('イアペトス大洞窟',s['byRoute']['赛奥朵拉线'])
        self.assertIn('アトラ山頂',s['byRoute']['赛奥朵拉线'])
        self.assertNotIn('アトラ山頂',s['byRoute']['迪托利希线'])
        self.assertIn('任务标记',s['byRoute']['迪托利希线'])
        for text in [s['details'],*s['byRoute'].values()]:
            self.assertNotIn('11/27',text);self.assertNotIn('10/24',text)
        self.assertIn('6体海兽',e['byRoute']['凯伊线'])
        self.assertIn('回报',e['byRoute']['凯伊线'])
        self.assertNotIn('6体',e['details'])
        self.assertEqual(len(e['sources']),len({x['url'] for x in e['sources']}))
        manual=(ROOT/'source/火焰纹章万缕千丝_完全攻略手册.md').read_text()
        line=next(t for t in manual.splitlines() if t.startswith('- **西洛可 · 任务**'))
        self.assertIn('赛奥朵拉线经',line);self.assertIn('迪托利希线先核对',line)

    def test_log_and_generated_builds(self):
        e=DATA['logs'][0];self.assertEqual(e['date'],'2026-10-04')
        self.assertEqual(e['checked'],len({x['url'] for x in e['new_sources']}))
        self.assertGreaterEqual(e['checked'],30)
        for c in ['菲亚娜','战斗将领','米迦艾拉','杰斯特']:
            self.assertTrue(any(c in x['topic'] for x in e['conflicts']))
        for cid,term in [('53','机动攻疗'),('44','使用战技的战斗')]:
            self.assertIn(term,(ROOT/f'docs/character/{cid}.html').read_text())
        for route in ['kai','dietrich','theodora']:
            self.assertIn('使用战技的战斗',(ROOT/f'docs/route/{route}.html').read_text())
        self.assertIn('新商品兴行4',(ROOT/'docs/route/leda.html').read_text())

if __name__=='__main__':unittest.main()
