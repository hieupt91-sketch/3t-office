# -*- coding: utf-8 -*-
"""tests/test_parity_harness.py — Bo kiem thu unit (pytest) cho khung cong doi chieu (parity gate) W2.

Kiem thu:
  1. Zip comparison (zip_compare, read_zip_map): phat hien phan them, bot, sua, giu nguyen.
  2. Canonical XML digest (c14n_digest, c14n_of_changed): chuan hoa XML, xac nhan sha256 giong nhau khi thuoc tinh dao thu tu.
  3. Excel dump map & diff (excel_dump_map, excel_diff, edited_xlsx_cell, a1_of):
     - tinh dung lech value, formula, numberformat, type, only_orig, only_other.
     - loai tru chinh xac o duoc sua (exclude cell).
  4. Word structural diff (word_diff): so sanh pages, paragraphs, tables, shapes, textSha256.
  5. PowerPoint structural diff (pptx_diff): so sanh slides, shapes, notesSha256.
  6. CLI JSON parser (parse_cli_json): trich xuat JSON tu dong stdout.
  7. Formatters (fmt_excel, fmt_struct, worst_excel_label): xuat chuoi bao cao chuan.
"""

from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path
from typing import Any

import pytest

from tools.parity.compare import (
    a1_of,
    c14n_digest,
    c14n_of_changed,
    edited_xlsx_cell,
    excel_diff,
    excel_dump_map,
    fmt_excel,
    fmt_struct,
    parse_cli_json,
    pptx_diff,
    read_zip_map,
    word_diff,
    worst_excel_label,
    zip_compare,
)


def _make_zip(files: dict[str, bytes]) -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, content in files.items():
            z.writestr(name, content)
    return buf.getvalue()


def test_zip_compare(tmp_path: Path):
    orig_bytes = _make_zip({
        "mimetype": b"application/vnd.openxmlformats",
        "docProps/core.xml": b"<core>hello</core>",
        "xl/workbook.xml": b"<wb>1</wb>",
        "xl/worksheets/sheet1.xml": b"<sheet>data1</sheet>",
    })
    mod_bytes = _make_zip({
        "mimetype": b"application/vnd.openxmlformats",
        "docProps/core.xml": b"<core>hello</core>",
        "xl/workbook.xml": b"<wb>2</wb>",  # changed
        "xl/drawings/drawing1.xml": b"<drawing/>",  # added
        # sheet1.xml missing
    })
    orig_file = tmp_path / "orig.zip"
    mod_file = tmp_path / "mod.zip"
    orig_file.write_bytes(orig_bytes)
    mod_file.write_bytes(mod_bytes)

    res = zip_compare(orig_file, mod_file)
    assert res["ok"] is True
    assert res["parts"] == 4
    assert res["sameParts"] == 2  # mimetype, core.xml
    assert res["changed"] == ["xl/workbook.xml"]
    assert res["added"] == ["xl/drawings/drawing1.xml"]
    assert res["missing"] == ["xl/worksheets/sheet1.xml"]


def test_c14n_digest_and_of_changed(tmp_path: Path):
    xml1 = b"<root b='2' a='1'><child>text</child></root>"
    xml2 = b"<root a='1' b='2'><child>text</child></root>"
    xml3 = b"<root a='1' b='2'><child>different</child></root>"

    d1 = c14n_digest(xml1)
    d2 = c14n_digest(xml2)
    d3 = c14n_digest(xml3)

    assert d1 is not None and d2 is not None and d3 is not None
    assert d1 == d2, "c14n phai cho sha256 giong nhau khi chi dao thu tu thuoc tinh"
    assert d1 != d3, "c14n phai khac khi noi dung con thay doi"

    f1 = tmp_path / "f1.zip"
    f2 = tmp_path / "f2.zip"
    f1.write_bytes(_make_zip({"part.xml": xml1}))
    f2.write_bytes(_make_zip({"part.xml": xml2}))

    c14n_res = c14n_of_changed(f1, f2)
    assert c14n_res["ok"] is True
    assert c14n_res["compared"] == 1
    assert c14n_res["equal"] == 1
    assert c14n_res["diff"] == 0


