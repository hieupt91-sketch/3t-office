/**
 * Phase B.2 measurement probe — run BEFORE serializer code.
 * Generates real JPEG/GIF (GDI+) and WEBP (VP8 / VP8L / VP8X) bytes,
 * wraps them in hand-written ODF 1.3 FODT, converts through real soffice,
 * and records DOCX media bytes + LibreOffice-canonical FODT drawing XML.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) throw new Error("soffice not found");

const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodt-b2-probe-"));
const findings = [];
function log(line) {
  findings.push(line);
  console.log(line);
}

log(`PROBE_ROOT=${outRoot}`);
log(`SOFFICE=${soffice}`);

function gdiImage(width, height, format, destPath, r = 200, g = 30, b = 30) {
  const ps = `
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap ${width}, ${height}
for ($y = 0; $y -lt ${height}; $y++) {
  for ($x = 0; $x -lt ${width}; $x++) {
    $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(${r}, ${g}, ${b}))
  }
}
$fmt = [System.Drawing.Imaging.ImageFormat]::${format}
$bmp.Save(${JSON.stringify(destPath)}, $fmt)
$bmp.Dispose()
`;
  const script = path.join(outRoot, `gdi-${format.toLowerCase()}.ps1`);
  fs.writeFileSync(script, ps, "utf8");
  const result = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], {
    encoding: "utf8",
    timeout: 30000
  });
  if (result.status !== 0 || !fs.existsSync(destPath)) {
    throw new Error(`GDI+ ${format} failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return fs.readFileSync(destPath);
}

function jpegSof(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return { error: "not JPEG SOI" };
  let i = 2;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) { i++; continue; }
    while (i < bytes.length && bytes[i] === 0xff) i++;
    if (i >= bytes.length) break;
    const marker = bytes[i++];
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (i + 1 >= bytes.length) break;
    const seglen = (bytes[i] << 8) | bytes[i + 1];
    if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
      return {
        marker: `0xFF${marker.toString(16).toUpperCase()}`,
        sof: marker === 0xc0 ? "SOF0" : marker === 0xc2 ? "SOF2" : `SOF_0x${marker.toString(16)}`,
        precision: bytes[i + 2],
        height: (bytes[i + 3] << 8) | bytes[i + 4],
        width: (bytes[i + 5] << 8) | bytes[i + 6]
      };
    }
    i += seglen;
  }
  return { error: "no SOF marker" };
}

function gifLogicalScreen(bytes) {
  const header = bytes.subarray(0, 6).toString("ascii");
  return {
    header,
    width: bytes[6] | (bytes[7] << 8),
    height: bytes[8] | (bytes[9] << 8)
  };
}

function u16le(buf, offset) { return buf[offset] | (buf[offset + 1] << 8); }
function u24le(buf, offset) { return buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16); }
function u32le(buf, offset) { return (buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)) >>> 0; }

function webpInfo(bytes) {
  const info = {
    riff: bytes.subarray(0, 4).toString("ascii"),
    webp: bytes.subarray(8, 12).toString("ascii"),
    chunks: [],
    variant: null,
    width: null,
    height: null
  };
  if (info.riff !== "RIFF" || info.webp !== "WEBP") return { ...info, error: "not RIFF/WEBP" };
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const fourcc = bytes.subarray(offset, offset + 4).toString("ascii");
    const size = u32le(bytes, offset + 4);
    const payload = offset + 8;
    const chunk = { fourcc, size };
    if (fourcc === "VP8 " && payload + 10 <= bytes.length && bytes[payload + 3] === 0x9d && bytes[payload + 4] === 0x01 && bytes[payload + 5] === 0x2a) {
      chunk.width = u16le(bytes, payload + 6) & 0x3fff;
      chunk.height = u16le(bytes, payload + 8) & 0x3fff;
      if (!info.variant) {
        info.variant = "VP8";
        info.width = chunk.width;
        info.height = chunk.height;
      }
    } else if (fourcc === "VP8L" && payload + 5 <= bytes.length && bytes[payload] === 0x2f) {
      const b0 = bytes[payload + 1];
      const b1 = bytes[payload + 2];
      const b2 = bytes[payload + 3];
      const b3 = bytes[payload + 4];
      chunk.width = (b0 | ((b1 & 0x3f) << 8)) + 1;
      chunk.height = ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10)) + 1;
      if (!info.variant) {
        info.variant = "VP8L";
        info.width = chunk.width;
        info.height = chunk.height;
      }
    } else if (fourcc === "VP8X" && payload + 10 <= bytes.length) {
      chunk.flags = bytes[payload];
      chunk.width = u24le(bytes, payload + 4) + 1;
      chunk.height = u24le(bytes, payload + 7) + 1;
      info.variant = "VP8X";
      info.width = chunk.width;
      info.height = chunk.height;
    }
    info.chunks.push(chunk);
    offset += 8 + size + (size & 1);
  }
  return info;
}

/** Known-good 1x1 lossy VP8 WebP (keyframe + start code 0x9d012a). */
function makeWebpVp8() {
  return Buffer.from([
    0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    0x56, 0x50, 0x38, 0x20, 0x18, 0x00, 0x00, 0x00,
    0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00,
    0x02, 0x00, 0x34, 0x25, 0xa4, 0x00, 0x03, 0x70, 0x00, 0xfe, 0xfb, 0x94, 0x00, 0x00
  ]);
}

