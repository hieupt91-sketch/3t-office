import base64
import io
import json
import re
import unittest
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher

P_NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'
MC_NS = 'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"'


def _slide(transition: str = "", root_extra: str = "") -> str:
    return (
        f'<?xml version="1.0"?><p:sld {P_NS} {root_extra}><p:cSld><p:spTree/></p:cSld>'
        f"<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>{transition}<p:timing/></p:sld>"
    )


def _pptx(slides: list[str]) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as package:
        ids = "".join(f'<p:sldId id="{256 + i}" r:id="rId{i + 1}"/>' for i in range(len(slides)))
        package.writestr("ppt/presentation.xml", f'<p:presentation {P_NS}><p:sldIdLst>{ids}</p:sldIdLst></p:presentation>')
        rels = "".join(f'<Relationship Id="rId{i + 1}" Type="x/slide" Target="slides/slide{i + 1}.xml"/>' for i in range(len(slides)))
        package.writestr("ppt/_rels/presentation.xml.rels", f"<Relationships>{rels}</Relationships>")
        for i, xml in enumerate(slides):
            package.writestr(f"ppt/slides/slide{i + 1}.xml", xml)
    return buffer.getvalue()


def _fodp(pages: int, extra_attrs: list[str] | None = None) -> str:
    extra_attrs = extra_attrs or [""] * pages
    body = "".join(f'<draw:page draw:name="p{i + 1}" draw:style-name="dp{i + 1}"{extra_attrs[i]}></draw:page>' for i in range(pages))
    return (
        '<?xml version="1.0"?><office:document xmlns:office="o" xmlns:draw="d" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0">'
        f"<office:body><office:presentation>{body}</office:presentation></office:body></office:document>"
    )


def _decode(payload: str) -> dict:
    return json.loads(base64.b64decode(payload).decode("utf-8"))


class SourceTransitionOverlayTests(unittest.TestCase):
    def test_marks_each_page_with_its_own_transition_and_advance(self):
        pptx = _pptx([
            _slide('<p:transition spd="med" advClick="0" advTm="5000"><p:wipe dir="l"/></p:transition>'),
            _slide(""),
            _slide(
                '<mc:AlternateContent><mc:Choice Requires="p14"><p:transition spd="slow" p14:dur="1500" advTm="2000">'
                '<p14:ripple/></p:transition></mc:Choice><mc:Fallback><p:transition spd="slow" advTm="2000"><p:fade/></p:transition></mc:Fallback>'
                "</mc:AlternateContent>",
                MC_NS,
            ),
        ])
        out = patcher.overlay_fodp_source_transitions(_fodp(3), pptx)
        pages = re.findall(r"<draw:page\b([^>]*)>", out)
        first = re.search(r'vno:src-transition="([^"]+)"', pages[0])
        self.assertTrue(first)
        self.assertIn('<p:wipe dir="l"/>', _decode(first.group(1))["xml"])
        self.assertIn("vno:src-advance=\"click:0;after:5000\"", pages[0])
        self.assertNotIn("vno:src-transition", pages[1])
        third = _decode(re.search(r'vno:src-transition="([^"]+)"', pages[2]).group(1))
        self.assertIn("p14:dur=\"1500\"", third["xml"])
        self.assertIn("p14", third["ns"])
        self.assertIn("vno:src-advance=\"click:1;after:2000\"", pages[2])

    def test_no_transition_anywhere_is_a_noop(self):
        pptx = _pptx([_slide(""), _slide("")])
        fodp = _fodp(2)
        self.assertEqual(patcher.overlay_fodp_source_transitions(fodp, pptx), fodp)


