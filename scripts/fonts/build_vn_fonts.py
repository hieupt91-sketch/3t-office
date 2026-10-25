#!/usr/bin/env python3
"""VN-FONTS-1 — build 3T Office's own substitute document fonts from pinned SIL OFL 1.1 sources.

Outputs (platform-neutral, used by the document engine and the web UI):
  VN Sans UI  Regular/Bold  <- Microsoft Selawik 1.01 (open replacement published for a common UI font) + Vietnamese
  VN Sans     Regular/Bold  <- Open Sans 3.003 (look-alike only, NOT metric-compatible with any proprietary font)
  VN Mono     Regular/Bold  <- Inconsolata 3.001, width instance 112.5 (advance 550/1000), re-scaled to 1126/2048 em
  VN Song     Regular       <- Noto Serif SC 2.003, GB2312 + Latin + Vietnamese subset, half-width 0.5 em / full-width 1 em

Legal rules (VN-FONTS-1): no proprietary font file is ever opened, read or measured. Metric targets come only from
the published open replacement (Selawik), a publicly stated advance width (1126 units on a 2048 em, stated by the
Cascadia/Selawik designer at https://github.com/microsoft/cascadia-code/issues/41) and the generic DBCS rule
(full-width = 1 em, half-width = 0.5 em). Reserved Font Names of the sources (Selawik, Source) are not used.

Build-time tool only: fontTools and skia-pathops are NOT runtime dependencies of the app. Run it from a throwaway
virtual environment:
    python3 -m venv /tmp/vnfonts-venv
    /tmp/vnfonts-venv/bin/pip install fonttools==4.55.3 skia-pathops==0.8.0.post2
    /tmp/vnfonts-venv/bin/python -I scripts/fonts/build_vn_fonts.py --cache-dir /tmp/vnfonts-cache
    /tmp/vnfonts-venv/bin/python -I scripts/fonts/build_vn_fonts.py --cache-dir /tmp/vnfonts-cache --check
Every download is verified against its pinned sha256 before it is parsed; outputs are byte-for-byte reproducible
with the pinned tool versions (fixed timestamps, deterministic ordering). --check rebuilds into a temporary folder
and compares every output with the committed files.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import shutil
import sys
import tempfile
import unicodedata
import urllib.request
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
DEFAULT_OUT = REPO / "platform" / "fonts" / "document"

PINNED_TOOLS = {"fontTools": "4.55.3", "pathops": "0.8.0.post2"}
GF = "https://raw.githubusercontent.com/google/fonts/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl"
SELAWIK_COMMIT = "89362e84731d1f5777fa078fd4d5ebbd339e4378"

SOURCES = {
    "selawik": {
        "name": "Selawik", "version": "1.01", "license": "OFL-1.1", "reserved_font_names": ["Selawik"],
        "url": "https://github.com/microsoft/Selawik/releases/download/1.01/Selawik_Release.zip",
        "sha256": "3f62c51e05e3b5a1e6241cf92a371f0be2ea1183aa87b30718bbd40832a8d423",
        "members": {"selawk.ttf": "Regular", "selawkb.ttf": "Bold"},
        "license_url": f"https://raw.githubusercontent.com/microsoft/Selawik/{SELAWIK_COMMIT}/LICENSE.txt",
        "license_sha256": "77b7c2506d4efb22e09c8ccf10159f4956eab3ef7c007fef95de136bcf45300c",
    },
    "opensans": {
        "name": "Open Sans", "version": "3.003", "license": "OFL-1.1", "reserved_font_names": [],
        "url": f"{GF}/opensans/OpenSans%5Bwdth,wght%5D.ttf",
        "sha256": "36643644f318a812aab2d2ed3bb98f8cf0872527f835fe9398d95fe6b9adb878",
        "license_url": f"{GF}/opensans/OFL.txt",
        "license_sha256": "fbbbcfef55318de350562559b671360de6d597112ecc5c73881b05092db89602",
    },
    "inconsolata": {
        "name": "Inconsolata", "version": "3.001", "license": "OFL-1.1", "reserved_font_names": [],
        "url": f"{GF}/inconsolata/Inconsolata%5Bwdth,wght%5D.ttf",
        "sha256": "23ded25b447074d00659392bf9b1123d89df55cb07b0ad9bfef3366d199b5fcb",
        "license_url": f"{GF}/inconsolata/OFL.txt",
        "license_sha256": "29bd0cfd0fb2a45f9b057c834a057724bae1f63b525a8ac83d3e7525706d9f80",
    },
    "notoserifsc": {
        "name": "Noto Serif SC", "version": "2.003", "license": "OFL-1.1", "reserved_font_names": ["Source"],
        "url": f"{GF}/notoserifsc/NotoSerifSC%5Bwght%5D.ttf",
        "sha256": "050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9",
        "license_url": f"{GF}/notoserifsc/OFL.txt",
        "license_sha256": "5e0da210fb04058a8c0087985d2d456b931c2579811a49655721d3cf0c36b6d6",
    },
}

FONT_VERSION = 1.0
# 2026-10-25T00:00:00Z as seconds since 1904-01-01 (OpenType 'head' epoch): fixed so rebuilds are byte-identical.
FIXED_TIMESTAMP = 2082844800 + 1792886400
VENDOR = "UKWN"
MOD_NOTICE = "Modifications copyright 2026 3T Office contributors (VN-FONTS-1)."
OFL_DESCRIPTION = ("This Font Software is licensed under the SIL Open Font License, Version 1.1. "
                   "This license is available with a FAQ at: https://openfontlicense.org")
CONSOLE_ADVANCE_2048 = 1126  # public statement, see module docstring

# Vietnamese repertoire that must be complete in every output (precomposed + combining tone marks).
VIETNAMESE = sorted(set(range(0x1EA0, 0x1EFA))
                    | {ord(c) for c in "ăâêôơưđĂÂÊÔƠƯĐàáãèéìíòóõùúýÀÁÃÈÉÌÍÒÓÕÙÚÝĩĨũŨ"}
                    | {0x0300, 0x0301, 0x0303, 0x0309, 0x0323,  # tone marks
                       0x0302, 0x0306, 0x031B})  # circumflex, breve, horn (decomposed / NFD text)
FORBIDDEN_NAME_PARTS = ("segoe", "aptos", "consolas", "simsun", "nsimsun", "selawik", "source", "noto", "microsoft")

TOP, BOTTOM = "top", "bottom"


# ---------------------------------------------------------------------------------------------------------------
# Download (pinned, verified before use)

def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fetch(url: str, expected: str, cache: Path) -> bytes:
    cache.mkdir(parents=True, exist_ok=True)
    path = cache / expected
    if path.is_file():
        data = path.read_bytes()
        if sha256(data) == expected:
            return data
    with urllib.request.urlopen(url, timeout=600) as response:  # noqa: S310 (pinned https URL)
        data = response.read()
    got = sha256(data)
    if got != expected:
        raise SystemExit(f"sha256 mismatch for {url}: expected {expected}, got {got}")
    path.write_bytes(data)
    return data


def source_bytes(key: str, cache: Path) -> dict[str, bytes]:
    src = SOURCES[key]
    data = fetch(src["url"], src["sha256"], cache)
    if "members" not in src:
        return {"": data}
    out = {}
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        for member in src["members"]:
            out[member] = archive.read(member)
    return out


def license_text(key: str, cache: Path) -> str:
    src = SOURCES[key]
    return fetch(src["license_url"], src["license_sha256"], cache).decode("utf-8")


# ---------------------------------------------------------------------------------------------------------------
# Helpers

def load(data: bytes):
    from fontTools.ttLib import TTFont
    font = TTFont(io.BytesIO(data), recalcTimestamp=False)
    return font


def instance(data: bytes, location: dict):
    from fontTools.varLib import instancer
    font = load(data)
    out = instancer.instantiateVariableFont(font, location, inplace=False, overlap=instancer.OverlapMode.REMOVE)
    out.recalcTimestamp = False
    return out


def glyph_bounds(font, name):
    glyf = font["glyf"]
    g = glyf[name]
    g.recalcBounds(glyf)
    if not hasattr(g, "xMin") or g.numberOfContours == 0:
        return None
    return g.xMin, g.yMin, g.xMax, g.yMax


def draw_transformed(source_font, name, transform, glyf_target=None):
    """Return a simple TrueType glyph: source glyph outline (decomposed) under an affine transform."""
    from fontTools.pens.recordingPen import DecomposingRecordingPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    gs = source_font.getGlyphSet()
    rec = DecomposingRecordingPen(gs)
    gs[name].draw(rec)
    pen = TTGlyphPen(None)
    rec.replay(TransformPen(pen, transform))
    return pen.glyph()


def add_glyph(font, name, glyph, advance, lsb=None, unicode=None, mark=False):
    glyf, hmtx = font["glyf"], font["hmtx"]
    order = font.getGlyphOrder()
    if name in glyf.glyphs:
        raise ValueError(f"glyph {name} already exists")
    order = list(order) + [name]
    font.setGlyphOrder(order)
    glyf.glyphOrder = order
    glyf.glyphs[name] = glyph
    glyph.recalcBounds(glyf)
    if lsb is None:
        lsb = getattr(glyph, "xMin", 0) if glyph.numberOfContours != 0 else 0
    hmtx.metrics[name] = (int(round(advance)), int(lsb))
    if "vmtx" in font:
        upm = font["head"].unitsPerEm
        top = getattr(glyph, "yMax", 0) if glyph.numberOfContours != 0 else 0
        font["vmtx"].metrics[name] = (upm, int(font["vhea"].ascent - top) if "vhea" in font else 0)
    if unicode is not None:
        for table in font["cmap"].tables:
            if table.isUnicode():
                if table.format == 4 and unicode > 0xFFFF:
                    continue
                table.cmap[unicode] = name
    if "GDEF" in font and font["GDEF"].table.GlyphClassDef is not None:
        font["GDEF"].table.GlyphClassDef.classDefs[name] = 3 if mark else 1


def set_names(font, family, style, source_key, description):
    from fontTools.ttLib.tables._n_a_m_e import NameRecord  # noqa: F401 (ensures table class import)
    src = SOURCES[source_key]
    old = font["name"]
    copyright_src = (old.getDebugName(0) or "").strip()
    # The source's trademark notice names the source's Reserved Font Name; the derivative must not carry it.
    copyright_src = copyright_src.split(" Selawik is a trademark")[0].strip()
    if copyright_src and not copyright_src.endswith("."):
        copyright_src += "."
    ps_family = family.replace(" ", "")
    full = f"{family} {style}"
    names = {
        0: f"{copyright_src} {MOD_NOTICE}".strip(),
        1: family,
        2: style,
        3: f"{FONT_VERSION:.3f};{VENDOR};{ps_family}-{style}",
        4: full,
        5: f"Version {FONT_VERSION:.3f}; VN-FONTS-1 from {src['name']} {src['version']}",
        6: f"{ps_family}-{style}",
        8: "3T Office contributors",
        10: description,
        13: OFL_DESCRIPTION,
        14: "https://openfontlicense.org",
    }
    old.names = []
    for name_id, text in names.items():
        old.setName(text, name_id, 3, 1, 0x409)
        try:
            text.encode("mac_roman")
            old.setName(text, name_id, 1, 0, 0)
        except UnicodeEncodeError:
            pass
    for part in FORBIDDEN_NAME_PARTS:
        for record in old.names:
            if record.nameID in (1, 3, 4, 6, 16, 17) and part in record.toUnicode().lower():
                raise SystemExit(f"forbidden name part {part!r} in name {record.nameID}")


def finalize(font, family, style, weight, source_key, description, fixed_pitch=False):
    for tag in ("DSIG", "STAT", "fvar", "gvar", "avar", "HVAR", "MVAR", "cvar", "meta", "hdmx", "LTSH", "VDMX",
                "PCLT", "FFTM"):
        if tag in font:
            del font[tag]
    set_names(font, family, style, source_key, description)
    os2 = font["OS/2"]
    os2.usWeightClass = weight
    os2.achVendID = VENDOR
    bold = style == "Bold"
    os2.fsSelection = (os2.fsSelection & ~0b1100001) | (0b100000 if bold else 0b1000000)
    head = font["head"]
    head.macStyle = (head.macStyle & ~0b11) | (1 if bold else 0)
    head.fontRevision = FONT_VERSION
    head.created = head.modified = FIXED_TIMESTAMP
    if fixed_pitch:
        font["post"].isFixedPitch = 1
        os2.panose.bProportion = 9
    font.recalcTimestamp = False


def save(font, path: Path) -> None:
    font.recalcTimestamp = False
    font.save(str(path), reorderTables=True)


def check_vietnamese(font, label):
    cmap = font.getBestCmap()
    missing = [c for c in VIETNAMESE if c not in cmap]
    if missing:
        raise SystemExit(f"{label}: missing Vietnamese characters " + " ".join(f"U+{c:04X}" for c in missing))


# ---------------------------------------------------------------------------------------------------------------
# GPOS mark anchors (read the source's own mark-to-base data so Vietnamese marks sit where the designer put marks)

def _lookups(font, lookup_type):
    for lookup in font["GPOS"].table.LookupList.Lookup:
        if lookup.LookupType == 9:
            subtables = [s.ExtSubTable for s in lookup.SubTable]
            kind = lookup.SubTable[0].ExtensionLookupType
        else:
            subtables, kind = lookup.SubTable, lookup.LookupType
        if kind == lookup_type:
            yield lookup, subtables


def mark_anchors(font):
    """-> (marks {glyph: (class, x, y)}, bases {glyph: {class: (x, y)}}, first MarkBase subtable)."""
    marks, bases, first = {}, {}, None
    for _lookup, subtables in _lookups(font, 4):
        for st in subtables:
            first = first or st
            for i, g in enumerate(st.MarkCoverage.glyphs):
                rec = st.MarkArray.MarkRecord[i]
                marks.setdefault(g, (rec.Class, rec.MarkAnchor.XCoordinate, rec.MarkAnchor.YCoordinate))
            for i, g in enumerate(st.BaseCoverage.glyphs):
                for cls, anchor in enumerate(st.BaseArray.BaseRecord[i].BaseAnchor):
                    if anchor is not None:
                        bases.setdefault(g, {}).setdefault(cls, (anchor.XCoordinate, anchor.YCoordinate))
    return marks, bases, first


# ---------------------------------------------------------------------------------------------------------------
# VN Sans UI (Selawik + Vietnamese)

def _extract_difference(font, with_mark, base):
    """Outline of glyph `with_mark` minus glyph `base` (both from the same OFL font), as a recording pen value."""
    import pathops
    from fontTools.pens.recordingPen import RecordingPen
    gs = font.getGlyphSet()
    a, b = pathops.Path(), pathops.Path()
    gs[with_mark].draw(a.getPen())
    gs[base].draw(b.getPen())
    # Grow the base slightly so the shared contour does not leave hairline slivers.
    b.stroke(12, pathops.LineCap.BUTT_CAP, pathops.LineJoin.MITER_JOIN, 4)
    full_base = pathops.Path()
    gs[base].draw(full_base.getPen())
    b = pathops.op(b, full_base, pathops.PathOp.UNION)
    diff = pathops.op(a, b, pathops.PathOp.DIFFERENCE)
    # Keep only the largest piece (the mark); drop any residual sliver along the shared outline.
    rec = RecordingPen()
    best = max(diff.contours, key=lambda c: abs(c.area))
    best.draw(rec)
    return rec


def _glyph_from_recording(rec, transform):
    from fontTools.pens.transformPen import TransformPen
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    from fontTools.pens.cu2quPen import Cu2QuPen
    pen = TTGlyphPen(None)
    rec.replay(TransformPen(Cu2QuPen(pen, 1.0, reverse_direction=False), transform))
    return pen.glyph()


def _bbox_of(glyph, glyf):
    glyph.recalcBounds(glyf)
    return glyph.xMin, glyph.yMin, glyph.xMax, glyph.yMax


def build_vn_sans_ui(selawik: bytes, opensans: bytes, style: str):
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    font = load(selawik)
    weight = 700 if style == "Bold" else 400
    donor = instance(opensans, {"wght": weight, "wdth": 100})
    glyf, hmtx, cmap = font["glyf"], font["hmtx"], font.getBestCmap()
    dglyf, dcmap = donor["glyf"], donor.getBestCmap()
    marks, bases, markbase = mark_anchors(font)
    dmarks, dbases, _ = mark_anchors(donor)
    xh = font["OS/2"].sxHeight
    dxh = donor["OS/2"].sxHeight

    def name_of(cp):
        return cmap.get(cp)

    # Scale for donor marks: make the donor acute the same height as Selawik's acute (same relative mark size).
    acute_b = glyph_bounds(font, name_of(0x0301))
    dacute_b = glyph_bounds(donor, dcmap[0x0301])
    s_mark = (acute_b[3] - acute_b[1]) / (dacute_b[3] - dacute_b[1])
    s_body = xh / dxh

    top_cls = marks[name_of(0x0301)][0]
    bottom_cls = marks[name_of(0x0327)][0]
    circ_name = name_of(0x0302)
    circ_cls, circ_ax, circ_ay = marks[circ_name]
    mark_floor = acute_b[1]  # bottom of top marks, in mark coordinates

    # 1. U+0309 hook above: donor hook, scaled, centred on the anchor like Selawik's circumflex.
    hook_src = dcmap[0x0309]
    hb = glyph_bounds(donor, hook_src)
    hook = draw_transformed(donor, hook_src, (s_mark, 0, 0, s_mark, 0, 0))
    hx0, hy0, hx1, hy1 = _bbox_of(hook, glyf)
    hook = draw_transformed(donor, hook_src, (s_mark, 0, 0, s_mark, circ_ax - (hx0 + hx1) / 2, mark_floor - hy0))
    add_glyph(font, "hookabovecomb", hook, 0, unicode=0x0309, mark=True)
    new_marks = {"hookabovecomb": (top_cls, circ_ax, circ_ay)}

    # 2. U+0323 dot below: Selawik's own period dot, centred under the bottom anchor.
    pb = glyph_bounds(font, "period")
    dot_top = -round(0.121 * xh)
    cx = (pb[0] + pb[2]) / 2
    bottom_ax = marks[name_of(0x0327)][1]
    dot = draw_transformed(font, "period", (1, 0, 0, 1, bottom_ax - cx, dot_top - pb[3]))
    add_glyph(font, "dotbelowcomb", dot, 0, unicode=0x0323, mark=True)
    new_marks["dotbelowcomb"] = (bottom_cls, bottom_ax, 0)

    # 3. Horn: donor horn = donor (o|u|O|U)horn minus donor base, scaled, attached at Selawik's top-right anchor
    #    (mark class used for the right-side marks), advance widened by the donor's own widening (scaled).
    horn_cls = None
    for cls in sorted(bases.get("o", {})):
        if cls not in (top_cls, bottom_cls) and bases["o"][cls][0] > bases["o"][top_cls][0]:
            horn_cls = cls
    dhorn_cls = None
    for cls in sorted(dbases.get("o", {})):
        x, y = dbases["o"][cls]
        if x > dbases["o"][dmarks[dcmap[0x0301]][0]][0] + 100 and y > dxh * 0.8:
            dhorn_cls = cls
    horn_glyphs, horn_advance = {}, {}
    for base in ("o", "u", "O", "U"):
        horned = dcmap[ord({"o": "ơ", "u": "ư", "O": "Ơ", "U": "Ư"}[base])]
        rec = _extract_difference(donor, horned, dcmap[ord(base)])
        dax, day = dbases[dcmap[ord(base)]][dhorn_cls]
        ax, ay = bases[base][horn_cls]
        g = _glyph_from_recording(rec, (s_body, 0, 0, s_body, ax - dax * s_body, ay - day * s_body))
        gname = f"horncomb.{base}" if base != "o" else "horncomb"
        # Relative glyph for composites: outline drawn in base coordinates, so component offset is (0, 0).
        add_glyph(font, gname, g, 0, unicode=0x031B if base == "o" else None, mark=True)
        horn_glyphs[base] = gname
        d_widen = donor["hmtx"][horned][0] - donor["hmtx"][dcmap[ord(base)]][0]
        horn_advance[base] = hmtx[base][0] + round(d_widen * s_body)
    # Combining U+031B typed after any base: anchored at that base's horn anchor.
    new_marks["horncomb"] = (horn_cls, bases["o"][horn_cls][0], bases["o"][horn_cls][1])
    # Re-express horncomb so its anchor convention is "outline relative to anchor (0,0)+anchor": the outline is in
    # o-coordinates, so its mark anchor is o's horn anchor. Nothing else to move.

    gap = round(0.06 * xh)

    def top_anchor(base):
        return bases[base][top_cls]

    def mark_info(mname):
        if mname in new_marks:
            return new_marks[mname]
        return marks[mname]

    def place(mname, anchor):
        _cls, mx, my = mark_info(mname)
        return anchor[0] - mx, anchor[1] - my

    def abs_bounds(mname, offset):
        b = glyph_bounds(font, mname)
        return b[0] + offset[0], b[1] + offset[1], b[2] + offset[0], b[3] + offset[1]

    comb = {0x0300: name_of(0x0300), 0x0301: name_of(0x0301), 0x0303: name_of(0x0303), 0x0309: "hookabovecomb",
            0x0302: circ_name, 0x0306: name_of(0x0306), 0x0323: "dotbelowcomb"}
    added = []
    for cp in VIETNAMESE:
        if cp in font.getBestCmap():
            continue
        decomposed = unicodedata.normalize("NFD", chr(cp))
        base_ch, mark_cps = decomposed[0], [ord(m) for m in decomposed[1:]]
        horned = 0x031B in mark_cps
        tops = [m for m in mark_cps if m in (0x0300, 0x0301, 0x0303, 0x0309, 0x0302, 0x0306)]
        bottoms = [m for m in mark_cps if m == 0x0323]
        base = cmap[ord(base_ch)]
        if base_ch == "i" and tops:
            base = cmap[0x0131]  # dotless i under top marks
        pen = TTGlyphPen(font["glyf"])
        pen.addComponent(base, (1, 0, 0, 1, 0, 0))
        if horned:
            pen.addComponent(horn_glyphs[base_ch], (1, 0, 0, 1, 0, 0))
        anchor = top_anchor(base)
        if len(tops) == 1:
            off = place(comb[tops[0]], anchor)
            pen.addComponent(comb[tops[0]], (1, 0, 0, 1, *off))
        elif len(tops) == 2:
            first, tone = comb[tops[0]], comb[tops[1]]
            off1 = place(first, anchor)
            pen.addComponent(first, (1, 0, 0, 1, *off1))
            fb = abs_bounds(first, off1)
            tb = glyph_bounds(font, tone)
            if tops[0] == 0x0302 and tops[1] in (0x0300, 0x0301, 0x0309):
                # Vietnamese convention: acute, grave and hook sit on the right of the circumflex.
                share = 0.15 if tops[1] == 0x0300 else 0.30
                dx = fb[2] - share * (fb[2] - fb[0]) - tb[0]
                dy = fb[1] + 0.55 * (fb[3] - fb[1]) - tb[1]
            else:
                # Tilde over circumflex, any tone over breve: stacked and centred.
                dx = (fb[0] + fb[2]) / 2 - (tb[0] + tb[2]) / 2
                dy = fb[3] + gap - tb[1]
            pen.addComponent(tone, (1, 0, 0, 1, round(dx), round(dy)))
        for m in bottoms:
            off = place(comb[m], bases[base if base != cmap[0x0131] else cmap[ord("i")]][bottom_cls])
            pen.addComponent(comb[m], (1, 0, 0, 1, *off))
        glyph = pen.glyph()
        advance = horn_advance[base_ch] if horned else hmtx[base][0]
        gname = f"uni{cp:04X}"
        add_glyph(font, gname, glyph, advance, lsb=None, unicode=cp)
        added.append(gname)
    # Combining marks typed separately must also position through GPOS: append the new marks (highest glyph IDs, so
    # coverage order stays sorted) to the source's mark-to-base subtable.
    from fontTools.ttLib.tables import otTables
    for mname, (cls, mx, my) in new_marks.items():
        record = otTables.MarkRecord()
        record.Class = cls
        anchor = otTables.Anchor()
        anchor.Format = 1
        anchor.XCoordinate, anchor.YCoordinate = int(mx), int(my)
        record.MarkAnchor = anchor
        markbase.MarkCoverage.glyphs.append(mname)
        markbase.MarkArray.MarkRecord.append(record)
        markbase.MarkArray.MarkCount = len(markbase.MarkArray.MarkRecord)
    family = "VN Sans UI"
    finalize(font, family, style, weight, "selawik",
             "Derived from Selawik 1.01 (SIL OFL 1.1): original glyphs, advance widths and line metrics unchanged; "
             "Vietnamese letters added (VN-FONTS-1).")
    check_vietnamese(font, f"{family} {style}")
    return font, {"added_glyphs": len(added)}


# ---------------------------------------------------------------------------------------------------------------
# VN Sans (Open Sans instance)

def add_combining_horn(font):
    """Open Sans has the horn letters but no combining horn (U+031B), which decomposed (NFD) Vietnamese needs.
    Cut it from the font's own ơ minus o; zero advance, outline placed just after the preceding letter so it sits
    right even without positioning, and attached through the font's own top-right mark anchor class when present."""
    from fontTools.ttLib.tables import otTables
    cmap, hmtx = font.getBestCmap(), font["hmtx"]
    if 0x031B in cmap:
        return
    o, horned = cmap[ord("o")], cmap[ord("ơ")]
    o_adv = hmtx[o][0]
    rec = _extract_difference(font, horned, o)
    add_glyph(font, "horncomb", _glyph_from_recording(rec, (1, 0, 0, 1, -o_adv, 0)), 0, unicode=0x031B, mark=True)
    marks, bases, markbase = mark_anchors(font)
    top = marks[cmap[0x0301]][0] if cmap.get(0x0301) in marks else None
    o_anchors = bases.get(o, {})
    right = [c for c, (x, y) in o_anchors.items() if c != top and top in o_anchors and x > o_anchors[top][0] + 100
             and y > 0.8 * font["OS/2"].sxHeight]
    if markbase is None or not right:
        return
    ax, ay = o_anchors[right[0]]
    record = otTables.MarkRecord()
    record.Class = right[0]
    anchor = otTables.Anchor()
    anchor.Format = 1
    anchor.XCoordinate, anchor.YCoordinate = int(ax - o_adv), int(ay)
    record.MarkAnchor = anchor
    markbase.MarkCoverage.glyphs.append("horncomb")
    markbase.MarkArray.MarkRecord.append(record)
    markbase.MarkArray.MarkCount = len(markbase.MarkArray.MarkRecord)


