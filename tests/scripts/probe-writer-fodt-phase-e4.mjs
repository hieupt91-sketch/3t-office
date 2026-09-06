/**
 * Phase E.4 measurement probe — run BEFORE serializer code.
 * Re-measures office:chart as-char (C1-C3 from E.3) plus chart:area,
 * dumps Writer UI chart HTML (does it store source data?), and records
 * real soffice DOCX word/charts/chart1.xml (type + numeric values).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateChartHtml, generateChartSvg } from "../../apps/writer/writer-illustrations.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) throw new Error("soffice not found");

const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodt-e4-probe-"));
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
  'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"',
  'xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"',
  'xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"',
  'xmlns:xlink="http://www.w3.org/1999/xlink"',
  'xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"'
].join(" ");

function wrapDocument({ automatic = "", body }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document ${NS} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>
<style:page-layout style:name="pmA4">
  <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/>
</style:page-layout>
${automatic}
</office:automatic-styles>
<office:master-styles>
  <style:master-page style:name="Standard" style:page-layout-name="pmA4"/>
</office:master-styles>
<office:body><office:text>
${body}
</office:text></office:body>
</office:document>
`;
}

const graphicOle = `<style:style style:name="grOle" style:family="graphic">
  <style:graphic-properties draw:ole-draw-aspect="1" style:wrap="none"
    style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>`;

function chartObject({
  chartClass = "chart:bar",
  title = "Doanh thu Q1-Q4",
  labels = ["Q1", "Q2", "Q3", "Q4"],
  values = [120, 190, 300, 250],
  name = "Chart1",
  extraSeries = ""
} = {}) {
  const endRow = values.length + 1;
  const rows = labels.map((label, i) =>
    `<table:table-row><table:table-cell office:value-type="string"><text:p>${label}</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="${values[i]}"><text:p>${values[i]}</text:p></table:table-cell></table:table-row>`
  ).join("");
  const axes = chartClass === "chart:circle"
    ? ""
    : `<chart:axis chart:dimension="x" chart:name="primary-x"><chart:categories table:cell-range-address="local-table.$A$2:.$A$${endRow}"/></chart:axis><chart:axis chart:dimension="y" chart:name="primary-y"><chart:grid chart:class="major"/></chart:axis>`;
  const points = values.map(() => "<chart:data-point/>").join("");
  return `<draw:frame draw:style-name="grOle" draw:name="${name}" text:anchor-type="as-char" svg:width="12cm" svg:height="7cm">
  <draw:object>
    <office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.chart">
      <office:body><office:chart>
        <chart:chart svg:width="12cm" svg:height="7cm" xlink:href="." xlink:type="simple" chart:class="${chartClass}">
          <chart:title><text:p>${title}</text:p></chart:title>
          <chart:legend chart:legend-position="end"/>
          <chart:plot-area>
            ${axes}
            <chart:series chart:values-cell-range-address="local-table.$B$2:.$B$${endRow}" chart:label-cell-address="local-table.$B$1" chart:class="${chartClass}">${points}</chart:series>
            ${extraSeries}
          </chart:plot-area>
          <table:table table:name="local-table">
            <table:table-header-rows><table:table-row><table:table-cell/><table:table-cell office:value-type="string"><text:p>${title}</text:p></table:table-cell></table:table-row></table:table-header-rows>
            <table:table-rows>${rows}</table:table-rows>
          </table:table>
        </chart:chart>
      </office:chart></office:body>
    </office:document>
  </draw:object>
</draw:frame>`;
}

function count(xml, pattern) {
  return (String(xml || "").match(pattern) || []).length;
}

function snippet(xml, pattern, max = 900) {
  const match = String(xml || "").match(pattern);
  if (!match) return "(no match)";
  const start = Math.max(0, match.index - 40);
  return String(xml).slice(start, start + max).replace(/\s+/g, " ");
}

function cacheValues(xml, tag) {
  const block = String(xml || "").match(new RegExp(`<${tag}\\b[\\s\\S]*?<c:ptCount[^/]*/>[\\s\\S]*?</${tag}>`, "i"))
    || String(xml || "").match(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`, "i"));
  if (!block) return [];
  return [...block[0].matchAll(/<c:v>([^<]*)<\/c:v>/g)].map(m => m[1]);
}

function inspectChartXml(xml) {
  const compact = String(xml || "").replace(/\s+/g, " ");
  return {
    bytes: Buffer.byteLength(String(xml || ""), "utf8"),
    cBarChart: count(xml, /<c:barChart\b/g),
    cLineChart: count(xml, /<c:lineChart\b/g),
    cPieChart: count(xml, /<c:pieChart\b/g),
    cAreaChart: count(xml, /<c:areaChart\b/g),
    cStockChart: count(xml, /<c:stockChart\b/g),
    cRadarChart: count(xml, /<c:radarChart\b/g),
    cSer: count(xml, /<c:ser\b/g),
    titleText: [...String(xml || "").matchAll(/<c:title\b[\s\S]{0,400}?<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]),
    catCache: cacheValues(xml, "c:strCache") || cacheValues(xml, "c:numCache"),
    strCacheAll: cacheValues(xml, "c:strCache"),
    numCacheAll: cacheValues(xml, "c:numCache"),
    snippet: compact.slice(0, 1200)
  };
}

