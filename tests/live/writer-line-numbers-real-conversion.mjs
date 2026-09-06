/**
 * Line numbers: VN FODT -> real soffice DOCX.
 * Asserts unzipped word/document.xml w:lnNumType attributes (not guessed).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer line-numbers live test");

function createAdapter(innerHTML) {
  const body = { innerHTML };
  return new WriterAdapter({
    innerHTML,
    querySelector(selector) { return selector === ".vno-writer-body" ? body : null; }
  });
}

function extractLnNumTypes(documentXml) {
  const hits = [];
  const re = /<w:lnNumType\b[^/]*\/>/g;
  let match;
  while ((match = re.exec(documentXml))) {
    const xml = match[0];
    hits.push({
      xml,
      countBy: xml.match(/w:countBy="([^"]+)"/)?.[1] ?? null,
      restart: xml.match(/w:restart="([^"]+)"/)?.[1] ?? null,
      distance: xml.match(/w:distance="([^"]+)"/)?.[1] ?? null
    });
  }
  return hits;
}

function convertDocument(adapter, tempRoot, name) {
  const fodt = adapter.serializeToFodt();
  const parsed = createAdapter("<p>drop</p>");
  parsed.parseFodt(fodt);
  assert.equal(parsed.serializeToFodt(), fodt, `${name}: serialize → parse → serialize must be byte-identical`);
  const source = path.join(tempRoot, `${name}.fodt`);
  fs.writeFileSync(source, fodt, "utf8");
  const docx = convertWithSoffice(source, "docx", path.join(tempRoot, `${name}-docx`), {
    appKind: "writer",
    profileDir: path.join(tempRoot, `${name}-profile`)
  });
  const entries = listZipEntries(docx).map((entry) => entry.name);
  assert.ok(entries.includes("word/document.xml"));
  const documentXml = readZipEntry(docx, "word/document.xml").toString("utf8");
  fs.writeFileSync(path.join(tempRoot, `${name}-document.xml`), documentXml, "utf8");
  return { fodt, documentXml, ln: extractLnNumTypes(documentXml) };
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-line-numbers-"));
try {
  const off = createAdapter("<p>LINE_OFF</p>");
  const offResult = convertDocument(off, tempRoot, "off");
  assert.doesNotMatch(offResult.fodt, /text:linenumbering-configuration/);
  assert.equal(offResult.ln.length, 0, "tắt → không có w:lnNumType");

  const continuous = createAdapter("<p>LINE_CONTINUOUS</p>");
  continuous.lineNumbers = { enabled: true, countBy: 1, restart: "continuous" };
  const contResult = convertDocument(continuous, tempRoot, "continuous");
  assert.match(contResult.fodt, /text:increment="1"/);
  assert.equal(contResult.ln.length, 1);
  assert.equal(contResult.ln[0].countBy, "1");
  assert.equal(contResult.ln[0].restart, "continuous");
  assert.equal(contResult.ln[0].distance, "65535");

  const page = createAdapter("<p>LINE_PAGE</p>");
  page.lineNumbers = { enabled: true, countBy: 1, restart: "page" };
  const pageResult = convertDocument(page, tempRoot, "page");
  assert.match(pageResult.fodt, /text:restart-on-page="true"/);
  assert.equal(pageResult.ln.length, 1);
  assert.equal(pageResult.ln[0].countBy, "1");
  assert.equal(pageResult.ln[0].restart, "newPage");

  const section = createAdapter("<p>LINE_SECTION</p>");
  section.lineNumbers = { enabled: true, countBy: 1, restart: "section" };
  const sectionResult = convertDocument(section, tempRoot, "section");
  assert.match(sectionResult.fodt, /vnd.vn-office.line-numbers-restart">section</);
  assert.equal(sectionResult.ln.length, 1);
  assert.equal(sectionResult.ln[0].restart, "continuous", "soffice không xuất newSection — ODF không có mode này");

  console.log("PASS writer-line-numbers-real-conversion");
  console.log(`  off lnNumType count=${offResult.ln.length}`);
  console.log(`  continuous ${contResult.ln[0].xml}`);
  console.log(`  page ${pageResult.ln[0].xml}`);
  console.log(`  section ${sectionResult.ln[0].xml}`);
} finally {
  // Keep temp XML for inspection if needed; OS cleans %TEMP%.
}
