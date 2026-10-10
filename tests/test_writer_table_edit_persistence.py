"""Chỉnh sửa bảng và ngắt trang trên tài liệu nhập từ DOCX phải được ghi vào DOCX khi lưu (không cần soffice).

Lỗi gốc đo 10/10 trên d13/d01: (1) bước W36 luôn thay tcPr/trPr/tblPr/tblGrid bằng bản gốc khi số hàng/ô không đổi nên
tô nền ô, căn dọc, viền ô... mất; khi chèn cột, lưới cột gốc còn thay lại làm lệch số ô; (2) bước W37 trả nội dung gốc cho
đoạn chưa sửa nên mất <w:br w:type="page"/> mà LibreOffice thêm cuối đoạn trước chỗ người dùng chèn Ngắt trang.
"""

from __future__ import annotations

import importlib.util
import os
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATCHER_PATH = os.path.join(ROOT, "adapters", "libreoffice", "common", "ooxml_zip_patch.py")
spec = importlib.util.spec_from_file_location("ooxml_zip_patch_table_edits", PATCHER_PATH)
patcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(patcher)


def _cell(text: str, tcpr: str) -> str:
    return f"<w:tc>{tcpr}<w:p><w:r><w:t>{text}</w:t></w:r></w:p></w:tc>"


def _table(rows: list[list[tuple[str, str]]], tblpr: str, grid_cols: int, trpr: str = "") -> str:
    grid = "<w:tblGrid>" + "<w:gridCol w:w=\"1000\"/>" * grid_cols + "</w:tblGrid>"
    body = "".join(
        "<w:tr>" + trpr + "".join(_cell(text, tcpr) for text, tcpr in row) + "</w:tr>" for row in rows
    )
    return f"<w:tbl>{tblpr}{grid}{body}</w:tbl>"


SRC_TCPR = '<w:tcPr><w:tcW w:w="1000" w:type="dxa"/></w:tcPr>'
LO_TCPR = '<w:tcPr><w:tcW w:w="990" w:type="dxa"/></w:tcPr>'
SHADED_TCPR = '<w:tcPr><w:tcW w:w="990" w:type="dxa"/><w:shd w:val="clear" w:fill="FFFF00"/></w:tcPr>'


