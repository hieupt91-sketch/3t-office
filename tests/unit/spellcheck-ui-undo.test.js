/**
 * VN Office — Unit Tests: CH-7.2 Vietnamese Spellcheck UI Suggestions & 1-Step Undo
 *
 * Kiểm tra:
 * 1. InputNormalizer liên kết element._vnoNormalizer và dọn dẹp khi destroy()
 * 2. SpellcheckDomController hỗ trợ callback onReplace
 * 3. applySuggestion() cập nhật DOM và gọi onReplace với đầy đủ metadata
 * 4. applySuggestion() ghi nhận snapshot undo vào normalizer trước và sau khi đổi từ
 * 5. Cơ chế hoàn tác 1-step undo sau khi chọn từ gợi ý
 */

import assert from "node:assert/strict";
import { InputNormalizer } from "../../platform/keyboard/input-normalizer.js";
import { SpellcheckDomController } from "../../platform/text/spellcheck-dom-controller.js";
import { VietnameseSpellChecker } from "../../platform/text/vi-spellchecker.js";

export async function runSpellcheckUiUndoTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || err.message });
    }
  };

  // Mock DOM tối thiểu cho unit test
  function createMockElement(initialText = "") {
    const listeners = new Map();
    let text = initialText;
    const el = {
      tagName: "DIV",
      contentEditable: "true",
      isContentEditable: true,
      getAttribute(k) { return k === "contenteditable" ? "true" : null; },
      get innerText() { return text; },
      set innerText(v) { text = v; },
      get textContent() { return text; },
      set textContent(v) { text = v; },
      get innerHTML() { return `<p>${text}</p>`; },
      set innerHTML(v) { text = v.replace(/<[^>]*>/g, ""); },
      childNodes: [],
      children: [],
      dataset: {},
      ownerDocument: null,
      isConnected: true,
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
        return target === el || (target && target.parentElement === el);
      },
      closest() {
        return el;
      },
      querySelectorAll() {
        return [];
      },
      querySelector() {
        return null;
      },
      normalize() {},
      getBoundingClientRect() {
        return { left: 10, top: 20, right: 100, bottom: 40, width: 90, height: 20 };
      }
    };
    return el;
  }

  await test("InputNormalizer: attach(el) gán el._vnoNormalizer và destroy() dọn sạch tham chiếu", () => {
    const el = createMockElement("Thử nghiệm");
    const normalizer = new InputNormalizer();
    normalizer.attach(el);

    assert.equal(el._vnoNormalizer, normalizer, "attach() phải gán _vnoNormalizer vào target element");

    normalizer.destroy();
    assert.equal(el._vnoNormalizer, undefined, "destroy() phải xóa sạch _vnoNormalizer trên target");
  });

  await test("SpellcheckDomController: khởi tạo chấp nhận callback onReplace", () => {
    const checker = new VietnameseSpellChecker(["hôm", "nay", "học", "làm", "việc"]);
    const root = createMockElement("Hôm nay họcj");
    let replacedData = null;

    const controller = new SpellcheckDomController({
      roots: [root],
      checker,
      debounceMs: 50,
      onReplace: (data) => {
        replacedData = data;
      }
    });

    assert.equal(typeof controller.onReplace, "function", "controller phải lưu callback onReplace");
    controller.destroy();
  });

  await test("SpellcheckDomController: applySuggestion() cập nhật DOM và gọi onReplace với đầy đủ metadata", () => {
    const checker = new VietnameseSpellChecker(["hôm", "nay", "học", "làm", "việc"]);
    const root = createMockElement("Hôm nay họcj");
    let onReplaceCalled = false;
    let receivedPayload = null;

    const controller = new SpellcheckDomController({
      roots: [root],
      checker,
      debounceMs: 50,
      onReplace: (payload) => {
        onReplaceCalled = true;
        receivedPayload = payload;
      }
    });

    // Tạo marker giả lập nằm trong root
    const marker = {
      tagName: "SPAN",
      className: "vno-spelling-uncertain",
      textContent: "họcj",
      parentElement: root,
      isConnected: true,
      replaceWith(newChild) {
        this.isConnected = false;
        root.textContent = "Hôm nay " + (newChild.textContent || newChild);
      }
    };

    controller.applySuggestion(marker, "học");

    assert.ok(onReplaceCalled, "onReplace phải được gọi khi áp dụng gợi ý");
    assert.equal(receivedPayload.word, "họcj", "Từ gốc phải là 'họcj'");
    assert.equal(receivedPayload.suggestion, "học", "Từ thay thế phải là 'học'");
    assert.equal(receivedPayload.textBefore, "Hôm nay họcj", "textBefore phải chính xác");
    assert.equal(receivedPayload.textAfter, "Hôm nay học", "textAfter phải được cập nhật");
    assert.equal(receivedPayload.root, root, "root phải trỏ về editable container");

    controller.destroy();
  });

  await test("SpellcheckDomController + InputNormalizer: applySuggestion() ghi lại snapshot để hoàn tác 1-step Ctrl+Z", () => {
    const root = createMockElement("Tôi đi họcj bài");
    const normalizer = new InputNormalizer();
    normalizer.attach(root);

    // Lưu snapshot ban đầu
    normalizer.customUndoStack = ["Tôi đi họcj bài"];

    const checker = new VietnameseSpellChecker(["tôi", "đi", "học", "bài"]);
    const controller = new SpellcheckDomController({
      roots: [root],
      checker,
      debounceMs: 50
    });

    const marker = {
      tagName: "SPAN",
      className: "vno-spelling-uncertain",
      textContent: "họcj",
      parentElement: root,
      isConnected: true,
      replaceWith() {
        this.isConnected = false;
        root.textContent = "Tôi đi học bài";
      }
    };

    controller.applySuggestion(marker, "học");

    // Lịch sử normalizer phải có bước sau khi thay thế
    assert.ok(normalizer.customUndoStack.length >= 2, "Normalizer phải ghi nhận snapshot mới");
    assert.equal(normalizer.customUndoStack[normalizer.customUndoStack.length - 1], "Tôi đi học bài");

    // Kiểm tra hoàn tác 1 bước (Ctrl+Z): lùi lại trạng thái trước khi thay thế
    normalizer._handleCtrlZ();
    assert.equal(root.textContent, "Tôi đi họcj bài", "Ctrl+Z phải khôi phục lại từ sai ban đầu trong đúng 1 bước");

    controller.destroy();
    normalizer.destroy();
  });

  return results;
}
