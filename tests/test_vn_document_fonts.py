"""VN-FONTS-1 — 3T Office's own substitute document fonts (platform-neutral files in platform/fonts/document).

The fonts are read with a tiny sfnt reader below (no fontTools: it is a build-time tool only, never a dependency
of the app or of the test environment). Checks: files match SOURCES.json, family names are 3T's own (no
proprietary or Reserved Font Name), complete Vietnamese, the published metric rules each font was built to,
licence files, and the web stylesheet that aliases document font names to these files.
"""

from __future__ import annotations

import hashlib
import json
import re
import struct
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONT_DIR = ROOT / "platform" / "fonts" / "document"

FAMILIES = {
    "VNSansUI-Regular.ttf": ("VN Sans UI", "Regular"), "VNSansUI-Bold.ttf": ("VN Sans UI", "Bold"),
    "VNSans-Regular.ttf": ("VN Sans", "Regular"), "VNSans-Bold.ttf": ("VN Sans", "Bold"),
    "VNMono-Regular.ttf": ("VN Mono", "Regular"), "VNMono-Bold.ttf": ("VN Mono", "Bold"),
    "VNSong-Regular.ttf": ("VN Song", "Regular"),
}
# Names of the fonts these substitute for, and Reserved Font Names / vendor names of the sources: none may appear
# in a family, full or PostScript name of a produced font.
FORBIDDEN_IN_NAMES = ("segoe", "aptos", "consolas", "simsun", "selawik", "source", "noto", "microsoft",
                      "open sans", "opensans", "inconsolata")

VIETNAMESE = (set(range(0x1EA0, 0x1EFA))
              | {ord(c) for c in "ăâêôơưđĂÂÊÔƠƯĐàáâãèéêìíòóôõùúýÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĩĨũŨ"}
              | {0x0300, 0x0301, 0x0303, 0x0309, 0x0323, 0x0302, 0x0306, 0x031B})


class Sfnt:
    """Just enough of a TrueType reader for these checks."""

    def __init__(self, data: bytes):
        self.data = data
        num_tables = struct.unpack(">H", data[4:6])[0]
        self.tables = {}
        for i in range(num_tables):
            tag, _checksum, offset, length = struct.unpack(">4sIII", data[12 + 16 * i: 28 + 16 * i])
            self.tables[tag.decode("latin-1")] = (offset, length)

    def table(self, tag: str) -> bytes:
        offset, length = self.tables[tag]
        return self.data[offset: offset + length]

    @property
    def units_per_em(self) -> int:
        return struct.unpack(">H", self.table("head")[18:20])[0]

    def hhea(self) -> tuple[int, int, int]:
        return struct.unpack(">hhh", self.table("hhea")[4:10])

    def is_fixed_pitch(self) -> bool:
        return struct.unpack(">I", self.table("post")[12:16])[0] != 0

    def names(self) -> dict[int, str]:
        t = self.table("name")
        count, string_offset = struct.unpack(">HH", t[2:6])
        out = {}
        for i in range(count):
            pid, eid, lang, nid, length, off = struct.unpack(">6H", t[6 + 12 * i: 18 + 12 * i])
            if pid == 3 and eid == 1 and lang == 0x409:
                out[nid] = t[string_offset + off: string_offset + off + length].decode("utf-16-be")
        return out

    def cmap(self) -> dict[int, int]:
        t = self.table("cmap")
        count = struct.unpack(">H", t[2:4])[0]
        best = {}
        for i in range(count):
            pid, eid, off = struct.unpack(">HHI", t[4 + 8 * i: 12 + 8 * i])
            fmt = struct.unpack(">H", t[off: off + 2])[0]
            if (pid, eid) in ((3, 10), (0, 4)) and fmt == 12:
                n = struct.unpack(">I", t[off + 12: off + 16])[0]
                for k in range(n):
                    start, end, gid = struct.unpack(">III", t[off + 16 + 12 * k: off + 28 + 12 * k])
                    for cp in range(start, end + 1):
                        best[cp] = gid + cp - start
                return best
            if (pid, eid) in ((3, 1), (0, 3)) and fmt == 4 and not best:
                seg2 = struct.unpack(">H", t[off + 6: off + 8])[0]
                ends = struct.unpack(f">{seg2 // 2}H", t[off + 14: off + 14 + seg2])
                base = off + 16 + seg2
                starts = struct.unpack(f">{seg2 // 2}H", t[base: base + seg2])
                deltas = struct.unpack(f">{seg2 // 2}h", t[base + seg2: base + 2 * seg2])
                ro_pos = base + 2 * seg2
                ros = struct.unpack(f">{seg2 // 2}H", t[ro_pos: ro_pos + seg2])
                for s, (start, end, delta, ro) in enumerate(zip(starts, ends, deltas, ros)):
                    for cp in range(start, end + 1):
                        if cp == 0xFFFF:
                            continue
                        if ro == 0:
                            gid = (cp + delta) & 0xFFFF
                        else:
                            at = ro_pos + 2 * s + ro + 2 * (cp - start)
                            gid = struct.unpack(">H", t[at: at + 2])[0]
                            gid = (gid + delta) & 0xFFFF if gid else 0
                        if gid:
                            best[cp] = gid
        return best

    def advances(self) -> list[int]:
        num = struct.unpack(">H", self.table("hhea")[34:36])[0]
        num_glyphs = struct.unpack(">H", self.table("maxp")[4:6])[0]
        hmtx = self.table("hmtx")
        adv = [struct.unpack(">H", hmtx[4 * i: 4 * i + 2])[0] for i in range(num)]
        return adv + [adv[-1]] * (num_glyphs - num)

    def advance_of(self, cp: int) -> int:
        return self.advances()[self.cmap()[cp]]