def test_excel_dump_and_diff():
    # Dump row: [sheet, row, col, type, val, formula, numfmt]
    orig_oracle = {
        "status": "PASS",
        "sheets": 1,
        "cells": 3,
        "dump": [
            [1, 1, 1, "s", "Title", "Title", "General"],
            [1, 2, 1, "d", "100", "=A1*2", "0.00"],
            [1, 3, 1, "s", "Old", "Old", "General"],
        ],
    }
    same_oracle = {
        "status": "PASS",
        "sheets": 1,
        "cells": 3,
        "dump": [
            [1, 1, 1, "s", "Title", "Title", "General"],
            [1, 2, 1, "d", "100", "=A1*2", "0.00"],
            [1, 3, 1, "s", "Old", "Old", "General"],
        ],
    }
    diff_oracle = {
        "status": "PASS",
        "sheets": 1,
        "cells": 4,
        "dump": [
            [1, 1, 1, "s", "Title", "Title", "General"],
            [1, 2, 1, "d", "200", "=A1*2", "0.00"],  # value lech
            [1, 3, 1, "s", "New", "New", "General"],  # value + formula lech
            [1, 4, 1, "s", "Extra", "Extra", "General"],  # only_other
        ],
    }

    # 1. 0 diff
    d0 = excel_diff(orig_oracle, same_oracle)
    assert d0["value"] == 0
    assert d0["formula"] == 0
    assert d0["numberformat"] == 0
    assert d0["only_orig"] == 0
    assert d0["only_other"] == 0
    assert worst_excel_label(d0) == "khac=0"
    assert fmt_excel(d0) == "0 lech"

    # 2. Has diffs
    d1 = excel_diff(orig_oracle, diff_oracle)
    assert d1["value"] == 2
    assert d1["formula"] == 1
    assert d1["only_other"] == 1
    assert "lech" in fmt_excel(d1)

    # 3. Exclude cell (1, 3, 1)
    d_exc = excel_diff(orig_oracle, diff_oracle, exclude=(1, 3, 1))
    assert d_exc["expectedExcluded"] == 1
    assert d_exc["value"] == 1  # chi con o (1, 2, 1)


def test_edited_xlsx_cell_and_a1():
    assert edited_xlsx_cell({"edit_info": {"editedCell": "A433"}}) == (1, 433, 1)
    assert edited_xlsx_cell({"edit_info": {"editedCell": "B10"}}) == (1, 10, 2)
    assert edited_xlsx_cell({"edit_info": {"editedCell": "AA5"}}) == (1, 5, 27)
    assert edited_xlsx_cell({}) == (1, 1, 1)

    assert a1_of((1, 433, 1)) == "A433"
    assert a1_of((1, 10, 2)) == "B10"
    assert a1_of((1, 5, 27)) == "AA5"


def test_word_diff():
    orig_word = {
        "status": "PASS",
        "pages": 19,
        "paragraphs": 709,
        "tables": 7,
        "inlineShapes": 0,
        "shapes": 0,
        "sections": 1,
        "headers_nonempty": 3,
        "footers_nonempty": 3,
        "textSha256": "abc123sha",
    }
    same_word = dict(orig_word)
    d0 = word_diff(orig_word, same_word, text_sha_excluded=False)
    assert d0["structDiffs"] == 0
    assert fmt_struct(d0) == "0 lech"

    mod_word = dict(orig_word)
    mod_word["paragraphs"] = 710
    mod_word["textSha256"] = "different_sha"

    # Khi text_sha_excluded=True (che do OOXMLKit thay chu): chi dem structural
    d_ooxml = word_diff(orig_word, mod_word, text_sha_excluded=True)
    assert d_ooxml["structDiffs"] == 1
    assert d_ooxml["paragraphs"] == -1
    assert "textSha256" not in d_ooxml

    # Khi text_sha_excluded=False: dem ca sha
    d_lo = word_diff(orig_word, mod_word, text_sha_excluded=False)
    assert d_lo["structDiffs"] == 2
    assert d_lo["textSha256"] == 1


def test_pptx_diff():
    orig_ppt = {
        "status": "PASS",
        "slides": 10,
        "shapesTotal": 30,
        "pictures": 17,
        "charts": 0,
        "textShapes": 4,
        "withTitle": 4,
        "withNotes": 0,
        "notesTextSha256": "",
    }
    same_ppt = dict(orig_ppt)
    d0 = pptx_diff(orig_ppt, same_ppt, notes_sha_excluded=False)
    assert d0["structDiffs"] == 0
    assert fmt_struct(d0) == "0 lech"

    mod_ppt = dict(orig_ppt)
    mod_ppt["slides"] = 11
    d1 = pptx_diff(orig_ppt, mod_ppt, notes_sha_excluded=False)
    assert d1["structDiffs"] == 1
    assert d1["slides"] == -1


def test_parse_cli_json():
    clean = '{"status":"PASS","editedCell":"A433"}\n'
    assert parse_cli_json(clean) == {"status": "PASS", "editedCell": "A433"}

    noisy = "Warning: some message\n{\"status\":\"PASS\",\"pages\":5}\nDone.\n"
    assert parse_cli_json(noisy) == {"status": "PASS", "pages": 5}

    empty = "Fatal error without JSON\n"
    res = parse_cli_json(empty)
    assert res["status"] == "FAIL"
