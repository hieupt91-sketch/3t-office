/**
 * MAC-3-2610 — tên tệp tiếng Việt từ hộp thoại macOS (NFD) và Trợ giúp Mở/Lưu trên macOS.
 * Phần Python (bộ lọc, tên mặc định, sửa đuôi, NFC) kiểm ở tests/macos/test_file_dialogs_macos.py.
 */
import assert from "node:assert/strict";
import { RecentFilesManager, isSameRecentPath } from "../../platform/recent/recent-manager.js";
import { HELP_ENTRIES } from "../../platform/help/help-catalog.js";
import { searchHelpEntries } from "../../platform/help/help-service.js";
import { MACOS_FILE_HELP_ENTRIES } from "../../platform/help/entries-macos-files.js";

const NFC_PATH = "/Users/a/Tài liệu/Báo cáo quý.docx";
const NFD_PATH = NFC_PATH.normalize("NFD");

function withMemoryStorage(callback) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const data = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => (data.has(key) ? data.get(key) : null),
      setItem: (key, value) => data.set(key, String(value)),
      removeItem: (key) => data.delete(key)
    }
  });
  try {
    return callback();
  } finally {
    if (previous) Object.defineProperty(globalThis, "localStorage", previous);
    else delete globalThis.localStorage;
  }
}

export async function runMacOSFileDialogTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  test("MAC-3-2610: NFC và NFD của cùng tên tiếng Việt là cùng một tệp gần đây", () => {
    assert.notEqual(NFC_PATH, NFD_PATH);
    assert.equal(isSameRecentPath(NFC_PATH, NFD_PATH), true);
    assert.equal(isSameRecentPath(NFC_PATH, "/Users/a/Tài liệu/Báo cáo năm.docx"), false);
    assert.equal(isSameRecentPath(NFC_PATH, null), false);
  });

  test("MAC-3-2610: mở lại cùng tệp (NFD rồi NFC) chỉ còn một mục gần đây, mang đường dẫn mới nhất", () => {
    withMemoryStorage(() => {
      RecentFilesManager.recordFile({ name: "Báo cáo quý.docx".normalize("NFD"), app: "writer", path: NFD_PATH });
      RecentFilesManager.recordFile({ name: "Báo cáo quý.docx", app: "writer", path: NFC_PATH });
      const list = RecentFilesManager.getRecentFiles();
      assert.equal(list.length, 1);
      assert.equal(list[0].path, NFC_PATH);
      assert.equal(list[0].name, "Báo cáo quý.docx");
      RecentFilesManager.recordFile({ name: "Báo cáo quý.docx", app: "sheet", path: NFC_PATH });
      assert.equal(RecentFilesManager.getRecentFiles().length, 2, "khác ứng dụng vẫn là mục riêng");
    });
  });

  test("MAC-3-2610: Trợ giúp tiếng Việt về Mở/Lưu trên macOS có trong danh mục và tìm được", () => {
    const entry = HELP_ENTRIES.find((item) => item.id === "common.macos.openSaveFiles");
    assert.ok(entry, "thiếu bài Trợ giúp common.macos.openSaveFiles");
    assert.equal(entry.app, "common");
    assert.deepEqual(entry.ribbon, { tab: "Tệp", tabId: "file", group: "Mở / Lưu" });
    const text = JSON.stringify(MACOS_FILE_HELP_ENTRIES);
    for (const fact of ["Cmd+O", "Cmd+S", "Cmd+Shift+S", "Tất cả tệp được hỗ trợ", "Tài liệu 1.docx",
      "Bảng tính 1.xlsx", "Bản trình bày 1.pptx", "Báo cáo quý.docx", ".dotx", ".potx", ".xltx", "Hủy"]) {
      assert.ok(text.includes(fact), `bài Trợ giúp thiếu: ${fact}`);
    }
    for (const app of ["writer", "sheet", "slides"]) {
      const found = searchHelpEntries("lưu thành mac", { app }).some((item) => item.id === entry.id)
        || searchHelpEntries("mac", { app }).some((item) => item.id === entry.id);
      assert.ok(found, `không tìm thấy bài trong ${app}`);
    }
  });

  return results;
}
