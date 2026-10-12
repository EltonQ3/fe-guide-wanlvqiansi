"""Oct 13: late magic training and route-scoped Anna shop guidance."""
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'docs/data.js').read_text().removeprefix('window.FE_DATA = ').strip().removesuffix(';').replace('<\\/', '</'))
CHARS={c['name']:c for c in DATA['characters']}
class October13Tests(unittest.TestCase):
 def test_builds_and_sources(self):
  self.assertEqual(len(CHARS),55)
  self.assertGreaterEqual(sum(bool(c.get('builds')) for c in CHARS.values()),45)
  for name,cid in [('阿纳托莉娅','29'),('塔利穆恩','63')]:
   c=CHARS[name];b=c['builds'];self.assertEqual(c['id'],cid)
   self.assertEqual(b['checkedAt'],'2026-10-13')
   self.assertIsNone(b['gameVersion']);self.assertIsNone(b['difficulty'])
   self.assertGreaterEqual(len(b['sources']),3)
   for key in ['early','middle','late','requirement','caution','route','scope']:self.assertTrue(b[key])
   for source in b['sources']:
    self.assertTrue(source['evidenceLocation']);self.assertEqual(source['checkedAt'],'2026-10-13')
   page=(ROOT/f'docs/character/{cid}.html').read_text()
   for key in ['role','early','middle','late','caution']:self.assertIn(b[key],page)
 def test_anatolia_conditions(self):
  b=CHARS['阿纳托莉娅']['builds']
  for term in ['第三部','实际入队','外传']:self.assertIn(term,b['early'])
  self.assertNotIn('第1',b['chapter']);self.assertNotIn('第2',b['chapter'])
  for term in ['成功回避','10 HP','咒宝']:self.assertIn(term,b['caution'])
  self.assertIn('消耗 HP',b['late']);self.assertIn('黑魔术 A',b['requirement'])
 def test_talimoon_debuff_and_hp_boundaries(self):
  b=CHARS['塔利穆恩']['builds']
  for term in ['攻速减半','守备与魔防','一次战斗或一回合','主攻手']:self.assertIn(term,b['middle'])
  for term in ['最大HP下降','仍消耗HP','自己攻击时命中+15','敌人攻击时回避+15']:self.assertIn(term,b['caution'])
  self.assertIn('白魔术',b['requirement'])
 def test_shop_keeps_leda_exception(self):
  p=json.loads((ROOT/'source/paralogues.json').read_text());a=next(x for x in p if x['id']=='anna')
  self.assertNotIn('leda',a['routes'])
  for term in ['最上层','夜间','蕾达','第10章']:self.assertIn(term,a['consequence'])
  self.assertEqual(a['checkedAt'],'2026-10-13')
  guide=(ROOT/'docs/guide/g5.html').read_text()
  self.assertIn('安娜秘密店',guide);self.assertIn('10000G',guide)
  self.assertNotIn('18:00',a['consequence'])
 def test_log_and_private_drafts(self):
  e=next(e for e in DATA['logs'] if e.get('edition')=='第三部魔法培养与安娜夜间店铺')
  self.assertEqual(e['date'],'2026-10-13');self.assertEqual(e['scheduledFor'],'2026-10-12T20:00:00Z')
  self.assertEqual(e['checked'],len({s['url'] for s in e['new_sources']}))
  for term in ['加入区分','成长','杰斯特','稽古']:self.assertTrue(any(term in x['topic'] for x in e['conflicts']))
  for s in DATA['story'][:4]:self.assertFalse(s['profile']['pilot']['publishBattles'])
if __name__=='__main__':unittest.main()
