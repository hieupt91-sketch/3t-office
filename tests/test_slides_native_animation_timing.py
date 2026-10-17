"""Hoạt ảnh Slides nhóm Nhấn mạnh / Thoát: p:timing được dựng lại theo cấu trúc PowerPoint."""
from __future__ import annotations

import io
import re
import unittest
import zipfile
import xml.etree.ElementTree as ET

import main

patcher = main._ooxml_zip_patch()
P = "http://schemas.openxmlformats.org/presentationml/2006/main"
PFX = "{" + P + "}"


def soffice_effect(ctn_id: int, node: str, preset_class: str, preset_id: str, spid: int, dur: int = 1000, sub: str = "") -> str:
    subtype = f' presetSubtype="{sub}"' if sub else ""
    return (
        f'<p:par><p:cTn id="{ctn_id}" presetID="{preset_id}" presetClass="{preset_class}" fill="hold" nodeType="{node}"{subtype}>'
        '<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>'
        f'<p:animEffect transition="in" filter="fade"><p:cBhvr><p:cTn id="{ctn_id + 1}" dur="{dur}"/>'
        f'<p:tgtEl><p:spTgt spid="{spid}"></p:spTgt></p:tgtEl></p:cBhvr></p:animEffect></p:childTnLst></p:cTn></p:par>'
    )


def make_slide(effects: list[str], shape_ids=(4, 5, 6)) -> str:
    shapes = "".join(
        f'<p:sp><p:nvSpPr><p:cNvPr id="{i}" name="s{i}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr/></p:sp>' for i in shape_ids
    )
    groups = "".join(
        f'<p:par><p:cTn id="{100 + n}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>{e}</p:childTnLst></p:cTn></p:par>'
        for n, e in enumerate(effects)
    )
    return (
        f'<p:sld xmlns:p="{P}"><p:cSld><p:spTree>{shapes}</p:spTree></p:cSld>'
        '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
        f'<p:seq><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>{groups}</p:childTnLst></p:cTn></p:seq>'
        '</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing></p:sld>'
    )


def make_pptx(slide_xml: str) -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as package:
        package.writestr("ppt/slides/slide1.xml", slide_xml)
    return buffer.getvalue()


def run(effects, shape_ids=(4, 5, 6), fodp=None):
    pptx = make_pptx(make_slide(effects, shape_ids))
    return patcher._apply_slides_native_animation_timing(pptx, fodp, None)