def build_vn_sans(opensans: bytes, style: str):
    weight = 700 if style == "Bold" else 400
    font = instance(opensans, {"wght": weight, "wdth": 100})
    add_combining_horn(font)
    finalize(font, "VN Sans", style, weight, "opensans",
             "Derived from Open Sans 3.003 (SIL OFL 1.1), static instance. Look-alike substitute only: not "
             "metric-compatible with any other font (VN-FONTS-1).")
    check_vietnamese(font, f"VN Sans {style}")
    return font, {}


# ---------------------------------------------------------------------------------------------------------------
# VN Mono (Inconsolata, width instance 112.5 -> 550/1000 -> 1126/2048)

def build_vn_mono(inconsolata: bytes, style: str):
    from fontTools.ttLib.scaleUpem import scale_upem
    weight = 700 if style == "Bold" else 400
    font = instance(inconsolata, {"wght": weight, "wdth": 112.5})
    # Every character advances 550/1000; only optional 'dlig' ligatures (off by default) span 2-3 cells.
    advances = {a for a, _ in font["hmtx"].metrics.values() if a}
    if not advances or any(a % 550 for a in advances):
        raise SystemExit(f"VN Mono: unexpected advances at wdth 112.5: {sorted(advances)[:8]}")
    scale_upem(font, 2048)
    hmtx = font["hmtx"]
    for name, (adv, lsb) in list(hmtx.metrics.items()):
        if adv:
            cells = max(1, round(adv / (550 * 2048 / 1000)))
            hmtx.metrics[name] = (CONSOLE_ADVANCE_2048 * cells, lsb)
    font["OS/2"].xAvgCharWidth = CONSOLE_ADVANCE_2048
    finalize(font, "VN Mono", style, weight, "inconsolata",
             "Derived from Inconsolata 3.001 (SIL OFL 1.1), width instance 112.5 on a 2048 em: every character "
             "advances 1126 units (VN-FONTS-1).", fixed_pitch=True)
    check_vietnamese(font, f"VN Mono {style}")
    return font, {}


