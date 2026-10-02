/**
 * Unit tests: Writer basic desktop audit fixes
 * 1. writer.font.family shortcut Ctrl+Shift+F and keyboard focus
 * 2. showUnsavedChangesDialog keyboard navigation (Tab, Enter on active choice, Escape)
 * 3. Vietnamese help documentation for font family keyboard shortcut
 */

import fs from "node:fs";
import path from "node:path";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runWriterDocNotRunBasicsTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  const repoRoot = path.resolve(import.meta.dirname, "../..");

  await test("writer.font.family: được khai báo shortcut Ctrl+Shift+F", () => {
    const def = globalCommandBus.getDefinition("writer.font.family");
    assert(def, "Lệnh writer.font.family phải được đăng ký");
    assert(def.shortcut === "Ctrl+Shift+F", `Phải có shortcut Ctrl+Shift+F, nhận được: ${def.shortcut}`);
  });

  await test("writer.font.family: hướng dẫn tiếng Việt có mô tả phím tắt Ctrl+Shift+F", () => {
    const helpFile = path.join(repoRoot, "platform/help/entries-writer.js");
    const content = fs.readFileSync(helpFile, "utf8");
    assert(content.includes("Ctrl+Shift+F"), "Help bài viết phải đề cập phím tắt Ctrl+Shift+F");
    assert(content.includes("phông chữ"), "Help bài viết phải có nội dung hướng dẫn chọn phông chữ");
  });

  await test("writer.font.family: bài hướng dẫn retro-dialogs và entries-writer thống nhất hành vi Ctrl+Shift+F", () => {
    const retroFile = path.join(repoRoot, "platform/help/entries-retro-dialogs.js");
    const content = fs.readFileSync(retroFile, "utf8");
    assert(!content.includes("Nhấn Ctrl+D hoặc Ctrl+Shift+F để mở nhanh hộp thoại Phông chữ"), "Không được mô tả Ctrl+Shift+F mở hộp thoại Phông chữ");
    assert(content.includes("Ctrl+Shift+F để chuyển tiêu điểm trực tiếp vào ô chọn Phông chữ"), "Retro dialogs help phải mô tả Ctrl+Shift+F chuyển tiêu điểm vào ô chọn phông trên ribbon");
  });

  await test("showUnsavedChangesDialog: xử lý phím Escape để hủy và trả về cancel", () => {
    const dialogsCode = fs.readFileSync(path.join(repoRoot, "platform/ui-kit/dialogs.js"), "utf8");
    assert(dialogsCode.includes('if (event.key === "Escape")'), "Phải lắng nghe sự kiện phím Escape");
    assert(dialogsCode.includes('finish("cancel")'), "Phím Escape phải gọi finish('cancel')");
  });

  await test("showUnsavedChangesDialog: phím Enter tôn trọng lựa chọn nút đang active thay vì mặc định save", () => {
    const dialogsCode = fs.readFileSync(path.join(repoRoot, "platform/ui-kit/dialogs.js"), "utf8");
    assert(dialogsCode.includes('getAttribute?.("data-unsaved-choice")'), "Phải đọc data-unsaved-choice từ activeElement");
    assert(dialogsCode.includes('if (activeChoice) {\n          finish(activeChoice);') || dialogsCode.includes('finish(activeChoice)'), "Phải trả về activeChoice tương ứng với nút đang được focus");
  });

  await test("showUnsavedChangesDialog: phím Tab bẫy tiêu điểm giữa các nút điều khiển", () => {
    const dialogsCode = fs.readFileSync(path.join(repoRoot, "platform/ui-kit/dialogs.js"), "utf8");
    assert(dialogsCode.includes('trapFocus(dialogBox, event)'), "Phải gọi trapFocus khi nhấn phím Tab");
    assert(dialogsCode.includes('data-unsaved-choice="discard"'), "Phải có nút Không lưu (discard)");
    assert(dialogsCode.includes('data-unsaved-choice="cancel"'), "Phải có nút Hủy (cancel)");
    assert(dialogsCode.includes('data-unsaved-choice="save"'), "Phải có nút Lưu (save)");
  });

  return results;
}
