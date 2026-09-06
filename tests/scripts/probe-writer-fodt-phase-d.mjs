/**
 * Phase D measurement probe — run BEFORE serializer code.
 * Hand-written ODF 1.3 FODT with text:note / office:annotation /
 * text:table-of-content, converted through real soffice to DOCX / PDF /
 * canonical FODT. Records measured XML (footnotes.xml, endnotes.xml,
 * comments.xml, commentReference, sdt/TOC field).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) throw new Error("soffice not found");

const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodt-d-probe-"));
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
  'xmlns:xlink="http://www.w3.org/1999/xlink"',
  'xmlns:dc="http://purl.org/dc/elements/1.1/"'
].join(" ");

const pageLayout = `<style:page-layout style:name="pmA4">
  <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/>
</style:page-layout>`;

const notesConfig = `<text:notes-configuration text:note-class="footnote" style:num-format="1" text:start-value="0" text:footnotes-position="page" text:start-numbering-at="document"/>
<text:notes-configuration text:note-class="endnote" style:num-format="i" text:start-value="0"/>`;

function wrapDocument({ styles = "", automatic = pageLayout, master = '<style:master-page style:name="Standard" style:page-layout-name="pmA4"/>', body }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:styles>
${styles}
</office:styles>
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

function snippet(xml, pattern, max = 600) {
  const match = String(xml || "").match(pattern);
  if (!match) return "(no match)";
  const start = Math.max(0, match.index - 80);
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

const fixtures = {
  "01-footnote": wrapDocument({
    styles: notesConfig,
    body: `<text:p>Căn cứ Nghị định 15/2021/NĐ-CP<text:note text:id="ftn1" text:note-class="footnote"><text:note-citation>1</text:note-citation><text:note-body><text:p>FOOTNOTE_BODY_ND15 hiệu lực từ 03/3/2021.</text:p></text:note-body></text:note> về quản lý đầu tư xây dựng.</text:p>`
  }),
  "02-endnote": wrapDocument({
    styles: notesConfig,
    body: `<text:p>Kết luận kèm phụ lục kỹ thuật<text:note text:id="edn1" text:note-class="endnote"><text:note-citation>i</text:note-citation><text:note-body><text:p>ENDNOTE_BODY_PHU_LUC gồm bản vẽ mặt cắt Đăk Bla.</text:p></text:note-body></text:note> được lưu tại hồ sơ gốc.</text:p>`
  }),
  "03-footnote-endnote-mixed": wrapDocument({
    styles: notesConfig,
    body: `<text:p>Căn cứ Nghị định 15/2021/NĐ-CP<text:note text:id="ftn1" text:note-class="footnote"><text:note-citation>1</text:note-citation><text:note-body><text:p>FOOTNOTE_ONE Nghị định 15/2021.</text:p></text:note-body></text:note> và Thông tư 10/2021/TT-BXD<text:note text:id="ftn2" text:note-class="footnote"><text:note-citation>2</text:note-citation><text:note-body><text:p>FOOTNOTE_TWO Thông tư 10/2021.</text:p></text:note-body></text:note>.</text:p>
<text:p>Kết luận kèm phụ lục kỹ thuật<text:note text:id="edn1" text:note-class="endnote"><text:note-citation>i</text:note-citation><text:note-body><text:p>ENDNOTE_ONE Phụ lục kỹ thuật Đăk Bla.</text:p></text:note-body></text:note>.</text:p>`
  }),
  "04-footnote-no-config": wrapDocument({
    styles: "",
    body: `<text:p>Không có notes-configuration<text:note text:id="ftn1" text:note-class="footnote"><text:note-citation>1</text:note-citation><text:note-body><text:p>FOOTNOTE_NO_CONFIG vẫn phải ra footnotes.xml.</text:p></text:note-body></text:note>.</text:p>`
  }),
  "05-comment-range": wrapDocument({
    body: `<text:p>Đề nghị phê duyệt <office:annotation office:name="__Annotation__du-toan-2026"><dc:creator>Tran Thi Hoa</dc:creator><dc:date>2026-09-05T09:10:00</dc:date><text:p>COMMENT_BODY đối chiếu số liệu quý II.</text:p></office:annotation>dự toán năm 2026<office:annotation-end office:name="__Annotation__du-toan-2026"/> theo phương án đã thống nhất.</text:p>`
  }),
  "06-comment-point": wrapDocument({
    body: `<text:p>Người soạn: Lê Văn Cường<office:annotation office:name="__Annotation__nguoi-soan"><dc:creator>Pham Minh Duc</dc:creator><dc:date>2026-09-05T09:25:00</dc:date><text:p>COMMENT_POINT xác nhận chữ ký.</text:p></office:annotation>. Ngày soạn: 05/09/2026.</text:p>`
  }),
  "07-toc-filled": wrapDocument({
    automatic: `${pageLayout}
<style:style style:name="Contents_20_Heading" style:family="paragraph">
  <style:paragraph-properties fo:margin-bottom="0.4cm"/>
  <style:text-properties fo:font-size="16pt" fo:font-weight="bold"/>
</style:style>
<style:style style:name="Contents_20_1" style:family="paragraph">
  <style:paragraph-properties fo:margin-left="0cm"/>
</style:style>
<style:style style:name="Contents_20_2" style:family="paragraph">
  <style:paragraph-properties fo:margin-left="0.5cm"/>
</style:style>
<style:style style:name="Contents_20_3" style:family="paragraph">
  <style:paragraph-properties fo:margin-left="1cm"/>
</style:style>`,
    body: `<text:table-of-content text:name="Table of Contents1" text:protected="false">
  <text:table-of-content-source text:outline-level="3" text:use-outline-level="true">
    <text:index-title-template text:style-name="Contents_20_Heading">MỤC LỤC</text:index-title-template>
    <text:table-of-content-entry-template text:outline-level="1" text:style-name="Contents_20_1">
      <text:index-entry-chapter/>
      <text:index-entry-text/>
      <text:index-entry-tab-stop style:type="right" style:leader-char="."/>
      <text:index-entry-page-number/>
    </text:table-of-content-entry-template>
    <text:table-of-content-entry-template text:outline-level="2" text:style-name="Contents_20_2">
      <text:index-entry-chapter/>
      <text:index-entry-text/>
      <text:index-entry-tab-stop style:type="right" style:leader-char="."/>
      <text:index-entry-page-number/>
    </text:table-of-content-entry-template>
    <text:table-of-content-entry-template text:outline-level="3" text:style-name="Contents_20_3">
      <text:index-entry-chapter/>
      <text:index-entry-text/>
      <text:index-entry-tab-stop style:type="right" style:leader-char="."/>
      <text:index-entry-page-number/>
    </text:table-of-content-entry-template>
  </text:table-of-content-source>
  <text:index-body>
    <text:index-title text:name="Table of Contents1_Head">
      <text:p text:style-name="Contents_20_Heading">MỤC LỤC</text:p>
    </text:index-title>
    <text:p text:style-name="Contents_20_1">Báo cáo thẩm định<text:tab/>1</text:p>
    <text:p text:style-name="Contents_20_2">Căn cứ pháp lý<text:tab/>1</text:p>
    <text:p text:style-name="Contents_20_3">Nghị định 15/2021<text:tab/>1</text:p>
  </text:index-body>
</text:table-of-content>
<text:h text:outline-level="1">Báo cáo thẩm định</text:h>
<text:p>Đoạn mở đầu TOC_BODY_INTRO.</text:p>
<text:h text:outline-level="2">Căn cứ pháp lý</text:h>
<text:p>Đoạn căn cứ TOC_BODY_LEGAL.</text:p>
<text:h text:outline-level="3">Nghị định 15/2021</text:h>
<text:p>Đoạn nghị định TOC_BODY_DECREE.</text:p>`
  }),
  "08-toc-empty-body": wrapDocument({
    automatic: `${pageLayout}
<style:style style:name="Contents_20_Heading" style:family="paragraph">
  <style:text-properties fo:font-size="16pt" fo:font-weight="bold"/>
</style:style>
<style:style style:name="Contents_20_1" style:family="paragraph"/>
<style:style style:name="Contents_20_2" style:family="paragraph"/>
<style:style style:name="Contents_20_3" style:family="paragraph"/>`,
    body: `<text:table-of-content text:name="Table of Contents1" text:protected="false">
  <text:table-of-content-source text:outline-level="3" text:use-outline-level="true">
    <text:index-title-template text:style-name="Contents_20_Heading">MỤC LỤC</text:index-title-template>
    <text:table-of-content-entry-template text:outline-level="1" text:style-name="Contents_20_1">
      <text:index-entry-text/>
      <text:index-entry-tab-stop style:type="right" style:leader-char="."/>
      <text:index-entry-page-number/>
    </text:table-of-content-entry-template>
    <text:table-of-content-entry-template text:outline-level="2" text:style-name="Contents_20_2">
      <text:index-entry-text/>
      <text:index-entry-tab-stop style:type="right" style:leader-char="."/>
      <text:index-entry-page-number/>
    </text:table-of-content-entry-template>
    <text:table-of-content-entry-template text:outline-level="3" text:style-name="Contents_20_3">
      <text:index-entry-text/>
      <text:index-entry-tab-stop style:type="right" style:leader-char="."/>
      <text:index-entry-page-number/>
    </text:table-of-content-entry-template>
  </text:table-of-content-source>
  <text:index-body/>
</text:table-of-content>
<text:h text:outline-level="1">Báo cáo thẩm định</text:h>
<text:h text:outline-level="2">Căn cứ pháp lý</text:h>
<text:h text:outline-level="3">Nghị định 15/2021</text:h>
<text:p>TOC_EMPTY_BODY_PROBE</text:p>`
  })
};

for (const [name, xml] of Object.entries(fixtures)) {
  log(`\n========== ${name} ==========`);
  const fodtPath = path.join(outRoot, `${name}.fodt`);
  fs.writeFileSync(fodtPath, xml, "utf8");
  let docxPath;
  let pdfPath;
  let canonPath;
  try {
    docxPath = convertWithSoffice(fodtPath, "docx", path.join(outRoot, `${name}-docx`), {
      appKind: "writer", profileDir: path.join(outRoot, `${name}-profile-docx`)
    });
    log(`DOCX_OK=${docxPath}`);
  } catch (error) {
    log(`DOCX_FAIL=${error.message}`);
    continue;
  }
  try {
    pdfPath = convertWithSoffice(fodtPath, "pdf", path.join(outRoot, `${name}-pdf`), {
      appKind: "writer", profileDir: path.join(outRoot, `${name}-profile-pdf`)
    });
    const pdfBytes = fs.readFileSync(pdfPath);
    log(`PDF_OK=${pdfPath} magic=${pdfBytes.subarray(0, 5).toString("latin1")} size=${pdfBytes.length}`);
  } catch (error) {
    log(`PDF_FAIL=${error.message}`);
  }
  try {
    canonPath = convertWithSoffice(fodtPath, "fodt", path.join(outRoot, `${name}-canon`), {
      appKind: "writer", profileDir: path.join(outRoot, `${name}-profile-fodt`)
    });
    log(`CANON_OK=${canonPath}`);
  } catch (error) {
    log(`CANON_FAIL=${error.message}`);
  }

  const zipNames = listZipEntries(docxPath).map(entry => entry.name);
  log(`ZIP_ENTRIES=${zipNames.filter(n => /word\/(document|footnotes|endnotes|comments|styles)|\[Content_Types\]/.test(n)).join(" | ")}`);
  log(`HAS_footnotes.xml=${zipNames.includes("word/footnotes.xml")}`);
  log(`HAS_endnotes.xml=${zipNames.includes("word/endnotes.xml")}`);
  log(`HAS_comments.xml=${zipNames.includes("word/comments.xml")}`);

  const documentXml = readZipEntry(docxPath, "word/document.xml")?.toString("utf8") || "";
  const footnotesXml = readZipEntry(docxPath, "word/footnotes.xml")?.toString("utf8") || "";
  const endnotesXml = readZipEntry(docxPath, "word/endnotes.xml")?.toString("utf8") || "";
  const commentsXml = readZipEntry(docxPath, "word/comments.xml")?.toString("utf8") || "";

  log(`footnoteReference_count=${count(documentXml, /<w:footnoteReference\b/g)}`);
  log(`endnoteReference_count=${count(documentXml, /<w:endnoteReference\b/g)}`);
  log(`commentReference_count=${count(documentXml, /<w:commentReference\b/g)}`);
  log(`commentRangeStart_count=${count(documentXml, /<w:commentRangeStart\b/g)}`);
  log(`commentRangeEnd_count=${count(documentXml, /<w:commentRangeEnd\b/g)}`);
  log(`sdt_count=${count(documentXml, /<w:sdt\b/g)}`);
  log(`instrText_TOC_count=${count(documentXml, /TOC\\?\\s/g) + count(documentXml, /<w:instrText[^>]*>[^<]*TOC/g)}`);
  log(`docPartGallery_count=${count(documentXml, /docPartGallery/g)}`);
  log(`hyperlink_count=${count(documentXml, /<w:hyperlink\b/g)}`);
  log(`DOCUMENT_TEXT=${xmlText(documentXml).slice(0, 400)}`);
  log(`DOCUMENT_SNIP_NOTE=${snippet(documentXml, /<w:(footnote|endnote)Reference\b/)}`);
  log(`DOCUMENT_SNIP_COMMENT=${snippet(documentXml, /<w:comment(RangeStart|Reference)\b/)}`);
  log(`DOCUMENT_SNIP_SDT=${snippet(documentXml, /<w:sdt\b/)}`);
  log(`DOCUMENT_SNIP_INSTR=${snippet(documentXml, /<w:instrText\b/)}`);

  if (footnotesXml) {
    log(`footnotes.xml_w:footnote_count=${count(footnotesXml, /<w:footnote\b/g)}`);
    log(`footnotes.xml_text=${xmlText(footnotesXml).slice(0, 400)}`);
    log(`footnotes.xml_has_FOOTNOTE=${/FOOTNOTE/i.test(footnotesXml)}`);
  }
  if (endnotesXml) {
    log(`endnotes.xml_w:endnote_count=${count(endnotesXml, /<w:endnote\b/g)}`);
    log(`endnotes.xml_text=${xmlText(endnotesXml).slice(0, 400)}`);
    log(`endnotes.xml_has_ENDNOTE=${/ENDNOTE/i.test(endnotesXml)}`);
  }
  if (commentsXml) {
    log(`comments.xml_w:comment_count=${count(commentsXml, /<w:comment\b/g)}`);
    log(`comments.xml_text=${xmlText(commentsXml).slice(0, 400)}`);
    log(`comments.xml_author=${(commentsXml.match(/w:author="([^"]*)"/g) || []).join(" | ")}`);
  }

  if (canonPath && fs.existsSync(canonPath)) {
    const canon = fs.readFileSync(canonPath, "utf8");
    log(`CANON_text:note_count=${count(canon, /<text:note\b/g)}`);
    log(`CANON_text:note-class_footnote=${count(canon, /text:note-class="footnote"/g)}`);
    log(`CANON_text:note-class_endnote=${count(canon, /text:note-class="endnote"/g)}`);
    log(`CANON_text:notes-configuration_count=${count(canon, /<text:notes-configuration\b/g)}`);
    log(`CANON_office:annotation_count=${count(canon, /<office:annotation\b/g)}`);
    log(`CANON_office:annotation-end_count=${count(canon, /<office:annotation-end\b/g)}`);
    log(`CANON_dc:creator=${(canon.match(/<dc:creator>[^<]*<\/dc:creator>/g) || []).join(" | ")}`);
    log(`CANON_text:table-of-content_count=${count(canon, /<text:table-of-content\b/g)}`);
    log(`CANON_text:table-of-content-source_count=${count(canon, /<text:table-of-content-source\b/g)}`);
    log(`CANON_text:index-body_count=${count(canon, /<text:index-body\b/g)}`);
    log(`CANON_text:index-title_count=${count(canon, /<text:index-title\b/g)}`);
    log(`CANON_SNIP_NOTE=${snippet(canon, /<text:note\b/)}`);
    log(`CANON_SNIP_ANN=${snippet(canon, /<office:annotation\b/)}`);
    log(`CANON_SNIP_TOC=${snippet(canon, /<text:table-of-content\b/, 900)}`);
    log(`CANON_INDEX_BODY_TEXT=${xmlText((canon.match(/<text:index-body[\s\S]*?<\/text:index-body>/) || [""])[0]).slice(0, 400)}`);
  }
}

const reportPath = path.join(outRoot, "probe-report.txt");
fs.writeFileSync(reportPath, findings.join("\n"), "utf8");
log(`\nREPORT=${reportPath}`);
