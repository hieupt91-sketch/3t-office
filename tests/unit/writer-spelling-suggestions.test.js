/**
 * VN Office — Unit Tests: Gợi ý sửa lỗi chính tả tiếng Việt trong menu ngữ cảnh
 * Đảm bảo thuật toán xếp hạng ưu tiên các biến thể thanh điệu / dấu phụ trên cùng âm tiết gốc,
 * hỗ trợ ngữ cảnh từ đi liền trước (bigram), và cho phép nhấp thay thế từ trực tiếp trong văn bản.
 */

import assert from "node:assert/strict";
import {
  VietnameseSpellChecker,
  stripVietnameseTone,
  stripVietnameseDiacritics
} from "../../platform/text/vi-spellchecker.js";
import { VIETNAMESE_DICTIONARY_WORDS } from "../../platform/text/dictionaries/vi-dictionary.js";
import { SpellcheckDomController } from "../../platform/text/spellcheck-dom-controller.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";

export async function runWriterSpellingSuggestionsTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || err.message });
    }
  };

  const checker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS);

  await test("Spelling helper: stripVietnameseTone và stripVietnameseDiacritics bóc tách chuẩn", () => {
    assert.equal(stripVietnameseTone("định"), "đinh");
    assert.equal(stripVietnameseTone("đình"), "đinh");
    assert.equal(stripVietnameseTone("tiếng"), "tiêng");
    assert.equal(stripVietnameseDiacritics("quyết"), "quyet");
    assert.equal(stripVietnameseDiacritics("định"), "đinh");
  });

  await test("Spelling suggestion: 'đinh' đưa ra gợi ý chứa 'định' và 'đình' ở nhóm đầu", () => {
    const suggestions = checker.suggest("đinh");
    assert.ok(suggestions.length > 0, "Phải có gợi ý");
    assert.ok(suggestions.includes("định"), "Gợi ý cho 'đinh' phải chứa 'định'");
    assert.ok(suggestions.includes("đình"), "Gợi ý cho 'đinh' phải chứa 'đình'");
    // Hai từ cùng âm tiết gốc 'đinh' (chỉ khác dấu thanh) phải đứng trước các từ đổi nguyên âm khác
    const idxDinh = suggestions.indexOf("định");
    const idxDinhHuyen = suggestions.indexOf("đình");
    assert.ok(idxDinh < 3, "định phải nằm trong top gợi ý");
    assert.ok(idxDinhHuyen < 3, "đình phải nằm trong top gợi ý");
  });

  await test("Spelling suggestion: ngữ cảnh 'quyết' xếp 'định' lên vị trí đầu tiên (rank 0)", () => {
    const suggestions = checker.suggest("đinh", { contextPrev: "quyết" });
    assert.equal(suggestions[0], "định", "Khi đi sau 'quyết', gợi ý số 1 phải là 'định'");
  });

  await test("Spelling suggestion: gợi ý chuẩn cho các từ mất dấu phổ biến", () => {
    const s1 = checker.suggest("truong");
    assert.ok(s1.includes("trường") || s1.includes("trưởng"), "Gợi ý cho 'truong' phải có 'trường' hoặc 'trưởng'");

    const s2 = checker.suggest("nghi");
    assert.ok(s2.includes("nghĩ") || s2.includes("nghị"), "Gợi ý cho 'nghi' phải có 'nghĩ' hoặc 'nghị'");
  });

  await test("SpellcheckDomController: openMenu trích xuất contextPrev và hiển thị gợi ý đúng", () => {
    const fakeP = {
      tagName: "P",
      textContent: "quyết đinh",
      closest: () => fakeP,
      childNodes: []
    };

    const marker = {
      textContent: "đinh",
      parentElement: fakeP,
      closest: (sel) => (sel.includes("p") ? fakeP : null),
      previousSibling: { textContent: "quyết " },
      replaceWith(node) {
        this.replacedWith = node;
      }
    };

    let menuAppended = null;
    const oldDocument = globalThis.document;
    const oldWindow = globalThis.window;

    try {
      globalThis.document = {
        createElement(tag) {
          const el = {
            tagName: tag.toUpperCase(),
            className: "",
            attributes: new Map(),
            style: {},
            children: [],
            focus() {},
            remove() {},
            setAttribute(k, v) { this.attributes.set(k, v); },
            append(c) { this.children.push(c); },
            appendChild(c) { this.children.push(c); },
            addEventListener() {},
            querySelectorAll(sel) {
              return this.children.filter(c => c.className && c.className.includes(sel.replace(".", "")));
            },
            querySelector(sel) {
              if (sel === "button") return this.children.find(c => c.tagName === "BUTTON") || null;
              return this.children.find(c => c.className && c.className.includes(sel.replace(".", ""))) || null;
            }
          };
          return el;
        },
        createTextNode(text) {
          return { nodeType: 3, textContent: text, data: text };
        },
        body: {
          append(el) { menuAppended = el; }
        },
        removeEventListener() {}
      };
      globalThis.window = { innerWidth: 1000, innerHeight: 700 };

      const controller = new SpellcheckDomController({ roots: [], checker });
      controller.openMenu(marker, 100, 100);

      assert.ok(menuAppended, "Menu phải được thêm vào document.body");
      assert.equal(menuAppended.className, "vno-spellcheck-menu");

      const suggestionButtons = menuAppended.children.filter(c => c.className === "vno-spellcheck-suggestion");
      assert.ok(suggestionButtons.length > 0, "Phải có các nút gợi ý");
      assert.equal(suggestionButtons[0].textContent, "định", "Nút gợi ý đầu tiên phải là 'định'");

      controller.closeMenu();
    } finally {
      globalThis.document = oldDocument;
      globalThis.window = oldWindow;
    }
  });

  await test("Spelling Help: bài viết Help tiếng Việt hướng dẫn menu chuột phải sửa từ", () => {
    const entry = WRITER_HELP_ENTRIES.find(e => e.id === "writer.review.spellCheck");
    assert.ok(entry, "Bài help writer.review.spellCheck phải tồn tại");
    assert.equal(entry.ribbon.tabId, "review");
    assert.equal(entry.ribbon.group, "Chính tả & Ngữ pháp");

    const fullText = [entry.title, entry.summary, ...entry.steps].join(" ");
    assert.match(fullText, /chuột phải/i, "Phải hướng dẫn nhấp chuột phải");
    assert.match(fullText, /gợi ý/i, "Phải nói về gợi ý chính tả");
    assert.match(fullText, /định/i, "Phải có ví dụ thực tế");
    assert.match(fullText, /gạch dưới|gạch chân|lượn sóng/i, "Phải mô tả đường gạch dưới");
  });

  return results;
}
