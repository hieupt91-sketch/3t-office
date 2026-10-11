import unittest

from adapters.libreoffice.common.ooxml_zip_patch import _rewrite_indirect_local_ref_for_excel


class IndirectFormulaCompatibilityTests(unittest.TestCase):
    def test_rewrites_calc_local_a1_reference(self):
        self.assertEqual(
            _rewrite_indirect_local_ref_for_excel('INDIRECT("[.C2]")'),
            'INDIRECT("C2")',
        )

    def test_rewrites_absolute_local_a1_reference_and_preserves_other_text(self):
        formula = 'SUM(INDIRECT("[.$C$2]"),INDIRECT("NamedRange"))'
        self.assertEqual(
            _rewrite_indirect_local_ref_for_excel(formula),
            'SUM(INDIRECT("$C$2"),INDIRECT("NamedRange"))',
        )

    def test_does_not_rewrite_text_outside_indirect_or_external_refs(self):
        formula = '"[.C2]"&INDIRECT("[Book.xlsx]Sheet1!A1")'
        self.assertEqual(_rewrite_indirect_local_ref_for_excel(formula), formula)


if __name__ == "__main__":
    unittest.main()
