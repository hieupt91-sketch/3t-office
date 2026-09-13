/**
 * VN Sheet — Unit Tests for Cell Text Fit & Dimension Precision
 * Tuân thủ TASK-BRIEF-AGY-CELL-TEXT-FIT.md:
 * - Quy đổi đơn vị cm/in/pt/mm/pc/px -> px chuẩn @96dpi
 * - Quy đổi cỡ chữ pt -> px làm tròn 2 chữ số (không sinh ra 15.9996px)
 * - Không ép kích thước cột/hàng về mặc định (_isCloseToDefault)
 * - Padding ô và text overflow: ô trống bên phải thì tràn (visible, không '…'),
 *   ô kế bên có dữ liệu thì cắt cứng (clip, không '…'), số không tràn
 * - Độ rộng ô gộp (colSpan/rowSpan) tính đúng tổng các cột/hàng
 */

import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertClose(a, b, msg, tolerance = 0.01) {
  assert(Math.abs(Number(a) - Number(b)) <= tolerance, `${msg}: expected ~${b} got ${a}`);
}

function createMockTd(coord = "A1") {
  const classListSet = new Set(["vno-grid-cell"]);
  return {
    style: {},
    dataset: { coord },
    textContent: "",
    innerHTML: "",
    colSpan: 1,
    rowSpan: 1,
    classList: {
      add(...cls) { cls.forEach(c => classListSet.add(c)); },
      remove(...cls) { cls.forEach(c => classListSet.delete(c)); },
      toggle(cls, force) {
        if (force === undefined) {
          if (classListSet.has(cls)) classListSet.delete(cls);
          else classListSet.add(cls);
        } else if (force) {
          classListSet.add(cls);
        } else {
          classListSet.delete(cls);
        }
      },
      contains(cls) { return classListSet.has(cls); }
    }
  };
}

function createMockGridController(opts = {}) {
  const domMap = new Map();
  const mockContainer = {
    setAttribute() {},
    focus() {},
    querySelector(sel) {
      const coordMatch = sel.match(/data-coord="([^"]+)"/);
      if (coordMatch) {
        const coord = coordMatch[1];
        if (!domMap.has(coord)) {
          domMap.set(coord, createMockTd(coord));
        }
        return domMap.get(coord);
      }
      return null;
    },
    querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild() {},
    remove() {}
  };

  const grid = new SheetGridController(mockContainer);
  if (opts.colWidths) {
    for (const [col, w] of Object.entries(opts.colWidths)) {
      grid._colWidths().set(col, w);
    }
  }
  if (opts.rowHeights) {
    for (const [row, h] of Object.entries(opts.rowHeights)) {
      grid._rowHeights().set(Number(row), h);
    }
  }
  return grid;
}

