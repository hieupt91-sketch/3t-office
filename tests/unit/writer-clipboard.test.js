/**
 * VN Office — Behavioral & Unit Tests: VN Writer Clipboard (Cut, Copy, Paste, Paste Plain)
 */

import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { COMMON_COMMANDS } from "../../platform/commands/command-definitions.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

export async function runWriterClipboardTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || err.message });
    }
  };

  await test("Ribbon: Nhóm Bảng nhớ tạm có đủ nút Dán lớn, Cắt, Sao chép và Sao chép định dạng", () => {
    const homeTab = WRITER_RIBBON_TABS.find(t => t.id === "home");
    assert.ok(homeTab, "Phải có tab Trang đầu (home)");
    const clipboardGroup = homeTab.groups.find(g => g.id === "clipboard");
    assert.ok(clipboardGroup, "Phải có nhóm Bảng nhớ tạm (clipboard) trong tab Trang đầu");

    const pasteLargeBtn = clipboardGroup.items.find(i => i.commandId === "common.edit.paste" && i.isLarge);
    assert.ok(pasteLargeBtn, "Nút Dán (paste) phải là nút lớn isLarge");

    const columnGroup = clipboardGroup.items.find(i => i.type === "column");
    assert.ok(columnGroup, "Phải có cột chứa các nút phụ trong nhóm Bảng nhớ tạm");
    const cutBtn = columnGroup.items.find(i => i.commandId === "common.edit.cut");
    const copyBtn = columnGroup.items.find(i => i.commandId === "common.edit.copy");
    const formatPainterBtn = columnGroup.items.find(i => i.commandId === "common.edit.formatPainter");
    assert.ok(cutBtn && copyBtn && formatPainterBtn, "Phải có đủ nút Cắt, Sao chép và Sao chép định dạng trong cột");
  });

  await test("Help: Bài viết Hướng dẫn Bảng nhớ tạm đầy đủ các bước tiếng Việt", () => {
    const helpEntry = WRITER_HELP_ENTRIES.find(e => e.id === "writer.clipboard.cutCopyPaste");
    assert.ok(helpEntry, "Phải có bài viết Help writer.clipboard.cutCopyPaste");
    assert.equal(helpEntry.ribbon?.tab, "Trang đầu", "Help phải chỉ rõ tab Trang đầu");
    assert.equal(helpEntry.ribbon?.group, "Bảng nhớ tạm", "Help phải chỉ rõ nhóm Bảng nhớ tạm");
    assert.ok(helpEntry.steps && helpEntry.steps.length >= 4, "Help phải có ít nhất 4 bước thao tác cụ thể");
    assert.ok(helpEntry.steps.some(s => s.includes("Ctrl+X") && s.includes("Ctrl+C")), "Help phải có phím tắt Ctrl+X, Ctrl+C");
    assert.ok(helpEntry.steps.some(s => s.includes("Ctrl+V")), "Help phải có phím tắt Ctrl+V");
    assert.ok(helpEntry.steps.some(s => s.includes("Esc") && s.includes("tắt")), "Help phải mô tả Esc hủy và chổi tự tắt sau một lần áp dụng");
  });

  await test("Format Painter: lệnh công bố trạng thái bật/tắt cho nút ribbon", () => {
    const definition = COMMON_COMMANDS.find(command => command.id === "common.edit.formatPainter");
    assert.equal(definition?.isToggle, true, "Format Painter phải là lệnh toggle để aria-pressed theo trạng thái thực");
  });

  const mockBody = {
    tagName: "DIV",
    innerHTML: "<p id='p1'>Đoạn văn thử nghiệm bộ nhớ tạm</p>",
    textContent: "Đoạn văn thử nghiệm bộ nhớ tạm",
    style: {},
    contains() { return true; },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {},
    querySelectorAll() { return []; },
    querySelector() { return null; }
  };

  const mockContainer = {
    querySelector(selector) {
      if (selector === ".vno-writer-body") return mockBody;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {}
  };

  const adapter = new WriterAdapter(mockContainer, {
    setStatus() {},
    showModal() {}
  });

  await test("Clipboard Sanitizer: Loại bỏ script/iframe nguy hiểm, giữ an toàn định dạng b/i/color", () => {
    const unsafeHtml = "<script>alert(1)</script><p style='color:red; background-image:url(javascript:x)'>Văn bản <b>đậm</b> và <i>nghiêng</i></p><iframe src='evil.com'></iframe>";
    const sanitized = adapter._sanitizeClipboardHtml(unsafeHtml);
    assert.ok(!sanitized.includes("<script"), "Phải loại bỏ thẻ script độc hại");
    assert.ok(!sanitized.includes("<iframe"), "Phải loại bỏ thẻ iframe");
    assert.ok(!sanitized.includes("javascript:"), "Phải loại bỏ URL javascript trong style");
    assert.ok(sanitized.includes("<b>đậm</b>"), "Phải giữ thẻ in đậm b");
    assert.ok(sanitized.includes("<i>nghiêng</i>"), "Phải giữ thẻ in nghiêng i");
  });

  await test("Clipboard Memory: Lưu trữ trung gian chính xác dữ liệu văn bản và định dạng HTML", () => {
    adapter._clipboardMemory = { text: "Sao chép thử nghiệm", html: "<b>Sao chép thử nghiệm</b>" };
    assert.equal(adapter._clipboardMemory.text, "Sao chép thử nghiệm", "Bộ nhớ tạm nội bộ lưu đúng văn bản thuần");
    assert.equal(adapter._clipboardMemory.html, "<b>Sao chép thử nghiệm</b>", "Bộ nhớ tạm nội bộ lưu đúng định dạng HTML");
  });

  await test("Paste Plain Text: Chỉ lấy chuỗi text, loại bỏ hoàn toàn HTML styling", async () => {
    let insertedData = null;
    adapter._insertClipboardContent = function(payload) {
      insertedData = payload;
      return true;
    };

    await adapter._pastePlainText();
    assert.ok(insertedData !== null, "Lệnh _pastePlainText phải gọi _insertClipboardContent");
    assert.equal(insertedData.html, "", "Dán văn bản thuần không được truyền HTML");
    assert.equal(insertedData.text, "Sao chép thử nghiệm", "Dán văn bản thuần phải truyền đúng chuỗi text");
  });

  await test("Formatted Paste: Giữ nguyên định dạng HTML từ bộ nhớ tạm", async () => {
    let insertedData = null;
    adapter._insertClipboardContent = function(payload) {
      insertedData = payload;
      return true;
    };

    await adapter._pasteFromSystemClipboard(false);
    assert.ok(insertedData !== null, "Dán thông thường phải gọi _insertClipboardContent");
    assert.equal(insertedData.html, "<b>Sao chép thử nghiệm</b>", "Dán giữ định dạng phải giữ lại HTML");
  });

  return results;
}
