"""Shared OOXML ZIP patcher + native export/import overlay.

Python twin of:
  adapters/libreoffice/common/ooxml-zip-patch.js
  adapters/libreoffice/sheet/xlsx-workbook-protection.js
  adapters/libreoffice/sheet/xlsx-freeze-panes.js
  adapters/libreoffice/sheet/xlsx-native-postprocess.js
  adapters/libreoffice/slides/pptx-master-logo.js
  adapters/libreoffice/slides/pptx-section-list.js
  adapters/libreoffice/slides/pptx-show-properties.js
  adapters/libreoffice/slides/pptx-native-postprocess.js

main.py calls:
  - postprocess_sheet_xlsx() after soffice FODS→XLSX (File → Lưu) - workbookProtection lockStructure + Freeze Panes <pane> + veryHidden state + AutoFilter
  - overlay_sheet_xlsx_fods() after soffice XLSX→FODS (File → Mở) - table:structure-protected + vno:frozen-rows/cols + vno:sheet-state + database-ranges
  - postprocess_slides_pptx() after soffice FODP→PPTX (File → Lưu)
  - overlay_slides_pptx_fodp() after soffice PPTX→FODP (File → Mở)

Keep the XML transform in lock step with the JS helpers.
"""

from __future__ import annotations

import argparse
import multiprocessing
from concurrent.futures import ProcessPoolExecutor
import html
import bisect
import io
import json
import math
import os
import posixpath
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from urllib.parse import quote as url_quote, unquote as url_unquote
import uuid
import zipfile

XLSX_WORKBOOK_ENTRY = "xl/workbook.xml"
XLSX_WORKBOOK_RELS_ENTRY = "xl/_rels/workbook.xml.rels"
XLSX_STYLES_ENTRY = "xl/styles.xml"
PPTX_PRESENTATION_ENTRY = "ppt/presentation.xml"
PPTX_PRESPROPS_ENTRY = "ppt/presProps.xml"
MASTER_LOGO_SHAPE_NAME = "VNOfficeMasterLogo"
SLIDE_MASTER_ENTRY_RE = re.compile(r"^ppt/slideMasters/slideMaster\d+\.xml$", re.IGNORECASE)
CM_EMU = 360000
DEFAULT_SLIDE_CX = 28 * CM_EMU
DEFAULT_SLIDE_CY = round(15.75 * CM_EMU)
P14_NS = "http://schemas.microsoft.com/office/powerpoint/2010/main"
PRESENTATION_NS = "http://schemas.openxmlformats.org/presentationml/2006/main"
DRAWINGML_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
DEFAULT_POINTER_COLOR = "#DC2626"
SECTION_LIST_URI = "{521415D9-36F7-43E2-AB2F-B90AF26B5E84}"
DEFAULT_SECTION_NAME = "Default Section"
SECTION_GUID_NAME_PREFIX = "urn:vn-office:slides:section:"
VNO_NS = "urn:vn-office:slides:1.0"
SHEET_VNO_NS = "https://vnoffice.vn/ns/spreadsheet/1.0"
EXCEL_BUILTIN_NUMBER_FORMATS = {
    0: "General", 1: "0", 2: "0.00", 3: "#,##0", 4: "#,##0.00",
    5: '"$"#,##0_);("$"#,##0)', 6: '"$"#,##0_);[Red]("$"#,##0)',
    7: '"$"#,##0.00_);("$"#,##0.00)', 8: '"$"#,##0.00_);[Red]("$"#,##0.00)',
    9: "0%", 10: "0.00%", 11: "0.00E+00", 12: "# ?/?", 13: "# ??/??",
    14: "mm-dd-yy", 15: "d-mmm-yy", 16: "d-mmm", 17: "mmm-yy",
    18: "h:mm AM/PM", 19: "h:mm:ss AM/PM", 20: "h:mm", 21: "h:mm:ss",
    22: "m/d/yy h:mm", 23: "General", 24: "General", 25: "General", 26: "General",
    27: "m/d/yy", 28: "m/d/yy", 29: "m/d/yy", 30: "m/d/yy", 31: "m/d/yy",
    32: "h:mm:ss", 33: "h:mm:ss", 34: "h:mm:ss", 35: "h:mm:ss", 36: "m/d/yy",
    37: "#,##0 ;(#,##0)", 38: "#,##0 ;[Red](#,##0)",
    39: "#,##0.00;(#,##0.00)", 40: "#,##0.00;[Red](#,##0.00)",
    41: '_(* #,##0_);_(* (#,##0);_(* "-"_);_(@_)',
    42: '_($* #,##0_);_($* (#,##0);_($* "-"_);_(@_)',
    43: '_(* #,##0.00_);_(* (#,##0.00);_(* "-"??_);_(@_)',
    44: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',
    45: "mm:ss", 46: "[h]:mm:ss", 47: "mmss.0", 48: "##0.0E+0", 49: "@",
}
_BRACED_GUID_RE = re.compile(
    r"^\{[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\}$"
)
_OFFICE_DOCUMENT_OPEN_RE = re.compile(r"<office:document\b([^>]*)>", re.IGNORECASE)

_PROTECTION_OPEN_RE = re.compile(
    r"<((?:[\w]+:)?workbookProtection)\b([^>]*?)(/?)\s*>",
    re.IGNORECASE,
)
_LOCK_STRUCTURE_RE = re.compile(
    r"\blockStructure\s*=\s*(['\"])[^'\"]*\1",
    re.IGNORECASE,
)
_BEFORE_SIBLING_RE = re.compile(
    r"<(?:[\w]+:)?(?:bookViews|sheets)\b",
    re.IGNORECASE,
)
_WORKBOOK_CLOSE_RE = re.compile(r"</(?:[\w]+:)?workbook\s*>", re.IGNORECASE)
_FODS_STRUCTURE_RE = re.compile(
    r"<office:spreadsheet\b[^>]*table:structure-protected\s*=\s*['\"]true['\"]",
    re.IGNORECASE,
)
_SPREADSHEET_OPEN_RE = re.compile(
    r"<office:spreadsheet\b([^>]*?)(/?)\s*>",
    re.IGNORECASE,
)
_STRUCTURE_ATTR_RE = re.compile(
    r"\btable:structure-protected\s*=\s*(['\"])[^'\"]*\1",
    re.IGNORECASE,
)
_LOCK_STRUCTURE_TRUE_RE = re.compile(
    r"\blockStructure\s*=\s*(['\"]?)(1|true)\1",
    re.IGNORECASE,
)
_MASTER_PAGE_OPEN_RE = re.compile(r"<style:master-page\b([^>]*)>", re.IGNORECASE)
_MASTER_PAGE_OPEN_GI_RE = re.compile(r"<style:master-page\b([^>]*?)(/?)\s*>", re.IGNORECASE)
_THEME_ATTR_RE = re.compile(r'\bvno:master-theme\s*=\s*(?:"([^"]*)"|\'([^\']*)\')', re.IGNORECASE)
_LOGO_NAME_RE = re.compile(
    rf"""\bname\s*=\s*(['"]){re.escape(MASTER_LOGO_SHAPE_NAME)}\1"""
)
_T_TEXT_RE = re.compile(r"<(?:[\w]+:)?t\b[^>]*>([\s\S]*?)</(?:[\w]+:)?t>", re.IGNORECASE)
_SRGB_RE = re.compile(r"""<(?:[\w]+:)?srgbClr\b[^>]*\bval=["']([^"']+)["']""", re.IGNORECASE)
_LATIN_RE = re.compile(r"""<(?:[\w]+:)?latin\b[^>]*\btypeface=["']([^"']+)["']""", re.IGNORECASE)
_LOGO_FRAME_RE = re.compile(
    r"<draw:frame\b[^>]*grMasterLogo[\s\S]*?<text:p\b[^>]*>([\s\S]*?)</text:p>",
    re.IGNORECASE,
)
_SLD_SZ_RE = re.compile(r"<(?:[\w]+:)?sldSz\b([^>]*)/?\s*>", re.IGNORECASE)
_CNVPR_ID_RE = re.compile(r"<(?:[\w]+:)?cNvPr\b[^>]*\bid=[\"'](\d+)[\"']", re.IGNORECASE)
_SP_TREE_CLOSE_RE = re.compile(r"</(?:[\w]+:)?spTree\s*>", re.IGNORECASE)
_SP_BLOCK_RE = re.compile(r"<(?:[\w]+:)?sp\b[\s\S]*?</(?:[\w]+:)?sp>", re.IGNORECASE)
_PH_RE = re.compile(r"<(?:[\w]+:)?ph\b", re.IGNORECASE)
_PAGE_OPEN_RE = re.compile(r"<draw:page(?![-a-zA-Z])([^>]*)>", re.IGNORECASE)
_SECTION_ID_ATTR_RE = re.compile(r'\bvno:section-id\s*=\s*["\']([^"\']*)["\']', re.IGNORECASE)
_SECTION_NAME_ATTR_RE = re.compile(r'\bvno:section-name\s*=\s*["\']([^"\']*)["\']', re.IGNORECASE)
_PRESENTATION_CLOSE_RE = re.compile(r"</(?:[\w]+:)?presentation\s*>", re.IGNORECASE)
_EXTLST_RE = re.compile(
    r"<(?:[\w]+:)?extLst\b([^>]*)(?:/>|>([\s\S]*?)</(?:[\w]+:)?extLst\s*>)",
    re.IGNORECASE,
)
_SECTION_EXT_RE = re.compile(
    r"<(?:[\w]+:)?ext\b[^>]*\buri\s*=\s*[\"']\{?521415D9-36F7-43E2-AB2F-B90AF26B5E84\}?[\"'][^>]*>"
    r"[\s\S]*?</(?:[\w]+:)?ext\s*>",
    re.IGNORECASE,
)
_SLD_SZ_OR_LATER_RE = re.compile(
    r"<(?:[\w]+:)?(?:sldSz|notesSz|embeddedFontLst|custShowLst|defaultTextStyle|extLst)\b",
    re.IGNORECASE,
)
_SLD_ID_LST_RE = re.compile(
    r"<(?:[\w]+:)?sldIdLst\b[^>]*>([\s\S]*?)</(?:[\w]+:)?sldIdLst>",
    re.IGNORECASE,
)
_SLD_ID_RE = re.compile(r"<(?:[\w]+:)?sldId\b([^>]*)/?\s*>", re.IGNORECASE)
_SECTION_BLOCK_RE = re.compile(
    r"<(?:[\w]+:)?section\b([^>]*)>([\s\S]*?)</(?:[\w]+:)?section\s*>",
    re.IGNORECASE,
)
_OFF_TAG_RE = re.compile(r"<(?:[\w]+:)?off\b[^>]*>", re.IGNORECASE)
_EXT_TAG_RE = re.compile(r"<(?:[\w]+:)?ext\b[^>]*>", re.IGNORECASE)
_SETTINGS_OPEN_RE = re.compile(r"<presentation:settings\b([^>]*)/?>", re.IGNORECASE)
_SETTINGS_TAG_RE = re.compile(r"<presentation:settings\b([^>]*?)(/?)\s*>", re.IGNORECASE)
_WITHOUT_ATTR_RE = re.compile(
    r"""\bvno:without-narration\s*=\s*["'][^"']*["']""", re.IGNORECASE
)
_OFFICE_PRESENTATION_CLOSE_RE = re.compile(r"</office:presentation\s*>", re.IGNORECASE)
_PRESPROPS_CLOSE_RE = re.compile(r"</(?:[\w]+:)?presentationPr\s*>", re.IGNORECASE)
_PRESPROPS_OPEN_RE = re.compile(r"<((?:[\w]+:)?presentationPr)\b([^>]*)>", re.IGNORECASE)
_SHOW_PR_RE = re.compile(
    r"<(?:[\w]+:)?showPr\b([^>]*?)(/>|>([\s\S]*?)</(?:[\w]+:)?showPr\s*>)",
    re.IGNORECASE,
)
_PEN_CLR_RE = re.compile(
    r"<(?:[\w]+:)?penClr\b[\s\S]*?</(?:[\w]+:)?penClr\s*>",
    re.IGNORECASE,
)
_SHOW_EXTLST_RE = re.compile(r"<(?:[\w]+:)?extLst\b", re.IGNORECASE)
_SLD_RG_RE = re.compile(r"<(?:[\w]+:)?sldRg\b([^>]*)/?\s*>", re.IGNORECASE)
_SHOW_SRGB_RE = re.compile(
    r"""<(?:[\w]+:)?srgbClr\b[^>]*\bval\s*=\s*["']([^"']+)["']""",
    re.IGNORECASE,
)
_POINTER_ATTR_RE = re.compile(r"""\bvno:pointer-color\s*=\s*["']([^"']*)["']""", re.IGNORECASE)
_HEX6_RE = re.compile(r"^[0-9A-Fa-f]{6}$")
_XMLNS_PREFIX_RE_CACHE: dict[str, re.Pattern[str]] = {}


def fods_has_structure_protection(fods_xml: str | None) -> bool:
    return bool(_FODS_STRUCTURE_RE.search(fods_xml or ""))


def workbook_has_structure_lock(workbook_xml: str | None) -> bool:
    match = _PROTECTION_OPEN_RE.search(workbook_xml or "")
    if not match:
        return False
    attrs = match.group(2) or ""
    return bool(_LOCK_STRUCTURE_TRUE_RE.search(attrs))


def apply_fods_structure_protection(fods_xml: str) -> str:
    """Ensure office:spreadsheet carries table:structure-protected='true'."""
    xml = fods_xml or ""
    if not xml:
        return xml
    match = _SPREADSHEET_OPEN_RE.search(xml)
    if not match:
        return xml
    attrs = match.group(1) or ""
    self_close = match.group(2) == "/"
    if _STRUCTURE_ATTR_RE.search(attrs):
        attrs = _STRUCTURE_ATTR_RE.sub('table:structure-protected="true"', attrs)
    else:
        attrs = f"{attrs.rstrip()} table:structure-protected=\"true\""
    if attrs and not attrs.startswith(" "):
        attrs = f" {attrs}"
    next_tag = f"<office:spreadsheet{attrs}/>" if self_close else f"<office:spreadsheet{attrs}>"
    return xml[: match.start()] + next_tag + xml[match.end() :]


def overlay_fods_structure_protection(fods_xml: str, workbook_xml: str | None) -> str:
    """Inject table:structure-protected when original XLSX has lockStructure."""
    xml = fods_xml or ""
    if not workbook_has_structure_lock(workbook_xml):
        return xml
    return apply_fods_structure_protection(xml)


def apply_workbook_protection_lock_structure(workbook_xml: str) -> str:
    """Ensure workbookProtection lockStructure='1' at a schema-valid slot."""
    xml = workbook_xml or ""
    if not xml:
        return xml
    match = _PROTECTION_OPEN_RE.search(xml)
    if match:
        name = match.group(1)
        attrs = match.group(2) or ""
        self_close = match.group(3) == "/"
        if _LOCK_STRUCTURE_RE.search(attrs):
            attrs = _LOCK_STRUCTURE_RE.sub('lockStructure="1"', attrs)
        else:
            attrs = f"{attrs.rstrip()} lockStructure=\"1\""
        if attrs and not attrs.startswith(" "):
            attrs = f" {attrs}"
        next_tag = f"<{name}{attrs}/>" if self_close else f"<{name}{attrs}>"
        return xml[: match.start()] + next_tag + xml[match.end() :]
    insertion = '<workbookProtection lockStructure="1"/>'
    sibling = _BEFORE_SIBLING_RE.search(xml)
    if sibling:
        return xml[: sibling.start()] + insertion + xml[sibling.start() :]
    return _WORKBOOK_CLOSE_RE.sub(insertion + "</workbook>", xml, count=1)


def patch_ooxml_zip(zip_bytes: bytes, replacements: dict[str, str | bytes | None]) -> bytes:
    """Replace named ZIP entries; copy the rest. A ``None`` payload drops the entry.
    New entries (not present in source) are added. No third-party library."""
    source = io.BytesIO(zip_bytes)
    dest = io.BytesIO()
    with zipfile.ZipFile(source, "r") as zin, zipfile.ZipFile(
        dest, "w", compression=zipfile.ZIP_DEFLATED
    ) as zout:
        seen = set()
        for item in zin.infolist():
            if item.is_dir() or not item.filename or item.filename.endswith("/"):
                continue
            seen.add(item.filename)
            if item.filename in replacements:
                payload = replacements[item.filename]
                if payload is None:
                    continue
                data = payload.encode("utf-8") if isinstance(payload, str) else payload
            else:
                data = zin.read(item.filename)
            info = zipfile.ZipInfo(filename=item.filename, date_time=item.date_time)
            info.compress_type = zipfile.ZIP_DEFLATED
            zout.writestr(info, data)
        # Add new entries not present in source
        for name, payload in replacements.items():
            if name in seen:
                continue
            if payload is None:
                continue
            data = payload.encode("utf-8") if isinstance(payload, str) else payload
            info = zipfile.ZipInfo(filename=name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            zout.writestr(info, data)
    return dest.getvalue()


# `\b` also matches the boundary before '-' in <table:table-cell>, forcing a
# callback for every cell in a large FODS.  A sheet header can only continue
# with whitespace, '/', or '>', so keep this scan proportional to sheet count.
_XMLNS_VNO_RE = re.compile(r"xmlns:vno\s*=", re.IGNORECASE)
_XMLNS_VNO_TAIL_RE = re.compile(r"\s*=")


def _declares_vno_namespace(xml: str) -> bool:
    """Same answer as re.search(r"xmlns:vno\\s*=", xml, re.IGNORECASE) for LibreOffice output, without the scan.

    The IGNORECASE regex walks the whole 300 MB FODS character by character when the declaration is still missing
    (2.7 s on lan14, paid by the first overlay stage). str.find reads at memory speed; a case-insensitive pass is kept
    for the root element region, where namespace declarations live.
    """
    position = xml.find("xmlns:vno")
    while position >= 0:
        if _XMLNS_VNO_TAIL_RE.match(xml, position + 9):
            return True
        position = xml.find("xmlns:vno", position + 9)
    return bool(_XMLNS_VNO_RE.search(xml[:65536]))


_FREEZE_TABLE_TAG_RE = re.compile(r"<table:table(?=[\s>/])([^>]*)>")


class _TableOpenTagMatch:
    """Minimal stand-in for re.Match (group 0 and 1) used by _sub_table_open_tags callbacks."""

    __slots__ = ("_whole", "_attrs")

    def __init__(self, whole: str, attrs: str) -> None:
        self._whole = whole
        self._attrs = attrs

    def group(self, index: int = 0) -> str:
        return self._attrs if index == 1 else self._whole


def _sub_table_open_tags(xml: str, replace, follow: str = " \t\r\n\f\v>/") -> str:
    """Same result as re.sub(r"<table:table(?=[\\s>/])([^>]*)>", replace, xml) on lowercase ODF,
    but located with str.find so a 250 MB FODS is not scanned by the regex engine.
    """
    pieces: list[str] = []
    cursor = position = 0
    length = len(xml)
    while True:
        start = xml.find("<table:table", position)
        if start < 0:
            break
        attrs_start = start + 12
        if attrs_start >= length or xml[attrs_start] not in follow:
            position = attrs_start
            continue
        end = xml.find(">", attrs_start)
        if end < 0:
            break
        replacement = replace(_TableOpenTagMatch(xml[start : end + 1], xml[attrs_start:end]))
        if replacement != xml[start : end + 1]:
            pieces.append(xml[cursor:start])
            pieces.append(replacement)
            cursor = end + 1
        position = end + 1
    if not pieces:
        return xml
    pieces.append(xml[cursor:])
    return "".join(pieces)


_FREEZE_ROWS_ATTR_RE = re.compile(r'vno:frozen-rows="(\d+)"', re.IGNORECASE)
_FREEZE_COLS_ATTR_RE = re.compile(r'vno:frozen-cols="(\d+)"', re.IGNORECASE)
_SHEET_VIEW_RE = re.compile(r"(<sheetView\b[^>]*>)([\s\S]*?)(</sheetView>)", re.IGNORECASE)
_SHEET_VIEW_SELFCLOSE_RE = re.compile(r"<sheetView\b([^>]*)/>", re.IGNORECASE)
_PANE_TAG_RE = re.compile(r"<pane\b[^>]*/>", re.IGNORECASE)
_PANE_MATCH_RE = re.compile(r"<pane\b([^>]*)/>", re.IGNORECASE)
_SELECTION_TAG_RE = re.compile(r"<selection\b[^>]*/>", re.IGNORECASE)
_WB_SHEET_TAG_RE = re.compile(r"<(?:[A-Za-z_][\w.-]*:)?sheet\b([^>]*)/?>", re.IGNORECASE)
_WB_RELATIONSHIP_TAG_RE = re.compile(r"<Relationship\b([^>]*)/?>", re.IGNORECASE)


def column_label_from_index(one_based_index: int) -> str:
    """1-based column number -> Excel-style label (1="A", 26="Z", 27="AA")."""
    n = max(1, int(one_based_index))
    label = ""
    while n > 0:
        n, rem = divmod(n - 1, 26)
        label = chr(65 + rem) + label
    return label


def parse_freeze_panes_from_fods(fods_xml: str | None) -> dict[str, dict[str, int]]:
    """{sheet_name: {"rows": int, "cols": int}} từ vno:frozen-rows/cols 3T Office tự ghi."""
    xml = fods_xml or ""
    result: dict[str, dict[str, int]] = {}
    for match in _FREEZE_TABLE_TAG_RE.finditer(xml):
        attrs = match.group(1) or ""
        name_match = re.search(r'table:name="([^"]*)"', attrs)
        if not name_match:
            continue
        name = _unescape_xml(name_match.group(1))
        rows = int(_FREEZE_ROWS_ATTR_RE.search(attrs).group(1)) if _FREEZE_ROWS_ATTR_RE.search(attrs) else 0
        cols = int(_FREEZE_COLS_ATTR_RE.search(attrs).group(1)) if _FREEZE_COLS_ATTR_RE.search(attrs) else 0
        if rows > 0 or cols > 0:
            result[name] = {"rows": rows, "cols": cols}
    return result


def apply_freeze_panes_to_fods(fods_xml: str, freeze_by_sheet: dict[str, dict[str, int]]) -> str:
    """Ghi vno:frozen-rows/cols vào đúng <table:table> - dùng ở File → Mở, TRƯỚC parseFods()."""
    xml = fods_xml or ""
    if not freeze_by_sheet:
        return xml

    def _replace(match: re.Match[str]) -> str:
        attrs = match.group(1) or ""
        name_match = re.search(r'table:name="([^"]*)"', attrs)
        if not name_match:
            return match.group(0)
        name = _unescape_xml(name_match.group(1))
        freeze = freeze_by_sheet.get(name)
        if freeze is None:
            freeze = next((value for key, value in freeze_by_sheet.items() if _sheet_name_equivalence_key(key) == _sheet_name_equivalence_key(name)), None)
        if not freeze or (freeze.get("rows", 0) <= 0 and freeze.get("cols", 0) <= 0):
            return match.group(0)
        next_attrs = _FREEZE_ROWS_ATTR_RE.sub("", attrs)
        next_attrs = _FREEZE_COLS_ATTR_RE.sub("", next_attrs)
        next_attrs = f'{next_attrs} vno:frozen-rows="{freeze["rows"]}" vno:frozen-cols="{freeze["cols"]}"'
        return f"<table:table{next_attrs}>"

    return _sub_table_open_tags(xml, _replace)


def parse_freeze_pane_from_sheet_xml(sheet_xml: str | None) -> dict[str, int] | None:
    """Đọc <pane state="frozen" xSplit ySplit> thật từ một worksheetN.xml XLSX."""
    match = _PANE_MATCH_RE.search(sheet_xml or "")
    if not match:
        return None
    attrs = match.group(1) or ""
    if not re.search(r'state="frozen"', attrs, re.IGNORECASE):
        return None
    cols_match = re.search(r'xSplit="(\d+)"', attrs)
    rows_match = re.search(r'ySplit="(\d+)"', attrs)
    cols = int(cols_match.group(1)) if cols_match else 0
    rows = int(rows_match.group(1)) if rows_match else 0
    if rows == 0 and cols == 0:
        return None
    return {"rows": rows, "cols": cols}


def apply_freeze_pane_to_sheet_xml(sheet_xml: str, rows: int, cols: int) -> str:
    """Ghi <pane state="frozen"> chuẩn OOXML vào <sheetView> - xSplit/ySplit là SỐ CỘT/HÀNG, không phải pixel."""
    xml = sheet_xml or ""
    if rows <= 0 and cols <= 0:
        return xml

    top_left_col = column_label_from_index(cols + 1)
    top_left_row = rows + 1
    top_left_cell = f"{top_left_col}{top_left_row}"
    active_pane = "bottomRight" if (rows > 0 and cols > 0) else ("bottomLeft" if rows > 0 else "topRight")

    pane_attrs = []
    if cols > 0:
        pane_attrs.append(f'xSplit="{cols}"')
    if rows > 0:
        pane_attrs.append(f'ySplit="{rows}"')
    pane_attrs.append(f'topLeftCell="{top_left_cell}"')
    pane_attrs.append(f'activePane="{active_pane}"')
    pane_attrs.append('state="frozen"')
    pane_xml = f'<pane {" ".join(pane_attrs)}/>'
    selection_xml = f'<selection pane="{active_pane}" activeCell="{top_left_cell}" sqref="{top_left_cell}"/>'

    def _clean(inner: str) -> str:
        return _SELECTION_TAG_RE.sub("", _PANE_TAG_RE.sub("", inner))

    match = _SHEET_VIEW_RE.search(xml)
    if match:
        replacement = f"{match.group(1)}{pane_xml}{selection_xml}{_clean(match.group(2))}{match.group(3)}"
        return xml[: match.start()] + replacement + xml[match.end() :]

    self_close = _SHEET_VIEW_SELFCLOSE_RE.search(xml)
    if self_close:
        replacement = f"<sheetView{self_close.group(1)}>{pane_xml}{selection_xml}</sheetView>"
        return xml[: self_close.start()] + replacement + xml[self_close.end() :]

    return xml


# ---------------------------------------------------------------------------
# Sheet visibility (veryHidden) overlay
# ---------------------------------------------------------------------------

_SHEET_STATE_ATTR_RE = re.compile(r'state="(visible|hidden|veryHidden)"', re.IGNORECASE)
_VNO_SHEET_STATE_RE = re.compile(r'vno:sheet-state="(visible|hidden|veryHidden)"', re.IGNORECASE)


def parse_sheet_visibility_from_workbook(workbook_xml: str | None) -> dict[str, str]:
    """Read sheet state from xl/workbook.xml <sheet state="..."> elements.

    Returns {sheet_name: state} for sheets whose state is NOT the default
    ``visible``.  Only ``hidden`` and ``veryHidden`` are forwarded — visible
    sheets are omitted so the FODS overlay is a no-op for them.
    """
    result: dict[str, str] = {}
    if not workbook_xml:
        return result
    for match in _WB_SHEET_TAG_RE.finditer(workbook_xml):
        attrs = match.group(1) or ""
        name_match = re.search(r'name="([^"]*)"', attrs)
        state_match = _SHEET_STATE_ATTR_RE.search(attrs)
        if name_match and state_match:
            state = state_match.group(1)
            if state.lower() in ("hidden", "veryhidden"):
                result[_unescape_xml(name_match.group(1))] = state
    return result


def apply_sheet_visibility_to_fods(fods_xml: str, visibility_by_sheet: dict[str, str]) -> str:
    """Inject vno:sheet-state onto <table:table> tags in FODS — used during
    File → Mở, BEFORE parseFods()."""
    xml = fods_xml or ""
    if not visibility_by_sheet:
        return xml

    _CANONICAL = {"hidden": "hidden", "veryhidden": "veryHidden"}

    def _replace(match: re.Match[str]) -> str:
        attrs = match.group(1) or ""
        name_match = re.search(r'table:name="([^"]*)"', attrs)
        if not name_match:
            return match.group(0)
        name = _unescape_xml(name_match.group(1))
        state = visibility_by_sheet.get(name)
        if state is None:
            state = next((value for key, value in visibility_by_sheet.items() if _sheet_name_equivalence_key(key) == _sheet_name_equivalence_key(name)), None)
        if not state:
            return match.group(0)
        canonical = _CANONICAL.get(state.lower(), state)
        next_attrs = _VNO_SHEET_STATE_RE.sub("", attrs)
        next_attrs = f'{next_attrs} vno:sheet-state="{canonical}"'
        return f"<table:table{next_attrs}>"

    return _sub_table_open_tags(xml, _replace)


def parse_sheet_visibility_from_fods(fods_xml: str | None) -> dict[str, str]:
    """Read vno:sheet-state from FODS <table:table> tags (3T Office self-written)."""
    result: dict[str, str] = {}
    if not fods_xml:
        return result
    for match in _FREEZE_TABLE_TAG_RE.finditer(fods_xml):
        attrs = match.group(1) or ""
        name_match = re.search(r'table:name="([^"]*)"', attrs)
        if not name_match:
            continue
        state_match = _VNO_SHEET_STATE_RE.search(attrs)
        if state_match:
            result[_unescape_xml(name_match.group(1))] = state_match.group(1)
    return result


def apply_sheet_visibility_to_workbook(workbook_xml: str, visibility_by_sheet: dict[str, str]) -> str:
    """Write state="hidden|veryHidden" back into xl/workbook.xml <sheet> elements."""
    xml = workbook_xml or ""
    if not visibility_by_sheet:
        return xml
    _CANONICAL = {"hidden": "hidden", "veryhidden": "veryHidden"}

    def _replace(match: re.Match[str]) -> str:
        full = match.group(0)
        attrs = match.group(1) or ""
        name_match = re.search(r'name="([^"]*)"', attrs)
        if not name_match:
            return full
        name = _unescape_xml(name_match.group(1))
        state = visibility_by_sheet.get(name)
        if not state:
            return full
        canonical = _CANONICAL.get(state.lower(), state)
        # <sheet> is always a self-closing/empty element in xl/workbook.xml.
        # _WB_SHEET_TAG_RE's greedy [^>]* can swallow a trailing "/" into
        # `attrs` before the optional /? — strip it so we don't end up with
        # a stray "/" in the middle of the tag (e.g. `.../ state="x">`,
        # which breaks the self-closing form and corrupts the XML).
        next_attrs = re.sub(r"/\s*$", "", attrs)
        next_attrs = _SHEET_STATE_ATTR_RE.sub("", next_attrs)
        next_attrs = f'{next_attrs} state="{canonical}"'
        return f"<sheet{next_attrs}/>"

    return _WB_SHEET_TAG_RE.sub(_replace, xml)


def make_all_sheets_visible_for_import(xlsx_bytes: bytes) -> bytes:
    """Create a temporary XLSX view in which LibreOffice can import hidden sheets."""
    workbook = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
    if not workbook:
        return xlsx_bytes
    workbook_xml = workbook.decode("utf-8", errors="replace")
    visible_xml = re.sub(
        r'\s+state="(?:hidden|veryHidden)"',
        "",
        workbook_xml,
        flags=re.IGNORECASE,
    )
    if visible_xml == workbook_xml:
        return xlsx_bytes
    return patch_ooxml_zip(xlsx_bytes, {XLSX_WORKBOOK_ENTRY: visible_xml})


# ---------------------------------------------------------------------------
# Active sheet (activeTab in OOXML ↔ ActiveTable in ODF office:settings)
# ---------------------------------------------------------------------------

CONFIG_NS = "urn:oasis:names:tc:opendocument:xmlns:config:1.0"
_VIEW_SETTINGS_SET_RE = re.compile(
    r'(<config:config-item-set\b[^>]*config:name\s*=\s*(["\'])ooo:view-settings\2[^>]*>)([\s\S]*?)(</config:config-item-set>)',
    re.IGNORECASE,
)
_VIEW_MAP_ENTRY_RE = re.compile(
    r'(<config:config-item-map-entry\b[^>]*>)([\s\S]*?)(</config:config-item-map-entry>)',
    re.IGNORECASE,
)
_OFFICE_SETTINGS_RE = re.compile(
    r'(<office:settings\b[^>]*>)([\s\S]*?)(</office:settings>)',
    re.IGNORECASE,
)
_OFFICE_BODY_RE = re.compile(r'<office:body\b', re.IGNORECASE)
_OFFICE_DOCUMENT_CLOSE_RE = re.compile(r'</office:document\s*>', re.IGNORECASE)


def parse_active_tab_from_workbook(workbook_xml: str | None) -> int:
    """Read activeTab index (0-based) from xl/workbook.xml <workbookView activeTab="N"/>."""
    if not workbook_xml:
        return 0
    match = re.search(r"<(?:\w+:)?workbookView\b([^>]*)/?>", workbook_xml, re.IGNORECASE)
    if match:
        attrs = match.group(1) or ""
        tab_match = re.search(r'\b(?:activeTab|activeSheet)\s*=\s*(["\'])(\d+)\1', attrs, re.IGNORECASE)
        if tab_match:
            try:
                return int(tab_match.group(2))
            except ValueError:
                return 0
    return 0


def parse_sheet_names_from_workbook(workbook_xml: str | None) -> list[str]:
    """Read ordered sheet names from xl/workbook.xml <sheets><sheet name="..."/>."""
    if not workbook_xml:
        return []
    sheet_names: list[str] = []
    for match in _WB_SHEET_TAG_RE.finditer(workbook_xml):
        attrs = match.group(1) or ""
        name_match = re.search(r'\bname\s*=\s*(["\'])(.*?)\1', attrs)
        if name_match:
            sheet_names.append(_unescape_xml(name_match.group(2)))
    return sheet_names


def parse_active_sheet_from_workbook(workbook_xml: str | None) -> str | None:
    """Read activeTab from workbookView and map to the corresponding sheet name.

    Returns the N-th sheet name (including hidden/veryHidden sheets in index
    order). Defaults to the first sheet if activeTab is missing or out of bounds.
    Returns None if workbookView is not present or no sheets are found.
    """
    if not workbook_xml:
        return None
    wv_match = re.search(r"<(?:\w+:)?workbookView\b([^>]*)/?>", workbook_xml, re.IGNORECASE)
    if not wv_match:
        return None
    sheet_names = parse_sheet_names_from_workbook(workbook_xml)
    if not sheet_names:
        return None
    tab_index = parse_active_tab_from_workbook(workbook_xml)
    if 0 <= tab_index < len(sheet_names):
        return sheet_names[tab_index]
    return sheet_names[0]


def parse_selected_sheet_names_from_xlsx(xlsx_bytes: bytes | None) -> list[str]:
    """Read the visible worksheet tabs selected in the workbook view.

    Excel stores a multi-sheet selection as ``tabSelected="1"`` on each
    selected worksheet's sheetView. A workbook with no explicit selection
    resolves to its active sheet.
    """
    if not xlsx_bytes:
        return []
    workbook = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
    workbook_xml = workbook.decode("utf-8", errors="replace") if workbook else ""
    names = parse_sheet_names_from_workbook(workbook_xml)
    if not names:
        return []
    visibility = parse_sheet_visibility_from_workbook(workbook_xml)
    entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    selected: list[str] = []
    for name in names:
        if visibility.get(name, "visible").lower() != "visible":
            continue
        sheet_bytes = read_zip_entry(xlsx_bytes, entries.get(name, "")) if entries.get(name) else None
        if not sheet_bytes:
            continue
        sheet_xml = sheet_bytes.decode("utf-8", errors="replace")
        if re.search(r'<(?:[\w.-]+:)?sheetView\b[^>]*\btabSelected\s*=\s*(["\'])1\1', sheet_xml, re.IGNORECASE):
            selected.append(name)
    if selected:
        return selected
    active = parse_active_sheet_from_workbook(workbook_xml)
    return [active] if active and visibility.get(active, "visible").lower() == "visible" else []


_PRINT_AREA_CELL_RANGE_RE = re.compile(
    r"\$?([A-Z]{1,3})\$?([1-9][0-9]{0,6})(?::\$?([A-Z]{1,3})\$?([1-9][0-9]{0,6}))?\Z",
    re.IGNORECASE,
)


def _print_area_column_number(column: str) -> int:
    number = 0
    for character in column.upper():
        number = number * 26 + ord(character) - ord("A") + 1
    return number


def _normalize_print_area_ranges(ranges: list[str] | tuple[str, ...] | None) -> list[str]:
    if not ranges:
        raise ValueError("In vùng chọn cần có ít nhất một dải ô hợp lệ.")
    normalized: list[str] = []
    for item in ranges:
        match = _PRINT_AREA_CELL_RANGE_RE.fullmatch(str(item or "").strip())
        if not match:
            raise ValueError(f"Dải ô in không hợp lệ: {item}")
        start_column, start_row, end_column, end_row = match.groups()
        start_column = start_column.upper()
        start_row_number = int(start_row)
        end_column = (end_column or start_column).upper()
        end_row_number = int(end_row or start_row)
        if (
            _print_area_column_number(start_column) > 16384
            or _print_area_column_number(end_column) > 16384
            or start_row_number > 1048576
            or end_row_number > 1048576
            or _print_area_column_number(end_column) < _print_area_column_number(start_column)
            or end_row_number < start_row_number
        ):
            raise ValueError(f"Dải ô in không hợp lệ: {item}")
        start = f"${start_column}${start_row_number}"
        end = f"${end_column}${end_row_number}"
        value = start if start == end else f"{start}:{end}"
        if value not in normalized:
            normalized.append(value)
    return normalized


def _set_local_print_area(
    workbook_xml: str, sheet_index: int, sheet_name: str, ranges: list[str],
) -> str:
    """Replace the active sheet's Excel print-area name in a temporary workbook."""
    quoted_sheet = "'" + sheet_name.replace("'", "''") + "'"
    expression = ",".join(f"{quoted_sheet}!{range_ref}" for range_ref in ranges)
    expression = _escape_xml(expression)

    def is_target_defined_name(attributes: str) -> bool:
        name_match = re.search(r'\bname\s*=\s*(["\'])(.*?)\1', attributes, re.IGNORECASE)
        index_match = re.search(r'\blocalSheetId\s*=\s*(["\'])(\d+)\1', attributes, re.IGNORECASE)
        return bool(
            name_match
            and name_match.group(2).casefold() == "_xlnm.print_area"
            and index_match
            and int(index_match.group(2)) == sheet_index
        )

    container_match = re.search(
        r"<(?P<tag>(?:[\w.-]+:)?definedNames)\b(?P<attrs>[^>]*)>(?P<body>[\s\S]*?)</(?P=tag)\s*>",
        workbook_xml,
        re.IGNORECASE,
    )
    if container_match:
        container_tag = container_match.group("tag")
        name_tag = f"{container_tag.split(':', 1)[0]}:definedName" if ":" in container_tag else "definedName"
        body = container_match.group("body")
        definition_pattern = re.compile(
            r"<(?P<tag>(?:[\w.-]+:)?definedName)\b(?P<attrs>[^>]*?)(?:\s*/>|>(?P<text>[\s\S]*?)</(?P=tag)\s*>)",
            re.IGNORECASE,
        )
        kept = []
        for definition in definition_pattern.finditer(body):
            if not is_target_defined_name(definition.group("attrs")):
                kept.append(definition.group(0))
        replacement = (
            f"<{container_tag}{container_match.group('attrs')}>"
            + "".join(kept)
            + f'<{name_tag} name="_xlnm.Print_Area" localSheetId="{sheet_index}">{expression}</{name_tag}>'
            + f"</{container_tag}>"
        )
        return workbook_xml[:container_match.start()] + replacement + workbook_xml[container_match.end():]

    name = f'<definedName name="_xlnm.Print_Area" localSheetId="{sheet_index}">{expression}</definedName>'
    block = f"<definedNames>{name}</definedNames>"
    insertion = re.search(r"<(?:[\w.-]+:)?calcPr\b", workbook_xml, re.IGNORECASE)
    if insertion is None:
        insertion = re.search(r"</(?:[\w.-]+:)?sheets\s*>", workbook_xml, re.IGNORECASE)
        position = insertion.end() if insertion else workbook_xml.rfind("</workbook>")
    else:
        position = insertion.start()
    if position < 0:
        return workbook_xml
    return workbook_xml[:position] + block + workbook_xml[position:]


def make_print_scope_xlsx(
    xlsx_bytes: bytes,
    *,
    active_sheet_name: str | None = None,
    selected_sheet_names: list[str] | None = None,
    include_all_sheets: bool = False,
    print_area_ranges: list[str] | tuple[str, ...] | None = None,
) -> bytes:
    """Make a temporary XLSX package that prints only the selected sheet tabs.

    The workbook and every worksheet remain in the package. Nonselected visible
    tabs are hidden only in this print copy, allowing both Excel and LibreOffice
    to export the active/selected sheets without losing formula dependencies.
    """
    workbook_raw = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
    workbook_xml = workbook_raw.decode("utf-8", errors="replace") if workbook_raw else ""
    names = parse_sheet_names_from_workbook(workbook_xml)
    entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    if not workbook_xml or not names or any(name not in entries for name in names):
        # Minimal/unsupported packages are left to the native renderer.
        return xlsx_bytes

    visibility = parse_sheet_visibility_from_workbook(workbook_xml)
    visible_names = [name for name in names if visibility.get(name, "visible").lower() == "visible"]
    active = active_sheet_name if active_sheet_name in visible_names else None
    if active is None:
        current_active = parse_active_sheet_from_workbook(workbook_xml)
        active = current_active if current_active in visible_names else (visible_names[0] if visible_names else None)
    selected = visible_names if include_all_sheets else [
        name for name in (selected_sheet_names or []) if name in visible_names
    ]
    if not selected:
        selected = [active] if active else []
    if not selected:
        return xlsx_bytes
    if active not in selected:
        active = selected[0]

    selected_set = set(selected)
    sheet_index = {name: index for index, name in enumerate(names)}

    def patch_sheet_states(match: re.Match[str]) -> str:
        attrs = match.group(1) or ""
        name_match = re.search(r'\bname\s*=\s*(["\'])(.*?)\1', attrs)
        if not name_match:
            return match.group(0)
        name = _unescape_xml(name_match.group(2))
        if name not in names:
            return match.group(0)
        existing = visibility.get(name)
        state = existing if existing and existing.lower() != "visible" else (None if name in selected_set else "hidden")
        attrs = re.sub(r"/\s*$", "", attrs)
        attrs = re.sub(r'\s+state\s*=\s*(["\'])[^"\']*\1', "", attrs, flags=re.IGNORECASE)
        if state:
            attrs = f'{attrs.rstrip()} state="{state}"'
        tag_match = re.match(r"<((?:[A-Za-z_][\w.-]*:)?sheet)\b", match.group(0), re.IGNORECASE)
        tag_name = tag_match.group(1) if tag_match else "sheet"
        return f"<{tag_name}{attrs}/>"

    workbook_xml = _WB_SHEET_TAG_RE.sub(patch_sheet_states, workbook_xml)
    workbook_xml = apply_active_tab_to_workbook(workbook_xml, sheet_index[active])
    if print_area_ranges is not None:
        workbook_xml = _set_local_print_area(
            workbook_xml,
            sheet_index[active],
            active,
            _normalize_print_area_ranges(print_area_ranges),
        )
    replacements: dict[str, str | bytes | None] = {XLSX_WORKBOOK_ENTRY: workbook_xml}
    for name in names:
        raw = read_zip_entry(xlsx_bytes, entries[name])
        if not raw:
            continue
        sheet_xml = raw.decode("utf-8", errors="replace")
        replacements[entries[name]] = apply_sheet_view_selection(sheet_xml, name in selected_set)
    return patch_ooxml_zip(xlsx_bytes, replacements)


def parse_active_sheet_from_fods(fods_xml: str | None) -> str | None:
    """Read ActiveTable from FODS office:settings config:name="ActiveTable".
    
    Returns the active sheet name as written by serializeToFods(), or None if not found.
    """
    if not fods_xml:
        return None
    match = re.search(
        r'<config:config-item\b[^>]*config:name\s*=\s*["\']ActiveTable["\'][^>]*>([^<]*)</config:config-item>',
        fods_xml,
        re.IGNORECASE
    )
    if match:
        return _unescape_xml(match.group(1))
    return None


def apply_active_tab_to_workbook(workbook_xml: str, active_tab: int) -> str:
    """Write activeTab back into xl/workbook.xml <workbookView> element."""
    xml = workbook_xml or ""
    if not xml:
        return xml
    # Capture attributes and optional self-closing slash separately
    match = re.search(r"<(?:\w+:)?workbookView\b([^>]*?)(/?)\s*>", xml, re.IGNORECASE)
    if not match:
        return xml
    attrs = match.group(1) or ""
    self_closing = match.group(2) == "/"
    # Replace or add activeTab attribute
    if re.search(r'\bactiveTab\s*=', attrs, re.IGNORECASE):
        attrs = re.sub(r'\bactiveTab\s*=\s*(["\'])\d+\1', f'activeTab="{active_tab}"', attrs, flags=re.IGNORECASE)
    else:
        attrs = f'{attrs.rstrip()} activeTab="{active_tab}"'
    if attrs and not attrs.startswith(" "):
        attrs = f" {attrs}"
    next_tag = f"<workbookView{attrs}/>" if self_closing else f"<workbookView{attrs}>"
    return xml[: match.start()] + next_tag + xml[match.end() :]


def parse_tab_colors_from_fods(fods_xml: str | None) -> dict[str, str]:
    """Parse sheet tab colors from FODS.

    Reads either:
      1) Attributes on <table:table>: vno:tab-color, tableooo:tab-color, table:tab-color
      2) Attributes on the table's style <style:table-properties>: table:tab-color, tableooo:tab-color
    Returns dict mapping sheet name -> '#RRGGBB' hex color string.
    """
    result: dict[str, str] = {}
    if not fods_xml:
        return result

    # 1. Parse table styles for tab-color
    style_colors: dict[str, str] = {}
    for style_match in re.finditer(
        r'<style:style\b([^>]*style:family=["\']table["\'][^>]*)>(.*?)</style:style>',
        fods_xml,
        re.DOTALL | re.IGNORECASE,
    ):
        style_attrs = style_match.group(1)
        style_body = style_match.group(2)
        name_m = re.search(r'style:name=["\']([^"\']*)["\']', style_attrs, re.IGNORECASE)
        if not name_m:
            continue
        style_name = _unescape_xml(name_m.group(1))
        prop_m = re.search(r'<style:table-properties\b([^>]*)/?>', style_body, re.IGNORECASE)
        if prop_m:
            color_m = re.search(r'(?:table|tableooo|vno):tab-color=["\']([^"\']*)["\']', prop_m.group(1), re.IGNORECASE)
            if color_m:
                color = color_m.group(1).strip()
                if color:
                    style_colors[style_name] = f"#{color.lstrip('#').upper()}"

    for style_match in re.finditer(
        r'<style:style\b([^>]*style:name=["\']([^"\']*)["\'][^>]*style:family=["\']table["\'][^>]*>|style:style\b[^>]*style:family=["\']table["\'][^>]*style:name=["\']([^"\']*)["\'][^>]*>)(.*?)</style:style>',
        fods_xml,
        re.DOTALL | re.IGNORECASE,
    ):
        name = _unescape_xml(style_match.group(2) or style_match.group(3) or "")
        if name and name not in style_colors:
            body = style_match.group(4)
            prop_m = re.search(r'<style:table-properties\b([^>]*)/?>', body, re.IGNORECASE)
            if prop_m:
                color_m = re.search(r'(?:table|tableooo|vno):tab-color=["\']([^"\']*)["\']', prop_m.group(1), re.IGNORECASE)
                if color_m:
                    color = color_m.group(1).strip()
                    if color:
                        style_colors[name] = f"#{color.lstrip('#').upper()}"

    # 2. Parse table:table elements
    for match in re.finditer(r'<table:table(?=[\s>/])([^>]*)>', fods_xml, re.IGNORECASE):
        attrs = match.group(1)
        name_m = re.search(r'table:name=["\']([^"\']*)["\']', attrs, re.IGNORECASE)
        if not name_m:
            continue
        sheet_name = _unescape_xml(name_m.group(1))

        # Direct attribute on table:table
        color_m = re.search(r'(?:vno|tableooo|table):tab-color=["\']([^"\']*)["\']', attrs, re.IGNORECASE)
        if color_m and color_m.group(1).strip():
            result[sheet_name] = f"#{color_m.group(1).strip().lstrip('#').upper()}"
            continue

        # Look up via table:style-name
        style_m = re.search(r'table:style-name=["\']([^"\']*)["\']', attrs, re.IGNORECASE)
        if style_m:
            style_name = _unescape_xml(style_m.group(1))
            if style_name in style_colors:
                result[sheet_name] = style_colors[style_name]

    return result


def apply_tab_color_to_worksheet(sheet_xml: str, color: str) -> str:
    """Ensure worksheet XML has <sheetPr><tabColor rgb="FFRRGGBB"/></sheetPr>."""
    xml = sheet_xml or ""
    if not color:
        return xml
    clean_hex = color.lstrip("#").upper()
    if len(clean_hex) == 6:
        argb = f"FF{clean_hex}"
    elif len(clean_hex) == 8:
        argb = clean_hex
    else:
        return xml

    tab_color_elem = f'<tabColor rgb="{argb}"/>'

    # Check if tabColor already exists
    if re.search(r'<tabColor\b', xml, re.IGNORECASE):
        return re.sub(r'<tabColor\b[^>]*\/?>', tab_color_elem, xml, flags=re.IGNORECASE)

    # Check if sheetPr exists
    sheet_pr_match = re.search(r'<sheetPr\b([^>]*?)(\s*/?>)', xml, re.IGNORECASE)
    if sheet_pr_match:
        attrs = sheet_pr_match.group(1) or ""
        close = sheet_pr_match.group(2)
        full_pr_match = re.search(r'(<sheetPr\b[^>]*>)([\s\S]*?)(</sheetPr>)', xml, re.IGNORECASE)
        if full_pr_match:
            open_tag = full_pr_match.group(1)
            pr_body = full_pr_match.group(2)
            close_tag = full_pr_match.group(3)
            return xml[: full_pr_match.start()] + open_tag + tab_color_elem + pr_body + close_tag + xml[full_pr_match.end() :]
        elif close.strip() == "/>":
            replacement = f"<sheetPr{attrs}>{tab_color_elem}</sheetPr>"
            return xml[: sheet_pr_match.start()] + replacement + xml[sheet_pr_match.end() :]
    else:
        # sheetPr missing: insert at beginning in schema order
        new_pr = f"<sheetPr>{tab_color_elem}</sheetPr>"
        return _insert_worksheet_child_in_schema_order(xml, new_pr, "sheetPr")
    return xml


def apply_sheet_view_selection(sheet_xml: str, is_active: bool) -> str:
    """Ensure active worksheet has tabSelected="1" on its sheetView, and inactive worksheets do not."""
    xml = sheet_xml or ""
    if is_active:
        if re.search(r"<sheetViews\b", xml, re.IGNORECASE):
            def update_first_view(m: re.Match) -> str:
                tag = m.group(0)
                if re.search(r'\btabSelected\s*=', tag, re.IGNORECASE):
                    return re.sub(r'\btabSelected\s*=\s*(["\'])[^"\']*\1', 'tabSelected="1"', tag, flags=re.IGNORECASE)
                if tag.endswith("/>"):
                    return tag[:-2].rstrip() + ' tabSelected="1"/>'
                return tag[:-1].rstrip() + ' tabSelected="1">'
            xml = re.sub(r"<sheetView\b[^>]*>", update_first_view, xml, count=1, flags=re.IGNORECASE)
        else:
            sv_elem = '<sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews>'
            xml = _insert_worksheet_child_in_schema_order(xml, sv_elem, "sheetViews")
    else:
        def remove_selected(m: re.Match) -> str:
            tag = m.group(0)
            return re.sub(r'\s+tabSelected\s*=\s*(["\'])[^"\']*\1', '', tag, flags=re.IGNORECASE)
        xml = re.sub(r"<sheetView\b[^>]*>", remove_selected, xml, flags=re.IGNORECASE)
    return xml


def ensure_config_xmlns(fods_xml: str) -> str:
    """Ensure root <office:document> declares xmlns:config."""
    xml = fods_xml or ""
    if re.search(r"xmlns:config\s*=", xml, re.IGNORECASE):
        return xml
    match = _OFFICE_DOCUMENT_OPEN_RE.search(xml)
    if not match:
        return xml
    attrs = match.group(1) or ""
    next_tag = f'<office:document{attrs} xmlns:config="{CONFIG_NS}">'
    return xml[: match.start()] + next_tag + xml[match.end() :]


def apply_active_sheet_to_fods(fods_xml: str | None, active_sheet: str | None) -> str:
    """Set FODS ActiveTable from the authoritative XLSX workbookView selection."""
    xml = fods_xml or ""
    if not active_sheet or not xml:
        return xml

    escaped = _escape_xml(active_sheet)
    existing = re.compile(
        r'(<config:config-item\b[^>]*config:name\s*=\s*(["\'])ActiveTable\2[^>]*>)[^<]*(</config:config-item>)',
        re.IGNORECASE,
    )
    if existing.search(xml):
        return existing.sub(lambda match: match.group(1) + escaped + match.group(3), xml, count=1)

    active_item = f'<config:config-item config:name="ActiveTable" config:type="string">{escaped}</config:config-item>'

    xml = ensure_config_xmlns(xml)

    # 1. Inside existing ooo:view-settings
    view_match = _VIEW_SETTINGS_SET_RE.search(xml)
    if view_match:
        open_tag = view_match.group(1)
        inner = view_match.group(3)
        close_tag = view_match.group(4)
        entry_match = _VIEW_MAP_ENTRY_RE.search(inner)
        if entry_match:
            entry_idx = inner.find(entry_match.group(0))
            close_entry_idx = inner.find("</config:config-item-map-entry>", entry_idx)
            new_inner = inner[:close_entry_idx] + active_item + inner[close_entry_idx:]
            return xml[: view_match.start()] + open_tag + new_inner + close_tag + xml[view_match.end() :]
        views_block = (
            '<config:config-item-map-indexed config:name="Views">'
            '<config:config-item-map-entry>'
            f'{active_item}'
            '</config:config-item-map-entry>'
            '</config:config-item-map-indexed>'
        )
        return xml[: view_match.start()] + open_tag + inner + views_block + close_tag + xml[view_match.end() :]

    # 2. Inside existing office:settings
    settings_match = _OFFICE_SETTINGS_RE.search(xml)
    if settings_match:
        open_tag = settings_match.group(1)
        inner = settings_match.group(2)
        close_tag = settings_match.group(3)
        set_block = (
            '<config:config-item-set config:name="ooo:view-settings">'
            '<config:config-item-map-indexed config:name="Views">'
            '<config:config-item-map-entry>'
            f'{active_item}'
            '</config:config-item-map-entry>'
            '</config:config-item-map-indexed>'
            '</config:config-item-set>'
        )
        return xml[: settings_match.start()] + open_tag + inner + set_block + close_tag + xml[settings_match.end() :]

    # 3. Create office:settings before office:body
    full_block = (
        '<office:settings>'
        '<config:config-item-set config:name="ooo:view-settings">'
        '<config:config-item-map-indexed config:name="Views">'
        '<config:config-item-map-entry>'
        f'{active_item}'
        '</config:config-item-map-entry>'
        '</config:config-item-map-indexed>'
        '</config:config-item-set>'
        '</office:settings>'
    )
    body_match = _OFFICE_BODY_RE.search(xml)
    if body_match:
        return xml[: body_match.start()] + full_block + xml[body_match.start() :]

    doc_close = _OFFICE_DOCUMENT_CLOSE_RE.search(xml)
    if doc_close:
        return xml[: doc_close.start()] + full_block + xml[doc_close.start() :]

    return xml + full_block


def overlay_active_sheet_to_fods(fods_xml: str | None, workbook_xml: str | None) -> str:
    """Read activeTab from workbook_xml and ensure FODS has ActiveTable set."""
    xml = fods_xml or ""
    if not workbook_xml:
        return xml
    active_sheet = parse_active_sheet_from_workbook(workbook_xml)
    if not active_sheet:
        return xml
    return apply_active_sheet_to_fods(xml, active_sheet)


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# CT_Worksheet child-element schema order (ECMA-376 §18.3.1.73)
# ---------------------------------------------------------------------------

_WORKSHEET_CHILD_ORDER: tuple[str, ...] = (
    "sheetPr",
    "dimension",
    "sheetViews",
    "sheetFormatPr",
    "cols",
    "sheetData",
    "sheetCalcPr",
    "sheetProtection",
    "protectedRanges",
    "scenarios",
    "autoFilter",
    "sortState",
    "dataConsolidate",
    "customSheetViews",
    "mergeCells",
    "phoneticPr",
    "conditionalFormatting",
    "dataValidations",
    "hyperlinks",
    "printOptions",
    "pageMargins",
    "pageSetup",
    "headerFooter",
    "rowBreaks",
    "colBreaks",
    "customProperties",
    "cellWatches",
    "ignoredErrors",
    "smartTags",
    "drawing",
    "legacyDrawing",
    "legacyDrawingHF",
    "picture",
    "oleObjects",
    "controls",
    "webPublishItems",
    "tableParts",
    "extLst",
)

_WORKSHEET_CHILD_ORDER_INDEX: dict[str, int] = {
    name.lower(): idx for idx, name in enumerate(_WORKSHEET_CHILD_ORDER)
}

_WORKSHEET_CHILD_TAG_RE = re.compile(
    r"<(?:[\w]+:)?(\w+)(?:\b[^>]*)?\s*(?:/>|>)",
    re.IGNORECASE,
)


def _insert_worksheet_child_in_schema_order(
    xml: str, element_xml: str, element_name: str
) -> str:
    """Insert *element_xml* into *xml* (a CT_Worksheet string) at the correct
    position according to ECMA-376 child-element order.

    If *element_name* is already present the original *xml* is returned
    unchanged.  Falls back to appending before ``</worksheet>`` when the
    tag is not in the known order list.
    """
    if not element_xml or not element_name:
        return xml

    tag_lower = element_name.lower()

    if re.search(
        rf"<(?:[\w]+:)?{re.escape(tag_lower)}\b",
        xml,
        re.IGNORECASE,
    ):
        return xml

    target_idx = _WORKSHEET_CHILD_ORDER_INDEX.get(tag_lower)
    if target_idx is None:
        marker = "</worksheet>"
        pos = xml.rfind(marker)
        if pos == -1:
            return xml + element_xml
        return xml[:pos] + element_xml + xml[pos:]

    best_pos = None
    for m in _WORKSHEET_CHILD_TAG_RE.finditer(xml):
        child_name = m.group(1).lower()
        child_idx = _WORKSHEET_CHILD_ORDER_INDEX.get(child_name)
        if child_idx is not None and child_idx < target_idx:
            best_pos = m.end()

    if best_pos is not None:
        return xml[:best_pos] + element_xml + xml[best_pos:]

    insert_before = None
    for m in _WORKSHEET_CHILD_TAG_RE.finditer(xml):
        child_name = m.group(1).lower()
        child_idx = _WORKSHEET_CHILD_ORDER_INDEX.get(child_name)
        if child_idx is not None and child_idx > target_idx:
            insert_before = m.start()
            break

    if insert_before is not None:
        return xml[:insert_before] + element_xml + xml[insert_before:]

    marker = "</worksheet>"
    pos = xml.rfind(marker)
    if pos == -1:
        return xml + element_xml
    return xml[:pos] + element_xml + xml[pos:]


# AutoFilter overlay (database-ranges in ODF ↔ <autoFilter> in OOXML)
# ---------------------------------------------------------------------------

_AUTOFILTER_REF_RE = re.compile(r'<autoFilter\b[^>]*ref="([^"]*)"[^>]*/?\s*>', re.IGNORECASE)
_DB_RANGE_RE = re.compile(r'<table:database-range\b([^>]*)/>', re.IGNORECASE)
_DB_RANGES_OPEN_RE = re.compile(r'<table:database-ranges\b[^>]*>', re.IGNORECASE)


def parse_autofilter_from_worksheet(sheet_xml: str | None) -> str | None:
    """Read <autoFilter ref="A1:D10"/> from a single worksheetN.xml. Returns the
    ref string or None."""
    if not sheet_xml:
        return None
    m = _AUTOFILTER_REF_RE.search(sheet_xml)
    return m.group(1) if m else None


def apply_autofilter_to_fods(fods_xml: str, autofilter_by_sheet: dict[str, str]) -> str:
    """Inject <table:database-ranges> into FODS before </office:spreadsheet>.
    Each entry: {sheet_name: "A1:D10"}.  Used during File → Mở."""
    xml = fods_xml or ""
    if not autofilter_by_sheet:
        return xml
    ranges_xml = []
    # LibreOffice treats "__Anonymous_Sheet_DB__<n>" as the sheet's own
    # AutoFilter range and exports it as <autoFilter>; any other name becomes an
    # Excel Table part (xl/tables/tableN.xml) that Excel rejects when the range
    # is header-only or has an empty column caption (measured on lan11.xlsx).
    for index, (sheet_name, ref) in enumerate(autofilter_by_sheet.items()):
        ranges_xml.append(
            f'<table:database-range table:name="__Anonymous_Sheet_DB__{index}"'
            f' table:target-range-address="{_escape_xml(sheet_name)}.{_escape_xml(ref)}"'
            f' table:display-filter-buttons="true"/>'
        )
    db_block = f'<table:database-ranges>{"".join(ranges_xml)}</table:database-ranges>'
    marker = "</office:spreadsheet>"
    idx = xml.rfind(marker)
    if idx == -1:
        return xml + db_block
    return xml[:idx] + db_block + xml[idx:]


_TABLE_PART_NAME_RE = re.compile(r'<table\b[^>]*\bname="([^"]*)"', re.IGNORECASE)


def strip_autofilter_table_parts(xlsx_bytes: bytes, replacements: dict[str, str | bytes | None]) -> None:
    """Drop Excel Table parts LibreOffice generates for AutoFilter database ranges.

    A named database range (``AutoFilter_<sheet>`` from older 3T Office saves or
    LibreOffice's own ``__Anonymous_Sheet_DB__<n>``) is exported as
    ``xl/tables/tableN.xml``. Excel refuses to open such a table when the range is
    header-only (``ref="A3:F3"``) or a column caption is empty — measured on
    lan11.xlsx. The sheet-level ``<autoFilter>`` written by
    ``apply_autofilter_to_worksheet`` already carries the filter, so the table
    part, its relationship, ``<tablePart>`` reference and content-type override
    are removed.
    """
    with zipfile.ZipFile(io.BytesIO(xlsx_bytes), "r") as archive:
        names = archive.namelist()
    tables_to_drop: set[str] = set()
    for name in names:
        if not re.match(r"xl/tables/table\d+\.xml$", name):
            continue
        content = replacements.get(name)
        if content is None:
            raw = read_zip_entry(xlsx_bytes, name)
            content = raw.decode("utf-8", errors="replace") if raw else ""
        elif isinstance(content, bytes):
            content = content.decode("utf-8", errors="replace")
        table_name = _TABLE_PART_NAME_RE.search(content or "")
        if table_name and re.match(r"(?:AutoFilter_|__Anonymous_Sheet_DB__)", table_name.group(1)):
            tables_to_drop.add(name)
    if not tables_to_drop:
        return
    for name in tables_to_drop:
        replacements[name] = None
    for rels_name in names:
        if not re.match(r"xl/worksheets/_rels/sheet\d+\.xml\.rels$", rels_name):
            continue
        rels_raw = replacements.get(rels_name)
        if rels_raw is None:
            raw = read_zip_entry(xlsx_bytes, rels_name)
            rels_raw = raw.decode("utf-8", errors="replace") if raw else ""
        elif isinstance(rels_raw, bytes):
            rels_raw = rels_raw.decode("utf-8", errors="replace")
        dropped_ids: list[str] = []

        def drop_rel(match: re.Match[str]) -> str:
            attrs = match.group(0)
            target = re.search(r'Target="([^"]*)"', attrs)
            rid = re.search(r'\bId="([^"]*)"', attrs)
            if target and rid:
                resolved = "xl/" + target.group(1).replace("../", "").lstrip("/")
                if resolved in tables_to_drop:
                    dropped_ids.append(rid.group(1))
                    return ""
            return attrs

        next_rels = re.sub(r"<Relationship\b[^>]*/>", drop_rel, rels_raw)
        if not dropped_ids:
            continue
        replacements[rels_name] = next_rels
        sheet_name = rels_name.replace("/_rels/", "/").replace(".rels", "")
        sheet_xml = replacements.get(sheet_name)
        if sheet_xml is None:
            raw = read_zip_entry(xlsx_bytes, sheet_name)
            sheet_xml = raw.decode("utf-8", errors="replace") if raw else ""
        elif isinstance(sheet_xml, bytes):
            sheet_xml = sheet_xml.decode("utf-8", errors="replace")
        for rid in dropped_ids:
            sheet_xml = re.sub(rf'<tablePart\b[^>]*\br:id="{re.escape(rid)}"[^>]*/>', "", sheet_xml)
        sheet_xml = re.sub(r"<tableParts\b[^>]*>\s*</tableParts>", "", sheet_xml)
        sheet_xml = re.sub(r'<tableParts\b[^>]*count="\d+"', lambda m: re.sub(r'count="\d+"', f'count="{len(re.findall(r"<tablePart\b", sheet_xml))}"', m.group(0)), sheet_xml)
        replacements[sheet_name] = sheet_xml
    ct_raw = replacements.get("[Content_Types].xml")
    if ct_raw is None:
        raw = read_zip_entry(xlsx_bytes, "[Content_Types].xml")
        ct_raw = raw.decode("utf-8", errors="replace") if raw else ""
    elif isinstance(ct_raw, bytes):
        ct_raw = ct_raw.decode("utf-8", errors="replace")
    for name in tables_to_drop:
        ct_raw = re.sub(rf'<Override PartName="/{re.escape(name)}"[^>]*/>', "", ct_raw)
    replacements["[Content_Types].xml"] = ct_raw


def parse_autofilter_from_fods(fods_xml: str | None) -> dict[str, str]:
    """Read <table:database-range> from FODS. Returns {sheet_name: ref}."""
    result: dict[str, str] = {}
    if not fods_xml:
        return result
    for match in _DB_RANGE_RE.finditer(fods_xml):
        attrs = match.group(1) or ""
        target_match = re.search(r'table:target-range-address="([^"]*)"', attrs)
        if not target_match:
            continue
        target = _unescape_xml(target_match.group(1))
        # S27a: Calc ghi 'Tên sheet'.A1:'Tên sheet'.D10 (định danh sheet ở CẢ HAI đầu, nháy đơn khi tên có dấu cách);
        # autoFilter@ref của OOXML chỉ nhận vùng cục bộ A1:D10 (lan14: "A12:Sheet1.AW33632" làm Excel không mở).
        range_match = re.match(
            r"^(.+?)\.(\$?[A-Za-z]{1,3}\$?\d+):(?:.+\.)?(\$?[A-Za-z]{1,3}\$?\d+)$",
            target,
        )
        if not range_match:
            continue
        sheet_name = range_match.group(1).strip("'")
        ref = f"{range_match.group(2)}:{range_match.group(3)}"
        if sheet_name and ref:
            result[sheet_name] = ref
    return result


def parse_autofilter_filter_columns_from_fods(fods_xml: str | None) -> dict[str, list[dict]]:
    """Read VN's discrete active-filter metadata from FODS database ranges."""
    result: dict[str, list[dict]] = {}
    if not fods_xml:
        return result
    for match in _DB_RANGE_RE.finditer(fods_xml):
        attrs = match.group(1) or ""
        target_match = re.search(r'table:target-range-address="([^"]*)"', attrs)
        columns_match = re.search(r'vno:filter-columns="([^"]*)"', attrs, re.IGNORECASE)
        if not target_match or not columns_match:
            continue
        target = _unescape_xml(target_match.group(1))
        range_match = re.match(r"^(.+?)\.(\$?[A-Za-z]{1,3}\$?\d+):(?:.+\.)?(\$?[A-Za-z]{1,3}\$?\d+)$", target)
        if not range_match:
            continue
        try:
            decoded = json.loads(_unescape_xml(columns_match.group(1)))
        except (TypeError, ValueError):
            continue
        sheet_name = range_match.group(1).strip("'")
        if sheet_name and isinstance(decoded, list):
            result[sheet_name] = [
                {"colId": int(item["colId"]), "values": [str(value) for value in item["values"]]}
                for item in decoded
                if isinstance(item, dict) and isinstance(item.get("values"), list)
            ]
    return result


def apply_autofilter_to_worksheet(sheet_xml: str, ref: str, filter_columns: list[dict] | None = None) -> str:
    """Inject <autoFilter ref="..."/> into a worksheet XML if not already present.

    Position follows CT_Worksheet schema order (after ``sheetProtection`` /
    ``scenarios``, before ``sortState`` / ``mergeCells`` / …).
    """
    xml = sheet_xml or ""
    if not ref:
        return xml
    existing = _AUTOFILTER_REF_RE.search(xml)
    if filter_columns:
        column_xml = "".join(
            f'<filterColumn colId="{int(column["colId"])}"><filters>'
            + "".join(f'<filter val="{_escape_xml(str(value))}"/>' for value in column["values"])
            + "</filters></filterColumn>"
            for column in filter_columns if column.get("values")
        )
        paired = re.search(r'<autoFilter\b([^>]*)>([\s\S]*?)</autoFilter>', xml, re.IGNORECASE)
        if paired:
            attrs, body = paired.group(1), paired.group(2)
            body = re.sub(r'<filterColumn\b[^>]*>[\s\S]*?</filterColumn>', "", body, flags=re.IGNORECASE)
            body = re.sub(r'<filterColumn\b[^>]*/>', "", body, flags=re.IGNORECASE)
            tag = f'<autoFilter{attrs}>{body}{column_xml}</autoFilter>'
            xml = xml[:paired.start()] + tag + xml[paired.end():]
        elif existing:
            tag = f'<autoFilter ref="{ref}">{column_xml}</autoFilter>'
            xml = xml[:existing.start()] + tag + xml[existing.end():]
        else:
            element_xml = f'<autoFilter ref="{ref}">{column_xml}</autoFilter>'
            return _insert_worksheet_child_in_schema_order(xml, element_xml, "autoFilter")
        existing = _AUTOFILTER_REF_RE.search(xml)
    if existing:
        # S27a: chỉ thay giá trị ref, giữ nguyên thẻ (tự đóng hay cặp) và các <filterColumn> con — thay cả thẻ mở
        # bằng thẻ tự đóng để dư </autoFilter> làm worksheet XML hỏng (lan11/lan14/lan20 Excel không mở).
        tag = existing.group(0)
        new_tag = re.sub(r'\bref="[^"]*"', f'ref="{ref}"', tag, count=1)
        return xml[:existing.start()] + new_tag + xml[existing.end():]
    element_xml = f'<autoFilter ref="{ref}"/>'
    return _insert_worksheet_child_in_schema_order(xml, element_xml, "autoFilter")


def _apply_filter_database_names(xlsx_bytes: bytes, autofilter_by_sheet: dict[str, str], workbook_xml: str | None = None) -> str | None:
    """Add Excel's sheet-scoped _FilterDatabase defined name for active filters."""
    if not autofilter_by_sheet:
        return None
    if workbook_xml is None:
        workbook = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
        if not workbook:
            return None
        workbook_xml = workbook.decode("utf-8", errors="replace")
    xml = workbook_xml
    names = re.findall(r'<sheet\b[^>]*\bname="([^"]+)"', xml, re.IGNORECASE)
    additions = []
    for index, sheet_name in enumerate(names):
        ref = next((value for key, value in autofilter_by_sheet.items() if key.casefold() == _unescape_xml(sheet_name).casefold()), None)
        if not ref:
            continue
        name = "_xlnm._FilterDatabase"
        if re.search(rf'<definedName\b(?=[^>]*\bname="{re.escape(name)}")(?=[^>]*\blocalSheetId="{index}")[^>]*>', xml, re.IGNORECASE):
            continue
        # Normalize both endpoints to absolute references.
        endpoints = ref.split(":")
        absolute_ref = ":".join("$" + re.sub(r"([A-Z]+)(\d+)", r"\1$\2", endpoint.replace("$", "")) for endpoint in endpoints)
        sheet_ref = _escape_xml(f"'{_unescape_xml(sheet_name).replace(chr(39), chr(39) * 2)}'!{absolute_ref}")
        additions.append(f'<definedName name="{name}" localSheetId="{index}" hidden="1">{sheet_ref}</definedName>')
    if not additions:
        return None
    block = re.search(r'<definedNames\b[^>]*>([\s\S]*?)</definedNames>', xml, re.IGNORECASE)
    if block:
        return xml[:block.end() - len("</definedNames>")] + "".join(additions) + xml[block.end() - len("</definedNames>"):]
    anchor = re.search(r'<(?:calcPr|oleSize|customWorkbookViews|extLst)\b|</workbook>', xml, re.IGNORECASE)
    if not anchor:
        return None
    return xml[:anchor.start()] + f'<definedNames>{"".join(additions)}</definedNames>' + xml[anchor.start():]


def parse_scenarios_from_fods(fods_xml: str | None) -> dict[str, list[dict]]:
    result: dict[str, list[dict]] = {}
    for match in re.finditer(r"<table:table\b([^>]*)>", fods_xml or "", re.IGNORECASE):
        attrs = match.group(1)
        name_m = re.search(r'table:name="([^"]*)"', attrs, re.IGNORECASE)
        scen_m = re.search(r'vno:scenarios="([^"]*)"', attrs, re.IGNORECASE)
        if name_m and scen_m:
            try:
                decoded = _unescape_xml(scen_m.group(1))
                list_data = json.loads(decoded)
                if isinstance(list_data, list) and list_data:
                    result[_unescape_xml(name_m.group(1))] = list_data
            except Exception:
                pass
    return result


def build_scenarios_xml(scenarios: list[dict]) -> str:
    if not scenarios:
        return ""
    tags = []
    for s in scenarios:
        cells = []
        raw_changing = s.get("changingCells") or []
        if isinstance(raw_changing, str):
            changing = [c.strip().replace("$", "") for c in raw_changing.split(",") if c.strip()]
        else:
            changing = [str(c).strip().replace("$", "") for c in raw_changing if str(c).strip()]
        vals = s.get("values") or []
        for idx, coord in enumerate(changing):
            v = vals[idx] if idx < len(vals) else ""
            cells.append(f'<inputCells r="{html.escape(str(coord))}" val="{html.escape(str(v))}"/>')
        comment_attr = f' comment="{html.escape(str(s["comment"]))}"' if s.get("comment") else ""
        tags.append(f'<scenario name="{html.escape(str(s.get("name", "")))}"{comment_attr} count="{len(changing)}">{"".join(cells)}</scenario>')
    return f'<scenarios current="0" show="0">{"".join(tags)}</scenarios>'


def apply_scenarios_to_worksheet(sheet_xml: str, scenarios: list[dict]) -> str:
    xml = sheet_xml or ""
    element_xml = build_scenarios_xml(scenarios)
    if not element_xml:
        return xml
    xml = re.sub(r'<scenarios\b[\s\S]*?<\/scenarios>', '', xml, flags=re.IGNORECASE)
    return _insert_worksheet_child_in_schema_order(xml, element_xml, "scenarios")


def parse_scenarios_from_worksheet(sheet_xml: str) -> list[dict]:
    if not sheet_xml:
        return []
    m = re.search(r'<scenarios\b[^>]*>([\s\S]*?)<\/scenarios>', sheet_xml, re.IGNORECASE)
    if not m:
        return []
    body = m.group(1)
    scenarios = []
    for scen_m in re.finditer(r'<scenario\b([^>]*)>([\s\S]*?)<\/scenario>', body, re.IGNORECASE):
        attrs = scen_m.group(1)
        inner = scen_m.group(2)
        name_m = re.search(r'name="([^"]*)"', attrs, re.IGNORECASE)
        comment_m = re.search(r'comment="([^"]*)"', attrs, re.IGNORECASE)
        name = _unescape_xml(name_m.group(1)) if name_m else ""
        comment = _unescape_xml(comment_m.group(1)) if comment_m else ""
        changing_cells = []
        values = []
        for cell_m in re.finditer(r'<inputCells\b[^>]*r="([^"]*)"[^>]*val="([^"]*)"[^>]*\/?>', inner, re.IGNORECASE):
            changing_cells.append(_unescape_xml(cell_m.group(1)))
            v = _unescape_xml(cell_m.group(2))
            try:
                num = float(v)
                values.append(int(num) if num.is_integer() else num)
            except ValueError:
                values.append(v)
        if name and changing_cells:
            scenarios.append({
                "id": f"scenario-{uuid.uuid4().hex[:8]}",
                "name": name,
                "changingCells": changing_cells,
                "values": values,
                "comment": comment
            })
    return scenarios


def _overlay_scenarios_from_xlsx(xlsx_bytes: bytes, fods_xml: str) -> str:
    sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    if not sheet_entries:
        return fods_xml
    scenarios_by_sheet = {}
    for sheet_name, entry_path in sheet_entries.items():
        entry_bytes = read_zip_entry(xlsx_bytes, entry_path)
        if not entry_bytes:
            continue
        scenarios = parse_scenarios_from_worksheet(entry_bytes.decode("utf-8", errors="replace"))
        if scenarios:
            scenarios_by_sheet[sheet_name] = scenarios
    if not scenarios_by_sheet:
        return fods_xml

    def _replace_table(match):
        attrs = match.group(1)
        name_m = re.search(r'table:name="([^"]*)"', attrs, re.IGNORECASE)
        if not name_m:
            return match.group(0)
        name = _unescape_xml(name_m.group(1))
        scens = scenarios_by_sheet.get(name)
        if not scens:
            return match.group(0)
        json_str = html.escape(json.dumps(scens, ensure_ascii=False))
        clean_attrs = re.sub(r'\bvno:scenarios="[^"]*"', '', attrs, flags=re.IGNORECASE)
        return f'<table:table{clean_attrs} vno:scenarios="{json_str}">'

    return re.sub(r'<table:table\b([^>]*)>', _replace_table, fods_xml, flags=re.IGNORECASE)


def parse_page_margins_from_fods(fods_xml: str | None) -> dict[str, dict[str, float]]:
    """Read the Sheet UI's existing margin metadata (centimeters)."""
    result = {}
    for match in re.finditer(r'<table:table(?=\s|>)([^>]*)>', fods_xml or '', re.IGNORECASE):
        attrs = _xml_attrs(match.group(1))
        if not attrs.get('table:name') or not attrs.get('vno:page-margins'):
            continue
        try:
            margins = json.loads(attrs['vno:page-margins'])
            values = {side: float(margins[side]) for side in ('top', 'bottom', 'left', 'right')}
        except (ValueError, TypeError, KeyError):
            continue
        if all(math.isfinite(value) and value >= 0 for value in values.values()):
            result[attrs['table:name']] = values
    return result


def apply_page_margins_to_worksheet(sheet_xml: str, margins: dict[str, float]) -> str:
    """Avoid LibreOffice adding header/footer heights to Excel's page margins."""
    match = re.search(r'<pageMargins\b([^>]*)/\s*>', sheet_xml, re.IGNORECASE)
    attrs = _xml_attrs(match.group(1)) if match else {'header': '0.3', 'footer': '0.3'}
    attrs.update({side: format(value / 2.54, '.15g') for side, value in margins.items()})
    element = '<pageMargins ' + ' '.join(f'{key}="{_escape_xml(value)}"' for key, value in attrs.items()) + '/>'
    if match:
        return sheet_xml[:match.start()] + element + sheet_xml[match.end():]
    return _insert_worksheet_child_in_schema_order(sheet_xml, element, 'pageMargins')


def overlay_page_margins_to_fods(xlsx_bytes: bytes, fods_xml: str) -> str:
    """Native XLSX margins are authoritative; ODF uses different header spacing."""
    margins_by_sheet = {}
    for name, entry in _resolve_xlsx_sheet_entries(xlsx_bytes).items():
        content = read_zip_entry(xlsx_bytes, entry)
        match = re.search(r'<pageMargins\b([^>]*)/\s*>', content.decode('utf-8', errors='replace') if content else '', re.IGNORECASE)
        if not match:
            continue
        attrs = _xml_attrs(match.group(1))
        try:
            margins = {side: round(float(attrs[side]) * 2.54, 12) for side in ('top', 'bottom', 'left', 'right')}
        except (ValueError, KeyError):
            continue
        if all(math.isfinite(value) and value >= 0 for value in margins.values()):
            margins_by_sheet[name] = margins
    if not margins_by_sheet:
        return fods_xml

    def replace_table(match):
        attrs = match.group(1)
        margins = margins_by_sheet.get(_xml_attrs(attrs).get('table:name'))
        if margins is None:
            return match.group(0)
        attrs = re.sub(r'\s+vno:page-margins="[^"]*"', '', attrs, flags=re.IGNORECASE)
        return f'<table:table{attrs} vno:page-margins="{_escape_xml(json.dumps(margins))}">'

    xml = _sub_table_open_tags(fods_xml, replace_table, follow=" \t\r\n\f\v>")
    if not _declares_vno_namespace(xml):
        xml = re.sub(r'<office:document\b', f'<office:document xmlns:vno="{SHEET_VNO_NS}"', xml, count=1)
    return xml


def parse_print_titles_from_fods(fods_xml: str | None) -> list[tuple[str, str, str]]:
    """Return [(sheet name, row titles, column titles)] in workbook order."""
    result: list[tuple[str, str, str]] = []
    for match in re.finditer(r"<table:table\b([^>]*)>", fods_xml or "", re.IGNORECASE):
        attrs = match.group(1)
        name = re.search(r'table:name="([^"]*)"', attrs, re.IGNORECASE)
        rows = re.search(r'vno:print-title-rows="([^"]*)"', attrs, re.IGNORECASE)
        cols = re.search(r'vno:print-title-cols="([^"]*)"', attrs, re.IGNORECASE)
        if name:
            result.append((_unescape_xml(name.group(1)), _unescape_xml(rows.group(1)) if rows else "", _unescape_xml(cols.group(1)) if cols else ""))
    return result


def apply_print_titles_to_workbook(workbook_xml: str, titles: list[tuple[str, str, str]]) -> str:
    xml = workbook_xml or ""
    xml = re.sub(r'<definedName\b(?=[^>]*\bname="_xlnm\.Print_Titles")[^>]*>[\s\S]*?</definedName\s*>', "", xml, flags=re.IGNORECASE)
    entries = []
    for sheet_index, (sheet_name, rows, cols) in enumerate(titles):
        refs = []
        quoted = "'" + sheet_name.replace("'", "''") + "'!"
        if rows:
            start, _, end = rows.partition(":")
            end = end or start
            refs.append(f"{quoted}${start}:$" + end)
        if cols:
            start, _, end = cols.partition(":")
            end = end or start
            refs.append(f"{quoted}${start}:$" + end)
        if refs:
            entries.append(f'<definedName name="_xlnm.Print_Titles" localSheetId="{sheet_index}">{_escape_xml(",".join(refs))}</definedName>')
    if not entries:
        return xml
    block = "".join(entries)
    close = re.search(r"</definedNames\s*>", xml, re.IGNORECASE)
    if close:
        return xml[:close.start()] + block + xml[close.start():]
    sheets_end = re.search(r"</sheets\s*>", xml, re.IGNORECASE)
    if sheets_end:
        return xml[:sheets_end.end()] + f"<definedNames>{block}</definedNames>" + xml[sheets_end.end():]
    return xml


def parse_print_titles_from_workbook(workbook_xml: str | None) -> dict[str, dict[str, str]]:
    """Read local _xlnm.Print_Titles definitions from an OOXML workbook."""
    sheet_names = [
        _unescape_xml(match.group(1))
        for match in re.finditer(r'<sheet\b[^>]*\bname="([^"]*)"[^>]*/?>', workbook_xml or "", re.IGNORECASE)
    ]
    result: dict[str, dict[str, str]] = {}
    for match in re.finditer(r'<definedName\b([^>]*)>([\s\S]*?)</definedName\s*>', workbook_xml or "", re.IGNORECASE):
        attrs, expression = match.group(1), _unescape_xml(match.group(2))
        name = re.search(r'\bname="([^"]*)"', attrs, re.IGNORECASE)
        local_id = re.search(r'\blocalSheetId="(\d+)"', attrs, re.IGNORECASE)
        if not name or name.group(1).casefold() != "_xlnm.print_titles" or not local_id:
            continue
        index = int(local_id.group(1))
        if index < 0 or index >= len(sheet_names):
            continue
        titles = {"rows": "", "cols": ""}
        for area in re.finditer(r"(?:'((?:[^']|'')*)'|([^!,]+))!\$([A-Z]+|\d+):\$([A-Z]+|\d+)", expression, re.IGNORECASE):
            start, end = area.group(3).upper(), area.group(4).upper()
            if start.isdigit() and end.isdigit():
                titles["rows"] = start if start == end else f"{start}:{end}"
            elif start.isalpha() and end.isalpha():
                titles["cols"] = start if start == end else f"{start}:{end}"
        if titles["rows"] or titles["cols"]:
            result[sheet_names[index]] = titles
    return result


def apply_print_titles_to_fods(fods_xml: str, titles_by_sheet: dict[str, dict[str, str]]) -> str:
    """Stamp print-title metadata onto FODS tables before SheetAdapter parses them."""
    if not titles_by_sheet:
        return fods_xml

    def replace_table(match: re.Match[str]) -> str:
        attrs = match.group(1) or ""
        name_match = re.search(r'table:name="([^"]*)"', attrs, re.IGNORECASE)
        sheet_name = _unescape_xml(name_match.group(1)) if name_match else ""
        titles = titles_by_sheet.get(sheet_name)
        if not titles:
            return match.group(0)
        attrs = re.sub(r'\s+vno:print-title-rows="[^"]*"', "", attrs, flags=re.IGNORECASE)
        attrs = re.sub(r'\s+vno:print-title-cols="[^"]*"', "", attrs, flags=re.IGNORECASE)
        return (
            f'<table:table{attrs} vno:print-title-rows="{titles.get("rows", "")}"'
            f' vno:print-title-cols="{titles.get("cols", "")}">'
        )

    result = re.sub(r'<table:table\b([^>]*)>', replace_table, fods_xml, flags=re.IGNORECASE)
    if _declares_vno_namespace(result):
        return result
    match = _OFFICE_DOCUMENT_OPEN_RE.search(result)
    if not match:
        return result
    return result[:match.start()] + f'<office:document{match.group(1)} xmlns:vno="{SHEET_VNO_NS}">' + result[match.end():]


def _resolve_xlsx_sheet_entries(xlsx_bytes: bytes) -> dict[str, str]:
    """Tên sheet (thứ tự trong xl/workbook.xml) -> đường dẫn zip entry worksheetN.xml thật."""
    workbook_entry = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
    rels_entry = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_RELS_ENTRY)
    if not workbook_entry or not rels_entry:
        return {}
    workbook_xml = workbook_entry.decode("utf-8", errors="replace")
    rels_xml = rels_entry.decode("utf-8", errors="replace")

    rid_by_sheet: dict[str, str] = {}
    for match in _WB_SHEET_TAG_RE.finditer(workbook_xml):
        attrs = match.group(1) or ""
        name_match = re.search(r'name="([^"]*)"', attrs)
        rid_match = re.search(r'r:id="([^"]*)"', attrs)
        if name_match and rid_match:
            rid_by_sheet[_unescape_xml(name_match.group(1))] = rid_match.group(1)

    target_by_rid: dict[str, str] = {}
    for match in _WB_RELATIONSHIP_TAG_RE.finditer(rels_xml):
        attrs = match.group(1) or ""
        id_match = re.search(r'Id="([^"]*)"', attrs)
        target_match = re.search(r'Target="([^"]*)"', attrs)
        if id_match and target_match:
            target = target_match.group(1)
            target_by_rid[id_match.group(1)] = target if target.startswith("xl/") else f"xl/{target.lstrip('./')}"

    return {name: target_by_rid[rid] for name, rid in rid_by_sheet.items() if rid in target_by_rid}


def _extract_fods_column_widths_cm(fods_xml: str) -> dict[str, dict[str, float]]:
    """Extract column widths in cm from FODS for each sheet.
    
    Returns dict: sheet_name -> {col_letter: width_cm}
    """
    result: dict[str, dict[str, float]] = {}
    for table_match in re.finditer(r"<table:table\b([^>]*)>([\s\S]*?)</table:table>", fods_xml, re.IGNORECASE):
        table_attrs, table_body = table_match.group(1), table_match.group(2)
        name_match = re.search(r'table:name="([^"]*)"', table_attrs)
        sheet_name = _unescape_xml(name_match.group(1)) if name_match else ""
        if not sheet_name:
            continue
        cols: dict[str, float] = {}
        # Find column definitions
        for col_match in re.finditer(r"<table:table-column\b([^>]*)/>", table_body, re.IGNORECASE):
            col_attrs = col_match.group(1)
            style_match = re.search(r'table:style-name="([^"]*)"', col_attrs)
            if not style_match:
                continue
            style_name = style_match.group(1)
            # Find the column style to get width
            style_pattern = rf'<style:style\b[^>]*style:name="{re.escape(style_name)}"[^>]*>[\s\S]*?<style:table-column-properties\b[^>]*style:column-width="([\d.]+)cm"'
            style_match2 = re.search(style_pattern, fods_xml, re.IGNORECASE)
            if style_match2:
                width_cm = float(style_match2.group(1))
                # Get column index from style name or repeat attribute
                repeat_match = re.search(r'table:number-columns-repeated="(\d+)"', col_attrs)
                repeat = int(repeat_match.group(1)) if repeat_match else 1
                # We need to map this to actual column letters
                # For now, store by style name; we'll resolve column letters later
                cols[style_name] = width_cm
        if cols:
            result[sheet_name] = cols
    return result


def _get_fods_column_widths_by_letter(fods_xml: str) -> dict[str, dict[str, float]]:
    """Extract column widths in cm from FODS, mapped by column letter for each sheet.
    
    Returns dict: sheet_name -> {col_letter: width_cm}
    """
    result: dict[str, dict[str, float]] = {}
    for table_match in re.finditer(r"<table:table\b([^>]*)>([\s\S]*?)</table:table>", fods_xml, re.IGNORECASE):
        table_attrs, table_body = table_match.group(1), table_match.group(2)
        name_match = re.search(r'table:name="([^"]*)"', table_attrs)
        sheet_name = _unescape_xml(name_match.group(1)) if name_match else ""
        if not sheet_name:
            continue
        cols: dict[str, float] = {}
        col_index = 0
        # Iterate through column definitions in order
        for col_match in re.finditer(r"<table:table-column\b([^>]*)/>", table_body, re.IGNORECASE):
            col_attrs = col_match.group(1)
            style_match = re.search(r'table:style-name="([^"]*)"', col_attrs)
            repeat_match = re.search(r'table:number-columns-repeated="(\d+)"', col_attrs)
            repeat = int(repeat_match.group(1)) if repeat_match else 1
            has_width = False
            if style_match:
                style_name = style_match.group(1)
                # Find the column style to get width
                style_pattern = rf'<style:style\b[^>]*style:name="{re.escape(style_name)}"[^>]*>[\s\S]*?<style:table-column-properties\b[^>]*style:column-width="([\d.]+)cm"'
                style_match2 = re.search(style_pattern, fods_xml, re.IGNORECASE)
                if style_match2:
                    width_cm = float(style_match2.group(1))
                    has_width = True
                    for _ in range(repeat):
                        col_index += 1
                        # Convert index to column letter (1-based)
                        number = col_index
                        name = ""
                        while number:
                            number, remainder = divmod(number - 1, 26)
                            name = chr(65 + remainder) + name
                        cols[name] = width_cm
            if not has_width:
                # No style or no width - skip but still count
                col_index += repeat
        if cols:
            result[sheet_name] = cols
    return result


def _extract_fods_row_heights_cm(fods_xml: str) -> dict[str, dict[int, float]]:
    """Extract row heights in cm from FODS for each sheet.
    
    Returns dict: sheet_name -> {row_number: height_cm}
    """
    result: dict[str, dict[int, float]] = {}
    for table_match in re.finditer(r"<table:table\b([^>]*)>([\s\S]*?)</table:table>", fods_xml, re.IGNORECASE):
        table_attrs, table_body = table_match.group(1), table_match.group(2)
        name_match = re.search(r'table:name="([^"]*)"', table_attrs)
        sheet_name = _unescape_xml(name_match.group(1)) if name_match else ""
        if not sheet_name:
            continue
        rows: dict[int, float] = {}
        row_number = 0
        # Iterate through rows
        for row_match in re.finditer(r"<table:table-row\b([^>]*)>([\s\S]*?)</table:table-row>", table_body, re.IGNORECASE):
            row_attrs = row_match.group(1)
            style_match = re.search(r'table:style-name="([^"]*)"', row_attrs)
            repeat_match = re.search(r'table:number-rows-repeated="(\d+)"', row_attrs)
            repeat = int(repeat_match.group(1)) if repeat_match else 1
            has_height = False
            if style_match:
                style_name = style_match.group(1)
                # Find the row style to get height
                style_pattern = rf'<style:style\b[^>]*style:name="{re.escape(style_name)}"[^>]*>[\s\S]*?<style:table-row-properties\b[^>]*style:row-height="([\d.]+)cm"'
                style_match2 = re.search(style_pattern, fods_xml, re.IGNORECASE)
                if style_match2:
                    height_cm = float(style_match2.group(1))
                    has_height = True
                    for _ in range(repeat):
                        row_number += 1
                        rows[row_number] = height_cm
            if not has_height:
                row_number += repeat
        if rows:
            result[sheet_name] = rows
    return result


def _restore_normal_font_and_layout(
    xlsx_bytes: bytes,
    source_fods: str,
    source_xlsx_bytes: bytes,
    original_font: dict | None,
    original_sheet_format_pr: dict[str, dict],
    original_digit_width: float | None,
    replacements: dict[str, str],
) -> None:
    """Restore Normal font, column widths, sheetFormatPr, and row heights from original XLSX."""
    if not original_font or not original_digit_width:
        return
    
    # 1. Restore Normal font in styles.xml: copy the source workbook's fonts[0]
    #    element verbatim (exact name/size/colour/scheme Excel used for the
    #    column-width unit) instead of patching attributes piecemeal.
    # Use already-modified styles.xml from replacements if available, otherwise read from xlsx_bytes.
    styles_xml = replacements.get("xl/styles.xml")
    if styles_xml is None:
        styles_entry = read_zip_entry(xlsx_bytes, "xl/styles.xml")
        if styles_entry:
            styles_xml = styles_entry.decode("utf-8", errors="replace")
    original_font_xml = _extract_normal_font_xml_from_xlsx(source_xlsx_bytes)
    if styles_xml and original_font_xml:
        new_styles_xml = _restore_normal_font_in_styles(styles_xml, original_font_xml)
        if new_styles_xml != styles_xml:
            replacements["xl/styles.xml"] = new_styles_xml
    
    # 2. Extract column widths from FODS (in cm)
    fods_col_widths = _get_fods_column_widths_by_letter(source_fods)
    fods_row_heights = _extract_fods_row_heights_cm(source_fods)
    fods_auto_rows = parse_auto_rows_from_fods(source_fods)

    # 3. Process each worksheet
    sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    source_sheet_entries = _resolve_xlsx_sheet_entries(source_xlsx_bytes) if source_xlsx_bytes else {}
    for sheet_name, entry_path in sheet_entries.items():
        sheet_xml = replacements.get(entry_path)
        if sheet_xml is None:
            entry_bytes = read_zip_entry(xlsx_bytes, entry_path)
            if not entry_bytes:
                continue
            sheet_xml = entry_bytes.decode("utf-8", errors="replace")
        
        orig_sheet_xml = sheet_xml
        
        col_widths = _sheet_name_equivalent_value(fods_col_widths, sheet_name)
        format_pr = _sheet_name_equivalent_value(original_sheet_format_pr, sheet_name)
        source_entry_path = _sheet_name_equivalent_value(source_sheet_entries, sheet_name)
        row_heights = _sheet_name_equivalent_value(fods_row_heights, sheet_name)

        # Restore column widths
        if col_widths is not None:
            default_chars = (format_pr or {}).get("defaultColWidth")
            source_sheet_xml = None
            if source_entry_path:
                source_entry = read_zip_entry(source_xlsx_bytes, source_entry_path)
                if source_entry:
                    source_sheet_xml = source_entry.decode("utf-8", errors="replace")
            sheet_xml = _restore_column_widths(
                sheet_xml, col_widths, original_digit_width, default_chars,
                source_explicit_cols=_source_columns_with_explicit_width(source_sheet_xml),
                default_display_chars=_unchanged_default_column_chars(format_pr, original_digit_width) if source_sheet_xml is not None else None,
                source_widths=_source_explicit_column_widths(source_sheet_xml),
            )

        # Restore sheetFormatPr
        if format_pr is not None:
            sheet_xml = _restore_sheet_format_pr(sheet_xml, format_pr)
        
        # Restore row heights
        if row_heights is not None:
            sheet_xml = _restore_row_heights(sheet_xml, row_heights)

        # S30b: hàng tự động (không customHeight trong file gốc) còn nguyên chiều cao lúc mở -> trả lại đúng
        # ht/không customHeight của file gốc (Excel tự tính lại khi mở; app chỉ hiển thị theo S30a)
        auto_rows = _sheet_name_equivalent_value(fods_auto_rows, sheet_name)
        if auto_rows and source_entry_path:
            source_entry = read_zip_entry(source_xlsx_bytes, source_entry_path)
            if source_entry:
                sheet_xml = _restore_source_auto_row_attrs(sheet_xml, source_entry.decode("utf-8", errors="replace"), auto_rows)

        if sheet_xml != orig_sheet_xml:
            replacements[entry_path] = sheet_xml


def _extract_normal_font_xml_from_xlsx(xlsx_bytes: bytes) -> str | None:
    """Return the raw first <font>...</font> element (the Normal style font) of a workbook."""
    entry = read_zip_entry(xlsx_bytes, "xl/styles.xml")
    if not entry:
        return None
    styles_xml = entry.decode("utf-8", errors="replace")
    fonts = re.search(r"<fonts\b[^>]*>([\s\S]*?)</fonts>", styles_xml, re.IGNORECASE)
    if not fonts:
        return None
    first = re.search(r"<font\b[^>]*>[\s\S]*?</font>|<font\b[^>]*/>", fonts.group(1), re.IGNORECASE)
    return first.group(0) if first else None


def _restore_normal_font_in_styles(styles_xml: str, original_font_xml: str) -> str:
    """Replace fonts[0] (the Normal style font) with the source workbook's element verbatim."""
    fonts_match = re.search(r"(<fonts\b[^>]*>)([\s\S]*?)(</fonts>)", styles_xml, re.IGNORECASE)
    if not fonts_match or not original_font_xml:
        return styles_xml
    before_fonts, fonts_content, after_fonts = fonts_match.groups()
    first_font = re.search(r"<font\b[^>]*>[\s\S]*?</font>|<font\b[^>]*/>", fonts_content, re.IGNORECASE)
    if not first_font:
        return styles_xml
    new_fonts_content = fonts_content[:first_font.start()] + original_font_xml + fonts_content[first_font.end():]
    return styles_xml[:fonts_match.start()] + before_fonts + new_fonts_content + after_fonts + styles_xml[fonts_match.end():]


_NEW_WORKBOOK_NORMAL_FONT = (
    '<font><sz val="11"/><color theme="1"/><name val="Calibri"/>'
    '<family val="2"/><scheme val="minor"/></font>'
)


def _apply_new_workbook_defaults(
    xlsx_bytes: bytes, source_fods: str | None, replacements: dict[str, str]
) -> None:
    """S24: normalize a workbook created without an original XLSX to Excel 2016 defaults."""
    styles_entry = read_zip_entry(xlsx_bytes, "xl/styles.xml")
    if styles_entry:
        styles_xml = replacements.get("xl/styles.xml", styles_entry.decode("utf-8", errors="replace"))
        restored = _restore_normal_font_in_styles(styles_xml, _NEW_WORKBOOK_NORMAL_FONT)
        if restored != styles_xml:
            replacements["xl/styles.xml"] = restored

    theme_entry = read_zip_entry(xlsx_bytes, "xl/theme/theme1.xml")
    if theme_entry:
        theme_xml = theme_entry.decode("utf-8", errors="replace")
        restored_theme = re.sub(
            r'(<a:minorFont>\s*<a:latin\b)[^>]*/>',
            r'\1 typeface="Calibri" pitchFamily="34" charset="0"/>',
            theme_xml,
            count=1,
            flags=re.IGNORECASE,
        )
        if restored_theme != theme_xml:
            replacements["xl/theme/theme1.xml"] = restored_theme

    fods_col_widths = _get_fods_column_widths_by_letter(source_fods or "")
    fods_row_heights = _extract_fods_row_heights_cm(source_fods or "")
    for sheet_name, entry_path in _resolve_xlsx_sheet_entries(xlsx_bytes).items():
        entry = read_zip_entry(xlsx_bytes, entry_path)
        if not entry:
            continue
        sheet_xml = replacements.get(entry_path, entry.decode("utf-8", errors="replace"))
        original = sheet_xml
        widths = _sheet_name_equivalent_value(fods_col_widths, sheet_name)
        if widths:
            sheet_xml = _restore_column_widths(
                sheet_xml, widths, 7.0, None,
                source_explicit_cols=None, default_display_chars=64.0 / 7.0,
            )
        heights = _sheet_name_equivalent_value(fods_row_heights, sheet_name)
        if heights:
            sheet_xml = _restore_row_heights(sheet_xml, heights)
        sheet_xml = _restore_sheet_format_pr(sheet_xml, {"defaultRowHeight": 15.0})
        if sheet_xml != original:
            replacements[entry_path] = sheet_xml


def _column_letter(index: int) -> str:
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def _column_index(letters: str) -> int:
    index = 0
    for ch in letters.upper():
        index = index * 26 + (ord(ch) - 64)
    return index


def _restore_column_widths(
    sheet_xml: str, col_widths_cm: dict[str, float], digit_width: float,
    default_col_width_chars: float | None = None,
    source_explicit_cols: set[int] | None = None,
    default_display_chars: float | None = None,
    source_widths: dict[int, float] | None = None,
) -> str:
    """Restore column widths in worksheet XML using original font's digit width.

    Formula S24: px app = px Excel; chars = trunc(px / digit_width * 100 + 0.5) / 100.

    LibreOffice omits <col> entries whose width equals *its* default, but Excel
    then renders them with the workbook's defaultColWidth, so every column the
    app laid out inside the used range is written back explicitly unless it
    already matches that Excel default.

    S11 (đo vòng 5, 19/9: 271 cột / 9 file): cột KHÔNG có width= trong file gốc mà app
    không đổi (lệch < 0.5 ký tự so với mặc định Excel) thì không ghi width= — LibreOffice
    ghi `width="8.43"` (= 59px) cho cột mặc định 64px vì thuộc tính width đã gồm lề 5px.
    """
    cols_match = re.search(r"(<cols>)([\s\S]*?)(</cols>)", sheet_xml, re.IGNORECASE)
    if not cols_match:
        return sheet_xml

    before_cols, cols_content, after_cols = cols_match.groups()
    if default_display_chars is None:
        default_display_chars = _unchanged_default_column_chars(
            {"defaultColWidth": default_col_width_chars} if default_col_width_chars else None, digit_width)

    def chars_for(width_cm: float) -> float:
        px = width_cm * 96 / 2.54
        chars = math.trunc(px / digit_width * 100 + 0.5) / 100
        return chars

    def snap_to_source(col_idx: int, chars: float) -> float:
        """Keep an explicit source width when cm round-trip drift is <= 4 px."""
        source = (source_widths or {}).get(col_idx)
        if source is not None and abs(source - chars) * digit_width <= 4.01:
            return source
        return chars

    def is_default_width(chars: float) -> bool:
        return abs(chars - default_display_chars) < 0.5

    def keeps_meaning_without_width(attrs: dict) -> bool:
        if attrs.get("hidden", "").lower() in ("1", "true"):
            return True
        if attrs.get("collapsed", "").lower() in ("1", "true"):
            return True
        if attrs.get("outlineLevel", "0") not in ("", "0"):
            return True
        if attrs.get("style", "0") not in ("", "0"):
            return True
        return False

    # Parse existing col elements to preserve min/max/bestFit/customWidth
    col_elements: list[tuple[int, int, dict]] = []  # (min, max, attrs_dict)
    for col_match in re.finditer(r"<col\b([^>]*)/?>", cols_content, re.IGNORECASE):
        attrs_str = col_match.group(1)
        attrs = {}
        for key, val in re.findall(r'(\w+)="([^"]*)"', attrs_str):
            attrs[key] = val
        min_col = int(attrs.get("min", "1"))
        max_col = int(attrs.get("max", str(min_col)))
        col_elements.append((min_col, max_col, attrs))

    rebuilt: dict[int, dict] = {}
    for min_col, max_col, attrs in col_elements:
        for col_idx in range(min_col, max_col + 1):
            name = _column_letter(col_idx)
            new_attrs = attrs.copy()
            if name in col_widths_cm:
                chars = snap_to_source(col_idx, chars_for(col_widths_cm[name]))
                source_has_width = source_explicit_cols is None or col_idx in source_explicit_cols
                if not source_has_width and is_default_width(chars):
                    # S11: cột mặc định của file gốc, app không đổi -> để Excel dùng defaultColWidth
                    for key in ("width", "customWidth", "bestFit"):
                        new_attrs.pop(key, None)
                    if not keeps_meaning_without_width(new_attrs):
                        continue
                else:
                    new_attrs["width"] = f"{chars:.2f}"
                    new_attrs["customWidth"] = "1"
            # Ensure bestFit is not set if we're explicitly setting width
            if "width" in new_attrs:
                new_attrs.pop("bestFit", None)
            new_attrs["min"] = str(col_idx)
            new_attrs["max"] = str(col_idx)
            rebuilt[col_idx] = new_attrs

    # Columns LibreOffice dropped: bounded by the used range so repeated
    # default FODS columns never expand to 16384 entries.
    dimension = re.search(r'<dimension\b[^>]*ref="[A-Z]+\d*(?::([A-Z]+)\d*)?"', sheet_xml, re.IGNORECASE)
    limit = max([idx for idx in rebuilt] + [_column_index(dimension.group(1)) if dimension and dimension.group(1) else 0])
    for col_idx in range(1, limit + 1):
        if col_idx in rebuilt:
            continue
        name = _column_letter(col_idx)
        if name not in col_widths_cm:
            continue
        chars = snap_to_source(col_idx, chars_for(col_widths_cm[name]))
        if is_default_width(chars):
            continue
        rebuilt[col_idx] = {"min": str(col_idx), "max": str(col_idx), "width": f"{chars:.2f}", "customWidth": "1"}

    new_cols_parts = []
    for col_idx in sorted(rebuilt):
        attr_str = " ".join(f'{k}="{v}"' for k, v in rebuilt[col_idx].items())
        new_cols_parts.append(f"<col {attr_str}/>")

    new_cols_content = "".join(new_cols_parts)
    if not new_cols_content:
        # CT_Cols bắt buộc có ít nhất một <col>: <cols></cols> rỗng làm Excel từ chối mở file (đo lan21/lan22 vòng 6)
        return sheet_xml[:cols_match.start()] + sheet_xml[cols_match.end():]
    return sheet_xml[:cols_match.start()] + before_cols + new_cols_content + after_cols + sheet_xml[cols_match.end():]


def _restore_hidden_columns_and_rows_step(
    xlsx_bytes: bytes,
    source_xlsx_bytes: bytes,
    replacements: dict[str, str],
) -> None:
    """Extract source worksheet XMLs and restore hidden column ranges and hidden rows (S9)."""
    sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    source_sheet_entries = _resolve_xlsx_sheet_entries(source_xlsx_bytes) if source_xlsx_bytes else {}
    for sheet_name, entry_path in sheet_entries.items():
        if sheet_name in source_sheet_entries:
            sheet_xml = replacements.get(entry_path)
            if sheet_xml is None:
                entry_bytes = read_zip_entry(xlsx_bytes, entry_path)
                if not entry_bytes:
                    continue
                sheet_xml = entry_bytes.decode("utf-8", errors="replace")
            orig_sheet_xml = sheet_xml
            source_sheet_bytes = read_zip_entry(source_xlsx_bytes, source_sheet_entries[sheet_name])
            if source_sheet_bytes:
                sheet_xml = _restore_hidden_columns_and_rows_from_source(
                    sheet_xml, source_sheet_bytes.decode("utf-8", errors="replace")
                )
            if sheet_xml != orig_sheet_xml:
                replacements[entry_path] = sheet_xml


def _xlsx_empty_shared_string_indexes(sst_xml: str) -> tuple[list[str], set[int]]:
    """Danh sách <si> và tập chỉ số các chuỗi rỗng (`<si><t/></si>`, `<t xml:space="preserve"></t>`, mọi run rỗng)."""
    items = re.findall(r"<si\b[^>]*>[\s\S]*?</si>|<si\b[^>]*/>", sst_xml, re.IGNORECASE)
    empty: set[int] = set()
    for idx, si in enumerate(items):
        texts = re.findall(r"<t\b[^>]*>([\s\S]*?)</t>", si, re.IGNORECASE)
        if not texts or all(t == "" for t in texts):
            empty.add(idx)
    return items, empty


def _restore_empty_string_cells_step(xlsx_bytes: bytes, source_xlsx_bytes: bytes, replacements: dict[str, str], copier: "_SourceXfCopier | None") -> None:
    """S13 (đo vòng 5/6: lan25 686 ô, lan20 20 ô, lan15 2 ô): ô chuỗi rỗng `<c t="s"><v>N</v></c>` (N -> `<si><t/></si>`)
    hoặc `t="inlineStr"` rỗng bị soffice BỎ khi nhập XLSX→FODS (app không bao giờ thấy), còn khi xuất thì giữ.
    Excel: ISBLANK=FALSE, COUNTA đếm, Ctrl+End tới ô đó — nên khôi phục từ file gốc: chèn lại ô (đúng thứ tự
    dòng/cột) với shared string rỗng của file lưu và xf chép qua `copier` (không chép thẳng `s=` gốc)."""
    src_sst = read_zip_entry(source_xlsx_bytes, "xl/sharedStrings.xml")
    src_empty: set[int] = set()
    if src_sst:
        src_empty = _xlsx_empty_shared_string_indexes(src_sst.decode("utf-8", errors="replace"))[1]
    sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    source_sheet_entries = _resolve_xlsx_sheet_entries(source_xlsx_bytes)
    cell_re = re.compile(r'<c\b((?:[^>/]|/(?!>))*)(?:/>|>([\s\S]*?)</c>)', re.IGNORECASE)
    row_re = re.compile(r'<row\b((?:[^>/]|/(?!>))*)(?:/>|>([\s\S]*?)</row>)', re.IGNORECASE)
    out_empty_idx: int | None = None
    restored_refs = 0

    def _ensure_output_empty_string() -> int | None:
        nonlocal out_empty_idx
        if out_empty_idx is not None:
            return out_empty_idx
        sst_xml = replacements.get("xl/sharedStrings.xml")
        if sst_xml is None:
            entry = read_zip_entry(xlsx_bytes, "xl/sharedStrings.xml")
            sst_xml = entry.decode("utf-8", errors="replace") if entry else None
        if sst_xml is None:
            return None
        items, empty = _xlsx_empty_shared_string_indexes(sst_xml)
        if empty:
            out_empty_idx = min(empty)
        else:
            out_empty_idx = len(items)
            sst_xml = re.sub(r"</sst>", "<si><t/></si></sst>", sst_xml, count=1, flags=re.IGNORECASE)
            sst_xml = re.sub(r'\buniqueCount="(\d+)"', lambda m: f'uniqueCount="{int(m.group(1)) + 1}"', sst_xml, count=1)
            replacements["xl/sharedStrings.xml"] = sst_xml
        return out_empty_idx

    for sheet_name, entry_path in sheet_entries.items():
        if sheet_name not in source_sheet_entries:
            continue
        source_bytes = read_zip_entry(source_xlsx_bytes, source_sheet_entries[sheet_name])
        if not source_bytes:
            continue
        source_xml = source_bytes.decode("utf-8", errors="replace")
        wanted: dict[str, int | None] = {}  # coord -> chỉ số xf gốc
        for m in cell_re.finditer(source_xml):
            attrs = _xml_attrs(m.group(1))
            coord = (attrs.get("r") or "").upper()
            kind = (attrs.get("t") or "").lower()
            body = m.group(2) or ""
            if not coord:
                continue
            is_empty = False
            if kind == "s":
                v = re.search(r"<v>\s*(\d+)\s*</v>", body)
                is_empty = bool(v) and int(v.group(1)) in src_empty
            elif kind == "inlinestr":
                texts = re.findall(r"<t\b[^>]*>([\s\S]*?)</t>", body, re.IGNORECASE)
                is_empty = not texts or all(t == "" for t in texts)
            if is_empty:
                wanted[coord] = int(attrs["s"]) if attrs.get("s", "").isdigit() else None
        if not wanted:
            continue
        sheet_xml = replacements.get(entry_path)
        if sheet_xml is None:
            entry_bytes = read_zip_entry(xlsx_bytes, entry_path)
            if not entry_bytes:
                continue
            sheet_xml = entry_bytes.decode("utf-8", errors="replace")
        sd = re.search(r"(<sheetData\b[^>]*>)([\s\S]*?)(</sheetData>)|<sheetData\b[^>]*/>", sheet_xml, re.IGNORECASE)
        if not sd:
            continue
        sd_content = sd.group(2) or ""
        by_row: dict[int, dict[int, str]] = {}
        for coord, src_s in wanted.items():
            col_letters, row_str = re.match(r"([A-Z]+)(\d+)", coord).groups()
            new_s = copier.map(src_s) if (copier is not None and src_s is not None) else None
            by_row.setdefault(int(row_str), {})[_column_index(col_letters)] = f' s="{new_s}"' if new_s is not None else ""
        empty_idx = _ensure_output_empty_string()
        if empty_idx is None:
            continue

        def _cell_xml(col_idx: int, row_num: int, s_attr: str) -> str:
            return f'<c r="{_column_letter(col_idx)}{row_num}"{s_attr} t="s"><v>{empty_idx}</v></c>'

        out_parts: list[str] = []
        pending_rows = sorted(by_row)
        pi = 0
        pos = 0

        def _emit_new_rows_before(row_num: int | None):
            nonlocal pi, restored_refs
            while pi < len(pending_rows) and (row_num is None or pending_rows[pi] < row_num):
                r = pending_rows[pi]
                cells = "".join(_cell_xml(c, r, s) for c, s in sorted(by_row[r].items()))
                restored_refs += len(by_row[r])
                out_parts.append(f'<row r="{r}">{cells}</row>')
                pi += 1

        for rm in row_re.finditer(sd_content):
            r_attr = re.search(r'\br="(\d+)"', rm.group(1))
            if not r_attr:
                continue
            r = int(r_attr.group(1))
            _emit_new_rows_before(r)
            out_parts.append(sd_content[pos:rm.start()])
            pos = rm.end()
            if pi < len(pending_rows) and pending_rows[pi] == r:
                cols = dict(by_row[r])
                body = rm.group(2) or ""
                rebuilt: list[tuple[int, str]] = []
                for cm in cell_re.finditer(body):
                    a = _xml_attrs(cm.group(1))
                    c = (a.get("r") or "").upper()
                    letters = re.match(r"[A-Z]+", c)
                    if not letters:
                        continue
                    ci = _column_index(letters.group(0))
                    cbody = cm.group(2) or ""
                    has_value = bool(re.search(r"<v\b|<f\b|<is\b", cbody, re.IGNORECASE))
                    if ci in cols and not has_value:
                        rebuilt.append((ci, _cell_xml(ci, r, cols.pop(ci))))  # ô tự đóng chỉ có style -> thay
                        restored_refs += 1
                    else:
                        cols.pop(ci, None)  # ô đã có giá trị (người dùng gõ) -> giữ nguyên
                        rebuilt.append((ci, cm.group(0)))
                for ci, s in cols.items():
                    rebuilt.append((ci, _cell_xml(ci, r, s)))
                    restored_refs += 1
                rebuilt.sort(key=lambda t: t[0])
                out_parts.append(f"<row{rm.group(1)}>" + "".join(x for _, x in rebuilt) + "</row>")
                pi += 1
            else:
                out_parts.append(rm.group(0))
        _emit_new_rows_before(None)
        out_parts.append(sd_content[pos:])
        new_content = "".join(out_parts)
        if sd.group(1):
            new_sheet = sheet_xml[:sd.start()] + sd.group(1) + new_content + sd.group(3) + sheet_xml[sd.end():]
        else:
            new_sheet = sheet_xml[:sd.start()] + "<sheetData>" + new_content + "</sheetData>" + sheet_xml[sd.end():]
        if new_sheet != sheet_xml:
            replacements[entry_path] = new_sheet

    if restored_refs:
        sst_xml = replacements.get("xl/sharedStrings.xml")
        if sst_xml is None:
            entry = read_zip_entry(xlsx_bytes, "xl/sharedStrings.xml")
            sst_xml = entry.decode("utf-8", errors="replace") if entry else None
        if sst_xml is not None:
            sst_xml = re.sub(r'\bcount="(\d+)"', lambda m: f'count="{int(m.group(1)) + restored_refs}"', sst_xml, count=1)
            replacements["xl/sharedStrings.xml"] = sst_xml
    if copier is not None:
        copier.write_styles(replacements)


def _restore_literal_error_cells_step(xlsx_bytes: bytes, source_xlsx_bytes: bytes, replacements: dict[str, str]) -> None:
    """S14 (đo vòng 6: lan01 200 ô, lan15 2 ô): XLSX gốc có ô giá trị lỗi thuần `<c t="e"><v>#N/A</v></c>`
    (giá trị dán, không công thức); LibreOffice chỉ biểu diễn lỗi bằng công thức nên nhập thành
    `table:formula="of:=#N/A"` và xuất `<f>#N/A</f>` — thanh công thức Excel hiện "=#N/A" thay vì "#N/A".
    Ô lưu có cùng giá trị lỗi và công thức đúng bằng chữ lỗi đó thì bỏ `<f>`."""
    sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    source_sheet_entries = _resolve_xlsx_sheet_entries(source_xlsx_bytes)
    for sheet_name, entry_path in sheet_entries.items():
        if sheet_name not in source_sheet_entries:
            continue
        source_bytes = read_zip_entry(source_xlsx_bytes, source_sheet_entries[sheet_name])
        if not source_bytes:
            continue
        source_xml = source_bytes.decode("utf-8", errors="replace")
        literal_errors: dict[str, str] = {}
        source_formulas: dict[str, str] = {}  # coord -> chữ công thức gốc (không shared/array)
        # `(?:[^>/]|/(?!>))*` — không nuốt <c .../> tự đóng (nếu không, body sẽ chứa ô kế tiếp)
        for m in re.finditer(r'<c\b((?:[^>/]|/(?!>))*)>([\s\S]*?)</c>', source_xml, re.IGNORECASE):
            coord = re.search(r'\br="([A-Z]+\d+)"', m.group(1), re.IGNORECASE)
            if not coord:
                continue
            formula = re.search(r"<f\b([^>]*)>([\s\S]*?)</f>", m.group(2), re.IGNORECASE)
            if formula:
                if not re.search(r'\bt="', formula.group(1), re.IGNORECASE):
                    source_formulas[coord.group(1).upper()] = formula.group(2)
                continue
            if re.search(r'\bt="e"', m.group(1), re.IGNORECASE):
                value = re.search(r"<v>([\s\S]*?)</v>", m.group(2), re.IGNORECASE)
                if value:
                    literal_errors[coord.group(1).upper()] = value.group(1).strip()
        if not literal_errors and not source_formulas:
            continue
        sheet_xml = replacements.get(entry_path)
        if sheet_xml is None:
            entry_bytes = read_zip_entry(xlsx_bytes, entry_path)
            if not entry_bytes:
                continue
            sheet_xml = entry_bytes.decode("utf-8", errors="replace")

        def _same_formula(a: str, b: str) -> bool:
            # S15: LibreOffice xuất TRUE/FALSE thành TRUE()/FALSE() (OpenFormula) — cùng nghĩa, khác chữ
            norm = lambda s: re.sub(r"\b(TRUE|FALSE)\(\)", r"\1", re.sub(r"\s+", "", _unescape_xml(s)), flags=re.IGNORECASE).upper()
            return norm(a) == norm(b)

        def _fix_cell(match: "re.Match[str]") -> str:
            attrs, body = match.group(1), match.group(2)
            coord = re.search(r'\br="([A-Z]+\d+)"', attrs, re.IGNORECASE)
            if not coord:
                return match.group(0)
            key = coord.group(1).upper()
            formula = re.search(r"<f\b([^>]*)>([\s\S]*?)</f>", body, re.IGNORECASE)
            if not formula:
                return match.group(0)
            expected_error = literal_errors.get(key)
            if expected_error is not None and re.search(r'\bt="e"', attrs, re.IGNORECASE):
                value = re.search(r"<v>([\s\S]*?)</v>", body, re.IGNORECASE)
                if value and value.group(1).strip() == expected_error and formula.group(2).strip() == expected_error:
                    return f"<c{attrs}>" + body[:formula.start()] + body[formula.end():] + "</c>"
                return match.group(0)
            source_text = source_formulas.get(key)
            if source_text is not None and not re.search(r'\bt="', formula.group(1), re.IGNORECASE) \
                    and formula.group(2) != source_text and _same_formula(formula.group(2), source_text):
                return f"<c{attrs}>" + body[:formula.start()] + f"<f{formula.group(1)}>{source_text}</f>" + body[formula.end():] + "</c>"
            return match.group(0)

        new_xml = re.sub(r'<c\b((?:[^>/]|/(?!>))*)>([\s\S]*?)</c>', _fix_cell, sheet_xml, flags=re.IGNORECASE)
        if new_xml != sheet_xml:
            replacements[entry_path] = new_xml


def _insert_or_replace_cells(sheet_xml: str, replacements_by_coord: dict[str, str], *, only_missing: bool = False) -> str:
    """Insert/replace a small cell set with one sheetData scan (never one re.sub per cell)."""
    if not replacements_by_coord:
        return sheet_xml
    sheet_data = re.search(r"(<sheetData\b[^>]*>)([\s\S]*?)(</sheetData>)|<sheetData\b[^>]*/>", sheet_xml, re.IGNORECASE)
    if not sheet_data:
        return sheet_xml
    cell_re = re.compile(r'<c\b((?:[^>/]|/(?!>))*)(?:/>|>([\s\S]*?)</c>)', re.IGNORECASE)
    row_re = re.compile(r'<row\b((?:[^>/]|/(?!>))*)(?:/>|>([\s\S]*?)</row>)', re.IGNORECASE)
    pending: dict[int, dict[int, tuple[str, str]]] = {}
    for coord, xml in replacements_by_coord.items():
        hit = re.fullmatch(r"([A-Z]+)(\d+)", coord.upper())
        if hit:
            pending.setdefault(int(hit.group(2)), {})[_column_index(hit.group(1))] = (coord.upper(), xml)
    body = sheet_data.group(2) or ""
    pieces: list[str] = []; cursor = 0
    for row_match in row_re.finditer(body):
        pieces.append(body[cursor:row_match.start()]); cursor = row_match.end()
        row_attr = re.search(r'\br="(\d+)"', row_match.group(1))
        row_num = int(row_attr.group(1)) if row_attr else -1
        wanted = pending.pop(row_num, {})
        if not wanted:
            pieces.append(row_match.group(0)); continue
        existing: list[tuple[int, str]] = []
        seen: set[int] = set()
        for cell_match in cell_re.finditer(row_match.group(2) or ""):
            attrs = _xml_attrs(cell_match.group(1)); coord = (attrs.get("r") or "").upper()
            col = re.match(r"[A-Z]+", coord)
            if not col:
                continue
            col_idx = _column_index(col.group(0)); seen.add(col_idx)
            replacement = wanted.get(col_idx)
            existing.append((col_idx, cell_match.group(0) if only_missing or replacement is None else replacement[1]))
        for col_idx, (_coord, xml) in wanted.items():
            if col_idx not in seen:
                existing.append((col_idx, xml))
        existing.sort(key=lambda item: item[0])
        pieces.append(f"<row{row_match.group(1)}>" + "".join(xml for _, xml in existing) + "</row>")
    pieces.append(body[cursor:])
    for row_num in sorted(pending):
        cells = "".join(xml for _, (_coord, xml) in sorted(pending[row_num].items()))
        pieces.append(f'<row r="{row_num}">{cells}</row>')
    rebuilt = "".join(pieces)
    wrapper = (sheet_data.group(1) + rebuilt + sheet_data.group(3)) if sheet_data.group(1) else "<sheetData>" + rebuilt + "</sheetData>"
    return sheet_xml[:sheet_data.start()] + wrapper + sheet_xml[sheet_data.end():]


_VND_FORMULA_RE = re.compile(r"^=?\s*(?:_xll\.)?VND\s*\(", re.IGNORECASE)


def _fods_vnd_cells(fods_xml: str) -> dict[str, dict[tuple[int, int], tuple[str, str]]]:
    """{sheet: {(row, col): (excel_formula_without_eq, text)}} for VND() cells the app sent.

    3T Sheet computes VND() (amount in words) itself; LibreOffice does not know the
    add-in function and writes #NAME? (xlsx) / #N/A (xls) on export.
    """
    result: dict[str, dict[tuple[int, int], tuple[str, str]]] = {}
    if not fods_xml or "VND" not in fods_xml.upper():
        return result
    for table_start, table_end in _flat_xml_blocks(fods_xml, ("table:table",)):
        table_xml = fods_xml[table_start:table_end]
        if "VND" not in table_xml.upper():
            continue
        sheet_name = _unescape_xml(_xml_attrs(re.match(r"<[^>]+", table_xml).group(0)).get("table:name", ""))
        targets: dict[tuple[int, int], tuple[str, str]] = {}
        row_number = 1
        for row_start, row_end in _flat_xml_blocks(table_xml, ("table:table-row",)):
            row_xml = table_xml[row_start:row_end]
            col_number = 1
            for cell_start, cell_end in _flat_xml_blocks(row_xml, ("table:table-cell", "table:covered-table-cell")):
                cell_xml = row_xml[cell_start:cell_end]
                formula_match = re.search(r'vno:formula="([^"]*)"', cell_xml)
                if formula_match:
                    formula = _unescape_xml(formula_match.group(1))
                    if _VND_FORMULA_RE.match(formula):
                        text = "\n".join(
                            _unescape_xml(re.sub(r"<[^>]+>", "", p))
                            for p in re.findall(r"<text:p\b[^>]*>([\s\S]*?)</text:p>", cell_xml)
                        )
                        body = _VND_FORMULA_RE.sub("_xll.VND(", formula.strip(), count=1)
                        targets[(row_number, col_number)] = (body, text)
                col_number += _repeat_count(cell_xml, "table:number-columns-repeated")
            row_number += _repeat_count(row_xml, "table:number-rows-repeated")
        if targets and sheet_name:
            result[sheet_name] = targets
    return result


def fods_vnd_cells_as_text(fods_xml: str) -> str:
    """Drop the formula of VND() cells, keeping their computed text (for .xls export)."""
    if not fods_xml or "VND" not in fods_xml.upper():
        return fods_xml

    def strip(match: re.Match[str]) -> str:
        tag = match.group(0)
        formula = re.search(r'\svno:formula="([^"]*)"', tag)
        if not formula or not _VND_FORMULA_RE.match(_unescape_xml(formula.group(1))):
            return tag
        tag = re.sub(r'\s(?:table|vno):formula="[^"]*"', "", tag)
        tag = re.sub(r'\s(?:office|calcext):value-type="[^"]*"', "", tag)
        return tag.replace("<table:table-cell", '<table:table-cell office:value-type="string" calcext:value-type="string"', 1)

    return re.sub(r"<table:table-cell\b[^>]*>", strip, fods_xml)


def _source_vnd_error_refs(source_xlsx_bytes: bytes | None) -> dict[str, set[str]]:
    """{sheet: refs} of VND() cells whose cached value in the source XLSX is an error.

    The author saved them without the add-in (Excel shows #NAME?); writing 3T Sheet's
    computed words there would invent a value the document never had (lan02.xlsx).
    """
    result: dict[str, set[str]] = {}
    if not source_xlsx_bytes:
        return result
    cell_re = re.compile(r'<c\b((?:[^>/]|/(?!>))*)>([\s\S]*?)</c>', re.IGNORECASE)
    for sheet_name, path in _resolve_xlsx_sheet_entries(source_xlsx_bytes).items():
        xml = (read_zip_entry(source_xlsx_bytes, path) or b"").decode("utf-8", errors="replace")
        if "VND" not in xml.upper():
            continue
        for match in cell_re.finditer(xml):
            attrs = _xml_attrs(match.group(1))
            formula = re.search(r"<f\b[^>]*>([\s\S]*?)</f>", match.group(2), re.IGNORECASE)
            if formula and attrs.get("t", "").lower() == "e" and _VND_FORMULA_RE.match(_unescape_xml(formula.group(1))):
                result.setdefault(sheet_name, set()).add((attrs.get("r") or "").upper())
    return result


def _restore_vnd_addin_cells_step(
    xlsx_bytes: bytes, source_fods: str, replacements: dict[str, str], source_xlsx_bytes: bytes | None = None,
) -> None:
    """Write VND() cells as Excel stores the XLL add-in call: `_xll.VND(...)` + cached text."""
    vnd_cells = _fods_vnd_cells(source_fods)
    if not vnd_cells:
        return
    keep_errors = _source_vnd_error_refs(source_xlsx_bytes)
    cell_re = re.compile(r'<c\b((?:[^>/]|/(?!>))*)(?:/>|>([\s\S]*?)</c>)', re.IGNORECASE)
    for sheet_name, out_path in _resolve_xlsx_sheet_entries(xlsx_bytes).items():
        targets = vnd_cells.get(sheet_name)
        if not targets:
            continue
        skip = keep_errors.get(sheet_name, set())
        by_ref = {
            ref: value for ref, value in (
                (f"{_column_letter(col)}{row}", value) for (row, col), value in targets.items()
            ) if ref not in skip
        }
        if not by_ref:
            continue
        out_xml = replacements.get(out_path) or (read_zip_entry(xlsx_bytes, out_path) or b"").decode("utf-8", errors="replace")

        def fix(match: re.Match[str]) -> str:
            attrs = _xml_attrs(match.group(1))
            ref = (attrs.get("r") or "").upper()
            if ref not in by_ref:
                return match.group(0)
            formula, text = by_ref[ref]
            style = f' s="{attrs["s"]}"' if attrs.get("s") else ""
            return f'<c r="{ref}"{style} t="str"><f>{_escape_xml(formula)}</f><v>{_escape_xml(text)}</v></c>'

        next_xml = cell_re.sub(fix, out_xml)
        if next_xml != out_xml:
            replacements[out_path] = next_xml


def _restore_formula_results_and_missing_errors_step(
    xlsx_bytes: bytes, source_xlsx_bytes: bytes, replacements: dict[str, str], copier: "_SourceXfCopier | None"
) -> None:
    """Preserve cached formula results and formula-error cells that LibreOffice drops."""
    out_entries = _resolve_xlsx_sheet_entries(xlsx_bytes); src_entries = _resolve_xlsx_sheet_entries(source_xlsx_bytes)
    cell_re = re.compile(r'<c\b((?:[^>/]|/(?!>))*)(?:/>|>([\s\S]*?)</c>)', re.IGNORECASE)
    for sheet_name, out_path in out_entries.items():
        src_path = src_entries.get(sheet_name)
        if not src_path:
            continue
        src_xml = (read_zip_entry(source_xlsx_bytes, src_path) or b"").decode("utf-8", errors="replace")
        out_xml = replacements.get(out_path) or (read_zip_entry(xlsx_bytes, out_path) or b"").decode("utf-8", errors="replace")
        source: dict[str, tuple[dict[str, str], str, str, str]] = {}
        for match in cell_re.finditer(src_xml):
            attrs = _xml_attrs(match.group(1)); coord = (attrs.get("r") or "").upper(); body = match.group(2) or ""
            formula = re.search(r"<f\b[^>]*>([\s\S]*?)</f>", body, re.IGNORECASE)
            value = re.search(r"<v\b[^>]*>([\s\S]*?)</v>", body, re.IGNORECASE)
            if coord and formula and value:
                source[coord] = (attrs, formula.group(1), value.group(1), body)
        if not source:
            continue
        seen: set[str] = set()
        def fix(match: re.Match[str]) -> str:
            attrs = _xml_attrs(match.group(1)); coord = (attrs.get("r") or "").upper(); seen.add(coord)
            item = source.get(coord); body = match.group(2) or ""
            formula = re.search(r"<f\b[^>]*>([\s\S]*?)</f>", body, re.IGNORECASE)
            if not item or not formula or re.sub(r"\s+", "", _unescape_xml(formula.group(1))).upper() != re.sub(r"\s+", "", _unescape_xml(item[1])).upper():
                return match.group(0)
            next_body = re.sub(r"<v\b[^>]*>[\s\S]*?</v>", lambda _m: f"<v>{item[2]}</v>", body, count=1, flags=re.IGNORECASE)
            return f"<c{match.group(1)}>{next_body}</c>"
        out_xml = cell_re.sub(fix, out_xml)
        missing: dict[str, str] = {}
        for coord, (attrs, formula, value, _body) in source.items():
            if coord in seen or attrs.get("t", "").lower() != "e":
                continue
            src_xf = int(attrs["s"]) if attrs.get("s", "").isdigit() else None
            new_xf = copier.map(src_xf) if copier is not None and src_xf is not None else None
            style = f' s="{new_xf}"' if new_xf is not None else ""
            missing[coord] = f'<c r="{coord}"{style} t="e"><f>{formula}</f><v>{value}</v></c>'
        out_xml = _insert_or_replace_cells(out_xml, missing, only_missing=True)
        replacements[out_path] = out_xml
    if copier is not None:
        copier.write_styles(replacements)


def _sheet_name_equivalence_key(name: str) -> str:
    decoded = re.sub(r"_x([0-9A-Fa-f]{4})_", lambda m: chr(int(m.group(1), 16)), name or "")
    return re.sub(r"[\x00-\x20]+", " ", decoded).strip().casefold()


def _sheet_name_equivalent_value(mapping: dict, name: str):
    """Return per-sheet metadata using the common decoded-name key."""
    if name in mapping:
        return mapping[name]
    wanted = _sheet_name_equivalence_key(name)
    return next(
        (value for key, value in mapping.items() if _sheet_name_equivalence_key(key) == wanted),
        None,
    )


def _restore_source_sheet_names_and_states(workbook_xml: str, source_workbook_xml: str) -> str:
    """Restore encoded/control-character sheet names by stable workbook order."""
    output_tags = list(_WB_SHEET_TAG_RE.finditer(workbook_xml or "")); source_tags = list(_WB_SHEET_TAG_RE.finditer(source_workbook_xml or ""))
    if len(output_tags) != len(source_tags):
        return workbook_xml
    replacements: list[tuple[int, int, str]] = []
    for output, source in zip(output_tags, source_tags):
        out_attrs = output.group(1) or ""; src_attrs = source.group(1) or ""
        out_name = re.search(r'name="([^"]*)"', out_attrs); src_name = re.search(r'name="([^"]*)"', src_attrs)
        if not out_name or not src_name or _sheet_name_equivalence_key(_unescape_xml(out_name.group(1))) != _sheet_name_equivalence_key(_unescape_xml(src_name.group(1))):
            continue
        attrs = re.sub(r'name="[^"]*"', f'name="{src_name.group(1)}"', out_attrs, count=1)
        attrs = _SHEET_STATE_ATTR_RE.sub("", attrs)
        state = _SHEET_STATE_ATTR_RE.search(src_attrs)
        if state and state.group(1).lower() != "visible": attrs = attrs.rstrip(" /") + f' state="{state.group(1)}"/'
        replacements.append((output.start(), output.end(), f"<sheet{attrs}>"))
    for start, end, value in reversed(replacements): workbook_xml = workbook_xml[:start] + value + workbook_xml[end:]
    return workbook_xml


def _restore_sheet_zoom_step(xlsx_bytes: bytes, source_xlsx_bytes: bytes, replacements: dict[str, str]) -> None:
    """Restore sheetView zoomScale from source XLSX if dropped or defaulted to 100."""
    try:
        source_sheet_entries = _resolve_xlsx_sheet_entries(source_xlsx_bytes)
        target_sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
        if not source_sheet_entries or not target_sheet_entries:
            return

        for sheet_name, src_entry in source_sheet_entries.items():
            tgt_entry = _sheet_name_equivalent_value(target_sheet_entries, sheet_name)
            if not tgt_entry:
                continue

            src_xml_bytes = read_zip_entry(source_xlsx_bytes, src_entry)
            if not src_xml_bytes:
                continue
            src_xml = src_xml_bytes.decode("utf-8", errors="replace")

            m_zoom = re.search(r'<sheetView\b[^>]*\bzoomScale=["\'](\d+)["\']', src_xml, re.IGNORECASE)
            m_zoom_normal = re.search(r'<sheetView\b[^>]*\bzoomScaleNormal=["\'](\d+)["\']', src_xml, re.IGNORECASE)
            if not m_zoom and not m_zoom_normal:
                continue
            zoom_val = m_zoom.group(1) if m_zoom else (m_zoom_normal.group(1) if m_zoom_normal else None)
            if not zoom_val or zoom_val == "100":
                continue

            tgt_xml_str = replacements.get(tgt_entry)
            if tgt_xml_str is None:
                tgt_bytes = read_zip_entry(xlsx_bytes, tgt_entry)
                if not tgt_bytes:
                    continue
                tgt_xml_str = tgt_bytes.decode("utf-8", errors="replace")
            elif isinstance(tgt_xml_str, bytes):
                tgt_xml_str = tgt_xml_str.decode("utf-8", errors="replace")

            sv_match = re.search(r'<sheetView\b([^>]*)>', tgt_xml_str, re.IGNORECASE)
            if sv_match:
                tag = sv_match.group(0)
                if re.search(r'\bzoomScale=["\']\d+["\']', tag):
                    new_tag = re.sub(r'\bzoomScale=["\']\d+["\']', f'zoomScale="{zoom_val}"', tag, count=1)
                else:
                    new_tag = tag[:-1] + f' zoomScale="{zoom_val}">'
                if m_zoom_normal:
                    zn_val = m_zoom_normal.group(1)
                    if re.search(r'\bzoomScaleNormal=["\']\d+["\']', new_tag):
                        new_tag = re.sub(r'\bzoomScaleNormal=["\']\d+["\']', f'zoomScaleNormal="{zn_val}"', new_tag, count=1)
                    else:
                        new_tag = new_tag[:-1] + f' zoomScaleNormal="{zn_val}">'
                new_tgt_xml = tgt_xml_str[:sv_match.start()] + new_tag + tgt_xml_str[sv_match.end():]
                if new_tgt_xml != tgt_xml_str:
                    replacements[tgt_entry] = new_tgt_xml
    except Exception:
        pass


def _restore_autofilter_filter_columns_step(
    xlsx_bytes: bytes,
    source_xlsx_bytes: bytes,
    replacements: dict[str, str],
) -> None:
    """Restore filterColumn elements inside autoFilter from source XLSX if dropped."""
    try:
        source_sheet_entries = _resolve_xlsx_sheet_entries(source_xlsx_bytes)
        target_sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
        if not source_sheet_entries or not target_sheet_entries:
            return

        for sheet_name, src_entry in source_sheet_entries.items():
            tgt_entry = _sheet_name_equivalent_value(target_sheet_entries, sheet_name)
            if not tgt_entry:
                continue

            src_xml_bytes = read_zip_entry(source_xlsx_bytes, src_entry)
            if not src_xml_bytes:
                continue
            src_xml = src_xml_bytes.decode("utf-8", errors="replace")

            m_src_af = re.search(r'<autoFilter\b([^>]*?)>(.*?)</autoFilter>', src_xml, re.DOTALL | re.IGNORECASE)
            if not m_src_af:
                continue
            src_af_attrs = m_src_af.group(1)
            src_af_body = m_src_af.group(2).strip()
            if not src_af_body or "<filterColumn" not in src_af_body:
                continue

            src_ref_m = re.search(r'\bref="([^"]*)"', src_af_attrs, re.IGNORECASE)
            if not src_ref_m:
                continue
            src_ref = src_ref_m.group(1).upper()

            tgt_xml_str = replacements.get(tgt_entry)
            if tgt_xml_str is None:
                tgt_bytes = read_zip_entry(xlsx_bytes, tgt_entry)
                if not tgt_bytes:
                    continue
                tgt_xml_str = tgt_bytes.decode("utf-8", errors="replace")
            elif isinstance(tgt_xml_str, bytes):
                tgt_xml_str = tgt_xml_str.decode("utf-8", errors="replace")

            m_tgt_full = re.search(r'<autoFilter\b([^>]*?)>(.*?)</autoFilter>', tgt_xml_str, re.DOTALL | re.IGNORECASE)
            m_tgt_empty = re.search(r'<autoFilter\b([^>]*?)/>', tgt_xml_str, re.IGNORECASE)

            if m_tgt_empty:
                tgt_attrs = m_tgt_empty.group(1)
                tgt_ref_m = re.search(r'\bref="([^"]*)"', tgt_attrs, re.IGNORECASE)
                if tgt_ref_m and tgt_ref_m.group(1).upper() == src_ref:
                    new_tag = f'<autoFilter{tgt_attrs}>{src_af_body}</autoFilter>'
                    new_tgt_xml = tgt_xml_str[:m_tgt_empty.start()] + new_tag + tgt_xml_str[m_tgt_empty.end():]
                    if new_tgt_xml != tgt_xml_str:
                        replacements[tgt_entry] = new_tgt_xml
            elif m_tgt_full:
                tgt_body = m_tgt_full.group(2).strip()
                if "<filterColumn" not in tgt_body:
                    tgt_attrs = m_tgt_full.group(1)
                    tgt_ref_m = re.search(r'\bref="([^"]*)"', tgt_attrs, re.IGNORECASE)
                    if tgt_ref_m and tgt_ref_m.group(1).upper() == src_ref:
                        new_tag = f'<autoFilter{tgt_attrs}>{src_af_body}</autoFilter>'
                        new_tgt_xml = tgt_xml_str[:m_tgt_full.start()] + new_tag + tgt_xml_str[m_tgt_full.end():]
                        if new_tgt_xml != tgt_xml_str:
                            replacements[tgt_entry] = new_tgt_xml
    except Exception:
        pass


def _restore_missing_defined_names_step(
    xlsx_bytes: bytes,
    source_xlsx_bytes: bytes,
    replacements: dict[str, str | bytes],
) -> None:
    """Restore user-defined names from source XLSX that were dropped during export."""
    try:
        src_wb_bytes = read_zip_entry(source_xlsx_bytes, XLSX_WORKBOOK_ENTRY)
        if not src_wb_bytes:
            return
        src_wb_xml = src_wb_bytes.decode("utf-8", errors="replace")

        src_dns: list[tuple[str, str | None, str]] = []
        for m in re.finditer(r'<definedName\b([^>]*?)>(.*?)</definedName>', src_wb_xml, re.DOTALL | re.IGNORECASE):
            attrs = m.group(1)
            name_m = re.search(r'\bname="([^"]*)"', attrs, re.IGNORECASE)
            if not name_m:
                continue
            name = name_m.group(1)
            if name.startswith("_xlnm._FilterDatabase"):
                continue
            loc_m = re.search(r'\blocalSheetId="([^"]*)"', attrs, re.IGNORECASE)
            loc = loc_m.group(1) if loc_m else None
            src_dns.append((name, loc, m.group(0)))

        if not src_dns:
            return

        tgt_wb = replacements.get(XLSX_WORKBOOK_ENTRY)
        if tgt_wb is None:
            tgt_wb_bytes = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
            if not tgt_wb_bytes:
                return
            tgt_wb = tgt_wb_bytes.decode("utf-8", errors="replace")
        elif isinstance(tgt_wb, bytes):
            tgt_wb = tgt_wb.decode("utf-8", errors="replace")

        existing_keys = set()
        for m in re.finditer(r'<definedName\b([^>]*?)>', tgt_wb, re.IGNORECASE):
            attrs = m.group(1)
            name_m = re.search(r'\bname="([^"]*)"', attrs, re.IGNORECASE)
            if name_m:
                loc_m = re.search(r'\blocalSheetId="([^"]*)"', attrs, re.IGNORECASE)
                loc = loc_m.group(1) if loc_m else None
                existing_keys.add((name_m.group(1), loc))

        missing_tags = []
        for name, loc, full_tag in src_dns:
            if (name, loc) not in existing_keys:
                missing_tags.append(full_tag)

        if not missing_tags:
            return

        to_insert = "".join(missing_tags)
        dn_block_m = re.search(r'<definedNames\b([^>]*?)>(.*?)</definedNames>', tgt_wb, re.DOTALL | re.IGNORECASE)
        if dn_block_m:
            insert_pos = dn_block_m.end() - len("</definedNames>")
            new_wb = tgt_wb[:insert_pos] + to_insert + tgt_wb[insert_pos:]
            replacements[XLSX_WORKBOOK_ENTRY] = new_wb
        else:
            block_xml = f"<definedNames>{to_insert}</definedNames>"
            anchor_m = re.search(r'<(?:calcPr|oleSize|customWorkbookViews|extLst)\b|</workbook>', tgt_wb, re.IGNORECASE)
            if anchor_m:
                new_wb = tgt_wb[:anchor_m.start()] + block_xml + tgt_wb[anchor_m.start():]
                replacements[XLSX_WORKBOOK_ENTRY] = new_wb
    except Exception:
        pass


def _restore_missing_hyperlinks_step(
    xlsx_bytes: bytes,
    source_xlsx_bytes: bytes,
    replacements: dict[str, str | bytes],
) -> None:
    """Restore hyperlinks and their relationships from source XLSX if dropped."""
    try:
        source_sheet_entries = _resolve_xlsx_sheet_entries(source_xlsx_bytes)
        target_sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
        if not source_sheet_entries or not target_sheet_entries:
            return

        for sheet_name, src_entry in source_sheet_entries.items():
            tgt_entry = _sheet_name_equivalent_value(target_sheet_entries, sheet_name)
            if not tgt_entry:
                continue

            src_xml_bytes = read_zip_entry(source_xlsx_bytes, src_entry)
            if not src_xml_bytes:
                continue
            src_xml = src_xml_bytes.decode("utf-8", errors="replace")

            hl_match = re.search(r'<hyperlinks\b([^>]*?)>(.*?)</hyperlinks>', src_xml, re.DOTALL | re.IGNORECASE)
            if not hl_match:
                continue
            src_hl_xml = hl_match.group(0)
            # Strip non-standard extension attributes (e.g. xr:uid) to prevent unbound prefix errors
            src_hl_xml = re.sub(r'\s*xr:\w+="[^"]*"', '', src_hl_xml)

            tgt_xml_str = replacements.get(tgt_entry)
            if tgt_xml_str is None:
                tgt_bytes = read_zip_entry(xlsx_bytes, tgt_entry)
                if not tgt_bytes:
                    continue
                tgt_xml_str = tgt_bytes.decode("utf-8", errors="replace")
            elif isinstance(tgt_xml_str, bytes):
                tgt_xml_str = tgt_xml_str.decode("utf-8", errors="replace")

            if re.search(r'<hyperlinks\b', tgt_xml_str, re.IGNORECASE):
                continue

            # Quan hệ siêu liên kết của nguồn (rIdN) có thể TRÙNG Id với quan hệ khác của trang đích (vd. drawing = rId1 do
            # LibreOffice cấp): trước đây quan hệ bị bỏ qua vì "Id đã tồn tại" nên <hyperlink r:id> trỏ nhầm sang drawing và Excel
            # từ chối mở tệp (lan09: "Unable to get the Open property"). Đọc rels trước để đổi Id trùng sang Id mới.
            src_dir, src_filename = posixpath.split(src_entry)
            src_rels_path = f"{src_dir}/_rels/{src_filename}.rels"
            src_rels_bytes = read_zip_entry(source_xlsx_bytes, src_rels_path)
            src_rels_xml = src_rels_bytes.decode("utf-8", errors="replace") if src_rels_bytes else ""
            hl_rels = [
                r_m.group(0)
                for r_m in re.finditer(r'<Relationship\b[^>]*\bType="[^"]*hyperlink"[^>]*/>', src_rels_xml, re.IGNORECASE)
            ]

            tgt_dir, tgt_filename = posixpath.split(tgt_entry)
            tgt_rels_path = f"{tgt_dir}/_rels/{tgt_filename}.rels"
            tgt_rels_str = replacements.get(tgt_rels_path)
            if tgt_rels_str is None:
                tgt_rels_bytes = read_zip_entry(xlsx_bytes, tgt_rels_path)
                tgt_rels_str = tgt_rels_bytes.decode("utf-8", errors="replace") if tgt_rels_bytes else None
            elif isinstance(tgt_rels_str, bytes):
                tgt_rels_str = tgt_rels_str.decode("utf-8", errors="replace")

            used_ids = set(re.findall(r'\bId="([^"]*)"', tgt_rels_str or "", re.IGNORECASE))
            id_map: dict[str, str] = {}
            remapped_rels = []
            for rel_tag in hl_rels:
                rid_m = re.search(r'\bId="([^"]*)"', rel_tag, re.IGNORECASE)
                if not rid_m:
                    continue
                old_id = rid_m.group(1)
                new_id = old_id
                if new_id in used_ids:
                    counter = 1
                    while f"rIdVnoHl{counter}" in used_ids:
                        counter += 1
                    new_id = f"rIdVnoHl{counter}"
                    rel_tag = re.sub(r'\bId="[^"]*"', f'Id="{new_id}"', rel_tag, count=1)
                used_ids.add(new_id)
                id_map[old_id] = new_id
                remapped_rels.append(rel_tag)
            if id_map:
                src_hl_xml = re.sub(
                    r'\br:id="([^"]*)"',
                    lambda m: f'r:id="{id_map.get(m.group(1), m.group(1))}"',
                    src_hl_xml,
                )

            # Ensure xmlns:r is declared on <worksheet> root element
            if 'r:id=' in src_hl_xml and 'xmlns:r=' not in tgt_xml_str:
                tgt_xml_str = re.sub(
                    r'<worksheet\b',
                    '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
                    tgt_xml_str,
                    count=1,
                )

            # Insert <hyperlinks> in schema order (before printOptions, pageMargins, pageSetup, drawing, or </worksheet>)
            anchor_m = re.search(
                r'<(?:printOptions|pageMargins|pageSetup|headerFooter|rowBreaks|colBreaks|customProperties|cellWatches|ignoredErrors|smartTags|drawing|legacyDrawing|picture|oleObjects|controls|webPublishItems|tableParts|extLst)\b|</worksheet>',
                tgt_xml_str,
                re.IGNORECASE,
            )
            if anchor_m:
                new_tgt_xml = tgt_xml_str[:anchor_m.start()] + src_hl_xml + tgt_xml_str[anchor_m.start():]
            else:
                new_tgt_xml = _insert_worksheet_child_in_schema_order(tgt_xml_str, src_hl_xml, "hyperlinks")

            if new_tgt_xml != tgt_xml_str:
                replacements[tgt_entry] = new_tgt_xml

            if not remapped_rels:
                continue

            if tgt_rels_str:
                pos = tgt_rels_str.rfind("</Relationships>")
                if pos != -1:
                    replacements[tgt_rels_path] = tgt_rels_str[:pos] + "".join(remapped_rels) + tgt_rels_str[pos:]
            else:
                replacements[tgt_rels_path] = (
                    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
                    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                    f'{"".join(remapped_rels)}</Relationships>'
                )
    except Exception:
        pass


def _remove_spurious_center_continuous_merges_step(xlsx_bytes: bytes, source_xlsx_bytes: bytes, replacements: dict[str, str]) -> None:
    """Remove merges invented by LibreOffice for source centerContinuous cells."""
    styles = (read_zip_entry(source_xlsx_bytes, XLSX_STYLES_ENTRY) or b"").decode("utf-8", errors="replace")
    def xf_items(container: str) -> list[str]:
        block = re.search(rf"<{container}\b[^>]*>([\s\S]*?)</{container}>", styles, re.IGNORECASE)
        return [m.group(0) for m in re.finditer(r"<xf\b(?:[^>/]|/(?!>))*(?:/>|>[\s\S]*?</xf>)", block.group(1) if block else "", re.IGNORECASE)]
    cell_xfs = xf_items("cellXfs"); style_xfs = xf_items("cellStyleXfs")
    centered = set()
    for idx, xf in enumerate(cell_xfs):
        direct = re.search(r'horizontal="centerContinuous"', xf, re.IGNORECASE)
        xf_id = _xml_attrs(xf).get("xfId", "")
        inherited = xf_id.isdigit() and int(xf_id) < len(style_xfs) and re.search(r'horizontal="centerContinuous"', style_xfs[int(xf_id)], re.IGNORECASE)
        if direct or inherited: centered.add(idx)
    if not centered: return
    out_entries = _resolve_xlsx_sheet_entries(xlsx_bytes); src_entries = _resolve_xlsx_sheet_entries(source_xlsx_bytes)
    for name, out_path in out_entries.items():
        src_path = src_entries.get(name)
        if not src_path: continue
        src_xml = (read_zip_entry(source_xlsx_bytes, src_path) or b"").decode("utf-8", errors="replace")
        source_merges = set(re.findall(r'<mergeCell\b[^>]*ref="([^"]+)"', src_xml, re.IGNORECASE))
        center_cells = set()
        for match in re.finditer(r'<c\b([^>]*)', src_xml, re.IGNORECASE):
            attrs = _xml_attrs(match.group(1))
            if attrs.get("s", "").isdigit() and int(attrs["s"]) in centered: center_cells.add((attrs.get("r") or "").upper())
        out_xml = replacements.get(out_path) or (read_zip_entry(xlsx_bytes, out_path) or b"").decode("utf-8", errors="replace")
        removed = 0
        def drop(match: re.Match[str]) -> str:
            nonlocal removed
            ref = match.group(1); start = ref.split(":", 1)[0].upper()
            if ref not in source_merges and start in center_cells: removed += 1; return ""
            return match.group(0)
        out_xml = re.sub(r'<mergeCell\b[^>]*ref="([^"]+)"[^>]*/>', drop, out_xml, flags=re.IGNORECASE)
        if removed:
            out_xml = re.sub(r'(<mergeCells\b[^>]*\bcount=")\d+("[^>]*>)', lambda m: m.group(1) + str(max(0, int(re.search(r'\d+', m.group(0)).group()) - removed)) + m.group(2), out_xml, count=1, flags=re.IGNORECASE)
            out_xml = re.sub(r'<mergeCells\b[^>]*\bcount="0"[^>]*>\s*</mergeCells>', "", out_xml, flags=re.IGNORECASE)
            replacements[out_path] = out_xml


def _restore_hidden_columns_and_rows_from_source(sheet_xml: str, source_sheet_xml: str) -> str:
    """Restore hidden columns (including ranges up to XFD/16384) and empty hidden rows from source XLSX (S9)."""
    # --- 1. Hidden columns ---
    orig_hidden_cols = []
    for m in re.finditer(r'<col\b([^>]*)/?>', source_sheet_xml, re.IGNORECASE):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        if attrs.get("hidden") in ("1", "true"):
            orig_hidden_cols.append({
                "min": int(attrs.get("min", "1")),
                "max": int(attrs.get("max", attrs.get("min", "1"))),
                "width": attrs.get("width", "9.00"),
                "style": attrs.get("style", "0"),
            })

    if orig_hidden_cols:
        # S9b (đo vòng 5/6: lan19 150, lan08 231, lan22 15 cột): cột ẩn NGOÀI vùng dữ liệu (sau cột cuối
        # của <dimension>) là phần app không bao giờ thấy (LibreOffice bỏ khi nhập) -> file gốc là nguồn
        # đúng: phủ dải ẩn gốc lên <cols> đã lưu (cắt các <col> hiện có bị chồng), không chỉ nối thêm
        # sau cột lớn nhất (lan19: dải 265..4096 nằm trong <cols> LibreOffice ghi tới 4096 nên bị bỏ qua).
        dimension = re.search(r'<dimension\b[^>]*ref="[A-Z]+\d*(?::([A-Z]+)\d*)?"', sheet_xml, re.IGNORECASE)
        last_data_col = _column_index(dimension.group(1)) if dimension and dimension.group(1) else 0
        hidden_ranges = []
        for hc in orig_hidden_cols:
            lo = max(hc["min"], last_data_col + 1)
            if lo <= hc["max"]:
                hidden_ranges.append((lo, min(hc["max"], 16384), hc))
        cols_match = re.search(r"(<cols>)([\s\S]*?)(</cols>)", sheet_xml, re.IGNORECASE)
        if hidden_ranges:
            existing: list[tuple[int, int, str]] = []  # (min, max, attrs không có min/max)
            if cols_match:
                for m in re.finditer(r'<col\b([^>]*?)\s*/?>', cols_match.group(2), re.IGNORECASE):
                    attrs_str = m.group(1)
                    attrs = dict(re.findall(r'(\w+)="([^"]*)"', attrs_str))
                    c_min = int(attrs.get("min", "1")); c_max = int(attrs.get("max", attrs.get("min", "1")))
                    rest = re.sub(r'\s*\b(?:min|max)="[^"]*"', "", attrs_str).strip().rstrip("/").strip()
                    existing.append((c_min, c_max, rest))
            already_hidden = [(a, b) for a, b, rest in existing if re.search(r'\bhidden="(?:1|true)"', rest)]
            pieces: list[tuple[int, int, str]] = []
            for lo, hi, hc in hidden_ranges:
                if any(a <= lo and hi <= b for a, b in already_hidden):
                    continue
                # cắt phần chồng khỏi các <col> hiện có
                trimmed = []
                for a, b, rest in existing:
                    if b < lo or a > hi:
                        trimmed.append((a, b, rest))
                        continue
                    if a < lo:
                        trimmed.append((a, lo - 1, rest))
                    if b > hi:
                        trimmed.append((hi + 1, b, rest))
                existing = trimmed
                width_val = f"{float(hc['width']):.2f}" if hc["width"] else "9.00"
                pieces.append((lo, hi, f'collapsed="false" customWidth="1" hidden="true" outlineLevel="0" style="0" width="{width_val}"'))
            if pieces:
                merged = sorted(existing + pieces, key=lambda t: t[0])
                new_cols_content = "".join(f'<col {rest} max="{b}" min="{a}"/>' if rest else f'<col max="{b}" min="{a}"/>' for a, b, rest in merged)
                if cols_match:
                    sheet_xml = sheet_xml[:cols_match.start()] + "<cols>" + new_cols_content + "</cols>" + sheet_xml[cols_match.end():]
                else:
                    sd_match = re.search(r"<sheetData\b", sheet_xml, re.IGNORECASE)
                    if sd_match:
                        sheet_xml = sheet_xml[:sd_match.start()] + "<cols>" + new_cols_content + "</cols>" + sheet_xml[sd_match.start():]

    # --- 2. Hidden rows ---
    orig_hidden_rows = {}
    for m in re.finditer(r'<row\b([^>]*)>', source_sheet_xml, re.IGNORECASE):
        attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
        if attrs.get("hidden") in ("1", "true"):
            r = int(attrs.get("r", "0"))
            if r > 0:
                orig_hidden_rows[r] = attrs

    if orig_hidden_rows:
        sd_match = re.search(r"(<sheetData\b[^>]*>)([\s\S]*?)(</sheetData>)", sheet_xml, re.IGNORECASE)
        if sd_match:
            sd_open, sd_content, sd_close = sd_match.groups()
            row_blocks = []
            for m in re.finditer(r'<row\b([^>]*?)(?:/>|>([\s\S]*?)</row>)', sd_content, re.IGNORECASE):
                attrs = dict(re.findall(r'(\w+)="([^"]*)"', m.group(1)))
                r = int(attrs.get("r", "0"))
                full_tag = m.group(0)
                row_blocks.append((r, full_tag, attrs))

            existing_r = {rb[0] for rb in row_blocks}
            new_row_blocks = []
            for r, full_tag, attrs in row_blocks:
                if r in orig_hidden_rows and attrs.get("hidden") not in ("1", "true"):
                    if 'hidden="' in full_tag:
                        full_tag = re.sub(r'hidden="[^"]*"', 'hidden="true"', full_tag)
                    else:
                        full_tag = full_tag.replace("<row ", '<row hidden="true" ')
                new_row_blocks.append((r, full_tag))

            for hr, hattrs in orig_hidden_rows.items():
                if hr not in existing_r:
                    ht_val = hattrs.get("ht", "12.8")
                    new_tag = f'<row collapsed="false" customFormat="false" customHeight="false" hidden="true" ht="{ht_val}" outlineLevel="0" r="{hr}"/>'
                    new_row_blocks.append((hr, new_tag))

            new_row_blocks.sort(key=lambda x: x[0])
            new_sd_content = "".join(x[1] for x in new_row_blocks)
            sheet_xml = sheet_xml[:sd_match.start()] + sd_open + new_sd_content + sd_close + sheet_xml[sd_match.end():]

    return sheet_xml


def _restore_sheet_format_pr(sheet_xml: str, format_pr: dict) -> str:
    """Restore the source sheetFormatPr attributes (defaultColWidth/RowHeight, customHeight).

    LibreOffice writes the element in long form (<sheetFormatPr ...></sheetFormatPr>);
    it is edited in place. When absent it is inserted right before <cols> or
    <sheetData> (the only schema-valid slots), never after <sheetPr>.
    """
    match = re.search(r"<sheetFormatPr\b([^>]*?)\s*(/>|>\s*</sheetFormatPr\s*>)", sheet_xml, re.IGNORECASE)
    if match:
        attrs = match.group(1)
        for key, value in format_pr.items():
            if re.search(rf'\b{key}\s*=\s*"[^"]*"', attrs, re.IGNORECASE):
                attrs = re.sub(rf'\b{key}\s*=\s*"[^"]*"', f'{key}="{value}"', attrs, flags=re.IGNORECASE)
            else:
                attrs += f' {key}="{value}"'
        # S11: file gốc không có defaultColWidth (Excel dùng baseColWidth/8 ký tự) nhưng LibreOffice
        # luôn ghi defaultColWidth="11.53515625" của nó -> mọi cột không có <col> bị rộng ra.
        if "defaultColWidth" not in format_pr:
            attrs = re.sub(r'\s*\bdefaultColWidth\s*=\s*"[^"]*"', "", attrs, flags=re.IGNORECASE)
        if "defaultrowheight" not in attrs.lower():
            # CT_SheetFormatPr bắt buộc có defaultRowHeight
            attrs += ' defaultRowHeight="15"'
        return sheet_xml[:match.start()] + f"<sheetFormatPr{attrs}/>" + sheet_xml[match.end():]
    if not format_pr:
        return sheet_xml
    anchor = re.search(r"<cols\b|<sheetData\b", sheet_xml, re.IGNORECASE)
    if not anchor:
        return sheet_xml
    inserted = dict(format_pr)
    inserted.setdefault("defaultRowHeight", 15)
    attrs = " ".join(f'{k}="{v}"' for k, v in inserted.items())
    return sheet_xml[:anchor.start()] + f"<sheetFormatPr {attrs}/>" + sheet_xml[anchor.start():]


def _restore_row_heights(sheet_xml: str, row_heights_cm: dict[int, float]) -> str:
    """Restore row heights in worksheet XML.
    
    Formula: pt = height_cm * 72 / 2.54
    """
    # Find row elements and update ht attribute
    def replace_row(match: re.Match) -> str:
        attrs_str = match.group(1)
        row_match = re.search(r'r="(\d+)"', attrs_str)
        if not row_match:
            return match.group(0)
        row_num = int(row_match.group(1))
        if row_num not in row_heights_cm:
            return match.group(0)
        height_cm = row_heights_cm[row_num]
        height_pt = height_cm * 72 / 2.54
        # Update or add ht attribute
        # `\b` keeps customHeight="…" untouched (Excel rejects a non-boolean value there).
        new_attrs = re.sub(r'(?<![A-Za-z])ht\s*=\s*"[^"]*"', f'ht="{height_pt:.2f}"', attrs_str, flags=re.IGNORECASE)
        if not re.search(r'(?<![A-Za-z])ht=', new_attrs):
            new_attrs += f' ht="{height_pt:.2f}"'
        # Also set customHeight="1" if not present
        if 'customHeight=' not in new_attrs:
            new_attrs += ' customHeight="1"'
        return f'<row {new_attrs.strip()}>'
    
    return re.sub(r"<row\b([^>]*)>", replace_row, sheet_xml, flags=re.IGNORECASE)


def parse_auto_rows_from_fods(fods_xml: str | None) -> dict[str, set[int]]:
    """S30b: `vno:auto-rows="19,20,21"` trên <table:table> (app ghi) -> {sheet: {rows}}."""
    result: dict[str, set[int]] = {}
    if not fods_xml:
        return result
    for match in re.finditer(r"<table:table\b([^>]*)>", fods_xml, re.IGNORECASE):
        attrs = match.group(1)
        name_match = re.search(r'table:name="([^"]*)"', attrs)
        rows_match = re.search(r'vno:auto-rows="([^"]*)"', attrs)
        if not name_match or not rows_match:
            continue
        rows = {int(item) for item in rows_match.group(1).split(",") if item.strip().isdigit()}
        if rows:
            result[_unescape_xml(name_match.group(1))] = rows
    return result


def _restore_source_auto_row_attrs(sheet_xml: str, source_sheet_xml: str, auto_rows: set[int]) -> str:
    """S30b: với hàng trong `auto_rows`, đặt lại `ht` đúng như file gốc (hoặc bỏ ht) và bỏ customHeight —
    hàng vẫn là hàng tự động, Excel tính lại khi mở như với file gốc (đo lan12/lan02/lan05: không hạ thấp hơn ht)."""
    source_attrs: dict[int, str | None] = {}
    for match in re.finditer(r"<row\b([^>]*?)/?>", source_sheet_xml, re.IGNORECASE):
        attrs = match.group(1)
        row = re.search(r'\br="(\d+)"', attrs)
        if not row or int(row.group(1)) not in auto_rows:
            continue
        if re.search(r'\bcustomHeight="(?:1|true)"', attrs, re.IGNORECASE):
            continue
        height = re.search(r'(?<![A-Za-z])ht="([^"]*)"', attrs)
        source_attrs[int(row.group(1))] = height.group(1) if height else None

    def replace_row(match: re.Match) -> str:
        attrs = match.group(1)
        row = re.search(r'\br="(\d+)"', attrs)
        if not row or int(row.group(1)) not in source_attrs:
            return match.group(0)
        height = source_attrs[int(row.group(1))]
        new_attrs = re.sub(r'\s*(?<![A-Za-z])ht="[^"]*"', "", attrs, flags=re.IGNORECASE)
        new_attrs = re.sub(r'\s*\bcustomHeight="[^"]*"', "", new_attrs, flags=re.IGNORECASE)
        if height is not None:
            new_attrs += f' ht="{height}"'
        return f"<row {new_attrs.strip()}{match.group(2)}>"

    return re.sub(r"<row\b([^>]*?)(/?)>", replace_row, sheet_xml, flags=re.IGNORECASE)


# ---------------------------------------------------------------------------
# External links preservation
# ---------------------------------------------------------------------------

_EXTERNAL_LINKS_DIR = "xl/externalLinks/"

def _preserve_external_links(
    xlsx_bytes: bytes,
    source_xlsx_bytes: bytes,
    replacements: dict[str, str],
) -> None:
    """Copy external links from source XLSX and preserve original formulas/values.

    This handles the case where LibreOffice converts external reference formulas
    (e.g., '[1]Sheet!A1') to ODF-style file:// URLs which Excel cannot open.
    """
    # Check if source has external links
    with zipfile.ZipFile(io.BytesIO(source_xlsx_bytes), "r") as zin:
        extlink_names = [
            name for name in zin.namelist()
            if name.startswith(_EXTERNAL_LINKS_DIR) and name.endswith(".xml") and not name.endswith(".rels")
        ]
        if not extlink_names:
            return

        # 1. Copy all externalLink XML files and their .rels
        for name in extlink_names:
            data = zin.read(name)
            replacements[name] = data
            # Part relationships live in the sibling _rels folder:
            # xl/externalLinks/_rels/externalLink1.xml.rels (Excel rejects the
            # workbook when <externalBook r:id> has no relationship part).
            folder, base = name.rsplit("/", 1)
            rels_name = f"{folder}/_rels/{base}.rels"
            if rels_name in zin.namelist():
                replacements[rels_name] = zin.read(rels_name)

        # 2. Parse source workbook.xml for externalReferences and relationships
        src_wb = zin.read(XLSX_WORKBOOK_ENTRY).decode("utf-8", errors="replace")
        src_rels = zin.read(XLSX_WORKBOOK_RELS_ENTRY).decode("utf-8", errors="replace")
        src_ct = zin.read("[Content_Types].xml").decode("utf-8", errors="replace")

        # Extract externalReferences element
        ext_refs_match = re.search(r"<externalReferences\b[^>]*>[\s\S]*?</externalReferences>", src_wb, re.IGNORECASE)
        if not ext_refs_match:
            return
        external_references_xml = ext_refs_match.group(0)

        # Extract externalLink relationships from workbook.xml.rels. The source
        # ids (rId3, rId4, …) collide with LibreOffice's own sheet/style ids in
        # the output, so every external relationship gets a fresh id and the
        # <externalReference r:id> list is rewritten to match.
        extlink_rels = []
        id_map: dict[str, str] = {}
        for index, m in enumerate(re.finditer(r'<Relationship\b([^>]*)/?>', src_rels, re.IGNORECASE), start=1):
            attrs = m.group(1)
            type_match = re.search(r'Type="([^"]*)"', attrs)
            if type_match and "externalLink" in type_match.group(1):
                old_id = re.search(r'\bId="([^"]*)"', attrs)
                if not old_id:
                    continue
                new_id = f"rIdVnoExt{index}"
                id_map[old_id.group(1)] = new_id
                extlink_rels.append(re.sub(r'\bId="[^"]*"', f'Id="{new_id}"', m.group(0)))
        external_references_xml = re.sub(
            r'r:id="([^"]*)"',
            lambda ref: f'r:id="{id_map.get(ref.group(1), ref.group(1))}"',
            external_references_xml,
        )

        # Extract externalLink Override entries from Content_Types
        extlink_overrides = []
        for m in re.finditer(r'<Override\b[^>]*externalLink[^>]*/>', src_ct, re.IGNORECASE):
            extlink_overrides.append(m.group(0))

        # 3. Update workbook.xml in output: add externalReferences
        out_wb_xml = replacements.get(XLSX_WORKBOOK_ENTRY)
        if out_wb_xml is None:
            out_wb_bytes = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
            if out_wb_bytes:
                out_wb_xml = out_wb_bytes.decode("utf-8", errors="replace")
        if out_wb_xml and "<externalReferences" not in out_wb_xml:
            # Insert externalReferences after <sheets> element (schema order)
            out_wb_xml = _insert_external_references(out_wb_xml, external_references_xml)
            replacements[XLSX_WORKBOOK_ENTRY] = out_wb_xml

        # 4. Update workbook.xml.rels: add externalLink relationships
        out_rels_xml = replacements.get(XLSX_WORKBOOK_RELS_ENTRY)
        if out_rels_xml is None:
            out_rels_bytes = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_RELS_ENTRY)
            if out_rels_bytes:
                out_rels_xml = out_rels_bytes.decode("utf-8", errors="replace")
        if out_rels_xml:
            out_rels_xml = _add_external_link_relationships(out_rels_xml, extlink_rels)
            replacements[XLSX_WORKBOOK_RELS_ENTRY] = out_rels_xml

        # 5. Update Content_Types.xml: add externalLink Override entries
        out_ct_xml = replacements.get("[Content_Types].xml")
        if out_ct_xml is None:
            out_ct_bytes = read_zip_entry(xlsx_bytes, "[Content_Types].xml")
            if out_ct_bytes:
                out_ct_xml = out_ct_bytes.decode("utf-8", errors="replace")
        if out_ct_xml:
            out_ct_xml = _add_content_type_overrides(out_ct_xml, extlink_overrides)
            replacements["[Content_Types].xml"] = out_ct_xml

        # 6. Preserve original formulas and cached values for cells with [N] references
        _preserve_external_formulas(xlsx_bytes, source_xlsx_bytes, replacements)


def _insert_external_references(workbook_xml: str, external_references_xml: str) -> str:
    """Insert externalReferences element into workbook.xml right after </sheets>
    (CT_Workbook order: sheets, functionGroups, externalReferences, definedNames, calcPr)."""
    sheets_end = re.search(r"</sheets\s*>", workbook_xml, re.IGNORECASE)
    if sheets_end:
        return workbook_xml[:sheets_end.end()] + external_references_xml + workbook_xml[sheets_end.end():]
    # Fallback: insert before <definedNames> or <calcPr>
    for tag in (r"<definedNames\b", r"<calcPr\b"):
        match = re.search(tag, workbook_xml, re.IGNORECASE)
        if match:
            return workbook_xml[:match.start()] + external_references_xml + workbook_xml[match.start():]
    # Last resort: before </workbook>
    wb_end = re.search(r"</workbook\s*>", workbook_xml, re.IGNORECASE)
    if wb_end:
        return workbook_xml[:wb_end.start()] + external_references_xml + workbook_xml[wb_end.start():]
    return workbook_xml


def _add_external_link_relationships(rels_xml: str, extlink_rels: list[str]) -> str:
    """Add externalLink Relationship entries to workbook.xml.rels, avoiding duplicates."""
    if not extlink_rels:
        return rels_xml
    # Collect existing relationship IDs
    existing_ids = set(re.findall(r'Id="([^"]*)"', rels_xml))
    # Filter out duplicates
    new_rels = []
    for rel in extlink_rels:
        id_match = re.search(r'Id="([^"]*)"', rel)
        if id_match and id_match.group(1) not in existing_ids:
            new_rels.append(rel)
            existing_ids.add(id_match.group(1))
    if not new_rels:
        return rels_xml
    # Insert before </Relationships>
    rels_end = re.search(r"</Relationships\s*>", rels_xml, re.IGNORECASE)
    if rels_end:
        return rels_xml[:rels_end.start()] + "".join(new_rels) + rels_xml[rels_end.start():]
    return rels_xml


def _add_content_type_overrides(ct_xml: str, overrides: list[str]) -> str:
    """Add externalLink Override entries to Content_Types.xml, avoiding duplicates."""
    if not overrides:
        return ct_xml
    # Collect existing PartNames
    existing_parts = set(re.findall(r'PartName="([^"]*)"', ct_xml))
    # Filter out duplicates
    new_overrides = []
    for ovr in overrides:
        part_match = re.search(r'PartName="([^"]*)"', ovr)
        if part_match and part_match.group(1) not in existing_parts:
            new_overrides.append(ovr)
            existing_parts.add(part_match.group(1))
    if not new_overrides:
        return ct_xml
    # Insert before </Types>
    types_end = re.search(r"</Types\s*>", ct_xml, re.IGNORECASE)
    if types_end:
        return ct_xml[:types_end.start()] + "".join(new_overrides) + ct_xml[types_end.start():]
    return ct_xml


def _preserve_external_formulas(
    xlsx_bytes: bytes,
    source_xlsx_bytes: bytes,
    replacements: dict[str, str],
) -> None:
    """Preserve original formulas, types, and cached values for cells with [N] references."""
    # Map sheet name -> entry path for source and output
    src_sheet_entries = _resolve_xlsx_sheet_entries(source_xlsx_bytes)
    out_sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)

    with zipfile.ZipFile(io.BytesIO(source_xlsx_bytes), "r") as zin:
        for sheet_name, src_entry in src_sheet_entries.items():
            out_entry = out_sheet_entries.get(sheet_name)
            if not out_entry:
                continue

            # Read source sheet XML
            src_sheet_xml = zin.read(src_entry).decode("utf-8", errors="replace")

            # Find all cells with [N] in formula
            ext_cells = {}
            for m in re.finditer(r'<c\b([^>]*?)(?:>([\s\S]*?)<\/c>|\/\s*>)', src_sheet_xml, re.IGNORECASE):
                attrs_str = m.group(1)
                body = m.group(2) or ""
                # Check if formula contains [N] pattern
                f_match = re.search(r'<f\b[^>]*>([\s\S]*?)</f>|<f\b[^>]*/>', body, re.IGNORECASE)
                if f_match:
                    formula = f_match.group(1) or ""
                    if re.search(r'\[\d+\]', formula):
                        # Get cell coordinate
                        r_match = re.search(r'r="([^"]*)"', attrs_str)
                        if r_match:
                            coord = r_match.group(1)
                            # Store the full cell element
                            ext_cells[coord] = m.group(0)

            if not ext_cells:
                continue

            # Read output sheet XML
            out_sheet_xml = replacements.get(out_entry)
            if out_sheet_xml is None:
                out_sheet_bytes = read_zip_entry(xlsx_bytes, out_entry)
                if not out_sheet_bytes:
                    continue
                out_sheet_xml = out_sheet_bytes.decode("utf-8", errors="replace")

            # Replace formula/type/cached value of the output cell with the source
            # cell's, but keep the output's style index: xf numbering differs
            # between the source styles.xml and the one LibreOffice wrote.
            # One pass over the sheet: a per-cell re.sub was O(cells x sheet)
            # and never finished on a 1.5 M-cell sheet (Danh sach thi online).
            prepared: dict[str, tuple[str | None, str]] = {}
            for coord, src_cell in ext_cells.items():
                src_open = re.match(r"<c\b([^>]*?)(/?)>", src_cell)
                src_attrs = src_open.group(1) if src_open else ""
                src_type = re.search(r'\bt="([^"]*)"', src_attrs)
                src_body = re.search(r"<c\b[^>]*>([\s\S]*?)</c>", src_cell)
                prepared[coord] = (src_type.group(1) if src_type else None, src_body.group(1) if src_body else "")

            def rebuild(match: re.Match[str]) -> str:
                out_attrs = match.group(1) or ""
                coord_match = re.search(r'\br="([^"]*)"', out_attrs)
                if not coord_match or coord_match.group(1) not in prepared:
                    return match.group(0)
                src_type, src_body = prepared[coord_match.group(1)]
                style = re.search(r'\bs="([^"]*)"', out_attrs)
                attrs = f' r="{coord_match.group(1)}"'
                if style:
                    attrs += f' s="{style.group(1)}"'
                if src_type:
                    attrs += f' t="{src_type}"'
                return f"<c{attrs}>{src_body}</c>" if src_body else f"<c{attrs}/>"

            out_sheet_xml = re.sub(r"<c\b([^>]*?)(?:/>|>[\s\S]*?</c>)", rebuild, out_sheet_xml)

            replacements[out_entry] = out_sheet_xml


def postprocess_sheet_xlsx(
    xlsx_bytes: bytes,
    *,
    source_fods: str | None = None,
    enabled: bool | None = None,
    source_xlsx_bytes: bytes | None = None,
) -> bytes:
    """Return patched XLSX bytes, or the original buffer when no patch is needed."""
    replacements: dict[str, str] = {}
    source_xlsx_bytes = normalize_source_xlsx(source_xlsx_bytes)  # S23: XLSX gốc có tiền tố x: (lan23)

    # Extract original font and sheetFormatPr from source XLSX if available
    original_font = None
    original_sheet_format_pr = {}
    original_digit_width = None
    if source_xlsx_bytes:
        original_font = _extract_normal_font_from_xlsx(source_xlsx_bytes)
        original_sheet_format_pr = _extract_sheet_format_pr_from_xlsx(source_xlsx_bytes)
        if original_font:
            original_digit_width = _calculate_digit_width(original_font["name"], original_font["size"])

        # Run source-fidelity repairs before slower layout/style passes. The
        # desktop save has already created the target ZIP at this point; doing
        # these compact, deterministic repairs first also keeps automation from
        # observing the transient LibreOffice-only file.
        early_copier = _SourceXfCopier(xlsx_bytes, source_xlsx_bytes)
        _restore_formula_results_and_missing_errors_step(xlsx_bytes, source_xlsx_bytes, replacements, early_copier if early_copier.available else None)
        _remove_spurious_center_continuous_merges_step(xlsx_bytes, source_xlsx_bytes, replacements)
        _restore_sheet_zoom_step(xlsx_bytes, source_xlsx_bytes, replacements)
        _restore_autofilter_filter_columns_step(xlsx_bytes, source_xlsx_bytes, replacements)
        _restore_missing_defined_names_step(xlsx_bytes, source_xlsx_bytes, replacements)
        _restore_missing_hyperlinks_step(xlsx_bytes, source_xlsx_bytes, replacements)
        if source_fods:
            _restore_untouched_drawings_step(xlsx_bytes, source_fods, source_xlsx_bytes, replacements)
    if source_fods:
        # After the source-result pass: it compares formulas literally and LibreOffice
        # rewrote `_xll.VND(H13)` as `vnd(H13)`, so the VND text is set here.
        _restore_vnd_addin_cells_step(xlsx_bytes, source_fods, replacements, source_xlsx_bytes)

    if enabled is None:
        enabled = fods_has_structure_protection(source_fods)
    if enabled:
        try:
            current = _read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
        except KeyError as exc:
            raise ValueError("XLSX thiếu xl/workbook.xml — không thể bổ sung workbookProtection") from exc
        xml = current.decode("utf-8")
        next_xml = apply_workbook_protection_lock_structure(xml)
        if next_xml != xml:
            replacements[XLSX_WORKBOOK_ENTRY] = next_xml

    # Freeze Panes: soffice thật không khôi phục <pane> qua ODF office:settings
    # khi chuyển đổi headless FODS<->XLSX (xác nhận qua vòng chuyển đổi soffice
    # thật) - ghi thẳng <pane> chuẩn vào (các) worksheetN.xml thật dựa theo
    # vno:frozen-rows/cols 3T Office tự lưu trong FODS nguồn.
    freeze_by_sheet = parse_freeze_panes_from_fods(source_fods)
    if freeze_by_sheet:
        sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
        for sheet_name, freeze in freeze_by_sheet.items():
            entry_path = _sheet_name_equivalent_value(sheet_entries, sheet_name)
            if not entry_path:
                continue
            sheet_xml = replacements.get(entry_path)
            if sheet_xml is None:
                entry_bytes = read_zip_entry(xlsx_bytes, entry_path)
                if not entry_bytes:
                    continue
                sheet_xml = entry_bytes.decode("utf-8", errors="replace")
            next_sheet_xml = apply_freeze_pane_to_sheet_xml(sheet_xml, freeze["rows"], freeze["cols"])
            if next_sheet_xml != sheet_xml:
                replacements[entry_path] = next_sheet_xml

    # Sheet visibility (veryHidden): soffice downgrades veryHidden → hidden
    # during FODS→XLSX, so we read vno:sheet-state from FODS and write
    # state="veryHidden" back into xl/workbook.xml.
    visibility_by_sheet = parse_sheet_visibility_from_fods(source_fods)
    if visibility_by_sheet:
        try:
            current = _read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
        except KeyError:
            current = None
        if current:
            wb_xml = current.decode("utf-8", errors="replace")
            next_wb_xml = apply_sheet_visibility_to_workbook(wb_xml, visibility_by_sheet)
            if next_wb_xml != wb_xml:
                replacements[XLSX_WORKBOOK_ENTRY] = next_wb_xml

    # AutoFilter: soffice may drop <autoFilter> during FODS→XLSX conversion
    # when the FODS had <table:database-ranges>.  Read the range info from
    # FODS and write <autoFilter ref> back into the correct worksheet XML.
    autofilter_by_sheet = parse_autofilter_from_fods(source_fods)
    if autofilter_by_sheet:
        filter_columns_by_sheet = parse_autofilter_filter_columns_from_fods(source_fods)
        sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
        for sheet_name, ref in autofilter_by_sheet.items():
            entry_path = _sheet_name_equivalent_value(sheet_entries, sheet_name)
            if not entry_path:
                continue
            sheet_xml = replacements.get(entry_path)
            if sheet_xml is None:
                entry_bytes = read_zip_entry(xlsx_bytes, entry_path)
                if not entry_bytes:
                    continue
                sheet_xml = entry_bytes.decode("utf-8", errors="replace")
            next_sheet_xml = apply_autofilter_to_worksheet(sheet_xml, ref, filter_columns_by_sheet.get(sheet_name))
            if next_sheet_xml != sheet_xml:
                replacements[entry_path] = next_sheet_xml
        current_workbook_xml = replacements.get(XLSX_WORKBOOK_ENTRY)
        filter_names_xml = _apply_filter_database_names(xlsx_bytes, autofilter_by_sheet, current_workbook_xml)
        if filter_names_xml:
            replacements[XLSX_WORKBOOK_ENTRY] = filter_names_xml
        try:
            strip_autofilter_table_parts(xlsx_bytes, replacements)
        except Exception:
            # A table part we could not parse is left alone rather than failing the save.
            pass
        if source_xlsx_bytes:
            _restore_autofilter_filter_columns_step(xlsx_bytes, source_xlsx_bytes, replacements)

    # Scenarios: soffice drops <scenarios> during FODS -> XLSX. Read
    # vno:scenarios from FODS and write <scenarios> into worksheets.
    scenarios_by_sheet = parse_scenarios_from_fods(source_fods)
    if scenarios_by_sheet:
        for sheet_name, scens in scenarios_by_sheet.items():
            entry_path = _sheet_name_equivalent_value(sheet_entries, sheet_name)
            if not entry_path:
                continue
            sheet_xml = replacements.get(entry_path)
            if sheet_xml is None:
                entry_bytes = read_zip_entry(xlsx_bytes, entry_path)
                if not entry_bytes:
                    continue
                sheet_xml = entry_bytes.decode("utf-8", errors="replace")
            next_sheet_xml = apply_scenarios_to_worksheet(sheet_xml, scens)
            if next_sheet_xml != sheet_xml:
                replacements[entry_path] = next_sheet_xml

    # Excel margins exclude the header/footer spacing LibreOffice adds on export.
    sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    for sheet_name, margins in parse_page_margins_from_fods(source_fods).items():
        entry_path = _sheet_name_equivalent_value(sheet_entries, sheet_name)
        if not entry_path:
            continue
        sheet_xml = replacements.get(entry_path)
        if sheet_xml is None:
            content = read_zip_entry(xlsx_bytes, entry_path)
            if not content:
                continue
            sheet_xml = content.decode('utf-8', errors='replace')
        replacements[entry_path] = apply_page_margins_to_worksheet(sheet_xml, margins)

    # Print Titles: LibreOffice drops the app's vno:print-title-* metadata
    # during FODS -> XLSX, so rebuild the standard workbook defined names.
    print_titles = parse_print_titles_from_fods(source_fods)
    if any(rows or cols for _name, rows, cols in print_titles):
        current = replacements.get(XLSX_WORKBOOK_ENTRY)
        if current is None:
            current_bytes = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
            current = current_bytes.decode("utf-8", errors="replace") if current_bytes else ""
        next_workbook = apply_print_titles_to_workbook(str(current), print_titles)
        if next_workbook != current:
            replacements[XLSX_WORKBOOK_ENTRY] = next_workbook

    # Preserve activeTab (selected sheet) and tab colors from source FODS.
    # The FODS contains ActiveTable and tabColor/tableooo:tab-color from serializeToFods().
    if source_fods:
        try:
            active_sheet = parse_active_sheet_from_fods(source_fods)
            fods_tab_colors = parse_tab_colors_from_fods(source_fods)
            sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)

            out_wb_xml = replacements.get(XLSX_WORKBOOK_ENTRY)
            if out_wb_xml is None:
                out_wb_bytes = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
                if out_wb_bytes:
                    out_wb_xml = out_wb_bytes.decode("utf-8", errors="replace")
            if out_wb_xml:
                sheet_names = parse_sheet_names_from_workbook(out_wb_xml)
                if active_sheet and active_sheet in sheet_names:
                    active_tab = sheet_names.index(active_sheet)
                    next_wb_xml = apply_active_tab_to_workbook(out_wb_xml, active_tab)
                    if next_wb_xml != out_wb_xml:
                        replacements[XLSX_WORKBOOK_ENTRY] = next_wb_xml
                elif sheet_names:
                    active_tab = parse_active_tab_from_workbook(out_wb_xml)
                    if 0 <= active_tab < len(sheet_names):
                        active_sheet = sheet_names[active_tab]
                    else:
                        active_sheet = sheet_names[0]

            # Apply tabSelected and tabColor to worksheets
            for sheet_name, entry_path in sheet_entries.items():
                sheet_xml = replacements.get(entry_path)
                if sheet_xml is None:
                    entry_bytes = read_zip_entry(xlsx_bytes, entry_path)
                    if not entry_bytes:
                        continue
                    sheet_xml = entry_bytes.decode("utf-8", errors="replace")

                orig_sheet_xml = sheet_xml
                is_active = bool(active_sheet and sheet_name == active_sheet)
                sheet_xml = apply_sheet_view_selection(sheet_xml, is_active)

                color = fods_tab_colors.get(sheet_name)
                if color:
                    sheet_xml = apply_tab_color_to_worksheet(sheet_xml, color)

                if sheet_xml != orig_sheet_xml:
                    replacements[entry_path] = sheet_xml
        except Exception:
            # Never fail the save due to activeTab preservation issues
            pass

    # Restore original xf for cells with vno:xf (S8: untouched cell styles)
    xf_copier = None
    if source_xlsx_bytes and source_fods:
        try:
            xf_copier = _restore_original_xf_for_vno_cells(xlsx_bytes, source_fods, source_xlsx_bytes, replacements)
        except Exception:
            # Never fail the save due to xf restoration issues
            pass

    # S13: ô chuỗi rỗng của file gốc bị soffice bỏ khi nhập -> chèn lại (xf qua cùng bộ chép của S8)
    # S24b: a document created in 3T Sheet has no source XLSX to restore from;
    # enforce the Excel 2016 Normal/layout defaults after LibreOffice export.
    if not source_xlsx_bytes and source_fods:
        _apply_new_workbook_defaults(xlsx_bytes, source_fods, replacements)

    # Restore Normal font, column widths, sheetFormatPr, and row heights from original XLSX
    if source_xlsx_bytes and source_fods:
        try:
            _restore_normal_font_and_layout(
                xlsx_bytes, source_fods, source_xlsx_bytes,
                original_font, original_sheet_format_pr, original_digit_width,
                replacements
            )
        except Exception:
            # Never fail the save due to font/layout restoration issues
            pass

    # Restore hidden columns and rows from original XLSX (S9)
    if source_xlsx_bytes:
        try:
            _restore_hidden_columns_and_rows_step(xlsx_bytes, source_xlsx_bytes, replacements)
        except Exception:
            # Never fail the save due to hidden columns/rows restoration issues
            pass

    # S14: ô giá trị lỗi thuần (t="e", không công thức) không được thành công thức "=#N/A"
    if source_xlsx_bytes:
        try:
            _restore_literal_error_cells_step(xlsx_bytes, source_xlsx_bytes, replacements)
        except Exception:
            pass

    # Preserve external links from source XLSX
    if source_xlsx_bytes:
        try:
            _preserve_external_links(xlsx_bytes, source_xlsx_bytes, replacements)
        except Exception:
            # Never fail the save due to external links preservation issues
            pass

    # LibreOffice decodes Excel's _xHHHH_ sheet-name escape and normalizes a
    # control character to whitespace. Restore the original name/state only
    # when workbook order and normalized names still prove sheet identity.
    if source_xlsx_bytes:
        try:
            output_wb = replacements.get(XLSX_WORKBOOK_ENTRY) or (read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY) or b"").decode("utf-8", errors="replace")
            source_wb = (read_zip_entry(source_xlsx_bytes, XLSX_WORKBOOK_ENTRY) or b"").decode("utf-8", errors="replace")
            restored_wb = _restore_source_sheet_names_and_states(output_wb, source_wb)
            if restored_wb != output_wb: replacements[XLSX_WORKBOOK_ENTRY] = restored_wb
        except Exception:
            pass

    # Run cell-level source repairs last: layout/visibility passes above may
    # replace whole worksheet entries and would otherwise discard these cells.
    if source_xlsx_bytes:
        try:
            if xf_copier is None:
                xf_copier = _SourceXfCopier(xlsx_bytes, source_xlsx_bytes)
            active_copier = xf_copier if xf_copier.available else None
            _restore_empty_string_cells_step(xlsx_bytes, source_xlsx_bytes, replacements, active_copier)
            _restore_lost_leading_newlines_step(xlsx_bytes, source_xlsx_bytes, replacements, active_copier)
            # The copier rewrites the complete fonts block from its original
            # snapshot. Reapply fonts[0] afterwards so Excel uses the same MDW
            # that column-width restoration used (lan09 hidden sheets).
            styles_xml = replacements.get(XLSX_STYLES_ENTRY)
            source_normal = _extract_normal_font_xml_from_xlsx(source_xlsx_bytes)
            if styles_xml and source_normal:
                replacements[XLSX_STYLES_ENTRY] = _restore_normal_font_in_styles(styles_xml, source_normal)
        except Exception:
            pass

    if not replacements:
        return xlsx_bytes
    return patch_ooxml_zip(xlsx_bytes, replacements)


def _read_zip_entry(zip_bytes: bytes, entry_name: str) -> bytes:
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as package:
        return package.read(entry_name)


def read_zip_entry(zip_bytes: bytes, entry_name: str) -> bytes | None:
    """Public ZIP read used by File → Mở overlay. Returns None when missing."""
    try:
        return _read_zip_entry(zip_bytes, entry_name)
    except (KeyError, zipfile.BadZipFile, OSError, ValueError):
        return None


def docx_theme_fonts(docx_bytes: bytes) -> dict:
    """Font theme major/minor mà WORD thật sự vẽ cho tài liệu này (quy ước W12b, đo d07 19/9/2026).

    Word chọn typeface theo SCRIPT của ngôn ngữ văn bản: tài liệu tiếng Việt (docDefaults `w:lang w:val="vi"`
    hoặc phần lớn run `w:lang="vi-VN"`) dùng `<a:font script="Viet" typeface="Times New Roman"/>` của majorFont
    (không phải `<a:latin typeface="Calibri Light"/>`) — Word COM Font.Name = "Times New Roman" trong khi
    LibreOffice/HTML ghi Calibri Light → 23 đoạn d07 cao hơn 6–9% (ratio 1.221 vs 1.149).
    Returns {"major", "minor", "major_latin", "minor_latin", "vietnamese"}."""
    styles = (read_zip_entry(docx_bytes, "word/styles.xml") or b"").decode("utf-8", errors="replace")
    document = (read_zip_entry(docx_bytes, "word/document.xml") or b"").decode("utf-8", errors="replace")
    theme = (read_zip_entry(docx_bytes, "word/theme/theme1.xml") or b"").decode("utf-8", errors="replace")

    def fonts(kind: str) -> tuple[str, str]:
        block = re.search(rf"<a:{kind}>(.*?)</a:{kind}>", theme, re.S)
        if not block:
            return "", ""
        latin = re.search(r'<a:latin\b[^>]*typeface="([^"]*)"', block.group(1))
        viet = re.search(r'<a:font\b[^>]*script="Viet"[^>]*typeface="([^"]*)"', block.group(1))
        return (latin.group(1) if latin else ""), (viet.group(1) if viet else "")

    major_latin, major_viet = fonts("majorFont")
    minor_latin, minor_viet = fonts("minorFont")
    default_lang = re.search(r"<w:rPrDefault>.*?<w:lang\b[^>]*w:val=\"([^\"]*)\"", styles, re.S)
    langs = re.findall(r'<w:lang\b[^>]*w:val="([^"]*)"', document)
    vi_runs = sum(1 for l in langs if l.lower().startswith("vi"))
    vietnamese = bool(default_lang and default_lang.group(1).lower().startswith("vi")) or (langs and vi_runs * 2 > len(langs))
    return {
        "major": (major_viet if vietnamese and major_viet else major_latin),
        "minor": (minor_viet if vietnamese and minor_viet else minor_latin),
        "major_latin": major_latin, "minor_latin": minor_latin, "vietnamese": bool(vietnamese),
    }


def apply_docx_theme_script_fonts(docx_bytes: bytes, html: str) -> str:
    """W12b, phía HTML: LibreOffice ghi `<font face="Calibri Light, sans-serif">` cho run dùng theme font; với tài
    liệu tiếng Việt Word vẽ typeface script="Viet" (Times New Roman / Arial). Thay tên font theme latin bằng font
    Viet trong HTML khi tài liệu KHÔNG có run/style nào đặt tường minh font latin đó (`w:ascii="Calibri Light"`) —
    khi đó mọi lần xuất hiện đều đến từ theme."""
    if not html or not docx_bytes:
        return html
    info = docx_theme_fonts(docx_bytes)
    if not info["vietnamese"]:
        return html
    styles = (read_zip_entry(docx_bytes, "word/styles.xml") or b"").decode("utf-8", errors="replace")
    document = (read_zip_entry(docx_bytes, "word/document.xml") or b"").decode("utf-8", errors="replace")
    for latin, viet in ((info["major_latin"], info["major"]), (info["minor_latin"], info["minor"])):
        if not latin or not viet or latin == viet:
            continue
        explicit = re.search(rf'w:(?:ascii|hAnsi)="{re.escape(latin)}"', styles + document)
        if explicit:
            continue
        html = re.sub(rf'(face=["\']){re.escape(latin)}(?=[,"\'])', lambda m: m.group(1) + viet, html)
        html = re.sub(rf'(font-family:\s*["\']?){re.escape(latin)}(?=["\',;])', lambda m: m.group(1) + viet, html)
    return html


def docx_default_font(docx_bytes: bytes) -> tuple[str, float | None]:
    """Font/cỡ chữ mặc định của tài liệu Word: style Normal (rFonts/sz), nếu không thì docDefaults;
    `w:asciiTheme="majorHAnsi|minorHAnsi"` giải qua theme1.xml (majorFont/minorFont latin).
    Đo d07.docx 2026-09-15 (quy ước W9): LibreOffice không ghi font-family nào vào HTML khi font đến từ
    docDefaults + theme (Arial), canvas rơi về Times New Roman NĐ30 → 199 đoạn lệch font trong 1 file.
    Returns (family, size_pt) — family "" nếu không xác định."""
    styles = (read_zip_entry(docx_bytes, "word/styles.xml") or b"").decode("utf-8", errors="replace")
    resolved = docx_theme_fonts(docx_bytes)
    theme_fonts = {"majorHAnsi": resolved["major"], "minorHAnsi": resolved["minor"],
                   "majorAscii": resolved["major"], "minorAscii": resolved["minor"]}

    def pick(block: str) -> tuple[str, float | None]:
        fam = ""
        rfonts = re.search(r"<w:rFonts\b([^>]*)/?>", block)
        if rfonts:
            attrs = rfonts.group(1)
            ascii_match = re.search(r'w:ascii="([^"]+)"', attrs)
            theme_match = re.search(r'w:asciiTheme="([^"]+)"', attrs)
            if ascii_match:
                fam = ascii_match.group(1)
            elif theme_match:
                fam = theme_fonts.get(theme_match.group(1), "")
        sz = re.search(r'<w:sz\b[^>]*w:val="(\d+)"', block)
        return fam, (int(sz.group(1)) / 2 if sz else None)

    normal = re.search(r'<w:style\b[^>]*w:styleId="Normal"[^>]*>(.*?)</w:style>', styles, re.S)
    defaults = re.search(r"<w:rPrDefault>(.*?)</w:rPrDefault>", styles, re.S)
    fam, size = ("", None)
    if normal:
        fam, size = pick(normal.group(1))
    if (not fam or size is None) and defaults:
        dfam, dsize = pick(defaults.group(1))
        fam = fam or dfam
        size = size if size is not None else dsize
    return fam, size


def inject_docx_default_font_css(docx_bytes: bytes, html: str) -> str:
    """Khi head HTML của LibreOffice không có `p.western { font-family }` (font mặc định đến từ docDefaults/theme)
    thì chèn quy tắc đó từ DOCX để canvas dùng đúng font/cỡ mặc định của Word (quy ước W9)."""
    if not html or not docx_bytes:
        return html
    head_match = re.search(r"<style\b[^>]*>(.*?)</style>", html, re.S | re.I)
    head = head_match.group(1) if head_match else ""
    western = re.search(r"p\.western\s*\{([^}]*)\}", head)
    has_family = bool(western and re.search(r"font-family\s*:", western.group(1)))
    has_size = bool(re.search(r"\bp(?:\.western)?\s*\{[^}]*font-size\s*:", head))
    if has_family and has_size:
        return html
    fam, size = docx_default_font(docx_bytes)
    parts = []
    if not has_family and fam:
        parts.append(f'font-family: "{fam}", sans-serif')
    if not has_size and size is not None:
        parts.append(f"font-size: {size:g}pt")
    if not parts:
        return html
    if western and head_match:
        # Gộp vào quy tắc p.western sẵn có (JS đọc một khối duy nhất cho mỗi selector).
        body = western.group(1).rstrip()
        merged = (body + ("; " if body and not body.endswith(";") else " ") + "; ".join(parts) + " ")
        new_head = head[:western.start(1)] + merged + head[western.end(1):]
        return html[:head_match.start(1)] + new_head + html[head_match.end(1):]
    rule = "\n\t\tp.western { " + "; ".join(parts) + " }\n\t"
    if head_match:
        insert_at = head_match.end(1)
        return html[:insert_at] + rule + html[insert_at:]
    if re.search(r"</head>", html, re.I):
        return re.sub(r"</head>", f'<style type="text/css">{rule}</style></head>', html, count=1, flags=re.I)
    return html


def inject_docx_half_point_styles_css(docx_bytes: bytes, html: str) -> str:
    """W25a: Với mỗi style đoạn có w:sz lẻ (docDefaults -> Normal -> Heading1..6 -> style tuỳ biến)
    mà LibreOffice ánh xạ thành p.western, h1.western... ghi đè font-size: <sz/2>pt chính xác
    vào head CSS (thêm rule sau rule của LibreOffice, không sửa rule cũ)."""
    if not html or not docx_bytes:
        return html
    try:
        styles_xml = (read_zip_entry(docx_bytes, "word/styles.xml") or b"").decode("utf-8", errors="replace")
    except Exception:
        return html
    if not styles_xml:
        return html

    # docDefaults sz
    doc_default_sz = None
    dd = re.search(r"<w:docDefaults>[\s\S]*?</w:docDefaults>", styles_xml)
    if dd:
        m = re.search(r'<w:sz\b[^>]*w:val="(\d+)"', dd.group(0))
        if m:
            doc_default_sz = int(m.group(1))

    # Parse styles
    styles_map = {}
    for sm in re.finditer(r'<w:style\b([^>]*)>([\s\S]*?)</w:style>', styles_xml):
        attrs, body = sm.group(1), sm.group(2)
        stype = re.search(r'w:type="([^"]+)"', attrs)
        if stype and stype.group(1) != "paragraph":
            continue
        sid = re.search(r'w:styleId="([^"]+)"', attrs)
        if not sid:
            continue
        style_id = sid.group(1)
        name_m = re.search(r'<w:name\b[^>]*w:val="([^"]+)"', body)
        name = name_m.group(1) if name_m else style_id
        based_m = re.search(r'<w:basedOn\b[^>]*w:val="([^"]+)"', body)
        based_on = based_m.group(1) if based_m else None
        sz_m = re.search(r'<w:sz\b[^>]*w:val="(\d+)"', body)
        sz = int(sz_m.group(1)) if sz_m else None
        styles_map[style_id] = {
            "name": name,
            "basedOn": based_on,
            "sz": sz,
        }

    def resolve_sz(sid, visited=None):
        if visited is None:
            visited = set()
        if sid in visited:
            return doc_default_sz
        visited.add(sid)
        st = styles_map.get(sid)
        if not st:
            if sid != "Normal" and "Normal" in styles_map:
                return resolve_sz("Normal", visited)
            return doc_default_sz
        if st["sz"] is not None:
            return st["sz"]
        if st["basedOn"]:
            return resolve_sz(st["basedOn"], visited)
        if sid != "Normal" and "Normal" in styles_map:
            return resolve_sz("Normal", visited)
        return doc_default_sz

    head_match = re.search(r"<style\b[^>]*>(.*?)</style>", html, re.S | re.I)
    head_content = head_match.group(1) if head_match else ""

    odd_rules = []
    # Normal / docDefaults
    normal_sz = resolve_sz("Normal")
    if normal_sz is not None and normal_sz % 2 != 0:
        odd_rules.append(f"p.western {{ font-size: {normal_sz / 2.0:g}pt }}")

    for sid, st in styles_map.items():
        eff_sz = resolve_sz(sid)
        if eff_sz is None or eff_sz % 2 == 0:
            continue
        pt_size = eff_sz / 2.0
        name_lower = st["name"].strip().lower()
        sid_lower = sid.strip().lower()

        if name_lower == "normal" or sid_lower == "normal":
            continue

        heading_m = re.match(r"^heading\s*([1-6])$", name_lower) or re.match(r"^heading([1-6])$", sid_lower)
        if heading_m:
            lvl = heading_m.group(1)
            odd_rules.append(f"h{lvl}.western {{ font-size: {pt_size:g}pt }}")
            continue

        # Custom styles
        clean_name = re.sub(r"[^a-zA-Z0-9]+", "-", name_lower).strip("-")
        clean_sid = re.sub(r"[^a-zA-Z0-9]+", "-", sid_lower).strip("-")
        matched_sel = None
        for pattern in [rf"\bp\.{re.escape(clean_name)}-western\b",
                        rf"\bp\.{re.escape(clean_sid)}-western\b",
                        rf"\bp\.{re.escape(clean_name)}\b",
                        rf"\bp\.{re.escape(clean_sid)}\b"]:
            sel_m = re.search(pattern, head_content, re.I)
            if sel_m:
                matched_sel = sel_m.group(0)
                break
        if matched_sel:
            odd_rules.append(f"{matched_sel} {{ font-size: {pt_size:g}pt }}")
        else:
            odd_rules.append(f"p.{clean_name}-western {{ font-size: {pt_size:g}pt }}")

    if not odd_rules:
        return html

    seen = set()
    deduped = []
    for r in odd_rules:
        if r not in seen:
            seen.add(r)
            deduped.append(r)

    rules_str = "\n\t\t" + "\n\t\t".join(deduped) + "\n\t"
    if head_match:
        insert_at = head_match.end(1)
        return html[:insert_at] + rules_str + html[insert_at:]
    if re.search(r"</head>", html, re.I):
        return re.sub(r"</head>", f'<style type="text/css">{rules_str}</style></head>', html, count=1, flags=re.I)
    return html


def restore_docx_html_half_points_and_empty_paras(docx_bytes: bytes, html: str) -> str:
    """Restore half-point font sizes and empty paragraph line heights in LibreOffice HTML export.

    LibreOffice StarWriter HTML export:
    1. Rounds half-point font sizes (e.g. 13.5pt, w:sz=27) down to integer pt (13pt).
    2. Drops font-size attributes on empty paragraphs (<p><br/></p>), collapsing them to 12pt Normal.

    This function restores the exact font-size: X.5pt on matching spans/paragraphs, and sets
    font-size: Xpt and <span style="font-size: Xpt;"><br/></span> on empty paragraphs so that
    canvas renders at exact height and saving back to DOCX preserves w:sz=2X.
    """
    if not html or not docx_bytes:
        return html
    try:
        doc_xml = (read_zip_entry(docx_bytes, "word/document.xml") or b"").decode("utf-8", errors="replace")
        styles_xml = (read_zip_entry(docx_bytes, "word/styles.xml") or b"").decode("utf-8", errors="replace")
    except Exception:
        return html
    if not doc_xml:
        return html

    doc_default_sz = 24
    m_dd = re.search(r"<w:docDefaults>[\s\S]*?</w:docDefaults>", styles_xml)
    if m_dd:
        m = re.search(r'<w:sz\b[^>]*w:val="(\d+)"', m_dd.group(0))
        if m:
            doc_default_sz = int(m.group(1))

    styles_sz: dict[str, int] = {}
    styles_based_on: dict[str, str] = {}
    for sm in re.finditer(r'<w:style\b[^>]*w:styleId="([^"]+)"[^>]*>([\s\S]*?)</w:style>', styles_xml):
        sid = sm.group(1)
        body = sm.group(2)
        m = re.search(r'<w:sz\b[^>]*w:val="(\d+)"', body)
        if m:
            styles_sz[sid] = int(m.group(1))
        b_m = re.search(r'<w:basedOn\b[^>]*w:val="([^"]+)"', body)
        if b_m:
            styles_based_on[sid] = b_m.group(1)

    def resolve_style_sz(sid: str, visited: set | None = None) -> int:
        if visited is None:
            visited = set()
        if sid in visited or len(visited) > 20:
            return styles_sz.get("Normal", doc_default_sz)
        visited.add(sid)
        if sid in styles_sz:
            return styles_sz[sid]
        if sid in styles_based_on:
            return resolve_style_sz(styles_based_on[sid], visited)
        if sid != "Normal" and "Normal" in styles_sz:
            return styles_sz["Normal"]
        return doc_default_sz

    def resolve_para_sz(p_xml: str) -> int:
        ppr_m = re.search(r"<w:pPr\b[^>]*>([\s\S]*?)</w:pPr>", p_xml)
        ppr_str = ppr_m.group(1) if ppr_m else ""
        m = re.search(r'<w:sz\b[^>]*w:val="(\d+)"', ppr_str)
        if m:
            return int(m.group(1))
        m_r = re.search(r'<w:sz\b[^>]*w:val="(\d+)"', p_xml)
        if m_r:
            return int(m_r.group(1))
        m_style = re.search(r'<w:pStyle\b[^>]*w:val="([^"]+)"', ppr_str)
        if m_style:
            return resolve_style_sz(m_style.group(1))
        return resolve_style_sz("Normal")

    body_match = re.search(r"<w:body\b[^>]*>([\s\S]*?)</w:body\s*>", doc_xml, re.IGNORECASE)
    body_xml = body_match.group(1) if body_match else doc_xml
    flow = re.sub(
        r"<w:txbxContent\b[\s\S]*?</w:txbxContent\s*>",
        lambda match: " " * len(match.group(0)), body_xml, flags=re.IGNORECASE,
    )
    table_ranges = _xml_element_ranges(flow, "w:tbl")
    ooxml_paras = []
    for m in re.finditer(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", flow, re.IGNORECASE):
        if not any(s <= m.start() < e for s, e in table_ranges):
            p_xml = m.group(0)
            txt = _paragraph_plain_text(p_xml).strip()
            has_drawing = any(tag in p_xml for tag in ("<w:drawing", "<w:pict", "<mc:AlternateContent", "<wps:"))
            is_empty = not txt and not has_drawing
            sz = resolve_para_sz(p_xml)
            odd_runs = []
            for r_m in re.finditer(r"<w:r\b[^>]*>[\s\S]*?</w:r\s*>", p_xml, re.IGNORECASE):
                r_xml = r_m.group(0)
                r_sz_m = re.search(r'<w:sz\b[^>]*w:val="(\d+)"', r_xml)
                r_sz = int(r_sz_m.group(1)) if r_sz_m else sz
                r_txt = "".join(re.findall(r"<w:t\b[^>]*>([^<]*)</w:t\s*>", r_xml, re.IGNORECASE)).strip()
                if r_sz and r_sz % 2 != 0 and r_txt:
                    odd_runs.append((r_txt, r_sz / 2.0))
            ooxml_paras.append({
                "is_empty": is_empty,
                "sz": sz,
                "pt": sz / 2.0 if sz else None,
                "odd_runs": odd_runs,
                "text": txt,
            })

    html_tables = _xml_element_ranges(html, "table")
    para_idx = 0

    def replace_para(match: re.Match) -> str:
        nonlocal para_idx
        start = match.start()
        if any(ts <= start < te for ts, te in html_tables):
            return match.group(0)
        if para_idx >= len(ooxml_paras):
            return match.group(0)
        p_spec = ooxml_paras[para_idx]
        para_idx += 1

        full = match.group(0)
        tag = match.group(1)
        attrs = match.group(2)
        inner = match.group(3)

        # 1. Empty paragraph
        if p_spec["is_empty"] and p_spec["pt"] is not None:
            pt = p_spec["pt"]
            stripped = re.sub(r"</?(?:span|font|br)\b[^>]*>|&nbsp;|\s+", "", inner, flags=re.I)
            if not stripped and not re.search(r"<(?:img|iframe|object|svg|canvas|div)\b|data-vno|vno-", inner, re.I):
                if re.search(r"\bfont-size:\s*[\d.]+pt", attrs, re.I):
                    new_attrs = re.sub(r"\bfont-size:\s*[\d.]+pt", f"font-size: {pt:g}pt", attrs, flags=re.I)
                elif re.search(r'\bstyle=["\']', attrs, re.I):
                    new_attrs = re.sub(r'(\bstyle=["\'])([^"\']*)', rf'\1font-size: {pt:g}pt; \2', attrs, flags=re.I)
                else:
                    new_attrs = f'{attrs} style="font-size: {pt:g}pt;"'
                new_inner = f'<span style="font-size: {pt:g}pt;"><br/></span>'
                return f"<{tag}{new_attrs}>{new_inner}</{tag}>"

        # 2. Odd run font sizes (e.g. 13.5pt)
        if p_spec["odd_runs"]:
            new_inner = inner
            for r_txt, r_pt in p_spec["odd_runs"]:
                rounded_pt = int(r_pt)
                pattern = rf'(\bstyle=["\'][^"\']*\bfont-size:\s*){rounded_pt}(?:\.0+)?pt'
                new_inner = re.sub(pattern, rf'\g<1>{r_pt:g}pt', new_inner, flags=re.I)
            new_attrs = attrs
            if len(p_spec["odd_runs"]) == 1:
                r_txt, r_pt = p_spec["odd_runs"][0]
                rounded_pt = int(r_pt)
                new_attrs = re.sub(rf'(\bstyle=["\'][^"\']*\bfont-size:\s*){rounded_pt}(?:\.0+)?pt',
                                   rf'\g<1>{r_pt:g}pt', new_attrs, flags=re.I)
            return f"<{tag}{new_attrs}>{new_inner}</{tag}>"

        return full

    return re.sub(r"<(p|h[1-6])\b([^>]*)>([\s\S]*?)</\1\s*>", replace_para, html, flags=re.IGNORECASE)





def docx_heading_style_props(docx_bytes: bytes) -> dict[int, dict]:
    """W32: thuộc tính chữ THẬT của style heading 1..6 theo chuỗi kế thừa Word (style -> basedOn ... -> Normal ->
    docDefaults; thiếu sz ở mọi cấp = 10pt; b/i vắng = thường; rFonts asciiTheme giải qua theme + script Viet W12b).
    Returns {level: {"family", "size_pt", "bold", "italic", "color"}} — chỉ các level có style trong styles.xml."""
    styles_xml = (read_zip_entry(docx_bytes, "word/styles.xml") or b"").decode("utf-8", errors="replace")
    if not styles_xml:
        return {}
    resolved = docx_theme_fonts(docx_bytes)
    theme_fonts = {"majorHAnsi": resolved["major"], "minorHAnsi": resolved["minor"],
                   "majorAscii": resolved["major"], "minorAscii": resolved["minor"]}
    styles_map: dict[str, dict] = {}
    for sm in re.finditer(r"<w:style\b([^>]*)>([\s\S]*?)</w:style>", styles_xml):
        attrs, body = sm.group(1), sm.group(2)
        stype = re.search(r'w:type="([^"]+)"', attrs)
        if stype and stype.group(1) != "paragraph":
            continue
        sid = re.search(r'w:styleId="([^"]+)"', attrs)
        if not sid:
            continue
        name_m = re.search(r'<w:name\b[^>]*w:val="([^"]+)"', body)
        based_m = re.search(r'<w:basedOn\b[^>]*w:val="([^"]+)"', body)
        rpr = re.search(r"<w:rPr>([\s\S]*?)</w:rPr>", body)
        styles_map[sid.group(1)] = {"name": (name_m.group(1) if name_m else sid.group(1)).strip().lower(),
                                    "basedOn": based_m.group(1) if based_m else None,
                                    "rPr": rpr.group(1) if rpr else ""}
    dd = re.search(r"<w:rPrDefault>\s*<w:rPr>([\s\S]*?)</w:rPr>", styles_xml)
    default_rpr = dd.group(1) if dd else ""

    def prop(block: str, key: str):
        if key == "family":
            rfonts = re.search(r"<w:rFonts\b([^>]*)/?>", block)
            if not rfonts:
                return None
            a = rfonts.group(1)
            ascii_m = re.search(r'w:ascii="([^"]+)"', a)
            theme_m = re.search(r'w:asciiTheme="([^"]+)"', a)
            if theme_m and theme_fonts.get(theme_m.group(1)):
                return theme_fonts[theme_m.group(1)]
            return ascii_m.group(1) if ascii_m else None
        if key == "size":
            m = re.search(r'<w:sz\b[^>]*w:val="(\d+)"', block)
            return int(m.group(1)) / 2 if m else None
        if key in ("bold", "italic"):
            tag = "b" if key == "bold" else "i"
            m = re.search(rf"<w:{tag}\b([^>]*)/?>", block)
            if not m:
                return None
            val = re.search(r'w:val="([^"]*)"', m.group(1))
            return not (val and val.group(1) in ("0", "false", "off"))
        if key == "color":
            m = re.search(r'<w:color\b[^>]*w:val="([0-9A-Fa-f]{6})"', block)
            return m.group(1).upper() if m else None
        return None

    def resolve(sid: str, key: str):
        visited: set[str] = set()
        cur = sid
        while cur and cur in styles_map and cur not in visited:
            visited.add(cur)
            value = prop(styles_map[cur]["rPr"], key)
            if value is not None:
                return value
            cur = styles_map[cur]["basedOn"]
        if sid != "Normal" and "Normal" in styles_map and "Normal" not in visited:
            value = prop(styles_map["Normal"]["rPr"], key)
            if value is not None:
                return value
        return prop(default_rpr, key)

    out: dict[int, dict] = {}
    for sid, st in styles_map.items():
        m = re.match(r"^heading\s*([1-6])$", st["name"]) or re.match(r"^heading([1-6])$", sid.lower())
        if not m:
            continue
        level = int(m.group(1))
        if level in out:
            continue
        family = resolve(sid, "family") or ""
        size = resolve(sid, "size")
        out[level] = {
            "family": family,
            "size_pt": float(size) if size is not None else 10.0,
            "bold": bool(resolve(sid, "bold")),
            "italic": bool(resolve(sid, "italic")),
            "color": resolve(sid, "color"),
        }
    return out


def inject_docx_heading_styles_css(docx_bytes: bytes, html: str) -> str:
    """W32 (đo d20, V12): style "heading 2" của tài liệu = TNR 10pt thường (basedOn Footer, chỉ có numPr) nhưng
    LibreOffice chỉ ghi `h2 { margin… }` không font/cỡ/đậm → canvas dùng h2 mặc định của trình duyệt/app (đậm, to,
    sans). Ghi rule đầy đủ `hN.western { font-family; font-size; font-weight; font-style[; color] }` từ chuỗi style
    Word (sau rule LibreOffice để thắng)."""
    if not html or not docx_bytes:
        return html
    try:
        props = docx_heading_style_props(docx_bytes)
    except Exception:
        return html
    if not props:
        return html
    rules = []
    for level in sorted(props):
        p = props[level]
        decl = []
        if p["family"]:
            decl.append(f'font-family: "{p["family"]}", serif')
        decl.append(f'font-size: {p["size_pt"]:g}pt')
        decl.append(f'font-weight: {"bold" if p["bold"] else "normal"}')
        decl.append(f'font-style: {"italic" if p["italic"] else "normal"}')
        if p["color"] and p["color"] != "000000":
            decl.append(f'color: #{p["color"].lower()}')
        rules.append(f'h{level}.western {{ {"; ".join(decl)} }}')
    rules_str = "\n\t\t" + "\n\t\t".join(rules) + "\n\t"
    head_match = re.search(r"<style\b[^>]*>(.*?)</style>", html, re.S | re.I)
    if head_match:
        insert_at = head_match.end(1)
        return html[:insert_at] + rules_str + html[insert_at:]
    if re.search(r"</head>", html, re.I):
        return re.sub(r"</head>", f'<style type="text/css">{rules_str}</style></head>', html, count=1, flags=re.I)
    return html


_HEX_ENTITY_RE = re.compile(r"&#[xX]([0-9A-Fa-f]+);")
_DEC_ENTITY_RE = re.compile(r"&#(\d+);")


def _unescape_xml(value: str) -> str:
    """Giải thực thể XML. Giá trị không có '&' (phần lớn thuộc tính ô) trả về ngay — không re.sub."""
    if not value:
        return ""
    if "&" not in value:
        return value
    unescaped = (
        value.replace("&quot;", '"')
        .replace("&apos;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
    )
    if "&#" not in unescaped:
        return unescaped
    unescaped = _HEX_ENTITY_RE.sub(lambda match: chr(int(match.group(1), 16)), unescaped)
    return _DEC_ENTITY_RE.sub(lambda match: chr(int(match.group(1), 10)), unescaped)


def _is_xml_name_char(ch: str) -> bool:
    return ch == "_" or ch == ":" or ch == "." or ch == "-" or ch.isalnum()


def _quoted_attr(raw: str, name: str) -> str | None:
    """Giá trị thuộc tính name=(\"|\')… theo cùng quy tắc finditer của _xml_attrs (không unescape)."""
    if not raw:
        return None
    start = 0
    nlen = len(name)
    n = len(raw)
    while True:
        i = raw.find(name, start)
        if i < 0:
            return None
        if i > 0 and _is_xml_name_char(raw[i - 1]):
            start = i + 1
            continue
        end_name = i + nlen
        if end_name < n and _is_xml_name_char(raw[end_name]):
            start = end_name
            continue
        j = end_name
        while j < n and raw[j] in " \t\r\n":
            j += 1
        if j >= n or raw[j] != "=":
            start = end_name
            continue
        j += 1
        while j < n and raw[j] in " \t\r\n":
            j += 1
        if j >= n or raw[j] not in "\"'":
            start = end_name
            continue
        quote = raw[j]
        j += 1
        end = raw.find(quote, j)
        if end < 0:
            return None
        value = raw[j:end]
        other = "'" if quote == '"' else '"'
        if other in value:
            start = end + 1
            continue
        return value


def _repeat_count(raw: str, attr: str) -> int:
    """table:number-*-repeated trên thẻ mở. Thiếu / rỗng → 1. Giữ max(1, int) như overlay cũ."""
    end = raw.find(">")
    opening = raw if end < 0 else raw[: end + 1]
    value = _quoted_attr(opening, attr)
    if not value:
        return 1
    return max(1, int(value))


def _attr_digits(raw: str, name: str) -> int | None:
    value = _quoted_attr(raw, name)
    if value is None or not value.isdigit():
        return None
    return int(value)


def _has_simple_text_p(cell_xml: str) -> bool:
    """`<text:p …>không có thẻ con</text:p>` — cùng điều kiện regex cũ của optimize."""
    start = 0
    while True:
        i = cell_xml.find("<text:p", start)
        if i < 0:
            return False
        boundary = i + 7
        # \b sau "p": ký tự tiếp không phải [\w], kể cả ':' '.' '-'
        if boundary < len(cell_xml) and (cell_xml[boundary] == "_" or cell_xml[boundary].isalnum()):
            start = boundary
            continue
        gt = cell_xml.find(">", boundary)
        if gt < 0:
            return False
        if cell_xml[gt - 1] == "/":
            start = gt + 1
            continue
        close = cell_xml.find("</text:p>", gt + 1)
        if close < 0:
            return False
        if "<" not in cell_xml[gt + 1 : close]:
            return True
        start = gt + 1


_OPT_CLOSE_CELL_RE = re.compile(r"</table:(?:covered-)?table-cell\s*>\s*$")
_OPT_EMPTY_P_RE = re.compile(r"<text:p\s*/>|<text:p\b[^>]*>\s*</text:p>")


def _strip_repeat_attrs(xml: str, attr: str) -> str:
    """Bỏ mọi \\s+attr=\"số\" (phân biệt hoa thường, như re.sub không count của optimize)."""
    start = 0
    pieces: list[str] = []
    n = len(xml)
    klen = len(attr)
    changed = False
    while True:
        i = xml.find(attr, start)
        if i < 0:
            break
        if i == 0 or xml[i - 1] not in " \t\r\n":
            start = i + 1
            continue
        end_name = i + klen
        if end_name < n and _is_xml_name_char(xml[end_name]):
            start = end_name
            continue
        j = end_name
        while j < n and xml[j] in " \t\r\n":
            j += 1
        if j >= n or xml[j] != "=":
            start = end_name
            continue
        j += 1
        while j < n and xml[j] in " \t\r\n":
            j += 1
        if j >= n or xml[j] not in "\"'":
            start = end_name
            continue
        quote = xml[j]
        j += 1
        end = xml.find(quote, j)
        if end < 0:
            break
        if not xml[j:end].isdigit():
            start = end + 1
            continue
        ws = i
        while ws > 0 and xml[ws - 1] in " \t\r\n":
            ws -= 1
        pieces.append(xml[start:ws])
        start = end + 1
        changed = True
    if not changed:
        return xml
    pieces.append(xml[start:])
    return "".join(pieces)


def _insert_repeat_before_end(cell_xml: str, prefixes: tuple[str, ...], attr: str, count: int) -> str:
    """Chèn attr trước \\s*/?> của thẻ mở, cùng chỗ re.sub `(\\s*/?>)` của optimize."""
    for prefix in prefixes:
        if cell_xml.startswith(prefix) and (len(cell_xml) == len(prefix) or not _is_xml_name_char(cell_xml[len(prefix)])):
            break
    else:
        return cell_xml
    gt = cell_xml.find(">")
    if gt < 0:
        return cell_xml
    k = gt
    if k > 0 and cell_xml[k - 1] == "/":
        k -= 1
    while k > 0 and cell_xml[k - 1] in " \t\r\n":
        k -= 1
    return cell_xml[:k] + f' {attr}="{count}"' + cell_xml[k:]


def _escape_xml(value: str) -> str:
    return (
        (value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _strip_tags(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value or "")


def _normalize_logo_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _rgb_of(hex_value: str | None) -> str:
    raw = (hex_value or "").strip().lstrip("#")
    if re.fullmatch(r"[0-9a-fA-F]{6}", raw):
        return raw.upper()
    if re.fullmatch(r"[0-9a-fA-F]{3}", raw):
        return (raw[0] * 2 + raw[1] * 2 + raw[2] * 2).upper()
    return "2563EB"


def _latin_face(font_family: str | None) -> str:
    first = (font_family or "").split(",")[0].strip().strip("'\"")
    return first or "Arial"


def _ns_prefix(xml: str, uri: str, fallback: str) -> str:
    pattern = _XMLNS_PREFIX_RE_CACHE.get(uri)
    if pattern is None:
        pattern = re.compile(rf'xmlns:([\w]+)=["\']{re.escape(uri)}["\']')
        _XMLNS_PREFIX_RE_CACHE[uri] = pattern
    match = pattern.search(xml or "")
    return match.group(1) if match else fallback


def parse_master_logo_from_fodp(fodp_xml: str | None) -> dict[str, str]:
    xml = fodp_xml or ""
    attrs_match = _MASTER_PAGE_OPEN_RE.search(xml)
    attrs = attrs_match.group(1) if attrs_match else ""
    theme_match = _THEME_ATTR_RE.search(attrs)
    logo_text = ""
    accent_color = ""
    font_family = ""
    if theme_match:
        raw = _unescape_xml(theme_match.group(1) or theme_match.group(2) or "")
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, dict):
            logo_text = _normalize_logo_text(str(parsed.get("logoText") or ""))
            accent_color = str(parsed.get("accentColor") or "")
            font_family = str(parsed.get("fontFamily") or "")
    if not logo_text:
        frame = _LOGO_FRAME_RE.search(xml)
        logo_text = _normalize_logo_text(_unescape_xml(_strip_tags(frame.group(1) if frame else "")))
    return {
        "logoText": logo_text,
        "accentColor": accent_color,
        "fontFamily": font_family,
    }


def fodp_has_master_logo(fodp_xml: str | None) -> bool:
    return bool(parse_master_logo_from_fodp(fodp_xml)["logoText"])


def parse_slide_size(presentation_xml: str | None) -> dict[str, int]:
    match = _SLD_SZ_RE.search(presentation_xml or "")
    attrs = match.group(1) if match else ""
    cx_match = re.search(r'\bcx=["\'](\d+)["\']', attrs, re.IGNORECASE)
    cy_match = re.search(r'\bcy=["\'](\d+)["\']', attrs, re.IGNORECASE)
    cx = int(cx_match.group(1)) if cx_match else 0
    cy = int(cy_match.group(1)) if cy_match else 0
    return {
        "cx": cx if cx > 0 else DEFAULT_SLIDE_CX,
        "cy": cy if cy > 0 else DEFAULT_SLIDE_CY,
    }


_PAGE_LAYOUT_PROPS_RE = re.compile(r"<style:page-layout-properties\b([^>]*)/?>", re.IGNORECASE)
_PAGE_LAYOUT_TAG_RE = re.compile(r"<style:page-layout\b", re.IGNORECASE)
_PAGE_LAYOUT_CLOSE_RE = re.compile(r"</style:page-layout\s*>", re.IGNORECASE)
_PAGE_LAYOUT_NAME_RE = re.compile(r'\bstyle:name\s*=\s*["\']([^"\']+)["\']', re.IGNORECASE)


def _resolve_slide_page_layout_name(fodp_xml: str) -> str | None:
    """Theo chuỗi tham chiếu ODF: draw:page → master-page → page-layout.

    Trả về style:name của page-layout gắn với khổ chiếu thật (không phải
    notes/handout), hoặc None nếu FODP không đủ cấu trúc.
    """
    # Bước 1: Lấy master-page name từ draw:page đầu tiên
    page_match = _PAGE_OPEN_RE.search(fodp_xml)
    if not page_match:
        return None
    page_attrs = page_match.group(1)
    mp_name_match = re.search(
        r'\bdraw:master-page-name\s*=\s*["\']([^"\']+)["\']', page_attrs, re.IGNORECASE
    )
    master_page_name = mp_name_match.group(1) if mp_name_match else None

    # Bước 2: Tìm style:master-page có tên khớp
    # Nếu draw:page không có draw:master-page-name → dùng master-page đầu tiên
    best_layout_name: str | None = None
    for mp_match in _MASTER_PAGE_OPEN_RE.finditer(fodp_xml):
        mp_attrs = mp_match.group(1)
        name_match = _PAGE_LAYOUT_NAME_RE.search(mp_attrs)
        if not name_match:
            continue
        mp_current_name_match = re.search(
            r'\bstyle:name\s*=\s*["\']([^"\']+)["\']', mp_attrs, re.IGNORECASE
        )
        mp_current_name = mp_current_name_match.group(1) if mp_current_name_match else None
        if master_page_name and mp_current_name and mp_current_name != master_page_name:
            continue
        # Tìm page-layout-name trên master-page
        pln_match = re.search(
            r'\bstyle:page-layout-name\s*=\s*["\']([^"\']+)["\']', mp_attrs, re.IGNORECASE
        )
        if pln_match:
            best_layout_name = pln_match.group(1)
            break
        if best_layout_name is None:
            # Master-page đầu tiên không có page-layout-name → fallback
            best_layout_name = name_match.group(1)
            break
    return best_layout_name


def parse_intended_slide_size_from_fodp(fodp_xml: str | None) -> dict[str, int] | None:
    """Đọc khổ trang chiếu THẬT (canvas.slideSize) từ chính FODP do 3T Office ghi ra.

    Cần thiết vì đã đo thực tế: soffice --convert-to pptx BỎ QUA hoàn toàn
    style:page-layout-properties khi chuyển FODP -> PPTX, luôn tự ý ghi
    DEFAULT_SLIDE_CX/CY (28cm x 15.75cm) vào <p:sldSz> bất kể FODP khai báo gì -
    dùng để khôi phục lại khổ trang thật sau khi soffice convert xong.

    FODP Presentation ODF có NHIỀU style:page-layout (slide / notes / handout).
    Phải lần theo chuỗi tham chiếu draw:page → master-page → page-layout để
    lấy ĐÚNG page-layout của khổ chiếu, không lấy page-layout đầu tiên tìm thấy
    (có thể là của trang ghi chú, sai khổ).
    """
    xml = fodp_xml or ""
    if not xml:
        return None

    target_layout_name = _resolve_slide_page_layout_name(xml)

    # Tìm <style:page-layout> có style:name khớp target
    if target_layout_name:
        for tag_match in _PAGE_LAYOUT_TAG_RE.finditer(xml):
            tag_start = tag_match.start()
            # Tìm closing > của opening tag
            close_gt = xml.find(">", tag_start + len("<style:page-layout"))
            if close_gt < 0:
                continue
            tag_attrs = xml[tag_start:close_gt + 1]
            name_match = _PAGE_LAYOUT_NAME_RE.search(tag_attrs)
            if not name_match:
                continue
            if name_match.group(1) != target_layout_name:
                continue
            # Tìm page-layout-properties bên trong block này
            body_start = close_gt + 1
            body_close = _PAGE_LAYOUT_CLOSE_RE.search(xml[body_start:])
            if not body_close:
                continue
            block = xml[body_start:body_start + body_close.start()]
            props_match = _PAGE_LAYOUT_PROPS_RE.search(block)
            if props_match:
                return _parse_page_layout_props(props_match.group(1))

    # Fallback: lấy page-layout-properties đầu tiên (an toàn cho FODP đơn giản
    # chỉ có 1 layout)
    match = _PAGE_LAYOUT_PROPS_RE.search(xml)
    if match:
        return _parse_page_layout_props(match.group(1))
    return None


_LENGTH_EMU = {"cm": CM_EMU, "mm": CM_EMU // 10, "in": 914400, "pt": 12700}


def _parse_page_layout_props(attrs: str) -> dict[str, int] | None:
    """Trích xuất fo:page-width / fo:page-height (cm, mm, in hoặc pt) và đổi sang EMU.

    3T Slide ghi khổ bằng pt đủ chữ số (1 pt = 12700 EMU) để <p:sldSz> khớp TUYỆT ĐỐI
    preset PowerPoint (16:9 = 12192000 × 6858000, 4:3 = 9144000 × 6858000) hoặc khổ gốc của
    tệp mở từ PowerPoint. vno:sld-type (nếu có) là thuộc tính type của <p:sldSz>
    ("screen4x3"...); có mặt nhưng rỗng nghĩa là KHÔNG có type (Widescreen).
    """
    width_match = re.search(r'\bfo:page-width=["\']([\d.]+)(cm|mm|in|pt)["\']', attrs, re.IGNORECASE)
    height_match = re.search(r'\bfo:page-height=["\']([\d.]+)(cm|mm|in|pt)["\']', attrs, re.IGNORECASE)
    if not width_match or not height_match:
        return None
    cx = round(float(width_match.group(1)) * _LENGTH_EMU[width_match.group(2).lower()])
    cy = round(float(height_match.group(1)) * _LENGTH_EMU[height_match.group(2).lower()])
    if cx <= 0 or cy <= 0:
        return None
    size: dict = {"cx": cx, "cy": cy}
    if width_match.group(2).lower() == "pt":
        # Khổ do 3T Slide ghi (pt): quyết định luôn thuộc tính type (có hoặc không).
        type_match = re.search(r'\bvno:sld-type=["\']([^"\']*)["\']', attrs, re.IGNORECASE)
        size["type"] = type_match.group(1) if type_match else ""
    return size


def apply_intended_slide_size(presentation_xml: str, size: dict[str, int] | None) -> str:
    """Ghi đè cx/cy thật trên <p:sldSz> trong ppt/presentation.xml, giữ nguyên thuộc tính khác."""
    if not size:
        return presentation_xml
    match = _SLD_SZ_RE.search(presentation_xml)
    if not match:
        return presentation_xml
    tag = match.group(0)
    attrs = match.group(1)
    next_attrs = re.sub(r'\bcx=["\']\d+["\']', f'cx="{size["cx"]}"', attrs, flags=re.IGNORECASE)
    next_attrs = re.sub(r'\bcy=["\']\d+["\']', f'cy="{size["cy"]}"', next_attrs, flags=re.IGNORECASE)
    if "type" in size:
        next_attrs = re.sub(r'\s+type=["\'][^"\']*["\']', "", next_attrs, flags=re.IGNORECASE)
        if size["type"]:
            trimmed = next_attrs.rstrip()
            closing = "/" if trimmed.endswith("/") else ""
            body = trimmed[:-1].rstrip() if closing else trimmed
            next_attrs = f'{body} type="{size["type"]}"' + (closing if closing else "")
    next_tag = tag.replace(attrs, next_attrs)
    return presentation_xml[:match.start()] + next_tag + presentation_xml[match.end():]


def _parse_box(tag: str, axis_a: str, axis_b: str) -> tuple[int, int] | None:
    a_match = re.search(rf'\b{axis_a}=["\'](-?\d+)["\']', tag or "", re.IGNORECASE)
    b_match = re.search(rf'\b{axis_b}=["\'](-?\d+)["\']', tag or "", re.IGNORECASE)
    if not a_match or not b_match:
        return None
    return int(a_match.group(1)), int(b_match.group(1))


def parse_placeholder_boxes(master_xml: str | None) -> list[dict[str, int]]:
    boxes: list[dict[str, int]] = []
    for sp in _SP_BLOCK_RE.findall(master_xml or ""):
        if not _PH_RE.search(sp):
            continue
        off_match = _OFF_TAG_RE.search(sp)
        ext_match = _EXT_TAG_RE.search(sp)
        off = _parse_box(off_match.group(0) if off_match else "", "x", "y")
        ext = _parse_box(ext_match.group(0) if ext_match else "", "cx", "cy")
        if not off or not ext:
            continue
        boxes.append({"x": off[0], "y": off[1], "cx": ext[0], "cy": ext[1]})
    return boxes


def _overlaps(a: dict[str, int], b: dict[str, int]) -> bool:
    return (
        a["x"] < b["x"] + b["cx"]
        and a["x"] + a["cx"] > b["x"]
        and a["y"] < b["y"] + b["cy"]
        and a["y"] + a["cy"] > b["y"]
    )


def choose_master_logo_box(
    slide_size: dict[str, int] | None,
    placeholders: list[dict[str, int]] | None,
) -> dict[str, int]:
    slide = {
        "cx": (slide_size or {}).get("cx") or DEFAULT_SLIDE_CX,
        "cy": (slide_size or {}).get("cy") or DEFAULT_SLIDE_CY,
    }
    ph = placeholders or []
    margin_x = round(0.6 * CM_EMU)
    margin_y = round(0.1 * CM_EMU)
    gap = round(0.05 * CM_EMU)
    desired_cx = min(16 * CM_EMU, slide["cx"] * 55 // 100)
    desired_cy = round(0.5 * CM_EMU)
    min_ph_y = min((box["y"] for box in ph), default=slide["cy"])
    top_cy = max(round(0.35 * CM_EMU), min(desired_cy, min_ph_y - margin_y - gap))
    candidates: list[dict[str, int]] = []
    if min_ph_y > margin_y + round(0.32 * CM_EMU):
        candidates.append({"x": margin_x, "y": margin_y, "cx": desired_cx, "cy": top_cy})
        right_cx = min(desired_cx, slide["cx"] * 42 // 100)
        candidates.append(
            {
                "x": max(margin_x, slide["cx"] - margin_x - right_cx),
                "y": margin_y,
                "cx": right_cx,
                "cy": top_cy,
            }
        )
    footer_top = max((box["y"] for box in ph), default=0)
    body_bottom = max(
        (box["y"] + box["cy"] for box in ph if box["y"] + box["cy"] < slide["cy"] * 0.85),
        default=0,
    )
    if footer_top > body_bottom + desired_cy + gap:
        candidates.append(
            {
                "x": margin_x,
                "y": body_bottom + gap,
                "cx": desired_cx,
                "cy": min(desired_cy, footer_top - body_bottom - gap * 2),
            }
        )
    candidates.append(
        {
            "x": margin_x,
            "y": 0,
            "cx": min(desired_cx, slide["cx"] - margin_x * 2),
            "cy": min(desired_cy, max(round(0.35 * CM_EMU), min_ph_y - gap)),
        }
    )
    for box in candidates:
        if box["cx"] < round(0.8 * CM_EMU) or box["cy"] < round(0.28 * CM_EMU):
            continue
        if (
            box["x"] < 0
            or box["y"] < 0
            or box["x"] + box["cx"] > slide["cx"] + 2000
            or box["y"] + box["cy"] > slide["cy"] + 2000
        ):
            continue
        if all(not _overlaps(box, item) for item in ph):
            return box
    return {
        "x": margin_x,
        "y": 0,
        "cx": min(desired_cx, slide["cx"] - margin_x * 2),
        "cy": min(desired_cy, max(round(0.32 * CM_EMU), min_ph_y - gap)),
    }


def next_cnvpr_id(master_xml: str | None) -> int:
    max_id = 0
    for match in _CNVPR_ID_RE.finditer(master_xml or ""):
        max_id = max(max_id, int(match.group(1)))
    return max_id + 1


def find_named_logo_shapes(master_xml: str | None) -> list[str]:
    return [sp for sp in _SP_BLOCK_RE.findall(master_xml or "") if _LOGO_NAME_RE.search(sp)]


def _find_named_shape(master_xml: str) -> str:
    shapes = find_named_logo_shapes(master_xml)
    return shapes[0] if shapes else ""


def _build_logo_shape_xml(
    master_xml: str,
    *,
    logo_text: str,
    accent_color: str | None,
    font_family: str | None,
    box: dict[str, int],
    shape_id: int,
) -> str:
    p = _ns_prefix(
        master_xml,
        "http://schemas.openxmlformats.org/presentationml/2006/main",
        "p",
    )
    a = _ns_prefix(
        master_xml,
        "http://schemas.openxmlformats.org/drawingml/2006/main",
        "a",
    )
    color = _rgb_of(accent_color)
    face = _escape_xml(_latin_face(font_family))
    text = _escape_xml(logo_text)
    return (
        f"<{p}:sp>"
        f"<{p}:nvSpPr>"
        f'<{p}:cNvPr id="{shape_id}" name="{MASTER_LOGO_SHAPE_NAME}"/>'
        f"<{p}:cNvSpPr><{a}:spLocks noGrp=\"1\"/></{p}:cNvSpPr>"
        f"<{p}:nvPr/>"
        f"</{p}:nvSpPr>"
        f"<{p}:spPr>"
        f"<{a}:xfrm>"
        f'<{a}:off x="{box["x"]}" y="{box["y"]}"/>'
        f'<{a}:ext cx="{box["cx"]}" cy="{box["cy"]}"/>'
        f"</{a}:xfrm>"
        f'<{a}:prstGeom prst="rect"><{a}:avLst/></{a}:prstGeom>'
        f"<{a}:noFill/>"
        f'<{a}:ln w="0"><{a}:noFill/></{a}:ln>'
        f"</{p}:spPr>"
        f"<{p}:txBody>"
        f'<{a}:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t"><{a}:noAutofit/></{a}:bodyPr>'
        f"<{a}:lstStyle/>"
        f"<{a}:p>"
        f'<{a}:pPr algn="l"><{a}:buNone/></{a}:pPr>'
        f"<{a}:r>"
        f'<{a}:rPr lang="vi-VN" sz="1200" b="1">'
        f"<{a}:solidFill><{a}:srgbClr val=\"{color}\"/></{a}:solidFill>"
        f'<{a}:latin typeface="{face}"/>'
        f"</{a}:rPr>"
        f"<{a}:t>{text}</{a}:t>"
        f"</{a}:r>"
        f"</{a}:p>"
        f"</{p}:txBody>"
        f"</{p}:sp>"
    )


def apply_master_logo_shape(
    master_xml: str,
    *,
    logo_text: str | None = None,
    accent_color: str | None = None,
    font_family: str | None = None,
    slide_cx: int | None = None,
    slide_cy: int | None = None,
) -> str:
    xml = master_xml or ""
    text = _normalize_logo_text(logo_text)
    if not xml or not text:
        return xml
    placeholders = parse_placeholder_boxes(xml)
    box = choose_master_logo_box({"cx": slide_cx or 0, "cy": slide_cy or 0}, placeholders)
    existing = _find_named_shape(xml)
    if existing:
        id_match = re.search(
            r"<(?:[\w]+:)?cNvPr\b[^>]*\bid=[\"'](\d+)[\"']", existing, re.IGNORECASE
        )
        shape_id = int(id_match.group(1)) if id_match else next_cnvpr_id(xml)
    else:
        shape_id = next_cnvpr_id(xml)
    shape_xml = _build_logo_shape_xml(
        xml,
        logo_text=text,
        accent_color=accent_color,
        font_family=font_family,
        box=box,
        shape_id=shape_id,
    )
    if existing:
        return xml.replace(existing, shape_xml, 1)
    if not _SP_TREE_CLOSE_RE.search(xml):
        return xml
    return _SP_TREE_CLOSE_RE.sub(lambda match: shape_xml + match.group(0), xml, count=1)


def master_has_logo_shape(master_xml: str | None, logo_text: str | None = None) -> bool:
    named = _find_named_shape(master_xml or "")
    if not named or _PH_RE.search(named):
        return False
    if logo_text:
        expected = _escape_xml(_normalize_logo_text(logo_text))
        return expected in named or _normalize_logo_text(logo_text) in named
    return True


def is_braced_guid(value: str | None) -> bool:
    return bool(_BRACED_GUID_RE.match((value or "").strip()))


def section_guid_from_id(section_id: str | None) -> str:
    """UUID v5 (NAMESPACE_URL) matching JS sectionGuidFromId, braced + upper."""
    name = f"{SECTION_GUID_NAME_PREFIX}{section_id or ''}"
    return "{" + str(uuid.uuid5(uuid.NAMESPACE_URL, name)).upper() + "}"


def _resolve_section_guid(section: dict) -> str:
    if section.get("guid"):
        return str(section["guid"])
    source_id = section.get("sourceId") or ""
    if is_braced_guid(source_id):
        return source_id.strip().upper()
    return section_guid_from_id(source_id or section.get("name") or "")


def parse_fodp_pages(fodp_xml: str | None) -> list[dict[str, str]]:
    pages: list[dict[str, str]] = []
    for match in _PAGE_OPEN_RE.finditer(fodp_xml or ""):
        attrs = match.group(1) or ""
        id_match = _SECTION_ID_ATTR_RE.search(attrs)
        name_match = _SECTION_NAME_ATTR_RE.search(attrs)
        pages.append(
            {
                "sectionId": _unescape_xml(id_match.group(1) if id_match else "").strip(),
                "sectionName": _unescape_xml(name_match.group(1) if name_match else "").strip(),
            }
        )
    return pages


def fodp_has_sections(fodp_xml: str | None) -> bool:
    return any(page["sectionId"] for page in parse_fodp_pages(fodp_xml))


def _show_set_attr(attrs: str, name: str, value: str) -> str:
    pattern = re.compile(rf"""\b{name}\s*=\s*(['"])[^'"]*\1""", re.IGNORECASE)
    if pattern.search(attrs or ""):
        return pattern.sub(f'{name}="{value}"', attrs, count=1)
    trimmed = (attrs or "").rstrip()
    return f'{trimmed} {name}="{value}"' if trimmed else f' {name}="{value}"'


def _show_get_attr(attrs: str, name: str) -> str:
    match = re.search(rf"""\b{name}\s*=\s*(['"])([^'"]*)\1""", attrs or "", re.IGNORECASE)
    return match.group(2) if match else ""


def _show_attr_true(value: str) -> bool:
    return str(value or "").strip().lower() in ("1", "true")


def normalize_pen_rgb(color: str | None) -> str:
    raw = _unescape_xml(str(color or "")).strip()
    if not raw:
        return ""
    hex_value = raw[1:] if raw.startswith("#") else raw
    hex_value = hex_value.upper()
    if not _HEX6_RE.match(hex_value):
        raise ValueError(f"Màu bút không phải hex 6 chữ: {raw}")
    return hex_value


def parse_show_settings_from_fodp(fodp_xml: str | None) -> dict:
    match = _SETTINGS_OPEN_RE.search(fodp_xml or "")
    if not match:
        return {"loopUntilEsc": False, "showWithoutNarration": False, "pointerColor": ""}
    attrs = match.group(1) or ""
    pointer_match = _POINTER_ATTR_RE.search(attrs)
    return {
        "loopUntilEsc": bool(re.search(r"""presentation:endless\s*=\s*["']true["']""", attrs, re.I)),
        "showWithoutNarration": bool(
            re.search(r"""vno:without-narration\s*=\s*["']true["']""", attrs, re.I)
        ),
        "pointerColor": _unescape_xml(pointer_match.group(1)).strip() if pointer_match else "",
    }


def fodp_has_show_setup_patch(fodp_xml: str | None) -> bool:
    settings = parse_show_settings_from_fodp(fodp_xml)
    return bool(settings["showWithoutNarration"] or settings["pointerColor"])


def parse_show_properties(pres_props_xml: str | None) -> dict:
    xml = pres_props_xml or ""
    match = _SHOW_PR_RE.search(xml)
    if not match:
        return {
            "loop": None,
            "showNarration": None,
            "penRgb": "",
            "hasSldRg": False,
            "sldRg": None,
        }
    attrs = match.group(1) or ""
    inner = "" if match.group(2) == "/>" else (match.group(3) or "")
    loop_raw = _show_get_attr(attrs, "loop")
    narration_raw = _show_get_attr(attrs, "showNarration")
    sld_rg = _SLD_RG_RE.search(inner)
    pen = _PEN_CLR_RE.search(inner)
    rgb_match = _SHOW_SRGB_RE.search(pen.group(0) if pen else "")
    return {
        "loop": None if loop_raw == "" else _show_attr_true(loop_raw),
        "showNarration": None if narration_raw == "" else _show_attr_true(narration_raw),
        "penRgb": (rgb_match.group(1) if rgb_match else "").upper(),
        "hasSldRg": bool(sld_rg),
        "sldRg": (
            {
                "st": _show_get_attr(sld_rg.group(1) or "", "st"),
                "end": _show_get_attr(sld_rg.group(1) or "", "end"),
            }
            if sld_rg
            else None
        ),
    }


def _ensure_drawingml_ns(xml: str, prefix: str) -> str:
    pfx = prefix or "a"
    if re.search(rf"xmlns:{re.escape(pfx)}\s*=", xml, re.IGNORECASE):
        return xml
    open_match = _PRESPROPS_OPEN_RE.search(xml)
    if not open_match:
        return xml
    name = open_match.group(1)
    attrs = open_match.group(2) or ""
    next_tag = f'<{name}{attrs} xmlns:{pfx}="{DRAWINGML_NS}">'
    return xml[: open_match.start()] + next_tag + xml[open_match.end() :]


def _build_pen_clr(xml: str, rgb: str) -> str:
    p = _ns_prefix(xml, PRESENTATION_NS, "p")
    a = _ns_prefix(xml, DRAWINGML_NS, "a")
    p_pen = f"{p}:penClr" if p else "penClr"
    a_srgb = f"{a}:srgbClr" if a else "srgbClr"
    return f'<{p_pen}><{a_srgb} val="{rgb}"/></{p_pen}>'


def _merge_show_inner(inner: str, pen_xml: str) -> str:
    body = inner or ""
    if _PEN_CLR_RE.search(body):
        return _PEN_CLR_RE.sub(pen_xml, body, count=1)
    ext = _SHOW_EXTLST_RE.search(body)
    if ext:
        return body[: ext.start()] + pen_xml + body[ext.start() :]
    return f"{body}{pen_xml}"


def _build_show_pr(xml: str, attrs: str, inner: str) -> str:
    p = _ns_prefix(xml, PRESENTATION_NS, "p")
    name = f"{p}:showPr" if p else "showPr"
    attr_text = attrs if attrs.startswith(" ") or not attrs.strip() else f" {attrs.strip()}"
    if not attrs.strip():
        attr_text = ""
    elif not attr_text.startswith(" "):
        attr_text = f" {attr_text.strip()}"
    if not inner:
        return f"<{name}{attr_text}></{name}>"
    return f"<{name}{attr_text}>{inner}</{name}>"


def apply_show_properties(pres_props_xml: str, settings: dict | None = None) -> str:
    xml = pres_props_xml or ""
    options = settings or {}
    if not xml:
        return xml
    without_narration = bool(options.get("showWithoutNarration"))
    pointer_rgb = (
        normalize_pen_rgb(options.get("pointerColor")) if options.get("pointerColor") else ""
    )
    if not without_narration and not pointer_rgb:
        return xml
    xml = _ensure_drawingml_ns(xml, _ns_prefix(xml, DRAWINGML_NS, "a"))
    match = _SHOW_PR_RE.search(xml)
    attrs = match.group(1) if match else ""
    inner = ""
    if match and match.group(2) != "/>":
        inner = match.group(3) or ""
    if without_narration:
        attrs = _show_set_attr(attrs, "showNarration", "0")
    if options.get("loopUntilEsc") and not _show_get_attr(attrs, "loop"):
        attrs = _show_set_attr(attrs, "loop", "1")
    if pointer_rgb:
        inner = _merge_show_inner(inner, _build_pen_clr(xml, pointer_rgb))
    next_tag = _build_show_pr(xml, attrs, inner)
    if match:
        return xml[: match.start()] + next_tag + xml[match.end() :]
    if not _PRESPROPS_CLOSE_RE.search(xml):
        return xml
    return _PRESPROPS_CLOSE_RE.sub(lambda close: next_tag + close.group(0), xml, count=1)


def apply_show_properties_from_fodp(pres_props_xml: str, fodp_xml: str | None) -> str:
    if not fodp_has_show_setup_patch(fodp_xml):
        return pres_props_xml
    return apply_show_properties(pres_props_xml, parse_show_settings_from_fodp(fodp_xml))


def overlay_show_settings_from_pres_props(pres_props_xml: str | None) -> dict:
    """Map original p:showPr → vno flags. Invalid values become no-op fields."""
    xml = pres_props_xml or ""
    match = _SHOW_PR_RE.search(xml)
    if not match:
        return {"showWithoutNarration": False, "pointerColor": ""}
    attrs = match.group(1) or ""
    inner = "" if match.group(2) == "/>" else (match.group(3) or "")
    narration_raw = (_show_get_attr(attrs, "showNarration") or "").strip()
    show_without = bool(re.fullmatch(r"(0|false)", narration_raw, re.IGNORECASE))
    pen = _PEN_CLR_RE.search(inner)
    rgb_match = _SHOW_SRGB_RE.search(pen.group(0) if pen else "")
    rgb = (rgb_match.group(1) if rgb_match else "").strip().lstrip("#")
    pointer = f"#{rgb.lower()}" if _HEX6_RE.fullmatch(rgb) else ""
    return {"showWithoutNarration": show_without, "pointerColor": pointer}


def apply_fodp_show_settings_attrs(fodp_xml: str, settings: dict | None = None) -> str:
    xml = fodp_xml or ""
    options = settings or {}
    without = bool(options.get("showWithoutNarration"))
    pointer = str(options.get("pointerColor") or "").strip()
    if not without and not pointer:
        return xml
    match = _SETTINGS_TAG_RE.search(xml)
    if match:
        raw = match.group(1) or ""
        self_close = match.group(2) == "/" or bool(re.search(r"/\s*$", raw))
        if self_close:
            raw = re.sub(r"/\s*$", "", raw)
        if without:
            if _WITHOUT_ATTR_RE.search(raw):
                raw = _WITHOUT_ATTR_RE.sub('vno:without-narration="true"', raw)
            else:
                raw = f'{raw.rstrip()} vno:without-narration="true"'
        if pointer:
            encoded = _escape_xml(pointer)
            if _POINTER_ATTR_RE.search(raw):
                raw = _POINTER_ATTR_RE.sub(f'vno:pointer-color="{encoded}"', raw)
            else:
                raw = f'{raw.rstrip()} vno:pointer-color="{encoded}"'
        if raw and not raw.startswith(" "):
            raw = f" {raw}"
        next_tag = (
            f"<presentation:settings{raw}/>"
            if self_close
            else f"<presentation:settings{raw}>"
        )
        next_xml = xml[: match.start()] + next_tag + xml[match.end() :]
        return ensure_vno_xmlns(next_xml)
    if not _OFFICE_PRESENTATION_CLOSE_RE.search(xml):
        raise ValueError("FODP thiếu office:presentation — không gắn Thiết lập trình chiếu")
    attrs: list[str] = []
    if without:
        attrs.append('vno:without-narration="true"')
    if pointer:
        attrs.append(f'vno:pointer-color="{_escape_xml(pointer)}"')
    tag = f'\n      <presentation:settings {" ".join(attrs)}/>'
    next_xml = _OFFICE_PRESENTATION_CLOSE_RE.sub(
        lambda close: tag + close.group(0), xml, count=1
    )
    return ensure_vno_xmlns(next_xml)


def overlay_fodp_show_properties(fodp_xml: str, pres_props_xml: str | None) -> str:
    """Inject vno Set Up Show flags from original p:showPr.

    Missing showPr or invalid values are a no-op. Does not overlay loop.
    """
    xml = fodp_xml or ""
    settings = overlay_show_settings_from_pres_props(pres_props_xml)
    if not settings["showWithoutNarration"] and not settings["pointerColor"]:
        return xml
    return apply_fodp_show_settings_attrs(xml, settings)


def parse_slide_image_crops(slide_xml: str | None) -> dict[str, str]:
    """Parse p:pic with a:srcRect from a slide XML string.

    Returns a dict mapping shape name to percentage string "l,t,r,b"
    (where l,t,r,b are numbers in percent, e.g. "43.436,2.742,9.328,0").
    """
    if not slide_xml:
        return {}
    crops: dict[str, str] = {}
    fmt = lambda v: f"{v / 1000.0:.5f}".rstrip("0").rstrip(".") or "0"
    for match in re.finditer(r"<p:pic\b[\s\S]*?</p:pic>", slide_xml, re.IGNORECASE):
        pic = match.group(0)
        name_m = re.search(r"""<p:cNvPr\b[^>]*\bname=['"]([^'"]*)['"]""", pic, re.IGNORECASE)
        src_m = re.search(r"<a:srcRect\b([^>]*)/?>", pic, re.IGNORECASE)
        if name_m and src_m:
            name = _unescape_xml(name_m.group(1))
            attrs = src_m.group(1)
            l_m = re.search(r"""\bl=['"](-?\d+)['"]""", attrs, re.IGNORECASE)
            t_m = re.search(r"""\bt=['"](-?\d+)['"]""", attrs, re.IGNORECASE)
            r_m = re.search(r"""\br=['"](-?\d+)['"]""", attrs, re.IGNORECASE)
            b_m = re.search(r"""\bb=['"](-?\d+)['"]""", attrs, re.IGNORECASE)
            l = int(l_m.group(1)) if l_m else 0
            t = int(t_m.group(1)) if t_m else 0
            r = int(r_m.group(1)) if r_m else 0
            b = int(b_m.group(1)) if b_m else 0
            crops[name] = f"{fmt(l)},{fmt(t)},{fmt(r)},{fmt(b)}"
    return crops


def apply_fodp_image_crops(
    fodp_xml: str | None, crops_by_slide: list[dict[str, str]] | None
) -> str:
    """Stamp vno:src-rect="l,t,r,b" onto matching draw:frame in each draw:page."""
    xml = fodp_xml or ""
    if not crops_by_slide or not any(crops_by_slide):
        return xml

    pieces = []
    cursor = 0
    page_idx = 0

    for start, end in _flat_xml_blocks(xml, ("draw:page",)):
        pieces.append(xml[cursor:start])
        page_xml = xml[start:end]
        crops = crops_by_slide[page_idx] if page_idx < len(crops_by_slide) else None
        page_idx += 1
        if crops:
            def replace_frame(fm: re.Match) -> str:
                raw_attrs = fm.group(1) or ""
                name_m = re.search(r"""\bdraw:name=['"]([^'"]*)['"]""", raw_attrs, re.IGNORECASE)
                if not name_m:
                    return fm.group(0)
                name = _unescape_xml(name_m.group(1))
                if name not in crops:
                    return fm.group(0)
                rect = crops[name]
                self_close = bool(re.search(r"/\s*$", raw_attrs))
                if self_close:
                    raw_attrs = re.sub(r"/\s*$", "", raw_attrs)
                if re.search(r'\bvno:src-rect\s*=', raw_attrs, re.IGNORECASE):
                    raw_attrs = re.sub(
                        r"""\bvno:src-rect=['"][^'"]*['"]""",
                        f'vno:src-rect="{rect}"',
                        raw_attrs,
                        flags=re.IGNORECASE,
                    )
                else:
                    raw_attrs = f'{raw_attrs.rstrip()} vno:src-rect="{rect}"'
                if raw_attrs and not raw_attrs.startswith(" "):
                    raw_attrs = f" {raw_attrs}"
                return f"<draw:frame{raw_attrs}/>" if self_close else f"<draw:frame{raw_attrs}>"

            page_xml = re.sub(r"<draw:frame\b([^>]*)>", replace_frame, page_xml, flags=re.IGNORECASE)
        pieces.append(page_xml)
        cursor = end

    pieces.append(xml[cursor:])
    result = "".join(pieces)
    return ensure_vno_xmlns(result)


def _resolve_pptx_slide_entries(pptx_bytes: bytes) -> list[str]:
    """Returns list of zip entry paths for slides in p:sldIdLst order."""
    pres_entry = read_zip_entry(pptx_bytes, PPTX_PRESENTATION_ENTRY)
    if not pres_entry:
        return []
    pres_xml = pres_entry.decode("utf-8", errors="replace")
    rels_entry = read_zip_entry(pptx_bytes, "ppt/_rels/presentation.xml.rels")
    rels: dict[str, str] = {}
    if rels_entry:
        rels_xml = rels_entry.decode("utf-8", errors="replace")
        for m in re.finditer(r"<Relationship\b([^>]*)/?>", rels_xml, re.IGNORECASE):
            attrs = m.group(1)
            rid_m = re.search(r"""\bId=['"]([^'"]*)['"]""", attrs, re.IGNORECASE)
            target_m = re.search(r"""\bTarget=['"]([^'"]*)['"]""", attrs, re.IGNORECASE)
            if rid_m and target_m:
                rels[rid_m.group(1)] = target_m.group(1)
    slide_ids = []
    sld_lst_m = re.search(
        r"<(?:[\w]+:)?sldIdLst\b[^>]*>([\s\S]*?)</(?:[\w]+:)?sldIdLst>",
        pres_xml,
        re.IGNORECASE,
    )
    if sld_lst_m:
        for m in re.finditer(
            r"<(?:[\w]+:)?sldId\b([^>]*)/?>", sld_lst_m.group(1), re.IGNORECASE
        ):
            rid_m = re.search(r"""\br:id=['"]([^'"]*)['"]""", m.group(1), re.IGNORECASE)
            if rid_m:
                target = rels.get(rid_m.group(1), "")
                if target:
                    if not target.startswith("ppt/"):
                        target = f"ppt/{target.lstrip('/')}"
                    slide_ids.append(target)
    if not slide_ids:
        try:
            with zipfile.ZipFile(io.BytesIO(pptx_bytes), "r") as z:
                names = [
                    n
                    for n in z.namelist()
                    if re.match(r"^ppt/slides/slide\d+\.xml$", n, re.IGNORECASE)
                ]
                names.sort(
                    key=lambda x: int(re.search(r"\d+", x).group(0))
                    if re.search(r"\d+", x)
                    else 0
                )
                slide_ids = names
        except Exception:
            pass
    return slide_ids


def overlay_fodp_image_crops(fodp_xml: str, pptx_bytes: bytes) -> str:
    """Extract a:srcRect from each slide in PPTX and overlay onto FODP frames."""
    slide_entries = _resolve_pptx_slide_entries(pptx_bytes)
    if not slide_entries:
        return fodp_xml or ""
    crops_by_slide = []
    for entry_path in slide_entries:
        slide_bytes = read_zip_entry(pptx_bytes, entry_path)
        slide_xml = slide_bytes.decode("utf-8", errors="replace") if slide_bytes else ""
        crops_by_slide.append(parse_slide_image_crops(slide_xml))
    return apply_fodp_image_crops(fodp_xml, crops_by_slide)


def parse_sections_from_fodp(fodp_xml: str | None) -> list[dict]:
    pages = parse_fodp_pages(fodp_xml)
    if not any(page["sectionId"] for page in pages):
        return []
    groups: list[dict] = []
    used_ids: set[str] = set()
    for index, page in enumerate(pages):
        key = page["sectionId"] or ""
        if groups and groups[-1]["_key"] == key:
            groups[-1]["pageIndexes"].append(index)
            continue
        ident = key or f"__default__:{len(groups)}"
        if ident in used_ids:
            n = 2
            while f"{key}#{n}" in used_ids:
                n += 1
            ident = f"{key}#{n}"
        used_ids.add(ident)
        groups.append(
            {
                "id": ident,
                "_key": key,
                "name": (page["sectionName"] or "Phần không tên") if key else DEFAULT_SECTION_NAME,
                "pageIndexes": [index],
            }
        )
    return [
        {"id": group["id"], "name": group["name"], "pageIndexes": group["pageIndexes"]}
        for group in groups
    ]


def parse_presentation_slide_ids(presentation_xml: str | None) -> list[str]:
    xml = presentation_xml or ""
    cut = _SLD_SZ_OR_LATER_RE.search(xml)
    head = xml[: cut.start()] if cut else xml
    lst = _SLD_ID_LST_RE.search(head)
    if not lst:
        return []
    ids: list[str] = []
    for match in _SLD_ID_RE.finditer(lst.group(1) or ""):
        id_match = re.search(r'\bid\s*=\s*["\']([^"\']+)["\']', match.group(1) or "", re.IGNORECASE)
        if id_match:
            ids.append(id_match.group(1))
    return ids


def presentation_has_section_list(presentation_xml: str | None) -> bool:
    xml = presentation_xml or ""
    return bool(re.search(r"<(?:[\w]+:)?sectionLst\b", xml, re.IGNORECASE)) and (
        "521415D9-36F7-43E2-AB2F-B90AF26B5E84" in xml.upper()
    )


def parse_section_list(presentation_xml: str | None) -> list[dict]:
    sections: list[dict] = []
    for match in _SECTION_BLOCK_RE.finditer(presentation_xml or ""):
        attrs = match.group(1) or ""
        body = match.group(2) or ""
        name_match = re.search(r'\bname\s*=\s*["\']([^"\']*)["\']', attrs, re.IGNORECASE)
        id_match = re.search(r'\bid\s*=\s*["\']([^"\']*)["\']', attrs, re.IGNORECASE)
        slide_ids: list[str] = []
        for sld in _SLD_ID_RE.finditer(body):
            sld_id = re.search(r'\bid\s*=\s*["\']([^"\']+)["\']', sld.group(1) or "", re.IGNORECASE)
            if sld_id:
                slide_ids.append(sld_id.group(1))
        name = _unescape_xml(name_match.group(1) if name_match else "")
        ident = _unescape_xml(id_match.group(1) if id_match else "")
        if name or slide_ids:
            sections.append({"name": name, "id": ident, "slideIds": slide_ids})
    return sections


def _qualify(prefix: str, local: str) -> str:
    return f"{prefix}:{local}" if prefix else local


def _build_section_ext_xml(presentation_xml: str, sections: list[dict]) -> str:
    p = _ns_prefix(presentation_xml, PRESENTATION_NS, "p")
    p14 = _ns_prefix(presentation_xml, P14_NS, "p14")
    parts: list[str] = []
    for section in sections:
        name = _escape_xml(section.get("name") or "")
        guid = _resolve_section_guid(section)
        ids = "".join(
            f'<{_qualify(p14, "sldId")} id="{_escape_xml(str(slide_id))}"/>'
            for slide_id in (section.get("slideIds") or [])
        )
        parts.append(
            f'<{_qualify(p14, "section")} name="{name}" id="{guid}">'
            f'<{_qualify(p14, "sldIdLst")}>{ids}</{_qualify(p14, "sldIdLst")}>'
            f'</{_qualify(p14, "section")}>'
        )
    inner = "".join(parts)
    return (
        f'<{_qualify(p, "ext")} uri="{SECTION_LIST_URI}">'
        f'<{_qualify(p14, "sectionLst")} xmlns:{p14}="{P14_NS}">{inner}</{_qualify(p14, "sectionLst")}>'
        f'</{_qualify(p, "ext")}>'
    )


def _wrap_ext_lst(presentation_xml: str, ext_xml: str) -> str:
    p = _ns_prefix(presentation_xml, PRESENTATION_NS, "p")
    return f"<{_qualify(p, 'extLst')}>{ext_xml}</{_qualify(p, 'extLst')}>"


def apply_section_list(presentation_xml: str, sections: list[dict] | None) -> str:
    xml = presentation_xml or ""
    listing = [
        section
        for section in (sections or [])
        if section and section.get("slideIds")
    ]
    if not xml or not listing:
        return xml
    ext_xml = _build_section_ext_xml(xml, listing)
    if _SECTION_EXT_RE.search(xml):
        return _SECTION_EXT_RE.sub(ext_xml, xml, count=1)
    ext_lst = _EXTLST_RE.search(xml)
    if ext_lst:
        inner = ext_lst.group(2) or ""
        replacement = _wrap_ext_lst(xml, f"{inner}{ext_xml}")
        return xml[: ext_lst.start()] + replacement + xml[ext_lst.end() :]
    close = _PRESENTATION_CLOSE_RE.search(xml)
    if not close:
        return xml
    return xml[: close.start()] + _wrap_ext_lst(xml, ext_xml) + xml[close.start() :]


def apply_section_list_from_fodp(presentation_xml: str, fodp_xml: str | None) -> str:
    groups = parse_sections_from_fodp(fodp_xml)
    if not groups:
        return presentation_xml
    slide_ids = parse_presentation_slide_ids(presentation_xml)
    page_count = len(parse_fodp_pages(fodp_xml))
    if len(slide_ids) != page_count:
        raise ValueError(
            f"PPTX sldIdLst ({len(slide_ids)}) không khớp số draw:page FODP ({page_count}) — không đoán id"
        )
    sections = [
        {
            "name": group["name"],
            "sourceId": group["id"],
            "slideIds": [slide_ids[index] for index in group["pageIndexes"]],
        }
        for group in groups
    ]
    return apply_section_list(presentation_xml, sections)


def ensure_vno_xmlns(fodp_xml: str) -> str:
    xml = fodp_xml or ""
    if _declares_vno_namespace(xml):
        return xml
    match = _OFFICE_DOCUMENT_OPEN_RE.search(xml)
    if not match:
        return xml
    attrs = match.group(1) or ""
    next_tag = f'<office:document{attrs} xmlns:vno="{VNO_NS}">'
    return xml[: match.start()] + next_tag + xml[match.end() :]


def apply_fodp_section_attrs(fodp_xml: str, page_sections: list | None) -> str:
    """Stamp vno:section-id / vno:section-name onto draw:page by index."""
    xml = fodp_xml or ""
    specs = list(page_sections or [])
    index = 0

    def replace_page(match: re.Match) -> str:
        nonlocal index
        spec = specs[index] if index < len(specs) else None
        index += 1
        if not spec or not spec.get("id"):
            return match.group(0)
        raw = match.group(1) or ""
        self_close = bool(re.search(r"/\s*$", raw))
        if self_close:
            raw = re.sub(r"/\s*$", "", raw)
        if _SECTION_ID_ATTR_RE.search(raw):
            raw = _SECTION_ID_ATTR_RE.sub(
                f'vno:section-id="{_escape_xml(spec["id"])}"', raw
            )
        else:
            raw = f'{raw.rstrip()} vno:section-id="{_escape_xml(spec["id"])}"'
        if _SECTION_NAME_ATTR_RE.search(raw):
            raw = _SECTION_NAME_ATTR_RE.sub(
                f'vno:section-name="{_escape_xml(spec.get("name") or "")}"', raw
            )
        else:
            raw = f'{raw.rstrip()} vno:section-name="{_escape_xml(spec.get("name") or "")}"'
        if raw and not raw.startswith(" "):
            raw = f" {raw}"
        return f"<draw:page{raw}/>" if self_close else f"<draw:page{raw}>"

    next_xml = _PAGE_OPEN_RE.sub(replace_page, xml)
    if index != len(specs):
        raise ValueError(
            f"Số draw:page FODP ({index}) không khớp danh sách overlay ({len(specs)}) — không đoán ánh xạ phần"
        )
    return ensure_vno_xmlns(next_xml)


def overlay_fodp_sections(fodp_xml: str, presentation_xml: str | None) -> str:
    """Inject vno:section-* when original PPTX has p14:sectionLst.

    Mapping is p:sldIdLst order ↔ draw:page order. Count mismatch throws.
    """
    xml = fodp_xml or ""
    if not presentation_has_section_list(presentation_xml):
        return xml
    slide_ids = parse_presentation_slide_ids(presentation_xml)
    pages = parse_fodp_pages(xml)
    if len(slide_ids) != len(pages):
        raise ValueError(
            f"PPTX sldIdLst ({len(slide_ids)}) không khớp số draw:page FODP ({len(pages)}) — không đoán ánh xạ phần"
        )
    sections = parse_section_list(presentation_xml)
    if not sections:
        raise ValueError(
            "PPTX có p14:sectionLst nhưng không đọc được phần — không đoán ánh xạ phần"
        )
    by_id: dict[str, dict[str, str]] = {}
    seen: set[str] = set()
    for section in sections:
        section_id = str(section.get("id") or "").strip()
        section_name = str(section.get("name") or "").strip()
        slide_list = section.get("slideIds") or []
        if not slide_list:
            continue
        if not section_id and not section_name:
            raise ValueError(
                "p14:section có slide nhưng thiếu name và id — không đoán ánh xạ phần"
            )
        ident = section_id or f"section:{section_name}"
        name = section_name or "Phần không tên"
        for sld_id in slide_list:
            if sld_id not in slide_ids:
                raise ValueError(
                    f'p14:sldId id="{sld_id}" không có trong p:sldIdLst — không đoán ánh xạ phần'
                )
            if sld_id in seen:
                raise ValueError(
                    f'p14:sldId id="{sld_id}" thuộc hai phần — không đoán ánh xạ phần'
                )
            seen.add(sld_id)
            by_id[sld_id] = {"id": ident, "name": name}
    page_sections = [by_id.get(sld_id) for sld_id in slide_ids]
    return apply_fodp_section_attrs(xml, page_sections)


def parse_master_logo_from_named_shape(shape_xml: str | None) -> dict[str, str]:
    sp = shape_xml or ""
    if not sp:
        raise ValueError("Shape VNOfficeMasterLogo rỗng — không đoán logo")
    if _PH_RE.search(sp):
        raise ValueError("Shape VNOfficeMasterLogo mang p:ph — không đoán logo")
    texts = [_unescape_xml(match.group(1) or "") for match in _T_TEXT_RE.finditer(sp)]
    logo_text = _normalize_logo_text("".join(texts))
    if not logo_text:
        raise ValueError("Shape VNOfficeMasterLogo thiếu chữ a:t — không đoán logo")
    rgb_match = _SRGB_RE.search(sp)
    rgb = (rgb_match.group(1) if rgb_match else "").strip().lstrip("#")
    face_match = _LATIN_RE.search(sp)
    face = _unescape_xml(face_match.group(1) if face_match else "")
    accent = f"#{rgb.lower()}" if re.fullmatch(r"[0-9a-fA-F]{3,8}", rgb) else ""
    return {"logoText": logo_text, "accentColor": accent, "fontFamily": face}


def parse_master_logo_from_slide_master(master_xml: str | None) -> dict[str, str] | None:
    shapes = find_named_logo_shapes(master_xml)
    if not shapes:
        return None
    if len(shapes) > 1:
        raise ValueError(
            f"PPTX có {len(shapes)} shape tên {MASTER_LOGO_SHAPE_NAME} trên một slide master — không đoán logo"
        )
    return parse_master_logo_from_named_shape(shapes[0])


def parse_master_logo_from_slide_masters(master_xml: str | list[str] | None) -> dict[str, str] | None:
    if master_xml is None or master_xml == "":
        items: list[str] = []
    elif isinstance(master_xml, list):
        items = master_xml
    else:
        items = [master_xml]
    found: list[dict[str, str]] = []
    for xml in items:
        parsed = parse_master_logo_from_slide_master(xml)
        if parsed:
            found.append(parsed)
    if not found:
        return None
    first = found[0]
    for item in found[1:]:
        if (
            item["logoText"] != first["logoText"]
            or item["accentColor"] != first["accentColor"]
            or item["fontFamily"] != first["fontFamily"]
        ):
            raise ValueError(
                "Hai slide master có VNOfficeMasterLogo khác chữ/màu/font — không đoán logo"
            )
    return first


def _merge_master_theme_payload(existing_raw: str, logo: dict[str, str]) -> dict:
    theme: dict = {}
    raw = (existing_raw or "").strip()
    if raw:
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, dict):
            theme = parsed
    theme["logoText"] = logo["logoText"]
    if logo.get("accentColor"):
        theme["accentColor"] = logo["accentColor"]
    if logo.get("fontFamily"):
        theme["fontFamily"] = logo["fontFamily"]
    return theme


def apply_fodp_master_theme_attrs(fodp_xml: str, logo: dict | None) -> str:
    xml = fodp_xml or ""
    if not logo or not _normalize_logo_text(str(logo.get("logoText") or "")):
        return xml
    index = 0

    def replace_master(match: re.Match[str]) -> str:
        nonlocal index
        index += 1
        raw = match.group(1) or ""
        self_close = match.group(2) == "/" or bool(re.search(r"/\s*$", raw))
        if self_close:
            raw = re.sub(r"/\s*$", "", raw)
        theme_match = _THEME_ATTR_RE.search(raw)
        existing = _unescape_xml(
            (theme_match.group(1) or theme_match.group(2)) if theme_match else ""
        )
        encoded = _escape_xml(
            json.dumps(_merge_master_theme_payload(existing, logo), ensure_ascii=False, separators=(",", ":"))
        )
        if _THEME_ATTR_RE.search(raw):
            raw = _THEME_ATTR_RE.sub(f'vno:master-theme="{encoded}"', raw)
        else:
            raw = f'{raw.rstrip()} vno:master-theme="{encoded}"'
        if raw and not raw.startswith(" "):
            raw = f" {raw}"
        return f"<style:master-page{raw}/>" if self_close else f"<style:master-page{raw}>"

    next_xml = _MASTER_PAGE_OPEN_GI_RE.sub(replace_master, xml)
    if index == 0:
        raise ValueError("FODP thiếu style:master-page — không gắn logo master")
    return ensure_vno_xmlns(next_xml)


def overlay_fodp_master_logo(fodp_xml: str, master_xml: str | list[str] | None) -> str:
    """Inject vno:master-theme from p:sp name=VNOfficeMasterLogo.

    Identification is by shape name only. Missing name is a no-op.
    Ambiguous named shapes throw — never guess among similar p:sp.
    """
    xml = fodp_xml or ""
    logo = parse_master_logo_from_slide_masters(master_xml)
    if not logo:
        return xml
    return apply_fodp_master_theme_attrs(xml, logo)


# ---------------------------------------------------------------------------
# Speaker notes (presentation:notes) restoration
# ---------------------------------------------------------------------------

_PRESENTATION_NOTES_RE = re.compile(
    r"<presentation:notes\b([^>]*?)>([\s\S]*?)</presentation:notes\s*>",
    re.IGNORECASE,
)
_TEXT_P_RE = re.compile(r"<text:p\b[^>]*>([\s\S]*?)</text:p>", re.IGNORECASE)
_SLIDE_RELS_ENTRY_RE = re.compile(r"^ppt/slides/_rels/slide(\d+)\.xml\.rels$", re.IGNORECASE)
_CONTENT_TYPES_ENTRY = "[Content_Types].xml"
_NOTES_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"
)
_NOTES_MASTER_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"
)
_NOTES_REL_TYPE = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide"
)
_NOTES_MASTER_REL_TYPE = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster"
)
_RELATIONSHIPS_TAG = (
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
)
_RELATIONSHIPS_CLOSE = "</Relationships>"
_TYPES_CLOSE = "</Types>"


def _strip_xml_tags(xml_fragment: str) -> str:
    """Remove XML tags, return raw text content."""
    text = re.sub(r"<[^>]+>", "", xml_fragment)
    return text.strip()


def parse_notes_from_fodp(fodp_xml: str | None) -> dict[int, list[str]]:
    """Trích xuất ghi chú diễn giả từ FODP.

    Trả về dict: slide_index (0-based) → list[str] (mỗi paragraph một dòng).
    Slide không có notes sẽ không có key trong dict.
    """
    xml = fodp_xml or ""
    if not xml:
        return {}

    pages = list(_PAGE_OPEN_RE.finditer(xml))
    notes_by_slide: dict[int, list[str]] = {}

    for page_match in pages:
        page_idx = pages.index(page_match)
        page_start = page_match.start()
        # Tìm closing </draw:page> tương ứng
        close_match = re.search(r"</draw:page\s*>", xml[page_start:], re.IGNORECASE)
        if not close_match:
            continue
        page_body = xml[page_start:page_start + close_match.end()]
        notes_match = _PRESENTATION_NOTES_RE.search(page_body)
        if not notes_match:
            continue
        notes_body = notes_match.group(2)
        paragraphs: list[str] = []
        for tp_match in _TEXT_P_RE.finditer(notes_body):
            raw = tp_match.group(1)
            text = _strip_xml_tags(raw).strip()
            if text:
                paragraphs.append(text)
        if paragraphs:
            notes_by_slide[page_idx] = paragraphs
    return notes_by_slide


def _build_notes_slide_xml(paragraphs: list[str]) -> str:
    """Tạo XML cho ppt/notesSlides/notesSlideN.xml."""
    body_paras = ""
    for text in paragraphs:
        escaped = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        body_paras += (
            "<a:p><a:pPr indent=\"0\" algn=\"l\"><a:buNone/></a:pPr>"
            "<a:r><a:rPr lang=\"vi-VN\" sz=\"2000\" b=\"0\" u=\"none\" strike=\"noStrike\">"
            "<a:solidFill><a:srgbClr val=\"000000\"/></a:solidFill>"
            "<a:effectLst/><a:uFillTx/><a:latin typeface=\"Arial\"/></a:rPr>"
            f"<a:t>{escaped}</a:t></a:r>"
            "<a:endParaRPr lang=\"vi-VN\" sz=\"2000\" b=\"0\" u=\"none\" strike=\"noStrike\">"
            "<a:solidFill><a:srgbClr val=\"000000\"/></a:solidFill>"
            "<a:effectLst/><a:uFillTx/><a:latin typeface=\"Arial\"/></a:endParaRPr></a:p>"
        )
    return (
        "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        "<p:notes xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\""
        " xmlns:p=\"http://schemas.openxmlformats.org/presentationml/2006/main\""
        " xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">"
        "<p:cSld><p:spTree>"
        "<p:nvGrpSpPr><p:cNvPr id=\"1\" name=\"\"/>"
        "<p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>"
        "<p:grpSpPr><a:xfrm><a:off x=\"0\" y=\"0\"/><a:ext cx=\"0\" cy=\"0\"/>"
        "<a:chOff x=\"0\" y=\"0\"/><a:chExt cx=\"0\" cy=\"0\"/></a:xfrm></p:grpSpPr>"
        "<p:sp><p:nvSpPr><p:cNvPr id=\"20\" name=\"PlaceHolder 1\"/>"
        "<p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr>"
        "<p:nvPr><p:ph type=\"sldImg\"/></p:nvPr></p:nvSpPr>"
        "<p:spPr><a:xfrm><a:off x=\"812520\" y=\"812520\"/>"
        "<a:ext cx=\"5934960\" cy=\"3338280\"/></a:xfrm>"
        "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom>"
        "<a:ln w=\"0\"><a:noFill/></a:ln></p:spPr></p:sp>"
        "<p:sp><p:nvSpPr><p:cNvPr id=\"21\" name=\"PlaceHolder 2\"/>"
        "<p:cNvSpPr><a:spLocks noGrp=\"1\"/></p:cNvSpPr>"
        "<p:nvPr><p:ph type=\"body\"/></p:nvPr></p:nvSpPr>"
        "<p:spPr><a:xfrm><a:off x=\"812520\" y=\"4942080\"/>"
        "<a:ext cx=\"5934960\" cy=\"4811040\"/></a:xfrm>"
        "<a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom>"
        "<a:noFill/><a:ln w=\"0\"><a:noFill/></a:ln></p:spPr>"
        "<p:txBody><a:bodyPr lIns=\"0\" tIns=\"0\" rIns=\"0\" bIns=\"0\" anchor=\"t\">"
        "<a:spAutoFit/></a:bodyPr>"
        + body_paras +
        "</p:txBody></p:sp>"
        "</p:spTree></p:cSld></p:notes>"
    )


def _build_notes_slide_rels(slide_num: int, notes_master_rid: str, slide_rid: str) -> str:
    """Tạo XML cho ppt/notesSlides/_rels/notesSlideN.xml.rels."""
    return (
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
        "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
        f"<Relationship Id=\"{slide_rid}\" Type=\"{_NOTES_REL_TYPE.replace('notesSlide', 'slide')}\""
        f" Target=\"../slides/slide{slide_num}.xml\"/>"
        f"<Relationship Id=\"{notes_master_rid}\" Type=\"{_NOTES_MASTER_REL_TYPE}\""
        " Target=\"../notesMasters/notesMaster1.xml\"/>"
        "</Relationships>"
    )


def _find_or_create_notes_master(pptx_entries: dict[str, bytes]) -> bool:
    """Kiểm tra notesMaster1.xml tồn tại trong PPTX. Trả về True nếu có."""
    return bool(pptx_entries.get("ppt/notesMasters/notesMaster1.xml"))


def restore_notes_to_pptx(
    pptx_bytes: bytes, notes_by_slide: dict[int, list[str]]
) -> bytes:
    """Bổ sung missing notesSlideN.xml vào PPTX dựa trên dữ liệu FODP.

    Chỉ thêm notes cho slide CHƯA có notesSlide trong PPTX.
    Trả về bytes PPTX đã cập nhật (hoặc nguyên bản nếu không cần vá).
    """
    if not notes_by_slide:
        return pptx_bytes

    try:
        with zipfile.ZipFile(io.BytesIO(pptx_bytes), "r") as zin:
            existing = set(zin.namelist())
            entries_data: dict[str, bytes] = {}
            for name in existing:
                if not name.endswith("/"):
                    entries_data[name] = zin.read(name)
    except zipfile.BadZipFile:
        return pptx_bytes

    # Xác định哪些 slide đã có notesSlide — kiểm tra slideN.xml.rels
    has_notes: set[int] = set()  # 0-based slide indices
    slide_rels_map: dict[int, str] = {}  # slide_num (1-based) → slide rels entry name
    for name in existing:
        m2 = _SLIDE_RELS_ENTRY_RE.match(name)
        if m2:
            slide_num = int(m2.group(1))
            slide_rels_map[slide_num] = name
            rels_data = entries_data.get(name, b"").decode("utf-8", errors="replace")
            if _NOTES_REL_TYPE in rels_data:
                has_notes.add(slide_num - 1)  # 0-based

    # Kiểm tra notesMaster tồn tại
    if not _find_or_create_notes_master(entries_data):
        return pptx_bytes

    new_entries: dict[str, bytes] = {}
    modified_entries: dict[str, bytes] = {}
    next_notes_num = 1
    # Tìm số notesSlide cao nhất hiện có
    for name in existing:
        m = re.match(r"^ppt/notesSlides/notesSlide(\d+)\.xml$", name, re.IGNORECASE)
        if m:
            next_notes_num = max(next_notes_num, int(m.group(1)) + 1)

    for slide_idx, paragraphs in notes_by_slide.items():
        if slide_idx in has_notes:
            continue
        slide_num = slide_idx + 1  # 1-based
        notes_num = next_notes_num
        next_notes_num += 1

        notes_entry = f"ppt/notesSlides/notesSlide{notes_num}.xml"
        notes_rels_entry = f"ppt/notesSlides/_rels/notesSlide{notes_num}.xml.rels"

        # Tạo notesSlide XML
        notes_xml = _build_notes_slide_xml(paragraphs)
        new_entries[notes_entry] = notes_xml.encode("utf-8")

        # Tạo notesSlide rels (liên kết về slide + notesMaster)
        notes_rels_xml = (
            "<?xml version=\"1.0\" encoding=\"UTF-8\"?>"
            "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">"
            f"<Relationship Id=\"rId1\" Type=\"{_NOTES_REL_TYPE.replace('notesSlide', 'slide')}\""
            f" Target=\"../slides/slide{slide_num}.xml\"/>"
            f"<Relationship Id=\"rId2\" Type=\"{_NOTES_MASTER_REL_TYPE}\""
            " Target=\"../notesMasters/notesMaster1.xml\"/>"
            "</Relationships>"
        )
        new_entries[notes_rels_entry] = notes_rels_xml.encode("utf-8")

        # Cập nhật slideN.xml.rels — thêm relationship tới notesSlide
        slide_rels_name = slide_rels_map.get(slide_num)
        if slide_rels_name:
            slide_rels_data = entries_data.get(slide_rels_name, b"").decode("utf-8", errors="replace")
            if _NOTES_REL_TYPE not in slide_rels_data:
                # Tìm rId cao nhất hiện có
                max_rid = 0
                for rid_match in re.finditer(r'Id\s*=\s*["\']rId(\d+)["\']', slide_rels_data, re.IGNORECASE):
                    max_rid = max(max_rid, int(rid_match.group(1)))
                new_rid = f"rId{max_rid + 1}"
                new_rel = (
                    f"<Relationship Id=\"{new_rid}\" Type=\"{_NOTES_REL_TYPE}\""
                    f" Target=\"../notesSlides/notesSlide{notes_num}.xml\"/>"
                )
                slide_rels_data = slide_rels_data.replace(
                    _RELATIONSHIPS_CLOSE, new_rel + _RELATIONSHIPS_CLOSE
                )
                modified_entries[slide_rels_name] = slide_rels_data.encode("utf-8")

        # Cập nhật [Content_Types].xml — thêm Override cho notesSlide
        ct_data = entries_data.get(_CONTENT_TYPES_ENTRY, b"").decode("utf-8", errors="replace")
        notes_part = f"/ppt/notesSlides/notesSlide{notes_num}.xml"
        if notes_part not in ct_data:
            override = (
                f"<Override PartName=\"{notes_part}\" ContentType=\"{_NOTES_CONTENT_TYPE}\"/>"
            )
            ct_data = ct_data.replace(_TYPES_CLOSE, override + _TYPES_CLOSE)
            modified_entries[_CONTENT_TYPES_ENTRY] = ct_data.encode("utf-8")

    if not new_entries and not modified_entries:
        return pptx_bytes

    # Rebuild ZIP
    dest = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(pptx_bytes), "r") as zin, \
         zipfile.ZipFile(dest, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            if item.is_dir() or not item.filename or item.filename.endswith("/"):
                continue
            if item.filename in modified_entries:
                data = modified_entries[item.filename]
            elif item.filename in new_entries:
                data = new_entries[item.filename]
            else:
                data = zin.read(item.filename)
            info = zipfile.ZipInfo(filename=item.filename, date_time=item.date_time)
            info.compress_type = zipfile.ZIP_DEFLATED
            zout.writestr(info, data)
        # Thêm entries mới
        for name, data in new_entries.items():
            if name not in {item.filename for item in zin.infolist()}:
                info = zipfile.ZipInfo(filename=name)
                info.compress_type = zipfile.ZIP_DEFLATED
                zout.writestr(info, data)
    return dest.getvalue()


def postprocess_slides_pptx(
    pptx_bytes: bytes,
    *,
    source_fodp: str | None = None,
    logo_text: str | None = None,
    accent_color: str | None = None,
    font_family: str | None = None,
    enabled: bool | None = None,
    sections: list[dict] | None = None,
    show_without_narration: bool | None = None,
    pointer_color: str | None = None,
) -> bytes:
    """Return patched PPTX bytes, or the original buffer when no patch is needed."""
    if enabled is False:
        return pptx_bytes
    logo = {"logoText": "", "accentColor": accent_color or "", "fontFamily": font_family or ""}
    if logo_text and _normalize_logo_text(logo_text):
        logo["logoText"] = _normalize_logo_text(logo_text)
    elif source_fodp:
        parsed = parse_master_logo_from_fodp(source_fodp)
        logo["logoText"] = parsed["logoText"]
        logo["accentColor"] = logo["accentColor"] or parsed["accentColor"]
        logo["fontFamily"] = logo["fontFamily"] or parsed["fontFamily"]
    apply_logo = bool(logo["logoText"])
    if apply_logo and source_fodp and not fodp_has_master_logo(source_fodp) and logo_text is None:
        apply_logo = False
    apply_sections = bool(sections) if sections is not None else fodp_has_sections(source_fodp)
    apply_show = bool(show_without_narration or pointer_color) or fodp_has_show_setup_patch(source_fodp)

    presentation = read_zip_entry(pptx_bytes, PPTX_PRESENTATION_ENTRY)
    original_presentation_xml = presentation.decode("utf-8", errors="replace") if presentation else ""
    presentation_xml = original_presentation_xml
    replacements: dict[str, str] = {}

    # soffice --convert-to pptx BỎ QUA style:page-layout-properties của FODP khi
    # xuất PPTX, luôn tự ghi <p:sldSz> mặc định 28cm x 15.75cm bất kể canvas.slideSize
    # thật của người dùng - đo thực tế bằng vòng chuyển đổi thật qua soffice, xác
    # nhận đây là giới hạn của bản thân soffice, không phải lỗi FODP do 3T Office ghi
    # ra. Khôi phục khổ trang THẬT ở đây, độc lập với logo/sections/show (luôn áp
    # dụng nếu phát hiện khác biệt thật, không chỉ khi các tính năng khác cũng cần sửa).
    intended_size = parse_intended_slide_size_from_fodp(source_fodp) if source_fodp else None
    real_size = parse_slide_size(presentation_xml)
    # Dung sai 1000 EMU (~0.0028cm) — tránh vá giả do sai số làm tròn giữa
    # FODP (cm, làm tròn 3 chữ số thập phân) và PPTX (EMU, integer).
    # Khổ ghi bằng pt (3T Slide, có "type") phải khớp TỪNG EMU và đúng thuộc tính type như
    # PowerPoint (G8: soffice ghi 12192120 thay vì 12192000 → PowerPoint báo khổ «Custom»).
    real_type_match = re.search(r'<(?:[\w]+:)?sldSz\b[^>]*\btype=["\']([^"\']*)["\']', presentation_xml or "", re.IGNORECASE)
    real_type = real_type_match.group(1) if real_type_match else ""
    exact = bool(intended_size and "type" in intended_size)
    tolerance = 0 if exact else 1000
    apply_slide_size = bool(
        intended_size
        and (
            abs(intended_size["cx"] - real_size["cx"]) > tolerance
            or abs(intended_size["cy"] - real_size["cy"]) > tolerance
            or (exact and intended_size["type"] != real_type)
        )
    )
    effective_size = intended_size if apply_slide_size else real_size

    # Luôn kiểm tra notes — ghi chú diễn giả mất trắng khi soffice convert
    notes_by_slide = parse_notes_from_fodp(source_fodp) if source_fodp else {}

    if not apply_logo and not apply_sections and not apply_show and not apply_slide_size and not notes_by_slide:
        return pptx_bytes

    if apply_slide_size and presentation_xml:
        presentation_xml = apply_intended_slide_size(presentation_xml, intended_size)

    if apply_logo:
        with zipfile.ZipFile(io.BytesIO(pptx_bytes), "r") as package:
            master_names = [name for name in package.namelist() if SLIDE_MASTER_ENTRY_RE.match(name)]
        if not master_names:
            raise ValueError("PPTX thiếu ppt/slideMasters/slideMaster*.xml — không thể bổ sung logo")
        for name in master_names:
            current = _read_zip_entry(pptx_bytes, name)
            xml = current.decode("utf-8")
            next_xml = apply_master_logo_shape(
                xml,
                logo_text=logo["logoText"],
                accent_color=logo["accentColor"],
                font_family=logo["fontFamily"],
                slide_cx=effective_size["cx"],
                slide_cy=effective_size["cy"],
            )
            if next_xml != xml:
                replacements[name] = next_xml
    if apply_sections:
        if not presentation_xml:
            raise ValueError("PPTX thiếu ppt/presentation.xml — không thể bổ sung p14:sectionLst")
        if sections is not None:
            presentation_xml = apply_section_list(presentation_xml, sections)
        else:
            presentation_xml = apply_section_list_from_fodp(presentation_xml, source_fodp)
    if presentation_xml != original_presentation_xml:
        replacements[PPTX_PRESENTATION_ENTRY] = presentation_xml
    if apply_show:
        current_props = read_zip_entry(pptx_bytes, PPTX_PRESPROPS_ENTRY)
        if not current_props:
            raise ValueError("PPTX thiếu ppt/presProps.xml — không thể bổ sung p:showPr")
        props_xml = current_props.decode("utf-8")
        if show_without_narration or pointer_color:
            next_props = apply_show_properties(
                props_xml,
                {
                    "showWithoutNarration": bool(show_without_narration),
                    "pointerColor": pointer_color or "",
                },
            )
        else:
            next_props = apply_show_properties_from_fodp(props_xml, source_fodp)
        if next_props != props_xml:
            replacements[PPTX_PRESPROPS_ENTRY] = next_props
    if not replacements:
        patched = pptx_bytes
    else:
        patched = patch_ooxml_zip(pptx_bytes, replacements)
    # Khôi phục ghi chú diễn giả (notesSlideN.xml) nếu bị mất
    if notes_by_slide:
        patched = restore_notes_to_pptx(patched, notes_by_slide)
    return patched


def postprocess_slides_pptx_file(
    pptx_path: str,
    *,
    fodp_path: str | None = None,
    logo_text: str | None = None,
    out_path: str | None = None,
) -> str:
    with open(pptx_path, "rb") as handle:
        pptx_bytes = handle.read()
    source_fodp = None
    if fodp_path:
        with open(fodp_path, "r", encoding="utf-8", errors="replace") as handle:
            source_fodp = handle.read()
    patched = postprocess_slides_pptx(
        pptx_bytes, source_fodp=source_fodp, logo_text=logo_text
    )
    dest = out_path or pptx_path
    if patched is not pptx_bytes or dest != pptx_path:
        with open(dest, "wb") as handle:
            handle.write(patched)
    return dest


_XDR_ANCHOR_RE = re.compile(
    r"(<xdr:(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[\s\S]*?</xdr:(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)>)",
    re.IGNORECASE,
)
_XDR_PIC_RE = re.compile(
    r"<xdr:pic\b[\s\S]*?</xdr:pic>",
    re.IGNORECASE,
)
_XDR_CNVPR_RE = re.compile(
    r"<xdr:cNvPr\b[^>]*\bid\s*=\s*([\"'])(\d+)\1[^>]*\bname\s*=\s*([\"'])([^\3]*?)\3",
    re.IGNORECASE,
)
_XDR_BLIP_RE = re.compile(
    r"<a:blip\b[^>]*\br:(?:embed|link)\s*=\s*([\"'])(.*?)\1",
    re.IGNORECASE,
)


def _parse_xlsx_drawing_images(xlsx_bytes: bytes) -> dict[str, list[dict]]:
    """Parse all drawing XMLs in XLSX and extract image anchors.

    Returns {sheet_name: [{"anchor_xml": str, "cnvpr_id": str, "name": str, "rel_id": str, "index": int}, ...]}
    where index is the 0-based order of xdr:pic anchors in the drawing.
    """
    result: dict[str, list[dict]] = {}

    # Resolve sheet name -> worksheet entry path
    sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)

    # Resolve sheet name -> drawing entry path via worksheet rels
    drawing_by_sheet: dict[str, str] = {}
    for sheet_name, entry_path in sheet_entries.items():
        rels_path = entry_path.replace("/worksheets/", "/worksheets/_rels/") + ".rels"
        rels_bytes = read_zip_entry(xlsx_bytes, rels_path)
        if not rels_bytes:
            continue
        rels_xml = rels_bytes.decode("utf-8", errors="replace")
        for m in re.finditer(
            r"<Relationship\b([^>]*)/?>",
            rels_xml,
            re.IGNORECASE,
        ):
            attrs = m.group(1)
            type_match = re.search(r'Type="([^"]*)"', attrs)
            target_match = re.search(r'Target="([^"]*)"', attrs)
            id_match = re.search(r'Id="([^"]*)"', attrs)
            if not (type_match and target_match and id_match):
                continue
            if "drawing" not in type_match.group(1).lower():
                continue
            target = target_match.group(1)
            if target.startswith("../"):
                target = target[3:]
            elif target.startswith("./"):
                target = target[2:]
            drawing_by_sheet[sheet_name] = f"xl/{target}"
            break

    # Parse each drawing XML
    for sheet_name, drawing_path in drawing_by_sheet.items():
        drawing_bytes = read_zip_entry(xlsx_bytes, drawing_path)
        if not drawing_bytes:
            continue
        drawing_xml = drawing_bytes.decode("utf-8", errors="replace")

        anchors = []
        anchor_index = 0
        for anchor_match in _XDR_ANCHOR_RE.finditer(drawing_xml):
            anchor_xml = anchor_match.group(1)
            pic_match = _XDR_PIC_RE.search(anchor_xml)
            if not pic_match:
                continue
            pic_xml = pic_match.group(0)

            cnvpr_match = _XDR_CNVPR_RE.search(pic_xml)
            blip_match = _XDR_BLIP_RE.search(pic_xml)

            # Linked pictures use r:link instead of r:embed.  They are still
            # pictures in the drawing and must participate in the untouched
            # image count, otherwise one missing id disables passthrough for
            # the whole sheet.
            if cnvpr_match and blip_match:
                cnvpr_id = cnvpr_match.group(2)
                name = _unescape_xml(cnvpr_match.group(4))
                rel_id = blip_match.group(2)
                # Ảnh liên kết (r:link, không có r:embed) Calc KHÔNG nhập nên không bao giờ có trong FODS:
                # không cấp chỉ số id (id là số thứ tự theo thứ tự ảnh app thấy), chỉ giữ để chép drawing.
                linked = bool(re.search(r"\br:link=", pic_xml)) and not re.search(r"\br:embed=", pic_xml)
                anchors.append(
                    {
                        "anchor_xml": anchor_xml,
                        "cnvpr_id": cnvpr_id,
                        "name": name,
                        "rel_id": rel_id,
                        "index": None if linked else anchor_index,
                        "linked": linked,
                    }
                )
                if not linked:
                    anchor_index += 1

        if anchors:
            result[sheet_name] = anchors

    return result


def _draw_group_spans(xml: str) -> list[tuple[int, int]]:
    """Các khoảng [start, end) nằm trong <draw:g>…</draw:g> (kể cả lồng nhau)."""
    spans: list[tuple[int, int]] = []
    depth = 0
    start = 0
    for m in re.finditer(r"<(/?)draw:g\b[^>]*?(/?)>", xml, re.IGNORECASE):
        closing, self_closing = m.group(1) == "/", m.group(2) == "/"
        if not closing and not self_closing:
            if depth == 0:
                start = m.start()
            depth += 1
        elif closing and depth > 0:
            depth -= 1
            if depth == 0:
                spans.append((start, m.end()))
    return spans


def _overlay_sheet_drawing_image_ids(xlsx_bytes: bytes, fods_xml: str) -> str:
    """Overlay vno:image-id onto <draw:frame> elements in FODS for each sheet.

    Each <draw:frame> containing a <draw:image> gets a vno:image-id attribute
    in the format "sheet_name:anchor_index" (0-based anchor index in original drawing).
    """
    xml = fods_xml or ""
    if not xml:
        return xml

    # Parse original drawing images
    drawing_images = _parse_xlsx_drawing_images(xlsx_bytes)
    if not drawing_images:
        return xml

    # Ensure vno namespace is declared
    if not _declares_vno_namespace(xml):
        match = _OFFICE_DOCUMENT_OPEN_RE.search(xml)
        if match:
            attrs = match.group(1) or ""
            xml = (
                xml[: match.start()]
                + f'<office:document{attrs} xmlns:vno="{SHEET_VNO_NS}">'
                + xml[match.end() :]
            )

    # For each sheet in FODS, find draw:frame elements with draw:image and assign image-id
    pieces = []
    cursor = 0
    for table_start, table_end in _flat_xml_blocks(xml, ("table:table",)):
        pieces.append(xml[cursor:table_start])
        table_xml = xml[table_start:table_end]
        table_attrs = _xml_attrs(re.match(r"<[^>]+", table_xml).group(0))
        sheet_name = _unescape_xml(table_attrs.get("table:name", ""))

        anchors = drawing_images.get(sheet_name, [])
        if not anchors:
            pieces.append(table_xml)
            cursor = table_end
            continue

        # id = "<sheet>:<i>/<N>" với N = số khung ảnh Calc NHẬP ĐƯỢC cho sheet này lúc mở (Calc bỏ ảnh nhóm
        # grpSp, ảnh cao 0, ảnh liên kết — đo lan12: 9 anchor gốc → 6 khung). Khi lưu, sheet "chưa sửa ảnh"
        # ⇔ đúng N khung, mang đủ id 0..N-1 — không phụ thuộc Calc bỏ gì, và xoá/thêm ảnh trong app đều lộ.
        frame_re = re.compile(r"<draw:frame\b([^>]*)>([\s\S]*?)</draw:frame>", re.IGNORECASE)
        # Ảnh trong nhóm <draw:g> (Excel grpSp) app không có model -> không bao giờ ghi lại: không đếm, không gắn id
        # (đo lan12 sheet 1: Calc nhập 12 khung, 5 nằm trong nhóm, app giữ 7 -> phải coi 7 là N).
        group_spans = _draw_group_spans(table_xml)
        in_group = lambda pos: any(a <= pos < b for a, b in group_spans)
        imported_total = sum(1 for fm in frame_re.finditer(table_xml)
                             if re.search(r"<draw:image\b", fm.group(2) or "", re.IGNORECASE) and not in_group(fm.start()))
        anchor_idx = 0

        def replace_frame(fm: re.Match) -> str:
            nonlocal anchor_idx
            raw_attrs = fm.group(1) or ""
            body = fm.group(2) or ""
            # Check if this frame has a draw:image
            if not re.search(r"<draw:image\b", body, re.IGNORECASE) or in_group(fm.start()):
                return fm.group(0)
            image_id = f"{sheet_name}:{anchor_idx}/{imported_total}"
            anchor_idx += 1
            self_close = bool(re.search(r"/\s*$", raw_attrs))
            if self_close:
                raw_attrs = re.sub(r"/\s*$", "", raw_attrs)
            if re.search(r'\bvno:image-id\s*=', raw_attrs, re.IGNORECASE):
                raw_attrs = re.sub(
                    r'\bvno:image-id\s*=\s*(["\'])[^\1]*\1',
                    f'vno:image-id="{image_id}"',
                    raw_attrs,
                    flags=re.IGNORECASE,
                )
            else:
                raw_attrs = f'{raw_attrs.rstrip()} vno:image-id="{image_id}"'
            if raw_attrs and not raw_attrs.startswith(" "):
                raw_attrs = f" {raw_attrs}"
            if self_close:
                return f"<draw:frame{raw_attrs}/>"
            else:
                return f"<draw:frame{raw_attrs}>{body}</draw:frame>"

        table_xml = re.sub(
            r"<draw:frame\b([^>]*)>([\s\S]*?)</draw:frame>",
            replace_frame,
            table_xml,
            flags=re.IGNORECASE,
        )
        pieces.append(table_xml)
        cursor = table_end

    pieces.append(xml[cursor:])
    return "".join(pieces)


def _restore_untouched_drawings_step(
    xlsx_bytes: bytes,
    source_fods: str | None,
    source_xlsx_bytes: bytes | None,
    replacements: dict[str, str],
) -> None:
    """Restore original drawings for sheets where images were not modified.

    A sheet is "untouched" if:
    - Every original vno:image-id from the source XLSX is still present in FODS
    - No new images were added (FODS image count == original image count)
    - The set of vno:image-ids matches exactly

    For untouched sheets:
    - Copy original drawing XML, its .rels, and referenced media files
    - Rename media files with "vnosrc_" prefix to avoid clashing with LibreOffice's images
    - Update worksheet's <drawing r:id> and worksheet rels
    - Update [Content_Types].xml with Override entries for drawing and Default for image types
    - Remove (or leave unreferenced) the LibreOffice-generated drawing for that sheet
    """
    if not source_fods or not source_xlsx_bytes:
        return

    # 1. Parse vno:image-ids from FODS per sheet
    fods_image_ids: dict[str, list[str]] = {}
    fods_total_image_counts: dict[str, int] = {}
    fods_images_at_open: dict[str, int] = {}
    for table_start, table_end in _flat_xml_blocks(source_fods, ("table:table",)):
        table_xml = source_fods[table_start:table_end]
        table_attrs = _xml_attrs(re.match(r"<[^>]+", table_xml).group(0))
        sheet_name = _unescape_xml(table_attrs.get("table:name", ""))
        images_at_open = table_attrs.get("vno:images-at-open")
        if images_at_open is not None and re.fullmatch(r"\d+", images_at_open):
            fods_images_at_open[sheet_name] = int(images_at_open)
        ids: list[str] = []
        total_images = 0
        group_spans = _draw_group_spans(table_xml)
        in_group = lambda pos: any(a <= pos < b for a, b in group_spans)
        # Match draw:frame opening tag (works for both self-closing and regular)
        for fm in re.finditer(
            r"<draw:frame\b([^>]*)>",
            table_xml,
            re.IGNORECASE,
        ):
            raw_attrs = fm.group(1) or ""
            # Keep the count identical to _overlay_sheet_drawing_image_ids:
            # grouped frames are outside the editable image model and receive no id.
            if in_group(fm.start()):
                continue
            # Check if this frame has a draw:image by looking ahead
            # Find the corresponding closing tag or self-close
            tag_end = fm.end()
            # Look for draw:image in the element
            # For self-closing: no body. For regular: body between > and </draw:frame>
            has_image = False
            if raw_attrs.endswith("/"):
                # Self-closing, no body
                pass
            else:
                # Regular tag, look for draw:image before </draw:frame>
                close_pos = table_xml.find("</draw:frame>", tag_end)
                if close_pos > 0:
                    body = table_xml[tag_end:close_pos]
                    if re.search(r"<draw:image\b", body, re.IGNORECASE):
                        has_image = True
            if not has_image:
                continue
            total_images += 1
            id_match = re.search(r'\bvno:image-id\s*=\s*(["\'])([^\1]*?)\1', raw_attrs, re.IGNORECASE)
            if id_match:
                ids.append(id_match.group(2))
        if ids:
            fods_image_ids[sheet_name] = ids
        if total_images > 0:
            fods_total_image_counts[sheet_name] = total_images

    # 2. Parse original drawing images from source XLSX
    source_drawing_images = _parse_xlsx_drawing_images(source_xlsx_bytes)
    if not source_drawing_images:
        return

    # 3. Resolve sheet entries in output XLSX
    out_sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    source_sheet_entries = _resolve_xlsx_sheet_entries(source_xlsx_bytes)

    # 4. For each sheet, check if untouched
    for sheet_name, source_anchors in source_drawing_images.items():
        fods_ids = fods_image_ids.get(sheet_name, [])
        # Ảnh liên kết (r:link) Calc không nhập → không nằm trong tập so; ảnh nhúng phải KHỚP TRỌN (tập id bằng
        # nhau, không có khung chưa gắn id). Thiếu ảnh nhúng = người dùng đã xoá → không phục hồi drawing gốc
        # (bản codex a05eec1 chấp nhận tập con cho oneCell/absolute/grouped → xoá ảnh trong app sẽ bị phục hồi lại).
        # id dạng "<sheet>:<i>/<N>" (N = số khung ảnh Calc nhập được lúc mở): chưa sửa ⇔ hiện có đúng N khung ảnh,
        # tất cả mang id, và tập id = {0..N-1}. Không so với số anchor gốc (Calc bỏ ảnh nhóm/ảnh cao 0/ảnh liên kết).
        if not source_anchors:
            continue
        current_count = fods_total_image_counts.get(sheet_name, 0)
        parsed = [re.match(r"^(.*):(\d+)/(\d+)$", i) for i in fods_ids]
        totals = {int(m.group(3)) for m in parsed if m is not None}
        indexes = sorted(int(m.group(2)) for m in parsed if m is not None)
        n_at_open = next(iter(totals)) if len(totals) == 1 else 0
        # Grouped source images can be flattened by the app serializer and lose
        # their <draw:g> wrapper while remaining outside the editable/id set.
        # Allow only that bounded remainder; a genuinely added image makes the
        # count exceed the original anchor count and still blocks restoration.
        # With no ids, restore only for legacy FODS (marker absent) or when
        # Calc imported zero images.  N>0 means the user deleted all imported
        # images in 3T Sheet, so restoring the source drawing would resurrect them.
        calc_imported_no_images = (
            current_count == 0
            and fods_images_at_open.get(sheet_name, 0) == 0
        )
        untouched_ids = calc_imported_no_images or (
            bool(parsed)
            and all(m is not None for m in parsed)
            and len(totals) == 1
            and indexes == list(range(n_at_open))
            and (current_count == n_at_open or len(source_anchors) > n_at_open)
        )
        if not untouched_ids:
            continue  # Sheet has modified images, use LibreOffice's drawing

        # Sheet is untouched — restore original drawing
        source_entry_path = source_sheet_entries.get(sheet_name)
        out_entry_path = out_sheet_entries.get(sheet_name)
        if not source_entry_path or not out_entry_path:
            continue

        # Get source drawing path from source worksheet rels
        source_rels_path = source_entry_path.replace("/worksheets/", "/worksheets/_rels/") + ".rels"
        source_rels_bytes = read_zip_entry(source_xlsx_bytes, source_rels_path)
        if not source_rels_bytes:
            continue
        source_rels_xml = source_rels_bytes.decode("utf-8", errors="replace")

        source_drawing_path = None
        source_drawing_rel_id = None
        for m in re.finditer(
            r"<Relationship\b([^>]*)/?>",
            source_rels_xml,
            re.IGNORECASE,
        ):
            attrs = m.group(1)
            type_match = re.search(r'Type="([^"]*)"', attrs)
            target_match = re.search(r'Target="([^"]*)"', attrs)
            id_match = re.search(r'Id="([^"]*)"', attrs)
            if not (type_match and target_match and id_match):
                continue
            if "drawing" not in type_match.group(1).lower():
                continue
            target = target_match.group(1)
            if target.startswith("../"):
                target = target[3:]
            elif target.startswith("./"):
                target = target[2:]
            source_drawing_path = f"xl/{target}"
            source_drawing_rel_id = id_match.group(1)
            break

        if not source_drawing_path:
            continue

        # Read source drawing XML and its rels
        source_drawing_bytes = read_zip_entry(source_xlsx_bytes, source_drawing_path)
        if not source_drawing_bytes:
            continue
        source_drawing_xml = source_drawing_bytes.decode("utf-8", errors="replace")

        source_drawing_rels_path = source_drawing_path.replace("/drawings/", "/drawings/_rels/") + ".rels"
        source_drawing_rels_bytes = read_zip_entry(source_xlsx_bytes, source_drawing_rels_path)
        if not source_drawing_rels_bytes:
            continue
        source_drawing_rels_xml = source_drawing_rels_bytes.decode("utf-8", errors="replace")

        # 5. Collect media files referenced by source drawing rels
        media_map: dict[str, str] = {}  # original_rel_id -> new_media_path
        media_content: dict[str, bytes] = {}  # new_media_path -> content
        media_content_types: dict[str, str] = {}  # extension -> content_type

        # Parse source drawing rels for image relationships
        for m in re.finditer(
            r"<Relationship\b([^>]*)/?>",
            source_drawing_rels_xml,
            re.IGNORECASE,
        ):
            attrs = m.group(1)
            type_match = re.search(r'Type="([^"]*)"', attrs)
            target_match = re.search(r'Target="([^"]*)"', attrs)
            id_match = re.search(r'Id="([^"]*)"', attrs)
            if not (type_match and target_match and id_match):
                continue
            if "image" not in type_match.group(1).lower() and "media/" not in target_match.group(1).lower():
                continue
            target = target_match.group(1)
            rel_id = id_match.group(1)
            # target is like "../media/image1.jpeg"
            if target.startswith("../media/"):
                media_name = target[9:]  # "image1.jpeg"
            elif target.startswith("media/"):
                media_name = target[6:]
            else:
                media_name = target
            # Rename with prefix to avoid clash
            new_media_name = f"vnosrc_{media_name}"
            new_media_path = f"xl/media/{new_media_name}"
            media_map[rel_id] = new_media_path

            # Read media content
            orig_media_path = f"xl/media/{media_name}"
            media_bytes = read_zip_entry(source_xlsx_bytes, orig_media_path)
            if media_bytes:
                media_content[new_media_path] = media_bytes
                ext = media_name.split(".")[-1].lower()
                ct = {
                    "png": "image/png",
                    "jpeg": "image/jpeg",
                    "jpg": "image/jpeg",
                    "gif": "image/gif",
                    "bmp": "image/bmp",
                    "tiff": "image/tiff",
                    "tif": "image/tiff",
                    "emf": "image/x-emf",
                    "wmf": "image/x-wmf",
                    "svg": "image/svg+xml",
                    "wdp": "image/vnd.ms-photo",
                }.get(ext, "application/octet-stream")
                media_content_types[ext] = ct


        # 6. Rewrite source drawing XML to use new media rel IDs
        # We need to create new rel IDs for the output drawing rels
        new_drawing_rels_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        )
        rel_id_counter = 1
        old_to_new_rel_id: dict[str, str] = {}
        for m in re.finditer(
            r'<Relationship\b([^>]*)/?>',
            source_drawing_rels_xml,
            re.IGNORECASE,
        ):
            attrs = m.group(1)
            type_match = re.search(r'Type="([^"]*)"', attrs)
            target_match = re.search(r'Target="([^"]*)"', attrs)
            old_id_match = re.search(r'Id="([^"]*)"', attrs)
            if not (type_match and target_match and old_id_match):
                continue
            rel_type = type_match.group(1)
            target = target_match.group(1)
            old_id = old_id_match.group(1)
            if re.search(r'TargetMode="External"', attrs, re.IGNORECASE):
                # Ảnh liên kết ngoài (lan12: http://…): giữ nguyên Target + TargetMode, không có media để chép
                new_id = f"rId{rel_id_counter}"
                rel_id_counter += 1
                old_to_new_rel_id[old_id] = new_id
                new_drawing_rels_xml += f'<Relationship Id="{new_id}" Type="{rel_type}" Target="{target}" TargetMode="External"/>'
            elif "image" in rel_type.lower() or "media/" in target.lower():
                # Media nằm ở xl/media/, rels ở xl/drawings/_rels/ -> đường dẫn tương đối phải là ../media/
                # (bản đầu ghi "media/vnosrc_…" -> Excel không mở lan12, lint parts báo thiếu target)
                new_target = "../media/vnosrc_" + target.rsplit("/", 1)[-1]
                new_id = f"rId{rel_id_counter}"
                rel_id_counter += 1
                old_to_new_rel_id[old_id] = new_id
                new_drawing_rels_xml += f'<Relationship Id="{new_id}" Type="{rel_type}" Target="{new_target}"/>'
            else:
                # Non-image relationship (e.g., chart), keep as-is but with new ID
                new_id = f"rId{rel_id_counter}"
                rel_id_counter += 1
                old_to_new_rel_id[old_id] = new_id
                new_drawing_rels_xml += f'<Relationship Id="{new_id}" Type="{rel_type}" Target="{target}"/>'
        new_drawing_rels_xml += "</Relationships>"

        # Update drawing XML: replace r:embed attributes with new rel IDs
        # Một lượt, theo bảng ánh xạ (thay tuần tự rId1->rId2 rồi rId2->rId3 sẽ đổi hai lần)
        new_drawing_xml = re.sub(
            r'(r:(?:embed|link|id)\s*=\s*(["\']))([^"\']*)\2',
            lambda m: f"{m.group(1)}{old_to_new_rel_id.get(m.group(3), m.group(3))}{m.group(2)}",
            source_drawing_xml,
        )

        # 7. Determine output drawing path (reuse LibreOffice's drawingN.xml numbering or create new)
        out_rels_path = out_entry_path.replace("/worksheets/", "/worksheets/_rels/") + ".rels"
        out_rels_bytes = replacements.get(out_rels_path)
        if out_rels_bytes is None:
            out_rels_bytes = read_zip_entry(xlsx_bytes, out_rels_path)
        if not out_rels_bytes:
            continue
        out_rels_xml = out_rels_bytes.decode("utf-8", errors="replace") if isinstance(out_rels_bytes, bytes) else out_rels_bytes

        # Find existing drawing relationship in output
        out_drawing_rel_id = None
        out_drawing_path = None
        for m in re.finditer(
            r"<Relationship\b([^>]*)/?>",
            out_rels_xml,
            re.IGNORECASE,
        ):
            attrs = m.group(1)
            type_match = re.search(r'Type="([^"]*)"', attrs)
            target_match = re.search(r'Target="([^"]*)"', attrs)
            id_match = re.search(r'Id="([^"]*)"', attrs)
            if not (type_match and target_match and id_match):
                continue
            if "drawing" not in type_match.group(1).lower():
                continue
            out_drawing_rel_id = id_match.group(1)
            target = target_match.group(1)
            if target.startswith("../"):
                target = target[3:]
            elif target.startswith("./"):
                target = target[2:]
            out_drawing_path = f"xl/{target}"
            break

        if not out_drawing_rel_id or not out_drawing_path:
            continue

        # 8. Write restored drawing XML and rels to replacements
        replacements[out_drawing_path] = new_drawing_xml
        out_drawing_rels_path = out_drawing_path.replace("/drawings/", "/drawings/_rels/") + ".rels"
        replacements[out_drawing_rels_path] = new_drawing_rels_xml

        # 9. Write media files
        for media_path, content in media_content.items():
            replacements[media_path] = content

        # 10. Update [Content_Types].xml
        ct_xml = replacements.get("[Content_Types].xml")
        if ct_xml is None:
            ct_bytes = read_zip_entry(xlsx_bytes, "[Content_Types].xml")
            ct_xml = ct_bytes.decode("utf-8", errors="replace") if ct_bytes else ""

        # Add Override for drawing if not present
        drawing_part_name = f"/{out_drawing_path}"
        if not re.search(rf'Override PartName="{re.escape(drawing_part_name)}"', ct_xml):
            drawing_override = f'<Override PartName="{drawing_part_name}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
            ct_xml = ct_xml.replace("</Types>", f"{drawing_override}</Types>")

        # Add Default for image extensions if not present
        for ext, ct in media_content_types.items():
            if not re.search(rf'Default Extension="{ext}"', ct_xml):
                default_entry = f'<Default Extension="{ext}" ContentType="{ct}"/>'
                ct_xml = ct_xml.replace("</Types>", f"{default_entry}</Types>")

        replacements["[Content_Types].xml"] = ct_xml

        # 11. Remove LibreOffice's drawing XML (the one it generated) from replacements
        # by setting it to None — but keep the restored one above
        # The LibreOffice drawing is at out_drawing_path, which we just overwrote with restored
        # So we don't need to do anything extra — the restored one wins.

    return


_MAIN_NS_PREFIX_RE = re.compile(r'xmlns:([A-Za-z_][\w.-]*)="http://schemas\.openxmlformats\.org/spreadsheetml/2006/main"')


def normalize_source_xlsx(xlsx_bytes: bytes | None) -> bytes | None:
    """S23: XLSX ghi SpreadsheetML với tiền tố (`<x:workbook xmlns:x="…/spreadsheetml/2006/main"><x:sheet>`, `<x:c>`
    — lan23, phần mềm kế toán xuất) làm MỌI regex `<sheet\\b`/`<c\\b`/`<row\\b` của overlay lúc mở và hậu xử lý lúc lưu
    không thấy gì: không có vno:xf, không khôi phục gì (đo 19/9: auditor cũng đọc 0 sheet → 627 lệch bị che). Bỏ tiền
    tố của namespace chính trong mọi part .xml một lần ở cửa vào; các tiền tố khác (r:, mc:, x14ac:) giữ nguyên."""
    if not xlsx_bytes:
        return xlsx_bytes
    try:
        with zipfile.ZipFile(io.BytesIO(xlsx_bytes), "r") as zin:
            names = zin.namelist()
            wb = zin.read(XLSX_WORKBOOK_ENTRY).decode("utf-8", errors="replace") if XLSX_WORKBOOK_ENTRY in names else ""
            m = _MAIN_NS_PREFIX_RE.search(wb)
            if not m:
                return xlsx_bytes
            out = io.BytesIO()
            with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zout:
                for info in zin.infolist():
                    data = zin.read(info.filename)
                    if info.filename.startswith("xl/") and info.filename.endswith(".xml"):
                        text = data.decode("utf-8", errors="replace")
                        pm = _MAIN_NS_PREFIX_RE.search(text)
                        if pm:
                            p = re.escape(pm.group(1))
                            text = re.sub(rf"<(/?){p}:", r"<\1", text)
                            data = text.encode("utf-8")
                    zout.writestr(info, data)
            return out.getvalue()
    except (zipfile.BadZipFile, KeyError, OSError, ValueError):
        return xlsx_bytes


def overlay_sheet_xlsx_fods(
    xlsx_bytes: bytes,
    fods_xml: str | None,
    *,
    skip_initial_xf: bool = False,
) -> str:
    """Read the original XLSX ZIP and overlay FODS.

    LibreOffice XLSX→FODS drops lockStructure, Freeze Panes, veryHidden
    sheet state, and AutoFilter database-ranges — all confirmed via real
    soffice round-trips.  Production File → Mở must restore them before
    SheetAdapter.parseFods().
    """
    xlsx_bytes = normalize_source_xlsx(xlsx_bytes)
    xml = fods_xml or ""
    current = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
    if current:
        workbook_xml = current.decode("utf-8", errors="replace")
        xml = overlay_fods_structure_protection(xml, workbook_xml)
        # Sheet visibility (veryHidden → vno:sheet-state): soffice downgrades
        # veryHidden to hidden during XLSX→FODS, so we read the original state
        # and write vno:sheet-state for round-trip fidelity.
        visibility = parse_sheet_visibility_from_workbook(workbook_xml)
        if visibility:
            xml = apply_sheet_visibility_to_fods(xml, visibility)
        # Active sheet (activeTab -> ActiveTable): soffice headless drops
        # ActiveTable in office:settings, so we restore it from xl/workbook.xml.
        xml = overlay_active_sheet_to_fods(xml, workbook_xml)
        # LibreOffice drops _xlnm.Print_Titles during XLSX -> FODS.
        xml = apply_print_titles_to_fods(xml, parse_print_titles_from_workbook(workbook_xml))
    xml = overlay_page_margins_to_fods(xlsx_bytes, xml)
    xml = overlay_sheet_xlsx_freeze_panes(xlsx_bytes, xml)
    # AutoFilter: read <autoFilter ref> from original worksheet XMLs and
    # inject <table:database-ranges> into FODS so parseFods can restore
    # the filter state.
    xml = _overlay_autofilter_from_xlsx(xlsx_bytes, xml)
    xml = _overlay_sheet_layout_from_xlsx(xlsx_bytes, xml)
    xml = _overlay_sheet_cell_metadata_from_xlsx(
        xlsx_bytes,
        xml,
        include_xf=not skip_initial_xf,
    )
    xml = _promote_covered_formula_errors(xml)
    # Sheet tab colors: read from original XLSX worksheet XMLs and write
    # vno:tab-color to FODS table:table elements for round-trip fidelity.
    tab_colors = parse_tab_colors_from_xlsx(xlsx_bytes)
    if tab_colors:
        xml = apply_tab_colors_to_fods(xml, tab_colors)
    # Drawing images: overlay vno:image-id on <draw:frame> elements
    xml = _overlay_sheet_drawing_image_ids(xlsx_bytes, xml)
    # Scenarios: overlay vno:scenarios from XLSX worksheet XMLs
    xml = _overlay_scenarios_from_xlsx(xlsx_bytes, xml)
    return xml


def overlay_sheet_xlsx_fods_p1(
    xlsx_bytes: bytes,
    fods_xml: str | None,
    *,
    skip_initial_xf: bool = False,
) -> str:
    """P1 equivalent of :func:`overlay_sheet_xlsx_fods` with a faster metadata pass."""
    xlsx_bytes = normalize_source_xlsx(xlsx_bytes)
    xml = fods_xml or ""
    # Big FODS: the steps that only touch table opening tags / the document head run on a skeleton (every table
    # body cut out), so they stop rebuilding a 250 MB string once each. The bodies are put back once, afterwards.
    # VNO_OVERLAY_SKELETON=0 keeps the original whole-document sequence.
    bodies: list[str] = []
    skeleton = (
        len(xml) > _P1_PARALLEL_FODS_CHARS
        and os.environ.get("VNO_OVERLAY_SKELETON", "").strip() != "0"
        and os.environ.get("VNO_FODS_TABLE_REGEX") != "1"
    )
    if skeleton:
        def _stash_body(span) -> str:
            bodies.append(span.group(2))
            return span.group(1) + span.group(3)

        xml = _sub_fods_tables(xml, _stash_body)
        skeleton = bool(bodies)
    current = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
    if current:
        workbook_xml = current.decode("utf-8", errors="replace")
        xml = overlay_fods_structure_protection(xml, workbook_xml)
        visibility = parse_sheet_visibility_from_workbook(workbook_xml)
        if visibility:
            xml = apply_sheet_visibility_to_fods(xml, visibility)
        xml = overlay_active_sheet_to_fods(xml, workbook_xml)
        xml = apply_print_titles_to_fods(xml, parse_print_titles_from_workbook(workbook_xml))
    xml = overlay_page_margins_to_fods(xlsx_bytes, xml)
    xml = overlay_sheet_xlsx_freeze_panes(xlsx_bytes, xml)
    xml = _overlay_autofilter_from_xlsx(xlsx_bytes, xml)
    xml = _overlay_sheet_layout_from_xlsx(xlsx_bytes, xml)
    tab_colors = parse_tab_colors_from_xlsx(xlsx_bytes)
    if skeleton:
        if tab_colors:
            xml = apply_tab_colors_to_fods(xml, tab_colors)
        xml = _overlay_scenarios_from_xlsx(xlsx_bytes, xml)
        xml = _put_back_table_bodies(xml, bodies)
        bodies = None
    xml = _overlay_sheet_cell_metadata_from_xlsx_p1(
        xlsx_bytes,
        xml,
        include_xf=not skip_initial_xf,
    )
    xml = _promote_covered_formula_errors(xml)
    if not skeleton:
        if tab_colors:
            xml = apply_tab_colors_to_fods(xml, tab_colors)
    xml = _overlay_sheet_drawing_image_ids(xlsx_bytes, xml)
    if not skeleton:
        xml = _overlay_scenarios_from_xlsx(xlsx_bytes, xml)
    return xml


def _put_back_table_bodies(skeleton_xml: str, bodies: list[str]) -> str:
    """Inverse of the body stash in overlay_sheet_xlsx_fods_p1: i-th table gets the i-th body back (one join)."""
    odd = _FODS_TABLE_ODD_CLOSE_RE.search(skeleton_xml) is not None
    index = 0

    def put_back(span):
        nonlocal index
        if index >= len(bodies):
            raise ValueError("table count changed while overlaying the sheet head")
        body = bodies[index]
        index += 1
        if odd:
            return span.group(1) + body + span.group(3)
        return [span.group(1), body, span.group(3)]

    result = _sub_fods_tables(skeleton_xml, put_back)
    if index != len(bodies):
        raise ValueError("table count changed while overlaying the sheet head")
    return result


def _xml_attrs(raw: str) -> dict[str, str]:
    """Thuộc tính XML. Cùng kết quả finditer `([\\w:.-]+)\\s*=\\s*(quote)…\\2`, không biên dịch regex mỗi ô."""
    if not raw:
        return {}
    result: dict[str, str] = {}
    n = len(raw)
    i = 0
    while i < n:
        while i < n and not _is_xml_name_char(raw[i]):
            i += 1
        if i >= n:
            break
        start = i
        i += 1
        while i < n and _is_xml_name_char(raw[i]):
            i += 1
        name = raw[start:i]
        while i < n and raw[i] in " \t\r\n":
            i += 1
        if i >= n or raw[i] != "=":
            continue
        i += 1
        while i < n and raw[i] in " \t\r\n":
            i += 1
        if i >= n or raw[i] not in "\"'":
            continue
        quote = raw[i]
        i += 1
        end = raw.find(quote, i)
        if end < 0:
            break
        value = raw[i:end]
        if "&" in value:
            value = _unescape_xml(value)
        result[name] = value
        i = end + 1
    return result


def _xlsx_number_formats(xlsx_bytes: bytes) -> list[str]:
    entry = read_zip_entry(xlsx_bytes, XLSX_STYLES_ENTRY)
    if not entry:
        return []
    styles_xml = entry.decode("utf-8", errors="replace")
    formats = dict(EXCEL_BUILTIN_NUMBER_FORMATS)
    for match in re.finditer(r"<numFmt\b([^>]*)/?\s*>", styles_xml, re.IGNORECASE):
        attrs = _xml_attrs(match.group(1))
        if attrs.get("numFmtId", "").isdigit() and attrs.get("formatCode") is not None:
            formats[int(attrs["numFmtId"])] = attrs["formatCode"]
    body = re.search(r"<cellXfs\b[^>]*>([\s\S]*?)</cellXfs>", styles_xml, re.IGNORECASE)
    result = []
    for match in re.finditer(r"<xf\b([^>]*)/?\s*>", body.group(1) if body else "", re.IGNORECASE):
        attrs = _xml_attrs(match.group(1))
        result.append(formats.get(int(attrs.get("numFmtId") or 0), "General"))
    return result


_INDEX_MISS = object()
_INDEX_MEMO: dict[str, tuple[bytes, object]] = {}


def _index_memo_get(name: str, blob: bytes):
    slot = _INDEX_MEMO.get(name)
    if slot is not None and slot[0] is blob:
        return slot[1]
    return _INDEX_MISS


def _index_memo_put(name: str, blob: bytes, value: object) -> None:
    """Giữ một file gần nhất. reoverlay gọi lại cùng bytes sau normalize không đổi."""
    _INDEX_MEMO[name] = (blob, value)


def _xlsx_cells_with_number_formats(xlsx_bytes: bytes) -> dict[str, dict[tuple[int, int], str]]:
    cached = _index_memo_get("numfmts", xlsx_bytes)
    if cached is not _INDEX_MISS:
        return cached
    xfs = _xlsx_number_formats(xlsx_bytes)
    result = {}
    for sheet_name, entry_path in _resolve_xlsx_sheet_entries(xlsx_bytes).items():
        entry = read_zip_entry(xlsx_bytes, entry_path)
        cells = {}
        if entry:
            for match in re.finditer(r"<c\b([^>]*?)(?:>([\s\S]*?)</c>|/\s*>)", entry.decode("utf-8", errors="replace"), re.IGNORECASE):
                attrs, body = _xml_attrs(match.group(1)), match.group(2) or ""
                coord = re.fullmatch(r"([A-Z]+)(\d+)", attrs.get("r", ""), re.IGNORECASE)
                style_index = int(attrs.get("s") or 0)
                if not coord or not (0 <= style_index < len(xfs)):
                    continue
                code = xfs[style_index]
                if code.lower() == "general":
                    continue
                column = 0
                for char in coord.group(1).upper():
                    column = column * 26 + ord(char) - 64
                cells[(int(coord.group(2)), column)] = code
        if cells:
            result[sheet_name] = cells
    _index_memo_put("numfmts", xlsx_bytes, result)
    return result


def _xlsx_cells_with_xf_indices(xlsx_bytes: bytes) -> dict[str, dict[tuple[int, int], int]]:
    cached = _index_memo_get("xf", xlsx_bytes)
    if cached is not _INDEX_MISS:
        return cached
    """Extract cell style indices (xf) from original XLSX for all cells in used range.
    
    Returns {sheet_name: {(row, col): xf_index}} including style-only cells.
    """
    result = {}
    for sheet_name, entry_path in _resolve_xlsx_sheet_entries(xlsx_bytes).items():
        entry = read_zip_entry(xlsx_bytes, entry_path)
        cells = {}
        if entry:
            sheet_xml = entry.decode("utf-8", errors="replace")
            for match in re.finditer(r"<c\b([^>]*?)(?:>([\s\S]*?)</c>|/\s*>)", sheet_xml, re.IGNORECASE):
                attrs, body = _xml_attrs(match.group(1)), match.group(2) or ""
                coord = re.fullmatch(r"([A-Z]+)(\d+)", attrs.get("r", ""), re.IGNORECASE)
                style_index = int(attrs.get("s") or 0)
                if not coord:
                    continue
                column = 0
                for char in coord.group(1).upper():
                    column = column * 26 + ord(char) - 64
                cells[(int(coord.group(2)), column)] = style_index
        if cells:
            result[sheet_name] = cells
    _index_memo_put("xf", xlsx_bytes, result)
    return result


_VNO_XF_RE = re.compile(r'\s+vno:xf\s*=\s*(["\'])\d+\1', re.IGNORECASE)
_VNO_XF_FAST_RE = re.compile(r' vno:xf="[0-9]+"')


def strip_vno_xf_attributes(fods_xml: str) -> str:
    """Remove every vno:xf attribute, giving the result of _VNO_XF_RE.sub("", fods_xml) much faster.

    The general rule starts with \\s+ and ignores case, so the regex engine tests every blank of a 300 MB FODS
    (4.6 s on lan14). The attributes this code writes are always ` vno:xf="N"` with one leading blank, which a
    literal-prefix pattern strips at C speed; anything of another shape that remains is then removed by the
    general rule, so the output is the same. VNO_STRIP_XF_REGEX=1 uses only the general rule.
    """
    if "vno:xf" not in fods_xml:
        return fods_xml
    if os.environ.get("VNO_STRIP_XF_REGEX") == "1":
        return _VNO_XF_RE.sub("", fods_xml)
    stripped = _VNO_XF_FAST_RE.sub("", fods_xml)
    if "vno:xf" in stripped:
        stripped = _VNO_XF_RE.sub("", stripped)
    return stripped
_CELL_OPEN_RE = re.compile(r"<(table:(?:table-cell|covered-table-cell))\b([^>]*?)(/?)>", re.IGNORECASE)


def _stamp_table_cell_attr(cell_xml: str, addition: str, existing_re: re.Pattern[str]) -> str | None:
    """Chèn addition trước '/' hoặc '>' của thẻ mở table:table-cell. None nếu không phải dạng thường."""
    if not cell_xml.startswith("<table:table-cell"):
        return None
    end = cell_xml.find(">")
    if end < 0:
        return None
    opening = cell_xml[:end]
    slash = ""
    if opening.endswith("/"):
        opening = opening[:-1]
        slash = "/"
    if existing_re.search(opening):
        opening = existing_re.sub("", opening, count=1)
    return opening + addition + slash + ">" + cell_xml[end + 1 :]


def _set_orig_xf_attr(cell_xml: str, xf_index: int) -> str:
    if cell_xml.startswith("<table:covered-table-cell"):
        opening = _CELL_OPEN_RE.match(cell_xml)
        covered_formula = opening and re.search(r"\btable:formula=", opening.group(2), re.IGNORECASE)
        if not opening or not covered_formula:
            return cell_xml
        attrs = _VNO_XF_RE.sub("", opening.group(2), count=1)
        tag = f'<{opening.group(1)}{attrs} vno:xf="{xf_index}"{opening.group(3)}>'
        return tag + cell_xml[opening.end() :]
    stamped = _stamp_table_cell_attr(cell_xml, f' vno:xf="{xf_index}"', _VNO_XF_RE)
    if stamped is not None:
        return stamped
    opening = _CELL_OPEN_RE.match(cell_xml)
    if not opening:
        return cell_xml
    attrs = _VNO_XF_RE.sub("", opening.group(2), count=1)
    tag = f'<{opening.group(1)}{attrs} vno:xf="{xf_index}"{opening.group(3)}>'
    return tag + cell_xml[opening.end() :]


def _overlay_xf_indices_in_row(row_xml: str, targets: dict[int, int]) -> str:
    pieces, cursor, column = [], 0, 1
    sorted_columns, target_index = sorted(targets), 0
    for start, end in _flat_xml_blocks(row_xml, ("table:table-cell", "table:covered-table-cell")):
        pieces.append(row_xml[cursor:start])
        cell = row_xml[start:end]
        repeat = _repeat_count(cell, "table:number-columns-repeated")
        while target_index < len(sorted_columns) and sorted_columns[target_index] < column:
            target_index += 1
        hit_end = target_index
        while hit_end < len(sorted_columns) and sorted_columns[hit_end] < column + repeat:
            hit_end += 1
        hits = [(col, targets[col]) for col in sorted_columns[target_index:hit_end]]
        target_index = hit_end
        if not hits:
            pieces.append(cell)
        else:
            at = column
            for col, xf_idx in hits:
                if col > at:
                    pieces.append(_set_repeat(cell, "table:number-columns-repeated", col - at))
                pieces.append(_set_orig_xf_attr(_set_repeat(cell, "table:number-columns-repeated", 1), xf_idx))
                at = col + 1
            if at < column + repeat:
                pieces.append(_set_repeat(cell, "table:number-columns-repeated", column + repeat - at))
        cursor, column = end, column + repeat
    pieces.append(row_xml[cursor:])
    return "".join(pieces)


def _overlay_xf_indices_in_table(table_xml: str, targets: dict[tuple[int, int], int]) -> str:
    pieces, cursor, row_number, rows = [], 0, 1, {}
    for (row, col), xf_idx in targets.items():
        rows.setdefault(row, {})[col] = xf_idx
    sorted_rows, target_index = sorted(rows), 0
    for start, end in _flat_xml_blocks(table_xml, ("table:table-row",)):
        pieces.append(table_xml[cursor:start])
        row_xml = table_xml[start:end]
        repeat = _repeat_count(row_xml, "table:number-rows-repeated")
        while target_index < len(sorted_rows) and sorted_rows[target_index] < row_number:
            target_index += 1
        hit_end = target_index
        while hit_end < len(sorted_rows) and sorted_rows[hit_end] < row_number + repeat:
            hit_end += 1
        hits = sorted_rows[target_index:hit_end]
        target_index = hit_end
        if not hits:
            pieces.append(row_xml)
        else:
            at = row_number
            for row in hits:
                if row > at:
                    pieces.append(_set_repeat(row_xml, "table:number-rows-repeated", row - at))
                pieces.append(_overlay_xf_indices_in_row(_set_repeat(row_xml, "table:number-rows-repeated", 1), rows[row]))
                at = row + 1
            if at < row_number + repeat:
                pieces.append(_set_repeat(row_xml, "table:number-rows-repeated", row_number + repeat - at))
        cursor, row_number = end, row_number + repeat
    pieces.append(table_xml[cursor:])
    return "".join(pieces)


def _overlay_sheet_xf_indices_from_xlsx(
    xlsx_bytes: bytes,
    fods_xml: str,
    by_sheet: dict[str, dict[tuple[int, int], int]] | None = None,
) -> str:
    if by_sheet is None:
        by_sheet = _xlsx_cells_with_xf_indices(xlsx_bytes)
    if not by_sheet:
        return fods_xml
    pieces, cursor = [], 0
    for start, end in _flat_xml_blocks(fods_xml, ("table:table",)):
        pieces.append(fods_xml[cursor:start])
        table_xml = fods_xml[start:end]
        attrs = _xml_attrs(re.match(r"<[^>]+", table_xml).group(0))
        targets = by_sheet.get(attrs.get("table:name", ""))
        pieces.append(_overlay_xf_indices_in_table(table_xml, targets) if targets else table_xml)
        cursor = end
    pieces.append(fods_xml[cursor:])
    result = "".join(pieces)
    if _declares_vno_namespace(result):
        return result
    match = _OFFICE_DOCUMENT_OPEN_RE.search(result)
    if not match:
        return result
    return result[:match.start()] + f'<office:document{match.group(1)} xmlns:vno="{SHEET_VNO_NS}">' + result[match.end():]


def _overlay_sheet_cell_metadata_from_xlsx(
    xlsx_bytes: bytes,
    fods_xml: str,
    *,
    include_xf: bool = True,
) -> str:
    """Overlay number format, original string, and original XF in one FODS pass.

    The three metadata values are read independently from the source XLSX. Their
    historical application order is format -> string -> XF; preserve it for a
    cell while sharing the row/cell traversal.
    """
    formats, strings, xfs = _xlsx_cells_with_metadata(xlsx_bytes)
    if not include_xf:
        xfs = {}
    if not formats and not strings and not xfs:
        return fods_xml

    def metadata_rows(mapping, sheet_name):
        rows = {}
        for (row, col), value in mapping.get(sheet_name, {}).items():
            rows.setdefault(row, {})[col] = value
        return rows

    def apply_row(row_xml, format_targets, string_targets, xf_targets):
        columns = {}
        for source, kind in ((format_targets, "format"), (string_targets, "string"), (xf_targets, "xf")):
            for col, value in source.items():
                columns.setdefault(col, {})[kind] = value
        pieces, cursor, column = [], 0, 1
        sorted_columns = sorted(columns)
        target_index = 0
        for start, end in _flat_xml_blocks(row_xml, ("table:table-cell", "table:covered-table-cell")):
            pieces.append(row_xml[cursor:start])
            cell = row_xml[start:end]
            repeat = _repeat_count(cell, "table:number-columns-repeated")
            while target_index < len(sorted_columns) and sorted_columns[target_index] < column:
                target_index += 1
            hit_end = target_index
            while hit_end < len(sorted_columns) and sorted_columns[hit_end] < column + repeat:
                hit_end += 1
            hits = sorted_columns[target_index:hit_end]
            target_index = hit_end
            if not hits:
                pieces.append(cell)
            else:
                at = column
                for col in hits:
                    meta = columns[col]
                    if col > at:
                        pieces.append(_set_repeat(cell, "table:number-columns-repeated", col - at))
                    stamped = _set_repeat(cell, "table:number-columns-repeated", 1)
                    if "format" in meta:
                        stamped = _set_number_format_attr(stamped, meta["format"])
                    # Historically covered formula errors were promoted between
                    # number-format and string/XF passes. Preserve that dependency
                    # for targeted cells while keeping one cell traversal.
                    if stamped.startswith("<table:covered-table-cell") and "table:formula=" in stamped:
                        stamped = _promote_covered_formula_errors(stamped)
                    if "string" in meta:
                        stamped = _set_original_string_attr(stamped, meta["string"])
                    if "xf" in meta:
                        stamped = _set_orig_xf_attr(stamped, meta["xf"])
                    pieces.append(stamped)
                    at = col + 1
                if at < column + repeat:
                    pieces.append(_set_repeat(cell, "table:number-columns-repeated", column + repeat - at))
            cursor, column = end, column + repeat
        pieces.append(row_xml[cursor:])
        return "".join(pieces)

    pieces, cursor = [], 0
    needs_vno = bool(formats or xfs)
    for start, end in _flat_xml_blocks(fods_xml, ("table:table",)):
        pieces.append(fods_xml[cursor:start])
        table_xml = fods_xml[start:end]
        table_match = re.match(r"<[^>]+", table_xml)
        attrs = _xml_attrs(table_match.group(0)) if table_match else {}
        sheet_name = attrs.get("table:name", "")
        row_maps = [metadata_rows(mapping, sheet_name) for mapping in (formats, strings, xfs)]
        if any(row_maps):
            table_parts, table_cursor, row_number = [], 0, 1
            sorted_rows = sorted(set().union(*(mapping.keys() for mapping in row_maps)))
            target_index = 0
            for row_start, row_end in _flat_xml_blocks(table_xml, ("table:table-row",)):
                table_parts.append(table_xml[table_cursor:row_start])
                row_xml = table_xml[row_start:row_end]
                repeat = _repeat_count(row_xml, "table:number-rows-repeated")
                while target_index < len(sorted_rows) and sorted_rows[target_index] < row_number:
                    target_index += 1
                hit_end = target_index
                while hit_end < len(sorted_rows) and sorted_rows[hit_end] < row_number + repeat:
                    hit_end += 1
                hits = sorted_rows[target_index:hit_end]
                target_index = hit_end
                if not hits:
                    table_parts.append(row_xml)
                else:
                    at = row_number
                    for row in hits:
                        if row > at:
                            table_parts.append(_set_repeat(row_xml, "table:number-rows-repeated", row - at))
                        table_parts.append(apply_row(
                            _set_repeat(row_xml, "table:number-rows-repeated", 1),
                            row_maps[0].get(row, {}), row_maps[1].get(row, {}), row_maps[2].get(row, {}),
                        ))
                        at = row + 1
                    if at < row_number + repeat:
                        table_parts.append(_set_repeat(row_xml, "table:number-rows-repeated", row_number + repeat - at))
                table_cursor, row_number = row_end, row_number + repeat
            table_parts.append(table_xml[table_cursor:])
            table_xml = "".join(table_parts)
        pieces.append(table_xml)
        cursor = end
    pieces.append(fods_xml[cursor:])
    result = "".join(pieces)
    if needs_vno and not _declares_vno_namespace(result):
        match = _OFFICE_DOCUMENT_OPEN_RE.search(result)
        if match:
            result = result[:match.start()] + f'<office:document{match.group(1)} xmlns:vno="{SHEET_VNO_NS}">' + result[match.end():]
    return result


def _xlsx_cells_with_metadata(xlsx_bytes: bytes):
    """Build number-format, original-string, and XF maps in one XLSX cell scan."""
    cached = _index_memo_get("sheet_metadata", xlsx_bytes)
    if cached is not _INDEX_MISS:
        return cached
    format_by_xf = _xlsx_number_formats(xlsx_bytes)
    shared_xml = (read_zip_entry(xlsx_bytes, "xl/sharedStrings.xml") or b"").decode("utf-8", errors="replace")
    shared = []
    for item in re.finditer(r"<si\b[^>]*>([\s\S]*?)</si>", shared_xml, re.IGNORECASE):
        shared.append("".join(_unescape_xml(m.group(1)) for m in re.finditer(r"<t\b[^>]*>([\s\S]*?)</t>", item.group(1), re.IGNORECASE)))

    formats, strings, xfs = {}, {}, {}
    coordinate_re = re.compile(r"([A-Z]+)(\d+)", re.IGNORECASE)
    value_re = re.compile(r"<v\b[^>]*>([\s\S]*?)</v>", re.IGNORECASE)
    text_re = re.compile(r"<t\b[^>]*>([\s\S]*?)</t>", re.IGNORECASE)
    for sheet_name, entry_path in _resolve_xlsx_sheet_entries(xlsx_bytes).items():
        entry = read_zip_entry(xlsx_bytes, entry_path)
        if not entry:
            continue
        sheet_formats, sheet_strings, sheet_xfs = {}, {}, {}
        sheet_xml = entry.decode("utf-8", errors="replace")
        for attrs_text, body in _iter_xlsx_cell_parts(sheet_xml):
            attrs = _xml_attrs(attrs_text)
            coord = coordinate_re.fullmatch(attrs.get("r", ""))
            if not coord:
                continue
            column = 0
            for char in coord.group(1).upper():
                column = column * 26 + ord(char) - 64
            key = (int(coord.group(2)), column)
            style_index = int(attrs.get("s") or 0)
            sheet_xfs[key] = style_index
            if 0 <= style_index < len(format_by_xf):
                code = format_by_xf[style_index]
                if code.lower() != "general":
                    sheet_formats[key] = code

            kind = attrs.get("t", "").lower()
            if kind not in {"s", "str", "inlinestr"}:
                continue
            if kind == "s":
                raw = value_re.search(body)
                value = shared[int(raw.group(1))] if raw and int(raw.group(1)) < len(shared) else ""
            else:
                text_values = text_re.findall(body)
                raw_value = value_re.search(body)
                value = "".join(_unescape_xml(item) for item in text_values) or (_unescape_xml(raw_value.group(1)) if raw_value else "")
            sheet_strings[key] = value
        if sheet_formats:
            formats[sheet_name] = sheet_formats
        if sheet_strings:
            strings[sheet_name] = sheet_strings
        if sheet_xfs:
            xfs[sheet_name] = sheet_xfs
    result = (formats, strings, xfs)
    _index_memo_put("sheet_metadata", xlsx_bytes, result)
    return result


_P1_CELL_TARGET_ATTR_RE = re.compile(
    r"(?:^|\s)(r|s|t)\s*=\s*([\"'])(.*?)\2",
    re.IGNORECASE | re.DOTALL,
)
_P1_COORD_RE = re.compile(r"([A-Z]+)(\d+)", re.IGNORECASE)
_P1_VALUE_RE = re.compile(r"<v\b[^>]*>([\s\S]*?)</v>", re.IGNORECASE)
_P1_TEXT_RE = re.compile(r"<t\b[^>]*>([\s\S]*?)</t>", re.IGNORECASE)
_P1_FODS_TABLE_BLOCK_RE = re.compile(
    r"<table:table(?=[\s>/])[^>]*>[\s\S]*?</table:table\s*>", re.IGNORECASE
)
_P1_FODS_ROW_BLOCK_RE = re.compile(
    r"<table:table-row(?=[\s>/])[^>]*?(?:/\s*>|>[\s\S]*?</table:table-row\s*>)",
    re.IGNORECASE,
)
_P1_FODS_CELL_BLOCK_RE = re.compile(
    r"<table:(?:table-cell|covered-table-cell)(?=[\s>/])[^>]*?(?:/\s*>|>[\s\S]*?</table:(?:table-cell|covered-table-cell)\s*>)",
    re.IGNORECASE,
)
_P1_COL_REPEAT_WITH_WS_RE = re.compile(
    r'\s+table:number-columns-repeated\s*=\s*(["\'])(\d+)\1'
)
_P1_PARALLEL_FODS_CHARS = 20 * 1024 * 1024
# Inside a big document, tables from this size on are split across the pool too (the smaller ones used to run serially in the parent).
_P1_TABLE_PARALLEL_MIN_CHARS = int(os.environ.get("VNO_P1_TABLE_MIN_CHARS", "").strip() or 0) or 2 * 1024 * 1024
def _p1_default_workers() -> int:
    """Pool size: VNO_P1_WORKERS if set; otherwise 6 on machines with >= 8 logical CPUs (measured on 8: lan14
    chain 34.0 -> 32.0 s, 8 workers 31.1 s), else 4 as before."""
    value = os.environ.get("VNO_P1_WORKERS", "").strip()
    if value.isdigit() and int(value) >= 1:
        return int(value)
    return 6 if (os.cpu_count() or 4) >= 8 else 4


_P1_MAX_WORKERS = _p1_default_workers()
_P1_PROCESS_POOL: ProcessPoolExecutor | None = None


def _p1_parent_alive(parent_pid: int) -> bool:
    try:
        if os.name == "nt":
            import ctypes
            from ctypes import wintypes

            kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
            kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
            kernel32.OpenProcess.restype = wintypes.HANDLE
            kernel32.GetExitCodeProcess.argtypes = [wintypes.HANDLE, ctypes.POINTER(wintypes.DWORD)]
            kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
            handle = kernel32.OpenProcess(0x1000, False, int(parent_pid))  # PROCESS_QUERY_LIMITED_INFORMATION
            if not handle:
                return False
            try:
                code = wintypes.DWORD()
                return bool(kernel32.GetExitCodeProcess(handle, ctypes.byref(code))) and code.value == 259  # STILL_ACTIVE
            finally:
                kernel32.CloseHandle(handle)
        return os.getppid() == int(parent_pid)
    except Exception:
        return True  # when unsure, never kill a healthy worker


def _p1_worker_init(parent_pid: int) -> None:
    """Pool worker start-up: exit when the app process that owns the pool disappears.

    Without this, a worker whose parent was killed or crashed while a big workbook was opening kept running for
    hours (32 orphans, ~770 MB, seen after test runs). Workers are idle between jobs, so a 2 s poll costs nothing.
    """
    import threading
    import time as _time

    def watch() -> None:
        while True:
            _time.sleep(2.0)
            if not _p1_parent_alive(parent_pid):
                os._exit(0)

    threading.Thread(target=watch, name="vno-p1-parent-watch", daemon=True).start()


def _p1_process_pool() -> ProcessPoolExecutor:
    global _P1_PROCESS_POOL
    if _P1_PROCESS_POOL is None:
        # "spawn" everywhere: it is already the default on Windows and macOS, and avoids fork-with-threads on Linux.
        _P1_PROCESS_POOL = ProcessPoolExecutor(
            max_workers=_P1_MAX_WORKERS,
            mp_context=multiprocessing.get_context("spawn"),
            initializer=_p1_worker_init,
            initargs=(os.getpid(),),
        )
    return _P1_PROCESS_POOL


def _shutdown_p1_process_pool() -> None:
    global _P1_PROCESS_POOL
    pool, _P1_PROCESS_POOL = _P1_PROCESS_POOL, None
    if pool is not None:
        pool.shutdown(wait=True)


def _p1_cell_attributes(raw: str) -> tuple[str, int, str]:
    """Read r/s/t once without running three regex searches per XLSX cell."""
    coordinate = ""
    style_index = 0
    kind = ""
    index = 0
    length = len(raw)
    while index < length:
        while index < length and raw[index] in " \t\r\n/":
            index += 1
        name_start = index
        while index < length and _is_xml_name_char(raw[index]):
            index += 1
        if name_start == index:
            index += 1
            continue
        name = raw[name_start:index].lower()
        while index < length and raw[index] in " \t\r\n":
            index += 1
        if index >= length or raw[index] != "=":
            continue
        index += 1
        while index < length and raw[index] in " \t\r\n":
            index += 1
        if index >= length or raw[index] not in "\"'":
            continue
        quote = raw[index]
        value_start = index + 1
        value_end = raw.find(quote, value_start)
        if value_end < 0:
            break
        if name == "r":
            coordinate = raw[value_start:value_end]
        elif name == "s":
            value = raw[value_start:value_end]
            style_index = int(value) if value.isdigit() else 0
        elif name == "t":
            kind = raw[value_start:value_end].lower()
        index = value_end + 1
    return coordinate, style_index, kind


def _p1_coordinate_key(coordinate: str) -> tuple[int, int] | None:
    split = 0
    length = len(coordinate)
    column = 0
    while split < length:
        code = ord(coordinate[split])
        if 97 <= code <= 122:
            code -= 32
        if not 65 <= code <= 90:
            break
        column = column * 26 + code - 64
        split += 1
    if split == 0 or split == length:
        return None
    row_text = coordinate[split:]
    if not row_text.isdigit():
        return None
    return int(row_text), column


def _iter_xlsx_cell_parts_p1(sheet_xml: str):
    """Yield XLSX cell attributes/body with one forward string scan."""
    cursor = 0
    length = len(sheet_xml)
    while cursor < length:
        start = sheet_xml.find("<c", cursor)
        if start < 0:
            return
        boundary = start + 2
        if boundary < length and sheet_xml[boundary] not in " \t\r\n>/":
            cursor = boundary
            continue
        opening_end = sheet_xml.find(">", boundary)
        if opening_end < 0:
            return
        attrs_end = opening_end
        while attrs_end > boundary and sheet_xml[attrs_end - 1] in " \t\r\n":
            attrs_end -= 1
        if attrs_end > boundary and sheet_xml[attrs_end - 1] == "/":
            yield sheet_xml[boundary : attrs_end - 1], ""
            cursor = opening_end + 1
            continue
        close = sheet_xml.find("</c>", opening_end + 1)
        if close < 0:
            return
        yield sheet_xml[boundary:opening_end], sheet_xml[opening_end + 1 : close]
        cursor = close + 4


def _p1_split_xlsx_cell_chunks(sheet_xml: str, count: int) -> list[str]:
    """Split before cell opening tags so every worker receives whole cells."""
    if count <= 1 or not sheet_xml:
        return [sheet_xml]
    boundaries = [0]
    length = len(sheet_xml)
    for part in range(1, count):
        cursor = length * part // count
        while cursor < length:
            start = sheet_xml.find("<c", cursor)
            if start < 0:
                break
            boundary = start + 2
            if boundary >= length or sheet_xml[boundary] in " \t\r\n>/":
                if start > boundaries[-1]:
                    boundaries.append(start)
                break
            cursor = boundary
    boundaries.append(length)
    return [
        sheet_xml[boundaries[index] : boundaries[index + 1]]
        for index in range(len(boundaries) - 1)
        if boundaries[index] < boundaries[index + 1]
    ]


def _p1_parse_metadata_chunk(args):
    sheet_xml, format_by_xf, include_xf = args
    formats: dict[tuple[int, int], str] = {}
    shared_refs: dict[tuple[int, int], int] = {}
    direct_strings: dict[tuple[int, int], str] = {}
    xfs: dict[tuple[int, int], int] = {}
    for attrs_text, body in _iter_xlsx_cell_parts_p1(sheet_xml):
        coordinate_text, style_index, kind = _p1_cell_attributes(attrs_text)
        key = _p1_coordinate_key(coordinate_text)
        if key is None:
            continue
        if include_xf:
            xfs[key] = style_index
        if 0 <= style_index < len(format_by_xf):
            code = format_by_xf[style_index]
            if code.lower() != "general":
                formats[key] = code
        if kind not in {"s", "str", "inlinestr"}:
            continue
        if kind == "s":
            raw = _P1_VALUE_RE.search(body)
            shared_refs[key] = int(raw.group(1)) if raw else -1
        else:
            text_values = _P1_TEXT_RE.findall(body)
            raw_value = _P1_VALUE_RE.search(body)
            direct_strings[key] = "".join(
                _unescape_xml(item) for item in text_values
            ) or (_unescape_xml(raw_value.group(1)) if raw_value else "")
    return formats, shared_refs, direct_strings, xfs


def _p1_append_opening_attr(opening: str, addition: str) -> str:
    if opening.endswith("/"):
        return opening[:-1] + addition + "/"
    return opening + addition


def _p1_stamp_cell_metadata(
    cell_xml: str,
    repeat: int,
    number_format: str | None,
    original_string: str | None,
    xf_index: int | None,
) -> str:
    """Apply repeat and metadata while scanning the opening tag only once."""
    opening_end = cell_xml.find(">")
    if opening_end < 0:
        return cell_xml
    opening = _strip_first_repeat_attr(
        cell_xml[:opening_end], "table:number-columns-repeated"
    )
    if repeat > 1:
        opening = _p1_append_opening_attr(
            opening, f' table:number-columns-repeated="{repeat}"'
        )
    tail = cell_xml[opening_end + 1 :]
    covered = opening.lower().startswith("<table:covered-table-cell")
    covered_formula = covered and "table:formula=" in opening.lower()
    if number_format is not None and not covered:
        opening = _VNO_NUMFMT_RE.sub("", opening, count=1)
        opening = _p1_append_opening_attr(
            opening, f' vno:number-format="{_escape_xml(number_format)}"'
        )
    if covered_formula:
        opening = "<table:table-cell" + opening[len("<table:covered-table-cell") :]
        close = "</table:covered-table-cell>"
        close_at = tail.rfind(close)
        if close_at >= 0:
            tail = tail[:close_at] + "</table:table-cell>" + tail[close_at + len(close) :]
        covered = False
    if original_string is not None and not covered:
        attr_value = (
            _escape_xml(original_string)
            .replace("\r", "&#13;")
            .replace("\n", "&#10;")
            .replace("\t", "&#9;")
        )
        opening = _VNO_STRING_RE.sub("", opening, count=1)
        opening = _p1_append_opening_attr(
            opening, f' vno:original-string="{attr_value}"'
        )
    if xf_index is not None and not covered:
        opening = _VNO_XF_RE.sub("", opening, count=1)
        opening = _p1_append_opening_attr(opening, f' vno:xf="{xf_index}"')
    stamped = opening + ">" + tail
    if (
        original_string is not None
        and not covered
        and _LEADING_BREAK_RE.match(original_string)
        and not _EMPTY_FIRST_P_RE.match(stamped)
    ):
        first_end = stamped.find(">")
        stamped = stamped[: first_end + 1] + "<text:p></text:p>" + stamped[first_end + 1 :]
    return stamped


def _p1_apply_metadata_row(
    row_xml: str,
    format_targets: dict[int, str],
    string_targets: dict[int, str],
    xf_targets: dict[int, int],
) -> str:
    columns = {}
    for source, kind in (
        (format_targets, "format"),
        (string_targets, "string"),
        (xf_targets, "xf"),
    ):
        for col, value in source.items():
            columns.setdefault(col, {})[kind] = value
    pieces, cursor, column = [], 0, 1
    sorted_columns = sorted(columns)
    target_index = 0
    for start, end in _flat_xml_blocks(
        row_xml, ("table:table-cell", "table:covered-table-cell")
    ):
        pieces.append(row_xml[cursor:start])
        cell = row_xml[start:end]
        repeat = _repeat_count(cell, "table:number-columns-repeated")
        while target_index < len(sorted_columns) and sorted_columns[target_index] < column:
            target_index += 1
        hit_end = target_index
        while hit_end < len(sorted_columns) and sorted_columns[hit_end] < column + repeat:
            hit_end += 1
        hits = sorted_columns[target_index:hit_end]
        target_index = hit_end
        if not hits:
            pieces.append(cell)
        else:
            at = column
            for col in hits:
                meta = columns[col]
                if col > at:
                    pieces.append(
                        _p1_stamp_cell_metadata(cell, col - at, None, None, None)
                    )
                pieces.append(
                    _p1_stamp_cell_metadata(
                        cell,
                        1,
                        meta.get("format"),
                        meta.get("string"),
                        meta.get("xf"),
                    )
                )
                at = col + 1
            if at < column + repeat:
                pieces.append(
                    _p1_stamp_cell_metadata(
                        cell, column + repeat - at, None, None, None
                    )
                )
        cursor, column = end, column + repeat
    pieces.append(row_xml[cursor:])
    return "".join(pieces)


def _p1_metadata_table_chunks(table_xml: str, count: int):
    rows = []
    row_number = 1
    for start, end in _flat_xml_blocks(table_xml, ("table:table-row",)):
        repeat = _repeat_count(table_xml[start:end], "table:number-rows-repeated")
        rows.append((start, end, row_number, repeat))
        row_number += repeat
    if len(rows) < 2 or count <= 1:
        return table_xml, [], ""
    split_indices = [0]
    for part in range(1, count):
        target = len(table_xml) * part // count
        index = split_indices[-1] + 1
        while index < len(rows) and rows[index][0] < target:
            index += 1
        if index < len(rows) and index > split_indices[-1]:
            split_indices.append(index)
    split_indices.append(len(rows))
    chunks = []
    for position in range(len(split_indices) - 1):
        first_index = split_indices[position]
        next_index = split_indices[position + 1]
        start = rows[first_index][0]
        end = rows[next_index][0] if next_index < len(rows) else rows[-1][1]
        logical_start = rows[first_index][2]
        logical_end = (
            rows[next_index][2]
            if next_index < len(rows)
            else rows[-1][2] + rows[-1][3]
        )
        chunks.append((table_xml[start:end], logical_start, logical_end))
    return table_xml[: rows[0][0]], chunks, table_xml[rows[-1][1] :]


def _p1_transform_metadata_rows_chunk(args) -> str:
    chunk, row_number, format_rows, string_rows, xf_rows = args
    sorted_rows = sorted(set(format_rows) | set(string_rows) | set(xf_rows))
    target_index = 0
    pieces, cursor = [], 0
    for row_start, row_end in _flat_xml_blocks(chunk, ("table:table-row",)):
        pieces.append(chunk[cursor:row_start])
        row_xml = chunk[row_start:row_end]
        repeat = _repeat_count(row_xml, "table:number-rows-repeated")
        while target_index < len(sorted_rows) and sorted_rows[target_index] < row_number:
            target_index += 1
        hit_end = target_index
        while hit_end < len(sorted_rows) and sorted_rows[hit_end] < row_number + repeat:
            hit_end += 1
        hits = sorted_rows[target_index:hit_end]
        target_index = hit_end
        if not hits:
            pieces.append(row_xml)
        else:
            at = row_number
            for row in hits:
                if row > at:
                    pieces.append(
                        _set_repeat(
                            row_xml, "table:number-rows-repeated", row - at
                        )
                    )
                pieces.append(
                    _p1_apply_metadata_row(
                        _set_repeat(row_xml, "table:number-rows-repeated", 1),
                        format_rows.get(row, {}),
                        string_rows.get(row, {}),
                        xf_rows.get(row, {}),
                    )
                )
                at = row + 1
            if at < row_number + repeat:
                pieces.append(
                    _set_repeat(
                        row_xml,
                        "table:number-rows-repeated",
                        row_number + repeat - at,
                    )
                )
        cursor, row_number = row_end, row_number + repeat
    pieces.append(chunk[cursor:])
    return "".join(pieces)


def _xlsx_cells_with_metadata_p1(
    xlsx_bytes: bytes, *, include_xf: bool, parallel: bool = False
):
    """Build the legacy metadata maps while parsing only the three needed attributes."""
    cache_name = "sheet_metadata" if include_xf else "sheet_metadata_p1_no_xf"
    cached = _index_memo_get(cache_name, xlsx_bytes)
    if cached is not _INDEX_MISS:
        return cached
    format_by_xf = _xlsx_number_formats(xlsx_bytes)
    shared_xml = (read_zip_entry(xlsx_bytes, "xl/sharedStrings.xml") or b"").decode(
        "utf-8", errors="replace"
    )
    shared = []
    for item in re.finditer(r"<si\b[^>]*>([\s\S]*?)</si>", shared_xml, re.IGNORECASE):
        shared.append(
            "".join(
                _unescape_xml(match.group(1))
                for match in _P1_TEXT_RE.finditer(item.group(1))
            )
        )

    formats, strings, xfs = {}, {}, {}
    for sheet_name, entry_path in _resolve_xlsx_sheet_entries(xlsx_bytes).items():
        entry = read_zip_entry(xlsx_bytes, entry_path)
        if not entry:
            continue
        sheet_formats, sheet_strings, sheet_xfs = {}, {}, {}
        sheet_xml = entry.decode("utf-8", errors="replace")
        chunks = _p1_split_xlsx_cell_chunks(
            sheet_xml,
            _P1_MAX_WORKERS if parallel and len(sheet_xml) > _P1_PARALLEL_FODS_CHARS else 1,
        )
        tasks = [(chunk, format_by_xf, include_xf) for chunk in chunks]
        if len(tasks) > 1:
            parsed_chunks = _p1_process_pool().map(_p1_parse_metadata_chunk, tasks)
            for parsed_formats, shared_refs, direct_strings, parsed_xfs in parsed_chunks:
                sheet_formats.update(parsed_formats)
                sheet_xfs.update(parsed_xfs)
                sheet_strings.update(direct_strings)
                for key, shared_index in shared_refs.items():
                    sheet_strings[key] = (
                        shared[shared_index]
                        if 0 <= shared_index < len(shared)
                        else ""
                    )
        else:
            parsed_formats, shared_refs, direct_strings, parsed_xfs = _p1_parse_metadata_chunk(tasks[0])
            sheet_formats.update(parsed_formats)
            sheet_xfs.update(parsed_xfs)
            sheet_strings.update(direct_strings)
            for key, shared_index in shared_refs.items():
                sheet_strings[key] = (
                    shared[shared_index] if 0 <= shared_index < len(shared) else ""
                )
        if sheet_formats:
            formats[sheet_name] = sheet_formats
        if sheet_strings:
            strings[sheet_name] = sheet_strings
        if sheet_xfs:
            xfs[sheet_name] = sheet_xfs
    result = (formats, strings, xfs)
    _index_memo_put(cache_name, xlsx_bytes, result)
    return result


def _xlsx_cells_with_xf_indices_p1(
    xlsx_bytes: bytes,
) -> dict[str, dict[tuple[int, int], int]]:
    """Reuse the P1 metadata scan, or parse only coordinate/style attributes."""
    cached = _index_memo_get("xf", xlsx_bytes)
    if cached is not _INDEX_MISS:
        return cached
    metadata = _index_memo_get("sheet_metadata", xlsx_bytes)
    if metadata is not _INDEX_MISS:
        result = metadata[2]
        _index_memo_put("xf", xlsx_bytes, result)
        return result
    result = {}
    for sheet_name, entry_path in _resolve_xlsx_sheet_entries(xlsx_bytes).items():
        entry = read_zip_entry(xlsx_bytes, entry_path)
        if not entry:
            continue
        cells = {}
        sheet_xml = entry.decode("utf-8", errors="replace")
        for attrs_text, _body in _iter_xlsx_cell_parts_p1(sheet_xml):
            coordinate_text, style_index, _kind = _p1_cell_attributes(attrs_text)
            key = _p1_coordinate_key(coordinate_text)
            if key is None:
                continue
            cells[key] = style_index
        if cells:
            result[sheet_name] = cells
    _index_memo_put("xf", xlsx_bytes, result)
    return result


def prefetch_sheet_open_metadata(xlsx_bytes: bytes | None, *, include_xf: bool = True) -> bool:
    """Run the xlsx-side metadata scan early (while LibreOffice converts) and leave it in the index memo.

    The scan reads only the original xlsx, never the FODS, so the later overlay finds it in the memo and skips the
    work. The memo is keyed by object identity, so this only helps when the overlay receives the very same bytes
    object (true unless normalize_source_xlsx has to rewrite a prefixed-namespace workbook, which is skipped here).
    The parallel flag mirrors the FODS-size rule using the uncompressed sheet XML size as the proxy.
    Returns True when the scan ran. Never raises.
    """
    try:
        if not xlsx_bytes or normalize_source_xlsx(xlsx_bytes) is not xlsx_bytes:
            return False
        with zipfile.ZipFile(io.BytesIO(xlsx_bytes), "r") as archive:
            sheet_chars = sum(
                info.file_size for info in archive.infolist()
                if info.filename.startswith("xl/worksheets/") and info.filename.endswith(".xml")
            )
        large = sheet_chars > _P1_PARALLEL_FODS_CHARS
        layout_future = None
        if large:
            # The sheet layout (row heights from every cell's font) is another xlsx-only computation: 10-13 s on
            # lan01/lan06. Run it in a worker process right away so it neither waits for the FODS nor holds this
            # process' GIL; the result goes into the same identity memo.
            try:
                layout_future = _p1_process_pool().submit(_compute_xlsx_sheet_layouts, xlsx_bytes)
            except Exception:
                layout_future = None
        formats, strings, xfs = _xlsx_cells_with_metadata_p1(xlsx_bytes, include_xf=include_xf, parallel=large)
        _xlsx_metadata_row_maps(xlsx_bytes, include_xf, formats, strings, xfs)
        if layout_future is not None:
            try:
                _index_memo_put("layouts", xlsx_bytes, layout_future.result())
            except Exception:
                pass  # the overlay simply computes it itself
        return True
    except Exception:
        return False


def _xlsx_metadata_row_maps(xlsx_bytes: bytes, include_xf: bool, formats, strings, xfs) -> dict:
    """{sheet: [format_rows, string_rows, xf_rows]} with each map {row: {col: value}}; memoised like the metadata.

    Grouping the 1-4 million (row, col) entries by row used to run inside the overlay after LibreOffice finished;
    the prefetch now does it while LibreOffice is still converting.
    """
    name = "metadata_rows" if include_xf else "metadata_rows_no_xf"
    cached = _index_memo_get(name, xlsx_bytes)
    if cached is not _INDEX_MISS:
        return cached
    result: dict[str, list[dict]] = {}
    for index, mapping in enumerate((formats, strings, xfs)):
        for sheet_name, cells in mapping.items():
            rows: dict[int, dict] = {}
            for (row, col), value in cells.items():
                rows.setdefault(row, {})[col] = value
            result.setdefault(sheet_name, [{}, {}, {}])[index] = rows
    _index_memo_put(name, xlsx_bytes, result)
    return result


def _overlay_sheet_cell_metadata_from_xlsx_p1(
    xlsx_bytes: bytes,
    fods_xml: str,
    *,
    include_xf: bool = True,
) -> str:
    """Byte-compatible P1 metadata overlay using C-regex block scans."""
    formats, strings, xfs = _xlsx_cells_with_metadata_p1(
        xlsx_bytes,
        include_xf=include_xf,
        parallel=len(fods_xml) > _P1_PARALLEL_FODS_CHARS,
    )
    if not formats and not strings and not xfs:
        return fods_xml

    rows_by_sheet = _xlsx_metadata_row_maps(xlsx_bytes, include_xf, formats, strings, xfs)

    pieces, cursor = [], 0
    needs_vno = bool(formats or xfs)
    for start, end in _flat_xml_blocks(fods_xml, ("table:table",)):
        pieces.append(fods_xml[cursor:start])
        table_xml = fods_xml[start:end]
        opening_end = table_xml.find(">")
        attrs = _xml_attrs(table_xml[: opening_end + 1]) if opening_end >= 0 else {}
        sheet_name = attrs.get("table:name", "")
        row_maps = rows_by_sheet.get(sheet_name) or [{}, {}, {}]
        if any(row_maps):
            if len(fods_xml) > _P1_PARALLEL_FODS_CHARS and len(table_xml) > _P1_TABLE_PARALLEL_MIN_CHARS:
                prefix, chunks, suffix = _p1_metadata_table_chunks(
                    table_xml, _P1_MAX_WORKERS
                )
                if len(chunks) > 1:
                    tasks = []
                    sorted_keys = [sorted(mapping) for mapping in row_maps]
                    for chunk, logical_start, logical_end in chunks:
                        # rows in [logical_start, logical_end): bisect on the sorted keys instead of testing every row
                        subsets = []
                        for mapping, keys in zip(row_maps, sorted_keys):
                            low = bisect.bisect_left(keys, logical_start)
                            high = bisect.bisect_left(keys, logical_end)
                            subsets.append({row: mapping[row] for row in keys[low:high]})
                        tasks.append(
                            (chunk, logical_start, subsets[0], subsets[1], subsets[2])
                        )
                    # Memory: drop the table copy and the chunk slices as soon as the workers have them, and join
                    # prefix/chunks/suffix once (the old `prefix + join + suffix` made two extra table-sized copies).
                    table_xml = None
                    results = list(_p1_process_pool().map(_p1_transform_metadata_rows_chunk, tasks))
                    tasks = chunks = None
                    table_xml = "".join([prefix, *results, suffix])
                    results = None
                    pieces.append(table_xml)
                    cursor = end
                    continue
            table_parts, table_cursor, row_number = [], 0, 1
            sorted_rows = sorted(set().union(*(mapping.keys() for mapping in row_maps)))
            target_index = 0
            for row_start, row_end in _flat_xml_blocks(
                table_xml, ("table:table-row",)
            ):
                table_parts.append(table_xml[table_cursor:row_start])
                row_xml = table_xml[row_start:row_end]
                repeat = _repeat_count(row_xml, "table:number-rows-repeated")
                while target_index < len(sorted_rows) and sorted_rows[target_index] < row_number:
                    target_index += 1
                hit_end = target_index
                while hit_end < len(sorted_rows) and sorted_rows[hit_end] < row_number + repeat:
                    hit_end += 1
                hits = sorted_rows[target_index:hit_end]
                target_index = hit_end
                if not hits:
                    table_parts.append(row_xml)
                else:
                    at = row_number
                    for row in hits:
                        if row > at:
                            table_parts.append(
                                _set_repeat(row_xml, "table:number-rows-repeated", row - at)
                            )
                        table_parts.append(
                            _p1_apply_metadata_row(
                                _set_repeat(row_xml, "table:number-rows-repeated", 1),
                                row_maps[0].get(row, {}),
                                row_maps[1].get(row, {}),
                                row_maps[2].get(row, {}),
                            )
                        )
                        at = row + 1
                    if at < row_number + repeat:
                        table_parts.append(
                            _set_repeat(
                                row_xml,
                                "table:number-rows-repeated",
                                row_number + repeat - at,
                            )
                        )
                table_cursor, row_number = row_end, row_number + repeat
            table_parts.append(table_xml[table_cursor:])
            table_xml = "".join(table_parts)
        pieces.append(table_xml)
        cursor = end
    pieces.append(fods_xml[cursor:])
    result = "".join(pieces)
    if needs_vno and not _declares_vno_namespace(result):
        match = _OFFICE_DOCUMENT_OPEN_RE.search(result)
        if match:
            result = (
                result[: match.start()]
                + f'<office:document{match.group(1)} xmlns:vno="{SHEET_VNO_NS}">'
                + result[match.end() :]
            )
    return result


def reoverlay_sheet_xf_indices(xlsx_bytes: bytes, fods_xml: str) -> str:
    """Reattach XF ownership after FODS cell-run normalization."""
    clean = re.sub(r'\s+vno:xf\s*=\s*(["\'])\d+\1', "", fods_xml, flags=re.IGNORECASE)
    normalized = normalize_source_xlsx(xlsx_bytes)
    cached_metadata = _index_memo_get("sheet_metadata", normalized)
    cached_xfs = cached_metadata[2] if cached_metadata is not _INDEX_MISS else None
    return _overlay_sheet_xf_indices_from_xlsx(normalized, clean, cached_xfs)


def _fods_cells_with_vno_xf(fods_xml: str) -> dict[str, dict[tuple[int, int], int]]:
    """Parse vno:xf attributes from FODS cells.
    
    Returns {sheet_name: {(row, col): xf_index}} for cells that have vno:xf.
    Uses the same flat block iteration as the overlay functions to correctly
    handle number-rows-repeated and number-columns-repeated.
    """
    result = {}
    for table_start, table_end in _flat_xml_blocks(fods_xml, ("table:table",)):
        table_xml = fods_xml[table_start:table_end]
        table_attrs = _xml_attrs(re.match(r"<[^>]+", table_xml).group(0))
        sheet_name = _unescape_xml(table_attrs.get("table:name", ""))
        if not sheet_name:
            continue
        
        # Use the same row/col iteration logic as _overlay_xf_indices_in_table
        targets = {}
        row_number = 1
        for row_start, row_end in _flat_xml_blocks(table_xml, ("table:table-row",)):
            row_xml = table_xml[row_start:row_end]
            row_repeat = _repeat_count(row_xml, "table:number-rows-repeated")
            
            col_number = 1
            for cell_start, cell_end in _flat_xml_blocks(row_xml, ("table:table-cell", "table:covered-table-cell")):
                cell_xml = row_xml[cell_start:cell_end]
                xf_match = re.search(r'vno:xf="(\d+)"', cell_xml)
                if xf_match:
                    xf_index = int(xf_match.group(1))
                    targets[(row_number, col_number)] = xf_index
                col_repeat = _repeat_count(cell_xml, "table:number-columns-repeated")
                col_number += col_repeat
            row_number += row_repeat
        
        if targets:
            result[sheet_name] = targets
    return result


def _parse_xlsx_styles_for_xf(xlsx_bytes: bytes) -> tuple[list[str], list[str], list[str], list[str]]:
    """Parse styles.xml and extract xf, font, fill, border, numFmt elements.
    
    Returns (xf_elements, font_elements, fill_elements, border_elements, numfmt_elements)
    where each is a list of XML strings for the elements.
    """
    entry = read_zip_entry(xlsx_bytes, XLSX_STYLES_ENTRY)
    if not entry:
        return [], [], [], [], []
    styles_xml = entry.decode("utf-8", errors="replace")

    def _children(container: str, tag: str) -> list[str]:
        """Mọi phần tử <tag> trực tiếp trong container, giữ nguyên XML (tự đóng hoặc có con như
        <xf><alignment/></xf>, <border><left/>…</border>). Bản đầu ghép lại "<xf attrs/>" nên mất
        <alignment>, sinh "//>" và bỏ qua <border/> tự đóng làm lệch chỉ số (đo lan18: Excel không mở)."""
        m = re.search(rf"<{container}\b[^>]*>([\s\S]*?)</{container}>", styles_xml, re.IGNORECASE)
        if not m:
            return []
        return [x.group(0) for x in re.finditer(rf"<{tag}\b[^>]*/>|<{tag}\b[^>]*>[\s\S]*?</{tag}>", m.group(1), re.IGNORECASE)]

    xf_elements = _children("cellXfs", "xf")
    font_elements = _children("fonts", "font")
    fill_elements = _children("fills", "fill")
    border_elements = _children("borders", "border")
    # numFmt: {numFmtId: formatCode}
    numfmt_elements: dict[int, str] = {}
    numfmts_match = re.search(r"<numFmts\b[^>]*>([\s\S]*?)</numFmts>", styles_xml, re.IGNORECASE)
    if numfmts_match:
        for match in re.finditer(r"<numFmt\b([^>]*?)/?\s*>", numfmts_match.group(1), re.IGNORECASE):
            attrs = _xml_attrs(match.group(1))
            try:
                numfmt_elements[int(attrs.get("numFmtId", "-1"))] = attrs.get("formatCode", "General")
            except ValueError:
                continue

    return xf_elements, font_elements, fill_elements, border_elements, numfmt_elements


def _restore_original_xf_for_vno_cells(
    xlsx_bytes: bytes,
    source_fods: str | None,
    source_xlsx_bytes: bytes | None,
    replacements: dict[str, str]
) -> None:
    """Restore original XLSX xf for cells with vno:xf attribute in FODS.
    
    For each cell with vno:xf=n in FODS:
    1. Get the original xf #n from source XLSX styles.xml
    2. Copy the xf and its referenced font, fill, border, numFmt to the new styles.xml
    3. Update the cell's s attribute in the new worksheet to the new xf index
    """
    if not source_fods or not source_xlsx_bytes:
        return
    
    # Parse vno:xf from FODS
    vno_cells = _fods_cells_with_vno_xf(source_fods)
    if not vno_cells:
        _restore_source_color_palette(xlsx_bytes, source_xlsx_bytes, replacements, copy_theme=False)
        return

    copier = _SourceXfCopier(xlsx_bytes, source_xlsx_bytes)
    if not copier.available:
        _restore_source_color_palette(xlsx_bytes, source_xlsx_bytes, replacements, copy_theme=False)
        return

    for sheet_name, cells in vno_cells.items():
        # Get the worksheet entry path
        sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
        entry_path = sheet_entries.get(sheet_name)
        if not entry_path:
            continue

        # Get the worksheet XML
        sheet_xml = replacements.get(entry_path)
        if sheet_xml is None:
            entry_bytes = read_zip_entry(xlsx_bytes, entry_path)
            if not entry_bytes:
                continue
            sheet_xml = entry_bytes.decode("utf-8", errors="replace")

        # Process each cell with vno:xf
        new_xf_by_coord: dict[str, int] = {}
        for (row, col), src_xf_idx in cells.items():
            new_xf_idx = copier.map(src_xf_idx)
            if new_xf_idx is None:
                continue
            new_xf_by_coord[f"{column_label_from_index(col)}{row}"] = new_xf_idx

        # Đặt lại s= cho mọi ô trong MỘT lượt quét (lan09: 13 MB XLSX, hàng trăm nghìn ô vno:xf —
        # re.sub từng ô trên toàn bộ sheet XML là O(ô × kích thước) và không lưu xong trong 20 phút).
        def _replace_s(match):
            attrs = match.group(1)
            new_idx = new_xf_by_coord.get(match.group(2).upper())
            if new_idx is None:
                return match.group(0)
            self_closing = attrs.endswith("/")
            if self_closing:
                attrs = attrs[:-1].rstrip()
            if re.search(r'\bs\s*=', attrs):
                attrs = re.sub(r'\bs\s*=\s*"?\d+"?', f's="{new_idx}"', attrs, count=1)
            else:
                attrs = f'{attrs} s="{new_idx}"'
            return f'{attrs}/>' if self_closing else f'{attrs}>'

        if new_xf_by_coord:
            sheet_xml = re.sub(r'(<c\b[^>]*\br="([A-Za-z]+\d+)"[^>]*)>', _replace_s, sheet_xml)

        # Update the worksheet XML in replacements
        if sheet_xml != replacements.get(entry_path, ""):
            replacements[entry_path] = sheet_xml
    
    copier.write_styles(replacements)
    _restore_source_color_palette(xlsx_bytes, source_xlsx_bytes, replacements, copy_theme=bool(copier.xf_index_map))
    return copier


class _SourceXfCopier:
    """Chép <xf> của XLSX gốc (+font/fill/border/numFmt nó trỏ tới) vào styles.xml của file LibreOffice
    ghi ra, trả về chỉ số xf mới. Dùng chung cho S8 (ô vno:xf) và S13 (ô chuỗi rỗng khôi phục): mọi
    chỉ số style của file gốc PHẢI đi qua đây, không được chép thẳng `s=` gốc vào file lưu."""

    def __init__(self, xlsx_bytes: bytes, source_xlsx_bytes: bytes):
        (self.src_xf, self.src_fonts, self.src_fills, self.src_borders, self.src_numfmts) = _parse_xlsx_styles_for_xf(source_xlsx_bytes)
        (self.current_xf, self.fonts, self.fills, self.borders, self.current_numfmts) = _parse_xlsx_styles_for_xf(xlsx_bytes)
        self.available = bool(self.src_xf)
        self.xlsx_bytes = xlsx_bytes
        styles_entry = read_zip_entry(xlsx_bytes, XLSX_STYLES_ENTRY)
        csx = re.search(r"<cellStyleXfs\b[^>]*>([\s\S]*?)</cellStyleXfs>", styles_entry.decode("utf-8", errors="replace"), re.IGNORECASE) if styles_entry else None
        self.cell_style_xf_count = max(1, len(re.findall(r"<xf\b", csx.group(1)))) if csx else 1
        # Build maps for deduplication (by XML content). numFmt: formatCode -> numFmtId (custom ids >= 164).
        # fonts[0] là ô Normal: _restore_normal_font_in_styles sẽ thay bằng font Normal của file gốc SAU S8, nên
        # không được gộp font chép vào chỉ số 0 (đo lan08 vòng 8: Arial 10 == fonts[0] của LibreOffice -> gộp
        # về 0 -> sau đó thành Calibri 11 của Normal gốc, 98 ô lệch font).
        self.font_map = {f: i for i, f in enumerate(self.fonts) if i > 0}
        self.fill_map = {f: i for i, f in enumerate(self.fills)}
        self.border_map = {b: i for i, b in enumerate(self.borders)}
        self.numfmt_map = {code: fmt_id for fmt_id, code in self.current_numfmts.items()}
        self.next_numfmt_id = max([163, *self.current_numfmts.keys()]) + 1
        self.added_numfmts: dict[int, str] = {}
        self.new_xf = list(self.current_xf)
        self.xf_index_map: dict[int, int] = {}  # source_xf_index -> new_xf_index

    def _dedupe(self, elements: list[str], index_map: dict[str, int], element: str) -> int:
        if element not in index_map:
            index_map[element] = len(elements)
            elements.append(element)
        return index_map[element]

    def map(self, src_xf_idx: int) -> int | None:
        if not self.available or src_xf_idx < 0 or src_xf_idx >= len(self.src_xf):
            return None
        if src_xf_idx in self.xf_index_map:
            return self.xf_index_map[src_xf_idx]
        src_xf = self.src_xf[src_xf_idx]
        xf_attrs = _xml_attrs(re.match(r"<xf\b([^>]*)", src_xf).group(1))
        font_id = int(xf_attrs.get("fontId", 0))
        fill_id = int(xf_attrs.get("fillId", 0))
        border_id = int(xf_attrs.get("borderId", 0))
        numfmt_id = int(xf_attrs.get("numFmtId", 0))
        new_font_id = self._dedupe(self.fonts, self.font_map, self.src_fonts[font_id]) if font_id < len(self.src_fonts) else 0
        new_fill_id = self._dedupe(self.fills, self.fill_map, self.src_fills[fill_id]) if fill_id < len(self.src_fills) else 0
        new_border_id = self._dedupe(self.borders, self.border_map, self.src_borders[border_id]) if border_id < len(self.src_borders) else 0
        # numFmt: mã tuỳ chỉnh (>= 164) VÀ mã built-in được file gốc khai báo tường minh (Excel cho ghi đè
        # 5–8, 41–44 theo locale: lan28 `numFmtId="41" formatCode="_-* #,##0_-…"`, 1540 ô vòng 5) — cấp id
        # mới >= 164 để giữ đúng chữ mã, không đụng id 41 của LibreOffice.
        if numfmt_id in self.src_numfmts and (numfmt_id >= 164 or self.current_numfmts.get(numfmt_id) != self.src_numfmts[numfmt_id]):
            code = self.src_numfmts[numfmt_id]
            if code not in self.numfmt_map:
                self.numfmt_map[code] = self.next_numfmt_id
                self.added_numfmts[self.next_numfmt_id] = code
                self.next_numfmt_id += 1
            new_numfmt_id = self.numfmt_map[code]
        else:
            new_numfmt_id = numfmt_id
        new_xf = re.sub(r'fontId="\d+"', f'fontId="{new_font_id}"', src_xf)
        new_xf = re.sub(r'fillId="\d+"', f'fillId="{new_fill_id}"', new_xf)
        new_xf = re.sub(r'borderId="\d+"', f'borderId="{new_border_id}"', new_xf)
        new_xf = re.sub(r'numFmtId="\d+"', f'numFmtId="{new_numfmt_id}"', new_xf)
        # xfId trỏ vào cellStyleXfs của file GỐC (lan02: 1428) — file LibreOffice chỉ có ~20 -> về Normal (0)
        if int(xf_attrs.get("xfId", 0)) >= self.cell_style_xf_count:
            new_xf = re.sub(r'xfId="\d+"', 'xfId="0"', new_xf)
        new_idx = len(self.new_xf)
        self.new_xf.append(new_xf)
        self.xf_index_map[src_xf_idx] = new_idx
        return new_idx

    def write_styles(self, replacements: dict[str, str]) -> None:
        """Ghi lại styles.xml (mỗi bảng ghi lại cả count= để Excel không từ chối file). Gọi được nhiều lần."""
        if len(self.new_xf) <= len(self.current_xf) and not self.added_numfmts:
            return
        styles_xml = replacements.get(XLSX_STYLES_ENTRY)
        if styles_xml is None:
            styles_entry = read_zip_entry(self.xlsx_bytes, XLSX_STYLES_ENTRY)
            if not styles_entry:
                return
            styles_xml = styles_entry.decode("utf-8", errors="replace")

        def _replace_block(xml: str, container: str, elements: list[str]) -> str:
            m = re.search(rf"(<{container}\b[^>]*>)([\s\S]*?)(</{container}>)", xml, re.IGNORECASE)
            if not m:
                return xml
            open_tag = re.sub(r'\scount="\d+"', "", m.group(1))
            open_tag = open_tag[:-1] + f' count="{len(elements)}">'
            return xml[:m.start(1)] + open_tag + "".join(elements) + xml[m.start(3):]

        styles_xml = _replace_block(styles_xml, "fonts", self.fonts)
        styles_xml = _replace_block(styles_xml, "fills", self.fills)
        styles_xml = _replace_block(styles_xml, "borders", self.borders)
        styles_xml = _replace_block(styles_xml, "cellXfs", self.new_xf)
        if self.added_numfmts:
            all_numfmts = {**self.current_numfmts, **self.added_numfmts}
            numfmt_xml = "".join(
                f'<numFmt numFmtId="{fmt_id}" formatCode="{_escape_xml(code)}"/>' for fmt_id, code in sorted(all_numfmts.items())
            )
            block = f'<numFmts count="{len(all_numfmts)}">{numfmt_xml}</numFmts>'
            if re.search(r"<numFmts\b", styles_xml, re.IGNORECASE):
                styles_xml = re.sub(r"<numFmts\b[^>]*>[\s\S]*?</numFmts>|<numFmts\b[^>]*/>", lambda _m: block, styles_xml, count=1, flags=re.IGNORECASE)
            else:
                # numFmts phải đứng đầu styleSheet (trước <fonts>)
                styles_xml = re.sub(r"(<styleSheet\b[^>]*>)", lambda m: m.group(1) + block, styles_xml, count=1, flags=re.IGNORECASE)
        replacements[XLSX_STYLES_ENTRY] = styles_xml


def _restore_source_color_palette(xlsx_bytes: bytes, source_xlsx_bytes: bytes, replacements: dict[str, str], copy_theme: bool = True) -> None:
    """S10: xf/font/fill chép từ XLSX gốc (S8) trỏ màu theo `theme="N"`/`indexed="N"`, nhưng
    LibreOffice ghi theme1.xml mặc định của nó ("Office", accent6 = C9211E) và bỏ bảng
    <indexedColors> riêng của file → Excel tô màu khác (đo vòng 5: lan07/13/17 fill
    #A9D18E → #E9706D, 574 ô; lan03/10/16 #558ED5 → #666666, 168 ô). Giữ theme1.xml
    và <colors> của file gốc để các chỉ số đó giải về đúng màu như Writer W7."""
    source_theme = read_zip_entry(source_xlsx_bytes, "xl/theme/theme1.xml") if copy_theme else None
    if source_theme:
        with zipfile.ZipFile(io.BytesIO(xlsx_bytes), "r") as package:
            has_theme = "xl/theme/theme1.xml" in package.namelist()
        if has_theme:
            replacements["xl/theme/theme1.xml"] = source_theme.decode("utf-8", errors="replace")

    source_styles = read_zip_entry(source_xlsx_bytes, XLSX_STYLES_ENTRY)
    if not source_styles:
        return
    colors_match = re.search(r"<colors\b[^>]*>[\s\S]*?</colors>", source_styles.decode("utf-8", errors="replace"), re.IGNORECASE)
    source_has_palette = bool(colors_match and "<indexedColors" in colors_match.group(0))
    styles_xml = replacements.get(XLSX_STYLES_ENTRY)
    if styles_xml is None:
        current = read_zip_entry(xlsx_bytes, XLSX_STYLES_ENTRY)
        if not current:
            return
        styles_xml = current.decode("utf-8", errors="replace")
    if not source_has_palette:
        # LibreOffice ghi <indexedColors> 64 màu nhưng bỏ khối 8 màu lặp (chỉ số 8–15) → mọi
        # indexed="N" lệch 8 bậc: indexed="8" (đen) Excel vẽ #800000. Đo Excel COM lan03 E3
        # (_excel_cell_probe.ps1): font #800000 → bỏ khối này → #000000 như file gốc.
        if re.search(r"<indexedColors\b", styles_xml, re.IGNORECASE):
            styles_xml = re.sub(r"<colors\b[^>]*>[\s\S]*?</colors>|<colors\b[^>]*/>", "", styles_xml, count=1, flags=re.IGNORECASE)
            replacements[XLSX_STYLES_ENTRY] = styles_xml
        return
    if re.search(r"<colors\b", styles_xml, re.IGNORECASE):
        styles_xml = re.sub(r"<colors\b[^>]*>[\s\S]*?</colors>|<colors\b[^>]*/>", lambda _m: colors_match.group(0), styles_xml, count=1, flags=re.IGNORECASE)
    else:
        # Thứ tự trong CT_Stylesheet: ... cellXfs, cellStyles, dxfs, tableStyles, colors, extLst
        inserted = False
        for anchor in (r"<extLst\b", r"</styleSheet>"):
            m = re.search(anchor, styles_xml, re.IGNORECASE)
            if m:
                styles_xml = styles_xml[:m.start()] + colors_match.group(0) + styles_xml[m.start():]
                inserted = True
                break
        if not inserted:
            return
    replacements[XLSX_STYLES_ENTRY] = styles_xml


_VNO_NUMFMT_RE = re.compile(r'\s+vno:number-format\s*=\s*(["\']).*?\1', re.IGNORECASE)
_VNO_STRING_RE = re.compile(r'\s+vno:original-string\s*=\s*(["\']).*?\1', re.IGNORECASE)
_LEADING_BREAK_RE = re.compile(r"^(?:\r\n|\r|\n)")
_EMPTY_FIRST_P_RE = re.compile(r"<[^>]+>\s*<text:p\b[^>]*>\s*</text:p>", re.IGNORECASE)


def _set_number_format_attr(cell_xml: str, code: str) -> str:
    if cell_xml.startswith("<table:covered-table-cell"):
        return cell_xml
    stamped = _stamp_table_cell_attr(cell_xml, f' vno:number-format="{_escape_xml(code)}"', _VNO_NUMFMT_RE)
    if stamped is not None:
        return stamped
    opening = _CELL_OPEN_RE.match(cell_xml)
    if not opening or "covered-table-cell" in opening.group(1).lower():
        return cell_xml
    attrs = _VNO_NUMFMT_RE.sub("", opening.group(2), count=1)
    tag = f'<{opening.group(1)}{attrs} vno:number-format="{_escape_xml(code)}"{opening.group(3)}>'
    return tag + cell_xml[opening.end():]


def _set_original_string_attr(cell_xml: str, value: str) -> str:
    # Newline/tab in an XML attribute value are normalized to spaces by every DOM
    # parser (attribute-value normalization) unless written as character
    # references. The app's DOM branch of parseFods was reading "Từ 5 bộ ck 30%"
    # for a two-line cell and the saved XLSX lost its line breaks; the regex
    # branch (Node tests) never saw it. Encode them explicitly.
    attr_value = _escape_xml(value).replace("\r", "&#13;").replace("\n", "&#10;").replace("\t", "&#9;")
    addition = f' vno:original-string="{attr_value}"'
    if cell_xml.startswith("<table:covered-table-cell"):
        return cell_xml
    stamped = _stamp_table_cell_attr(cell_xml, addition, _VNO_STRING_RE)
    if stamped is None:
        opening = _CELL_OPEN_RE.match(cell_xml)
        if not opening or "covered-table-cell" in opening.group(1).lower():
            return cell_xml
        raw_attrs = _VNO_STRING_RE.sub("", opening.group(2), count=1)
        stamped = f'<{opening.group(1)}{raw_attrs}{addition}{opening.group(3)}>' + cell_xml[opening.end():]
    # Calc represents a leading line break as an empty first paragraph, but
    # may omit that paragraph on import. Recreate only the missing prefix so
    # both DOM and regex parsers see the same text as vno:original-string.
    if _LEADING_BREAK_RE.match(value) and not _EMPTY_FIRST_P_RE.match(stamped):
        stamped = re.sub(r"(<[^>]+>)", r"\1<text:p></text:p>", stamped, count=1)
    return stamped


def _promote_covered_formula_errors(fods_xml: str) -> str:
    """A covered ODF cell may still carry an OOXML error formula; keep it as data."""
    if fods_xml and "table:covered-table-cell" not in fods_xml:
        return fods_xml  # no covered cell at all (ODF tags are lower-case): skip the whole-document regex
    return re.sub(
        r"<table:covered-table-cell\b([^>]*\btable:formula=[^>]*)>([\s\S]*?)</table:covered-table-cell>",
        lambda m: f"<table:table-cell{m.group(1)}>{m.group(2)}</table:table-cell>",
        fods_xml or "",
        flags=re.IGNORECASE,
    )


def _strip_first_repeat_attr(xml: str, attr: str) -> str:
    """Bỏ lần xuất hiện đầu của \\s+attr=\"số\", không phân biệt hoa thường. count=1 như re.sub cũ."""
    hay = xml.lower()
    key = attr.lower()
    start = 0
    n = len(xml)
    klen = len(key)
    while True:
        i = hay.find(key, start)
        if i < 0:
            return xml
        if i == 0 or xml[i - 1] not in " \t\r\n":
            start = i + 1
            continue
        end_name = i + klen
        if end_name < n and _is_xml_name_char(xml[end_name]):
            start = end_name
            continue
        j = end_name
        while j < n and xml[j] in " \t\r\n":
            j += 1
        if j >= n or xml[j] != "=":
            start = end_name
            continue
        j += 1
        while j < n and xml[j] in " \t\r\n":
            j += 1
        if j >= n or xml[j] not in "\"'":
            start = end_name
            continue
        quote = xml[j]
        j += 1
        end = xml.find(quote, j)
        if end < 0:
            return xml
        if not xml[j:end].isdigit():
            start = end + 1
            continue
        ws = i
        while ws > 0 and xml[ws - 1] in " \t\r\n":
            ws -= 1
        return xml[:ws] + xml[end + 1 :]


def _set_repeat(xml: str, attr: str, count: int) -> str:
    """Set a row/cell repeat count inside its opening tag, before a self-close slash."""
    xml = _strip_first_repeat_attr(xml, attr)
    if count <= 1:
        return xml
    return _insert_repeat_before_end(
        xml,
        ("<table:table-cell", "<table:covered-table-cell", "<table:table-row"),
        attr,
        count,
    )


def _flat_xml_blocks(xml: str, names: tuple[str, ...]):
    """Yield flat ODF element spans. Một lần tìm '<' — không find từng tên tới cuối hàng (O(ô × độ dài hàng))."""
    if not xml or not names:
        return
    cursor = 0
    n = len(xml)
    openers = tuple("<" + name for name in names)
    while cursor < n:
        lt = xml.find("<", cursor)
        if lt < 0:
            return
        matched = None
        matched_boundary = 0
        for name, opener in zip(names, openers):
            if xml.startswith(opener, lt):
                boundary = lt + len(opener)
                if boundary >= n or xml[boundary] in " \t\r\n>/":
                    matched = name
                    matched_boundary = boundary
                    break
        if matched is None:
            cursor = lt + 1
            continue
        opening_end = xml.find(">", matched_boundary)
        if opening_end < 0:
            return
        if xml[opening_end - 1] == "/":
            end = opening_end + 1
        else:
            close = "</" + matched + ">"
            close_at = xml.find(close, opening_end + 1)
            if close_at < 0:
                return
            end = close_at + len(close)
        yield lt, end
        cursor = end


def _overlay_formats_in_row(row_xml: str, targets: dict[int, str]) -> str:
    pieces, cursor, column = [], 0, 1
    sorted_columns, target_index = sorted(targets), 0
    for start, end in _flat_xml_blocks(row_xml, ("table:table-cell", "table:covered-table-cell")):
        pieces.append(row_xml[cursor:start])
        cell = row_xml[start:end]
        repeat = _repeat_count(cell, "table:number-columns-repeated")
        while target_index < len(sorted_columns) and sorted_columns[target_index] < column:
            target_index += 1
        hit_end = target_index
        while hit_end < len(sorted_columns) and sorted_columns[hit_end] < column + repeat:
            hit_end += 1
        hits = [(col, targets[col]) for col in sorted_columns[target_index:hit_end]]
        target_index = hit_end
        if not hits:
            pieces.append(cell)
        else:
            at = column
            for col, code in hits:
                if col > at:
                    pieces.append(_set_repeat(cell, "table:number-columns-repeated", col - at))
                pieces.append(_set_number_format_attr(_set_repeat(cell, "table:number-columns-repeated", 1), code))
                at = col + 1
            if at < column + repeat:
                pieces.append(_set_repeat(cell, "table:number-columns-repeated", column + repeat - at))
        cursor, column = end, column + repeat
    pieces.append(row_xml[cursor:])
    return "".join(pieces)


def _overlay_strings_in_row(row_xml: str, targets: dict[int, str]) -> str:
    pieces, cursor, column = [], 0, 1
    sorted_columns, target_index = sorted(targets), 0
    for start, end in _flat_xml_blocks(row_xml, ("table:table-cell", "table:covered-table-cell")):
        pieces.append(row_xml[cursor:start]); cell = row_xml[start:end]
        repeat = _repeat_count(cell, "table:number-columns-repeated")
        while target_index < len(sorted_columns) and sorted_columns[target_index] < column:
            target_index += 1
        hit_end = target_index
        while hit_end < len(sorted_columns) and sorted_columns[hit_end] < column + repeat:
            hit_end += 1
        hits = [(col, targets[col]) for col in sorted_columns[target_index:hit_end]]
        target_index = hit_end
        if not hits: pieces.append(cell)
        else:
            at = column
            for col, value in hits:
                if col > at: pieces.append(_set_repeat(cell, "table:number-columns-repeated", col - at))
                pieces.append(_set_original_string_attr(_set_repeat(cell, "table:number-columns-repeated", 1), value)); at = col + 1
            if at < column + repeat: pieces.append(_set_repeat(cell, "table:number-columns-repeated", column + repeat - at))
        cursor, column = end, column + repeat
    pieces.append(row_xml[cursor:]); return "".join(pieces)


def _overlay_formats_in_table(table_xml: str, targets: dict[tuple[int, int], str]) -> str:
    pieces, cursor, row_number, rows = [], 0, 1, {}
    for (row, col), code in targets.items():
        rows.setdefault(row, {})[col] = code
    sorted_rows, target_index = sorted(rows), 0
    for start, end in _flat_xml_blocks(table_xml, ("table:table-row",)):
        pieces.append(table_xml[cursor:start])
        row_xml = table_xml[start:end]
        repeat = _repeat_count(row_xml, "table:number-rows-repeated")
        while target_index < len(sorted_rows) and sorted_rows[target_index] < row_number:
            target_index += 1
        hit_end = target_index
        while hit_end < len(sorted_rows) and sorted_rows[hit_end] < row_number + repeat:
            hit_end += 1
        hits = sorted_rows[target_index:hit_end]
        target_index = hit_end
        if not hits:
            pieces.append(row_xml)
        else:
            at = row_number
            for row in hits:
                if row > at:
                    pieces.append(_set_repeat(row_xml, "table:number-rows-repeated", row - at))
                pieces.append(_overlay_formats_in_row(_set_repeat(row_xml, "table:number-rows-repeated", 1), rows[row]))
                at = row + 1
            if at < row_number + repeat:
                pieces.append(_set_repeat(row_xml, "table:number-rows-repeated", row_number + repeat - at))
        cursor, row_number = end, row_number + repeat
    pieces.append(table_xml[cursor:])
    return "".join(pieces)


def _overlay_sheet_number_formats_from_xlsx(xlsx_bytes: bytes, fods_xml: str) -> str:
    by_sheet = _xlsx_cells_with_number_formats(xlsx_bytes)
    if not by_sheet:
        return fods_xml
    pieces, cursor = [], 0
    for start, end in _flat_xml_blocks(fods_xml, ("table:table",)):
        pieces.append(fods_xml[cursor:start])
        table_xml = fods_xml[start:end]
        attrs = _xml_attrs(re.match(r"<[^>]+", table_xml).group(0))
        targets = by_sheet.get(attrs.get("table:name", ""))
        pieces.append(_overlay_formats_in_table(table_xml, targets) if targets else table_xml)
        cursor = end
    pieces.append(fods_xml[cursor:])
    result = "".join(pieces)
    if _declares_vno_namespace(result):
        return result
    match = _OFFICE_DOCUMENT_OPEN_RE.search(result)
    if not match:
        return result
    return result[:match.start()] + f'<office:document{match.group(1)} xmlns:vno="{SHEET_VNO_NS}">' + result[match.end():]


def _iter_xlsx_cell_parts(sheet_xml: str):
    """Yield (attribute text, body) for worksheet cells in linear time."""
    cursor = 0
    opening = re.compile(r"<c\b([^>]*)>", re.IGNORECASE)
    while True:
        match = opening.search(sheet_xml, cursor)
        if not match:
            return
        attrs = match.group(1) or ""
        if attrs.rstrip().endswith("/"):
            yield attrs[:-1], ""
            cursor = match.end()
            continue
        close = sheet_xml.find("</c>", match.end())
        if close < 0:
            return
        yield attrs, sheet_xml[match.end():close]
        cursor = close + 4


def _xlsx_cells_with_original_strings(xlsx_bytes: bytes) -> dict[str, dict[tuple[int, int], str]]:
    cached = _index_memo_get("strings", xlsx_bytes)
    if cached is not _INDEX_MISS:
        return cached
    shared_xml = (read_zip_entry(xlsx_bytes, "xl/sharedStrings.xml") or b"").decode("utf-8", errors="replace")
    shared = []
    for item in re.finditer(r"<si\b[^>]*>([\s\S]*?)</si>", shared_xml, re.IGNORECASE):
        shared.append("".join(_unescape_xml(m.group(1)) for m in re.finditer(r"<t\b[^>]*>([\s\S]*?)</t>", item.group(1), re.IGNORECASE)))
    result = {}
    for sheet_name, entry_path in _resolve_xlsx_sheet_entries(xlsx_bytes).items():
        sheet_xml = (read_zip_entry(xlsx_bytes, entry_path) or b"").decode("utf-8", errors="replace"); cells = {}
        for attrs_text, body in _iter_xlsx_cell_parts(sheet_xml):
            cell_attrs = _xml_attrs(attrs_text)
            kind = cell_attrs.get("t", "").lower()
            coord = re.fullmatch(r"([A-Z]+)(\d+)", cell_attrs.get("r", ""), re.IGNORECASE)
            if not coord or kind not in {"s", "str", "inlinestr"}: continue
            if kind == "s":
                raw = re.search(r"<v\b[^>]*>([\s\S]*?)</v>", body, re.IGNORECASE); value = shared[int(raw.group(1))] if raw and int(raw.group(1)) < len(shared) else ""
            else: value = "".join(_unescape_xml(m.group(1)) for m in re.finditer(r"<t\b[^>]*>([\s\S]*?)</t>", body, re.IGNORECASE)) or _unescape_xml(re.search(r"<v\b[^>]*>([\s\S]*?)</v>", body, re.IGNORECASE).group(1) if re.search(r"<v\b[^>]*>([\s\S]*?)</v>", body, re.IGNORECASE) else "")
            column = 0
            for char in coord.group(1).upper(): column = column * 26 + ord(char) - 64
            cells[(int(coord.group(2)), column)] = value
        if cells: result[sheet_name] = cells
    _index_memo_put("strings", xlsx_bytes, result)
    return result


def _overlay_sheet_original_strings_from_xlsx(xlsx_bytes: bytes, fods_xml: str) -> str:
    by_sheet = _xlsx_cells_with_original_strings(xlsx_bytes)
    pieces, cursor = [], 0
    for start, end in _flat_xml_blocks(fods_xml, ("table:table",)):
        pieces.append(fods_xml[cursor:start]); table_xml = fods_xml[start:end]
        table_attrs = _xml_attrs(re.match(r"<[^>]+", table_xml).group(0)); targets = by_sheet.get(table_attrs.get("table:name", ""), {})
        if targets:
            rows = {}
            for (row, col), value in targets.items(): rows.setdefault(row, {})[col] = value
            row_pieces, row_cursor, row_number = [], 0, 1
            sorted_rows, target_index = sorted(rows), 0
            for row_start, row_end in _flat_xml_blocks(table_xml, ("table:table-row",)):
                row_pieces.append(table_xml[row_cursor:row_start]); row_xml = table_xml[row_start:row_end]
                repeat = _repeat_count(row_xml, "table:number-rows-repeated")
                while target_index < len(sorted_rows) and sorted_rows[target_index] < row_number:
                    target_index += 1
                hit_end = target_index
                while hit_end < len(sorted_rows) and sorted_rows[hit_end] < row_number + repeat:
                    hit_end += 1
                hits = sorted_rows[target_index:hit_end]
                target_index = hit_end
                if not hits: row_pieces.append(row_xml)
                else:
                    at = row_number
                    for row in hits:
                        if row > at: row_pieces.append(_set_repeat(row_xml, "table:number-rows-repeated", row - at))
                        row_pieces.append(_overlay_strings_in_row(_set_repeat(row_xml, "table:number-rows-repeated", 1), rows[row])); at = row + 1
                    if at < row_number + repeat: row_pieces.append(_set_repeat(row_xml, "table:number-rows-repeated", row_number + repeat - at))
                row_cursor, row_number = row_end, row_number + repeat
            row_pieces.append(table_xml[row_cursor:]); table_xml = "".join(row_pieces)
        pieces.append(table_xml); cursor = end
    pieces.append(fods_xml[cursor:]); return "".join(pieces)


def _extract_default_font_digit_width(xlsx_bytes: bytes) -> float:
    font = _extract_normal_font_from_xlsx(xlsx_bytes)
    if not font:
        return 7.0
    return _calculate_digit_width(font["name"], font["size"])


def _extract_normal_font_from_xlsx(xlsx_bytes: bytes) -> dict | None:
    """Extract the Normal font (fonts[0] and cellStyleXfs[0] reference) from XLSX styles.xml.
    
    Returns dict with: name, size, color (theme/tint/rgb), scheme, bold, italic, underline, strike.
    """
    entry = read_zip_entry(xlsx_bytes, "xl/styles.xml")
    if not entry:
        return None
    styles_xml = entry.decode("utf-8", errors="replace")
    font_match = re.search(r"<fonts\b[^>]*>(.*?)</fonts>", styles_xml, re.S | re.IGNORECASE)
    if not font_match:
        return None
    first_font = re.search(r"<font\b[^>]*>(.*?)</font>", font_match.group(1), re.S | re.IGNORECASE)
    if not first_font:
        return None
    content = first_font.group(1)
    name_m = re.search(r'<name\b[^>]*val="([^"]*)"', content, re.IGNORECASE)
    size_m = re.search(r'<sz\b[^>]*val="([\d.]+)"', content, re.IGNORECASE)
    color_m = re.search(r'<color\b([^>]*)/?>', content, re.IGNORECASE)
    scheme_m = re.search(r'<scheme\b[^>]*val="([^"]*)"', content, re.IGNORECASE)
    bold = bool(re.search(r"<b\b", content, re.IGNORECASE))
    italic = bool(re.search(r"<i\b", content, re.IGNORECASE))
    underline_m = re.search(r'<u\b([^>]*)/?>', content, re.IGNORECASE)
    strike = bool(re.search(r"<strike\b", content, re.IGNORECASE))
    
    font = {
        "name": name_m.group(1) if name_m else "Calibri",
        "size": float(size_m.group(1)) if size_m else 11.0,
        "scheme": scheme_m.group(1) if scheme_m else "minor",
        "bold": bold,
        "italic": italic,
        "strike": strike,
    }
    if color_m:
        color_attrs = color_m.group(1)
        theme_m = re.search(r'theme\s*=\s*["\']([^"\']+)["\']', color_attrs, re.IGNORECASE)
        tint_m = re.search(r'tint\s*=\s*["\']([^"\']+)["\']', color_attrs, re.IGNORECASE)
        rgb_m = re.search(r'rgb\s*=\s*["\']([^"\']+)["\']', color_attrs, re.IGNORECASE)
        font["color"] = {}
        if theme_m:
            font["color"]["theme"] = theme_m.group(1)
        if tint_m:
            font["color"]["tint"] = tint_m.group(1)
        if rgb_m:
            font["color"]["rgb"] = rgb_m.group(1)
    if underline_m:
        u_attrs = underline_m.group(1)
        val_m = re.search(r'val\s*=\s*["\']([^"\']+)["\']', u_attrs, re.IGNORECASE)
        font["underline"] = val_m.group(1) if val_m else "single"
    return font


def _extract_sheet_format_pr_from_xlsx(xlsx_bytes: bytes) -> dict[str, dict]:
    """Extract sheetFormatPr (defaultColWidth, defaultRowHeight, customHeight) for each sheet."""
    result: dict[str, dict] = {}
    sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    for sheet_name, entry_path in sheet_entries.items():
        entry = read_zip_entry(xlsx_bytes, entry_path)
        if not entry:
            continue
        sheet_xml = entry.decode("utf-8", errors="replace")
        sfpr_match = re.search(r"<sheetFormatPr\b([^>]*)/?>", sheet_xml, re.IGNORECASE)
        # S11: sheet không có sheetFormatPr/defaultColWidth vẫn có mặt (info rỗng) để bước
        # khôi phục biết phải BỎ defaultColWidth="11.53515625" LibreOffice tự thêm.
        info = {}
        if sfpr_match:
            attrs = sfpr_match.group(1)
            dcw_m = re.search(r'defaultColWidth\s*=\s*["\']([\d.]+)["\']', attrs, re.IGNORECASE)
            bcw_m = re.search(r'baseColWidth\s*=\s*["\']([\d.]+)["\']', attrs, re.IGNORECASE)
            drh_m = re.search(r'defaultRowHeight\s*=\s*["\']([\d.]+)["\']', attrs, re.IGNORECASE)
            ch_m = re.search(r'customHeight\s*=\s*["\']([^"\']+)["\']', attrs, re.IGNORECASE)
            if dcw_m:
                info["defaultColWidth"] = float(dcw_m.group(1))
            if bcw_m:
                # xsd:unsignedByte — ghi lại phải là số nguyên, Excel từ chối "10.0"
                info["baseColWidth"] = int(float(bcw_m.group(1)))
            if drh_m:
                info["defaultRowHeight"] = float(drh_m.group(1))
            if ch_m:
                info["customHeight"] = ch_m.group(1)
        result[sheet_name] = info
    return result


def _unchanged_default_column_chars(format_pr: dict | None, digit_width: float) -> float:
    """Giá trị chars_for() mà app trả về cho cột KHÔNG có <col> trong file gốc và không bị đổi.

    - Có `defaultColWidth`: LibreOffice nhập giá trị đó như số ký tự + 5px lề → chars_for = dcw
      (đo KHOACUA: dcw 12.625 → 2.8046cm → 12.63).
    - Không có: Excel 2016 vẽ cột mặc định 64px (MDW 7: Calibri 11/Arial 10), 72px (MDW 8:
      Calibri 12/Arial 11/Times New Roman 12) = 8*MDW + 8, hiển thị 8 + 3/MDW (8.43 / 8.38 đúng
      như Excel báo; đo _excel_mdw.ps1 19/9); `baseColWidth` thay số 8. App trả 8.43 (lan17),
      8.00 (lan21), 10.57 (lan01 base 10) → dung sai 0.5 ký tự.
    """
    mdw = digit_width or 7.0
    format_pr = format_pr or {}
    if format_pr.get("defaultColWidth"):
        return float(format_pr["defaultColWidth"])
    base = float(format_pr.get("baseColWidth") or 8.0)
    # S30c: app vẽ cột mặc định = base·MDW + 8 px (64/72 như Excel) → chars_for = base + 8/MDW (9.14 với MDW 7)
    return base + 8.0 / mdw


def _source_columns_with_explicit_width(source_sheet_xml: str | None) -> set[int] | None:
    """Chỉ số các cột có width= trong <cols> của worksheet gốc; None khi không có worksheet gốc."""
    if source_sheet_xml is None:
        return None
    explicit: set[int] = set()
    for match in re.finditer(r"<col\b([^>]*)/?>", source_sheet_xml, re.IGNORECASE):
        attrs = match.group(1)
        if not re.search(r'\bwidth\s*=\s*"', attrs, re.IGNORECASE):
            continue
        minimum = re.search(r'\bmin="(\d+)"', attrs)
        maximum = re.search(r'\bmax="(\d+)"', attrs)
        if not minimum:
            continue
        low = int(minimum.group(1))
        high = int(maximum.group(1)) if maximum else low
        explicit.update(range(low, min(high, 16384) + 1))
    return explicit


def _calculate_digit_width(font_name: str, font_size: float) -> float:
    """Calculate max digit width (mdw) for a given font name and size.
    
    This matches the logic in _extract_default_font_digit_width but allows
    using the original font's metrics.
    """
    font_name_lower = font_name.lower()
    if "arial" in font_name_lower:
        return 8.0 if font_size >= 11 else 7.0
    if "times" in font_name_lower:
        return 8.0 if font_size >= 12 else 7.0
    if "calibri" in font_name_lower:
        return 8.0 if font_size >= 12 else 7.0
    return 7.0


_EXCEL_ROW_HEIGHTS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "excel_row_heights.json")
_EXCEL_ROW_HEIGHTS_CACHE: dict | None = None


def _excel_row_height_table() -> dict:
    """Bảng chiều cao hàng AutoFit của Excel 2016 đo bằng COM (scripts/layout-audit/_excel_font_row_heights.ps1):
    font -> size -> [h1, h2, h3, h5, h1b, h2b, h3b, h5b] px @96dpi (1/2/3/5 dòng, thường/đậm), workbook Normal Calibri 11."""
    global _EXCEL_ROW_HEIGHTS_CACHE
    if _EXCEL_ROW_HEIGHTS_CACHE is None:
        try:
            with open(_EXCEL_ROW_HEIGHTS_PATH, "r", encoding="utf-8") as handle:
                _EXCEL_ROW_HEIGHTS_CACHE = json.load(handle)
        except (OSError, ValueError):
            _EXCEL_ROW_HEIGHTS_CACHE = {}
    return _EXCEL_ROW_HEIGHTS_CACHE


_GDI_DESCENT_CACHE: dict[tuple[str, int, bool, bool], int | None] = {}
# Font không cài -> Excel thay font gần tên (lan28 "Times Roman" 11 đậm: hàng 19 = TNR 11 đậm, không phải Calibri 20)
_EXCEL_FONT_ALIASES = {"times roman": "Times New Roman", "times": "Times New Roman", "timesnewroman": "Times New Roman",
                       "helvetica": "Arial", "courier": "Courier New", "arial unicode ms": "Arial"}


_FONT_DESCENT_TABLE: dict | None = None


def _font_descent_from_table(font_key: str, ppem: int, bold: bool, italic: bool) -> int | None:
    """tmDescent from the prebuilt Windows-GDI table (same numbers on every OS); None when not covered.

    VNO_FONT_TABLE_LEGACY=1 skips the table and keeps asking GDI directly (the previous behaviour).
    """
    global _FONT_DESCENT_TABLE
    if os.environ.get("VNO_FONT_TABLE_LEGACY") == "1":
        return None
    if _FONT_DESCENT_TABLE is None:
        try:
            path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "font_descent_table.json")
            with open(path, "r", encoding="utf-8") as handle:
                _FONT_DESCENT_TABLE = json.load(handle)
        except Exception:
            _FONT_DESCENT_TABLE = {"fonts": {}, "minPpem": 0, "maxPpem": -1}
    table = _FONT_DESCENT_TABLE
    series = (table.get("fonts") or {}).get(font_key, {}).get(f"b{int(bold)}i{int(italic)}")
    if not series or not table["minPpem"] <= ppem <= table["maxPpem"]:
        return None
    value = series[ppem - table["minPpem"]]
    return int(value) if value is not None else None


def _gdi_font_descent(font_name: str, size_pt: float, bold: bool, italic: bool = False) -> int | None:
    """tmDescent (px nguyên, GDI) của font ở ppem = round(pt·96/72); None ngoài Windows hoặc font không cài
    (GDI thay bằng font khác — lan28 "Times Roman": Excel vẽ bằng font thay thế có desc 4 -> hàng 20, không phải 21)."""
    font_name = _EXCEL_FONT_ALIASES.get(str(font_name).lower(), font_name)
    px = int(round(float(size_pt) * 96 / 72))
    key = (str(font_name).lower(), px, bool(bold), bool(italic))
    if key in _GDI_DESCENT_CACHE:
        return _GDI_DESCENT_CACHE[key]
    value: int | None = _font_descent_from_table(key[0], px, bool(bold), bool(italic))
    if value is not None:
        _GDI_DESCENT_CACHE[key] = value
        return value
    try:
        import ctypes
        from ctypes import wintypes

        class _TEXTMETRICW(ctypes.Structure):
            _fields_ = [("tmHeight", wintypes.LONG), ("tmAscent", wintypes.LONG), ("tmDescent", wintypes.LONG),
                        ("tmInternalLeading", wintypes.LONG), ("tmExternalLeading", wintypes.LONG), ("tmAveCharWidth", wintypes.LONG),
                        ("tmMaxCharWidth", wintypes.LONG), ("tmWeight", wintypes.LONG), ("tmOverhang", wintypes.LONG),
                        ("tmDigitizedAspectX", wintypes.LONG), ("tmDigitizedAspectY", wintypes.LONG), ("tmFirstChar", wintypes.WCHAR),
                        ("tmLastChar", wintypes.WCHAR), ("tmDefaultChar", wintypes.WCHAR), ("tmBreakChar", wintypes.WCHAR),
                        ("tmItalic", ctypes.c_byte), ("tmUnderlined", ctypes.c_byte), ("tmStruckOut", ctypes.c_byte),
                        ("tmPitchAndFamily", ctypes.c_byte), ("tmCharSet", ctypes.c_byte)]

        gdi32, user32 = ctypes.windll.gdi32, ctypes.windll.user32
        hdc = user32.GetDC(0)
        hfont = gdi32.CreateFontW(-px, 0, 0, 0, 700 if bold else 400, 1 if italic else 0, 0, 0, 1, 0, 0, 4, 0, str(font_name))
        old = gdi32.SelectObject(hdc, hfont)
        metrics = _TEXTMETRICW()
        face = ctypes.create_unicode_buffer(64)
        gdi32.GetTextFaceW(hdc, 64, face)
        if gdi32.GetTextMetricsW(hdc, ctypes.byref(metrics)) and face.value.lower() == str(font_name).lower():
            value = int(metrics.tmDescent)
        gdi32.SelectObject(hdc, old)
        gdi32.DeleteObject(hfont)
        user32.ReleaseDC(0, hdc)
    except Exception:
        value = None
    _GDI_DESCENT_CACHE[key] = value
    return value


def _excel_normal_descent(normal_font: dict | None) -> int:
    """tmDescent của font Normal (sổ tính); mặc định 4 = Calibri 11 (bảng đo)."""
    if not normal_font:
        return 4
    value = _gdi_font_descent(normal_font.get("name") or "Calibri", float(normal_font.get("size") or 11), bool(normal_font.get("bold")))
    return 4 if value is None else value


def _excel_font_line_heights(font_name: str, size: float, bold: bool, normal_descent: int = 4, italic: bool = False) -> list[float] | None:
    """[h1, h2, h3, h5] cho font/cỡ trong sổ có font Normal với tmDescent = normal_descent (dạng cho app/JS đo DOM).

    S31f (đo COM 21/9 với Normal Calibri 11/Arial 10/TNR 12/TNR 13, _excel_multiline.ps1): hàng n dòng = n·L + pad,
    L = bước dòng của font ô (không phụ thuộc Normal), pad = max(0, tmDescent(Normal) − tmDescent(font ô)) (GDI, px nguyên):
    Normal Calibri 11 (desc 4): TNR 10 (desc 3) 17n+1, Arial 12 (desc 3) 20n+1, Calibri 6 (desc 2) 11n+2, TNR 12 (desc 4) 21n;
    Normal Arial 10 (desc 3): TNR 10 17n, Arial 9 16n (lan15 s3: 4 dòng = 64, không phải 65). h1 = L + pad (chưa áp sàn
    StandardHeight — sàn do hàng áp). Bảng excel_row_heights.json đo dưới Normal Calibri 11 -> L = (h5−h3)/2."""
    metrics = _excel_font_metrics(font_name, size, bold, italic)
    if not metrics:
        return None
    step, descent = metrics
    pad = max(0.0, float(normal_descent) - descent)
    return [step + pad, 2 * step + pad, 3 * step + pad, 5 * step + pad]


_EXCEL_FONT_METRICS_CACHE: dict[tuple, tuple[float, float] | None] = {}


def _excel_font_metrics(font_name: str, size: float, bold: bool, italic: bool = False) -> tuple[float, float] | None:
    """(L bước dòng px, d tmDescent px) của font/cỡ: L từ bảng excel_row_heights.json (đo dưới Normal Calibri 11, nội suy cỡ lẻ,
    font lạ dùng Calibri); d từ GDI, không có (ngoài Windows / font không cài -> Excel thay font, lan28 "Times Roman") thì
    suy từ pad đo trong bảng = max(0, 4 − d) (pad 0 -> coi d = 4). Cache theo (font, cỡ, đậm, nghiêng): lan06 gọi 3,5 triệu lần."""
    key = (str(font_name), float(size), bool(bold), bool(italic))
    if key in _EXCEL_FONT_METRICS_CACHE:
        return _EXCEL_FONT_METRICS_CACHE[key]
    value = _excel_font_metrics_uncached(font_name, size, bold, italic)
    if len(_EXCEL_FONT_METRICS_CACHE) < 4096:
        _EXCEL_FONT_METRICS_CACHE[key] = value
    return value


def _excel_font_metrics_uncached(font_name: str, size: float, bold: bool, italic: bool = False) -> tuple[float, float] | None:
    table = _excel_row_height_table()
    if not table:
        return None
    font_name = _EXCEL_FONT_ALIASES.get(str(font_name).lower(), font_name)
    entry = table.get(font_name) or next((value for key, value in table.items() if key.lower() == str(font_name).lower()), None)
    if entry is None:
        entry = table.get("Calibri")
        if entry is None:
            return None
    sizes = sorted((float(key), value) for key, value in entry.items() if value)
    if not sizes:
        return None
    offset = 4 if bold else 0

    def pick(values: list[float]) -> list[float]:
        # S31g: bảng 16 số [r, b, i, bi]; bảng cũ 8 số -> nghiêng dùng thẳng/đậm
        start = offset + (8 if italic and len(values) >= 16 else 0)
        return [float(v) for v in values[start:start + 4]]

    lower = max((item for item in sizes if item[0] <= size), default=None)
    upper = min((item for item in sizes if item[0] >= size), default=None)
    if lower is None:
        measured = pick(upper[1])
    elif upper is None or upper[0] == lower[0]:
        measured = pick(lower[1])
    else:
        ratio = (size - lower[0]) / (upper[0] - lower[0])
        low, high = pick(lower[1]), pick(upper[1])
        measured = [round(low[i] + (high[i] - low[i]) * ratio) for i in range(4)]
    step = max(1.0, (measured[3] - measured[2]) / 2)
    pad_measured = max(0.0, measured[1] - 2 * step)
    descent = _gdi_font_descent(font_name, size, bold, italic)
    if descent is None:
        descent = 4 - pad_measured if pad_measured > 0 else 4
    return step, float(descent)


def _excel_row_height_from_cells(explicit: list[tuple], implicit: list[tuple[float, float]] | None = None,
                                 normal: tuple[float, float] | None = None) -> float:
    """S31h — chiều cao hàng Excel: ô ghi trong <row> (explicit: (ΣL, d_cuối, căn_đáy)) và ô ngầm (implicit (L, d): style hàng
    nếu customFormat, không thì style cột `<col style>` của các cột chưa có ô; `normal` = (L, d) Normal khi còn cột không có
    style). Cao hàng = max( ΣL_i + đệm_i, L_j ngầm, L_Normal ) với đệm_i = max(0, D − d_i) CHỈ cho ô căn đáy (mặc định),
    D = max descent các ô ngầm (kể cả Normal); ô căn giữa/trên không đệm.

    Đo COM 21/9 (_pad_ref_probe.py, _valign_probe.py): Normal Calibri 11 (20, d 4) + ô Arial 12 căn đáy (20, 3) -> 21, căn giữa
    -> 20; Calibri 10 2 dòng căn đáy 35, căn giữa/trên 34 (lan08 hàng 12); mọi cột style TNR 10 (d 3) + Arial 12 đáy -> 20, + TNR 10
    -> 17 (lan05 hàng 85); lan11 s2 hàng 151: cột Calibri 18 (d 6), B151 giữa 2 dòng TNR 18 đậm = 60, D151 đáy 30+1 = 31 -> 60;
    lan12 s1 hàng 15 (ô ngầm cột C TNR 12) -> 21, hàng 16 (A..E TNR 11 che cột C) -> 20; lan10 s3 hàng 29 (6 dòng giữa) -> 102."""
    implicit = list(implicit or [])
    if normal:
        implicit.append(normal)
    if not explicit and not implicit:
        return 0.0
    # D mặc định = max descent ô ngầm; ô tường minh có thể mang D riêng (phần tử thứ 4) = max(descent style cột/hàng của
    # chính ô đó, descent Normal) — lan12 s4 hàng 9: D9 TNR 12 căn đáy 6 dòng = 126 dù cột G–I style Calibri 15 (d 5) trống
    reference = max((d for _, d in implicit), default=0.0)
    best = max((total for total, _ in implicit), default=0.0)
    for cell in explicit:
        total, descent = float(cell[0]), float(cell[1])
        bottom = cell[2] if len(cell) > 2 else True
        own_reference = float(cell[3]) if len(cell) > 3 and cell[3] is not None else reference
        best = max(best, total + (max(0.0, own_reference - descent) if bottom else 0.0))
    return min(_EXCEL_MAX_ROW_PX, float(round(best)))


def excel_auto_row_height_px(line_heights: list[float] | None, lines: int) -> float | None:
    """Chiều cao hàng AutoFit khi ô bọc chữ có `lines` dòng (đo: n<=5 tra bảng, n>5 ngoại suy từ h3->h5)."""
    if not line_heights:
        return None
    h1, h2, h3, h5 = line_heights
    if lines <= 1:
        return h1
    if lines == 2:
        return h2
    if lines == 3:
        return h3
    if lines == 4:
        return round(h3 + (h5 - h3) / 2)
    if lines == 5:
        return h5
    return round(h5 + (lines - 5) * (h5 - h3) / 2)


def _excel_single_line_height_px(font_name: str, size: float, bold: bool, normal_descent: int = 4, italic: bool = False) -> float | None:
    """Chiều cao 1 dòng của font trong sổ (chưa áp sàn StandardHeight) = L + pad (S31f): TNR 8 -> 15+1 = 16 (Normal Calibri 11),
    Arial 10 -> 17+1 = 18, Arial 12 -> 20+1 = 21 (= h1 đo), TNR 12 -> 21."""
    heights = _excel_font_line_heights(font_name, size, bold, normal_descent, italic)
    if not heights:
        return None
    return max(1.0, heights[0])


def _xlsx_cell_fonts(xlsx_bytes: bytes) -> tuple[list[dict], list[dict]]:
    """fonts[] = {name, size, bold}; cellXfs[] = {fontId, wrap} từ xl/styles.xml."""
    entry = read_zip_entry(xlsx_bytes, "xl/styles.xml")
    if not entry:
        return [], []
    styles_xml = _unprefix_spreadsheetml(entry.decode("utf-8", errors="replace"))
    fonts: list[dict] = []
    fonts_match = re.search(r"<fonts\b[^>]*>(.*?)</fonts>", styles_xml, re.S | re.IGNORECASE)
    if fonts_match:
        for font_match in re.finditer(r"<font\b[^>]*?(?:/>|>(.*?)</font>)", fonts_match.group(1), re.S | re.IGNORECASE):
            content = font_match.group(1) or ""
            name_m = re.search(r'<name\b[^>]*val="([^"]*)"', content, re.IGNORECASE)
            size_m = re.search(r'<sz\b[^>]*val="([\d.]+)"', content, re.IGNORECASE)
            fonts.append({
                "name": _unescape_xml(name_m.group(1)) if name_m else "Calibri",
                "size": float(size_m.group(1)) if size_m else 11.0,
                "bold": bool(re.search(r"<b\b(?:\s*/>|\s+val=\"(?:1|true)\")", content, re.IGNORECASE)),
                "italic": bool(re.search(r"<i\b(?:\s*/>|\s+val=\"(?:1|true)\")", content, re.IGNORECASE)),
            })
    # S31i: viền dưới medium/thick +1px, double +2px; viền trên thick/double +1px (đo COM 21/9 _border_probe.ps1; lan08 hàng 4/8 thickBot)
    borders: list[tuple[int, int]] = []
    borders_match = re.search(r"<borders\b[^>]*>(.*?)</borders>", styles_xml, re.S | re.IGNORECASE)
    if borders_match:
        for border_match in re.finditer(r"<border\b[^>]*?(?:/>|>(.*?)</border>)", borders_match.group(1), re.S | re.IGNORECASE):
            content = border_match.group(1) or ""
            bottom_style = re.search(r'<bottom\b[^>]*\bstyle="([^"]*)"', content, re.IGNORECASE)
            top_style = re.search(r'<top\b[^>]*\bstyle="([^"]*)"', content, re.IGNORECASE)
            extra_bottom = {"medium": 1, "thick": 1, "double": 2, "mediumdashed": 1, "mediumdashdot": 1, "mediumdashdotdot": 1, "slantdashdot": 1}.get((bottom_style.group(1) if bottom_style else "").lower(), 0)
            extra_top = {"thick": 1, "double": 1}.get((top_style.group(1) if top_style else "").lower(), 0)
            borders.append((extra_top, extra_bottom))
    xfs: list[dict] = []
    xfs_match = re.search(r"<cellXfs\b[^>]*>(.*?)</cellXfs>", styles_xml, re.S | re.IGNORECASE)
    if xfs_match:
        for xf_match in re.finditer(r"<xf\b([^>]*?)(?:/>|>(.*?)</xf>)", xfs_match.group(1), re.S | re.IGNORECASE):
            attrs, body = xf_match.group(1) or "", xf_match.group(2) or ""
            font_id = re.search(r'\bfontId="(\d+)"', attrs)
            border_id = re.search(r'\bborderId="(\d+)"', attrs)
            valign = re.search(r'<alignment\b[^>]*\bvertical="([^"]*)"', body, re.IGNORECASE)
            extra = borders[int(border_id.group(1))] if border_id and int(border_id.group(1)) < len(borders) else (0, 0)
            xfs.append({
                "fontId": int(font_id.group(1)) if font_id else 0,
                "wrap": bool(re.search(r'<alignment\b[^>]*wrapText="(?:1|true)"', body, re.IGNORECASE)),
                "bottom": (valign.group(1).lower() if valign else "bottom") == "bottom",
                "borderTop": extra[0],
                "borderBottom": extra[1],
            })
    return fonts, xfs


_EXCEL_CHAR_WIDTHS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "excel_char_widths.json")
_EXCEL_CHAR_WIDTHS_CACHE: dict | None = None
_EXCEL_MAX_ROW_PX = 546.0  # 409.5pt


def _excel_row_ht_px(ht_pt: float) -> float:
    """S31d: px màn hình của hàng có `ht` (pt) trong XLSX = floor((ht·20 + 1)/15) = floor(ht·4/3 + 1/15).

    Đo Excel 2016 bằng ảnh chụp cửa sổ (_excel_rowpx_shot.ps1, 21/9): 47.95pt -> 64px, 37.45 -> 50, 60.6 -> 80, 19.8 -> 26;
    ngưỡng RowHeight nhảy 12.7pt -> 17px, 13.46 -> 18, 14.2 -> 19 (bước 0.02pt). floor(ht px) sai với các ht dạng x.95
    (lan11 s3: 11 hàng 63 thay vì 64, 399 thay vì 400)."""
    return float(math.floor((ht_pt * 20 + 1) / 15 + 1e-9))


def _excel_char_width_table() -> dict:
    """S31c: bảng bề rộng ký tự Excel 2016 (scripts/layout-audit/_excel_char_widths.ps1): font -> size -> {r|b: {codepoint: px},
    mr|mb: [lo, hi]} — Excel đo chữ bằng DirectWrite natural width (không phải GDI nguyên px, không phải Chromium),
    không kerning; lề khả dụng khi bọc chữ = bề rộng cột − m (m ≈ 4px cỡ ≤ 16px, ≈ 6px cỡ 20–24px, không phụ thuộc font Normal)."""
    global _EXCEL_CHAR_WIDTHS_CACHE
    if _EXCEL_CHAR_WIDTHS_CACHE is None:
        try:
            with open(_EXCEL_CHAR_WIDTHS_PATH, "r", encoding="utf-8-sig") as handle:
                _EXCEL_CHAR_WIDTHS_CACHE = json.load(handle)
        except (OSError, ValueError):
            _EXCEL_CHAR_WIDTHS_CACHE = {}
    return _EXCEL_CHAR_WIDTHS_CACHE


def _excel_natural_widths(font_name: str, size: float, bold: bool) -> tuple[dict, float] | None:
    """({codepoint: px}, margin px) cho font/cỡ đúng trong bảng; None nếu chưa đo (app đo bằng DOM)."""
    table = _excel_char_width_table()
    font_name = _EXCEL_FONT_ALIASES.get(str(font_name).lower(), font_name)
    entry = table.get(font_name) or next((value for key, value in table.items() if key.lower() == str(font_name).lower()), None)
    if not entry:
        return None
    sizes = entry.get(str(size)) or entry.get(str(int(size)) if float(size).is_integer() else "") or entry.get(("%g" % size))
    if not sizes:
        return None
    widths = sizes.get("b" if bold else "r")
    if not widths:
        return None
    # Lề khả dụng = 2·floor((MDW + 3)/4) với MDW = bề rộng natural lớn nhất của chữ số 0–9 (đo 170 font/cỡ: đúng 165, 5 sai ở
    # 7pt đậm); Calibri 11 MDW 7.25 -> 4; TNR 15 MDW 10.4 -> 6; Arial 18 MDW 13.5 -> 8; Arial 28 MDW 21.75 -> 12.
    digits = [float(widths[str(ord(ch))]) for ch in "0123456789" if str(ord(ch)) in widths]
    if not digits:
        return None
    margin = 2 * math.floor((max(digits) + 3) / 4)
    return widths, float(margin)


def _excel_wrap_lines(runs: list[dict], avail: float) -> list[list[int]] | None:
    """Mô phỏng ngắt dòng của Excel cho một ô bọc chữ: runs = [{t, w: {cp: px}, k: font-key}], avail = bề rộng khả dụng px.

    Đo Excel (_excel_wrap_exact.py, 15 ngưỡng 64–400px): một dòng chứa được khi tổng bề rộng natural (kể cả khoảng trắng)
    ≤ avail; không vừa thì ngắt sau khoảng trắng cuối cùng trên dòng (khoảng trắng ở lại dòng trên), từ dài hơn dòng thì
    ngắt theo ký tự; "\\n" luôn ngắt và thuộc dòng nó kết thúc (font của "\\n" tính cho dòng đó — S31b).
    Trả về danh sách dòng, mỗi dòng = danh sách chỉ số run có ký tự trên dòng; None nếu có ký tự chưa đo.
    """
    chars: list[tuple[str, float, int]] = []
    for index, run in enumerate(runs):
        widths = run["w"]
        for ch in run["t"]:
            if ch == "\n":
                chars.append((ch, 0.0, index))
                continue
            width = widths.get(str(ord(ch)))
            if width is None:
                if ch in "\t\r":
                    width = widths.get("32", 0.0)
                else:
                    return None
            chars.append((ch, float(width), index))
    lines: list[list[tuple[str, float, int]]] = []
    line: list[tuple[str, float, int]] = []
    total = 0.0
    last_break = -1  # số ký tự của dòng tính đến sau khoảng trắng cuối
    index = 0
    while index < len(chars):
        item = chars[index]
        ch, width, _ = item
        if ch == "\n":
            line.append(item)
            lines.append(line)
            line, total, last_break = [], 0.0, -1
            index += 1
            continue
        if line and ch != " " and total + width > avail + 1e-6:
            if last_break > 0:
                carried = len(line) - last_break
                lines.append(line[:last_break])
                index -= carried  # ký tự sau khoảng trắng xuống dòng mới, xét lại từ đầu
            else:
                lines.append(line)  # từ dài hơn dòng: ngắt theo ký tự
            line, total, last_break = [], 0.0, -1
            continue
        line.append(item)
        total += width
        # Điểm ngắt: sau khoảng trắng và sau '-' (đo COM 21/9 _break_chars.ps1: "WWWW-WWWW-WW" 3 dòng; '/', '_', ',', '.',
        # en-dash, NBSP… không phải điểm ngắt); lan08 B4 "HP P204v 19.5-inch Monitor" = 2 dòng nhờ ngắt sau "19.5-"
        if ch in " -":
            last_break = len(line)
        index += 1
    lines.append(line)
    result: list[list[int]] = []
    for entry in lines:
        if entry:
            result.append(sorted({run for _, _, run in entry}))
        else:
            result.append([chars[-1][2] if chars else 0])  # dòng trống cuối ("\n" cuối ô): font của "\n" đó
    return result


def _excel_wrapped_cell_extent(runs: list[dict], avail: float) -> tuple[float, float] | None:
    """S31b+S31c: (ΣL, d_cuối) của ô bọc chữ mô phỏng bằng Python từ bảng Excel — runs = [{t, w, L, d}] (w: bề rộng ký tự,
    L bước dòng, d descent của run); mỗi dòng lấy run có L lớn nhất (kể cả run chứa "\\n" kết thúc dòng).
    None nếu không mô phỏng được (thiếu bảng/ký tự) -> app đo bằng DOM."""
    lines = _excel_wrap_lines(runs, avail)
    if not lines:
        return None
    total = 0.0
    last = runs[0]
    for line in lines:
        dominant = max((runs[i] for i in line), key=lambda run: float(run["L"]), default=last)
        total += float(dominant["L"])
        last = dominant
    return total, float(last["d"])


def _excel_wrapped_row_height(runs: list[dict], avail: float, normal_descent: float = 4.0) -> float | None:
    """Chiều cao hàng chỉ có ô bọc chữ này + ô ngầm Normal (dùng cho test/đối chiếu) = ΣL + max(0, D − d_cuối)."""
    extent = _excel_wrapped_cell_extent(runs, avail)
    if extent is None:
        return None
    return _excel_row_height_from_cells([extent], [], (0.0, float(normal_descent)))


def _xlsx_rich_runs(fragment: str) -> list[tuple[str, dict]] | None:
    """[(text, {name?, size?, bold?, italic?}), ...] từ một <si>/<is> có <r>; None nếu chuỗi thuần (không <r>)."""
    if not re.search(r"<r\b", fragment, re.IGNORECASE):
        return None
    runs: list[tuple[str, dict]] = []
    for run in re.finditer(r"<r\b[^>]*>([\s\S]*?)</r>", fragment, re.IGNORECASE):
        body = run.group(1)
        text = "".join(_unescape_xml(m.group(1)) for m in re.finditer(r"<t\b[^>]*>([\s\S]*?)</t>", body, re.IGNORECASE))
        if not text:
            continue
        props: dict = {}
        rpr = re.search(r"<rPr\b[^>]*>([\s\S]*?)</rPr>", body, re.IGNORECASE)
        if rpr:
            content = rpr.group(1)
            name_m = re.search(r'<rFont\b[^>]*val="([^"]*)"', content, re.IGNORECASE)
            size_m = re.search(r'<sz\b[^>]*val="([\d.]+)"', content, re.IGNORECASE)
            if name_m:
                props["name"] = _unescape_xml(name_m.group(1))
            if size_m:
                props["size"] = float(size_m.group(1))
            # Có <rPr> là run tự mô tả đầy đủ (lan11 s2 C109: run <rPr> không <b/> = thường dù ô đậm -> 30+4·31 = 154)
            props["bold"] = bool(re.search(r"<b\b(?:\s*/>|\s+val=\"(?:1|true)\")", content, re.IGNORECASE))
            props["italic"] = bool(re.search(r"<i\b(?:\s*/>|\s+val=\"(?:1|true)\")", content, re.IGNORECASE))
        runs.append((text.replace("\r\n", "\n").replace("\r", "\n"), props))
    return runs or None


def _unprefix_spreadsheetml(xml: str) -> str:
    """S32: XLSX do công cụ khác ghi (lan23: OpenXML SDK) đặt tiền tố cho namespace chính (`<x:worksheet>`, `<x:row>`, `<x:c>`,
    `<x:sst>`) -> bỏ tiền tố tên phần tử để các regex `<row\\b`, `<c\\b`, `<si\\b`… dùng chung được (thuộc tính vốn không tiền tố)."""
    match = re.search(r'\sxmlns:([A-Za-z_][\w.-]*)="http://schemas\.openxmlformats\.org/spreadsheetml/2006/main"', xml[:4000])
    if not match:
        return xml
    prefix = re.escape(match.group(1))
    xml = re.sub(r"<(/?)%s:" % prefix, r"<\1", xml)
    return xml.replace(match.group(0), ' xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"', 1)


def _xlsx_shared_strings(xlsx_bytes: bytes) -> tuple[list[str], dict[int, list[tuple[str, dict]]]]:
    """(chữ thuần theo index, index -> runs cho các shared string có định dạng theo đoạn (rich text))."""
    shared_xml = _unprefix_spreadsheetml((read_zip_entry(xlsx_bytes, "xl/sharedStrings.xml") or b"").decode("utf-8", errors="replace"))
    plain: list[str] = []
    rich: dict[int, list[tuple[str, dict]]] = {}
    for index, item in enumerate(re.finditer(r"<si\b[^>]*>([\s\S]*?)</si>", shared_xml, re.IGNORECASE)):
        body = item.group(1)
        plain.append("".join(_unescape_xml(m.group(1)) for m in re.finditer(r"<t\b[^>]*>([\s\S]*?)</t>", body, re.IGNORECASE)).replace("\r\n", "\n").replace("\r", "\n"))
        runs = _xlsx_rich_runs(body)
        if runs:
            rich[index] = runs
    return plain, rich


def _xlsx_wrap_cell_text(cell_attrs: str, cell_body: str, shared_plain: list[str]) -> str | None:
    """Chữ của ô (chỉ ô chuỗi: t="s" / inlineStr / str); None với ô số/công thức số (Excel không bọc số)."""
    kind = (re.search(r'\bt="([^"]*)"', cell_attrs) or [None, ""])[1].lower()
    if kind == "s":
        raw = re.search(r"<v\b[^>]*>\s*(\d+)\s*</v>", cell_body, re.IGNORECASE)
        if raw and int(raw.group(1)) < len(shared_plain):
            return shared_plain[int(raw.group(1))]
        return None
    if kind == "inlinestr":
        return "".join(_unescape_xml(m.group(1)) for m in re.finditer(r"<t\b[^>]*>([\s\S]*?)</t>", cell_body, re.IGNORECASE)).replace("\r\n", "\n").replace("\r", "\n")
    if kind == "str":
        raw = re.search(r"<v\b[^>]*>([\s\S]*?)</v>", cell_body, re.IGNORECASE)
        return _unescape_xml(raw.group(1)).replace("\r\n", "\n").replace("\r", "\n") if raw else None
    return None


def _xlsx_wrap_cell_runs(cell_attrs: str, cell_body: str, shared_rich: dict[int, list[tuple[str, dict]]], cell_font: dict, normal_descent: int = 4) -> list[list] | None:
    """S31b: chạy rich text của ô bọc chữ -> [[text, h1, h2, h3, h5], ...] (font của run = font ô ghi đè bởi rPr).

    Đo Excel COM 21/9 (_excel_mixed2.ps1): hàng AutoFit của ô nhiều font = tổng cao từng dòng (max font các run
    trên dòng, KỂ CẢ ký tự xuống dòng kết thúc dòng đó) + phần dư của font dòng cuối; TNR 18 "Xg\\nXg" đậm dòng 1
    (cả \\n) = 30 + 31 = 61, chỉ đậm "Xg" (không \\n) = 62; dòng trống giữa lấy font của \\n kết thúc nó.
    """
    kind = (re.search(r'\bt="([^"]*)"', cell_attrs) or [None, ""])[1].lower()
    runs = None
    if kind == "s":
        raw = re.search(r"<v\b[^>]*>\s*(\d+)\s*</v>", cell_body, re.IGNORECASE)
        if raw:
            runs = shared_rich.get(int(raw.group(1)))
    elif kind == "inlinestr":
        runs = _xlsx_rich_runs(cell_body)
    if not runs:
        return None
    result: list[dict] = []
    for text, props in runs:
        font = {
            "name": props.get("name") or cell_font["name"],
            "size": float(props.get("size") or cell_font["size"]),
            "bold": bool(props["bold"]) if "bold" in props else bool(cell_font.get("bold")),
            "italic": bool(props["italic"]) if "italic" in props else bool(cell_font.get("italic")),
        }
        heights = _excel_font_line_heights(font["name"], font["size"], font["bold"], normal_descent, font["italic"])
        if not heights:
            return None
        result.append({"t": text, "h": [float(v) for v in heights], "f": font})
    return result


def _xlsx_merged_cells(sheet_xml: str) -> tuple[set[str], set[str]]:
    """(ô thuộc vùng gộp nhiều HÀNG, ô thuộc vùng gộp bất kỳ).

    Đo Excel (lan02 s1): gộp dọc A1:A2 (TNR 23 rỗng) KHÔNG nâng hàng 1 (35px = TNR 21 đậm của B1:F1 gộp ngang);
    gộp ngang một hàng vẫn tính cỡ font 1 dòng, nhưng Excel không AutoFit số dòng bọc chữ trong ô gộp.
    """
    multi_row: set[str] = set()
    covered: set[str] = set()
    for match in re.finditer(r'<mergeCell\b[^>]*\bref="([A-Z]+)(\d+):([A-Z]+)(\d+)"', sheet_xml, re.IGNORECASE):
        c1, r1, c2, r2 = match.group(1), int(match.group(2)), match.group(3), int(match.group(4))
        try:
            lo, hi = _column_index(c1), _column_index(c2)
        except Exception:
            continue
        for row in range(r1, min(r2, r1 + 200) + 1):
            for col in range(lo, min(hi, lo + 200) + 1):
                coord = f"{_column_name(col)}{row}"
                covered.add(coord)
                if r2 > r1:
                    multi_row.add(coord)
    return multi_row, covered


def _column_index(name: str) -> int:
    number = 0
    for char in name.upper():
        number = number * 26 + (ord(char) - 64)
    return number


_COLUMN_INDEX_CACHE: dict[str, int] = {}
_XLSX_CELL_RE = re.compile(r"<c\b([^>]*?)(?:/>|>(.*?)</c>)", re.S | re.IGNORECASE)
_XLSX_CELL_S_RE = re.compile(r'\bs="(\d+)"')
_XLSX_CELL_R_RE = re.compile(r'\br="([A-Z]+)(\d+)"')


def _column_index_fast(name: str) -> int:
    value = _COLUMN_INDEX_CACHE.get(name)
    if value is None:
        value = _COLUMN_INDEX_CACHE[name] = _column_index(name)
    return value


def _xf_row_info(xfs: list[dict], fonts: list[dict], normal_font: dict, xf_index: int) -> dict:
    """Thông tin một cellXf dùng khi tính cao hàng (S31): metrics font, căn đáy, viền, bọc chữ — cache theo chỉ số xf."""
    xf = xfs[xf_index] if 0 <= xf_index < len(xfs) else {"fontId": 0, "wrap": False, "bottom": True}
    font = fonts[xf["fontId"]] if 0 <= xf["fontId"] < len(fonts) else fonts[0] if fonts else normal_font
    return {
        "font": font,
        "metrics": _excel_font_metrics(font["name"], float(font["size"]), bool(font.get("bold")), bool(font.get("italic"))),
        "bottom": bool(xf.get("bottom", True)),
        "borderTop": int(xf.get("borderTop", 0)),
        "borderBottom": int(xf.get("borderBottom", 0)),
        "wrap": bool(xf.get("wrap")),
    }


def _column_name(index: int) -> str:
    name = ""
    while index:
        index, remainder = divmod(index - 1, 26)
        name = chr(65 + remainder) + name
    return name


def _xlsx_sheet_layouts(xlsx_bytes: bytes) -> dict:
    """Layouts of every sheet, computed from the xlsx alone and memoised (a prefetch may have filled the memo)."""
    cached = _index_memo_get("layouts", xlsx_bytes)
    if cached is not _INDEX_MISS:
        return cached
    layouts = _compute_xlsx_sheet_layouts(xlsx_bytes)
    _index_memo_put("layouts", xlsx_bytes, layouts)
    return layouts


def _compute_xlsx_sheet_layouts(xlsx_bytes: bytes) -> dict:
    """Preserve exact Excel width*digit_width px and row pt->px dimensions.

    soffice canonicalizes dimensions to ODF lengths and can apply font metrics;
    the compact table-level map avoids rewriting repeated FODS columns/rows.

    S30a (đo Excel COM 21/9, lan12/lan02/lan05): Excel 2016 KHÔNG tin `ht` của hàng không có
    customHeight="1" mà tính lại khi mở = max(cao font Normal, max theo ô (kể cả ô rỗng có style)
    cao 1 dòng của font ô; ô bọc chữ có nội dung = cao theo số dòng). Hàng customHeight: px =
    floor(ht*96/72) (60.6pt -> 80px, 19.8pt -> 26px). Hàng không có <row>: floor(defaultRowHeight px).
    Ô bọc chữ cần số dòng do trình duyệt đo -> ghi `wrap` {coord: [h1,h2,h3,h5]} để app nâng hàng.
    """
    digit_width = _extract_default_font_digit_width(xlsx_bytes)
    normal_font = _extract_normal_font_from_xlsx(xlsx_bytes) or {"name": "Calibri", "size": 11.0, "bold": False}
    normal_desc = _excel_normal_descent(normal_font)
    normal_floor = _excel_single_line_height_px(normal_font["name"], float(normal_font["size"]), bool(normal_font.get("bold")), normal_desc)
    fonts, xfs = _xlsx_cell_fonts(xlsx_bytes)
    has_table = bool(_excel_row_height_table()) and normal_floor is not None
    shared_plain, shared_rich = _xlsx_shared_strings(xlsx_bytes) if has_table else ([], {})
    layouts: dict[str, dict[str, dict[str, float]]] = {}
    for sheet_name, entry_path in _resolve_xlsx_sheet_entries(xlsx_bytes).items():
        entry = read_zip_entry(xlsx_bytes, entry_path)
        if not entry:
            continue
        sheet_xml = _unprefix_spreadsheetml(entry.decode("utf-8", errors="replace"))
        columns: dict[str, float] = {}
        column_excel_px: dict[str, float] = {}
        rows: dict[str, float] = {}
        wrap_cells: dict[str, list[float] | dict] = {}
        auto_rows: list[int] = []
        merge_multi_row, merge_covered = _xlsx_merged_cells(sheet_xml) if has_table else (set(), set())
        default_m = re.search(r'<sheetFormatPr\b[^>]*\bdefaultRowHeight="([\d.]+)"', sheet_xml, re.IGNORECASE)
        zero_height = bool(re.search(r'<sheetFormatPr\b[^>]*\bzeroHeight="(?:1|true)"', sheet_xml, re.IGNORECASE))
        default_custom = bool(re.search(r'<sheetFormatPr\b[^>]*\bcustomHeight="(?:1|true)"', sheet_xml, re.IGNORECASE))
        # S31h (đo COM 21/9 _std_height_probe.py trên lan05/lan12): Excel KHÔNG dùng defaultRowHeight của file (13 hay 15 -> vẫn
        # 12.75pt); StandardHeight = cao 1 dòng lớn nhất của font style các cột (`<col style>`), cột không có style = Normal:
        # lan05 mọi cột TNR 10 -> 17px, cột A đổi về style 0 -> 20; lan12 bỏ <cols> -> 20. zeroHeight -> 0 (S30a).
        column_style_fonts: list[tuple[int, int, dict]] = []
        columns_uncovered = True
        xf_info: dict[int, dict] = {}
        column_descent_cache: dict[int, float] = {}
        normal_metrics = _excel_font_metrics(normal_font["name"], float(normal_font["size"]), bool(normal_font.get("bold"))) if has_table else None
        if has_table:
            covered: list[tuple[int, int]] = []
            for cmatch in re.finditer(r"<col\b([^>]*)/?>", sheet_xml, re.IGNORECASE):
                cattrs = cmatch.group(1)
                cmin, cmax, cstyle = re.search(r'\bmin="(\d+)"', cattrs), re.search(r'\bmax="(\d+)"', cattrs), re.search(r'\bstyle="(\d+)"', cattrs)
                if not (cmin and cmax):
                    continue
                covered.append((int(cmin.group(1)), int(cmax.group(1))))
                cxf = xfs[int(cstyle.group(1))] if cstyle and int(cstyle.group(1)) < len(xfs) else None
                cfont = fonts[cxf["fontId"]] if cxf and 0 <= cxf["fontId"] < len(fonts) else normal_font
                column_style_fonts.append((int(cmin.group(1)), int(cmax.group(1)), cfont))
            covered.sort()
            reach = 0
            for lo, hi in covered:
                if lo > reach + 1:
                    break
                reach = max(reach, hi)
            columns_uncovered = reach < 16384
        if zero_height:
            default_px = 0.0
        elif default_custom and default_m:
            default_px = float(round(float(default_m.group(1)) * 96 / 72))
        else:
            empty_implicit: list[tuple[float, float]] = []
            for _, _, cfont in column_style_fonts:
                metrics = _excel_font_metrics(cfont["name"], float(cfont["size"]), bool(cfont.get("bold")), bool(cfont.get("italic")))
                if metrics:
                    empty_implicit.append(metrics)
            empty_normal = normal_metrics if columns_uncovered else None
            default_px = _excel_row_height_from_cells([], empty_implicit, empty_normal) if (empty_implicit or empty_normal) else float(normal_floor or 20)
        # S30c (lan11 s3, cột 11–40 không có <col>): Excel vẽ cột mặc định = trunc(((256·dcw + trunc(128/MDW))/256)·MDW)
        # (dcw 14.296875, MDW 7 → 100px) còn LibreOffice ghi dcw·MDW + 5 = 106px; không dcw: base·MDW + 8 (64/72px).
        dcw_m = re.search(r'<sheetFormatPr\b[^>]*\bdefaultColWidth="([\d.]+)"', sheet_xml, re.IGNORECASE)
        base_m = re.search(r'<sheetFormatPr\b[^>]*\bbaseColWidth="([\d.]+)"', sheet_xml, re.IGNORECASE)
        mdw = digit_width or 7.0
        if dcw_m:
            default_col_px = float(math.floor(((256 * float(dcw_m.group(1)) + math.floor(128 / mdw)) / 256) * mdw + 1e-6))
        else:
            default_col_px = float(int(float(base_m.group(1)) if base_m else 8) * mdw + 8)
        for match in re.finditer(r"<col\b([^>]*)/?>", sheet_xml, re.IGNORECASE):
            attrs = match.group(1)
            width = re.search(r'\bwidth="([\d.]+)"', attrs)
            minimum = re.search(r'\bmin="(\d+)"', attrs)
            maximum = re.search(r'\bmax="(\d+)"', attrs)
            # Excel files may carry an explicit width without customWidth/bestFit
            # (lan01 D:E). It is still authoritative and must reach the app model.
            if not (width and minimum and maximum):
                continue
            for index in range(int(minimum.group(1)), int(maximum.group(1)) + 1):
                number = index
                name = ""
                while number:
                    number, remainder = divmod(number - 1, 26)
                    name = chr(65 + remainder) + name
                columns[name] = float(width.group(1)) * digit_width
                # px Excel thật (S30c): trunc(((256·w + trunc(128/MDW))/256)·MDW) — dùng cho bề rộng khả dụng bọc chữ
                column_excel_px[name] = float(math.floor(((256 * float(width.group(1)) + math.floor(128 / (digit_width or 7.0))) / 256) * (digit_width or 7.0) + 1e-6))
        for match in re.finditer(r"<row\b([^>]*?)(?:/>|>(.*?)</row>)", sheet_xml, re.IGNORECASE | re.S):
            attrs, body = match.group(1), match.group(2) or ""
            row = re.search(r'\br="(\d+)"', attrs)
            height = re.search(r'\bht="([\d.]+)"', attrs)
            if not row:
                continue
            custom = bool(re.search(r'\bcustomHeight="(?:1|true)"', attrs, re.IGNORECASE))
            if height and (custom or not has_table):
                px = float(height.group(1)) * 96 / 72
                rows[row.group(1)] = _excel_row_ht_px(float(height.group(1))) if has_table else px
                continue
            if not has_table:
                continue
            # Hàng tự động: Excel tính lại hoàn toàn từ font các ô, BỎ QUA `ht` (S31e, đo COM 21/9 _auto_ht_probe.py:
            # ht=60 không customHeight + ô 1 dòng/ô rỗng/không ô -> 20px = Normal; lan11 s3 hàng 51 ht 172.8 -> 220 = 10 dòng).
            # S31h: mọi cột đều có ô — ô không ghi trong <row> lấy style hàng (customFormat) hoặc style cột (<col style>)
            # hoặc Normal; cao hàng = max(phần trên) + max(descent) của các ô đó (_excel_row_height_from_cells).
            explicit_cols: set[int] = set()
            extents: list[tuple] = []
            implicit: list[tuple[float, float]] = []
            border_top = border_bottom = 0
            row_style = re.search(r'\bs="(\d+)"', attrs)
            row_custom_format = bool(row_style and re.search(r'\bcustomFormat="(?:1|true)"', attrs, re.IGNORECASE))
            candidates: list[dict] = []
            plain_cells: list[tuple] = []
            # lan06: 3,5 triệu ô — regex biên dịch sẵn, ô rỗng/không bọc chữ chỉ cần (xf, cột)
            for cell_match in _XLSX_CELL_RE.finditer(body):
                cell_attrs, cell_body = cell_match.group(1) or "", cell_match.group(2) or ""
                style = _XLSX_CELL_S_RE.search(cell_attrs)
                coord = _XLSX_CELL_R_RE.search(cell_attrs)
                col_name = coord.group(1) if coord else ""
                if coord:
                    explicit_cols.add(_column_index_fast(col_name))
                xf_index = int(style.group(1)) if style else 0
                info = xf_info.get(xf_index)
                if info is None:
                    info = xf_info[xf_index] = _xf_row_info(xfs, fonts, normal_font, xf_index)
                if not info["wrap"] or "<" not in cell_body:
                    # ô không bọc chữ hoặc rỗng: chỉ cần metrics font + viền (không tạo dict)
                    coord_text = coord.group(0)[3:-1] if coord else ""
                    if coord_text and coord_text in merge_multi_row:
                        continue
                    if info["metrics"]:
                        border_top = max(border_top, info["borderTop"])
                        border_bottom = max(border_bottom, info["borderBottom"])
                        plain_cells.append((info["metrics"][0], info["metrics"][1], info["bottom"], col_name))
                    continue
                candidates.append({
                    "xf": xf_index,
                    "coord": coord.group(0)[3:-1] if coord else "",
                    "content": bool(re.search(r"<(?:v|is)\b", cell_body)),
                    "attrs": cell_attrs,
                    "body": cell_body,
                })
            # ô ngầm: style hàng (nếu customFormat) thay cho style cột; cột không có <col style> = Normal
            if row_custom_format:
                rxf = xfs[int(row_style.group(1))] if int(row_style.group(1)) < len(xfs) else None
                rfont = fonts[rxf["fontId"]] if rxf and 0 <= rxf["fontId"] < len(fonts) else normal_font
                metrics = _excel_font_metrics(rfont["name"], float(rfont["size"]), bool(rfont.get("bold")), bool(rfont.get("italic")))
                if metrics:
                    implicit.append(metrics)
            else:
                for lo, hi, cfont in column_style_fonts:
                    if hi - lo < 64 and all(c in explicit_cols for c in range(lo, hi + 1)):
                        continue
                    metrics = _excel_font_metrics(cfont["name"], float(cfont["size"]), bool(cfont.get("bold")), bool(cfont.get("italic")))
                    if metrics:
                        implicit.append(metrics)
            row_normal = normal_metrics if (columns_uncovered and not row_custom_format) else None

            def cell_reference(col_name: str) -> float | None:
                """D riêng của ô: descent style hàng (customFormat) hoặc style cột của chính cột đó, và Normal nếu còn cột trống."""
                if row_custom_format:
                    return implicit[0][1] if implicit else None
                index = _column_index_fast(col_name) if col_name else 0
                own = column_descent_cache.get(index)
                if own is None:
                    own = 0.0
                    for lo, hi, cfont in column_style_fonts:
                        if lo <= index <= hi:
                            cmetrics = _excel_font_metrics(cfont["name"], float(cfont["size"]), bool(cfont.get("bold")), bool(cfont.get("italic")))
                            own = cmetrics[1] if cmetrics else 0.0
                            break
                    column_descent_cache[index] = own
                return max(own, normal_metrics[1] if (columns_uncovered and normal_metrics) else 0.0)

            for total_l, descent_d, bottom_flag, col_name in plain_cells:
                extents.append((total_l, descent_d, bottom_flag, cell_reference(col_name)))
            for candidate in candidates:
                coord = candidate["coord"]
                # Excel AutoFit bỏ qua ô thuộc vùng gộp nhiều hàng (lan02 s1 A1:A2 TNR 23 rỗng không nâng hàng 1)
                if coord and coord in merge_multi_row:
                    continue
                xf = xfs[candidate["xf"]] if 0 <= candidate["xf"] < len(xfs) else {"fontId": 0, "wrap": False, "bottom": True}
                font = fonts[xf["fontId"]] if 0 <= xf["fontId"] < len(fonts) else fonts[0] if fonts else normal_font
                metrics = _excel_font_metrics(font["name"], float(font["size"]), bool(font.get("bold")), bool(font.get("italic")))
                if not metrics:
                    continue
                bottom = bool(xf.get("bottom", True))
                border_top = max(border_top, int(xf.get("borderTop", 0)))
                border_bottom = max(border_bottom, int(xf.get("borderBottom", 0)))
                own_reference = cell_reference(re.match(r"[A-Z]+", coord).group(0) if coord else "")
                extents.append((metrics[0], metrics[1], bottom, own_reference))
                if xf["wrap"] and candidate["content"] and coord and coord not in merge_covered:
                    heights = _excel_font_line_heights(font["name"], float(font["size"]), bool(font.get("bold")), normal_desc, bool(font.get("italic")))
                    if heights:
                        # S31b: ô rich text nhiều font -> các run (font riêng) để tính cao từng dòng theo font trên dòng
                        rich_runs = _xlsx_wrap_cell_runs(candidate.get("attrs", ""), candidate.get("body", ""), shared_rich, font, normal_desc)
                        runs = rich_runs
                        if not runs:
                            text = _xlsx_wrap_cell_text(candidate.get("attrs", ""), candidate.get("body", ""), shared_plain)
                            runs = [{"t": text, "h": [float(v) for v in heights], "f": dict(font)}] if text else None
                        # S31c: mô phỏng ngắt dòng bằng bảng bề rộng ký tự Excel -> chiều cao hàng ngay tại đây;
                        # font/ký tự chưa đo -> để app đo bằng DOM (wrap map)
                        extent = None
                        if runs:
                            col_px = column_excel_px.get(re.match(r"([A-Z]+)", coord).group(1), default_col_px)
                            measured: list[dict] | None = []
                            for run in runs:
                                natural = _excel_natural_widths(run["f"]["name"], float(run["f"]["size"]), bool(run["f"].get("bold")))
                                run_metrics = _excel_font_metrics(run["f"]["name"], float(run["f"]["size"]), bool(run["f"].get("bold")), bool(run["f"].get("italic")))
                                if natural is None or run_metrics is None:
                                    measured = None
                                    break
                                measured.append({"t": run["t"], "w": natural[0], "L": run_metrics[0], "d": run_metrics[1], "m": natural[1]})
                            if measured and col_px:
                                extent = _excel_wrapped_cell_extent(measured, float(col_px) - measured[0]["m"])
                        if extent is not None:
                            extents.append((extent[0], extent[1], bottom, own_reference))
                        elif rich_runs:
                            wrap_cells[coord] = {"h": heights, "runs": rich_runs}
                        elif runs:
                            wrap_cells[coord] = heights
                        # ô số bọc chữ (lan03 E68 ' 1,890,000 '): Excel không bọc số -> 1 dòng, đã nằm trong extents
            computed_row = _excel_row_height_from_cells(extents, implicit, row_normal) if (extents or implicit or row_normal) else float(default_px if default_px > 0 else normal_floor)
            rows[row.group(1)] = min(_EXCEL_MAX_ROW_PX, computed_row + border_top + border_bottom)
            auto_rows.append(int(row.group(1)))
        if columns or rows or default_col_px:
            layouts[sheet_name] = {"columns": columns, "rows": rows}
            if default_col_px:
                layouts[sheet_name]["defaultCol"] = default_col_px
            if wrap_cells:
                layouts[sheet_name]["wrap"] = wrap_cells
            if auto_rows:
                # S30b: app ghi lại vno:auto-rows khi lưu cho các hàng này còn nguyên chiều cao lúc mở -> khôi phục ht gốc
                layouts[sheet_name]["auto"] = auto_rows
            if has_table:
                layouts[sheet_name]["defaultRow"] = default_px
    return layouts


def _overlay_sheet_layout_from_xlsx(xlsx_bytes: bytes, fods_xml: str) -> str:
    """Write the xlsx layout of each sheet into its FODS table (the computation itself is _compute_xlsx_sheet_layouts)."""
    layouts = _xlsx_sheet_layouts(xlsx_bytes)
    if not layouts:
        return fods_xml

    def add_layout(match: re.Match[str]) -> str:
        attrs = match.group(1) or ""
        name_match = re.search(r'table:name="([^"]*)"', attrs)
        name = _unescape_xml(name_match.group(1)) if name_match else ""
        layout = layouts.get(name)
        if layout is None:
            layout = next((value for key, value in layouts.items() if _sheet_name_equivalence_key(key) == _sheet_name_equivalence_key(name)), None)
        if not layout:
            return match.group(0)
        encoded = _escape_xml(json.dumps(layout, ensure_ascii=False, separators=(",", ":")))
        attrs = re.sub(r'\s+vno:xlsx-layout="[^"]*"', "", attrs)
        return f'<table:table{attrs} vno:xlsx-layout="{encoded}">'

    return _sub_table_open_tags(fods_xml, add_layout)


def parse_tab_colors_from_xlsx(xlsx_bytes: bytes) -> dict[str, str]:
    """Parse tabColor from each worksheet XML in XLSX.
    
    Returns dict mapping sheet name -> #RRGGBB color string.
    """
    result: dict[str, str] = {}
    sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    if not sheet_entries:
        return result
    for sheet_name, entry_path in sheet_entries.items():
        entry_bytes = read_zip_entry(xlsx_bytes, entry_path)
        if not entry_bytes:
            continue
        sheet_xml = entry_bytes.decode("utf-8", errors="replace")
        # <sheetPr><tabColor rgb="FFRRGGBB"/></sheetPr>
        match = re.search(r'<tabColor\b([^>]*)\/?>', sheet_xml, re.IGNORECASE)
        if match:
            attrs = match.group(1)
            rgb_match = re.search(r'rgb\s*=\s*["\']([0-9A-Fa-f]{8})["\']', attrs)
            if rgb_match:
                argb = rgb_match.group(1)
                # XLSX tabColor is ARGB (8 hex digits), we want RGB
                if len(argb) == 8:
                    rgb = argb[2:]  # Skip alpha
                    result[sheet_name] = f"#{rgb.upper()}"
    return result


def _restore_lost_leading_newlines_step(
    xlsx_bytes: bytes, source_xlsx_bytes: bytes, replacements: dict[str, str], copier: "_SourceXfCopier | None"
) -> None:
    """Restore unchanged source strings when ODF only normalized/lost line breaks."""
    source_values = _xlsx_cells_with_original_strings(source_xlsx_bytes)
    output_values = _xlsx_cells_with_original_strings(xlsx_bytes)
    source_entries = _resolve_xlsx_sheet_entries(source_xlsx_bytes)
    output_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    for sheet_name, source_cells in source_values.items():
        out_path = output_entries.get(sheet_name); src_path = source_entries.get(sheet_name)
        if not out_path or not src_path:
            continue
        output_cells = output_values.get(sheet_name, {}); wanted: dict[str, str] = {}
        src_xml = (read_zip_entry(source_xlsx_bytes, src_path) or b"").decode("utf-8", errors="replace")
        src_styles = {}
        source_formula_cells = set()
        for attrs_text, body in _iter_xlsx_cell_parts(src_xml):
            attrs = _xml_attrs(attrs_text)
            coord = (attrs.get("r") or "").upper()
            if coord and attrs.get("s", "").isdigit(): src_styles[coord] = int(attrs["s"])
            if coord and re.search(r'<f\b', body, re.IGNORECASE):
                source_formula_cells.add(coord)
        for (row, col), source_value in source_cells.items():
            output_value = output_cells.get((row, col))
            missing_whitespace = output_value is None and bool(source_value) and not source_value.strip()
            normalize_lines = lambda value: re.sub(
                r"\n+", "\n", str(value).replace("\r\n", "\n").replace("\r", "\n")
            ).strip("\n")
            normalized_line_match = (
                output_value is not None
                and source_value != output_value
                and bool(re.search(r"[\r\n]", source_value))
                and normalize_lines(source_value) == normalize_lines(output_value)
            )
            trailing_apostrophe_match = (
                output_value is not None
                and source_value.endswith("'")
                and output_value == source_value[:-1]
            )
            if not (missing_whitespace or normalized_line_match or trailing_apostrophe_match):
                continue
            coord = f"{_column_letter(col)}{row}"
            if coord in source_formula_cells:
                continue
            mapped = copier.map(src_styles[coord]) if copier is not None and coord in src_styles else None
            style = f' s="{mapped}"' if mapped is not None else ""
            text = _escape_xml(source_value)
            wanted[coord] = f'<c r="{coord}"{style} t="inlineStr"><is><t xml:space="preserve">{text}</t></is></c>'
        if wanted:
            sheet_xml = replacements.get(out_path) or (read_zip_entry(xlsx_bytes, out_path) or b"").decode("utf-8", errors="replace")
            replacements[out_path] = _insert_or_replace_cells(sheet_xml, wanted)
    if copier is not None:
        copier.write_styles(replacements)


def _source_explicit_column_widths(source_sheet_xml: str | None) -> dict[int, float]:
    """Expand explicit source <col width> ranges to column-index -> character width."""
    result: dict[int, float] = {}
    if not source_sheet_xml:
        return result
    for match in re.finditer(r"<col\b([^>]*)/?>", source_sheet_xml, re.IGNORECASE):
        attrs = _xml_attrs(match.group(1))
        if "width" not in attrs:
            continue
        try:
            first = int(attrs.get("min", "1")); last = int(attrs.get("max", str(first)))
            width = float(attrs["width"])
        except ValueError:
            continue
        for col_idx in range(first, last + 1):
            result[col_idx] = width
    return result


def apply_tab_colors_to_fods(fods_xml: str, tab_colors: dict[str, str]) -> str:
    """Apply tab colors to FODS table:table elements as vno:tab-color attribute."""
    if not tab_colors:
        return fods_xml
    
    def add_tab_color(match: re.Match[str]) -> str:
        attrs = match.group(1) or ""
        name_match = re.search(r'table:name="([^"]*)"', attrs)
        name = _unescape_xml(name_match.group(1)) if name_match else ""
        color = tab_colors.get(name)
        if not color:
            return match.group(0)
        # Remove existing vno:tab-color if present
        attrs = re.sub(r'\s+vno:tab-color="[^"]*"', "", attrs)
        return f'<table:table{attrs} vno:tab-color="{color}">'
    
    return _sub_table_open_tags(fods_xml, add_tab_color)


def _overlay_autofilter_from_xlsx(xlsx_bytes: bytes, fods_xml: str) -> str:
    """Read <autoFilter ref> from each worksheetN.xml and inject
    <table:database-ranges> into FODS."""
    # LibreOffice can synthesize a database range from rows hidden with the
    # filter visibility flag even when the source XLSX has no AutoFilter.
    # Source worksheet XML is authoritative; discard synthesized ranges first.
    if "<table:database-ranges" in fods_xml:
        fods_xml = re.sub(
            r"<table:database-ranges\b[^>]*>[\s\S]*?</table:database-ranges\s*>",
            "",
            fods_xml,
            flags=re.IGNORECASE,
        )
    sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    if not sheet_entries:
        return fods_xml
    autofilter_by_sheet: dict[str, str] = {}
    for sheet_name, entry_path in sheet_entries.items():
        entry_bytes = read_zip_entry(xlsx_bytes, entry_path)
        if not entry_bytes:
            continue
        ref = parse_autofilter_from_worksheet(entry_bytes.decode("utf-8", errors="replace"))
        if ref:
            autofilter_by_sheet[sheet_name] = ref
    return apply_autofilter_to_fods(fods_xml, autofilter_by_sheet)


def overlay_sheet_xlsx_freeze_panes(xlsx_bytes: bytes, fods_xml: str | None) -> str:
    """Đọc <pane state="frozen"> thật từ MỖI worksheetN.xml gốc và ghi đè
    vno:frozen-rows/cols vào FODS trước khi SheetAdapter.parseFods() chạy."""
    xml = fods_xml or ""
    sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    if not sheet_entries:
        return xml
    freeze_by_sheet: dict[str, dict[str, int]] = {}
    for sheet_name, entry_path in sheet_entries.items():
        entry_bytes = read_zip_entry(xlsx_bytes, entry_path)
        if not entry_bytes:
            continue
        freeze = parse_freeze_pane_from_sheet_xml(entry_bytes.decode("utf-8", errors="replace"))
        if freeze:
            freeze_by_sheet[sheet_name] = freeze
    return apply_freeze_panes_to_fods(xml, freeze_by_sheet)


def overlay_slides_pptx_fodp(pptx_bytes: bytes, fodp_xml: str | None) -> str:
    """Read original PPTX ZIP and overlay FODP.

    LibreOffice PPTX→FODP drops p14:sectionLst, vno:master-theme, and
    vno:without-narration / vno:pointer-color. Production File → Mở must
    restore them before SlidesAdapter.parseFodp(). Broken ZIP raises.
    """
    xml = fodp_xml or ""
    try:
        with zipfile.ZipFile(io.BytesIO(pptx_bytes), "r") as package:
            package.namelist()
    except zipfile.BadZipFile as exc:
        raise ValueError("PPTX ZIP hỏng — không thể khôi phục thuộc tính native") from exc
    current = read_zip_entry(pptx_bytes, PPTX_PRESENTATION_ENTRY)
    if not current:
        raise ValueError("PPTX thiếu ppt/presentation.xml — không thể khôi phục Phần (Sections)")
    presentation_xml = current.decode("utf-8", errors="replace")
    xml = overlay_fodp_sections(xml, presentation_xml)
    with zipfile.ZipFile(io.BytesIO(pptx_bytes), "r") as package:
        master_names = [name for name in package.namelist() if SLIDE_MASTER_ENTRY_RE.match(name)]
    masters: list[str] = []
    for name in master_names:
        entry = read_zip_entry(pptx_bytes, name)
        if not entry:
            raise ValueError(f"PPTX thiếu {name} — không đoán logo master")
        masters.append(entry.decode("utf-8", errors="replace"))
    xml = overlay_fodp_master_logo(xml, masters)
    props = read_zip_entry(pptx_bytes, PPTX_PRESPROPS_ENTRY)
    if props:
        xml = overlay_fodp_show_properties(xml, props.decode("utf-8", errors="replace"))
    xml = overlay_fodp_image_crops(xml, pptx_bytes)
    return xml


def overlay_slides_pptx_fodp_file(
    pptx_path: str,
    fodp_path: str,
    *,
    out_path: str | None = None,
) -> str:
    with open(pptx_path, "rb") as handle:
        pptx_bytes = handle.read()
    with open(fodp_path, "r", encoding="utf-8", errors="replace") as handle:
        fodp_xml = handle.read()
    overlaid = overlay_slides_pptx_fodp(pptx_bytes, fodp_xml)
    dest = out_path or fodp_path
    if overlaid != fodp_xml or dest != fodp_path:
        with open(dest, "w", encoding="utf-8", newline="") as handle:
            handle.write(overlaid)
    return dest


def overlay_sheet_xlsx_fods_file(
    xlsx_path: str,
    fods_path: str,
    *,
    out_path: str | None = None,
) -> str:
    with open(xlsx_path, "rb") as handle:
        xlsx_bytes = handle.read()
    with open(fods_path, "r", encoding="utf-8", errors="replace") as handle:
        fods_xml = handle.read()
    overlaid = overlay_sheet_xlsx_fods(xlsx_bytes, fods_xml)
    dest = out_path or fods_path
    if overlaid != fods_xml or dest != fods_path:
        with open(dest, "w", encoding="utf-8", newline="") as handle:
            handle.write(overlaid)
    return dest


def postprocess_sheet_xlsx_file(
    xlsx_path: str,
    *,
    fods_path: str | None = None,
    enabled: bool | None = None,
    out_path: str | None = None,
    source_xlsx_path: str | None = None,
) -> str:
    with open(xlsx_path, "rb") as handle:
        xlsx_bytes = handle.read()
    source_fods = None
    if fods_path:
        with open(fods_path, "r", encoding="utf-8", errors="replace") as handle:
            source_fods = handle.read()
    source_xlsx_bytes = None
    if source_xlsx_path and os.path.isfile(source_xlsx_path):
        with open(source_xlsx_path, "rb") as handle:
            source_xlsx_bytes = handle.read()
    patched = postprocess_sheet_xlsx(
        xlsx_bytes, source_fods=source_fods, enabled=enabled, source_xlsx_bytes=source_xlsx_bytes
    )
    dest = out_path or xlsx_path
    if patched is not xlsx_bytes:
        with open(dest, "wb") as handle:
            handle.write(patched)
    elif dest != xlsx_path:
        with open(dest, "wb") as handle:
            handle.write(patched)
    return dest


def _extract_docx_header_footer_refs(document_xml: str) -> tuple[list[tuple[str, str]], list[tuple[str, str]]]:
    """Extract (type, rId) pairs for header and footer references from word/document.xml."""
    header_refs: list[tuple[str, str]] = []
    footer_refs: list[tuple[str, str]] = []
    for match in re.finditer(
        r"<w:(headerReference|footerReference)\b([^>]*?)(?:/\s*>|>([\s\S]*?)</w:\1\s*>)",
        document_xml,
        re.IGNORECASE,
    ):
        tag_type = match.group(1).lower()
        attrs_str = match.group(2) or ""
        r_id_match = re.search(r'r:id\s*=\s*["\']([^"\']+)["\']', attrs_str, re.IGNORECASE)
        if not r_id_match:
            continue
        r_id = r_id_match.group(1)
        if tag_type == "headerreference":
            header_refs.append(("header", r_id))
        elif tag_type == "footerreference":
            footer_refs.append(("footer", r_id))
    return header_refs, footer_refs


def _extract_docx_section_properties(document_xml: str) -> str | None:
    """Extract the last w:sectPr (body-level section) from word/document.xml."""
    sect_matches = list(re.finditer(
        r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>",
        document_xml,
        re.IGNORECASE,
    ))
    if not sect_matches:
        return None
    return sect_matches[-1].group(0)


def _extract_all_docx_sections(document_xml: str) -> list[dict]:
    """Extract ALL w:sectPr from word/document.xml, including mid-document sections in w:pPr.

    Returns a list of dicts for each section break (excluding the final body-level sectPr):
    {
        'sect_pr_xml': str,           # the w:sectPr XML
        'paragraph_bookmark': str,    # vno-untouched-N bookmark name on the paragraph, or ''
        'paragraph_text': str,        # plain text of the paragraph containing the sectPr (for fallback matching)
        'preceding_text': str,        # plain text of the nearest preceding NON-EMPTY paragraph (key matching field)
        'section_index': int,         # 0-based index of this section break
    }
    """
    sections = []
    # First, get all paragraphs with their text
    all_paras = []
    for match in re.finditer(r"(<w:p\b[^>]*>)([\s\S]*?)(</w:p\s*>)", document_xml, re.IGNORECASE):
        p_open, p_content, p_close = match.groups()
        full_paragraph = p_open + p_content + p_close
        paragraph_text = _paragraph_plain_text(full_paragraph)
        has_sect_pr = bool(re.search(r'<w:sectPr\b', p_content, re.IGNORECASE))
        all_paras.append({
            'full_xml': full_paragraph,
            'p_content': p_content,
            'text': paragraph_text,
            'has_sect_pr': has_sect_pr,
            'start': match.start(),
            'end': match.end(),
        })

    # Find paragraphs with sectPr and get nearest preceding NON-EMPTY paragraph's text
    for i, para in enumerate(all_paras):
        if not para['has_sect_pr']:
            continue

        # Extract the sectPr XML
        sect_pr_match = re.search(r"(<w:sectPr\b[\s\S]*?</w:sectPr\s*>)", para['p_content'], re.IGNORECASE)
        if not sect_pr_match:
            continue
        sect_pr_xml = sect_pr_match.group(1)

        # Extract bookmark from this paragraph
        bookmark_match = re.search(
            r'<w:bookmarkStart\b[^>]*\bw:name=["\'](vno-untouched-\d+)["\']',
            para['full_xml'],
            re.IGNORECASE,
        )
        paragraph_bookmark = bookmark_match.group(1) if bookmark_match else ""

        # Find nearest preceding paragraph with non-empty text
        preceding_text = ""
        for j in range(i - 1, -1, -1):
            if all_paras[j]['text'].strip():
                preceding_text = all_paras[j]['text']
                break

        sections.append({
            'sect_pr_xml': sect_pr_xml,
            'paragraph_bookmark': paragraph_bookmark,
            'paragraph_text': para['text'],
            'preceding_text': preceding_text,
            'section_index': len(sections),
        })

    return sections


def _resolve_docx_rels(docx_bytes: bytes) -> dict[str, str]:
    """Read word/_rels/document.xml.rels and return {rId: target}."""
    rels_xml_bytes = read_zip_entry(docx_bytes, "word/_rels/document.xml.rels")
    if not rels_xml_bytes:
        return {}
    rels_xml = rels_xml_bytes.decode("utf-8", errors="replace")
    result: dict[str, str] = {}
    for match in re.finditer(r"<Relationship\b([^>]*?)/?>", rels_xml, re.IGNORECASE):
        attrs = match.group(1) or ""
        id_match = re.search(r'\bId\s*=\s*["\']([^"\']+)["\']', attrs, re.IGNORECASE)
        target_match = re.search(r'\bTarget\s*=\s*["\']([^"\']+)["\']', attrs, re.IGNORECASE)
        if id_match and target_match:
            result[id_match.group(1)] = target_match.group(1)
    return result


def _extract_docx_section_parts(
    original_docx_bytes: bytes,
) -> tuple[list[str], list[str], str | None, dict[str, str]]:
    """From the original DOCX, extract:
    - header entry names (e.g. word/header1.xml)
    - footer entry names (e.g. word/footer1.xml)
    - the body-level w:sectPr
    - rId -> target mapping

    Returns (header_entries, footer_entries, sect_pr, rels_map).
    """
    original_xml_bytes = read_zip_entry(original_docx_bytes, "word/document.xml")
    if not original_xml_bytes:
        return [], [], None, {}
    original_xml = original_xml_bytes.decode("utf-8", errors="replace")
    header_refs, footer_refs = _extract_docx_header_footer_refs(original_xml)
    sect_pr = _extract_docx_section_properties(original_xml)
    rels = _resolve_docx_rels(original_docx_bytes)
    def _norm_entry(target: str, default_name: str) -> str:
        t = (target or default_name).replace("\\", "/").lstrip("./")
        if not t.startswith("word/"):
            t = f"word/{t}"
        return t

    header_entries = [
        _norm_entry(rels.get(r_id, ""), f"header{idx + 1}.xml")
        for idx, (_, r_id) in enumerate(header_refs)
    ]
    footer_entries = [
        _norm_entry(rels.get(r_id, ""), f"footer{idx + 1}.xml")
        for idx, (_, r_id) in enumerate(footer_refs)
    ]
    return header_entries, footer_entries, sect_pr, rels


_DOCX_FOOTER_REL_TYPE = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer"
)
_DOCX_HEADER_REL_TYPE = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/header"
)
_DOCX_FOOTER_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"
)
_DOCX_HEADER_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"
)
_DOCX_COMMENTS_REL_TYPE = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments"
)
_DOCX_COMMENTS_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"
)
_DOCX_COMMENTS_EXTENDED_REL_TYPE = (
    "http://schemas.microsoft.com/office/2011/relationships/commentsExtended"
)
_DOCX_COMMENTS_EXTENDED_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml"
)


_DOCX_HF_EXTRA_CONTENT_TYPES = {
    "bmp": "image/bmp", "tif": "image/tiff", "tiff": "image/tiff",
    "bin": "application/vnd.openxmlformats-officedocument.oleObject",
}


def _collect_header_footer_dependencies(
    source_docx: bytes, entries: list[str], existing_entries: set[str]
) -> tuple[dict[str, bytes], set[str]]:
    """The header/footer parts are copied verbatim from the original DOCX, so their own
    relationship part (`word/_rels/header1.xml.rels`) and every internal target it names
    (`word/media/image1.jpeg` logos, ...) must come along, or Word refuses the file.
    Measured 2026-09-15 on the LAN batch (d20.docx): header1.xml restored, header1.xml.rels
    dropped -> "The file appears to be corrupted"; without the header the file opens.
    Media is copied under a `vnohf_` prefix so it never overwrites the converted body media.

    Returns (extra entries to write, media extensions needing a Content_Types Default).
    """
    extra: dict[str, bytes] = {}
    extensions: set[str] = set()
    for entry_name in entries:
        folder, _, base = entry_name.rpartition("/")
        rels_name = f"{folder}/_rels/{base}.rels" if folder else f"_rels/{base}.rels"
        rels_bytes = read_zip_entry(source_docx, rels_name)
        if not rels_bytes:
            continue
        rels_xml = rels_bytes.decode("utf-8", errors="replace")

        def _copy_target(match: re.Match) -> str:
            attrs = match.group(0)
            if re.search(r'TargetMode\s*=\s*["\']External["\']', attrs, re.IGNORECASE):
                return attrs
            target_match = re.search(r'\bTarget\s*=\s*["\']([^"\']+)["\']', attrs, re.IGNORECASE)
            if not target_match:
                return attrs
            target = target_match.group(1)
            if target.startswith("/"):
                source_name = target.lstrip("/")
            else:
                source_name = posixpath.normpath(posixpath.join(folder or "", target))
            data = read_zip_entry(source_docx, source_name)
            if data is None:
                return attrs
            dep_folder, _, dep_base = source_name.rpartition("/")
            new_name = f"{dep_folder}/vnohf_{dep_base}" if dep_folder else f"vnohf_{dep_base}"
            if new_name not in existing_entries or new_name in extra:
                extra[new_name] = data
            extension = dep_base.rsplit(".", 1)[-1].lower() if "." in dep_base else ""
            if extension:
                extensions.add(extension)
            new_target = posixpath.relpath(new_name, folder or ".") if not target.startswith("/") else f"/{new_name}"
            return attrs.replace(target_match.group(0), f'Target="{new_target}"')

        new_rels_xml = re.sub(r"<Relationship\b[^>]*?/?>", _copy_target, rels_xml)
        extra[rels_name] = new_rels_xml.encode("utf-8")
    return extra, extensions


def _max_rels_rid(rels_xml: str) -> int:
    """Return the highest rId number found in a rels XML string."""
    ids = re.findall(r'\bId\s*=\s*["\']rId(\d+)["\']', rels_xml, re.IGNORECASE)
    return max((int(x) for x in ids), default=0)


def _add_rels_entry(
    rels_xml: str, r_id: str, rel_type: str, target: str
) -> str:
    """Add a <Relationship> entry before </Relationships>."""
    new_rel = (
        f'<Relationship Id="{r_id}" Type="{rel_type}" Target="{target}"/>'
    )
    close = "</Relationships>"
    idx = rels_xml.rfind(close)
    if idx == -1:
        return rels_xml
    return rels_xml[:idx] + new_rel + rels_xml[idx:]


def _add_content_types_override(ct_xml: str, part_name: str, content_type: str) -> str:
    """Add an Override entry before </Types> unless the part already has one.

    A duplicate Override (LibreOffice already declared footer1.xml, then the
    header/footer restore added it again) makes Word 2016 report "The file
    appears to be corrupted" — measured on 4 of the first 7 LAN documents.
    """
    if re.search(r'<Override\b[^>]*\bPartName="' + re.escape(part_name) + r'"', ct_xml, re.IGNORECASE):
        return ct_xml
    override = f'<Override PartName="{part_name}" ContentType="{content_type}"/>'
    close = "</Types>"
    idx = ct_xml.rfind(close)
    if idx == -1:
        return ct_xml
    return ct_xml[:idx] + override + ct_xml[idx:]


def _remap_header_footer_rids(
    sect_pr: str, r_id_map: dict[str, str]
) -> str:
    """Replace r:id values in w:headerReference / w:footerReference tags."""
    if not r_id_map:
        return sect_pr
    result = sect_pr
    for tag in ("headerReference", "footerReference"):
        pattern = re.compile(
            rf"(<w:{tag}\b[^>]*?)r:id\s*=\s*['\"]([^'\"]+)['\"]",
            re.IGNORECASE,
        )
        def _replace(m: re.Match) -> str:
            old_rid = m.group(2)
            new_rid = r_id_map.get(old_rid, old_rid)
            return f'{m.group(1)}r:id="{new_rid}"'
        result = pattern.sub(_replace, result)
    return result


def _rebuild_docx_document_xml(
    converted_xml: str,
    original_xml: str,
    original_header_entries: list[str],
    original_footer_entries: list[str],
    original_sect_pr: str | None,
) -> str:
    """Re-inject header/footer references and section properties into the converted document.xml.

    Strategy:
    1. Find the body-level w:sectPr in the converted XML (last w:sectPr).
    2. Replace it with the original w:sectPr (which has the correct header/footer refs
       and section geometry).
    3. If the converted XML lacks w:headerReference/w:footerReference, inject them
       from the original just before the w:sectPr.
    """
    if not original_sect_pr:
        return converted_xml

    has_header_ref = bool(re.search(r"<w:headerReference\b", converted_xml, re.IGNORECASE))
    has_footer_ref = bool(re.search(r"<w:footerReference\b", converted_xml, re.IGNORECASE))
    has_sect_pr = bool(re.search(r"<w:sectPr\b", converted_xml, re.IGNORECASE))

    if has_sect_pr:
        matches = list(re.finditer(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", converted_xml, re.IGNORECASE))
        if matches:
            last_m = matches[-1]
            converted_xml = converted_xml[:last_m.start()] + original_sect_pr + converted_xml[last_m.end():]
    else:
        body_close = re.search(r"</w:body\s*>", converted_xml, re.IGNORECASE)
        if body_close:
            converted_xml = (
                converted_xml[: body_close.start()]
                + original_sect_pr
                + converted_xml[body_close.start() :]
            )

    return converted_xml


def _repair_writer_double_fills(document_xml: str) -> str:
    """Keep one schema-valid fill child in each WordprocessingShape spPr."""
    def repair(match: re.Match) -> str:
        attrs, body = match.group(1), match.group(2)
        fill_pattern = r"<a:solidFill\b[^>]*/\s*>|<a:solidFill\b[^>]*>[\s\S]*?</a:solidFill\s*>"
        fills = list(re.finditer(fill_pattern, body, re.IGNORECASE))
        if fills and re.search(r"<a:noFill\b[^>]*/\s*>", body, re.IGNORECASE):
            cleaned = re.sub(fill_pattern, "", body, flags=re.IGNORECASE)
            return f"<wps:spPr{attrs}>{cleaned}</wps:spPr>"
        if len(fills) < 2:
            return match.group(0)
        keep = fills[-1].group(0)
        first = fills[0].start()
        cleaned = re.sub(fill_pattern, "", body, flags=re.IGNORECASE)
        cleaned = cleaned[:first] + keep + cleaned[first:]
        return f"<wps:spPr{attrs}>{cleaned}</wps:spPr>"
    return re.sub(r"<wps:spPr\b([^>]*)>([\s\S]*?)</wps:spPr\s*>", repair, document_xml, flags=re.IGNORECASE)


def _writer_anchor_properties(document_xml: str) -> list[dict[str, str]]:
    props: list[dict[str, str]] = []
    for match in re.finditer(r"<wp:anchor\b([^>]*)>([\s\S]*?)</wp:anchor\s*>", document_xml, re.IGNORECASE):
        attrs, body = match.group(1), match.group(2)
        props.append({
            "behind": "1" if re.search(r'\bbehindDoc=["\'](?:1|true)["\']', attrs, re.IGNORECASE) else "0",
            "horizontal": (re.search(r'<wp:positionH\b[^>]*relativeFrom=["\']([^"\']+)', body, re.IGNORECASE) or [None, "paragraph"])[1],
            "vertical": (re.search(r'<wp:positionV\b[^>]*relativeFrom=["\']([^"\']+)', body, re.IGNORECASE) or [None, "paragraph"])[1],
            "wrap": (re.search(r'<wp:(wrapNone|wrapSquare|wrapTopAndBottom|wrapTight|wrapThrough)\b', body, re.IGNORECASE) or [None, "wrapNone"])[1],
            # Nguyên phần tử bao chữ của bản gốc (wrapSquare cần wrapText, wrapTight/Through cần wrapPolygon): ghi lại <wp:wrapSquare/> trơn làm Word không mở được tệp.
            "wrap_xml": (re.search(
                r'<wp:(wrapNone|wrapSquare|wrapTopAndBottom|wrapTight|wrapThrough)\b[^>]*?(?:/>|>[\s\S]*?</wp:\1\s*>)', body, re.IGNORECASE,
            ) or [None])[0] or "",
        })
    return props


def _writer_valid_wrap_element(kind: str) -> str:
    """Phần tử bao chữ hợp lệ theo schema: wrapSquare bắt buộc wrapText; wrapTight/wrapThrough bắt buộc wrapPolygon (không có thì dùng wrapSquare)."""
    if kind in ("wrapSquare", "wrapTight", "wrapThrough"):
        return '<wp:wrapSquare wrapText="bothSides"/>'
    return f"<wp:{kind}/>"


def _restore_writer_anchor_properties(converted_xml: str, original_xml: str) -> str:
    """Restore non-coordinate semantics only when document-order pairing is safe.

    LibreOffice offsets are relative to the coordinate system it emitted. Changing
    relativeFrom without translating posOffset shifts frames by the page margin,
    so horizontal/vertical origins deliberately remain untouched.
    """
    converted_anchors = re.findall(
        r"<wp:anchor\b[^>]*>[\s\S]*?</wp:anchor\s*>", converted_xml, re.IGNORECASE
    )
    original_anchors = re.findall(
        r"<wp:anchor\b[^>]*>[\s\S]*?</wp:anchor\s*>", original_xml, re.IGNORECASE
    )
    if len(converted_anchors) != len(original_anchors):
        return converted_xml
    source_props = iter(_writer_anchor_properties(original_xml))

    def restore(match: re.Match) -> str:
        props = next(source_props, None)
        if not props:
            return match.group(0)
        attrs, body = match.group(1), match.group(2)
        if re.search(r"\bbehindDoc=", attrs, re.IGNORECASE):
            attrs = re.sub(r'\bbehindDoc=["\'][^"\']*["\']', f'behindDoc="{props["behind"]}"', attrs, count=1, flags=re.IGNORECASE)
        else:
            attrs += f' behindDoc="{props["behind"]}"'
        wrap_xml = props.get("wrap_xml") or _writer_valid_wrap_element(props["wrap"])
        body = re.sub(r'<wp:(?:wrapNone|wrapSquare|wrapTopAndBottom|wrapTight|wrapThrough)\b[^>]*(?:/>|>[\s\S]*?</wp:(?:wrapNone|wrapSquare|wrapTopAndBottom|wrapTight|wrapThrough)\s*>)', lambda _m: wrap_xml, body, count=1, flags=re.IGNORECASE)
        return f"<wp:anchor{attrs}>{body}</wp:anchor>"

    return re.sub(r"<wp:anchor\b([^>]*)>([\s\S]*?)</wp:anchor\s*>", restore, converted_xml, flags=re.IGNORECASE)


_WRITER_ANCHOR_RE = re.compile(
    r"<wp:anchor\b[^>]*>[\s\S]*?</wp:anchor\s*>", re.IGNORECASE
)
_WRITER_PARAGRAPH_RE = re.compile(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", re.IGNORECASE)
_DOCX_IMAGE_REL_TYPE = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
)
_DOCX_IMAGE_CONTENT_TYPES = {
    "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg",
    "gif": "image/gif", "emf": "image/x-emf", "wmf": "image/x-wmf",
    "svg": "image/svg+xml",
}


def _writer_anchor_name(anchor: str) -> str | None:
    match = re.search(r'<wp:docPr\b[^>]*\bname=["\']([^"\']+)', anchor, re.IGNORECASE)
    return match.group(1) if match else None


def _writer_anchor_has_textbox(anchor: str) -> bool:
    return bool(re.search(r"<wps:txbx\b|<w:txbxContent\b", anchor, re.IGNORECASE))


def _writer_anchor_passthrough_kind(anchor: str) -> str | None:
    """Return the non-editable drawing kind that is safe to copy from source."""
    if re.search(r"<wpg:wgp\b", anchor, re.IGNORECASE):
        return "group"
    if re.search(r"<pic:pic\b", anchor, re.IGNORECASE):
        return "picture"
    # Text boxes remain editable in Writer. Only non-textbox WPS geometry is
    # passthrough via kind matching; untouched Frames are paired separately.
    if re.search(r"<wps:wsp\b", anchor, re.IGNORECASE) and not _writer_anchor_has_textbox(anchor):
        return "shape"
    return None


def _writer_anchor_paragraph_groups(xml: str) -> list[list[str]]:
    return [_WRITER_ANCHOR_RE.findall(p.group(0)) for p in _WRITER_PARAGRAPH_RE.finditer(xml)]


def _writer_anchor_is_untouched(anchor: str) -> bool:
    return "vno-edited-" not in anchor


def _writer_anchor_has_edited_text(anchor: str) -> bool:
    return "vno-edited-" in anchor


def _remove_duplicate_writer_textbox_anchors(
    converted_xml: str, original_xml: str, pristine_document: bool = False,
) -> str:
    """Drop surplus LO text boxes already contained by a source WPG group.

    A standalone callout may repeat a label that also sits inside a group
    (d06 "Camera ống khói…"). Keep one converted frame per such source text
    box so passthrough can restore the original DrawingML. Only the extra
    group-expansion frames are removed.
    """
    # Read WPG elements directly: a group may itself contain drawing anchors,
    # so the flat wp:anchor regex can stop at a nested closing tag.
    group_texts = [
        _paragraph_match_key(original_xml[start:end])
        for start, end in _xml_element_ranges(original_xml, "wpg:wgp")
    ]
    group_texts = [text for text in group_texts if text]
    if not group_texts:
        return converted_xml

    standalone_counts: dict[str, int] = {}
    for anchor in _writer_outer_anchor_blocks(original_xml):
        if _writer_anchor_passthrough_kind(anchor) == "group":
            continue
        if not _writer_anchor_has_textbox(anchor):
            continue
        key = _paragraph_match_key(anchor)
        if len(key) >= 4:
            standalone_counts[key] = standalone_counts.get(key, 0) + 1

    seen: dict[str, int] = {}
    drop_at: set[int] = set()
    for match in _WRITER_ANCHOR_RE.finditer(converted_xml):
        anchor = match.group(0)
        if not re.search(r"<w:txbxContent\b", anchor, re.IGNORECASE):
            continue
        if not pristine_document and not _writer_anchor_is_untouched(anchor):
            continue
        key = _paragraph_match_key(anchor)
        if len(key) < 4 or not any(key in group_text for group_text in group_texts):
            continue
        seen[key] = seen.get(key, 0) + 1
        if seen[key] > standalone_counts.get(key, 0):
            drop_at.add(match.start())
    if not drop_at:
        return converted_xml

    def keep_or_drop(match: re.Match) -> str:
        return "" if match.start() in drop_at else match.group(0)

    result = _WRITER_ANCHOR_RE.sub(keep_or_drop, converted_xml)
    alternate_re = re.compile(
        r"<mc:AlternateContent\b[^>]*>[\s\S]*?</mc:AlternateContent\s*>",
        re.IGNORECASE,
    )

    def clean_alternate(match: re.Match) -> str:
        block = match.group(0)
        if re.search(r"<wp:(?:anchor|inline)\b", block, re.IGNORECASE):
            return block
        return ""

    return alternate_re.sub(clean_alternate, result)


def _writer_passthrough_matches(
    converted_xml: str, original_xml: str, trust_order: bool = False,
) -> dict[int, str]:
    """Match safe source anchors without assuming global N-to-N ordering.

    Unique docPr names are the stable primary key. As a conservative fallback,
    anchors are paired by order only inside paragraphs having the same non-zero
    anchor count, and only when their drawing kinds agree.
    """
    converted = _WRITER_ANCHOR_RE.findall(converted_xml)
    original = _WRITER_ANCHOR_RE.findall(original_xml)
    converted_names: dict[str, list[int]] = {}
    original_names: dict[str, list[int]] = {}
    for index, anchor in enumerate(converted):
        name = _writer_anchor_name(anchor)
        if name:
            converted_names.setdefault(name, []).append(index)
    for index, anchor in enumerate(original):
        name = _writer_anchor_name(anchor)
        if name:
            original_names.setdefault(name, []).append(index)

    matches: dict[int, int] = {}
    used_source: set[int] = set()
    for name, converted_indexes in converted_names.items():
        source_indexes = original_names.get(name, [])
        if len(converted_indexes) == len(source_indexes) == 1:
            source_index = source_indexes[0]
            if _writer_anchor_passthrough_kind(original[source_index]):
                matches[converted_indexes[0]] = source_index
                used_source.add(source_index)

    # LibreOffice rasterizes a WPG group and renames it (for example
    # "Group 7068" -> "Shape1"). Bound that otherwise unstable fallback by
    # neighbouring name matches, then select the first generated picture in
    # the same document segment. Only the first pair is accepted; later
    # generated pictures are ambiguous and remain untouched.
    named_pairs = sorted((source_index, converted_index) for converted_index, source_index in matches.items())
    boundaries = [(-1, -1), *named_pairs, (len(original), len(converted))]
    for (source_start, converted_start), (source_end, converted_end) in zip(boundaries, boundaries[1:]):
        source_groups = [
            index for index in range(source_start + 1, source_end)
            if index not in used_source and _writer_anchor_passthrough_kind(original[index]) == "group"
        ]
        candidates = [
            index for index in range(converted_start + 1, converted_end)
            if index not in matches and _writer_anchor_passthrough_kind(converted[index]) == "picture"
        ]
        if source_groups and candidates:
            matches[candidates[0]] = source_groups[0]
            used_source.add(source_groups[0])

    converted_offset = original_offset = 0
    converted_paragraphs = _writer_anchor_paragraph_groups(converted_xml)
    original_paragraphs = _writer_anchor_paragraph_groups(original_xml)
    for converted_group, original_group in zip(converted_paragraphs, original_paragraphs):
        if converted_group and len(converted_group) == len(original_group):
            for local_index, (converted_anchor, source_anchor) in enumerate(zip(converted_group, original_group)):
                converted_index = converted_offset + local_index
                source_index = original_offset + local_index
                if (
                    converted_index >= len(converted)
                    or source_index >= len(original)
                    or original[source_index] != source_anchor
                    or converted[converted_index] != converted_anchor
                ):
                    continue
                source_kind = _writer_anchor_passthrough_kind(original[source_index])
                converted_kind = _writer_anchor_passthrough_kind(converted[converted_index])
                compatible_kind = (
                    source_kind == converted_kind
                    or (source_kind in {"group", "shape"} and converted_kind == "picture")
                )
                if (converted_index not in matches and source_index not in used_source
                        and source_kind
                        and compatible_kind):
                    matches[converted_index] = source_index
                    used_source.add(source_index)
        converted_offset += len(converted_group)
        original_offset += len(original_group)
    if trust_order:
        remaining_source = [
            index for index, anchor in enumerate(original)
            if index not in used_source and _writer_anchor_passthrough_kind(anchor)
        ]
        remaining_converted = [
            index for index, anchor in enumerate(converted)
            if index not in matches and _writer_anchor_passthrough_kind(anchor)
        ]
        for converted_index, source_index in zip(remaining_converted, remaining_source):
            source_kind = _writer_anchor_passthrough_kind(original[source_index])
            converted_kind = _writer_anchor_passthrough_kind(converted[converted_index])
            if source_kind == converted_kind or (
                source_kind in {"group", "shape"} and converted_kind == "picture"
            ):
                matches[converted_index] = source_index
                used_source.add(source_index)
    source_names = {
        name for name in (_writer_anchor_name(anchor) for anchor in original) if name
    }
    source_by_text: dict[str, list[int]] = {}
    for source_index, source_anchor in enumerate(original):
        if source_index in used_source or not _writer_anchor_has_textbox(source_anchor):
            continue
        if _writer_anchor_passthrough_kind(source_anchor) == "group":
            continue
        key = _paragraph_match_key(source_anchor)
        if len(key) >= 4:
            source_by_text.setdefault(key, []).append(source_index)
    for converted_index, converted_anchor in enumerate(converted):
        if converted_index in matches or not _writer_anchor_has_textbox(converted_anchor):
            continue
        if not _writer_anchor_is_untouched(converted_anchor):
            continue
        converted_name = _writer_anchor_name(converted_anchor)
        if converted_name and converted_name in source_names:
            continue
        key = _paragraph_match_key(converted_anchor)
        unused = [index for index in source_by_text.get(key, []) if index not in used_source]
        if not unused:
            continue
        source_index = unused[0]
        matches[converted_index] = source_index
        used_source.add(source_index)
    # Rectangle 44 is an empty text box. LibreOffice renames it (Frame6) and
    # the text key is too short for the match above. Pair only when the two
    # empty populations are the same size, so extra blank frames are not guessed.
    source_empty = [
        index for index, anchor in enumerate(original)
        if index not in used_source
        and _writer_anchor_has_textbox(anchor)
        and _writer_anchor_passthrough_kind(anchor) != "group"
        and len(_paragraph_match_key(anchor)) < 4
    ]
    converted_empty = [
        index for index, anchor in enumerate(converted)
        if index not in matches
        and _writer_anchor_has_textbox(anchor)
        and _writer_anchor_is_untouched(anchor)
        and len(_paragraph_match_key(anchor)) < 4
        and (not _writer_anchor_name(anchor) or _writer_anchor_name(anchor) not in source_names)
    ]
    if source_empty and len(source_empty) == len(converted_empty):
        for converted_index, source_index in zip(converted_empty, source_empty):
            matches[converted_index] = source_index
            used_source.add(source_index)
    return {converted_index: original[source_index] for converted_index, source_index in matches.items()}


def _relationship_records(rels_xml: str) -> dict[str, dict[str, str]]:
    records: dict[str, dict[str, str]] = {}
    for match in re.finditer(r"<Relationship\b([^>]*?)/?>", rels_xml, re.IGNORECASE):
        attrs = {key: value for key, _quote, value in re.findall(
            r'([\w:]+)\s*=\s*(["\'])(.*?)\2', match.group(1)
        )}
        if attrs.get("Id"):
            records[attrs["Id"]] = attrs
    return records


def _add_content_type_default(ct_xml: str, extension: str, content_type: str) -> str:
    if re.search(rf'<Default\b[^>]*\bExtension=["\']{re.escape(extension)}["\']', ct_xml, re.IGNORECASE):
        return ct_xml
    entry = f'<Default Extension="{extension}" ContentType="{content_type}"/>'
    index = ct_xml.rfind("</Types>")
    return ct_xml if index < 0 else ct_xml[:index] + entry + ct_xml[index:]


def _xml_element_ranges(xml: str, qname: str) -> list[tuple[int, int]]:
    token_re = re.compile(rf"<{re.escape(qname)}\b[^>]*>|</{re.escape(qname)}\s*>", re.IGNORECASE)
    stack: list[int] = []
    ranges: list[tuple[int, int]] = []
    for token in token_re.finditer(xml):
        if token.group(0).startswith("</"):
            if stack:
                ranges.append((stack.pop(), token.end()))
        elif not token.group(0).rstrip().endswith("/>"):
            stack.append(token.start())
        else:
            # W43 (d16): đoạn rỗng tự đóng `<w:p …/>` (3/165 đoạn nguồn) từng bị bỏ khỏi danh sách → LCS đoạn rỗng
            # lệch số lượng, mọi đoạn rỗng trong đoạn văn giữ spacing Body Text 14pt của LibreOffice
            ranges.append((token.start(), token.end()))
    return sorted(ranges)


def _paragraph_plain_text(paragraph_xml: str) -> str:
    # W35c: <w:tab/> = khoảng trắng (d20 "Actual ship value<tab>Whereof…": LibreOffice xuất tab thành dấu cách nên
    # khoá chữ nguồn/bản chuyển đổi lệch → đoạn không được ghép, giữ spacing 283 của LibreOffice)
    parts = re.findall(r"<w:t\b[^>]*>([\s\S]*?)</w:t\s*>|(<w:tab\b[^>]*/>)", paragraph_xml, re.IGNORECASE)
    text = "".join(part[0] if part[0] else " " for part in parts)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def _paragraph_match_key(paragraph_xml: str) -> str:
    return re.sub(r"[^\w]+", "", _paragraph_plain_text(paragraph_xml), flags=re.UNICODE).casefold()


def _writer_direct_property(xml: str, name: str) -> str:
    match = re.search(
        rf"<w:{name}\b[^>]*(?:/>|>[\s\S]*?</w:{name}\s*>)", xml, re.IGNORECASE
    )
    return match.group(0) if match else ""


def _writer_replace_direct_property(xml: str, name: str, source: str) -> str:
    pattern = re.compile(
        rf"<w:{name}\b[^>]*(?:/>|>[\s\S]*?</w:{name}\s*>)", re.IGNORECASE
    )
    if pattern.search(xml):
        return pattern.sub(lambda _match: source, xml, count=1) if source else pattern.sub("", xml, count=1)
    if not source:
        return xml
    opening = re.search(r"<w:(?:p|r)\b[^>]*>", xml, re.IGNORECASE)
    return xml if not opening else xml[:opening.end()] + source + xml[opening.end():]


def _writer_restore_selected_ppr(target_paragraph: str, source_paragraph: str) -> str:
    target_ppr = _writer_direct_property(target_paragraph, "pPr")
    source_ppr = _writer_direct_property(source_paragraph, "pPr")
    if not target_ppr:
        if not source_ppr:
            return target_paragraph
        target_ppr = "<w:pPr></w:pPr>"
    elif target_ppr.rstrip().endswith("/>"):
        target_ppr = re.sub(r"/\s*>$", "></w:pPr>", target_ppr)
    merged = target_ppr
    # LibreOffice's HTML bridge assigns Body Text and translates exact line
    # spacing to atLeast, even when the paragraph itself was not edited.  The
    # untouched bookmark is the ownership proof for restoring all paragraph
    # formatting that affects layout.  pStyle is included because an injected
    # Body Text style otherwise reintroduces left alignment after removing jc.
    # W35 (đo d20 bản lưu bằng Word COM: mọi đoạn trong ô bảng nhận w:spacing after=283 của LibreOffice dù nguồn
    # after=0 → 3 trang thành 6): đoạn còn dấu "chưa sửa" lấy lại cả spacing, keepNext/keepLines/widowControl,
    # contextualSpacing, tabs, outlineLvl và rPr của dấu đoạn (cao đoạn rỗng, W26) từ nguồn.
    for child in ("pStyle", "keepNext", "keepLines", "widowControl", "numPr", "tabs", "spacing", "ind",
                  "contextualSpacing", "jc", "outlineLvl", "rPr"):
        source_child = _writer_direct_property(source_ppr, child)
        child_re = re.compile(
            rf"<w:{child}\b[^>]*(?:/>|>[\s\S]*?</w:{child}\s*>)", re.IGNORECASE
        )
        if child_re.search(merged):
            merged = child_re.sub(lambda _match: source_child, merged, count=1) if source_child else child_re.sub("", merged, count=1)
        elif source_child:
            merged = re.sub(r"</w:pPr\s*>", source_child + "</w:pPr>", merged, count=1, flags=re.IGNORECASE)
    merged = _writer_reorder_ppr_children(merged)
    return _writer_replace_direct_property(target_paragraph, "pPr", merged)


_PPR_CHILD_ORDER = [
    "pStyle", "keepNext", "keepLines", "pageBreakBefore", "framePr", "widowControl", "numPr", "suppressLineNumbers",
    "pBdr", "shd", "tabs", "suppressAutoHyphens", "kinsoku", "wordWrap", "overflowPunct", "topLinePunct", "autoSpaceDE",
    "autoSpaceDN", "bidi", "adjustRightInd", "snapToGrid", "spacing", "ind", "contextualSpacing", "mirrorIndents",
    "suppressOverlap", "jc", "textDirection", "textAlignment", "textboxTightWrap", "outlineLvl", "divId", "cnfStyle",
    "rPr", "sectPr", "pPrChange",
]


def _writer_reorder_ppr_children(ppr_xml: str) -> str:
    """Sắp con của <w:pPr> theo thứ tự schema OOXML (Word có thể báo hỏng khi sai thứ tự sau khi ghép nguồn)."""
    match = re.match(r"(<w:pPr\b[^>]*>)([\s\S]*)(</w:pPr\s*>)$", ppr_xml.strip(), re.IGNORECASE)
    if not match:
        return ppr_xml
    inner = match.group(2)
    children: list[tuple[int, str]] = []
    pos = 0
    child_re = re.compile(r"<w:([A-Za-z]+)\b[^>]*?(?:/>|>[\s\S]*?</w:\1\s*>)", re.IGNORECASE)
    for m in child_re.finditer(inner):
        if m.start() < pos:
            continue
        name = m.group(1)
        order = _PPR_CHILD_ORDER.index(name) if name in _PPR_CHILD_ORDER else len(_PPR_CHILD_ORDER)
        children.append((order, m.group(0)))
        pos = m.end()
    if inner[pos:].strip():
        return ppr_xml  # nội dung lạ: giữ nguyên
    children.sort(key=lambda item: item[0])
    return match.group(1) + "".join(xml for _order, xml in children) + match.group(3)


def _writer_run_blocks(paragraph: str) -> list[tuple[int, int, str]]:
    return [(m.start(), m.end(), m.group(0)) for m in re.finditer(
        r"<w:r\b[^>]*>[\s\S]*?</w:r\s*>", paragraph, re.IGNORECASE
    )]


def _writer_unique_marked_texts(xml: str) -> set[str]:
    """Capture non-empty untouched identities before anchor passthrough."""
    paragraphs = [xml[start:end] for start, end in _document_paragraph_ranges(xml)]
    counts: dict[str, int] = {}
    for paragraph in paragraphs:
        text = _paragraph_plain_text(paragraph)
        if text:
            counts[text] = counts.get(text, 0) + 1
    return {
        _paragraph_plain_text(paragraph)
        for paragraph in paragraphs
        if "vno-untouched-" in paragraph
        and counts.get(_paragraph_plain_text(paragraph), 0) == 1
    }


def _restore_writer_matched_formatting(
    converted_xml: str, original_xml: str,
    trusted_untouched_texts: set[str] | None = None,
    trust_all_exact: bool = False,
    table_paragraphs_only: bool = False,
) -> str:
    """Restore direct pPr/rPr only for paragraphs paired by exact text LCS.

    This is deliberately formatting-only: paragraph/run text and drawing XML
    always remain the converted app output. Exact text matching prevents a
    guessed or positional overlay when LibreOffice split/merged paragraphs.

    ``table_paragraphs_only`` limits the marker-proven pass to paragraphs in
    tables. The pristine (``trust_all_exact``) pass works on the body flow
    only, so a pristine document runs this second pass for its table cells;
    otherwise their LibreOffice pPr (e.g. a pageBreakBefore made from the
    source's leading page break, d03) is never restored.
    """
    def paragraph_ranges(xml: str) -> list[tuple[int, int]]:
        ranges = _document_paragraph_ranges(xml)
        if not trust_all_exact:
            return ranges
        # Match the fidelity auditor's document-flow view. Paragraphs inside
        # text boxes and tables do not paginate as body paragraphs and must
        # not shift the LCS used for pristine body-layout restoration.
        body = re.search(r"<w:body\b[^>]*>([\s\S]*?)</w:body\s*>", xml, re.IGNORECASE)
        start_offset = body.start(1) if body else 0
        flow = body.group(1) if body else xml
        flow = re.sub(
            r"<w:txbxContent\b[\s\S]*?</w:txbxContent\s*>",
            lambda match: " " * len(match.group(0)), flow, flags=re.IGNORECASE,
        )
        table_ranges = _xml_element_ranges(flow, "w:tbl")
        return [
            (start_offset + match.start(), start_offset + match.end())
            for match in re.finditer(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", flow, re.IGNORECASE)
            if not any(table_start < match.start() < table_end
                       for table_start, table_end in table_ranges)
        ]

    converted_ranges = paragraph_ranges(converted_xml)
    original_ranges = paragraph_ranges(original_xml)
    converted = [converted_xml[start:end] for start, end in converted_ranges]
    original = [original_xml[start:end] for start, end in original_ranges]
    converted_keys = [_paragraph_plain_text(p) for p in converted]
    original_keys = [_paragraph_plain_text(p) for p in original]
    source_carrier_names = {
        name
        for paragraph in original
        for name in (_writer_anchor_name(anchor) for anchor in _writer_paragraph_drawings(paragraph))
        if name
    }
    # Empty paragraphs are too ambiguous to overlay safely.
    rows, cols = len(original), len(converted)
    dp = [[0] * (cols + 1) for _ in range(rows + 1)]
    for i in range(rows - 1, -1, -1):
        for j in range(cols - 1, -1, -1):
            # A pristine round-trip can safely use the same empty-paragraph
            # LCS pairing as the fidelity auditor.  Edited documents still
            # require non-empty text ownership because empty carriers are
            # otherwise ambiguous after paragraph insertion/removal.
            equal = original_keys[i] == converted_keys[j] and (
                trust_all_exact or bool(original_keys[i])
            )
            dp[i][j] = dp[i + 1][j + 1] + 1 if equal else max(dp[i + 1][j], dp[i][j + 1])
    pairs: list[tuple[int, int]] = []
    i = j = 0
    while i < rows and j < cols:
        if original_keys[i] == converted_keys[j] and (
            trust_all_exact or bool(original_keys[i])
        ):
            pairs.append((i, j)); i += 1; j += 1
        elif dp[i + 1][j] >= dp[i][j + 1]:
            i += 1
        else:
            j += 1

    # Image carrier paragraphs have no text, so they cannot participate in
    # the text LCS above.  Pair them only inside two already-stable text
    # boundaries and only when both sides contain the same number of empty
    # paragraphs.  This restores untouched carrier spacing/alignment without
    # guessing across a LibreOffice paragraph split or merge.
    bounded_pairs = [(-1, -1), *pairs, (rows, cols)]
    empty_pairs: list[tuple[int, int]] = []
    for (source_start, converted_start), (source_end, converted_end) in zip(
        bounded_pairs, bounded_pairs[1:]
    ):
        source_empty = [
            index for index in range(source_start + 1, source_end)
            if not original_keys[index]
        ]
        converted_empty = [
            index for index in range(converted_start + 1, converted_end)
            if not converted_keys[index]
        ]
        if source_empty and len(source_empty) == len(converted_empty):
            empty_pairs.extend(zip(source_empty, converted_empty))
    empty_paired_indices = {c_idx for _s, c_idx in empty_pairs}
    pairs = sorted(set([*pairs, *empty_pairs]))
    if table_paragraphs_only:
        converted_table_ranges = _xml_element_ranges(converted_xml, "w:tbl")
        pairs = [
            (source_index, converted_index) for source_index, converted_index in pairs
            if any(table_start < converted_ranges[converted_index][0] < table_end
                   for table_start, table_end in converted_table_ranges)
        ]

    replacements: dict[int, str] = {}
    for source_index, converted_index in pairs:
        source_p = original[source_index]
        target_p = converted[converted_index]
        source_carriers = {
            _writer_anchor_name(anchor)
            for anchor in _writer_paragraph_drawings(source_p)
        }
        target_carriers = {
            _writer_anchor_name(anchor)
            for anchor in _writer_paragraph_drawings(target_p)
        }
        if (not _writer_flow_text(target_p)
                and (source_carriers and source_carriers.issubset(target_carriers)
                     or target_carriers & source_carrier_names)):
            # The passthrough relocation pass has already rebuilt this empty
            # paragraph from its source pPr. A second, text-only LCS can pair
            # another equally empty carrier here and put its spacing back.
            continue
        has_marker = bool(re.search(
            r'<w:bookmarkStart\b[^>]*\bw:name=["\']vno-untouched-\d+["\'][^>]*/?>',
            target_p,
            re.IGNORECASE,
        ))
        # A source group copied by passthrough can remove the generated anchor
        # paragraph that held the bookmark.  A unique, non-empty text captured
        # before that replacement safely carries the same untouched proof.
        if (not trust_all_exact and not has_marker
                and converted_index not in empty_paired_indices
                and converted_keys[converted_index] not in (trusted_untouched_texts or set())):
            continue
        # Section relationships are handled by the dedicated section pass.
        if "<w:sectPr" not in source_p and "<w:sectPr" not in target_p:
            target_p = _writer_restore_selected_ppr(target_p, source_p)
        # W37 (d20: 60 ô kiểm FORMCHECKBOX + tab bị LibreOffice bỏ khi lưu; ô vAlign center hạ chữ 7,6pt): đoạn chưa
        # sửa mà nguồn có trường/ký hiệu/tab/ngắt dòng (những thứ HTML làm mất) và KHÔNG có hình/hộp văn bản thì lấy
        # nguyên các run của nguồn (chữ giống nhau theo cặp LCS + dấu chưa sửa).
        restored_runs = _writer_restore_untouched_runs(target_p, source_p)
        if restored_runs is not None:
            replacements[converted_index] = restored_runs
            continue
        if not converted_keys[converted_index]:
            has_drawing = any(tag in source_p or tag in target_p for tag in ("<w:drawing", "<w:pict", "<mc:AlternateContent", "<wps:"))
            if not has_drawing:
                source_rpr = None
                for _s, _e, srun in _writer_run_blocks(source_p):
                    source_rpr = _writer_direct_property(srun, "rPr")
                    if source_rpr:
                        break
                if not source_rpr:
                    source_ppr = _writer_direct_property(source_p, "pPr")
                    source_rpr = _writer_direct_property(source_ppr, "rPr")
                if source_rpr:
                    target_runs = _writer_run_blocks(target_p)
                    if target_runs:
                        run_replacements = []
                        for rs, re_pos, run in target_runs:
                            run_replacements.append((rs, re_pos, _writer_replace_direct_property(run, "rPr", source_rpr)))
                        for rs, re_pos, run in reversed(run_replacements):
                            target_p = target_p[:rs] + run + target_p[re_pos:]
            replacements[converted_index] = target_p
            continue
        # W39 (d21: 11 đoạn chứa ảnh): LibreOffice thêm `<w:hyperlink><w:r>[ ]</w:r></w:hyperlink>` sau run ảnh và
        # bỏ rPr của run ảnh → dấu cách Calibri 11 rớt xuống dòng mới (1 → 2 dòng). Nguồn không có hyperlink → bỏ
        # hyperlink chỉ có khoảng trắng; run ảnh lấy lại rPr nguồn khi hai bên cùng có đúng một run ảnh.
        if "<w:hyperlink" not in source_p and "<w:hyperlink" in target_p:
            target_p = re.sub(r"<w:hyperlink\b[^>]*>(?:\s*<w:r\b[^>]*>(?:<w:rPr>[\s\S]*?</w:rPr>)?\s*<w:t\b[^>]*>\s*</w:t>\s*</w:r>\s*)*</w:hyperlink>", "", target_p, flags=re.IGNORECASE)
        source_drawing_runs = [run for _s, _e, run in _writer_run_blocks(source_p) if "<w:drawing" in run]
        target_drawing_runs = [(s, e, run) for s, e, run in _writer_run_blocks(target_p) if "<w:drawing" in run]
        if len(source_drawing_runs) == 1 and len(target_drawing_runs) == 1:
            s, e, run = target_drawing_runs[0]
            source_rpr = _writer_direct_property(source_drawing_runs[0], "rPr")
            if source_rpr:
                target_p = target_p[:s] + _writer_replace_direct_property(run, "rPr", source_rpr) + target_p[e:]
        source_runs = _writer_run_blocks(source_p)
        target_runs = _writer_run_blocks(target_p)
        # W41 (d14: nguồn tách "Xóa"/" "/"theo"… thành nhiều run sz 32, LibreOffice gộp thành một run và lấy sz 36 của
        # dấu đoạn → 1 → 2 dòng): khi chữ thuần hai bên bằng nhau từng ký tự, gán rPr theo VỊ TRÍ KÝ TỰ — mỗi run
        # đích được cắt theo các run nguồn phủ lên nó và nhận đúng rPr nguồn.
        aligned = _writer_align_runs_by_offset(target_p, source_runs, target_runs)
        if aligned is not None:
            replacements[converted_index] = aligned
            continue
        source_by_text: dict[str, list[str]] = {}
        for _start, _end, run in source_runs:
            text = _paragraph_plain_text(run)
            if text:
                source_by_text.setdefault(text, []).append(run)
        run_replacements: list[tuple[int, int, str]] = []
        used: dict[str, int] = {}
        for start, end, run in target_runs:
            text = _paragraph_plain_text(run)
            occurrence = used.get(text, 0)
            candidates = source_by_text.get(text, [])
            if text and occurrence < len(candidates):
                source_rpr = _writer_direct_property(candidates[occurrence], "rPr")
                run_replacements.append((start, end, _writer_replace_direct_property(run, "rPr", source_rpr)))
                used[text] = occurrence + 1
        for start, end, run in reversed(run_replacements):
            target_p = target_p[:start] + run + target_p[end:]
        replacements[converted_index] = target_p
    result = converted_xml
    for index in sorted(replacements, reverse=True):
        start, end = converted_ranges[index]
        result = result[:start] + replacements[index] + result[end:]

    # The pristine marker's leading carrier is intentionally removed before
    # this pass. If the source itself starts with an empty body paragraph, that
    # can also remove the only converted paragraph available to carry its
    # spacing/alignment. Reinsert unmatched, content-free source paragraphs at
    # their LCS position; changed documents remain conservative because this
    # restoration is limited to the pristine body-flow pass.
    if trust_all_exact and not table_paragraphs_only:
        paired_source = {source_index for source_index, _ in pairs}
        unmatched_empty: list[tuple[int, str]] = []
        for source_index, source_p in enumerate(original):
            if source_index in paired_source or original_keys[source_index]:
                continue
            if re.search(
                r"<w:(?:drawing|pict|object|br|tab|fldChar|fldSimple|instrText|sym|sectPr)\b"
                r"|<mc:AlternateContent\b",
                source_p, re.IGNORECASE,
            ):
                continue
            unmatched_empty.append((source_index, source_p))

        if unmatched_empty:
            current_ranges = _writer_body_paragraph_ranges(result)
            insert_before: dict[int, list[str]] = {}
            for source_index, source_p in unmatched_empty:
                next_pair = next(
                    ((source_at, target_at) for source_at, target_at in pairs
                     if source_at > source_index),
                    None,
                )
                target_index = next_pair[1] if next_pair else len(current_ranges)
                insert_before.setdefault(target_index, []).append(source_p)
            for target_index in sorted(insert_before, reverse=True):
                paragraphs = "".join(insert_before[target_index])
                if target_index < len(current_ranges):
                    position = current_ranges[target_index][0]
                else:
                    body_end = re.search(r"</w:body\s*>", result, re.IGNORECASE)
                    if not body_end:
                        continue
                    position = body_end.start()
                result = result[:position] + paragraphs + result[position:]
    return result


def _writer_run_text_segments(run_xml: str) -> list[str]:
    """Các đoạn chữ <w:t> của run (giữ nguyên khoảng trắng)."""
    return [_unescape_xml(m.group(1)) for m in re.finditer(r"<w:t\b[^>]*>([^<]*)</w:t\s*>", run_xml, re.IGNORECASE)]


def _writer_align_runs_by_offset(target_paragraph: str, source_runs: list, target_runs: list) -> str | None:
    """W41: chỉ với run thuần chữ (<w:t>, không tab/br/field/drawing) hai bên và chữ nối lại bằng nhau từng ký tự.
    Trả về đoạn đích với từng run đích được cắt theo run nguồn phủ lên và mang rPr nguồn; None nếu không áp dụng."""
    def plain_runs(runs):
        out = []
        for start, end, run in runs:
            body = re.sub(r"^<w:r\b[^>]*>|</w:r\s*>$", "", run.strip())
            body_wo_rpr = re.sub(r"^<w:rPr>[\s\S]*?</w:rPr>", "", body)
            if re.sub(r"<w:(?:t|softHyphen|noBreakHyphen)\b[^>]*>(?:[^<]*</w:t\s*>)?", "", body_wo_rpr).strip():
                return None  # run có thứ khác ngoài chữ (tab/br/field/drawing…)
            text = "".join(_writer_run_text_segments(run))
            out.append((start, end, run, text))
        return out
    src = plain_runs(source_runs)
    dst = plain_runs(target_runs)
    if not src or not dst:
        return None
    # So theo ký tự KHÔNG phải khoảng trắng (HTML gộp/bỏ khoảng trắng đầu — d14 nguồn " - Xóa", bản chuyển đổi "- Xóa")
    src_chars: list[str] = []
    for _s, _e, run, text in src:
        rpr = _writer_direct_property(run, "rPr") or ""
        for ch in text:
            if not ch.isspace():
                src_chars.append(rpr)
    src_text = "".join(ch for *_r, t in src for ch in t if not ch.isspace())
    dst_text = "".join(ch for *_r, t in dst for ch in t if not ch.isspace())
    if not src_text or src_text != dst_text:
        return None
    result = target_paragraph
    idx = 0
    pieces: list[tuple[int, int, str]] = []
    last_rpr = src_chars[0]
    for start, end, run, text in dst:
        if not text:
            continue
        run_open = re.match(r"<w:r\b[^>]*>", run).group(0)
        groups: list[tuple[str, list[str]]] = []
        for ch in text:
            if ch.isspace():
                rpr = last_rpr  # khoảng trắng theo ký tự đứng trước
            else:
                rpr = src_chars[idx]
                idx += 1
                last_rpr = rpr
            if groups and groups[-1][0] == rpr:
                groups[-1][1].append(ch)
            else:
                groups.append((rpr, [ch]))
        new_runs = "".join(f'{run_open}{rpr}<w:t xml:space="preserve">{_escape_xml("".join(chars))}</w:t></w:r>' for rpr, chars in groups)
        pieces.append((start, end, new_runs))
    for start, end, xml in reversed(pieces):
        result = result[:start] + xml + result[end:]
    return result


_W37_LOSSY_RE = re.compile(r"<w:(?:fldChar|fldSimple|instrText|sym|tab|br|softHyphen|noBreakHyphen|ptab)\b", re.IGNORECASE)
_W37_UNSAFE_RE = re.compile(
    r"<w:(?:drawing|pict|object|hyperlink|sdt|footnoteReference|endnoteReference|commentReference|commentRangeStart|ins|del|moveFrom|moveTo)\b"
    r"|<mc:AlternateContent\b|<w:txbxContent\b|<w:sectPr\b|\br:(?:id|embed|link)=",
    re.IGNORECASE,
)


def _writer_restore_untouched_runs(target_paragraph: str, source_paragraph: str) -> str | None:
    """W37: trả lại toàn bộ nội dung sau <w:pPr> của đoạn nguồn (run, trường, tab, ký hiệu) cho đoạn chưa sửa.
    Chỉ khi nguồn có phần tử HTML làm mất và không có hình/hộp văn bản/comment/track change; giữ pPr đã ghép và
    bookmark dấu chưa sửa của bản chuyển đổi để các bước sau còn nhận ra."""
    # Tô nền cấp ký tự (w:rPr/w:shd) cũng bị HTML làm mất: đoạn chưa sửa chỉ có chữ tô nền vẫn phải được trả lại nguyên văn.
    has_run_shading = bool(re.search(
        r'<w:r\b[^>]*>\s*<w:rPr>(?:(?!</w:rPr>)[\s\S])*?<w:shd\b(?![^>]*w:val=["\']nil["\'])(?![^>]*w:fill=["\']auto["\'])',
        source_paragraph,
    ))
    if not (_W37_LOSSY_RE.search(source_paragraph) or has_run_shading) or _W37_UNSAFE_RE.search(source_paragraph):
        return None
    if _W37_UNSAFE_RE.search(target_paragraph):
        return None
    # Trường phải trọn vẹn trong đoạn (begin = end), nếu không Word báo hỏng (d16: hyperlink r:id thiếu rels cũng vậy)
    if source_paragraph.count('w:fldCharType="begin"') != source_paragraph.count('w:fldCharType="end"'):
        return None
    open_match = re.match(r"<w:p\b[^>]*>", target_paragraph, re.IGNORECASE)
    if not open_match or not target_paragraph.rstrip().endswith("</w:p>"):
        return None
    target_ppr = _writer_direct_property(target_paragraph, "pPr") or ""
    # W27a đã gắn pageBreakBefore vì LibreOffice làm mất <w:br type="page"> của đoạn; nay run nguồn (có br) trở lại
    # nên bỏ pageBreakBefore nếu nguồn không có (d21: đoạn rỗng chỉ chứa br → thừa 1 trang)
    if re.search(r'<w:br\b[^>]*w:type="page"', source_paragraph) and "<w:pageBreakBefore" in target_ppr \
            and "<w:pageBreakBefore" not in (_writer_direct_property(source_paragraph, "pPr") or ""):
        target_ppr = re.sub(r"<w:pageBreakBefore\b[^>]*/?>", "", target_ppr)
    source_body = re.sub(r"^<w:p\b[^>]*>", "", source_paragraph.strip(), count=1, flags=re.IGNORECASE)
    source_body = re.sub(r"</w:p>$", "", source_body, count=1, flags=re.IGNORECASE)
    source_body = re.sub(r"^\s*<w:pPr\b[^>]*(?:/>|>[\s\S]*?</w:pPr\s*>)", "", source_body, count=1, flags=re.IGNORECASE)
    markers = "".join(re.findall(
        r'<w:bookmarkStart\b[^>]*\bw:name=["\']vno-(?:untouched|edited)-\d+["\'][^>]*/?>|<w:bookmarkEnd\b[^>]*/?>',
        target_paragraph, re.IGNORECASE,
    ))
    # bookmarkEnd của dấu: chỉ giữ cặp có id trùng với bookmarkStart dấu
    marker_ids = re.findall(r'<w:bookmarkStart\b[^>]*\bw:id=["\']([^"\']+)["\'][^>]*\bw:name=["\']vno-(?:untouched|edited)-\d+', target_paragraph, re.IGNORECASE)
    kept: list[str] = []
    for tag in re.findall(r"<w:bookmark(?:Start|End)\b[^>]*/?>", markers, re.IGNORECASE):
        tag_id = re.search(r'\bw:id=["\']([^"\']+)["\']', tag)
        if tag_id and tag_id.group(1) in marker_ids:
            kept.append(tag)
    # bỏ bookmark nguồn trùng tên có thể gây trùng id với bản chuyển đổi
    source_body = re.sub(r"<w:bookmark(?:Start|End)\b[^>]*/?>", "", source_body, flags=re.IGNORECASE)
    # Người dùng chèn Ngắt trang ngay sau đoạn này: LibreOffice đặt <w:br w:type="page"/> ở CUỐI đoạn chưa sửa này.
    # Run nguồn thay vào sẽ làm mất ngắt trang mới đó, nên giữ lại phần ngắt trang dôi ra so với nguồn.
    page_break_re = r'<w:br\b[^>]*w:type=["\']page["\']'
    extra_page_breaks = len(re.findall(page_break_re, target_paragraph)) - len(re.findall(page_break_re, source_paragraph))
    if extra_page_breaks > 0:
        source_body += '<w:r><w:br w:type="page"/></w:r>' * extra_page_breaks
    return open_match.group(0) + target_ppr + "".join(kept) + source_body + "</w:p>"


def _remove_writer_untouched_bookmarks(xml: str) -> str:
    marker_ids = set(re.findall(
        r'<w:bookmarkStart\b(?=[^>]*\bw:id=["\']([^"\']+)["\'])(?=[^>]*\bw:name=["\'](?:vno-(?:untouched|edited)-\d+|vno-pristine-document)["\'])[^>]*/?>',
        xml,
        re.IGNORECASE,
    ))
    xml = re.sub(
        r'<w:bookmarkStart\b(?=[^>]*\bw:name=["\'](?:vno-(?:untouched|edited)-\d+|vno-pristine-document)["\'])[^>]*/?>',
        "",
        xml,
        flags=re.IGNORECASE,
    )
    for marker_id in marker_ids:
        xml = re.sub(
            rf'<w:bookmarkEnd\b(?=[^>]*\bw:id=["\']{re.escape(marker_id)}["\'])[^>]*/?>',
            "",
            xml,
            flags=re.IGNORECASE,
        )
    return xml


def _writer_paragraph_visible_text(paragraph: str) -> str:
    """Read Word run text plus OMML text in document order for safe equation matching."""
    pieces: list[str] = []
    token_re = re.compile(
        r'<(?:w|m):t\b[^>]*>([\s\S]*?)</(?:w|m):t\s*>|<w:tab\b[^>]*/>',
        re.IGNORECASE,
    )
    for match in token_re.finditer(paragraph):
        if match.group(1) is not None:
            pieces.append(_unescape_xml(match.group(1)))
        else:
            pieces.append(" ")
    return re.sub(r"\s+", " ", "".join(pieces)).strip()


def _restore_untouched_writer_equations(converted_xml: str, original_xml: str) -> str:
    """Put native OMML back when HTML conversion flattened an untouched equation.

    Writer's edit model marks unchanged paragraphs with a named bookmark. Match
    only unique paragraphs carrying that marker and exact visible text; edited,
    commented, revision-bearing, drawing-bearing, or relationship-bearing
    paragraphs are left to the normal conversion path.
    """
    source_ranges = _document_paragraph_ranges(original_xml)
    target_ranges = _document_paragraph_ranges(converted_xml)
    source_paragraphs = [original_xml[start:end] for start, end in source_ranges]
    target_paragraphs = [converted_xml[start:end] for start, end in target_ranges]
    source_by_text: dict[str, list[int]] = {}
    target_by_text: dict[str, list[int]] = {}
    for index, paragraph in enumerate(source_paragraphs):
        if "<m:oMath" not in paragraph and "<m:oMathPara" not in paragraph:
            continue
        if re.search(
            r"<w:(?:ins|del|moveFrom|moveTo|commentRangeStart|commentRangeEnd|commentReference|drawing|pict|object|hyperlink|fldSimple|fldChar|instrText|sectPr)\b|\br:id=",
            paragraph, re.IGNORECASE,
        ):
            continue
        visible = _writer_paragraph_visible_text(paragraph)
        if visible:
            source_by_text.setdefault(visible, []).append(index)
    for index, paragraph in enumerate(target_paragraphs):
        if not re.search(
            r'<w:bookmarkStart\b(?=[^>]*\bw:name=["\']vno-untouched-\d+["\'])[^>]*/?>',
            paragraph, re.IGNORECASE,
        ):
            continue
        visible = _writer_paragraph_visible_text(paragraph)
        if visible:
            target_by_text.setdefault(visible, []).append(index)

    replacements: list[tuple[int, int, str]] = []
    for visible, source_indexes in source_by_text.items():
        target_indexes = target_by_text.get(visible, [])
        if len(source_indexes) != 1 or len(target_indexes) != 1:
            continue
        source_p = source_paragraphs[source_indexes[0]]
        target_index = target_indexes[0]
        target_p = target_paragraphs[target_index]
        if "<m:oMath" in target_p or "<m:oMathPara" in target_p:
            continue
        if re.search(
            r"<w:(?:ins|del|moveFrom|moveTo|commentRangeStart|commentRangeEnd|commentReference|drawing|pict|object|hyperlink|fldSimple|fldChar|instrText|sectPr)\b|\br:id=",
            target_p, re.IGNORECASE,
        ):
            continue
        target_open = re.match(r"<w:p\b[^>]*>", target_p, re.IGNORECASE)
        if not target_open or not target_p.rstrip().endswith("</w:p>"):
            continue
        target_ppr = _writer_direct_property(target_p, "pPr") or ""
        marker_ids = set(re.findall(
            r'<w:bookmarkStart\b(?=[^>]*\bw:id=["\']([^"\']+)["\'])(?=[^>]*\bw:name=["\']vno-untouched-\d+["\'])[^>]*/?>',
            target_p, re.IGNORECASE,
        ))
        markers: list[str] = []
        for bookmark in re.findall(r"<w:bookmark(?:Start|End)\b[^>]*/?>", target_p, re.IGNORECASE):
            bookmark_id = re.search(r'\bw:id=["\']([^"\']+)["\']', bookmark, re.IGNORECASE)
            if bookmark_id and bookmark_id.group(1) in marker_ids:
                markers.append(bookmark)
        source_body = re.sub(r"^<w:p\b[^>]*>", "", source_p.strip(), count=1, flags=re.IGNORECASE)
        source_body = re.sub(r"</w:p>$", "", source_body, count=1, flags=re.IGNORECASE)
        source_body = re.sub(r"^\s*<w:pPr\b[^>]*(?:/>|>[\s\S]*?</w:pPr\s*>)", "", source_body, count=1, flags=re.IGNORECASE)
        source_body = re.sub(r"<w:bookmark(?:Start|End)\b[^>]*/?>", "", source_body, flags=re.IGNORECASE)
        restored = target_open.group(0) + target_ppr + "".join(markers) + source_body + "</w:p>"
        start, end = target_ranges[target_index]
        replacements.append((start, end, restored))

    result = converted_xml
    for start, end, restored in sorted(replacements, reverse=True):
        result = result[:start] + restored + result[end:]
    # LibreOffice's regenerated root may not declare the Office Math
    # namespace. Restoring source OMML without it leaves an unbound ``m:``
    # prefix, and Word rejects the package as malformed XML.
    if replacements and re.search(r"<m:(?:oMath|oMathPara)\b", result, re.IGNORECASE):
        root_open = re.search(r"<w:document\b[^>]*>", result, re.IGNORECASE)
        if root_open and not re.search(r"\bxmlns:m\s*=", root_open.group(0), re.IGNORECASE):
            result = (
                result[:root_open.end() - 1]
                + ' xmlns:m="' + _WRITER_MATH_NS + '"'
                + result[root_open.end() - 1:]
            )
    return result


def _document_paragraph_ranges(xml: str) -> list[tuple[int, int]]:
    anchor_ranges = [(match.start(), match.end()) for match in _WRITER_ANCHOR_RE.finditer(xml)]
    txbx_ranges = _xml_element_ranges(xml, "w:txbxContent")
    ranges = [
        (start, end) for start, end in _xml_element_ranges(xml, "w:p")
        if not any(anchor_start < start < anchor_end for anchor_start, anchor_end in anchor_ranges)
        and not any(tx_start < start < tx_end for tx_start, tx_end in txbx_ranges)
    ]
    return [
        (s, e) for s, e in ranges
        if not any(other_s < s < other_e for other_s, other_e in ranges)
    ]


def _writer_body_paragraph_ranges(xml: str) -> list[tuple[int, int]]:
    """Return body-flow paragraphs, excluding tables and nested text boxes."""
    body = re.search(r"<w:body\b[^>]*>([\s\S]*?)</w:body\s*>", xml, re.IGNORECASE)
    if not body:
        return []
    offset = body.start(1)
    flow = body.group(1)
    excluded = sorted([
        *_xml_element_ranges(flow, "w:tbl"),
        *_xml_element_ranges(flow, "w:txbxContent"),
    ])
    return [
        (offset + start, offset + end)
        for start, end in _xml_element_ranges(flow, "w:p")
        if not any(excluded_start < start < excluded_end
                   for excluded_start, excluded_end in excluded)
    ]


def _writer_text_lcs_pairs(source: list[str], target: list[str]) -> list[tuple[int, int]]:
    """Pair non-empty body paragraphs by exact normalized text."""
    source_keys = [_paragraph_plain_text(paragraph) for paragraph in source]
    target_keys = [_paragraph_plain_text(paragraph) for paragraph in target]
    rows, cols = len(source_keys), len(target_keys)
    dp = [[0] * (cols + 1) for _ in range(rows + 1)]
    for i in range(rows - 1, -1, -1):
        for j in range(cols - 1, -1, -1):
            equal = bool(source_keys[i]) and source_keys[i] == target_keys[j]
            dp[i][j] = dp[i + 1][j + 1] + 1 if equal else max(dp[i + 1][j], dp[i][j + 1])
    pairs: list[tuple[int, int]] = []
    i = j = 0
    while i < rows and j < cols:
        if source_keys[i] and source_keys[i] == target_keys[j]:
            pairs.append((i, j)); i += 1; j += 1
        elif dp[i + 1][j] >= dp[i][j + 1]:
            i += 1
        else:
            j += 1
    return pairs


def _writer_has_page_break(paragraph: str) -> bool:
    # HTML/LibreOffice collapses paragraph-level Word section boundaries
    # to the final body sectPr.  For carrier relocation those original
    # next-page sections are page boundaries: rebuilt carriers emit a
    # literal page break while the final section pass owns sectPr/rIds.
    if re.search(r'<w:br\b[^>]*\bw:type=["\']page["\']|<w:pageBreakBefore\b', paragraph, re.IGNORECASE):
        return True
    # W40b (d03/d23): section liên tục (`w:type continuous`) KHÔNG phải ngắt trang — W27a từng gắn pageBreakBefore
    # vào đoạn mang sectPr continuous cuối tài liệu → 1 trang thành 2. Chỉ nextPage/oddPage/evenPage (mặc định
    # khi không có w:type) mới là ranh giới trang.
    sect = re.search(r"<w:sectPr\b[^>]*>([\s\S]*?)</w:sectPr\s*>", paragraph, re.IGNORECASE)
    if not sect:
        return False
    sect_type = re.search(r'<w:type\b[^>]*\bw:val=["\']([^"\']+)["\']', sect.group(1), re.IGNORECASE)
    return not sect_type or sect_type.group(1).lower() in ("nextpage", "oddpage", "evenpage")


def _writer_body_flow_elements(xml: str) -> list[dict]:
    """Extract body-flow paragraphs and tables in document order.

    Returns list of dicts with keys:
      - 'type': 'paragraph' or 'table'
      - 'xml': full element XML
      - 'start', 'end': positions in xml string
      - For paragraphs: 'has_page_break' (bool)
      - For tables: 'first_cell_first_para' (dict with 'xml', 'start', 'end') or None
    """
    body_match = re.search(r"<w:body\b[^>]*>([\s\S]*?)</w:body\s*>", xml, re.IGNORECASE)
    if not body_match:
        return []
    body_xml = body_match.group(1)
    body_offset = body_match.start(1)

    # Get all paragraphs and tables in body order
    para_ranges = _xml_element_ranges(body_xml, "w:p")
    tbl_ranges = _xml_element_ranges(body_xml, "w:tbl")

    # Merge and sort by start position
    elements = []
    for start, end in para_ranges:
        full_xml = body_xml[start:end]
        has_pb = _writer_has_page_break(full_xml)
        elements.append({
            'type': 'paragraph',
            'xml': full_xml,
            'start': body_offset + start,
            'end': body_offset + end,
            'has_page_break': has_pb,
        })
    for start, end in tbl_ranges:
        full_xml = body_xml[start:end]
        # Find first cell's first paragraph for pageBreakBefore placement
        first_para = None
        cell_ranges = _xml_element_ranges(full_xml, "w:tc")
        for cell_start, cell_end in cell_ranges:
            cell_xml = full_xml[cell_start:cell_end]
            para_ranges_cell = _xml_element_ranges(cell_xml, "w:p")
            if para_ranges_cell:
                ps, pe = para_ranges_cell[0]
                first_para_xml = cell_xml[ps:pe]
                first_para = {
                    'xml': first_para_xml,
                    'start': body_offset + start + cell_start + ps,
                    'end': body_offset + start + cell_start + pe,
                }
                break
        elements.append({
            'type': 'table',
            'xml': full_xml,
            'start': body_offset + start,
            'end': body_offset + end,
            'first_cell_first_para': first_para,
        })

    elements.sort(key=lambda e: e['start'])
    return elements


def _add_page_break_before_to_paragraph(para_xml: str) -> str:
    """Add w:pageBreakBefore to paragraph's w:pPr."""
    if re.search(r'<w:br\b[^>]*\bw:type=["\']page["\']|<w:pageBreakBefore\b', para_xml, re.IGNORECASE):
        return para_xml
    ppr_match = re.search(r'(<w:pPr\b[^>]*>[\s\S]*?</w:pPr\s*>)', para_xml, re.IGNORECASE)
    if ppr_match:
        ppr = ppr_match.group(1)
        # Check if already has pageBreakBefore
        if re.search(r'<w:pageBreakBefore\b', ppr, re.IGNORECASE):
            return para_xml
        # Insert before closing </w:pPr>
        new_ppr = re.sub(r'(</w:pPr\s*>)', r'<w:pageBreakBefore/>\1', ppr, count=1, flags=re.IGNORECASE)
        return para_xml[:ppr_match.start()] + new_ppr + para_xml[ppr_match.end():]
    else:
        # No pPr, create one with pageBreakBefore
        return re.sub(r'(<w:p\b[^>]*>)', r'\1<w:pPr><w:pageBreakBefore/></w:pPr>', para_xml, count=1, flags=re.IGNORECASE)


def _remove_page_break_before_from_paragraph(para_xml: str) -> str:
    """Remove w:pageBreakBefore from paragraph's w:pPr."""
    ppr_match = re.search(r'(<w:pPr\b[^>]*>[\s\S]*?</w:pPr\s*>)', para_xml, re.IGNORECASE)
    if not ppr_match:
        return para_xml
    ppr = ppr_match.group(1)
    new_ppr = re.sub(r'<w:pageBreakBefore\b[^>]*/?>', '', ppr, flags=re.IGNORECASE)
    if new_ppr == ppr:
        return para_xml
    return para_xml[:ppr_match.start()] + new_ppr + para_xml[ppr_match.end():]


def _writer_add_br_page_run(para_xml: str) -> str:
    """Insert <w:br w:type="page"/> as the first run (R13d empty page-break paragraph)."""
    if re.search(r'<w:br\b[^>]*\bw:type=["\']page["\']', para_xml, re.IGNORECASE):
        return para_xml
    br_run = '<w:r><w:br w:type="page"/></w:r>'
    ppr = re.search(r"<w:pPr\b[^>]*(?:/>|>[\s\S]*?</w:pPr\s*>)", para_xml, re.IGNORECASE)
    if ppr:
        return para_xml[:ppr.end()] + br_run + para_xml[ppr.end():]
    open_tag = re.match(r"<w:p\b[^>]*>", para_xml, re.IGNORECASE)
    if open_tag:
        return para_xml[:open_tag.end()] + br_run + para_xml[open_tag.end():]
    return para_xml


def _writer_collapse_consecutive_page_breaks(xml: str) -> str:
    """R13d: empty br-carrier + next paragraph's W22d pageBreakBefore would paginate twice.

    Keep the empty w:br type=page (original Word form) and drop the extra pageBreakBefore.
    """
    ranges = _writer_body_paragraph_ranges(xml)
    if len(ranges) < 2:
        return xml
    replacements: list[tuple[int, int, str]] = []
    for index in range(1, len(ranges)):
        prev = xml[ranges[index - 1][0]:ranges[index - 1][1]]
        curr = xml[ranges[index][0]:ranges[index][1]]
        if _paragraph_plain_text(prev).strip():
            continue
        if not _writer_has_page_break(prev):
            continue
        if not re.search(r"<w:pageBreakBefore\b", curr, re.IGNORECASE):
            continue
        new_curr = _remove_page_break_before_from_paragraph(curr)
        if new_curr != curr:
            replacements.append((ranges[index][0], ranges[index][1], new_curr))
    result = xml
    for start, end, new_xml in sorted(replacements, key=lambda item: item[0], reverse=True):
        result = result[:start] + new_xml + result[end:]
    return result


def _insert_empty_paragraph_with_page_break_before_table(table_xml: str, table_start: int, table_end: int, xml: str) -> str:
    """Insert an empty paragraph with w:br type=page before the table."""
    empty_para = '<w:p><w:pPr><w:pageBreakBefore/></w:pPr><w:r><w:br w:type="page"/></w:r></w:p>'
    return xml[:table_start] + empty_para + xml[table_start:]


_W27B_ALT_RE = re.compile(r"<mc:AlternateContent\b[^>]*>[\s\S]*?</mc:AlternateContent>", re.IGNORECASE)


def _writer_table_key_text(table_xml: str) -> str:
    """Chữ đầu của bảng (24 ký tự chuẩn hoá) để ghép bảng nổi giữa nguồn và bản chuyển đổi (như W27a)."""
    text = "".join(re.findall(r"<w:t\b[^>]*>([^<]*)</w:t>", table_xml))
    return re.sub(r"[^0-9a-zà-ỹ]+", "", html.unescape(text).lower())[:24]


def _w27b_tblppr_from_anchor(anchor_xml: str) -> str:
    """Suy tblpPr từ wp:anchor của khung (EMU -> twip = /635) khi nguồn không có bảng nổi tương ứng."""
    def emu(pattern: str, default: int = 0) -> int:
        match = re.search(pattern, anchor_xml)
        return int(round(int(match.group(1)) / 635)) if match else default

    dist_l = emu(r'\bdistL="(-?\d+)"', 180)
    dist_r = emu(r'\bdistR="(-?\d+)"', 180)
    horz_rel = (re.search(r"<wp:positionH\b[^>]*relativeFrom=\"(\w+)\"", anchor_xml) or re.search(r"$", "")).group(1) if re.search(r"<wp:positionH\b", anchor_xml) else "column"
    vert_rel = (re.search(r"<wp:positionV\b[^>]*relativeFrom=\"(\w+)\"", anchor_xml)).group(1) if re.search(r"<wp:positionV\b", anchor_xml) else "paragraph"
    anchor_map = {"column": "text", "margin": "margin", "page": "page", "paragraph": "text", "line": "text"}
    attrs = [f'w:leftFromText="{dist_l}"', f'w:rightFromText="{dist_r}"', f'w:vertAnchor="{anchor_map.get(vert_rel, "text")}"',
             f'w:horzAnchor="{anchor_map.get(horz_rel, "text")}"']
    h_align = re.search(r"<wp:positionH\b[^>]*>\s*<wp:align>(\w+)</wp:align>", anchor_xml)
    if h_align:
        attrs.append(f'w:tblpXSpec="{h_align.group(1)}"')
    else:
        h_off = re.search(r"<wp:positionH\b[^>]*>\s*<wp:posOffset>(-?\d+)</wp:posOffset>", anchor_xml)
        if h_off:
            attrs.append(f'w:tblpX="{int(round(int(h_off.group(1)) / 635))}"')
    v_align = re.search(r"<wp:positionV\b[^>]*>\s*<wp:align>(\w+)</wp:align>", anchor_xml)
    if v_align:
        attrs.append(f'w:tblpYSpec="{v_align.group(1)}"')
    else:
        v_off = re.search(r"<wp:positionV\b[^>]*>\s*<wp:posOffset>(-?\d+)</wp:posOffset>", anchor_xml)
        if v_off:
            attrs.append(f'w:tblpY="{int(round(int(v_off.group(1)) / 635))}"')
    return "<w:tblpPr " + " ".join(attrs) + "/>"


def _w27b_insert_tblppr(table_xml: str, tblppr_xml: str) -> str:
    """Đặt <w:tblpPr> đúng thứ tự schema trong <w:tblPr> (sau tblStyle, trước tblOverlap/bidiVisual/tblW…)."""
    match = re.search(r"<w:tblPr\b[^>]*>", table_xml)
    if not match:
        return table_xml.replace("<w:tbl>", f"<w:tbl><w:tblPr>{tblppr_xml}</w:tblPr>", 1)
    head_end = match.end()
    body_end = table_xml.find("</w:tblPr>", head_end)
    if body_end < 0:
        return table_xml
    props = re.sub(r"<w:tblpPr\b[^>]*/>", "", table_xml[head_end:body_end])
    style = re.search(r"<w:tblStyle\b[^>]*/>", props)
    insert_at = style.end() if style else 0
    props = props[:insert_at] + tblppr_xml + props[insert_at:]
    return table_xml[:head_end] + props + table_xml[body_end:]


def _restore_writer_floating_tables(converted_xml: str, source_xml: str) -> str:
    """W27b (đo d09, R19 opencode + Claude kiểm lại): bảng nổi (w:tblpPr) của nguồn được LibreOffice nhập thành khung
    HTML `align="left"` rồi xuất thành hộp văn bản `mc:AlternateContent` (Choice + Fallback cùng chứa bảng → đếm
    `<w:tbl` ra "nhân đôi"). Word hiển thị một hộp văn bản nổi chứa bảng, không phải bảng nổi. Trả lại `<w:tbl>` với
    `<w:tblpPr>` của nguồn (ghép theo chữ đầu bảng) hoặc suy từ wp:anchor; đoạn neo chỉ còn run rỗng thì bỏ (giữ nếu
    phần tử kế tiếp là bảng/sectPr vì Word cần đoạn ngăn)."""
    if "<w:txbxContent>" not in converted_xml:
        return converted_xml
    source_floating: dict[str, str] = {}
    for match in re.finditer(r"<w:tbl>[\s\S]*?</w:tbl>", source_xml):
        table_xml = match.group(0)
        tblppr = re.search(r"<w:tblpPr\b[^>]*/>", table_xml[:table_xml.find("</w:tblPr>") if "</w:tblPr>" in table_xml else 0])
        if tblppr:
            source_floating.setdefault(_writer_table_key_text(table_xml), tblppr.group(0))

    out: list[str] = []
    pos = 0
    changed = False
    # Chỉ đoạn neo ở luồng thân (đoạn trong ô bảng/hộp văn bản bị loại: Word không có bảng nổi lồng)
    for para_start, para_end in _writer_body_paragraph_ranges(converted_xml):
        para_xml = converted_xml[para_start:para_end]
        if "<w:txbxContent>" not in para_xml or "<w:tbl>" not in para_xml:
            continue
        alt = _W27B_ALT_RE.search(para_xml)
        if not alt:
            continue
        choice = re.search(r"<mc:Choice\b[^>]*>([\s\S]*?)</mc:Choice>", alt.group(0))
        if not choice:
            continue
        txbx = re.search(r"<w:txbxContent>([\s\S]*?)</w:txbxContent>", choice.group(1))
        if not txbx:
            continue
        content = txbx.group(1).strip()
        # Chỉ khung mà nội dung là đúng MỘT bảng ngoài cùng (cho phép đoạn rỗng kèm theo ngoài bảng)
        table_ranges = _xml_element_ranges(content, "w:tbl")
        outer = [(s, e) for s, e in table_ranges if not any(o_s < s < o_e for o_s, o_e in table_ranges)]
        if len(outer) != 1:
            continue
        table_xml = content[outer[0][0]:outer[0][1]]
        rest = content[:outer[0][0]] + content[outer[0][1]:]
        if re.search(r"<w:t\b[^>]*>[^<]+</w:t>|<w:drawing\b|<w:pict\b|<w:tbl>", rest):
            continue
        key = _writer_table_key_text(table_xml)
        tblppr = source_floating.get(key) or _w27b_tblppr_from_anchor(choice.group(1))
        table_xml = _w27b_insert_tblppr(table_xml, tblppr)
        remainder = para_xml[:alt.start()] + para_xml[alt.end():]
        remainder_has_text = bool(re.search(r"<w:t\b[^>]*>[^<]+</w:t>|<w:drawing\b|<w:pict\b", remainder))
        following = converted_xml[para_end:para_end + 40].lstrip()
        keep_paragraph = remainder_has_text or following.startswith("<w:tbl>") or following.startswith("<w:sectPr") or following.startswith("</w:body>")
        replacement = table_xml + (remainder if keep_paragraph else "")
        out.append(converted_xml[pos:para_start])
        out.append(replacement)
        pos = para_end
        changed = True
    if not changed:
        return converted_xml
    out.append(converted_xml[pos:])
    return "".join(out)


_SECT_REF_RE = re.compile(r"<w:(?:headerReference|footerReference)\b[^>]*/>", re.IGNORECASE)


def _restore_writer_sections_by_order(converted_xml: str, source_xml: str, r_id_map: dict[str, str] | None = None) -> str:
    """W40 (đo d03: nguồn 3 section [nextPage top 810 / continuous 1134 / continuous 1134], bản lưu
    [continuous 1134 / continuous 811 / continuous 811] → đoạn đầu y 40,5 → 57pt, 1 → 2 trang): khi số `w:sectPr`
    hai bên bằng nhau (kể cả sectPr cuối thân), thay từng sectPr theo thứ tự bằng sectPr nguồn nhưng giữ
    headerReference/footerReference của bản chuyển đổi (rId thuộc gói mới).
    Khi bản chuyển đổi không có refs (LibreOffice bỏ sót ref của section giữa tài liệu), giữ lại refs nguồn
    đã được ánh xạ lại rId qua r_id_map."""
    src = [m for m in re.finditer(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", source_xml, re.IGNORECASE)]
    dst = [m for m in re.finditer(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", converted_xml, re.IGNORECASE)]
    if not src or len(src) != len(dst):
        return converted_xml

    def refs_by_key(sect_xml: str) -> dict[tuple[str, str], str]:
        refs: dict[tuple[str, str], str] = {}
        for ref in _SECT_REF_RE.findall(sect_xml):
            tag_match = re.match(r"<w:(header|footer)Reference\b", ref, re.IGNORECASE)
            type_match = re.search(r'\bw:type\s*=\s*(["\'])([^"\']+)\1', ref, re.IGNORECASE)
            if not tag_match:
                continue
            kind = tag_match.group(1).lower()
            ref_type = (type_match.group(2) if type_match else "default").lower()
            refs[(kind, ref_type)] = ref
        return refs

    source_maps = [refs_by_key(match.group(0)) for match in src]
    converted_maps = [refs_by_key(match.group(0)) for match in dst]
    preserve_source_refs: dict[str, bool] = {}
    for kind in ("header", "footer"):
        source_signatures = [tuple(sorted((ref_type, ref) for (ref_kind, ref_type), ref in refs.items()
                                          if ref_kind == kind)) for refs in source_maps]
        converted_signatures = [tuple(sorted((ref_type, ref) for (ref_kind, ref_type), ref in refs.items()
                                             if ref_kind == kind)) for refs in converted_maps]
        # If the source's per-section refs/links differ but the HTML filter made
        # them identical, restore the source reference pattern (including links).
        preserve_source_refs[kind] = (
            len(set(source_signatures)) > 1
            and len(set(converted_signatures)) <= 1
        )

    out: list[str] = []
    pos = 0
    for s_m, d_m, source_refs, converted_refs in zip(src, dst, source_maps, converted_maps):
        merged_refs = {
            key: ref for key, ref in converted_refs.items()
            if not preserve_source_refs[key[0]]
        }
        for key, source_ref in source_refs.items():
            kind, _ref_type = key
            if preserve_source_refs[kind] or key not in merged_refs:
                merged_refs[key] = _remap_header_footer_rids(source_ref, r_id_map or {})
        refs = "".join(
            merged_refs[key]
            for kind in ("header", "footer")
            for ref_type in ("default", "first", "even")
            if (key := (kind, ref_type)) in merged_refs
        )
        body = _SECT_REF_RE.sub("", s_m.group(0))
        open_tag = re.match(r"<w:sectPr\b[^>]*>", body).group(0)
        replaced = open_tag + refs + body[len(open_tag):]
        out.append(converted_xml[pos:d_m.start()])
        out.append(replaced)
        pos = d_m.end()
    out.append(converted_xml[pos:])
    return "".join(out)


_W35B_NUM_OFFSET = 1000


def _writer_offset_num_ids(xml: str, offset: int) -> str:
    """Dời numId của LibreOffice (+offset) trong document/styles để không trùng numId nguồn được W35 trả lại."""
    return re.sub(r'(<w:numId\b[^>]*\bw:val=")(\d+)(")', lambda m: f"{m.group(1)}{int(m.group(2)) + offset}{m.group(3)}", xml)


def _merge_writer_numbering(source_numbering: str, converted_numbering: str, offset: int) -> str:
    """W35b: numbering.xml = nguồn + abstractNum/num của LibreOffice với id dời +offset (đoạn chưa sửa dùng numPr
    nguồn → đúng lvlText/ind của Word; đoạn mới/sửa vẫn trỏ vào danh sách LibreOffice đã dời)."""
    abstract_re = re.compile(r"<w:abstractNum\b[^>]*>[\s\S]*?</w:abstractNum\s*>", re.IGNORECASE)
    num_re = re.compile(r"<w:num\b(?![A-Za-z])[^>]*>[\s\S]*?</w:num\s*>", re.IGNORECASE)
    shifted_abstract = [
        re.sub(r'(w:abstractNumId=")(\d+)(")', lambda m: f"{m.group(1)}{int(m.group(2)) + offset}{m.group(3)}", block)
        for block in abstract_re.findall(converted_numbering)
    ]
    shifted_num = [
        re.sub(r'(w:(?:numId|abstractNumId)=")(\d+)(")|(<w:abstractNumId\b[^>]*\bw:val=")(\d+)(")',
               lambda m: (f"{m.group(1)}{int(m.group(2)) + offset}{m.group(3)}" if m.group(1)
                          else f"{m.group(4)}{int(m.group(5)) + offset}{m.group(6)}"), block)
        for block in num_re.findall(converted_numbering)
    ]
    out = source_numbering
    first_num = re.search(r"<w:num\b(?![A-Za-z])", out, re.IGNORECASE)
    insert_abstract_at = first_num.start() if first_num else out.rfind("</w:numbering>")
    if insert_abstract_at < 0:
        return source_numbering
    out = out[:insert_abstract_at] + "".join(shifted_abstract) + out[insert_abstract_at:]
    close = out.rfind("</w:numbering>")
    return out[:close] + "".join(shifted_num) + out[close:]


def _writer_top_level_tables(xml: str) -> list[tuple[int, int]]:
    """Khoảng [start, end) của các <w:tbl> cấp 1 trong <w:body> (bỏ bảng trong hộp văn bản/Fallback)."""
    body = re.search(r"<w:body\b[^>]*>([\s\S]*?)</w:body\s*>", xml, re.IGNORECASE)
    if not body:
        return []
    offset = body.start(1)
    flow = body.group(1)
    masked = re.sub(r"<w:txbxContent\b[\s\S]*?</w:txbxContent\s*>|<mc:Fallback\b[\s\S]*?</mc:Fallback\s*>",
                    lambda m: " " * len(m.group(0)), flow, flags=re.IGNORECASE)
    ranges = _xml_element_ranges(masked, "w:tbl")
    top = [(s, e) for s, e in ranges if not any(o_s < s < o_e for o_s, o_e in ranges)]
    return [(offset + s, offset + e) for s, e in top]


def _writer_table_rows(table_xml: str) -> list[tuple[int, int]]:
    """Khoảng các <w:tr> cấp 1 của một bảng (không lấy hàng của bảng lồng)."""
    ranges = _xml_element_ranges(table_xml, "w:tr")
    nested = [(s, e) for s, e in _xml_element_ranges(table_xml, "w:tbl") if s > 0]
    return [(s, e) for s, e in ranges if not any(n_s < s < n_e for n_s, n_e in nested)]


def _writer_row_cells(row_xml: str) -> list[tuple[int, int]]:
    ranges = _xml_element_ranges(row_xml, "w:tc")
    nested = _xml_element_ranges(row_xml, "w:tbl")
    return [(s, e) for s, e in ranges if not any(n_s < s < n_e for n_s, n_e in nested)]


def _writer_leading_property(element_xml: str, open_tag_re: str, prop_name: str) -> tuple[re.Match | None, int]:
    """Thuộc tính TRỰC TIẾP của phần tử (tblPr/trPr/tcPr/tblGrid): phải đứng trước mọi con khác (không lấy của bảng
    lồng). Trả về (match hoặc None, vị trí kết thúc thẻ mở)."""
    open_match = re.match(open_tag_re, element_xml, re.IGNORECASE)
    if not open_match:
        return None, 0
    head_end = open_match.end()
    prop_re = re.compile(rf"<w:{prop_name}\b[^>]*(?:/>|>[\s\S]*?</w:{prop_name}\s*>)", re.IGNORECASE)
    match = prop_re.search(element_xml, head_end)
    if not match:
        return None, head_end
    between = element_xml[head_end:match.start()]
    # chỉ chấp nhận khi giữa thẻ mở và thuộc tính không có phần tử NỘI DUNG (tr/tc/p/tbl); tblPr/tblGrid/trPr/tcPr khác được
    if re.search(r"<w:(?:tr|tc|p|tbl)\b", between, re.IGNORECASE):
        return None, head_end
    return match, head_end


def _writer_replace_leading_props(element_xml: str, open_tag_re: str, prop_name: str, source_prop: str | None) -> str:
    """Thay (hoặc chèn ngay sau thẻ mở / bỏ) thuộc tính trực tiếp của một phần tử (tblPr/trPr/tcPr/tblGrid)."""
    match, head_end = _writer_leading_property(element_xml, open_tag_re, prop_name)
    if match:
        return element_xml[:match.start()] + (source_prop or "") + element_xml[match.end():]
    if not source_prop or not head_end:
        return element_xml
    # tblGrid phải đứng sau tblPr; trPr/tcPr/tblPr đứng đầu
    insert_at = head_end
    if prop_name == "tblGrid":
        tblpr_match, _ = _writer_leading_property(element_xml, open_tag_re, "tblPr")
        if tblpr_match:
            insert_at = tblpr_match.end()
    return element_xml[:insert_at] + source_prop + element_xml[insert_at:]


def _writer_source_leading_property(element_xml: str, open_tag_re: str, prop_name: str) -> str | None:
    match, _ = _writer_leading_property(element_xml, open_tag_re, prop_name)
    return match.group(0) if match else None


def _writer_parse_table_edits(source_html: str | None) -> dict[str, list[dict[str, object]]]:
    """Danh sách bảng cấp 1 mà giao diện báo ĐÃ SỬA (tô nền, căn dọc, viền, độ rộng, chiều cao hàng, cấu trúc...).

    Giao diện ghi `<!--vno-table-edits: [{"k":"chuđầu","table":false,"all":false,"rows":[1],"cells":[[1,0]]}] -->`.
    Bảng được ghép theo KHÓA chữ đầu (cùng cách tính với _writer_table_key_text), không theo số thứ tự, vì LibreOffice
    có thể gộp/bỏ bảng. Phần được liệt kê KHÔNG được khôi phục thuộc tính gốc (tblPr/tblGrid/trPr/tcPr) ở bước W36,
    nếu không chỉnh sửa của người dùng bị ghi đè. Chú thích nằm cuối HTML nên lấy lần xuất hiện CUỐI CÙNG.
    """
    if not source_html:
        return {}
    matches = list(re.finditer(r"<!--vno-table-edits:\s*(\[.*?\])\s*-->", source_html, re.IGNORECASE | re.DOTALL))
    if not matches:
        return {}
    try:
        data = json.loads(matches[-1].group(1))
    except ValueError:
        return {}
    edits: dict[str, list[dict[str, object]]] = {}
    for item in data if isinstance(data, list) else []:
        if not isinstance(item, dict) or not isinstance(item.get("k"), str):
            continue
        edits.setdefault(item["k"], []).append({
            "table": bool(item.get("table")),
            "all": bool(item.get("all")),
            "rows": {int(r) for r in item.get("rows", []) if isinstance(r, int)},
            "cells": {(int(c[0]), int(c[1])) for c in item.get("cells", []) if isinstance(c, (list, tuple)) and len(c) == 2},
        })
    return edits


def _restore_writer_table_properties(converted_xml: str, source_xml: str, table_edits: dict[str, list[dict[str, object]]] | None = None) -> str:
    """W36 (đo d20 bản lưu bằng Word COM: mỗi hàng bảng cao thêm ~3pt vì LibreOffice ghi tblCellMar top/bottom 28
    twips, trHeight 504 → 510 atLeast, tcW 2778 → 2772; nguồn không có tblCellMar → 3 trang thành 5): ghép bảng cấp 1
    theo THỨ TỰ với kiểm chữ đầu (24 ký tự), khi số hàng và số ô từng hàng trùng nhau thì lấy lại tblPr, tblGrid, trPr,
    tcPr của nguồn (bảng bị sửa cấu trúc → số hàng/ô lệch → giữ nguyên bản chuyển đổi)."""
    source_tables = _writer_top_level_tables(source_xml)
    converted_tables = _writer_top_level_tables(converted_xml)
    if not source_tables or not converted_tables:
        return converted_xml
    src_index = 0
    out: list[str] = []
    pos = 0
    pending_edits = {key: list(items) for key, items in (table_edits or {}).items()}
    for c_start, c_end in converted_tables:
        table_xml = converted_xml[c_start:c_end]
        key = _writer_table_key_text(table_xml)
        edit = pending_edits[key].pop(0) if pending_edits.get(key) else None
        paired = None
        for look in range(0, 3):
            if src_index + look >= len(source_tables):
                break
            s_start, s_end = source_tables[src_index + look]
            candidate = source_xml[s_start:s_end]
            if _writer_table_key_text(candidate) == key:
                paired = candidate
                src_index += look + 1
                break
        if paired is None:
            continue
        rebuilt = _writer_apply_source_table_properties(table_xml, paired, edit)
        if rebuilt != table_xml:
            out.append(converted_xml[pos:c_start])
            out.append(rebuilt)
            pos = c_end
    if not out:
        return converted_xml
    out.append(converted_xml[pos:])
    return "".join(out)


def _writer_apply_source_table_properties(table_xml: str, source_table_xml: str, edit: dict[str, object] | None = None) -> str:
    """Khôi phục tblPr/tblGrid/trPr/tcPr của nguồn, TRỪ phần người dùng đã sửa (edit) và lưới cột khi số ô đã đổi."""
    edit = edit or {}
    if edit.get("all"):
        return table_xml  # cấu trúc đổi hoặc có ô gộp dọc: chỉ số ô không còn khớp, giữ nguyên bản chuyển đổi
    edited_table = bool(edit.get("table"))
    edited_rows = edit.get("rows") or set()
    edited_cells = edit.get("cells") or set()
    src_rows = _writer_table_rows(source_table_xml)
    dst_rows = _writer_table_rows(table_xml)
    if len(src_rows) != len(dst_rows):
        return table_xml
    structure_same = True
    # Hàng/ô: dựng lại từ cuối về đầu để offset không đổi
    rebuilt = table_xml
    row_pairs = list(zip(src_rows, dst_rows))
    for row_index in range(len(row_pairs) - 1, -1, -1):
        (s_s, s_e), (d_s, d_e) = row_pairs[row_index]
        src_row = source_table_xml[s_s:s_e]
        dst_row = rebuilt[d_s:d_e]
        src_cells = _writer_row_cells(src_row)
        dst_cells = _writer_row_cells(dst_row)
        if len(src_cells) != len(dst_cells):
            structure_same = False
            continue
        new_row = dst_row
        cell_pairs = list(zip(src_cells, dst_cells))
        for cell_index in range(len(cell_pairs) - 1, -1, -1):
            if (row_index, cell_index) in edited_cells:
                continue  # người dùng đã sửa ô này (tô nền, căn dọc, viền, độ rộng...): giữ bản vừa chuyển đổi
            (cs_s, cs_e), (cd_s, cd_e) = cell_pairs[cell_index]
            src_cell = src_row[cs_s:cs_e]
            dst_cell = new_row[cd_s:cd_e]
            src_tcpr = _writer_source_leading_property(src_cell, r"<w:tc\b[^>]*>", "tcPr")
            new_cell = _writer_replace_leading_props(dst_cell, r"<w:tc\b[^>]*>", "tcPr", src_tcpr)
            new_row = new_row[:cd_s] + new_cell + new_row[cd_e:]
        if row_index not in edited_rows:
            src_trpr = _writer_source_leading_property(src_row, r"<w:tr\b[^>]*>", "trPr")
            new_row = _writer_replace_leading_props(new_row, r"<w:tr\b[^>]*>", "trPr", src_trpr)
        rebuilt = rebuilt[:d_s] + new_row + rebuilt[d_e:]
    # tblPr rồi tblGrid (thay ở đầu bảng, sau khi hàng đã xong)
    if not edited_table:
        src_tblpr = _writer_source_leading_property(source_table_xml, r"<w:tbl\b[^>]*>", "tblPr")
        if src_tblpr:
            rebuilt = _writer_replace_leading_props(rebuilt, r"<w:tbl\b[^>]*>", "tblPr", src_tblpr)
    # Lưới cột nguồn chỉ còn đúng khi số ô mỗi hàng không đổi và bảng không bị đổi độ rộng cột (giao diện đặt cờ table)
    if structure_same and not edited_table:
        src_grid = _writer_source_leading_property(source_table_xml, r"<w:tbl\b[^>]*>", "tblGrid")
        if src_grid:
            rebuilt = _writer_replace_leading_props(rebuilt, r"<w:tbl\b[^>]*>", "tblGrid", src_grid)
    return rebuilt


def _restore_writer_page_breaks(converted_xml: str, source_xml: str) -> str:
    """Restore manual page breaks from source DOCX to converted DOCX by order matching.

    W27a: When saving a document opened from DOCX, restore manual page breaks
    by matching paragraphs and tables by ORDER (not by text) between the source
    DOCX and the LibreOffice-converted DOCX.

    For tables: Word doesn't support pageBreakBefore on tables, so we add it to
    the first paragraph of the first cell, or insert an empty paragraph with
    w:br type=page before the table.
    """
    source_elements = _writer_body_flow_elements(source_xml)
    converted_elements = _writer_body_flow_elements(converted_xml)

    if not source_elements or not converted_elements:
        return converted_xml

    # Match by index (order)
    result_xml = converted_xml
    replacements = []  # list of (start, end, new_xml)

    # Claude: LibreOffice đổi số đoạn (d09 406 → 344, d13 328 → 335) nên chỉ số lệch sau chỗ đổi; chỉ chấp nhận cặp
    # khi CHỮ đầu (24 ký tự chuẩn hoá) của nguồn và bản chuyển đổi trùng nhau (đoạn rỗng ↔ đoạn rỗng), nếu không bỏ qua.
    def _flow_text(elem: dict) -> str:
        xml_part = elem['xml']
        if elem['type'] == 'table':
            first = elem.get('first_cell_first_para')
            xml_part = first['xml'] if first else ""
        text = "".join(re.findall(r"<w:t\b[^>]*>([^<]*)</w:t>", xml_part))
        return re.sub(r"[^0-9a-zà-ỹ]+", "", html.unescape(text).lower())[:24]

    for i, (src_elem, conv_elem) in enumerate(zip(source_elements, converted_elements)):
        if src_elem['type'] != conv_elem['type'] or _flow_text(src_elem) != _flow_text(conv_elem):
            continue
        # W40b: chỉ ngắt trang THỦ CÔNG (br page / pageBreakBefore); sectPr không phải ngắt trang của chính đoạn đó
        # (d03/d23: đoạn mang sectPr nextPage/continuous bị gắn pageBreakBefore → 1 trang thành 2). Section đã được
        # W40 trả lại đúng thứ tự/kiểu nên Word tự xử lý ranh giới section.
        manual_pb = re.compile(r'<w:br\b[^>]*\bw:type=["\']page["\']|<w:pageBreakBefore\b', re.IGNORECASE)

        def _elem_pb(elem: dict) -> bool:
            if elem['type'] == 'table':
                # bảng: KHÔNG xử lý ở cấp bảng — đoạn đầu ô đầu đã là một phần tử 'paragraph' trong danh sách (cùng
                # vùng offset; xử lý hai lần → thay thế chồng nhau → XML hỏng, đo d15)
                return False
            return bool(manual_pb.search(elem['xml']))
        src_has_pb = _elem_pb(src_elem)
        conv_has_pb = _elem_pb(conv_elem)

        if src_has_pb:
            # Source had a page break - ensure converted has it
            if conv_elem['type'] == 'paragraph':
                # Add pageBreakBefore to paragraph
                new_para_xml = _add_page_break_before_to_paragraph(conv_elem['xml'])
                if new_para_xml != conv_elem['xml']:
                    replacements.append((conv_elem['start'], conv_elem['end'], new_para_xml))
            elif conv_elem['type'] == 'table':
                # For table: add to first paragraph of first cell
                first_para = conv_elem.get('first_cell_first_para')
                if first_para:
                    new_para_xml = _add_page_break_before_to_paragraph(first_para['xml'])
                    if new_para_xml != first_para['xml']:
                        replacements.append((first_para['start'], first_para['end'], new_para_xml))
                else:
                    # No paragraph in first cell - insert empty paragraph before table
                    # We'll handle this after collecting all replacements
                    pass
        elif conv_has_pb and not src_has_pb:
            # Converted has page break but source didn't - remove it (LibreOffice added incorrectly)
            if conv_elem['type'] == 'paragraph':
                new_para_xml = _remove_page_break_before_from_paragraph(conv_elem['xml'])
                if new_para_xml != conv_elem['xml']:
                    replacements.append((conv_elem['start'], conv_elem['end'], new_para_xml))
            elif conv_elem['type'] == 'table':
                first_para = conv_elem.get('first_cell_first_para')
                if first_para:
                    new_para_xml = _remove_page_break_before_from_paragraph(first_para['xml'])
                    if new_para_xml != first_para['xml']:
                        replacements.append((first_para['start'], first_para['end'], new_para_xml))

    # Apply replacements in reverse order to maintain correct offsets
    for start, end, new_xml in sorted(replacements, key=lambda x: x[0], reverse=True):
        result_xml = result_xml[:start] + new_xml + result_xml[end:]

    return result_xml


def _writer_outer_anchor_blocks(xml: str) -> list[str]:
    """Extract complete outer wp:anchor elements, including nested WPG anchors."""
    ranges = _xml_element_ranges(xml, "wp:anchor")
    outer = [
        (start, end) for start, end in ranges
        if not any(other_start <= start and end <= other_end
                   and (other_start, other_end) != (start, end)
                   for other_start, other_end in ranges)
    ]
    return [xml[start:end] for start, end in outer]


def _writer_outer_inline_blocks(xml: str) -> list[str]:
    """Extract complete outer wp:inline elements (d19 group is inline, not anchored)."""
    ranges = _xml_element_ranges(xml, "wp:inline")
    outer = [
        (start, end) for start, end in ranges
        if not any(
            other_start <= start and end <= other_end and (other_start, other_end) != (start, end)
            for other_start, other_end in ranges
        )
    ]
    return [xml[start:end] for start, end in outer]


def _writer_paragraph_drawings(paragraph: str) -> list[str]:
    """Outer wp:anchor and wp:inline blocks of one paragraph, in document order."""
    located: list[tuple[int, int]] = []
    for tag in ("wp:anchor", "wp:inline"):
        located.extend(_xml_element_ranges(paragraph, tag))
    located.sort()
    outer = [
        (start, end) for start, end in located
        if not any(
            other_start <= start and end <= other_end and (other_start, other_end) != (start, end)
            for other_start, other_end in located
        )
    ]
    return [paragraph[start:end] for start, end in outer]


def _writer_flow_text(paragraph: str) -> str:
    result = paragraph
    result = re.sub(
        r"<mc:AlternateContent\b[^>]*>[\s\S]*?</mc:AlternateContent\s*>",
        lambda match: "" if "<wp:anchor" in match.group(0) else match.group(0),
        result, flags=re.IGNORECASE,
    )
    for anchor in _writer_outer_anchor_blocks(paragraph):
        result = result.replace(anchor, "", 1)
    return _paragraph_plain_text(result)


def _relocate_writer_background_anchors(converted_xml: str, original_xml: str) -> str:
    """Legacy conservative relocation for long ordinary documents."""
    source_paragraphs = _document_paragraph_ranges(original_xml)
    destinations: list[tuple[str, str]] = []
    for anchor_match in _WRITER_ANCHOR_RE.finditer(original_xml):
        anchor = anchor_match.group(0)
        name = _writer_anchor_name(anchor)
        if (not name or not _writer_anchor_passthrough_kind(anchor)
                or not re.search(r'\bbehindDoc=["\'](?:1|true)["\']', anchor, re.IGNORECASE)
                or not re.search(r"<wp:wrapNone\b", anchor, re.IGNORECASE)):
            continue
        containing = [(end - start, i) for i, (start, end) in enumerate(source_paragraphs)
                      if start <= anchor_match.start() < end]
        if not containing:
            continue
        parent_index = min(containing)[1]
        fingerprint = ""
        for distance in range(1, len(source_paragraphs)):
            for candidate_index in (parent_index + distance, parent_index - distance):
                if 0 <= candidate_index < len(source_paragraphs):
                    start, end = source_paragraphs[candidate_index]
                    candidate = _paragraph_match_key(original_xml[start:end])
                    if len(candidate) >= 12:
                        fingerprint = candidate[:40]
                        break
            if fingerprint:
                break
        if fingerprint:
            destinations.append((name, fingerprint))
    result = converted_xml
    for name, fingerprint in destinations:
        anchor_match = next((match for match in _WRITER_ANCHOR_RE.finditer(result)
                             if _writer_anchor_name(match.group(0)) == name), None)
        if not anchor_match:
            continue
        targets = [(end - start, start, end) for start, end in _document_paragraph_ranges(result)
                   if fingerprint in _paragraph_match_key(result[start:end])]
        target = (min(targets)[1], min(targets)[2]) if targets else None
        if not target or target[0] <= anchor_match.start() < target[1]:
            continue
        anchor_xml = anchor_match.group(0)
        result = result[:anchor_match.start()] + result[anchor_match.end():]
        result = re.sub(r"<w:drawing\b[^>]*>\s*</w:drawing\s*>", "", result, count=1)
        result = re.sub(r"<w:r\b[^>]*>\s*</w:r\s*>", "", result, count=1)
        targets = [(end - start, start, end) for start, end in _document_paragraph_ranges(result)
                   if fingerprint in _paragraph_match_key(result[start:end])]
        if targets:
            start, end = min(targets)[1:]
            close = result.rfind("</w:p", start, end)
            if close >= 0:
                result = result[:close] + f"<w:r><w:drawing>{anchor_xml}</w:drawing></w:r>" + result[close:]
    return result


def _relocate_passthrough_anchors(
    converted_xml: str, original_xml: str, pristine_document: bool = False,
) -> str:
    """Restore untouched anchors to their source body-paragraph slots."""
    source_ranges = _writer_body_paragraph_ranges(original_xml)
    relocate_page_breaks = pristine_document or len(source_ranges) <= 25
    has_untouched_markers = "vno-untouched-" in converted_xml
    if not pristine_document and not has_untouched_markers:
        return converted_xml
    if pristine_document and len(source_ranges) > 25:
        return _relocate_writer_background_anchors(converted_xml, original_xml)
    converted_ranges = _writer_body_paragraph_ranges(converted_xml)
    source = [original_xml[start:end] for start, end in source_ranges]
    converted = [converted_xml[start:end] for start, end in converted_ranges]
    pairs = _writer_text_lcs_pairs(
        [re.sub(r"<w:t\b[^>]*>[\s\S]*?</w:t\s*>", "", p, flags=re.IGNORECASE)
         + f"<w:t>{_writer_flow_text(p)}</w:t>" for p in source],
        [re.sub(r"<w:t\b[^>]*>[\s\S]*?</w:t\s*>", "", p, flags=re.IGNORECASE)
         + f"<w:t>{_writer_flow_text(p)}</w:t>" for p in converted],
    )
    # A Word group keeps a whole page's text nested inside its anchor, while
    # LibreOffice expands that text into several ordinary body paragraphs.
    # Use those exact child texts as additional monotonic LCS boundaries.
    target_flow_texts = [_writer_flow_text(paragraph) for paragraph in converted]
    source_full_texts = [_paragraph_plain_text(paragraph) for paragraph in source]
    used_targets = {target for _source, target in pairs}
    last_target = -1
    expanded_pairs: list[tuple[int, int]] = []
    for source_index, paragraph in enumerate(source):
        exact_target = dict(pairs).get(source_index)
        if exact_target is not None:
            expanded_pairs.append((source_index, exact_target))
            last_target = max(last_target, exact_target)
            continue
        full_text = source_full_texts[source_index]
        candidates = [
            index for index, text in enumerate(target_flow_texts)
            if index > last_target and index not in used_targets
            and len(text) >= 8 and text in full_text
            and sum(text in source_text for source_text in source_full_texts) == 1
        ]
        if candidates:
            target = min(candidates)
            expanded_pairs.append((source_index, target))
            used_targets.add(target)
            last_target = target
        elif source_index == 0 and converted:
            expanded_pairs.append((source_index, 0))
            used_targets.add(0)
            last_target = 0
    pairs = sorted(expanded_pairs)
    source_to_target = dict(pairs)

    # An edited document no longer carries the document-wide pristine marker.
    # Preserve ownership at paragraph granularity instead.  Non-empty carriers
    # must retain their own untouched bookmark.  Empty drawing/page-break
    # carriers cannot join the text LCS, so pair them only inside two stable
    # neighbouring text boundaries.  If the user deleted such a carrier there
    # is no empty marked paragraph in that bounded interval and it is not
    # recreated.
    marked_targets = {
        index for index, paragraph in enumerate(converted)
        if re.search(
            r'<w:bookmarkStart\b[^>]*\bw:name=["\']vno-untouched-\d+["\'][^>]*/?>',
            paragraph, re.IGNORECASE,
        )
    }
    empty_source_to_target: dict[int, int] = {}
    retained_empty_sources: set[int] = set()
    bounded_pairs = [(-1, -1), *pairs, (len(source), len(converted))]
    for (source_start, target_start), (source_end, target_end) in zip(
        bounded_pairs, bounded_pairs[1:]
    ):
        source_empty = [
            index for index in range(source_start + 1, source_end)
            if not _writer_flow_text(source[index])
            and (_writer_outer_anchor_blocks(source[index]) or _writer_has_page_break(source[index]))
        ]
        target_empty = [
            index for index in range(target_start + 1, target_end)
            if index in marked_targets and not _writer_flow_text(converted[index])
        ]
        if source_empty and len(source_empty) == len(target_empty):
            empty_source_to_target.update(zip(source_empty, target_empty))
            retained_empty_sources.update(source_empty)
        # LibreOffice can move several untouched bookmarks to the first body
        # paragraph. If the full paragraph gap still has the same length on both
        # sides, preserve each empty drawing carrier's ordinal slot even when the
        # bookmark counts differ (d09: the next text boundary remains p114).
        if source_end - source_start == target_end - target_start:
            for source_index in range(source_start + 1, source_end):
                if (source_index in empty_source_to_target
                        or _writer_flow_text(source[source_index])
                        or not (_writer_outer_anchor_blocks(source[source_index])
                                or _writer_has_page_break(source[source_index]))):
                    continue
                target_index = target_start + (source_index - source_start)
                if (target_start < target_index < target_end
                        and not _writer_flow_text(converted[target_index])):
                    empty_source_to_target[source_index] = target_index
                    retained_empty_sources.add(source_index)
        elif source_empty and target_end - target_start > 1:
            # A carrier can be represented after HTML import by expanded
            # drawing text rather than an empty paragraph.  The non-empty LCS
            # interval proves that the slot still exists; use any surviving
            # empty markers first and reinsert the remaining source carriers
            # at the bounded slot.  An actually deleted carrier has adjacent
            # LCS neighbours and does not enter this branch.
            empty_source_to_target.update(zip(source_empty, target_empty))
            retained_empty_sources.update(source_empty)

    # Untouched text-box Frames are replaced by their source DrawingML (with the source
    # docPr name) before this pass, but LibreOffice emitted those Frames at the start of
    # the body. Relocate them too, by source name; an edited text box keeps its place.
    source_textbox_names = {
        name
        for name in (_writer_anchor_name(anchor) for anchor in _writer_outer_anchor_blocks(original_xml)
                     if _writer_anchor_has_textbox(anchor))
        if name
    }
    output_anchors: dict[str, str] = {}
    for anchor in _writer_outer_anchor_blocks(converted_xml):
        name = _writer_anchor_name(anchor)
        relocatable = _writer_anchor_passthrough_kind(anchor) or (
            name in source_textbox_names and _writer_anchor_has_textbox(anchor)
        )
        if (name and relocatable
                and (pristine_document or _writer_anchor_is_untouched(anchor))):
            output_anchors[name] = anchor

    tasks: list[tuple[int, int | None, str, list[str]]] = []
    for source_index, paragraph in enumerate(source):
        names = [
            name
            for name in (_writer_anchor_name(anchor) for anchor in _writer_outer_anchor_blocks(paragraph))
            if name and name in output_anchors
        ]
        has_break = relocate_page_breaks and _writer_has_page_break(paragraph)
        if not names and not has_break:
            continue
        matched_target = source_to_target.get(source_index)
        if matched_target is None:
            matched_target = empty_source_to_target.get(source_index)
        if matched_target is None and _writer_flow_text(paragraph):
            continue
        # An exact text match is itself proof that the source paragraph survived,
        # even when LibreOffice dropped its untouched bookmark (d06 "Hệ thống có sẵn"
        # carrying Group 368 — without this the group stayed in body paragraph 0).
        exact_text_match = source_to_target.get(source_index) is not None
        if (not pristine_document
                and not exact_text_match
                and matched_target not in marked_targets
                and source_index not in retained_empty_sources):
            continue
        tasks.append((source_index, matched_target, paragraph, names))
    if not tasks:
        return converted_xml

    def rebuilt_carrier(source_paragraph: str, names: list[str]) -> str:
        opening = re.match(r"<w:p\b[^>]*>", source_paragraph, re.IGNORECASE)
        opening_xml = opening.group(0) if opening else "<w:p>"
        opening_xml = re.sub(
            r'\s+w14:(?:paraId|textId)=["\'][^"\']*["\']', "", opening_xml,
            flags=re.IGNORECASE,
        )
        after_open = source_paragraph[opening.end():] if opening else source_paragraph
        direct_ppr = re.match(
            r"\s*(<w:pPr\b[^>]*(?:/>|>[\s\S]*?</w:pPr\s*>))",
            after_open, re.IGNORECASE,
        )
        ppr = direct_ppr.group(1) if direct_ppr else ""
        # The rebuilt carrier already emits the source page boundary. Even a
        # continuous paragraph sectPr makes Word repaginate long documents;
        # the dedicated final-section pass owns page setup/header/footer.
        ppr = re.sub(
            r"<w:sectPr\b[^>]*(?:/>|>[\s\S]*?</w:sectPr\s*>)",
            "", ppr, flags=re.IGNORECASE,
        )
        if _writer_has_page_break(source_paragraph):
            ppr = ""
        page_break = (
            '<w:r><w:br w:type="page"/></w:r>'
            if relocate_page_breaks and _writer_has_page_break(source_paragraph) else ""
        )
        drawings = "".join(
            f"<w:r><w:drawing>{output_anchors[name]}</w:drawing></w:r>"
            for name in names
        )
        return f"{opening_xml}{ppr}{page_break}{drawings}</w:p>"

    source_safe_anchors = [
        anchor for paragraph in source for anchor in _writer_outer_anchor_blocks(paragraph)
        if _writer_anchor_passthrough_kind(anchor)
    ]
    mapped_names = {name for _i, _target, _paragraph, names in tasks for name in names}
    source_body = re.search(r"<w:body\b[^>]*>([\s\S]*?)</w:body\s*>", original_xml, re.IGNORECASE)
    # Drawing-only catalogues are entirely represented by their source WPG
    # anchors. Rebuilding their short top-level body avoids retaining the 100+
    # flow paragraphs LibreOffice expanded from the same grouped text.
    if (pristine_document
            and len(source_safe_anchors) >= 5
            and len(mapped_names) == len(source_safe_anchors)
            and source_body and "<w:tbl" not in source_body.group(1)):
        restored: list[str] = []
        for paragraph in source:
            paragraph_anchors = _writer_outer_anchor_blocks(paragraph)
            names = [
                name for name in (_writer_anchor_name(anchor) for anchor in paragraph_anchors)
                if name and name in output_anchors
            ]
            restored.append(rebuilt_carrier(paragraph, names) if paragraph_anchors else paragraph)
        converted_body = re.search(r"(<w:body\b[^>]*>)([\s\S]*?)(</w:body\s*>)", converted_xml, re.IGNORECASE)
        if converted_body:
            sect_pr = _writer_direct_property(converted_body.group(2), "sectPr")
            return (converted_xml[:converted_body.start()] + converted_body.group(1)
                    + "".join(restored) + sect_pr + converted_body.group(3)
                    + converted_xml[converted_body.end():])

    stripped = converted_xml
    for _source_index, _matched_target, _paragraph, names in tasks:
        for name in names:
            stripped = stripped.replace(output_anchors[name], "", 1)
    stripped = re.sub(
        r"<w:drawing\b[^>]*>\s*</w:drawing\s*>", "", stripped,
        flags=re.IGNORECASE,
    )
    stripped = re.sub(
        r"<w:r\b[^>]*>\s*</w:r\s*>",
        "", stripped, flags=re.IGNORECASE,
    )

    ranges = _writer_body_paragraph_ranges(stripped)
    paragraphs = [stripped[start:end] for start, end in ranges]
    insertions: dict[int, list[str]] = {}
    replacements: dict[int, str] = {}
    for source_index, matched_target, source_paragraph, names in tasks:
        moved = [output_anchors[name] for name in names]
        carrier = rebuilt_carrier(source_paragraph, names)
        if matched_target is not None:
            if _writer_flow_text(source_paragraph):
                target = replacements.get(matched_target, paragraphs[matched_target])
                close = target.rfind("</w:p")
                if close >= 0:
                    payload = "".join(
                        f"<w:r><w:drawing>{anchor}</w:drawing></w:r>" for anchor in moved
                    )
                    if (relocate_page_breaks and _writer_has_page_break(source_paragraph)
                            and not _writer_has_page_break(target)):
                        payload = '<w:r><w:br w:type="page"/></w:r>' + payload
                    replacements[matched_target] = target[:close] + payload + target[close:]
            else:
                target = replacements.get(matched_target, paragraphs[matched_target])
                if (not relocate_page_breaks
                        and not _writer_flow_text(source_paragraph)
                        and not _writer_flow_text(target)
                        and not _writer_has_page_break(source_paragraph)
                        and not _writer_direct_property(source_paragraph, "sectPr")):
                    target_names = {
                        _writer_anchor_name(anchor)
                        for anchor in _writer_outer_anchor_blocks(target)
                    }
                    if not any(name and name not in names for name in target_names):
                        target = _writer_replace_direct_property(
                            target, "pPr", _writer_direct_property(source_paragraph, "pPr") or "",
                        )
                        close = target.rfind("</w:p")
                        payload = "".join(
                            f"<w:r><w:drawing>{anchor}</w:drawing></w:r>" for anchor in moved
                        )
                        if close >= 0:
                            replacements[matched_target] = target[:close] + payload + target[close:]
                        continue
                if not relocate_page_breaks:
                    close = target.rfind("</w:p")
                    payload = "".join(
                        f"<w:r><w:drawing>{anchor}</w:drawing></w:r>" for anchor in moved
                    )
                    if close >= 0:
                        replacements[matched_target] = target[:close] + payload + target[close:]
                    continue
                target_names = {
                    _writer_anchor_name(anchor)
                    for anchor in _writer_outer_anchor_blocks(target)
                }
                if any(name and name not in names for name in target_names):
                    edited_anchors = [
                        anchor for anchor in _writer_outer_anchor_blocks(target)
                        if _writer_anchor_has_edited_text(anchor)
                    ]
                    replacements[matched_target] = (
                        "<w:p>" + "".join(
                            f"<w:r><w:drawing>{anchor}</w:drawing></w:r>"
                            for anchor in edited_anchors
                        ) + "</w:p>"
                    )
                    insertions.setdefault(matched_target, []).append(carrier)
                else:
                    replacements[matched_target] = carrier
            continue
        next_targets = [target for src, target in pairs if src > source_index]
        slot = min(next_targets) if next_targets else len(paragraphs)
        insertions.setdefault(slot, []).append(carrier)

    result_parts: list[str] = []
    cursor = 0
    for index, (start, end) in enumerate(ranges):
        result_parts.append(stripped[cursor:start])
        result_parts.extend(insertions.get(index, []))
        result_parts.append(replacements.get(index, stripped[start:end]))
        cursor = end
    result_parts.extend(insertions.get(len(ranges), []))
    result_parts.append(stripped[cursor:])
    result = "".join(result_parts)
    # LibreOffice occasionally materializes a few HTML page-break-before
    # styles as standalone rich paragraphs while the source section carriers
    # above are also rebuilt. Keep exactly the source boundary count and
    # discard only surplus drawing-free breaks. Prefer LO artifacts without
    # section geometry so rebuilt source carriers retain their page setup.
    source_break_count = sum(_writer_has_page_break(paragraph) for paragraph in source)
    result_ranges = _writer_body_paragraph_ranges(result)
    result_break_count = sum(
        _writer_has_page_break(result[start:end]) for start, end in result_ranges
    )
    excess_breaks = max(0, result_break_count - source_break_count)
    if excess_breaks:
        orphan_breaks = []
        for start, end in result_ranges:
            paragraph = result[start:end]
            if (not _writer_flow_text(paragraph)
                    and _writer_has_page_break(paragraph)
                    and not _writer_outer_anchor_blocks(paragraph)):
                ppr = _writer_direct_property(paragraph, "pPr")
                richness = len(re.sub(r"</?w:pPr\b[^>]*>", "", ppr, flags=re.IGNORECASE))
                has_section = bool(re.search(r"<w:sectPr\b", ppr, re.IGNORECASE))
                orphan_breaks.append((has_section, -richness, start, end))
        removals = sorted(orphan_breaks)[:excess_breaks]
        for _has_section, _richness, start, end in sorted(
            removals, key=lambda item: item[2], reverse=True,
        ):
            result = result[:start] + result[end:]
    return result


def _remove_duplicate_writer_group_flow_paragraphs(
    converted_xml: str, original_xml: str, pristine_document: bool = False,
) -> str:
    """Remove LO-expanded body text already rendered by restored WPG groups."""
    group_texts = [
        _paragraph_plain_text(original_xml[start:end])
        for start, end in _xml_element_ranges(original_xml, "wpg:wgp")
    ]
    group_texts = [text for text in group_texts if text]
    if not group_texts:
        return converted_xml
    removals: list[tuple[int, int]] = []
    for start, end in _writer_body_paragraph_ranges(converted_xml):
        paragraph = converted_xml[start:end]
        text = _writer_flow_text(paragraph)
        if (text and (pristine_document or "vno-untouched-" in paragraph)
                and not _writer_outer_anchor_blocks(paragraph)
                and not _writer_outer_inline_blocks(paragraph)
                and not _writer_has_page_break(paragraph)
                and any(text in group_text for group_text in group_texts)):
            removals.append((start, end))
    result = converted_xml
    for start, end in reversed(removals):
        result = result[:start] + result[end:]
    return result


def _passthrough_writer_anchors(
    converted_xml: str, original_xml: str, source_docx: bytes,
    converted_rels_xml: str, next_rid: int, existing_entries: set[str],
    trust_order: bool = False, pristine_document: bool = False,
) -> tuple[str, str, int, dict[str, bytes], set[str], set[str]]:
    matches = _writer_passthrough_matches(converted_xml, original_xml, trust_order=trust_order)
    if matches and not pristine_document:
        converted_anchors = list(_WRITER_ANCHOR_RE.finditer(converted_xml))
        matches = {
            index: source_anchor for index, source_anchor in matches.items()
            if index < len(converted_anchors)
            and _writer_anchor_is_untouched(converted_anchors[index].group(0))
        }
    if not matches:
        return converted_xml, converted_rels_xml, next_rid, {}, set(), set()
    original_rels_bytes = read_zip_entry(source_docx, "word/_rels/document.xml.rels") or b""
    original_rels = _relationship_records(original_rels_bytes.decode("utf-8", errors="replace"))
    media: dict[str, bytes] = {}
    extensions: set[str] = set()
    occupied_docpr_ids = {int(value) for value in re.findall(r'<wp:docPr\b[^>]*\bid=["\'](\d+)', converted_xml, re.IGNORECASE)}
    next_docpr_id = max(occupied_docpr_ids, default=0) + 1
    anchor_index = 0
    replaced_rids: set[str] = set()

    def replace(match: re.Match) -> str:
        nonlocal anchor_index, next_rid, converted_rels_xml, next_docpr_id
        source_anchor = matches.get(anchor_index)
        anchor_index += 1
        if source_anchor is None:
            return match.group(0)
        replaced_rids.update(re.findall(
            r'\br:(?:embed|link|id)=["\']([^"\']+)', match.group(0), re.IGNORECASE
        ))
        copied = source_anchor
        for old_rid in dict.fromkeys(re.findall(r'\br:(?:embed|link|id)=["\']([^"\']+)', copied, re.IGNORECASE)):
            rel = original_rels.get(old_rid)
            if not rel:
                continue
            new_rid = f"rId{next_rid}"
            next_rid += 1
            target_for_rels = rel.get("Target", "")
            if rel.get("TargetMode") != "External":
                source_entry = "word/" + target_for_rels.lstrip("./")
                payload = read_zip_entry(source_docx, source_entry)
                if payload is None:
                    continue
                extension = source_entry.rsplit(".", 1)[-1].lower()
                destination = f"word/media/vno_passthrough_{next_rid}.{extension}"
                while destination in existing_entries or destination in media:
                    next_rid += 1
                    destination = f"word/media/vno_passthrough_{next_rid}.{extension}"
                target_for_rels = destination.removeprefix("word/")
                media[destination] = payload
                if extension in _DOCX_IMAGE_CONTENT_TYPES:
                    extensions.add(extension)
            relationship = (
                f'<Relationship Id="{new_rid}" Type="{rel.get("Type", _DOCX_IMAGE_REL_TYPE)}" '
                f'Target="{target_for_rels}"'
                f'{" TargetMode=\"External\"" if rel.get("TargetMode") == "External" else ""}/>'
            )
            close = "</Relationships>"
            close_index = converted_rels_xml.rfind(close)
            if close_index >= 0:
                converted_rels_xml = converted_rels_xml[:close_index] + relationship + converted_rels_xml[close_index:]
            copied = re.sub(rf'(\br:(?:embed|link|id)=)(["\']){re.escape(old_rid)}\2', rf'\1"{new_rid}"', copied)
        def unique_docpr(docpr: re.Match) -> str:
            nonlocal next_docpr_id
            value = int(docpr.group(3))
            if value not in occupied_docpr_ids:
                occupied_docpr_ids.add(value)
                return docpr.group(0)
            replacement = f'{docpr.group(1)}"{next_docpr_id}"'
            occupied_docpr_ids.add(next_docpr_id)
            next_docpr_id += 1
            return replacement
        return re.sub(r'(<wp:docPr\b[^>]*\bid=)(["\'])(\d+)\2', unique_docpr, copied)

    patched_xml = _WRITER_ANCHOR_RE.sub(replace, converted_xml)
    removable_entries: set[str] = set()
    for old_rid in replaced_rids:
        if re.search(rf'\br:(?:embed|link|id)=["\']{re.escape(old_rid)}["\']', patched_xml, re.IGNORECASE):
            continue
        records = _relationship_records(converted_rels_xml)
        old_rel = records.get(old_rid)
        converted_rels_xml = re.sub(
            rf'<Relationship\b(?=[^>]*\bId=["\']{re.escape(old_rid)}["\'])[^>]*/?>',
            "", converted_rels_xml, count=1, flags=re.IGNORECASE,
        )
        if not old_rel or old_rel.get("TargetMode") == "External":
            continue
        old_target = old_rel.get("Target", "")
        if not any(
            rel.get("Target") == old_target and rel.get("TargetMode") != "External"
            for rel in _relationship_records(converted_rels_xml).values()
        ):
            removable_entries.add("word/" + old_target.lstrip("./"))
    return patched_xml, converted_rels_xml, next_rid, media, extensions, removable_entries


def _restore_mid_document_sections(
    converted_xml: str,
    original_xml: str,
    orig_rels: dict[str, str],
    r_id_map: dict[str, str],
    next_rid: int,
) -> tuple[str, int]:
    """Restore mid-document w:sectPr from original DOCX into converted DOCX.

    LibreOffice HTML import converts section breaks (w:sectPr in w:pPr) to
    w:br type="page". This function finds those page breaks and replaces them
    with the original w:sectPr, matched by the preceding paragraph's text content.

    Also remaps header/footer rIds in each sectPr to new sequential rIds.

    Returns (updated_xml, updated_next_rid).
    """
    # Extract all mid-document sections from original
    original_sections = _extract_all_docx_sections(original_xml)
    if not original_sections:
        return converted_xml, next_rid

    # Build a map from preceding paragraph text -> section info
    # The section break in original is on a paragraph; the preceding paragraph
    # typically has the section identifier (number, title, etc.)
    preceding_text_to_sections: dict[str, list[dict]] = {}
    for sec in original_sections:
        # Use the preceding paragraph's text as the key
        if sec['preceding_text']:
            preceding_text_to_sections.setdefault(sec['preceding_text'], []).append(sec)

    # Find all paragraphs in converted XML that have w:br type="page"
    # These are the section boundaries LibreOffice created
    page_break_paragraphs = []

    # First, get all paragraphs with their positions
    all_paras = []
    for match in re.finditer(r"(<w:p\b[^>]*>)([\s\S]*?)(</w:p\s*>)", converted_xml, re.IGNORECASE):
        p_open, p_content, p_close = match.groups()
        full_paragraph = p_open + p_content + p_close
        paragraph_text = _paragraph_plain_text(full_paragraph)
        has_page_break = bool(re.search(r'<w:br\b[^>]*w:type=["\']page["\']', p_content, re.IGNORECASE))
        all_paras.append({
            'full_xml': full_paragraph,
            'p_open': p_open,
            'p_content': p_content,
            'p_close': p_close,
            'start': match.start(),
            'end': match.end(),
            'text': paragraph_text,
            'has_page_break': has_page_break,
        })

    # Find page break paragraphs and their preceding paragraph's text
    for i, para in enumerate(all_paras):
        if not para['has_page_break']:
            continue
        # Get preceding paragraph's text for matching
        prev_text = all_paras[i-1]['text'] if i > 0 else ""
        page_break_paragraphs.append({
            'para': para,
            'prev_text': prev_text,
            'index_in_all': i,
        })

    if not page_break_paragraphs:
        return converted_xml, next_rid

    # Match page break paragraphs to original sections by preceding paragraph text
    matched_sections: set[int] = set()
    replacements_list: list[tuple[int, int, str]] = []  # (start, end, new_paragraph_xml)

    for pb in page_break_paragraphs:
        matched_section = None
        match_type = ""

        # Try exact text match on preceding paragraph
        if pb['prev_text'] and pb['prev_text'] in preceding_text_to_sections:
            candidates = [s for s in preceding_text_to_sections[pb['prev_text']] if s['section_index'] not in matched_sections]
            if candidates:
                matched_section = candidates[0]
                match_type = "prev_text"

        # Fallback: ordinal matching (nth page break -> nth section)
        if matched_section is None:
            # Count how many page breaks we've processed so far
            processed = len([r for r in replacements_list if r[0] < pb['para']['start']])
            if processed < len(original_sections):
                # Find the section with this index
                for sec in original_sections:
                    if sec['section_index'] == processed and sec['section_index'] not in matched_sections:
                        matched_section = sec
                        match_type = "ordinal"
                        break

        if matched_section is None:
            continue

        matched_sections.add(matched_section['section_index'])

        # Get the original sectPr and remap its header/footer rIds
        sect_pr_xml = matched_section['sect_pr_xml']
        if r_id_map:
            sect_pr_xml = _remap_header_footer_rids(sect_pr_xml, r_id_map)

        # Remove the w:br type="page" from the paragraph content
        new_p_content = re.sub(
            r'<w:br\b[^>]*w:type=["\']page["\'][^>]*/?>',
            '',
            pb['para']['p_content'],
            flags=re.IGNORECASE,
        )
        # Also remove w:r that only contains the page break
        new_p_content = re.sub(
            r'<w:r\b[^>]*>\s*<w:br\b[^>]*w:type=["\']page["\'][^>]*/?>\s*</w:r\s*>',
            '',
            new_p_content,
            flags=re.IGNORECASE,
        )

        # Word semantics: the paragraph that carries w:sectPr is the LAST
        # paragraph of the section, and in MYTIME it is an empty paragraph that
        # LibreOffice dropped. The page-break paragraph is the FIRST paragraph of
        # the next section, so the sectPr must not be injected into it (that
        # moved every section boundary by one paragraph: 51 pages instead of
        # 44). Re-create the carrier: an empty paragraph before the page-break
        # paragraph, or — when the original carrier had text and the converted
        # predecessor holds that text — the predecessor's own pPr.
        # Measured (MYTIME): LibreOffice puts the page break at the END of the
        # last paragraph of the previous section, so that paragraph is the right
        # carrier for w:sectPr (an inserted empty carrier gave 86 pages).
        ppr_match = re.search(r'(<w:pPr\b[^>]*>[\s\S]*?</w:pPr\s*>)', new_p_content, re.IGNORECASE)
        if ppr_match:
            new_ppr = re.sub(r'(</w:pPr\s*>)', sect_pr_xml + r'\1', ppr_match.group(1), count=1, flags=re.IGNORECASE)
            new_p_content = new_p_content[:ppr_match.start()] + new_ppr + new_p_content[ppr_match.end():]
        else:
            new_p_content = f"<w:pPr>{sect_pr_xml}</w:pPr>" + new_p_content
        new_paragraph = pb['para']['p_open'] + new_p_content + pb['para']['p_close']
        replacements_list.append((pb['para']['start'], pb['para']['end'], new_paragraph))

    # Apply replacements in reverse order to maintain correct offsets
    result_xml = converted_xml
    for start, end, new_para in sorted(replacements_list, key=lambda x: x[0], reverse=True):
        result_xml = result_xml[:start] + new_para + result_xml[end:]

    return result_xml, next_rid


_WRITER_EMU_PER_PX = 9525


def _writer_shift_named_emu(xml: str, attr: str, delta: int) -> str:
    if not delta:
        return xml
    return re.sub(
        rf'\b{attr}=["\'](-?\d+)["\']',
        lambda match: f'{attr}="{int(match.group(1)) + delta}"',
        xml, count=1, flags=re.IGNORECASE,
    )


def _writer_shift_pos_offset(anchor: str, axis_tag: str, delta: int) -> str:
    if not delta:
        return anchor
    match = re.search(
        rf"(<{axis_tag}\b[^>]*>[\s\S]*?<wp:posOffset>)(-?\d+)(</wp:posOffset\s*>)",
        anchor, re.IGNORECASE,
    )
    if not match:
        return anchor
    return anchor[:match.start(2)] + str(int(match.group(2)) + delta) + anchor[match.end(2):]


def _writer_shift_a_off(shape_xml: str, delta_x: int, delta_y: int) -> str:
    if not delta_x and not delta_y:
        return shape_xml

    def offset(match: re.Match) -> str:
        attrs = match.group(1)
        attrs = _writer_shift_named_emu(attrs, "x", delta_x)
        attrs = _writer_shift_named_emu(attrs, "y", delta_y)
        return f"<a:off{attrs}{match.group(2)}"

    updated, count = re.subn(
        r"<a:off\b([^>/]*)(/?>)", offset, shape_xml, count=1, flags=re.IGNORECASE,
    )
    return updated if count else shape_xml


def _writer_shift_extent(xml: str, delta_cx: int, delta_cy: int, tag: str) -> str:
    if not delta_cx and not delta_cy:
        return xml

    def extent(match: re.Match) -> str:
        attrs = match.group(1)
        attrs = _writer_shift_named_emu(attrs, "cx", delta_cx)
        attrs = _writer_shift_named_emu(attrs, "cy", delta_cy)
        return f"<{tag}{attrs}{match.group(2)}"

    updated, count = re.subn(
        rf"<{tag}\b([^>/]*)(/?>)", extent, xml, count=1, flags=re.IGNORECASE,
    )
    return updated if count else xml


def _decode_writer_shape_mutation(marker: str) -> dict | None:
    try:
        item = json.loads(bytes.fromhex(marker).decode("utf-8"))
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError):
        return None
    if isinstance(item, dict) and item.get("type") in {"edit", "delete"}:
        return item
    return None


def _writer_mutation_payloads(text: str) -> list[dict]:
    mutations: list[dict] = []
    for marker in re.findall(r"VNO_SHAPE_MUTATION_([0-9a-fA-F]+)", text or ""):
        item = _decode_writer_shape_mutation(marker)
        if item:
            mutations.append(item)
    return mutations


def _writer_named_wsp(anchor: str, shape_name: str) -> re.Match | None:
    candidates = list(re.finditer(r"<wps:wsp\b[\s\S]*?</wps:wsp\s*>", anchor, re.IGNORECASE))
    named = next((item for item in candidates
                  if shape_name and re.search(
                      rf'<wps:cNvPr\b[^>]*\bname=["\']{re.escape(shape_name)}["\']',
                      item.group(0), re.IGNORECASE,
                  )), None)
    if named is not None:
        return named
    return candidates[0] if len(candidates) == 1 else None


def _apply_writer_imported_shape_mutation(anchor: str, mutation: dict) -> str | None:
    """Apply move/resize/delete to the named native wps:wsp, retaining DrawingML markup."""
    shape_name = str(mutation.get("shapeName") or "")
    target = _writer_named_wsp(anchor, shape_name)
    if target is None:
        return anchor
    if mutation.get("type") == "delete":
        updated = anchor[:target.start()] + anchor[target.end():]
        if not re.search(r"<wps:wsp\b|<pic:pic\b|<wpg:wgp\b", updated, re.IGNORECASE):
            return None
        return updated
    if mutation.get("type") != "edit":
        return anchor
    scale_x = float(mutation.get("scaleX") or 1) or 1
    scale_y = float(mutation.get("scaleY") or 1) or 1
    delta_x = round(float(mutation.get("dx") or 0) * _WRITER_EMU_PER_PX / scale_x)
    delta_y = round(float(mutation.get("dy") or 0) * _WRITER_EMU_PER_PX / scale_y)
    delta_cx = round(float(mutation.get("dw") or 0) * _WRITER_EMU_PER_PX / scale_x)
    delta_cy = round(float(mutation.get("dh") or 0) * _WRITER_EMU_PER_PX / scale_y)
    in_group = bool(re.search(r"<wpg:wgp\b", anchor, re.IGNORECASE))
    has_pos_offset = bool(re.search(r"<wp:posOffset>", anchor, re.IGNORECASE))
    if in_group or not has_pos_offset:
        shape_xml = _writer_shift_a_off(target.group(0), delta_x, delta_y)
        shape_xml = _writer_shift_extent(shape_xml, delta_cx, delta_cy, "a:ext")
        return anchor[:target.start()] + shape_xml + anchor[target.end():]
    abs_dx = round(float(mutation.get("dx") or 0) * _WRITER_EMU_PER_PX)
    abs_dy = round(float(mutation.get("dy") or 0) * _WRITER_EMU_PER_PX)
    abs_cx = round(float(mutation.get("dw") or 0) * _WRITER_EMU_PER_PX)
    abs_cy = round(float(mutation.get("dh") or 0) * _WRITER_EMU_PER_PX)
    updated = _writer_shift_pos_offset(anchor, "wp:positionH", abs_dx)
    updated = _writer_shift_pos_offset(updated, "wp:positionV", abs_dy)
    updated = _writer_shift_extent(updated, abs_cx, abs_cy, "wp:extent")
    wsp = _writer_named_wsp(updated, shape_name)
    if wsp is not None and (abs_cx or abs_cy):
        shape_xml = _writer_shift_extent(wsp.group(0), abs_cx, abs_cy, "a:ext")
        updated = updated[:wsp.start()] + shape_xml + updated[wsp.end():]
    return updated


def _drop_empty_writer_drawings(xml: str) -> str:
    """Remove drawing wrappers left empty after deleting a passthrough shape."""
    xml = re.sub(r"<w:drawing\b[^>]*>\s*</w:drawing\s*>", "", xml, flags=re.IGNORECASE)
    xml = re.sub(r"<mc:Choice\b[^>]*>\s*</mc:Choice\s*>", "", xml, flags=re.IGNORECASE)
    xml = re.sub(
        r"<mc:AlternateContent\b[^>]*>\s*(?:<mc:Fallback\b[^>]*>[\s\S]*?</mc:Fallback\s*>\s*)?</mc:AlternateContent\s*>",
        "", xml, flags=re.IGNORECASE,
    )
    xml = re.sub(r"<w:r\b[^>]*>\s*</w:r\s*>", "", xml, flags=re.IGNORECASE)
    return xml


def _strip_writer_shape_mutation_markers(xml: str) -> tuple[str, list[dict]]:
    """Remove internal HTML-bridge markers and return source shape mutations."""
    mutations: list[dict] = []
    ranges = _writer_body_paragraph_ranges(xml)
    if not ranges:
        ranges = _xml_element_ranges(xml, "w:p")
    removals: list[tuple[int, int]] = []
    for start, end in ranges:
        paragraph = xml[start:end]
        raw_text = _unescape_xml("".join(
            re.findall(r"<w:t\b[^>]*>([\s\S]*?)</w:t\s*>", paragraph, re.IGNORECASE)
        ))
        found = _writer_mutation_payloads(raw_text) or _writer_mutation_payloads(paragraph)
        if not found:
            continue
        mutations.extend(found)
        removals.append((start, end))
    result = xml
    for start, end in reversed(removals):
        result = result[:start] + result[end:]
    return result, mutations


def _strip_writer_pristine_marker_carrier(xml: str) -> str:
    """Drop the empty body paragraph LibreOffice creates for the pristine marker.

    The Writer bridge prefixes an untouched document with
    ``<a name="vno-pristine-document"></a>``. LibreOffice's HTML import wraps
    that lone anchor in a new, empty first body paragraph. The section pass then
    gives that phantom paragraph a source sectPr, so an untouched d03.docx
    (1 page in Word) saved/printed as 3 pages in Word and 2 in LibreOffice.
    Only a leading paragraph holding nothing but that marker is removed; the
    bookmark itself stays at body level so the pristine signal still reaches
    the later passes (and ``_remove_writer_untouched_bookmarks`` deletes it).
    """
    body = re.search(r"<w:body\b[^>]*>", xml, re.IGNORECASE)
    if not body or "vno-pristine-document" not in xml:
        return xml
    ranges = _writer_body_paragraph_ranges(xml)
    if not ranges:
        return xml
    start, end = ranges[0]
    if xml[body.end():start].strip():
        return xml
    paragraph = xml[start:end]
    bookmarks = re.findall(r"<w:bookmark(?:Start|End)\b[^>]*/>", paragraph, re.IGNORECASE)
    names = re.findall(r'<w:bookmarkStart\b[^>]*\bw:name=["\']([^"\']*)["\']', paragraph, re.IGNORECASE)
    if names != ["vno-pristine-document"]:
        return xml
    # When the document opens with a table, LibreOffice also copies that
    # table's page-break-before into the phantom paragraph as a literal page
    # break (the table keeps its own pageBreakBefore). Any other break or
    # content means the paragraph is real and is kept.
    without_page_breaks = re.sub(
        r'<w:br\b(?=[^>]*\bw:type=["\']page["\'])[^>]*/>', "", paragraph, flags=re.IGNORECASE,
    )
    if _paragraph_plain_text(paragraph) or re.search(
        r"<w:(?:drawing|pict|object|sectPr|br|tab|fldChar|fldSimple|instrText|sym)\b|<mc:AlternateContent\b",
        without_page_breaks, re.IGNORECASE,
    ):
        return xml
    return xml[:start] + "".join(bookmarks) + xml[end:]


def _writer_starwriter_shape_index(name: str | None) -> int | None:
    match = re.fullmatch(r"Shape(\d+)", name or "")
    return int(match.group(1)) - 1 if match else None


def _drop_starwriter_duplicate_pics(
    xml: str, original_xml: str, rels_xml: str,
) -> tuple[str, str, set[str]]:
    """Remove leftover StarWriter GIF rasters once native DrawingML is restored.

    LibreOffice HTML export names every original wp:anchor ShapeN (1-based).
    Connectors are passthrough-replaced, but later ShapeN pics of those
    connectors remain. Untouched rectangle Frames are restored separately;
    their ShapeN GIFs are the fill/border raster and must go with them.
    """
    source = _writer_outer_anchor_blocks(original_xml)
    if not source:
        return xml, rels_xml, set()
    source_names = {name for name in (_writer_anchor_name(anchor) for anchor in source) if name}
    present_names = {
        name for name in (_writer_anchor_name(anchor) for anchor in _writer_outer_anchor_blocks(xml))
        if name
    }
    records = _relationship_records(rels_xml)
    ranges = _xml_element_ranges(xml, "wp:anchor")
    outer = [
        (start, end) for start, end in ranges
        if not any(other_start < start and end < other_end
                   for other_start, other_end in ranges)
    ]
    obsolete_rids: set[str] = set()
    pieces: list[str] = []
    cursor = len(xml)
    changed = False
    for start, end in reversed(outer):
        anchor = xml[start:end]
        name = _writer_anchor_name(anchor)
        index = _writer_starwriter_shape_index(name)
        keep = True
        if (
            index is not None
            and name not in source_names
            and 0 <= index < len(source)
            and re.search(r"<pic:pic\b", anchor, re.IGNORECASE)
        ):
            src = source[index]
            src_name = _writer_anchor_name(src)
            rids = re.findall(r'\br:(?:embed|link)=["\']([^"\']+)', anchor, re.IGNORECASE)
            gif_embed = any(
                str(records.get(rid, {}).get("Target", "")).lower().endswith(".gif")
                for rid in rids
            )
            native_wps = bool(re.search(r"<wps:wsp\b|<wpg:wgp\b", src, re.IGNORECASE))
            source_is_picture = bool(
                re.search(r"<pic:pic\b", src, re.IGNORECASE)
            ) and not native_wps
            if gif_embed and native_wps and not source_is_picture:
                # Only drop the raster once the original DrawingML is actually
                # in the document. Connectors have no text box; deleting their
                # ShapeN GIF when passthrough missed them removed the shape.
                native_present = bool(src_name and src_name in present_names and src_name != name)
                if native_present:
                    keep = False
                    obsolete_rids.update(rids)
        pieces.append(xml[end:cursor])
        pieces.append(anchor if keep else "")
        if not keep:
            changed = True
        cursor = start
    pieces.append(xml[:cursor])
    if not changed:
        return xml, rels_xml, set()
    patched = _drop_empty_writer_drawings("".join(reversed(pieces)))
    removable_entries: set[str] = set()
    for old_rid in obsolete_rids:
        if re.search(rf'\br:(?:embed|link|id)=["\']{re.escape(old_rid)}["\']', patched, re.IGNORECASE):
            continue
        old_rel = records.get(old_rid)
        rels_xml = re.sub(
            rf'<Relationship\b(?=[^>]*\bId=["\']{re.escape(old_rid)}["\'])[^>]*/?>',
            "", rels_xml, count=1, flags=re.IGNORECASE,
        )
        if not old_rel or old_rel.get("TargetMode") == "External":
            continue
        old_target = old_rel.get("Target", "")
        if not any(
            rel.get("Target") == old_target and rel.get("TargetMode") != "External"
            for rel in _relationship_records(rels_xml).values()
        ):
            removable_entries.add("word/" + old_target.lstrip("./"))
    return patched, rels_xml, removable_entries


def _apply_writer_shape_mutations_to_document(xml: str, mutations: list[dict]) -> str:
    """Update/remove the original shape anchors used by later relocation passes."""
    if not mutations:
        return xml
    ranges = _xml_element_ranges(xml, "wp:anchor")
    outer = [
        (start, end) for start, end in ranges
        if not any(other_start < start and end < other_end
                   for other_start, other_end in ranges)
    ]
    if not outer:
        return xml
    pieces: list[str] = []
    cursor = len(xml)
    for start, end in reversed(outer):
        anchor = xml[start:end]
        name = _writer_anchor_name(anchor)
        for mutation in (item for item in mutations if item.get("anchorName") == name):
            anchor = _apply_writer_imported_shape_mutation(anchor, mutation)
            if not anchor:
                anchor = ""
                break
        pieces.append(xml[end:cursor])
        pieces.append(anchor or "")
        cursor = start
    pieces.append(xml[:cursor])
    return _drop_empty_writer_drawings("".join(reversed(pieces)))


def _writer_reassign_docpr_id(block: str, occupied: set[int]) -> str:
    """Keep wp:docPr ids unique after a source drawing is copied in."""

    def repl(match: re.Match) -> str:
        value = int(match.group(3))
        if value not in occupied:
            occupied.add(value)
            return match.group(0)
        new_id = max(occupied, default=0) + 1
        while new_id in occupied:
            new_id += 1
        occupied.add(new_id)
        return f'{match.group(1)}"{new_id}"'

    return re.sub(
        r'(<wp:docPr\b[^>]*\bid=)(["\'])(\d+)\2',
        repl, block, count=1, flags=re.IGNORECASE,
    )


def _writer_anchor_extent(anchor: str) -> tuple[int, int] | None:
    match = re.search(r'<wp:extent\b[^>]*\bcx=["\'](\d+)["\'][^>]*\bcy=["\'](\d+)["\']', anchor, re.IGNORECASE)
    if match:
        return (int(match.group(1)), int(match.group(2)))
    match = re.search(r'<wp:extent\b[^>]*\bcy=["\'](\d+)["\'][^>]*\bcx=["\'](\d+)["\']', anchor, re.IGNORECASE)
    if match:
        return (int(match.group(2)), int(match.group(1)))
    return None


def _writer_anchor_identifier(anchor: str) -> str | None:
    name = _writer_anchor_name(anchor)
    if name:
        return name
    match = re.search(r'<wp:docPr\b[^>]*\bid=["\'](\d+)', anchor, re.IGNORECASE)
    if match:
        return f"__unnamed_docpr_{match.group(1)}"
    return None


def _writer_should_restore_drawing(
    block: str, present: set[str], converted_drawings: list[str],
) -> bool:
    """True when this source drawing is absent and restoring it will not duplicate an edit."""
    name = _writer_anchor_name(block)
    if name:
        if name in present:
            return False
    else:
        ident = _writer_anchor_identifier(block)
        if ident and ident in present:
            return False
    kind = _writer_anchor_passthrough_kind(block)
    if kind in {"shape", "group", "picture"}:
        if not name:
            b_ext = _writer_anchor_extent(block)
            if b_ext:
                b_cx, b_cy = b_ext
                for other in converted_drawings:
                    o_ext = _writer_anchor_extent(other)
                    if o_ext and abs(o_ext[0] - b_cx) < 50000:
                        if b_cy <= 100000 and o_ext[1] <= 100000:
                            return False
                        if abs(o_ext[1] - b_cy) < 50000:
                            return False
        return True
    if not _writer_anchor_has_textbox(block):
        return False
    key = _paragraph_match_key(block)
    plain = _paragraph_plain_text(block)
    for other in converted_drawings:
        other_plain = _paragraph_plain_text(other)
        if (_writer_anchor_has_edited_text(other) and plain and len(plain) >= 4
                and plain in other_plain):
            return False
        if len(key) >= 4 and _writer_anchor_has_textbox(other) and _paragraph_match_key(other) == key:
            return False
        if (len(key) < 4 and _writer_anchor_has_textbox(other)
                and len(_paragraph_match_key(other)) < 4):
            return False
    return True


def _writer_unique_docpr_ids(xml: str) -> str:
    """Renumber repeated wp:docPr ids; Word reports the package as corrupted otherwise.

    Several passes copy source drawings (with their source ids) next to anchors that
    LibreOffice numbered independently (d06: Rectangle 105 and Rectangle 87 both id 105).
    The first occurrence keeps its id; later repeats get the next free id.
    """
    pattern = re.compile(r'(<wp:docPr\b[^>]*\bid=)(["\'])(\d+)\2', re.IGNORECASE)
    ids = [int(match.group(3)) for match in pattern.finditer(xml)]
    if len(ids) == len(set(ids)):
        return xml
    seen: set[int] = set()
    next_free = max(ids) + 1

    def repl(match: re.Match) -> str:
        nonlocal next_free
        value = int(match.group(3))
        if value not in seen:
            seen.add(value)
            return match.group(0)
        while next_free in seen:
            next_free += 1
        seen.add(next_free)
        return f'{match.group(1)}"{next_free}"'

    return pattern.sub(repl, xml)


def _restore_missing_writer_drawings(
    converted_xml: str, original_xml: str, deleted_names: set[str],
) -> str:
    """Copy source anchors and inline groups that LibreOffice dropped on the way to DOCX.

    Hairline connector GIFs are removed before export, and inline groups are not
    anchor passthrough. Reinsert the original DrawingML at the source paragraph
    slot. Names already present, and shapes the user deleted, stay untouched.
    """
    source_ranges = _writer_body_paragraph_ranges(original_xml)
    source = [original_xml[start:end] for start, end in source_ranges]
    converted_ranges = _writer_body_paragraph_ranges(converted_xml)
    converted = [converted_xml[start:end] for start, end in converted_ranges]
    converted_drawings = (
        _writer_outer_anchor_blocks(converted_xml) + _writer_outer_inline_blocks(converted_xml)
    )
    present = {
        name for name in (_writer_anchor_name(block) for block in converted_drawings) if name
    }
    present.update(deleted_names)
    missing_at: dict[int, list[str]] = {}
    for index, paragraph in enumerate(source):
        for block in _writer_paragraph_drawings(paragraph):
            if not _writer_should_restore_drawing(block, present, converted_drawings):
                continue
            name = _writer_anchor_name(block)
            if name:
                present.add(name)
            else:
                ident = _writer_anchor_identifier(block)
                if ident:
                    present.add(ident)
            missing_at.setdefault(index, []).append(block)
    if not missing_at:
        return converted_xml

    pairs = dict(_writer_text_lcs_pairs(
        [f"<w:t>{_writer_flow_text(paragraph)}</w:t>" for paragraph in source],
        [f"<w:t>{_writer_flow_text(paragraph)}</w:t>" for paragraph in converted],
    ))
    matched = sorted(pairs.items())
    # Empty drawing carriers cannot be aligned by text. Pair them between stable
    # text boundaries using the untouched paragraph bookmarks emitted by Writer;
    # counting every converted paragraph here lets an unrelated LO spacer steal
    # the source carrier and move an absolute-positioned shape onto another page.
    text_pairs = [
        (source_at, target_at) for source_at, target_at in matched
        if _writer_flow_text(source[source_at]) and _writer_flow_text(converted[target_at])
    ]
    empty_carrier_targets: dict[int, int] = {}
    bounded_pairs = [(-1, -1), *text_pairs, (len(source), len(converted))]
    for (source_start, target_start), (source_end, target_end) in zip(
        bounded_pairs, bounded_pairs[1:]
    ):
        source_empty = [
            index for index in range(source_start + 1, source_end)
            if not _writer_flow_text(source[index]) and _writer_paragraph_drawings(source[index])
        ]
        target_empty = [
            index for index in range(target_start + 1, target_end)
            if index in {
                target_index for target_index, paragraph in enumerate(converted)
                if re.search(
                    r'<w:bookmarkStart\b[^>]*\bw:name=["\']vno-untouched-\d+["\']',
                    paragraph, re.IGNORECASE,
                )
            }
            and not _writer_flow_text(converted[index])
        ]
        if source_empty and len(source_empty) == len(target_empty):
            empty_carrier_targets.update(zip(source_empty, target_empty))
    occupied = {
        int(value) for value in re.findall(
            r'<wp:docPr\b[^>]*\bid=["\'](\d+)', converted_xml, re.IGNORECASE,
        )
    }

    def slot_for(source_index: int) -> tuple[str, int]:
        if source_index in empty_carrier_targets:
            return ("into", empty_carrier_targets[source_index])
        if source_index in pairs:
            return ("into", pairs[source_index])
        previous_source = previous_target = None
        next_source = next_target = None
        for source_at, target_at in matched:
            if source_at < source_index:
                previous_source, previous_target = source_at, target_at
            elif source_at > source_index and next_target is None:
                next_source, next_target = source_at, target_at
                break
        # Empty paragraphs have no text for the LCS to pair. When the gap between the
        # matched neighbours has the same paragraph count on both sides, the unmatched
        # source paragraph is the one at the same offset — anchor into it instead of
        # adding a new paragraph, which pushes the layout down (d06: 3 -> 4 pages).
        if (previous_source is not None and next_source is not None
                and next_source - previous_source == next_target - previous_target):
            return ("into", previous_target + (source_index - previous_source))
        # Otherwise keep the same offset but stay inside the gap, and still anchor into an
        # existing paragraph: a new empty paragraph adds a line of height (d06: the seven
        # connectors of an empty source paragraph turned 3 pages into 4).
        if previous_target is not None:
            limit = next_target - 1 if next_target is not None else len(converted) - 1
            offset = previous_target + (source_index - previous_source)
            return ("into", max(previous_target, min(offset, limit)))
        if next_target is not None:
            return ("into", next_target)
        if converted:
            return ("into", len(converted) - 1)
        return ("before", len(converted))

    insertions_into: dict[int, list[str]] = {}
    new_paragraphs_before: dict[int, list[str]] = {}
    for source_index, blocks in missing_at.items():
        drawings = []
        for block in blocks:
            block = _writer_reassign_docpr_id(block, occupied)
            drawings.append(f"<w:r><w:drawing>{block}</w:drawing></w:r>")
        payload = "".join(drawings)
        kind, target_index = slot_for(source_index)
        if kind == "into":
            insertions_into.setdefault(target_index, []).append(payload)
        else:
            new_paragraphs_before.setdefault(target_index, []).append(f"<w:p>{payload}</w:p>")

    result = converted_xml
    indexes = sorted(set(insertions_into) | set(new_paragraphs_before), reverse=True)
    for index in indexes:
        news = "".join(new_paragraphs_before.get(index, []))
        if index < len(converted_ranges):
            start, end = converted_ranges[index]
            paragraph = result[start:end]
            extra = "".join(insertions_into.get(index, []))
            if extra:
                close = paragraph.rfind("</w:p")
                if close >= 0:
                    paragraph = paragraph[:close] + extra + paragraph[close:]
                else:
                    empty = re.fullmatch(r"<w:p\b([^>]*?)\s*/>", paragraph.strip())
                    if empty:
                        paragraph = f"<w:p{empty.group(1)}>{extra}</w:p>"
                    else:
                        news += f"<w:p>{extra}</w:p>"
            result = result[:start] + news + paragraph + result[end:]
            continue
        body_close = result.rfind("</w:body")
        sect = result.rfind("<w:sectPr")
        if 0 <= sect < body_close:
            result = result[:sect] + news + result[sect:]
        elif body_close >= 0:
            result = result[:body_close] + news + result[body_close:]
    return result


def postprocess_writer_docx(
    docx_bytes: bytes,
    *,
    source_docx: bytes | None = None,
    source_html: str | None = None,
    preserve_pristine_source: bool = False,
) -> bytes:
    """Re-inject section structure, header/footer XML from the original DOCX
    into the converted DOCX that LibreOffice generated from HTML.

    With preserve_pristine_source=True, an untouched imported DOCX uses the
    original OOXML package after the Save conversion has run. Edited documents
    and legacy .doc imports stay on the surgical restore path.

    When source_docx is None or the original has no header/footer references,
    returns docx_bytes unchanged (safe no-op).

    Key fix: remap original header/footer rIds to new sequential rIds in the
    converted DOCX's rels file, and add Content_Types overrides — without
    these, Word sees dangling references and reports "appears to be corrupted".
    """
    if not source_docx:
        return docx_bytes

    orig_header_entries, orig_footer_entries, orig_sect_pr, orig_rels = (
        _extract_docx_section_parts(source_docx)
    )

    try:
        converted_xml_bytes = read_zip_entry(docx_bytes, "word/document.xml")
    except (KeyError, ValueError):
        return docx_bytes
    if not converted_xml_bytes:
        return docx_bytes
    converted_xml = converted_xml_bytes.decode("utf-8", errors="replace")

    original_xml_bytes = read_zip_entry(source_docx, "word/document.xml")
    original_xml = original_xml_bytes.decode("utf-8", errors="replace") if original_xml_bytes else ""

    # Internal bridge markers identify imported anchors explicitly changed or
    # deleted in Writer. Remove marker paragraphs from the final document, then
    # apply the mutations after passthrough has restored the native anchors.
    converted_xml, mutation_names = _strip_writer_shape_mutation_markers(converted_xml)
    converted_xml = _strip_writer_pristine_marker_carrier(converted_xml)

    # W35b: numbering nguồn + LibreOffice (id dời +1000) — numPr nguồn được W35 trả lại phải trỏ đúng numbering nguồn
    source_numbering_bytes = read_zip_entry(source_docx, "word/numbering.xml")
    converted_numbering_bytes = read_zip_entry(docx_bytes, "word/numbering.xml")
    merged_numbering: str | None = None
    numbering_part_missing = False
    if source_numbering_bytes and converted_numbering_bytes and "<w:numId" in converted_xml:
        converted_xml = _writer_offset_num_ids(converted_xml, _W35B_NUM_OFFSET)
        merged_numbering = _merge_writer_numbering(
            source_numbering_bytes.decode("utf-8", errors="replace"),
            converted_numbering_bytes.decode("utf-8", errors="replace"),
            _W35B_NUM_OFFSET,
        )
    elif source_numbering_bytes and not converted_numbering_bytes:
        # Bản chuyển đổi không có numbering part: đưa numbering nguồn vào (kèm rels + content type bên dưới)
        merged_numbering = source_numbering_bytes.decode("utf-8", errors="replace")
        numbering_part_missing = True

    # A pristine, drawing-led catalogue has no editable body representation:
    # LibreOffice expands its page-sized WPG groups into 100+ unrelated HTML
    # paragraphs. The only lossless save is the original OOXML package itself.
    # This is narrowly gated to short, anchor-heavy bodies; ordinary Writer
    # documents and every touched document continue through the surgical passes.
    if "vno-pristine-document" in converted_xml:
        # For an untouched document opened from a real DOCX, the original
        # OOXML package is already the exact Save result. The HTML → DOCX
        # conversion above still runs; this final source-restore step prevents
        # small layout shifts from LibreOffice's HTML import from changing
        # page boundaries in Word. main.py leaves this disabled for legacy
        # binary DOC sources, whose source_docx is itself a LibreOffice import.
        if preserve_pristine_source and not mutation_names and "vno-edited-" not in converted_xml:
            return source_docx

        source_flow = _writer_body_paragraph_ranges(original_xml)
        safe_anchors = [
            anchor for anchor in _writer_outer_anchor_blocks(original_xml)
            if _writer_anchor_passthrough_kind(anchor)
        ]
        if not mutation_names and 5 <= len(safe_anchors) and len(source_flow) <= 25:
            return source_docx
    elif "vno-edited-" in converted_xml:
        source_flow = _writer_body_paragraph_ranges(original_xml)
        safe_anchors = [
            anchor for anchor in _writer_outer_anchor_blocks(original_xml)
            if _writer_anchor_passthrough_kind(anchor)
        ]
        # Drawing-led catalogues keep their editable text in native grouped
        # text boxes. Transplant simple text insertions into that native XML so
        # the edited box stays inside its original group (11 anchors), rather
        # than retaining an extra LibreOffice raster/textbox anchor.
        if 5 <= len(safe_anchors) and len(source_flow) <= 25:
            edited_texts = [
                _paragraph_plain_text(converted_xml[start:end])
                for start, end in _document_paragraph_ranges(converted_xml)
                if "vno-edited-" in converted_xml[start:end]
                and _paragraph_plain_text(converted_xml[start:end])
            ]
            native_xml = original_xml
            mapped_count = 0
            for edited_text in edited_texts:
                candidates = []
                for match in re.finditer(r"(<w:t\b[^>]*>)([\s\S]*?)(</w:t\s*>)", native_xml, re.IGNORECASE):
                    source_text = _unescape_xml(match.group(2))
                    if len(source_text) >= 4 and edited_text.endswith(source_text):
                        candidates.append((len(source_text), match))
                if not candidates:
                    continue
                _length, match = max(candidates, key=lambda item: item[0])
                native_xml = (
                    native_xml[:match.start(2)] + _escape_xml(edited_text)
                    + native_xml[match.end(2):]
                )
                mapped_count += 1
            if mapped_count:
                return patch_ooxml_zip(
                    source_docx, {"word/document.xml": native_xml.encode("utf-8")},
                )

    # --- Remap original header/footer rIds to sequential new rIds ---
    # The original sectPr has rIds (e.g. rId154) that don't exist in the
    # converted DOCX's rels. We renumber them to sequential rIds starting
    # after the converted DOCX's current max rId.
    converted_rels_bytes = read_zip_entry(docx_bytes, "word/_rels/document.xml.rels")
    converted_rels_xml = (
        converted_rels_bytes.decode("utf-8", errors="replace")
        if converted_rels_bytes
        else '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        "</Relationships>"
    )
    max_rid = _max_rels_rid(converted_rels_xml)
    next_rid = max_rid + 1

    # Build mapping: original rId -> new rId for all header/footer refs
    r_id_map: dict[str, str] = {}
    for ref_list in (orig_header_entries, orig_footer_entries):
        for entry_name in ref_list:
            # Extract the rId from sectPr by finding which rId maps to this entry
            # via the original rels
            target_file = entry_name.replace("word/", "")
            for orig_rid, orig_target in orig_rels.items():
                resolved = orig_target if orig_target.startswith("word/") else f"word/{orig_target.lstrip('./')}"
                if resolved == entry_name and orig_rid not in r_id_map:
                    new_rid = f"rId{next_rid}"
                    next_rid += 1
                    r_id_map[orig_rid] = new_rid
                    break

    # Remap the sectPr's header/footer rIds
    if r_id_map and orig_sect_pr:
        remapped_sect_pr = _remap_header_footer_rids(orig_sect_pr, r_id_map)
    else:
        remapped_sect_pr = orig_sect_pr

    orig_sect_prs = re.findall(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", original_xml, re.IGNORECASE)
    if len(orig_sect_prs) <= 1:
        converted_xml = _collapse_single_section_cols(converted_xml)

    new_xml = _rebuild_docx_document_xml(
        converted_xml, original_xml, orig_header_entries, orig_footer_entries, remapped_sect_pr
    )
    new_xml = _repair_writer_double_fills(new_xml)

    # Restore mid-document section breaks (w:sectPr in w:pPr) that LibreOffice
    # converted to w:br type="page". Match by vno-untouched-N bookmark.
    new_xml, next_rid = _restore_mid_document_sections(
        new_xml, original_xml, orig_rels, r_id_map, next_rid
    )

    # W40: cùng số section → thuộc tính trang từng section lấy theo THỨ TỰ nguồn (giữ header/footerReference của bản
    # chuyển đổi để không chạm rels, hoặc ánh xạ lại rId nguồn nếu bản chuyển đổi bị LibreOffice bỏ sót)
    new_xml = _restore_writer_sections_by_order(new_xml, original_xml, r_id_map=r_id_map)

    # W27a: Restore manual page breaks (w:br type=page / w:pageBreakBefore)
    # by matching paragraphs and tables by ORDER between source and converted DOCX.
    new_xml = _restore_writer_page_breaks(new_xml, original_xml)

    # W27b: bảng nổi (tblpPr) bị LibreOffice xuất thành hộp văn bản chứa bảng -> trả lại bảng nổi
    new_xml = _restore_writer_floating_tables(new_xml, original_xml)

    # W36: tblPr/tblGrid/trPr/tcPr của bảng cấp 1 lấy lại từ nguồn khi cấu trúc hàng/ô trùng (LibreOffice thêm
    # tblCellMar 28 twips, đổi trHeight/tcW/viền)
    new_xml = _restore_writer_table_properties(new_xml, original_xml, _writer_parse_table_edits(source_html))

    pristine_document = "vno-pristine-document" in new_xml
    untouched_texts = _writer_unique_marked_texts(new_xml)
    new_xml = _remove_duplicate_writer_textbox_anchors(
        new_xml, original_xml, pristine_document=pristine_document,
    )
    with zipfile.ZipFile(io.BytesIO(docx_bytes)) as converted_zip:
        existing_entries = set(converted_zip.namelist())
    new_xml, converted_rels_xml, next_rid, anchor_media, anchor_extensions, obsolete_anchor_media = (
        _passthrough_writer_anchors(
            new_xml, original_xml, source_docx, converted_rels_xml, next_rid,
            existing_entries,
            # The HTML bridge emits the source's top-level floating carriers
            # first and preserves paragraph bookmarks independently.  Order is
            # therefore trustworthy for the carrier set whenever at least one
            # per-paragraph untouched marker survives; relocation below still
            # decides independently which carrier paragraphs may be restored.
            trust_order=pristine_document or "vno-untouched-" in new_xml,
            pristine_document=pristine_document,
        )
    )
    new_xml = _relocate_passthrough_anchors(
        new_xml, original_xml, pristine_document=pristine_document,
    )
    deleted_names = {
        str(item.get("anchorName"))
        for item in mutation_names
        if isinstance(item, dict) and item.get("type") == "delete" and item.get("anchorName")
    }
    new_xml = _restore_missing_writer_drawings(new_xml, original_xml, deleted_names)
    new_xml = _remove_duplicate_writer_group_flow_paragraphs(
        new_xml, original_xml, pristine_document=pristine_document,
    )
    new_xml = _restore_writer_anchor_properties(new_xml, original_xml)
    new_xml = _apply_writer_shape_mutations_to_document(new_xml, mutation_names)
    new_xml, converted_rels_xml, starwriter_obsolete = _drop_starwriter_duplicate_pics(
        new_xml, original_xml, converted_rels_xml,
    )
    obsolete_anchor_media = set(obsolete_anchor_media) | starwriter_obsolete
    new_xml = _restore_writer_matched_formatting(
        new_xml, original_xml, trusted_untouched_texts=untouched_texts,
        trust_all_exact=pristine_document,
    )
    if pristine_document:
        new_xml = _restore_writer_matched_formatting(
            new_xml, original_xml, trusted_untouched_texts=untouched_texts,
            table_paragraphs_only=True,
        )
    new_xml = _restore_untouched_writer_equations(new_xml, original_xml)
    new_xml = _remove_writer_untouched_bookmarks(new_xml)
    new_xml = _writer_collapse_consecutive_page_breaks(new_xml)
    new_xml = _writer_unique_docpr_ids(new_xml)

    replacements: dict[str, bytes] = {}
    if new_xml != converted_xml or merged_numbering is not None:
        replacements["word/document.xml"] = new_xml.encode("utf-8")
    if merged_numbering is not None:
        replacements["word/numbering.xml"] = merged_numbering.encode("utf-8")

    for entry_name in dict.fromkeys(orig_header_entries):
        header_bytes = read_zip_entry(source_docx, entry_name)
        if header_bytes:
            replacements[entry_name] = header_bytes

    for entry_name in dict.fromkeys(orig_footer_entries):
        footer_bytes = read_zip_entry(source_docx, entry_name)
        if footer_bytes:
            replacements[entry_name] = footer_bytes

    new_xml, converted_rels_xml, extra_header_footer_entries = (
        _writer_apply_section_header_footer_metadata(
            new_xml, source_docx, source_html, orig_rels, r_id_map,
            converted_rels_xml, replacements, existing_entries,
        )
    )
    if new_xml != converted_xml:
        replacements["word/document.xml"] = new_xml.encode("utf-8")

    # Runs restored from the original keep `w:asciiTheme="majorHAnsi"`; LibreOffice's regenerated
    # theme1.xml says Arial/Arial while the original says Calibri Light/Calibri, so those runs
    # changed font (HDLD.docx 2026-09-15: dotted lines wrapped, 5 -> 6 pages). Keep the source theme.
    source_theme = read_zip_entry(source_docx, "word/theme/theme1.xml")
    if source_theme and "word/theme/theme1.xml" in existing_entries:
        replacements["word/theme/theme1.xml"] = source_theme

    hf_dependencies, hf_extensions = _collect_header_footer_dependencies(
        source_docx,
        [e for e in (*orig_header_entries, *orig_footer_entries, *extra_header_footer_entries) if e in replacements],
        existing_entries,
    )
    replacements.update(hf_dependencies)

    replacements.update(anchor_media)

    # W34b: styles.xml của bản lưu = styles.xml NGUỒN (docDefaults/Normal/Heading… đúng Word) + style riêng của
    # LibreOffice chưa có trong nguồn (TableContents, Heading, ListLabel…) để w:pStyle không trỏ vào chỗ trống.
    source_styles = read_zip_entry(source_docx, "word/styles.xml")
    converted_styles = read_zip_entry(docx_bytes, "word/styles.xml")
    if source_styles and converted_styles:
        converted_styles_xml = converted_styles.decode("utf-8", errors="replace")
        if merged_numbering is not None:
            converted_styles_xml = _writer_offset_num_ids(converted_styles_xml, _W35B_NUM_OFFSET)
        merged_styles = _merge_writer_styles(source_styles.decode("utf-8", errors="replace"), converted_styles_xml)
        replacements["word/styles.xml"] = merged_styles.encode("utf-8")

    # W38 (đo d21: compat 12 của LibreOffice → 11 trang, compat 15 nguồn → 10): khối <w:compat> của settings.xml
    # lấy từ nguồn để Word dàn trang theo đúng chế độ tương thích của tài liệu gốc (không chép cả settings.xml —
    # rsids/attachedTemplate r:id làm Word báo hỏng).
    source_settings = read_zip_entry(source_docx, "word/settings.xml")
    converted_settings = read_zip_entry(docx_bytes, "word/settings.xml")
    if source_settings and converted_settings:
        source_settings_xml = source_settings.decode("utf-8", errors="replace")
        src_compat = re.search(r"<w:compat>[\s\S]*?</w:compat>", source_settings_xml)
        settings_xml = converted_settings.decode("utf-8", errors="replace")
        new_settings = settings_xml
        if src_compat:
            if re.search(r"<w:compat>[\s\S]*?</w:compat>", new_settings):
                new_settings = re.sub(r"<w:compat>[\s\S]*?</w:compat>", lambda _m: src_compat.group(0), new_settings, count=1)
            else:
                new_settings = new_settings.replace("</w:settings>", src_compat.group(0) + "</w:settings>", 1)
        # W38b (d14: LibreOffice defaultTabStop 1134 vs nguồn 720 → chữ sau tab nhảy xa hơn, 1 → 2 dòng): các thiết
        # lập đơn ảnh hưởng dàn trang lấy theo nguồn (đứng trước <w:compat> trong schema)
        for tag in ("defaultTabStop", "autoHyphenation", "hyphenationZone", "doNotHyphenateCaps", "evenAndOddHeaders",
                    "mirrorMargins", "characterSpacingControl"):
            src_tag = re.search(rf"<w:{tag}\b[^>]*/>", source_settings_xml)
            dst_re = re.compile(rf"<w:{tag}\b[^>]*/>")
            if src_tag:
                if dst_re.search(new_settings):
                    new_settings = dst_re.sub(lambda _m, v=src_tag.group(0): v, new_settings, count=1)
                elif "<w:compat>" in new_settings:
                    new_settings = new_settings.replace("<w:compat>", src_tag.group(0) + "<w:compat>", 1)
            elif tag in ("autoHyphenation", "evenAndOddHeaders", "mirrorMargins"):
                new_settings = dst_re.sub("", new_settings)
        if new_settings != settings_xml:
            replacements["word/settings.xml"] = new_settings.encode("utf-8")

    # W34a: LibreOffice ghi tên font kèm fallback CSS ("Times New Roman;serif", "Arial;sans-serif") vào w:rFonts và
    # fontTable — Word không có font tên ấy nên thay font khác (đo 20/20 bản lưu đều dính). Giữ tên đầu.
    for entry_name in sorted(existing_entries | set(replacements)):
        if not (entry_name.startswith("word/") and entry_name.endswith(".xml")):
            continue
        current = replacements.get(entry_name)
        if current is None:
            current = read_zip_entry(docx_bytes, entry_name)
        if not current:
            continue
        text = current.decode("utf-8", errors="replace")
        stripped = _strip_writer_font_fallbacks(text, dedupe_font_table=entry_name.endswith("fontTable.xml"))
        if stripped != text:
            replacements[entry_name] = stripped.encode("utf-8")

    if not replacements:
        return docx_bytes

    # --- Update word/_rels/document.xml.rels ---
    new_rels_xml = converted_rels_xml
    footer_type = _DOCX_FOOTER_REL_TYPE
    header_type = _DOCX_HEADER_REL_TYPE
    for entry_name in dict.fromkeys(orig_footer_entries):
        target_file = entry_name.replace("word/", "")
        new_rid = None
        for orig_rid, mapped in r_id_map.items():
            # Find which original rId maps to this entry
            orig_target = orig_rels.get(orig_rid, "")
            resolved = orig_target if orig_target.startswith("word/") else f"word/{orig_target.lstrip('./')}"
            if resolved == entry_name:
                new_rid = mapped
                break
        if new_rid:
            new_rels_xml = _add_rels_entry(new_rels_xml, new_rid, footer_type, target_file)
    for entry_name in dict.fromkeys(orig_header_entries):
        target_file = entry_name.replace("word/", "")
        new_rid = None
        for orig_rid, mapped in r_id_map.items():
            orig_target = orig_rels.get(orig_rid, "")
            resolved = orig_target if orig_target.startswith("word/") else f"word/{orig_target.lstrip('./')}"
            if resolved == entry_name:
                new_rid = mapped
                break
        if new_rid:
            new_rels_xml = _add_rels_entry(new_rels_xml, new_rid, header_type, target_file)
    if numbering_part_missing and "numbering.xml" not in new_rels_xml:
        new_rels_xml = _add_rels_entry(
            new_rels_xml, f"rId{next_rid}",
            "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering", "numbering.xml",
        )
        next_rid += 1
    replacements["word/_rels/document.xml.rels"] = new_rels_xml.encode("utf-8")

    # --- Update [Content_Types].xml ---
    ct_bytes = read_zip_entry(docx_bytes, "[Content_Types].xml")
    ct_xml = (
        ct_bytes.decode("utf-8", errors="replace")
        if ct_bytes
        else '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        "</Types>"
    )
    for entry_name in dict.fromkeys(orig_footer_entries):
        part_name = f"/{entry_name}"
        ct_xml = _add_content_types_override(ct_xml, part_name, _DOCX_FOOTER_CONTENT_TYPE)
    for entry_name in dict.fromkeys(orig_header_entries):
        part_name = f"/{entry_name}"
        ct_xml = _add_content_types_override(ct_xml, part_name, _DOCX_HEADER_CONTENT_TYPE)
    for entry_name in extra_header_footer_entries:
        part_name = f"/{entry_name}"
        content_type = (
            _DOCX_HEADER_CONTENT_TYPE
            if re.fullmatch(r"word/header\d+\.xml", entry_name, re.IGNORECASE)
            else _DOCX_FOOTER_CONTENT_TYPE
        )
        ct_xml = _add_content_types_override(ct_xml, part_name, content_type)
    if numbering_part_missing:
        ct_xml = _add_content_types_override(
            ct_xml, "/word/numbering.xml",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml",
        )
    for extension in sorted(anchor_extensions):
        ct_xml = _add_content_type_default(
            ct_xml, extension, _DOCX_IMAGE_CONTENT_TYPES[extension]
        )
    for extension in sorted(hf_extensions):
        content_type = _DOCX_IMAGE_CONTENT_TYPES.get(extension) or _DOCX_HF_EXTRA_CONTENT_TYPES.get(extension)
        if content_type and extension not in ("xml", "rels"):
            ct_xml = _add_content_type_default(ct_xml, extension, content_type)
    replacements["[Content_Types].xml"] = ct_xml.encode("utf-8")

    source = io.BytesIO(docx_bytes)
    dest = io.BytesIO()
    with zipfile.ZipFile(source, "r") as zin, zipfile.ZipFile(
        dest, "w", compression=zipfile.ZIP_DEFLATED
    ) as zout:
        written_replacements: set[str] = set()
        for item in zin.infolist():
            if item.is_dir() or not item.filename or item.filename.endswith("/"):
                continue
            if item.filename in obsolete_anchor_media:
                continue
            if item.filename in replacements:
                data = replacements[item.filename]
                info = zipfile.ZipInfo(filename=item.filename, date_time=item.date_time)
                info.compress_type = zipfile.ZIP_DEFLATED
                zout.writestr(info, data)
                written_replacements.add(item.filename)
            else:
                data = zin.read(item.filename)
                info = zipfile.ZipInfo(filename=item.filename, date_time=item.date_time)
                info.compress_type = zipfile.ZIP_DEFLATED
                zout.writestr(info, data)
        for entry_name, data in replacements.items():
            if entry_name not in written_replacements:
                info = zipfile.ZipInfo(filename=entry_name)
                info.compress_type = zipfile.ZIP_DEFLATED
                zout.writestr(info, data)

    return dest.getvalue()


def _convert_wps_drawing_to_vml(drawing_xml: str) -> str:
    """Convert a DrawingML <w:drawing> containing <wps:txbx> into a VML <w:pict> text box.

    LibreOffice's MS Word 97 (.doc) export filter corrupts Escher streams when writing
    DrawingML text boxes (<wps:txbx>), but processes VML (<w:pict><v:rect><v:textbox>) cleanly.
    """
    if "<wps:txbx" not in drawing_xml:
        return drawing_xml
    m_content = re.search(r"(<w:txbxContent\b[\s\S]*?</w:txbxContent\s*>)", drawing_xml)
    if not m_content:
        return drawing_xml
    content = m_content.group(1)

    m_ext = re.search(r'<wp:extent\b[^>]*cx=["\'](\d+)["\'][^>]*cy=["\'](\d+)["\']', drawing_xml)
    if not m_ext:
        m_ext = re.search(r'<a:ext\b[^>]*cx=["\'](\d+)["\'][^>]*cy=["\'](\d+)["\']', drawing_xml)
    cx = int(m_ext.group(1)) if m_ext else 3800000
    cy = int(m_ext.group(2)) if m_ext else 1500000
    w_pt = round(cx / 12700.0, 1)
    h_pt = round(cy / 12700.0, 1)

    m_off_h = re.search(r"<wp:positionH\b[^>]*>[\s\S]*?<wp:posOffset>(\d+)</wp:posOffset>", drawing_xml)
    m_off_v = re.search(r"<wp:positionV\b[^>]*>[\s\S]*?<wp:posOffset>(\d+)</wp:posOffset>", drawing_xml)
    off_x = int(m_off_h.group(1)) if m_off_h else 0
    off_y = int(m_off_v.group(1)) if m_off_v else 0
    ml_pt = round(off_x / 12700.0, 1)
    mt_pt = round(off_y / 12700.0, 1)

    wrap_type = "none" if "<wp:wrapNone" in drawing_xml else "square"

    return (
        f'<w:pict>'
        f'<v:rect fillcolor="#FFFFFF" style="position:absolute;rotation:-0;width:{w_pt}pt;height:{h_pt}pt;'
        f'margin-left:{ml_pt}pt;margin-top:{mt_pt}pt;mso-position-horizontal-relative:text;mso-position-vertical-relative:text">'
        f'<v:fill opacity="0f"/>'
        f'<v:textbox>{content}</v:textbox>'
        f'<w10:wrap type="{wrap_type}"/>'
        f'</v:rect>'
        f'</w:pict>'
    )


def prepare_writer_docx_for_legacy_doc_export(docx_bytes: bytes) -> bytes:
    """Prepare a DOCX package for clean LibreOffice MS Word 97 (.doc) export.

    LibreOffice's MS Word 97 (.doc) export filter has a known defect when converting DrawingML
    text boxes (<wps:txbx> inside <wps:wsp> or <mc:AlternateContent><mc:Choice>) into binary .doc
    (WW8/Escher) format, producing corrupt records that cause Word 2016 to display a modal error dialog
    ("Word experienced an error trying to open the file").

    In contrast, LibreOffice's MS Word 97 filter handles legacy VML (<w:pict><v:rect><v:textbox>...)
    flawlessly without corruption.

    This function:
    1. Flattens <mc:AlternateContent> elements providing a <mc:Fallback> into their fallback content.
    2. Converts any remaining DrawingML <w:drawing> text boxes (<wps:txbx>) into VML text boxes.
    3. Ensures VML namespaces (xmlns:v, xmlns:w10) are declared if VML is introduced.

    Ensures 100% clean Word 97 export while preserving document layout, text, and formatting.
    """
    if not docx_bytes:
        return docx_bytes

    try:
        source = io.BytesIO(docx_bytes)
        with zipfile.ZipFile(source, "r") as zin:
            entries = zin.namelist()
            modified: dict[str, bytes] = {}
            for name in entries:
                if name.startswith("word/") and name.endswith(".xml"):
                    data = zin.read(name)
                    text = data.decode("utf-8", errors="replace")
                    original_text = text
                    if "<mc:AlternateContent" in text and "<mc:Fallback" in text:
                        text = re.sub(
                            r"<mc:AlternateContent\b[\s\S]*?</mc:AlternateContent>",
                            lambda m: (re.search(r"<mc:Fallback\b[^>]*>([\s\S]*?)</mc:Fallback>", m.group(0)) or m).group(1) if re.search(r"<mc:Fallback\b[^>]*>([\s\S]*?)</mc:Fallback>", m.group(0)) else m.group(0),
                            text,
                        )
                    if "<wps:txbx" in text:
                        text = re.sub(
                            r"<w:drawing\b[\s\S]*?</w:drawing>",
                            lambda m: _convert_wps_drawing_to_vml(m.group(0)),
                            text,
                        )
                    if "<v:rect" in text or "<v:shape" in text or "<v:textbox" in text:
                        if 'xmlns:v="urn:schemas-microsoft-com:vml"' not in text:
                            text = text.replace("<w:document ", '<w:document xmlns:v="urn:schemas-microsoft-com:vml" ', 1)
                        if 'xmlns:w10="urn:schemas-microsoft-com:office:word"' not in text:
                            text = text.replace("<w:document ", '<w:document xmlns:w10="urn:schemas-microsoft-com:office:word" ', 1)
                    if text != original_text:
                        modified[name] = text.encode("utf-8")
        if not modified:
            return docx_bytes
        return patch_ooxml_zip(docx_bytes, modified)
    except Exception:
        return docx_bytes


def _strip_writer_font_fallbacks(xml: str, dedupe_font_table: bool = False) -> str:
    """W34a: `w:ascii="Times New Roman;serif"` (và hAnsi/cs/eastAsia, `<w:font w:name=…>`) -> tên đầu tiên."""
    out = re.sub(r'(\bw:(?:ascii|hAnsi|cs|eastAsia|name)=")([^";]+);[^"]*(")', r"\1\2\3", xml)
    if dedupe_font_table and out != xml:
        seen: set[str] = set()

        def keep_first(match: re.Match) -> str:
            name = re.search(r'\bw:name="([^"]*)"', match.group(0))
            key = name.group(1) if name else match.group(0)
            if key in seen:
                return ""
            seen.add(key)
            return match.group(0)

        out = re.sub(r"<w:font\b[^>]*/>|<w:font\b[^>]*>[\s\S]*?</w:font>", keep_first, out)
    return out


def _merge_writer_styles(source_styles_xml: str, converted_styles_xml: str) -> str:
    """W34b: lấy nguyên styles.xml nguồn, thêm các `<w:style>` chỉ LibreOffice có (theo w:styleId) trước </w:styles>.
    Word render bản lưu bằng đúng docDefaults/Normal/Heading của nguồn (d20: docDefaults không sz = 10pt, LibreOffice
    ghi 12pt và Heading2 riêng → 3 trang thành 7)."""
    style_re = re.compile(r"<w:style\b[^>]*>[\s\S]*?</w:style>|<w:style\b[^>]*/>", re.IGNORECASE)
    source_ids = {m.group(1) for m in re.finditer(r'<w:style\b[^>]*\bw:styleId="([^"]+)"', source_styles_xml)}
    extra: list[str] = []
    for match in style_re.finditer(converted_styles_xml):
        style_xml = match.group(0)
        sid = re.search(r'\bw:styleId="([^"]+)"', style_xml)
        if not sid or sid.group(1) in source_ids:
            continue
        # Style riêng của LibreOffice không được làm mặc định (w:default) đè lên Normal của nguồn
        style_xml = re.sub(r'\s+w:default="(?:1|true|on)"', "", style_xml)
        extra.append(style_xml)
        source_ids.add(sid.group(1))
    if not extra:
        return source_styles_xml
    close = source_styles_xml.rfind("</w:styles>")
    if close < 0:
        return source_styles_xml
    return source_styles_xml[:close] + "".join(extra) + source_styles_xml[close:]


# Thứ tự phần tử con của w:pPr theo lược đồ OOXML (CT_PPrBase + rPr, sectPr, pPrChange): Word từ chối/sửa tệp sai thứ tự.
_PPR_CHILD_ORDER = (
    "pStyle", "keepNext", "keepLines", "pageBreakBefore", "framePr", "widowControl", "numPr", "suppressLineNumbers",
    "pBdr", "shd", "tabs", "suppressAutoHyphens", "kinsoku", "wordWrap", "overflowPunct", "topLinePunct",
    "autoSpaceDE", "autoSpaceDN", "bidi", "adjustRightInd", "snapToGrid", "spacing", "ind", "contextualSpacing",
    "mirrorIndents", "suppressOverlap", "jc", "textDirection", "textAlignment", "textboxTightWrap", "outlineLvl",
    "divId", "cnfStyle", "rPr", "sectPr", "pPrChange",
)


def _writer_upsert_ppr_empty(paragraph: str, tag: str, replacement: str) -> str:
    """Replace the w:<tag> child of w:pPr, or insert it where the OOXML schema order puts it (never twice)."""
    ppr = re.search(r"<w:pPr\b[^>]*>[\s\S]*?</w:pPr\s*>", paragraph, re.IGNORECASE)
    if ppr:
        block = ppr.group(0)
        # `<w:tag .../>` or `<w:tag ...>...</w:tag>`; \b keeps `ind` from matching `indent...`, count=1 keeps the first
        pattern = rf"<w:{tag}\b[^>]*?(?:/>|>[\s\S]*?</w:{tag}\s*>)"
        updated, replaced = re.subn(pattern, lambda _m: replacement, block, count=1, flags=re.IGNORECASE)
        if replaced == 0:
            wanted = _PPR_CHILD_ORDER.index(tag) if tag in _PPR_CHILD_ORDER else len(_PPR_CHILD_ORDER)
            insert_at = None
            inner_start = re.match(r"<w:pPr\b[^>]*>", block, re.IGNORECASE).end()
            for child in re.finditer(r"<w:([A-Za-z]+)\b[^>]*?(?:/>|>[\s\S]*?</w:\1\s*>)", block[inner_start:], re.IGNORECASE):
                name = child.group(1)
                if name in _PPR_CHILD_ORDER and _PPR_CHILD_ORDER.index(name) > wanted:
                    insert_at = inner_start + child.start()
                    break
            if insert_at is None:
                insert_at = block.lower().rfind("</w:ppr")
            updated = block[:insert_at] + replacement + block[insert_at:]
        return paragraph[:ppr.start()] + updated + paragraph[ppr.end():]
    return re.sub(r"(<w:p\b[^>]*>)", rf"\1<w:pPr>{replacement}</w:pPr>", paragraph, count=1, flags=re.IGNORECASE)


def _writer_html_plain(inner: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", inner)).strip()


def _writer_export_zone_html(source_html: str | None, kind: str) -> str | None:
    if not source_html:
        return None
    meta_match = re.search(
        r"<!--vno-sections-meta:\s*(\[.*?\])\s*-->",
        source_html, re.IGNORECASE | re.DOTALL,
    )
    if not meta_match:
        return None
    try:
        sections = json.loads(meta_match.group(1))
    except (TypeError, ValueError):
        return None
    if not isinstance(sections, list):
        return None
    active = next(
        (item for item in sections if isinstance(item, dict) and item.get("active")),
        next((item for item in sections if isinstance(item, dict)), None),
    )
    if not active:
        return None
    header_footer = active.get("headerFooter") or {}
    if kind in header_footer:
        return str(header_footer.get(kind) or "")
    variants = header_footer.get("headers" if kind == "header" else "footers") or {}
    if isinstance(variants, dict) and "default" in variants:
        return str(variants.get("default") or "")
    return None


def _writer_zone_visible_text(inner: str) -> str:
    """Return comparable visible text for header/footer HTML and OOXML parts."""
    value = re.sub(r"<br\b[^>]*?/?>", " ", inner or "", flags=re.IGNORECASE)
    value = re.sub(r"</(?:p|div|li|h[1-6])\s*>", " ", value, flags=re.IGNORECASE)
    value = html.unescape(re.sub(r"<[^>]+>", "", value))
    return re.sub(r"\s+", " ", value).strip()


def _writer_ooxml_part_visible_text(part_xml: str) -> str:
    paragraphs = re.findall(r"<w:p\b[^>]*>([\s\S]*?)</w:p\s*>", part_xml or "", re.IGNORECASE)
    if not paragraphs:
        paragraphs = [part_xml or ""]
    texts = [
        html.unescape("".join(re.findall(r"<w:t\b[^>]*>([\s\S]*?)</w:t\s*>", paragraph, re.IGNORECASE)))
        for paragraph in paragraphs
    ]
    return re.sub(r"\s+", " ", " ".join(texts)).strip()


def _writer_header_footer_export_matches(
    docx_bytes: bytes, kind: str, desired_html: str,
) -> bytes | None:
    """Find a converted header/footer part whose visible text matches the HTML export."""
    desired_text = _writer_zone_visible_text(desired_html)
    if not desired_text:
        return None
    with zipfile.ZipFile(io.BytesIO(docx_bytes), "r") as package:
        names = sorted(
            name for name in package.namelist()
            if re.fullmatch(rf"word/{kind}\d+\.xml", name, re.IGNORECASE)
        )
        for name in names:
            part = package.read(name)
            part_xml = part.decode("utf-8", errors="replace")
            # Relationship-bearing parts need their own rels/dependencies copied
            # as a set. Keep the original in that case; plain text/field edits are
            # safe to overlay directly onto its existing relationship target.
            if re.search(r"\br:(?:embed|id|link)=", part_xml, re.IGNORECASE):
                continue
            if _writer_ooxml_part_visible_text(part_xml) == desired_text:
                return part
    return None


def _writer_clear_header_footer_part(part_bytes: bytes, root_name: str) -> bytes:
    part_xml = part_bytes.decode("utf-8", errors="replace")
    root = re.search(rf"(<w:{root_name}\b[^>]*>)[\s\S]*?(</w:{root_name}\s*>)", part_xml, re.IGNORECASE)
    if not root:
        return part_bytes
    cleared = part_xml[:root.start()] + root.group(1) + "<w:p/>" + root.group(2) + part_xml[root.end():]
    return cleared.encode("utf-8")


def _writer_zone_html_tokens(inner: str) -> tuple[list[str], list[str]]:
    fields: list[str] = []

    def mark_field(match: re.Match) -> str:
        fields.append(match.group(1).upper())
        return f"\ue000{len(fields) - 1}\ue001"

    marked = re.sub(
        r"<span\b(?=[^>]*\bdata-vno-field=[\"'](PAGE|NUMPAGES)[\"'])[^>]*>[\s\S]*?</span\s*>",
        mark_field, inner or "", flags=re.IGNORECASE,
    )
    normalized = _writer_zone_visible_text(marked)
    segments: list[str] = []
    cursor = 0
    for token in re.finditer(r"\ue000(\d+)\ue001", normalized):
        segments.append(normalized[cursor:token.start()])
        cursor = token.end()
    segments.append(normalized[cursor:])
    return segments, fields


def _writer_ooxml_field_ranges(part_xml: str) -> list[tuple[int, int, str]]:
    ranges: list[tuple[int, int, str]] = []
    simple_fields = re.finditer(
        r"<w:fldSimple\b([^>]*)>[\s\S]*?</w:fldSimple\s*>", part_xml, re.IGNORECASE,
    )
    for match in simple_fields:
        instruction = re.search(r"\bw:instr=[\"']([^\"']*)[\"']", match.group(1), re.IGNORECASE)
        field_name = re.search(r"\b(PAGE|NUMPAGES)\b", instruction.group(1), re.IGNORECASE) if instruction else None
        if field_name:
            ranges.append((match.start(), match.end(), field_name.group(1).upper()))

    token_re = re.compile(
        r"<w:fldChar\b[^>]*>|<w:instrText\b[^>]*>[\s\S]*?</w:instrText\s*>",
        re.IGNORECASE,
    )
    stack: list[dict[str, object]] = []
    for match in token_re.finditer(part_xml):
        token = match.group(0)
        if "fldChar" in token:
            kind = re.search(r"\bw:fldCharType=[\"']([^\"']+)[\"']", token, re.IGNORECASE)
            field_state = kind.group(1).lower() if kind else ""
            if field_state == "begin":
                stack.append({"start": match.start(), "name": "", "depth": 0})
            elif field_state == "end" and stack:
                field = stack.pop()
                if field.get("name"):
                    ranges.append((int(field["start"]), match.end(), str(field["name"])))
        elif stack:
            field_name = re.search(r"\b(PAGE|NUMPAGES)\b", _unescape_xml(token), re.IGNORECASE)
            if field_name:
                stack[-1]["name"] = field_name.group(1).upper()

    ranges.sort(key=lambda item: item[0])
    non_overlapping: list[tuple[int, int, str]] = []
    for item in ranges:
        if non_overlapping and item[0] < non_overlapping[-1][1]:
            continue
        non_overlapping.append(item)
    return non_overlapping


def _writer_patch_header_footer_text(part_bytes: bytes, kind: str, desired_html: str) -> bytes | None:
    """Patch visible zone text while retaining source run formatting and field markup."""
    root_name = "hdr" if kind == "header" else "ftr"
    part_xml = part_bytes.decode("utf-8", errors="replace")
    root = re.search(rf"<w:{root_name}\b[^>]*>[\s\S]*?</w:{root_name}\s*>", part_xml, re.IGNORECASE)
    if not root:
        return None
    desired_segments, desired_fields = _writer_zone_html_tokens(desired_html)
    if not any(desired_segments) and not desired_fields:
        return _writer_clear_header_footer_part(part_bytes, root_name)
    xml = root.group(0)
    field_ranges = _writer_ooxml_field_ranges(xml)
    source_fields = [name for _start, _end, name in field_ranges]
    if source_fields != desired_fields:
        return None

    segments: list[tuple[int, int, list[re.Match]]] = []
    segment_start = 0
    for start, end, _name in field_ranges:
        text_nodes = [
            match for match in re.finditer(r"<w:t\b([^>]*)>([\s\S]*?)</w:t\s*>", xml, re.IGNORECASE)
            if segment_start <= match.start() and match.end() <= start
        ]
        segments.append((segment_start, start, text_nodes))
        segment_start = end
    text_nodes = [
        match for match in re.finditer(r"<w:t\b([^>]*)>([\s\S]*?)</w:t\s*>", xml, re.IGNORECASE)
        if segment_start <= match.start() and match.end() <= len(xml)
    ]
    segments.append((segment_start, len(xml), text_nodes))
    if len(segments) != len(desired_segments):
        return None

    result = xml
    for (_start, _end, nodes), value in reversed(list(zip(segments, desired_segments))):
        if value and not nodes:
            return None
        for index, node in reversed(list(enumerate(nodes))):
            replacement_text = value if index == 0 else ""
            attrs = node.group(1)
            if replacement_text[:1].isspace() or replacement_text[-1:].isspace():
                if not re.search(r"\bxml:space=[\"']preserve[\"']", attrs, re.IGNORECASE):
                    attrs += ' xml:space="preserve"'
            replacement = f"<w:t{attrs}>{html.escape(replacement_text, quote=False)}</w:t>"
            result = result[:node.start()] + replacement + result[node.end():]
    return (part_xml[:root.start()] + result + part_xml[root.end():]).encode("utf-8")


def _writer_section_zone_value(section: dict, kind: str, variant: str) -> str | None:
    header_footer = section.get("headerFooter") or {}
    variants = header_footer.get("headers" if kind == "header" else "footers") or {}
    if isinstance(variants, dict) and variant in variants:
        return str(variants.get(variant) or "")
    if variant == "default" and kind in header_footer:
        return str(header_footer.get(kind) or "")
    return None


def _writer_apply_section_header_footer_metadata(
    document_xml: str,
    source_docx: bytes,
    source_html: str | None,
    source_rels: dict[str, str],
    rid_map: dict[str, str],
    converted_rels_xml: str,
    replacements: dict[str, bytes],
    existing_entries: set[str],
) -> tuple[str, str, list[str]]:
    if not source_html:
        return document_xml, converted_rels_xml, []
    meta_match = re.search(
        r"<!--vno-sections-meta:\s*(\[.*?\])\s*-->",
        source_html, re.IGNORECASE | re.DOTALL,
    )
    if not meta_match:
        return document_xml, converted_rels_xml, []
    try:
        metadata = json.loads(meta_match.group(1))
    except (TypeError, ValueError):
        return document_xml, converted_rels_xml, []
    if not isinstance(metadata, list):
        return document_xml, converted_rels_xml, []
    metadata = [item for item in metadata if isinstance(item, dict)]
    source_xml_bytes = read_zip_entry(source_docx, "word/document.xml")
    if not source_xml_bytes:
        return document_xml, converted_rels_xml, []
    source_xml = source_xml_bytes.decode("utf-8", errors="replace")
    source_sections = list(re.finditer(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", source_xml, re.IGNORECASE))
    output_sections = list(re.finditer(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", document_xml, re.IGNORECASE))
    if len(source_sections) != len(metadata) or len(output_sections) != len(metadata):
        return document_xml, converted_rels_xml, []

    requests: list[dict[str, object]] = []
    reference_re = re.compile(r"<w:(headerReference|footerReference)\b([^>]*)/?>", re.IGNORECASE)
    for index, (source_section, section_meta) in enumerate(zip(source_sections, metadata)):
        for ref in reference_re.finditer(source_section.group(0)):
            tag = ref.group(1).lower()
            attrs = ref.group(2)
            rel_match = re.search(r"\br:id=[\"']([^\"']+)[\"']", attrs, re.IGNORECASE)
            if not rel_match:
                continue
            source_rid = rel_match.group(1)
            variant_match = re.search(r"\bw:type=[\"']([^\"']+)[\"']", attrs, re.IGNORECASE)
            variant = (variant_match.group(1).lower() if variant_match else "default")
            kind = "header" if tag == "headerreference" else "footer"
            desired_html = _writer_section_zone_value(section_meta, kind, variant)
            if desired_html is None:
                continue
            target = source_rels.get(source_rid, "")
            entry = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("word", target))
            source_part = read_zip_entry(source_docx, entry)
            if not source_part:
                continue
            source_part_xml = source_part.decode("utf-8", errors="replace")
            if _writer_ooxml_part_visible_text(source_part_xml) == _writer_zone_visible_text(desired_html):
                patched_part = source_part
            else:
                patched_part = _writer_patch_header_footer_text(source_part, kind, desired_html)
                if patched_part is None:
                    raise ValueError(
                        f"Writer đã sửa {kind} nhưng không thể ánh xạ an toàn nội dung/field vào part DOCX hiện có."
                    )
            requests.append({
                "section": index, "tag": tag, "variant": variant,
                "source_rid": source_rid, "entry": entry,
                "kind": kind, "part": patched_part,
            })

    if not requests:
        return document_xml, converted_rels_xml, []

    mapped_rid_numbers = [
        int(match.group(1))
        for value in rid_map.values()
        if (match := re.fullmatch(r"rId(\d+)", value, re.IGNORECASE))
    ]
    next_rid = max(_max_rels_rid(converted_rels_xml), max(mapped_rid_numbers, default=0)) + 1
    grouped: dict[tuple[str, str], list[bytes]] = {}
    source_parts: dict[tuple[str, str], bytes] = {}
    for request in requests:
        key = (str(request["kind"]), str(request["source_rid"]))
        source_parts[key] = read_zip_entry(source_docx, str(request["entry"])) or b""
        value = bytes(request["part"])
        if value not in grouped.setdefault(key, []):
            grouped[key].append(value)

    rid_by_request: dict[tuple[int, str, str, str], str] = {}
    duplicate_entries: list[str] = []
    used_entries = set(existing_entries) | set(replacements)
    for key, contents in grouped.items():
        kind, source_rid = key
        original_entry = next(str(r["entry"]) for r in requests if (str(r["kind"]), str(r["source_rid"])) == key)
        original_bytes = source_parts[key]
        base_rid = rid_map.get(source_rid, source_rid)
        if original_bytes in contents:
            contents.remove(original_bytes)
            base_content = original_bytes
        elif contents:
            base_content = contents.pop(0)
        else:
            base_content = original_bytes
        replacements[original_entry] = base_content
        content_to_rid = {base_content: base_rid}
        for content in contents:
            existing_indexes = [
                int(value) for name in used_entries
                if re.fullmatch(rf"word/{kind}(\d+)\.xml", name, re.IGNORECASE)
                for value in [re.fullmatch(rf"word/{kind}(\d+)\.xml", name, re.IGNORECASE).group(1)]
            ]
            next_index = max(existing_indexes, default=0) + 1
            entry = f"word/{kind}{next_index}.xml"
            while entry in used_entries:
                next_index += 1
                entry = f"word/{kind}{next_index}.xml"
            used_entries.add(entry)
            duplicate_entries.append(entry)
            replacements[entry] = content
            rel_type = _DOCX_HEADER_REL_TYPE if kind == "header" else _DOCX_FOOTER_REL_TYPE
            new_rid = f"rId{next_rid}"
            next_rid += 1
            converted_rels_xml = _add_rels_entry(converted_rels_xml, new_rid, rel_type, entry.replace("word/", "", 1))
            content_to_rid[content] = new_rid
        for request in requests:
            if (str(request["kind"]), str(request["source_rid"])) != key:
                continue
            rid_by_request[(int(request["section"]), str(request["tag"]), str(request["variant"]), source_rid)] = content_to_rid[bytes(request["part"])]

    updated_sections: list[str] = []
    for index, output_section in enumerate(output_sections):
        section_xml = output_section.group(0)
        source_section = source_sections[index].group(0)
        source_refs = list(reference_re.finditer(source_section))
        for source_ref in reversed(source_refs):
            tag = source_ref.group(1).lower()
            attrs = source_ref.group(2)
            source_rid_match = re.search(r"\br:id=[\"']([^\"']+)[\"']", attrs, re.IGNORECASE)
            if not source_rid_match:
                continue
            variant_match = re.search(r"\bw:type=[\"']([^\"']+)[\"']", attrs, re.IGNORECASE)
            variant = variant_match.group(1).lower() if variant_match else "default"
            key = (index, tag, variant, source_rid_match.group(1))
            target_rid = rid_by_request.get(key)
            if not target_rid:
                continue
            updated_ref = re.sub(
                r"\br:id=[\"'][^\"']+[\"']", f'r:id="{target_rid}"',
                source_ref.group(0), count=1, flags=re.IGNORECASE,
            )
            current_ref = next((
                match for match in re.finditer(rf"<w:{re.escape(tag)}\b[^>]*/?>", section_xml, re.IGNORECASE)
                if (re.search(r"\bw:type=[\"']([^\"']+)[\"']", match.group(0), re.IGNORECASE) or [None, "default"])[1].lower() == variant
            ), None)
            if current_ref:
                section_xml = section_xml[:current_ref.start()] + updated_ref + section_xml[current_ref.end():]
        updated_sections.append(section_xml)
    result = document_xml
    for output_section, replacement in reversed(list(zip(output_sections, updated_sections))):
        result = result[:output_section.start()] + replacement + result[output_section.end():]
    return result, converted_rels_xml, duplicate_entries


_TAB_ALIGN_OOXML = {"l": "left", "c": "center", "r": "right"}
_TAB_LEADER_OOXML = {"d": "dot", "h": "hyphen", "u": "underscore"}


def _writer_tabs_xml(value: str) -> str:
    """data-vno-tabs="8:l:n;15.5:r:d" (cm:căn:ký tự dẫn) -> <w:tabs>…</w:tabs>; rỗng nếu không có mục hợp lệ."""
    items: list[tuple[int, str]] = []
    for part in str(value or "").split(";"):
        fields = part.split(":")
        try:
            twips = round(float(fields[0].replace(",", ".")) / 2.54 * 1440)
        except (ValueError, IndexError):
            continue
        if twips <= 0:
            continue
        align = _TAB_ALIGN_OOXML.get(fields[1] if len(fields) > 1 else "l", "left")
        leader = _TAB_LEADER_OOXML.get(fields[2] if len(fields) > 2 else "n")
        leader_attr = f' w:leader="{leader}"' if leader else ""
        items.append((twips, f'<w:tab w:val="{align}"{leader_attr} w:pos="{twips}"/>'))
    items.sort()
    return "<w:tabs>" + "".join(xml for _, xml in items) + "</w:tabs>" if items else ""


def _writer_restore_created_paragraph_css(document_xml: str, source_html: str) -> str:
    """Restore basic paragraph properties that LibreOffice's HTML filter drops."""
    by_text: dict[str, dict[str, str]] = {}

    def css_length_twips(value: str) -> str | None:
        match = re.fullmatch(r"\s*(-?(?:\d+\.?\d*|\.\d+))\s*(pt|px|cm|mm|in)\s*", value, re.IGNORECASE)
        if not match:
            return None
        number = float(match.group(1))
        unit = match.group(2).lower()
        points = number * {"pt": 1.0, "px": 0.75, "in": 72.0, "cm": 72.0 / 2.54, "mm": 72.0 / 25.4}[unit]
        return str(round(points * 20))

    for match in re.finditer(r"<(p|h[1-6])\b([^>]*)>([\s\S]*?)</\1\s*>", source_html, re.IGNORECASE):
        attrs, inner = match.group(2), match.group(3)
        style_match = re.search(r"\bstyle\s*=\s*([\"'])(.*?)\1", attrs, re.IGNORECASE)
        tabs_match = re.search(r"\bdata-vno-tabs\s*=\s*([\"'])(.*?)\1", attrs, re.IGNORECASE)
        outline_match = re.search(r"\bdata-vno-outline\s*=\s*([\"'])([1-9])\1", attrs, re.IGNORECASE)
        if not style_match and not tabs_match and not outline_match:
            continue
        text = re.sub(r"\s+", " ", _writer_html_plain(inner)).strip()
        if not text:
            continue
        css = style_match.group(2) if style_match else ""
        properties: dict[str, str] = {}
        tabs_xml = _writer_tabs_xml(tabs_match.group(2)) if tabs_match else ""
        if tabs_xml:
            properties["tabs_xml"] = tabs_xml
        if outline_match:
            properties["outline_xml"] = f'<w:outlineLvl w:val="{int(outline_match.group(2)) - 1}"/>'
        align =re.search(r"(?:^|;)\s*text-align\s*:\s*(left|right|center|justify)(?:\s*!important)?\s*(?:;|$)", css, re.IGNORECASE)
        if align:
            properties["alignment"] = {"left": "left", "right": "right", "center": "center", "justify": "both"}[align.group(1).lower()]
        line = re.search(r"(?:^|;)\s*line-height\s*:\s*([\d.]+)\s*(pt|px)(?:\s*!important)?\s*(?:;|$)", css, re.IGNORECASE)
        if line:
            points = float(line.group(1)) * (0.75 if line.group(2).lower() == "px" else 1.0)
            properties["exact_line_twips"] = str(round(points * 20))
        for css_name, property_name in (("margin-top", "before_twips"), ("margin-bottom", "after_twips")):
            spacing = re.search(
                rf"(?:^|;)\s*{re.escape(css_name)}\s*:\s*([^;]+)", css, re.IGNORECASE,
            )
            if spacing:
                twips = css_length_twips(spacing.group(1))
                if twips is not None:
                    properties[property_name] = twips
        indent = re.search(r"(?:^|;)\s*text-indent\s*:\s*([^;]+)", css, re.IGNORECASE)
        if indent:
            twips = css_length_twips(indent.group(1))
            if twips is not None:
                properties["first_line_twips"] = twips
        m_left = re.search(r"(?:^|;)\s*margin-left\s*:\s*([^;]+)", css, re.IGNORECASE)
        if m_left:
            twips = css_length_twips(m_left.group(1))
            if twips is not None:
                properties["left_indent_twips"] = twips
        m_right = re.search(r"(?:^|;)\s*margin-right\s*:\s*([^;]+)", css, re.IGNORECASE)
        if m_right:
            twips = css_length_twips(m_right.group(1))
            if twips is not None:
                properties["right_indent_twips"] = twips
        if properties:
            by_text[text] = properties

    def patch_paragraph(match: re.Match) -> str:
        paragraph = match.group(0)
        text = re.sub(r"\s+", " ", _paragraph_plain_text(paragraph)).strip()
        props = by_text.get(text)
        if not props:
            return paragraph
        if props.get("alignment"):
            paragraph = _writer_upsert_ppr_empty(paragraph, "jc", f'<w:jc w:val="{props["alignment"]}"/>')
        if props.get("tabs_xml"):
            paragraph = _writer_upsert_ppr_empty(paragraph, "tabs", props["tabs_xml"])
        if props.get("outline_xml"):
            paragraph = _writer_upsert_ppr_empty(paragraph, "outlineLvl", props["outline_xml"])
        ind_attrs = []
        if props.get("left_indent_twips") is not None:
            ind_attrs.append(f'w:left="{props["left_indent_twips"]}"')
        if props.get("right_indent_twips") is not None:
            ind_attrs.append(f'w:right="{props["right_indent_twips"]}"')
        if props.get("first_line_twips") is not None:
            ind_attrs.append(f'w:firstLine="{props["first_line_twips"]}"')
        if ind_attrs:
            ind_match = re.search(r"<w:ind\b[^>]*/>", paragraph, re.IGNORECASE)
            if ind_match:
                tag = ind_match.group(0)
                for item in ind_attrs:
                    k, v = item.split("=")
                    attr = re.compile(rf"\b{k}=[\"'][^\"']*[\"']", re.IGNORECASE)
                    tag = attr.sub(f'{k}={v}', tag) if attr.search(tag) else tag[:-2] + f" {k}={v}/>"
                paragraph = paragraph[:ind_match.start()] + tag + paragraph[ind_match.end():]
            else:
                paragraph = _writer_upsert_ppr_empty(paragraph, "ind", f"<w:ind {' '.join(ind_attrs)}/>")
        spacing_values = {"before": props.get("before_twips"), "after": props.get("after_twips")}
        spacing_values = {name: value for name, value in spacing_values.items() if value is not None}
        if spacing_values:
            spacing = re.search(r"<w:spacing\b[^>]*/>", paragraph, re.IGNORECASE)
            if spacing:
                tag = spacing.group(0)
                for name, value in spacing_values.items():
                    attr = re.compile(rf"\bw:{name}=[\"'][^\"']*[\"']", re.IGNORECASE)
                    replacement = f'w:{name}="{value}"'
                    tag = attr.sub(replacement, tag) if attr.search(tag) else tag[:-2] + f" {replacement}/>"
                paragraph = paragraph[:spacing.start()] + tag + paragraph[spacing.end():]
            else:
                attrs = " ".join(f'w:{name}="{value}"' for name, value in spacing_values.items())
                paragraph = _writer_upsert_ppr_empty(paragraph, "spacing", f"<w:spacing {attrs}/>")
        exact_line = props.get("exact_line_twips")
        if exact_line:
            spacing = re.search(r"<w:spacing\b[^>]*/>", paragraph, re.IGNORECASE)
            if spacing:
                tag = spacing.group(0)
                for name, value in (("line", exact_line), ("lineRule", "exact")):
                    attr = re.compile(rf'\bw:{name}=(?:[\"\'])[^\"\']*[\"\']', re.IGNORECASE)
                    replacement = f'w:{name}="{value}"'
                    tag = attr.sub(replacement, tag) if attr.search(tag) else tag[:-2] + f' {replacement}/>'
                paragraph = paragraph[:spacing.start()] + tag + paragraph[spacing.end():]
            else:
                paragraph = _writer_upsert_ppr_empty(
                    paragraph, "spacing", f'<w:spacing w:line="{exact_line}" w:lineRule="exact"/>'
                )
        return paragraph

    return re.sub(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", patch_paragraph, document_xml, flags=re.IGNORECASE)


def _writer_restore_created_run_highlight(run_xml: str, highlighted_texts: dict[str, str]) -> str:
    text = html.unescape("".join(re.findall(r"<w:t\b[^>]*>([\s\S]*?)</w:t\s*>", run_xml, re.IGNORECASE)))
    if not text or re.search(r"<w:highlight\b", run_xml, re.IGNORECASE):
        return run_xml
    color = next((value for key, value in highlighted_texts.items() if text.strip() == key), None)
    if not color:
        return run_xml
    run_xml = re.sub(r"<w:shd\b[^>]*/>", "", run_xml, flags=re.IGNORECASE)
    highlight = f'<w:highlight w:val="{color}"/>'
    if re.search(r"<w:rPr\b[^>]*/>", run_xml, re.IGNORECASE):
        run_xml = re.sub(r"<w:rPr\b[^>]*/>", f"<w:rPr>{highlight}</w:rPr>", run_xml, count=1, flags=re.IGNORECASE)
    elif re.search(r"<w:rPr\b[^>]*>", run_xml, re.IGNORECASE):
        run_xml = re.sub(r"(<w:rPr\b[^>]*>)", rf"\1{highlight}", run_xml, count=1, flags=re.IGNORECASE)
    else:
        run_xml = re.sub(r"(<w:r\b[^>]*>)", rf"\1<w:rPr>{highlight}</w:rPr>", run_xml, count=1, flags=re.IGNORECASE)
    return run_xml


class _WriterExportListParser(HTMLParser):
    """Collect direct list-item text without confusing it with nested items."""

    _PRESET_BY_CLASS = {
        "vno-ml-decimal": "decimal",
        "vno-ml-letter": "letter",
        "vno-ml-nd30": "nd30",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.list_stack: list[dict] = []
        self.item_stack: list[dict] = []
        self.groups: dict[int, dict] = {}
        self._next_group = 1

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_map = {name.casefold(): (value or "") for name, value in attrs}
        if tag.casefold() == "ol":
            classes = attrs_map.get("class", "").split()
            preset = next((self._PRESET_BY_CLASS[name] for name in classes if name in self._PRESET_BY_CLASS), "")
            inherited = self.list_stack[-1] if self.list_stack else None
            if not preset and attrs_map.get("type") == "a":
                preset = "lower-alpha"
            if not preset and inherited:
                preset = inherited["preset"]
            if inherited and inherited["preset"] == preset:
                group_id = inherited["group_id"]
                depth = inherited["depth"] + 1
            else:
                group_id = self._next_group
                self._next_group += 1
                depth = 0
                self.groups[group_id] = {"preset": preset, "items": []}
            self.list_stack.append({"preset": preset, "group_id": group_id, "depth": depth})
        elif tag.casefold() == "li" and self.list_stack:
            current = self.list_stack[-1]
            item = {"text_parts": [], "depth": current["depth"], "group_id": current["group_id"]}
            self.item_stack.append(item)
            self.groups[current["group_id"]]["items"].append(item)

    def handle_endtag(self, tag: str) -> None:
        if tag.casefold() == "li" and self.item_stack:
            self.item_stack.pop()
        elif tag.casefold() == "ol" and self.list_stack:
            self.list_stack.pop()

    def handle_data(self, data: str) -> None:
        if self.item_stack:
            self.item_stack[-1]["text_parts"].append(data)

    def result(self) -> list[dict]:
        groups = []
        for group in self.groups.values():
            if not group["preset"]:
                continue
            items = []
            for item in group["items"]:
                text = re.sub(r"\s+", " ", "".join(item["text_parts"])).strip()
                if text:
                    items.append({"text": text, "depth": item["depth"]})
            if items:
                groups.append({"preset": group["preset"], "items": items})
        return groups


def _writer_list_level_format(preset: str, level: int) -> tuple[str, str] | None:
    """Return Word numFmt/lvlText for the three list presets shown by Writer."""
    formats = {
        "decimal": [("decimal", "%1."), ("decimal", "%1.%2."), ("decimal", "%1.%2.%3.")],
        "letter": [("decimal", "%1."), ("lowerLetter", "%2."), ("lowerRoman", "%3.")],
        "nd30": [("decimal", "Điều %1."), ("decimal", "%2."), ("lowerLetter", "%3)")],
        "lower-alpha": [("lowerLetter", "%1)")],
    }
    levels = formats.get(preset, [])
    return levels[level] if 0 <= level < len(levels) else None


def _writer_clone_lower_alpha_suffix(document_xml: str, numbering_xml: str, source_html: str) -> tuple[str, str]:
    """Restore semantic multilevel numbering lost by LibreOffice's HTML filter.

    Writer already owns the requested presets and its FODT serializer expresses
    them as decimal/lowerLetter/lowerRoman.  Production Save currently goes via
    LibreOffice HTML import, which preserves numId/ilvl but flattens every level
    to decimal.  Clone only the affected abstractNum and keep soffice's layout.
    """
    parser = _WriterExportListParser()
    try:
        parser.feed(source_html)
        groups = parser.result()
    except (TypeError, ValueError):
        groups = []
    if not groups:
        return document_xml, numbering_xml

    abstract_ids = [int(value[1]) for value in re.findall(
        r"<w:abstractNum\b[^>]*w:abstractNumId=([\"'])(\d+)\1", numbering_xml, re.IGNORECASE
    )]
    num_ids = [int(value[1]) for value in re.findall(
        r"<w:num\b[^>]*w:numId=([\"'])(\d+)\1", numbering_xml, re.IGNORECASE
    )]
    next_abstract_id = max(abstract_ids, default=0) + 1
    next_num_id = max(num_ids, default=0) + 1

    paragraphs = [match.group(0) for match in re.finditer(
        r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", document_xml, re.IGNORECASE
    )]
    paragraph_replacements: dict[int, str] = {}
    search_from = 0
    new_abstracts: list[str] = []
    new_nums: list[str] = []

    for group in groups:
        matched: list[tuple[int, dict, str]] = []
        cursor = search_from
        for item in group["items"]:
            found = None
            for index in range(cursor, len(paragraphs)):
                paragraph = paragraphs[index]
                if _paragraph_plain_text(paragraph).strip() != item["text"]:
                    continue
                num_id = re.search(r"<w:numId\b[^>]*w:val=([\"'])(\d+)\1", paragraph, re.IGNORECASE)
                if num_id:
                    found = (index, item, num_id.group(2))
                    break
            if found is None:
                matched = []
                break
            matched.append(found)
            cursor = found[0] + 1
        if not matched:
            continue
        search_from = matched[-1][0] + 1
        source_num_id = matched[0][2]
        num = re.search(
            rf"<w:num\b[^>]*w:numId=([\"']){re.escape(source_num_id)}\1[^>]*>[\s\S]*?</w:num\s*>",
            numbering_xml, re.IGNORECASE,
        )
        abstract_id = re.search(
            r"<w:abstractNumId\b[^>]*w:val=([\"'])(\d+)\1", num.group(0), re.IGNORECASE
        ) if num else None
        abstract = re.search(
            rf"<w:abstractNum\b[^>]*w:abstractNumId=([\"']){abstract_id.group(2)}\1[^>]*>[\s\S]*?</w:abstractNum\s*>",
            numbering_xml, re.IGNORECASE,
        ) if abstract_id else None
        if not abstract:
            continue

        new_abstract_id = next_abstract_id
        new_group_num_id = next_num_id
        next_abstract_id += 1
        next_num_id += 1
        cloned = re.sub(
            r"(w:abstractNumId=)([\"'])\d+\2", rf'\g<1>"{new_abstract_id}"',
            abstract.group(0), count=1, flags=re.IGNORECASE,
        )

        def patch_level(match: re.Match) -> str:
            level_xml = match.group(0)
            level_id = int(match.group(2))
            requested = _writer_list_level_format(group["preset"], level_id)
            if not requested:
                return level_xml
            num_fmt, level_text = requested
            level_xml = re.sub(
                r"<w:numFmt\b[^>]*/>", f'<w:numFmt w:val="{num_fmt}"/>',
                level_xml, count=1, flags=re.IGNORECASE,
            )
            level_xml = re.sub(
                r"<w:lvlText\b[^>]*/>", f'<w:lvlText w:val="{html.escape(level_text, quote=True)}"/>',
                level_xml, count=1, flags=re.IGNORECASE,
            )
            return level_xml

        cloned = re.sub(
            r"<w:lvl\b[^>]*w:ilvl=([\"'])(\d+)\1[^>]*>[\s\S]*?</w:lvl\s*>",
            patch_level, cloned, flags=re.IGNORECASE,
        )
        new_abstracts.append(cloned)
        new_nums.append(
            f'<w:num w:numId="{new_group_num_id}"><w:abstractNumId w:val="{new_abstract_id}"/></w:num>'
        )
        for index, _item, _old_num_id in matched:
            paragraph_replacements[index] = re.sub(
                r"(<w:numId\b[^>]*w:val=)([\"'])\d+\2",
                rf'\g<1>"{new_group_num_id}"', paragraphs[index], count=1, flags=re.IGNORECASE,
            )

    if not new_abstracts:
        return document_xml, numbering_xml
    first_num = re.search(r"<w:num\b", numbering_xml, re.IGNORECASE)
    abstract_insert = first_num.start() if first_num else numbering_xml.rfind("</w:numbering>")
    numbering_xml = numbering_xml[:abstract_insert] + "".join(new_abstracts) + numbering_xml[abstract_insert:]
    num_insert = numbering_xml.rfind("</w:numbering>")
    numbering_xml = numbering_xml[:num_insert] + "".join(new_nums) + numbering_xml[num_insert:]

    output: list[str] = []
    last = 0
    for index, match in enumerate(re.finditer(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", document_xml, re.IGNORECASE)):
        output.append(document_xml[last:match.start()])
        output.append(paragraph_replacements.get(index, match.group(0)))
        last = match.end()
    output.append(document_xml[last:])
    return "".join(output), numbering_xml


def _writer_restore_heading_styles(
    document_xml: str, styles_xml: str, source_html: str
) -> tuple[str, str]:
    """Keep HTML headings as Word built-in Heading 1/2/3 paragraph styles."""
    headings = [
        (int(match.group(1)), re.sub(r"\s+", " ", _writer_html_plain(match.group(2))).strip())
        for match in re.finditer(r"<h([1-3])\b[^>]*>([\s\S]*?)</h\1\s*>", source_html, re.IGNORECASE)
    ]
    headings = [(level, text) for level, text in headings if text]
    if not headings:
        return document_xml, styles_xml

    paragraph_matches = list(re.finditer(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", document_xml, re.IGNORECASE))
    toc_indexes: set[int] = set()
    toc_cursor = 0
    for toc_text in _writer_toc_fallback_texts(source_html):
        found = next((
            index for index in range(toc_cursor, len(paragraph_matches))
            if _paragraph_plain_text(paragraph_matches[index].group(0)).strip() == toc_text
        ), None)
        if found is None:
            break
        toc_indexes.add(found)
        toc_cursor = found + 1

    replacements: dict[int, str] = {}
    cursor = 0
    for level, expected in headings:
        found = next((
            index for index in range(cursor, len(paragraph_matches))
            if index not in toc_indexes
            and _paragraph_plain_text(paragraph_matches[index].group(0)).strip() == expected
        ), None)
        if found is None:
            continue
        replacements[found] = _writer_upsert_ppr_empty(
            paragraph_matches[found].group(0), "pStyle", f'<w:pStyle w:val="Heading{level}"/>'
        )
        cursor = found + 1
    if replacements:
        output: list[str] = []
        previous = 0
        for index, paragraph in enumerate(paragraph_matches):
            output.append(document_xml[previous:paragraph.start()])
            output.append(replacements.get(index, paragraph.group(0)))
            previous = paragraph.end()
        output.append(document_xml[previous:])
        document_xml = "".join(output)

    for level in sorted({level for level, _text in headings}):
        style_match = re.search(
            rf'<w:style\b(?=[^>]*\bw:type=["\']paragraph["\'])(?=[^>]*\bw:styleId=["\']Heading{level}["\'])[^>]*>[\s\S]*?</w:style\s*>',
            styles_xml, re.IGNORECASE,
        )
        outline = level - 1
        if style_match:
            style = style_match.group(0)
            if re.search(r"<w:name\b", style, re.IGNORECASE):
                style = re.sub(
                    r'<w:name\b[^>]*/>', f'<w:name w:val="Heading {level}"/>',
                    style, count=1, flags=re.IGNORECASE,
                )
            else:
                style = re.sub(
                    r"(<w:style\b[^>]*>)", rf'\1<w:name w:val="Heading {level}"/>',
                    style, count=1, flags=re.IGNORECASE,
                )
            if not re.search(r"<w:qFormat\b", style, re.IGNORECASE):
                style = re.sub(r"</w:style\s*>", "<w:qFormat/></w:style>", style, count=1, flags=re.IGNORECASE)
            ppr = re.search(r"<w:pPr\b[^>]*>[\s\S]*?</w:pPr\s*>", style, re.IGNORECASE)
            if ppr:
                updated_ppr = re.sub(
                    r'<w:outlineLvl\b[^>]*/>', f'<w:outlineLvl w:val="{outline}"/>',
                    ppr.group(0), count=1, flags=re.IGNORECASE,
                )
                if updated_ppr == ppr.group(0):
                    updated_ppr = re.sub(
                        r"</w:pPr\s*>", f'<w:outlineLvl w:val="{outline}"/></w:pPr>',
                        updated_ppr, count=1, flags=re.IGNORECASE,
                    )
                style = style[:ppr.start()] + updated_ppr + style[ppr.end():]
            else:
                style = re.sub(
                    r"(<w:rPr\b|</w:style\s*>)",
                    f'<w:pPr><w:outlineLvl w:val="{outline}"/></w:pPr>\\1',
                    style, count=1, flags=re.IGNORECASE,
                )
            styles_xml = styles_xml[:style_match.start()] + style + styles_xml[style_match.end():]
        else:
            style = (
                f'<w:style w:type="paragraph" w:styleId="Heading{level}">'
                f'<w:name w:val="Heading {level}"/><w:basedOn w:val="Normal"/>'
                f'<w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/>'
                f'<w:outlineLvl w:val="{outline}"/></w:pPr></w:style>'
            )
            close = styles_xml.rfind("</w:styles>")
            if close >= 0:
                styles_xml = styles_xml[:close] + style + styles_xml[close:]
    return document_xml, styles_xml


def _writer_balanced_html_element(source: str, start: int, tag: str) -> str:
    token_re = re.compile(rf"</?{re.escape(tag)}\b[^>]*>", re.IGNORECASE)
    depth = 0
    for token in token_re.finditer(source, start):
        if token.group(0).startswith("</"):
            depth -= 1
            if depth == 0:
                return source[start:token.end()]
        elif not token.group(0).rstrip().endswith("/>"):
            depth += 1
    return ""


def _writer_toc_fallback_texts(source_html: str) -> list[str]:
    marker = re.search(
        r'<div\b(?=[^>]*\bdata-vno-toc\s*=\s*(["\'])true\1)[^>]*>',
        source_html, re.IGNORECASE,
    )
    if not marker:
        return []
    block = _writer_balanced_html_element(source_html, marker.start(), "div")
    if not block:
        return []
    paragraphs = [
        re.sub(r"\s+", " ", _writer_html_plain(match.group(1))).strip()
        for match in re.finditer(r"<p\b[^>]*>([\s\S]*?)</p\s*>", block, re.IGNORECASE)
    ]
    paragraphs = [text for text in paragraphs if text]
    if paragraphs:
        return paragraphs

    texts: list[str] = []
    title = re.search(
        r'<span\b(?=[^>]*\bclass=["\'][^"\']*\bvno-toc-title\b[^"\']*["\'])[^>]*>([\s\S]*?)</span\s*>',
        block, re.IGNORECASE,
    )
    if title:
        value = re.sub(r"\s+", " ", _writer_html_plain(title.group(1))).strip()
        if value:
            texts.append(value)
    for item_start in re.finditer(
        r'<div\b(?=[^>]*\bclass=["\'][^"\']*\bvno-toc-item\b[^"\']*["\'])[^>]*>',
        block, re.IGNORECASE,
    ):
        item = _writer_balanced_html_element(block, item_start.start(), "div")
        value = re.sub(r"\s+", " ", _writer_html_plain(item)).strip()
        if value:
            texts.append(value)
    return texts


def _writer_restore_toc_field(document_xml: str, source_html: str) -> str:
    """Wrap soffice's visible TOC fallback in a native complex Word TOC field."""
    if re.search(r"<w:instrText\b[^>]*>[\s\S]*?\bTOC\b", document_xml, re.IGNORECASE):
        return document_xml
    toc_texts = _writer_toc_fallback_texts(source_html)
    if not toc_texts:
        return document_xml
    paragraphs = list(re.finditer(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", document_xml, re.IGNORECASE))
    matched: list[int] = []
    cursor = 0
    for expected in toc_texts:
        found = next((
            index for index in range(cursor, len(paragraphs))
            if _paragraph_plain_text(paragraphs[index].group(0)).strip() == expected
        ), None)
        if found is None:
            return document_xml
        matched.append(found)
        cursor = found + 1
    if not matched:
        return document_xml

    begin = (
        '<w:r><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>'
        '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r>'
        '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
    )
    end = '<w:r><w:fldChar w:fldCharType="end"/></w:r>'
    first_index, last_index = matched[0], matched[-1]
    replacements: dict[int, str] = {}
    first = paragraphs[first_index].group(0)
    ppr = re.search(r"<w:pPr\b[^>]*>[\s\S]*?</w:pPr\s*>", first, re.IGNORECASE)
    insert_at = ppr.end() if ppr else re.search(r"<w:p\b[^>]*>", first, re.IGNORECASE).end()
    replacements[first_index] = first[:insert_at] + begin + first[insert_at:]
    last = replacements.get(last_index, paragraphs[last_index].group(0))
    replacements[last_index] = re.sub(r"</w:p\s*>", end + "</w:p>", last, count=1, flags=re.IGNORECASE)

    output: list[str] = []
    previous = 0
    for index, paragraph in enumerate(paragraphs):
        output.append(document_xml[previous:paragraph.start()])
        output.append(replacements.get(index, paragraph.group(0)))
        previous = paragraph.end()
    output.append(document_xml[previous:])
    return "".join(output)


def _writer_insert_page_field(footer_xml: str, field_name: str, fallback: str = "1") -> str:
    """Turn the fallback text in a page-number span into a native Word PAGE field."""
    field = (
        '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
        f'<w:r><w:instrText xml:space="preserve"> {field_name} </w:instrText></w:r>'
        '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
        f'<w:r><w:t>{html.escape(fallback)}</w:t></w:r>'
        '<w:r><w:fldChar w:fldCharType="end"/></w:r>'
    )
    paragraphs = list(re.finditer(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", footer_xml, re.IGNORECASE))
    for paragraph in paragraphs:
        block = paragraph.group(0)
        runs = list(re.finditer(r"<w:r\b[^>]*>[\s\S]*?</w:r\s*>", block, re.IGNORECASE))
        plain = html.unescape("".join(re.findall(r"<w:t\b[^>]*>([\s\S]*?)</w:t\s*>", block, re.IGNORECASE)))
        has_page_label = "Trang" in plain
        if field_name.upper() == "NUMPAGES" and has_page_label:
            target = re.search(r"/\s*" + re.escape(fallback), plain[plain.find("Trang"):], re.IGNORECASE)
            if target:
                target_start = plain.find("Trang") + target.start() + target.group(0).rfind(fallback)
            else:
                continue
        else:
            if field_name.upper() == "NUMPAGES":
                target_start = plain.rfind(fallback)
            else:
                target_start = plain.find(fallback)
            if target_start < 0:
                continue
        cursor = 0
        for run in runs:
            run_text = html.unescape("".join(re.findall(r"<w:t\b[^>]*>([\s\S]*?)</w:t\s*>", run.group(0), re.IGNORECASE)))
            run_end = cursor + len(run_text)
            if cursor <= target_start and target_start + len(fallback) <= run_end:
                local = target_start - cursor
                prefix_text = run_text[:local]
                suffix_text = run_text[local + len(fallback):]
                rpr_match = re.search(r"<w:rPr\b[^>]*/>|<w:rPr\b[^>]*>[\s\S]*?</w:rPr\s*>", run.group(0), re.IGNORECASE)
                rpr = rpr_match.group(0) if rpr_match else ""
                before = f'<w:r>{rpr}<w:t xml:space="preserve">{html.escape(prefix_text)}</w:t></w:r>' if prefix_text else ""
                after = f'<w:r>{rpr}<w:t xml:space="preserve">{html.escape(suffix_text)}</w:t></w:r>' if suffix_text else ""
                new_block = block[:run.start()] + before + field + after + block[run.end():]
                return footer_xml[:paragraph.start()] + new_block + footer_xml[paragraph.end():]
            cursor = run_end
    return footer_xml


def _writer_table_full_fingerprint(table_xml: str) -> str:
    """All cell text of a table, normalised — used to detect LO clone tables (R13a / d09)."""
    text = "".join(re.findall(r"<w:t\b[^>]*>([\s\S]*?)</w:t\s*>", table_xml, re.IGNORECASE))
    return re.sub(r"\s+", " ", html.unescape(text)).strip().casefold()


def _writer_between_tables_is_adjacent(between_xml: str) -> bool:
    """True when only empty paragraphs / bookmarks / whitespace sit between two body tables."""
    stripped = re.sub(r"<w:p\b[^>]*(?:/>|>[\s\S]*?</w:p\s*>)", "", between_xml, flags=re.IGNORECASE)
    stripped = re.sub(r"<w:bookmark(?:Start|End)\b[^>]*/?>", "", stripped, flags=re.IGNORECASE)
    return not re.search(r"<w:(?:tbl|r|t|drawing|pict|hyperlink|sdt)\b", stripped, re.IGNORECASE) and not re.sub(r"\s+", "", stripped)


def _remove_duplicate_adjacent_writer_tables(document_xml: str, source_html: str | None = None) -> str:
    """R13a (d09): LibreOffice HTML→DOCX may emit a complete clone of a neighbouring body table.

    Drop later copies that share the full cell text of the previous top-level table and sit
    next to it (only empty paragraphs in between). When source HTML is present, only remove
    extras beyond the HTML <table> count so intentional duplicate tables in the document stay.
    """
    tables = _writer_top_level_tables(document_xml)
    if len(tables) < 2:
        return document_xml
    html_count = len(re.findall(r"<table\b", source_html, re.IGNORECASE)) if source_html else None
    if html_count is not None and len(tables) <= html_count:
        return document_xml
    fingerprints = [_writer_table_full_fingerprint(document_xml[start:end]) for start, end in tables]
    clone_indexes: list[int] = []
    for index in range(1, len(tables)):
        prev_text = fingerprints[index - 1]
        curr_text = fingerprints[index]
        if not curr_text or curr_text != prev_text:
            continue
        between = document_xml[tables[index - 1][1]:tables[index][0]]
        if not _writer_between_tables_is_adjacent(between):
            continue
        clone_indexes.append(index)
    if not clone_indexes:
        return document_xml
    if html_count is not None:
        extras = len(tables) - html_count
        if extras <= 0:
            return document_xml
        clone_indexes = clone_indexes[:extras]
    result = document_xml
    for index in reversed(clone_indexes):
        start, end = tables[index]
        result = result[:start] + result[end:]
    return result


_HTML_PAGE_BREAK_STYLE_RE = re.compile(
    r"(?:^|;)\s*(?:page-break-before\s*:\s*always|break-before\s*:\s*page)(?:;|$)",
    re.IGNORECASE,
)
_HTML_VNO_BOOKMARK_RE = re.compile(
    r"\bid=[\"']((?:vno-untouched|vno-edited)-\d+)[\"']"
    r"|<a\b[^>]*\bname=[\"']((?:vno-untouched|vno-edited)-\d+)[\"']",
    re.IGNORECASE,
)
_HTML_BLOCK_RE = re.compile(r"<(p|h[1-6])\b([^>]*)>([\s\S]*?)</\1\s*>", re.IGNORECASE)


def _html_vno_bookmark(attrs: str, inner: str) -> str:
    match = _HTML_VNO_BOOKMARK_RE.search(attrs or "") or _HTML_VNO_BOOKMARK_RE.search(inner or "")
    if not match:
        return ""
    return match.group(1) or match.group(2) or ""


def _writer_paragraph_for_bookmark(xml: str, name: str) -> tuple[str, int, int] | None:
    """Locate a converted paragraph that still carries vno-untouched-N / vno-edited-N.

    Returns ('para', start, end) for a body-flow paragraph, or ('before', pos, pos)
    when the bookmark landed inside a table (insert a break paragraph before that table).
    """
    match = re.search(
        rf'<w:bookmarkStart\b[^>]*\bw:name=["\']{re.escape(name)}["\']',
        xml,
        re.IGNORECASE,
    )
    if not match:
        return None
    pos = match.start()
    for start, end in _writer_body_paragraph_ranges(xml):
        if start <= pos < end:
            return ("para", start, end)
    for start, end in _writer_top_level_tables(xml):
        if start < pos < end:
            return ("before", start, start)
    return None


def _writer_unique_body_paragraph_by_text(xml: str, text: str) -> tuple[int, int] | None:
    if not text:
        return None
    hits = [
        (start, end)
        for start, end in _writer_body_paragraph_ranges(xml)
        if _paragraph_plain_text(xml[start:end]).strip() == text
    ]
    return hits[0] if len(hits) == 1 else None


def _writer_previous_body_paragraph(xml: str, pos: int) -> tuple[int, int] | None:
    previous = None
    for start, end in _writer_body_paragraph_ranges(xml):
        if end <= pos:
            previous = (start, end)
        else:
            break
    return previous


def _restore_writer_html_page_breaks(document_xml: str, source_html: str) -> str:
    """W22d / R13d: restore page breaks LibreOffice dropped on HTML→DOCX.

    Map HTML blocks (p and h1–h6) that carry page-break-before/break-before:page onto
    converted paragraphs via vno-untouched-N bookmarks (fallback: unique body text).
    Empty HTML markers get w:br type=page (original Word form for d13/d21); text/heading
    blocks get w:pageBreakBefore. Never write the break into a table cell.
    """
    blocks = list(_HTML_BLOCK_RE.finditer(source_html))
    if not blocks:
        return document_xml
    targets: list[dict] = []
    for index, match in enumerate(blocks):
        attrs, inner = match.group(2), match.group(3)
        style_m = re.search(r"\bstyle=[\"']([^\"']*)[\"']", attrs or "", re.IGNORECASE)
        if not style_m or not _HTML_PAGE_BREAK_STYLE_RE.search(style_m.group(1)):
            continue
        text = _writer_html_plain(inner)
        next_bookmark = ""
        next_text = ""
        for following in blocks[index + 1:]:
            next_bookmark = _html_vno_bookmark(following.group(2), following.group(3))
            next_text = _writer_html_plain(following.group(3))
            if next_bookmark or next_text:
                break
        targets.append({
            "bookmark": _html_vno_bookmark(attrs, inner),
            "text": text,
            "empty": not text,
            "next_bookmark": next_bookmark,
            "next_text": next_text,
        })
    if not targets:
        return document_xml

    result = document_xml
    empty_break_para = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

    def apply_at(kind: str, start: int, end: int, empty: bool) -> None:
        nonlocal result
        if kind == "before":
            prev = _writer_previous_body_paragraph(result, start)
            if prev and _writer_has_page_break(result[prev[0]:prev[1]]):
                return
            if prev and not _paragraph_plain_text(result[prev[0]:prev[1]]).strip():
                patched = _writer_add_br_page_run(result[prev[0]:prev[1]])
                result = result[:prev[0]] + patched + result[prev[1]:]
                return
            result = result[:start] + empty_break_para + result[start:]
            return
        para = result[start:end]
        if _writer_has_page_break(para):
            return
        prev = _writer_previous_body_paragraph(result, start)
        if prev and _writer_has_page_break(result[prev[0]:prev[1]]):
            return
        patched = _writer_add_br_page_run(para) if empty else _add_page_break_before_to_paragraph(para)
        result = result[:start] + patched + result[end:]

    for target in reversed(targets):
        located = None
        if target["bookmark"]:
            located = _writer_paragraph_for_bookmark(result, target["bookmark"])
        if located is None and target["text"]:
            unique = _writer_unique_body_paragraph_by_text(result, target["text"])
            if unique:
                located = ("para", unique[0], unique[1])
        if located is None and target["empty"]:
            next_loc = None
            if target["next_bookmark"]:
                next_loc = _writer_paragraph_for_bookmark(result, target["next_bookmark"])
            if next_loc is None and target["next_text"]:
                unique = _writer_unique_body_paragraph_by_text(result, target["next_text"])
                if unique:
                    next_loc = ("para", unique[0], unique[1])
            if next_loc:
                apply_at("before", next_loc[1], next_loc[1], True)
            continue
        if located is None:
            continue
        apply_at(located[0], located[1], located[2], target["empty"])
    return result


_WRITER_MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"
_WRITER_MATHML_NS = "http://www.w3.org/1998/Math/MathML"
_WRITER_MATH_NS_PREFIX = "{%s}" % _WRITER_MATH_NS
_WRITER_MATHML_NS_PREFIX = "{%s}" % _WRITER_MATHML_NS


def _writer_math_local_name(element: ET.Element) -> str:
    return element.tag.rsplit("}", 1)[-1].lower()


def _writer_math_child(element: ET.Element, name: str) -> ET.Element | None:
    return next((child for child in list(element) if _writer_math_local_name(child) == name.lower()), None)


def _writer_math_attribute(element: ET.Element | None, name: str, default: str = "") -> str:
    if element is None:
        return default
    for key, value in element.attrib.items():
        if key.rsplit("}", 1)[-1].lower() == name.lower():
            return value
    return default


def _writer_math_text_element(tag: str, value: str, attrs: str = "") -> str:
    return "<" + tag + attrs + ">" + html.escape(value, quote=False) + "</" + tag + ">"


def _writer_omml_children_to_mathml(element: ET.Element) -> str:
    children = list(element)
    return "".join(_writer_omml_to_mathml_node(child) for child in children)


def _writer_omml_to_mathml_node(element: ET.Element) -> str:
    kind = _writer_math_local_name(element)
    children = list(element)
    if kind.endswith("pr") or kind in {"argpr", "ctrlpr", "phantpr"}:
        return ""
    if kind == "r":
        text = "".join(
            child.text or ""
            for child in element.iter()
            if _writer_math_local_name(child) in {"t", "deltext"}
        )
        if not text:
            return ""
        if re.fullmatch(r"[0-9]+(?:[.,][0-9]+)?", text):
            tag = "mn"
        elif text in {"≤", "≥", "≠", "±", "×", "÷", "∞", "→", "∈", "∑", "∏", "∫", "+", "-", "=", "(", ")", "[", "]", ","}:
            tag = "mo"
        else:
            tag = "mi"
        return _writer_math_text_element(tag, text)
    if kind == "f":
        numerator = _writer_math_child(element, "num")
        denominator = _writer_math_child(element, "den")
        return "<mfrac><mrow>" + (_writer_omml_children_to_mathml(numerator) if numerator is not None else "") \
            + "</mrow><mrow>" + (_writer_omml_children_to_mathml(denominator) if denominator is not None else "") \
            + "</mrow></mfrac>"
    if kind == "rad":
        degree = _writer_math_child(element, "deg")
        radicand = _writer_math_child(element, "e")
        rad_pr = _writer_math_child(element, "radpr")
        hidden = _writer_math_child(rad_pr, "deghide") if rad_pr is not None else None
        body = _writer_omml_children_to_mathml(radicand) if radicand is not None else ""
        if degree is None or _writer_math_attribute(hidden, "val", "0") in {"1", "true"}:
            return "<msqrt><mrow>" + body + "</mrow></msqrt>"
        return "<mroot><mrow>" + body + "</mrow><mrow>" + _writer_omml_children_to_mathml(degree) + "</mrow></mroot>"
    if kind in {"ssup", "ssub", "ssubsup"}:
        base = _writer_math_child(element, "e")
        sub = _writer_math_child(element, "sub")
        sup = _writer_math_child(element, "sup")
        tag = {"ssup": "msup", "ssub": "msub", "ssubsup": "msubsup"}[kind]
        pieces = [_writer_omml_children_to_mathml(base) if base is not None else ""]
        if kind in {"ssub", "ssubsup"}:
            pieces.append(_writer_omml_children_to_mathml(sub) if sub is not None else "")
        if kind in {"ssup", "ssubsup"}:
            pieces.append(_writer_omml_children_to_mathml(sup) if sup is not None else "")
        return "<" + tag + ">" + "".join(pieces) + "</" + tag + ">"
    if kind == "nary":
        properties = _writer_math_child(element, "narypr")
        char = _writer_math_child(properties, "chr") if properties is not None else None
        symbol = _writer_math_attribute(char, "val", "∫")
        body = _writer_math_child(element, "e")
        sub = _writer_math_child(element, "sub")
        sup = _writer_math_child(element, "sup")
        base = _writer_math_text_element("mo", symbol, ' largeop="true"')
        if sub is not None and sup is not None:
            return "<munderover>" + base + "<mrow>" + _writer_omml_children_to_mathml(sub) \
                + "</mrow><mrow>" + _writer_omml_children_to_mathml(sup) + "</mrow></munderover>" \
                + (_writer_omml_children_to_mathml(body) if body is not None else "")
        if sub is not None:
            return "<munder>" + base + "<mrow>" + _writer_omml_children_to_mathml(sub) + "</mrow></munder>" \
                + (_writer_omml_children_to_mathml(body) if body is not None else "")
        if sup is not None:
            return "<mover>" + base + "<mrow>" + _writer_omml_children_to_mathml(sup) + "</mrow></mover>" \
                + (_writer_omml_children_to_mathml(body) if body is not None else "")
        return base + (_writer_omml_children_to_mathml(body) if body is not None else "")
    if kind == "m":
        rows = []
        for row_element in children:
            if _writer_math_local_name(row_element) != "mr":
                continue
            cells = []
            for cell in list(row_element):
                if _writer_math_local_name(cell) != "e":
                    continue
                cells.append("<mtd><mrow>" + _writer_omml_children_to_mathml(cell) + "</mrow></mtd>")
            rows.append("<mtr>" + "".join(cells) + "</mtr>")
        return "<mtable>" + "".join(rows) + "</mtable>"
    if kind == "d":
        props = _writer_math_child(element, "dpr")
        begin = _writer_math_attribute(_writer_math_child(props, "begchr") if props is not None else None, "val", "(")
        end = _writer_math_attribute(_writer_math_child(props, "endchr") if props is not None else None, "val", ")")
        body = _writer_math_child(element, "e")
        return _writer_math_text_element("mo", begin) + "<mrow>" \
            + (_writer_omml_children_to_mathml(body) if body is not None else "") \
            + "</mrow>" + _writer_math_text_element("mo", end)
    if kind == "func":
        name = _writer_math_child(element, "funcname")
        argument = _writer_math_child(element, "e")
        return (_writer_omml_children_to_mathml(name) if name is not None else "") \
            + (_writer_omml_children_to_mathml(argument) if argument is not None else "")
    if kind in {"acc", "bar", "groupchr"}:
        body = _writer_math_child(element, "e")
        props = _writer_math_child(element, kind + "pr")
        chr_node = _writer_math_child(props, "chr") if props is not None else None
        symbol = _writer_math_attribute(chr_node, "val", "¯" if kind == "bar" else "ˆ")
        return "<mover accent=\"true\"><mrow>" \
            + (_writer_omml_children_to_mathml(body) if body is not None else "") \
            + "</mrow>" + _writer_math_text_element("mo", symbol) + "</mover>"
    if kind in {"omath", "omathpara", "e", "num", "den", "sub", "sup", "funcname", "mr"}:
        return _writer_omml_children_to_mathml(element)
    return _writer_omml_children_to_mathml(element)


def _writer_omml_fragment_to_mathml(omml: str, display: str = "inline") -> str:
    wrapped = (
        '<root xmlns:m="' + _WRITER_MATH_NS + '" '
        'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        + omml + "</root>"
    )
    root = ET.fromstring(wrapped)
    content = _writer_omml_children_to_mathml(root)
    return '<math xmlns="' + _WRITER_MATHML_NS + '" display="' + ("block" if display == "block" else "inline") + '">' \
        + content + "</math>"


def writer_docx_equations_to_mathml_html(docx_bytes: bytes, html_content: str) -> str:
    """Replace LibreOffice's equation GIFs with MathML at their existing HTML slots."""
    try:
        document = read_zip_entry(docx_bytes, "word/document.xml")
        if not document:
            return html_content
        xml = document.decode("utf-8", errors="replace")
        para_ranges = _xml_element_ranges(xml, "m:oMathPara")
        formulas = [
            {"start": start, "end": end, "xml": xml[start:end], "display": "block"}
            for start, end in para_ranges
        ]
        for start, end in _xml_element_ranges(xml, "m:oMath"):
            if any(outer_start <= start < outer_end for outer_start, outer_end in para_ranges):
                continue
            formulas.append({"start": start, "end": end, "xml": xml[start:end], "display": "inline"})
        formulas.sort(key=lambda item: item["start"])
        if not formulas:
            return html_content

        events = [(item["start"], "equation", item) for item in formulas]
        events.extend((start, "object", None) for start, _end in _xml_element_ranges(xml, "w:object"))
        events.sort(key=lambda item: item[0])
        object_images = list(re.finditer(
            r'<img\b(?=[^>]*\bname=["\']Object(\d+)["\'])[^>]*>',
            html_content,
            re.IGNORECASE,
        ))
        replacements = []
        for image in object_images:
            object_number = int(image.group(1))
            event_index = object_number - 1
            if event_index < 0 or event_index >= len(events):
                continue
            _position, event_kind, formula = events[event_index]
            if event_kind != "equation" or formula is None:
                continue
            ordinal = next(index for index, item in enumerate(formulas, start=1) if item is formula)
            source_id = "source-" + str(ordinal).zfill(6)
            mathml = _writer_omml_fragment_to_mathml(formula["xml"], formula["display"])
            original = url_quote(formula["xml"], safe="")
            encoded_mathml = url_quote(mathml, safe="")
            block_attr = ' data-vno-equation-display="block"' if formula["display"] == "block" else ""
            replacement = (
                '<span class="vno-equation" role="math" tabindex="0" contenteditable="false"'
                ' data-vno-equation="true" data-vno-equation-id="' + source_id + '"'
                ' data-vno-equation-original-omml="' + original + '"'
                ' data-vno-equation-mathml="' + encoded_mathml + '"' + block_attr + '>'
                + mathml + "</span>"
            )
            replacements.append((image.start(), image.end(), replacement))

        # Small Math-only documents have one Object image per equation and no
        # other OLE objects. Keep this tested fallback for packages without a
        # resolvable OOXML object sequence.
        if not replacements and len(object_images) == len(formulas):
            for ordinal, (image, formula) in enumerate(zip(object_images, formulas), start=1):
                mathml = _writer_omml_fragment_to_mathml(formula["xml"], formula["display"])
                replacement = (
                    '<span class="vno-equation" role="math" tabindex="0" contenteditable="false"'
                    ' data-vno-equation="true" data-vno-equation-id="source-' + str(ordinal).zfill(6) + '"'
                    ' data-vno-equation-original-omml="' + url_quote(formula["xml"], safe="") + '"'
                    ' data-vno-equation-mathml="' + url_quote(mathml, safe="") + '">'
                    + mathml + "</span>"
                )
                replacements.append((image.start(), image.end(), replacement))
        for start, end, replacement in reversed(replacements):
            html_content = html_content[:start] + replacement + html_content[end:]
        return html_content
    except (ET.ParseError, ValueError, KeyError, TypeError):
        return html_content


def _writer_mathml_to_omml_node(element: ET.Element) -> str:
    kind = _writer_math_local_name(element)
    children = list(element)
    if kind in {"math", "mrow", "mstyle", "mphantom"}:
        return "".join(_writer_mathml_to_omml_node(child) for child in children)
    if kind in {"mi", "mn", "mo", "mtext", "ms"}:
        text = "".join(element.itertext())
        if not text:
            return ""
        return "<m:r><m:t xml:space=\"preserve\">" + html.escape(text, quote=False) + "</m:t></m:r>"
    if kind == "mfrac":
        numerator = children[0] if children else None
        denominator = children[1] if len(children) > 1 else None
        return "<m:f><m:fPr/><m:num>" + (_writer_mathml_to_omml_node(numerator) if numerator is not None else "") \
            + "</m:num><m:den>" + (_writer_mathml_to_omml_node(denominator) if denominator is not None else "") \
            + "</m:den></m:f>"
    if kind == "msqrt":
        value = _writer_mathml_to_omml_node(children[0]) if children else ""
        return "<m:rad><m:radPr><m:degHide m:val=\"1\"/></m:radPr><m:deg/><m:e>" + value + "</m:e></m:rad>"
    if kind == "mroot":
        value = _writer_mathml_to_omml_node(children[0]) if children else ""
        degree = _writer_mathml_to_omml_node(children[1]) if len(children) > 1 else ""
        return "<m:rad><m:radPr/><m:deg>" + degree + "</m:deg><m:e>" + value + "</m:e></m:rad>"
    if kind in {"msup", "msub", "msubsup"}:
        base = _writer_mathml_to_omml_node(children[0]) if children else ""
        if kind == "msup":
            exponent = _writer_mathml_to_omml_node(children[1]) if len(children) > 1 else ""
            return "<m:sSup><m:supPr/><m:e>" + base + "</m:e><m:sup>" + exponent + "</m:sup></m:sSup>"
        if kind == "msub":
            subscript = _writer_mathml_to_omml_node(children[1]) if len(children) > 1 else ""
            return "<m:sSub><m:subPr/><m:e>" + base + "</m:e><m:sub>" + subscript + "</m:sub></m:sSub>"
        subscript = _writer_mathml_to_omml_node(children[1]) if len(children) > 1 else ""
        exponent = _writer_mathml_to_omml_node(children[2]) if len(children) > 2 else ""
        return "<m:sSubSup><m:sSubSupPr/><m:e>" + base + "</m:e><m:sub>" + subscript \
            + "</m:sub><m:sup>" + exponent + "</m:sup></m:sSubSup>"
    if kind == "mtable":
        rows = []
        for row in children:
            if _writer_math_local_name(row) != "mtr":
                continue
            cells = []
            for cell in list(row):
                if _writer_math_local_name(cell) == "mtd":
                    cells.append("<m:e>" + _writer_mathml_to_omml_node(cell) + "</m:e>")
            rows.append("<m:mr>" + "".join(cells) + "</m:mr>")
        return "<m:m><m:mPr/>" + "".join(rows) + "</m:m>"
    if kind in {"munder", "mover", "munderover"}:
        base = children[0] if children else None
        symbol = "".join(base.itertext()) if base is not None else "∑"
        body = _writer_mathml_to_omml_node(base) if base is not None else ""
        sub = _writer_mathml_to_omml_node(children[1]) if kind in {"munder", "munderover"} and len(children) > 1 else ""
        sup_index = 2 if kind == "munderover" else 1
        sup = _writer_mathml_to_omml_node(children[sup_index]) if kind in {"mover", "munderover"} and len(children) > sup_index else ""
        nary = '<m:nary><m:naryPr><m:chr m:val="' + html.escape(symbol, quote=True) + '"/><m:limLoc m:val="undOvr"/></m:naryPr>'
        return nary + "<m:sub>" + sub + "</m:sub><m:sup>" + sup + "</m:sup><m:e>" + body + "</m:e></m:nary>"
    if kind == "mfenced":
        begin = html.escape(element.attrib.get("open", "("), quote=True)
        end = html.escape(element.attrib.get("close", ")"), quote=True)
        body = "".join(_writer_mathml_to_omml_node(child) for child in children)
        return "<m:d><m:dPr><m:begChr m:val=\"" + begin + "\"/><m:endChr m:val=\"" + end \
            + "\"/></m:dPr><m:e>" + body + "</m:e></m:d>"
    return "".join(_writer_mathml_to_omml_node(child) for child in children)


def _writer_mathml_to_omml(mathml: str) -> str:
    root = ET.fromstring(mathml)
    body = _writer_mathml_to_omml_node(root)
    display = root.attrib.get("display", "inline").lower() == "block"
    equation = "<m:oMath>" + body + "</m:oMath>"
    return "<m:oMathPara>" + equation + "</m:oMathPara>" if display else equation


def _writer_equation_marker_entries(source_html: str) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    span_re = re.compile(r"<span\b([^>]*)>([\s\S]*?)</span\s*>", re.IGNORECASE)
    attr_re = re.compile(r"\b([a-z][\w:-]*)\s*=\s*([\"'])(.*?)\2", re.IGNORECASE | re.DOTALL)
    for match in span_re.finditer(source_html or ""):
        attrs = {name.lower(): html.unescape(value) for name, _quote, value in attr_re.findall(match.group(1))}
        if attrs.get("data-vno-equation-export", "").lower() != "true":
            continue
        equation_id = attrs.get("data-vno-equation-id", "")
        safe_id = re.sub(r"[^A-Za-z0-9]", "", equation_id).upper()
        token = "VNOEQ" + safe_id + "MARKER"
        if not safe_id:
            raise ValueError("Phương trình xuất thiếu mã nhận diện.")
        original = url_unquote(attrs["data-vno-equation-original-omml"]) if attrs.get("data-vno-equation-original-omml") else ""
        mathml = url_unquote(attrs["data-vno-equation-mathml"]) if attrs.get("data-vno-equation-mathml") else ""
        entries.append({"token": token, "original": original, "mathml": mathml})
    return entries


def _writer_equation_text_run(run_xml: str, token: str, equation_xml: str) -> str | None:
    run_open = re.match(r"<w:r\b[^>]*>", run_xml, re.IGNORECASE)
    if not run_open:
        return None
    text_nodes = list(re.finditer(r"(<w:t\b[^>]*>)([\s\S]*?)(</w:t\s*>)", run_xml, re.IGNORECASE))
    hits = []
    for text_node in text_nodes:
        text = html.unescape(text_node.group(2))
        if token in text:
            hits.append((text_node, text))
    if len(hits) != 1:
        return None
    text_node, text = hits[0]
    if text.count(token) != 1:
        return None
    prefix, suffix = text.split(token, 1)
    run_pr = re.search(r"<w:rPr\b[^>]*(?:/>|>[\s\S]*?</w:rPr\s*>)", run_xml, re.IGNORECASE)
    stripped = run_xml[run_open.end():]
    stripped = re.sub(r"</w:r\s*>$", "", stripped, flags=re.IGNORECASE)
    stripped = re.sub(r"<w:rPr\b[^>]*(?:/>|>[\s\S]*?</w:rPr\s*>)", "", stripped, count=1, flags=re.IGNORECASE)
    stripped = re.sub(r"<w:t\b[^>]*>[\s\S]*?</w:t\s*>", "", stripped, count=1, flags=re.IGNORECASE)
    if stripped.strip():
        return None
    properties = run_pr.group(0) if run_pr else ""
    text_open = text_node.group(1)

    def text_run(value: str) -> str:
        if not value:
            return ""
        encoded = html.escape(value, quote=False)
        tag_open = text_open
        if re.search(r"\s", value) and "xml:space=" not in tag_open:
            tag_open = tag_open[:-1] + ' xml:space="preserve">'
        return run_open.group(0) + properties + tag_open + encoded + text_node.group(3) + "</w:r>"

    return text_run(prefix) + equation_xml + text_run(suffix)


def _writer_restore_equation_markers(document_xml: str, source_html: str) -> str:
    entries = _writer_equation_marker_entries(source_html)
    if not entries:
        return document_xml
    result = document_xml
    for entry in entries:
        token = entry["token"]
        if result.count(token) != 1:
            raise ValueError("Không tìm thấy đúng một vị trí cho phương trình " + token + ".")
        equation_xml = entry["original"] or _writer_mathml_to_omml(entry["mathml"])
        if not equation_xml.startswith("<m:oMath"):
            raise ValueError("Cấu trúc OMML không hợp lệ cho phương trình " + token + ".")
        matched = False

        def replace_run(match: re.Match) -> str:
            nonlocal matched
            run_xml = match.group(0)
            if token not in run_xml:
                return run_xml
            replacement = _writer_equation_text_run(run_xml, token, equation_xml)
            if replacement is None:
                raise ValueError("LibreOffice đã thay đổi dấu vị trí của phương trình " + token + ".")
            matched = True
            return replacement

        result = re.sub(r"<w:r\b[^>]*>[\s\S]*?</w:r\s*>", replace_run, result, flags=re.IGNORECASE)
        if not matched:
            raise ValueError("LibreOffice không giữ lại dấu vị trí của phương trình " + token + ".")
    root_open = re.search(r"<w:document\b[^>]*>", result, re.IGNORECASE)
    if root_open and not re.search(r"\bxmlns:m\s*=", root_open.group(0), re.IGNORECASE):
        result = result[:root_open.end() - 1] + ' xmlns:m="' + _WRITER_MATH_NS + '"' + result[root_open.end() - 1:]
    return result



def _collapse_single_section_cols(document_xml: str) -> str:
    """LibreOffice's HTML filter wraps <div style="column-count: N"> in a Writer TextSection,
    which exports to DOCX as a continuous section break (<w:sectPr> in <w:pPr>) followed by
    the body <w:sectPr>. For a single-section document, collapse the inner sectPr back into
    the document's body sectPr so Word sees Sections.Count == 1."""
    sections = list(re.finditer(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", document_xml, re.IGNORECASE))
    if len(sections) <= 1:
        return document_xml

    inner_match = None
    for m in sections[:-1]:
        pre = document_xml[max(0, m.start() - 40):m.start()]
        if "<w:pPr" in pre:
            inner_match = m
            break
    if not inner_match:
        return document_xml

    inner_xml = inner_match.group(0)
    cols_match = re.search(r"<w:cols\b[^>]*/>", inner_xml, re.IGNORECASE)
    cols_xml = cols_match.group(0) if cols_match else None

    p_pattern = re.compile(
        rf"<w:p\b[^>]*>\s*<w:pPr\b[^>]*>\s*{re.escape(inner_xml)}\s*</w:pPr\s*>\s*</w:p\s*>",
        re.IGNORECASE,
    )
    if p_pattern.search(document_xml):
        document_xml = p_pattern.sub("", document_xml, count=1)
    else:
        document_xml = document_xml[:inner_match.start()] + document_xml[inner_match.end():]
        document_xml = re.sub(r"<w:pPr\b[^>]*>\s*</w:pPr\s*>", "", document_xml)

    remaining_sections = list(re.finditer(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", document_xml, re.IGNORECASE))
    if remaining_sections:
        final_m = remaining_sections[-1]
        final_xml = final_m.group(0)
        final_xml = re.sub(r"<w:type\b[^>]*/>", "", final_xml, flags=re.IGNORECASE)
        if cols_xml and not re.search(r'\bw:num="1"\b', cols_xml):
            if "<w:cols" in final_xml:
                final_xml = re.sub(r"<w:cols\b[^>]*/>", cols_xml, final_xml, count=1, flags=re.IGNORECASE)
            else:
                for anchor in ("<w:formProt", "<w:vAlign", "<w:noEndnote", "<w:titlePg", "<w:docGrid", "</w:sectPr"):
                    pos = final_xml.find(anchor)
                    if pos >= 0:
                        final_xml = final_xml[:pos] + cols_xml + final_xml[pos:]
                        break
        document_xml = document_xml[:final_m.start()] + final_xml + document_xml[final_m.end():]

    return document_xml


def _restore_created_writer_section_metadata(
    document_xml: str,
    section_meta: list[dict],
    source_sections: list[str] | None = None,
) -> str:
    """Apply section metadata while leaving unedited source sections untouched."""
    if not section_meta:
        return document_xml
    sections = list(re.finditer(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", document_xml, re.IGNORECASE))
    if len(sections) != len(section_meta):
        return document_xml
    if source_sections is not None and len(source_sections) != len(sections):
        source_sections = None

    def replace_or_insert(sect_xml: str, name: str, replacement: str) -> str:
        pattern = re.compile(rf"<w:{name}\b[^>]*/>", re.IGNORECASE)
        match = pattern.search(sect_xml)
        if match:
            return sect_xml[:match.start()] + replacement + sect_xml[match.end():]
        close_at = sect_xml.rfind("</w:sectPr>")
        if name == "type":
            refs = list(_SECT_REF_RE.finditer(sect_xml))
            insert_at = refs[-1].end() if refs else re.search(r"<w:sectPr\b[^>]*>", sect_xml).end()
        elif name == "pgSz":
            margin = re.search(r"<w:pgMar\b", sect_xml, re.IGNORECASE)
            insert_at = margin.start() if margin else close_at
        elif name == "pgMar":
            size = re.search(r"<w:pgSz\b[^>]*/>", sect_xml, re.IGNORECASE)
            insert_at = size.end() if size else close_at
        elif name == "pgNumType":
            title = re.search(r"<w:titlePg\b[^>]*/>", sect_xml, re.IGNORECASE)
            insert_at = title.start() if title else close_at
        elif name == "cols":
            title = re.search(r"<w:(formProt|vAlign|noEndnote|titlePg|textDirection|bidi|rtlGutter|docGrid)\b[^>]*/>", sect_xml, re.IGNORECASE)
            insert_at = title.start() if title else close_at
        else:
            insert_at = close_at
        return sect_xml[:insert_at] + replacement + sect_xml[insert_at:]

    def set_attr(tag: str, name: str, value: int) -> str:
        attr_re = re.compile(rf"\bw:{name}\s*=\s*([\"'])([^\"']*)\1", re.IGNORECASE)
        if attr_re.search(tag):
            return attr_re.sub(f'w:{name}="{value}"', tag, count=1)
        return tag[:-2] + f' w:{name}="{value}"/>'

    def attr_value(xml: str, tag_name: str, attr_name: str) -> str | None:
        tag = re.search(rf"<w:{tag_name}\b[^>]*/?>", xml, re.IGNORECASE)
        if not tag:
            return None
        value = re.search(rf'\bw:{attr_name}\s*=\s*(["\'])([^"\']*)\1', tag.group(0), re.IGNORECASE)
        return value.group(2) if value else None

    def js_round(value: float) -> int:
        return math.floor(value + 0.5)

    def source_page_setup_changes(page_setup: dict, source_section_xml: str) -> tuple[bool, bool]:
        """Compare against the same 0.1 mm precision used by the OOXML importer."""
        size_match = re.search(r"<w:pgSz\b([^>]*)/?>", source_section_xml, re.IGNORECASE)
        size_changed = False
        if size_match:
            width = re.search(r'\bw:w\s*=\s*(["\'])(\d+)\1', size_match.group(1), re.IGNORECASE)
            height = re.search(r'\bw:h\s*=\s*(["\'])(\d+)\1', size_match.group(1), re.IGNORECASE)
            if width and height:
                width_twips, height_twips = int(width.group(2)), int(height.group(2))
                width_mm = js_round(width_twips * 25.4 / 1440)
                height_mm = js_round(height_twips * 25.4 / 1440)
                orientation_attr = re.search(r'\bw:orient\s*=\s*(["\'])([^"\']+)\1', size_match.group(1), re.IGNORECASE)
                source_orientation = (
                    "landscape" if orientation_attr and orientation_attr.group(2).lower() == "landscape"
                    else "landscape" if width_twips > height_twips
                    else "portrait"
                )
                short_side, long_side = min(width_mm, height_mm), max(width_mm, height_mm)
                if abs(short_side - 210) <= 5 and abs(long_side - 297) <= 5:
                    source_size = "a4"
                elif abs(short_side - 216) <= 5 and abs(long_side - 279) <= 5:
                    source_size = "letter"
                elif abs(short_side - 216) <= 5 and abs(long_side - 356) <= 5:
                    source_size = "legal"
                else:
                    source_size = "custom"
                size_changed = (
                    str(page_setup.get("size", "a4")).lower() != source_size
                    or str(page_setup.get("orientation", "portrait")).lower() != source_orientation
                )
                if source_size == "custom":
                    size_changed = size_changed or (
                        int(page_setup.get("widthMm") or 0) != width_mm
                        or int(page_setup.get("heightMm") or 0) != height_mm
                    )

        margin_match = re.search(r"<w:pgMar\b([^>]*)/?>", source_section_xml, re.IGNORECASE)
        margins_changed = False
        if margin_match:
            margin_setup = page_setup.get("margins") or {}
            for name in ("top", "right", "bottom", "left"):
                value = re.search(rf'\bw:{name}\s*=\s*(["\'])(\d+)\1', margin_match.group(1), re.IGNORECASE)
                if value and name in margin_setup:
                    source_mm = js_round(int(value.group(2)) * 25.4 / 1440 * 10) / 10
                    if abs(float(margin_setup[name]) - source_mm) >= 0.05:
                        margins_changed = True
            for name, setup_name in (("header", "headerDistanceMm"), ("footer", "footerDistanceMm")):
                value = re.search(rf'\bw:{name}\s*=\s*(["\'])(\d+)\1', margin_match.group(1), re.IGNORECASE)
                if value and setup_name in page_setup:
                    source_mm = js_round(int(value.group(2)) * 25.4 / 1440 * 10) / 10
                    if abs(float(page_setup[setup_name]) - source_mm) >= 0.05:
                        margins_changed = True
        return size_changed, margins_changed

    def source_section_flags_changed(section: dict, source_section_xml: str) -> tuple[bool, bool]:
        header_footer = section.get("headerFooter") or {}
        different_first_page = bool(re.search(r"<w:titlePg\b[^>]*/?>", source_section_xml, re.IGNORECASE))
        first_changed = bool(header_footer.get("differentFirstPage")) != different_first_page

        source_start = attr_value(source_section_xml, "pgNumType", "start")
        source_restart = source_start is not None
        page_changed = bool(header_footer.get("pageNumberRestart")) != source_restart
        if source_restart and bool(header_footer.get("pageNumberRestart")):
            page_changed = page_changed or int(header_footer.get("pageNumberStart", 1) or 1) != int(source_start)
        return first_changed, page_changed

    def source_columns_changed(cols_config: dict | None, source_section_xml: str | None) -> bool:
        if source_section_xml is None:
            return bool(cols_config and int(cols_config.get("count", 1) or 1) > 1)
        source_cols = re.search(r"<w:cols\b([^>]*)/?>", source_section_xml, re.IGNORECASE)
        source_attrs = source_cols.group(1) if source_cols else ""
        source_num_match = re.search(r'\bw:num\s*=\s*(["\'])(\d+)\1', source_attrs, re.IGNORECASE)
        source_num = int(source_num_match.group(2)) if source_num_match else 1
        source_sep_match = re.search(r'\bw:sep\s*=\s*(["\'])(1|true|on)\1', source_attrs, re.IGNORECASE)
        source_rule = bool(source_sep_match)
        source_space_match = re.search(r'\bw:space\s*=\s*(["\'])(\d+)\1', source_attrs, re.IGNORECASE)
        source_gap_mm = js_round(int(source_space_match.group(2)) * 25.4 / 1440 * 10) / 10 if source_space_match else 12.7

        if not cols_config:
            return False
        cur_num = max(1, int(cols_config.get("count", 1) or 1))
        cur_rule = bool(cols_config.get("rule"))
        cur_gap_mm = float(cols_config.get("gap", 10) or 10) if cur_num > 1 else source_gap_mm

        if cur_num != source_num:
            return True
        if cur_num > 1:
            if cur_rule != source_rule:
                return True
            if abs(cur_gap_mm - source_gap_mm) >= 0.5:
                return True
        return False

    paper_twips = {
        "a3": (16838, 23811), "a4": (11906, 16838), "a5": (8391, 11906),
        "letter": (12240, 15840), "legal": (12240, 20160),
    }
    for index in range(len(section_meta) - 1, -1, -1):
        match = sections[index]
        section_xml = match.group(0)
        section = section_meta[index]
        source_section_xml = source_sections[index] if source_sections is not None else None
        page_setup = section.get("pageSetup") or {}
        landscape = str(page_setup.get("orientation", "portrait")).lower() == "landscape"
        dims = paper_twips.get(str(page_setup.get("size", "a4")).lower())
        if dims:
            width_twips, height_twips = dims
        else:
            width_mm = float(page_setup.get("widthMm") or 210)
            height_mm = float(page_setup.get("heightMm") or 297)
            width_twips = round(width_mm * 1440 / 25.4)
            height_twips = round(height_mm * 1440 / 25.4)
        if landscape:
            width_twips, height_twips = max(width_twips, height_twips), min(width_twips, height_twips)
            orient_attr = ' w:orient="landscape"'
        else:
            width_twips, height_twips = min(width_twips, height_twips), max(width_twips, height_twips)
            orient_attr = ""
        source_size_changed, source_margins_changed = (
            source_page_setup_changes(page_setup, source_section_xml)
            if source_section_xml is not None else (True, True)
        )
        if source_size_changed:
            section_xml = replace_or_insert(
                section_xml, "pgSz", f'<w:pgSz w:w="{width_twips}" w:h="{height_twips}"{orient_attr}/>'
            )

        margins = page_setup.get("margins") or {}
        margin_values = {
            "top": round(float(margins.get("top", 20)) * 1440 / 25.4),
            "right": round(float(margins.get("right", 15)) * 1440 / 25.4),
            "bottom": round(float(margins.get("bottom", 20)) * 1440 / 25.4),
            "left": round(float(margins.get("left", 30)) * 1440 / 25.4),
            "header": round(float(page_setup.get("headerDistanceMm", 12.7)) * 1440 / 25.4),
            "footer": round(float(page_setup.get("footerDistanceMm", 12.7)) * 1440 / 25.4),
        }
        if source_margins_changed:
            pgmar = re.search(r"<w:pgMar\b[^>]*/>", section_xml, re.IGNORECASE)
            if pgmar:
                pgmar_xml = pgmar.group(0)
                for name, value in margin_values.items():
                    pgmar_xml = set_attr(pgmar_xml, name, value)
            else:
                pgmar_xml = "<w:pgMar " + " ".join(f'w:{name}="{value}"' for name, value in margin_values.items()) + ' w:gutter="0"/>'
            section_xml = replace_or_insert(section_xml, "pgMar", pgmar_xml)

        header_footer = section.get("headerFooter") or {}
        if source_section_xml is None:
            source_first_page_changed = True
            source_page_number_changed = True
        else:
            source_first_page_changed, source_page_number_changed = source_section_flags_changed(section, source_section_xml)
        if source_first_page_changed:
            if header_footer.get("differentFirstPage"):
                section_xml = replace_or_insert(section_xml, "titlePg", "<w:titlePg/>")
            else:
                section_xml = re.sub(r"<w:titlePg\b[^>]*/>", "", section_xml, flags=re.IGNORECASE)
        if source_page_number_changed:
            if header_footer.get("pageNumberRestart"):
                start_at = max(1, int(header_footer.get("pageNumberStart", 1) or 1))
                pgnum = re.search(r"<w:pgNumType\b[^>]*/>", section_xml, re.IGNORECASE)
                pgnum_xml = set_attr(pgnum.group(0), "start", start_at) if pgnum else f'<w:pgNumType w:start="{start_at}"/>'
                section_xml = replace_or_insert(section_xml, "pgNumType", pgnum_xml)
            else:
                section_xml = re.sub(r"<w:pgNumType\b[^>]*/>", "", section_xml, flags=re.IGNORECASE)

        cols_config = section.get("columns")
        if not cols_config and isinstance(section.get("pageSetup"), dict):
            cols_config = section.get("pageSetup", {}).get("columns")
        source_cols_changed = (
            source_columns_changed(cols_config, source_section_xml)
            if source_section_xml is not None
            else bool(cols_config and int(cols_config.get("count", 1) or 1) > 1)
        )
        if source_cols_changed:
            col_count = max(1, int(cols_config.get("count", 1) or 1)) if cols_config else 1
            if col_count > 1:
                gap_val = float(cols_config.get("gap", 10) or 10)
                space_dxa = round(gap_val / 25.4 * 1440) if gap_val else 720
                sep_attr = ' w:sep="1"' if cols_config.get("rule") else ""
                cols_xml = f'<w:cols w:num="{col_count}" w:space="{space_dxa}"{sep_attr}/>'
            else:
                cols_xml = '<w:cols w:space="720"/>'
            section_xml = replace_or_insert(section_xml, "cols", cols_xml)

        # `w:type` của sectPr mô tả cách CHÍNH phần đó bắt đầu (liên tục / trang kế / trang chẵn / trang lẻ).
        # Đo bằng Word thật (06/10): trước đây gán loại của phần KẾ TIẾP vào sectPr trước → "Ngắt mục liên tục"
        # thành ngắt trang, trang chẵn/lẻ lệch một phần. Phần đầu tiên không có ngắt phía trước.
        if index >= 1:
            marker_present = bool(section.get("breakMarkerPresent", True))
            if marker_present:
                break_type = str(section.get("type") or "nextPage")
                if break_type not in {"nextPage", "continuous", "evenPage", "oddPage"}:
                    break_type = "nextPage"
                source_type = attr_value(source_section_xml or "", "type", "val") if source_section_xml is not None else None
                source_type = source_type or "nextPage"
                if source_section_xml is None or break_type != source_type:
                    section_xml = replace_or_insert(section_xml, "type", f'<w:type w:val="{break_type}"/>')
        elif source_section_xml is None:
            section_xml = re.sub(r"<w:type\b[^>]*/>", "", section_xml, flags=re.IGNORECASE)
        document_xml = document_xml[:match.start()] + section_xml + document_xml[match.end():]
    return document_xml


def _apply_writer_link_to_previous(document_xml: str, section_meta: list[dict]) -> str:
    """Represent section header/footer inheritance through explicit OOXML references.

    Word treats a missing section reference as "Link to Previous". When a
    section is unlinked but has no references yet, copy the prior section's
    references so its current appearance is retained. Reusing the relationship
    IDs also keeps this mapping limited to the existing LibreOffice package.
    """
    sections = list(re.finditer(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", document_xml, re.IGNORECASE))
    if len(sections) != len(section_meta):
        return document_xml

    section_xmls = [match.group(0) for match in sections]
    ref_pattern = re.compile(r"<w:(header|footer)Reference\b[^>]*/>", re.IGNORECASE)
    for index, section in enumerate(section_meta):
        if index == 0:
            continue
        header_footer = section.get("headerFooter") or {}
        if "linkToPrevious" not in header_footer:
            continue
        current = section_xmls[index]
        if header_footer.get("linkToPrevious"):
            section_xmls[index] = ref_pattern.sub("", current)
            continue

        current_refs = list(ref_pattern.finditer(current))
        current_kinds = {match.group(1).lower() for match in current_refs}
        previous_refs = list(ref_pattern.finditer(section_xmls[index - 1]))
        refs_to_copy = [
            match.group(0) for match in previous_refs
            if match.group(1).lower() not in current_kinds
        ]
        if refs_to_copy:
            open_tag = re.search(r"<w:sectPr\b[^>]*>", current, re.IGNORECASE)
            if open_tag:
                insert_at = open_tag.end()
                section_xmls[index] = current[:insert_at] + "".join(refs_to_copy) + current[insert_at:]

    result = document_xml
    for match, replacement in reversed(list(zip(sections, section_xmls))):
        result = result[:match.start()] + replacement + result[match.end():]
    return result


def postprocess_writer_section_metadata(
    docx_bytes: bytes,
    *,
    source_html: str | None = None,
    source_docx: bytes | None = None,
) -> bytes:
    """Apply section metadata after source OOXML preservation has restored section XML.

    The HTML conversion creates the edited layout, while the source-aware pass
    restores header/footer references and original section structures. Apply
    the edited page setup and section flags last so preserving references does
    not roll back the user's page setup changes.
    """
    if not docx_bytes or not source_html:
        return docx_bytes
    meta_match = re.search(
        r"<!--vno-sections-meta:\s*(\[.*?\])\s*-->",
        source_html,
        re.IGNORECASE | re.DOTALL,
    )
    if not meta_match:
        return docx_bytes
    try:
        parsed_meta = json.loads(meta_match.group(1))
    except (TypeError, ValueError):
        return docx_bytes
    if not isinstance(parsed_meta, list):
        return docx_bytes
    section_meta = [item for item in parsed_meta if isinstance(item, dict)]
    if not section_meta:
        return docx_bytes

    document_bytes = read_zip_entry(docx_bytes, "word/document.xml")
    if not document_bytes:
        return docx_bytes
    document_xml = document_bytes.decode("utf-8", errors="replace")
    source_section_xmls: list[str] | None = None
    if source_docx:
        source_document_bytes = read_zip_entry(source_docx, "word/document.xml")
        if source_document_bytes:
            source_xml = source_document_bytes.decode("utf-8", errors="replace")
            source_section_xmls = [
                match.group(0)
                for match in re.finditer(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", source_xml, re.IGNORECASE)
            ]
            if len(section_meta) <= 1 or len(source_section_xmls) <= 1:
                document_xml = _collapse_single_section_cols(document_xml)
            source_rels = _resolve_docx_rels(source_docx)
            output_rels = _resolve_docx_rels(docx_bytes)

            def word_target(target: str) -> str:
                normalized = target.replace("\\", "/")
                return normalized.lstrip("/") if normalized.startswith("/") else posixpath.normpath(posixpath.join("word", normalized))

            output_ids_by_target = {word_target(target): r_id for r_id, target in output_rels.items()}
            source_to_output_ids = {
                source_id: output_ids_by_target[word_target(target)]
                for source_id, target in source_rels.items()
                if word_target(target) in output_ids_by_target
            }
            document_xml = _restore_writer_sections_by_order(
                document_xml, source_xml, r_id_map=source_to_output_ids,
            )
    elif len(section_meta) <= 1:
        document_xml = _collapse_single_section_cols(document_xml)
    document_xml = _apply_writer_link_to_previous(document_xml, section_meta)
    patched_xml = _restore_created_writer_section_metadata(document_xml, section_meta, source_section_xmls)
    replacements: dict[str, str | bytes | None] = {}
    if patched_xml != document_xml:
        replacements["word/document.xml"] = patched_xml

    settings_bytes = read_zip_entry(docx_bytes, "word/settings.xml")
    if settings_bytes:
        settings_xml = settings_bytes.decode("utf-8", errors="replace")
        different_odd_even = any(
            (section.get("headerFooter") or {}).get("differentOddEven")
            for section in section_meta
        )
        flag = re.search(r"<w:evenAndOddHeaders\b[^>]*/>", settings_xml, re.IGNORECASE)
        if different_odd_even and not flag:
            settings_xml = settings_xml.replace(
                "</w:settings>", "<w:evenAndOddHeaders/></w:settings>", 1
            )
        elif not different_odd_even and flag:
            settings_xml = re.sub(
                r"<w:evenAndOddHeaders\b[^>]*/>", "", settings_xml, flags=re.IGNORECASE
            )
        if settings_xml != settings_bytes.decode("utf-8", errors="replace"):
            replacements["word/settings.xml"] = settings_xml
    return patch_ooxml_zip(docx_bytes, replacements) if replacements else docx_bytes


def postprocess_created_writer_docx(docx_bytes: bytes, *, source_html: str | None = None) -> bytes:
    """W20 native corrections for Writer documents created from local HTML."""
    if not source_html:
        return docx_bytes
    document_bytes = read_zip_entry(docx_bytes, "word/document.xml")
    if not document_bytes:
        return docx_bytes
    document_xml = document_bytes.decode("utf-8", errors="replace")
    document_xml = _remove_duplicate_adjacent_writer_tables(document_xml, source_html)
    indent_by_text: dict[str, int] = {}
    for match in re.finditer(r"<p\b(?=[^>]*\bstyle=([\"'])([^\"']*)\1)[^>]*>([\s\S]*?)</p\s*>", source_html, re.IGNORECASE):
        indent = re.search(r"(?:^|;)\s*text-indent\s*:\s*([\d.]+)cm\s*(?:;|$)", match.group(2), re.IGNORECASE)
        text = _writer_html_plain(match.group(3))
        if indent and text:
            indent_by_text[text] = round(float(indent.group(1)) / 2.54 * 1440)

    def patch_indent(match: re.Match) -> str:
        paragraph = match.group(0)
        twips = indent_by_text.get(_paragraph_plain_text(paragraph).strip())
        return _writer_upsert_ppr_empty(paragraph, "ind", f'<w:ind w:firstLine="{twips}"/>') if twips else paragraph

    document_xml = re.sub(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", patch_indent, document_xml, flags=re.IGNORECASE)
    document_xml = _writer_restore_created_paragraph_css(document_xml, source_html)

    section_meta: list[dict] = []
    meta_match = re.search(r"<!--vno-sections-meta:\s*(\[.*?\])\s*-->", source_html, re.IGNORECASE | re.DOTALL)
    if meta_match:
        try:
            parsed_meta = json.loads(meta_match.group(1))
            if isinstance(parsed_meta, list):
                section_meta = [item for item in parsed_meta if isinstance(item, dict)]
        except (TypeError, ValueError):
            section_meta = []
    section_ids = re.findall(r'data-vno-export-section=["\']([^"\']+)["\']', source_html, re.IGNORECASE)
    if section_meta:
        section_ids = [str(section.get("id")) for section in section_meta if section.get("id")]
    section_starts = []
    for section_id in section_ids[1:]:
        div_open = re.search(
            rf'<div\b[^>]*data-vno-export-section=["\']{re.escape(section_id)}["\'][^>]*>\s*',
            source_html,
            re.IGNORECASE,
        )
        if not div_open:
            continue
        # Khối đầu của phần có thể là đoạn, tiêu đề, danh sách hoặc bảng (đo bằng Word thật 06/10: phần mở đầu bằng
        # danh sách/tiêu đề trước đây không tìm được đoạn đầu → ngắt mục biến mất và các phần dồn thành một).
        first_block = re.match(r'<(p|h[1-6]|li|td|th)\b([^>]*)>([\s\S]*?)</\1\s*>', source_html[div_open.end():], re.IGNORECASE)
        if not first_block:
            first_block = re.match(r'<(?:ol|ul|table|tbody|tr|thead|blockquote)\b[^>]*>\s*(?:<(?:tbody|tr|thead)\b[^>]*>\s*)*<(p|h[1-6]|li|td|th)\b([^>]*)>([\s\S]*?)</\1\s*>', source_html[div_open.end():], re.IGNORECASE)
        if first_block:
            bookmark = re.search(r"\bid=[\"'](vno-(?:untouched|edited)-\d+)[\"']", first_block.group(0), re.IGNORECASE)
            sec_type = "nextPage"
            type_m = re.search(rf'<div\b[^>]*data-vno-export-section=["\']{re.escape(section_id)}["\'][^>]*data-vno-section-type=["\']([^"\']+)["\']', source_html, re.IGNORECASE)
            if type_m:
                sec_type = type_m.group(1)
            else:
                for sm in section_meta:
                    if str(sm.get("id")) == section_id:
                        sec_type = sm.get("type") or "nextPage"
                        break
            section_starts.append((_writer_html_plain(first_block.group(3)), bookmark.group(1) if bookmark else "", sec_type))
    for section_text, section_bookmark, section_type in section_starts:
        if not section_text and not section_bookmark:
            continue
        paragraphs = list(re.finditer(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", document_xml, re.IGNORECASE))
        # Equation markers have already become OMML, so the HTML text is no
        # longer equal to the OOXML text. Use the paragraph's conversion
        # bookmark first to keep its section boundary and header/footer edits.
        target_index = next((index for index, match in enumerate(paragraphs)
                             if section_bookmark and re.search(
                                 rf'<w:bookmarkStart\b[^>]*\bw:name=["\']{re.escape(section_bookmark)}["\']',
                                 match.group(0), re.IGNORECASE)), None)
        if target_index is None:
            target_index = next((index for index, match in enumerate(paragraphs)
                                 if _paragraph_plain_text(match.group(0)).strip() == section_text), None)
        final_sect = re.search(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", document_xml, re.IGNORECASE)
        if target_index is not None and target_index > 0 and final_sect:
            carrier_match = paragraphs[target_index - 1]
            carrier = carrier_match.group(0)
            section_props = re.sub(r"<w:type\b[^>]*/>", "", final_sect.group(0), flags=re.IGNORECASE)
            valid_types = ("nextPage", "continuous", "evenPage", "oddPage")
            stype = section_type if section_type in valid_types else "nextPage"
            section_props = re.sub(r"(<w:sectPr\b[^>]*>)", rf'\1<w:type w:val="{stype}"/>', section_props, count=1)
            carrier = _writer_upsert_ppr_empty(carrier, "sectPr", section_props)
            document_xml = document_xml[:carrier_match.start()] + carrier + document_xml[carrier_match.end():]
    if section_starts:
        sections = list(re.finditer(r'<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>', document_xml, re.IGNORECASE))
        if sections:
            final = sections[-1]
            cleaned = re.sub(r'<w:type\b[^>]*/>', '', final.group(0), flags=re.IGNORECASE)
            document_xml = document_xml[:final.start()] + cleaned + document_xml[final.end():]

    # W22e: Định hướng trang Landscape và Cột cho từng section theo metadata
    if section_ids:
        section_orientations = {}
        for sid in section_ids:
            sec_page = re.search(rf"@page\s+(?:vno-)?{re.escape(sid)}\s*\{{([^}}]*)\}}", source_html, re.IGNORECASE)
            if sec_page:
                css = sec_page.group(1)
                size_m = re.search(r"size\s*:\s*([\d.]+)mm\s+([\d.]+)mm", css, re.IGNORECASE)
                if size_m and float(size_m.group(1)) > float(size_m.group(2)):
                    section_orientations[sid] = "landscape"
                elif re.search(r"\blandscape\b", css, re.IGNORECASE):
                    section_orientations[sid] = "landscape"
                else:
                    section_orientations[sid] = "portrait"

        sections = list(re.finditer(r'<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>', document_xml, re.IGNORECASE))
        if len(sections) == len(section_ids):
            for idx, sid in enumerate(section_ids):
                sect_match = sections[idx]
                sect_content = sect_match.group(0)
                sect_updated = False
                if section_orientations.get(sid) == "landscape":
                    pgsz_m = re.search(r'<w:pgSz\b([^>]*)/?>', sect_content, re.IGNORECASE)
                    if pgsz_m:
                        w_m = re.search(r'\bw:w="(\d+)"', pgsz_m.group(1))
                        h_m = re.search(r'\bw:h="(\d+)"', pgsz_m.group(1))
                        if w_m and h_m:
                            w_val, h_val = int(w_m.group(1)), int(h_m.group(1))
                            land_w = max(w_val, h_val)
                            land_h = min(w_val, h_val)
                            if 15750 <= land_w <= 15900 and 12200 <= land_h <= 12300:
                                land_w, land_h = 15840, 12240
                            elif 16800 <= land_w <= 16900 and 11850 <= land_h <= 12000:
                                land_w, land_h = 16838, 11906
                            new_pgsz = f'<w:pgSz w:w="{land_w}" w:h="{land_h}" w:orient="landscape"/>'
                            sect_content = sect_content[:pgsz_m.start()] + new_pgsz + sect_content[pgsz_m.end():]
                            sect_updated = True

                sec_cols = None
                for sm in section_meta:
                    if str(sm.get("id")) == sid:
                        sec_cols = sm.get("columns") or sm.get("pageSetup", {}).get("columns")
                        break
                if not sec_cols:
                    div_cols = re.search(rf'<div\b[^>]*data-vno-export-section=["\']{re.escape(sid)}["\'][^>]*style=["\'][^"\']*column-count:\s*([1-4])', source_html, re.IGNORECASE)
                    if div_cols:
                        sec_cols = {"count": int(div_cols.group(1))}

                if sec_cols and isinstance(sec_cols, dict):
                    col_count = max(1, min(4, int(sec_cols.get("count") or 1)))
                    col_gap = float(sec_cols.get("gap") or 10.0)
                    col_rule = bool(sec_cols.get("rule"))
                    space_dxa = round(col_gap / 25.4 * 1440) if col_gap else 720
                    sep_attr = ' w:sep="1"' if col_rule else ""
                    cols_xml = f'<w:cols w:num="{col_count}" w:space="{space_dxa}"{sep_attr}/>' if col_count > 1 else '<w:cols w:num="1"/>'
                    if "<w:cols" in sect_content:
                        sect_content = re.sub(r'<w:cols\b[^>]*/>', cols_xml, sect_content, count=1, flags=re.IGNORECASE)
                    else:
                        for anchor in ("<w:formProt", "<w:vAlign", "<w:noEndnote", "<w:titlePg", "<w:docGrid", "</w:sectPr"):
                            pos = sect_content.find(anchor)
                            if pos >= 0:
                                sect_content = sect_content[:pos] + cols_xml + sect_content[pos:]
                                break
                    sect_updated = True

                if sect_updated:
                    document_xml = document_xml[:sect_match.start()] + sect_content + document_xml[sect_match.end():]
                    sections = list(re.finditer(r'<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>', document_xml, re.IGNORECASE))

    if len(section_ids) <= 1:
        document_xml = _collapse_single_section_cols(document_xml)
        single_cols = None
        if section_meta:
            single_cols = section_meta[0].get("columns") or section_meta[0].get("pageSetup", {}).get("columns")
        if not single_cols:
            col_match = re.search(r"(?:column-count|\bvno-column-count=[\"'])\s*:?=?\s*([2-4])", source_html, re.IGNORECASE)
            if col_match:
                gap_m = re.search(r"column-gap\s*:\s*([\d.]+)(mm|pt|px)", source_html, re.IGNORECASE)
                rule_m = re.search(r"column-rule\s*:\s*([^;\"']+)", source_html, re.IGNORECASE)
                gap_val = float(gap_m.group(1)) if gap_m else 10.0
                single_cols = {
                    "count": int(col_match.group(1)),
                    "gap": gap_val,
                    "rule": bool(rule_m and "none" not in rule_m.group(1).lower())
                }
        if single_cols and isinstance(single_cols, dict):
            count = max(1, min(4, int(single_cols.get("count") or 1)))
            gap_val = float(single_cols.get("gap") or 10.0)
            rule_val = bool(single_cols.get("rule"))
            space_dxa = round(gap_val / 25.4 * 1440) if gap_val else 720
            sep_attr = ' w:sep="1"' if rule_val else ""
            cols_xml = f'<w:cols w:num="{count}" w:space="{space_dxa}"{sep_attr}/>' if count > 1 else '<w:cols w:space="720"/>'

            def patch_single_cols(m: re.Match) -> str:
                s = m.group(0)
                if "<w:cols" in s:
                    return re.sub(r'<w:cols\b[^>]*/>', cols_xml, s, count=1, flags=re.IGNORECASE)
                for anchor in ("<w:formProt", "<w:vAlign", "<w:noEndnote", "<w:titlePg", "<w:docGrid", "</w:sectPr"):
                    pos = s.find(anchor)
                    if pos >= 0:
                        return s[:pos] + cols_xml + s[pos:]
                return s
            document_xml = re.sub(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", patch_single_cols, document_xml, flags=re.IGNORECASE)

    # Column breaks: replace paragraph carrying column break marker with <w:r><w:br w:type="column"/></w:r>
    document_xml = re.sub(
        r'<w:p\b[^>]*>(?:(?!<\/w:p>)[\s\S])*?(?:--- Ngắt cột \(Column Break\) ---|data-vno-column-break)[\s\S]*?<\/w:p\s*>',
        '<w:p><w:r><w:br w:type="column"/></w:r></w:p>',
        document_xml,
        flags=re.IGNORECASE
    )

    ln_match = re.search(r"<!--vno-line-numbers:\s*(\d+):([a-zA-Z]+)\s*-->", source_html, re.IGNORECASE)
    if ln_match:
        count_by = ln_match.group(1)
        restart_raw = ln_match.group(2).lower()
        restart_mode = "newPage" if restart_raw == "page" else ("newSection" if restart_raw == "section" else "continuous")
        ln_xml = f'<w:lnNumType w:countBy="{count_by}" w:restart="{restart_mode}"/>'
        def patch_ln(m: re.Match) -> str:
            s = m.group(0)
            if "<w:lnNumType" in s:
                return re.sub(r'<w:lnNumType\b[^>]*/>', ln_xml, s, count=1, flags=re.IGNORECASE)
            for anchor in ("<w:cols", "<w:formProt", "<w:vAlign", "<w:noEndnote", "<w:titlePg", "<w:docGrid", "</w:sectPr"):
                pos = s.find(anchor)
                if pos >= 0:
                    return s[:pos] + ln_xml + s[pos:]
            return s
        document_xml = re.sub(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", patch_ln, document_xml, flags=re.IGNORECASE)


    page = re.search(r"@page\s*\{[^}]*\bmargin\s*:\s*([\d.]+)mm\s+([\d.]+)mm\s+([\d.]+)mm\s+([\d.]+)mm", source_html, re.IGNORECASE)
    if page:
        top, right, bottom, left = (round(float(value) / 25.4 * 1440) for value in page.groups())
        def patch_margin(match: re.Match) -> str:
            tag = match.group(0)
            for name, value in (("top", top), ("right", right), ("bottom", bottom), ("left", left)):
                if re.search(rf"\bw:{name}=", tag, re.IGNORECASE):
                    tag = re.sub(rf"\bw:{name}=(['\"])[^'\"]*\1", f'w:{name}="{value}"', tag, flags=re.IGNORECASE)
                else:
                    tag = tag[:-2] + f' w:{name}="{value}"/>'
            return tag
        document_xml = re.sub(r"<w:pgMar\b[^>]*/>", patch_margin, document_xml, flags=re.IGNORECASE)

    # W22a: Superscript / Subscript (<w:vertAlign>)
    # LibreOffice HTML import turns <sup>/<sub> into <w:position w:val="..."/> (e.g. 8 for sup, -2 for sub).
    # Word COM Font.Superscript/Subscript requires native <w:vertAlign w:val="superscript|subscript"/>.
    # Chỉ đổi run có chữ đúng bằng nội dung <sup>/<sub> của HTML nguồn: `w:position` còn là "nâng/hạ chữ" hợp lệ
    # của tài liệu nhập (hàm này chạy cho cả tài liệu mở từ DOCX), không được biến mọi run nâng/hạ thành chỉ số.
    vert_align_texts: dict[str, set[str]] = {"superscript": set(), "subscript": set()}
    for tag, val in (("sup", "superscript"), ("sub", "subscript")):
        for m in re.finditer(rf"<{tag}\b[^>]*>([\s\S]*?)</{tag}\s*>", source_html, re.IGNORECASE):
            txt = _writer_html_plain(m.group(1)).strip()
            if txt:
                vert_align_texts[val].add(txt)

    if vert_align_texts["superscript"] or vert_align_texts["subscript"]:
        def patch_vert_align(r_match: re.Match) -> str:
            r = r_match.group(0)
            pos = re.search(r'<w:position\s+w:val="(-?\d+)"\s*/>', r, re.IGNORECASE)
            if not pos or pos.group(1) == "0":
                return r
            val = "subscript" if pos.group(1).startswith("-") else "superscript"
            txt = html.unescape("".join(re.findall(r"<w:t\b[^>]*>([^<]*)</w:t>", r))).strip()
            if txt not in vert_align_texts[val]:
                return r
            return r[:pos.start()] + f'<w:vertAlign w:val="{val}"/>' + r[pos.end():]

        document_xml = re.sub(r'<w:r\b[^>]*>[\s\S]*?</w:r\s*>', patch_vert_align, document_xml, flags=re.IGNORECASE)

    # W22b: Highlight text (<w:highlight>)
    # LibreOffice HTML import drops <mark> and inline background-color.
    highlight_texts: dict[str, str] = {}
    for mark in re.finditer(r'<mark\b[^>]*>([\s\S]*?)</mark\s*>', source_html, re.IGNORECASE):
        txt = _writer_html_plain(mark.group(1)).strip()
        if txt:
            highlight_texts[txt] = "yellow"
    for span in re.finditer(r'<(?:span|font)\b(?=[^>]*\bstyle=["\']([^"\']*)["\'])[^>]*>([\s\S]*?)</(?:span|font)\s*>', source_html, re.IGNORECASE):
        style = span.group(1)
        if re.search(
            r'background-color\s*:\s*(?:#ffff00|#ffcd00|yellow|rgb\(\s*255\s*,\s*(?:255|205)\s*,\s*0\s*\))',
            style,
            re.IGNORECASE,
        ):
            txt = _writer_html_plain(span.group(2)).strip()
            if txt:
                highlight_texts[txt] = "yellow"

    if highlight_texts:
        document_xml = re.sub(
            r'<w:r\b[^>]*>[\s\S]*?</w:r\s*>',
            lambda run: _writer_restore_created_run_highlight(run.group(0), highlight_texts),
            document_xml,
            flags=re.IGNORECASE,
        )

    # W22c: Chuẩn hóa kích thước trang Letter (12240 x 15840 twips = 612pt x 792pt)
    # LibreOffice xuất 216mm x 279mm thành 12246 x 15817 twips khiến Word COM đọc là 791pt thay vì 792pt.
    def patch_pgsz_letter(match: re.Match) -> str:
        tag = match.group(0)
        w_m = re.search(r'\bw:w="(\d+)"', tag)
        h_m = re.search(r'\bw:h="(\d+)"', tag)
        if not (w_m and h_m):
            return tag
        w_val, h_val = int(w_m.group(1)), int(h_m.group(1))
        if 12200 <= w_val <= 12300 and 15750 <= h_val <= 15900:
            tag = re.sub(r'\bw:w="\d+"', 'w:w="12240"', tag)
            tag = re.sub(r'\bw:h="\d+"', 'w:h="15840"', tag)
        elif 15750 <= w_val <= 15900 and 12200 <= h_val <= 12300:
            tag = re.sub(r'\bw:w="\d+"', 'w:w="15840"', tag)
            tag = re.sub(r'\bw:h="\d+"', 'w:h="12240"', tag)
        return tag

    document_xml = re.sub(r'<w:pgSz\b[^>]*/>', patch_pgsz_letter, document_xml, flags=re.IGNORECASE)

    # W22d / R13d: Khôi phục ngắt trang thường. LibreOffice bỏ CSS page-break-before /
    # break-before:page trên <p> và <h1>–<h6>. Khớp đoạn bằng bookmark vno-untouched-N
    # (fallback chữ duy nhất trên thân, không vào ô bảng). Đoạn rỗng → w:br type=page;
    # đoạn có chữ → w:pageBreakBefore.
    document_xml = _restore_writer_html_page_breaks(document_xml, source_html)
    if section_meta:
        document_xml = _restore_created_writer_section_metadata(document_xml, section_meta)

    # W22f: Khôi phục bề rộng cột bảng (w:gridCol & w:tcW) từ style width: ...cm của ô
    # LibreOffice HTML import bỏ qua thuộc tính width trên ô <td>, chia đều bề rộng các cột.
    table_col_widths: list[dict[int, int]] = []
    for tbl_match in re.finditer(r'<table\b[^>]*>([\s\S]*?)</table\s*>', source_html, re.IGNORECASE):
        tbl_html = tbl_match.group(1)
        first_tr = re.search(r'<tr\b[^>]*>([\s\S]*?)</tr\s*>', tbl_html, re.IGNORECASE)
        col_map: dict[int, int] = {}
        if first_tr:
            for c_idx, td_match in enumerate(re.finditer(r'<t[dh]\b(?=[^>]*\bstyle=["\']([^"\']*)["\'])[^>]*>', first_tr.group(1), re.IGNORECASE)):
                w_m = re.search(r'(?:^|;)\s*width\s*:\s*([\d.]+)cm(?:;|$)', td_match.group(1), re.IGNORECASE)
                if w_m:
                    cm_val = float(w_m.group(1))
                    pt_val = round(cm_val / 2.54 * 72, 1)
                    col_map[c_idx] = int(round(pt_val * 20))
        table_col_widths.append(col_map)

    if any(table_col_widths):
        tbl_idx = 0
        def patch_table(tbl_m: re.Match) -> str:
            nonlocal tbl_idx
            t_xml = tbl_m.group(0)
            if tbl_idx < len(table_col_widths) and table_col_widths[tbl_idx]:
                c_map = table_col_widths[tbl_idx]
                grid_m = re.search(r'<w:tblGrid\b[^>]*>([\s\S]*?)</w:tblGrid\s*>', t_xml, re.IGNORECASE)
                if grid_m:
                    cols = list(re.finditer(r'<w:gridCol\b[^>]*w:w="(\d+)"[^>]*/>', grid_m.group(1), re.IGNORECASE))
                    if cols:
                        col_diff = 0
                        new_cols_xml = []
                        for i, col in enumerate(cols):
                            old_w = int(col.group(1))
                            if i in c_map:
                                new_w = c_map[i]
                                col_diff += (new_w - old_w)
                                new_cols_xml.append(f'<w:gridCol w:w="{new_w}"/>')
                            else:
                                new_cols_xml.append(col.group(0))
                        new_grid = f'<w:tblGrid>{"".join(new_cols_xml)}</w:tblGrid>'
                        t_xml = t_xml[:grid_m.start()] + new_grid + t_xml[grid_m.end():]

                        tbl_w_m = re.search(r'<w:tblW\b[^>]*w:w="(\d+)"[^>]*/>', t_xml, re.IGNORECASE)
                        if tbl_w_m:
                            total_w = int(tbl_w_m.group(1)) + col_diff
                            t_xml = t_xml[:tbl_w_m.start()] + f'<w:tblW w:w="{total_w}" w:type="dxa"/>' + t_xml[tbl_w_m.end():]

                        def patch_row(r_m: re.Match) -> str:
                            r_xml = r_m.group(0)
                            cells = list(re.finditer(r'<w:tc\b[\s\S]*?</w:tc\s*>', r_xml, re.IGNORECASE))
                            for c_i, cell in enumerate(cells):
                                if c_i in c_map:
                                    target_w = c_map[c_i]
                                    cell_str = cell.group(0)
                                    cell_str = re.sub(r'<w:tcW\b[^>]*/>', f'<w:tcW w:w="{target_w}" w:type="dxa"/>', cell_str, count=1, flags=re.IGNORECASE)
                                    r_xml = r_xml[:cell.start()] + cell_str + r_xml[cell.end():]
                                    cells = list(re.finditer(r'<w:tc\b[\s\S]*?</w:tc\s*>', r_xml, re.IGNORECASE))
                            return r_xml

                        t_xml = re.sub(r'<w:tr\b[\s\S]*?</w:tr\s*>', patch_row, t_xml, flags=re.IGNORECASE)
            tbl_idx += 1
            return t_xml

        document_xml = re.sub(r'<w:tbl\b[\s\S]*?</w:tbl\s*>', patch_table, document_xml, flags=re.IGNORECASE)

    # W22g: Khôi phục tab stop (<w:tabs><w:tab w:val="left" w:pos="..."/>)
    # LibreOffice HTML import bỏ qua CSS tab-size trên đoạn văn.
    tab_stops_by_text: dict[str, int] = {}
    for p_m in re.finditer(r'<p\b(?=[^>]*\bstyle=["\']([^"\']*)["\'])[^>]*>([\s\S]*?)</p\s*>', source_html, re.IGNORECASE):
        style = p_m.group(1)
        tab_m = re.search(r'(?:^|;)\s*tab-size\s*:\s*([\d.]+)cm(?:;|$)', style, re.IGNORECASE)
        if tab_m:
            cm_v = float(tab_m.group(1))
            pt_v = round(cm_v / 2.54 * 72, 1)
            tw_v = int(round(pt_v * 20))
            txt = re.sub(r'\s+', ' ', _writer_html_plain(p_m.group(2))).strip()
            if txt:
                tab_stops_by_text[txt] = tw_v

    if tab_stops_by_text:
        def patch_tab_stop(p_match: re.Match) -> str:
            p = p_match.group(0)
            p_text = _paragraph_plain_text(p).strip()
            twips = tab_stops_by_text.get(p_text)
            if twips:
                tab_xml = f'<w:tabs><w:tab w:val="left" w:pos="{twips}"/></w:tabs>'
                if '<w:tabs' in p:
                    p = re.sub(r'<w:tabs\b[\s\S]*?</w:tabs>', tab_xml, p)
                elif '<w:bidi' in p:
                    p = p.replace('<w:bidi', f'{tab_xml}<w:bidi')
                elif '<w:spacing' in p:
                    p = p.replace('<w:spacing', f'{tab_xml}<w:spacing')
                elif '<w:ind' in p:
                    p = p.replace('<w:ind', f'{tab_xml}<w:ind')
                elif '<w:jc' in p:
                    p = p.replace('<w:jc', f'{tab_xml}<w:jc')
                elif '<w:rPr' in p:
                    p = p.replace('<w:rPr', f'{tab_xml}<w:rPr')
                elif '</w:pPr>' in p:
                    p = p.replace('</w:pPr>', f'{tab_xml}</w:pPr>')
                else:
                    p = re.sub(r'(<w:p\b[^>]*>)', rf'\1<w:pPr>{tab_xml}</w:pPr>', p, count=1)
            return p

        document_xml = re.sub(r'<w:p\b[^>]*>[\s\S]*?</w:p\s*>', patch_tab_stop, document_xml, flags=re.IGNORECASE)

    document_xml = _writer_restore_equation_markers(document_xml, source_html)
    styles_bytes = read_zip_entry(docx_bytes, "word/styles.xml")
    styles_xml = styles_bytes.decode("utf-8", errors="replace") if styles_bytes else ""
    if styles_xml:
        document_xml, styles_xml = _writer_restore_heading_styles(document_xml, styles_xml, source_html)
    document_xml = _writer_restore_toc_field(document_xml, source_html)
    replacements = {"word/document.xml": document_xml.encode("utf-8")}
    if styles_bytes and styles_xml != styles_bytes.decode("utf-8", errors="replace"):
        replacements["word/styles.xml"] = styles_xml.encode("utf-8")
    if _writer_toc_fallback_texts(source_html):
        settings_bytes = read_zip_entry(docx_bytes, "word/settings.xml")
        if settings_bytes:
            settings_xml = settings_bytes.decode("utf-8", errors="replace")
            if re.search(r"<w:updateFields\b", settings_xml, re.IGNORECASE):
                settings_xml = re.sub(
                    r'<w:updateFields\b[^>]*/>', '<w:updateFields w:val="true"/>',
                    settings_xml, count=1, flags=re.IGNORECASE,
                )
            else:
                settings_xml = settings_xml.replace(
                    "</w:settings>", '<w:updateFields w:val="true"/></w:settings>', 1
                )
            replacements["word/settings.xml"] = settings_xml.encode("utf-8")
    numbering_bytes = read_zip_entry(docx_bytes, "word/numbering.xml")
    numbering = numbering_bytes.decode("utf-8", errors="replace") if numbering_bytes else ""
    if numbering:
        document_xml, numbering = _writer_clone_lower_alpha_suffix(document_xml, numbering, source_html)
        replacements["word/document.xml"] = document_xml.encode("utf-8")
        replacements["word/numbering.xml"] = numbering.encode("utf-8")
    bullet_texts = {
        _writer_html_plain(item.group(1))
        for ul in re.finditer(r"<ul\b[^>]*>([\s\S]*?)</ul\s*>", source_html, re.IGNORECASE)
        for item in re.finditer(r"<li\b[^>]*>([\s\S]*?)</li\s*>", ul.group(1), re.IGNORECASE)
    }
    if numbering_bytes and bullet_texts:
        source_num_id = None
        for paragraph in re.findall(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", document_xml, re.IGNORECASE):
            if _paragraph_plain_text(paragraph).strip() in bullet_texts:
                num = re.search(r"<w:numId\b[^>]*w:val=([\"'])(\d+)\1", paragraph, re.IGNORECASE)
                if num:
                    source_num_id = num.group(2)
                    break
        num = re.search(rf"<w:num\b[^>]*w:numId=([\"']){source_num_id}\1[^>]*>[\s\S]*?</w:num\s*>", numbering, re.IGNORECASE) if source_num_id else None
        abstract = re.search(r"<w:abstractNumId\b[^>]*w:val=([\"'])(\d+)\1", num.group(0), re.IGNORECASE) if num else None
        source_abstract = re.search(
            rf"<w:abstractNum\b[^>]*w:abstractNumId=([\"']){abstract.group(2)}\1[^>]*>[\s\S]*?</w:abstractNum\s*>",
            numbering, re.IGNORECASE,
        ) if abstract else None
        if source_abstract:
            abstract_ids = [int(value) for value in re.findall(r"w:abstractNumId=([\"'])(\d+)\1", numbering, re.IGNORECASE) for value in [value[1]]]
            num_ids = [int(value) for value in re.findall(r"<w:num\b[^>]*w:numId=([\"'])(\d+)\1", numbering, re.IGNORECASE) for value in [value[1]]]
            new_abstract_id = max(abstract_ids, default=0) + 1
            new_num_id = max(num_ids, default=0) + 1
            bullet_abstract = re.sub(r"w:abstractNumId=([\"'])\d+\1", f'w:abstractNumId="{new_abstract_id}"', source_abstract.group(0), count=1)
            bullet_abstract = re.sub(r"<w:numFmt\b[^>]*/>", '<w:numFmt w:val="bullet"/>', bullet_abstract, flags=re.IGNORECASE)
            bullet_abstract = re.sub(r"<w:lvlText\b[^>]*/>", '<w:lvlText w:val="•"/>', bullet_abstract, flags=re.IGNORECASE)
            first_num = re.search(r"<w:num\b", numbering, re.IGNORECASE)
            insert_at = first_num.start() if first_num else numbering.rfind("</w:numbering>")
            numbering = numbering[:insert_at] + bullet_abstract + numbering[insert_at:]
            numbering = numbering.replace("</w:numbering>", f'<w:num w:numId="{new_num_id}"><w:abstractNumId w:val="{new_abstract_id}"/></w:num></w:numbering>')
            def assign_bullet(match: re.Match) -> str:
                paragraph = match.group(0)
                if _paragraph_plain_text(paragraph).strip() not in bullet_texts:
                    return paragraph
                return re.sub(r"(<w:numId\b[^>]*w:val=)([\"'])\d+\2", rf'\1"{new_num_id}"', paragraph, count=1, flags=re.IGNORECASE)
            document_xml = re.sub(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", assign_bullet, document_xml, flags=re.IGNORECASE)
            replacements["word/document.xml"] = document_xml.encode("utf-8")
            replacements["word/numbering.xml"] = numbering.encode("utf-8")

    page_fields = list(re.finditer(
        r'<span\b(?=[^>]*\bdata-vno-field=["\'](PAGE|NUMPAGES)["\'])[^>]*>([\s\S]*?)</span\s*>',
        source_html,
        re.IGNORECASE,
    ))
    if page_fields:
        with zipfile.ZipFile(io.BytesIO(docx_bytes), "r") as package:
            footer_names = [name for name in package.namelist() if re.fullmatch(r"word/footer\d+\.xml", name)]
        for name in footer_names:
            footer = read_zip_entry(docx_bytes, name)
            if not footer:
                continue
            source_footer = footer.decode("utf-8", errors="replace")
            patched_footer = source_footer
            for marker in page_fields:
                field_name = marker.group(1).upper()
                fallback = _writer_html_plain(marker.group(2)).strip() or "1"
                patched_footer = _writer_insert_page_field(patched_footer, field_name, fallback)
            if patched_footer != source_footer:
                replacements[name] = patched_footer.encode("utf-8")
    if section_meta:
        settings_bytes = read_zip_entry(docx_bytes, "word/settings.xml")
        if settings_bytes:
            settings_xml = settings_bytes.decode("utf-8", errors="replace")
            odd_even_enabled = any(
                bool((section.get("headerFooter") or {}).get("differentOddEven"))
                for section in section_meta
            )
            if odd_even_enabled:
                flag = re.search(r"<w:evenAndOddHeaders\b[^>]*/>", settings_xml, re.IGNORECASE)
                if flag:
                    flag_xml = flag.group(0)
                    if re.search(r'\bw:val=["\'](?:0|false|off)["\']', flag_xml, re.IGNORECASE):
                        settings_xml = settings_xml[:flag.start()] + "<w:evenAndOddHeaders/>" + settings_xml[flag.end():]
                elif "</w:settings>" in settings_xml:
                    settings_xml = settings_xml.replace("</w:settings>", "<w:evenAndOddHeaders/></w:settings>", 1)
            else:
                settings_xml = re.sub(r"<w:evenAndOddHeaders\b[^>]*/>", "", settings_xml, flags=re.IGNORECASE)
            replacements["word/settings.xml"] = settings_xml.encode("utf-8")
    return patch_ooxml_zip(docx_bytes, replacements)


def _writer_review_metadata(source_html: str) -> dict | None:
    match = re.search(r"<!--vno-review-meta-hex:([0-9a-f]+)-->", source_html or "", re.IGNORECASE)
    if not match:
        return None
    try:
        metadata = json.loads(bytes.fromhex(match.group(1)).decode("utf-8"))
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("Dữ liệu ghi chú/Track Changes trong bản xuất không hợp lệ.") from exc
    if not isinstance(metadata, dict) or not isinstance(metadata.get("records"), list):
        raise ValueError("Thiếu danh sách ghi chú/Track Changes trong bản xuất.")
    return metadata


def writer_accepted_view_html(source_html: str) -> str:
    """Remove deleted review ranges and temporary anchors for PDF/print output."""
    metadata = _writer_review_metadata(source_html)
    if not metadata:
        return source_html
    result = str(source_html or "")
    records = [item for item in metadata.get("records", []) if isinstance(item, dict)]
    for record in reversed(records):
        if record.get("type") != "revision" or record.get("kind") != "delete":
            continue
        start_name = re.escape(str(record.get("startBookmark") or ""))
        end_name = re.escape(str(record.get("endBookmark") or ""))
        if not start_name or not end_name:
            continue
        start = re.search(
            rf'<a\b(?=[^>]*\bname=["\']{start_name}["\'])[^>]*>\s*</a\s*>',
            result, re.IGNORECASE,
        )
        end = re.search(
            rf'<a\b(?=[^>]*\bname=["\']{end_name}["\'])[^>]*>\s*</a\s*>',
            result[start.end():], re.IGNORECASE,
        ) if start else None
        if start and end:
            end_start = start.end() + end.start()
            end_end = start.end() + end.end()
            result = result[:start.start()] + result[end_end:]
    result = re.sub(
        r'<a\b(?=[^>]*\bname=["\']vno-review-(?:start|end)-\d+["\'])[^>]*>\s*</a\s*>',
        "", result, flags=re.IGNORECASE,
    )
    result = re.sub(r"<!--vno-review-meta-hex:[0-9a-f]+-->", "", result, flags=re.IGNORECASE)
    return result


def _writer_find_review_bookmark_pair(document_xml: str, name: str) -> tuple[re.Match, re.Match]:
    escaped = re.escape(name)
    start_match = re.search(
        rf'<w:bookmarkStart\b(?=[^>]*\bw:name=["\']{escaped}["\'])[^>]*/?>',
        document_xml, re.IGNORECASE,
    )
    if not start_match:
        raise ValueError(f"LibreOffice không giữ được dấu neo {name} khi tạo DOCX.")
    bookmark_id = re.search(r'\bw:id=["\']([^"\']+)["\']', start_match.group(0), re.IGNORECASE)
    if not bookmark_id:
        raise ValueError(f"Dấu neo {name} thiếu mã bookmark trong DOCX.")
    end_re = re.compile(
        rf'<w:bookmarkEnd\b(?=[^>]*\bw:id=["\']{re.escape(bookmark_id.group(1))}["\'])[^>]*/?>',
        re.IGNORECASE,
    )
    end_match = end_re.search(document_xml, start_match.end())
    if not end_match:
        raise ValueError(f"DOCX thiếu điểm kết thúc cho dấu neo {name}.")
    return start_match, end_match


def _writer_next_ooxml_id(xml: str, tag: str) -> int:
    values = [int(value) for value in re.findall(
        rf'<w:{tag}\b[^>]*\bw:id=["\'](\d+)["\']', xml, re.IGNORECASE,
    )]
    return max(values, default=-1) + 1


def _writer_wrap_revision_fragment(
    fragment: str, kind: str, revision_id: int, author: str, date: str,
) -> str:
    tag = "del" if kind == "delete" else "ins"
    open_tag = (
        f'<w:{tag} w:id="{revision_id}" w:author="{_escape_xml(author)}" '
        f'w:date="{_escape_xml(date)}">'
    )
    boundary_re = re.compile(
        r'<w:commentRange(?:Start|End)\b[^>]*/>'
        r'|<w:r\b[^>]*>[\s\S]*?<w:commentReference\b[^>]*/>[\s\S]*?</w:r\s*>'
        r'|</w:p\s*>|<w:p\b[^>]*>|<w:pPr\b[^>]*>[\s\S]*?</w:pPr\s*>',
        re.IGNORECASE,
    )
    pieces = boundary_re.split(fragment)
    boundaries = boundary_re.findall(fragment)
    output: list[str] = []
    for index, piece in enumerate(pieces):
        if piece:
            content = re.sub(r'<w:t\b', '<w:delText', piece, flags=re.IGNORECASE) if kind == "delete" else piece
            content = re.sub(r'</w:t\s*>', '</w:delText>', content, flags=re.IGNORECASE) if kind == "delete" else content
            output.extend((open_tag, content, f'</w:{tag}>'))
        if index < len(boundaries):
            output.append(boundaries[index])
    return "".join(output)


_DOCX_NOTE_PARTS = {
    "footnote": {
        "token": "VNOFN", "part": "word/footnotes.xml", "target": "footnotes.xml", "root": "footnotes", "child": "footnote",
        "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes",
        "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml",
        "ref": "footnoteReference", "mark": "footnoteRef", "settings": "footnotePr",
    },
    "endnote": {
        "token": "VNOEN", "part": "word/endnotes.xml", "target": "endnotes.xml", "root": "endnotes", "child": "endnote",
        "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes",
        "type": "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml",
        "ref": "endnoteReference", "mark": "endnoteRef", "settings": "endnotePr",
    },
}
_W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _writer_notes_metadata(source_html: str) -> list[dict]:
    match = re.search(r"<!--vno-notes-meta-hex:([0-9a-f]+)-->", source_html or "", re.IGNORECASE)
    if not match:
        return []
    try:
        data = json.loads(bytes.fromhex(match.group(1)).decode("utf-8"))
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError("Dữ liệu chú thích trong bản xuất không hợp lệ.") from exc
    notes = data.get("notes") if isinstance(data, dict) else None
    return [item for item in (notes or []) if isinstance(item, dict) and item.get("kind") in _DOCX_NOTE_PARTS]


def postprocess_writer_notes(docx_bytes: bytes, *, source_html: str | None = None) -> bytes:
    """Dựng chú thích cuối trang/cuối tài liệu thật (footnotes.xml/endnotes.xml) từ mã tạm [[VNOFN:id]]/[[VNOEN:id]].

    Bộ chuyển HTML→DOCX của LibreOffice làm phẳng <sup> thành chữ thường; phía JS thay dấu tham chiếu bằng mã tạm và gửi
    nội dung ghi chú qua chú thích HTML vno-notes-meta-hex. Hàm này đổi mã tạm thành w:footnoteReference/w:endnoteReference.
    """
    notes = _writer_notes_metadata(source_html or "")
    if not docx_bytes or not notes:
        return docx_bytes
    document_bytes = read_zip_entry(docx_bytes, "word/document.xml")
    if not document_bytes:
        return docx_bytes
    document_xml = document_bytes.decode("utf-8", errors="replace")
    replacements: dict[str, bytes] = {}
    number_for: dict[tuple[str, str], int] = {}
    bodies: dict[str, list[tuple[int, str]]] = {"footnote": [], "endnote": []}
    for note in notes:
        kind = note["kind"]
        number = len(bodies[kind]) + 1
        number_for[(kind, str(note.get("id")))] = number
        bodies[kind].append((number, str(note.get("text") or "")))
    token_for = {spec["token"]: kind for kind, spec in _DOCX_NOTE_PARTS.items()}
    token_re = re.compile(r"\[\[(VNOFN|VNOEN):([^\]<>]+)\]\]")
    run_re = re.compile(
        r"<w:r\b[^>]*>(?P<rpr><w:rPr>(?:(?!</w:rPr>)[\s\S])*</w:rPr>)?<w:t(?:\s[^>]*)?>(?P<text>[^<]*\[\[VNO(?:FN|EN):[^<\]]+\]\][^<]*)</w:t></w:r>"
    )

    def split_run(match: re.Match) -> str:
        rpr = match.group("rpr") or ""
        text = match.group("text")
        out: list[str] = []
        position = 0

        def text_run(piece: str) -> str:
            return f'<w:r>{rpr}<w:t xml:space="preserve">{piece}</w:t></w:r>' if piece else ""

        for token in token_re.finditer(text):
            out.append(text_run(text[position:token.start()]))
            kind = token_for[token.group(1)]
            number = number_for.get((kind, token.group(2).strip()))
            if number is not None:
                spec = _DOCX_NOTE_PARTS[kind]
                out.append(
                    f'<w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:{spec["ref"]} w:id="{number}"/></w:r>'
                )
            position = token.end()
        out.append(text_run(text[position:]))
        return "".join(out)

    document_xml = run_re.sub(split_run, document_xml)
    document_xml = token_re.sub("", document_xml)  # mã tạm lọt vào run bị tách: bỏ để không lộ ra văn bản
    replacements["word/document.xml"] = document_xml.encode("utf-8")

    rels_bytes = read_zip_entry(docx_bytes, "word/_rels/document.xml.rels")
    rels_xml = rels_bytes.decode("utf-8", errors="replace") if rels_bytes else (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'
    )
    ct_bytes = read_zip_entry(docx_bytes, "[Content_Types].xml")
    ct_xml = ct_bytes.decode("utf-8", errors="replace") if ct_bytes else (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>'
    )
    settings_bytes = read_zip_entry(docx_bytes, "word/settings.xml")
    settings_xml = settings_bytes.decode("utf-8", errors="replace") if settings_bytes else (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="{_W_NS}"></w:settings>'
    )

    for kind, spec in _DOCX_NOTE_PARTS.items():
        if not bodies[kind]:
            continue
        items = []
        for number, text in bodies[kind]:
            lines = text.splitlines() or [""]
            first = (
                f'<w:p><w:r><w:rPr><w:vertAlign w:val="superscript"/></w:rPr><w:{spec["mark"]}/></w:r>'
                f'<w:r><w:t xml:space="preserve"> {_escape_xml(lines[0])}</w:t></w:r></w:p>'
            )
            rest = "".join(f'<w:p><w:r><w:t xml:space="preserve">{_escape_xml(line)}</w:t></w:r></w:p>' for line in lines[1:])
            items.append(f'<w:{spec["child"]} w:id="{number}">{first}{rest}</w:{spec["child"]}>')
        separators = (
            f'<w:{spec["child"]} w:type="separator" w:id="-1"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>'
            f'<w:r><w:separator/></w:r></w:p></w:{spec["child"]}>'
            f'<w:{spec["child"]} w:type="continuationSeparator" w:id="0"><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>'
            f'<w:r><w:continuationSeparator/></w:r></w:p></w:{spec["child"]}>'
        )
        replacements[spec["part"]] = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            f'<w:{spec["root"]} xmlns:w="{_W_NS}">{separators}{"".join(items)}</w:{spec["root"]}>'
        ).encode("utf-8")
        if not re.search(r'Type="[^"]*/' + spec["root"] + '"', rels_xml):
            rels_xml = _add_rels_entry(rels_xml, f"rId{_max_rels_rid(rels_xml) + 1}", spec["rel"], spec["target"])
        ct_xml = _add_content_types_override(ct_xml, "/" + spec["part"], spec["type"])
        if f'<w:{spec["settings"]}' not in settings_xml:
            block = f'<w:{spec["settings"]}><w:{spec["child"]} w:id="-1"/><w:{spec["child"]} w:id="0"/></w:{spec["settings"]}>'
            anchor = next((tag for tag in ("<w:endnotePr", "<w:compat", "<w:rsids", "<w:themeFontLang") if tag in settings_xml and tag != f'<w:{spec["settings"]}'), None)
            if spec["settings"] == "endnotePr":
                anchor = next((tag for tag in ("<w:compat", "<w:rsids", "<w:themeFontLang") if tag in settings_xml), None)
            if anchor:
                settings_xml = settings_xml.replace(anchor, block + anchor, 1)
            else:
                settings_xml = settings_xml.replace("</w:settings>", block + "</w:settings>", 1)
    replacements["word/_rels/document.xml.rels"] = rels_xml.encode("utf-8")
    replacements["[Content_Types].xml"] = ct_xml.encode("utf-8")
    replacements["word/settings.xml"] = settings_xml.encode("utf-8")
    return patch_ooxml_zip(docx_bytes, replacements)


def postprocess_writer_captions(docx_bytes: bytes, *, source_html: str | None = None) -> bytes:
    """Chú thích hình/bảng: số thứ tự thành trường Word `SEQ <nhãn> \\* ARABIC` (Danh mục hình/bảng của Word dùng được)."""
    if not docx_bytes or not source_html or "vno-caption-number" not in source_html:
        return docx_bytes
    captions = re.findall(
        r'<span\b[^>]*class="vno-caption-label"[^>]*>([^<]+)</span>\s*<span\b[^>]*class="vno-caption-number"[^>]*>(\d+)</span>',
        source_html,
    )
    if not captions:
        return docx_bytes
    document_bytes = read_zip_entry(docx_bytes, "word/document.xml")
    if not document_bytes:
        return docx_bytes
    document_xml = document_bytes.decode("utf-8", errors="replace")
    run_re = re.compile(r"<w:r\b[^>]*>(?P<rpr><w:rPr>(?:(?!</w:rPr>)[\s\S])*</w:rPr>)?<w:t(?:\s[^>]*)?>(?P<text>[^<]*)</w:t></w:r>")
    position = 0
    changed = False
    for label, number in captions:
        label = html.unescape(label).strip()
        wanted = f"{_escape_xml(label)} {number}"
        found = None
        for match in run_re.finditer(document_xml, position):
            text = match.group("text")
            index = text.find(wanted)
            if index >= 0:
                found = (match, index)
                break
        if not found:
            continue
        match, index = found
        text = match.group("text")
        rpr = match.group("rpr") or ""
        before = text[:index] + _escape_xml(label) + " "
        after = text[index + len(wanted):]
        instruction = f" SEQ {_escape_xml(label)} \\* ARABIC "
        replacement = (
            f'<w:r>{rpr}<w:t xml:space="preserve">{before}</w:t></w:r>'
            f'<w:fldSimple w:instr="{instruction}"><w:r>{rpr}<w:t>{number}</w:t></w:r></w:fldSimple>'
            + (f'<w:r>{rpr}<w:t xml:space="preserve">{after}</w:t></w:r>' if after else "")
        )
        document_xml = document_xml[:match.start()] + replacement + document_xml[match.end():]
        position = match.start() + len(replacement)
        changed = True
    if not changed:
        return docx_bytes
    return patch_ooxml_zip(docx_bytes, {"word/document.xml": document_xml.encode("utf-8")})


def postprocess_writer_schema_fixes(docx_bytes: bytes) -> bytes:
    """Lưới an toàn cuối: sửa các phần tử không hợp lệ theo schema mà Word từ chối mở (cả tệp)."""
    document_bytes = read_zip_entry(docx_bytes, "word/document.xml") if docx_bytes else None
    if not document_bytes:
        return docx_bytes
    document_xml = document_bytes.decode("utf-8", errors="replace")
    fixed = re.sub(r"<wp:wrapSquare\s*/>", '<wp:wrapSquare wrapText="bothSides"/>', document_xml)
    fixed = re.sub(r"<wp:wrap(?:Tight|Through)\b[^>]*?/>", '<wp:wrapSquare wrapText="bothSides"/>', fixed)
    if fixed == document_xml:
        return docx_bytes
    return patch_ooxml_zip(docx_bytes, {"word/document.xml": fixed.encode("utf-8")})


def postprocess_writer_strip_markers(docx_bytes: bytes) -> bytes:
    """Gỡ dấu trang tạm `vno-edited-N` / `vno-untouched-N` còn sót trong DOCX cuối.

    Chúng chỉ phục vụ ghép đoạn lúc lưu; để lại thì (1) hiện trong danh sách dấu trang của Word, (2) khiến lần mở lại bị coi là
    "đã sửa" nên không giữ nguyên gói gốc (mất chú thích...).
    """
    document_bytes = read_zip_entry(docx_bytes, "word/document.xml") if docx_bytes else None
    if not document_bytes:
        return docx_bytes
    document_xml = document_bytes.decode("utf-8", errors="replace")
    if "vno-edited-" not in document_xml and "vno-untouched-" not in document_xml:
        return docx_bytes
    marker_ids = set(re.findall(
        r'<w:bookmarkStart\b(?=[^>]*\bw:name="vno-(?:edited|untouched)-\d+")[^>]*\bw:id="([^"]+)"', document_xml,
    ))
    marker_ids.update(re.findall(
        r'<w:bookmarkStart\b(?=[^>]*\bw:id="([^"]+)")(?=[^>]*\bw:name="vno-(?:edited|untouched)-\d+")', document_xml,
    ))
    cleaned = re.sub(r'<w:bookmarkStart\b(?=[^>]*\bw:name="vno-(?:edited|untouched)-\d+")[^>]*/>', "", document_xml)
    for marker_id in marker_ids:
        cleaned = re.sub(rf'<w:bookmarkEnd\b[^>]*\bw:id="{re.escape(marker_id)}"[^>]*/>', "", cleaned)
    if cleaned == document_xml:
        return docx_bytes
    return patch_ooxml_zip(docx_bytes, {"word/document.xml": cleaned.encode("utf-8")})


def postprocess_writer_drop_caps(docx_bytes: bytes, *, source_html: str | None = None) -> bytes:
    """Chữ cái đầu đoạn (drop cap): tách chữ cái thành đoạn khung `w:framePr w:dropCap` như Word, phần còn lại giữ nguyên đoạn."""
    if not docx_bytes or not source_html or "vno-drop-cap" not in source_html:
        return docx_bytes
    caps: dict[str, tuple[str, int]] = {}
    for match in re.finditer(r"<p\b[^>]*>((?:(?!</p>)[\s\S])*?<span\b[^>]*class=\"vno-drop-cap\"[^>]*data-drop-lines=\"(\d+)\"[^>]*>([^<])</span>(?:(?!</p>)[\s\S])*?)</p>", source_html, re.IGNORECASE):
        text = re.sub(r"\s+", " ", _writer_html_plain(match.group(1))).strip()
        if text:
            caps[text] = (match.group(3), max(2, min(8, int(match.group(2)))))
    if not caps:
        return docx_bytes
    document_bytes = read_zip_entry(docx_bytes, "word/document.xml")
    if not document_bytes:
        return docx_bytes
    document_xml = document_bytes.decode("utf-8", errors="replace")
    changed = False

    def patch(match: re.Match) -> str:
        nonlocal changed
        paragraph = match.group(0)
        text = re.sub(r"\s+", " ", _paragraph_plain_text(paragraph)).strip()
        found = caps.get(text)
        if not found or "<w:framePr" in paragraph:
            return paragraph
        letter, lines = found
        if letter in "&<>" or not text.startswith(letter):
            return paragraph
        run = re.search(r"<w:r\b[^>]*>(?:<w:rPr>(?:(?!</w:rPr>)[\s\S])*</w:rPr>)?<w:t(?:\s[^>]*)?>([^<]*)</w:t></w:r>", paragraph)
        if not run or not run.group(1).startswith(letter):
            return paragraph
        # Cỡ thân lấy từ các run SAU chữ cái (run chữ cái đã được phóng to); không có thì 14 pt (chuẩn văn bản hành chính).
        size_match = re.search(r'<w:sz w:val="(\d+)"', paragraph[run.end():]) or re.search(r'<w:sz w:val="(\d+)"', paragraph[:run.start()])
        body_half_points = int(size_match.group(1)) if size_match else 28
        cap_half_points = min(400, round(body_half_points * lines * 1.25))
        full = run.group(0)
        remainder_text = run.group(1)[len(letter):]
        replacement_run = "" if not remainder_text else re.sub(
            r"(<w:t(?:\s[^>]*)?>)[^<]*(</w:t>)", lambda m: f'<w:t xml:space="preserve">{remainder_text}</w:t>', full, count=1,
        )
        rest = paragraph[:run.start()] + replacement_run + paragraph[run.end():]
        frame = (
            '<w:p><w:pPr><w:framePr w:dropCap="drop" w:lines="' + str(lines) + '" w:wrap="around" w:vAnchor="text" w:hAnchor="text"/>'
            f'<w:spacing w:after="0" w:line="{lines * 240 + 40}" w:lineRule="exact"/></w:pPr>'
            f'<w:r><w:rPr><w:position w:val="-{lines * 6}"/><w:sz w:val="{cap_half_points}"/><w:szCs w:val="{cap_half_points}"/></w:rPr>'
            f'<w:t>{letter}</w:t></w:r></w:p>'
        )
        changed = True
        return frame + rest

    document_xml = re.sub(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", patch, document_xml, flags=re.IGNORECASE)
    if not changed:
        return docx_bytes
    return patch_ooxml_zip(docx_bytes, {"word/document.xml": document_xml.encode("utf-8")})


def postprocess_writer_merge_fields(docx_bytes: bytes, *, source_html: str | None = None) -> bytes:
    """Trường trộn thư «Tên» thành trường Word `MERGEFIELD Tên` (Word mở tệp mẫu vẫn trộn được)."""
    if not docx_bytes or not source_html or "vno-merge-field" not in source_html:
        return docx_bytes
    names = [html.unescape(name).strip() for name in re.findall(
        r'<span\b[^>]*class="[^"]*vno-merge-field[^"]*"[^>]*data-field="([^"]+)"|<span\b[^>]*data-field="([^"]+)"[^>]*class="[^"]*vno-merge-field', source_html
    ) for name in name if name]
    if not names:
        return docx_bytes
    document_bytes = read_zip_entry(docx_bytes, "word/document.xml")
    if not document_bytes:
        return docx_bytes
    document_xml = document_bytes.decode("utf-8", errors="replace")
    run_re = re.compile(r"<w:r\b[^>]*>(?P<rpr><w:rPr>(?:(?!</w:rPr>)[\s\S])*</w:rPr>)?<w:t(?:\s[^>]*)?>(?P<text>[^<]*«[^<»]+»[^<]*)</w:t></w:r>")
    known = {_escape_xml(name) for name in names}
    token_re = re.compile(r"«([^<»]+)»")
    changed = False

    def split_run(match: re.Match) -> str:
        nonlocal changed
        rpr = match.group("rpr") or ""
        text = match.group("text")
        out: list[str] = []
        position = 0
        for token in token_re.finditer(text):
            if token.group(1) not in known:
                continue
            if token.start() > position:
                out.append(f'<w:r>{rpr}<w:t xml:space="preserve">{text[position:token.start()]}</w:t></w:r>')
            name = token.group(1)
            out.append(
                f'<w:fldSimple w:instr=" MERGEFIELD {name} \\* MERGEFORMAT "><w:r>{rpr}<w:t>«{name}»</w:t></w:r></w:fldSimple>'
            )
            position = token.end()
            changed = True
        if position == 0:
            return match.group(0)
        if position < len(text):
            out.append(f'<w:r>{rpr}<w:t xml:space="preserve">{text[position:]}</w:t></w:r>')
        return "".join(out)

    document_xml = run_re.sub(split_run, document_xml)
    if not changed:
        return docx_bytes
    return patch_ooxml_zip(docx_bytes, {"word/document.xml": document_xml.encode("utf-8")})


def postprocess_writer_if_ref_fields(docx_bytes: bytes, *, source_html: str | None = None) -> bytes:
    """Serialize Writer mail-merge rules and internal cross references as Word fields."""
    if not docx_bytes or not source_html:
        return docx_bytes
    # Parse attributes and visible fallback text from the HTML saved by Writer.
    class _Fields(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.rules = []
            self.refs = []
            self.active = None
        def handle_starttag(self, tag, attrs):
            if tag != "span" and tag != "a": return
            a = dict(attrs)
            if "data-merge-if" in a:
                self.active = ["if", a, ""]
            elif tag == "a" and "vno-cross-ref" in (a.get("class") or "") and (a.get("href") or "").startswith("#"):
                self.active = ["ref", a, ""]
        def handle_data(self, data):
            if self.active: self.active[2] += data
        def handle_endtag(self, tag):
            if self.active and ((self.active[0] == "if" and tag == "span") or (self.active[0] == "ref" and tag == "a")):
                (self.rules if self.active[0] == "if" else self.refs).append(self.active)
                self.active = None
    parser = _Fields()
    parser.feed(source_html)
    document_bytes = read_zip_entry(docx_bytes, "word/document.xml")
    if not document_bytes or not (parser.rules or parser.refs): return docx_bytes
    xml = document_bytes.decode("utf-8", errors="replace")
    changed = False
    for _, attrs, fallback in parser.rules:
        field = (attrs.get("data-merge-if") or "").strip()
        op = attrs.get("data-op") or "equals"
        operators = {"equals": "=", "notEquals": "<>", "greaterThan": ">", "lessThan": "<", "empty": "=", "notEmpty": "<>"}
        # `contains` KHÔNG xuất được: đo bằng Word thật (06/10) thì IF "xxabcxx" = "*abc*" cho kết quả sai
        # (ký tự thay thế `*` ở cả hai đầu không được Word hỗ trợ), nên giữ nguyên văn bản kết quả.
        if not field or op not in operators: continue
        value = "" if op in ("empty", "notEmpty") else (attrs.get("data-value") or "")
        then = attrs.get("data-then") or ""
        otherwise = attrs.get("data-else") or ""
        # Word field arguments use escaped quotes inside quoted literals.
        quote = lambda value: '"' + value.replace('\\', '\\\\').replace('"', '\\"') + '"'
        tail_instr = f' {operators[op]} {quote(value)} {quote(then)} {quote(otherwise)} '

        def _fld(kind: str, rpr: str = "") -> str:
            return f'<w:r>{rpr}<w:fldChar w:fldCharType="{kind}"/></w:r>'

        def _instr(text: str, rpr: str = "") -> str:
            return f'<w:r>{rpr}<w:instrText xml:space="preserve">{_escape_xml(text)}</w:instrText></w:r>'

        def build_if_field(rpr: str = "") -> str:
            # Word chỉ coi MERGEFIELD là trường lồng khi nó là trường phức (fldChar) nằm TRONG lệnh IF;
            # dấu `{ }` viết thẳng vào instr là chữ thường (Word hiện kết quả "MERGEFIELD" sai).
            return (
                _fld("begin", rpr) + _instr(" IF ", rpr)
                + _fld("begin", rpr) + _instr(f" MERGEFIELD {field} ", rpr) + _fld("separate", rpr)
                + f'<w:r>{rpr}<w:t>«{_escape_xml(field)}»</w:t></w:r>' + _fld("end", rpr)
                + _instr(tail_instr, rpr) + _fld("separate", rpr)
                + f'<w:r>{rpr}<w:t xml:space="preserve">{_escape_xml(fallback)}</w:t></w:r>' + _fld("end", rpr)
            )
        if fallback:
            text_pattern = re.compile(r'<w:r\b[^>]*>(?P<rpr><w:rPr>[\s\S]*?</w:rPr>)?<w:t(?:\s[^>]*)?>(?P<text>[^<]*)</w:t></w:r>')
            escaped_fallback = _escape_xml(fallback)
            runs = list(text_pattern.finditer(xml))
            exact = next((m for m in runs if m.group("text") == escaped_fallback), None)
            embedded = [m for m in runs if escaped_fallback in m.group("text")]
            selected = exact or (embedded[0] if len(embedded) == 1 else None)
            if selected:
                text = selected.group("text")
                at = text.find(escaped_fallback)
                rpr = selected.group("rpr") or ""
                before, after = text[:at], text[at + len(escaped_fallback):]
                pieces = []
                if before: pieces.append(f'<w:r>{rpr}<w:t xml:space="preserve">{before}</w:t></w:r>')
                pieces.append(build_if_field(rpr))
                if after: pieces.append(f'<w:r>{rpr}<w:t xml:space="preserve">{after}</w:t></w:r>')
                xml = xml[:selected.start()] + "".join(pieces) + xml[selected.end():]
                changed = True
    for _, attrs, display in parser.refs:
        target = (attrs.get("href") or "")[1:]
        if not target: continue
        # LibreOffice emits the bookmark name as the hyperlink anchor.
        instr = f' REF {target} \\h '
        field_xml = f'<w:fldSimple w:instr="{_escape_xml(instr)}"><w:r><w:t>{_escape_xml(display)}</w:t></w:r></w:fldSimple>'
        pattern = re.compile(r'<w:hyperlink\b(?=[^>]*\bw:anchor="' + re.escape(_escape_xml(target)) + r'")[^>]*>[\s\S]*?</w:hyperlink>')
        xml, count = pattern.subn(lambda _: field_xml, xml, count=1)
        changed |= count > 0
    return patch_ooxml_zip(docx_bytes, {"word/document.xml": xml.encode("utf-8")}) if changed else docx_bytes


_CSS_NAMED_COLORS = {"black": "000000", "white": "FFFFFF", "red": "FF0000", "green": "008000", "blue": "0000FF", "yellow": "FFFF00",
                     "gray": "808080", "grey": "808080", "orange": "FFA500", "navy": "000080"}


def _css_color_hex(value: str) -> str | None:
    value = (value or "").strip().lower()
    match = re.fullmatch(r"#([0-9a-f]{3})", value)
    if match:
        return "".join(ch * 2 for ch in match.group(1)).upper()
    match = re.fullmatch(r"#([0-9a-f]{6})(?:[0-9a-f]{2})?", value)
    if match:
        return match.group(1).upper()
    match = re.fullmatch(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)", value)
    if match:
        return "".join(f"{min(255, int(part)):02X}" for part in match.groups())
    return _CSS_NAMED_COLORS.get(value)


def postprocess_writer_page_decor(docx_bytes: bytes, *, source_html: str | None = None) -> bytes:
    """Viền trang (w:pgBorders) và màu nền trang (w:background): bộ nhập HTML của LibreOffice bỏ `border`/`background-color` của @page."""
    if not docx_bytes or not source_html:
        return docx_bytes
    line_numbers = re.search(r"<!--vno-line-numbers:(\d+):(continuous|page|section)-->", source_html)
    block = re.search(r"@page\s*\{([^}]*)\}", source_html, re.IGNORECASE)
    if not block and not line_numbers:
        return docx_bytes
    css = block.group(1) if block else ""
    border = re.search(
        r"(?:^|[;\s])border\s*:\s*([\d.]+)pt\s+(solid|dashed|dotted|double|groove|ridge|inset|outset)\s+(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|[a-zA-Z]+)",
        css, re.IGNORECASE,
    )
    background = re.search(r"background-color\s*:\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|[a-zA-Z]+)", css, re.IGNORECASE)
    if not border and not background and not line_numbers:
        return docx_bytes
    document_bytes = read_zip_entry(docx_bytes, "word/document.xml")
    if not document_bytes:
        return docx_bytes
    document_xml = document_bytes.decode("utf-8", errors="replace")
    replacements: dict[str, bytes] = {}
    if line_numbers:
        restart = {"continuous": "continuous", "page": "newPage", "section": "newSection"}[line_numbers.group(2)]
        ln_xml = f'<w:lnNumType w:countBy="{max(1, int(line_numbers.group(1)))}" w:restart="{restart}"/>'

        def add_line_numbers(match: re.Match) -> str:
            sect = match.group(0)
            if "<w:lnNumType" in sect:
                return sect
            for anchor in ("<w:pgNumType", "<w:cols", "<w:vAlign", "<w:docGrid", "</w:sectPr"):
                position = sect.find(anchor)
                if position >= 0:
                    return sect[:position] + ln_xml + sect[position:]
            return sect

        document_xml = re.sub(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", add_line_numbers, document_xml, flags=re.IGNORECASE)
    if border:
        color = _css_color_hex(border.group(3)) or "000000"
        style = {"solid": "single", "dashed": "dashed", "dotted": "dotted", "double": "double"}.get(border.group(2).lower(), "single")
        size = max(2, min(96, round(float(border.group(1)) * 8)))
        sides = "".join(
            f'<w:{side} w:val="{style}" w:sz="{size}" w:space="24" w:color="{color}"/>' for side in ("top", "left", "bottom", "right")
        )
        block_xml = f'<w:pgBorders w:offsetFrom="page">{sides}</w:pgBorders>'

        def add_borders(match: re.Match) -> str:
            sect = match.group(0)
            if "<w:pgBorders" in sect:
                return sect
            mar = re.search(r"<w:pgMar\b[^>]*/>", sect, re.IGNORECASE)
            if mar:
                return sect[:mar.end()] + block_xml + sect[mar.end():]
            size_tag = re.search(r"<w:pgSz\b[^>]*/>", sect, re.IGNORECASE)
            return sect[:size_tag.end()] + block_xml + sect[size_tag.end():] if size_tag else sect

        document_xml = re.sub(r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>", add_borders, document_xml, flags=re.IGNORECASE)
    bg_color = _css_color_hex(background.group(1)) if background else None
    if bg_color and bg_color != "FFFFFF" and "<w:background" not in document_xml:
        document_xml = re.sub(r"(<w:document\b[^>]*>)", rf'\1<w:background w:color="{bg_color}"/>', document_xml, count=1, flags=re.IGNORECASE)
        settings_bytes = read_zip_entry(docx_bytes, "word/settings.xml")
        if settings_bytes:
            settings_xml = settings_bytes.decode("utf-8", errors="replace")
            if "<w:displayBackgroundShape" not in settings_xml:
                zoom = re.search(r"<w:zoom\b[^>]*/>", settings_xml, re.IGNORECASE)
                if zoom:
                    settings_xml = settings_xml[:zoom.end()] + "<w:displayBackgroundShape/>" + settings_xml[zoom.end():]
                else:
                    settings_xml = re.sub(r"(<w:settings\b[^>]*>)", r"\1<w:displayBackgroundShape/>", settings_xml, count=1, flags=re.IGNORECASE)
                replacements["word/settings.xml"] = settings_xml.encode("utf-8")
    replacements["word/document.xml"] = document_xml.encode("utf-8")
    return patch_ooxml_zip(docx_bytes, replacements)


def postprocess_writer_review_markup(docx_bytes: bytes, *, source_html: str | None = None) -> bytes:
    """Turn Writer's temporary review bookmarks into native Word revisions/comments.

    The HTML→DOCX filter reliably carries named HTML anchors into OOXML bookmarks,
    even when it flattens <ins>/<del> and comment markup. The adapter places those
    anchors around each review range and stores author/date/comment text in a local
    hex-encoded HTML comment. This pass restores native package semantics after the
    source-aware section/header-footer pass has finished.
    """
    if not docx_bytes or not source_html:
        return docx_bytes
    metadata = _writer_review_metadata(source_html)
    if not metadata:
        return docx_bytes
    records = [record for record in metadata["records"] if isinstance(record, dict)]
    if not records:
        return docx_bytes
    document_bytes = read_zip_entry(docx_bytes, "word/document.xml")
    if not document_bytes:
        raise ValueError("DOCX thiếu word/document.xml; không thể lưu ghi chú/Track Changes.")
    document_xml = document_bytes.decode("utf-8", errors="replace")
    comments: list[dict] = []

    rels_bytes = read_zip_entry(docx_bytes, "word/_rels/document.xml.rels")
    rels_xml = rels_bytes.decode("utf-8", errors="replace") if rels_bytes else (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>'
    )
    existing_comments_rel = re.search(
        r'<Relationship\b(?=[^>]*\bType=["\'][^"\']*/comments["\'])[^>]*/?>',
        rels_xml, re.IGNORECASE,
    )
    comments_part = "word/comments.xml"
    if existing_comments_rel:
        target_match = re.search(r'\bTarget=["\']([^"\']+)["\']', existing_comments_rel.group(0), re.IGNORECASE)
        if target_match:
            target = target_match.group(1).replace("\\", "/")
            comments_part = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("word", target))
    comments_bytes = read_zip_entry(docx_bytes, comments_part)
    comments_xml = comments_bytes.decode("utf-8", errors="replace") if comments_bytes else ""

    # Comments are converted first so any comment markers that lie inside a tracked
    # range can stay at paragraph level while the revision wrapper is restored.
    for record in records:
        if record.get("type") != "comment":
            continue
        start_name = str(record.get("startBookmark") or "")
        end_name = str(record.get("endBookmark") or "")
        if not re.fullmatch(r"vno-review-start-\d{5}", start_name) or not re.fullmatch(r"vno-review-end-\d{5}", end_name):
            raise ValueError("Tên dấu neo comment trong bản xuất không hợp lệ.")
        start_match, start_bookmark_end = _writer_find_review_bookmark_pair(document_xml, start_name)
        end_name_match, end_bookmark_end = _writer_find_review_bookmark_pair(document_xml, end_name)
        if start_match.start() >= end_name_match.start() or start_bookmark_end.end() > end_name_match.start():
            raise ValueError("Phạm vi comment trong DOCX không đúng thứ tự.")
        existing_comment_ids = [
            int(value) for value in re.findall(
                r'<w:comment\b[^>]*\bw:id=["\'](\d+)["\']', comments_xml, re.IGNORECASE,
            )
        ]
        comment_id = str(max(
            _writer_next_ooxml_id(document_xml, "commentRangeStart"),
            max(existing_comment_ids, default=-1) + 1,
        ))
        operations = [
            # Replace each point tag independently. LibreOffice can serialize
            # adjacent nested HTML bookmarks as interleaved bookmarkStart tags
            # followed by bookmarkEnd tags; slicing the whole point range would
            # then erase another review range's start bookmark.
            (start_bookmark_end.start(), start_bookmark_end.end(), ""),
            (start_match.start(), start_match.end(), f'<w:commentRangeStart w:id="{comment_id}"/>'),
            (end_bookmark_end.start(), end_bookmark_end.end(),
             f'<w:commentRangeEnd w:id="{comment_id}"/>'
             f'<w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr>'
             f'<w:commentReference w:id="{comment_id}"/></w:r>'),
            (end_name_match.start(), end_name_match.end(), ""),
        ]
        for start_at, end_at, replacement in sorted(operations, reverse=True):
            document_xml = document_xml[:start_at] + replacement + document_xml[end_at:]
        content = str(record.get("content") or "").strip()
        if not content:
            raise ValueError("Comment trống không thể tạo trong DOCX.")
        comments.append({
            "id": comment_id,
            "author": str(record.get("author") or "3T Office"),
            "date": str(record.get("date") or ""),
            "content": content,
            "resolved": bool(record.get("resolved")),
        })

    revision_id = _writer_next_ooxml_id(document_xml, "ins")
    revision_id = max(revision_id, _writer_next_ooxml_id(document_xml, "del"))
    for record in records:
        if record.get("type") != "revision":
            continue
        start_name = str(record.get("startBookmark") or "")
        end_name = str(record.get("endBookmark") or "")
        if not re.fullmatch(r"vno-review-start-\d{5}", start_name) or not re.fullmatch(r"vno-review-end-\d{5}", end_name):
            raise ValueError("Tên dấu neo Track Changes trong bản xuất không hợp lệ.")
        start_match, start_bookmark_end = _writer_find_review_bookmark_pair(document_xml, start_name)
        end_name_start, end_bookmark_end = _writer_find_review_bookmark_pair(document_xml, end_name)
        if start_match.start() >= end_name_start.start() or start_bookmark_end.end() > end_name_start.start():
            raise ValueError("Phạm vi Track Changes trong DOCX không đúng thứ tự.")
        fragment = document_xml[start_bookmark_end.end():end_name_start.start()]
        if re.search(r"</?w:(?:tbl|tr|tc)\b", fragment, re.IGNORECASE):
            raise ValueError("Track Changes qua ranh giới bảng chưa được hỗ trợ; bản gốc chưa bị ghi đè.")
        if not re.search(r"<w:t\b", fragment, re.IGNORECASE):
            raise ValueError("Không tìm thấy nội dung chữ trong phạm vi Track Changes.")
        kind = "delete" if record.get("kind") == "delete" else "insert"
        wrapped = _writer_wrap_revision_fragment(
            fragment,
            kind,
            revision_id,
            str(record.get("author") or "3T Office"),
            str(record.get("date") or ""),
        )
        operations = [
            (start_match.start(), start_match.end(), ""),
            (start_bookmark_end.start(), start_bookmark_end.end(), ""),
            (start_bookmark_end.end(), end_name_start.start(), wrapped),
            (end_name_start.start(), end_name_start.end(), ""),
            (end_bookmark_end.start(), end_bookmark_end.end(), ""),
        ]
        for start_at, end_at, replacement in sorted(operations, reverse=True):
            document_xml = document_xml[:start_at] + replacement + document_xml[end_at:]
        revision_id += 1

    replacements: dict[str, bytes] = {"word/document.xml": document_xml.encode("utf-8")}
    if comments:
        used_para_ids = {
            value.upper() for value in re.findall(
                r'\bw14:paraId=["\']([0-9A-F]{8})["\']', comments_xml, re.IGNORECASE,
            )
        }
        comments_xml = re.sub(
            r'(<w:comments\b[^>]*)(>)',
            lambda match: match.group(0) if re.search(r'\bxmlns:w14=', match.group(1))
            else f'{match.group(1)} xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"{match.group(2)}',
            comments_xml, count=1, flags=re.IGNORECASE,
        )
        for comment in comments:
            while True:
                para_id = uuid.uuid4().hex[:8].upper()
                if para_id not in used_para_ids:
                    used_para_ids.add(para_id)
                    comment["paraId"] = para_id
                    break
        if comments_bytes:
            for comment in comments:
                para_id_attr = f' w14:paraId="{comment["paraId"]}"'
                lines = comment["content"].splitlines() or [""]
                paragraphs = "".join(
                    f'<w:p{para_id_attr if index == len(lines) - 1 else ""}>'
                    f'<w:r><w:t xml:space="preserve">{_escape_xml(line)}</w:t></w:r></w:p>'
                    for index, line in enumerate(lines)
                )
                comment_xml = (
                    f'<w:comment w:id="{comment["id"]}" w:author="{_escape_xml(comment["author"])}"'
                    f' w:date="{_escape_xml(comment["date"])}">{paragraphs}</w:comment>'
                )
                comments_xml = comments_xml.replace("</w:comments>", comment_xml + "</w:comments>", 1)
        else:
            comment_blocks = []
            for comment in comments:
                para_id_attr = f' w14:paraId="{comment["paraId"]}"'
                lines = comment["content"].splitlines() or [""]
                paragraphs = "".join(
                    f'<w:p{para_id_attr if index == len(lines) - 1 else ""}>'
                    f'<w:r><w:t xml:space="preserve">{_escape_xml(line)}</w:t></w:r></w:p>'
                    for index, line in enumerate(lines)
                )
                comment_blocks.append(
                    f'<w:comment w:id="{comment["id"]}" w:author="{_escape_xml(comment["author"])}"'
                    f' w:date="{_escape_xml(comment["date"])}">{paragraphs}</w:comment>'
                )
            comments_xml = (
                '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
                '<w:comments xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
                'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml">'
                + "".join(comment_blocks) + "</w:comments>"
            )
        replacements[comments_part] = comments_xml.encode("utf-8")

        if existing_comments_rel:
            rel_id_match = re.search(r'\bId=["\']([^"\']+)["\']', existing_comments_rel.group(0), re.IGNORECASE)
            if not rel_id_match:
                raise ValueError("Relationship comment thiếu Id trong DOCX.")
            rel_id = rel_id_match.group(1)
        else:
            rel_id = f"rId{_max_rels_rid(rels_xml) + 1}"
            rels_xml = _add_rels_entry(rels_xml, rel_id, _DOCX_COMMENTS_REL_TYPE, "comments.xml")
            replacements["word/_rels/document.xml.rels"] = rels_xml.encode("utf-8")

        content_types_bytes = read_zip_entry(docx_bytes, "[Content_Types].xml")
        content_types_xml = content_types_bytes.decode("utf-8", errors="replace") if content_types_bytes else (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>'
        )
        content_types_xml = _add_content_types_override(
            content_types_xml, f"/{comments_part}", _DOCX_COMMENTS_CONTENT_TYPE,
        )
        replacements["[Content_Types].xml"] = content_types_xml.encode("utf-8")

        existing_extended = read_zip_entry(docx_bytes, "word/commentsExtended.xml")
        extended_xml = existing_extended.decode("utf-8", errors="replace") if existing_extended else (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w15:commentsEx xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" '
            'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"></w15:commentsEx>'
        )
        for comment in comments:
            entry = (
                f'<w15:commentEx w15:paraId="{comment["paraId"]}"'
                f' w15:done="{"1" if comment["resolved"] else "0"}"/>'
            )
            extended_xml = re.sub(
                rf'<w15:commentEx\b(?=[^>]*\bw15:paraId=["\']{re.escape(comment["paraId"])}["\'])[^>]*/>',
                entry, extended_xml, flags=re.IGNORECASE,
            )
            if entry not in extended_xml:
                extended_xml = extended_xml.replace("</w15:commentsEx>", entry + "</w15:commentsEx>", 1)
        replacements["word/commentsExtended.xml"] = extended_xml.encode("utf-8")
        rel_id_match = re.search(
            r'<Relationship\b(?=[^>]*\bType=["\'][^"\']*/commentsExtended["\'])[^>]*/?>',
            rels_xml, re.IGNORECASE,
        )
        if not rel_id_match:
            rel_id = f"rId{_max_rels_rid(rels_xml) + 1}"
            rels_xml = _add_rels_entry(
                rels_xml, rel_id, _DOCX_COMMENTS_EXTENDED_REL_TYPE, "commentsExtended.xml",
            )
            replacements["word/_rels/document.xml.rels"] = rels_xml.encode("utf-8")
        content_types_xml = _add_content_types_override(
            content_types_xml, "/word/commentsExtended.xml", _DOCX_COMMENTS_EXTENDED_CONTENT_TYPE,
        )
        replacements["[Content_Types].xml"] = content_types_xml.encode("utf-8")

    settings_bytes = read_zip_entry(docx_bytes, "word/settings.xml")
    settings_xml = settings_bytes.decode("utf-8", errors="replace") if settings_bytes else (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"></w:settings>'
    )
    if metadata.get("trackingEnabled"):
        track_flag = re.search(r"<w:trackRevisions\b[^>]*/>", settings_xml, re.IGNORECASE)
        if track_flag:
            flag_xml = track_flag.group(0)
            if re.search(r'\bw:val=["\'](?:0|false|off)["\']', flag_xml, re.IGNORECASE):
                settings_xml = settings_xml[:track_flag.start()] + "<w:trackRevisions/>" + settings_xml[track_flag.end():]
        elif "</w:settings>" in settings_xml:
            settings_xml = settings_xml.replace("</w:settings>", "<w:trackRevisions/></w:settings>", 1)
        replacements["word/settings.xml"] = settings_xml.encode("utf-8")

    return patch_ooxml_zip(docx_bytes, replacements)


def _parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Patch native OOXML after soffice convert: XLSX lockStructure, "
        "PPTX Slide Master logo / p14:sectionLst / p:showPr, overlay FODS from original XLSX, "
        "or overlay FODP from original PPTX p14:sectionLst / VNOfficeMasterLogo / p:showPr (File → Mở)."
    )
    parser.add_argument("--xlsx", help="Input .xlsx path")
    parser.add_argument("--pptx", help="Input .pptx path")
    parser.add_argument("--fods", help="Source .fods used to detect table:structure-protected")
    parser.add_argument(
        "--fodp",
        help="Source .fodp used to read vno:master-theme logo, vno:section-* groups, "
        "and Set Up Show vno:without-narration / vno:pointer-color",
    )
    parser.add_argument("--enable", action="store_true", help="Force lockStructure even without FODS")
    parser.add_argument("--out", help="Output path (default: overwrite --xlsx/--pptx or --overlay-fods)")
    parser.add_argument(
        "--overlay-fods",
        help="Input FODS to overlay from --xlsx lockStructure (File → Mở path)",
    )
    parser.add_argument(
        "--overlay-fodp",
        help="Input FODP to overlay from --pptx p14:sectionLst / VNOfficeMasterLogo / p:showPr (File → Mở path)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
    if args.overlay_fodp:
        if not args.pptx:
            raise SystemExit("--overlay-fodp requires --pptx")
        overlay_slides_pptx_fodp_file(args.pptx, args.overlay_fodp, out_path=args.out)
        return 0
    if args.pptx:
        postprocess_slides_pptx_file(args.pptx, fodp_path=args.fodp, out_path=args.out)
        return 0
    if args.overlay_fods:
        if not args.xlsx:
            raise SystemExit("--overlay-fods requires --xlsx")
        overlay_sheet_xlsx_fods_file(args.xlsx, args.overlay_fods, out_path=args.out)
        return 0
    if not args.xlsx:
        raise SystemExit("need --xlsx or --pptx")
    enabled = True if args.enable else None
    postprocess_sheet_xlsx_file(
        args.xlsx, fods_path=args.fods, enabled=enabled, out_path=args.out
    )
    return 0


_FODS_TABLE_OPEN_RE = re.compile(r"<table:table\b([^>]*)>")
_FODS_TABLE_CLOSE_RE = re.compile(r"</table:table\s*>")
_FODS_TABLE_RE = re.compile(r"(<table:table\b[^>]*>)([\s\S]*?)(</table:table\s*>)", re.IGNORECASE)
_FODS_TABLE_OPEN_RE = re.compile(r"<table:table\b[^>]*>", re.IGNORECASE)
_FODS_TABLE_ODD_CLOSE_RE = re.compile(r"</table:table[ \t\r\n]")


class _FodsTableSpan:
    """Stand-in for the re.Match that _FODS_TABLE_RE.sub hands to process_table (groups 0-3 only)."""

    __slots__ = ("_xml", "_start", "_open_end", "_close_start", "_end")

    def __init__(self, xml: str, start: int, open_end: int, close_start: int, end: int) -> None:
        self._xml, self._start, self._open_end, self._close_start, self._end = xml, start, open_end, close_start, end

    def group(self, index: int = 0) -> str:
        if index == 0:
            return self._xml[self._start:self._end]
        if index == 1:
            return self._xml[self._start:self._open_end]
        if index == 2:
            return self._xml[self._open_end:self._close_start]
        if index == 3:
            return self._xml[self._close_start:self._end]
        raise IndexError(index)


def _sub_fods_tables(fods_xml: str, process_table) -> str:
    """Same result as _FODS_TABLE_RE.sub(process_table, fods_xml), without the lazy regex scan.

    The regex `([\\s\\S]*?)(</table:table\\s*>)` walks a 300 MB table character by character in the re engine
    (~9 s on lan14); str.find does the same job at memory speed. LibreOffice writes lower-case tags without blanks
    in closing tags; anything else (or VNO_FODS_TABLE_REGEX=1) keeps the original regex path.
    """
    if os.environ.get("VNO_FODS_TABLE_REGEX") == "1" or _FODS_TABLE_ODD_CLOSE_RE.search(fods_xml):
        return _FODS_TABLE_RE.sub(process_table, fods_xml)
    pieces: list[str] = []
    cursor = 0
    position = 0
    while True:
        start = fods_xml.find("<table:table", position)
        if start < 0:
            break
        opening = _FODS_TABLE_OPEN_RE.match(fods_xml, start)
        if opening is None:
            position = start + 1
            continue
        close_start = fods_xml.find("</table:table>", opening.end())
        if close_start < 0:
            break  # the regex finds no further match either (no closing tag after this opening)
        end = close_start + len("</table:table>")
        pieces.append(fods_xml[cursor:start])
        replacement = process_table(_FodsTableSpan(fods_xml, start, opening.end(), close_start, end))
        if isinstance(replacement, list):
            pieces.extend(replacement)  # callers may hand back parts so the table is never concatenated twice
        else:
            pieces.append(replacement)
        cursor = end
        position = end
    if cursor == 0:
        return fods_xml
    pieces.append(fods_xml[cursor:])
    return "".join(pieces)


_FODS_ROW_RE = re.compile(r"(<table:table-row\b[^>]*?)(/?)\s*>", re.IGNORECASE)
_FODS_ROW_CLOSE_RE = re.compile(r"</table:table-row\s*>", re.IGNORECASE)
_FODS_CELL_OPEN_RE = re.compile(r"(<(table:table-cell|table:covered-table-cell)\b[^>]*?)(/?)\s*>", re.IGNORECASE)
_FODS_CELL_CLOSE_RE = re.compile(r"</(table:table-cell|table:covered-table-cell)\s*>", re.IGNORECASE)

_STYLE_NAME_ATTR_RE = re.compile(r'table:style-name\s*=\s*(["\'])([^"\']*)\1')
_COL_REPEAT_ATTR_RE = re.compile(r'table:number-columns-repeated\s*=\s*(["\'])(\d+)\1')
_ROW_REPEAT_ATTR_RE = re.compile(r'table:number-rows-repeated\s*=\s*(["\'])(\d+)\1')
_VALUE_TYPE_ATTR_RE = re.compile(r'office:value-type\s*=\s*(["\'])([^"\']*)\1')
_FORMULA_ATTR_RE = re.compile(r'table:formula\s*=\s*(["\'])([^"\']*)\1')
_ANNOTATION_RE = re.compile(r"<office:annotation\b")


def _cell_has_content(cell_xml: str) -> bool:
    """Check if a cell has actual content (value, formula, annotation, or text)."""
    if _VALUE_TYPE_ATTR_RE.search(cell_xml):
        m = _VALUE_TYPE_ATTR_RE.search(cell_xml)
        if m and m.group(2) != "void":
            return True
    if _FORMULA_ATTR_RE.search(cell_xml):
        return True
    if _ANNOTATION_RE.search(cell_xml):
        return True
    if re.search(r"<text:p\b[^>]*>[^<]*</text:p>", cell_xml):
        return True
    if re.search(r"<text:span\b", cell_xml):
        return True
    return False


def _get_cell_style(cell_xml: str) -> str:
    """Extract style-name from cell XML."""
    m = _STYLE_NAME_ATTR_RE.search(cell_xml)
    return m.group(2) if m else ""


def _get_cell_col_repeat(cell_xml: str) -> int:
    """Extract number-columns-repeated from cell XML."""
    m = _COL_REPEAT_ATTR_RE.search(cell_xml)
    return int(m.group(2)) if m else 1


def _set_cell_col_repeat(cell_xml: str, count: int) -> str:
    """Set number-columns-repeated on cell XML."""
    cell_xml = _COL_REPEAT_ATTR_RE.sub("", cell_xml)
    if count <= 1:
        return cell_xml
    return cell_xml.replace(">", f' table:number-columns-repeated="{count}">', 1)


def _get_row_repeat(row_xml: str) -> int:
    """Extract number-rows-repeated from row XML."""
    m = _ROW_REPEAT_ATTR_RE.search(row_xml)
    return int(m.group(2)) if m else 1


def _set_row_repeat(row_xml: str, count: int) -> str:
    """Set number-rows-repeated on row XML."""
    row_xml = _ROW_REPEAT_ATTR_RE.sub("", row_xml)
    if count <= 1:
        return row_xml
    return row_xml.replace(">", f' table:number-rows-repeated="{count}">', 1)


def _fods_cell_is_style_only(cell_xml: str, cell_visual_styles: dict | None = None) -> bool:
    """Check if cell is style-only (has style but no content)."""
    if _cell_has_content(cell_xml):
        return False
    style = _get_cell_style(cell_xml)
    if not style:
        return False
    if cell_visual_styles and style in cell_visual_styles:
        visual = cell_visual_styles[style]
        if visual.get("hasBorder") or visual.get("hasBackground"):
            return True
    return bool(style)


def _parse_fods_cell_visual_styles(fods_xml: str) -> dict:
    """Parse cell visual styles from FODS (borders, backgrounds)."""
    styles = {}
    for match in re.finditer(r'<style:style\b([^>]*style:family=["\']table-cell["\'][^>]*)>([\s\S]*?)</style:style>', fods_xml, re.IGNORECASE):
        style_attrs = match.group(1)
        style_body = match.group(2)
        name_match = re.search(r'style:name=["\']([^"\']*)["\']', style_attrs)
        if not name_match:
            continue
        style_name = name_match.group(1)
        has_border = bool(re.search(r'<style:table-cell-properties\b[^>]*\b(?:fo:border|style:border)', style_body, re.IGNORECASE))
        has_background = bool(re.search(r'<style:table-cell-properties\b[^>]*\bfo:background-color', style_body, re.IGNORECASE))
        styles[style_name] = {"hasBorder": has_border, "hasBackground": has_background}
    return styles


def optimize_fods_streaming_legacy(fods_xml: str, max_style_only_col_repeat: int = 64) -> str:
    """Optimize FODS by merging consecutive empty cells with same style and trimming style-only tail.

    This runs BEFORE the FODS is passed to JS, using streaming regex (no DOM).
    Target: reduce FODS size from ~146MB to <20MB, cell count from 2.4M to <100K.

    Args:
        fods_xml: Raw FODS XML string
        max_style_only_col_repeat: Max repeated columns for style-only cells (matches JS STYLE_ONLY_MAX_COLUMN_REPEAT)

    Returns:
        Optimized FODS XML string
    """
    # superseded by P1b - xoa chi khi chu so huu duyet
    if not fods_xml:
        return fods_xml

    cell_visual_styles = _parse_fods_cell_visual_styles(fods_xml)

    def _get_cell_style(cell_xml: str) -> str:
        value = _quoted_attr(cell_xml, "table:style-name")
        return value if value is not None else ""

    def _get_cell_col_repeat(cell_xml: str) -> int:
        value = _attr_digits(cell_xml, "table:number-columns-repeated")
        return 1 if value is None else value

    def _get_row_repeat(row_xml: str) -> int:
        value = _attr_digits(row_xml, "table:number-rows-repeated")
        return 1 if value is None else value

    def _cell_has_content(cell_xml: str) -> bool:
        if "office:value-type" in cell_xml:
            value_type = _quoted_attr(cell_xml, "office:value-type")
            if value_type is not None and value_type != "void":
                return True
        if "table:formula" in cell_xml and _quoted_attr(cell_xml, "table:formula") is not None:
            return True
        if "<office:annotation" in cell_xml:
            return True
        if "<text:p" in cell_xml and _has_simple_text_p(cell_xml):
            return True
        if "<text:span" in cell_xml:
            return True
        if "table:number-columns-spanned" in cell_xml or "table:number-rows-spanned" in cell_xml:
            return True
        if "covered-table-cell" in cell_xml:
            return True
        # Bất kỳ phần tử con nào khác (<draw:frame> ảnh neo ô, <table:cell-range-source>...) đều
        # là nội dung: gộp ô mất ảnh (đo lan19.xlsx: auditor +1 image diff khi coi ô ảnh là trống).
        open_end = cell_xml.find(">")
        if open_end < 0:
            return False
        inner = cell_xml[open_end + 1 :]
        if "<" not in inner:
            return False
        inner = _OPT_CLOSE_CELL_RE.sub("", inner)
        inner = _OPT_EMPTY_P_RE.sub("", inner)
        return "<" in inner

    def _fods_cell_is_style_only(cell_xml: str) -> bool:
        if _cell_has_content(cell_xml):
            return False
        style = _get_cell_style(cell_xml)
        if not style:
            return False
        if cell_visual_styles and style in cell_visual_styles:
            visual = cell_visual_styles[style]
            if visual.get("hasBorder") or visual.get("hasBackground"):
                return True
        return bool(style)

    def _set_cell_col_repeat(cell_xml: str, count: int) -> str:
        # Chèn thuộc tính TRƯỚC "/>" hoặc ">" của thẻ mở — bản đầu thay ">" đầu tiên nên ô tự
        # đóng thành `<table:table-cell .../ table:number-columns-repeated="61">` (XML hỏng,
        # đo VAT.xlsx: 3148 ô hỏng).
        cell_xml = _strip_repeat_attrs(cell_xml, "table:number-columns-repeated")
        if count <= 1:
            return cell_xml
        return _insert_repeat_before_end(cell_xml, ("<table:table-cell", "<table:covered-table-cell"), "table:number-columns-repeated", count)

    def _set_row_repeat(row_xml: str, count: int) -> str:
        row_xml = _strip_repeat_attrs(row_xml, "table:number-rows-repeated")
        if count <= 1:
            return row_xml
        return _insert_repeat_before_end(row_xml, ("<table:table-row",), "table:number-rows-repeated", count)

    def _extract_cells_from_row(row_content: str) -> list[str]:
        """Extract complete cell XML strings from row content."""
        return [row_content[start:end] for start, end in _flat_xml_blocks(row_content, ("table:table-cell", "table:covered-table-cell"))]

    def _split_row(row_xml: str) -> tuple[str, bool, str]:
        """→ (thẻ mở không có '>' cuối, tự đóng?, nội dung trong hàng)."""
        open_match = _FODS_ROW_RE.match(row_xml)
        row_open_tag = open_match.group(1)
        row_self_close = open_match.group(2) == "/"
        row_content = ""
        if not row_self_close:
            row_content = row_xml[open_match.end():]
            close_idx = row_content.rfind("</table:table-row")
            if close_idx >= 0:
                row_content = row_content[:close_idx]
        return row_open_tag, row_self_close, row_content

    def process_table(match: re.Match) -> str:
        table_open = match.group(1)
        table_body = match.group(2)
        table_close = match.group(3)

        # Chỉ thay TỪNG HÀNG tại chỗ; mọi thứ khác trong bảng (<table:table-column> độ rộng cột,
        # <table:shapes> ảnh, <table:table-header-rows>, nhóm hàng...) giữ nguyên. Bản đầu ghép
        # lại bảng chỉ từ các hàng nên mất toàn bộ cột/ảnh (đo VAT.xlsx: 0 table-column sau tối ưu).
        if "<table:table-row" not in table_body:
            return match.group(0)

        # First pass: find last data column across all rows (only actual content, not style-only)
        last_data_col = 0
        for row_start, row_end in _flat_xml_blocks(table_body, ("table:table-row",)):
            _row_open_tag, _row_self_close, row_content = _split_row(table_body[row_start:row_end])
            scan_col = 1
            row_last_data_col = 0
            for cell_xml in _extract_cells_from_row(row_content):
                col_repeat = _get_cell_col_repeat(cell_xml)
                has_content = _cell_has_content(cell_xml)

                if has_content:
                    row_last_data_col = max(row_last_data_col, scan_col + col_repeat - 1)

                scan_col += col_repeat

            if row_last_data_col > 0:
                last_data_col = max(last_data_col, row_last_data_col)

        # Second pass: rebuild each row with merged cells and trimmed tail
        def process_row(row_xml: str) -> str:
            row_open_tag, row_self_close, row_content = _split_row(row_xml)
            row_repeat = _get_row_repeat(row_open_tag)

            new_row_content = []
            col_number = 1
            pending_cell = None
            pending_count = 0
            pending_style = None

            def flush_pending():
                nonlocal pending_cell, pending_count, pending_style
                if pending_cell is not None and pending_count > 0:
                    new_row_content.append(_set_cell_col_repeat(pending_cell, pending_count))
                    pending_cell = None
                    pending_count = 0
                    pending_style = None

            cells = _extract_cells_from_row(row_content)
            for cell_xml in cells:
                col_repeat = _get_cell_col_repeat(cell_xml)
                style = _get_cell_style(cell_xml)
                has_content = _cell_has_content(cell_xml)
                is_style_only = _fods_cell_is_style_only(cell_xml)

                if is_style_only and not has_content:
                    # For style-only cells, calculate how many columns to keep
                    # Columns <= max_style_only_col_repeat are kept
                    # Columns > last_data_col AND > max_style_only_col_repeat are trimmed
                    # Giữ các cột ≤ max(ngưỡng, cột dữ liệu cuối của bảng); phần sau bị cắt.
                    keep_limit = max(max_style_only_col_repeat, last_data_col)
                    keep_count = max(0, min(col_number + col_repeat - 1, keep_limit) - col_number + 1)
                    # Dải "định dạng nguyên hàng" (rộng hơn ngưỡng) phải VẪN rộng hơn ngưỡng sau khi cắt,
                    # nếu không JS (STYLE_ONLY_MAX_COLUMN_REPEAT) coi nó là khối viền gọn và mở rộng vùng dùng
                    # tới hàng cuối: lan05.xlsx 2026-09-15 cắt 16374 -> 54 cột làm hàng 1048576 thành dữ liệu,
                    # 1M hàng x 54 ô -> "Map maximum size exceeded", app không mở được.
                    if col_repeat > max_style_only_col_repeat and 0 < keep_count <= max_style_only_col_repeat:
                        keep_count = min(col_repeat, max_style_only_col_repeat + 1)

                    if keep_count > 0:
                        # Create kept portion
                        kept_cell = _set_cell_col_repeat(cell_xml, keep_count)
                        if style == pending_style:
                            pending_count += keep_count
                        else:
                            flush_pending()
                            pending_cell = kept_cell
                            pending_count = keep_count
                            pending_style = style
                    # Trimmed portion is silently dropped
                    
                    col_number += col_repeat
                else:
                    # Content cells or non-style-only: never trim, merge if same style
                    if is_style_only and not has_content and style == pending_style:
                        # This shouldn't happen since we handled is_style_only above
                        pending_count += col_repeat
                    else:
                        flush_pending()
                        pending_cell = cell_xml
                        pending_count = col_repeat
                        pending_style = style if (is_style_only and not has_content) else None
                    col_number += col_repeat

            flush_pending()

            # Rebuild row (thẻ mở giữ nguyên thuộc tính, kể cả number-rows-repeated)
            if row_self_close:
                return f"{row_open_tag}/>"
            return f"{row_open_tag}>" + "".join(new_row_content) + "</table:table-row>"

        pieces: list[str] = []
        cursor = 0
        for row_start, row_end in _flat_xml_blocks(table_body, ("table:table-row",)):
            pieces.append(table_body[cursor:row_start])
            pieces.append(process_row(table_body[row_start:row_end]))
            cursor = row_end
        pieces.append(table_body[cursor:])
        return table_open + "".join(pieces) + table_close

    return _FODS_TABLE_RE.sub(process_table, fods_xml)


def _p1_split_fods_row_chunks(table_body: str, count: int) -> list[str]:
    if count <= 1 or not table_body:
        return [table_body]
    boundaries = [0]
    length = len(table_body)
    opener = "<table:table-row"
    for part in range(1, count):
        cursor = length * part // count
        while cursor < length:
            start = table_body.find(opener, cursor)
            if start < 0:
                break
            boundary = start + len(opener)
            if boundary >= length or table_body[boundary] in " \t\r\n>/":
                if start > boundaries[-1]:
                    boundaries.append(start)
                break
            cursor = boundary
    boundaries.append(length)
    return [
        table_body[boundaries[index] : boundaries[index + 1]]
        for index in range(len(boundaries) - 1)
        if boundaries[index] < boundaries[index + 1]
    ]


def _p1_opt_cell_style(cell_xml: str) -> str:
    match = _STYLE_NAME_ATTR_RE.search(cell_xml)
    return match.group(2) if match else ""


def _p1_opt_cell_repeat(cell_xml: str) -> int:
    match = _COL_REPEAT_ATTR_RE.search(cell_xml)
    return int(match.group(2)) if match else 1


def _p1_opt_cell_has_content(cell_xml: str) -> bool:
    if "office:value-type" in cell_xml:
        value_type = _VALUE_TYPE_ATTR_RE.search(cell_xml)
        if value_type and value_type.group(2) != "void":
            return True
    if "table:formula" in cell_xml and _FORMULA_ATTR_RE.search(cell_xml):
        return True
    if "<office:annotation" in cell_xml:
        return True
    if "<text:p" in cell_xml and _has_simple_text_p(cell_xml):
        return True
    if "<text:span" in cell_xml:
        return True
    if "table:number-columns-spanned" in cell_xml or "table:number-rows-spanned" in cell_xml:
        return True
    if "covered-table-cell" in cell_xml:
        return True
    open_end = cell_xml.find(">")
    if open_end < 0:
        return False
    inner = cell_xml[open_end + 1 :]
    if "<" not in inner:
        return False
    inner = _OPT_CLOSE_CELL_RE.sub("", inner)
    inner = _OPT_EMPTY_P_RE.sub("", inner)
    return "<" in inner


def _p1_opt_style_only(
    cell_xml: str,
    style: str,
    cell_visual_styles: dict,
    *,
    known_empty: bool = False,
) -> bool:
    if not known_empty and _p1_opt_cell_has_content(cell_xml):
        return False
    if not style:
        return False
    if cell_visual_styles and style in cell_visual_styles:
        visual = cell_visual_styles[style]
        if visual.get("hasBorder") or visual.get("hasBackground"):
            return True
    return bool(style)


def _p1_opt_set_cell_repeat(cell_xml: str, count: int) -> str:
    if count <= 1 and "table:number-columns-repeated" not in cell_xml:
        return cell_xml
    cell_xml = _P1_COL_REPEAT_WITH_WS_RE.sub("", cell_xml)
    if count <= 1:
        return cell_xml
    return _insert_repeat_before_end(
        cell_xml,
        ("<table:table-cell", "<table:covered-table-cell"),
        "table:number-columns-repeated",
        count,
    )


def _p1_opt_split_row(row_xml: str) -> tuple[str, bool, str]:
    open_match = _FODS_ROW_RE.match(row_xml)
    row_open_tag = open_match.group(1)
    row_self_close = open_match.group(2) == "/"
    row_content = ""
    if not row_self_close:
        row_content = row_xml[open_match.end() :]
        close_idx = row_content.rfind("</table:table-row")
        if close_idx >= 0:
            row_content = row_content[:close_idx]
    return row_open_tag, row_self_close, row_content


def _p1_opt_last_data_col_chunk(table_body: str) -> int:
    last_data_col = 0
    for row_start, row_end in _flat_xml_blocks(table_body, ("table:table-row",)):
        _row_open_tag, _row_self_close, row_content = _p1_opt_split_row(
            table_body[row_start:row_end]
        )
        scan_col = 1
        row_last_data_col = 0
        for cell_start, cell_end in _flat_xml_blocks(
            row_content, ("table:table-cell", "table:covered-table-cell")
        ):
            cell_xml = row_content[cell_start:cell_end]
            repeat = _p1_opt_cell_repeat(cell_xml)
            if _p1_opt_cell_has_content(cell_xml):
                row_last_data_col = max(row_last_data_col, scan_col + repeat - 1)
            scan_col += repeat
        last_data_col = max(last_data_col, row_last_data_col)
    return last_data_col


def _p1_optimize_rows_chunk(args) -> str:
    table_body, last_data_col, max_style_only_col_repeat, cell_visual_styles = args

    def process_row(row_xml: str) -> str:
        row_open_tag, row_self_close, row_content = _p1_opt_split_row(row_xml)
        new_row_content: list[str] = []
        col_number = 1
        pending_cell = None
        pending_count = 0
        pending_style = None

        def flush_pending() -> None:
            nonlocal pending_cell, pending_count, pending_style
            if pending_cell is not None and pending_count > 0:
                new_row_content.append(
                    _p1_opt_set_cell_repeat(pending_cell, pending_count)
                )
                pending_cell = None
                pending_count = 0
                pending_style = None

        for cell_start, cell_end in _flat_xml_blocks(
            row_content, ("table:table-cell", "table:covered-table-cell")
        ):
            cell_xml = row_content[cell_start:cell_end]
            repeat = _p1_opt_cell_repeat(cell_xml)
            style = _p1_opt_cell_style(cell_xml)
            has_content = _p1_opt_cell_has_content(cell_xml)
            is_style_only = False if has_content else _p1_opt_style_only(
                cell_xml, style, cell_visual_styles, known_empty=True
            )
            if is_style_only and not has_content:
                keep_limit = max(max_style_only_col_repeat, last_data_col)
                keep_count = max(
                    0,
                    min(col_number + repeat - 1, keep_limit) - col_number + 1,
                )
                if (
                    repeat > max_style_only_col_repeat
                    and 0 < keep_count <= max_style_only_col_repeat
                ):
                    keep_count = min(repeat, max_style_only_col_repeat + 1)
                if keep_count > 0:
                    kept_cell = _p1_opt_set_cell_repeat(cell_xml, keep_count)
                    if style == pending_style:
                        pending_count += keep_count
                    else:
                        flush_pending()
                        pending_cell = kept_cell
                        pending_count = keep_count
                        pending_style = style
                col_number += repeat
            else:
                flush_pending()
                pending_cell = cell_xml
                pending_count = repeat
                pending_style = style if (is_style_only and not has_content) else None
                col_number += repeat
        flush_pending()
        if row_self_close:
            return f"{row_open_tag}/>"
        return f"{row_open_tag}>" + "".join(new_row_content) + "</table:table-row>"

    pieces: list[str] = []
    cursor = 0
    for row_start, row_end in _flat_xml_blocks(table_body, ("table:table-row",)):
        pieces.append(table_body[cursor:row_start])
        pieces.append(process_row(table_body[row_start:row_end]))
        cursor = row_end
    pieces.append(table_body[cursor:])
    return "".join(pieces)


def optimize_fods_streaming(fods_xml: str, max_style_only_col_repeat: int = 64) -> str:
    """P1 equivalent that avoids materializing every cell twice per row."""
    if not fods_xml:
        return fods_xml

    cell_visual_styles = _parse_fods_cell_visual_styles(fods_xml)

    def cell_style(cell_xml: str) -> str:
        match = _STYLE_NAME_ATTR_RE.search(cell_xml)
        return match.group(2) if match else ""

    def cell_repeat(cell_xml: str) -> int:
        match = _COL_REPEAT_ATTR_RE.search(cell_xml)
        return int(match.group(2)) if match else 1

    def cell_has_content(cell_xml: str) -> bool:
        if "office:value-type" in cell_xml:
            value_type = _VALUE_TYPE_ATTR_RE.search(cell_xml)
            if value_type and value_type.group(2) != "void":
                return True
        if "table:formula" in cell_xml and _FORMULA_ATTR_RE.search(cell_xml):
            return True
        if "<office:annotation" in cell_xml:
            return True
        if "<text:p" in cell_xml and _has_simple_text_p(cell_xml):
            return True
        if "<text:span" in cell_xml:
            return True
        if "table:number-columns-spanned" in cell_xml or "table:number-rows-spanned" in cell_xml:
            return True
        if "covered-table-cell" in cell_xml:
            return True
        open_end = cell_xml.find(">")
        if open_end < 0:
            return False
        inner = cell_xml[open_end + 1 :]
        if "<" not in inner:
            return False
        inner = _OPT_CLOSE_CELL_RE.sub("", inner)
        inner = _OPT_EMPTY_P_RE.sub("", inner)
        return "<" in inner

    def style_only(
        cell_xml: str, style: str | None = None, *, known_empty: bool = False
    ) -> bool:
        if not known_empty and cell_has_content(cell_xml):
            return False
        style = cell_style(cell_xml) if style is None else style
        if not style:
            return False
        if cell_visual_styles and style in cell_visual_styles:
            visual = cell_visual_styles[style]
            if visual.get("hasBorder") or visual.get("hasBackground"):
                return True
        return bool(style)

    def set_cell_repeat(cell_xml: str, count: int) -> str:
        if count <= 1 and "table:number-columns-repeated" not in cell_xml:
            return cell_xml
        cell_xml = _P1_COL_REPEAT_WITH_WS_RE.sub("", cell_xml)
        if count <= 1:
            return cell_xml
        return _insert_repeat_before_end(
            cell_xml,
            ("<table:table-cell", "<table:covered-table-cell"),
            "table:number-columns-repeated",
            count,
        )

    def split_row(row_xml: str) -> tuple[str, bool, str]:
        open_match = _FODS_ROW_RE.match(row_xml)
        row_open_tag = open_match.group(1)
        row_self_close = open_match.group(2) == "/"
        row_content = ""
        if not row_self_close:
            row_content = row_xml[open_match.end() :]
            close_idx = row_content.rfind("</table:table-row")
            if close_idx >= 0:
                row_content = row_content[:close_idx]
        return row_open_tag, row_self_close, row_content

    def process_table(match: re.Match) -> str:
        table_open, table_body, table_close = match.group(1), match.group(2), match.group(3)
        if "<table:table-row" not in table_body:
            return match.group(0)

        if len(fods_xml) > _P1_PARALLEL_FODS_CHARS and len(table_body) > _P1_TABLE_PARALLEL_MIN_CHARS:
            chunks = _p1_split_fods_row_chunks(table_body, _P1_MAX_WORKERS)
            if len(chunks) > 1:
                table_body = None  # the chunks carry the rows now; do not keep a second table-sized copy alive
                pool = _p1_process_pool()
                last_data_col = max(pool.map(_p1_opt_last_data_col_chunk, chunks))
                optimized = pool.map(
                    _p1_optimize_rows_chunk,
                    (
                        (
                            chunk,
                            last_data_col,
                            max_style_only_col_repeat,
                            cell_visual_styles,
                        )
                        for chunk in chunks
                    ),
                )
                return "".join([table_open, *optimized, table_close])  # one join (no table-sized intermediates)

        last_data_col = 0
        for row_start, row_end in _flat_xml_blocks(table_body, ("table:table-row",)):
            _row_open_tag, _row_self_close, row_content = split_row(
                table_body[row_start:row_end]
            )
            scan_col = 1
            row_last_data_col = 0
            for cell_start, cell_end in _flat_xml_blocks(
                row_content, ("table:table-cell", "table:covered-table-cell")
            ):
                cell_xml = row_content[cell_start:cell_end]
                repeat = cell_repeat(cell_xml)
                if cell_has_content(cell_xml):
                    row_last_data_col = max(row_last_data_col, scan_col + repeat - 1)
                scan_col += repeat
            if row_last_data_col > last_data_col:
                last_data_col = row_last_data_col

        def process_row(row_xml: str) -> str:
            row_open_tag, row_self_close, row_content = split_row(row_xml)
            new_row_content: list[str] = []
            col_number = 1
            pending_cell = None
            pending_count = 0
            pending_style = None

            def flush_pending() -> None:
                nonlocal pending_cell, pending_count, pending_style
                if pending_cell is not None and pending_count > 0:
                    new_row_content.append(set_cell_repeat(pending_cell, pending_count))
                    pending_cell = None
                    pending_count = 0
                    pending_style = None

            for cell_start, cell_end in _flat_xml_blocks(
                row_content, ("table:table-cell", "table:covered-table-cell")
            ):
                cell_xml = row_content[cell_start:cell_end]
                repeat = cell_repeat(cell_xml)
                style = cell_style(cell_xml)
                has_content = cell_has_content(cell_xml)
                is_style_only = False if has_content else style_only(
                    cell_xml, style, known_empty=True
                )
                if is_style_only and not has_content:
                    keep_limit = max(max_style_only_col_repeat, last_data_col)
                    keep_count = max(
                        0,
                        min(col_number + repeat - 1, keep_limit) - col_number + 1,
                    )
                    if repeat > max_style_only_col_repeat and 0 < keep_count <= max_style_only_col_repeat:
                        keep_count = min(repeat, max_style_only_col_repeat + 1)
                    if keep_count > 0:
                        kept_cell = set_cell_repeat(cell_xml, keep_count)
                        if style == pending_style:
                            pending_count += keep_count
                        else:
                            flush_pending()
                            pending_cell = kept_cell
                            pending_count = keep_count
                            pending_style = style
                    col_number += repeat
                else:
                    flush_pending()
                    pending_cell = cell_xml
                    pending_count = repeat
                    pending_style = style if (is_style_only and not has_content) else None
                    col_number += repeat
            flush_pending()
            if row_self_close:
                return f"{row_open_tag}/>"
            return f"{row_open_tag}>" + "".join(new_row_content) + "</table:table-row>"

        pieces: list[str] = []
        cursor = 0
        for row_start, row_end in _flat_xml_blocks(table_body, ("table:table-row",)):
            pieces.append(table_body[cursor:row_start])
            pieces.append(process_row(table_body[row_start:row_end]))
            cursor = row_end
        pieces.append(table_body[cursor:])
        return "".join([table_open, *pieces, table_close])

    return _sub_fods_tables(fods_xml, process_table)


if __name__ == "__main__":
    sys.exit(main())
