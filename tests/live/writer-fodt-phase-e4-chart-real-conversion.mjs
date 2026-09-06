/**
 * Phase E.4 Chart acceptance: FODT office:chart -> real soffice DOCX.
 * Assertions follow measured engine behavior in
 * docs/HANDOFF-WRITER-FODT-PHASE-E4-FINDINGS.md.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { generateChartHtml } from "../../apps/writer/writer-illustrations.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer FODT Phase E.4 Chart live test");

function adapterWithZones({ body = "", header = "" } = {}) {
  const bodyEl = { innerHTML: body };
  const headerEl = {
    innerHTML: header,
    get innerText() { return String(this.innerHTML).replace(/<[^>]+>/g, " "); }
  };
  const adapter = new WriterAdapter({
    innerHTML: body,
    querySelector(selector) {
      if (selector === ".vno-writer-body") return bodyEl;
      if (selector === ".vno-writer-header") return headerEl;
      return null;
    }
  });
  return { adapter, body: bodyEl, header: headerEl };
}

function chartHtml(options) {
  return generateChartHtml(options).replace(/\s*<p>\s*<br\s*\/?>\s*<\/p>\s*$/i, "").trim();
}

function cache(xml, tag) {
  const block = String(xml).match(new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`));
  if (!block) return [];
  return [...block[0].matchAll(/<c:v>([^<]*)<\/c:v>/g)].map(m => m[1]);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-fodt-phase-e4-chart-"));
const cases = [
  { type: "bar", odf: "chart:bar", docx: "c:barChart", title: "CHART_BAR_Q" },
  { type: "line", odf: "chart:line", docx: "c:lineChart", title: "CHART_LINE_Q" },
  { type: "pie", odf: "chart:circle", docx: "c:pieChart", title: "CHART_PIE_Q" },
  { type: "area", odf: "chart:area", docx: "c:areaChart", title: "CHART_AREA_Q" }
];

for (const item of cases) {
  const html = chartHtml({
    type: item.type,
    title: item.title,
    labels: ["Q1", "Q2", "Q3", "Q4"],
    data: [120, 190, 300, 250]
  });
  const { adapter } = adapterWithZones({ body: html });
  const fodt = adapter.serializeToFodt();
  assert.match(fodt, new RegExp(`chart:class="${item.odf}"`));
  assert.match(fodt, /<table:table-header-columns>/);
  assert.match(fodt, /office:value="120"/);

  const fodtPath = path.join(tempRoot, `${item.type}.fodt`);
  fs.writeFileSync(fodtPath, fodt, "utf8");
  const docx = convertWithSoffice(fodtPath, "docx", path.join(tempRoot, `${item.type}-docx`), {
    appKind: "writer", profileDir: path.join(tempRoot, `${item.type}-docx`, "profile")
  });
  const entries = listZipEntries(docx).map(entry => entry.name);
  assert.ok(entries.includes("word/charts/chart1.xml"), `${item.type}: missing word/charts/chart1.xml (${entries.join(",")})`);
  const chartXml = (readZipEntry(docx, "word/charts/chart1.xml") || Buffer.alloc(0)).toString("utf8");
  assert.ok(chartXml.includes(`<${item.docx}`), `${item.type}: missing <${item.docx}>`);
  assert.deepEqual(cache(chartXml, "c:cat"), ["Q1", "Q2", "Q3", "Q4"], `${item.type} cats`);
  assert.deepEqual(cache(chartXml, "c:val"), ["120", "190", "300", "250"], `${item.type} vals`);
  assert.match(chartXml, new RegExp(`<a:t>${item.title}</a:t>`));
  assert.equal((chartXml.match(/<c:ser\b/g) || []).length, 1);

  const parsed = adapterWithZones({ body: "<p>xóa</p>" });
  parsed.adapter.parseFodt(fodt);
  assert.match(parsed.body.innerHTML, new RegExp(`data-chart-type="${item.type}"`));
  assert.match(parsed.body.innerHTML, new RegExp(item.title));
  assert.equal(parsed.adapter.shapes.length, 0);
  assert.equal(parsed.adapter.serializeToFodt(), fodt, `${item.type} FODT not idempotent`);
  console.log(`E4_CHART_LIVE_PASS type=${item.type} docx=${docx}`);
}

const pdf = convertWithSoffice(path.join(tempRoot, "bar.fodt"), "pdf", path.join(tempRoot, "pdf"), {
  appKind: "writer", profileDir: path.join(tempRoot, "profile-pdf")
});
const pdfBytes = fs.readFileSync(pdf);
assert.ok(pdfBytes.slice(0, 5).toString("latin1") === "%PDF-", "expected PDF header");
console.log(`E4_CHART_LIVE_PASS pdf=${pdf}`);
