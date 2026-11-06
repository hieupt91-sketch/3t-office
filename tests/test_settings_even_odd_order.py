"""S1 item 4: w:evenAndOddHeaders must sit at its CT_Settings position (ECMA-376), not at the end of settings.xml."""

import importlib.util
import re
import unittest
import zipfile
from io import BytesIO
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_SPEC = importlib.util.spec_from_file_location(
    "_s1_ooxml_zip_patch", ROOT / "adapters" / "libreoffice" / "common" / "ooxml_zip_patch.py"
)
patch_module = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(patch_module)
insert = patch_module._insert_even_and_odd_headers

NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="urn:w14" xmlns:m="urn:m"'
# The elements around evenAndOddHeaders in CT_Settings, in schema order (ECMA-376 Part 1, wml.xsd).
BEFORE = ["zoom", "mirrorMargins", "proofState", "trackRevisions", "documentProtection", "defaultTabStop",
          "autoHyphenation", "hyphenationZone", "doNotHyphenateCaps", "summaryLength", "clickAndTypeStyle", "defaultTableStyle"]
AFTER = ["bookFoldPrinting", "drawingGridHorizontalSpacing", "characterSpacingControl", "updateFields", "compat", "rsids",
         "themeFontLang", "clrSchemeMapping", "decimalSymbol", "listSeparator"]


def settings(*names):
    return f'<?xml version="1.0"?><w:settings {NS}>' + "".join(f'<w:{name} w:val="1"/>' for name in names) + "</w:settings>"


def children(xml):
    """Direct children of w:settings, in order."""
    names, depth = [], 0
    for closing, name, self_closing in re.findall(r"<(/?)([\w:.\-]+)(?:\s[^>]*?)?(/?)>", xml):
        if closing:
            depth -= 1
            continue
        if depth == 1:
            names.append(name)
        if not self_closing:
            depth += 1
    return names


class InsertEvenAndOddHeadersTests(unittest.TestCase):
    def test_every_neighbour_ends_up_on_the_correct_side(self):
        for name in BEFORE:
            with self.subTest(before=name):
                self.assertEqual(children(insert(settings(name, "compat"))), [f"w:{name}", "w:evenAndOddHeaders", "w:compat"])
        for name in AFTER:
            with self.subTest(after=name):
                self.assertEqual(children(insert(settings("zoom", name))), ["w:zoom", "w:evenAndOddHeaders", f"w:{name}"])

    def test_full_settings_keep_the_schema_order(self):
        xml = insert(settings(*BEFORE, *AFTER))
        self.assertEqual(children(xml), [f"w:{name}" for name in BEFORE] + ["w:evenAndOddHeaders"] + [f"w:{name}" for name in AFTER])
        self.assertEqual(xml.count("<w:evenAndOddHeaders/>"), 1)

    def test_nothing_else_changes(self):
        source = settings(*BEFORE, *AFTER)
        self.assertEqual(insert(source).replace("<w:evenAndOddHeaders/>", ""), source)

    def test_children_with_nested_elements_are_stepped_over(self):
        xml = insert(
            f'<w:settings {NS}><w:mailMerge><w:mainDocumentType w:val="formLetters"/></w:mailMerge>'
            '<w:compat><w:compatSetting w:name="a" w:val="15"/></w:compat></w:settings>'
        )
        self.assertEqual(children(xml), ["w:mailMerge", "w:evenAndOddHeaders", "w:compat"])
        self.assertIn('</w:mailMerge><w:evenAndOddHeaders/><w:compat>', xml)

    def test_extension_elements_count_as_after(self):
        self.assertEqual(
            children(insert(settings("zoom").replace("</w:settings>", '<w14:docId w14:val="1"/><w15:chartTrackingRefBased/></w:settings>'))),
            ["w:zoom", "w:evenAndOddHeaders", "w14:docId", "w15:chartTrackingRefBased"],
        )

    def test_only_predecessors_or_empty_appends_at_the_end(self):
        self.assertEqual(children(insert(settings("zoom"))), ["w:zoom", "w:evenAndOddHeaders"])
        self.assertEqual(children(insert(f"<w:settings {NS}></w:settings>")), ["w:evenAndOddHeaders"])

    def test_namespace_attribute_with_angle_bracket_and_comment(self):
        xml = insert(f'<w:settings {NS} data="a>b"><!-- <w:compat/> --><w:zoom w:percent="100"/><w:compat/></w:settings>')
        self.assertIn('<w:zoom w:percent="100"/><w:evenAndOddHeaders/><w:compat/>', xml)

    def test_unusable_settings_are_returned_unchanged(self):
        for source in ("<w:settings/>", "", "not xml"):
            with self.subTest(source=source):
                self.assertEqual(insert(source), source)


def docx_with_settings(settings_xml, extra=None):
    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w") as package:
        package.writestr("word/document.xml", f'<w:document {NS}><w:body><w:p/><w:sectPr/></w:body></w:document>')
        package.writestr("word/settings.xml", settings_xml)
        for name, data in (extra or {}).items():
            package.writestr(name, data)
    return buffer.getvalue()


def settings_of(docx):
    with zipfile.ZipFile(BytesIO(docx)) as package:
        return package.read("word/settings.xml").decode("utf-8")


class CallSiteTests(unittest.TestCase):
    """Each place that adds the flag, on a settings.xml where the old code put it after characterSpacingControl."""

    CONVERTED = settings("zoom", "defaultTabStop", "characterSpacingControl", "compat", "rsids", "themeFontLang")
    ODD_EVEN_HTML = '<p>x</p><!--vno-sections-meta:[{"id":"s1","headerFooter":{"differentOddEven":true}}]-->'

    def assert_schema_order(self, xml):
        names = children(xml)
        self.assertEqual(names.count("w:evenAndOddHeaders"), 1, names)
        position = names.index("w:evenAndOddHeaders")
        self.assertLess(names.index("w:defaultTabStop"), position, names)
        self.assertLess(position, names.index("w:characterSpacingControl"), names)

    def test_no_call_site_appends_at_the_end_any_more(self):
        source = (ROOT / "adapters" / "libreoffice" / "common" / "ooxml_zip_patch.py").read_text(encoding="utf-8")
        self.assertNotIn('"<w:evenAndOddHeaders/></w:settings>"', source)

    def test_saved_section_metadata(self):
        out = patch_module.postprocess_writer_section_metadata(docx_with_settings(self.CONVERTED), source_html=self.ODD_EVEN_HTML)
        self.assert_schema_order(settings_of(out))

    def test_created_document(self):
        out = patch_module.postprocess_created_writer_docx(docx_with_settings(self.CONVERTED), source_html=self.ODD_EVEN_HTML)
        self.assert_schema_order(settings_of(out))

    def test_copied_from_the_source_document(self):
        source = docx_with_settings(settings("zoom", "evenAndOddHeaders", "compat"))
        converted = self.CONVERTED.replace('<w:compat w:val="1"/>', "<w:compat><w:compatSetting/></w:compat>")
        out = patch_module.postprocess_writer_docx(docx_with_settings(converted), source_docx=source)
        self.assert_schema_order(settings_of(out))

    def test_existing_flag_is_not_duplicated_or_moved(self):
        present = settings("zoom", "defaultTabStop", "evenAndOddHeaders", "characterSpacingControl", "compat")
        out = patch_module.postprocess_writer_section_metadata(docx_with_settings(present), source_html=self.ODD_EVEN_HTML)
        self.assert_schema_order(settings_of(out))


if __name__ == "__main__":
    unittest.main()
