/**
 * Real LibreOffice round-trip for VN Sheet charts:
 *   chartsBySheet → serializeToFods() → soffice FODS→XLSX → unzip xl/charts
 *   → soffice XLSX→FODS → parse XML + parseFods()
 *
 * Not part of node tests/run-tests.js (must stay <60s, no soffice).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry, listZipEntries } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found");

const sheet = "DoanhThu";
const grid = {
  sheets: [sheet],
  activeSheet: sheet,
  sheetsData: {
    [sheet]: new Map([
      ["A1", { val: "Tháng", formula: "", style: {} }],
      ["B1", { val: "Doanh thu", formula: "", style: {} }],
      ["A2", { val: "T1", formula: "", style: {} }],
      ["B2", { val: 120, formula: "", style: {} }],
      ["A3", { val: "T2", formula: "", style: {} }],
      ["B3", { val: 150, formula: "", style: {} }],
      ["A4", { val: "T3", formula: "", style: {} }],
      ["B4", { val: 180, formula: "", style: {} }],
      ["A5", { val: "T4", formula: "", style: {} }],
      ["B5", { val: 200, formula: "", style: {} }]
    ])
  },
  chartsBySheet: {
    [sheet]: [{
      id: "chart-bar-dt",
      type: "bar",
      range: { start: { c: "A", r: 1 }, end: { c: "B", r: 5 } },
      title: "Doanh thu theo tháng",
      labels: ["T1", "T2", "T3", "T4"],
      data: [120, 150, 180, 200]
    }]
  }
};

const xml = new SheetAdapter(grid).serializeToFods();
assert.match(xml, /<chart:chart\b/, "serializer must emit chart:chart");
assert.match(xml, /chart:class="chart:bar"/, "serializer must emit bar class");
assert.match(xml, /Doanh thu theo tháng/, "serializer must emit title");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-sheet-charts-real-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "charts.fods");
fs.writeFileSync(source, xml, "utf8");

try {
  const xlsxPath = convertWithSoffice(source, "xlsx", path.join(tempRoot, "xlsx"), { profileDir, appKind: "sheet" });
  assert.ok(fs.existsSync(xlsxPath) && fs.statSync(xlsxPath).size > 1000, "FODS → XLSX did not create a real workbook");
  const entries = listZipEntries(xlsxPath).map(entry => entry.name);
  const chartPart = entries.find(name => /^xl\/charts\/chart\d+\.xml$/i.test(name));
  assert.ok(chartPart, `XLSX missing xl/charts/chart*.xml; entries=${entries.filter(name => /chart|drawing/i.test(name)).join(",") || "(none)"}`);
  const chartXml = readZipEntry(xlsxPath, chartPart).toString("utf8");
  assert.match(chartXml, /<c:barChart\b/, "XLSX is not a native c:barChart");
  assert.match(chartXml, /120/, "XLSX chart lost cached 120");
  assert.match(chartXml, /200/, "XLSX chart lost cached 200");
  assert.match(chartXml, /Doanh thu theo tháng/, "XLSX chart lost title");

  const roundTripPath = convertWithSoffice(xlsxPath, "fods", path.join(tempRoot, "fods"), { profileDir, appKind: "sheet" });
  const roundXml = fs.readFileSync(roundTripPath, "utf8");
  assert.match(roundXml, /<chart:chart\b/, "LibreOffice dropped chart:chart after XLSX hop");
  assert.match(roundXml, /chart:class="chart:bar"|chart:class="chart:column"/, `round-trip class missing: ${roundXml.match(/chart:class="[^"]+"/)?.[0]}`);

  const parsed = new SheetAdapter(null).parseFods(roundXml);
  const chart = parsed.chartsBySheet[sheet]?.[0];
  assert.ok(chart, `parseFods lost chartsBySheet: ${JSON.stringify(parsed.chartsBySheet)}`);
  assert.equal(chart.type, "bar");
  assert.equal(chart.title, "Doanh thu theo tháng");
  assert.equal(parsed.sheetsData[sheet].get("B2")?.val, 120);
  assert.equal(parsed.sheetsData[sheet].get("B5")?.val, 200);
  assert.ok(chart.range?.start && chart.range?.end, `range lost: ${JSON.stringify(chart.range)}`);
  console.log(`PASS: serializeToFods → soffice xlsx (native ${chartPart}) → fods → parseFods kept bar chart + 120/200 (${fs.statSync(xlsxPath).size} bytes).`);
} finally {
  if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
