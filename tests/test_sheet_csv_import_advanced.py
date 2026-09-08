"""Advanced CSV import through the real LibreOffice headless pipeline.

Fixtures are generated as actual bytes at runtime: UTF-8 BOM, UTF-8 TSV and
Windows-1258 in the same representation emitted by Vietnamese Windows tools.
No native dialog and no SendKeys are used.
"""

from __future__ import annotations

import tempfile
import unicodedata
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import main


TABLE_NS = "urn:oasis:names:tc:opendocument:xmlns:table:1.0"
OFFICE_NS = "urn:oasis:names:tc:opendocument:xmlns:office:1.0"
NS = {"table": TABLE_NS, "office": OFFICE_NS}
VIETNAMESE_TONE_MARKS = {"\u0300", "\u0301", "\u0303", "\u0309", "\u0323"}


def _encode_cp1258(text: str) -> bytes:
    """Encode like Windows-1258: precomposed vowel shape + combining tone."""
    encoded_chars = []
    for char in text:
        decomposed = unicodedata.normalize("NFD", char)
        tones = "".join(mark for mark in decomposed[1:] if mark in VIETNAMESE_TONE_MARKS)
        shapes = "".join(mark for mark in decomposed[1:] if mark not in VIETNAMESE_TONE_MARKS)
        encoded_chars.append(unicodedata.normalize("NFC", decomposed[0] + shapes) + tones)
    return "".join(encoded_chars).encode("cp1258")


def _fods_rows(path: str) -> list[list[dict[str, str | None]]]:
    rows = []
    for row in ET.parse(path).findall(".//table:table-row", NS):
        cells = []
        for cell in row.findall("table:table-cell", NS):
            repeat = min(int(cell.attrib.get(f"{{{TABLE_NS}}}number-columns-repeated", "1")), 20)
            item = {
                "text": "".join(cell.itertext()).strip(),
                "type": cell.attrib.get(f"{{{OFFICE_NS}}}value-type"),
                "value": cell.attrib.get(f"{{{OFFICE_NS}}}value"),
            }
            cells.extend([item] * repeat)
        if any(cell["text"] for cell in cells):
            rows.append(cells)
    return rows


