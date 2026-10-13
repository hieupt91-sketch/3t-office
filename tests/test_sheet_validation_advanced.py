"""EXCEL-G2 OOXML tests for full data validation and typed filters."""

from __future__ import annotations

import html
import io
import json
import unittest
import zipfile

from adapters.libreoffice.common.ooxml_zip_patch import postprocess_sheet_xlsx


def make_xlsx() -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as package:
        package.writestr(
            "xl/workbook.xml",
            '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dữ liệu" sheetId="1" r:id="rId1"/></sheets></workbook>',
        )
        package.writestr(
            "xl/_rels/workbook.xml.rels",
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
        )
        package.writestr(
            "xl/worksheets/sheet1.xml",
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"><v>1</v></c></row></sheetData></worksheet>',
        )
    return output.getvalue()


def validation_tag(rule: dict, cell_range: str) -> str:
    payload = html.escape(json.dumps(rule, ensure_ascii=False), quote=True)
    return (
        '<table:content-validation table:name="v" table:condition="of:cell-content-is-whole-number()" '
        'table:base-cell-address="Dữ liệu.A1" '
        f'vno:validation-sheet="Dữ liệu" vno:validation-range="{cell_range}" vno:validation-json="{payload}"></table:content-validation>'
    )


def fods(body: str, database_range: str = "") -> str:
    return (
        '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
        'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
        'xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"><office:body><office:spreadsheet>'
        f'<table:content-validations>{body}</table:content-validations>{database_range}'
        '</office:spreadsheet></office:body></office:document>'
    )


class SheetValidationAdvancedTests(unittest.TestCase):
    def test_all_validation_types_and_alert_metadata_are_written(self):
        rules = [
            ({"type": "whole", "operator": "between", "formula1": 1, "formula2": 10}, "A2:A9"),
            ({"type": "decimal", "operator": "greaterThan", "formula1": 1.5}, "B2:B9"),
            ({"type": "list", "values": ["Mới", "Đóng"]}, "C2:C9"),
            ({"type": "date", "operator": "greaterThanOrEqual", "formula1": 46308}, "D2:D9"),
            ({"type": "time", "operator": "lessThan", "formula1": 0.5}, "E2:E9"),
            ({"type": "textLength", "operator": "lessThanOrEqual", "formula1": 12}, "F2:F9"),
            ({"type": "custom", "formula1": "=MOD(G2,2)=0"}, "G2:G9"),
        ]
        tags = []
        for index, (rule, cell_range) in enumerate(rules):
            rule.update({
                "allowBlank": True, "showInputMessage": True, "inputTitle": "Gợi ý", "inputMessage": "Nhập đúng",
                "showErrorMessage": True, "errorStyle": ["stop", "warning", "information"][index % 3],
                "errorTitle": "Chưa đúng", "errorMessage": "Kiểm tra lại",
            })
            tags.append(validation_tag(rule, cell_range).replace('table:name="v"', f'table:name="v{index}"'))
        saved = postprocess_sheet_xlsx(make_xlsx(), source_fods=fods("".join(tags)))
        with zipfile.ZipFile(io.BytesIO(saved)) as package:
            sheet = package.read("xl/worksheets/sheet1.xml").decode("utf-8")
        self.assertIn('<dataValidations count="7">', sheet)
        for validation_type in ("whole", "decimal", "list", "date", "time", "textLength", "custom"):
            self.assertIn(f'type="{validation_type}"', sheet)
        self.assertIn('operator="between"', sheet)
        self.assertIn('operator="greaterThanOrEqual"', sheet)
        self.assertIn('errorStyle="warning"', sheet)
        self.assertIn('errorStyle="information"', sheet)
        self.assertIn('promptTitle="Gợi ý"', sheet)
        self.assertIn('<formula1>&quot;Mới,Đóng&quot;</formula1>', sheet)
        self.assertIn('<formula1>MOD(G2,2)=0</formula1>', sheet)

    def test_text_number_and_date_filter_criteria_are_written(self):
        columns = [
            {"colId": 0, "values": ["Anh"], "criterion": {"type": "text", "operator": "startsWith", "value": "An"}},
            {"colId": 1, "values": ["20", "30"], "criterion": {"type": "number", "operator": "top10", "count": 2}},
            {"colId": 2, "values": ["46308"], "criterion": {"type": "date", "operator": "thisMonth"}},
        ]
        metadata = html.escape(json.dumps(columns, ensure_ascii=False), quote=True)
        database = (
            '<table:database-ranges><table:database-range table:name="__Anonymous_Sheet_DB__0" '
            'table:target-range-address="\'Dữ liệu\'.A1:\'Dữ liệu\'.C20" table:display-filter-buttons="true" '
            f'vno:filter-columns="{metadata}"/></table:database-ranges>'
        )
        saved = postprocess_sheet_xlsx(make_xlsx(), source_fods=fods("", database))
        with zipfile.ZipFile(io.BytesIO(saved)) as package:
            sheet = package.read("xl/worksheets/sheet1.xml").decode("utf-8")
        self.assertIn('<customFilter operator="equal" val="An*"/>', sheet)
        self.assertIn('<top10 top="1" percent="0" val="2"/>', sheet)
        self.assertIn('<dynamicFilter type="thisMonth"/>', sheet)


if __name__ == "__main__":
    unittest.main()