class WriterTableEditPersistenceTests(unittest.TestCase):
    def test_unedited_table_still_gets_source_properties_back(self):
        source = _table([[("a", SRC_TCPR), ("b", SRC_TCPR)]], "<w:tblPr><w:tblW w:w=\"2000\"/></w:tblPr>", 2)
        converted = _table([[("a", LO_TCPR), ("b", LO_TCPR)]], "<w:tblPr><w:tblW w:w=\"1999\"/></w:tblPr>", 2)
        result = patcher._writer_apply_source_table_properties(converted, source, None)
        self.assertEqual(result.count('w:w="1000"'), 2 + 2, "tcPr + tblGrid của nguồn trở lại")
        self.assertIn('<w:tblW w:w="2000"/>', result)

    def test_edited_cell_keeps_user_shading_other_cells_restored(self):
        source = _table([[("a", SRC_TCPR), ("b", SRC_TCPR)]], "<w:tblPr/>", 2)
        converted = _table([[("a", LO_TCPR), ("b", SHADED_TCPR)]], "<w:tblPr/>", 2)
        result = patcher._writer_apply_source_table_properties(
            converted, source, {"table": False, "rows": set(), "cells": {(0, 1)}}
        )
        self.assertIn('w:fill="FFFF00"', result, "tô nền người dùng vừa đặt phải còn")
        self.assertEqual(result.count('<w:tcW w:w="1000" w:type="dxa"/>'), 1, "ô chưa sửa vẫn lấy tcPr nguồn")

    def test_shading_lost_without_edit_marker_documents_old_behavior(self):
        """Ghi lại hành vi cũ: không có đánh dấu sửa thì tcPr nguồn ghi đè (đây là lý do phải có vân tay ô)."""
        source = _table([[("a", SRC_TCPR), ("b", SRC_TCPR)]], "<w:tblPr/>", 2)
        converted = _table([[("a", LO_TCPR), ("b", SHADED_TCPR)]], "<w:tblPr/>", 2)
        result = patcher._writer_apply_source_table_properties(converted, source, None)
        self.assertNotIn('w:fill="FFFF00"', result)

    def test_added_column_keeps_converted_grid(self):
        source = _table([[("a", SRC_TCPR), ("b", SRC_TCPR)]], "<w:tblPr/>", 2)
        converted = _table([[("a", LO_TCPR), ("b", LO_TCPR), ("c", LO_TCPR)]], "<w:tblPr/>", 3)
        result = patcher._writer_apply_source_table_properties(converted, source, None)
        self.assertEqual(result.count("<w:gridCol"), 3, "lưới cột phải khớp 3 ô, không bị thay bằng lưới 2 cột của nguồn")

    def test_edited_row_keeps_converted_row_properties(self):
        trpr_src = '<w:trPr><w:trHeight w:val="500"/></w:trPr>'
        trpr_new = '<w:trPr><w:trHeight w:val="900"/></w:trPr>'
        source = _table([[("a", SRC_TCPR)], [("b", SRC_TCPR)]], "<w:tblPr/>", 1, trpr=trpr_src)
        converted = _table([[("a", LO_TCPR)], [("b", LO_TCPR)]], "<w:tblPr/>", 1, trpr=trpr_new)
        result = patcher._writer_apply_source_table_properties(
            converted, source, {"table": False, "rows": {1}, "cells": set()}
        )
        self.assertEqual(result.count('w:val="900"'), 1, "hàng đã sửa giữ chiều cao mới")
        self.assertEqual(result.count('w:val="500"'), 1, "hàng chưa sửa lấy lại chiều cao nguồn")

    def test_parse_table_edits_comment_keyed_by_table_text(self):
        html = '<p>x</p><!--vno-table-edits: [{"k":"hoten","table":true,"all":false,"rows":[2],"cells":[[0,3],[4,5]]}] -->'
        edits = patcher._writer_parse_table_edits(html)
        self.assertEqual(set(edits), {"hoten"})
        item = edits["hoten"][0]
        self.assertTrue(item["table"])
        self.assertFalse(item["all"])
        self.assertEqual(item["rows"], {2})
        self.assertEqual(item["cells"], {(0, 3), (4, 5)})
        self.assertEqual(patcher._writer_parse_table_edits(None), {})
        self.assertEqual(patcher._writer_parse_table_edits("<!--vno-table-edits: nonsense -->"), {})

    def test_parse_table_edits_uses_last_marker_so_body_text_cannot_shadow_it(self):
        body_text = "<p>vno-table-edits: [{\"k\":\"gia\",\"cells\":[[9,9]]}] --&gt;</p>"
        html = body_text + '<!--vno-table-edits: [{"k":"that","cells":[[0,0]]}] -->'
        edits = patcher._writer_parse_table_edits(html)
        self.assertEqual(set(edits), {"that"})

    def test_all_flag_leaves_converted_table_untouched(self):
        source = _table([[("a", SRC_TCPR), ("b", SRC_TCPR)]], "<w:tblPr><w:tblW w:w=\"2000\"/></w:tblPr>", 2)
        converted = _table([[("a", LO_TCPR), ("b", SHADED_TCPR)]], "<w:tblPr><w:tblW w:w=\"1999\"/></w:tblPr>", 2)
        result = patcher._writer_apply_source_table_properties(
            converted, source, {"table": False, "all": True, "rows": set(), "cells": set()}
        )
        self.assertEqual(result, converted)

    def test_single_cell_edit_keeps_source_grid_but_table_edit_drops_it(self):
        source = _table([[("a", SRC_TCPR), ("b", SRC_TCPR)]], "<w:tblPr/>", 2)
        converted = _table([[("a", LO_TCPR), ("b", SHADED_TCPR)]], "<w:tblPr/>", 3)
        only_cell = patcher._writer_apply_source_table_properties(
            converted, source, {"table": False, "all": False, "rows": set(), "cells": {(0, 1)}}
        )
        self.assertEqual(only_cell.count('<w:gridCol w:w="1000"/>'), 2, "tô nền một ô không đổi lưới cột: lưới nguồn trở lại")
        widths = patcher._writer_apply_source_table_properties(
            converted, source, {"table": True, "all": False, "rows": set(), "cells": {(0, 1)}}
        )
        self.assertEqual(widths.count("<w:gridCol"), 3, "đổi độ rộng cột thì giữ lưới của bản chuyển đổi")

    def test_edits_pair_by_key_text_not_by_position(self):
        first = _table([[("khac", SRC_TCPR)]], "<w:tblPr/>", 1)
        second = _table([[("chuduoc", SRC_TCPR)]], "<w:tblPr/>", 1)
        source = f"<w:body>{first}{second}</w:body>"
        conv_first = _table([[("khac", LO_TCPR)]], "<w:tblPr/>", 1)
        conv_second = _table([[("chuduoc", SHADED_TCPR)]], "<w:tblPr/>", 1)
        converted = f"<w:body>{conv_first}{conv_second}</w:body>"
        edits = {"chuduoc": [{"table": False, "all": False, "rows": set(), "cells": {(0, 0)}}]}
        result = patcher._restore_writer_table_properties(converted, source, edits)
        self.assertIn('w:fill="FFFF00"', result, "bảng 'chuduoc' đã sửa giữ tô nền dù là bảng thứ hai")
        self.assertEqual(result.count('<w:tcW w:w="1000" w:type="dxa"/>'), 1, "bảng 'khac' chưa sửa lấy tcPr nguồn")

    def test_untouched_paragraph_keeps_page_break_added_by_converter(self):
        source = (
            '<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:t>Doan goc</w:t></w:r><w:r><w:tab/></w:r></w:p>'
        )
        target = (
            '<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:t>Doan goc</w:t></w:r><w:r><w:tab/></w:r>'
            '<w:r><w:br w:type="page"/></w:r></w:p>'
        )
        restored = patcher._writer_restore_untouched_runs(target, source)
        self.assertIsNotNone(restored)
        self.assertEqual(restored.count('<w:br w:type="page"/>'), 1, "ngắt trang người dùng chèn không được mất")

    def test_untouched_paragraph_with_only_run_shading_is_restored_verbatim(self):
        source = (
            '<w:p><w:pPr><w:jc w:val="both"/></w:pPr>'
            '<w:r><w:rPr><w:shd w:val="clear" w:fill="D9D9D9"/></w:rPr><w:t>Chu to nen</w:t></w:r></w:p>'
        )
        target = '<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:t>Chu to nen</w:t></w:r></w:p>'
        restored = patcher._writer_restore_untouched_runs(target, source)
        self.assertIsNotNone(restored, "đoạn chỉ có tô nền cấp ký tự phải được khôi phục")
        self.assertIn('w:fill="D9D9D9"', restored)

    def test_paragraph_shading_alone_is_not_treated_as_run_shading(self):
        source = '<w:p><w:pPr><w:shd w:val="clear" w:fill="EEEEEE"/></w:pPr><w:r><w:t>Chi nen doan</w:t></w:r></w:p>'
        target = '<w:p><w:pPr><w:shd w:val="clear" w:fill="EEEEEE"/></w:pPr><w:r><w:t>Chi nen doan</w:t></w:r></w:p>'
        self.assertIsNone(patcher._writer_restore_untouched_runs(target, source), "nền đoạn đã đi theo pPr, không cần khôi phục run")

    def test_untouched_paragraph_with_source_page_break_is_not_duplicated(self):
        source = '<w:p><w:r><w:t>A</w:t></w:r><w:r><w:br w:type="page"/></w:r></w:p>'
        target = '<w:p><w:r><w:t>A</w:t></w:r><w:r><w:br w:type="page"/></w:r></w:p>'
        restored = patcher._writer_restore_untouched_runs(target, source)
        self.assertIsNotNone(restored)
        self.assertEqual(restored.count('w:type="page"'), 1, "không nhân đôi ngắt trang đã có ở nguồn")


if __name__ == "__main__":
    unittest.main()
