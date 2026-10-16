#!/usr/bin/env python3
"""Read-only, field-level source inventory. Never edits production content.

The Helper checkout and public Tencent HTML must be fetched separately. A page
response/index hash is not evidence that Tencent cells are unchanged.
"""
import argparse
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import sqlite3
import subprocess


def digest(value):
    raw = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(raw.encode()).hexdigest()


class SheetIndex(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.tag = None
        self.fragments = []

    def handle_starttag(self, tag, attrs):
        if dict(attrs).get('id') == 'footerDomStr':
            self.active, self.tag = True, tag

    def handle_data(self, data):
        if self.active:
            self.fragments.append(data)

    def handle_endtag(self, tag):
        if self.active and tag == self.tag:
            self.active = False


def tencent_inventory(path):
    parser = SheetIndex()
    parser.feed(Path(path).read_text(encoding='utf-8'))
    tabs = json.loads(''.join(parser.fragments))
    if not isinstance(tabs, list) or not tabs:
        raise ValueError('No public sheet index; treat as unreadable, not unchanged')
    visible = [{'id': t['id'], 'name': t['name'].strip()} for t in tabs if not t.get('hidden')]
    return {
        'status': 'index_readable_cells_not_compared',
        'url': 'https://docs.qq.com/sheet/DV0N0VUZLSXRmUWFq',
        'tabs': visible,
        'hiddenTabCount': sum(bool(t.get('hidden')) for t in tabs),
        'records': {t['id']: digest(t['name']) for t in visible},
        'limitation': 'Only public tab names are compared. Cell changes require normal-view review.',
    }


FIELDS = {
    'characters': ['name', 'page_id', 'faction', 'ability', 'ability_effect', 'pref_skills', 'nonideal_skills',
                   *['growth_' + s for s in ['hp', 'str', 'mag', 'spd', 'dex', 'def', 'res', 'lck', 'cha']]],
    'classes': ['name', 'page_id', 'tier', 'movement', 'license', 'ideal_lv', 'renown_lv', 'primary_skill',
                'secondary_skill', 'master_ability', 'master_ability_effect',
                *['growth_' + s for s in ['hp', 'str', 'mag', 'spd', 'dex', 'def', 'res', 'lck', 'cha']]],
    'char_supports': ['name', 'partner', 'rank'],
    'char_spells': ['name', 'skill_level', 'magic', 'spell'],
    'char_gifts': ['name', 'gift'],
    'char_bloodmarks': ['name', 'mark', 'holders', 'effect'],
}
KEYS = {
    'characters': ['name'], 'classes': ['name'], 'char_supports': ['name', 'partner'],
    'char_spells': ['name', 'skill_level', 'magic', 'spell'], 'char_gifts': ['name', 'gift'],
    'char_bloodmarks': ['name', 'mark'],
}


def helper_inventory(root):
    root = Path(root).resolve()
    db = sqlite3.connect((root / 'data/fwe.db').as_uri() + '?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    records, counts, rows = {}, {}, {}
    try:
        for table, fields in FIELDS.items():
            rows[table] = [dict(r) for r in db.execute(f'SELECT {",".join(fields)} FROM {table}')]
            if not rows[table]:
                raise ValueError(f'{table} unexpectedly empty; review parser/source before accepting')
            counts[table] = len(rows[table])
            seen = set()
            for row in rows[table]:
                key = json.dumps([row[f] for f in KEYS[table]], ensure_ascii=False, separators=(',', ':'))
                if key in seen:
                    raise ValueError(f'Duplicate identity in {table}: {key}')
                seen.add(key)
                for field in fields:
                    if field not in KEYS[table]:
                        records[f'{table}/{key}/{field}'] = digest(row[field])
                records[f'{table}/{key}/_present'] = digest(True)
        pairs = {tuple(sorted((r['name'], r['partner']))) for r in rows['char_supports']}
        all_tables = {r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        for t in ['pages', 'sections', 'tables_generic', 'char_growths', 'class_growths', 'char_blaze', 'char_birdtime']:
            if t in all_tables:
                counts[t] = db.execute(f'SELECT COUNT(*) FROM {t}').fetchone()[0]
    finally:
        db.close()
    planner = json.loads((root / 'data/fwe.json').read_text())
    db_classes = {r['name'] for r in rows['classes']}
    def missing(v):
        return v is None or (isinstance(v, str) and (not v.strip() or v.strip().upper() == 'TBD'))
    coverage = {
        'supportPairs': len(pairs),
        'supportCharacters': len({r['name'] for r in rows['char_supports']}),
        'giftCharacters': len({r['name'] for r in rows['char_gifts']}),
        'spellCharacters': len({r['name'] for r in rows['char_spells']}),
        'uniqueBloodmarkNames': len({r['mark'] for r in rows['char_bloodmarks']}),
        'missingPersonalAbility': [r['name'] for r in rows['characters'] if missing(r['ability']) or missing(r['ability_effect'])],
        'missingPrimarySkill': [r['name'] for r in rows['classes'] if missing(r['primary_skill'])],
        'plannerClassCount': len(planner['classes']),
        'plannerOnlyClasses': sorted(set(planner['classes']) - db_classes),
        'databaseOnlyClasses': sorted(db_classes - set(planner['classes'])),
    }
    # Watch all planner facts separately; its pipeline is not the DB pipeline.
    def walk(value, path):
        if isinstance(value, dict):
            for key, child in sorted(value.items()):
                walk(child, path + '/' + key)
        else:
            records[path] = digest(value)
    walk(planner, 'planner')
    commit = subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD'], text=True).strip()
    date = subprocess.check_output(['git', '-C', str(root), 'show', '-s', '--format=%cI', 'HEAD'], text=True).strip()
    return {'status': 'snapshot_readable_not_game_verified', 'url': 'https://github.com/Rico0319/Fortunes-Weave-Helper',
            'commit': commit, 'commitDate': date, 'counts': counts, 'coverage': coverage, 'records': records,
            'independenceGroup': 'game8', 'plannerRecruitmentSourceGroup': 'community-google-sheet',
            'fieldHashScope': FIELDS,
            'scopeNote': 'Selected typed fields + all planner JSON values. Other DB changes require targeted review.',
            'fileHashes': {p: hashlib.sha256((root / p).read_bytes()).hexdigest() for p in ['data/fwe.db', 'data/fwe.json']}}


def diff(previous, current):
    old, new = previous.get('records'), current.get('records')
    if old is None or new is None:
        return {'state': 'not_comparable', 'reason': 'A readable baseline and current snapshot are required.'}
    return {
        'state': 'comparable_snapshot_fields_only',
        'added': sorted(new.keys() - old.keys()),
        'removed': sorted(old.keys() - new.keys()),
        'changed': sorted(k for k in new.keys() & old.keys() if old[k] != new[k]),
        'rawFilesChanged': sorted(k for k in set(previous.get('fileHashes', {})) | set(current.get('fileHashes', {}))
                                  if previous.get('fileHashes', {}).get(k) != current.get('fileHashes', {}).get(k)),
        'coverageChanged': previous.get('coverage') != current.get('coverage') or previous.get('counts') != current.get('counts'),
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--helper', required=True)
    p.add_argument('--tencent-html')
    p.add_argument('--baseline')
    p.add_argument('--output', required=True)
    args = p.parse_args()
    report = {'schemaVersion': 1, 'checkedAt': datetime.now(timezone.utc).isoformat(), 'sources': {}}
    for name, run in [('helper', lambda: helper_inventory(args.helper)),
                      ('tencent', lambda: tencent_inventory(args.tencent_html) if args.tencent_html else {'status': 'not_checked'})]:
        try:
            report['sources'][name] = run()
        except (OSError, ValueError, KeyError, sqlite3.Error, subprocess.CalledProcessError) as exc:
            report['sources'][name] = {'status': 'read_failed', 'error': str(exc)}
    if args.baseline:
        baseline = json.loads(Path(args.baseline).read_text())
        report['diff'] = {name: diff(baseline.get('sources', {}).get(name, {}), source)
                          for name, source in report['sources'].items()}
    Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'output': args.output, 'sources': {k: {f: v[f] for f in ['status', 'counts', 'coverage'] if f in v}
                                                       for k, v in report['sources'].items()},
                      'diff': {k: {f: len(v[f]) if isinstance(v[f], list) else v[f] for f in v}
                               for k, v in report.get('diff', {}).items()}}, ensure_ascii=False, indent=2))
    return 1 if any(v['status'] == 'read_failed' for v in report['sources'].values()) else 0


if __name__ == '__main__':
    raise SystemExit(main())