def load(name: str) -> Sfnt:
    return Sfnt((FONT_DIR / name).read_bytes())


class FilesAndLicenceTests(unittest.TestCase):
    def test_every_font_matches_the_reproducible_build_manifest(self):
        manifest = json.loads((FONT_DIR / "SOURCES.json").read_text(encoding="utf-8"))
        self.assertEqual(set(manifest["outputs"]), set(FAMILIES))
        for name, info in manifest["outputs"].items():
            with self.subTest(font=name):
                data = (FONT_DIR / name).read_bytes()
                self.assertEqual(hashlib.sha256(data).hexdigest(), info["sha256"])
                self.assertEqual(len(data), info["bytes"])
        for key, src in manifest["sources"].items():
            with self.subTest(source=key):
                self.assertEqual(src["license"], "OFL-1.1")
                self.assertRegex(src["sha256"], r"^[0-9a-f]{64}$")
                self.assertRegex(src["license_sha256"], r"^[0-9a-f]{64}$")
                self.assertTrue(src["url"].startswith("https://"))

    def test_ofl_and_fontlog_ship_with_the_fonts(self):
        ofl = (FONT_DIR / "OFL.txt").read_text(encoding="utf-8")
        self.assertIn("SIL OPEN FONT LICENSE Version 1.1", ofl)
        self.assertIn("Reserved Font Name Selawik", ofl)  # original notice kept, the name itself is not used
        fontlog = (FONT_DIR / "FONTLOG.txt").read_text(encoding="utf-8")
        for family in ("VN Sans UI", "VN Sans", "VN Mono", "VN Song"):
            self.assertIn(family, fontlog)
        self.assertIn("No proprietary font file was opened", fontlog)

    def test_total_size_stays_within_budget(self):
        total = sum((FONT_DIR / name).stat().st_size for name in FAMILIES)
        self.assertLess(total, 8 * 1024 * 1024)


class NameTests(unittest.TestCase):
    def test_family_names_are_3t_own_and_free_of_other_font_names(self):
        for name, (family, style) in FAMILIES.items():
            with self.subTest(font=name):
                names = load(name).names()
                self.assertEqual(names[1], family)
                self.assertEqual(names[2], style)
                self.assertEqual(names[4], f"{family} {style}")
                self.assertEqual(names[6], f"{family.replace(' ', '')}-{style}")
                for nid in (1, 3, 4, 6, 16, 17):
                    for part in FORBIDDEN_IN_NAMES:
                        self.assertNotIn(part, names.get(nid, "").lower(), (nid, names.get(nid)))
                self.assertIn("Open Font License", names[13])
                self.assertIn("3T Office contributors", names[0])


class CoverageTests(unittest.TestCase):
    def test_every_font_has_complete_vietnamese_including_combining_marks(self):
        for name in FAMILIES:
            with self.subTest(font=name):
                cmap = load(name).cmap()
                missing = sorted(cp for cp in VIETNAMESE if cp not in cmap)
                self.assertEqual(missing, [], " ".join(f"U+{cp:04X}" for cp in missing))

    def test_combining_marks_have_zero_advance(self):
        for name in FAMILIES:
            font = load(name)
            for cp in (0x0300, 0x0301, 0x0303, 0x0309, 0x0323, 0x031B):
                with self.subTest(font=name, mark=f"U+{cp:04X}"):
                    self.assertEqual(font.advance_of(cp), 0)


