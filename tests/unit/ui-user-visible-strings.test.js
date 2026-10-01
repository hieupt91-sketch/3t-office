/**
 * 3T Office — CH-8 UI & Help Consistency & User-Visible String Scanner
 * Tuân thủ quy định Hạng mục CH-8 (Giao diện và Trợ giúp thống nhất)
 * - CH-8.1: Consistency audit (Ribbon, Backstage, Status bar, Zoom Ctrl+wheel & Ctrl+0, Dialogs)
 * - CH-8.2: KeyTips like Office (Alt toggle, Level 1 tabs, Level 2 buttons, Esc step-back)
 * - CH-8.3: Contextual F1 & "Có gì mới" (Release notes reader & clear fallback message)
 * - CH-8.4: User-visible string scanner (No VN Writer/Sheet/Slides/Office/AI, No calling our product Word/Excel/PowerPoint)
 * - CH-8.5: Theme & UI Font Size (Light/Dark, Normal/Large/XLarge)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { themeManager } from "../../platform/theme/theme-manager.js";
import { globalKeyTipsManager, TAB_KEYTIP_MAP } from "../../platform/ribbon/keytips.js";
import { HELP_ENTRIES, getHelpEntryById, getHelpEntriesForApp } from "../../platform/help/help-catalog.js";
import { findHelpEntryForContext } from "../../platform/help/help-service.js";
import { AppShell } from "../../platform/shell/app-shell.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { ShortcutManager, globalShortcutManager } from "../../platform/commands/shortcut-manager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");

export async function runUiConsistencyAndStringScannerTests() {
  const results = [];
  const runTest = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || String(err) });
    }
  };

  // =========================================================================
  // CH-8.4: User-Visible Strings Scanner Test
  // =========================================================================
  runTest("CH-8.4 Scanner: Quét sạch các tên cũ VN Writer, VN Sheet, VN Slides, VN Office, VN AI trong i18n", () => {
    const i18nFiles = [
      "platform/i18n/strings-vi.js",
      "platform/i18n/strings-en.js",
      "platform/i18n/strings.vi.json",
      "platform/i18n/strings.en.json"
    ];

    const forbiddenOldNames = [
      /\bVN\s*Writer\b/i,
      /\bVN\s*Sheet\b/i,
      /\bVN\s*Slides\b/i,
      /\bVN\s*Office\b/i,
      /\bVN\s*AI\b/i
    ];

    for (const relPath of i18nFiles) {
      const fullPath = path.join(ROOT_DIR, relPath);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, "utf-8");

      for (const pattern of forbiddenOldNames) {
        const match = content.match(pattern);
        assert.ok(!match, `Phát hiện tên cũ "${match?.[0]}" trong tệp hiển thị ${relPath}`);
      }
    }
  });

  runTest("CH-8.4 Scanner: Quét sạch tên cũ trong bài viết Help catalog (platform/help/)", () => {
    const helpFiles = [
      "platform/help/entries-writer.js",
      "platform/help/entries-sheet.js",
      "platform/help/entries-slides.js",
      "platform/help/entries-autorecover.js",
      "platform/help/entries-error-reporting.js",
      "platform/help/entries-updater.js",
      "platform/help/entries-consistency.js",
      "platform/help/help-catalog.js",
      "platform/help/help-panel.js"
    ];

    const forbiddenOldNames = [
      /\bVN\s*Writer\b/i,
      /\bVN\s*Sheet\b/i,
      /\bVN\s*Slides\b/i,
      /\bVN\s*Office\b/i,
      /\bVN\s*AI\b/i
    ];

    for (const relPath of helpFiles) {
      const fullPath = path.join(ROOT_DIR, relPath);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, "utf-8");

      for (const pattern of forbiddenOldNames) {
        // Cho phép tên thuộc tính kỹ thuật nội bộ nếu có (ví dụ VNOfficeMasterLogo trong XML comment)
        const lines = content.split("\n");
        lines.forEach((line, lineIdx) => {
          if (line.includes("VNOfficeMasterLogo")) return; // internal PPTX XML shape name
          const match = line.match(pattern);
          assert.ok(!match, `Phát hiện tên cũ "${match?.[0]}" tại ${relPath}:${lineIdx + 1}: ${line.trim()}`);
        });
      }
    }
  });

  runTest("CH-8.4 Scanner: Không gọi sản phẩm của mình là Word, Excel, PowerPoint", () => {
    const targetFiles = [
      "platform/i18n/strings-vi.js",
      "platform/i18n/strings-en.js",
      "platform/help/entries-writer.js",
      "platform/help/entries-sheet.js",
      "platform/help/entries-slides.js",
      "platform/help/entries-consistency.js",
      "platform/about/about-dialog.js",
      "platform/ui-kit/dialogs.js"
    ];

    // Cấm tự nhận sản phẩm là Word/Excel/PowerPoint
    const forbiddenClaims = [
      /chúng tôi là (Word|Excel|PowerPoint)/i,
      /phần mềm (Word|Excel|PowerPoint) của chúng tôi/i,
      /sản phẩm (Word|Excel|PowerPoint) của/i,
      /bản quyền (Word|Excel|PowerPoint)/i,
      /\b3T (Word|Excel|PowerPoint)\b/i,
      /\bVN (Word|Excel|PowerPoint)\b/i
    ];

    for (const relPath of targetFiles) {
      const fullPath = path.join(ROOT_DIR, relPath);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath, "utf-8");

      for (const pattern of forbiddenClaims) {
        const match = content.match(pattern);
        assert.ok(!match, `Phát hiện tự nhận sản phẩm là Word/Excel/PowerPoint: "${match?.[0]}" trong ${relPath}`);
      }
    }
  });

  // =========================================================================
  // CH-8.2: KeyTips Like Office
  // =========================================================================
  runTest("CH-8.2 KeyTips: Danh mục phím tắt tiếng Việt đầy đủ và không xung đột", () => {
    assert.equal(TAB_KEYTIP_MAP.file, "T", "Tệp phải dùng phím T");
    assert.equal(TAB_KEYTIP_MAP.home, "D", "Trang đầu phải dùng phím D");
    assert.equal(TAB_KEYTIP_MAP.insert, "C", "Chèn phải dùng phím C");
    assert.equal(TAB_KEYTIP_MAP.pageLayout, "B", "Bố cục phải dùng phím B");
    assert.equal(TAB_KEYTIP_MAP.formulas, "M", "Công thức phải dùng phím M");
    assert.equal(TAB_KEYTIP_MAP.data, "L", "Dữ liệu phải dùng phím L");
    assert.equal(TAB_KEYTIP_MAP.review, "X", "Xem lại/Xem xét phải dùng phím X");
    assert.equal(TAB_KEYTIP_MAP.view, "V", "Xem phải dùng phím V");
    assert.equal(TAB_KEYTIP_MAP.help, "G", "Trợ giúp phải dùng phím G");
    assert.equal(TAB_KEYTIP_MAP.ai, "A", "3T AI phải dùng phím A");
  });

  runTest("CH-8.2 KeyTips: Cơ chế điều hướng 2 cấp và phím Esc lùi từng bước", () => {
    // Giả lập DOM
    const origDoc = globalThis.document;
    const overlayHost = {
      children: [],
      appendChild(el) { this.children.push(el); el.parentNode = this; },
      removeChild(el) {
        const idx = this.children.indexOf(el);
        if (idx !== -1) this.children.splice(idx, 1);
        el.parentNode = null;
      }
    };

    try {
      globalThis.document = {
        body: overlayHost,
        createElement(tag) {
          const el = {
            tagName: tag.toUpperCase(),
            style: {},
            className: "",
            attributes: {},
            children: [],
            offsetWidth: 100,
            offsetHeight: 30,
            getBoundingClientRect: () => ({ left: 10, right: 110, top: 10, bottom: 40, width: 100, height: 30 }),
            setAttribute(k, v) { this.attributes[k] = String(v); },
            getAttribute(k) { return this.attributes[k] || null; },
            appendChild(child) { this.children.push(child); child.parentNode = this; },
            removeChild(child) {
              const i = this.children.indexOf(child);
              if (i !== -1) this.children.splice(i, 1);
              child.parentNode = null;
            },
            addEventListener() {},
            removeEventListener() {},
            click() { this.clicked = true; }
          };
          return el;
        },
        querySelector() { return null; },
        querySelectorAll() { return []; },
        addEventListener() {},
        removeEventListener() {}
      };

      globalKeyTipsManager.hide();
      assert.equal(globalKeyTipsManager.isActive, false, "KeyTips ban đầu phải tắt");

      globalKeyTipsManager.showLevel1();
      assert.equal(globalKeyTipsManager.isActive, true, "showLevel1 phải bật KeyTips");
      assert.equal(globalKeyTipsManager.level, 1, "Level phải là 1");

      // Giả lập phím Esc ở Level 1 -> Tắt hoàn toàn
      const escEvent1 = { key: "Escape", preventDefault() {}, stopPropagation() {} };
      const handled1 = globalKeyTipsManager.handleKeyDown(escEvent1);
      assert.equal(handled1, true, "Esc ở Level 1 phải được xử lý");
      assert.equal(globalKeyTipsManager.isActive, false, "Esc ở Level 1 phải tắt KeyTips");

      // Chuyển sang Level 2 và Esc lùi về Level 1
      globalKeyTipsManager.showLevel1();
      globalKeyTipsManager.level = 2; // Giả lập đã chọn tab
      const escEvent2 = { key: "Escape", preventDefault() {}, stopPropagation() {} };
      const handled2 = globalKeyTipsManager.handleKeyDown(escEvent2);
      assert.equal(handled2, true, "Esc ở Level 2 phải được xử lý");
      assert.equal(globalKeyTipsManager.level, 1, "Esc ở Level 2 phải quay về Level 1");
      assert.equal(globalKeyTipsManager.isActive, true, "KeyTips vẫn phải hoạt động");
    } finally {
      globalKeyTipsManager.hide();
      globalThis.document = origDoc;
    }
  });

  // =========================================================================
  // CH-8.3: Contextual F1 & Có gì mới
  // =========================================================================
  runTest("CH-8.3 F1 Help: Định vị đúng bài hướng dẫn theo ngữ cảnh phần tử hoặc dialog", () => {
    // 1. Kiểm tra phần tử có data-command-id
    const mockBoldBtn = {
      closest(sel) {
        if (sel.includes("data-command-id")) {
          return { getAttribute: (k) => k === "data-command-id" ? "writer.font.bold" : null };
        }
        return null;
      }
    };
    const boldEntry = findHelpEntryForContext(mockBoldBtn, "writer");
    assert.ok(boldEntry, "Phải tìm thấy bài hướng dẫn cho lệnh phông chữ/đậm");

    // 2. Kiểm tra phần tử trong hộp thoại Tùy chọn
    const mockOptionsEl = {
      closest(sel) {
        if (sel.includes("dialog")) {
          return { querySelector: (s) => s.includes("vno-options-dialog-title") ? {} : null };
        }
        return null;
      }
    };
    const optionsEntry = findHelpEntryForContext(mockOptionsEl, "writer");
    assert.equal(optionsEntry?.id, "common.help.themeAndFontSize", "Hộp thoại tùy chọn phải định vị đúng bài themeAndFontSize");
  });

  runTest("CH-8.3 Có gì mới: Bài hướng dẫn Có gì mới tồn tại trong catalog và đọc được ghi chú phát hành", () => {
    const whatsNew = getHelpEntryById("common.help.whatsNew");
    assert.ok(whatsNew, "Phải có bài hướng dẫn 'common.help.whatsNew' trong catalog");
    assert.equal(whatsNew.app, "common", "Bài Có gì mới phải dùng chung cho mọi app");
    assert.ok(whatsNew.title.includes("Có gì mới"), "Tiêu đề phải có 'Có gì mới'");

    // Kiểm tra tệp release-notes.txt shipped cùng ứng dụng
    const notesFile = path.join(ROOT_DIR, "release-notes.txt");
    assert.ok(fs.existsSync(notesFile), "Tệp release-notes.txt phải tồn tại trong thư mục gốc");
    const notesContent = fs.readFileSync(notesFile, "utf-8");
    assert.ok(notesContent.includes("3T Office"), "Ghi chú phát hành phải chứa tên thương hiệu 3T Office");
    assert.ok(notesContent.includes("0.9.0-pilot1"), "Ghi chú phát hành phải chứa phiên bản đang cài đặt");
  });

  // =========================================================================
  // CH-8.5: Theme & UI Font Size Consistency
  // =========================================================================
  runTest("CH-8.5 Theme & Font Size: Áp dụng đồng bộ và có đủ các mức cỡ chữ", () => {
    // Theme
    themeManager.setTheme("dark");
    assert.equal(themeManager.getTheme(), "dark");
    themeManager.setTheme("light");
    assert.equal(themeManager.getTheme(), "light");

    // Font size
    themeManager.setFontSize("large");
    assert.equal(themeManager.getFontSize(), "large");
    themeManager.setFontSize("xlarge");
    assert.equal(themeManager.getFontSize(), "xlarge");
    themeManager.setFontSize("normal");
    assert.equal(themeManager.getFontSize(), "normal");
  });

  // =========================================================================
  // CH-8.1: Status Bar Zoom & Shortcuts (Ctrl+0, Wheel)
  // =========================================================================
  runTest("CH-8.1 Zoom: Phím tắt Ctrl+0 đăng ký chuẩn và hàm setZoom kẹp phạm vi 50%-200%", () => {
    const sm = new ShortcutManager();
    assert.equal(sm._shortcuts.get("CTRL+0"), "common.view.zoomReset", "Ctrl+0 phải gắn với common.view.zoomReset");

    const shell = new AppShell({ appName: "writer", appTitle: "3T Doc" });
    assert.equal(shell.zoomLevel, 100, "Mức thu phóng mặc định là 100%");

    shell.setZoom(150);
    assert.equal(shell.zoomLevel, 150, "Thu phóng phải đổi thành 150%");

    shell.setZoom(300);
    assert.equal(shell.zoomLevel, 200, "Thu phóng tối đa phải bị kẹp ở 200%");

    shell.setZoom(20);
    assert.equal(shell.zoomLevel, 50, "Thu phóng tối thiểu phải bị kẹp ở 50%");

    shell.setZoom(100);
    assert.equal(shell.zoomLevel, 100);
  });

  return results;
}
