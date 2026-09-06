/**
 * Phase E.2 measurement probe — run BEFORE serializer code.
 * Hand-written ODF 1.3 FODT for TWO watermark encodings:
 *   A) style:background-image on style:page-layout-properties
 *   B) draw:frame / draw:text-box / draw:custom-shape in style:header
 * plus reverse: a real Word VML watermark DOCX → FODT.
 * Converts through real soffice to DOCX / PDF / canonical FODT.
 * Records measured XML (header parts, w:pict / VML / mc:AlternateContent /
 * wp:anchor behindDoc / w:background) — no guessing.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { createZip, listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) throw new Error("soffice not found");

const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodt-e2-probe-"));
const findings = [];
function log(line) {
  findings.push(line);
  console.log(line);
}

log(`PROBE_ROOT=${outRoot}`);
log(`SOFFICE=${soffice}`);

const versionIni = path.join(path.dirname(soffice), "version.ini");
if (fs.existsSync(versionIni)) {
  log(`VERSION_INI=\n${fs.readFileSync(versionIni, "utf8").trim()}`);
}

const NS = [
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"',
  'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"',
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
  'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"',
  'xmlns:xlink="http://www.w3.org/1999/xlink"'
].join(" ");

function wrapDocument({ automatic = "", master, body }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>
${automatic}
</office:automatic-styles>
<office:master-styles>
${master}
</office:master-styles>
<office:body><office:text>
${body}
</office:text></office:body>
</office:document>
`;
}

const ROTATE_NEG45 = (-45 * Math.PI / 180).toFixed(15);
const ROTATE_POS45 = (45 * Math.PI / 180).toFixed(15);

const wmGraphic = `<style:style style:name="grWm" style:family="graphic">
  <style:graphic-properties draw:stroke="none" draw:fill="none" draw:opacity="20%"
    style:wrap="run-through" style:number-wrapped-paragraphs="no-limit"
    style:vertical-pos="middle" style:vertical-rel="page"
    style:horizontal-pos="center" style:horizontal-rel="page"
    style:flow-with-text="false" style:run-through="background"
    fo:padding="0cm" draw:textarea-horizontal-align="center" draw:textarea-vertical-align="middle"/>
</style:style>`;

const wmTextStyle = `<style:style style:name="TWm" style:family="text">
  <style:text-properties fo:color="#c0c0c0" fo:font-size="72pt" fo:font-weight="bold"
    style:font-size-asian="72pt" style:font-weight-asian="bold"
    fo:font-family="Arial" style:font-family-asian="Arial"/>
</style:style>`;

const wmParaStyle = `<style:style style:name="PWm" style:family="paragraph">
  <style:paragraph-properties fo:text-align="center"/>
</style:style>`;

function pageLayout({ name = "pmA4", extraProps = "", backgroundImage = "" } = {}) {
  const propsOpen = `<style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"${extraProps}`;
  const props = backgroundImage
    ? `${propsOpen}>${backgroundImage}</style:page-layout-properties>`
    : `${propsOpen}/>`;
  return `<style:page-layout style:name="${name}">
${props}
<style:header-style><style:header-footer-properties fo:min-height="0.6cm" fo:margin-left="0cm" fo:margin-right="0cm" fo:margin-bottom="0.3cm"/></style:header-style>
<style:footer-style><style:header-footer-properties fo:min-height="0.6cm" fo:margin-left="0cm" fo:margin-right="0cm" fo:margin-top="0.3cm"/></style:footer-style>
</style:page-layout>`;
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

function makeRgbPng(width, height, rgb) {
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

function gdiWatermarkPng(destPath, text) {
  const ps = `
Add-Type -AssemblyName System.Drawing
$bmp = New-Object System.Drawing.Bitmap 900, 500, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Transparent)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias
$g.TranslateTransform(450, 250)
$g.RotateTransform(-45)
$font = New-Object System.Drawing.Font "Arial", 72, ([System.Drawing.FontStyle]::Bold)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(51, 192, 192, 192))
$sf = New-Object System.Drawing.StringFormat
$sf.Alignment = [System.Drawing.StringAlignment]::Center
$sf.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString(${JSON.stringify(text)}, $font, $brush, 0, 0, $sf)
$bmp.Save(${JSON.stringify(destPath)}, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
`;
  const script = path.join(outRoot, "gdi-watermark.ps1");
  fs.writeFileSync(script, ps, "utf8");
  const result = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script], {
    encoding: "utf8",
    timeout: 30000
  });
  if (result.status !== 0 || !fs.existsSync(destPath)) {
    throw new Error(`GDI+ watermark PNG failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return fs.readFileSync(destPath);
}

const solidPng = makeRgbPng(80, 40, [192, 192, 192]);
const solidB64 = solidPng.toString("base64");
const gdiPngPath = path.join(outRoot, "watermark-text.png");
const gdiPng = gdiWatermarkPng(gdiPngPath, "DU_THAO_BG");
const gdiB64 = gdiPng.toString("base64");
log(`GDI_PNG_BYTES=${gdiPng.length} SOLID_PNG_BYTES=${solidPng.length}`);

function bgImageXml(b64, extraAttrs = 'style:repeat="no-repeat" style:position="center" draw:opacity="20%"') {
  return `<style:background-image xlink:href="" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" ${extraAttrs}><office:binary-data>${b64}</office:binary-data></style:background-image>`;
}

function bgImageDataUriXml(b64) {
  return `<style:background-image xlink:href="data:image/png;base64,${b64}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" style:repeat="no-repeat" style:position="center" draw:opacity="20%"/>`;
}

function headerFrame({ transform = "", name = "Watermark", text = "DU_THAO_FRAME", extraFrame = "" }) {
  const transformAttr = transform ? ` draw:transform="${transform}"` : "";
  return `<style:header>
  <text:p text:style-name="PWm">
    <draw:frame draw:style-name="grWm" draw:name="${name}" text:anchor-type="paragraph" svg:width="16cm" svg:height="6cm" svg:x="2.5cm" svg:y="10cm"${transformAttr}${extraFrame}>
      <draw:text-box>
        <text:p text:style-name="PWm"><text:span text:style-name="TWm">${text}</text:span></text:p>
      </draw:text-box>
    </draw:frame>
  </text:p>
</style:header>`;
}

function headerCustomShape({ text = "DU_THAO_FONTWORK", transform = "" }) {
  const transformAttr = transform ? ` draw:transform="${transform}"` : "";
  return `<style:header>
  <text:p text:style-name="PWm">
    <draw:custom-shape draw:style-name="grWm" draw:name="WatermarkFontwork" text:anchor-type="paragraph" svg:width="16cm" svg:height="6cm" svg:x="2.5cm" svg:y="10cm"${transformAttr}>
      <text:p text:style-name="PWm"><text:span text:style-name="TWm">${text}</text:span></text:p>
      <draw:enhanced-geometry svg:viewBox="0 0 21600 21600" draw:text-path="true" draw:text-path-allowed="true" draw:text-path-mode="shape" draw:type="fontwork-plain-text" draw:enhanced-path="M 0 10800 L 21600 10800 Z N"/>
    </draw:custom-shape>
  </text:p>
</style:header>`;
}

const a4Layout = pageLayout();
const sharedStyles = `${wmGraphic}${wmTextStyle}${wmParaStyle}`;

const fixtures = {
  "01-bgimage-binary-gdi-text": wrapDocument({
    automatic: `${pageLayout({ backgroundImage: bgImageXml(gdiB64) })}${sharedStyles}`,
    master: `<style:master-page style:name="Standard" style:page-layout-name="pmA4"/>`,
    body: "<text:p>BODY_BEHIND_BGIMAGE_GDI Van ban nam truoc hinh mo anh.</text:p>"
  }),
  "02-bgimage-binary-solid-gray": wrapDocument({
    automatic: `${pageLayout({ backgroundImage: bgImageXml(solidB64) })}${sharedStyles}`,
    master: `<style:master-page style:name="Standard" style:page-layout-name="pmA4"/>`,
    body: "<text:p>BODY_BEHIND_BGIMAGE_SOLID Van ban nam truoc nen xam.</text:p>"
  }),
  "03-bgimage-data-uri": wrapDocument({
    automatic: `${pageLayout({ backgroundImage: bgImageDataUriXml(gdiB64) })}${sharedStyles}`,
    master: `<style:master-page style:name="Standard" style:page-layout-name="pmA4"/>`,
    body: "<text:p>BODY_BEHIND_BGIMAGE_DATAURI Van ban nam truoc data-uri.</text:p>"
  }),
  "04-header-textbox-no-rotate": wrapDocument({
    automatic: `${a4Layout}${sharedStyles}`,
    master: `<style:master-page style:name="Standard" style:page-layout-name="pmA4">${headerFrame({ text: "DU_THAO_NOROT" })}</style:master-page>`,
    body: "<text:p>BODY_BEHIND_HEADER_FRAME Van ban nam truoc hop chu khong xoay.</text:p>"
  }),
  "05-header-textbox-rotate-neg45": wrapDocument({
    automatic: `${a4Layout}${sharedStyles}`,
    master: `<style:master-page style:name="Standard" style:page-layout-name="pmA4">${headerFrame({
      text: "DU_THAO_ROT45",
      transform: `rotate (${ROTATE_NEG45})`
    })}</style:master-page>`,
    body: "<text:p>BODY_BEHIND_HEADER_ROTATE Van ban nam truoc hop chu xoay -45 do.</text:p>"
  }),
  "06-header-textbox-rotate-pos45": wrapDocument({
    automatic: `${a4Layout}${sharedStyles}`,
    master: `<style:master-page style:name="Standard" style:page-layout-name="pmA4">${headerFrame({
      text: "DU_THAO_POS45",
      transform: `rotate (${ROTATE_POS45})`
    })}</style:master-page>`,
    body: "<text:p>BODY_BEHIND_HEADER_POS45 Van ban nam truoc hop chu xoay +45 do.</text:p>"
  }),
  "07-header-textbox-svg-transform": wrapDocument({
    automatic: `${a4Layout}${sharedStyles}`,
    master: `<style:master-page style:name="Standard" style:page-layout-name="pmA4">${headerFrame({
      text: "DU_THAO_SVG",
      extraFrame: ` svg:transform="rotate(-45)"`
    })}</style:master-page>`,
    body: "<text:p>BODY_BEHIND_HEADER_SVG Van ban nam truoc svg:transform.</text:p>"
  }),
  "08-header-fontwork-custom-shape": wrapDocument({
    automatic: `${a4Layout}${sharedStyles}`,
    master: `<style:master-page style:name="Standard" style:page-layout-name="pmA4">${headerCustomShape({
      text: "DU_THAO_FONTWORK",
      transform: `rotate (${ROTATE_NEG45})`
    })}</style:master-page>`,
    body: "<text:p>BODY_BEHIND_FONTWORK Van ban nam truoc fontwork.</text:p>"
  }),
  "09-header-textbox-plus-user-header": wrapDocument({
    automatic: `${a4Layout}${sharedStyles}`,
    master: `<style:master-page style:name="Standard" style:page-layout-name="pmA4">
<style:header>
  <text:p>HEADER_USER_TEXT Cong ty TNHH Sao Viet</text:p>
  <text:p text:style-name="PWm">
    <draw:frame draw:style-name="grWm" draw:name="Watermark" text:anchor-type="paragraph" svg:width="16cm" svg:height="6cm" svg:x="2.5cm" svg:y="10cm" draw:transform="rotate (${ROTATE_NEG45})">
      <draw:text-box>
        <text:p text:style-name="PWm"><text:span text:style-name="TWm">DU_THAO_WITH_HF</text:span></text:p>
      </draw:text-box>
    </draw:frame>
  </text:p>
</style:header>
</style:master-page>`,
    body: "<text:p>BODY_WITH_USER_HEADER Van ban co ca dau trang that lan hinh mo.</text:p>"
  }),
  "10-body-textbox-not-header": wrapDocument({
    automatic: `${a4Layout}${sharedStyles}`,
    master: `<style:master-page style:name="Standard" style:page-layout-name="pmA4"/>`,
    body: `<text:p>BODY_WITH_INLINE_FRAME Truoc
<draw:frame draw:style-name="grWm" draw:name="Watermark" text:anchor-type="paragraph" svg:width="16cm" svg:height="6cm" svg:x="2.5cm" svg:y="10cm" draw:transform="rotate (${ROTATE_NEG45})">
  <draw:text-box>
    <text:p text:style-name="PWm"><text:span text:style-name="TWm">DU_THAO_IN_BODY</text:span></text:p>
  </draw:text-box>
</draw:frame>
sau.</text:p>`
  })
};

function count(xml, pattern) {
  return (String(xml || "").match(pattern) || []).length;
}

function snippet(xml, pattern, max = 900) {
  const match = String(xml || "").match(pattern);
  if (!match) return "(no match)";
  const start = Math.max(0, match.index - 80);
  return String(xml).slice(start, start + max).replace(/\s+/g, " ");
}

function xmlText(xml) {
  return String(xml || "").replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

function inspectDocx(docxPath) {
  const entries = listZipEntries(docxPath).map(entry => entry.name);
  const documentXml = (readZipEntry(docxPath, "word/document.xml") || Buffer.alloc(0)).toString("utf8");
  const settingsXml = (readZipEntry(docxPath, "word/settings.xml") || Buffer.alloc(0)).toString("utf8");
  const headerNames = entries.filter(name => /^word\/header\d+\.xml$/i.test(name)).sort();
  const headers = headerNames.map(name => ({
    name,
    xml: (readZipEntry(docxPath, name) || Buffer.alloc(0)).toString("utf8")
  }));
  const media = entries.filter(name => /^word\/media\//i.test(name));
  const allXml = [documentXml, settingsXml, ...headers.map(h => h.xml)].join("\n");
  const markers = {
    wPict: count(allXml, /<w:pict\b/g),
    vShape: count(allXml, /<v:shape\b/g),
    vTextpath: count(allXml, /<v:textpath\b/g),
    vImagedata: count(allXml, /<v:imagedata\b/g),
    mcAlternate: count(allXml, /<mc:AlternateContent\b/g),
    wDrawing: count(allXml, /<w:drawing\b/g),
    wpAnchor: count(allXml, /<wp:anchor\b/g),
    behindDoc: count(allXml, /behindDoc="1"/g),
    powerPlus: count(allXml, /PowerPlusWaterMark/gi),
    wordPictureWm: count(allXml, /WordPictureWatermark/gi),
    wBackground: count(allXml, /<w:background\b/g),
    vBackground: count(allXml, /<v:background\b/g),
    displayBackground: count(settingsXml, /<w:displayBackgroundShape\b/g),
    headerRef: count(documentXml, /<w:headerReference\b/g)
  };
  const headerTexts = headers.map(h => ({ name: h.name, text: xmlText(h.xml), len: h.xml.length }));
  return { entries, media, markers, headerTexts, headers, documentXml, settingsXml };
}

function inspectFodt(fodt) {
  return {
    backgroundImage: count(fodt, /<style:background-image\b/g),
    drawOpacity: count(fodt, /draw:opacity=/g),
    styleHeader: count(fodt, /<style:header\b/g),
    drawFrame: count(fodt, /<draw:frame\b/g),
    drawTextBox: count(fodt, /<draw:text-box\b/g),
    drawCustomShape: count(fodt, /<draw:custom-shape\b/g),
    drawTransform: count(fodt, /draw:transform=/g),
    svgTransform: count(fodt, /svg:transform=/g),
    runThrough: count(fodt, /style:wrap="run-through"/g),
    runThroughBg: count(fodt, /style:run-through="background"/g),
    watermarkName: count(fodt, /draw:name="Watermark/g),
    bgSnippet: snippet(fodt, /<style:background-image\b[\s\S]{0,400}/),
    headerSnippet: snippet(fodt, /<style:header\b[\s\S]{0,700}/),
    transformSnippet: snippet(fodt, /draw:transform="[^"]+"/)
  };
}

function inspectPdf(pdfPath) {
  if (!pdfPath || !fs.existsSync(pdfPath)) return { exists: false };
  const bytes = fs.readFileSync(pdfPath);
  const latin = bytes.toString("latin1");
  const needles = [
    "DU_THAO_BG", "DU_THAO_FRAME", "DU_THAO_NOROT", "DU_THAO_ROT45", "DU_THAO_POS45",
    "DU_THAO_SVG", "DU_THAO_FONTWORK", "DU_THAO_WITH_HF", "DU_THAO_IN_BODY",
    "CONFIDENTIAL_VML", "BODY_BEHIND"
  ];
  const found = {};
  for (const needle of needles) found[needle] = latin.includes(needle);
  return { exists: true, bytes: bytes.length, found, mediaBox: (latin.match(/\/MediaBox\s*\[[^\]]+\]/g) || []).slice(0, 2) };
}

function dumpDocxXml(label, docx) {
  log(`  ENTRIES=${docx.entries.join(" | ")}`);
  log(`  MEDIA=${docx.media.join(",") || "(none)"}`);
  log(`  MARKERS=${JSON.stringify(docx.markers)}`);
  log(`  DOCUMENT_SNIPPET=${snippet(docx.documentXml, /<w:(background|sectPr|drawing|pict)\b[\s\S]{0,500}/)}`);
  for (const header of docx.headers) {
    log(`  HEADER[${header.name}]_TEXT=${JSON.stringify(docx.headerTexts.find(h => h.name === header.name)?.text || "")}`);
    log(`  HEADER[${header.name}]_SNIPPET=${header.xml.replace(/\s+/g, " ").slice(0, 1400)}`);
    const wmHits = [];
    for (const re of [
      /PowerPlusWaterMark[^"<\s]*/i,
      /WordPictureWatermark[^"<\s]*/i,
      /<v:textpath\b[^>]*>/i,
      /<v:shape\b[^>]{0,400}/i,
      /behindDoc="[^"]*"/i,
      /rotation:[^;"]+/i,
      /<a:t\b[^>]*>[^<]+/i,
      /<w:t\b[^>]*>[^<]+/g
    ]) {
      const m = header.xml.match(re);
      if (m) wmHits.push(m[0].replace(/\s+/g, " ").slice(0, 240));
    }
    log(`  HEADER[${header.name}]_WM_HITS=${wmHits.join(" || ") || "(none)"}`);
  }
}

