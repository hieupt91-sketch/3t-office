"""Shared OOXML ZIP patcher + native export/import overlay.

Python twin of:
  adapters/libreoffice/common/ooxml-zip-patch.js
  adapters/libreoffice/sheet/xlsx-workbook-protection.js
  adapters/libreoffice/sheet/xlsx-native-postprocess.js
  adapters/libreoffice/slides/pptx-master-logo.js
  adapters/libreoffice/slides/pptx-native-postprocess.js

main.py calls:
  - postprocess_sheet_xlsx() after soffice FODS→XLSX (File → Lưu)
  - overlay_sheet_xlsx_fods() after soffice XLSX→FODS (File → Mở)
  - postprocess_slides_pptx() after soffice FODP→PPTX (File → Lưu)

Keep the XML transform in lock step with the JS helpers.
"""

from __future__ import annotations

import argparse
import io
import json
import re
import sys
import zipfile

XLSX_WORKBOOK_ENTRY = "xl/workbook.xml"
PPTX_PRESENTATION_ENTRY = "ppt/presentation.xml"
MASTER_LOGO_SHAPE_NAME = "VNOfficeMasterLogo"
SLIDE_MASTER_ENTRY_RE = re.compile(r"^ppt/slideMasters/slideMaster\d+\.xml$", re.IGNORECASE)
CM_EMU = 360000
DEFAULT_SLIDE_CX = 28 * CM_EMU
DEFAULT_SLIDE_CY = round(15.75 * CM_EMU)

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
_THEME_ATTR_RE = re.compile(r'\bvno:master-theme\s*=\s*["\']([^"\']*)["\']', re.IGNORECASE)
_LOGO_FRAME_RE = re.compile(
    r"<draw:frame\b[^>]*grMasterLogo[\s\S]*?<text:p\b[^>]*>([\s\S]*?)</text:p>",
    re.IGNORECASE,
)
_SLD_SZ_RE = re.compile(r"<(?:[\w]+:)?sldSz\b([^>]*)/?\s*>", re.IGNORECASE)
_CNVPR_ID_RE = re.compile(r"<(?:[\w]+:)?cNvPr\b[^>]*\bid=[\"'](\d+)[\"']", re.IGNORECASE)
_SP_TREE_CLOSE_RE = re.compile(r"</(?:[\w]+:)?spTree\s*>", re.IGNORECASE)
_SP_BLOCK_RE = re.compile(r"<(?:[\w]+:)?sp\b[\s\S]*?</(?:[\w]+:)?sp>", re.IGNORECASE)
_PH_RE = re.compile(r"<(?:[\w]+:)?ph\b", re.IGNORECASE)
_OFF_TAG_RE = re.compile(r"<(?:[\w]+:)?off\b[^>]*>", re.IGNORECASE)
_EXT_TAG_RE = re.compile(r"<(?:[\w]+:)?ext\b[^>]*>", re.IGNORECASE)
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


def postprocess_sheet_xlsx(
    xlsx_bytes: bytes,
    *,
    source_fods: str | None = None,
    enabled: bool | None = None,
) -> bytes:
    """Return patched XLSX bytes, or the original buffer when no lock is needed."""
    if enabled is None:
        enabled = fods_has_structure_protection(source_fods)
    if not enabled:
        return xlsx_bytes
    try:
        current = _read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
    except KeyError as exc:
        raise ValueError("XLSX thiếu xl/workbook.xml — không thể bổ sung workbookProtection") from exc
    xml = current.decode("utf-8")
    next_xml = apply_workbook_protection_lock_structure(xml)
    if next_xml == xml:
        return xlsx_bytes
    return patch_ooxml_zip(xlsx_bytes, {XLSX_WORKBOOK_ENTRY: next_xml})


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


def _find_named_shape(master_xml: str) -> str:
    name_attr = f'name="{MASTER_LOGO_SHAPE_NAME}"'
    alt_attr = f"name='{MASTER_LOGO_SHAPE_NAME}'"
    for sp in _SP_BLOCK_RE.findall(master_xml or ""):
        if name_attr in sp or alt_attr in sp:
            return sp
    return ""


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


def postprocess_slides_pptx(
    pptx_bytes: bytes,
    *,
    source_fodp: str | None = None,
    logo_text: str | None = None,
    accent_color: str | None = None,
    font_family: str | None = None,
    enabled: bool | None = None,
) -> bytes:
    """Return patched PPTX bytes, or the original buffer when no logo is needed."""
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
    if not logo["logoText"]:
        return pptx_bytes
    presentation = read_zip_entry(pptx_bytes, PPTX_PRESENTATION_ENTRY)
    size = parse_slide_size(presentation.decode("utf-8", errors="replace") if presentation else "")
    replacements: dict[str, str] = {}
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
            slide_cx=size["cx"],
            slide_cy=size["cy"],
        )
        if next_xml != xml:
            replacements[name] = next_xml
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
    """Read xl/workbook.xml from the original XLSX and overlay FODS.

    LibreOffice XLSX→FODS drops lockStructure. Production File → Mở must
    restore table:structure-protected before SheetAdapter.parseFods().
    """
    xml = fods_xml or ""
    current = read_zip_entry(xlsx_bytes, XLSX_WORKBOOK_ENTRY)
    if not current:
        return xml
    workbook_xml = current.decode("utf-8", errors="replace")
    return overlay_fods_structure_protection(xml, workbook_xml)


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
        description="Patch native OOXML after soffice convert: XLSX lockStructure "
        "or PPTX Slide Master logo, or overlay FODS from original XLSX (File → Mở)."
    )
    parser.add_argument("--xlsx", help="Input .xlsx path")
    parser.add_argument("--pptx", help="Input .pptx path")
    parser.add_argument("--fods", help="Source .fods used to detect table:structure-protected")
    parser.add_argument("--fodp", help="Source .fodp used to read vno:master-theme logo")
    parser.add_argument("--enable", action="store_true", help="Force lockStructure even without FODS")
    parser.add_argument("--out", help="Output path (default: overwrite --xlsx/--pptx or --overlay-fods)")
    parser.add_argument(
        "--overlay-fods",
        help="Input FODS to overlay from --xlsx lockStructure (File → Mở path)",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)
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
