/**
 * Real LibreOffice round-trip for VN Slides charts:
 *   chart shape → serializeToFodp() → soffice FODP→PPTX (native ppt/charts)
 *   → soffice PPTX→FODP → parse XML + parseFodp()
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found");

const canvas = {
  slides: [{
    id: 1,
    title: "Bieu do",
    body: "",
    layoutType: "blank",
    notes: "",
    shapes: [{
      id: "chart-dt",
      type: "chart",
      chartType: "bar",
      title: "Doanh thu 2026",
      labels: ["Thang 1", "Thang 2", "Thang 3"],
      data: [120, 185, 143],
      x: 120, y: 80, w: 680, h: 360,
      color: "transparent"
    }]
  }]
};

const fodp = new SlidesAdapter(canvas).serializeToFodp();
assert.match(fodp, /<chart:chart\b/, "serializer must emit chart:chart");
assert.match(fodp, /chart:class="chart:bar"/, "serializer must emit bar");
assert.match(fodp, /Doanh thu 2026/, "serializer must emit title");
assert.match(fodp, />120</, "serializer must emit 120 in local-table");

const inMemory = new SlidesAdapter(null).parseFodp(fodp);
const memChart = inMemory[0].shapes.find(shape => shape.type === "chart");
assert.equal(memChart?.chartType, "bar");
assert.equal(memChart?.title, "Doanh thu 2026");
assert.deepEqual(memChart?.data, [120, 185, 143]);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodp-charts-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "charts.fodp");
fs.writeFileSync(source, fodp, "utf8");

try {
  const pptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "pptx"), { profileDir });
  const entries = listZipEntries(pptxPath).map(entry => entry.name);
  const chartPart = entries.find(name => /^ppt\/charts\/chart\d+\.xml$/i.test(name));
  assert.ok(chartPart, `PPTX missing ppt/charts; ${entries.filter(name => /chart/i.test(name)).join(",") || "(none)"}`);
  const chartXml = readZipEntry(pptxPath, chartPart).toString("utf8");
  assert.match(chartXml, /<c:barChart\b/, "PPTX is not native c:barChart");
  assert.match(chartXml, /120/, "PPTX chart lost 120");
  assert.match(chartXml, /185/, "PPTX chart lost 185");

  const roundPath = convertWithSoffice(pptxPath, "fodp", path.join(tempRoot, "fodp"), { profileDir });
  const roundXml = fs.readFileSync(roundPath, "utf8");
  assert.match(roundXml, /<chart:chart\b/, "soffice dropped chart:chart after PPTX hop");
  const parsed = new SlidesAdapter(null).parseFodp(roundXml);
  const chart = parsed[0]?.shapes?.find(shape => shape.type === "chart");
  assert.ok(chart, `parse lost chart: ${JSON.stringify(parsed[0]?.shapes?.map(s => s.type))}`);
  assert.equal(chart.chartType, "bar");
  assert.ok(chart.data?.includes(120) && chart.data?.includes(185), `data=${JSON.stringify(chart.data)}`);
  console.log(`PASS: Slides chart survived FODP → PPTX (${chartPart}) → FODP. title=${chart.title} data=${JSON.stringify(chart.data)}`);
} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
