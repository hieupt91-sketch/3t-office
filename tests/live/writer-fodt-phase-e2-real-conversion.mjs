/**
 * Phase E.2 acceptance: watermark FODT -> real soffice DOCX.
 * Assertions follow measured engine behavior in
 * docs/HANDOFF-WRITER-FODT-PHASE-E2-FINDINGS.md.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer FODT Phase E.2 live test");

function adapterWithZones({ body = "", header = "", watermark = null } = {}) {
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
  if (watermark) adapter.watermark = JSON.parse(JSON.stringify(watermark));
  return { adapter, body: bodyEl, header: headerEl };
}

function count(xml, pattern) {
  return (String(xml || "").match(pattern) || []).length;
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-fodt-phase-e2-"));
const { adapter, body, header } = adapterWithZones({
  body: "<p>BODY_BEHIND_WATERMARK Van ban nam truoc hinh mo DỰ THẢO.</p>",
  header: "<p>HEADER_USER_TEXT Cong ty TNHH Sao Viet</p>",
  watermark: { text: "DỰ THẢO", color: "#dc2626", opacity: 0.2, angle: 45, fontSize: 72 }
});
const fodt = adapter.serializeToFodt();
assert.match(fodt, /draw:name="Watermark"/);
assert.match(fodt, /draw:transform="rotate \(0\.785398163397448\)"/);
assert.match(fodt, /HEADER_USER_TEXT Cong ty TNHH Sao Viet/);
assert.doesNotMatch(fodt, /<style:background-image\b/);

const fodtPath = path.join(tempRoot, "phase-e2-watermark.fodt");
fs.writeFileSync(fodtPath, fodt, "utf8");
const docx = convertWithSoffice(fodtPath, "docx", path.join(tempRoot, "docx"), {
  appKind: "writer", profileDir: path.join(tempRoot, "profile-docx")
});
const entries = listZipEntries(docx).map(entry => entry.name);
assert.ok(entries.includes("word/header1.xml"), `missing header part: ${entries.join(", ")}`);
const documentXml = (readZipEntry(docx, "word/document.xml") || Buffer.alloc(0)).toString("utf8");
const headerXml = (readZipEntry(docx, "word/header1.xml") || Buffer.alloc(0)).toString("utf8");
assert.match(documentXml, /<w:headerReference\b/);
assert.doesNotMatch(documentXml, /<w:background\b/);
assert.equal(count(headerXml, /<mc:AlternateContent\b/g), 1);
assert.ok(count(headerXml, /<w:pict\b/g) >= 1, "expected VML w:pict fallback in header");
assert.ok(count(headerXml, /<v:shape\b/g) >= 1, "expected v:shape in header");
assert.match(headerXml, /behindDoc="1"/);
assert.match(headerXml, /rotation:315/);
assert.match(headerXml, /DỰ THẢO/);
assert.match(headerXml, /HEADER_USER_TEXT Cong ty TNHH Sao Viet/);
assert.doesNotMatch(headerXml, /PowerPlusWaterMark/);

const parsed = adapterWithZones({ body: "<p>xóa</p>", header: "<p>xóa</p>" });
parsed.adapter.parseFodt(fodt);
assert.equal(parsed.body.innerHTML, "<p>BODY_BEHIND_WATERMARK Van ban nam truoc hinh mo DỰ THẢO.</p>");
assert.match(parsed.header.innerHTML, /HEADER_USER_TEXT Cong ty TNHH Sao Viet/);
assert.doesNotMatch(parsed.header.innerHTML, /DỰ THẢO/);
assert.deepEqual(parsed.adapter.watermark, {
  text: "DỰ THẢO",
  color: "#dc2626",
  opacity: 0.2,
  angle: 45,
  fontSize: 72
});
assert.equal(parsed.adapter.serializeToFodt(), fodt);

const roundDocx = convertWithSoffice(
  (() => {
    const roundPath = path.join(tempRoot, "phase-e2-round.fodt");
    fs.writeFileSync(roundPath, parsed.adapter.serializeToFodt(), "utf8");
    return roundPath;
  })(),
  "docx",
  path.join(tempRoot, "docx-round"),
  { appKind: "writer", profileDir: path.join(tempRoot, "profile-round") }
);
const roundHeader = (readZipEntry(roundDocx, "word/header1.xml") || Buffer.alloc(0)).toString("utf8");
assert.match(roundHeader, /behindDoc="1"/);
assert.match(roundHeader, /rotation:315/);
assert.match(roundHeader, /DỰ THẢO/);

console.log(`E2_LIVE_PASS docx=${docx}`);
console.log(`E2_LIVE_PASS header_bytes=${headerXml.length} entries=${entries.filter(name => name.startsWith("word/")).join(",")}`);
void body;
void header;
