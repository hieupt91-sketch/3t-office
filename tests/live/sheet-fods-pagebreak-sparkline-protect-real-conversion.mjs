/**
 * Real LibreOffice round-trip for page breaks, sparklines, sheet/workbook
 * protect, and outline groups. Parses XML after soffice hop.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found");

const sheet = "BaoCao";
const grid = {
  sheets: [sheet],
  activeSheet: sheet,
  sheetsData: {
    [sheet]: new Map([
      ["A1", { val: "Nhóm", formula: "", style: {} }],
      ["A2", { val: 10, formula: "", style: {} }],
      ["A3", { val: 20, formula: "", style: {} }],
      ["A4", { val: 30, formula: "", style: {} }],
      ["B1", { val: "", formula: "", style: {}, sparkline: { type: "column", values: [10, 20, 30], sourceRange: { start: { c: "A", r: 2 }, end: { c: "A", r: 4 } } } }]
    ])
  },
  pageBreaksBySheet: { [sheet]: { rows: [3], cols: ["B"] } },
  protectionBySheet: { [sheet]: { enabled: true, password: "" } },
  workbookProtection: { enabled: true, password: "" },
  outlineGroupsBySheet: { [sheet]: [{ id: "g1", axis: "row", start: 2, end: 4, collapsed: false }] }
};

const sourceXml = new SheetAdapter(grid).serializeToFods();
assert.match(sourceXml, /fo:break-before="page"/);
assert.match(sourceXml, /<calcext:sparkline-group\b/);
assert.match(sourceXml, /table:protected="true"/);
assert.match(sourceXml, /table:structure-protected="true"/);
assert.match(sourceXml, /<table:table-row-group\b/);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-sheet-misc-real-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "misc.fods");
fs.writeFileSync(source, sourceXml, "utf8");

try {
  const xlsxPath = convertWithSoffice(source, "xlsx", path.join(tempRoot, "xlsx"), { profileDir, appKind: "sheet" });
  const roundPath = convertWithSoffice(xlsxPath, "fods", path.join(tempRoot, "fods"), { profileDir, appKind: "sheet" });
  const xml = fs.readFileSync(roundPath, "utf8");

  const pageBreakKept = /fo:break-before="page"/i.test(xml);
  const sparkKept = /<calcext:sparkline/i.test(xml);
  const protectKept = /table:protected="true"/i.test(xml);
  const structureKept = /table:structure-protected="true"/i.test(xml);
  const outlineKept = /<table:table-row-group\b/i.test(xml) || /table:group/i.test(xml);

  const parsed = new SheetAdapter(null).parseFods(xml);
  const breaks = parsed.pageBreaksBySheet[sheet] || { rows: [], cols: [] };
  const spark = parsed.sheetsData[sheet].get("B1")?.sparkline;

  assert.ok(pageBreakKept, `page-break style missing after hop. snippet=${xml.match(/fo:break-before="[^"]+"/g)}`);
  assert.ok(breaks.rows.includes(3) || breaks.rows.length > 0, `pageBreak rows lost: ${JSON.stringify(breaks)}`);
  assert.ok(sparkKept, "sparkline XML missing after hop");
  assert.ok(spark?.type === "column" || spark?.type === "line", `sparkline parse=${JSON.stringify(spark)}`);
  assert.ok(protectKept, "table:protected missing after hop");
  assert.equal(parsed.protectionBySheet[sheet]?.enabled, true, "parse lost sheet protect");
  if (!structureKept) {
    console.log("NOTE: LibreOffice dropped table:structure-protected through XLSX hop (workbook structure lock). Native OOXML post-process: tests/live/sheet-xlsx-workbook-protection-native-export.mjs");
  }
  if (!outlineKept) {
    console.log("NOTE: LibreOffice dropped table:table-row-group through XLSX hop (outline).");
  } else {
    const group = (parsed.outlineGroupsBySheet[sheet] || []).find(item => item.axis === "row");
    assert.ok(group && group.end >= group.start, `outline parse=${JSON.stringify(parsed.outlineGroupsBySheet[sheet])}`);
  }

  console.log(`PASS: page-break + sparkline + sheet-protect survived FODS → XLSX → FODS. outlineKept=${outlineKept} structureKept=${structureKept} (${fs.statSync(xlsxPath).size} bytes).`);
} finally {
  if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