function inspectDocx(docxPath) {
  const entries = listZipEntries(docxPath).map(entry => entry.name);
  const documentXml = (readZipEntry(docxPath, "word/document.xml") || Buffer.alloc(0)).toString("utf8");
  const charts = entries.filter(name => /^word\/charts\/.+\.xml$/i.test(name));
  const embeddings = entries.filter(name => /^word\/embeddings\//i.test(name));
  const chartXml = charts.map(name => ({
    name,
    xml: (readZipEntry(docxPath, name) || Buffer.alloc(0)).toString("utf8")
  }));
  return {
    entries,
    charts,
    embeddings,
    documentXml,
    chartXml,
    markers: {
      wDrawing: count(documentXml, /<w:drawing\b/g),
      wpInline: count(documentXml, /<wp:inline\b/g),
      aGraphicChart: count(documentXml, /charts@openxmlformats\.org/g),
      wOle: count(documentXml, /<w:object\b|<o:OLEObject\b/gi)
    }
  };
}

function inspectFodt(fodt) {
  return {
    drawFrame: count(fodt, /<draw:frame\b/g),
    drawObject: count(fodt, /<draw:object\b/g),
    chartChart: count(fodt, /<chart:chart\b/g),
    chartClass: [...fodt.matchAll(/chart:class="([^"]+)"/g)].map(m => m[1]),
    series: count(fodt, /<chart:series\b/g),
    localTable: count(fodt, /table:name="local-table"/g),
    officeChart: count(fodt, /<office:chart\b/g)
  };
}

log("\n===== WRITER UI CHART HTML (generateChartHtml) =====");
const sampleOpts = {
  type: "bar",
  chartType: "bar",
  title: "CHART_BAR_Q",
  labels: ["Q1", "Q2", "Q3", "Q4"],
  data: [120, 190, 300, 250]
};
const html = generateChartHtml(sampleOpts);
const svg = generateChartSvg(sampleOpts);
fs.writeFileSync(path.join(outRoot, "writer-chart-sample.html"), html, "utf8");
fs.writeFileSync(path.join(outRoot, "writer-chart-sample.svg"), svg, "utf8");
log(`HTML_LEN=${html.length}`);
log(`HAS_DATA_VNO_CHART=${/\bdata-vno-chart=/.test(html)}`);
log(`HAS_DATA_CHART_TYPE=${/\bdata-chart-type=/.test(html)}`);
log(`HAS_DATA_CHART_TITLE=${/\bdata-chart-title\b/.test(html)}`);
log(`HAS_DATA_VNO_CHART_LABELS=${/\bdata-vno-chart-labels=/.test(html)}`);
log(`HAS_DATA_VNO_CHART_DATA=${/\bdata-vno-chart-data=/.test(html)}`);
log(`HAS_DATA_CHART_LABELS=${/\bdata-chart-labels=/.test(html)}`);
log(`HAS_DATA_CHART_VALUES=${/\bdata-chart-values=/.test(html)}`);
log(`HAS_JSON_ATTR=${/\bdata-[a-z0-9-]+=["']\[/.test(html)}`);
log(`TITLE_TAGS=${JSON.stringify([...svg.matchAll(/<title>([^<]*)<\/title>/g)].map(m => m[1]))}`);
log(`CHART_TYPE_ATTR=${(svg.match(/data-chart-type="([^"]+)"/) || [])[1] || ""}`);
log(`CHART_TITLE_TEXT=${(svg.match(/data-chart-title[^>]*>([^<]*)</) || [])[1] || ""}`);
log(`DELETE_BTN=${/\bvno-chart-delete-btn\b/.test(html)}`);
log(`TRAILING_P_BR=${/<p>\s*<br\s*\/?>\s*<\/p>\s*$/i.test(html)}`);
log(`HTML_SNIPPET=${html.replace(/\s+/g, " ").slice(0, 900)}`);

for (const type of ["bar", "line", "pie", "area"]) {
  const one = generateChartSvg({
    type,
    title: `TITLE_${type.toUpperCase()}`,
    labels: ["Alpha", "Beta: extra", "Gamma"],
    data: [10, 20.5, 0]
  });
  log(`SVG_${type}_TITLES=${JSON.stringify([...one.matchAll(/<title>([^<]*)<\/title>/g)].map(m => m[1]))}`);
  log(`SVG_${type}_TYPE=${(one.match(/data-chart-type="([^"]+)"/) || [])[1]}`);
}

const emptySvg = generateChartSvg({ type: "bar", title: "EMPTY", labels: [], data: [] });
log(`SVG_EMPTY=${emptySvg.replace(/\s+/g, " ").slice(0, 400)}`);

const fixtures = {
  "C1-chart-bar-as-char": wrapDocument({
    automatic: graphicOle,
    body: `<text:p>Bieu do cot: ${chartObject({ chartClass: "chart:bar", title: "CHART_BAR_Q", name: "ChartBar" })}</text:p>`
  }),
  "C2-chart-line-as-char": wrapDocument({
    automatic: graphicOle,
    body: `<text:p>${chartObject({ chartClass: "chart:line", title: "CHART_LINE_Q", name: "ChartLine" })}</text:p>`
  }),
  "C3-chart-circle-as-char": wrapDocument({
    automatic: graphicOle,
    body: `<text:p>${chartObject({ chartClass: "chart:circle", title: "CHART_PIE_Q", name: "ChartPie" })}</text:p>`
  }),
  "C5-chart-area-as-char": wrapDocument({
    automatic: graphicOle,
    body: `<text:p>${chartObject({ chartClass: "chart:area", title: "CHART_AREA_Q", name: "ChartArea" })}</text:p>`
  }),
  "C4-chart-sibling-of-p": wrapDocument({
    automatic: graphicOle,
    body: `<text:p>CHART_SIBLING_BEFORE</text:p>${chartObject({ chartClass: "chart:bar", title: "CHART_SIBLING", name: "ChartSibling" }).replace('text:anchor-type="as-char"', 'text:anchor-type="paragraph" svg:x="1cm" svg:y="0.5cm"')}<text:p>CHART_SIBLING_AFTER</text:p>`
  }),
  "C6-chart-two-series": wrapDocument({
    automatic: graphicOle,
    body: `<text:p>${chartObject({
      chartClass: "chart:bar",
      title: "CHART_TWO_SER",
      name: "ChartTwo",
      extraSeries: `<chart:series chart:values-cell-range-address="local-table.$B$2:.$B$5" chart:class="chart:bar"><chart:data-point/><chart:data-point/><chart:data-point/><chart:data-point/></chart:series>`
    })}</text:p>`
  })
};

function runFixture(id, fodtXml) {
  log(`\n===== FIXTURE ${id} =====`);
  const fodtPath = path.join(outRoot, `${id}.fodt`);
  fs.writeFileSync(fodtPath, fodtXml, "utf8");
  log(`INPUT_FODT_MARKERS=${JSON.stringify(inspectFodt(fodtXml))}`);
  const docxDir = path.join(outRoot, `${id}-docx`);
  let docxPath;
  try {
    docxPath = convertWithSoffice(fodtPath, "docx", docxDir, {
      appKind: "writer", profileDir: path.join(docxDir, "profile")
    });
    log(`DOCX_OK=${docxPath} bytes=${fs.statSync(docxPath).size}`);
  } catch (error) {
    log(`DOCX_FAIL=${error.message}`);
    return;
  }
  const docx = inspectDocx(docxPath);
  log(`ENTRIES_WORD=${docx.entries.filter(n => n.startsWith("word/")).join(" | ")}`);
  log(`CHARTS=${docx.charts.join(",") || "(none)"}`);
  log(`EMBED=${docx.embeddings.join(",") || "(none)"}`);
  log(`DOC_MARKERS=${JSON.stringify(docx.markers)}`);
  for (const chart of docx.chartXml) {
    const info = inspectChartXml(chart.xml);
    log(`CHART[${chart.name}]=${JSON.stringify({
      bytes: info.bytes,
      cBarChart: info.cBarChart,
      cLineChart: info.cLineChart,
      cPieChart: info.cPieChart,
      cAreaChart: info.cAreaChart,
      cStockChart: info.cStockChart,
      cRadarChart: info.cRadarChart,
      cSer: info.cSer,
      titleText: info.titleText,
      strCacheAll: info.strCacheAll,
      numCacheAll: info.numCacheAll
    })}`);
    log(`CHART[${chart.name}]_SNIPPET=${info.snippet}`);
    fs.writeFileSync(path.join(outRoot, `${id}-${path.basename(chart.name)}`), chart.xml, "utf8");
  }
  try {
    const canonPath = convertWithSoffice(fodtPath, "fodt", path.join(outRoot, `${id}-canon`), {
      appKind: "writer", profileDir: path.join(outRoot, `${id}-canon`, "profile")
    });
    const canon = fs.readFileSync(canonPath, "utf8");
    log(`CANON_FODT_OK bytes=${canon.length}`);
    log(`CANON_FODT_MARKERS=${JSON.stringify(inspectFodt(canon))}`);
    log(`CANON_CHART_SNIPPET=${snippet(canon, /<chart:chart\b[\s\S]{0,700}/, 800)}`);
  } catch (error) {
    log(`CANON_FODT_FAIL=${error.message}`);
  }
}

for (const [id, xml] of Object.entries(fixtures)) {
  runFixture(id, xml);
}

const reportPath = path.join(outRoot, "probe-e4-findings.txt");
fs.writeFileSync(reportPath, findings.join("\n"), "utf8");
log(`\nREPORT=${reportPath}`);
