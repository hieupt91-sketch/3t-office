/**
 * Phase A acceptance test: VN Writer HTML -> serializeToFodt() -> real FODT file
 * -> LibreOffice DOCX/PDF. The DOCX package and rendered PDF streams are inspected
 * independently; this does not exercise the legacy HTML-import pipeline.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer FODT Phase A live test");

function createAdapter(innerHTML) {
  const body = { innerHTML };
  return new WriterAdapter({
    innerHTML,
    querySelector(selector) { return selector === ".vno-writer-body" ? body : null; }
  });
}

function xmlText(xml) {
  return String(xml || "").replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function inflatedPdfStreams(pdfPath) {
  const buffer = fs.readFileSync(pdfPath);
  const marker = Buffer.from("stream");
  const endMarker = Buffer.from("endstream");
  const streams = [];
  let cursor = 0;
  while ((cursor = buffer.indexOf(marker, cursor)) >= 0) {
    let start = cursor + marker.length;
    if (buffer[start] === 13 && buffer[start + 1] === 10) start += 2;
    else if (buffer[start] === 10) start += 1;
    const end = buffer.indexOf(endMarker, start);
    if (end < 0) break;
    const raw = buffer.subarray(start, end).subarray(0, Math.max(0, end - start - (buffer[end - 1] === 10 ? 1 : 0)));
    try { streams.push(zlib.inflateSync(raw).toString("latin1")); } catch { /* non-Flate stream */ }
    cursor = end + endMarker.length;
  }
  return streams.join("\n");
}

const html = [
  "<h2>BAO_CAO_FODT</h2>",
  '<p style="text-align:center">CAN_GIUA <strong>DAM</strong> <em>NGHIENG</em> <u>GACH_CHAN</u> <span style="color:#123456;background-color:#ffeeaa;font-family:Liberation Serif;font-size:14pt">DINH_DANG_MAU</span></p>',
  "<ul><li>BULLET_MOT</li><li>BULLET_HAI</li></ul>",
  "<ol><li>SO_MOT</li><li>SO_HAI</li></ol>"
].join("");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-fodt-phase-a-"));
try {
  const source = path.join(tempRoot, "writer-phase-a.fodt");
  const fodt = createAdapter(html).serializeToFodt();
  fs.writeFileSync(source, fodt, "utf8");
  assert.equal(fs.readFileSync(source, "utf8"), fodt, "The real .fodt file must contain serializer output exactly");

  const docx = convertWithSoffice(source, "docx", path.join(tempRoot, "docx"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-docx")
  });
  const pdf = convertWithSoffice(source, "pdf", path.join(tempRoot, "pdf"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-pdf")
  });

  const entries = listZipEntries(docx).map(entry => entry.name);
  const documentXml = readZipEntry(docx, "word/document.xml")?.toString("utf8") || "";
  const stylesXml = readZipEntry(docx, "word/styles.xml")?.toString("utf8") || "";
  const text = xmlText(documentXml);
  for (const expected of ["BAO_CAO_FODT", "CAN_GIUA", "DAM", "NGHIENG", "GACH_CHAN", "DINH_DANG_MAU", "BULLET_MOT", "BULLET_HAI", "SO_MOT", "SO_HAI"]) {
    assert.match(text, new RegExp(expected), `Real DOCX must contain ${expected}`);
  }
  assert.match(documentXml, /<w:jc\b[^>]*w:val="center"/, "Centered paragraph must remain native DOCX alignment");
  assert.match(documentXml, /<w:b\b/, "Bold must remain a native DOCX run property");
  assert.match(documentXml, /<w:i\b/, "Italic must remain a native DOCX run property");
  assert.match(documentXml, /<w:u\b[^>]*w:val="single"/, "Underline must remain a native DOCX run property");
  assert.match(documentXml, /<w:color\b[^>]*w:val="123456"/, "Text color must remain a native DOCX run property");
  assert.match(documentXml, /<w:shd\b[^>]*(?:w:fill="FFEEAA"|w:color="FFEEAA")/, "Highlight/background must remain a native DOCX run property");
  assert.match(documentXml, /<w:rFonts\b[^>]*(?:Liberation Serif|LiberationSerif)/, "Font family must remain a native DOCX run property");
  assert.match(documentXml, /<w:sz\b[^>]*w:val="28"/, "14pt must remain a native DOCX run size");
  assert.ok(entries.includes("word/numbering.xml"), "Real DOCX must contain native list numbering definitions");
  assert.match(documentXml, /<w:numPr\b/, "Bullet/number items must use native DOCX numbering");
  assert.match(`${documentXml}${stylesXml}`, /Heading 2|Heading2|heading 2/i, "Heading must remain a native DOCX heading style");

  const pdfBuffer = fs.readFileSync(pdf);
  assert.equal(pdfBuffer.subarray(0, 5).toString("ascii"), "%PDF-", "LibreOffice must create a real PDF");
  assert.match(pdfBuffer.toString("latin1"), /\/Type\s*\/Page\b/, "PDF must contain at least one rendered page");
  const streams = inflatedPdfStreams(pdf);
  assert.match(streams, /\bBT\b[\s\S]*\b(?:Tj|TJ)\b/, "PDF page must contain rendered text operators");
  assert.match(streams, /0\.0705\d*\s+0\.2039\d*\s+0\.3372\d*\s+rg\b/, "PDF must render the #123456 foreground color");
  assert.match(streams, /1(?:\.0+)?\s+0\.9333\d*\s+0\.6666\d*\s+rg\b/, "PDF must render the #ffeeaa highlight color");

  const parsedAdapter = createAdapter("");
  parsedAdapter.parseFodt(fodt);
  assert.equal(parsedAdapter.serializeToFodt(), fodt, "VN FODT serialize/parse/serialize must be exactly idempotent");

  console.log("PASS: Writer Phase A FODT -> real DOCX/PDF preserved text, heading, lists, alignment and basic character formatting.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