class SheetCsvImportAdvancedTests(unittest.TestCase):
    def test_detects_supported_delimiters_and_encodings(self):
        cases = [
            ("bom.csv", "A;B\r\n1;2\r\n".encode("utf-8-sig"), "utf-8-sig", "59,34,76"),
            ("plain.csv", "A,B\n1,2\n".encode("utf-8"), "utf-8", "44,34,76"),
            ("tab.csv", "A\tB\n1\t2\n".encode("utf-8"), "utf-8", "9,34,76"),
            ("ansi.csv", _encode_cp1258("Mã;Tên\n1;Việt Nam\n"), "cp1258", "59,34,40"),
        ]
        with tempfile.TemporaryDirectory(prefix="vno_csv_detect_") as tmp:
            for name, payload, expected_encoding, expected_prefix in cases:
                path = Path(tmp, name)
                path.write_bytes(payload)
                encoding, options = main._detect_csv_import_options(str(path))
                self.assertEqual(encoding, expected_encoding)
                self.assertTrue(options.startswith(expected_prefix), options)
                self.assertTrue(options.endswith(",1066,false,true"), options)

    def test_xlsx_and_ods_paths_do_not_receive_csv_infilter(self):
        with tempfile.TemporaryDirectory(prefix="vno_non_csv_") as tmp:
            for extension in ("xlsx", "ods"):
                case_dir = Path(tmp, extension)
                case_dir.mkdir()
                source = case_dir / f"workbook.{extension}"
                source.write_bytes(b"placeholder")
                expected_output = case_dir / "workbook.fods"
                expected_output.write_text("<office:document/>", encoding="utf-8")
                with patch.object(
                    main.subprocess,
                    "run",
                    return_value=SimpleNamespace(returncode=0, stdout="", stderr=""),
                ) as run:
                    result = main._run_soffice_convert(
                        str(source), "fods", str(case_dir), app_kind="sheet"
                    )
                command = run.call_args.args[0]
                self.assertEqual(result, str(expected_output))
                self.assertFalse(any(arg.startswith("--infilter=") for arg in command), command)

    def test_delimiter_detection_with_leading_description_rows(self):
        """csv.Sniffer must not mis-detect delimiter when description rows precede the header."""
        cases = [
            # Semicolon file with description rows (no semicolons in descriptions)
            (
                "vn_bank.csv",
                (
                    "Bao cao giao dich ngay 01/04/2026\r\n"
                    "So tai khoan: 123456789\r\n"
                    "\r\n"
                    "Ngay giao dich;Mo ta;So tien;So du\r\n"
                    "01/04/2026;Chuyen tien;500000;10500000\r\n"
                ).encode("utf-8"),
                "59",  # semicolon
            ),
            # Tab file with description rows
            (
                "tab_desc.csv",
                "Mo ta file\r\nSo dong: 2\r\nSTT\tTen\tGia\r\n1\tA\t100\r\n".encode("utf-8"),
                "9",  # tab
            ),
        ]
        with tempfile.TemporaryDirectory(prefix="vno_csv_desc_") as tmp:
            for name, payload, expected_delim_code in cases:
                path = Path(tmp, name)
                path.write_bytes(payload)
                _, options = main._detect_csv_import_options(str(path))
                self.assertTrue(
                    options.startswith(expected_delim_code),
                    f"{name}: expected delimiter code {expected_delim_code}, got {options}",
                )

    def test_us_number_format_detects_english_locale(self):
        """US-style decimal numbers (1234.56 or 1,234.56) should trigger English locale."""
        cases = [
            ("us_simple.csv", b"Name,Amount\nItem1,1234.56\n", True),
            ("us_grouped.csv", b'Name,Amount\nItem1,"1,234.56"\n', True),
            ("vn_grouped.csv", "Name;Amount\nItem1;1.234,56\n".encode("utf-8"), False),
            ("vn_no_decimal.csv", "Name,Amount\nItem1,85.000\n".encode("utf-8"), False),
        ]
        with tempfile.TemporaryDirectory(prefix="vno_csv_usnum_") as tmp:
            for name, payload, expect_us in cases:
                path = Path(tmp, name)
                path.write_bytes(payload)
                _, options = main._detect_csv_import_options(str(path))
                # Language code is the 6th token (index 5)
                lang = options.split(",")[5]
                if expect_us:
                    self.assertEqual(lang, "1033", f"{name}: expected English (1033), got lang={lang}")
                else:
                    self.assertEqual(lang, "1066", f"{name}: expected Vietnamese (1066), got lang={lang}")

    def test_looks_like_us_numbers_unit(self):
        """Unit test for _looks_like_us_numbers heuristic."""
        self.assertTrue(main._looks_like_us_numbers("1234.56", ","))
        self.assertTrue(main._looks_like_us_numbers('"1,234.56"', ","))
        self.assertFalse(main._looks_like_us_numbers("1.234,56", ";"))
        self.assertFalse(main._looks_like_us_numbers("85.000", ","))
        # Mixed: more VN than US → returns False
        self.assertFalse(
            main._looks_like_us_numbers("1234.56 and 1.234,56 and 2.345,67", ";")
        )

    @unittest.skipUnless(main.SOFFICE_PATH, "LibreOffice soffice is not installed")
    def test_real_soffice_import_preserves_columns_vietnamese_and_number(self):
        cases = [
            ("utf8_bom_semicolon.csv", "Mã;Tên hàng;Thành tiền\r\nSP01;Cà phê Đắk Lắk;1.234,56\r\n".encode("utf-8-sig"), "Cà phê Đắk Lắk"),
            ("cp1258_semicolon.csv", _encode_cp1258("Mã;Tên hàng;Thành tiền\r\nSP02;Điện thoại Việt Nam;1.234,56\r\n"), "Điện thoại Việt Nam"),
            ("utf8_tab.csv", "Mã\tTên hàng\tThành tiền\r\nSP03\tBánh mì Sài Gòn\t1.234,56\r\n".encode("utf-8"), "Bánh mì Sài Gòn"),
        ]
        with tempfile.TemporaryDirectory(prefix="vno_csv_real_") as tmp:
            for name, payload, expected_name in cases:
                case_dir = Path(tmp, Path(name).stem)
                case_dir.mkdir()
                source = case_dir / name
                source.write_bytes(payload)
                output = main._run_soffice_convert(str(source), "fods", str(case_dir), app_kind="sheet")
                rows = _fods_rows(output)
                self.assertGreaterEqual(len(rows), 2)
                header = [unicodedata.normalize("NFC", cell["text"]) for cell in rows[0][:3]]
                self.assertEqual(header, ["Mã", "Tên hàng", "Thành tiền"])
                self.assertEqual(unicodedata.normalize("NFC", rows[1][1]["text"]), expected_name)
                self.assertEqual(rows[1][2]["type"], "float")
                self.assertEqual(float(rows[1][2]["value"]), 1234.56)


if __name__ == "__main__":
    unittest.main()
