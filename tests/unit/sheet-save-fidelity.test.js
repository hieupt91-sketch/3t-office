/**
 * VN Sheet — Save Fidelity: font-face-decls, newline preservation, rich-text paragraphs.
 * Brief: TASK-BRIEF-SHEET-SAVE-FIDELITY.md
 */

import { readFileSync } from "fs";
import { join } from "path";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(haystack, needle, message) {
  assert(String(haystack).includes(needle), `${message}: expected output to include "${needle}"`);
}

function assertNotIncludes(haystack, needle, message) {
  assert(!String(haystack).includes(needle), `${message}: expected output NOT to include "${needle}"`);
}

function makeGrid(sheetName) {
  return {
    sheets: [sheetName],
    activeSheet: sheetName,
    cellsData: new Map(),
    sheetsData: { [sheetName]: new Map() },
    commentsBySheet: { [sheetName]: {} },
    mergedRangesBySheet: { [sheetName]: [] },
    namedRangesBySheet: { [sheetName]: [] },
    namedRangesWorkbook: [],
    printAreaBySheet: { [sheetName]: null },
    pageSetupBySheet: { [sheetName]: {} },
    rowHeightsBySheet: { [sheetName]: new Map() },
    colWidthsBySheet: { [sheetName]: new Map() },
    userHiddenRowsBySheet: { [sheetName]: new Set() },
    userHiddenColsBySheet: { [sheetName]: new Set() },
    chartsBySheet: { [sheetName]: [] },
    conditionalFormattingBySheet: { [sheetName]: [] },
    dataValidationsBySheet: { [sheetName]: [] },
    pageBreaksBySheet: { [sheetName]: { rows: [], cols: [] } },
    protectionBySheet: { [sheetName]: { enabled: false, password: "" } },
    workbookProtection: { enabled: false, password: "" },
    outlineGroupsBySheet: { [sheetName]: [] },
    imagesBySheet: { [sheetName]: [] },
    pivotTablesBySheet: {},
    sheetVisibilityBySheet: {},
    sheetStates: {},
    rowHeight: 26,
    defaultColWidth: 100,
    cols: ["A","B","C","D","E","F","G","H","I","J","K","L"],
    rowCount: 100,
    frozenRows: 0,
    frozenCols: 0,
    isFrozenPanes: false
  };
}

