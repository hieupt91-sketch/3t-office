/**
 * Probe BEFORE serializer: hand-written ODF 1.3 FODT with nested text:list
 * and text:list-style (1–3 levels, display-levels, 1/a/i, NĐ 30 prefix),
 * converted through real soffice to DOCX + canonical FODT.
 *
 * Records measured word/numbering.xml w:lvl and document.xml w:numPr/w:ilvl.
 * Not an implementation. Findings go to docs/HANDOFF-WRITER-MULTILEVEL-LIST-FINDINGS.md.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) throw new Error("soffice not found");

const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-multilevel-list-probe-"));
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

function levelProps(spaceBeforeCm) {
  return `<style:list-level-properties text:space-before="${spaceBeforeCm}cm" text:min-label-width="0.635cm"/>`;
}

function numberedLevel({ level, format, suffix = ".", prefix = "", displayLevels, spaceBefore }) {
  const attrs = [
    `text:level="${level}"`,
    `style:num-format="${format}"`
  ];
  if (prefix) attrs.push(`style:num-prefix="${prefix}"`);
  if (suffix !== "") attrs.push(`style:num-suffix="${suffix}"`);
  if (displayLevels) attrs.push(`text:display-levels="${displayLevels}"`);
  return `<text:list-level-style-number ${attrs.join(" ")}>${levelProps(spaceBefore)}</text:list-level-style-number>`;
}

const nestedThree = (styleAttr) => `
<text:list ${styleAttr}>
  <text:list-item>
    <text:p>L1_ONE</text:p>
    <text:list ${styleAttr}>
      <text:list-item>
        <text:p>L2_ONE</text:p>
        <text:list ${styleAttr}>
          <text:list-item>
            <text:p>L3_ONE</text:p>
          </text:list-item>
          <text:list-item>
            <text:p>L3_TWO</text:p>
          </text:list-item>
        </text:list>
      </text:list-item>
      <text:list-item>
        <text:p>L2_TWO</text:p>
      </text:list-item>
    </text:list>
  </text:list-item>
  <text:list-item>
    <text:p>L1_TWO</text:p>
  </text:list-item>
</text:list>
`;

const nestedThreeInherit = (rootStyle) => `
<text:list text:style-name="${rootStyle}">
  <text:list-item>
    <text:p>L1_ONE</text:p>
    <text:list>
      <text:list-item>
        <text:p>L2_ONE</text:p>
        <text:list>
          <text:list-item>
            <text:p>L3_ONE</text:p>
          </text:list-item>
          <text:list-item>
            <text:p>L3_TWO</text:p>
          </text:list-item>
        </text:list>
      </text:list-item>
      <text:list-item>
        <text:p>L2_TWO</text:p>
      </text:list-item>
    </text:list>
  </text:list-item>
  <text:list-item>
    <text:p>L1_TWO</text:p>
  </text:list-item>
</text:list>
`;

const vnCurrentStyles = '<text:list-style style:name="LBullet"><text:list-level-style-bullet text:level="1" text:bullet-char="•"><style:list-level-properties text:space-before="0.635cm" text:min-label-width="0.635cm"/></text:list-level-style-bullet></text:list-style><text:list-style style:name="LNumber"><text:list-level-style-number text:level="1" style:num-format="1" style:num-suffix="."><style:list-level-properties text:space-before="0.635cm" text:min-label-width="0.635cm"/></text:list-level-style-number></text:list-style>';

const decimal3 = `<text:list-style style:name="LMultiDecimal">${
  numberedLevel({ level: 1, format: "1", suffix: ".", spaceBefore: 0.635 })
}${
  numberedLevel({ level: 2, format: "1", suffix: ".", displayLevels: 2, spaceBefore: 1.27 })
}${
  numberedLevel({ level: 3, format: "1", suffix: ".", displayLevels: 3, spaceBefore: 1.905 })
}</text:list-style>`;

const letter3 = `<text:list-style style:name="LMultiLetter">${
  numberedLevel({ level: 1, format: "1", suffix: ".", spaceBefore: 0.635 })
}${
  numberedLevel({ level: 2, format: "a", suffix: ".", spaceBefore: 1.27 })
}${
  numberedLevel({ level: 3, format: "i", suffix: ".", spaceBefore: 1.905 })
}</text:list-style>`;

const nd30 = `<text:list-style style:name="LMultiNd30">${
  numberedLevel({ level: 1, format: "1", prefix: "Điều ", suffix: ".", spaceBefore: 0.635 })
}${
  numberedLevel({ level: 2, format: "1", suffix: ".", spaceBefore: 1.27 })
}${
  numberedLevel({ level: 3, format: "a", suffix: ")", spaceBefore: 1.905 })
}</text:list-style>`;

const nineLevels = `<text:list-style style:name="LNine">${
  [1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => numberedLevel({
    level,
    format: "1",
    suffix: ".",
    displayLevels: level,
    spaceBefore: 0.635 * level
  })).join("")
}</text:list-style>`;

function nestedNine() {
  let inner = "<text:p>L9</text:p>";
  for (let level = 8; level >= 1; level--) {
    inner = `<text:p>L${level}</text:p><text:list><text:list-item>${inner}</text:list-item></text:list>`;
  }
  return `<text:list text:style-name="LNine"><text:list-item>${inner}</text:list-item></text:list>`;
}

const cases = [
  {
    id: "vn-current-nested-LNumber-only-level1",
    styles: vnCurrentStyles,
    body: nestedThree('text:style-name="LNumber"')
  },
  {
    id: "decimal-display-levels-nested-same-style-name",
    styles: decimal3,
    body: nestedThree('text:style-name="LMultiDecimal"')
  },
  {
    id: "decimal-display-levels-nested-inherit-no-style-name",
    styles: decimal3,
    body: nestedThreeInherit("LMultiDecimal")
  },
  {
    id: "letter-1-a-i-nested-same-style-name",
    styles: letter3,
    body: nestedThree('text:style-name="LMultiLetter"')
  },
  {
    id: "nd30-dieu-khoan-diem",
    styles: nd30,
    body: nestedThree('text:style-name="LMultiNd30"')
  },
  {
    id: "nine-levels-display-levels",
    styles: nineLevels,
    body: nestedNine()
  },
  {
    id: "vn-current-mixed-ol-ul",
    styles: vnCurrentStyles,
    body: `<text:list text:style-name="LNumber"><text:list-item><text:p>NUM_ONE</text:p><text:list text:style-name="LBullet"><text:list-item><text:p>BULLET_CHILD</text:p></text:list-item></text:list></text:list-item><text:list-item><text:p>NUM_TWO</text:p></text:list-item></text:list>`
  }
];

function extractListStyles(fodt) {
  const styles = [];
  const re = /<text:list-style\b([^>]*)>([\s\S]*?)<\/text:list-style>/g;
  let match;
  while ((match = re.exec(fodt))) {
    const name = /style:name="([^"]+)"/.exec(match[1])?.[1] || "";
    const levels = [];
    const levelRe = /<text:list-level-style-(number|bullet)\b([^>]*)>/g;
    let levelMatch;
    while ((levelMatch = levelRe.exec(match[2]))) {
      const attrs = levelMatch[2];
      levels.push({
        kind: levelMatch[1],
        level: /text:level="([^"]+)"/.exec(attrs)?.[1] || "",
        format: /style:num-format="([^"]+)"/.exec(attrs)?.[1] || "",
        prefix: /style:num-prefix="([^"]*)"/.exec(attrs)?.[1] || "",
        suffix: /style:num-suffix="([^"]*)"/.exec(attrs)?.[1] || "",
        displayLevels: /text:display-levels="([^"]+)"/.exec(attrs)?.[1] || "",
        bullet: /text:bullet-char="([^"]*)"/.exec(attrs)?.[1] || ""
      });
    }
    styles.push({ name, levels });
  }
  return styles;
}

function extractDocxNumbering(numberingXml) {
  const abstracts = [];
  const abstractRe = /<w:abstractNum\b([^>]*)>([\s\S]*?)<\/w:abstractNum>/g;
  let match;
  while ((match = abstractRe.exec(numberingXml))) {
    const id = /w:abstractNumId="([^"]+)"/.exec(match[1])?.[1] || "";
    const lvls = [];
    const lvlRe = /<w:lvl\b([^>]*)>([\s\S]*?)<\/w:lvl>/g;
    let lvlMatch;
    while ((lvlMatch = lvlRe.exec(match[2]))) {
      const body = lvlMatch[2];
      lvls.push({
        ilvl: /w:ilvl="([^"]+)"/.exec(lvlMatch[1])?.[1] || "",
        start: /<w:start\b[^>]*w:val="([^"]+)"/.exec(body)?.[1] || "",
        numFmt: /<w:numFmt\b[^>]*w:val="([^"]+)"/.exec(body)?.[1] || "",
        lvlText: /<w:lvlText\b[^>]*w:val="([^"]+)"/.exec(body)?.[1] || "",
        lvlJc: /<w:lvlJc\b[^>]*w:val="([^"]+)"/.exec(body)?.[1] || ""
      });
    }
    abstracts.push({ id, lvls });
  }
  const nums = [];
  const numRe = /<w:num\b([^>]*)>([\s\S]*?)<\/w:num>/g;
  while ((match = numRe.exec(numberingXml))) {
    nums.push({
      numId: /w:numId="([^"]+)"/.exec(match[1])?.[1] || "",
      abstractNumId: /<w:abstractNumId\b[^>]*w:val="([^"]+)"/.exec(match[2])?.[1] || ""
    });
  }
  return { abstracts, nums };
}

function extractParaNumPr(documentXml) {
  const paras = [];
  const re = /<w:p\b[\s\S]*?<\/w:p>/g;
  let match;
  while ((match = re.exec(documentXml))) {
    const xml = match[0];
    const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const numPr = xml.match(/<w:numPr\b[\s\S]*?<\/w:numPr>/)?.[0] || "";
    paras.push({
      text,
      ilvl: /<w:ilvl\b[^>]*w:val="([^"]+)"/.exec(numPr)?.[1] ?? null,
      numId: /<w:numId\b[^>]*w:val="([^"]+)"/.exec(numPr)?.[1] ?? null,
      numPr
    });
  }
  return paras;
}

const report = [];

for (const testCase of cases) {
  const fodt = wrapDocument(testCase.styles, testCase.body);
  const caseDir = path.join(outRoot, testCase.id);
  fs.mkdirSync(caseDir, { recursive: true });
  const source = path.join(caseDir, `${testCase.id}.fodt`);
  fs.writeFileSync(source, fodt, "utf8");

  const row = { id: testCase.id, source };
  try {
    const docx = convertWithSoffice(source, "docx", path.join(caseDir, "docx"), {
      appKind: "writer",
      profileDir: path.join(caseDir, "profile-docx")
    });
    const entries = listZipEntries(docx).map((entry) => entry.name);
    row.docxEntries = entries.filter((name) => name.startsWith("word/"));
    const numberingXml = entries.includes("word/numbering.xml")
      ? readZipEntry(docx, "word/numbering.xml").toString("utf8")
      : "";
    const documentXml = readZipEntry(docx, "word/document.xml").toString("utf8");
    fs.writeFileSync(path.join(caseDir, "numbering.xml"), numberingXml, "utf8");
    fs.writeFileSync(path.join(caseDir, "document.xml"), documentXml, "utf8");
    row.numbering = extractDocxNumbering(numberingXml);
    row.paras = extractParaNumPr(documentXml).filter((p) => p.text);
  } catch (error) {
    row.docxError = String(error.message || error);
  }

  try {
    const canonical = convertWithSoffice(source, "fodt", path.join(caseDir, "fodt"), {
      appKind: "writer",
      profileDir: path.join(caseDir, "profile-fodt")
    });
    const canonicalXml = fs.readFileSync(canonical, "utf8");
    fs.writeFileSync(path.join(caseDir, "canonical.fodt"), canonicalXml, "utf8");
    row.canonicalListStyles = extractListStyles(canonicalXml);
    const nestedCount = (canonicalXml.match(/<text:list\b/g) || []).length;
    const styleNameOnNested = (canonicalXml.match(/<text:list text:style-name=/g) || []).length;
    row.canonicalListCount = nestedCount;
    row.canonicalStyledListCount = styleNameOnNested;
  } catch (error) {
    row.fodtError = String(error.message || error);
  }

  report.push(row);
  log(`\n===== CASE ${testCase.id} =====`);
  log(JSON.stringify(row, null, 2));
}

const reportPath = path.join(outRoot, "probe-report.json");
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
log(`\nREPORT=${reportPath}`);
log("PROBE_DONE");