/** Known-good 1x1 lossless VP8L WebP. */
function makeWebpVp8l() {
  const payload = Buffer.from([
    0x2f, 0x00, 0x00, 0x00, 0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe, 0x07, 0x00
  ]);
  const riffSize = 4 + 8 + payload.length;
  const out = Buffer.alloc(12 + 8 + payload.length);
  out.write("RIFF", 0);
  out.writeUInt32LE(riffSize, 4);
  out.write("WEBP", 8);
  out.write("VP8L", 12);
  out.writeUInt32LE(payload.length, 16);
  payload.copy(out, 20);
  return out;
}

/** VP8X canvas 1x1 wrapping the VP8 bitstream (extended container, not the simple VP8 file). */
function makeWebpVp8x() {
  const vp8 = Buffer.from([
    0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00,
    0x02, 0x00, 0x34, 0x25, 0xa4, 0x00, 0x03, 0x70, 0x00, 0xfe, 0xfb, 0x94, 0x00, 0x00
  ]);
  const vp8x = Buffer.alloc(10);
  vp8x[0] = 0x00;
  vp8x.writeUIntLE(0, 4, 3); // width-1 = 0 → 1px
  vp8x.writeUIntLE(0, 7, 3); // height-1 = 0 → 1px
  const chunks = Buffer.concat([
    Buffer.from("VP8X"),
    (() => { const s = Buffer.alloc(4); s.writeUInt32LE(vp8x.length); return s; })(),
    vp8x,
    Buffer.from("VP8 "),
    (() => { const s = Buffer.alloc(4); s.writeUInt32LE(vp8.length); return s; })(),
    vp8
  ]);
  const out = Buffer.alloc(12 + chunks.length);
  out.write("RIFF", 0);
  out.writeUInt32LE(4 + chunks.length, 4);
  out.write("WEBP", 8);
  chunks.copy(out, 12);
  return out;
}

function fodtShell(automaticStyles, bodyInner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>${automaticStyles}</office:automatic-styles>
<office:body><office:text>${bodyInner}</office:text></office:body>
</office:document>`;
}

function imageFodt(name, mime, bytes, widthCm, heightCm) {
  const b64 = bytes.toString("base64");
  const frame = `<draw:frame draw:name="${name}" text:anchor-type="as-char" svg:width="${widthCm}" svg:height="${heightCm}"><draw:image xlink:href="" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" draw:mime-type="${mime}"><office:binary-data>${b64}</office:binary-data></draw:image></draw:frame>`;
  return fodtShell("", `<text:p>BEFORE_${name} ${frame} AFTER_${name}</text:p>`);
}

function convertSafe(source, ext, label) {
  const dir = path.join(outRoot, `${label}-${ext}`);
  fs.mkdirSync(dir, { recursive: true });
  try {
    const dest = convertWithSoffice(source, ext, dir, {
      appKind: "writer",
      profileDir: path.join(dir, "profile"),
      timeoutMs: 90000
    });
    const stat = fs.statSync(dest);
    return { ok: true, dest, size: stat.size };
  } catch (error) {
    return { ok: false, error: String(error.message || error) };
  }
}

function pxToCm(px) {
  return `${Number((px / 96 * 2.54).toFixed(3))}cm`;
}