# ---------------------------------------------------------------------------------------------------------------
# VN Song (Noto Serif SC subset, DBCS widths)

LATIN_RANGES = ((0x0020, 0x007E), (0x00A0, 0x024F), (0x0300, 0x036F), (0x1E00, 0x1EFF), (0x2000, 0x206F),
                (0x20A0, 0x20BF), (0x2100, 0x214F))
CJK_EXTRA = ((0x3000, 0x303F), (0xFF01, 0xFF5E), (0xFFE0, 0xFFE6))


def gb2312_codepoints() -> set[int]:
    out = set()
    for b1 in range(0xA1, 0xF8):
        for b2 in range(0xA1, 0xFF):
            try:
                out.add(ord(bytes([b1, b2]).decode("gb2312")))
            except UnicodeDecodeError:
                pass
    return out


def is_latin_letterlike(cp: int) -> bool:
    """Latin script, digits, Latin punctuation: half-width in a DBCS font (0.5 em)."""
    if cp <= 0x007E:
        return True
    if 0x00A0 <= cp <= 0x024F or 0x0300 <= cp <= 0x036F or 0x1E00 <= cp <= 0x1EFF:
        return True
    return False


def _single_subst(font, tag):
    mapping = {}
    gsub = font["GSUB"].table
    for fr in gsub.FeatureList.FeatureRecord:
        if fr.FeatureTag != tag:
            continue
        for li in fr.Feature.LookupListIndex:
            lookup = gsub.LookupList.Lookup[li]
            for st in lookup.SubTable:
                if lookup.LookupType == 7:
                    st = st.ExtSubTable
                if hasattr(st, "mapping"):
                    for k, v in st.mapping.items():
                        mapping.setdefault(k, v)
    return mapping


