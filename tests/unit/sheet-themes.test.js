/**
 * Tests for VN Sheet Theme, Color, and Font schemes (Excel 2016 parity)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SHEET_THEMES,
  SHEET_COLOR_PALETTES,
  SHEET_FONT_SCHEMES,
  DEFAULT_SHEET_THEME,
  resolveTheme,
  generateThemeXml,
  parseThemeXml,
  getThemeColorPickerMatrix
} from "../../apps/sheet/sheet-themes.js";
import { postProcessSheetXlsx, overlaySheetXlsxFods } from "../../adapters/libreoffice/sheet/xlsx-native-postprocess.js";
import { readZipEntry } from "../../adapters/libreoffice/common/ooxml-zip-patch.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

export async function runSheetThemesTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || String(err) });
    }
  };

  test("Theme presets: Contains Office plus at least 7 extra presets (>= 8 total)", () => {
    assert.ok(SHEET_THEMES.length >= 8, `Expected at least 8 themes, found ${SHEET_THEMES.length}`);
    const ids = SHEET_THEMES.map(t => t.id);
    assert.ok(ids.includes("office"), "Must include default 'office' theme");
    assert.ok(ids.includes("facet"), "Must include 'facet' theme");
    assert.ok(ids.includes("integral"), "Must include 'integral' theme");
    assert.ok(ids.includes("ion"), "Must include 'ion' theme");
    assert.ok(ids.includes("organic"), "Must include 'organic' theme");
    assert.ok(ids.includes("retrospect"), "Must include 'retrospect' theme");
    assert.ok(ids.includes("slice"), "Must include 'slice' theme");
    assert.ok(ids.includes("wisp"), "Must include 'wisp' theme");
  });

  test("Color palettes: Contains Office plus at least 14 extra palettes (>= 15 total)", () => {
    const keys = Object.keys(SHEET_COLOR_PALETTES);
    assert.ok(keys.length >= 15, `Expected at least 15 color palettes, found ${keys.length}`);
    for (const key of keys) {
      const palette = SHEET_COLOR_PALETTES[key];
      assert.ok(palette.colors, `Palette ${key} missing colors`);
      const required = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"];
      for (const req of required) {
        assert.ok(palette.colors[req], `Palette ${key} missing color ${req}`);
        assert.match(palette.colors[req], /^[0-9A-Fa-f]{6}$/, `Invalid hex color for ${key}.${req}`);
      }
    }
  });

  test("Font schemes: Contains Office plus at least 10 extra font schemes (>= 11 total)", () => {
    const keys = Object.keys(SHEET_FONT_SCHEMES);
    assert.ok(keys.length >= 11, `Expected at least 11 font schemes, found ${keys.length}`);
    for (const key of keys) {
      const scheme = SHEET_FONT_SCHEMES[key];
      assert.ok(scheme.majorFont, `Scheme ${key} missing majorFont`);
      assert.ok(scheme.minorFont, `Scheme ${key} missing minorFont`);
    }
  });

  test("resolveTheme: Resolves presets and custom combinations accurately", () => {
    const def = resolveTheme();
    assert.equal(def.themeId, "office");
    assert.equal(def.colorScheme.id, "office");
    assert.equal(def.fontScheme.id, "office");

    const facet = resolveTheme("facet");
    assert.equal(facet.themeId, "facet");
    assert.equal(facet.colorScheme.id, "facet");
    assert.equal(facet.fontScheme.id, "centuryGothic");
    assert.equal(facet.colorScheme.colors.accent1.toUpperCase(), "94C600");
    assert.equal(facet.fontScheme.majorFont, "Century Gothic");

    const custom = resolveTheme({ themeId: "office", colorSchemeId: "green", fontSchemeId: "garamond" });
    assert.equal(custom.colorScheme.id, "green");
    assert.equal(custom.fontScheme.id, "garamond");
    assert.equal(custom.fontScheme.majorFont, "Garamond");
  });

  test("generateThemeXml: Produces valid OpenXML DrawingML theme1.xml with full fmtScheme", () => {
    const theme = resolveTheme("integral");
    const xml = generateThemeXml(theme);
    assert.ok(xml.includes("<a:theme "), "Must have <a:theme> root");
    assert.ok(xml.includes('<a:clrScheme name="Integral">'), "Must have clrScheme name");
    assert.ok(xml.includes("<a:fontScheme "), "Must have fontScheme");
    assert.ok(xml.includes('<a:latin typeface="Century Gothic"/>'), "Must have Century Gothic major font");
    assert.ok(xml.includes("<a:fmtScheme "), "Must have fmtScheme");
    assert.ok(xml.includes("<a:fillStyleLst>"), "Must have fillStyleLst");
    assert.ok(xml.includes("<a:lnStyleLst>"), "Must have lnStyleLst");
    assert.ok(xml.includes('cmpd="sng"'), "Must have valid compound line sng");
    assert.ok(xml.includes("<a:effectStyleLst>"), "Must have effectStyleLst");
    assert.ok(xml.includes("<a:bgFillStyleLst>"), "Must have bgFillStyleLst");
  });

  test("parseThemeXml & roundtrip: Can parse DrawingML theme XML and recover colors/fonts", () => {
    const original = resolveTheme("slice");
    const xml = generateThemeXml(original);
    const parsed = parseThemeXml(xml);
    assert.ok(parsed, "parseThemeXml returned null");
    assert.equal(parsed.themeName, "Slice");
    assert.equal(parsed.fontScheme.majorFont, "Century Gothic");
    assert.equal(parsed.fontScheme.minorFont, "Century Gothic");
    for (const [key, expectedHex] of Object.entries(original.colorScheme.colors)) {
      assert.equal(parsed.colorScheme.colors[key].toUpperCase(), expectedHex.toUpperCase(), `Mismatched color ${key}`);
    }
  });

  test("getThemeColorPickerMatrix: Generates 6 rows x 10 columns valid palette matrix", () => {
    const theme = resolveTheme("facet");
    const matrix = getThemeColorPickerMatrix(theme.colorScheme.colors);
    assert.equal(matrix.length, 6, "Must have exactly 6 rows");
    for (let r = 0; r < 6; r++) {
      assert.equal(matrix[r].length, 10, `Row ${r} must have 10 columns`);
      for (let c = 0; c < 10; c++) {
        assert.match(matrix[r][c], /^#[0-9A-Fa-f]{6}$/, `Invalid hex in matrix[${r}][${c}]: ${matrix[r][c]}`);
      }
    }
  });

  test("XLSX Native postprocess & overlay roundtrip: injects and extracts theme1.xml", () => {
    const fixturePath = path.resolve("tests/fixtures/real-office-samples/sample-sheet.xlsx");
    const fixtureBytes = fs.readFileSync(fixturePath);

    const themeToApply = resolveTheme("wisp");
    const patchedBytes = postProcessSheetXlsx(fixtureBytes, { workbookTheme: themeToApply });

    const themeEntry = readZipEntry(patchedBytes, "xl/theme/theme1.xml");
    assert.ok(themeEntry, "Patched XLSX must contain xl/theme/theme1.xml");
    const themeXml = themeEntry.toString("utf8");
    assert.ok(themeXml.includes('name="Wisp"'), "Theme XML must contain Wisp");

    const relsEntry = readZipEntry(patchedBytes, "xl/_rels/workbook.xml.rels");
    assert.ok(relsEntry.toString("utf8").includes("theme/theme1.xml"), "Relationships must reference theme1.xml");

    const ctEntry = readZipEntry(patchedBytes, "[Content_Types].xml");
    assert.ok(ctEntry.toString("utf8").includes("/xl/theme/theme1.xml"), "Content types must include theme1.xml");

    // Overlay to FODS
    const dummyFods = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0">
  <office:body>
    <office:spreadsheet>
      <table:table table:name="Sheet1"/>
    </office:spreadsheet>
  </office:body>
</office:document>`;
    const overlaidFods = overlaySheetXlsxFods(patchedBytes, dummyFods);
    assert.ok(overlaidFods.includes('vno:workbook-theme="'), "Overlaid FODS must have vno:workbook-theme attribute");
    assert.ok(overlaidFods.includes("Wisp") || overlaidFods.includes("wisp"), "FODS must contain Wisp theme metadata");
  });

  test("SheetGridController: theme getters, setters, and swatch matrix methods", () => {
    const mockContainer = {
      clientWidth: 800,
      clientHeight: 600,
      addEventListener: () => {},
      removeEventListener: () => {},
      appendChild: () => {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
    };
    const grid = new SheetGridController(mockContainer);

    // Initial theme should be office
    const initTheme = grid.getWorkbookTheme();
    assert.equal(initTheme.themeId, "office");

    // Change theme to facet
    grid.setWorkbookTheme("facet");
    assert.equal(grid.getWorkbookTheme().themeId, "facet");
    const facetColors = grid.getThemeColors();
    assert.equal(facetColors.accent1.toUpperCase(), "94C600");

    // Change only color scheme to blue
    grid.setWorkbookThemeColorScheme("blue");
    assert.equal(grid.getWorkbookTheme().colorSchemeId, "blue");

    // Change only font scheme to centuryGothic
    grid.setWorkbookThemeFontScheme("centuryGothic");
    assert.equal(grid.getWorkbookTheme().fontSchemeId, "centuryGothic");

    // Get color picker matrix
    const matrix = grid.getThemeColorPickerMatrix();
    assert.equal(matrix.length, 6);
    assert.equal(matrix[0].length, 10);
  });

  return results;
}
