"""Oct 15: conditional builds, route-specific task evidence and reproducible rendering."""
import json
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DATA=json.loads((ROOT/'docs/data.js').read_text().removeprefix('window.FE_DATA = ').strip().removesuffix(';').replace('<\\/', '</'))
CHARS={c['name']:c for c in DATA['characters']}
class October15Tests(unittest.TestCase):
 def test_build_identity_and_sources(self):
  self.assertEqual(len(CHARS),55)
  self.assertGreaterEqual(sum(bool(c.get('builds')) for c in CHARS.values()),46)
  for name,cid in [('班迪兹','36')]:
   c=CHARS[name];b=c['builds'];self.assertEqual(c['id'],cid)
   self.assertEqual(b['checkedAt'],'2026-10-15')
   self.assertIsNone(b['gameVersion']);self.assertIsNone(b['difficulty'])
   self.assertGreaterEqual(len(b['sources']),3)
   for key in ['early','middle','late','requirement','caution','route','scope']:self.assertTrue(b[key])
   for s in b['sources']:self.assertTrue(s['evidenceLocation']);self.assertEqual(s['checkedAt'],'2026-10-15')
   page=(ROOT/f'docs/character/{cid}.html').read_text()
   for key in ['role','early','middle','late','caution']:self.assertIn(b[key],page)
 def test_banditz_riding_conditions(self):
  b=CHARS['班迪兹']['builds']
  for t in ['骑乘','命中+20']:self.assertIn(t,b['early'])
  for t in ['不能回避','耐物+10','落点']:self.assertIn(t,b['middle'])
  for t in ['Lv.35','猛击次数2次','不是每回合']:self.assertIn(t,b['late'])
  self.assertIn('不能据此硬接法师',b['caution'])
 def test_orhel_availability_and_cost(self):
  self.assertNotIn('奥尔赫尔',CHARS)
  guide=(ROOT/'docs/guide/g5.html').read_text()
  for t in ['奥尔赫尔：第三部承伤与治疗','第三部实际入队','不是四线开局','白魔术A','枪术A','不能转骑兵或飞行','每张地图一次','Overblaze']:self.assertIn(t,guide)
  self.assertNotIn('可放心使用强力咒宝武器',guide)
 def test_jester_destination_is_dietrich_only(self):
  n=CHARS['杰斯特']['negotiations']
  self.assertEqual(set(n['byRoute']),{'迪托利希线'})
  for t in ['请求1','セドー砦','屍獄のデュナンゾ','回帝都','请求3']:self.assertIn(t,n['byRoute']['迪托利希线'])
  self.assertNotIn('セドー砦',n['details'])
  self.assertTrue(all(s['route']=='迪托利希线' for s in n['sources']))
  self.assertNotIn('11/27',n['byRoute']['迪托利希线'])
 def test_chinese_bold_rendering(self):
  import markdown
  self.assertEqual(markdown.__version__,'3.11')
  p=(ROOT/'docs/guide/g1.html').read_text()
  self.assertIn('<strong>「天刻的白沙」</strong>',p)
  self.assertNotIn('**「天刻的白沙」',p)
 def test_log_and_unpublished_battles(self):
  e=next(e for e in DATA['logs'] if e.get('edition')=='战车留职、承伤治疗与迪线任务')
  self.assertEqual(e['date'],'2026-10-15');self.assertEqual(e['scheduledFor'],'2026-10-14T20:00:00Z')
  self.assertEqual(e['checked'],len({s['url'] for s in e['new_sources']}))
  for t in ['杰斯特','加入区分','成长','考试Rank']:self.assertTrue(any(t in x['topic'] or t in x['incoming'] for x in e['conflicts']))
  for s in DATA['story'][:4]:self.assertFalse(s['profile']['pilot']['publishBattles'])
if __name__=='__main__':unittest.main()
