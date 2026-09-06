/**
 * Follow-up probe: why C1-C5 DOCX charts have empty cat/val caches.
 * Try Slides-complete local-table, plot-area range, ODT hop, inspect embedded object.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) throw new Error("soffice not found");
const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodt-e4-data-"));
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

function wrap(body, automatic = "") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>
<style:page-layout style:name="pmA4">
  <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/>
</style:page-layout>
<style:style style:name="grOle" style:family="graphic">
  <style:graphic-properties draw:ole-draw-aspect="1" style:wrap="none"
    style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>
${automatic}
</office:automatic-styles>
<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pmA4"/></office:master-styles>
<office:body><office:text>${body}</office:text></office:body>
</office:document>`;
}

function nestedChart({
  tableInner,
  plotExtra = "",
  chartClass = "chart:bar",
  href = "."
}) {
  return `<draw:frame draw:style-name="grOle" draw:name="ChartBar" text:anchor-type="as-char" svg:width="12cm" svg:height="7cm">
  <draw:object>
    <office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.chart">
      <office:body><office:chart>
        <chart:chart svg:width="12cm" svg:height="7cm" xlink:href="${href}" xlink:type="simple" chart:class="${chartClass}">
          <chart:title><text:p>CHART_BAR_Q</text:p></chart:title>
          <chart:legend chart:legend-position="end"/>
          <chart:plot-area${plotExtra}>
            <chart:axis chart:dimension="x" chart:name="primary-x"><chart:categories table:cell-range-address="local-table.$A$2:.$A$5"/></chart:axis>
            <chart:axis chart:dimension="y" chart:name="primary-y"><chart:grid chart:class="major"/></chart:axis>
            <chart:series chart:values-cell-range-address="local-table.$B$2:.$B$5" chart:label-cell-address="local-table.$B$1" chart:class="${chartClass}">
              <chart:data-point/><chart:data-point/><chart:data-point/><chart:data-point/>
            </chart:series>
          </chart:plot-area>
          ${tableInner}
        </chart:chart>
      </office:chart></office:body>
    </office:document>
  </draw:object>
</draw:frame>`;
}

const rows = [
  ["Q1", 120],
  ["Q2", 190],
  ["Q3", 300],
  ["Q4", 250]
].map(([l, v]) => `<table:table-row><table:table-cell office:value-type="string"><text:p>${l}</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="${v}"><text:p>${v}</text:p></table:table-cell></table:table-row>`).join("");

const tableMinimal = `<table:table table:name="local-table">
  <table:table-header-rows><table:table-row><table:table-cell/><table:table-cell office:value-type="string"><text:p>CHART_BAR_Q</text:p></table:table-cell></table:table-row></table:table-header-rows>
  <table:table-rows>${rows}</table:table-rows>
</table:table>`;

const tableSlides = `<table:table table:name="local-table">
  <table:table-header-columns><table:table-column/></table:table-header-columns>
  <table:table-columns><table:table-column/></table:table-columns>
  <table:table-header-rows><table:table-row><table:table-cell/><table:table-cell office:value-type="string"><text:p>CHART_BAR_Q</text:p></table:table-cell></table:table-row></table:table-header-rows>
  <table:table-rows>${rows}</table:table-rows>
</table:table>`;

const fixtures = {
  "D1-slides-table": wrap(`<text:p>${nestedChart({ tableInner: tableSlides })}</text:p>`),
  "D2-slides-table-plot-range": wrap(`<text:p>${nestedChart({
    tableInner: tableSlides,
    plotExtra: ' table:cell-range-address="local-table.$A$1:.$B$5" chart:data-source-has-labels="both"'
  })}</text:p>`),
  "D3-minimal-plot-range": wrap(`<text:p>${nestedChart({
    tableInner: tableMinimal,
    plotExtra: ' table:cell-range-address="local-table.$A$1:.$B$5" chart:data-source-has-labels="both"'
  })}</text:p>`)
};

function inspectChart(xml) {
  const cats = [...String(xml).matchAll(/<c:cat>[\s\S]*?<\/c:cat>/g)].map(m => m[0]);
  const vals = [...String(xml).matchAll(/<c:val>[\s\S]*?<\/c:val>/g)].map(m => m[0]);
  return {
    bar: (xml.match(/<c:barChart\b/g) || []).length,
    has120: xml.includes("120"),
    has190: xml.includes("190"),
    has300: xml.includes("300"),
    has250: xml.includes("250"),
    hasQ1: xml.includes("Q1"),
    catV: [...String(cats[0] || "").matchAll(/<c:v>([^<]*)<\/c:v>/g)].map(m => m[1]),
    valPts: (vals[0] || "").includes("<c:pt "),
    valSnippet: String(vals[0] || "").replace(/\s+/g, " ").slice(0, 400)
  };
}

function dumpOdt(odtPath, label) {
  const entries = listZipEntries(odtPath).map(e => e.name);
  console.log(`${label}_ODT_ENTRIES=${entries.join(" | ")}`);
  for (const name of entries.filter(n => /content\.xml$|Object|chart/i.test(n))) {
    const xml = (readZipEntry(odtPath, name) || Buffer.alloc(0)).toString("utf8");
    const hits = {
      Q1: xml.includes("Q1"),
      v120: xml.includes(">120<") || xml.includes('office:value="120"'),
      nan: /office:value="NaN"/.test(xml),
      local: xml.includes("local-table")
    };
    console.log(`${label}_PART[${name}]=${JSON.stringify(hits)} snippet=${xml.replace(/\s+/g, " ").slice(0, 280)}`);
  }
}

for (const [id, xml] of Object.entries(fixtures)) {
  console.log(`\n===== ${id} =====`);
  const fodtPath = path.join(outRoot, `${id}.fodt`);
  fs.writeFileSync(fodtPath, xml, "utf8");
  const docx = convertWithSoffice(fodtPath, "docx", path.join(outRoot, `${id}-docx`), {
    appKind: "writer", profileDir: path.join(outRoot, `${id}-docx`, "profile")
  });
  const chartXml = (readZipEntry(docx, "word/charts/chart1.xml") || Buffer.alloc(0)).toString("utf8");
  console.log(`${id}_DOCX=${JSON.stringify(inspectChart(chartXml))}`);
  const odt = convertWithSoffice(fodtPath, "odt", path.join(outRoot, `${id}-odt`), {
    appKind: "writer", profileDir: path.join(outRoot, `${id}-odt`, "profile")
  });
  dumpOdt(odt, `${id}_FODT2ODT`);
  const odtDocx = convertWithSoffice(odt, "docx", path.join(outRoot, `${id}-odt-docx`), {
    appKind: "writer", profileDir: path.join(outRoot, `${id}-odt-docx`, "profile")
  });
  const odtChart = (readZipEntry(odtDocx, "word/charts/chart1.xml") || Buffer.alloc(0)).toString("utf8");
  console.log(`${id}_ODT2DOCX=${JSON.stringify(inspectChart(odtChart))}`);
}