function runFixture(id, fodtXml) {
  log(`\n===== FIXTURE ${id} =====`);
  const fodtPath = path.join(outRoot, `${id}.fodt`);
  fs.writeFileSync(fodtPath, fodtXml, "utf8");
  log(`INPUT_FODT_MARKERS=${JSON.stringify(inspectFodt(fodtXml))}`);
  const docxDir = path.join(outRoot, `${id}-docx`);
  const pdfDir = path.join(outRoot, `${id}-pdf`);
  const canonDir = path.join(outRoot, `${id}-canon`);
  let docxPath;
  let pdfPath;
  let canonPath;
  try {
    docxPath = convertWithSoffice(fodtPath, "docx", docxDir, {
      appKind: "writer", profileDir: path.join(docxDir, "profile")
    });
    log(`DOCX_OK=${docxPath}`);
  } catch (error) {
    log(`DOCX_FAIL=${error.message}`);
    return;
  }
  try {
    pdfPath = convertWithSoffice(fodtPath, "pdf", pdfDir, {
      appKind: "writer", profileDir: path.join(pdfDir, "profile")
    });
    log(`PDF_OK=${pdfPath} ${JSON.stringify(inspectPdf(pdfPath))}`);
  } catch (error) {
    log(`PDF_FAIL=${error.message}`);
  }
  try {
    canonPath = convertWithSoffice(fodtPath, "fodt", canonDir, {
      appKind: "writer", profileDir: path.join(canonDir, "profile")
    });
    const canon = fs.readFileSync(canonPath, "utf8");
    log(`CANON_FODT_OK bytes=${canon.length}`);
    log(`CANON_FODT_MARKERS=${JSON.stringify(inspectFodt(canon))}`);
  } catch (error) {
    log(`CANON_FODT_FAIL=${error.message}`);
  }
  const docx = inspectDocx(docxPath);
  dumpDocxXml(id, docx);
}

