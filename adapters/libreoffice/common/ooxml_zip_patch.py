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
import io
import json
import math
import os
import posixpath
import re
import sys
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


_FREEZE_TABLE_TAG_RE = re.compile(r"<table:table\b([^>]*)>")
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
    """{sheet_name: {"rows": int, "cols": int}} từ vno:frozen-rows/cols VN Office tự ghi."""
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

    return _FREEZE_TABLE_TAG_RE.sub(_replace, xml)


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

    return _FREEZE_TABLE_TAG_RE.sub(_replace, xml)


def parse_sheet_visibility_from_fods(fods_xml: str | None) -> dict[str, str]:
    """Read vno:sheet-state from FODS <table:table> tags (VN Office self-written)."""
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
_CONFIG_ITEM_ACTIVE_TABLE_RE = re.compile(
    r'<config:config-item\b[^>]*config:name\s*=\s*(["\'])ActiveTable\1',
    re.IGNORECASE,
)
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
    """Inject ActiveTable config item into FODS office:settings if not already present."""
    xml = fods_xml or ""
    if not active_sheet or not xml:
        return xml

    if _CONFIG_ITEM_ACTIVE_TABLE_RE.search(xml):
        return xml

    escaped = _escape_xml(active_sheet)
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

    A named database range (``AutoFilter_<sheet>`` from older VN Office saves or
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
        # Format: SheetName.A1:D10
        dot_idx = target.find(".")
        if dot_idx == -1:
            continue
        sheet_name = target[:dot_idx]
        ref = target[dot_idx + 1:]
        if sheet_name and ref:
            result[sheet_name] = ref
    return result


def apply_autofilter_to_worksheet(sheet_xml: str, ref: str) -> str:
    """Inject <autoFilter ref="..."/> into a worksheet XML if not already present.

    Position follows CT_Worksheet schema order (after ``sheetProtection`` /
    ``scenarios``, before ``sortState`` / ``mergeCells`` / …).
    """
    xml = sheet_xml or ""
    if not ref:
        return xml
    if _AUTOFILTER_REF_RE.search(xml):
        return xml
    element_xml = f'<autoFilter ref="{ref}"/>'
    return _insert_worksheet_child_in_schema_order(xml, element_xml, "autoFilter")


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
        """Keep an explicit source width when cm round-trip drift is <= 2 px."""
        source = (source_widths or {}).get(col_idx)
        if source is not None and abs(source - chars) * digit_width <= 2.01:
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
        if source_fods:
            _restore_untouched_drawings_step(xlsx_bytes, source_fods, source_xlsx_bytes, replacements)

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
    # vno:frozen-rows/cols VN Office tự lưu trong FODS nguồn.
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
            next_sheet_xml = apply_autofilter_to_worksheet(sheet_xml, ref)
            if next_sheet_xml != sheet_xml:
                replacements[entry_path] = next_sheet_xml
        try:
            strip_autofilter_table_parts(xlsx_bytes, replacements)
        except Exception:
            # A table part we could not parse is left alone rather than failing the save.
            pass

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
    # S24b: a document created in VN Sheet has no source XLSX to restore from;
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


def _unescape_xml(value: str) -> str:
    unescaped = (
        (value or "")
        .replace("&quot;", '"')
        .replace("&apos;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
    )
    unescaped = re.sub(
        r"&#[xX]([0-9A-Fa-f]+);",
        lambda match: chr(int(match.group(1), 16)),
        unescaped,
    )
    return re.sub(r"&#(\d+);", lambda match: chr(int(match.group(1), 10)), unescaped)


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
    """Đọc khổ trang chiếu THẬT (canvas.slideSize) từ chính FODP do VN Office ghi ra.

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


def _parse_page_layout_props(attrs: str) -> dict[str, int] | None:
    """Trích xuất fo:page-width / fo:page-height (cm) và đổi sang EMU."""
    width_match = re.search(r'\bfo:page-width=["\']([\d.]+)cm["\']', attrs, re.IGNORECASE)
    height_match = re.search(r'\bfo:page-height=["\']([\d.]+)cm["\']', attrs, re.IGNORECASE)
    if not width_match or not height_match:
        return None
    width_cm = float(width_match.group(1))
    height_cm = float(height_match.group(1))
    if width_cm <= 0 or height_cm <= 0:
        return None
    return {"cx": round(width_cm * CM_EMU), "cy": round(height_cm * CM_EMU)}


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
    if re.search(r"xmlns:vno\s*=", xml, re.IGNORECASE):
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
    # nhận đây là giới hạn của bản thân soffice, không phải lỗi FODP do VN Office ghi
    # ra. Khôi phục khổ trang THẬT ở đây, độc lập với logo/sections/show (luôn áp
    # dụng nếu phát hiện khác biệt thật, không chỉ khi các tính năng khác cũng cần sửa).
    intended_size = parse_intended_slide_size_from_fodp(source_fodp) if source_fodp else None
    real_size = parse_slide_size(presentation_xml)
    # Dung sai 1000 EMU (~0.0028cm) — tránh vá giả do sai số làm tròn giữa
    # FODP (cm, làm tròn 3 chữ số thập phân) và PPTX (EMU, integer).
    apply_slide_size = bool(
        intended_size
        and (abs(intended_size["cx"] - real_size["cx"]) > 1000 or abs(intended_size["cy"] - real_size["cy"]) > 1000)
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
    if not re.search(r"xmlns:vno\s*=", xml, re.IGNORECASE):
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
    for table_start, table_end in _flat_xml_blocks(source_fods, ("table:table",)):
        table_xml = source_fods[table_start:table_end]
        table_attrs = _xml_attrs(re.match(r"<[^>]+", table_xml).group(0))
        sheet_name = _unescape_xml(table_attrs.get("table:name", ""))
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

    if not fods_image_ids:
        return

    # 2. Parse original drawing images from source XLSX
    source_drawing_images = _parse_xlsx_drawing_images(source_xlsx_bytes)

    # 3. Resolve sheet entries in output XLSX
    out_sheet_entries = _resolve_xlsx_sheet_entries(xlsx_bytes)
    source_sheet_entries = _resolve_xlsx_sheet_entries(source_xlsx_bytes)

    # 4. For each sheet, check if untouched
    for sheet_name, fods_ids in fods_image_ids.items():
        source_anchors = source_drawing_images.get(sheet_name, [])
        # Ảnh liên kết (r:link) Calc không nhập → không nằm trong tập so; ảnh nhúng phải KHỚP TRỌN (tập id bằng
        # nhau, không có khung chưa gắn id). Thiếu ảnh nhúng = người dùng đã xoá → không phục hồi drawing gốc
        # (bản codex a05eec1 chấp nhận tập con cho oneCell/absolute/grouped → xoá ảnh trong app sẽ bị phục hồi lại).
        # id dạng "<sheet>:<i>/<N>" (N = số khung ảnh Calc nhập được lúc mở): chưa sửa ⇔ hiện có đúng N khung ảnh,
        # tất cả mang id, và tập id = {0..N-1}. Không so với số anchor gốc (Calc bỏ ảnh nhóm/ảnh cao 0/ảnh liên kết).
        if not source_anchors:
            continue
        current_count = fods_total_image_counts.get(sheet_name, 0)
        parsed = [re.match(r"^(.*):(\d+)/(\d+)$", i) for i in fods_ids]
        if not parsed or any(m is None for m in parsed):
            continue
        totals = {int(m.group(3)) for m in parsed}
        indexes = sorted(int(m.group(2)) for m in parsed)
        if len(totals) != 1:
            continue
        n_at_open = totals.pop()
        # Grouped source images can be flattened by the app serializer and lose
        # their <draw:g> wrapper while remaining outside the editable/id set.
        # Allow only that bounded remainder; a genuinely added image makes the
        # count exceed the original anchor count and still blocks restoration.
        untouched_ids = (
            indexes == list(range(n_at_open))
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


def overlay_sheet_xlsx_fods(xlsx_bytes: bytes, fods_xml: str | None) -> str:
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
    xml = overlay_sheet_xlsx_freeze_panes(xlsx_bytes, xml)
    # AutoFilter: read <autoFilter ref> from original worksheet XMLs and
    # inject <table:database-ranges> into FODS so parseFods can restore
    # the filter state.
    xml = _overlay_autofilter_from_xlsx(xlsx_bytes, xml)
    xml = _overlay_sheet_layout_from_xlsx(xlsx_bytes, xml)
    xml = _overlay_sheet_number_formats_from_xlsx(xlsx_bytes, xml)
    xml = _promote_covered_formula_errors(xml)
    xml = _overlay_sheet_original_strings_from_xlsx(xlsx_bytes, xml)
    # Cell style indices (xf): write vno:xf on each table:table-cell so the
    # app can preserve original formatting for untouched cells on save.
    xml = _overlay_sheet_xf_indices_from_xlsx(xlsx_bytes, xml)
    # Sheet tab colors: read from original XLSX worksheet XMLs and write
    # vno:tab-color to FODS table:table elements for round-trip fidelity.
    tab_colors = parse_tab_colors_from_xlsx(xlsx_bytes)
    if tab_colors:
        xml = apply_tab_colors_to_fods(xml, tab_colors)
    # Drawing images: overlay vno:image-id on <draw:frame> elements
    xml = _overlay_sheet_drawing_image_ids(xlsx_bytes, xml)
    return xml


def _xml_attrs(raw: str) -> dict[str, str]:
    return {m.group(1): _unescape_xml(m.group(3)) for m in re.finditer(r'([\w:.-]+)\s*=\s*(["\'])([\s\S]*?)\2', raw or "")}


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


def _xlsx_cells_with_number_formats(xlsx_bytes: bytes) -> dict[str, dict[tuple[int, int], str]]:
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
    return result


def _xlsx_cells_with_xf_indices(xlsx_bytes: bytes) -> dict[str, dict[tuple[int, int], int]]:
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
    return result


def _set_orig_xf_attr(cell_xml: str, xf_index: int) -> str:
    opening = re.match(r"<(table:(?:table-cell|covered-table-cell))\b([^>]*?)(/?)>", cell_xml, re.IGNORECASE)
    covered_formula = opening and "covered-table-cell" in opening.group(1).lower() and re.search(r"\btable:formula=", opening.group(2), re.IGNORECASE)
    if not opening or ("covered-table-cell" in opening.group(1).lower() and not covered_formula):
        return cell_xml
    attrs = re.sub(r'\s+vno:xf\s*=\s*(["\'])\d+\1', "", opening.group(2), flags=re.IGNORECASE)
    tag = f'<{opening.group(1)}{attrs} vno:xf="{xf_index}"{opening.group(3)}>'
    return tag + cell_xml[opening.end():]


def _overlay_xf_indices_in_row(row_xml: str, targets: dict[int, int]) -> str:
    pieces, cursor, column = [], 0, 1
    sorted_columns, target_index = sorted(targets), 0
    for start, end in _flat_xml_blocks(row_xml, ("table:table-cell", "table:covered-table-cell")):
        pieces.append(row_xml[cursor:start])
        cell = row_xml[start:end]
        attrs = _xml_attrs(re.match(r"<[^>]+", cell).group(0))
        repeat = max(1, int(attrs.get("table:number-columns-repeated") or 1))
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
        attrs = _xml_attrs(re.match(r"<[^>]+", row_xml).group(0))
        repeat = max(1, int(attrs.get("table:number-rows-repeated") or 1))
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


def _overlay_sheet_xf_indices_from_xlsx(xlsx_bytes: bytes, fods_xml: str) -> str:
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
    if re.search(r"xmlns:vno\s*=", result, re.IGNORECASE):
        return result
    match = _OFFICE_DOCUMENT_OPEN_RE.search(result)
    if not match:
        return result
    return result[:match.start()] + f'<office:document{match.group(1)} xmlns:vno="{SHEET_VNO_NS}">' + result[match.end():]


def reoverlay_sheet_xf_indices(xlsx_bytes: bytes, fods_xml: str) -> str:
    """Reattach XF ownership after FODS cell-run normalization."""
    clean = re.sub(r'\s+vno:xf\s*=\s*(["\'])\d+\1', "", fods_xml, flags=re.IGNORECASE)
    return _overlay_sheet_xf_indices_from_xlsx(normalize_source_xlsx(xlsx_bytes), clean)


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
            row_attrs = _xml_attrs(re.match(r"<[^>]+", row_xml).group(0))
            row_repeat = max(1, int(row_attrs.get("table:number-rows-repeated") or 1))
            
            col_number = 1
            for cell_start, cell_end in _flat_xml_blocks(row_xml, ("table:table-cell", "table:covered-table-cell")):
                cell_xml = row_xml[cell_start:cell_end]
                cell_attrs = _xml_attrs(re.match(r"<[^>]+", cell_xml).group(0))
                xf_match = re.search(r'vno:xf="(\d+)"', cell_xml)
                if xf_match:
                    xf_index = int(xf_match.group(1))
                    targets[(row_number, col_number)] = xf_index
                col_repeat = max(1, int(cell_attrs.get("table:number-columns-repeated") or 1))
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


def _set_number_format_attr(cell_xml: str, code: str) -> str:
    opening = re.match(r"<(table:(?:table-cell|covered-table-cell))\b([^>]*?)(/?)>", cell_xml, re.IGNORECASE)
    if not opening or "covered-table-cell" in opening.group(1).lower():
        return cell_xml
    attrs = re.sub(r'\s+vno:number-format\s*=\s*(["\']).*?\1', "", opening.group(2), flags=re.IGNORECASE)
    tag = f'<{opening.group(1)}{attrs} vno:number-format="{_escape_xml(code)}"{opening.group(3)}>'
    return tag + cell_xml[opening.end():]


def _set_original_string_attr(cell_xml: str, value: str) -> str:
    opening = re.match(r"<(table:(?:table-cell|covered-table-cell))\b([^>]*?)(/?)>", cell_xml, re.IGNORECASE)
    if not opening or "covered-table-cell" in opening.group(1).lower():
        return cell_xml
    raw_attrs = re.sub(r'\s+vno:original-string\s*=\s*(["\']).*?\1', "", opening.group(2), flags=re.IGNORECASE)
    # Newline/tab in an XML attribute value are normalized to spaces by every DOM
    # parser (attribute-value normalization) unless written as character
    # references. The app's DOM branch of parseFods was reading "Từ 5 bộ ck 30%"
    # for a two-line cell and the saved XLSX lost its line breaks; the regex
    # branch (Node tests) never saw it. Encode them explicitly.
    attr_value = _escape_xml(value).replace("\r", "&#13;").replace("\n", "&#10;").replace("\t", "&#9;")
    tag = f'<{opening.group(1)}{raw_attrs} vno:original-string="{attr_value}"{opening.group(3)}>'
    result = tag + cell_xml[opening.end():]
    # Calc represents a leading line break as an empty first paragraph, but
    # may omit that paragraph on import. Recreate only the missing prefix so
    # both DOM and regex parsers see the same text as vno:original-string.
    if re.match(r"^(?:\r\n|\r|\n)", value) and not re.match(r"<[^>]+>\s*<text:p\b[^>]*>\s*</text:p>", result, re.IGNORECASE):
        result = re.sub(r"(<[^>]+>)", r"\1<text:p></text:p>", result, count=1)
    return result


def _promote_covered_formula_errors(fods_xml: str) -> str:
    """A covered ODF cell may still carry an OOXML error formula; keep it as data."""
    return re.sub(
        r"<table:covered-table-cell\b([^>]*\btable:formula=[^>]*)>([\s\S]*?)</table:covered-table-cell>",
        lambda m: f"<table:table-cell{m.group(1)}>{m.group(2)}</table:table-cell>",
        fods_xml or "",
        flags=re.IGNORECASE,
    )


def _set_repeat(xml: str, attr: str, count: int) -> str:
    xml = re.sub(rf'\s+{re.escape(attr)}\s*=\s*(["\'])\d+\1', "", xml, count=1, flags=re.IGNORECASE)
    return xml if count <= 1 else re.sub(r">", f' {attr}="{count}">', xml, count=1)


def _flat_xml_blocks(xml: str, names: tuple[str, ...]):
    """Yield flat ODF element spans using str.find (large inline images make .* regex costly)."""
    cursor = 0
    while True:
        choices = [(xml.find(f"<{name}", cursor), name) for name in names]
        choices = [(index, name) for index, name in choices if index >= 0]
        if not choices:
            return
        start, name = min(choices)
        boundary = start + len(name) + 1
        if boundary < len(xml) and xml[boundary] not in " \t\r\n>/":
            cursor = boundary
            continue
        opening_end = xml.find(">", boundary)
        if opening_end < 0:
            return
        if xml[opening_end - 1] == "/":
            end = opening_end + 1
        else:
            close = f"</{name}>"
            close_at = xml.find(close, opening_end + 1)
            if close_at < 0:
                return
            end = close_at + len(close)
        yield start, end
        cursor = end


def _overlay_formats_in_row(row_xml: str, targets: dict[int, str]) -> str:
    pieces, cursor, column = [], 0, 1
    sorted_columns, target_index = sorted(targets), 0
    for start, end in _flat_xml_blocks(row_xml, ("table:table-cell", "table:covered-table-cell")):
        pieces.append(row_xml[cursor:start])
        cell = row_xml[start:end]
        attrs = _xml_attrs(re.match(r"<[^>]+", cell).group(0))
        repeat = max(1, int(attrs.get("table:number-columns-repeated") or 1))
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
        cell_attrs = _xml_attrs(re.match(r"<[^>]+", cell).group(0)); repeat = max(1, int(cell_attrs.get("table:number-columns-repeated") or 1))
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
        attrs = _xml_attrs(re.match(r"<[^>]+", row_xml).group(0))
        repeat = max(1, int(attrs.get("table:number-rows-repeated") or 1))
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
    if re.search(r"xmlns:vno\s*=", result, re.IGNORECASE):
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
                repeat = max(1, int(_xml_attrs(re.match(r"<[^>]+", row_xml).group(0)).get("table:number-rows-repeated") or 1))
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
    return base + 3.0 / mdw


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


def _overlay_sheet_layout_from_xlsx(xlsx_bytes: bytes, fods_xml: str) -> str:
    """Preserve exact Excel width*digit_width px and row pt->px dimensions.

    soffice canonicalizes dimensions to ODF lengths and can apply font metrics;
    the compact table-level map avoids rewriting repeated FODS columns/rows.
    """
    digit_width = _extract_default_font_digit_width(xlsx_bytes)
    layouts: dict[str, dict[str, dict[str, float]]] = {}
    for sheet_name, entry_path in _resolve_xlsx_sheet_entries(xlsx_bytes).items():
        entry = read_zip_entry(xlsx_bytes, entry_path)
        if not entry:
            continue
        sheet_xml = entry.decode("utf-8", errors="replace")
        columns: dict[str, float] = {}
        rows: dict[str, float] = {}
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
        for match in re.finditer(r"<row\b([^>]*)>", sheet_xml, re.IGNORECASE):
            attrs = match.group(1)
            row = re.search(r'\br="(\d+)"', attrs)
            height = re.search(r'\bht="([\d.]+)"', attrs)
            if row and height:
                rows[row.group(1)] = float(height.group(1)) * 96 / 72
        if columns or rows:
            layouts[sheet_name] = {"columns": columns, "rows": rows}
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

    return re.sub(r"<table:table(?=[\s>/])([^>]*)>", add_layout, fods_xml, flags=re.IGNORECASE)


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
            if not (missing_whitespace or normalized_line_match):
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
    
    return re.sub(r"<table:table(?=[\s>/])([^>]*)>", add_tab_color, fods_xml, flags=re.IGNORECASE)


def _overlay_autofilter_from_xlsx(xlsx_bytes: bytes, fods_xml: str) -> str:
    """Read <autoFilter ref> from each worksheetN.xml and inject
    <table:database-ranges> into FODS."""
    # LibreOffice can synthesize a database range from rows hidden with the
    # filter visibility flag even when the source XLSX has no AutoFilter.
    # Source worksheet XML is authoritative; discard synthesized ranges first.
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
    header_entries = [
        f"word/{rels.get(r_id, f'header{idx + 1}.xml')}"
        for idx, (_, r_id) in enumerate(header_refs)
    ]
    footer_entries = [
        f"word/{rels.get(r_id, f'footer{idx + 1}.xml')}"
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
        converted_xml = re.sub(
            r"<w:sectPr\b[^>]*>[\s\S]*?</w:sectPr\s*>",
            original_sect_pr,
            converted_xml,
            count=1,
            flags=re.IGNORECASE,
        )
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
        })
    return props


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
        body = re.sub(r'<wp:(?:wrapNone|wrapSquare|wrapTopAndBottom|wrapTight|wrapThrough)\b[^>]*(?:/>|>[\s\S]*?</wp:(?:wrapNone|wrapSquare|wrapTopAndBottom|wrapTight|wrapThrough)\s*>)', f'<wp:{props["wrap"]}/>', body, count=1, flags=re.IGNORECASE)
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


def _writer_anchor_passthrough_kind(anchor: str) -> str | None:
    """Return the non-editable drawing kind that is safe to copy from source."""
    if re.search(r"<wpg:wgp\b", anchor, re.IGNORECASE):
        return "group"
    if re.search(r"<pic:pic\b", anchor, re.IGNORECASE):
        return "picture"
    # Text boxes remain editable in Writer. Only non-textbox WPS geometry is
    # passthrough; copying a txbx would silently discard the user's edit.
    if re.search(r"<wps:wsp\b", anchor, re.IGNORECASE) and not re.search(
        r"<wps:txbx\b|<w:txbxContent\b", anchor, re.IGNORECASE
    ):
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
    """Drop untouched LO text boxes already contained by a source WPG group."""
    # Read WPG elements directly: a group may itself contain drawing anchors,
    # so the flat wp:anchor regex can stop at a nested closing tag.
    group_texts = [
        _paragraph_match_key(original_xml[start:end])
        for start, end in _xml_element_ranges(original_xml, "wpg:wgp")
    ]
    group_texts = [text for text in group_texts if text]
    if not group_texts:
        return converted_xml

    def keep_or_drop(match: re.Match) -> str:
        anchor = match.group(0)
        if not re.search(r"<w:txbxContent\b", anchor, re.IGNORECASE):
            return anchor
        if not pristine_document and not _writer_anchor_is_untouched(anchor):
            return anchor
        text = _paragraph_match_key(anchor)
        if len(text) < 4 or not any(text in group_text for group_text in group_texts):
            return anchor
        return ""

    alternate_re = re.compile(
        r"<mc:AlternateContent\b[^>]*>[\s\S]*?</mc:AlternateContent\s*>",
        re.IGNORECASE,
    )

    def clean_alternate(match: re.Match) -> str:
        block = match.group(0)
        anchor = _WRITER_ANCHOR_RE.search(block)
        return "" if anchor and not keep_or_drop(anchor) else block

    result = alternate_re.sub(clean_alternate, converted_xml)
    return _WRITER_ANCHOR_RE.sub(keep_or_drop, result)


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
                source_kind = _writer_anchor_passthrough_kind(source_anchor)
                converted_kind = _writer_anchor_passthrough_kind(converted_anchor)
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
    return sorted(ranges)


def _paragraph_plain_text(paragraph_xml: str) -> str:
    text = "".join(re.findall(r"<w:t\b[^>]*>([\s\S]*?)</w:t\s*>", paragraph_xml, re.IGNORECASE))
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
    for child in ("pStyle", "ind", "jc", "numPr"):
        source_child = _writer_direct_property(source_ppr, child)
        child_re = re.compile(
            rf"<w:{child}\b[^>]*(?:/>|>[\s\S]*?</w:{child}\s*>)", re.IGNORECASE
        )
        if child_re.search(merged):
            merged = child_re.sub(lambda _match: source_child, merged, count=1) if source_child else child_re.sub("", merged, count=1)
        elif source_child:
            merged = re.sub(r"</w:pPr\s*>", source_child + "</w:pPr>", merged, count=1, flags=re.IGNORECASE)
    return _writer_replace_direct_property(target_paragraph, "pPr", merged)


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
) -> str:
    """Restore direct pPr/rPr only for paragraphs paired by exact text LCS.

    This is deliberately formatting-only: paragraph/run text and drawing XML
    always remain the converted app output. Exact text matching prevents a
    guessed or positional overlay when LibreOffice split/merged paragraphs.
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
    pairs = sorted(set([*pairs, *empty_pairs]))

    replacements: dict[int, str] = {}
    for source_index, converted_index in pairs:
        source_p = original[source_index]
        target_p = converted[converted_index]
        has_marker = bool(re.search(
            r'<w:bookmarkStart\b[^>]*\bw:name=["\']vno-untouched-\d+["\'][^>]*/?>',
            target_p,
            re.IGNORECASE,
        ))
        # A source group copied by passthrough can remove the generated anchor
        # paragraph that held the bookmark.  A unique, non-empty text captured
        # before that replacement safely carries the same untouched proof.
        if (not trust_all_exact and not has_marker
                and converted_keys[converted_index] not in (trusted_untouched_texts or set())):
            continue
        # Section relationships are handled by the dedicated section pass.
        if "<w:sectPr" not in source_p and "<w:sectPr" not in target_p:
            target_p = _writer_restore_selected_ppr(target_p, source_p)
        source_runs = _writer_run_blocks(source_p)
        target_runs = _writer_run_blocks(target_p)
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
    return result


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


def _document_paragraph_ranges(xml: str) -> list[tuple[int, int]]:
    anchor_ranges = [(match.start(), match.end()) for match in _WRITER_ANCHOR_RE.finditer(xml)]
    return [
        (start, end) for start, end in _xml_element_ranges(xml, "w:p")
        if not any(anchor_start < start < anchor_end for anchor_start, anchor_end in anchor_ranges)
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
    return bool(re.search(
        # HTML/LibreOffice collapses paragraph-level Word section boundaries
        # to the final body sectPr.  For carrier relocation those original
        # next-page sections are page boundaries: rebuilt carriers emit a
        # literal page break while the final section pass owns sectPr/rIds.
        r'<w:br\b[^>]*\bw:type=["\']page["\']|<w:pageBreakBefore\b|<w:sectPr\b',
        paragraph, re.IGNORECASE,
    ))


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
        elif source_empty and target_end - target_start > 1:
            # A carrier can be represented after HTML import by expanded
            # drawing text rather than an empty paragraph.  The non-empty LCS
            # interval proves that the slot still exists; use any surviving
            # empty markers first and reinsert the remaining source carriers
            # at the bounded slot.  An actually deleted carrier has adjacent
            # LCS neighbours and does not enter this branch.
            empty_source_to_target.update(zip(source_empty, target_empty))
            retained_empty_sources.update(source_empty)

    output_anchors: dict[str, str] = {}
    for anchor in _writer_outer_anchor_blocks(converted_xml):
        name = _writer_anchor_name(anchor)
        if (name and _writer_anchor_passthrough_kind(anchor)
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
        if (not pristine_document
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


def postprocess_writer_docx(
    docx_bytes: bytes,
    *,
    source_docx: bytes | None = None,
) -> bytes:
    """Re-inject section structure, header/footer XML from the original DOCX
    into the converted DOCX that LibreOffice generated from HTML.

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

    # A pristine, drawing-led catalogue has no editable body representation:
    # LibreOffice expands its page-sized WPG groups into 100+ unrelated HTML
    # paragraphs. The only lossless save is the original OOXML package itself.
    # This is narrowly gated to short, anchor-heavy bodies; ordinary Writer
    # documents and every touched document continue through the surgical passes.
    if "vno-pristine-document" in converted_xml:
        source_flow = _writer_body_paragraph_ranges(original_xml)
        safe_anchors = [
            anchor for anchor in _writer_outer_anchor_blocks(original_xml)
            if _writer_anchor_passthrough_kind(anchor)
        ]
        if 5 <= len(safe_anchors) and len(source_flow) <= 25:
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

    new_xml = _rebuild_docx_document_xml(
        converted_xml, original_xml, orig_header_entries, orig_footer_entries, remapped_sect_pr
    )
    new_xml = _repair_writer_double_fills(new_xml)

    # Restore mid-document section breaks (w:sectPr in w:pPr) that LibreOffice
    # converted to w:br type="page". Match by vno-untouched-N bookmark.
    new_xml, next_rid = _restore_mid_document_sections(
        new_xml, original_xml, orig_rels, r_id_map, next_rid
    )

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
    new_xml = _remove_duplicate_writer_group_flow_paragraphs(
        new_xml, original_xml, pristine_document=pristine_document,
    )
    new_xml = _restore_writer_anchor_properties(new_xml, original_xml)
    new_xml = _restore_writer_matched_formatting(
        new_xml, original_xml, trusted_untouched_texts=untouched_texts,
        trust_all_exact=pristine_document,
    )
    new_xml = _remove_writer_untouched_bookmarks(new_xml)

    replacements: dict[str, bytes] = {}
    if new_xml != converted_xml:
        replacements["word/document.xml"] = new_xml.encode("utf-8")

    for entry_name in orig_header_entries:
        header_bytes = read_zip_entry(source_docx, entry_name)
        if header_bytes:
            replacements[entry_name] = header_bytes

    for entry_name in orig_footer_entries:
        footer_bytes = read_zip_entry(source_docx, entry_name)
        if footer_bytes:
            replacements[entry_name] = footer_bytes

    # Runs restored from the original keep `w:asciiTheme="majorHAnsi"`; LibreOffice's regenerated
    # theme1.xml says Arial/Arial while the original says Calibri Light/Calibri, so those runs
    # changed font (HDLD.docx 2026-09-15: dotted lines wrapped, 5 -> 6 pages). Keep the source theme.
    source_theme = read_zip_entry(source_docx, "word/theme/theme1.xml")
    if source_theme and "word/theme/theme1.xml" in existing_entries:
        replacements["word/theme/theme1.xml"] = source_theme

    hf_dependencies, hf_extensions = _collect_header_footer_dependencies(
        source_docx,
        [e for e in (*orig_header_entries, *orig_footer_entries) if e in replacements],
        existing_entries,
    )
    replacements.update(hf_dependencies)

    replacements.update(anchor_media)

    if not replacements:
        return docx_bytes

    # --- Update word/_rels/document.xml.rels ---
    new_rels_xml = converted_rels_xml
    footer_type = _DOCX_FOOTER_REL_TYPE
    header_type = _DOCX_HEADER_REL_TYPE
    for entry_name in orig_footer_entries:
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
    for entry_name in orig_header_entries:
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
    for entry_name in orig_footer_entries:
        part_name = f"/{entry_name}"
        ct_xml = _add_content_types_override(ct_xml, part_name, _DOCX_FOOTER_CONTENT_TYPE)
    for entry_name in orig_header_entries:
        part_name = f"/{entry_name}"
        ct_xml = _add_content_types_override(ct_xml, part_name, _DOCX_HEADER_CONTENT_TYPE)
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


def optimize_fods_streaming(fods_xml: str, max_style_only_col_repeat: int = 64) -> str:
    """Optimize FODS by merging consecutive empty cells with same style and trimming style-only tail.

    This runs BEFORE the FODS is passed to JS, using streaming regex (no DOM).
    Target: reduce FODS size from ~146MB to <20MB, cell count from 2.4M to <100K.

    Args:
        fods_xml: Raw FODS XML string
        max_style_only_col_repeat: Max repeated columns for style-only cells (matches JS STYLE_ONLY_MAX_COLUMN_REPEAT)

    Returns:
        Optimized FODS XML string
    """
    if not fods_xml:
        return fods_xml

    cell_visual_styles = _parse_fods_cell_visual_styles(fods_xml)

    def _get_cell_style(cell_xml: str) -> str:
        m = re.search(r'table:style-name\s*=\s*(["\'])([^"\']*)\1', cell_xml)
        return m.group(2) if m else ""

    def _get_cell_col_repeat(cell_xml: str) -> int:
        m = re.search(r'table:number-columns-repeated\s*=\s*(["\'])(\d+)\1', cell_xml)
        return int(m.group(2)) if m else 1

    def _get_row_repeat(row_xml: str) -> int:
        m = re.search(r'table:number-rows-repeated\s*=\s*(["\'])(\d+)\1', row_xml)
        return int(m.group(2)) if m else 1

    def _cell_has_content(cell_xml: str) -> bool:
        if re.search(r'office:value-type\s*=\s*(["\'])([^"\']*)\1', cell_xml):
            m = re.search(r'office:value-type\s*=\s*(["\'])([^"\']*)\1', cell_xml)
            if m and m.group(2) != "void":
                return True
        if re.search(r'table:formula\s*=\s*(["\'])([^"\']*)\1', cell_xml):
            return True
        if "<office:annotation" in cell_xml:
            return True
        if re.search(r"<text:p\b[^>]*>[^<]*</text:p>", cell_xml):
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
        inner = cell_xml[open_end + 1:] if open_end >= 0 else ""
        inner = re.sub(r"</table:(?:covered-)?table-cell\s*>\s*$", "", inner)
        inner = re.sub(r"<text:p\s*/>|<text:p\b[^>]*>\s*</text:p>", "", inner)
        if "<" in inner:
            return True
        return False

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
        cell_xml = re.sub(r'\s+table:number-columns-repeated\s*=\s*(["\'])\d+\1', "", cell_xml)
        if count <= 1:
            return cell_xml
        return re.sub(r"^(<table:(?:covered-)?table-cell\b[^>]*?)(\s*/?>)", lambda m: f'{m.group(1)} table:number-columns-repeated="{count}"{m.group(2)}', cell_xml, count=1)

    def _set_row_repeat(row_xml: str, count: int) -> str:
        row_xml = re.sub(r'\s+table:number-rows-repeated\s*=\s*(["\'])\d+\1', "", row_xml)
        if count <= 1:
            return row_xml
        return re.sub(r"^(<table:table-row\b[^>]*?)(\s*/?>)", lambda m: f'{m.group(1)} table:number-rows-repeated="{count}"{m.group(2)}', row_xml, count=1)

    def _extract_cells_from_row(row_content: str) -> list[str]:
        """Extract complete cell XML strings from row content."""
        cells = []
        pos = 0
        while pos < len(row_content):
            # Find next cell opening tag
            open_match = _FODS_CELL_OPEN_RE.search(row_content, pos)
            if not open_match:
                break
            cell_open = open_match.group(1)
            cell_type = open_match.group(2)
            self_close = open_match.group(3) == "/"
            cell_start = open_match.start()
            
            if self_close:
                # Self-closing cell
                cells.append(cell_open + "/>")
                pos = open_match.end()
            else:
                # Find closing tag
                close_tag = f"</{cell_type}>"
                close_pos = row_content.find(close_tag, open_match.end())
                if close_pos >= 0:
                    cell_full = row_content[cell_start:close_pos + len(close_tag)]
                    cells.append(cell_full)
                    pos = close_pos + len(close_tag)
                else:
                    # Malformed - just take the opening tag
                    cells.append(cell_open + ">")
                    pos = open_match.end()
        return cells

    # Một hàng trọn vẹn (tự đóng hoặc mở...đóng); hàng không lồng nhau nên non-greedy là đủ.
    row_full_re = re.compile(r"<table:table-row\b[^>]*?/>|<table:table-row\b[^>]*>[\s\S]*?</table:table-row\s*>", re.IGNORECASE)

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
        if not row_full_re.search(table_body):
            return match.group(0)

        # First pass: find last data column across all rows (only actual content, not style-only)
        last_data_col = 0
        for row_match in row_full_re.finditer(table_body):
            _row_open_tag, _row_self_close, row_content = _split_row(row_match.group(0))
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
        def process_row(row_match: re.Match) -> str:
            row_open_tag, row_self_close, row_content = _split_row(row_match.group(0))
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

        return table_open + row_full_re.sub(process_row, table_body) + table_close

    return _FODS_TABLE_RE.sub(process_table, fods_xml)


if __name__ == "__main__":
    sys.exit(main())