class NativeAnimationTimingTests(unittest.TestCase):
    def test_fly_preset_subtype_controls_all_four_directions(self):
        for subtype, expected_attr, expected_from in (
            ("1", "ppt_y", "-1-#ppt_h/2"),
            ("2", "ppt_x", "1+#ppt_w/2"),
            ("4", "ppt_y", "1+#ppt_h/2"),
            ("8", "ppt_x", "-1-#ppt_w/2"),
        ):
            with self.subTest(subtype=subtype):
                body = patcher._anim_effect_xml("entr", "2", subtype, "4", 500, iter(range(3, 30)).__next__, True)
                self.assertIn(f"<p:attrName>{expected_attr}</p:attrName>", body)
                self.assertIn(f'<p:strVal val="{expected_from}"/>', body)

    def test_entrance_only_slide_is_rebuilt_and_with_effect_joins_its_click_group(self):
        # Trước đây slide chỉ có hiệu ứng Vào đi đường cũ: hiệu ứng «cùng lúc» nằm riêng một nhóm nhấp chuột
        # và hộp chữ thiếu bldP nên PowerPoint đọc thành 3 hiệu ứng rỗng (đo bằng bộ slide thử 17/10).
        result = run([
            soffice_effect(10, "clickEffect", "entr", "10", 4),
            soffice_effect(20, "withEffect", "entr", "10", 5),
        ])
        root = ET.fromstring(result["ppt/slides/slide1.xml"])
        effects = [n for n in root.iter(PFX + "cTn") if n.get("presetClass")]
        self.assertEqual([n.get("nodeType") for n in effects], ["clickEffect", "withEffect"])
        click_groups = [
            n for n in root.iter(PFX + "cTn")
            if any(c.get("delay") == "indefinite" for c in n.iter(PFX + "cond"))
            and n.get("nodeType") is None and n.find(PFX + "stCondLst") is not None
            and n.find(PFX + "stCondLst").find(PFX + "cond") is not None
            and n.find(PFX + "stCondLst").find(PFX + "cond").get("delay") == "indefinite"
        ]
        self.assertEqual(len(click_groups), 1, "chỉ một nhóm nhấp chuột chứa cả hai hiệu ứng")
        self.assertEqual({b.get("spid") for b in root.iter(PFX + "bldP")}, {"4", "5"})

    def test_emphasis_and_exit_are_rebuilt_in_powerpoint_structure(self):
        result = run([
            soffice_effect(10, "clickEffect", "entr", "10", 4),
            soffice_effect(20, "afterEffect", "emph", "8", 5, 2000),
            soffice_effect(30, "afterEffect", "exit", "10", 6, 500),
        ])
        xml = result["ppt/slides/slide1.xml"]
        root = ET.fromstring(xml)
        ids = [n.get("id") for n in root.iter(PFX + "cTn")]
        self.assertEqual(len(ids), len(set(ids)), "id cTn phải duy nhất")
        effects = [n for n in root.iter(PFX + "cTn") if n.get("presetClass")]
        self.assertEqual([(n.get("presetClass"), n.get("presetID")) for n in effects], [("entr", "10"), ("emph", "8"), ("exit", "10")])
        self.assertEqual([n.get("nodeType") for n in effects], ["clickEffect", "afterEffect", "afterEffect"])
        self.assertEqual({n.get("grpId") for n in effects}, {"0"})
        # khe thời gian: afterEffect bắt đầu khi hiệu ứng trước kết thúc (1000 ms, rồi +2000 ms)
        slot_delays = [c.get("delay") for c in root.iter(PFX + "cond") if c.get("delay") not in (None, "0", "indefinite", "499")]
        self.assertIn("1000", slot_delays)
        self.assertIn("3000", slot_delays)
        self.assertIn('<p:animRot by="21600000">', xml)
        self.assertIn('<p:animEffect transition="out" filter="fade">', xml)
        self.assertIn('<p:strVal val="hidden"/>', xml)
        self.assertEqual(sorted(re.findall(r'<p:bldP spid="(\d+)"', xml)), ["4", "5", "6"])
        self.assertIn('evt="onPrev"', xml)
        self.assertIn('evt="onNext"', xml)

    def test_two_effects_on_one_shape_get_distinct_grpid_and_bld_entries(self):
        # PowerPoint đánh grpId 0, 1... cho các hiệu ứng trên cùng một hình và liệt kê từng cặp trong bldLst;
        # dùng grpId 0 cho cả hai làm PowerPoint bỏ hiệu ứng thứ hai (đo bằng COM 18/10).
        result = run([
            soffice_effect(10, "clickEffect", "entr", "10", 4),
            soffice_effect(20, "clickEffect", "exit", "10", 4),
        ])
        xml = result["ppt/slides/slide1.xml"]
        root = ET.fromstring(xml)
        effects = [n for n in root.iter(PFX + "cTn") if n.get("presetClass")]
        self.assertEqual([n.get("grpId") for n in effects], ["0", "1"])
        self.assertEqual(re.findall(r'<p:bldP spid="4" grpId="(\d+)"', xml), ["0", "1"])

    def test_with_previous_joins_the_same_time_slot(self):
        result = run([
            soffice_effect(10, "clickEffect", "emph", "6", 4, 1000),
            soffice_effect(20, "withEffect", "exit", "1", 5, 1),
        ])
        xml = result["ppt/slides/slide1.xml"]
        root = ET.fromstring(xml)
        slots = [n for n in root.iter(PFX + "cTn") if n.get("fill") == "hold" and not n.get("presetClass") and n.find(PFX + "childTnLst") is not None and n.find(PFX + "stCondLst") is not None
                 and any(c.get("delay") == "0" for c in n.find(PFX + "stCondLst"))]
        effects = [n for n in root.iter(PFX + "cTn") if n.get("presetClass")]
        self.assertEqual([n.get("nodeType") for n in effects], ["clickEffect", "withEffect"])
        self.assertEqual(len(slots), 1, "withEffect phải nằm chung khe thời gian với hiệu ứng trước")

    def test_user_delay_from_fodp_is_written_on_the_effect(self):
        fodp = (
            '<draw:page><anim:par smil:begin="indefinite"><anim:par smil:begin="0.4s" presentation:preset-class="exit" presentation:preset-id="ooo-exit-fade-out"></anim:par></anim:par></draw:page>'
        )
        xml = run([soffice_effect(10, "clickEffect", "exit", "10", 4, 500)], fodp=fodp)["ppt/slides/slide1.xml"]
        self.assertRegex(xml, r'nodeType="clickEffect"><p:stCondLst><p:cond delay="400"/>')

    def test_effect_that_cannot_be_rebuilt_leaves_the_slide_untouched(self):
        # presetID lạ (không có mẫu PowerPoint) -> không đụng vào, tránh làm hỏng hiệu ứng soffice đã ghi
        self.assertEqual(run([soffice_effect(10, "clickEffect", "emph", "77", 4)]), {})

    def test_auto_start_first_effect_gets_on_begin_condition(self):
        xml = run([soffice_effect(10, "afterEffect", "exit", "10", 4)])["ppt/slides/slide1.xml"]
        self.assertIn('<p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond>', xml)

    def test_text_paragraph_targets_are_not_rebuilt(self):
        effect = soffice_effect(10, "clickEffect", "exit", "10", 4).replace("</p:spTgt>", "<p:txEl><p:pRg st=\"0\" end=\"0\"/></p:txEl></p:spTgt>")
        self.assertEqual(run([effect]), {})


if __name__ == "__main__":
    unittest.main()