class SourceTransitionSaveTests(unittest.TestCase):
    def _run(self, slide_xml: str, attrs: str) -> str:
        pptx = _pptx([slide_xml])
        fodp = _fodp(1, [attrs])
        out = patcher._apply_slides_source_transitions(pptx, fodp)
        return out.get("ppt/slides/slide1.xml", slide_xml)

    def test_source_block_replaces_what_soffice_wrote_and_keeps_schema_order(self):
        block = '<p:transition spd="med" advClick="0" advTm="5000"><p:wipe dir="l"/></p:transition>'
        payload = base64.b64encode(json.dumps({"xml": block, "ns": {}}).encode()).decode()
        result = self._run(_slide('<p:transition><p:fade/></p:transition>'), f' vno:src-transition="{payload}"')
        self.assertEqual(result.count("<p:transition"), 1)
        self.assertIn(block, result)
        self.assertLess(result.index("</p:clrMapOvr>"), result.index("<p:transition"))
        self.assertLess(result.index("<p:transition"), result.index("<p:timing"))

    def test_namespaces_needed_by_the_source_block_are_declared_on_the_root(self):
        block = '<mc:AlternateContent><mc:Choice Requires="p14"><p:transition p14:dur="1500"><p14:ripple/></p:transition></mc:Choice></mc:AlternateContent>'
        payload = base64.b64encode(json.dumps({"xml": block, "ns": {"mc": "http://schemas.openxmlformats.org/markup-compatibility/2006", "p14": "http://schemas.microsoft.com/office/powerpoint/2010/main"}}).encode()).decode()
        result = self._run(_slide(""), f' vno:src-transition="{payload}"')
        self.assertIn('xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"', result)
        self.assertIn('xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"', result)

    def test_user_advance_settings_are_applied_to_an_existing_transition(self):
        result = self._run(_slide('<p:transition spd="med"><p:fade/></p:transition>'), ' vno:advance-click="0" vno:advance-after="3000"')
        tag = re.search(r"<p:transition\b[^>]*>", result).group(0)
        self.assertIn('advClick="0"', tag)
        self.assertIn('advTm="3000"', tag)
        self.assertIn("<p:fade/>", result)

    def test_user_advance_without_any_transition_creates_one(self):
        result = self._run(_slide(""), ' vno:advance-after="4000"')
        self.assertIn('<p:transition advTm="4000"/>', result)
        self.assertLess(result.index("<p:transition"), result.index("<p:timing"))

    def test_nothing_to_do_returns_empty(self):
        self.assertEqual(patcher._apply_slides_source_transitions(_pptx([_slide("")]), _fodp(1)), {})


class SourceThemeTests(unittest.TestCase):
    def _package(self) -> bytes:
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as package:
            package.writestr("ppt/slideMasters/slideMaster1.xml", "<p:sldMaster/>")
            package.writestr(
                "ppt/slideMasters/_rels/slideMaster1.xml.rels",
                '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/></Relationships>',
            )
            package.writestr("ppt/theme/theme1.xml", '<a:theme name="Office"><a:fontScheme><a:latin typeface="Calibri"/></a:fontScheme></a:theme>')
        return buffer.getvalue()

    def test_original_theme_is_carried_and_restored(self):
        pptx = self._package()
        marked = patcher.overlay_fodp_source_theme(
            '<office:document xmlns:office="o" xmlns:draw="d" xmlns:style="s"><style:master-page style:name="Standard"/></office:document>', pptx
        )
        self.assertIn("vno:src-theme=", marked)
        # soffice Ä‘Ã£ ghi chá»§ Ä‘á» máº·c Ä‘á»‹nh riÃªng
        converted = self._package()
        converted = patcher.patch_ooxml_zip(converted, {"ppt/theme/theme1.xml": '<a:theme name="LibreOffice"/>'.encode("utf-8")})
        restored = patcher._restore_slides_source_theme(converted, marked, None)
        self.assertEqual(list(restored), ["ppt/theme/theme1.xml"])
        self.assertIn('name="Office"', restored["ppt/theme/theme1.xml"])

    def test_a_theme_chosen_in_vn_is_not_overwritten(self):
        pptx = self._package()
        marked = patcher.overlay_fodp_source_theme(
            '<office:document xmlns:office="o" xmlns:draw="d" xmlns:style="s"><style:master-page style:name="Standard"/></office:document>', pptx
        )
        self.assertEqual(patcher._restore_slides_source_theme(pptx, marked, {"id": "corporate-red"}), {})


def _master_package(prefix: str, logo: bool, layouts: int) -> bytes:
    buffer = io.BytesIO()
    types = ['<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>', '<Default Extension="xml" ContentType="application/xml"/>', '<Default Extension="png" ContentType="image/png"/>']
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as package:
        package.writestr("ppt/presentation.xml", f'<p:presentation {P_NS}><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst><p:sldId id="256" r:id="rId10"/><p:sldId id="257" r:id="rId11"/></p:sldIdLst></p:presentation>')
        package.writestr(
            "ppt/_rels/presentation.xml.rels",
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>'
            '<Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>'
            '<Relationship Id="rId11" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide2.xml"/></Relationships>',
        )
        package.writestr("ppt/slideMasters/slideMaster1.xml", f"<p:sldMaster>{prefix}</p:sldMaster>")
        master_rels = "".join(
            f'<Relationship Id="rId{i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout{i}.xml"/>' for i in range(1, layouts + 1)
        )
        master_rels += f'<Relationship Id="rId{layouts + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>'
        if logo:
            master_rels += f'<Relationship Id="rId{layouts + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>'
            package.writestr("ppt/media/image1.png", b"\x89PNG-logo")
        package.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{master_rels}</Relationships>')
        for i in range(1, layouts + 1):
            kind = "obj" if i == 2 else "title"
            package.writestr(f"ppt/slideLayouts/slideLayout{i}.xml", f'<p:sldLayout type="{kind}">{prefix}{i}</p:sldLayout>')
            package.writestr(
                f"ppt/slideLayouts/_rels/slideLayout{i}.xml.rels",
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>',
            )
            types.append(f'<Override PartName="/ppt/slideLayouts/slideLayout{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>')
        package.writestr("ppt/theme/theme1.xml", f'<a:theme name="{prefix}"/>')
        types.append('<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>')
        types.append('<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>')
        for n in (1, 2):
            package.writestr(f"ppt/slides/slide{n}.xml", _slide(""))
            package.writestr(
                f"ppt/slides/_rels/slide{n}.xml.rels",
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>',
            )
        package.writestr("[Content_Types].xml", f'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">{"".join(types)}</Types>')
    return buffer.getvalue()


