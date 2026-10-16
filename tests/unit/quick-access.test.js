/**
 * Test Suite: Thanh công cụ truy nhanh tùy biến (platform/shell/quick-access.js) — logic thuần + lưu trữ.
 */
import {
  QUICK_ACCESS_DEFAULTS, QUICK_ACCESS_MAX, sanitizeQuickAccess, readQuickAccess, writeQuickAccess,
  addQuickAccess, removeQuickAccess, toggleQuickAccess
} from "../../platform/shell/quick-access.js";

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return { getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = String(v); }, data };
}

export async function runQuickAccessTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const eq = (actual, expected, label = "") => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label} mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
  };

  test("Mặc định: Lưu, Hoàn tác, Làm lại, In khi chưa có cấu hình", () => {
    eq(readQuickAccess("sheet", memoryStorage()), [...QUICK_ACCESS_DEFAULTS], "mặc định");
  });
  test("Lưu rồi đọc lại đúng thứ tự, tách riêng theo từng ứng dụng", () => {
    const store = memoryStorage();
    writeQuickAccess("sheet", ["common.file.open", "common.file.save"], store);
    writeQuickAccess("writer", ["common.edit.undo"], store);
    eq(readQuickAccess("sheet", store), ["common.file.open", "common.file.save"], "sheet");
    eq(readQuickAccess("writer", store), ["common.edit.undo"], "writer");
    eq(readQuickAccess("slides", store), [...QUICK_ACCESS_DEFAULTS], "slides chưa cấu hình");
  });
  test("Dữ liệu hỏng / sai kiểu / trùng lặp được làm sạch, không làm vỡ thanh", () => {
    eq(readQuickAccess("sheet", memoryStorage({ "vno.quickAccess.v1.sheet": "{không phải json" })), [...QUICK_ACCESS_DEFAULTS], "json hỏng");
    eq(readQuickAccess("sheet", memoryStorage({ "vno.quickAccess.v1.sheet": JSON.stringify({ a: 1 }) })), [...QUICK_ACCESS_DEFAULTS], "không phải mảng");
    eq(sanitizeQuickAccess(["common.file.save", "common.file.save", 5, null, "x y", "<script>", "common.edit.undo"]), ["common.file.save", "common.edit.undo"], "lọc");
  });
  test("Thêm: không trùng, giữ thứ tự, tối đa QUICK_ACCESS_MAX", () => {
    eq(addQuickAccess(["a.b"], "c.d"), ["a.b", "c.d"], "thêm");
    eq(addQuickAccess(["a.b"], "a.b"), ["a.b"], "trùng");
    const full = Array.from({ length: QUICK_ACCESS_MAX }, (_, i) => `cmd.n${i}`);
    eq(addQuickAccess(full, "cmd.extra").length, QUICK_ACCESS_MAX, "đầy");
  });
  test("Xóa và bật/tắt lệnh; xóa hết cho phép thanh rỗng (người dùng chủ động)", () => {
    eq(removeQuickAccess(["a.b", "c.d"], "a.b"), ["c.d"], "xóa");
    eq(toggleQuickAccess(["a.b"], "a.b"), [], "tắt");
    eq(toggleQuickAccess([], "a.b"), ["a.b"], "bật");
    const store = memoryStorage();
    writeQuickAccess("sheet", [], store);
    eq(readQuickAccess("sheet", store), [], "rỗng được giữ");
  });
  test("Bộ nhớ bị chặn/ném lỗi vẫn không làm hỏng ứng dụng", () => {
    const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
    eq(readQuickAccess("sheet", broken), [...QUICK_ACCESS_DEFAULTS], "đọc");
    eq(writeQuickAccess("sheet", ["a.b"], broken), ["a.b"], "ghi");
  });
  return results;
}