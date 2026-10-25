"""MAC-9: font configuration for the headless document engine on macOS.

Covers the shared generator (adapters/libreoffice/common/engine_fonts.py), the macOS table and folders
(platform/os_services/macos.py) and the start-up wiring in main.py. No engine process is started here; the
page-count measurement lives in tests/macos/fonts/measure_fonts.py (heavy, run through the lock).
"""
from __future__ import annotations

import importlib.util
import os
import sys
import tempfile
import types
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[2]
PKG_DIR = ROOT / "platform" / "os_services"
PKG_NAME = "_vno_os_services_fonts_test"


def load_adapter():
    spec = importlib.util.spec_from_file_location(
        "vno_engine_fonts_test", ROOT / "adapters" / "libreoffice" / "common" / "engine_fonts.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # loaded by path without sys.modules, exactly like main.py does
    return module


def load_macos():
    sys.modules.pop(PKG_NAME, None)
    for key in [k for k in sys.modules if k.startswith(PKG_NAME + ".")]:
        sys.modules.pop(key)
    spec = importlib.util.spec_from_file_location(PKG_NAME, PKG_DIR / "__init__.py",
                                                  submodule_search_locations=[str(PKG_DIR)])
    package = importlib.util.module_from_spec(spec)
    sys.modules[PKG_NAME] = package
    spec.loader.exec_module(package)
    return importlib.import_module(PKG_NAME + ".macos"), package


Sub = types.SimpleNamespace


class FontconfigDocumentTests(unittest.TestCase):
    def setUp(self):
        self.adapter = load_adapter()

    def test_document_lists_dirs_cache_selection_and_aliases_with_requested_font_first(self):
        xml = self.adapter.fontconfig_document(
            ["/fonts/a", Path("/fonts/b")],
            [Sub(font="Segoe UI", substitutes=("Helvetica Neue", "Arial"))],
            "/cache", accept_globs=["/fonts/a/keep*"], reject_globs=["/fonts/a/*"])
        root = ET.fromstring(xml.split("\n", 2)[2])  # skip declaration + DOCTYPE
        self.assertEqual([d.text for d in root.findall("dir")], ["/fonts/a", "/fonts/b"])
        self.assertEqual(root.find("cachedir").text, "/cache")
        self.assertEqual([g.text for g in root.findall("selectfont/acceptfont/glob")], ["/fonts/a/keep*"])
        self.assertEqual([g.text for g in root.findall("selectfont/rejectfont/glob")], ["/fonts/a/*"])
        alias = root.find("alias")
        self.assertEqual(alias.get("binding"), "same")
        self.assertEqual(alias.find("family").text, "Segoe UI")  # the real font, when installed, still wins
        self.assertEqual([f.text for f in alias.findall("accept/family")], ["Helvetica Neue", "Arial"])

    def test_text_is_escaped_and_empty_or_duplicate_entries_are_skipped(self):
        xml = self.adapter.fontconfig_document(
            ['/Users/a&b/<x>"'], [Sub(font="A & B", substitutes=("C<D",)), Sub(font="a & b", substitutes=("E",)),
                                  Sub(font="", substitutes=("X",)), Sub(font="NoSubs", substitutes=())], "/c")
        root = ET.fromstring(xml.split("\n", 2)[2])
        self.assertEqual(root.find("dir").text, '/Users/a&b/<x>"')
        aliases = root.findall("alias")
        self.assertEqual(len(aliases), 1)
        self.assertEqual(aliases[0].find("accept/family").text, "C<D")
        self.assertIsNone(root.find("selectfont"))


class FakeFonts:
    def __init__(self, directories=(Path("/f"),), substitutions=()):
        self._dirs = directories
        self._subs = substitutions

    def sources(self):
        return Sub(directories=self._dirs, accept_globs=(), reject_globs=())

    def substitutions(self):
        return self._subs


class WriteConfigTests(unittest.TestCase):
    def setUp(self):
        self.adapter = load_adapter()

    def test_writes_once_then_only_when_content_changes(self):
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "engine-fonts"
            first = self.adapter.write_engine_font_config(target, FakeFonts())
            self.assertTrue(first.ok and first.changed)
            self.assertTrue((target / "fonts.conf").is_file())
            self.assertTrue((target / "cache").is_dir())
            again = self.adapter.write_engine_font_config(target, FakeFonts())
            self.assertTrue(again.ok)
            self.assertFalse(again.changed)
            changed = self.adapter.write_engine_font_config(target, FakeFonts(directories=(Path("/g"),)))
            self.assertTrue(changed.changed)
            self.assertIn("<dir>/g</dir>", (target / "fonts.conf").read_text(encoding="utf-8"))
            self.assertEqual(sorted(p.name for p in target.iterdir()), ["cache", "fonts.conf"])  # no temp left
            self.assertEqual(self.adapter.engine_environment(changed), {"FONTCONFIG_FILE": str(target / "fonts.conf")})

    def test_io_failure_or_missing_service_reports_not_ok_and_no_environment(self):
        with tempfile.TemporaryDirectory() as tmp:
            blocker = Path(tmp) / "file"
            blocker.write_text("x", encoding="utf-8")
            failed = self.adapter.write_engine_font_config(blocker, FakeFonts())
            self.assertFalse(failed.ok)
            self.assertTrue(failed.reason)
            self.assertEqual(self.adapter.engine_environment(failed), {})
            none = self.adapter.write_engine_font_config(Path(tmp) / "x", None)
            self.assertFalse(none.ok)
            self.assertEqual(self.adapter.engine_environment(none), {})


class MacTableTests(unittest.TestCase):
    def setUp(self):
        self.macos, self.package = load_macos()
        self.fonts = self.macos.MacDocumentFonts(home=Path("/Users/someone"))
        self.table = {s.font: s for s in self.fonts.substitutions()}

    def test_backend_provides_document_fonts_and_windows_contract_is_unchanged(self):
        services = self.macos.build_services()
        self.assertIsInstance(services.document_fonts, self.macos.MacDocumentFonts)
        self.assertNotIn("document_fonts", self.package.SERVICE_FIELDS)
        self.assertIsNone(self.package.OSServices().document_fonts)

    def test_common_office_fonts_map_to_metric_compatible_or_best_mac_fonts(self):
        expected_first = {
            "Calibri": ("Carlito", True), "Cambria": ("Caladea", True), "Arial": ("Liberation Sans", True),
            "Times New Roman": ("Liberation Serif", True), "Courier New": ("Liberation Mono", True),
            # VN-FONTS-1: 3T Office's own bundled substitutes come first, the MAC-9 macOS fonts stay behind them.
            "Segoe UI": ("VN Sans UI", False), "Lucida Sans": ("Lucida Grande", False),
            "Aptos": ("VN Sans", False), "Consolas": ("VN Mono", False),
            "NSimSun": ("VN Song", False), "SimSun": ("VN Song", False),
        }
        for font, (substitute, metric) in expected_first.items():
            with self.subTest(font=font):
                self.assertEqual(self.table[font].substitutes[0], substitute)
                self.assertEqual(self.table[font].metric_compatible, metric)
                self.assertNotIn(font, self.table[font].substitutes)
        self.assertIn("Songti SC", self.table["SimSun"].substitutes)
        for font, fallback in {"Segoe UI": "Helvetica Neue", "Aptos": "Helvetica Neue", "Consolas": "Liberation Mono",
                               "SimSun": "Heiti SC", "NSimSun": "Heiti SC"}.items():
            with self.subTest(fallback=font):
                self.assertIn(fallback, self.table[font].substitutes[1:])

    def test_sources_are_os_font_folders_only_never_other_application_bundles(self):
        sources = self.fonts.sources()
        os_dirs, bundled = sources.directories[:3], sources.directories[3:]
        self.assertEqual(os_dirs, (Path("/System/Library/Fonts"), Path("/Library/Fonts"),
                                   Path("/Users/someone/Library/Fonts")))
        # VN-FONTS-1: plus 3T Office's own substitute fonts, read in place from this app's payload.
        self.assertEqual(bundled, (self.macos.BUNDLED_FONT_DIR,))
        self.assertEqual(self.macos.BUNDLED_FONT_DIR, ROOT / "platform" / "fonts" / "document")
        for value in [*map(str, os_dirs), *sources.accept_globs, *sources.reject_globs]:
            self.assertNotIn("/Applications", value)
            self.assertNotIn(".app/", value)
            self.assertNotIn("Microsoft", value)
        # A rejected folder is never scanned, so Supplemental (Arial, Times New Roman...) must be accepted itself.
        self.assertIn("/System/Library/Fonts/Supplemental", sources.accept_globs)
        self.assertIn("/System/Library/Fonts/LucidaGrande.ttc", sources.accept_globs)
        self.assertNotIn("/System/Library/Fonts/Symbol.ttf", sources.accept_globs)
        self.assertEqual(sources.reject_globs, ("/System/Library/Fonts/*",))

    def test_generated_mac_configuration_is_well_formed(self):
        adapter = load_adapter()
        with tempfile.TemporaryDirectory() as tmp:
            result = adapter.write_engine_font_config(Path(tmp), self.fonts)
            text = result.path.read_text(encoding="utf-8")
        root = ET.fromstring(text.split("\n", 2)[2])
        aliased = [a.find("family").text for a in root.findall("alias")]
        self.assertEqual(aliased, [s.font for s in self.fonts.substitutions()])

    @unittest.skipUnless(os.environ.get("VNOFFICE_SOFFICE_PATH"), "needs VNOFFICE_SOFFICE_PATH (pilot engine)")
    def test_metric_compatible_substitutes_ship_with_the_engine(self):
        fonts_dir = Path(os.environ["VNOFFICE_SOFFICE_PATH"]).resolve().parents[1] / "Resources" / "fonts" / "truetype"
        shipped = {p.name.split("-")[0] for p in fonts_dir.glob("*.ttf")}
        for substitution in self.fonts.substitutions():
            if substitution.metric_compatible:
                name = substitution.substitutes[0].replace(" ", "")
                self.assertIn(name, shipped, substitution.font)


class MainWiringTests(unittest.TestCase):
    def setUp(self):
        import main  # noqa: PLC0415  (heavy module, imported only for this class)
        self.main = main
        self.macos, _ = load_macos()

    def test_start_up_writes_configuration_and_exports_it_to_engine_processes(self):
        with tempfile.TemporaryDirectory() as data, mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("FONTCONFIG_FILE", None)
            services = Sub(document_fonts=self.macos.MacDocumentFonts(home=Path(data)))
            with mock.patch.object(self.main, "_os_services", return_value=services), \
                    mock.patch.object(self.main, "_user_data_dir", return_value=Path(data)):
                env = self.main._configure_document_engine_fonts()
            conf = Path(data) / "engine-fonts" / "fonts.conf"
            self.assertEqual(env, {"FONTCONFIG_FILE": str(conf)})
            self.assertEqual(os.environ["FONTCONFIG_FILE"], str(conf))
            self.assertIn("<family>Carlito</family>", conf.read_text(encoding="utf-8"))

    def test_explicit_environment_is_respected_and_other_oses_change_nothing(self):
        with tempfile.TemporaryDirectory() as data, mock.patch.dict(os.environ, {"FONTCONFIG_FILE": "/mine.conf"}):
            services = Sub(document_fonts=self.macos.MacDocumentFonts(home=Path(data)))
            with mock.patch.object(self.main, "_os_services", return_value=services), \
                    mock.patch.object(self.main, "_user_data_dir", return_value=Path(data)):
                self.main._configure_document_engine_fonts()
            self.assertEqual(os.environ["FONTCONFIG_FILE"], "/mine.conf")
        with tempfile.TemporaryDirectory() as data, mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("FONTCONFIG_FILE", None)
            for services in (None, Sub(document_fonts=None)):
                with mock.patch.object(self.main, "_os_services", return_value=services), \
                        mock.patch.object(self.main, "_user_data_dir", return_value=Path(data)):
                    self.assertEqual(self.main._configure_document_engine_fonts(), {})
            self.assertNotIn("FONTCONFIG_FILE", os.environ)
            self.assertEqual(list(Path(data).iterdir()), [])

    def test_failure_keeps_previous_behaviour(self):
        with tempfile.TemporaryDirectory() as data, mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("FONTCONFIG_FILE", None)
            blocker = Path(data) / "file"
            blocker.write_text("x", encoding="utf-8")
            services = Sub(document_fonts=self.macos.MacDocumentFonts(home=Path(data)))
            with mock.patch.object(self.main, "_os_services", return_value=services), \
                    mock.patch.object(self.main, "_user_data_dir", return_value=blocker):
                self.assertEqual(self.main._configure_document_engine_fonts(), {})
            self.assertNotIn("FONTCONFIG_FILE", os.environ)


class MeasurementToolTests(unittest.TestCase):
    def _load(self, name):
        spec = importlib.util.spec_from_file_location(f"vno_{name}_test", ROOT / "tests" / "macos" / "fonts" / f"{name}.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_pdf_font_names_drop_subset_prefix_and_decode_escapes(self):
        tool = self._load("measure_fonts")
        data = b"<< /BaseFont/ABCDEF+Carlito >> << /BaseFont /Arial#20Bold >> << /BaseFont/BAAAAA+Carlito >>"
        self.assertEqual(tool.pdf_fonts(data), ["Arial Bold", "Carlito"])

    def test_corpus_has_one_document_per_font_and_never_writes_into_the_repo(self):
        corpus = self._load("make_font_corpus")
        self.assertEqual(corpus.main(["--out-dir", str(ROOT / "tmp-corpus")]), 2)
        self.assertFalse((ROOT / "tmp-corpus").exists())
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(corpus.main(["--out-dir", tmp, "--repeats", "2"]), 0)
            self.assertEqual(len(list(Path(tmp).glob("font-*.docx"))), len(corpus.FONTS))


if __name__ == "__main__":
    unittest.main()
