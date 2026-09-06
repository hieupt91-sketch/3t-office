/**
 * Phase B.2 acceptance: JPEG/GIF/WEBP + Text Box/shape FODT -> real soffice
 * DOCX/PDF. Assertions follow measured engine behavior (FINDINGS.md):
 * JPEG/GIF media is byte-exact; WEBP is re-encoded to PNG; drawings inside
 * text:p become native w:drawing / prstGeom.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";
import { jpeg16x10, gif12x8, webpVp8, webpVp8l, webpVp8x, toDataUrl } from "../helpers/tiny-images.mjs";

assert.ok(findSoffice(), "LibreOffice soffice is required for Writer FODT Phase B.2 live test");

function createAdapter(innerHTML, shapes = []) {
  const body = { innerHTML };
  const adapter = new WriterAdapter({
    innerHTML,
    querySelector(selector) { return selector === ".vno-writer-body" ? body : null; }
  });
  adapter.shapes = shapes;
  return adapter;
}

function xmlText(xml) {
  return String(xml || "").replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function mediaEquals(docx, original) {
  const entries = listZipEntries(docx).map(entry => entry.name).filter(name => name.startsWith("word/media/"));
  const hits = entries.map(name => {
    const bytes = readZipEntry(docx, name);
    return { name, equals: !!(bytes && bytes.equals(original)), size: bytes?.length ?? 0 };
  });
  return { entries, hits, matched: hits.some(hit => hit.equals) };
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-fodt-phase-b2-"));
try {
  const jpeg = jpeg16x10();
  const gif = gif12x8();
  const jpegGifHtml = [
    `<p>JPEG_NEO: <img src="${toDataUrl("image/jpeg", jpeg)}" data-vno-wrap="inline" style="max-width:100%;height:auto;"></p>`,
    `<p>GIF_NEO: <img src="${toDataUrl("image/gif", gif)}" data-vno-wrap="inline" style="max-width:100%;height:auto;"></p>`
  ].join("");
  const jpegGifFodt = createAdapter(jpegGifHtml).serializeToFodt();
  const jpegGifPath = path.join(tempRoot, "jpeg-gif.fodt");
  fs.writeFileSync(jpegGifPath, jpegGifFodt, "utf8");

  const jpegGifDocx = convertWithSoffice(jpegGifPath, "docx", path.join(tempRoot, "jpeg-gif-docx"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-jpeg-gif-docx")
  });
  const jpegGifPdf = convertWithSoffice(jpegGifPath, "pdf", path.join(tempRoot, "jpeg-gif-pdf"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-jpeg-gif-pdf")
  });
  const jpegGifXml = readZipEntry(jpegGifDocx, "word/document.xml")?.toString("utf8") || "";
  assert.match(jpegGifXml, /<w:drawing>/, "JPEG/GIF must become native w:drawing");
  assert.match(xmlText(jpegGifXml), /JPEG_NEO/);
  assert.match(xmlText(jpegGifXml), /GIF_NEO/);
  const jpegMedia = mediaEquals(jpegGifDocx, jpeg);
  const gifMedia = mediaEquals(jpegGifDocx, gif);
  assert.ok(jpegMedia.matched, `JPEG bytes must be preserved in DOCX media, got ${JSON.stringify(jpegMedia.hits)}`);
  assert.ok(gifMedia.matched, `GIF bytes must be preserved in DOCX media, got ${JSON.stringify(gifMedia.hits)}`);
  assert.ok(jpegMedia.entries.some(name => /\.jpe?g$/i.test(name)), "JPEG media name must keep jpeg/jpg extension");
  assert.ok(gifMedia.entries.some(name => /\.gif$/i.test(name)), "GIF media name must keep gif extension");
  assert.equal(fs.readFileSync(jpegGifPdf).subarray(0, 5).toString("latin1"), "%PDF-");
  const jpegGifParsed = createAdapter("");
  jpegGifParsed.parseFodt(jpegGifFodt);
  assert.equal(jpegGifParsed.serializeToFodt(), jpegGifFodt, "JPEG+GIF VN round-trip must be exactly idempotent");

  for (const [label, bytes] of [["vp8", webpVp8()], ["vp8l", webpVp8l()], ["vp8x", webpVp8x()]]) {
    const html = `<p>WEBP_${label.toUpperCase()}: <img src="${toDataUrl("image/webp", bytes)}" data-vno-wrap="inline" style="max-width:100%;height:auto;"></p>`;
    const fodt = createAdapter(html).serializeToFodt();
    assert.match(fodt, /draw:mime-type="image\/webp"/);
    const source = path.join(tempRoot, `webp-${label}.fodt`);
    fs.writeFileSync(source, fodt, "utf8");
    const docx = convertWithSoffice(source, "docx", path.join(tempRoot, `webp-${label}-docx`), {
      appKind: "writer", profileDir: path.join(tempRoot, `profile-webp-${label}-docx`)
    });
    const pdf = convertWithSoffice(source, "pdf", path.join(tempRoot, `webp-${label}-pdf`), {
      appKind: "writer", profileDir: path.join(tempRoot, `profile-webp-${label}-pdf`)
    });
    const documentXml = readZipEntry(docx, "word/document.xml")?.toString("utf8") || "";
    const media = listZipEntries(docx).map(entry => entry.name).filter(name => name.startsWith("word/media/"));
    const mediaBytes = media.map(name => readZipEntry(docx, name));
    assert.match(documentXml, /<w:drawing>/, `WEBP ${label} must still become a native drawing after soffice`);
    assert.ok(media.length >= 1, `WEBP ${label} DOCX must embed media`);
    assert.ok(media.every(name => /\.png$/i.test(name)), `WEBP ${label} is re-encoded to PNG by LibreOffice 26.2.5 (measured), got ${media.join(",")}`);
    assert.ok(mediaBytes.every(buf => !buf.equals(bytes)), `WEBP ${label} must NOT be byte-exact in DOCX — engine rasterizes to PNG`);
    assert.equal(fs.readFileSync(pdf).subarray(0, 5).toString("latin1"), "%PDF-");
    const parsed = createAdapter("");
    parsed.parseFodt(fodt);
    assert.equal(parsed.serializeToFodt(), fodt, `WEBP ${label} VN FODT round-trip must stay image/webp`);
  }

  const shapeAdapter = createAdapter("<p>HINH_VA_HOP</p>", [
    { id: "shape-rect", type: "rectangle", x: 100, y: 40, w: 140, h: 80, fill: "#2563eb", stroke: "#1d4ed8", strokeWidth: 2 },
    { id: "shape-round", type: "round-rect", x: 260, y: 40, w: 140, h: 80, fill: "#2563eb", stroke: "#1d4ed8", strokeWidth: 2 },
    { id: "shape-circle", type: "circle", x: 100, y: 140, w: 110, h: 110, fill: "#0ea5e9", stroke: "#0284c7", strokeWidth: 2 },
    { id: "shape-line", type: "line", x: 40, y: 270, w: 160, h: 30, fill: "none", stroke: "#0f172a", strokeWidth: 3 },
    { id: "shape-arrow", type: "arrow", x: 220, y: 160, w: 140, h: 70, fill: "#f59e0b", stroke: "#d97706", strokeWidth: 2 },
    { id: "shape-box", type: "textbox", x: 72, y: 300, w: 220, h: 80, fill: "transparent", stroke: "#2563eb", strokeWidth: 2, text: "HOP_VAN_BAN" }
  ]);
  const shapeFodt = shapeAdapter.serializeToFodt();
  const shapePath = path.join(tempRoot, "shapes.fodt");
  fs.writeFileSync(shapePath, shapeFodt, "utf8");
  const shapeDocx = convertWithSoffice(shapePath, "docx", path.join(tempRoot, "shapes-docx"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-shapes-docx")
  });
  const shapePdf = convertWithSoffice(shapePath, "pdf", path.join(tempRoot, "shapes-pdf"), {
    appKind: "writer", profileDir: path.join(tempRoot, "profile-shapes-pdf")
  });
  const shapeXml = readZipEntry(shapeDocx, "word/document.xml")?.toString("utf8") || "";
  const prst = [...shapeXml.matchAll(/prst="([^"]+)"/g)].map(match => match[1]);
  assert.ok((shapeXml.match(/<w:drawing>/g) || []).length >= 6, `DOCX must contain native drawings for all 6 UI shapes, xml drawings=${(shapeXml.match(/<w:drawing>/g) || []).length}`);
  for (const geom of ["rect", "roundRect", "ellipse", "line", "rightArrow"]) {
    assert.ok(prst.includes(geom), `DOCX prstGeom must include ${geom}, got ${prst.join(",")}`);
  }
  assert.match(shapeXml, /<w:txbxContent\b|<wps:txbx\b|<v:textbox\b/, "Text Box must become a native Word text box");
  assert.match(xmlText(shapeXml), /HOP_VAN_BAN/);
  assert.match(xmlText(shapeXml), /HINH_VA_HOP/);
  assert.equal(fs.readFileSync(shapePdf).subarray(0, 5).toString("latin1"), "%PDF-");
  const shapeParsed = createAdapter("");
  shapeParsed.parseFodt(shapeFodt);
  assert.equal(shapeParsed.serializeToFodt(), shapeFodt, "Shape/Text Box VN round-trip must be exactly idempotent");
  assert.equal(shapeParsed.shapes.length, 6);

  console.log("PASS: Writer Phase B.2 FODT -> real DOCX preserved JPEG/GIF byte-exact media, WEBP re-encoded to PNG (measured), and native shapes/text box (prstGeom + txbx).");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
