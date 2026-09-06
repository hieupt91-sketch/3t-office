/**
 * Phase E.3 measurement probe — run BEFORE serializer code.
 * Hand-written ODF 1.3 FODT for:
 *   W) WordArt / Fontwork (draw:custom-shape fontwork-*)
 *   C) Chart (draw:frame + draw:object + nested office:chart)
 *   D) Diagram (multiple draw:rect + line/connector, optional draw:g)
 * plus reverse: a real Word VML WordArt DOCX → FODT.
 * Converts through real soffice to DOCX / PDF / canonical FODT.
 * Records measured XML — no guessing.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { createZip, listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const soffice = findSoffice();
if (!soffice) throw new Error("soffice not found");

const outRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodt-e3-probe-"));
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

const graphicSolid = (name, fill, stroke, strokeWidth = "0.05cm") => `<style:style style:name="${name}" style:family="graphic">
  <style:graphic-properties draw:fill="solid" draw:fill-color="${fill}" draw:stroke="solid" svg:stroke-color="${stroke}" svg:stroke-width="${strokeWidth}"
    style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>`;

const graphicNoneStroke = (name, stroke) => `<style:style style:name="${name}" style:family="graphic">
  <style:graphic-properties draw:fill="none" draw:stroke="solid" svg:stroke-color="${stroke}" svg:stroke-width="0.08cm"
    style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>`;

const graphicOle = `<style:style style:name="grOle" style:family="graphic">
  <style:graphic-properties draw:ole-draw-aspect="1" style:wrap="none"
    style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/>
</style:style>`;

const textImpact = `<style:style style:name="TWa" style:family="text">
  <style:text-properties fo:color="#1e3a8a" fo:font-size="36pt" fo:font-weight="bold"
    fo:font-family="Impact" style:font-family-asian="Impact" style:font-size-asian="36pt" style:font-weight-asian="bold"/>
</style:style>`;

function fontworkShape({
  name = "WordArt1",
  type = "fontwork-plain-text",
  path = "M 0 10800 L 21600 10800 Z N",
  anchor = "as-char",
  extraGeom = "",
  extraShape = "",
  text = "KHAI_GIANG",
  style = "grWa"
} = {}) {
  const pos = anchor === "as-char"
    ? `text:anchor-type="as-char"`
    : `text:anchor-type="paragraph" svg:x="1cm" svg:y="0.5cm"`;
  return `<draw:custom-shape draw:style-name="${style}" draw:name="${name}" ${pos} svg:width="10cm" svg:height="2.2cm"${extraShape}>
  <text:p><text:span text:style-name="TWa">${text}</text:span></text:p>
  <draw:enhanced-geometry svg:viewBox="0 0 21600 21600" draw:text-path="true" draw:text-path-allowed="true" draw:text-path-mode="shape" draw:type="${type}" draw:enhanced-path="${path}"${extraGeom}/>
</draw:custom-shape>`;
}

function chartObject({
  chartClass = "chart:bar",
  title = "Doanh thu Q1-Q4",
  labels = ["Q1", "Q2", "Q3", "Q4"],
  values = [120, 190, 300, 250],
  name = "Chart1"
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

const waStyles = `${graphicSolid("grWa", "#1e3a8a", "#ffffff", "0.06cm")}${textImpact}`;
const shapeStyles = `${graphicSolid("grBox", "#2563eb", "#1d4ed8")}${graphicNoneStroke("grLine", "#0f172a")}`;

const fixtures = {
  "W1-fontwork-plain-as-char": wrapDocument({
    automatic: waStyles,
    body: `<text:p>Truoc ${fontworkShape({ name: "WordArtAsChar", text: "KHAI_GIANG" })} sau.</text:p>`
  }),
  "W2-fontwork-plain-paragraph": wrapDocument({
    automatic: waStyles,
    body: `<text:p>Doan chu. ${fontworkShape({ name: "WordArtPara", anchor: "paragraph", text: "WORDART_PARA" })}</text:p>`
  }),
  "W3-fontwork-sibling-of-p": wrapDocument({
    automatic: waStyles,
    body: `<text:p>SIBLING_BEFORE</text:p>${fontworkShape({ name: "WordArtSibling", anchor: "paragraph", text: "WORDART_SIBLING" })}<text:p>SIBLING_AFTER</text:p>`
  }),
  "W4-fontwork-wave": wrapDocument({
    automatic: waStyles,
    body: `<text:p>${fontworkShape({
      name: "WordArtWave",
      type: "fontwork-wave",
      path: "M 0 10800 C 5400 16200 16200 5400 21600 10800 Z N",
      text: "WORDART_WAVE"
    })}</text:p>`
  }),
  "W5-fontwork-fill-navy": wrapDocument({
    automatic: waStyles,
    body: `<text:p>${fontworkShape({ name: "WordArtNavy", text: "NAVY_OUTLINE" })}</text:p>`
  }),
  "W6-textbox-not-fontwork": wrapDocument({
    automatic: `${waStyles}<style:style style:name="grTb" style:family="graphic"><style:graphic-properties draw:fill="none" draw:stroke="none" style:wrap="none"/></style:style>`,
    body: `<text:p>Truoc <draw:frame draw:style-name="grTb" draw:name="FakeWordArtBox" text:anchor-type="as-char" svg:width="10cm" svg:height="2.2cm"><draw:text-box><text:p><text:span text:style-name="TWa">TEXTBOX_NOT_FONTWORK</text:span></text:p></draw:text-box></draw:frame> sau.</text:p>`
  }),
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
  "C4-chart-sibling-of-p": wrapDocument({
    automatic: graphicOle,
    body: `<text:p>CHART_SIBLING_BEFORE</text:p>${chartObject({ chartClass: "chart:bar", title: "CHART_SIBLING", name: "ChartSibling" }).replace('text:anchor-type="as-char"', 'text:anchor-type="paragraph" svg:x="1cm" svg:y="0.5cm"')}<text:p>CHART_SIBLING_AFTER</text:p>`
  }),
  "D1-three-rects-plus-lines": wrapDocument({
    automatic: shapeStyles,
    body: `<text:p>
      <draw:rect draw:style-name="grBox" draw:name="Step1" text:anchor-type="paragraph" svg:x="0.5cm" svg:y="0.4cm" svg:width="3.2cm" svg:height="1.6cm"><text:p>BUOC_MOT</text:p></draw:rect>
      <draw:rect draw:style-name="grBox" draw:name="Step2" text:anchor-type="paragraph" svg:x="5cm" svg:y="0.4cm" svg:width="3.2cm" svg:height="1.6cm"><text:p>BUOC_HAI</text:p></draw:rect>
      <draw:rect draw:style-name="grBox" draw:name="Step3" text:anchor-type="paragraph" svg:x="9.5cm" svg:y="0.4cm" svg:width="3.2cm" svg:height="1.6cm"><text:p>BUOC_BA</text:p></draw:rect>
      <draw:line draw:style-name="grLine" draw:name="Link12" text:anchor-type="paragraph" svg:x1="3.7cm" svg:y1="1.2cm" svg:x2="5cm" svg:y2="1.2cm"><text:p/></draw:line>
      <draw:line draw:style-name="grLine" draw:name="Link23" text:anchor-type="paragraph" svg:x1="8.2cm" svg:y1="1.2cm" svg:x2="9.5cm" svg:y2="1.2cm"><text:p/></draw:line>
    </text:p>`
  }),
  "D2-draw-g-group": wrapDocument({
    automatic: shapeStyles,
    body: `<text:p>
      <draw:g draw:name="ProcessGroup" text:anchor-type="paragraph" svg:x="0.5cm" svg:y="0.4cm">
        <draw:rect draw:style-name="grBox" draw:name="GStep1" svg:x="0cm" svg:y="0cm" svg:width="3cm" svg:height="1.5cm"><text:p>GROUP_MOT</text:p></draw:rect>
        <draw:rect draw:style-name="grBox" draw:name="GStep2" svg:x="4cm" svg:y="0cm" svg:width="3cm" svg:height="1.5cm"><text:p>GROUP_HAI</text:p></draw:rect>
        <draw:line draw:style-name="grLine" draw:name="GLink" svg:x1="3cm" svg:y1="0.75cm" svg:x2="4cm" svg:y2="0.75cm"><text:p/></draw:line>
      </draw:g>
    </text:p>`
  }),
  "D3-draw-connector": wrapDocument({
    automatic: shapeStyles,
    body: `<text:p>
      <draw:rect draw:style-name="grBox" draw:name="ConnA" text:anchor-type="paragraph" svg:x="0.5cm" svg:y="0.5cm" svg:width="3cm" svg:height="1.5cm"><text:p>CONN_A</text:p></draw:rect>
      <draw:rect draw:style-name="grBox" draw:name="ConnB" text:anchor-type="paragraph" svg:x="7cm" svg:y="0.5cm" svg:width="3cm" svg:height="1.5cm"><text:p>CONN_B</text:p></draw:rect>
      <draw:connector draw:style-name="grLine" draw:name="ConnAB" text:anchor-type="paragraph" draw:type="standard" svg:x1="3.5cm" svg:y1="1.25cm" svg:x2="7cm" svg:y2="1.25cm"><text:p/></draw:connector>
    </text:p>`
  })
};

function count(xml, pattern) {
  return (String(xml || "").match(pattern) || []).length;
}

function snippet(xml, pattern, max = 900) {
  const match = String(xml || "").match(pattern);
  if (!match) return "(no match)";
  const start = Math.max(0, match.index - 60);
  return String(xml).slice(start, start + max).replace(/\s+/g, " ");
}

function xmlText(xml) {
  return String(xml || "").replace(/<w:tab\/>/g, "\t").replace(/<w:br\/>/g, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim();
}

function inspectDocx(docxPath) {
  const entries = listZipEntries(docxPath).map(entry => entry.name);
  const documentXml = (readZipEntry(docxPath, "word/document.xml") || Buffer.alloc(0)).toString("utf8");
  const charts = entries.filter(name => /^word\/charts\//i.test(name));
  const embeddings = entries.filter(name => /^word\/embeddings\//i.test(name));
  const drawings = entries.filter(name => /drawing|diagram|smartArt/i.test(name));
  const media = entries.filter(name => /^word\/media\//i.test(name));
  const chartXml = charts.map(name => ({
    name,
    xml: (readZipEntry(docxPath, name) || Buffer.alloc(0)).toString("utf8")
  }));
  const markers = {
    wPict: count(documentXml, /<w:pict\b/g),
    vShape: count(documentXml, /<v:shape\b/g),
    vTextpath: count(documentXml, /<v:textpath\b/g),
    mcAlternate: count(documentXml, /<mc:AlternateContent\b/g),
    wDrawing: count(documentXml, /<w:drawing\b/g),
    wpsWsp: count(documentXml, /<wps:wsp\b/g),
    prstTxWarp: count(documentXml, /<a:prstTxWarp\b/g),
    prstGeom: count(documentXml, /<a:prstGeom\b/g),
    wChart: count(documentXml, /<c:chart\b/g) + chartXml.reduce((n, c) => n + count(c.xml, /<c:chart\b/g), 0),
    cBarChart: chartXml.reduce((n, c) => n + count(c.xml, /<c:barChart\b/g), 0),
    cLineChart: chartXml.reduce((n, c) => n + count(c.xml, /<c:lineChart\b/g), 0),
    cPieChart: chartXml.reduce((n, c) => n + count(c.xml, /<c:pieChart\b/g), 0),
    cAreaChart: chartXml.reduce((n, c) => n + count(c.xml, /<c:areaChart\b/g), 0),
    wOle: count(documentXml, /<w:object\b|<o:OLEObject\b/gi),
    smartArt: count(documentXml, /smartArt|dgm:|wpg:wgp/gi),
    wpg: count(documentXml, /<wpg:wgp\b/g),
    connector: count(documentXml, /<a:prstGeom prst="straightConnector1"|<a:prstGeom prst="line"/g)
  };
  const geomHits = [...documentXml.matchAll(/prst="([^"]+)"/g)].map(m => m[1]);
  const textpathHits = [...documentXml.matchAll(/<v:textpath\b[^>]*>/gi)].map(m => m[0].replace(/\s+/g, " ").slice(0, 240));
  return {
    entries, charts, embeddings, drawings, media, markers, geomHits, textpathHits,
    documentXml, chartXml, text: xmlText(documentXml)
  };
}

function inspectFodt(fodt) {
  return {
    customShape: count(fodt, /<draw:custom-shape\b/g),
    fontworkType: [...fodt.matchAll(/draw:type="(fontwork-[^"]+)"/g)].map(m => m[1]),
    textPath: count(fodt, /draw:text-path="true"/g),
    drawFrame: count(fodt, /<draw:frame\b/g),
    drawObject: count(fodt, /<draw:object\b/g),
    chartChart: count(fodt, /<chart:chart\b/g),
    chartClass: [...fodt.matchAll(/chart:class="([^"]+)"/g)].map(m => m[1]),
    drawRect: count(fodt, /<draw:rect\b/g),
    drawLine: count(fodt, /<draw:line\b/g),
    drawConnector: count(fodt, /<draw:connector\b/g),
    drawG: count(fodt, /<draw:g\b/g),
    fontworkSnippet: snippet(fodt, /<draw:custom-shape\b[\s\S]{0,700}/, 800),
    chartSnippet: snippet(fodt, /<chart:chart\b[\s\S]{0,500}/, 600),
    objectSnippet: snippet(fodt, /<draw:object\b[\s\S]{0,400}/, 500)
  };
}

function inspectPdf(pdfPath) {
  if (!pdfPath || !fs.existsSync(pdfPath)) return { exists: false };
  const bytes = fs.readFileSync(pdfPath);
  const latin = bytes.toString("latin1");
  const needles = [
    "KHAI_GIANG", "WORDART_PARA", "WORDART_SIBLING", "WORDART_WAVE", "NAVY_OUTLINE",
    "TEXTBOX_NOT_FONTWORK", "CHART_BAR_Q", "CHART_LINE_Q", "CHART_PIE_Q", "CHART_SIBLING",
    "BUOC_MOT", "BUOC_HAI", "GROUP_MOT", "CONN_A", "WORDART_BODY_VML"
  ];
  const found = {};
  for (const needle of needles) found[needle] = latin.includes(needle);
  return { exists: true, bytes: bytes.length, found, mediaBox: (latin.match(/\/MediaBox\s*\[[^\]]+\]/g) || []).slice(0, 2) };
}

function dumpDocx(id, docx) {
  log(`  ENTRIES=${docx.entries.join(" | ")}`);
  log(`  CHARTS=${docx.charts.join(",") || "(none)"}`);
  log(`  EMBED=${docx.embeddings.join(",") || "(none)"}`);
  log(`  DRAW=${docx.drawings.join(",") || "(none)"}`);
  log(`  MEDIA=${docx.media.join(",") || "(none)"}`);
  log(`  MARKERS=${JSON.stringify(docx.markers)}`);
  log(`  GEOM=${JSON.stringify(docx.geomHits.slice(0, 20))}`);
  log(`  TEXTPATH=${docx.textpathHits.join(" || ") || "(none)"}`);
  log(`  DOC_TEXT=${JSON.stringify(docx.text.slice(0, 400))}`);
  log(`  DOC_SNIPPET=${snippet(docx.documentXml, /<w:(drawing|pict|object|r)\b[\s\S]{0,700}/, 900)}`);
  for (const chart of docx.chartXml) {
    log(`  CHART[${chart.name}]_SNIPPET=${chart.xml.replace(/\s+/g, " ").slice(0, 900)}`);
    log(`  CHART[${chart.name}]_CLASS_HITS=${JSON.stringify({
      bar: count(chart.xml, /<c:barChart\b/g),
      line: count(chart.xml, /<c:lineChart\b/g),
      pie: count(chart.xml, /<c:pieChart\b/g),
      area: count(chart.xml, /<c:areaChart\b/g),
      title: snippet(chart.xml, /<c:title\b[\s\S]{0,200}/, 240)
    })}`);
  }
}

function runFixture(id, fodtXml, { pdf = false, canon = true } = {}) {
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
  if (pdf) {
    try {
      const pdfPath = convertWithSoffice(fodtPath, "pdf", path.join(outRoot, `${id}-pdf`), {
        appKind: "writer", profileDir: path.join(outRoot, `${id}-pdf`, "profile")
      });
      log(`PDF_OK=${pdfPath} ${JSON.stringify(inspectPdf(pdfPath))}`);
    } catch (error) {
      log(`PDF_FAIL=${error.message}`);
    }
  }
  if (canon) {
    try {
      const canonPath = convertWithSoffice(fodtPath, "fodt", path.join(outRoot, `${id}-canon`), {
        appKind: "writer", profileDir: path.join(outRoot, `${id}-canon`, "profile")
      });
      const canon = fs.readFileSync(canonPath, "utf8");
      log(`CANON_FODT_OK bytes=${canon.length}`);
      log(`CANON_FODT_MARKERS=${JSON.stringify(inspectFodt(canon))}`);
    } catch (error) {
      log(`CANON_FODT_FAIL=${error.message}`);
    }
  }
  dumpDocx(id, inspectDocx(docxPath));
}

const pdfIds = new Set([
  "W1-fontwork-plain-as-char",
  "W5-fontwork-fill-navy",
  "C1-chart-bar-as-char",
  "D1-three-rects-plus-lines"
]);

for (const [id, xml] of Object.entries(fixtures)) {
  runFixture(id, xml, { pdf: pdfIds.has(id), canon: true });
}

function wordArtBodyDocx() {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
            xmlns:v="urn:schemas-microsoft-com:vml"
            xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w10="urn:schemas-microsoft-com:office:word">
  <w:body>
    <w:p>
      <w:r><w:t xml:space="preserve">Truoc </w:t></w:r>
      <w:r>
        <w:rPr><w:noProof/></w:rPr>
        <w:pict>
          <v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e">
            <v:formulas>
              <v:f eqn="sum #0 0 10800"/>
              <v:f eqn="prod #0 2 1"/>
              <v:f eqn="sum 21600 0 @1"/>
              <v:f eqn="sum 0 0 @2"/>
              <v:f eqn="sum 21600 0 @3"/>
              <v:f eqn="if @0 @3 0"/>
              <v:f eqn="if @0 21600 @1"/>
              <v:f eqn="if @0 0 @2"/>
              <v:f eqn="if @0 @4 21600"/>
              <v:f eqn="mid @5 @6"/>
              <v:f eqn="mid @8 @5"/>
              <v:f eqn="mid @7 @8"/>
              <v:f eqn="mid @6 @7"/>
            </v:formulas>
            <v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/>
            <v:textpath on="t" fitshape="t"/>
            <v:handles><v:h position="#0,bottomRight" xrange="6629,14971"/></v:handles>
            <o:lock v:ext="edit" text="t" shapetype="t"/>
          </v:shapetype>
          <v:shape id="WordArt 2" o:spid="_x0000_s1026" type="#_x0000_t136"
            style="width:240pt;height:50pt" fillcolor="#1E3A8A" strokecolor="white" strokeweight="1pt">
            <v:fill color2="#1D4ED8" type="gradient"/>
            <v:textpath style="font-family:&quot;Impact&quot;;font-size:36pt;v-text-kern:t" string="WORDART_BODY_VML"/>
          </v:shape>
        </w:pict>
      </w:r>
      <w:r><w:t xml:space="preserve"> sau.</w:t></w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
  return createZip([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rootRels },
    { name: "word/document.xml", data: documentXml },
    { name: "word/_rels/document.xml.rels", data: docRels },
    { name: "word/styles.xml", data: stylesXml }
  ]);
}

log("\n===== REVERSE WR1-word-vml-wordart-body-docx → FODT/DOCX =====");
const wordDocxPath = path.join(outRoot, "WR1-word-vml-wordart.docx");
fs.writeFileSync(wordDocxPath, wordArtBodyDocx());
log(`WORD_DOCX_INPUT=${wordDocxPath} bytes=${fs.statSync(wordDocxPath).size}`);
dumpDocx("WR1-input", inspectDocx(wordDocxPath));

try {
  const reverseFodt = convertWithSoffice(wordDocxPath, "fodt", path.join(outRoot, "WR1-reverse-fodt"), {
    appKind: "writer", profileDir: path.join(outRoot, "WR1-reverse-fodt", "profile")
  });
  const reverseXml = fs.readFileSync(reverseFodt, "utf8");
  fs.writeFileSync(path.join(outRoot, "WR1-word-vml-wordart.fodt"), reverseXml, "utf8");
  log(`REVERSE_FODT_OK bytes=${reverseXml.length}`);
  log(`REVERSE_FODT_MARKERS=${JSON.stringify(inspectFodt(reverseXml))}`);
  log(`REVERSE_FODT_CUSTOM_SNIPPET=${snippet(reverseXml, /<draw:custom-shape\b[\s\S]{0,1200}/, 1400)}`);
  log(`REVERSE_FODT_HAS_WORDART_BODY_VML=${reverseXml.includes("WORDART_BODY_VML")}`);
  try {
    const roundDocx = convertWithSoffice(reverseFodt, "docx", path.join(outRoot, "WR1-round-docx"), {
      appKind: "writer", profileDir: path.join(outRoot, "WR1-round-docx", "profile")
    });
    log("REVERSE_ROUNDTRIP_DOCX:");
    dumpDocx("WR1-round", inspectDocx(roundDocx));
  } catch (error) {
    log(`REVERSE_ROUNDTRIP_DOCX_FAIL=${error.message}`);
  }
} catch (error) {
  log(`REVERSE_FODT_FAIL=${error.message}`);
}

const dumpPath = path.join(outRoot, "probe-e3-findings.txt");
fs.writeFileSync(dumpPath, findings.join("\n"), "utf8");
log(`\nDUMP=${dumpPath}`);
log("PROBE_DONE");
