/**
 * Phase E.1 measurement probe — run BEFORE serializer code.
 * Hand-written ODF 1.3 FODT with text:tracked-changes / text:changed-region /
 * text:insertion / text:deletion / text:change-start / text:change-end /
 * text:change, converted through real soffice to DOCX + canonical FODT.
 * Records measured XML (w:ins / w:del / w:author / w:date / w:delText).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) throw new Error("soffice not found");

const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodt-e1-probe-"));
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
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
  'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"',
  'xmlns:dc="http://purl.org/dc/elements/1.1/"',
  'xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"',
  'xmlns:ooo="http://openoffice.org/2004/office"'
].join(" ");

function wrapDocument({ settings = "", styles = "", automatic = "", body }) {
  const settingsXml = settings
    ? `<office:settings>${settings}</office:settings>`
    : "";
  const autoXml = automatic
    ? `<office:automatic-styles>${automatic}</office:automatic-styles>`
    : `<office:automatic-styles>
<style:page-layout style:name="pmA4">
  <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="2.5cm" fo:margin-right="2cm" style:print-orientation="portrait"/>
</style:page-layout>
</office:automatic-styles>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
${settingsXml}
<office:styles>${styles}</office:styles>
${autoXml}
<office:master-styles>
  <style:master-page style:name="Standard" style:page-layout-name="pmA4"/>
</office:master-styles>
<office:body><office:text>
${body}
</office:text></office:body>
</office:document>
`;
}

const showRedlineSettings = `<config:config-item-set config:name="ooo:view-settings">
  <config:config-item config:name="ShowRedlineChanges" config:type="boolean">true</config:config-item>
</config:config-item-set>
<config:config-item-set config:name="ooo:configuration-settings">
  <config:config-item config:name="RecordChanges" config:type="boolean">true</config:config-item>
</config:config-item-set>`;

function changeInfo(creator = "Nguyen Van An", date = "2026-09-05T08:15:00") {
  const creatorXml = creator == null ? "" : `<dc:creator>${creator}</dc:creator>`;
  const dateXml = date == null ? "" : `<dc:date>${date}</dc:date>`;
  return `<office:change-info>${creatorXml}${dateXml}</office:change-info>`;
}

function snippet(xml, pattern, max = 700) {
  const match = String(xml || "").match(pattern);
  if (!match) return "(no match)";
  const start = Math.max(0, match.index - 60);
  return String(xml).slice(start, start + max).replace(/\s+/g, " ");
}

function count(xml, pattern) {
  return (String(xml || "").match(pattern) || []).length;
}

function xmlText(xml) {
  return String(xml || "").replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

function collectInsDel(documentXml) {
  const items = [];
  const re = /<w:(ins|del)\b([^>]*)>([\s\S]*?)<\/w:\1>/gi;
  let match;
  while ((match = re.exec(String(documentXml || "")))) {
    const kind = match[1].toLowerCase();
    const attrs = match[2] || "";
    const inner = match[3] || "";
    const author = (attrs.match(/\bw:author="([^"]*)"/i) || [])[1] || "";
    const date = (attrs.match(/\bw:date="([^"]*)"/i) || [])[1] || "";
    const id = (attrs.match(/\bw:id="([^"]*)"/i) || [])[1] || "";
    const texts = [];
    const textRe = /<w:(?:t|delText)\b[^>]*>([\s\S]*?)<\/w:(?:t|delText)>/gi;
    let textMatch;
    while ((textMatch = textRe.exec(inner))) texts.push(textMatch[1]);
    items.push({
      kind,
      id,
      author,
      date,
      text: texts.join(""),
      openTag: `<w:${kind}${attrs}>`.replace(/\s+/g, " ").trim()
    });
  }
  return items;
}

function collectOdfRegions(fodt) {
  return {
    trackedChanges: count(fodt, /<text:tracked-changes\b/g),
    changedRegion: count(fodt, /<text:changed-region\b/g),
    insertion: count(fodt, /<text:insertion\b/g),
    deletion: count(fodt, /<text:deletion\b/g),
    formatChange: count(fodt, /<text:format-change\b/g),
    changeStart: count(fodt, /<text:change-start\b/g),
    changeEnd: count(fodt, /<text:change-end\b/g),
    changeEmpty: count(fodt, /<text:change\b/g),
    changeInfo: count(fodt, /<office:change-info\b/g),
    dcCreator: count(fodt, /<dc:creator>/g),
    dcDate: count(fodt, /<dc:date>/g)
  };
}

const fixtures = {
  "01-sample-insert-startend-delete-empty": wrapDocument({
    settings: showRedlineSettings,
    body: `<text:tracked-changes text:track-changes="true">
  <text:changed-region xml:id="ct-insert-khan" text:id="ct-insert-khan">
    <text:insertion>${changeInfo("Nguyen Van An", "2026-09-05T08:15:00")}</text:insertion>
  </text:changed-region>
  <text:changed-region xml:id="ct-delete-ban-nhap" text:id="ct-delete-ban-nhap">
    <text:deletion>
      ${changeInfo("Nguyen Van An", "2026-09-05T08:16:00")}
      <text:p>bản nháp nội bộ </text:p>
    </text:deletion>
  </text:changed-region>
</text:tracked-changes>
<text:p>Kính gửi Ban Giám đốc. Phòng kế toán đã hoàn thành <text:change text:change-id="ct-delete-ban-nhap"/><text:change-start text:change-id="ct-insert-khan"/>theo yêu cầu khẩn <text:change-end text:change-id="ct-insert-khan"/>báo cáo quý III.</text:p>`
  }),

  "02-insert-only-startend": wrapDocument({
    settings: showRedlineSettings,
    body: `<text:tracked-changes text:track-changes="true">
  <text:changed-region xml:id="ct1" text:id="ct1">
    <text:insertion>${changeInfo("Tran Thi Hoa", "2026-09-06T10:00:00")}</text:insertion>
  </text:changed-region>
</text:tracked-changes>
<text:p>Đề nghị phê duyệt <text:change-start text:change-id="ct1"/>INSERT_ONLY_TEXT<text:change-end text:change-id="ct1"/> theo phương án đã thống nhất.</text:p>`
  }),

  "03-delete-only-empty-change": wrapDocument({
    settings: showRedlineSettings,
    body: `<text:tracked-changes text:track-changes="true">
  <text:changed-region xml:id="ct2" text:id="ct2">
    <text:deletion>
      ${changeInfo("Le Van Cuong", "2026-09-06T10:05:00")}
      <text:p>DELETE_ONLY_TEXT</text:p>
    </text:deletion>
  </text:changed-region>
</text:tracked-changes>
<text:p>Nội dung còn lại <text:change text:change-id="ct2"/>sau chỗ xóa.</text:p>`
  }),

  "04-delete-wrapped-startend-in-body": wrapDocument({
    settings: showRedlineSettings,
    body: `<text:tracked-changes text:track-changes="true">
  <text:changed-region xml:id="ct3" text:id="ct3">
    <text:deletion>
      ${changeInfo("Pham Minh Duc", "2026-09-06T10:10:00")}
      <text:p>DELETE_WRAPPED_BODY</text:p>
    </text:deletion>
  </text:changed-region>
</text:tracked-changes>
<text:p>Trước <text:change-start text:change-id="ct3"/>DELETE_WRAPPED_BODY<text:change-end text:change-id="ct3"/> sau.</text:p>`
  }),

  "05-insert-empty-change-marker": wrapDocument({
    settings: showRedlineSettings,
    body: `<text:tracked-changes text:track-changes="true">
  <text:changed-region xml:id="ct4" text:id="ct4">
    <text:insertion>${changeInfo("Unknown", "2026-09-06T10:15:00")}</text:insertion>
  </text:changed-region>
</text:tracked-changes>
<text:p>Trước <text:change text:change-id="ct4"/>INSERT_EMPTY_MARKER sau.</text:p>`
  }),

  "06-no-author-no-date": wrapDocument({
    settings: showRedlineSettings,
    body: `<text:tracked-changes text:track-changes="true">
  <text:changed-region xml:id="ct5" text:id="ct5">
    <text:insertion><office:change-info/></text:insertion>
  </text:changed-region>
  <text:changed-region xml:id="ct6" text:id="ct6">
    <text:deletion>
      <office:change-info/>
      <text:p>SESSION_DELETE</text:p>
    </text:deletion>
  </text:changed-region>
</text:tracked-changes>
<text:p>Gốc <text:change text:change-id="ct6"/><text:change-start text:change-id="ct5"/>SESSION_INSERT<text:change-end text:change-id="ct5"/> còn lại.</text:p>`
  }),

  "07-format-change": wrapDocument({
    settings: showRedlineSettings,
    body: `<text:tracked-changes text:track-changes="true">
  <text:changed-region xml:id="ct7" text:id="ct7">
    <text:format-change>${changeInfo("Format Author", "2026-09-06T10:20:00")}</text:format-change>
  </text:changed-region>
</text:tracked-changes>
<text:p>Chữ thường <text:change-start text:change-id="ct7"/><text:span text:style-name="TBold">FORMAT_CHANGE_BOLD</text:span><text:change-end text:change-id="ct7"/> hết.</text:p>`,
    automatic: `<style:page-layout style:name="pmA4">
  <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="2.5cm" fo:margin-right="2cm" style:print-orientation="portrait"/>
</style:page-layout>
<style:style style:name="TBold" style:family="text">
  <style:text-properties fo:font-weight="bold"/>
</style:style>`
  }),

  "08-no-settings-block": wrapDocument({
    body: `<text:tracked-changes text:track-changes="true">
  <text:changed-region xml:id="ct8" text:id="ct8">
    <text:insertion>${changeInfo("No Settings", "2026-09-06T10:25:00")}</text:insertion>
  </text:changed-region>
</text:tracked-changes>
<text:p>Không settings <text:change-start text:change-id="ct8"/>NO_SETTINGS_INSERT<text:change-end text:change-id="ct8"/>.</text:p>`
  }),

  "09-insert-with-inline-bold": wrapDocument({
    settings: showRedlineSettings,
    body: `<text:tracked-changes text:track-changes="true">
  <text:changed-region xml:id="ct9" text:id="ct9">
    <text:insertion>${changeInfo("Bold Author", "2026-09-06T10:30:00")}</text:insertion>
  </text:changed-region>
</text:tracked-changes>
<text:p>Có <text:change-start text:change-id="ct9"/>chèn <text:span text:style-name="TBold">INSERT_BOLD</text:span> chữ<text:change-end text:change-id="ct9"/> vào.</text:p>`,
    automatic: `<style:page-layout style:name="pmA4">
  <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="2.5cm" fo:margin-right="2cm" style:print-orientation="portrait"/>
</style:page-layout>
<style:style style:name="TBold" style:family="text">
  <style:text-properties fo:font-weight="bold"/>
</style:style>`
  }),

  "10-text-id-only-no-xml-id": wrapDocument({
    settings: showRedlineSettings,
    body: `<text:tracked-changes text:track-changes="true">
  <text:changed-region text:id="ct10">
    <text:insertion>${changeInfo("Id Only", "2026-09-06T10:35:00")}</text:insertion>
  </text:changed-region>
</text:tracked-changes>
<text:p>Id only <text:change-start text:change-id="ct10"/>ID_ONLY_INSERT<text:change-end text:change-id="ct10"/>.</text:p>`
  })
};

for (const [name, fodt] of Object.entries(fixtures)) {
  log(`\n========== ${name} ==========`);
  const dir = path.join(outRoot, name);
  fs.mkdirSync(dir, { recursive: true });
  const fodtPath = path.join(dir, `${name}.fodt`);
  fs.writeFileSync(fodtPath, fodt, "utf8");
  try {
    const docx = convertWithSoffice(fodtPath, "docx", path.join(dir, "docx"), {
      appKind: "writer",
      profileDir: path.join(dir, "profile-docx")
    });
    const canonical = convertWithSoffice(fodtPath, "fodt", path.join(dir, "canonical"), {
      appKind: "writer",
      profileDir: path.join(dir, "profile-fodt")
    });
    const names = listZipEntries(docx).map(entry => entry.name);
    const documentXml = readZipEntry(docx, "word/document.xml")?.toString("utf8") || "";
    const settingsXml = names.includes("word/settings.xml")
      ? (readZipEntry(docx, "word/settings.xml")?.toString("utf8") || "")
      : "";
    const peopleXml = names.includes("word/people.xml")
      ? (readZipEntry(docx, "word/people.xml")?.toString("utf8") || "")
      : "";
    const canonicalXml = fs.readFileSync(canonical, "utf8");
    const revisions = collectInsDel(documentXml);
    log(`DOCX=${docx} bytes=${fs.statSync(docx).size}`);
    log(`ZIP_HAS_DOCUMENT=${names.includes("word/document.xml")}`);
    log(`ZIP_HAS_SETTINGS=${names.includes("word/settings.xml")}`);
    log(`w:ins count=${count(documentXml, /<w:ins\b/g)}`);
    log(`w:del count=${count(documentXml, /<w:del\b/g)}`);
    log(`w:delText count=${count(documentXml, /<w:delText\b/g)}`);
    log(`w:rPrChange count=${count(documentXml, /<w:rPrChange\b/g)}`);
    log(`w:moveFrom count=${count(documentXml, /<w:moveFrom\b/g)}`);
    log(`w:moveTo count=${count(documentXml, /<w:moveTo\b/g)}`);
    log(`trackRevisions in settings.xml=${/<w:trackRevisions\b/.test(settingsXml)}`);
    log(`REVISIONS=${JSON.stringify(revisions, null, 2)}`);
    log(`DOCUMENT_SNIPPET_INS=${snippet(documentXml, /<w:ins\b/)}`);
    log(`DOCUMENT_SNIPPET_DEL=${snippet(documentXml, /<w:del\b/)}`);
    log(`DOCUMENT_TEXT=${xmlText(documentXml)}`);
    log(`INPUT_ODF=${JSON.stringify(collectOdfRegions(fodt))}`);
    log(`CANONICAL_ODF=${JSON.stringify(collectOdfRegions(canonicalXml))}`);
    log(`CANONICAL_TRACKED=${snippet(canonicalXml, /<text:tracked-changes\b/, 1200)}`);
    log(`CANONICAL_BODY_MARKERS=${snippet(canonicalXml, /<text:change(?:-start|-end)?\b/, 900)}`);
    if (peopleXml) log(`PEOPLE_XML=${peopleXml.replace(/\s+/g, " ").slice(0, 400)}`);
  } catch (error) {
    log(`CONVERT_ERROR=${error.message}`);
  }
}

const reportPath = path.join(outRoot, "probe-report.txt");
fs.writeFileSync(reportPath, findings.join("\n"), "utf8");
log(`\nREPORT=${reportPath}`);
