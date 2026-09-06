/**
 * Phase C measurement probe — run BEFORE serializer code.
 * Hand-written ODF 1.3 FODT with style:page-layout + style:master-page,
 * converted through real soffice to DOCX / PDF / canonical FODT.
 * Records measured XML (sectPr, pgSz, pgMar, header/footer refs, MediaBox).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) throw new Error("soffice not found");

const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodt-c-probe-"));
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
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"',
  'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"',
  'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"',
  'xmlns:xlink="http://www.w3.org/1999/xlink"'
].join(" ");

function wrapDocument(automaticStyles, masterStyles, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>
${automaticStyles}
</office:automatic-styles>
<office:master-styles>
${masterStyles}
</office:master-styles>
<office:body><office:text>
${body}
</office:text></office:body>
</office:document>
`;
}

function pageLayout({ name, width, height, top, bottom, left, right, orientation }) {
  return `<style:page-layout style:name="${name}">
  <style:page-layout-properties fo:page-width="${width}" fo:page-height="${height}" fo:margin-top="${top}" fo:margin-bottom="${bottom}" fo:margin-left="${left}" fo:margin-right="${right}" style:print-orientation="${orientation}"/>
  <style:header-style>
    <style:header-footer-properties fo:min-height="0.6cm" fo:margin-left="0cm" fo:margin-right="0cm" fo:margin-bottom="0.3cm"/>
  </style:header-style>
  <style:footer-style>
    <style:header-footer-properties fo:min-height="0.6cm" fo:margin-left="0cm" fo:margin-right="0cm" fo:margin-top="0.3cm"/>
  </style:footer-style>
</style:page-layout>`;
}

const a4Layout = pageLayout({
  name: "pmA4",
  width: "21cm",
  height: "29.7cm",
  top: "2cm",
  bottom: "2cm",
  left: "3cm",
  right: "1.5cm",
  orientation: "portrait"
});

const letterLandscape = pageLayout({
  name: "pmLetterL",
  width: "27.94cm",
  height: "21.59cm",
  top: "2.54cm",
  bottom: "2.54cm",
  left: "2.54cm",
  right: "2.54cm",
  orientation: "landscape"
});

const envLayoutPortrait = pageLayout({
  name: "pmEnvP",
  width: "22cm",
  height: "11cm",
  top: "0.8cm",
  bottom: "0.8cm",
  left: "1cm",
  right: "1cm",
  orientation: "portrait"
});

const envLayoutLandscape = pageLayout({
  name: "pmEnvL",
  width: "22cm",
  height: "11cm",
  top: "0.8cm",
  bottom: "0.8cm",
  left: "1cm",
  right: "1cm",
  orientation: "landscape"
});

const headerFooterStyles = `<style:style style:name="PHeader" style:family="paragraph">
  <style:paragraph-properties fo:text-align="center"/>
  <style:text-properties fo:font-size="10pt"/>
</style:style>`;

function masterPage(name, layoutName, headerText, footerText) {
  const header = headerText
    ? `<style:header><text:p text:style-name="PHeader">${headerText}</text:p></style:header>`
    : "";
  const footer = footerText
    ? `<style:footer><text:p text:style-name="PHeader">${footerText}</text:p></style:footer>`
    : "";
  return `<style:master-page style:name="${name}" style:page-layout-name="${layoutName}">${header}${footer}</style:master-page>`;
}

const fixtures = {
  "01-a4-header-footer": wrapDocument(
    `${a4Layout}${headerFooterStyles}`,
    masterPage("Standard", "pmA4", "HEADER_A4_VN", "FOOTER_A4_VN"),
    "<text:p>BODY_A4_VN</text:p>"
  ),
  "02-letter-landscape": wrapDocument(
    `${letterLandscape}${headerFooterStyles}`,
    masterPage("Standard", "pmLetterL", "HEADER_LETTER_L", "FOOTER_LETTER_L"),
    "<text:p>BODY_LETTER_LANDSCAPE</text:p>"
  ),
  "03-multi-para-style-master": wrapDocument(
    `${a4Layout}${envLayoutPortrait}${headerFooterStyles}
<style:style style:name="PEnvStart" style:family="paragraph" style:master-page-name="Envelope">
  <style:paragraph-properties fo:break-before="page"/>
</style:style>`,
    `${masterPage("Standard", "pmA4", "HEADER_A4_MULTI", "FOOTER_A4_MULTI")}
${masterPage("Envelope", "pmEnvP", "HEADER_ENV_MULTI", "FOOTER_ENV_MULTI")}`,
    `<text:p>BODY_A4_BEFORE_ENVELOPE</text:p>
<text:p text:style-name="PEnvStart">BODY_ENVELOPE_AFTER_A4</text:p>`
  ),
  "04-master-attr-on-text-p": wrapDocument(
    `${a4Layout}${envLayoutPortrait}${headerFooterStyles}`,
    `${masterPage("Standard", "pmA4", "HEADER_A4_ATTR", "FOOTER_A4_ATTR")}
${masterPage("Envelope", "pmEnvP", "HEADER_ENV_ATTR", "FOOTER_ENV_ATTR")}`,
    `<text:p>BODY_A4_ATTR</text:p>
<text:p style:master-page-name="Envelope">BODY_ENVELOPE_ATTR_ON_P</text:p>`
  ),
  "05-text-section-master": wrapDocument(
    `${a4Layout}${envLayoutPortrait}${headerFooterStyles}
<style:style style:name="SectEnv" style:family="section">
  <style:section-properties style:master-page-name="Envelope" fo:break-before="page"/>
</style:style>`,
    `${masterPage("Standard", "pmA4", "HEADER_A4_SECT", "FOOTER_A4_SECT")}
${masterPage("Envelope", "pmEnvP", "HEADER_ENV_SECT", "FOOTER_ENV_SECT")}`,
    `<text:p>BODY_A4_SECTION</text:p>
<text:section text:style-name="SectEnv" text:name="EnvelopeSection">
  <text:p>BODY_ENVELOPE_SECTION</text:p>
</text:section>`
  ),
  "06-envelope-orient-portrait": wrapDocument(
    `${envLayoutPortrait}${headerFooterStyles}`,
    masterPage("Standard", "pmEnvP", "HEADER_ENV_P", "FOOTER_ENV_P"),
    "<text:p>BODY_ENV_PORTRAIT_WIDE</text:p>"
  ),
  "07-envelope-orient-landscape": wrapDocument(
    `${envLayoutLandscape}${headerFooterStyles}`,
    masterPage("Standard", "pmEnvL", "HEADER_ENV_L", "FOOTER_ENV_L"),
    "<text:p>BODY_ENV_LANDSCAPE_WIDE</text:p>"
  ),
  "08-a4-no-header-footer": wrapDocument(
    a4Layout,
    `<style:master-page style:name="Standard" style:page-layout-name="pmA4"/>`,
    "<text:p>BODY_A4_NO_HF</text:p>"
  )
};

function snippet(xml, pattern, max = 1800) {
  const match = String(xml || "").match(pattern);
  if (!match) return null;
  const text = match[0];
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function allMatches(xml, pattern) {
  return String(xml || "").match(new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`)) || [];
}

function extractPageLayouts(fodt) {
  return allMatches(fodt, /<style:page-layout\b[\s\S]*?<\/style:page-layout>/g);
}

function extractMasterPages(fodt) {
  return allMatches(fodt, /<style:master-page\b[\s\S]*?<\/style:master-page>|<style:master-page\b[^/]*\/>/g);
}

function extractSectPr(documentXml) {
  return allMatches(documentXml, /<w:sectPr\b[\s\S]*?<\/w:sectPr>/g);
}

function extractPgSz(sectPr) {
  return allMatches(sectPr, /<w:pgSz\b[^/]*\/>/g);
}

function extractPgMar(sectPr) {
  return allMatches(sectPr, /<w:pgMar\b[^/]*\/>/g);
}

function pdfMediaBoxes(pdfBytes) {
  const text = pdfBytes.toString("latin1");
  return allMatches(text, /\/MediaBox\s*\[[^\]]+\]/g);
}

function convertCase(name, fodtXml) {
  const dir = path.join(outRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  const source = path.join(dir, `${name}.fodt`);
  fs.writeFileSync(source, fodtXml, "utf8");
  const result = { name, source, ok: true, errors: [] };
  try {
    result.docx = convertWithSoffice(source, "docx", path.join(dir, "docx"), {
      appKind: "writer",
      profileDir: path.join(dir, "profile-docx")
    });
  } catch (error) {
    result.ok = false;
    result.errors.push(`docx: ${error.message}`);
  }
  try {
    result.pdf = convertWithSoffice(source, "pdf", path.join(dir, "pdf"), {
      appKind: "writer",
      profileDir: path.join(dir, "profile-pdf")
    });
  } catch (error) {
    result.ok = false;
    result.errors.push(`pdf: ${error.message}`);
  }
  try {
    result.canonical = convertWithSoffice(source, "fodt", path.join(dir, "canonical"), {
      appKind: "writer",
      profileDir: path.join(dir, "profile-fodt")
    });
  } catch (error) {
    result.ok = false;
    result.errors.push(`canonical-fodt: ${error.message}`);
  }
  return result;
}

log("");
log("=== INPUT FODT STRUCTURE (hand-written) ===");
for (const [name, xml] of Object.entries(fixtures)) {
  log(`\n-- INPUT ${name} --`);
  log(`page-layout count=${extractPageLayouts(xml).length}`);
  for (const layout of extractPageLayouts(xml)) log(layout.replace(/\s+/g, " ").trim());
  log(`master-page count=${extractMasterPages(xml).length}`);
  for (const master of extractMasterPages(xml)) log(master.replace(/\s+/g, " ").trim());
}

log("\n=== SOFFICE CONVERSION ===");
for (const [name, xml] of Object.entries(fixtures)) {
  log(`\n########## ${name} ##########`);
  const converted = convertCase(name, xml);
  log(`ok=${converted.ok}`);
  if (converted.errors.length) log(`errors=${converted.errors.join(" | ")}`);
  if (converted.docx && fs.existsSync(converted.docx)) {
    const zipNames = listZipEntries(converted.docx).map((entry) => entry.name);
    log(`docx=${converted.docx} bytes=${fs.statSync(converted.docx).size}`);
    log(`zip-entries=${zipNames.join(",")}`);
    const documentXml = readZipEntry(converted.docx, "word/document.xml")?.toString("utf8") || "";
    const sectPr = extractSectPr(documentXml);
    log(`sectPr count=${sectPr.length}`);
    sectPr.forEach((block, index) => {
      log(`sectPr[${index}] pgSz=${extractPgSz(block).join(" | ") || "(none)"}`);
      log(`sectPr[${index}] pgMar=${extractPgMar(block).join(" | ") || "(none)"}`);
      log(`sectPr[${index}] headerRef=${allMatches(block, /<w:headerReference\b[^/]*\/>/g).join(" | ") || "(none)"}`);
      log(`sectPr[${index}] footerRef=${allMatches(block, /<w:footerReference\b[^/]*\/>/g).join(" | ") || "(none)"}`);
      const type = snippet(block, /<w:type\b[^/]*\/>/);
      if (type) log(`sectPr[${index}] type=${type}`);
    });
    const headerParts = zipNames.filter((entry) => /^word\/header\d+\.xml$/i.test(entry));
    const footerParts = zipNames.filter((entry) => /^word\/footer\d+\.xml$/i.test(entry));
    log(`header-parts=${headerParts.join(",") || "(none)"}`);
    log(`footer-parts=${footerParts.join(",") || "(none)"}`);
    for (const part of [...headerParts, ...footerParts]) {
      const partXml = readZipEntry(converted.docx, part)?.toString("utf8") || "";
      const text = partXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      log(`${part} text=${text.slice(0, 300)}`);
    }
    const bodyText = documentXml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    log(`document.xml body-text=${bodyText.slice(0, 400)}`);
    log(`document.xml has w:br type=page=${/<w:br\b[^>]*w:type="page"/.test(documentXml)}`);
  }
  if (converted.pdf && fs.existsSync(converted.pdf)) {
    const pdf = fs.readFileSync(converted.pdf);
    log(`pdf=${converted.pdf} bytes=${pdf.length} magic=${pdf.subarray(0, 5).toString("latin1")}`);
    log(`pdf MediaBox=${pdfMediaBoxes(pdf).join(" | ") || "(none)"}`);
    const pageCount = allMatches(pdf.toString("latin1"), /\/Type\s*\/Page[^s]/g).length;
    log(`pdf /Type /Page count≈${pageCount}`);
  }
  if (converted.canonical && fs.existsSync(converted.canonical)) {
    const canonical = fs.readFileSync(converted.canonical, "utf8");
    log(`canonical-fodt bytes=${canonical.length}`);
    log("canonical page-layout:");
    for (const layout of extractPageLayouts(canonical)) log(layout.replace(/\s+/g, " ").trim().slice(0, 1200));
    log("canonical master-page:");
    for (const master of extractMasterPages(canonical)) log(master.replace(/\s+/g, " ").trim().slice(0, 1200));
    const paraStyles = allMatches(canonical, /<style:style\b[^>]*style:family="paragraph"[^>]*>[\s\S]*?<\/style:style>/g);
    const withMaster = paraStyles.filter((block) => /style:master-page-name=/.test(block));
    log(`canonical paragraph styles with master-page-name=${withMaster.length}`);
    for (const block of withMaster) log(block.replace(/\s+/g, " ").trim().slice(0, 800));
    const pWithMasterAttr = allMatches(canonical, /<text:p\b[^>]*style:master-page-name="[^"]+"[^>]*>/g);
    log(`canonical text:p with style:master-page-name attr=${pWithMasterAttr.length} ${pWithMasterAttr.join(" | ") || ""}`);
    const sections = allMatches(canonical, /<text:section\b[\s\S]*?<\/text:section>/g);
    log(`canonical text:section count=${sections.length}`);
    for (const section of sections) log(section.replace(/\s+/g, " ").trim().slice(0, 600));
    const firstP = snippet(canonical, /<text:p\b[^>]*>[\s\S]*?<\/text:p>/);
    log(`canonical first text:p=${firstP ? firstP.replace(/\s+/g, " ").trim().slice(0, 400) : "(none)"}`);
  }
}

const dump = path.join(outRoot, "probe-findings.txt");
fs.writeFileSync(dump, findings.join("\n"), "utf8");
log(`\nWROTE ${dump}`);
log("PROBE_DONE");
