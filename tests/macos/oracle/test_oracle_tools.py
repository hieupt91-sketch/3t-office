"""Unit tests for the ORACLE-1 tooling. None of these talk to Office or LibreOffice."""

from __future__ import annotations

import json
import random
import struct
import sys
import zipfile
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
sys.path.insert(0, str(HERE))

import excel_eval  # noqa: E402
import font_audit  # noqa: E402
import lo_pages  # noqa: E402
import oracle_common as oc  # noqa: E402
import ppt_stats  # noqa: E402
import word_stats  # noqa: E402


# --- AppleScript result parsing -------------------------------------------------------------

def test_parse_applescript_lists_strings_numbers():
    text = '{{"n", 1.047197551197, 6.5976E-14}, {"s", "a\\"b\\\\c"}, {"b", true}, {"e", 7}, {}, missing value, -3}'
    value = oc.parse_applescript(text)
    assert value[0] == ["n", 1.047197551197, 6.5976e-14]
    assert value[1] == ["s", 'a"b\\c']
    assert value[2] == ["b", True]
    assert value[3] == ["e", 7]
    assert value[4] == []
    assert value[5] is oc.MISSING
    assert value[6] == -3


def test_parse_applescript_does_not_read_list_comma_as_decimal():
    assert oc.parse_applescript("{1,2}") == [1, 2]
    assert oc.parse_applescript("{1.5, 1.0E+20}") == [1.5, 1e20]


def test_parse_applescript_rejects_trailing_garbage():
    with pytest.raises(ValueError):
        oc.parse_applescript('{"a"} junk')


def test_recombine_real_restores_full_double_precision():
    rng = random.Random(2410)
    for _ in range(20000):
        r = rng.uniform(-1, 1) * 10 ** rng.randint(-30, 30)
        hi = float(f"{r:.12g}")             # AppleScript prints 12 significant digits
        printed_hi, printed_res = f"{hi:.12g}", f"{r - hi:.12g}"
        assert oc.recombine_real(printed_hi, printed_res) == r


def test_decode_cell_vocabulary_matches_golden_types():
    assert oc.decode_cell(["n", 3, 0]) == {"type": "number", "value": 3.0}
    assert oc.decode_cell(["s", "x"]) == {"type": "string", "value": "x"}
    assert oc.decode_cell(["b", False]) == {"type": "boolean", "value": False}
    assert oc.decode_cell(["e", 7]) == {"type": "error", "value": "#N/A"}
    assert oc.decode_cell(["e", 2]) == {"type": "error", "value": "#DIV/0!"}
    assert oc.decode_cell(["v", -2146826259]) == {"type": "error", "value": "#NAME?"}
    assert oc.decode_cell(["a", [["n", 1, 0], ["s", "b"]]]) == {"type": "array", "value": [1.0, "b"]}
    assert oc.decode_cell(["x", "boom (-50)"])["type"] == "exception"


def test_classify_osascript_errors():
    assert oc.classify_osascript_error("execution error: Not authorized to send Apple events to Microsoft Excel. (-1743)") == ("not-authorized", -1743)
    assert oc.classify_osascript_error("42:46: execution error: Microsoft Excel gặp lỗi: AppleEvent hết thời gian chờ. (-1712)") == ("timeout", -1712)
    assert oc.classify_osascript_error("weird")[0] == "error"


def test_office_only_guard():
    oc.assert_office_only('tell application "Microsoft Excel" to get version')
    for bad in ('tell application "System Events" to keystroke "a"',
                'tell application "Finder" to get name',
                'tell application "Microsoft Word"\nkeystroke "x"\nend tell'):
        with pytest.raises(ValueError):
            oc.assert_office_only(bad)


# --- excel_eval -----------------------------------------------------------------------------

def test_excel_script_only_targets_excel_and_types_cells():
    spec = {"cells": {"A1": 1, "B1": 2.5, "C1": "5", "D1": True, "E1": ""}, "sheets": {"Sheet 4": {"A1": 9}},
            "formulas": ["=SUM(A1:B1)", {"f": "=PMT(0.1,2,3)", "tol": 1e-6}]}
    script = excel_eval.build_script(spec)
    oc.assert_office_only(script)
    assert 'set value of range "A1" of ws to 1' in script
    assert 'set value of range "B1" of ws to 2.5' in script
    assert 'set number format of range "C1" of ws to "@"' in script  # text "5" stays text
    assert 'set value of range "D1" of ws to true' in script
    assert 'range "E1"' not in script                                 # empty cell left empty
    assert 'set name of ws2 to "Sheet 4"' in script
    assert 'my evalOne("=PMT(0.1,2,3)", "=ERROR.TYPE(PMT(0.1,2,3))")' in script
    assert "close wb saving no" in script


def test_excel_decode_results_keeps_tol_array_and_cverr():
    spec = {"formulas": ["=1/0", {"f": "=MMULT(A1:B2,C1:D2)", "array": True}, {"f": "=RATE(1,2,3)", "tol": 1e-7}]}
    raw = [["e", 2], ["a", [["n", 1, 0], ["n", -2146826246, 0]]], ["n", 0.5, 0]]
    cases = excel_eval.decode_results(raw, spec)
    assert cases[0] == {"formula": "=1/0", "excel": "#DIV/0!", "type": "error"}
    assert cases[1] == {"formula": "=MMULT(A1:B2,C1:D2)", "excel": [1.0, "#N/A"], "type": "array", "array": True}
    assert cases[2]["tol"] == 1e-7
    with pytest.raises(ValueError):
        excel_eval.decode_results(raw[:1], spec)


