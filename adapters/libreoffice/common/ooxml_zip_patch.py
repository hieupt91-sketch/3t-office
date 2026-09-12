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


def patch_ooxml_zip(zip_bytes: bytes, replacements: dict[str, str | bytes]) -> bytes:
    """Replace named ZIP entries; copy the rest. No third-party library."""
    source = io.BytesIO(zip_bytes)
    dest = io.BytesIO()
    with zipfile.ZipFile(source, "r") as zin, zipfile.ZipFile(
        dest, "w", compression=zipfile.ZIP_DEFLATED
    ) as zout:
        for item in zin.infolist():
            if item.is_dir() or not item.filename or item.filename.endswith("/"):
                continue
            if item.filename in replacements:
                payload = replacements[item.filename]
                data = payload.encode("utf-8") if isinstance(payload, str) else payload
            else:
                data = zin.read(item.filename)
            info = zipfile.ZipInfo(filename=item.filename, date_time=item.date_time)
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
_WB_SHEET_TAG_RE = re.compile(r"<sheet\b([^>]*)/?>", re.IGNORECASE)
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
    for sheet_name, ref in autofilter_by_sheet.items():
        ranges_xml.append(
            f'<table:database-range table:name="AutoFilter_{_escape_xml(sheet_name)}"'
            f' table:target-range-address="{_escape_xml(sheet_name)}.{_escape_xml(ref)}"'
            f' table:display-filter-buttons="true"/>'
        )
    db_block = f'<table:database-ranges>{"".join(ranges_xml)}</table:database-ranges>'
    marker = "</office:spreadsheet>"
    idx = xml.rfind(marker)
    if idx == -1:
        return xml + db_block
    return xml[:idx] + db_block + xml[idx:]


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


def postprocess_sheet_xlsx(
    xlsx_bytes: bytes,
    *,
    source_fods: str | None = None,
    enabled: bool | None = None,
) -> bytes:
    """Return patched XLSX bytes, or the original buffer when no patch is needed."""
    replacements: dict[str, str] = {}

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
            entry_path = sheet_entries.get(sheet_name)
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
            entry_path = sheet_entries.get(sheet_name)
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


def _unescape_xml(value: str) -> str:
    return (
        (value or "")
        .replace("&quot;", '"')
        .replace("&apos;", "'")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&amp;", "&")
    )


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


def overlay_sheet_xlsx_fods(xlsx_bytes: bytes, fods_xml: str | None) -> str:
    """Read the original XLSX ZIP and overlay FODS.

    LibreOffice XLSX→FODS drops lockStructure, Freeze Panes, veryHidden
    sheet state, and AutoFilter database-ranges — all confirmed via real
    soffice round-trips.  Production File → Mở must restore them before
    SheetAdapter.parseFods().
    """
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
    xml = _overlay_sheet_original_strings_from_xlsx(xlsx_bytes, xml)
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
                if attrs.get("t", "").lower() in {"s", "str", "inlinestr"}:
                    continue
                if not (coord and re.search(r"<(?:v|f|is)\b", body, re.IGNORECASE) and 0 <= style_index < len(xfs)):
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
    tag = f'<{opening.group(1)}{raw_attrs} vno:original-string="{_escape_xml(value)}"{opening.group(3)}>'
    return tag + cell_xml[opening.end():]


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


def _xlsx_cells_with_original_strings(xlsx_bytes: bytes) -> dict[str, dict[tuple[int, int], str]]:
    shared_xml = (read_zip_entry(xlsx_bytes, "xl/sharedStrings.xml") or b"").decode("utf-8", errors="replace")
    shared = []
    for item in re.finditer(r"<si\b[^>]*>([\s\S]*?)</si>", shared_xml, re.IGNORECASE):
        shared.append("".join(_unescape_xml(m.group(1)) for m in re.finditer(r"<t\b[^>]*>([\s\S]*?)</t>", item.group(1), re.IGNORECASE)))
    result = {}
    for sheet_name, entry_path in _resolve_xlsx_sheet_entries(xlsx_bytes).items():
        sheet_xml = (read_zip_entry(xlsx_bytes, entry_path) or b"").decode("utf-8", errors="replace"); cells = {}
        for match in re.finditer(r"<c\b([^>]*?)(?:/\s*>|>([\s\S]*?)</c>)", sheet_xml, re.IGNORECASE):
            cell_attrs, body = _xml_attrs(match.group(1)), match.group(2) or ""; kind = cell_attrs.get("t", "").lower()
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


def _overlay_sheet_layout_from_xlsx(xlsx_bytes: bytes, fods_xml: str) -> str:
    """Preserve exact Excel width*7+5 px and row pt->px dimensions.

    soffice canonicalizes dimensions to ODF lengths and can apply font metrics;
    the compact table-level map avoids rewriting repeated FODS columns/rows.
    """
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
            custom = re.search(r'\b(?:customWidth|bestFit)="1"', attrs)
            minimum = re.search(r'\bmin="(\d+)"', attrs)
            maximum = re.search(r'\bmax="(\d+)"', attrs)
            if not (width and custom and minimum and maximum):
                continue
            for index in range(int(minimum.group(1)), int(maximum.group(1)) + 1):
                number = index
                name = ""
                while number:
                    number, remainder = divmod(number - 1, 26)
                    name = chr(65 + remainder) + name
                columns[name] = float(width.group(1)) * 7 + 5
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
        if not layout:
            return match.group(0)
        encoded = _escape_xml(json.dumps(layout, ensure_ascii=False, separators=(",", ":")))
        attrs = re.sub(r'\s+vno:xlsx-layout="[^"]*"', "", attrs)
        return f'<table:table{attrs} vno:xlsx-layout="{encoded}">'

    return re.sub(r"<table:table(?=[\s>/])([^>]*)>", add_layout, fods_xml, flags=re.IGNORECASE)


def _overlay_autofilter_from_xlsx(xlsx_bytes: bytes, fods_xml: str) -> str:
    """Read <autoFilter ref> from each worksheetN.xml and inject
    <table:database-ranges> into FODS."""
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
) -> str:
    with open(xlsx_path, "rb") as handle:
        xlsx_bytes = handle.read()
    source_fods = None
    if fods_path:
        with open(fods_path, "r", encoding="utf-8", errors="replace") as handle:
            source_fods = handle.read()
    patched = postprocess_sheet_xlsx(
        xlsx_bytes, source_fods=source_fods, enabled=enabled
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


def _max_rels_rid(rels_xml: str) -> int:
    """Return the highest rId number found in a rels XML string."""
    ids = re.findall(r'Id="rId(\d+)"', rels_xml)
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
    """Add an Override entry before </Types>."""
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

    if not orig_sect_pr and not orig_header_entries and not orig_footer_entries:
        return docx_bytes

    try:
        converted_xml_bytes = read_zip_entry(docx_bytes, "word/document.xml")
    except (KeyError, ValueError):
        return docx_bytes
    if not converted_xml_bytes:
        return docx_bytes
    converted_xml = converted_xml_bytes.decode("utf-8", errors="replace")

    original_xml_bytes = read_zip_entry(source_docx, "word/document.xml")
    original_xml = original_xml_bytes.decode("utf-8", errors="replace") if original_xml_bytes else ""

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


if __name__ == "__main__":
    sys.exit(main())
