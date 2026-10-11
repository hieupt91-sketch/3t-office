/**
 * Tiny raster fixtures for Writer FODT Phase B.2.
 * JPEG/GIF/BMP/WEBP files are the exact bytes measured in the soffice probe
 * (see docs/HANDOFF-WRITER-FODT-PHASE-B2-FINDINGS.md). Dimension-only
 * headers (SOF2, VP8X canvas mismatch) are built here without a library.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "writer-fodt-phase-b2");

function readFixture(name) {
  return fs.readFileSync(path.join(dir, name));
}

export function jpeg16x10() {
  return readFixture("probe-16x10.jpg");
}

export function gif12x8() {
  return readFixture("probe-12x8.gif");
}

export function bmp8x6() {
  return readFixture("probe-8x6.bmp");
}

export function webpVp8() {
  return readFixture("probe-vp8.webp");
}

export function webpVp8l() {
  return readFixture("probe-vp8l.webp");
}

export function webpVp8x() {
  return readFixture("probe-vp8x.webp");
}

export function tiffHeader() {
  return Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]);
}

/** SOF2 (progressive) header only — enough for the dimension reader. */
export function jpegSof2Header(width, height) {
  return Buffer.from([
    0xff, 0xd8,
    0xff, 0xc2,
    0x00, 0x0b,
    0x08,
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x01,
    0x01, 0x11, 0x00
  ]);
}

/** VP8X canvas WxH wrapping the measured 1×1 VP8 — reader must use VP8X, not inner VP8. */
export function webpVp8xCanvas(width, height) {
  const vp8 = Buffer.from([
    0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00,
    0x02, 0x00, 0x34, 0x25, 0xa4, 0x00, 0x03, 0x70, 0x00, 0xfe, 0xfb, 0x94, 0x00, 0x00
  ]);
  const vp8x = Buffer.alloc(10);
  vp8x.writeUIntLE(width - 1, 4, 3);
  vp8x.writeUIntLE(height - 1, 7, 3);
  const chunks = Buffer.concat([
    Buffer.from("VP8X"),
    (() => { const size = Buffer.alloc(4); size.writeUInt32LE(vp8x.length); return size; })(),
    vp8x,
    Buffer.from("VP8 "),
    (() => { const size = Buffer.alloc(4); size.writeUInt32LE(vp8.length); return size; })(),
    vp8
  ]);
  const out = Buffer.alloc(12 + chunks.length);
  out.write("RIFF", 0);
  out.writeUInt32LE(4 + chunks.length, 4);
  out.write("WEBP", 8);
  chunks.copy(out, 12);
  return out;
}

export function toDataUrl(mime, buffer) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}
