"""Oct 12: late-recruit training, adjacency and conditional follow-up effects."""
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'docs/data.js').read_text().removeprefix('window.FE_DATA = ').strip().removesuffix(';').replace('<\\/', '</'))
CHARS={c['name']:c for c in DATA['characters']}

class October12Tests(unittest.TestCase):
    def test_identity_and_sources(self):
        self.assertEqual(len(CHARS),55)
        self.assertGreaterEqual(sum(bool(c.get('builds')) for c in CHARS.values()),43)
        for name,cid in [('盖茨','21'),('迪雅各','27')]:
            c=CHARS[name];b=c['builds']
            self.assertEqual(c['id'],cid)
            self.assertEqual(b['checkedAt'],'2026-10-12')
            self.assertIsNone(b['gameVersion']);self.assertIsNone(b['difficulty'])
            for k in ['early','middle','late','requirement','caution','route','scope']:self.assertTrue(b[k])
            self.assertGreaterEqual(len(b['sources']),2)
            self.assertEqual(len(b['sources']),len({s['url'] for s in b['sources']}))
            self.assertTrue(all(s.get('evidenceLocation') and s['checkedAt']=='2026-10-12' for s in b['sources']))
            self.assertIn('编辑建议',b['scope'])
    def test_gates_keeps_route_and_prerequisites(self):
        c=CHARS['盖茨'];b=c['builds']
        for r in ['kai','theodora','leda']:self.assertEqual(c['plan'][r]['kind'],'none')
        self.assertEqual(c['plan']['dietrich']['support'],3)
        self.assertEqual(c['plan']['dietrich']['renown'],10)
        for text in ['贝特朗外传','败退','实际入队']:self.assertIn(text,b['early'])
        for text in ['此前赛奥朵拉线','未解锁','荣光骑士']:self.assertIn(text,b['middle'])
        self.assertNotIn('重装E+',b['middle'])
    def test_gates_effects_have_conditions(self):
        b=CHARS['盖茨']['builds']
        for text in ['邻接友军守备+3','不给自己加防','20%','不触发','先攻','后攻']:self.assertIn(text,b['caution'])
        self.assertIn('后攻耐物+5',b['late'])
        self.assertNotIn('第2区分',b['late']);self.assertNotIn('第3区分',b['late'])
    def test_diego_keeps_gates_and_conditional_effects(self):
        c=CHARS['迪雅各'];b=c['builds']
        self.assertEqual([c['plan'][r]['renown'] for r in ['kai','dietrich','theodora','leda']],[10,9,8,8])
        self.assertEqual([c['plan'][r]['support'] for r in ['kai','dietrich','theodora','leda']],[3,3,2,3])
        self.assertTrue(all(any(n.get('paralogue')=='orhel' for n in p['needs']) for p in c['plan'].values()))
        for text in ['相邻友军','5%','仅追击时','没有追击','自身免追击']:self.assertIn(text,b['caution'])
        self.assertIn('不能自动制造追击',b['middle'])
        self.assertIn('必杀击倒',b['late'])
    def test_static_output_and_hidden_drafts(self):
        for name,cid in [('盖茨','21'),('迪雅各','27')]:
            b=CHARS[name]['builds'];page=(ROOT/f'docs/character/{cid}.html').read_text()
            for k in ['role','early','middle','late','caution']:self.assertIn(b[k],page)
        for s in DATA['story'][:4]:self.assertFalse(s['profile']['pilot']['publishBattles'])
    def test_mikaela_unresolved_fee_is_not_a_published_requirement(self):
        c=CHARS['米迦艾拉']
        self.assertEqual(c['plan']['dietrich'],{'kind':'auto','chapter':4,'needs':[]})
        self.assertNotIn('3000',c['recruit']['迪托利希线'])
        self.assertNotIn('免费',c['recruit']['迪托利希线'])
        for r in ['kai','theodora','leda']:
            self.assertTrue(any(n.get('gold')==3000 for n in c['plan'][r]['needs']))
        story=next(s for s in DATA['story'] if s['id']=='dietrich')
        card=next(c for c in story['profile']['pilot']['native'] if c['name']=='米迦艾拉')
        self.assertNotIn('3000',card['caution'])
        self.assertIn('酒馆事件战后',card['arrival'])
        self.assertNotIn('加入费用待核',(ROOT/'docs/route/dietrich.html').read_text())
    def test_daitou_quantity_is_route_scoped_and_unknown_is_not_zero(self):
        c=CHARS['大刀']
        self.assertEqual(c['plan']['kai']['needs'][0]['qty'],2)
        for route in ['dietrich','theodora','leda']:
            n=c['plan'][route]['needs'][0]
            self.assertEqual(n['item'],'コーシャルーガー')
            self.assertIsNone(n['qty'])
        self.assertNotIn('3 个',c['negotiations']['details'])
        self.assertNotIn('数量有分歧',c['negotiations']['kind'])
    def test_disputed_class_numbers_keep_actual_prerequisites(self):
        classes={c['name']:c for c in DATA['classes']}
        c=classes['重装骑兵']
        self.assertNotIn('重装术 F',c['exam'])
        self.assertIn('重装术要求',c['exam'])
        self.assertIn('赛奥朵拉',c['unlock'])
        c=classes['刀剑将领']
        self.assertIn('委托',c['unlock'])
        self.assertNotIn('第二区分',c['unlock']+c['phase'])
        self.assertNotIn('第三区分',c['unlock']+c['phase'])
    def test_log_keeps_unverified_research_separate(self):
        e=next(e for e in DATA['logs'] if e.get('edition')=='邻接护卫与剑弓追击培养')
        self.assertEqual(e['date'],'2026-10-12')
        self.assertEqual(e['scheduledFor'],'2026-10-11T20:00:00Z')
        self.assertEqual(e['checked'],len({s['url'] for s in e['new_sources']}))
        self.assertGreaterEqual(len(e['merged']),4)
        for term in ['米迦艾拉','杰斯特','稽古','Rank']:self.assertTrue(any(term in x['topic'] for x in e['conflicts']))
        for name in ['盖茨','迪雅各']:
            b=CHARS[name]['builds']
            for key in ['early','middle','late','requirement','caution']:self.assertNotIn('待核',b[key])

if __name__=='__main__':unittest.main()
