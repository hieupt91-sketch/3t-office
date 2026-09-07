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
  - postprocess_sheet_xlsx() after soffice FODS→XLSX (File → Lưu) - workbookProtection lockStructure + Freeze Panes <pane>
  - overlay_sheet_xlsx_fods() after soffice XLSX→FODS (File → Mở) - table:structure-protected + vno:frozen-rows/cols
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
_THEME_ATTR_RE = re.compile(r'\bvno:master-theme\s*=\s*["\']([^"\']*)["\']', re.IGNORECASE)
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
        raw = _unescape_xml(theme_match.group(1) or "")
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


def parse_intended_slide_size_from_fodp(fodp_xml: str | None) -> dict[str, int] | None:
    """Đọc khổ trang chiếu THẬT (canvas.slideSize) từ chính FODP do VN Office ghi ra.

    Cần thiết vì đã đo thực tế: soffice --convert-to pptx BỎ QUA hoàn toàn
    style:page-layout-properties khi chuyển FODP -> PPTX, luôn tự ý ghi
    DEFAULT_SLIDE_CX/CY (28cm x 15.75cm) vào <p:sldSz> bất kể FODP khai báo gì -
    dùng để khôi phục lại khổ trang thật sau khi soffice convert xong.
    """
    match = _PAGE_LAYOUT_PROPS_RE.search(fodp_xml or "")
    attrs = match.group(1) if match else ""
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
        existing = _unescape_xml(theme_match.group(1) if theme_match else "")
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
    apply_slide_size = bool(
        intended_size
        and (abs(intended_size["cx"] - real_size["cx"]) > 500 or abs(intended_size["cy"] - real_size["cy"]) > 500)
    )
    effective_size = intended_size if apply_slide_size else real_size

    if not apply_logo and not apply_sections and not apply_show and not apply_slide_size:
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
        return pptx_bytes
    return patch_ooxml_zip(pptx_bytes, replacements)


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

    LibreOffice XLSX→FODS drops lockStructure AND Freeze Panes (<pane> is not
    restored into ODF office:settings — confirmed via a real soffice
    round-trip, see docs/HANDOFF-SHEET-FREEZE-PANES.md). Production File → Mở
    must restore both before SheetAdapter.parseFods().
    """
    xml = fods_xml or ""
    current = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
    if current:
        workbook_xml = current.decode("utf-8", errors="replace")
        xml = overlay_fods_structure_protection(xml, workbook_xml)
    xml = overlay_sheet_xlsx_freeze_panes(xlsx_bytes, xml)
    return xml


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
    if not props:
        return xml
    return overlay_fodp_show_properties(xml, props.decode("utf-8", errors="replace"))


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
