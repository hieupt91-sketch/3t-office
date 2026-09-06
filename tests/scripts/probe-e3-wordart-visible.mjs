/**
 * Follow-up visibility probe after Word visual: VML-only fontwork-plain-text
 * did not show on the page. Try stroke none, paragraph anchor, and
 * fontwork-wave (measured to also emit DrawingML prstTxWarp).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

assertSoffice();
function assertSoffice() {
  if (!findSoffice()) throw new Error("soffice not found");
}

const NS = [
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
  'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"',
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
  'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"',
  'xmlns:xlink="http://www.w3.org/1999/xlink"'
].join(" ");

function wrap(automatic, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>
<style:page-layout style:name="pmA4"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/></style:page-layout>
${automatic}
</office:automatic-styles>
<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pmA4"/></office:master-styles>
<office:body><office:text>${body}</office:text></office:body>
</office:document>`;
}

const textStyle = `<style:style style:name="TWa" style:family="text"><style:text-properties fo:color="#1e3a8a" fo:font-size="36pt" fo:font-weight="bold" fo:font-family="Impact"/></style:style>`;

function graphic(name, extra) {
  return `<style:style style:name="${name}" style:family="graphic"><style:graphic-properties ${extra}/></style:style>`;
}

function fontwork({ style, name, anchor, type = "fontwork-plain-text", path = "M 0 10800 L 21600 10800 Z N", text, extraShape = "" }) {
  const pos = anchor === "as-char"
    ? `text:anchor-type="as-char"`
    : `text:anchor-type="paragraph" svg:x="2cm" svg:y="3cm"`;
  return `<draw:custom-shape draw:style-name="${style}" draw:name="${name}" ${pos} svg:width="12cm" svg:height="3cm"${extraShape}>
  <text:p><text:span text:style-name="TWa">${text}</text:span></text:p>
  <draw:enhanced-geometry svg:viewBox="0 0 21600 21600" draw:text-path="true" draw:text-path-allowed="true" draw:text-path-mode="shape" draw:type="${type}" draw:enhanced-path="${path}"/>
</draw:custom-shape>`;
}

const fixtures = {
  "V1-stroke-none-as-char": wrap(
    `${graphic("gr1", 'draw:fill="solid" draw:fill-color="#1e3a8a" draw:stroke="none"')} ${textStyle}`,
    `<text:p>Truoc ${fontwork({ style: "gr1", name: "WA1", anchor: "as-char", text: "VISIBLE_NONE_STROKE" })} sau.</text:p>`
  ),
  "V2-paragraph-navy": wrap(
    `${graphic("gr1", 'draw:fill="solid" draw:fill-color="#1e3a8a" draw:stroke="none" style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"')} ${textStyle}`,
    `<text:p>Doan chu. ${fontwork({ style: "gr1", name: "WA2", anchor: "paragraph", text: "VISIBLE_PARA_NAVY" })}</text:p>`
  ),
  "V3-wave-as-char": wrap(
    `${graphic("gr1", 'draw:fill="solid" draw:fill-color="#1e3a8a" draw:stroke="none"')} ${textStyle}`,
    `<text:p>Truoc ${fontwork({
      style: "gr1",
      name: "WA3",
      anchor: "as-char",
      type: "fontwork-wave",
      path: "M 0 10800 C 5400 16200 16200 5400 21600 10800 Z N",
      text: "VISIBLE_WAVE"
    })} sau.</text:p>`
  )
};

const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-e3-wa-vis-"));
const copyDir = path.join("tmp-word-e3", "visibility");
fs.mkdirSync(copyDir, { recursive: true });
console.log(`PROBE_ROOT=${outRoot}`);

for (const [id, xml] of Object.entries(fixtures)) {
  const fodtPath = path.join(outRoot, `${id}.fodt`);
  fs.writeFileSync(fodtPath, xml, "utf8");
  const docx = convertWithSoffice(fodtPath, "docx", path.join(outRoot, id), {
    appKind: "writer", profileDir: path.join(outRoot, id, "profile")
  });
  const dest = path.join(copyDir, `${id}.docx`);
  fs.copyFileSync(docx, dest);
  const documentXml = readZipEntry(docx, "word/document.xml").toString("utf8");
  console.log(`\n===== ${id} =====`);
  console.log(`DOCX=${dest}`);
  console.log(`pict=${(documentXml.match(/<w:pict\b/g) || []).length} drawing=${(documentXml.match(/<w:drawing\b/g) || []).length} txwarp=${(documentXml.match(/prstTxWarp/g) || []).length} textpath=${(documentXml.match(/<v:textpath\b/g) || []).length}`);
  const shape = documentXml.match(/<v:shape\b[^>]{0,500}/);
  console.log(`SHAPE=${shape ? shape[0].replace(/\s+/g, " ") : "(none)"}`);
  const warp = documentXml.match(/prst="[^"]+"/);
  console.log(`PRST=${warp ? warp[0] : "(none)"}`);
  console.log(`HAS_TEXT=${["VISIBLE_NONE_STROKE", "VISIBLE_PARA_NAVY", "VISIBLE_WAVE"].filter(t => documentXml.includes(t)).join(",")}`);
}
console.log("DONE");
