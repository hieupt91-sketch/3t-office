import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

const types = [
  ["fontwork-plain-text", "M 0 10800 L 21600 10800 Z N"],
  ["fontwork-wave", "M 0 10800 C 5400 16200 16200 5400 21600 10800 Z N"],
  ["fontwork-arch-up", "M 0 15800 C 7200 4000 14400 4000 21600 15800 Z N"],
  ["fontwork-slant-up", "M 0 16000 L 21600 4000 Z N"],
  ["fontwork-fade-right", "M 0 10800 L 21600 10800 Z N"],
  ["fontwork-chevron-up", "M 0 14000 L 10800 4000 L 21600 14000 Z N"]
];

const NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink"';
const graphic = `<style:style style:name="gr1" style:family="graphic"><style:graphic-properties draw:fill="solid" draw:fill-color="#1e3a8a" draw:stroke="none"/></style:style>`;
const textStyle = `<style:style style:name="T1" style:family="text"><style:text-properties fo:font-size="28pt" fo:font-weight="bold" fo:font-family="Impact" fo:color="#1e3a8a"/></style:style>`;
const paras = types.map(([type, pathd], i) => `<text:p>${type}: <draw:custom-shape draw:style-name="gr1" draw:name="T${i}" text:anchor-type="as-char" svg:width="11cm" svg:height="2.4cm"><text:p><text:span text:style-name="T1">${type.replace("fontwork-", "").toUpperCase()}</text:span></text:p><draw:enhanced-geometry svg:viewBox="0 0 21600 21600" draw:text-path="true" draw:text-path-allowed="true" draw:text-path-mode="shape" draw:type="${type}" draw:enhanced-path="${pathd}"/></draw:custom-shape></text:p>`).join("\n");
const fodt = `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>
<style:page-layout style:name="pmA4"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="1.5cm" fo:margin-bottom="1.5cm" fo:margin-left="2cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/></style:page-layout>
${graphic}${textStyle}
</office:automatic-styles>
<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pmA4"/></office:master-styles>
<office:body><office:text>${paras}</office:text></office:body>
</office:document>`;

const out = fs.mkdtempSync(path.join(os.tmpdir(), "vno-e3-fw-types-"));
const fodtPath = path.join(out, "types.fodt");
fs.writeFileSync(fodtPath, fodt);
const docx = convertWithSoffice(fodtPath, "docx", path.join(out, "docx"), { appKind: "writer", profileDir: path.join(out, "profile") });
const dest = path.resolve("tmp-word-e3/visibility/fontwork-types.docx");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(docx, dest);
const xml = readZipEntry(docx, "word/document.xml").toString("utf8");
console.log(`DOCX=${dest}`);
console.log(`drawing=${(xml.match(/<w:drawing\b/g) || []).length} pict=${(xml.match(/<w:pict\b/g) || []).length}`);
console.log(`warps=${[...xml.matchAll(/<a:prstTxWarp prst="([^"]+)"/g)].map(m => m[1]).join(",")}`);
console.log(`prstGeom=${[...xml.matchAll(/<a:prstGeom prst="([^"]+)"/g)].map(m => m[1]).join(",")}`);
console.log("DONE");
