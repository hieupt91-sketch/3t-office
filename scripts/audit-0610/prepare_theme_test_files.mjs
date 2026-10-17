// scripts/audit-0610/prepare_theme_test_files.mjs
// Prepares XLSX files for Excel COM theme oracle measurement

import fs from "node:fs";
import path from "node:path";
import { postProcessSheetXlsx } from "../../adapters/libreoffice/sheet/xlsx-native-postprocess.js";
import { resolveTheme, SHEET_THEMES, SHEET_COLOR_PALETTES, SHEET_FONT_SCHEMES } from "../../apps/sheet/sheet-themes.js";

const outDir = process.argv[2] || "./temp_themes";
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const baseFixture = path.resolve("tests/fixtures/real-office-samples/sample-sheet.xlsx");
const baseBuffer = fs.readFileSync(baseFixture);

const manifest = [];

// 1. All 8 complete theme presets
for (const themeDef of SHEET_THEMES) {
  const theme = resolveTheme(themeDef.id);
  const patchedXlsx = postProcessSheetXlsx(baseBuffer, { workbookTheme: theme });
  const filename = `theme_${themeDef.id}.xlsx`;
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, patchedXlsx);
  manifest.push({
    testType: "themePreset",
    id: themeDef.id,
    name: theme.themeName,
    colorSchemeId: theme.colorSchemeId,
    colorSchemeName: theme.colorScheme.name,
    expectedColors: theme.colorScheme.colors,
    fontSchemeId: theme.fontSchemeId,
    fontSchemeName: theme.fontScheme.name,
    expectedMajorFont: theme.fontScheme.majorFont,
    expectedMinorFont: theme.fontScheme.minorFont,
    filePath: path.resolve(filePath)
  });
}

// 2. Extra palettes on top of default Office theme
const extraPalettes = ["office2007", "grayscale", "blue", "green", "red", "violet", "orange"];
for (const paletteId of extraPalettes) {
  const theme = resolveTheme({ themeId: "office", colorSchemeId: paletteId, fontSchemeId: "office" });
  const patchedXlsx = postProcessSheetXlsx(baseBuffer, { workbookTheme: theme });
  const filename = `palette_${paletteId}.xlsx`;
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, patchedXlsx);
  manifest.push({
    testType: "paletteCustom",
    id: paletteId,
    name: theme.themeName,
    colorSchemeId: theme.colorSchemeId,
    colorSchemeName: theme.colorScheme.name,
    expectedColors: theme.colorScheme.colors,
    fontSchemeId: theme.fontSchemeId,
    fontSchemeName: theme.fontScheme.name,
    expectedMajorFont: theme.fontScheme.majorFont,
    expectedMinorFont: theme.fontScheme.minorFont,
    filePath: path.resolve(filePath)
  });
}

// 3. Extra font schemes
const extraFonts = ["centuryGothic", "garamond", "arial", "times"];
for (const fontId of extraFonts) {
  const theme = resolveTheme({ themeId: "office", colorSchemeId: "office", fontSchemeId: fontId });
  const patchedXlsx = postProcessSheetXlsx(baseBuffer, { workbookTheme: theme });
  const filename = `font_${fontId}.xlsx`;
  const filePath = path.join(outDir, filename);
  fs.writeFileSync(filePath, patchedXlsx);
  manifest.push({
    testType: "fontCustom",
    id: fontId,
    name: theme.themeName,
    colorSchemeId: theme.colorSchemeId,
    colorSchemeName: theme.colorScheme.name,
    expectedColors: theme.colorScheme.colors,
    fontSchemeId: theme.fontSchemeId,
    fontSchemeName: theme.fontScheme.name,
    expectedMajorFont: theme.fontScheme.majorFont,
    expectedMinorFont: theme.fontScheme.minorFont,
    filePath: path.resolve(filePath)
  });
}

const manifestPath = path.join(outDir, "manifest.json");
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
console.log(`Generated ${manifest.length} test XLSX files in ${outDir}`);
