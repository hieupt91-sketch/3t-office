/**
 * Follow-up probe: minimum office:change-info that LibreOffice keeps
 * when converting FODT tracked-changes to DOCX. Session Writer changes
 * have no author/date — we must know what fallback survives.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

if (!findSoffice()) throw new Error("soffice not found");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodt-e1-cinfo-"));
console.log(`PROBE_ROOT=${outRoot}`);

const NS = [
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
  'xmlns:dc="http://purl.org/dc/elements/1.1/"'
].join(" ");

function wrap(infoXml, label) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>
<style:page-layout style:name="pmA4">
  <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="2.5cm" fo:margin-right="2cm" style:print-orientation="portrait"/>
</style:page-layout>
</office:automatic-styles>
<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pmA4"/></office:master-styles>
<office:body><office:text>
<text:tracked-changes>
  <text:changed-region xml:id="ct1" text:id="ct1">
    <text:insertion><office:change-info>${infoXml}</office:change-info></text:insertion>
  </text:changed-region>
</text:tracked-changes>
<text:p>${label} <text:change-start text:change-id="ct1"/>KEEP_ME<text:change-end text:change-id="ct1"/>.</text:p>
</office:text></office:body>
</office:document>`;
}

function collect(documentXml) {
  const items = [];
  const re = /<w:ins\b([^>]*)>([\s\S]*?)<\/w:ins>/gi;
  let match;
  while ((match = re.exec(documentXml))) {
    items.push({
      attrs: match[1].replace(/\s+/g, " ").trim(),
      hasText: /KEEP_ME/.test(match[2])
    });
  }
  return items;
}

const cases = {
  "creator-only": "<dc:creator>VN Writer</dc:creator>",
  "date-only": "<dc:date>2026-09-06T12:00:00</dc:date>",
  "empty-creator-plus-date": "<dc:creator></dc:creator><dc:date>2026-09-06T12:00:00</dc:date>",
  "creator-plus-empty-date": "<dc:creator>VN Writer</dc:creator><dc:date></dc:date>",
  "both-vn-writer": "<dc:creator>VN Writer</dc:creator><dc:date>2026-01-01T00:00:00</dc:date>",
  "unknown-plus-date": "<dc:creator>Unknown</dc:creator><dc:date>2026-09-06T12:00:00</dc:date>",
  "whitespace-creator": "<dc:creator> </dc:creator><dc:date>2026-09-06T12:00:00</dc:date>"
};

for (const [name, info] of Object.entries(cases)) {
  const dir = path.join(outRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  const fodtPath = path.join(dir, `${name}.fodt`);
  fs.writeFileSync(fodtPath, wrap(info, name), "utf8");
  try {
    const docx = convertWithSoffice(fodtPath, "docx", path.join(dir, "docx"), {
      appKind: "writer", profileDir: path.join(dir, "profile-docx")
    });
    const canonical = convertWithSoffice(fodtPath, "fodt", path.join(dir, "canonical"), {
      appKind: "writer", profileDir: path.join(dir, "profile-fodt")
    });
    const documentXml = readZipEntry(docx, "word/document.xml")?.toString("utf8") || "";
    const canonicalXml = fs.readFileSync(canonical, "utf8");
    const ins = collect(documentXml);
    const keptRegion = /<text:changed-region\b/.test(canonicalXml) && /<text:insertion\b/.test(canonicalXml);
    const creator = (canonicalXml.match(/<dc:creator>([\s\S]*?)<\/dc:creator>/) || [])[1] ?? "(absent)";
    const date = (canonicalXml.match(/<dc:date>([\s\S]*?)<\/dc:date>/) || [])[1] ?? "(absent)";
    console.log(`${name}: w:ins=${ins.length} keptOdfRegion=${keptRegion} creator=${JSON.stringify(creator)} date=${JSON.stringify(date)} insAttrs=${JSON.stringify(ins)}`);
  } catch (error) {
    console.log(`${name}: CONVERT_ERROR ${error.message}`);
  }
}