export async function runSheetCellTextFitTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  const adapter = new SheetAdapter();

  // =========================================================================
  // 1. Quy đổi chiều dài ODF sang px @96dpi
  // =========================================================================
  test("ODF Unit: _odfLengthToPx chuyển đổi cm sang px chính xác @96dpi", () => {
    // 2.54cm = exactly 1 inch = 96px
    assert(adapter._odfLengthToPx("2.54cm") === 96, "2.54cm phải là 96px");
    // Cột A trong file Dahua: 1.203cm = 1.203 * 96 / 2.54 = 45.4677px -> 45px
    assert(adapter._odfLengthToPx("1.203cm") === 45, `1.203cm phải là 45px, nhận: ${adapter._odfLengthToPx("1.203cm")}`);
    // Cột B trong file Dahua: 10.601cm = 10.601 * 96 / 2.54 = 400.667px -> 401px
    assert(adapter._odfLengthToPx("10.601cm") === 401, `10.601cm phải là 401px, nhận: ${adapter._odfLengthToPx("10.601cm")}`);
    // Cột C trong file Dahua: 9.509cm = 9.509 * 96 / 2.54 = 359.395px -> 359px
    assert(adapter._odfLengthToPx("9.509cm") === 359, `9.509cm phải là 359px, nhận: ${adapter._odfLengthToPx("9.509cm")}`);
    // Cột D trong file Dahua: 20.11cm = 20.11 * 96 / 2.54 = 760.063px -> 760px
    assert(adapter._odfLengthToPx("20.11cm") === 760, `20.11cm phải là 760px, nhận: ${adapter._odfLengthToPx("20.11cm")}`);
  });

  test("ODF Unit: _odfLengthToPx chuyển đổi in, pt, mm, pc, px chính xác", () => {
    assert(adapter._odfLengthToPx("1in") === 96, "1in phải là 96px");
    assert(adapter._odfLengthToPx("0.5in") === 48, "0.5in phải là 48px");
    assert(adapter._odfLengthToPx("72pt") === 96, "72pt phải là 96px");
    assert(adapter._odfLengthToPx("12pt") === 16, "12pt phải là 16px");
    assert(adapter._odfLengthToPx("25.4mm") === 96, "25.4mm phải là 96px");
    assert(adapter._odfLengthToPx("6pc") === 96, "6pc phải là 96px");
    assert(adapter._odfLengthToPx("120px") === 120, "120px phải là 120px");
    assert(adapter._odfLengthToPx("") === null, "Chuỗi rỗng trả về null");
  });

  // =========================================================================
  // 2. Quy đổi cỡ chữ pt -> px làm tròn 2 chữ số (không có số lẻ 15.9996px)
  // =========================================================================
  test("Font Size: _parseCellVisualStyles quy đổi cỡ chữ làm tròn sạch 2 chữ số thập phân", () => {
    const fodsXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0">
  <office:automatic-styles>
    <style:style style:name="ce12" style:family="table-cell">
      <style:text-properties fo:font-size="12pt" fo:font-weight="bold" style:font-name="Times New Roman"/>
    </style:style>
    <style:style style:name="ce11" style:family="table-cell">
      <style:text-properties fo:font-size="11pt"/>
    </style:style>
    <style:style style:name="ce13" style:family="table-cell">
      <style:text-properties fo:font-size="13pt"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:spreadsheet>
      <table:table table:name="Sheet1">
        <table:table-column/>
        <table:table-row>
          <table:table-cell table:style-name="ce12" office:value-type="string"><text:p>STT</text:p></table:table-cell>
          <table:table-cell table:style-name="ce11" office:value-type="string"><text:p>11pt</text:p></table:table-cell>
          <table:table-cell table:style-name="ce13" office:value-type="string"><text:p>13pt</text:p></table:table-cell>
        </table:table-row>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document-content>`;

    const parsed = adapter.parseFods(fodsXml);
    const data = parsed.sheetsData["Sheet1"];
    const a1 = data.get("A1");
    const b1 = data.get("B1");
    const c1 = data.get("C1");

    // 12pt * 96 / 72 = 16px (trước đây bị pt * 1.3333 = 15.9996px)
    assert(a1.style.fontSize === "16px", `12pt phải ra '16px', nhận được: '${a1.style.fontSize}'`);
    // 11pt * 96 / 72 = 14.6666... -> 14.67px
    assert(b1.style.fontSize === "14.67px", `11pt phải ra '14.67px', nhận được: '${b1.style.fontSize}'`);
    // 13pt * 96 / 72 = 17.3333... -> 17.33px
    assert(c1.style.fontSize === "17.33px", `13pt phải ra '17.33px', nhận được: '${c1.style.fontSize}'`);
  });

  // =========================================================================
  // 3. _isCloseToDefault không được nuốt độ rộng cột hay chiều cao hàng thật
  // =========================================================================
  test("Dimensions: _isCloseToDefault không nuốt kích thước cột/hàng ODF", () => {
    assert(adapter._isCloseToDefault(45, 80) === false, "45px không được coi là mặc định 80px");
    assert(adapter._isCloseToDefault(74, 24) === false, "74px không được coi là mặc định 24px");
    assert(adapter._isCloseToDefault(50, 24) === false, "50px không được coi là mặc định 24px");
    assert(adapter._isCloseToDefault(80, 80) === false, "Kích thước rõ ràng từ file không được nuốt");
  });

  test("Dimensions: parseFods lưu đầy đủ colWidthsBySheet và rowHeightsBySheet thực tế", () => {
    const fodsXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0">
  <office:automatic-styles>
    <style:style style:name="co1" style:family="table-column">
      <style:table-column-properties style:column-width="1.203cm"/>
    </style:style>
    <style:style style:name="co2" style:family="table-column">
      <style:table-column-properties style:column-width="10.601cm"/>
    </style:style>
    <style:style style:name="ro1" style:family="table-row">
      <style:table-row-properties style:row-height="1.323cm"/>
    </style:style>
    <style:style style:name="ro2" style:family="table-row">
      <style:table-row-properties style:row-height="8.705cm"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:spreadsheet>
      <table:table table:name="Sheet1">
        <table:table-column table:style-name="co1"/>
        <table:table-column table:style-name="co2"/>
        <table:table-row table:style-name="ro1">
          <table:table-cell office:value-type="string"><text:p>Row 1</text:p></table:table-cell>
        </table:table-row>
        <table:table-row table:style-name="ro2">
          <table:table-cell office:value-type="string"><text:p>Row 2</text:p></table:table-cell>
        </table:table-row>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document-content>`;

    const parsed = adapter.parseFods(fodsXml);
    const colWidths = parsed.colWidthsBySheet["Sheet1"];
    const rowHeights = parsed.rowHeightsBySheet["Sheet1"];

    assert(colWidths.get("A") === 45, `Cột A phải là 45px, nhận: ${colWidths.get("A")}`);
    assert(colWidths.get("B") === 401, `Cột B phải là 401px, nhận: ${colWidths.get("B")}`);
    assert(rowHeights.get(1) === 50, `Hàng 1 phải là 50px (~1.323cm), nhận: ${rowHeights.get(1)}`);
    assert(rowHeights.get(2) === 329, `Hàng 2 phải là 329px (~8.705cm), nhận: ${rowHeights.get(2)}`);
  });

  // =========================================================================
  // 4. Kiểm tra CSS padding và text-overflow trong apps/sheet/sheet.css
  // =========================================================================
  test("CSS: .vno-grid-cell padding ngang 3px và text-overflow clip (chuẩn Excel)", () => {
    const cssPath = path.resolve(__dirname, "../../apps/sheet/sheet.css");
    const css = fs.readFileSync(cssPath, "utf-8");

    // Padding ngang phải là ~2-3px (không được 8px gây cắt chữ sớm)
    assert(css.includes("padding: 3px 3px;") || css.includes("padding: 2px 3px;"), "CSS .vno-grid-cell phải có padding ngang 3px");
    assert(!css.match(/\.vno-grid-cell\s*\{[^}]*padding:\s*3px\s+8px/), "CSS .vno-grid-cell KHÔNG được dùng padding ngang 8px");
    // Mặc định text-overflow là clip, không dùng ellipsis biến chữ thành '…'
    assert(css.includes("text-overflow: clip;"), "CSS .vno-grid-cell phải có text-overflow: clip");
    assert(css.includes(".vno-grid-cell.can-overflow"), "CSS phải có class .can-overflow cho phép tràn chữ");
  });

  // =========================================================================
  // 5. Hành vi tràn chữ (_renderCellVisual):
  //    - Ô bên phải trống: can-overflow (visible, không '…')
  //    - Ô bên phải có dữ liệu: cắt cứng (overflow: hidden, text-overflow: clip, không '…')
  //    - Dữ liệu dạng số: không tràn
  //    - Wrap text: không tràn ngang
  // =========================================================================
  test("Text Overflow: Chuỗi văn bản tràn sang ô trống bên phải (can-overflow, visible)", () => {
    const grid = createMockGridController({
      colWidths: { A: 45, B: 401, C: 359, D: 760 }
    });
    grid.setCellValue("A", 1, "Dòng chữ rất dài cần tràn");
    // Ô B1 để trống
    const tdA1 = createMockTd("A1");
    const itmA1 = grid.cellsData.get("A1");
    grid._renderCellVisual(tdA1, itmA1, "A", 1);

    assert(tdA1.classList.contains("can-overflow"), "A1 phải có class .can-overflow khi ô kế bên trống");
    assert(!tdA1.classList.contains("has-content"), "A1 không có class .has-content khi tràn");
    assert(tdA1.style.overflow === "visible", `A1 overflow phải là 'visible', nhận: '${tdA1.style.overflow}'`);
    assert(tdA1.style.textOverflow !== "ellipsis", "A1 KHÔNG được có textOverflow = 'ellipsis'");
  });

  test("Text Overflow: Ô bên phải có dữ liệu thì cắt cứng (overflow: hidden, text-overflow: clip, không '…')", () => {
    const grid = createMockGridController({
      colWidths: { A: 45, B: 401 }
    });
    grid.setCellValue("A", 1, "Dòng chữ dài");
    grid.setCellValue("B", 1, "Dữ liệu kế bên");

    const tdA1 = createMockTd("A1");
    const itmA1 = grid.cellsData.get("A1");
    grid._renderCellVisual(tdA1, itmA1, "A", 1);

    assert(!tdA1.classList.contains("can-overflow"), "A1 KHÔNG được có class .can-overflow khi ô kế bên có dữ liệu");
    assert(tdA1.classList.contains("has-content"), "A1 phải có class .has-content khi ô kế bên có dữ liệu");
    assert(tdA1.style.overflow === "hidden", `A1 overflow phải là 'hidden', nhận: '${tdA1.style.overflow}'`);
    assert(tdA1.style.textOverflow === "clip", `A1 textOverflow phải là 'clip' (không '…'), nhận: '${tdA1.style.textOverflow}'`);
  });

  test("Text Overflow: Dữ liệu số không được tràn sang ô trống bên phải", () => {
    const grid = createMockGridController({
      colWidths: { A: 45, B: 401 }
    });
    grid.setCellValue("A", 1, 123456789);
    // B1 để trống
    const tdA1 = createMockTd("A1");
    const itmA1 = grid.cellsData.get("A1");
    grid._renderCellVisual(tdA1, itmA1, "A", 1);

    assert(!tdA1.classList.contains("can-overflow"), "Số trong A1 KHÔNG được tràn sang ô kế bên");
    assert(tdA1.style.overflow === "hidden", `Số phải có overflow: hidden, nhận: '${tdA1.style.overflow}'`);
    assert(tdA1.style.textOverflow === "clip", `Số phải có textOverflow: clip, nhận: '${tdA1.style.textOverflow}'`);
  });

  test("Text Overflow: Ô có thuộc tính wrap text không được tràn ngang", () => {
    const grid = createMockGridController({
      colWidths: { A: 45, B: 401 }
    });
    grid.setCellValue("A", 1, "Văn bản ngắt dòng");
    const itmA1 = grid.cellsData.get("A1");
    itmA1.style = { whiteSpace: "normal" };

    const tdA1 = createMockTd("A1");
    grid._renderCellVisual(tdA1, itmA1, "A", 1);

    assert(tdA1.classList.contains("is-wrap-text"), "A1 phải có class is-wrap-text");
    assert(!tdA1.classList.contains("can-overflow"), "A1 có wrap text KHÔNG được có class can-overflow");
    assert(tdA1.style.overflow === "hidden", "A1 wrap text phải có overflow: hidden");
  });

  // =========================================================================
  // 6. Ô gộp (Merged Cells): _applyRowColSizeToCell tính đúng tổng độ rộng các cột
  // =========================================================================
  test("Merged Cells: _applyRowColSizeToCell tính tổng chiều rộng các cột trong ô gộp (A2:D2)", () => {
    const grid = createMockGridController({
      colWidths: { A: 45, B: 401, C: 359, D: 760 }
    });
    // Giả lập ô A2 gộp 4 cột (A2:D2)
    const tdA2 = createMockTd("A2");
    tdA2.colSpan = 4;
    tdA2.rowSpan = 1;

    grid._applyRowColSizeToCell(tdA2, "A", 2);

    // Tổng width = 45 + 401 + 359 + 760 = 1565px
    assert(tdA2.style.width === "1565px", `Width của ô gộp A2:D2 phải là 1565px, nhận: ${tdA2.style.width}`);
    assert(tdA2.style.minWidth === "1565px", `minWidth phải là 1565px, nhận: ${tdA2.style.minWidth}`);
    assert(tdA2.style.maxWidth === "1565px", `maxWidth phải là 1565px, nhận: ${tdA2.style.maxWidth}`);
  });

  test("Renderer: imported string ignores numeric numberFormat", () => {
    const grid = createMockGridController({ colWidths: { A: 80, B: 80 } });
    grid.setCellValue("A", 1, "24 thang");
    const itmA1 = grid.cellsData.get("A1");
    itmA1.style = { numberFormat: { category: "accounting", decimals: 0, useThousands: true } };
    const tdA1 = createMockTd("A1");

    grid._renderCellVisual(tdA1, itmA1, "A", 1);

    assert(tdA1.textContent === "24 thang", `String must remain intact, got '${tdA1.textContent}'`);
    assert(!tdA1.innerHTML.includes("vno-cell-accounting-num"), "String must not render as accounting number");
  });

  // =========================================================================
  // 7. FODS 96dpi unit conversion (column-width, row-height, white border) & switchSheet fidelity
  // =========================================================================
  test("FODS nhỏ: style:column-width='5.874cm' + style:row-height='0.767cm' và viền 0.74pt solid #ffffff được giữ", () => {
    const fodsXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0">
  <office:automatic-styles>
    <style:style style:name="co1" style:family="table-column">
      <style:table-column-properties style:column-width="5.874cm"/>
    </style:style>
    <style:style style:name="ro1" style:family="table-row">
      <style:table-row-properties style:row-height="0.767cm"/>
    </style:style>
    <style:style style:name="ceWhite" style:family="table-cell">
      <style:table-cell-properties fo:border="0.74pt solid #ffffff" fo:background-color="#558ed5"/>
    </style:style>
  </office:automatic-styles>
  <office:body>
    <office:spreadsheet>
      <table:table table:name="TestSheet">
        <table:table-column table:style-name="co1"/>
        <table:table-row table:style-name="ro1">
          <table:table-cell table:style-name="ceWhite" office:value-type="string">
            <text:p>Header</text:p>
          </table:table-cell>
        </table:table-row>
      </table:table>
    </office:spreadsheet>
  </office:body>
</office:document-content>`;

    const wb = adapter.parseFods(fodsXml);
    const colWidth = wb.colWidthsBySheet["TestSheet"]?.get("A");
    const rowHeight = wb.rowHeightsBySheet["TestSheet"]?.get(1);
    const cellA1 = wb.sheetsData["TestSheet"]?.get("A1");

    assert(Math.abs(colWidth - 222) <= 1, `colWidth phải là 222 ±1px, nhận: ${colWidth}`);
    assert(Math.abs(rowHeight - 29) <= 1, `rowHeight phải là 29 ±1px, nhận: ${rowHeight}`);
    assert(cellA1?.style?.borderLeft?.includes("#ffffff"), `Viền trắng phải được giữ, nhận: ${cellA1?.style?.borderLeft}`);
    assert(cellA1?.style?.borderTop?.includes("#ffffff"), `Viền trắng phải được giữ, nhận: ${cellA1?.style?.borderTop}`);
  });

  test("SheetGridController: _bindColumnHeader áp dụng đúng độ rộng cột từ getColumnWidth", () => {
    const grid = createMockGridController();
    grid.colWidthsBySheet = {
      [grid.activeSheet]: new Map([["B", 222]])
    };
    const mockTh = { style: {}, dataset: {}, className: "", innerHTML: "", querySelector() {}, addEventListener() {} };
    grid._bindColumnHeader(mockTh, "B");
    assert(mockTh.style.width === "222px", `th width phải là 222px, nhận: ${mockTh.style.width}`);
    assert(mockTh.style.minWidth === "222px", `th minWidth phải là 222px, nhận: ${mockTh.style.minWidth}`);
  });

  return results;
}