def _deck_with_picture(label: str, with_image: bool) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as package:
        package.writestr("_rels/.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>')
        package.writestr("ppt/presentation.xml", f'<p:presentation {P_NS}><p:sldIdLst><p:sldId id="256" r:id="rId10"/></p:sldIdLst></p:presentation>')
        package.writestr(
            "ppt/_rels/presentation.xml.rels",
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId10" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>',
        )
        package.writestr("ppt/slides/slide1.xml", _slide(f"<!--{label}-->"))
        rels = '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
        if with_image:
            rels += '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>'
            package.writestr("ppt/media/image1.png", b"IMG-" + label.encode())
        else:
            package.writestr("ppt/media/image1.png", b"IMG-CONVERTED-ORPHAN")
            rels += '<Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>'
        rels += '<Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide1.xml"/>' if not with_image else ""
        package.writestr("ppt/slides/_rels/slide1.xml.rels", f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">{rels}</Relationships>')
        package.writestr("ppt/slideLayouts/slideLayout1.xml", "<p:sldLayout/>")
        package.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>')
        if not with_image:
            package.writestr("ppt/notesSlides/notesSlide1.xml", "<p:notes/>")
            package.writestr("ppt/notesSlides/_rels/notesSlide1.xml.rels", '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>')
        ct = ('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
              '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
              + ('<Default ContentType="image/png" Extension="png"/>')
              + '<Override ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml" PartName="/ppt/slides/slide1.xml"/>'
              + '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/></Types>')
        package.writestr("[Content_Types].xml", ct)
    return buffer.getvalue()


class UntouchedSlideTests(unittest.TestCase):
    def test_overlay_stamps_the_source_slide_path(self):
        marked = patcher.overlay_fodp_source_slides(_fodp(1), _deck_with_picture("SRC", True))
        self.assertEqual(patcher._slides_page_attr_list(marked, "vno:src-slide"), ["ppt/slides/slide1.xml"])

    def test_untouched_slide_gets_its_original_xml_and_pictures_back(self):
        source = _deck_with_picture("SRC", True)
        converted = _deck_with_picture("SOFFICE", False)
        fodp = _fodp(1, [' vno:src-slide="ppt/slides/slide1.xml" vno:src-untouched="ppt/slides/slide1.xml"'])
        out = patcher._restore_untouched_slides(converted, source, fodp)
        with zipfile.ZipFile(io.BytesIO(out)) as package:
            self.assertIn("<!--SRC-->", package.read("ppt/slides/slide1.xml").decode())
            rels = package.read("ppt/slides/_rels/slide1.xml.rels").decode()
            self.assertIn("slideLayout1.xml", rels)
            self.assertIn("notesSlide1.xml", rels)  # ghi chú của bản chuyển đổi được giữ
            self.assertEqual(rels.count("relationships/image"), 1)
            images = {n: package.read(n) for n in package.namelist() if n.startswith("ppt/media/")}
            self.assertTrue(any(data == b"IMG-SRC" for data in images.values()), "ảnh gốc phải được chép lại")
            self.assertTrue(all(b"ORPHAN" not in data for data in images.values()), "ảnh mồ côi của bản dựng lại phải bị dọn")
            content_types = package.read("[Content_Types].xml").decode()
            self.assertIn("png", content_types)

    def test_only_flagged_slides_are_replaced(self):
        source = _deck_with_picture("SRC", True)
        converted = _deck_with_picture("SOFFICE", False)
        fodp = _fodp(1, [' vno:src-slide="ppt/slides/slide1.xml"'])
        self.assertEqual(patcher._restore_untouched_slides(converted, source, fodp), converted)

    def test_a_slide_with_comments_in_the_source_is_not_restored(self):
        source = _deck_with_picture("SRC", True)
        source = patcher.patch_ooxml_zip(source, {
            "ppt/slides/_rels/slide1.xml.rels": ('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                                                 '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>'
                                                 '<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="../comments/comment1.xml"/></Relationships>').encode()
        })
        converted = _deck_with_picture("SOFFICE", False)
        fodp = _fodp(1, [' vno:src-slide="ppt/slides/slide1.xml" vno:src-untouched="ppt/slides/slide1.xml"'])
        self.assertEqual(patcher._restore_untouched_slides(converted, source, fodp), converted)


class SourceMasterTests(unittest.TestCase):
    def test_overlay_records_the_layout_each_slide_used(self):
        source = _master_package("SRC", True, 3)
        # slide 2 của tệp gốc dùng bố cục 3
        source = patcher.patch_ooxml_zip(source, {"ppt/slides/_rels/slide2.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout3.xml"/></Relationships>'.encode()})
        marked = patcher.overlay_fodp_source_layouts(_fodp(2), source)
        self.assertEqual(patcher._slides_page_attr_list(marked, "vno:src-layout"), ["ppt/slideLayouts/slideLayout1.xml", "ppt/slideLayouts/slideLayout3.xml"])

    def test_masters_layouts_theme_and_logo_are_restored_and_slides_repointed(self):
        source = _master_package("SRC", True, 3)
        converted = _master_package("SOFFICE", False, 1)
        fodp = _fodp(2, [' vno:src-layout="ppt/slideLayouts/slideLayout2.xml"', ' vno:src-layout="ppt/slideLayouts/slideLayout3.xml"'])
        out = patcher._restore_source_masters(converted, source, fodp, None)
        with zipfile.ZipFile(io.BytesIO(out)) as package:
            names = package.namelist()
            self.assertIn(b"SRC", package.read("ppt/slideMasters/slideMaster1.xml"))
            self.assertEqual(sorted(n for n in names if re.fullmatch(r"ppt/slideLayouts/slideLayout\d+\.xml", n)), [f"ppt/slideLayouts/slideLayout{i}.xml" for i in (1, 2, 3)])
            self.assertIn(b"SRC3", package.read("ppt/slideLayouts/slideLayout3.xml"))
            self.assertIn("ppt/media/image1.png", names)  # logo của bản cái gốc
            self.assertIn("slideLayout2.xml", package.read("ppt/slides/_rels/slide1.xml.rels").decode())
            self.assertIn("slideLayout3.xml", package.read("ppt/slides/_rels/slide2.xml.rels").decode())
            content_types = package.read("[Content_Types].xml").decode()
            self.assertEqual(content_types.count('PartName="/ppt/slideLayouts/slideLayout3.xml"'), 1)
            self.assertIn('Extension="png"', content_types)
            pres_rels = package.read("ppt/_rels/presentation.xml.rels").decode()
            self.assertEqual(pres_rels.count("relationships/slideMaster\""), 1)
            self.assertIn("rIdVnoM1", pres_rels)
            self.assertIn('r:id="rIdVnoM1"', package.read("ppt/presentation.xml").decode())
            self.assertTrue(any(re.fullmatch(r"ppt/theme/theme1\d\d\.xml", n) for n in names))

    def test_content_types_with_contenttype_before_partname_are_still_copied(self):
        # Google Slides ghi ContentType trước PartName: nếu không đọc được, master/layout/theme rơi về application/xml và PowerPoint từ chối mở.
        source = _master_package("SRC", True, 3)
        with zipfile.ZipFile(io.BytesIO(source)) as package:
            original_ct = package.read("[Content_Types].xml").decode()
        swapped = re.sub(r'<Override PartName="([^"]+)" ContentType="([^"]+)"/>', r'<Override ContentType="\2" PartName="\1"/>', original_ct)
        self.assertNotEqual(swapped, original_ct)
        source = patcher.patch_ooxml_zip(source, {"[Content_Types].xml": swapped.encode()})
        converted = _master_package("SOFFICE", False, 1)
        fodp = _fodp(2, [' vno:src-layout="ppt/slideLayouts/slideLayout2.xml"'] * 2)
        out = patcher._restore_source_masters(converted, source, fodp, None)
        self.assertNotEqual(out, converted)
        with zipfile.ZipFile(io.BytesIO(out)) as package:
            content_types = package.read("[Content_Types].xml").decode()
        for part in ("ppt/slideMasters/slideMaster1.xml", "ppt/slideLayouts/slideLayout3.xml"):
            self.assertIn(f'PartName="/{part}"', content_types)

    def test_a_vn_theme_choice_or_missing_source_keeps_the_converted_package(self):
        source = _master_package("SRC", True, 3)
        converted = _master_package("SOFFICE", False, 1)
        fodp = _fodp(2, [' vno:src-layout="ppt/slideLayouts/slideLayout2.xml"'] * 2)
        self.assertEqual(patcher._restore_source_masters(converted, source, fodp, {"id": "corporate-red"}), converted)
        self.assertEqual(patcher._restore_source_masters(converted, None, fodp, None), converted)
        self.assertEqual(patcher._restore_source_masters(converted, source, _fodp(2), None), converted)

if __name__ == "__main__":
    unittest.main()