def build_vn_song(noto: bytes, style: str = "Regular"):
    from fontTools import subset
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    from fontTools.pens.transformPen import TransformPen
    gb = gb2312_codepoints()
    wanted = set(gb) | set(VIETNAMESE)
    for lo, hi in LATIN_RANGES + CJK_EXTRA:
        wanted.update(range(lo, hi + 1))
    # 1) subset the variable font first (keeps memory/time low), keeping half/full-width alternates
    src = load(noto)
    opts = subset.Options()
    opts.layout_features = ["hwid", "fwid", "vert", "vrt2"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    opts.glyph_names = True
    opts.hinting = False
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=sorted(wanted))
    sub.subset(src)
    buf = io.BytesIO()
    src.save(buf)
    # 2) instance at Regular
    font = instance(buf.getvalue(), {"wght": 400})
    cmap = font.getBestCmap()
    hwid, fwid = _single_subst(font, "hwid"), _single_subst(font, "fwid")
    glyf, hmtx = font["glyf"], font["hmtx"]
    gs = font.getGlyphSet()
    upm = font["head"].unitsPerEm
    full, half = upm, upm // 2

    def rebuild(name, source_name, width_target):
        adv = hmtx[source_name][0]
        sx = min(1.0, (width_target / adv)) if adv else 1.0
        dx = (width_target - adv * sx) / 2
        return draw_transformed(font, source_name, (sx, 0, 0, 1, dx, 0)), width_target

    # Combining horn (U+031B, for decomposed text) is cut from the source letters before they are made half-width,
    # then given the same condensing as ơ so it lines up with the half-width o it follows.
    horn = None
    if 0x031B not in cmap:
        o_src, horned_src = cmap[ord("o")], cmap[ord("ơ")]
        horn_rec = _extract_difference(font, horned_src, o_src)
        h_adv = hmtx[hwid.get(horned_src, horned_src)][0]
        h_sx = min(1.0, half / h_adv) if h_adv else 1.0
        horn = _glyph_from_recording(horn_rec, (h_sx, 0, 0, 1, (half - h_adv * h_sx) / 2 - half, 0))

    new_glyphs = {}
    for cp, name in sorted(cmap.items()):
        if unicodedata.combining(chr(cp)):
            continue
        if is_latin_letterlike(cp):
            target = half
            source_name = hwid.get(name, name)
        elif cp in gb or 0x3000 <= cp <= 0x303F or 0xFF01 <= cp <= 0xFF5E or 0xFFE0 <= cp <= 0xFFE6:
            target = full
            source_name = fwid.get(name, name)
        else:
            continue  # other punctuation outside GB2312 keeps its designed width
        if hmtx[source_name][0] == target and source_name == name:
            continue
        new_glyphs[name] = rebuild(name, source_name, target)
    for name, (glyph, adv) in new_glyphs.items():
        glyf.glyphs[name] = glyph
        glyph.recalcBounds(glyf)
        hmtx.metrics[name] = (adv, getattr(glyph, "xMin", 0) if glyph.numberOfContours else 0)
    # 3) combining tone marks, cut from this font's own precomposed Vietnamese letters (a + mark minus a),
    #    zero advance, centred over the preceding half-width letter.
    xh = font["OS/2"].sxHeight or 500
    base_name = cmap[ord("a")]
    for comb_cp, pre in ((0x0300, "à"), (0x0301, "á"), (0x0303, "ã"), (0x0309, "ả"), (0x0323, "ạ"),
                         (0x0302, "â"), (0x0306, "ă")):
        if comb_cp in cmap and hmtx[cmap[comb_cp]][0] == 0:
            continue
        rec = _extract_difference(font, cmap[ord(pre)], base_name)
        b = _recording_bounds(rec)
        cxm = (b[0] + b[2]) / 2
        g = _glyph_from_recording(rec, (1, 0, 0, 1, -half / 2 - cxm, 0))
        name = f"uni{comb_cp:04X}.vn"
        add_glyph(font, name, g, 0, unicode=comb_cp, mark=True)
    if horn is not None:
        add_glyph(font, "uni031B.vn", horn, 0, unicode=0x031B, mark=True)
    # 4) drop width-changing layout (kerning, proportional alternates): DBCS text is unkerned
    if "GPOS" in font:
        del font["GPOS"]
    opts2 = subset.Options()
    opts2.layout_features = ["vert", "vrt2"]
    opts2.name_IDs = ["*"]
    opts2.notdef_outline = True
    opts2.glyph_names = False
    opts2.hinting = False
    sub2 = subset.Subsetter(opts2)
    sub2.populate(unicodes=sorted(font.getBestCmap()))
    sub2.subset(font)
    os2 = font["OS/2"]
    os2.xAvgCharWidth = full
    finalize(font, "VN Song", style, 400, "notoserifsc",
             "Derived from Noto Serif SC 2.003 (SIL OFL 1.1): GB2312 + Latin + Vietnamese subset; Latin letters "
             "half-width (0.5 em), Han and full-width forms 1 em (VN-FONTS-1).")
    check_vietnamese(font, f"VN Song {style}")
    return font, {"glyphs": font["maxp"].numGlyphs}


