/**
 * Phase E.3 WordArt acceptance: FODT Fontwork -> real soffice DOCX.
 * Assertions follow measured engine behavior in
 * docs/HANDOFF-WRITER-FODT-PHASE-E3-FINDINGS.md.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { buildWriterWordArtHtml } from "../../apps/writer/insert-dialogs.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer FODT Phase E.3 WordArt live test");

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

function count(xml, pattern) {
  return (String(xml || "").match(pattern) || []).length;
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-fodt-phase-e3-wa-"));
const wordArt = buildWriterWordArtHtml("KHAI_GIANG", { presetId: "navy-outline" });
const { adapter } = adapterWithZones({
  body: `<p>Truoc ${wordArt} sau.</p>`
});
const fodt = adapter.serializeToFodt();
assert.match(fodt, /draw:name="WordArt-navy-outline"/);
assert.match(fodt, /draw:type="fontwork-fade-right"/);
assert.match(fodt, /text:anchor-type="as-char"/);
assert.match(fodt, /draw:fill-color="#1e3a8a"/);
assert.match(fodt, /draw:stroke="none"/);

const fodtPath = path.join(tempRoot, "phase-e3-wordart.fodt");
fs.writeFileSync(fodtPath, fodt, "utf8");
const docx = convertWithSoffice(fodtPath, "docx", path.join(tempRoot, "docx"), {
  appKind: "writer", profileDir: path.join(tempRoot, "profile-docx")
});
const entries = listZipEntries(docx).map(entry => entry.name);
const documentXml = (readZipEntry(docx, "word/document.xml") || Buffer.alloc(0)).toString("utf8");
assert.ok(count(documentXml, /<w:drawing\b/g) >= 1, "expected DrawingML w:drawing WordArt");
assert.match(documentXml, /prstTxWarp prst="textFadeRight"/);
assert.ok(count(documentXml, /<v:textpath\b/g) >= 1, "expected VML v:textpath fallback");
assert.match(documentXml, /string="KHAI_GIANG"/);
assert.match(documentXml, /fillcolor="#1e3a8a"/);
assert.match(documentXml, /<w:t>KHAI_GIANG<\/w:t>/);
assert.match(documentXml, /w:ascii="Impact"/);
assert.match(documentXml, /w:val="1E3A8A"/);

const pdf = convertWithSoffice(fodtPath, "pdf", path.join(tempRoot, "pdf"), {
  appKind: "writer", profileDir: path.join(tempRoot, "profile-pdf")
});
const pdfBytes = fs.readFileSync(pdf);
assert.ok(pdfBytes.slice(0, 5).toString("latin1") === "%PDF-", "expected PDF header");

const parsed = adapterWithZones({ body: "<p>xóa</p>" });
parsed.adapter.parseFodt(fodt);
assert.match(parsed.body.innerHTML, /data-vno-wordart-preset="navy-outline"/);
assert.match(parsed.body.innerHTML, /KHAI_GIANG/);
assert.equal(parsed.adapter.shapes.length, 0);
assert.equal(parsed.adapter.serializeToFodt(), fodt);

console.log(`E3_WORDART_LIVE_PASS docx=${docx}`);
console.log(`E3_WORDART_LIVE_PASS entries=${entries.filter(name => name.startsWith("word/")).join(",")}`);