function inspectDocxMedia(docxPath, original, expectedExts) {
  const entries = listZipEntries(docxPath).map((e) => e.name);
  const media = entries.filter((n) => n.startsWith("word/media/"));
  const documentXml = readZipEntry(docxPath, "word/document.xml")?.toString("utf8") || "";
  const mediaReport = media.map((name) => {
    const bytes = readZipEntry(docxPath, name);
    return {
      name,
      size: bytes?.length ?? 0,
      equalsOriginal: !!(bytes && bytes.equals(original)),
      head: bytes ? bytes.subarray(0, 12).toString("hex") : null
    };
  });
  return {
    media,
    mediaReport,
    byteExact: mediaReport.some((m) => m.equalsOriginal),
    hasDrawing: /<w:drawing>/.test(documentXml),
    hasPict: /<w:pict\b/.test(documentXml),
    expectedExtHit: media.some((n) => expectedExts.some((ext) => n.toLowerCase().endsWith(ext))),
    documentHead: documentXml.replace(/\s+/g, " ").slice(0, 400)
  };
}

function snippetDrawings(xml) {
  const source = String(xml || "");
  const matches = [];
  const re = /<draw:(frame|rect|ellipse|line|custom-shape|circle)\b[^>]*(?:\/>|>[\s\S]*?<\/draw:\1>)/gi;
  let match;
  while ((match = re.exec(source)) !== null) matches.push(match[0].replace(/\s+/g, " ").slice(0, 500));
  return matches;
}

function snippetGraphicStyles(xml) {
  const matches = String(xml || "").match(/<style:style\b[^>]*style:family="graphic"[\s\S]*?<\/style:style>/gi) || [];
  return matches.map((m) => m.replace(/\s+/g, " ").slice(0, 400));
}

function dumpDocxShapeHints(docxPath) {
  const documentXml = readZipEntry(docxPath, "word/document.xml")?.toString("utf8") || "";
  const hints = {
    drawing: (documentXml.match(/<w:drawing>/g) || []).length,
    wps: (documentXml.match(/<wps:wsp\b/g) || []).length,
    prstGeom: [...documentXml.matchAll(/prst="([^"]+)"/g)].map((m) => m[1]),
    vmlRect: (documentXml.match(/<v:rect\b/g) || []).length,
    vmlOval: (documentXml.match(/<v:oval\b/g) || []).length,
    vmlLine: (documentXml.match(/<v:line\b/g) || []).length,
    vmlShape: (documentXml.match(/<v:shape\b/g) || []).length,
    wpg: (documentXml.match(/<wpg:wgp\b/g) || []).length,
    txbx: (documentXml.match(/<w:txbxContent\b|<wps:txbx\b|<v:textbox\b/g) || []).length,
    textHits: {}
  };
  for (const token of ["HOP_VAN_BAN", "HINH_CHU_NHAT", "HINH_ELIP", "DUONG_THANG", "BO_TRON", "MUI_TEN"]) {
    hints.textHits[token] = documentXml.includes(token);
  }
  return hints;
}

// ---------------------------------------------------------------------------
// 1. Images
// ---------------------------------------------------------------------------
log("\n=== IMAGE GENERATION ===");
const jpegPath = path.join(outRoot, "probe.jpg");
const gifPath = path.join(outRoot, "probe.gif");
const bmpPath = path.join(outRoot, "probe.bmp");
const jpeg = gdiImage(16, 10, "Jpeg", jpegPath, 200, 30, 30);
const gif = gdiImage(12, 8, "Gif", gifPath, 30, 160, 80);
const bmp = gdiImage(8, 6, "Bmp", bmpPath, 10, 10, 200);
const webpVp8 = makeWebpVp8();
const webpVp8l = makeWebpVp8l();
const webpVp8x = makeWebpVp8x();
fs.writeFileSync(path.join(outRoot, "probe-vp8.webp"), webpVp8);
fs.writeFileSync(path.join(outRoot, "probe-vp8l.webp"), webpVp8l);
fs.writeFileSync(path.join(outRoot, "probe-vp8x.webp"), webpVp8x);

log(`JPEG bytes=${jpeg.length} sof=${JSON.stringify(jpegSof(jpeg))}`);
log(`GIF bytes=${gif.length} screen=${JSON.stringify(gifLogicalScreen(gif))}`);
log(`BMP bytes=${bmp.length} magic=${bmp.subarray(0, 2).toString("ascii")}`);
log(`WEBP-VP8 bytes=${webpVp8.length} info=${JSON.stringify(webpInfo(webpVp8))}`);
log(`WEBP-VP8L bytes=${webpVp8l.length} info=${JSON.stringify(webpInfo(webpVp8l))}`);
log(`WEBP-VP8X bytes=${webpVp8x.length} info=${JSON.stringify(webpInfo(webpVp8x))}`);

