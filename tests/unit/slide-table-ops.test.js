/**
 * Test Suite: Thao tác bảng trên trang chiếu — chèn/xóa hàng cột, gộp/tách ô, khứ hồi lưu-mở lại (FODP).
 */
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import {
  tableState, mergeMap, insertRow, insertCol, deleteRow, deleteCol, mergeCells, splitCell, expandSelection, TABLE_MAX_ROWS, TABLE_MAX_COLS
} from "../../apps/slides/slide-table-ops.js";

const base = () => ({ rows: 3, cols: 3, w: 420, h: 108, cells: [["a", "b", "c"], ["d", "e", "f"], ["g", "h", "i"]] });

export async function runSlideTableOpsTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const eq = (actual, expected, label = "") => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
  };

  test("Chèn hàng: trên/dưới, hàng mới trống, bảng cao thêm, không đổi bảng gốc", () => {
    const t = base();
    const r = insertRow(t, 1);
    eq(r.rows, 4); eq(r.cells[1], ["", "", ""]); eq(r.cells[2], ["d", "e", "f"]);
    if (!(r.h > t.h)) throw new Error("bảng phải cao thêm");
    eq(t.cells.length, 3, "bảng gốc giữ nguyên");
    eq(insertRow(t, 3).cells[3], ["", "", ""], "chèn cuối");
    eq(insertRow(t, 4), null, "ngoài phạm vi");
  });

  test("Chèn cột: trái/phải, cột mới trống, bảng rộng thêm nhưng không vượt 900", () => {
    const t = base();
    const c = insertCol(t, 0);
    eq(c.cols, 4); eq(c.cells[0], ["", "a", "b", "c"]);
    const wide = insertCol({ ...base(), w: 890 }, 3);
    if (wide.w > 900) throw new Error("vượt 900");
  });

  test("Giới hạn: tối đa 50 hàng / 26 cột; không xóa hàng/cột duy nhất", () => {
    const rows = Array.from({ length: TABLE_MAX_ROWS }, () => ["x"]);
    eq(insertRow({ rows: TABLE_MAX_ROWS, cols: 1, cells: rows, w: 100, h: 1000 }, 0), null);
    const cols = [Array.from({ length: TABLE_MAX_COLS }, () => "x")];
    eq(insertCol({ rows: 1, cols: TABLE_MAX_COLS, cells: cols, w: 1000, h: 30 }, 0), null);
    eq(deleteRow({ rows: 1, cols: 2, cells: [["x", "y"]] }, 0), null);
    eq(deleteCol({ rows: 2, cols: 1, cells: [["x"], ["y"]] }, 0), null);
  });

  test("Xóa hàng/cột giữ đúng nội dung còn lại", () => {
    eq(deleteRow(base(), 0).cells, [["d", "e", "f"], ["g", "h", "i"]]);
    eq(deleteCol(base(), 2).cells, [["a", "b"], ["d", "e"], ["g", "h"]]);
    eq(deleteRow(base(), 1).cells, [["a", "b", "c"], ["g", "h", "i"]]);
  });

  test("Gộp ô: nội dung không trống nối bằng xuống dòng vào ô neo, ô phủ rỗng, bản đồ hiển thị đúng", () => {
    const m = mergeCells(base(), 0, 0, 1, 1);
    eq(m.merges, [{ r: 0, c: 0, rs: 2, cs: 2 }]);
    eq(m.cells[0][0], "a\nb\nd\ne"); eq(m.cells[0][1], ""); eq(m.cells[1][0], ""); eq(m.cells[0][2], "c");
    const map = mergeMap(tableState({ ...base(), ...m }));
    eq(map[0][0], { covered: false, rs: 2, cs: 2 }); eq(map[1][1].covered, true); eq(map[2][2].covered, false);
    eq(mergeCells(base(), 1, 1, 1, 1), null, "một ô");
  });

  test("Vùng chọn tự mở rộng để chứa trọn ô đã gộp bị cắt ngang", () => {
    const merged = { ...base(), ...mergeCells(base(), 0, 0, 1, 1) };
    eq(expandSelection(merged, 1, 1, 2, 2), { r: 0, c: 0, r2: 2, c2: 2 });
    const again = mergeCells(merged, 1, 1, 2, 2);
    eq(again.merges, [{ r: 0, c: 0, rs: 3, cs: 3 }]);
  });

  test("Chèn hàng vào giữa vùng gộp làm vùng gộp dài thêm; chèn phía trên làm dịch vùng gộp xuống", () => {
    const merged = { ...base(), ...mergeCells(base(), 0, 0, 1, 1) };
    eq(insertRow(merged, 1).merges, [{ r: 0, c: 0, rs: 3, cs: 2 }], "giữa");
    eq(insertRow(merged, 0).merges, [{ r: 1, c: 0, rs: 2, cs: 2 }], "trên cùng");
    eq(insertCol(merged, 1).merges, [{ r: 0, c: 0, rs: 2, cs: 3 }], "giữa cột");
  });

  test("Xóa hàng đi qua vùng gộp: vùng gộp ngắn lại; xóa hết chiều gộp thì còn ô thường; không mất chữ ô neo", () => {
    const merged = { ...base(), ...mergeCells(base(), 0, 0, 1, 1) };
    eq(deleteRow(merged, 0).merges, [{ r: 0, c: 0, rs: 1, cs: 2 }]);
    eq(deleteRow(merged, 0).cells[0][0], "a\nb\nd\ne", "chữ chuyển xuống ô neo mới");
    const rowSpan = { ...base(), ...mergeCells(base(), 0, 0, 1, 0) };
    eq(deleteRow(rowSpan, 1).merges, [], "gộp dọc 2 ô, xóa 1 hàng => hết gộp");
  });

  test("Tách ô: bỏ vùng gộp, chữ ở lại ô neo; ô chưa gộp thì null", () => {
    const merged = { ...base(), ...mergeCells(base(), 0, 0, 0, 2) };
    const s = splitCell(merged, 0, 1);
    eq(s.merges, []); eq(s.cells[0][0], "a\nb\nc");
    eq(splitCell(base(), 1, 1), null);
  });

  test("Dữ liệu hỏng/thiếu được chuẩn hóa: ô thiếu thành rỗng, vùng gộp ngoài biên bị bỏ", () => {
    const s = tableState({ rows: 2, cols: 2, cells: [["a"]], merges: [{ r: 0, c: 0, rs: 5, cs: 5 }, { r: 1, c: 1, rs: 1, cs: 1 }] });
    eq(s.cells, [["a", ""], ["", ""]]); eq(s.merges, []);
  });

  test("Khứ hồi FODP: ô gộp được ghi (number-columns/rows-spanned + covered-table-cell) và đọc lại đúng", () => {
    const merged = { ...base(), ...mergeCells(base(), 0, 0, 1, 1) };
    const adapter = new SlidesAdapter({
      slides: [{ id: 1, title: "T", body: "", layoutType: "blank", shapes: [{ id: "t1", type: "table", x: 40, y: 80, w: 420, h: 108, rows: merged.rows, cols: merged.cols, cells: merged.cells, merges: merged.merges, color: "transparent" }] }]
    });
    const fodp = adapter.serializeToFodp();
    if (!fodp.includes('table:number-columns-spanned="2"') || !fodp.includes('table:number-rows-spanned="2"')) throw new Error("thiếu thuộc tính gộp ô khi ghi");
    if (!fodp.includes("<table:covered-table-cell")) throw new Error("thiếu ô bị phủ khi ghi");
    const shape = adapter.parseFodp(fodp)[0].shapes.find(item => String(item.id) === "t1");
    eq(shape.rows, 3); eq(shape.cols, 3);
    eq(shape.merges, [{ r: 0, c: 0, rs: 2, cs: 2 }], "gộp đọc lại");
    eq(shape.cells[0][0], "a\nb\nd\ne", "chữ ô neo");
  });

  test("Bảng không gộp ô: ghi/đọc như cũ, không sinh merges", () => {
    const adapter = new SlidesAdapter({
      slides: [{ id: 1, title: "T", body: "", layoutType: "blank", shapes: [{ id: "t2", type: "table", x: 0, y: 0, w: 200, h: 60, rows: 2, cols: 2, cells: [["A", "B"], ["1", "2"]], color: "transparent" }] }]
    });
    const fodp = adapter.serializeToFodp();
    if (fodp.includes("number-columns-spanned")) throw new Error("không được ghi thuộc tính gộp khi không gộp");
    const shape = adapter.parseFodp(fodp)[0].shapes.find(item => String(item.id) === "t2");
    if (shape.merges) throw new Error("không được có merges");
    eq(shape.cells, [["A", "B"], ["1", "2"]]);
  });

  return results;
}