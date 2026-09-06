/**
 * One-shot Word visual check. Writes FODT -> soffice DOCX into a temp dir,
 * then prints the DOCX path for Start-Process. Not part of the unit suite.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

function adapterWithZones({ body = "", header = "", footer = "", pageSetup, sections } = {}) {
  const bodyEl = { innerHTML: body };
  const headerEl = {
    innerHTML: header,
    get innerText() { return String(this.innerHTML).replace(/<[^>]+>/g, " "); }
  };
  const footerEl = {
    innerHTML: footer,
    get innerText() { return String(this.innerHTML).replace(/<[^>]+>/g, " "); }
  };
  const adapter = new WriterAdapter({
    innerHTML: body,
    querySelector(selector) {
      if (selector === ".vno-writer-body") return bodyEl;
      if (selector === ".vno-writer-header") return headerEl;
      if (selector === ".vno-writer-footer") return footerEl;
      return null;
    }
  });
  if (pageSetup) {
    adapter.pageSetup = JSON.parse(JSON.stringify(pageSetup));
    adapter.sectionPageSetups["section-1"] = JSON.parse(JSON.stringify(pageSetup));
  }
  if (sections) {
    adapter.sectionPageSetups = JSON.parse(JSON.stringify(sections));
    adapter._sectionSequence = Math.max(
      ...Object.keys(sections).map(key => Number(String(key).replace(/^section-/, "")) || 1)
    );
  }
  return adapter;
}

const A4 = { size: "a4", orientation: "portrait", margins: { top: 20, bottom: 20, left: 30, right: 15 } };
const DL = { size: "dl", orientation: "portrait", margins: { top: 8, bottom: 8, left: 10, right: 10 } };

const outDir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), "vno-c-word-"));
fs.mkdirSync(outDir, { recursive: true });

const mixedFodt = path.join(outDir, "phase-c-mixed.fodt");
fs.writeFileSync(mixedFodt, adapterWithZones({
  body: '<p>Trang A4 — công văn khổ dọc 210×297 mm, lề Nghị định 30.</p><div class="vno-section-break" data-vno-section-break="nextPage" data-vno-section-id="section-2" contenteditable="false">---</div><p>Trang phong bì DL — 220×110 mm xen giữa tài liệu.</p>',
  header: "<p style='text-align: center; font-size: 10pt; margin: 0;'>Công ty TNHH Sao Việt — Đầu trang</p>",
  footer: "<p style='text-align: center; font-size: 10pt; margin: 0;'>Chân trang VN Writer</p>",
  sections: { "section-1": A4, "section-2": DL }
}).serializeToFodt(), "utf8");
const mixedDocx = convertWithSoffice(mixedFodt, "docx", path.join(outDir, "mixed-docx"), {
  appKind: "writer", profileDir: path.join(outDir, "profile-mixed")
});
const mixedOut = path.join(outDir, "phase-c-mixed.docx");
fs.copyFileSync(mixedDocx, mixedOut);

const a4Fodt = path.join(outDir, "phase-c-a4.fodt");
fs.writeFileSync(a4Fodt, adapterWithZones({
  body: "<p>Một trang A4 dọc với đầu trang và chân trang.</p>",
  header: "<p style='text-align: center; font-size: 10pt; margin: 0;'>Tiêu đề đầu trang</p>",
  footer: "<p style='text-align: center; font-size: 10pt; margin: 0;'>Trang 1 / 1</p>",
  pageSetup: A4
}).serializeToFodt(), "utf8");
const a4Docx = convertWithSoffice(a4Fodt, "docx", path.join(outDir, "a4-docx"), {
  appKind: "writer", profileDir: path.join(outDir, "profile-a4")
});
const a4Out = path.join(outDir, "phase-c-a4.docx");
fs.copyFileSync(a4Docx, a4Out);

console.log(`WORD_DIR=${outDir}`);
console.log(`A4_DOCX=${a4Out}`);
console.log(`MIXED_DOCX=${mixedOut}`);
