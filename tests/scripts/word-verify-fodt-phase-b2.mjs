/**
 * One-shot Word visual check. Writes FODT -> soffice DOCX into a temp dir,
 * then prints the DOCX path for Start-Process. Not part of the unit suite.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { jpeg16x10, gif12x8, webpVp8, toDataUrl } from "../helpers/tiny-images.mjs";

function createAdapter(innerHTML, shapes = []) {
  const body = { innerHTML };
  const adapter = new WriterAdapter({
    innerHTML,
    querySelector(selector) { return selector === ".vno-writer-body" ? body : null; }
  });
  adapter.shapes = shapes;
  return adapter;
}

const outDir = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), "vno-b2-word-"));
fs.mkdirSync(outDir, { recursive: true });

const jpeg = jpeg16x10();
const gif = gif12x8();
const webp = webpVp8();
const imageHtml = [
  "<p>Ảnh JPEG 16×10 (đỏ):</p>",
  `<p><img src="${toDataUrl("image/jpeg", jpeg)}" data-vno-wrap="inline" style="max-width:100%;height:auto;"></p>`,
  "<p>Ảnh GIF 12×8 (xanh):</p>",
  `<p><img src="${toDataUrl("image/gif", gif)}" data-vno-wrap="inline" style="max-width:100%;height:auto;"></p>`,
  "<p>Ảnh WEBP 1×1 (LibreOffice xuất DOCX thành PNG):</p>",
  `<p><img src="${toDataUrl("image/webp", webp)}" data-vno-wrap="inline" style="max-width:100%;height:auto;"></p>`
].join("");
const imageFodt = path.join(outDir, "phase-b2-images.fodt");
fs.writeFileSync(imageFodt, createAdapter(imageHtml).serializeToFodt(), "utf8");
const imageDocx = convertWithSoffice(imageFodt, "docx", path.join(outDir, "images-docx"), {
  appKind: "writer", profileDir: path.join(outDir, "profile-images")
});
fs.copyFileSync(imageDocx, path.join(outDir, "phase-b2-images.docx"));

const shapeFodt = path.join(outDir, "phase-b2-shapes.fodt");
fs.writeFileSync(shapeFodt, createAdapter("<p>Hình khối và hộp văn bản Phase B.2</p>", [
  { id: "shape-rect", type: "rectangle", x: 40, y: 40, w: 140, h: 80, fill: "#2563eb", stroke: "#1d4ed8", strokeWidth: 2 },
  { id: "shape-round", type: "round-rect", x: 200, y: 40, w: 140, h: 80, fill: "#2563eb", stroke: "#1d4ed8", strokeWidth: 2 },
  { id: "shape-circle", type: "circle", x: 360, y: 30, w: 110, h: 110, fill: "#0ea5e9", stroke: "#0284c7", strokeWidth: 2 },
  { id: "shape-line", type: "line", x: 40, y: 160, w: 200, h: 30, fill: "none", stroke: "#0f172a", strokeWidth: 3 },
  { id: "shape-arrow", type: "arrow", x: 260, y: 150, w: 140, h: 70, fill: "#f59e0b", stroke: "#d97706", strokeWidth: 2 },
  { id: "shape-box", type: "textbox", x: 40, y: 220, w: 220, h: 80, fill: "transparent", stroke: "#2563eb", strokeWidth: 2, text: "Hộp văn bản VN Writer" }
]).serializeToFodt(), "utf8");
const shapeDocx = convertWithSoffice(shapeFodt, "docx", path.join(outDir, "shapes-docx"), {
  appKind: "writer", profileDir: path.join(outDir, "profile-shapes")
});
fs.copyFileSync(shapeDocx, path.join(outDir, "phase-b2-shapes.docx"));

console.log(`WORD_DIR=${outDir}`);
console.log(`IMAGE_DOCX=${path.join(outDir, "phase-b2-images.docx")}`);
console.log(`SHAPE_DOCX=${path.join(outDir, "phase-b2-shapes.docx")}`);