def _recording_bounds(rec):
    from fontTools.pens.boundsPen import BoundsPen
    pen = BoundsPen(None)
    rec.replay(pen)
    return pen.bounds


# ---------------------------------------------------------------------------------------------------------------

OUTPUTS = (
    ("VNSansUI-Regular.ttf", "sans_ui", "Regular"),
    ("VNSansUI-Bold.ttf", "sans_ui", "Bold"),
    ("VNSans-Regular.ttf", "sans", "Regular"),
    ("VNSans-Bold.ttf", "sans", "Bold"),
    ("VNMono-Regular.ttf", "mono", "Regular"),
    ("VNMono-Bold.ttf", "mono", "Bold"),
    ("VNSong-Regular.ttf", "song", "Regular"),
)


def check_tools():
    import fontTools
    import pathops
    versions = {"fontTools": fontTools.version, "pathops": getattr(pathops, "__version__", "?")}
    if versions["fontTools"] != PINNED_TOOLS["fontTools"]:
        raise SystemExit(f"fontTools {PINNED_TOOLS['fontTools']} required for reproducible output, "
                         f"found {versions['fontTools']}")
    return versions


def build_all(cache: Path, out: Path, only: set[str] | None = None) -> dict:
    check_tools()
    out.mkdir(parents=True, exist_ok=True)
    sel = source_bytes("selawik", cache)
    osans = source_bytes("opensans", cache)[""]
    inc = source_bytes("inconsolata", cache)[""]
    noto = source_bytes("notoserifsc", cache)[""] if not only or "song" in only else None
    by_style = {"Regular": sel["selawk.ttf"], "Bold": sel["selawkb.ttf"]}
    results = {}
    for filename, kind, style in OUTPUTS:
        if only and kind not in only:
            continue
        if kind == "sans_ui":
            font, info = build_vn_sans_ui(by_style[style], osans, style)
        elif kind == "sans":
            font, info = build_vn_sans(osans, style)
        elif kind == "mono":
            font, info = build_vn_mono(inc, style)
        else:
            font, info = build_vn_song(noto, style)
        path = out / filename
        save(font, path)
        if "glyphs" in info:  # count what was written (the last subset pass drops unused glyphs on save)
            info["glyphs"] = len(load(path.read_bytes()).getGlyphOrder())
        results[filename] = {"family": font["name"].getDebugName(1), "style": style,
                             "sha256": sha256(path.read_bytes()), "bytes": path.stat().st_size,
                             "copyright": font["name"].getDebugName(0), **info}
        print(f"built {filename}: {results[filename]['bytes']} bytes")
    return results


