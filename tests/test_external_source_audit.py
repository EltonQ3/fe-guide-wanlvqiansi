import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('audit', Path(__file__).resolve().parents[1] / 'tools/audit_external_sources.py')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)


class SourceAuditTests(unittest.TestCase):
    def test_unknown_is_not_zero_or_empty(self):
        self.assertEqual(len({audit.digest(v) for v in [None, 0, '', 'TBD']}), 4)

    def test_failed_read_is_not_mass_deletion(self):
        self.assertEqual(audit.diff({'records': {'a': 'x'}}, {'status': 'read_failed'})['state'], 'not_comparable')

    def test_semantic_change_and_removal(self):
        result = audit.diff({'records': {'removed': 'x', 'changed': 'y', 'same': 'z'}},
                            {'records': {'added': 'x', 'changed': 'new', 'same': 'z'}})
        self.assertEqual(result['added'], ['added'])
        self.assertEqual(result['removed'], ['removed'])
        self.assertEqual(result['changed'], ['changed'])

    def test_unmapped_database_changes_still_require_review(self):
        result = audit.diff({'records': {'a': 'same'}, 'fileHashes': {'data/fwe.db': 'old'}},
                            {'records': {'a': 'same'}, 'fileHashes': {'data/fwe.db': 'new'}})
        self.assertEqual(result['changed'], [])
        self.assertEqual(result['rawFilesChanged'], ['data/fwe.db'])

    def test_public_index_excludes_hidden_tabs_without_claiming_cell_review(self):
        tabs = [{'id': 'a', 'name': '公式（收集中）', 'hidden': False}, {'id': 'b', 'name': 'hidden', 'hidden': True}]
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / 'page.html'
            f.write_text('<div id="footerDomStr">' + json.dumps(tabs) + '</div>')
            result = audit.tencent_inventory(f)
        self.assertEqual(result['tabs'], [{'id': 'a', 'name': '公式（收集中）'}])
        self.assertEqual(result['hiddenTabCount'], 1)
        self.assertEqual(result['status'], 'index_readable_cells_not_compared')


if __name__ == '__main__':
    unittest.main()
