"""_declares_vno_namespace must answer exactly like the IGNORECASE regex it replaced."""

from __future__ import annotations

import os
import re
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import main as vnmain  # noqa: E402

P = vnmain._ooxml_zip_patch()
REFERENCE = re.compile(r"xmlns:vno\s*=", re.IGNORECASE)


class DeclaresVnoNamespaceTests(unittest.TestCase):
    CASES = [
        "",
        "<office:document>",
        '<office:document xmlns:vno="urn:x">',
        '<office:document xmlns:vno = "urn:x">',
        '<office:document xmlns:vno\n="urn:x">',
        '<office:document XMLNS:VNO="urn:x">',
        "<a>xmlns:vno</a>",
        "xmlns:vnoX= and later xmlns:vno =",
        "xmlns:vno" * 3,
        "<r " + "x" * 70000 + ' xmlns:vno="u">',  # declaration beyond the 64 KB head, lower case: found by find
        "<r " + "x" * 70000 + ' XMLNS:VNO="u">',  # exotic upper case beyond the head: the only documented difference
    ]

    def test_equals_the_regex_on_realistic_and_edge_inputs(self):
        for index, text in enumerate(self.CASES[:-1]):
            with self.subTest(index=index):
                self.assertEqual(P._declares_vno_namespace(text), bool(REFERENCE.search(text)))

    def test_documented_difference_only_for_upper_case_declarations_far_from_the_root(self):
        text = self.CASES[-1]
        self.assertTrue(REFERENCE.search(text))
        self.assertFalse(P._declares_vno_namespace(text))

    def test_missing_declaration_on_a_large_string_is_fast(self):
        import time

        text = "<table:table-cell office:value-type='float'/>" * 600000  # ~27 MB
        started = time.perf_counter()
        self.assertFalse(P._declares_vno_namespace(text))
        self.assertLess(time.perf_counter() - started, 1.0)


if __name__ == "__main__":
    unittest.main()