for (const [id, xml] of Object.entries(fixtures)) {
  runFixture(id, xml);
}

function wordWatermarkDocx() {
  const headerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
       xmlns:v="urn:schemas-microsoft-com:vml"
       xmlns:o="urn:schemas-microsoft-com:office:office"
       xmlns:w10="urn:schemas-microsoft-com:office:word">
  <w:p>
    <w:pPr><w:pStyle w:val="Header"/></w:pPr>
    <w:r>
      <w:rPr><w:noProof/></w:rPr>
      <w:pict>
        <v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e">
          <v:formulas>
            <v:f eqn="sum #0 0 10800"/>
            <v:f eqn="prod #0 2 1"/>
            <v:f eqn="sum 21600 0 @1"/>
            <v:f eqn="sum 0 0 @2"/>
            <v:f eqn="sum 21600 0 @3"/>
            <v:f eqn="if @0 @3 0"/>
            <v:f eqn="if @0 21600 @1"/>
            <v:f eqn="if @0 0 @2"/>
            <v:f eqn="if @0 @4 21600"/>
            <v:f eqn="mid @5 @6"/>
            <v:f eqn="mid @8 @5"/>
            <v:f eqn="mid @7 @8"/>
            <v:f eqn="mid @6 @7"/>
          </v:formulas>
          <v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/>
          <v:textpath on="t" fitshape="t"/>
          <v:handles><v:h position="#0,bottomRight" xrange="6629,14971"/></v:handles>
          <o:lock v:ext="edit" text="t" shapetype="t"/>
        </v:shapetype>
        <v:shape id="PowerPlusWaterMarkObject357476642" o:spid="_x0000_s2049" type="#_x0000_t136"
          style="position:absolute;margin-left:0;margin-top:0;width:527.85pt;height:131.95pt;rotation:315;z-index:-251654144;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin"
          o:allowincell="f" fillcolor="silver" stroked="f">
          <v:fill opacity=".5"/>
          <v:textpath style="font-family:&quot;Calibri&quot;;font-size:1pt" string="CONFIDENTIAL_VML"/>
        </v:shape>
      </w:pict>
    </w:r>
  </w:p>
</w:hdr>`;
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:t>BODY_TEXT_BEHIND_WORD_WATERMARK</w:t></w:r></w:p>
    <w:sectPr>
      <w:headerReference w:type="default" r:id="rId2"/>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Header">
    <w:name w:val="header"/>
    <w:basedOn w:val="Normal"/>
  </w:style>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
  </w:style>
</w:styles>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
</Relationships>`;
  return createZip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rootRels },
    { name: "word/document.xml", data: documentXml },
    { name: "word/_rels/document.xml.rels", data: docRels },
    { name: "word/styles.xml", data: stylesXml },
    { name: "word/header1.xml", data: headerXml }
  ]);
}

