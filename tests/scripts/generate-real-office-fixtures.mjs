/**
 * Generate real-office OOXML fixtures WITHOUT using any VN Office serializer.
 *
 * Pipeline (same path a LibreOffice/Office user would take):
 *   1. Hand-written ODF (src/*.fodt|fods|fodp)
 *   2. soffice --headless --convert-to docx/xlsx/pptx
 *
 * Writer image: Flat ODF + xlink:href is treated as an external link by
 * LibreOffice. Pack the PNG into a real ODT zip (Pictures/ member) first so
 * the resulting DOCX embeds the bytes. Independent of VN Office.
 *
 * Sheet validation: LibreOffice FODS→XLSX drops calcext CF and whole-number
 * validation. After soffice convert, inject Excel-native conditionalFormatting
 * / dataValidation so the XLSX matches what Microsoft Excel would store.
 *
 * Slides SmartArt: LibreOffice FODP→PPTX does not emit ppt/diagrams/*. Pack
 * native DrawingML parts from src/smartart-pptx/ (see pack-slides-smartart-pptx.mjs).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { createZip } from "../helpers/zip-package.mjs";
import { packSlidesSmartartPptx } from "./pack-slides-smartart-pptx.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureDir = path.join(root, "tests", "fixtures", "real-office-samples");
const srcDir = path.join(fixtureDir, "src");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-real-office-fixtures-"));
const profileDir = path.join(tmp, "profile");

function packWriterImageOdt(fodtPath, pngPath, odtPath) {
  const fodt = fs.readFileSync(fodtPath, "utf8");
  const stylesMatch = fodt.match(/<office:styles\b[\s\S]*<\/office:styles>/i);
  const automaticMatch = fodt.match(/<office:automatic-styles\b[\s\S]*<\/office:automatic-styles>/i);
  const masterMatch = fodt.match(/<office:master-styles\b[\s\S]*<\/office:master-styles>/i);
  const bodyMatch = fodt.match(/<office:body\b[\s\S]*<\/office:body>/i);
  if (!stylesMatch || !automaticMatch || !masterMatch || !bodyMatch) {
    throw new Error("sample-writer-image.fodt is missing styles/body sections");
  }
  const ns = [
    'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
    'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
    'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
    'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"',
    'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
    'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"',
    'xmlns:xlink="http://www.w3.org/1999/xlink"',
    'office:version="1.3"'
  ].join(" ");
  const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles ${ns}>
${stylesMatch[0]}
${automaticMatch[0]}
${masterMatch[0]}
</office:document-styles>`;
  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content ${ns}>
${automaticMatch[0]}
${bodyMatch[0]}
</office:document-content>`;
  const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.3">
  <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="Pictures/logo-don-vi.png" manifest:media-type="image/png"/>
</manifest:manifest>`;
  const zip = createZip([
    { name: "mimetype", data: "application/vnd.oasis.opendocument.text", store: true },
    { name: "META-INF/manifest.xml", data: manifestXml },
    { name: "content.xml", data: contentXml },
    { name: "styles.xml", data: stylesXml },
    { name: "Pictures/logo-don-vi.png", data: fs.readFileSync(pngPath), store: true }
  ]);
  fs.writeFileSync(odtPath, zip);
  return odtPath;
}

function extractZip(zipPath, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const result = spawnSync("tar", ["-xf", zipPath, "-C", dest], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`tar -xf failed: ${result.stderr || result.stdout || ""}`);
}

function collectFiles(dir, prefix = "") {
  const files = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const relative = prefix ? `${prefix}/${name}` : name;
    if (fs.statSync(full).isDirectory()) files.push(...collectFiles(full, relative));
    else files.push({ name: relative.replaceAll("\\", "/"), data: fs.readFileSync(full) });
  }
  return files;
}

function patchValidationXlsx(xlsxPath) {
  const extractDir = path.join(tmp, "xlsx-patch");
  fs.rmSync(extractDir, { recursive: true, force: true });
  extractZip(xlsxPath, extractDir);
  const sheetPath = path.join(extractDir, "xl", "worksheets", "sheet1.xml");
  const stylesPath = path.join(extractDir, "xl", "styles.xml");
  let sheet = fs.readFileSync(sheetPath, "utf8");
  let styles = fs.readFileSync(stylesPath, "utf8");

  const dxfs = `<dxfs count="3">
<dxf><fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/><bgColor rgb="FFC6EFCE"/></patternFill></fill></dxf>
<dxf><fill><patternFill patternType="solid"><fgColor rgb="FFFFC7CE"/><bgColor rgb="FFFFC7CE"/></patternFill></fill></dxf>
<dxf><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/><bgColor rgb="FFFFF2CC"/></patternFill></fill></dxf>
</dxfs>`;
  if (/<dxfs[\s\S]*?<\/dxfs>/i.test(styles)) {
    styles = styles.replace(/<dxfs[\s\S]*?<\/dxfs>/i, dxfs);
  } else if (/<cellStyles[\s>]/i.test(styles)) {
    styles = styles.replace(/<cellStyles\b/i, `${dxfs}<cellStyles`);
  } else {
    styles = styles.replace(/<\/styleSheet>/i, `${dxfs}</styleSheet>`);
  }
  fs.writeFileSync(stylesPath, styles);

  const cfXml = `<conditionalFormatting sqref="A2:A4">
<cfRule type="cellIs" dxfId="0" priority="1" operator="greaterThan"><formula>80</formula></cfRule>
<cfRule type="cellIs" dxfId="1" priority="2" operator="lessThan"><formula>50</formula></cfRule>
<cfRule type="containsBlanks" dxfId="2" priority="3"/>
</conditionalFormatting>`;
  if (/<conditionalFormatting[\s\S]*?<\/conditionalFormatting>/i.test(sheet)) {
    sheet = sheet.replace(/<conditionalFormatting[\s\S]*?<\/conditionalFormatting>/gi, "");
  }
  if (/<\/worksheet>/i.test(sheet)) {
    sheet = sheet.replace(/<\/worksheet>/i, `${cfXml}</worksheet>`);
  }

  sheet = sheet.replace(
    /<dataValidation[^>]*sqref="C2:C4"[^>]*>[\s\S]*?<\/dataValidation>/i,
    `<dataValidation type="whole" operator="between" allowBlank="true" error="Điểm phụ phải từ 0 đến 10." errorStyle="warning" errorTitle="Ngoài khoảng" showErrorMessage="true" sqref="C2:C4"><formula1>0</formula1><formula2>10</formula2></dataValidation>`
  );
  fs.writeFileSync(sheetPath, sheet);

  const entries = collectFiles(extractDir);
  fs.writeFileSync(xlsxPath, createZip(entries));
}

const jobs = [
  { src: "sample-writer.fodt", ext: "docx", name: "sample-writer.docx" },
  { src: "sample-sheet.fods", ext: "xlsx", name: "sample-sheet.xlsx" },
  { src: "sample-slides.fodp", ext: "pptx", name: "sample-slides.pptx" },
  { src: "sample-writer-image.fodt", ext: "docx", name: "sample-writer-image.docx" },
  { src: "sample-writer-trackchanges.fodt", ext: "docx", name: "sample-writer-trackchanges.docx" },
  { src: "sample-writer-comments.fodt", ext: "docx", name: "sample-writer-comments.docx" },
  { src: "sample-sheet-formulas.fods", ext: "xlsx", name: "sample-sheet-formulas.xlsx" },
  { src: "sample-sheet-validation.fods", ext: "xlsx", name: "sample-sheet-validation.xlsx" },
  { src: "sample-sheet-pivot.fods", ext: "xlsx", name: "sample-sheet-pivot.xlsx" }
];

try {
  for (const job of jobs) {
    const source = path.join(srcDir, job.src);
    if (!fs.existsSync(source)) throw new Error(`Missing source ODF: ${source}`);
    let convertSource = source;
    if (job.name === "sample-writer-image.docx") {
      const pngPath = path.join(srcDir, "Pictures", "logo-don-vi.png");
      if (!fs.existsSync(pngPath)) throw new Error(`Missing embedded PNG: ${pngPath}`);
      convertSource = packWriterImageOdt(source, pngPath, path.join(tmp, "sample-writer-image.odt"));
      console.log(`    packed ODT with embedded PNG (${fs.statSync(convertSource).size} bytes)`);
    }
    const outDir = path.join(tmp, job.name);
    const converted = convertWithSoffice(convertSource, job.ext, outDir, { profileDir });
    const dest = path.join(fixtureDir, job.name);
    fs.copyFileSync(converted, dest);
    if (job.name === "sample-sheet-validation.xlsx") {
      patchValidationXlsx(dest);
      console.log("    patched XLSX with Excel-native CF + whole-number validation");
    }
    const size = fs.statSync(dest).size;
    if (size < 1000) throw new Error(`${job.name} is suspiciously small (${size} bytes)`);
    console.log(`OK  ${job.src} → ${job.name} (${size} bytes)`);
  }
  const smartartPptx = packSlidesSmartartPptx(path.join(fixtureDir, "sample-slides-smartart.pptx"));
  console.log(`OK  src/smartart-pptx/* → sample-slides-smartart.pptx (${fs.statSync(smartartPptx).size} bytes)`);
  console.log(`Wrote OOXML fixtures to ${fixtureDir}`);
} finally {
  if (!process.env.VNO_KEEP_FIXTURE_TMP) {
    fs.rmSync(tmp, { recursive: true, force: true });
  } else {
    console.log(`Kept temp at ${tmp}`);
  }
}