def write_license_files(cache: Path, out: Path, results: dict) -> None:
    texts = {key: license_text(key, cache) for key in SOURCES}
    # One OFL 1.1 text (identical body in every source) preceded by every copyright line.
    headers = []
    for key, text in texts.items():
        head = text.split("This Font Software is licensed")[0].strip()
        headers.append(f"[{SOURCES[key]['name']} {SOURCES[key]['version']}]\n{head}")
    body = "This Font Software is licensed" + texts["opensans"].split("This Font Software is licensed", 1)[1]
    embedded = sorted({info["copyright"] for info in results.values()})
    ofl = ("VN Sans UI, VN Sans, VN Mono, VN Song — 3T Office substitute document fonts (VN-FONTS-1).\n"
           f"{MOD_NOTICE}\n\nCopyright notices of the original Font Software (license files of the sources):\n\n"
           + "\n\n".join(headers)
           + "\n\nCopyright notices carried in the fonts (name table):\n" + "\n".join(f"- {c}" for c in embedded)
           + "\n\nReserved Font Names of the sources (not used by these fonts): "
           + ", ".join(sorted({n for s in SOURCES.values() for n in s["reserved_font_names"]}))
           + "\n\n" + body)
    (out / "FONTLOG.txt").write_text(FONTLOG, encoding="utf-8")
    (out / "OFL.txt").write_text(ofl, encoding="utf-8")
    manifest = {
        "ticket": "VN-FONTS-1",
        "build_script": "scripts/fonts/build_vn_fonts.py",
        "tools": PINNED_TOOLS,
        "sources": {k: {kk: vv for kk, vv in v.items() if kk != "members"} | ({"members": list(v["members"])}
                        if "members" in v else {}) for k, v in SOURCES.items()},
        "metric_sources": {
            "VN Sans UI": "Selawik 1.01 advances and vertical metrics, unchanged (published open replacement)",
            "VN Mono": "cell width 1126/2048 em, stated publicly by the Cascadia/Selawik designer: "
                       "https://github.com/microsoft/cascadia-code/issues/41",
            "VN Song": "generic DBCS rule: full width 1 em, half width 0.5 em",
            "VN Sans": "none (look-alike only, not metric-compatible)",
        },
        "outputs": results,
    }
    (out / "SOURCES.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


FONTLOG = """FONTLOG — 3T Office substitute document fonts (VN-FONTS-1)
=========================================================

These fonts are Modified Versions (SIL OFL 1.1, section 1) made so that office documents written with fonts
that 3T Office may not ship keep a similar look and, where a lawful metric source exists, the same line breaks.
They are rebuilt byte-for-byte by scripts/fonts/build_vn_fonts.py from the pinned sources in SOURCES.json.
No proprietary font file was opened, read or measured to make them.

VN Sans UI (Regular, Bold)
  Source: Selawik 1.01 by Microsoft (SIL OFL 1.1, Reserved Font Name "Selawik" -> renamed), published as an
  open-source replacement for a common user-interface font.
  Changes: renamed; every original glyph, advance width and vertical metric kept unchanged; 96 precomposed
  Vietnamese characters added as composites of Selawik's own letters and marks placed with Selawik's mark anchors;
  new combining marks: hook above (U+0309) and horn (U+031B) cut from Open Sans 3.003 (OFL) and scaled to
  Selawik's mark size, dot below (U+0323) made from Selawik's period. New marks appended to the mark-to-base positioning. Metric note: same advances as Selawik
  for all original characters; Vietnamese letters take their base letter's width (horn letters widened by the
  Open Sans horn widening, scaled).

VN Sans (Regular, Bold)
  Source: Open Sans 3.003 (SIL OFL 1.1). Changes: static instances (wght 400/700, wdth 100), renamed;
  combining horn (U+031B, for decomposed Vietnamese text) cut from the font's own horn letter.
  Metric note: a look-alike sans with full Vietnamese; NOT metric-compatible with any other font.

VN Mono (Regular, Bold)
  Source: Inconsolata 3.001 (SIL OFL 1.1). Changes: static instances at the designed width axis value 112.5
  (advance 550/1000, no artificial stretching) and wght 400/700, units per em scaled to 2048, every character
  advance set to 1126 units (publicly stated cell width, see SOURCES.json / build script). Optional ligatures
  (dlig) keep 2-3 cells. Vertical metrics are Inconsolata's (scaled).

VN Song (Regular)
  Source: Noto Serif SC 2.003 (SIL OFL 1.1; Source Han Serif lineage, Reserved Font Name "Source" -> not used).
  Changes: static instance wght 400; subset to GB2312 (7445 characters) + Latin, Latin-1, Latin Extended,
  Vietnamese, general punctuation, CJK symbols and full-width forms; Latin letters, digits and Vietnamese set to
  half width (0.5 em, using the font's own half-width alternates where present, otherwise condensed and centred);
  Han characters and GB2312 symbols full width (1 em); combining tone marks, circumflex, breve and horn cut from
  the font's own precomposed Vietnamese letters; kerning and proportional alternates removed (DBCS text is not kerned). Only one weight:
  the bold of the substituted face is synthesised by the layout engine. Vertical metrics are the source's.

2026-10-25  1.000  First release (VN-FONTS-1).
"""


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--cache-dir", type=Path, required=True, help="download cache (outside the repo)")
    parser.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--check", action="store_true", help="rebuild into a temp dir and compare with --out-dir")
    parser.add_argument("--only", action="append", choices=["sans_ui", "sans", "mono", "song"])
    args = parser.parse_args(argv)
    only = set(args.only) if args.only else None
    if args.check:
        with tempfile.TemporaryDirectory() as tmp:
            results = build_all(args.cache_dir, Path(tmp), only)
            bad = []
            for filename, info in results.items():
                committed = args.out_dir / filename
                if not committed.is_file() or sha256(committed.read_bytes()) != info["sha256"]:
                    bad.append(filename)
            print("REPRODUCIBLE" if not bad else f"DIFFERENT: {', '.join(bad)}")
            return 1 if bad else 0
    results = build_all(args.cache_dir, args.out_dir, only)
    if not only:
        write_license_files(args.cache_dir, args.out_dir, results)
    return 0


if __name__ == "__main__":
    sys.exit(main())