log("\n===== REVERSE 11-word-vml-watermark-docx → FODT/DOCX =====");
const wordDocxPath = path.join(outRoot, "11-word-vml-watermark.docx");
fs.writeFileSync(wordDocxPath, wordWatermarkDocx());
log(`WORD_DOCX_INPUT=${wordDocxPath} bytes=${fs.statSync(wordDocxPath).size}`);
log("WORD_DOCX_INPUT_INSPECT:");
dumpDocxXml("11-input", inspectDocx(wordDocxPath));

try {
  const reverseFodt = convertWithSoffice(wordDocxPath, "fodt", path.join(outRoot, "11-reverse-fodt"), {
    appKind: "writer", profileDir: path.join(outRoot, "11-reverse-fodt", "profile")
  });
  const reverseXml = fs.readFileSync(reverseFodt, "utf8");
  fs.writeFileSync(path.join(outRoot, "11-word-vml-watermark.fodt"), reverseXml, "utf8");
  log(`REVERSE_FODT_OK bytes=${reverseXml.length}`);
  log(`REVERSE_FODT_MARKERS=${JSON.stringify(inspectFodt(reverseXml))}`);
  log(`REVERSE_FODT_HEADER_SNIPPET=${snippet(reverseXml, /<style:header\b[\s\S]{0,1800}/, 1800)}`);
  log(`REVERSE_FODT_BG_SNIPPET=${snippet(reverseXml, /<style:background-image\b[\s\S]{0,600}/)}`);
  log(`REVERSE_FODT_CUSTOM_SNIPPET=${snippet(reverseXml, /<draw:custom-shape\b[\s\S]{0,900}/)}`);
  log(`REVERSE_FODT_FRAME_SNIPPET=${snippet(reverseXml, /<draw:frame\b[\s\S]{0,900}/)}`);
  log(`REVERSE_FODT_HAS_CONFIDENTIAL=${reverseXml.includes("CONFIDENTIAL_VML")}`);
  try {
    const roundDocx = convertWithSoffice(reverseFodt, "docx", path.join(outRoot, "11-round-docx"), {
      appKind: "writer", profileDir: path.join(outRoot, "11-round-docx", "profile")
    });
    log("REVERSE_ROUNDTRIP_DOCX:");
    dumpDocxXml("11-round", inspectDocx(roundDocx));
  } catch (error) {
    log(`REVERSE_ROUNDTRIP_DOCX_FAIL=${error.message}`);
  }
} catch (error) {
  log(`REVERSE_FODT_FAIL=${error.message}`);
}

const dumpPath = path.join(outRoot, "probe-e2-findings.txt");
fs.writeFileSync(dumpPath, findings.join("\n"), "utf8");
log(`\nDUMP=${dumpPath}`);
log("PROBE_DONE");
