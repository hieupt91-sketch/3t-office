/**
 * Phase B acceptance test: VN Writer HTML (table + image) -> serializeToFodt()
 * -> real FODT file -> LibreOffice DOCX/PDF. The DOCX package is inspected
 * independently (real word/document.xml, real word/media bytes), not assumed.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer FODT Phase B live test");

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

function crc32(buffer) {
  let crc = ~0;
  for (let index = 0; index < buffer.length; index++) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (~crc) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, crc]);
}

function makeTestPng(width, height, rgb) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(2, 9);
  const rows = [];
  for (let y = 0; y < height; y++) {
    rows.push(Buffer.from([0]));
    for (let x = 0; x < width; x++) rows.push(Buffer.from(rgb));
  }
  const idatData = zlib.deflateSync(Buffer.concat(rows));
  return Buffer.concat([signature, pngChunk("IHDR", ihdrData), pngChunk("IDAT", idatData), pngChunk("IEND", Buffer.alloc(0))]);
}

const pngBuffer = makeTestPng(20, 12, [200, 30, 30]);
const pngBase64 = pngBuffer.toString("base64");

const html = [
  "<p>MO_DAU_TAI_LIEU</p>",
  '<table><tbody>',
  '<tr><td style="border:1px solid #94a3b8; background-color:#fef3c7"><strong>TIEU_DE_BANG</strong></td><td style="border:1px solid #94a3b8; background-color:#fef3c7">CỘT_HAI</td></tr>',
  '<tr><td>O_MOT_MOT</td><td style="text-align:right">O_MOT_HAI</td></tr>',
  "</tbody></table>",
  `<p>ANH_NHUNG: <img src="data:image/png;base64,${pngBase64}" data-vno-wrap="inline" style="max-width:100%;height:auto;"></p>`
].join("");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-fodt-phase-b-"));
try {
  const source = path.join(tempRoot, "writer-phase-b.fodt");
  const fodt = createAdapter(html).serializeToFodt();
  fs.writeFileSync(source, fodt, "utf8");

  const docx = convertWithSoffice(source, "docx", path.join(tempRoot, "docx"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-docx")
  });

  const entries = listZipEntries(docx).map(entry => entry.name);
  const documentXml = readZipEntry(docx, "word/document.xml")?.toString("utf8") || "";
  const text = xmlText(documentXml);

  // Table: must be a real native OOXML table, not a flattened image/paragraph.
  assert.match(documentXml, /<w:tbl\b/, "Real DOCX must contain a native w:tbl for the table");
  const cellCount = (documentXml.match(/<w:tc\b/g) || []).length;
  assert.ok(cellCount >= 4, `Real DOCX table must have at least 4 native w:tc cells, got ${cellCount}`);
  for (const expected of ["MO_DAU_TAI_LIEU", "TIEU_DE_BANG", "CỘT_HAI", "O_MOT_MOT", "O_MOT_HAI", "ANH_NHUNG"]) {
    assert.match(text, new RegExp(expected), `Real DOCX must contain ${expected}`);
  }
  assert.match(documentXml, /<w:shd\b[^>]*(?:w:fill="FEF3C7"|w:color="FEF3C7")/i, "Table cell shading must remain native DOCX cell shading");
  assert.match(documentXml, /<w:jc\b[^>]*w:val="right"/, "Right-aligned cell content must remain native DOCX alignment");

  // Image: must be a real embedded picture, with the exact original PNG bytes.
  const mediaEntries = entries.filter(name => name.startsWith("word/media/"));
  assert.ok(mediaEntries.length >= 1, "Real DOCX must contain at least one embedded media file");
  const mediaBytes = mediaEntries.map(name => readZipEntry(docx, name));
  const matchesOriginal = mediaBytes.some(bytes => bytes && bytes.equals(pngBuffer));
  assert.ok(matchesOriginal, "Embedded image bytes in the real DOCX must exactly match the original PNG bytes (no re-encoding/corruption)");
  assert.match(documentXml, /<w:drawing>/, "Image must be a real native DOCX drawing, not flattened text");

  const parsedAdapter = createAdapter("");
  parsedAdapter.parseFodt(fodt);
  assert.equal(parsedAdapter.serializeToFodt(), fodt, "VN FODT serialize/parse/serialize must be exactly idempotent for table+image");

  console.log("PASS: Writer Phase B FODT -> real DOCX preserved native table (w:tbl/w:tc/shading/alignment) and embedded image (byte-exact word/media, native w:drawing).");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
