import fs from "node:fs";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { VietnameseSpellChecker, VI_PERSONAL_DICTIONARY_KEY } from "../../platform/text/vi-spellchecker.js";
import { VIETNAMESE_DICTIONARY_WORDS } from "../../platform/text/dictionaries/vi-dictionary.js";

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const container = () => ({ querySelector: () => null, querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} } });

export async function runSheetSpellcheckViTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  const originalDocument = globalThis.document;
  globalThis.document = { createElement: () => ({ className: "", textContent: "", setAttribute() {} }) };

  try {
    const source = fs.readFileSync(new URL("../../apps/sheet/sheet-grid.js", import.meta.url), "utf8");
    const ribbon = fs.readFileSync(new URL("../../apps/sheet/sheet-ribbon.js", import.meta.url), "utf8");

    await test("Sheet tái sử dụng VietnameseSpellChecker của Shared Platform, không viết lại từ điển", () => {
      assert(source.includes('import("../../platform/text/vi-spellchecker.js")'), "thiếu lazy import VietnameseSpellChecker");
      assert(source.includes("new this._spellcheckTools.VietnameseSpellChecker"), "Sheet không khởi tạo checker dùng chung");
      assert(source.includes("dictionary.VIETNAMESE_DICTIONARY_WORDS"), "không dùng từ điển CC0 dùng chung");
      assert(!source.includes("SpellcheckDomController"), "Sheet không được gắn DOM controller của Writer/Slides lên ô lưới");
      assert(!ribbon.includes("SpellcheckDomController"), "ribbon không được kéo DOM controller");
    });

    await test("Tab Xem xét có nhóm Chứng minh và nút Chính tả", () => {
      const review = SHEET_RIBBON_TABS.find(tab => tab.id === "review");
      assert(review, "Thiếu tab review");
      const proofing = review.groups.find(group => group.id === "proofing" || group.labelKey === "sheetRibbon.group.proofing");
      assert(proofing, "Thiếu nhóm Chứng minh / Proofing");
      assert(proofing.items.some(item => item.commandId === "sheet.review.spellCheck"), "Thiếu nút sheet.review.spellCheck");
      assert(review.groups.some(group => group.items?.some(item => item.commandId === "sheet.review.commentInsert")), "Nút Ghi chú vẫn phải còn");
    });

    await test("Command, icon SVG và UNO mapping tồn tại; F7 không khai báo trùng common", () => {
      const command = SHEET_COMMANDS.find(item => item.id === "sheet.review.spellCheck");
      assert(command, "Thiếu SHEET_COMMANDS sheet.review.spellCheck");
      assert(command.icon === "sheetSpellCheck", "Sai icon");
      assert(!command.shortcut, "Không được khai báo shortcut F7 trong định nghĩa vì F7 common đã dùng cho AI grammarCheck");
      assert(VN_TO_UNO_MAP["sheet.review.spellCheck"] === ".uno:Spelling", "Sai UNO mapping");
      assert(ICONS.sheetSpellCheck?.includes("<svg"), "Thiếu SVG sheetSpellCheck");
    });

    await test("Ô văn bản sai chính tả được phát hiện; ô đúng không bị báo", async () => {
      const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
      await grid.initializeSpellcheck();
      grid.setCellValue("A", 1, "chínnh tả");
      grid.setCellValue("B", 1, "học sinh đọc sách");
      const issues = grid.collectSpellcheckIssues();
      assert(issues.some(item => item.coord === "A1" && item.word === "chínnh"), `không bắt chínnh: ${JSON.stringify(issues)}`);
      assert(!issues.some(item => item.coord === "B1"), `báo nhầm ô đúng: ${JSON.stringify(issues.filter(item => item.coord === "B1"))}`);
    });

    await test("Ô số và ô công thức bị bỏ qua, kể cả khi kết quả công thức là chữ sai", async () => {
      const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
      await grid.initializeSpellcheck();
      grid.setCellValue("C", 1, 12345);
      grid.setCellValue("D", 1, "98765");
      grid.setCellValue("E", 1, "25.000.000 ₫");
      grid.setCellValue("F", 1, "=SUM(1,2)");
      grid.cellsData.set("G1", { val: "chínnh", formula: '="chínnh"', style: {} });
      const issues = grid.collectSpellcheckIssues();
      assert(issues.length === 0, `quet nhầm số/công thức: ${JSON.stringify(issues)}`);
    });

    await test("Thay thế một lần sửa đúng token trong ô, giữ phần còn lại", async () => {
      const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
      await grid.initializeSpellcheck();
      grid.setCellValue("A", 2, "chínnh tả");
      const [issue] = grid.collectSpellcheckIssues().filter(item => item.word === "chínnh");
      assert(issue, "không tìm thấy chínnh để thay");
      assert(grid.replaceSpellcheckIssue(issue, "chính") === true, "replace thất bại");
      assert(grid.cellsData.get("A2").val === "chính tả", `giá trị sau replace: ${grid.cellsData.get("A2").val}`);
      assert(!grid.collectSpellcheckIssues().some(item => item.word === "chínnh"), "vẫn còn chínnh sau replace");
    });

    await test("Ignore All dùng checker phiên làm việc, không ghi từ điển cá nhân", () => {
      const values = new Map();
      const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
      const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
      grid.spellChecker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS, { storage });
      grid.setCellValue("A", 3, "chínnh");
      grid.setCellValue("B", 3, "chínnh");
      assert(grid.collectSpellcheckIssues().length >= 2, "cần ít nhất hai lần chínnh");
      grid.spellChecker.ignore("chínnh");
      assert(grid.collectSpellcheckIssues().length === 0, "Ignore All không ẩn các lần còn lại");
      assert(!JSON.parse(values.get(VI_PERSONAL_DICTIONARY_KEY) || "[]").includes("chínnh"), "Ignore All không được ghi localStorage");
    });

    await test("Thêm vào từ điển dùng chung key Writer/Slides", () => {
      const values = new Map();
      const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
      const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
      grid.spellChecker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS, { storage });
      grid.setCellValue("A", 4, "chínnh");
      grid.spellChecker.addToPersonalDictionary("chínnh");
      assert(grid.collectSpellcheckIssues().length === 0, "từ vừa thêm vẫn bị báo");
      const restored = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS, { storage });
      assert(restored.checkText("chínnh").length === 0, "không đọc được từ cá nhân cùng key");
      assert(VI_PERSONAL_DICTIONARY_KEY === "vno-spellcheck-vi-personal", "storage key dùng chung đã đổi");
    });

    await test("Quét chỉ trang tính đang mở, không lẫn sheet khác", async () => {
      const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
      await grid.initializeSpellcheck();
      const first = grid.activeSheet;
      grid.setCellValue("A", 5, "chínnh");
      grid.switchSheet("Kế hoạch Q3");
      grid.setCellValue("A", 5, "học sinh");
      const other = grid.collectSpellcheckIssues();
      assert(!other.some(item => item.word === "chínnh"), "rò lỗi từ sheet trước");
      grid.switchSheet(first);
      assert(grid.collectSpellcheckIssues().some(item => item.word === "chínnh"), "mất lỗi của sheet hiện tại");
    });

    await test("Gợi ý gần tái sử dụng checker, có chính cho chínnh", async () => {
      const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
      await grid.initializeSpellcheck();
      assert(grid.suggestSpellcheckWord("chínnh").includes("chính"), "không gợi ý chính");
    });

    await test("Handler ribbon chịu args=null và gọi dialog quét", async () => {
      const calls = [];
      const adapter = new SheetAdapter({ showSpellcheckDialog: value => calls.push(value), showCommentDialog() {} });
      adapter.attach();
      await globalCommandBus.execute("sheet.review.spellCheck");
      assert(calls.length === 1 && calls[0] && typeof calls[0] === "object", "Handler không chuẩn hóa args=null");
    });

    await test("Không có document.body thì showSpellcheckDialog trả về danh sách lỗi, không ném", async () => {
      const grid = createSheetGridWithSheets(container(), ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]);
      await grid.initializeSpellcheck();
      grid.setCellValue("A", 6, "chínnh");
      const issues = await grid.showSpellcheckDialog();
      assert(Array.isArray(issues) && issues.some(item => item.word === "chínnh"), "thiếu fallback không DOM");
    });
  } finally {
    globalThis.document = originalDocument;
  }

  return results;
}