const imageCases = [
  { id: "jpeg", mime: "image/jpeg", bytes: jpeg, w: 16, h: 10, exts: [".jpeg", ".jpg"] },
  { id: "gif", mime: "image/gif", bytes: gif, w: 12, h: 8, exts: [".gif"] },
  { id: "webp-vp8", mime: "image/webp", bytes: webpVp8, w: 1, h: 1, exts: [".webp", ".png", ".jpg", ".jpeg"] },
  { id: "webp-vp8l", mime: "image/webp", bytes: webpVp8l, w: 1, h: 1, exts: [".webp", ".png", ".jpg", ".jpeg"] },
  { id: "webp-vp8x", mime: "image/webp", bytes: webpVp8x, w: 1, h: 1, exts: [".webp", ".png", ".jpg", ".jpeg"] }
];

log("\n=== IMAGE FODT -> DOCX/PDF/FODT ===");
for (const c of imageCases) {
  const source = path.join(outRoot, `${c.id}.fodt`);
  fs.writeFileSync(source, imageFodt(c.id.toUpperCase(), c.mime, c.bytes, pxToCm(c.w), pxToCm(c.h)), "utf8");
  const docx = convertSafe(source, "docx", c.id);
  const pdf = convertSafe(source, "pdf", c.id);
  const fodt = convertSafe(source, "fodt", `${c.id}-round`);
  log(`IMAGE ${c.id} mime=${c.mime} docx=${docx.ok ? "OK " + docx.size : "FAIL " + docx.error} pdf=${pdf.ok ? "OK " + pdf.size : "FAIL " + pdf.error} fodt=${fodt.ok ? "OK " + fodt.size : "FAIL " + fodt.error}`);
  if (docx.ok) {
    const inspect = inspectDocxMedia(docx.dest, c.bytes, c.exts);
    log(`  DOCX media=${JSON.stringify(inspect.media)} byteExact=${inspect.byteExact} drawing=${inspect.hasDrawing} pict=${inspect.hasPict} extHit=${inspect.expectedExtHit}`);
    log(`  mediaReport=${JSON.stringify(inspect.mediaReport)}`);
  }
  if (fodt.ok) {
    const xml = fs.readFileSync(fodt.dest, "utf8");
    const mimeHit = xml.match(/draw:mime-type="([^"]+)"/i)?.[1];
    const hasBinary = /<office:binary-data>/.test(xml);
    const href = xml.match(/<draw:image\b[^>]*xlink:href="([^"]*)"/i)?.[1];
    log(`  CANON_FODT mime=${mimeHit} binary=${hasBinary} href=${href}`);
    log(`  CANON_DRAW ${JSON.stringify(snippetDrawings(xml))}`);
  }
}

// ---------------------------------------------------------------------------
// 2. Shapes / Text Box — hand-written ODF 1.3, convert, inspect canonical FODT
// ---------------------------------------------------------------------------
log("\n=== SHAPE / TEXTBOX FODT ===");
const graphicStyles = `
<style:style style:name="grRect" style:family="graphic">
  <style:graphic-properties draw:fill="solid" draw:fill-color="#2563eb" draw:stroke="solid" svg:stroke-color="#1d4ed8" svg:stroke-width="0.053cm" style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>
<style:style style:name="grEllipse" style:family="graphic">
  <style:graphic-properties draw:fill="solid" draw:fill-color="#0ea5e9" draw:stroke="solid" svg:stroke-color="#0284c7" svg:stroke-width="0.053cm" style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>
<style:style style:name="grLine" style:family="graphic">
  <style:graphic-properties draw:fill="none" draw:stroke="solid" svg:stroke-color="#0f172a" svg:stroke-width="0.079cm" style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>
<style:style style:name="grArrow" style:family="graphic">
  <style:graphic-properties draw:fill="solid" draw:fill-color="#f59e0b" draw:stroke="solid" svg:stroke-color="#d97706" svg:stroke-width="0.053cm" style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>
<style:style style:name="grTextBox" style:family="graphic">
  <style:graphic-properties draw:fill="none" draw:stroke="solid" svg:stroke-color="#2563eb" svg:stroke-width="0.053cm" fo:padding-top="0.1cm" fo:padding-bottom="0.1cm" fo:padding-left="0.15cm" fo:padding-right="0.15cm" style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>`;

