/**
 * Probe BEFORE serializer: hand-written ODF 1.3 FODT with fo:margin-top /
 * fo:margin-bottom on style:paragraph-properties, converted through real
 * soffice to DOCX + canonical FODT. Records measured w:spacing twips.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) throw new Error("soffice not found");

const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-para-spacing-probe-"));
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
  'xmlns:xlink="http://www.w3.org/1999/xlink"'
].join(" ");

function wrapDocument(automaticStyles, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
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

function paraStyle(name, attrs) {
  return `<style:style style:name="${name}" style:family="paragraph"><style:paragraph-properties ${attrs}/></style:style>`;
}

const cases = [
  {
    id: "pt-12-6",
    styles: paraStyle("P1", 'fo:margin-top="12pt" fo:margin-bottom="6pt"'),
    body: '<text:p text:style-name="P1">PARA_PT_12_6</text:p>'
  },
  {
    id: "pt-0-8",
    styles: paraStyle("P1", 'fo:margin-top="0pt" fo:margin-bottom="8pt"'),
    body: '<text:p text:style-name="P1">PARA_PT_0_8</text:p>'
  },
  {
    id: "pt-18-0",
    styles: paraStyle("P1", 'fo:margin-top="18pt" fo:margin-bottom="0pt"'),
    body: '<text:p text:style-name="P1">PARA_PT_18_0</text:p>'
  },
  {
    id: "cm-12pt-equiv",
    styles: paraStyle("P1", 'fo:margin-top="0.423cm" fo:margin-bottom="0.211cm"'),
    body: '<text:p text:style-name="P1">PARA_CM_12_6</text:p>'
  },
  {
    id: "no-margin-plain",
    styles: "",
    body: "<text:p>PARA_PLAIN</text:p>"
  },
  {
    id: "two-paras-different",
    styles: paraStyle("P1", 'fo:margin-top="12pt" fo:margin-bottom="6pt"')
      + paraStyle("P2", 'fo:margin-top="0pt" fo:margin-bottom="18pt" fo:text-align="center"'),
    body: '<text:p text:style-name="P1">PARA_A</text:p><text:p text:style-name="P2">PARA_B</text:p>'
  },
  {
    id: "margin-top-only",
    styles: paraStyle("P1", 'fo:margin-top="12pt"'),
    body: '<text:p text:style-name="P1">PARA_TOP_ONLY</text:p>'
  },
  {
    id: "margin-bottom-only",
    styles: paraStyle("P1", 'fo:margin-bottom="8pt"'),
    body: '<text:p text:style-name="P1">PARA_BOTTOM_ONLY</text:p>'
  }
];

function extractSpacing(documentXml) {
  const paras = [];
  const re = /<w:p\b[\s\S]*?<\/w:p>/g;
  let match;
  while ((match = re.exec(documentXml))) {
    const block = match[0];
    const text = block.replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n")
      .replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
      .replace(/\s+/g, " ").trim();
    const spacingTag = block.match(/<w:spacing\b[^/]*\/>/)?.[0]
      || block.match(/<w:spacing\b[\s\S]*?<\/w:spacing>/)?.[0]
      || "";
    const before = spacingTag.match(/w:before="([^"]+)"/)?.[1] ?? null;
    const after = spacingTag.match(/w:after="([^"]+)"/)?.[1] ?? null;
    const beforeAutospacing = spacingTag.match(/w:beforeAutospacing="([^"]+)"/)?.[1] ?? null;
    const afterAutospacing = spacingTag.match(/w:afterAutospacing="([^"]+)"/)?.[1] ?? null;
    const beforeLines = spacingTag.match(/w:beforeLines="([^"]+)"/)?.[1] ?? null;
    const afterLines = spacingTag.match(/w:afterLines="([^"]+)"/)?.[1] ?? null;
    paras.push({ text, spacingTag, before, after, beforeAutospacing, afterAutospacing, beforeLines, afterLines });
  }
  return paras;
}

function extractFodtMargins(fodtXml) {
  const styles = [];
  fodtXml.replace(/<style:style\b([^>]*)>([\s\S]*?)<\/style:style>/gi, (_, attrs, content) => {
    if (!/style:family="paragraph"/i.test(attrs)) return "";
    const name = attrs.match(/style:name="([^"]+)"/)?.[1];
    const prop = content.match(/<style:paragraph-properties\b([^>]*)\/?\s*>/i)?.[1] || "";
    styles.push({
      name,
      marginTop: prop.match(/fo:margin-top="([^"]+)"/)?.[1] ?? null,
      marginBottom: prop.match(/fo:margin-bottom="([^"]+)"/)?.[1] ?? null,
      margin: prop.match(/\bfo:margin="([^"]+)"/)?.[1] ?? null,
      props: prop.trim()
    });
    return "";
  });
  return styles;
}

for (const item of cases) {
  const fodt = wrapDocument(item.styles, item.body);
  const fodtPath = path.join(outRoot, `${item.id}.fodt`);
  fs.writeFileSync(fodtPath, fodt, "utf8");
  log(`\n===== CASE ${item.id} =====`);

  const docx = convertWithSoffice(fodtPath, "docx", path.join(outRoot, `${item.id}-docx`), {
    appKind: "writer",
    profileDir: path.join(outRoot, `profile-${item.id}-docx`)
  });
  const entries = listZipEntries(docx).map(entry => entry.name);
  log(`DOCX_ENTRIES=${entries.filter(name => name.startsWith("word/")).join(",")}`);
  const documentXml = readZipEntry(docx, "word/document.xml").toString("utf8");
  const stylesXml = entries.includes("word/styles.xml")
    ? readZipEntry(docx, "word/styles.xml").toString("utf8")
    : "";
  fs.writeFileSync(path.join(outRoot, `${item.id}-document.xml`), documentXml, "utf8");
  if (stylesXml) fs.writeFileSync(path.join(outRoot, `${item.id}-styles.xml`), stylesXml, "utf8");

  const paras = extractSpacing(documentXml);
  for (const para of paras) {
    log(`DOCX_P text=${JSON.stringify(para.text)} spacing=${para.spacingTag || "(none)"} before=${para.before} after=${para.after} beforeAuto=${para.beforeAutospacing} afterAuto=${para.afterAutospacing} beforeLines=${para.beforeLines} afterLines=${para.afterLines}`);
  }

  const normalStyle = stylesXml.match(/<w:style\b[^>]*w:styleId="Normal"[\s\S]*?<\/w:style>/);
  if (normalStyle) {
    const spacing = normalStyle[0].match(/<w:spacing\b[^/]*\/>/)?.[0] || "(no spacing on Normal)";
    log(`DOCX_NORMAL_STYLE_SPACING=${spacing}`);
  }

  const canonical = convertWithSoffice(fodtPath, "fodt", path.join(outRoot, `${item.id}-fodt`), {
    appKind: "writer",
    profileDir: path.join(outRoot, `profile-${item.id}-fodt`)
  });
  const canonicalXml = fs.readFileSync(canonical, "utf8");
  fs.writeFileSync(path.join(outRoot, `${item.id}-canonical.fodt`), canonicalXml, "utf8");
  const fodtStyles = extractFodtMargins(canonicalXml);
  for (const style of fodtStyles) {
    if (style.marginTop || style.marginBottom || style.margin || style.name === "P1" || style.name === "P2") {
      log(`CANONICAL_STYLE name=${style.name} top=${style.marginTop} bottom=${style.marginBottom} margin=${style.margin} props=${style.props}`);
    }
  }
}

log(`\nDONE probe root ${outRoot}`);
