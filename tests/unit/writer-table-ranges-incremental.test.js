/**
 * Doc: the table-range bookkeeping of _applyOoxmlTableColumnGeometry / _applyOoxmlTableCellMargins is now computed
 * once and shifted per edit (O(tables) instead of rescanning the whole HTML per table). The result must equal the
 * rescanning version (kept behind globalThis.__VNO_OPEN_LEGACY) on nested and sibling tables.
 */
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

export async function runWriterTableRangesIncrementalTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const check = (condition, message) => { if (!condition) throw new Error(message); };
  const bothWays = (run) => {
    const previous = globalThis.__VNO_OPEN_LEGACY;
    try {
      globalThis.__VNO_OPEN_LEGACY = true;
      const legacy = run();
      globalThis.__VNO_OPEN_LEGACY = false;
      const fast = run();
      return { legacy, fast };
    } finally {
      if (previous === undefined) delete globalThis.__VNO_OPEN_LEGACY; else globalThis.__VNO_OPEN_LEGACY = previous;
    }
  };

  const html = "<body>"
    + '<table width="100%"><colgroup><col width="50"><col width="50"></colgroup>'
    + '<tr><td width="50%">A<table width="40"><col width="40"><tr><td>n1</td></tr></table>'
    + '<table width="30"><col width="30"><tr><td>n2</td></tr></table></td><td width="50%">B</td></tr></table>'
    + "<p>between</p>"
    + '<table width="100%"><colgroup><col width="30"><col width="70"></colgroup><tr><td width="30%">C</td><td width="70%">D</td></tr></table>'
    + "</body>";
  const grid = (...widths) => `<w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`;
  const geometryXml = "<w:document><w:body>"
    + `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/></w:tblPr>${grid(2000, 6000)}`
    + `<w:tr><w:tc><w:p/><w:tbl>${grid(1500)}<w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl><w:tbl>${grid(900)}<w:tr><w:tc><w:p/></w:tc></w:tr></w:tbl></w:tc><w:tc><w:p/></w:tc></w:tr></w:tbl>`
    + `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/></w:tblPr>${grid(1000, 7000)}<w:tr><w:tc><w:p/></w:tc><w:tc><w:p/></w:tc></w:tr></w:tbl>`
    + '<w:sectPr><w:pgSz w:w="11907" w:h="16839"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>';

  await test("column geometry: nested + sibling tables give the same HTML with the incremental ranges", () => {
    const { legacy, fast } = bothWays(() => new WriterAdapter(null)._applyOoxmlTableColumnGeometry(html, geometryXml));
    check(legacy !== html, "the fixture must actually change the HTML (otherwise the test proves nothing)");
    check(fast === legacy, `incremental result differs:\nlegacy=${legacy}\nfast=${fast}`);
  });

  const mar = (top, left) => `<w:tcMar><w:top w:w="${top}" w:type="dxa"/><w:left w:w="${left}" w:type="dxa"/><w:bottom w:w="${top}" w:type="dxa"/><w:right w:w="30" w:type="dxa"/></w:tcMar>`;
  const cell = (m, inner = "<w:p/>") => `<w:tc><w:tcPr>${m}</w:tcPr>${inner}</w:tc>`;
  const marginXml = "<w:document><w:body>"
    + `<w:tbl><w:tr>${cell(mar(60, 75), `<w:p/><w:tbl><w:tr>${cell(mar(20, 40))}</w:tr></w:tbl><w:tbl><w:tr>${cell(mar(10, 20))}</w:tr></w:tbl>`)}${cell(mar(80, 90))}</w:tr></w:tbl>`
    + `<w:tbl><w:tr>${cell(mar(30, 35))}${cell(mar(40, 45))}</w:tr></w:tbl>`
    + "</w:body></w:document>";
  const marginHtml = '<body><table data-vno-border-px="1"><tr><td style="padding: 0cm">A<table><tr><td>n1</td></tr></table><table><tr><td>n2</td></tr></table></td><td>B</td></tr></table>'
    + '<p>x</p><table data-vno-border-px="1"><tr><td>C</td><td>D</td></tr></table></body>';

  await test("cell margins: nested + sibling tables give the same HTML with the incremental ranges", () => {
    const { legacy, fast } = bothWays(() => new WriterAdapter(null)._applyOoxmlTableCellMargins(marginHtml, marginXml));
    check(legacy !== marginHtml, "the fixture must actually change the HTML");
    check(fast === legacy, `incremental result differs:\nlegacy=${legacy}\nfast=${fast}`);
    check(/padding:\s*1px\s+2px\s+1px\s+1px/.test(fast) || /padding:/.test(fast), "padding must be written");
  });

  await test("verify mode runs both ways and records no mismatch on these fixtures", () => {
    const previous = globalThis.__VNO_WRITER_VERIFY;
    globalThis.__VNO_WRITER_VERIFY = true;
    globalThis.__vnoWriterVerifyMismatches = [];
    globalThis.__vnoWriterVerifyRuns = {};
    try {
      new WriterAdapter(null)._applyOoxmlTableColumnGeometry(html, geometryXml);
      new WriterAdapter(null)._applyOoxmlTableCellMargins(marginHtml, marginXml);
      check(globalThis.__vnoWriterVerifyMismatches.length === 0, JSON.stringify(globalThis.__vnoWriterVerifyMismatches));
      check(globalThis.__vnoWriterVerifyRuns.tableColumnGeometry === 1 && globalThis.__vnoWriterVerifyRuns.tableCellMargins === 1, JSON.stringify(globalThis.__vnoWriterVerifyRuns));
    } finally {
      if (previous === undefined) delete globalThis.__VNO_WRITER_VERIFY; else globalThis.__VNO_WRITER_VERIFY = previous;
      delete globalThis.__vnoWriterVerifyMismatches;
      delete globalThis.__vnoWriterVerifyRuns;
    }
  });

  return results;
}