class MetricRuleTests(unittest.TestCase):
    def test_vn_mono_every_character_advances_1126_of_2048(self):
        for name in ("VNMono-Regular.ttf", "VNMono-Bold.ttf"):
            font = load(name)
            self.assertEqual(font.units_per_em, 2048)
            self.assertTrue(font.is_fixed_pitch())
            cmap, adv = font.cmap(), font.advances()
            for cp, gid in cmap.items():
                if adv[gid]:
                    self.assertEqual(adv[gid], 1126, f"{name} U+{cp:04X}")

    def test_vn_song_full_width_han_and_half_width_latin(self):
        font = load("VNSong-Regular.ttf")
        self.assertEqual(font.units_per_em, 1000)
        cmap, adv = font.cmap(), font.advances()
        han = [ord(c) for c in "中文汉字测试国家"] + [0x3001, 0x3002, 0xFF0C]
        for cp in han:
            self.assertEqual(adv[cmap[cp]], 1000, f"U+{cp:04X}")
        latin = [*range(0x21, 0x7F), *(cp for cp in VIETNAMESE if cp >= 0xC0 and adv[cmap[cp]])]
        for cp in latin:
            self.assertEqual(adv[cmap[cp]], 500, f"U+{cp:04X}")
        self.assertEqual(adv[cmap[0x20]], 500)

    def test_vn_sans_ui_keeps_the_published_open_replacement_metrics(self):
        # Selawik 1.01 values (open replacement; read from the OFL source at build time): line metrics and, for
        # every character Selawik has, its advance; the Vietnamese letters take their base letter's advance.
        for name in ("VNSansUI-Regular.ttf", "VNSansUI-Bold.ttf"):
            font = load(name)
            self.assertEqual(font.units_per_em, 2048)
            self.assertEqual(font.hhea(), (2027, -431, 0))
            cmap, adv = font.cmap(), font.advances()
            for vn, base in (("ả", "a"), ("ẹ", "e"), ("Ổ", "O"), ("ỹ", "y"), ("ậ", "a"), ("Ặ", "A")):
                self.assertEqual(adv[cmap[ord(vn)]], adv[cmap[ord(base)]], (name, vn))
            self.assertGreater(adv[cmap[ord("ơ")]], adv[cmap[ord("o")]])
        # Digest of [codepoint, advance] for the 305 non-Vietnamese characters of Selawik 1.01 Regular / Bold,
        # computed from the pinned OFL source: every one is unchanged in VN Sans UI.
        selawik = {"VNSansUI-Regular.ttf": ("f4a655ef36b1df66d16234d9b46186aec1c6020edb18c4a53e90ed2ee1b0d44e", 305),
                   "VNSansUI-Bold.ttf": ("940f1a39c26a7a687af7d1457ed1e30c72f62eaf0e71129abbf30b5dd2060fa2", 305)}
        for name, (digest, count) in selawik.items():
            font = load(name)
            cmap, adv = font.cmap(), font.advances()
            pairs = sorted([cp, adv[gid]] for cp, gid in cmap.items() if cp not in VIETNAMESE)
            self.assertEqual(len(pairs), count, name)
            self.assertEqual(hashlib.sha256(json.dumps(pairs).encode()).hexdigest(), digest, name)
        self.assertEqual(load("VNSansUI-Regular.ttf").advance_of(ord("a")), 1042)
        self.assertEqual(load("VNSansUI-Regular.ttf").advance_of(ord(" ")), 561)


class WebStylesheetTests(unittest.TestCase):
    def setUp(self):
        self.css = (FONT_DIR / "document-fonts.css").read_text(encoding="utf-8")
        self.faces = re.findall(r"@font-face\s*\{([^}]*)\}", self.css)

    def test_every_referenced_file_exists(self):
        urls = re.findall(r'url\("([^"]+)"\)', self.css)
        self.assertTrue(urls)
        for url in urls:
            self.assertTrue((FONT_DIR / url).is_file(), url)
            self.assertNotIn("//", url)  # bundled, offline: never a network URL

    def test_aliases_prefer_an_installed_real_font_then_the_vn_substitute(self):
        expected = {"Segoe UI": "VNSansUI", "Aptos": "VNSans-", "Aptos Display": "VNSans-", "Consolas": "VNMono",
                    "SimSun": "VNSong", "NSimSun": "VNSong"}
        seen = set()
        for face in self.faces:
            family = re.search(r'font-family:\s*"([^"]+)"', face).group(1)
            if family not in expected:
                self.assertTrue(family.startswith("VN "), family)
                continue
            seen.add(family)
            src = re.search(r"src:\s*([^;]+);", face).group(1)
            self.assertTrue(src.strip().startswith("local("), family)
            self.assertIn(expected[family], src.split("url(")[1])
        self.assertEqual(seen, set(expected))

    def test_loaded_through_the_existing_bundled_font_stylesheet(self):
        theme_css = (ROOT / "platform" / "theme" / "fonts" / "fonts.css").read_text(encoding="utf-8")
        self.assertIn('@import url("../../fonts/document/document-fonts.css");', theme_css)
        first_rule = re.sub(r"/\*.*?\*/", "", theme_css, flags=re.S).strip().splitlines()[0]
        self.assertTrue(first_rule.startswith("@import"), "an @import must precede every other rule")


if __name__ == "__main__":
    unittest.main()
