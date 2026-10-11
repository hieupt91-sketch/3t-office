/**
 * VN Office — Unit Tests: Sheet lưu XLSX giữ Gói văn bản / Căn phải / Viền (đối chiếu Excel thật 11/10).
 * Ba nút ribbon ghi vào mô hình nhưng không được xuất sang FODS nên mất khi lưu:
 *  - Gói văn bản ghi whiteSpace="normal" (bộ xuất chỉ nhận "pre-wrap");
 *  - Viền ghi khóa chung `border` (bộ xuất chỉ đọc borderLeft/Right/Top/Bottom; hash kiểu bỏ qua → coi như chưa sửa);
 *  - Căn phải: LibreOffice đọc fo:text-align="right" thành "chung"; chỉ "end"/"start" được nhận.
 */
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

function assert(condition, message) { if (!condition) throw new Error(message); }

function makeGrid(style) {
  const sheet = "S";
  return {
    sheets: [sheet], activeSheet: sheet,
    sheetsData: { [sheet]: new Map([["E2", { val: "Nguyen Van A", formula: "", style }]]) },
    commentsBySheet: { [sheet]: {} }, namedRangesBySheet: { [sheet]: [] }, namedRangesWorkbook: [],
    printAreaBySheet: { [sheet]: null }, conditionalFormattingBySheet: { [sheet]: [] }, dataValidationsBySheet: { [sheet]: [] },
    pivotTablesBySheet: { [sheet]: [] }
  };
}

const fods = (style) => new SheetAdapter(makeGrid(style)).serializeToFods();

export async function runSheetStyleExportWrapBorderAlignTests() {
  const results = [];
  const test = (name, callback) => {
    try { callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  test("Gói văn bản (whiteSpace=normal) được xuất fo:wrap-option=wrap", () => {
    assert(fods({ whiteSpace: "normal" }).includes('fo:wrap-option="wrap"'), "thiếu fo:wrap-option=wrap cho whiteSpace=normal");
  });
  test("pre-wrap vẫn xuất wrap, nowrap xuất no-wrap", () => {
    assert(fods({ whiteSpace: "pre-wrap" }).includes('fo:wrap-option="wrap"'), "pre-wrap mất wrap");
    assert(fods({ whiteSpace: "nowrap" }).includes('fo:wrap-option="no-wrap"'), "nowrap mất no-wrap");
  });
  test("Viền chung `border` được xuất thành 4 cạnh fo:border-*", () => {
    const xml = fods({ border: "2px solid #0f172a" });
    for (const side of ["left", "right", "top", "bottom"]) assert(xml.includes(`fo:border-${side}="1.5pt solid #0f172a"`), `thiếu fo:border-${side}`);
  });
  test("Viền theo cạnh riêng vẫn thắng viền chung", () => {
    const xml = fods({ border: "2px solid #0f172a", borderBottom: "1px solid #ff0000" });
    assert(xml.includes('fo:border-bottom="0.75pt solid #ff0000"'), "cạnh dưới riêng bị ghi đè");
    assert(xml.includes('fo:border-top="1.5pt solid #0f172a"'), "cạnh trên mất viền chung");
  });
  test("Hash kiểu đổi khi thêm viền chung (không còn bị coi là ô chưa sửa)", () => {
    const adapter = new SheetAdapter(null);
    assert(adapter._computeStyleHash({ fontFamily: "Calibri" }) !== adapter._computeStyleHash({ fontFamily: "Calibri", border: "2px solid #000" }), "hash không đổi khi thêm border");
  });
  test("Căn phải xuất fo:text-align=end (không phải right) và căn trái xuất start", () => {
    assert(fods({ textAlign: "right" }).includes('fo:text-align="end"'), "căn phải không xuất end");
    assert(!fods({ textAlign: "right" }).includes('fo:text-align="right"'), "vẫn xuất right (LibreOffice sẽ mất)");
    assert(fods({ textAlign: "left" }).includes('fo:text-align="start"'), "căn trái không xuất start");
  });
  test("Căn giữa và căn đều giữ nguyên", () => {
    assert(fods({ textAlign: "center" }).includes('fo:text-align="center"'), "mất center");
    assert(fods({ textAlign: "justify" }).includes('fo:text-align="justify"'), "mất justify");
  });
  test("Có căn lề thì đặt text-align-source=fix", () => {
    assert(fods({ textAlign: "right" }).includes('style:text-align-source="fix"'), "thiếu text-align-source=fix");
  });
  test("Nhập FODS: end giữ nguyên là end (CSS text-align: end hiển thị căn phải), lưu lại vẫn là end", () => {
    const xml = fods({ textAlign: "right" });
    const parsed = new SheetAdapter(null).parseFods(xml);
    const sheetName = parsed.sheets[0];
    const style = (parsed.sheetsData?.[sheetName] || parsed.cellsData).get("E2")?.style || {};
    assert(style.textAlign === "end", `textAlign sau nhập = ${style.textAlign}`);
  });
  return results;
}