/**
 * Confirm bar/line/circle/area with Slides-complete local-table keep
 * categories + numeric caches in word/charts/chart1.xml.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) throw new Error("soffice not found");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodt-e4-types-"));
console.log(`PROBE_ROOT=${outRoot}`);

const NS = [
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"',
  'xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"',
  'xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"',
  'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"',
  'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"',
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
  'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"',
  'xmlns:xlink="http://www.w3.org/1999/xlink"',
  'xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"'
].join(" ");

function chartXml(chartClass) {
  const axes = chartClass === "chart:circle"
    ? ""
    : `<chart:axis chart:dimension="x" chart:name="primary-x"><chart:categories table:cell-range-address="local-table.$A$2:.$A$5"/></chart:axis><chart:axis chart:dimension="y" chart:name="primary-y"><chart:grid chart:class="major"/></chart:axis>`;
  const rows = [["Q1", 120], ["Q2", 190], ["Q3", 300], ["Q4", 250]]
    .map(([l, v]) => `<table:table-row><table:table-cell office:value-type="string"><text:p>${l}</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="${v}"><text:p>${v}</text:p></table:table-cell></table:table-row>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>
<style:page-layout style:name="pmA4"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/></style:page-layout>
<style:style style:name="grOle" style:family="graphic"><style:graphic-properties draw:ole-draw-aspect="1" style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/></style:style>
</office:automatic-styles>
<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pmA4"/></office:master-styles>
<office:body><office:text><text:p><draw:frame draw:style-name="grOle" draw:name="Chart1" text:anchor-type="as-char" svg:width="12cm" svg:height="7cm"><draw:object>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.chart">
<office:body><office:chart>
<chart:chart svg:width="12cm" svg:height="7cm" xlink:href="." xlink:type="simple" chart:class="${chartClass}">
  <chart:title><text:p>TITLE_${chartClass.replace(":", "_")}</text:p></chart:title>
  <chart:legend chart:legend-position="end"/>
  <chart:plot-area>${axes}<chart:series chart:values-cell-range-address="local-table.$B$2:.$B$5" chart:label-cell-address="local-table.$B$1" chart:class="${chartClass}"><chart:data-point/><chart:data-point/><chart:data-point/><chart:data-point/></chart:series></chart:plot-area>
  <table:table table:name="local-table">
    <table:table-header-columns><table:table-column/></table:table-header-columns>
    <table:table-columns><table:table-column/></table:table-columns>
    <table:table-header-rows><table:table-row><table:table-cell/><table:table-cell office:value-type="string"><text:p>TITLE</text:p></table:table-cell></table:table-row></table:table-header-rows>
    <table:table-rows>${rows}</table:table-rows>
  </table:table>
</chart:chart>
</office:chart></office:body>
</office:document>
</draw:object></draw:frame></text:p></office:text></office:body></office:document>`;
}

const map = {
  "chart:bar": "c:barChart",
  "chart:line": "c:lineChart",
  "chart:circle": "c:pieChart",
  "chart:area": "c:areaChart"
};

for (const [odfClass, docxTag] of Object.entries(map)) {
  const id = odfClass.replace(":", "-");
  const fodtPath = path.join(outRoot, `${id}.fodt`);
  fs.writeFileSync(fodtPath, chartXml(odfClass), "utf8");
  const docx = convertWithSoffice(fodtPath, "docx", path.join(outRoot, `${id}-docx`), {
    appKind: "writer", profileDir: path.join(outRoot, `${id}-docx`, "profile")
  });
  const xml = (readZipEntry(docx, "word/charts/chart1.xml") || Buffer.alloc(0)).toString("utf8");
  const cats = [...xml.matchAll(/<c:cat>[\s\S]*?<\/c:cat>/g)][0]?.[0] || "";
  const vals = [...xml.matchAll(/<c:val>[\s\S]*?<\/c:val>/g)][0]?.[0] || "";
  console.log(JSON.stringify({
    odfClass,
    docxTag,
    hasType: xml.includes(`<${docxTag}`),
    otherTypes: {
      bar: xml.includes("<c:barChart"),
      line: xml.includes("<c:lineChart"),
      pie: xml.includes("<c:pieChart"),
      area: xml.includes("<c:areaChart")
    },
    cats: [...cats.matchAll(/<c:v>([^<]*)<\/c:v>/g)].map(m => m[1]),
    vals: [...vals.matchAll(/<c:v>([^<]*)<\/c:v>/g)].map(m => m[1]),
    title: (xml.match(/<a:t>([^<]*)<\/a:t>/) || [])[1] || "",
    ser: (xml.match(/<c:ser\b/g) || []).length
  }));
}
