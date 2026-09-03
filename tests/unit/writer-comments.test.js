/** Behavioral tests for VN Writer comments through the real global command bus. */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  _items() { return new Set((this.owner.className || "").split(/\s+/).filter(Boolean)); }
  add(name) { const items = this._items(); items.add(name); this.owner.className = [...items].join(" "); }
  remove(name) { const items = this._items(); items.delete(name); this.owner.className = [...items].join(" "); }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.className = "";
    this.classList = new FakeClassList(this);
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
    this.textContent = "";
    this.innerHTML = "";
    this.style = {};
  }
  get firstChild() { return this.children[0] || null; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  append(...nodes) { nodes.forEach((node) => this.appendChild(node)); }
  insertBefore(child, reference) {
    if (child.parentNode) {
      const oldIndex = child.parentNode.children.indexOf(child);
      if (oldIndex >= 0) child.parentNode.children.splice(oldIndex, 1);
    }
    const index = this.children.indexOf(reference);
    child.parentNode = this;
    this.children.splice(index < 0 ? this.children.length : index, 0, child);
  }
  removeChild(child) { const index = this.children.indexOf(child); if (index >= 0) this.children.splice(index, 1); child.parentNode = null; }
  replaceChildren() { this.children.forEach((child) => { child.parentNode = null; }); this.children = []; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(type, handler) { this.listeners[type] = handler; }
  removeEventListener(type) { delete this.listeners[type]; }
  contains(node) { return node === this || this.children.some((child) => child.contains?.(node)); }
  closest(selector) {
    if (selector === "[data-comment-id]" && this.dataset.commentId) return this;
    if (selector === "[data-comment-card]" && this.dataset.commentCard) return this;
    if (selector === "[data-comment-delete]" && this.dataset.commentDelete) return this;
    if (selector === "button" && this.tagName === "BUTTON") return this;
    return this.parentNode?.closest?.(selector) || null;
  }
  _matches(selector) {
    const match = selector.match(/^\[data-comment-(id|card)="([^"]+)"\]$/);
    if (match) return this.dataset[match[1] === "id" ? "commentId" : "commentCard"] === match[2];
    if (selector === ".vno-comment-anchor.is-active") return this.className.includes("vno-comment-anchor") && this.className.includes("is-active");
    if (selector === ".vno-comment-card.is-active") return this.className.includes("vno-comment-card") && this.className.includes("is-active");
    return false;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const found = [];
    for (const child of this.children) {
      if (child._matches(selector)) found.push(child);
      found.push(...child.querySelectorAll(selector));
    }
    return found;
  }
  focus() {}
  scrollIntoView() { this.scrolled = true; }
  normalize() {}
}

function makeRange(body, text) {
  return {
    collapsed: false,
    commonAncestorContainer: body,
    cloneRange() { return this; },
    toString() { return text; },
    extractContents() {
      const fragment = new FakeElement("fragment");
      const textNode = new FakeElement("span");
      textNode.textContent = text;
      fragment.appendChild(textNode);
      return fragment;
    },
    insertNode(mark) { body.appendChild(mark); }
  };
}

export async function runWriterCommentsTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  const originalDocument = globalThis.document;
  const body = new FakeElement("div");
  body.className = "vno-writer-body";
  const panel = new FakeElement("aside");
  const page = new FakeElement("div");
  page.querySelector = (selector) => selector === ".vno-writer-body" ? body : null;
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };

  const adapter = new WriterAdapter(page);
  adapter.setCommentsPanel(panel);
  adapter.attach();
  globalUnoBridge._bindAllStandardCommands();

  try {
    await test("Writer Comments: command có UNO mapping và execute thật tạo state + anchor riêng", async () => {
      if (mapVnCommandToUno("writer.comment.insert") !== ".uno:InsertAnnotation") throw new Error("Thiếu mapping .uno:InsertAnnotation");
      const firstId = await globalCommandBus.execute("writer.comment.insert", {
        range: makeRange(body, "đoạn thứ nhất"), anchorText: "đoạn thứ nhất", content: "Ghi chú A", silent: true
      });
      const secondId = await globalCommandBus.execute("writer.comment.insert", {
        range: makeRange(body, "đoạn thứ hai"), anchorText: "đoạn thứ hai", content: "Ghi chú B", silent: true
      });
      if (!firstId || !secondId || firstId === secondId) throw new Error("Hai comment không có id riêng");
      if (adapter.comments.length !== 2) throw new Error(`State có ${adapter.comments.length} comment, cần 2`);
      if (adapter.comments[0].content !== "Ghi chú A" || adapter.comments[1].anchorText !== "đoạn thứ hai") throw new Error("State comment bị dùng chung");
      if (!body.querySelector(`[data-comment-id="${firstId}"]`) || !body.querySelector(`[data-comment-id="${secondId}"]`)) throw new Error("Thiếu anchor DOM riêng");
      if (panel.hidden || panel.querySelectorAll(".vno-comment-card.is-active").length !== 1) throw new Error("Panel không hiển thị đúng active comment");
    });

    await test("Writer Comments: click anchor và card điều hướng đúng comment", async () => {
      const first = adapter.comments[0];
      const second = adapter.comments[1];
      const firstAnchor = body.querySelector(`[data-comment-id="${first.id}"]`);
      body.listeners.click({ target: firstAnchor });
      if (adapter.activeCommentId !== first.id || !firstAnchor.scrolled) throw new Error("Click anchor không mở đúng comment");
      const secondCard = panel.querySelector(`[data-comment-card="${second.id}"]`);
      panel.listeners.click({ target: secondCard });
      const secondAnchor = body.querySelector(`[data-comment-id="${second.id}"]`);
      if (adapter.activeCommentId !== second.id || !secondAnchor.scrolled) throw new Error("Click card không nhảy đúng anchor");
    });

    await test("Writer Comments: xóa từng comment loại khỏi state, panel và anchor DOM", async () => {
      const target = adapter.comments[0];
      const deleteButton = panel.children
        .flatMap((child) => child.children)
        .flatMap((child) => child.children)
        .find((node) => node.dataset?.commentDelete === target.id);
      if (!deleteButton) throw new Error("Không render nút xóa");
      panel.listeners.click({ target: deleteButton, stopPropagation() {} });
      if (adapter.comments.some((item) => item.id === target.id)) throw new Error("Comment vẫn còn trong state");
      if (body.querySelector(`[data-comment-id="${target.id}"]`)) throw new Error("Highlight vẫn còn trong DOM");
      if (panel.querySelector(`[data-comment-card="${target.id}"]`)) throw new Error("Card vẫn còn trong panel");
    });

    await test("Writer Comments: export bỏ metadata comment nhưng giữ highlight thường", async () => {
      const html = '<p><mark class="vno-comment-anchor" data-comment-id="writer-comment-1">neo</mark> <mark>tô sáng thường</mark></p>';
      const clean = adapter._stripCommentMarkup(html);
      if (clean.includes("data-comment-id") || !clean.includes("neo")) throw new Error("Metadata comment chưa được loại khỏi export");
      if (!clean.includes("<mark>tô sáng thường</mark>")) throw new Error("Highlight thường bị xóa nhầm");
    });
  } finally {
    globalThis.document = originalDocument;
  }

  return results;
}
