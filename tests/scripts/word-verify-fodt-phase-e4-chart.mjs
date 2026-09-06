/**
 * One-shot Word visual check for Phase E.4 Chart. Writes FODT -> soffice DOCX
 * into a temp dir, then prints the DOCX path for Start-Process. Not part of
 * the unit suite.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { generateChartHtml } from "../../apps/writer/writer-illustrations.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

function adapterWithZones({ body = "", header = "" } = {}) {
  const bodyEl = { innerHTML: body };
  const headerEl = {
    innerHTML: header,
    get innerText() { return String(this.innerHTML).replace(/<[^>]+>/g, " "); }
  };
  return new WriterAdapter({
    innerHTML: body,
    querySelector(selector) {
      if (selector === ".vno-writer-body") return bodyEl;
      if (selector === ".vno-writer-header") return headerEl;
      return null;
    }
  });
}

function chartHtml(options) {
  return generateChartHtml(options).replace(/\s*<p>\s*<br\s*\/?>\s*<\/p>\s*$/i, "").trim();
}

const outDir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), "vno-e4-word-"));
fs.mkdirSync(outDir, { recursive: true });

const bar = chartHtml({
  type: "bar",
  title: "Doanh thu Q1-Q4",
  labels: ["Q1", "Q2", "Q3", "Q4"],
  data: [120, 190, 300, 250]
});
const pie = chartHtml({
  type: "pie",
  title: "Co cau thi phan",
  labels: ["Q1", "Q2", "Q3", "Q4"],
  data: [120, 190, 300, 250]
});
const adapter = adapterWithZones({
  body: `<p>Kính gửi Ban Giám đốc. Biểu đồ cột native bên dưới phải hiện Q1=120, Q2=190, Q3=300, Q4=250 — không phải ảnh SVG tĩnh.</p>${bar}<p>Biểu đồ tròn (pie) cùng dữ liệu:</p>${pie}`
});
const fodtPath = path.join(outDir, "phase-e4-chart.fodt");
fs.writeFileSync(fodtPath, adapter.serializeToFodt(), "utf8");
const docx = convertWithSoffice(fodtPath, "docx", path.join(outDir, "docx"), {
  appKind: "writer", profileDir: path.join(outDir, "profile")
});
const outDocx = path.join(outDir, "phase-e4-chart.docx");
fs.copyFileSync(docx, outDocx);
console.log(`WORD_DIR=${outDir}`);
console.log(`E4_CHART_DOCX=${outDocx}`);
