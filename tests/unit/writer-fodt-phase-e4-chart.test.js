import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { generateChartHtml } from "../../apps/writer/writer-illustrations.js";

function adapterWithZones({ body = "", header = null } = {}) {
  const bodyEl = { innerHTML: body };
  const headerEl = header == null ? null : {
    innerHTML: header,
    get innerText() { return String(this.innerHTML).replace(/<[^>]+>/g, " "); }
  };
  const editor = {
    innerHTML: body,
    querySelector(selector) {
      if (selector === ".vno-writer-body") return bodyEl;
      if (selector === ".vno-writer-header") return headerEl;
      return null;
    }
  };
  const adapter = new WriterAdapter(editor);
  return { adapter, body: bodyEl, header: headerEl };
}

function chartHtml(options) {
  return generateChartHtml(options).replace(/\s*<p>\s*<br\s*\/?>\s*<\/p>\s*$/i, "").trim();
}

function wrapFodt({ automatic = "", master, body }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>${automatic}</office:automatic-styles>
<office:master-styles>${master}</office:master-styles>
<office:body><office:text>${body}</office:text></office:body>
</office:document>`;
}

const a4Layout = `<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/></style:page-layout>`;
const graphicOle = `<style:style style:name="gr1" style:family="graphic"><style:graphic-properties draw:fill="none" draw:stroke="none" draw:ole-draw-aspect="1" style:wrap="none" style:vertical-pos="from-top" style:vertical-rel="paragraph" style:horizontal-pos="from-left" style:horizontal-rel="paragraph"/></style:style>`;

function nestedChart({
  chartClass = "chart:bar",
  title = "CHART_BAR_Q",
  labels = ["Q1", "Q2", "Q3", "Q4"],
  values = [120, 190, 300, 250],
  extraSeries = "",
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
  return `<text:p><draw:frame draw:style-name="gr1" draw:name="${name}" text:anchor-type="as-char" svg:width="12cm" svg:height="7cm"><draw:object>
    <office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.chart">
      <office:body><office:chart>
        <chart:chart svg:width="12cm" svg:height="7cm" xlink:href="." xlink:type="simple" chart:class="${chartClass}">
          <chart:title><text:p>${title}</text:p></chart:title>
          <chart:legend chart:legend-position="end"/>
          <chart:plot-area>${axes}<chart:series chart:values-cell-range-address="local-table.$B$2:.$B$${endRow}" chart:label-cell-address="local-table.$B$1" chart:class="${chartClass}">${points}</chart:series>${extraSeries}</chart:plot-area>
          <table:table table:name="local-table">
            <table:table-header-columns><table:table-column/></table:table-header-columns>
            <table:table-columns><table:table-column/></table:table-columns>
            <table:table-header-rows><table:table-row><table:table-cell/><table:table-cell office:value-type="string"><text:p>${title}</text:p></table:table-cell></table:table-row></table:table-header-rows>
            <table:table-rows>${rows}</table:table-rows>
          </table:table>
        </chart:chart>
      </office:chart></office:body>
    </office:document>
  </draw:object></draw:frame></text:p>`;
}

export async function runWriterFodtPhaseE4ChartTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Writer FODT Phase E.4 serializes bar chart as office:chart as-char with complete local-table", () => {
    const html = chartHtml({
      type: "bar",
      title: "CHART_BAR_Q",
      labels: ["Q1", "Q2", "Q3", "Q4"],
      data: [120, 190, 300, 250]
    });
    const { adapter } = adapterWithZones({ body: html });
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /xmlns:chart="urn:oasis:names:tc:opendocument:xmlns:chart:1.0"/);
    assert.match(fodt, /text:anchor-type="as-char"/);
    assert.match(fodt, /chart:class="chart:bar"/);
    assert.match(fodt, /draw:ole-draw-aspect="1"/);
    assert.match(fodt, /<table:table-header-columns>/);
    assert.match(fodt, /<table:table-columns>/);
    assert.match(fodt, /table:name="local-table"/);
    assert.match(fodt, /office:value="120"/);
    assert.match(fodt, />Q1</);
    assert.match(fodt, />CHART_BAR_Q</);
    assert.doesNotMatch(fodt, /vno-chart-delete-btn/);
    assert.doesNotMatch(fodt, /data-vno-chart/);
  });

  await test("Writer FODT Phase E.4 maps line/pie/area to chart:line/circle/area", () => {
    const cases = [
      ["line", "chart:line"],
      ["pie", "chart:circle"],
      ["area", "chart:area"]
    ];
    for (const [ui, odf] of cases) {
      const html = chartHtml({
        type: ui,
        title: `TITLE_${ui}`,
        labels: ["Q1", "Q2"],
        data: [10, 20]
      });
      const { adapter } = adapterWithZones({ body: html });
      const fodt = adapter.serializeToFodt();
      assert.match(fodt, new RegExp(`chart:class="${odf}"`));
      assert.match(fodt, /office:value="10"/);
      assert.match(fodt, /office:value="20"/);
      if (ui === "pie") {
        assert.doesNotMatch(fodt, /chart:axis chart:dimension="x"/);
      } else {
        assert.match(fodt, /chart:axis chart:dimension="x"/);
      }
    }
  });

  await test("Writer FODT Phase E.4 bar chart round-trip is exactly idempotent", () => {
    const html = chartHtml({
      type: "bar",
      title: "CHART_BAR_Q",
      labels: ["Q1", "Q2", "Q3", "Q4"],
      data: [120, 190, 300, 250]
    });
    const initial = adapterWithZones({ body: html });
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithZones({ body: "<p>không giữ</p>" });
    const out = parsed.adapter.parseFodt(first);
    assert.equal(parsed.body.innerHTML, out);
    assert.match(parsed.body.innerHTML, /data-vno-chart="true"/);
    assert.match(parsed.body.innerHTML, /data-chart-type="bar"/);
    assert.match(parsed.body.innerHTML, /<title>Q1: 120<\/title>/);
    assert.match(parsed.body.innerHTML, /CHART_BAR_Q/);
    assert.equal(parsed.adapter.shapes.length, 0);
    assert.equal(parsed.adapter.serializeToFodt(), first);
  });

  await test("Writer FODT Phase E.4 parse circle chart restores pie SVG data", () => {
    const { adapter, body } = adapterWithZones({ body: "<p>xóa</p>" });
    adapter.parseFodt(wrapFodt({
      automatic: `${a4Layout}${graphicOle}`,
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"/>`,
      body: nestedChart({ chartClass: "chart:circle", title: "CHART_PIE_Q" })
    }));
    assert.match(body.innerHTML, /data-chart-type="pie"/);
    assert.match(body.innerHTML, /CHART_PIE_Q/);
    assert.match(body.innerHTML, /<title>Q3: 300<\/title>/);
    assert.equal(adapter.shapes.length, 0);
  });

  await test("Writer FODT Phase E.4 documents without chart do not emit chart namespace", () => {
    const { adapter } = adapterWithZones({ body: "<p>Không biểu đồ</p>" });
    const fodt = adapter.serializeToFodt();
    assert.doesNotMatch(fodt, /xmlns:chart=/);
    assert.doesNotMatch(fodt, /<chart:chart\b/);
    assert.doesNotMatch(fodt, /draw:ole-draw-aspect/);
  });

  await test("Writer FODT Phase E.4 rejects empty chart without source values", () => {
    const { adapter, body } = adapterWithZones({
      body: '<div class="vno-writer-chart" data-vno-chart="true"><svg data-chart-type="bar"><text>EMPTY</text><text>Không có dữ liệu</text></svg></div>'
    });
    assert.throws(() => adapter.serializeToFodt(), error => (
      error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT"
      && /dữ liệu gốc|title/i.test(error.message)
    ));
    assert.match(body.innerHTML, /EMPTY/);
  });

  await test("Writer FODT Phase E.4 rejects chart in header without mutating body", () => {
    const html = chartHtml({ type: "bar", title: "HEADER_CHART", labels: ["A"], data: [1] });
    const { adapter, body } = adapterWithZones({
      body: "<p>Giữ</p>",
      header: html
    });
    assert.throws(() => adapter.serializeToFodt(), error => (
      error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT"
      && /header\/footer/.test(error.message)
    ));
    assert.equal(body.innerHTML, "<p>Giữ</p>");
  });

  await test("Writer FODT Phase E.4 rejects two series without mutating body", () => {
    const { adapter, body } = adapterWithZones({ body: "<p>Giữ</p>" });
    const xml = wrapFodt({
      automatic: `${a4Layout}${graphicOle}`,
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"/>`,
      body: nestedChart({
        extraSeries: `<chart:series chart:values-cell-range-address="local-table.$B$2:.$B$5" chart:class="chart:bar"><chart:data-point/><chart:data-point/><chart:data-point/><chart:data-point/></chart:series>`
      })
    });
    assert.throws(() => adapter.parseFodt(xml), error => (
      error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT"
      && /series/.test(error.message)
    ));
    assert.equal(body.innerHTML, "<p>Giữ</p>");
  });

  await test("Writer FODT Phase E.4 rejects stock chart class without mutating body", () => {
    const { adapter, body } = adapterWithZones({ body: "<p>Giữ</p>" });
    const xml = wrapFodt({
      automatic: `${a4Layout}${graphicOle}`,
      master: `<style:master-page style:name="Standard" style:page-layout-name="pm1"/>`,
      body: nestedChart({ chartClass: "chart:stock", title: "STOCK" })
    });
    assert.throws(() => adapter.parseFodt(xml), error => (
      error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT"
      && /chart:class/.test(error.message)
    ));
    assert.equal(body.innerHTML, "<p>Giữ</p>");
  });

  await test("Writer FODT Phase E.4 still throws on diagram blocks", () => {
    const { adapter, body } = adapterWithZones({
      body: '<div class="vno-writer-diagram" data-vno-diagram="true" data-diagram-type="process"><div class="vno-diagram-node">Bước 1</div></div>'
    });
    assert.throws(() => adapter.serializeToFodt(), error => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
    assert.match(body.innerHTML, /data-vno-diagram/);
  });

  return results;
}