def test_excel_golden_has_windows_golden_structure():
    win = json.loads((REPO / "tests/functions/golden-batch1-math.json").read_text(encoding="utf-8"))
    spec = json.loads((REPO / "tests/functions/cases-batch1-math.json").read_text(encoding="utf-8"))
    golden = excel_eval.make_golden(spec, [{"formula": "=1", "excel": 1.0, "type": "number"}], "16.114.1", 1.0)
    assert golden["generatedFrom"].startswith("Excel for Mac 16.114.1")
    assert set(win) <= set(golden)
    assert excel_eval.golden_name(Path("tests/functions/cases-batch1-math.json")) == "golden-batch1-math.json"


# --- Word / PowerPoint ----------------------------------------------------------------------

def test_word_and_ppt_scripts_are_read_only_and_parse(tmp_path):
    w = word_stats.build_script(tmp_path / "a.docx")
    p = ppt_stats.build_script(tmp_path / "a.pptx", tmp_path / "a.pdf")
    for script in (w, p):
        oc.assert_office_only(script)
        assert "saving no" in script
    assert "read only true" in w and "statistic pages" in w
    assert "save as PDF" in p
    assert word_stats.parse_result("{3, 40, 512, 41, 0}") == {"pages": 3, "paragraphs": 40, "words": 512, "paragraphObjects": 41}
    assert ppt_stats.parse_result("{12, 1}") == {"slides": 12, "hiddenSlides": 1}


def test_stage_copy_never_touches_source(tmp_path):
    src = tmp_path / "doc.docx"
    src.write_bytes(b"PK-original")
    staged = oc.stage_copy(src, tmp_path / "staging")
    assert staged.read_bytes() == b"PK-original" and staged != src
    oc.unstage(staged)
    assert not staged.exists() and src.read_bytes() == b"PK-original"


# --- fonts / LibreOffice side ---------------------------------------------------------------

def _mini_font(family: str) -> bytes:
    name = family.encode("utf-16-be")
    name_table = struct.pack(">HHH", 0, 1, 18) + struct.pack(">HHHHHH", 3, 1, 0x409, 1, len(name), 0) + name
    header = struct.pack(">IHHHH", 0x00010000, 1, 0, 0, 0)
    record = struct.pack(">4sIII", b"name", 0, 12 + 16, len(name_table))
    return header + record + name_table


def test_font_name_table_reader(tmp_path):
    f = tmp_path / "x.ttf"
    f.write_bytes(_mini_font("Phông Thử"))
    assert font_audit.font_file_families(f) == {"Phông Thử"}
    assert font_audit.dir_families([tmp_path]) == {"Phông Thử"}


def test_font_classification_and_reference_scan(tmp_path):
    pkg = tmp_path / "t.docx"
    with zipfile.ZipFile(pkg, "w") as z:
        z.writestr("word/document.xml", '<w:rFonts w:ascii="Calibri" w:hAnsi="+mn-lt"/><w:lang w:eastAsia="zh-CN"/>')
        z.writestr("word/fontTable.xml", '<w:font w:name="Times New Roman"/>')
        z.writestr("word/theme/theme1.xml", '<a:latin typeface="Aptos"/><a:font script="Jpan" typeface="MS Gothic"/>')
    refs = font_audit.referenced_fonts(pkg)
    assert refs == ["Aptos", "Calibri", "Times New Roman"]   # no theme placeholder, no lang tag, no script fallback
    c = font_audit.classify(refs, system={"Times New Roman"}, office={"Calibri", "Aptos"}, lo={"Carlito"})
    assert c["missingFor3T"] == ["Aptos", "Calibri"] and c["missingForOffice"] == []
    assert c["officeBundledOnly"] == ["Aptos", "Calibri"]


def test_pdf_page_count_and_pptx_structure(tmp_path):
    pdf = tmp_path / "x.pdf"
    pdf.write_bytes(b"%PDF-1.4\n1 0 obj<</Type/Pages/Count 2/Kids[2 0 R 3 0 R]>>endobj\n"
                    b"2 0 obj<</Type/Page>>endobj\n3 0 obj<</Type /Page>>endobj\n%%EOF")
    assert lo_pages.pdf_page_count(pdf) == (2, "fast_pdf_page_count")
    struct_ = lo_pages.pptx_structure(REPO / "tests/fixtures/real-office-samples/sample-slides-notes.pptx")
    assert struct_ == {"structSlides": 3, "structHidden": 0}


def test_lo_pages_refuses_pdf_output_inside_repo(tmp_path):
    fake = tmp_path / "soffice"
    fake.write_text("#!/bin/sh\nexit 0\n")
    fake.chmod(0o755)
    rc = lo_pages.main([str(REPO / "tests/fixtures/real-office-samples/sample-writer.docx"), "--soffice", str(fake),
                        "--work-dir", str(REPO / "tests/macos/oracle/_tmp")])
    assert rc == 2 and not (REPO / "tests/macos/oracle/_tmp").exists()
