/**
 * Probe BEFORE serializer: hand-written ODF 1.3 FODT with
 * text:linenumbering-configuration, converted through real soffice to
 * DOCX + canonical FODT. Records measured w:lnNumType attributes.
 *
 * Not an implementation. Findings go to docs/HANDOFF-WRITER-LINE-NUMBERS-FINDINGS.md.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) throw new Error("soffice not found");

const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-line-numbers-probe-"));
function log(line) {
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
  'xmlns:xlink="http://www.w3.org/1999/xlink"',
  'xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"',
  'xmlns:dc="http://purl.org/dc/elements/1.1/"'
].join(" ");

function wrapDocument({ officeStyles = "", automaticStyles = "", body, meta = "" }) {
  const metaXml = meta ? `<office:meta>${meta}</office:meta>` : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
${metaXml}
${officeStyles}
<office:automatic-styles>
<style:page-layout style:name="pm1">
  <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/>
</style:page-layout>
${automaticStyles}
</office:automatic-styles>
<office:master-styles>
<style:master-page style:name="Standard" style:page-layout-name="pm1"/>
</office:master-styles>
<office:body><office:text>
${body}
</office:text></office:body>
</office:document>
`;
}

function lineNumberingConfig(attrs) {
  return `<office:styles><text:linenumbering-configuration ${attrs}/></office:styles>`;
}

const longPara = "LINE_PROBE " + "van ban hanh chinh Viet Nam trich dan theo so dong. ".repeat(40);

const cases = [
  {
    id: "plain-none",
    fodt: wrapDocument({
      body: "<text:p>PLAIN_NO_LINENUM</text:p>"
    })
  },
  {
    id: "on-increment-1-continuous",
    fodt: wrapDocument({
      officeStyles: lineNumberingConfig('text:number-lines="true" text:increment="1" text:number-position="left" style:num-format="1"'),
      body: `<text:p>${longPara}</text:p><text:p>SECOND_PARA</text:p>`
    })
  },
  {
    id: "on-increment-1-restart-page",
    fodt: wrapDocument({
      officeStyles: lineNumberingConfig('text:number-lines="true" text:increment="1" text:restart-on-page="true" text:number-position="left" style:num-format="1"'),
      body: `<text:p>${longPara}</text:p>`
    })
  },
  {
    id: "on-increment-5",
    fodt: wrapDocument({
      officeStyles: lineNumberingConfig('text:number-lines="true" text:increment="5" text:number-position="left" style:num-format="1"'),
      body: "<text:p>EVERY_FIFTH</text:p>"
    })
  },
  {
    id: "off-explicit",
    fodt: wrapDocument({
      officeStyles: lineNumberingConfig('text:number-lines="false" text:increment="1" text:number-position="left" style:num-format="1"'),
      body: "<text:p>EXPLICIT_OFF</text:p>"
    })
  },
  {
    id: "on-omit-number-lines-attr",
    fodt: wrapDocument({
      officeStyles: lineNumberingConfig('text:increment="1" text:number-position="left" style:num-format="1"'),
      body: "<text:p>OMIT_NUMBER_LINES_MEANS_ON</text:p>"
    })
  },
  {
    id: "on-omit-increment",
    fodt: wrapDocument({
      officeStyles: lineNumberingConfig('text:number-lines="true" text:number-position="left" style:num-format="1"'),
      body: "<text:p>OMIT_INCREMENT</text:p>"
    })
  },
  {
    id: "on-offset-05cm",
    fodt: wrapDocument({
      officeStyles: lineNumberingConfig('text:number-lines="true" text:increment="1" text:offset="0.5cm" text:number-position="left" style:num-format="1"'),
      body: "<text:p>OFFSET_HALF_CM</text:p>"
    })
  },
  {
    id: "on-count-empty-false",
    fodt: wrapDocument({
      officeStyles: lineNumberingConfig('text:number-lines="true" text:increment="1" text:count-empty-lines="false" text:number-position="left" style:num-format="1"'),
      body: "<text:p>COUNT_EMPTY_FALSE</text:p>"
    })
  },
  {
    id: "two-master-pages-continuous",
    fodt: `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:styles><text:linenumbering-configuration text:number-lines="true" text:increment="1" text:number-position="left" style:num-format="1"/></office:styles>
<office:automatic-styles>
<style:page-layout style:name="pm1">
  <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/>
</style:page-layout>
<style:style style:name="P2" style:family="paragraph" style:master-page-name="Landscape">
  <style:paragraph-properties fo:break-before="page"/>
</style:style>
<style:page-layout style:name="pm2">
  <style:page-layout-properties fo:page-width="29.7cm" fo:page-height="21cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="landscape"/>
</style:page-layout>
</office:automatic-styles>
<office:master-styles>
<style:master-page style:name="Standard" style:page-layout-name="pm1"/>
<style:master-page style:name="Landscape" style:page-layout-name="pm2"/>
</office:master-styles>
<office:body><office:text>
<text:p>SECTION_ONE</text:p>
<text:p text:style-name="P2">SECTION_TWO</text:p>
</office:text></office:body>
</office:document>
`
  },
  {
    id: "meta-restart-section",
    fodt: wrapDocument({
      officeStyles: lineNumberingConfig('text:number-lines="true" text:increment="1" text:number-position="left" style:num-format="1"'),
      meta: '<meta:user-defined meta:name="vnd.vn-office.line-numbers-restart">section</meta:user-defined>',
      body: "<text:p>META_SECTION_RESTART</text:p>"
    })
  }
];

function extractLnNumTypes(documentXml) {
  const hits = [];
  const re = /<w:lnNumType\b[^/]*\/>/g;
  let match;
  while ((match = re.exec(documentXml))) {
    const xml = match[0];
    hits.push({
      xml,
      countBy: xml.match(/w:countBy="([^"]+)"/)?.[1] ?? null,
      restart: xml.match(/w:restart="([^"]+)"/)?.[1] ?? null,
      distance: xml.match(/w:distance="([^"]+)"/)?.[1] ?? null,
      start: xml.match(/w:start="([^"]+)"/)?.[1] ?? null
    });
  }
  return hits;
}

function extractLineNumberingConfig(fodtXml) {
  const match = fodtXml.match(/<text:linenumbering-configuration\b([^>]*)\/?\s*>/);
  if (!match) return null;
  return match[0];
}

function extractMetaRestart(fodtXml) {
  const match = fodtXml.match(/<meta:user-defined\b[^>]*meta:name="vnd\.vn-office\.line-numbers-restart"[^>]*>([\s\S]*?)<\/meta:user-defined>/);
  return match ? match[1] : null;
}

function extractSectPrBlocks(documentXml) {
  const blocks = [];
  const re = /<w:sectPr\b[\s\S]*?<\/w:sectPr>/g;
  let match;
  while ((match = re.exec(documentXml))) blocks.push(match[0]);
  return blocks;
}

for (const item of cases) {
  log(`\n======== CASE ${item.id} ========`);
  const dir = path.join(outRoot, item.id);
  fs.mkdirSync(dir, { recursive: true });
  const source = path.join(dir, `${item.id}.fodt`);
  fs.writeFileSync(source, item.fodt, "utf8");

  const docx = convertWithSoffice(source, "docx", path.join(dir, "docx"), {
    appKind: "writer",
    profileDir: path.join(dir, "profile-docx")
  });
  const entries = listZipEntries(docx).map((entry) => entry.name);
  log(`DOCX_ENTRIES=${entries.filter((name) => name.startsWith("word/")).join(",")}`);
  const documentXml = readZipEntry(docx, "word/document.xml").toString("utf8");
  fs.writeFileSync(path.join(dir, "document.xml"), documentXml, "utf8");
  const ln = extractLnNumTypes(documentXml);
  log(`LN_NUM_TYPE_COUNT=${ln.length}`);
  ln.forEach((hit, index) => log(`LN[${index}]=${JSON.stringify(hit)}`));
  const sectPr = extractSectPrBlocks(documentXml);
  log(`SECTPR_COUNT=${sectPr.length}`);
  sectPr.forEach((block, index) => {
    const has = /<w:lnNumType\b/.test(block);
    log(`SECTPR[${index}]_HAS_LN=${has}`);
    if (has) {
      const xml = block.match(/<w:lnNumType\b[^/]*\/>/)?.[0];
      log(`SECTPR[${index}]_LN=${xml}`);
    }
  });

  const canonical = convertWithSoffice(source, "fodt", path.join(dir, "canonical"), {
    appKind: "writer",
    profileDir: path.join(dir, "profile-fodt")
  });
  const canonicalXml = fs.readFileSync(canonical, "utf8");
  fs.writeFileSync(path.join(dir, "canonical.fodt"), canonicalXml, "utf8");
  log(`CANONICAL_CONFIG=${extractLineNumberingConfig(canonicalXml) || "(absent)"}`);
  log(`CANONICAL_META_RESTART=${extractMetaRestart(canonicalXml) || "(absent)"}`);
}

log(`\nPROBE_DONE root=${outRoot}`);
