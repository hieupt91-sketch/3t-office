/**
 * VN Office — Unit Tests: CH-7.2 Sheet Inline Spellcheck, Suggestion Menu, 1-Step Undo & 3-App Toggle
 *
 * Kiểm tra:
 * 1. SpellcheckDomController hỗ trợ setEnabled(bool), unwrap ngay khi tắt và quét lại khi bật
 * 2. isSpellcheckEnabled / setSpellcheckEnabled đồng bộ với localStorage (vno-spellcheck-enabled)
 * 3. SheetInlineSpellcheck gạch đỏ từ sai và bỏ qua công thức (=...)
 * 4. SheetInlineSpellcheck menu gợi ý và thay thế từ sai
 * 5. SheetInlineSpellcheck hoàn tác 1 bước Ctrl+Z khôi phục từ ban đầu
 * 6. Ribbon của cả 3 app (Doc, Sheet, Slide) khai báo nút toggleSpellCheck
 */

import assert from "node:assert/strict";
import {
  SpellcheckDomController,
  isSpellcheckEnabled,
  setSpellcheckEnabled,
  SPELLCHECK_ENABLED_KEY
} from "../../platform/text/spellcheck-dom-controller.js";
import { VietnameseSpellChecker } from "../../platform/text/vi-spellchecker.js";
import { InputNormalizer } from "../../platform/keyboard/input-normalizer.js";
import { SheetInlineSpellcheck } from "../../apps/sheet/sheet-inline-spellcheck.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { WRITER_COMMANDS, SHEET_COMMANDS, SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";

export async function runSpellcheckInlineToggleTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || err.message });
    }
  };

  // Mock DOM tối thiểu
  function createMockElement(initialText = "") {
    const listeners = new Map();
    let text = initialText;
    const childrenList = [];
    const el = {
      tagName: "SPAN",
      className: "",
      childNodes: childrenList,
      children: childrenList,
      dataset: {},
      ownerDocument: null,
      isConnected: true,
      parentElement: null,
      get parentNode() { return this.parentElement; },
      get innerText() { return text; },
      set innerText(v) { text = v; },
      get textContent() { return text; },
      set textContent(v) { text = v; },
      appendChild(child) {
        if (child) {
          child.parentElement = el;
          childrenList.push(child);
        }
        return child;
      },
      removeChild(child) {
        const idx = childrenList.indexOf(child);
        if (idx >= 0) childrenList.splice(idx, 1);
        if (child) child.parentElement = null;
        return child;
      },
      replaceWith(...nodes) {
        if (el.parentElement) {
          const parent = el.parentElement;
          const idx = parent.childNodes.indexOf(el);
          if (idx >= 0) {
            parent.childNodes.splice(idx, 1);
            for (let i = nodes.length - 1; i >= 0; i--) {
              const node = nodes[i];
              if (node && typeof node === "object") {
                node.parentElement = parent;
                parent.childNodes.splice(idx, 0, node);
              }
            }
          }
        }
        el.isConnected = false;
      },
      before() {},
      append(...items) {
        for (const item of items) {
          if (item) {
            item.parentElement = el;
            childrenList.push(item);
          }
        }
      },
      addEventListener(event, fn) {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event).push(fn);
      },
      removeEventListener(event, fn) {
        const arr = listeners.get(event) || [];
        const idx = arr.indexOf(fn);
        if (idx >= 0) arr.splice(idx, 1);
      },
      dispatchEvent(evt) {
        const arr = listeners.get(evt.type) || [];
        for (const fn of arr) fn(evt);
        return true;
      },
      contains(target) {
        return target === el || childrenList.includes(target);
      },
      closest() {
        return el;
      },
      querySelectorAll(selector) {
        if (selector.includes(".vno-spelling-uncertain") || selector.includes("[data-vno-spelling-uncertain]")) {
          return childrenList.filter(c => c && c.className && c.className.includes("vno-spelling-uncertain"));
        }
        return [];
      },
      querySelector(selector) {
        return this.querySelectorAll(selector)[0] || null;
      },
      normalize() {},
      getBoundingClientRect() {
        return { left: 10, top: 20, right: 100, bottom: 40, width: 90, height: 20 };
      }
    };
    return el;
  }

  await test("SpellcheckDomController: setEnabled(false) unwrap toàn bộ marker ngay lập tức; setEnabled(true) quét lại", () => {
    const checker = new VietnameseSpellChecker(["hôm", "nay", "học", "làm"]);
    const root = createMockElement("họcj");

    // Tạo marker con
    const marker = createMockElement("họcj");
    marker.className = "vno-spelling-uncertain";
    marker.dataset.vnoSpellingUncertain = "hocj";
    root.appendChild(marker);

    const controller = new SpellcheckDomController({
      roots: [root],
      checker,
      debounceMs: 50,
      enabled: true,
      document: {
        createTextNode: (t) => createMockElement(t)
      }
    });

    assert.equal(controller.enabled, true, "Controller phải ở trạng thái enabled ban đầu");

    // Tắt kiểm tra chính tả
    controller.setEnabled(false);
    assert.equal(controller.enabled, false, "Controller phải chuyển sang disabled");
    assert.equal(root.querySelectorAll(".vno-spelling-uncertain").length, 0, "Markers phải được gỡ bỏ ngay lập tức khi tắt");

    // Bật lại
    controller.setEnabled(true);
    assert.equal(controller.enabled, true, "Controller phải chuyển sang enabled");
    controller.destroy();
  });

  await test("isSpellcheckEnabled / setSpellcheckEnabled đồng bộ với localStorage", () => {
    const originalStorage = globalThis.localStorage;
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    };

    try {
      // Mặc định ban đầu chưa đặt gì
      assert.equal(isSpellcheckEnabled(), true, "Mặc định khi chưa lưu phải là true");

      // Tắt chính tả
      setSpellcheckEnabled(false);
      assert.equal(localStorage.getItem(SPELLCHECK_ENABLED_KEY), "false", "Phải lưu 'false' vào localStorage");
      assert.equal(isSpellcheckEnabled(), false, "isSpellcheckEnabled phải trả về false");

      // Bật lại
      setSpellcheckEnabled(true);
      assert.equal(localStorage.getItem(SPELLCHECK_ENABLED_KEY), "true", "Phải lưu 'true' vào localStorage");
      assert.equal(isSpellcheckEnabled(), true, "isSpellcheckEnabled phải trả về true");
    } finally {
      globalThis.localStorage = originalStorage;
    }
  });

  await test("SheetInlineSpellcheck: khởi tạo gắn overlay, gạch đỏ từ sai và bỏ qua công thức (=...)", () => {
    const parentWrap = createMockElement("");
    const formulaInput = {
      tagName: "TEXTAREA",
      value: "Hôm nay họcj",
      parentElement: parentWrap,
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); }
      },
      addEventListener(evt, fn) {
        this["on" + evt] = fn;
      },
      removeEventListener(evt) {
        delete this["on" + evt];
      },
      dispatchEvent(e) {
        if (this["on" + e.type]) this["on" + e.type](e);
        return true;
      },
      selectionStart: 12,
      selectionEnd: 12
    };

    const mockGrid = {
      formulaInput,
      spellChecker: new VietnameseSpellChecker(["hôm", "nay", "học", "làm"]),
      selectedCoord: { c: "B", r: 4 },
      setCellValue(c, r, v) { this.lastCell = { c, r, v }; }
    };

    const inlineController = new SheetInlineSpellcheck(mockGrid);
    assert.ok(inlineController.overlay, "Phải tạo overlay cho formulaInput");
    assert.ok(inlineController.domController, "Phải khởi tạo SpellcheckDomController");

    // Kiểm tra với công thức: bắt đầu bằng "=" thì không được gạch đỏ
    formulaInput.value = "=SUM(B1:B10)";
    inlineController._syncFromInput();
    assert.equal(inlineController.overlay.style.display, "none", "Công thức bắt đầu bằng = phải ẩn overlay");

    // Kiểm tra với văn bản thường có từ sai
    formulaInput.value = "Hôm nay họcj";
    inlineController._syncFromInput();
    assert.equal(inlineController.overlay.style.display, "", "Văn bản thường phải hiển thị overlay");

    inlineController.destroy();
  });

  await test("SheetInlineSpellcheck: contextmenu gợi ý và thay thế từ sai đúng 1 bước", () => {
    const parentWrap = createMockElement("");
    let lastSetVal = null;
    const formulaInput = {
      tagName: "TEXTAREA",
      value: "họcj",
      parentElement: parentWrap,
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); }
      },
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() { return true; },
      selectionStart: 4,
      selectionEnd: 4,
      setSelectionRange(start, end) {
        this.selectionStart = start;
        this.selectionEnd = end;
      }
    };

    const normalizer = new InputNormalizer({ target: formulaInput });
    formulaInput._vnoNormalizer = normalizer;
    normalizer.attach(formulaInput);

    const mockGrid = {
      formulaInput,
      spellChecker: new VietnameseSpellChecker(["học", "làm"]),
      selectedCoord: { c: "A", r: 1 },
      setCellValue(c, r, v) { lastSetVal = v; }
    };

    const inlineController = new SheetInlineSpellcheck(mockGrid);

    // Giả lập áp dụng gợi ý
    inlineController._handleReplace({
      word: "họcj",
      suggestion: "học",
      textBefore: "họcj",
      textAfter: "học"
    });

    assert.equal(formulaInput.value, "học", "Giá trị ô phải được thay bằng 'học'");
    assert.equal(lastSetVal, "học", "Giá trị trong grid phải được cập nhật đồng bộ");

    // Nhấn Ctrl+Z để hoàn tác 1 bước
    const undoResult = normalizer._handleCtrlZ({ ctrlKey: true, key: "z" });
    assert.equal(undoResult, true, "Ctrl+Z phải xử lý hoàn tác");
    assert.equal(formulaInput.value, "họcj", "Ctrl+Z đúng 1 bước phải khôi phục lại từ 'họcj'");

    inlineController.destroy();
    normalizer.destroy();
  });

  await test("Cả 3 app (Doc, Sheet, Slide): Ribbon và Command definitions có đầy đủ nút toggleSpellCheck", () => {
    // 1. Command definitions
    const writerCmd = WRITER_COMMANDS.find(c => c.id === "writer.review.toggleSpellCheck");
    assert.ok(writerCmd, "Thiếu WRITER_COMMANDS: writer.review.toggleSpellCheck");
    assert.equal(writerCmd.isToggle, true, "writer.review.toggleSpellCheck phải có isToggle=true");

    const sheetCmd = SHEET_COMMANDS.find(c => c.id === "sheet.review.toggleSpellCheck");
    assert.ok(sheetCmd, "Thiếu SHEET_COMMANDS: sheet.review.toggleSpellCheck");
    assert.equal(sheetCmd.isToggle, true, "sheet.review.toggleSpellCheck phải có isToggle=true");

    const slidesCmd = SLIDES_COMMANDS.find(c => c.id === "slides.review.toggleSpellCheck");
    assert.ok(slidesCmd, "Thiếu SLIDES_COMMANDS: slides.review.toggleSpellCheck");
    assert.equal(slidesCmd.isToggle, true, "slides.review.toggleSpellCheck phải có isToggle=true");

    // 2. Writer Ribbon
    const writerReviewTab = WRITER_RIBBON_TABS.find(t => t.id === "review");
    assert.ok(writerReviewTab, "Thiếu tab review trong Writer");
    const writerProofGroup = writerReviewTab.groups.find(g => g.id === "proofread");
    assert.ok(writerProofGroup, "Thiếu nhóm proofread trong Writer tab review");
    assert.ok(
      writerProofGroup.items.some(i => i.commandId === "writer.review.toggleSpellCheck"),
      "Nhóm proofread của Writer phải có nút writer.review.toggleSpellCheck"
    );

    // 3. Sheet Ribbon
    const sheetReviewTab = SHEET_RIBBON_TABS.find(t => t.id === "review");
    assert.ok(sheetReviewTab, "Thiếu tab review trong Sheet");
    const sheetProofGroup = sheetReviewTab.groups.find(g => g.id === "proofing");
    assert.ok(sheetProofGroup, "Thiếu nhóm proofing trong Sheet tab review");
    assert.ok(
      sheetProofGroup.items.some(i => i.commandId === "sheet.review.toggleSpellCheck"),
      "Nhóm proofing của Sheet phải có nút sheet.review.toggleSpellCheck"
    );

    // 4. Slides Ribbon
    const slidesReviewTab = SLIDES_RIBBON_TABS.find(t => t.id === "review");
    assert.ok(slidesReviewTab, "Thiếu tab review trong Slides");
    const slidesProofGroup = slidesReviewTab.groups.find(g => g.id === "proofing");
    assert.ok(slidesProofGroup, "Thiếu nhóm proofing trong Slides tab review");
    assert.ok(
      slidesProofGroup.items.some(i => i.commandId === "slides.review.toggleSpellCheck"),
      "Nhóm proofing của Slides phải có nút slides.review.toggleSpellCheck"
    );
  });

  return results;
}
