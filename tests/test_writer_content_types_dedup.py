"""Writer save: [Content_Types].xml must not get a second Override for a footer/header part.

Measured 2026-09-15 on the LAN batch: LibreOffice already declares /word/footer1.xml and the
header/footer restore appended it again; Word 2016 then refused the file ("The file appears to be
corrupted") for 4 of the first 7 real documents.
"""
import importlib.util
import os
import unittest


ROOT = os.path.dirname(os.path.dirname(__file__))
PATH = os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
SPEC = importlib.util.spec_from_file_location("writer_ct_dedup", PATH)
patcher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(patcher)


class ContentTypesOverrideDedup(unittest.TestCase):
    def test_existing_override_is_not_duplicated(self):
        ct = ('<Types xmlns="x"><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>')
        out = patcher._add_content_types_override(ct, "/word/footer1.xml", patcher._DOCX_FOOTER_CONTENT_TYPE)
        self.assertEqual(out.count('PartName="/word/footer1.xml"'), 1)
        out = patcher._add_content_types_override(out, "/word/header1.xml", patcher._DOCX_HEADER_CONTENT_TYPE)
        self.assertEqual(out.count('PartName="/word/header1.xml"'), 1)
        self.assertTrue(out.endswith("</Types>"))


if __name__ == "__main__":
    unittest.main()