const shapeBodies = {
  "rect-in-para": `<text:p>HINH_CHU_NHAT <draw:rect draw:style-name="grRect" draw:name="Rect1" text:anchor-type="as-char" svg:width="3.704cm" svg:height="2.117cm"><text:p/></draw:rect></text:p>`,
  "rect-block": `<text:p>HINH_CHU_NHAT</text:p><draw:rect draw:style-name="grRect" draw:name="Rect1" text:anchor-type="paragraph" svg:x="1cm" svg:y="0.5cm" svg:width="3.704cm" svg:height="2.117cm"><text:p/></draw:rect>`,
  "ellipse": `<text:p>HINH_ELIP</text:p><draw:ellipse draw:style-name="grEllipse" draw:name="Ellipse1" text:anchor-type="paragraph" svg:x="1cm" svg:y="0.5cm" svg:width="2.91cm" svg:height="2.91cm"><text:p/></draw:ellipse>`,
  "line": `<text:p>DUONG_THANG</text:p><draw:line draw:style-name="grLine" draw:name="Line1" text:anchor-type="paragraph" svg:x1="1cm" svg:y1="1cm" svg:x2="5.233cm" svg:y2="1cm"><text:p/></draw:line>`,
  "round-rect": `<text:p>BO_TRON</text:p><draw:rect draw:style-name="grRect" draw:name="Round1" text:anchor-type="paragraph" svg:x="1cm" svg:y="0.5cm" svg:width="3.704cm" svg:height="2.117cm" draw:corner-radius="0.3cm"><text:p/></draw:rect>`,
  "arrow": `<text:p>MUI_TEN</text:p><draw:custom-shape draw:style-name="grArrow" draw:name="Arrow1" text:anchor-type="paragraph" svg:x="1cm" svg:y="0.5cm" svg:width="3.704cm" svg:height="1.852cm"><text:p/><draw:enhanced-geometry svg:viewBox="0 0 21600 21600" draw:type="right-arrow" draw:enhanced-path="M 0 7640 L 13955 7640 13955 3890 21600 10800 13955 17710 13955 13960 0 13960 Z"/></draw:custom-shape>`,
  "textbox-in-para": `<text:p>HOP_VAN_BAN <draw:frame draw:style-name="grTextBox" draw:name="TextBox1" text:anchor-type="as-char" svg:width="5.821cm" svg:height="2.117cm"><draw:text-box><text:p>HOP_VAN_BAN</text:p></draw:text-box></draw:frame></text:p>`,
  "textbox-para-anchor": `<text:p>TRUOC_HOP</text:p><draw:frame draw:style-name="grTextBox" draw:name="TextBox1" text:anchor-type="paragraph" svg:x="1.905cm" svg:y="3.175cm" svg:width="5.821cm" svg:height="2.117cm"><draw:text-box><text:p>HOP_VAN_BAN</text:p></draw:text-box></draw:frame>`
};

for (const [id, body] of Object.entries(shapeBodies)) {
  const source = path.join(outRoot, `shape-${id}.fodt`);
  fs.writeFileSync(source, fodtShell(graphicStyles, body), "utf8");
  const docx = convertSafe(source, "docx", `shape-${id}`);
  const pdf = convertSafe(source, "pdf", `shape-${id}`);
  const fodt = convertSafe(source, "fodt", `shape-${id}-round`);
  log(`SHAPE ${id} docx=${docx.ok ? "OK " + docx.size : "FAIL " + docx.error} pdf=${pdf.ok ? "OK " + pdf.size : "FAIL " + pdf.error} fodt=${fodt.ok ? "OK " + fodt.size : "FAIL " + fodt.error}`);
  if (docx.ok) log(`  DOCX_HINTS ${JSON.stringify(dumpDocxShapeHints(docx.dest))}`);
  if (fodt.ok) {
    const xml = fs.readFileSync(fodt.dest, "utf8");
    log(`  CANON_STYLES ${JSON.stringify(snippetGraphicStyles(xml))}`);
    log(`  CANON_DRAW ${JSON.stringify(snippetDrawings(xml))}`);
    const anchor = xml.match(/text:anchor-type="([^"]+)"/g);
    log(`  CANON_ANCHORS ${JSON.stringify(anchor)}`);
  }
}

const summaryPath = path.join(outRoot, "FINDINGS.txt");
fs.writeFileSync(summaryPath, findings.join("\n"), "utf8");
log(`\nWROTE ${summaryPath}`);
log("PROBE_DONE");