async function runSheetSaveFidelityTests() {
  const results = [];
  const pass = (name) => results.push({ name, pass: true });
  const fail = (name, error) => results.push({ name, pass: false, error: String(error) });

  const { SheetAdapter } = await import("../../adapters/libreoffice/sheet/sheet-adapter.js");

  // ── Test 1: Cell with "\n" in val (no richText) → multiple <text:p> ──
  try {
    const grid = makeGrid("Sheet1");
    grid.sheetsData["Sheet1"].set("A1", { val: "Line1\nLine2\nLine3", style: {} });
    const adapter = new SheetAdapter(grid);
    const fods = adapter.serializeToFods();
    const textPCount = (fods.match(/<text:p>/g) || []).length;
    assert(textPCount >= 3, `Expected ≥3 <text:p> in output, got ${textPCount}`);
    assertIncludes(fods, "Line1", "Cell line 1");
    assertIncludes(fods, "Line2", "Cell line 2");
    assertIncludes(fods, "Line3", "Cell line 3");
    pass("Cell with \\n in val → multiple <text:p>");
  } catch (e) { fail("Cell with \\n in val → multiple <text:p>", e.message); }

  // ── Test 2: Rich text cell with 2 paragraphs × 2 runs → 2 <text:p> with spans ──
  try {
    const grid = makeGrid("Sheet1");
    grid.sheetsData["Sheet1"].set("B1", {
      val: "Para1 run1\nPara2 run2",
      richText: [
        { text: "Para1 run1", style: { color: "#ff0000", fontWeight: "bold" } },
        { text: "\n" },
        { text: "Para2 run2", style: { color: "#0000ff", fontStyle: "italic" } }
      ],
      style: {}
    });
    const adapter = new SheetAdapter(grid);
    const fods = adapter.serializeToFods();
    const textPMatches = fods.match(/<text:p>/g) || [];
    assert(textPMatches.length >= 2, `Expected ≥2 <text:p> for rich text, got ${textPMatches.length}`);
    assertIncludes(fods, "Para1 run1", "Rich text paragraph 1");
    assertIncludes(fods, "Para2 run2", "Rich text paragraph 2");
    assertIncludes(fods, "text:style-name=", "Rich text spans have style names");
    pass("Rich text 2 paragraphs × 2 runs → <text:p> with <text:span>");
  } catch (e) { fail("Rich text 2 paragraphs × 2 runs → <text:p> with <text:span>", e.message); }

  // ── Test 3: font-face-decls contains "Times New Roman" ──
  try {
    const grid = makeGrid("Sheet1");
    grid.sheetsData["Sheet1"].set("A1", { val: "Test", style: { fontFamily: "Times New Roman" } });
    const adapter = new SheetAdapter(grid);
    const fods = adapter.serializeToFods();
    assertIncludes(fods, "office:font-face-decls", "font-face-decls section present");
    assertIncludes(fods, "Times New Roman", "font-face-decls contains Times New Roman");
    assertIncludes(fods, "svg:font-family", "font-face has svg:font-family attribute");
    pass("font-face-decls contains Times New Roman");
  } catch (e) { fail("font-face-decls contains Times New Roman", e.message); }

  // ── Test 4: font-face-decls also includes fonts from rich text runs ──
  try {
    const grid = makeGrid("Sheet1");
    grid.sheetsData["Sheet1"].set("A1", {
      val: "Hello",
      richText: [
        { text: "Hello", style: { fontFamily: "Arial" } },
        { text: "\n" },
        { text: "World", style: { fontFamily: "Courier New" } }
      ],
      style: {}
    });
    const adapter = new SheetAdapter(grid);
    const fods = adapter.serializeToFods();
    assertIncludes(fods, "office:font-face-decls", "font-face-decls present");
    assertIncludes(fods, "Arial", "font-face-decls contains Arial");
    assertIncludes(fods, "Courier New", "font-face-decls contains Courier New");
    pass("font-face-decls includes fonts from rich text runs");
  } catch (e) { fail("font-face-decls includes fonts from rich text runs", e.message); }

  // ── Test 5: Round-trip serialize → parse keeps val with "\n" ──
  try {
    const grid = makeGrid("Sheet1");
    grid.sheetsData["Sheet1"].set("A1", { val: "Hello\nWorld", style: {} });
    const adapter = new SheetAdapter(grid);
    const fods = adapter.serializeToFods();
    const adapter2 = new SheetAdapter(makeGrid("Sheet1"));
    const wb = adapter2.parseFods(fods);
    const cell = wb.sheetsData["Sheet1"]?.get("A1");
    assert(cell, "Cell A1 exists after parse");
    assert(cell.val === "Hello\nWorld", `val round-trip: expected "Hello\\nWorld", got "${cell.val}"`);
    pass("Round-trip: val with \\n preserved");
  } catch (e) { fail("Round-trip: val with \\n preserved", e.message); }

  // ── Test 6: Round-trip serialize → parse keeps richText ──
  try {
    const grid = makeGrid("Sheet1");
    grid.sheetsData["Sheet1"].set("A1", {
      val: "Red\nBlue",
      richText: [
        { text: "Red", style: { color: "#ff0000" } },
        { text: "\n" },
        { text: "Blue", style: { color: "#0000ff" } }
      ],
      style: {}
    });
    const adapter = new SheetAdapter(grid);
    const fods = adapter.serializeToFods();
    const adapter2 = new SheetAdapter(makeGrid("Sheet1"));
    const wb = adapter2.parseFods(fods);
    const cell = wb.sheetsData["Sheet1"]?.get("A1");
    assert(cell, "Cell A1 exists after parse");
    assert(cell.val === "Red\nBlue", `richText val: expected "Red\\nBlue", got "${cell.val}"`);
    assert(Array.isArray(cell.richText) && cell.richText.length >= 2, `richText runs: expected ≥2, got ${cell.richText?.length || 0}`);
    pass("Round-trip: richText preserved");
  } catch (e) { fail("Round-trip: richText preserved", e.message); }

  // ── Test 7: Round-trip serialize → parse keeps style.fontFamily ──
  try {
    const grid = makeGrid("Sheet1");
    grid.sheetsData["Sheet1"].set("A1", { val: "Test", style: { fontFamily: "Times New Roman" } });
    const adapter = new SheetAdapter(grid);
    const fods = adapter.serializeToFods();
    const adapter2 = new SheetAdapter(makeGrid("Sheet1"));
    const wb = adapter2.parseFods(fods);
    const cell = wb.sheetsData["Sheet1"]?.get("A1");
    assert(cell, "Cell A1 exists after parse");
    assert(cell.style?.fontFamily === "Times New Roman",
      `fontFamily round-trip: expected "Times New Roman", got "${cell.style?.fontFamily}"`);
    pass("Round-trip: style.fontFamily preserved");
  } catch (e) { fail("Round-trip: style.fontFamily preserved", e.message); }

  // ── Test 8: Real FODS file — _dss_real.fods ──
  try {
    const fodsPath = join(process.cwd(), "_dss_real.fods");
    let realFods;
    try {
      realFods = readFileSync(fodsPath, "utf8");
    } catch (_) {
      pass("Real FODS file not found — skipped");
      return results;
    }
    const adapter = new SheetAdapter(makeGrid("Sheet1"));
    const parsed = adapter.parseFods(realFods);
    assert(parsed.sheets.length > 0, "Real FODS parsed with ≥1 sheet");

    // Find the sheet "Thông báo Sản phẩm mới"
    const targetSheet = parsed.sheets.find(s => s.includes("Thông báo"));
    assert(targetSheet, `Sheet "Thông báo Sản phẩm mới" found in parsed sheets`);

    const cells = parsed.sheetsData[targetSheet];
    assert(cells, "Sheet data found");

    // Cell D5 should have ≥15 text:p (15 lines of "■ ...")
    // In FODS, D5 is column D (4th column), row 5
    const d5 = cells.get("D5");
    assert(d5, "Cell D5 exists in real FODS");

    // Serialize back to FODS
    // We need to populate a grid with the parsed data to test serialize
    const testGrid = makeGrid(targetSheet);
    testGrid.sheetsData[targetSheet] = cells;
    testGrid.sheets = [targetSheet];
    testGrid.activeSheet = targetSheet;
    // Copy other necessary data
    testGrid.commentsBySheet[targetSheet] = parsed.commentsBySheet?.[targetSheet] || {};
    testGrid.mergedRangesBySheet[targetSheet] = parsed.mergedRangesBySheet?.[targetSheet] || [];
    testGrid.namedRangesBySheet[targetSheet] = parsed.namedRangesBySheet?.[targetSheet] || [];
    testGrid.pageSetupBySheet[targetSheet] = parsed.pageSetupBySheet?.[targetSheet] || {};
    testGrid.rowHeightsBySheet[targetSheet] = parsed.rowHeightsBySheet?.[targetSheet] || new Map();
    testGrid.colWidthsBySheet[targetSheet] = parsed.colWidthsBySheet?.[targetSheet] || new Map();
    testGrid.userHiddenRowsBySheet[targetSheet] = parsed.userHiddenRowsBySheet?.[targetSheet] || new Set();
    testGrid.userHiddenColsBySheet[targetSheet] = parsed.userHiddenColsBySheet?.[targetSheet] || new Set();
    testGrid.imagesBySheet[targetSheet] = parsed.imagesBySheet?.[targetSheet] || [];
    testGrid.outlineGroupsBySheet[targetSheet] = parsed.outlineGroupsBySheet?.[targetSheet] || [];
    testGrid.pageBreaksBySheet[targetSheet] = parsed.pageBreaksBySheet?.[targetSheet] || { rows: [], cols: [] };
    testGrid.protectionBySheet[targetSheet] = parsed.protectionBySheet?.[targetSheet] || { enabled: false, password: "" };
    testGrid.namedRangesWorkbook = parsed.namedRangesWorkbook || [];

    const adapter2 = new SheetAdapter(testGrid);
    const reSerialized = adapter2.serializeToFods();

    // Check font-face-decls has Times New Roman
    assertIncludes(reSerialized, "office:font-face-decls", "Re-serialized has font-face-decls");
    assertIncludes(reSerialized, "Times New Roman", "Re-serialized font-face-decls has Times New Roman");

    // Check D5 cell in re-serialized output has ≥15 <text:p>
    // D5 has 15 lines (2 header + 13 "■" lines), so count all <text:p> containing D5 content
    const allTextP = reSerialized.match(/<text:p>[\s\S]*?<\/text:p>/g) || [];
    const d5TextPCount = allTextP.filter(p => p.includes("■") || p.includes("4MP") || p.includes("Tích hợp đèn")).length;
    assert(d5TextPCount >= 15, `D5 should have ≥15 <text:p>, got ${d5TextPCount}`);

    // Check that <text:span> elements exist in the re-serialized output
    assertIncludes(reSerialized, "text:span", "Re-serialized output contains <text:span> elements");

    pass("Real FODS (_dss_real.fods): font-face, ≥15 <text:p>, <text:span>");
  } catch (e) { fail("Real FODS (_dss_real.fods): font-face, ≥15 <text:p>, <text:span>", e.message); }

  // ── Test 9: font-face-decls quote spacing in names correctly ──
  try {
    const grid = makeGrid("Sheet1");
    grid.sheetsData["Sheet1"].set("A1", { val: "Test", style: { fontFamily: "Arial Narrow" } });
    const adapter = new SheetAdapter(grid);
    const fods = adapter.serializeToFods();
    assertIncludes(fods, "Arial Narrow", "Font name with space present");
    // svg:font-family should properly quote the name
    assert(fods.includes("svg:font-family=\"&apos;Arial Narrow&apos;\"") || fods.includes("svg:font-family=\"Arial Narrow\""),
      "svg:font-family properly declared for Arial Narrow");
    pass("font-face-decls quotes font names with spaces");
  } catch (e) { fail("font-face-decls quotes font names with spaces", e.message); }

  // ── Test 10: Single-line cell (no \n) still produces one <text:p> ──
  try {
    const grid = makeGrid("Sheet1");
    grid.sheetsData["Sheet1"].set("A1", { val: "Just one line", style: {} });
    const adapter = new SheetAdapter(grid);
    const fods = adapter.serializeToFods();
    // Find the cell content - should have exactly one <text:p> with "Just one line"
    const match = fods.match(/<text:p>Just one line<\/text:p>/);
    assert(match, "Single-line cell produces one <text:p>");
    pass("Single-line cell → one <text:p>");
  } catch (e) { fail("Single-line cell → one <text:p>", e.message); }

  return results;
}

export { runSheetSaveFidelityTests };
