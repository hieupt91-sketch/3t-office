/**
 * Test Suite: TICKET UI-P1 — Panel Overlay & Drawer Behavior (AI Assistant & Help Panel)
 * Đảm bảo:
 * 1. Panel Trợ lý AI và Trợ giúp là lớp nổi (overlay) với position: absolute, không làm co vùng soạn thảo.
 * 2. Độc quyền một panel bên phải: Mở AI đóng Trợ giúp, mở Trợ giúp đóng AI.
 * 3. Hỗ trợ đóng bằng nút X, Escape và click ra ngoài, trả focus về vùng soạn thảo.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { HelpPanel } from "../../platform/help/help-panel.js";
import { AppShell } from "../../platform/shell/app-shell.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function runPanelOverlayUiP1Tests() {
  const results = [];
  const originalDoc = globalThis.document;

  class MockElement {
    constructor(tagName = "div") {
      this.tagName = tagName.toUpperCase();
      this.className = "";
      this.children = [];
      this.parentNode = null;
      this.attributes = new Map();
      this.innerHTML = "";
      this.hidden = false;
      this.style = {};
    }
    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.get(k) || null; }
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    }
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) {
        this.children.splice(idx, 1);
        child.parentNode = null;
      }
      return child;
    }
    closest(selector) {
      let cur = this;
      while (cur) {
        if (selector.startsWith(".") && cur.className?.includes(selector.slice(1))) return cur;
        cur = cur.parentNode;
      }
      return null;
    }
    querySelector() {
      return { addEventListener: () => {}, focus: () => {} };
    }
    remove() {
      if (this.parentNode) {
        const idx = this.parentNode.children.indexOf(this);
        if (idx !== -1) this.parentNode.children.splice(idx, 1);
        this.parentNode = null;
      }
    }
  }

  if (typeof globalThis.document === "undefined") {
    globalThis.document = {
      createElement: (tag) => new MockElement(tag),
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {}
    };
  }

  try {
    // Test 1: Kiểm tra CSS .vno-ai-sidebar là overlay position absolute
    try {
      const shellCss = fs.readFileSync(path.join(root, "platform", "shell", "shell.css"), "utf-8");
      const aiRuleMatch = shellCss.includes(".vno-ai-sidebar {") &&
                           shellCss.includes("position: absolute;") &&
                           shellCss.includes("box-shadow:") &&
                           shellCss.includes("z-index: 40;");
      const aiHiddenMatch = shellCss.includes(".vno-ai-sidebar.is-hidden {") &&
                            shellCss.includes("display: none !important;");

      if (aiRuleMatch && aiHiddenMatch) {
        results.push({ name: "CSS: .vno-ai-sidebar định vị position: absolute, box-shadow, z-index 40, ẩn display: none", pass: true });
      } else {
        results.push({ name: "CSS: .vno-ai-sidebar thiếu thuộc tính overlay cần thiết", pass: false });
      }
    } catch (e) {
      results.push({ name: "CSS .vno-ai-sidebar lỗi: " + e.message, pass: false });
    }

    // Test 2: Kiểm tra CSS .vno-help-panel là overlay position absolute
    try {
      const helpCss = fs.readFileSync(path.join(root, "platform", "help", "help.css"), "utf-8");
      const helpRuleMatch = helpCss.includes(".vno-help-panel {") &&
                            helpCss.includes("position: absolute;") &&
                            helpCss.includes("box-shadow:") &&
                            helpCss.includes("z-index: 40;");
      const helpHiddenMatch = helpCss.includes(".vno-help-panel[hidden] {") &&
                              helpCss.includes("display: none !important;");

      if (helpRuleMatch && helpHiddenMatch) {
        results.push({ name: "CSS: .vno-help-panel định vị position: absolute, box-shadow, z-index 40, ẩn display: none", pass: true });
      } else {
        results.push({ name: "CSS: .vno-help-panel thiếu thuộc tính overlay cần thiết", pass: false });
      }
    } catch (e) {
      results.push({ name: "CSS .vno-help-panel lỗi: " + e.message, pass: false });
    }

    // Test 3: Độc quyền panel - Mở HelpPanel tự động đóng AI sidebar của AppShell
    try {
      let aiToggledOff = false;
      const mockShell = {
        isAiOpen: true,
        toggleAiSidebar: (force) => {
          if (force === false) aiToggledOff = true;
        }
      };

      const panel = new HelpPanel({ app: "writer" });
      panel.shell = mockShell;

      // Giả lập mở HelpPanel
      panel.open();

      if (aiToggledOff && panel.isOpen()) {
        results.push({ name: "HelpPanel.open: Tự động đóng Trợ lý AI khi mở Trợ giúp", pass: true });
      } else {
        results.push({ name: "HelpPanel.open: Không đóng Trợ lý AI khi mở Trợ giúp", pass: false });
      }
      panel.destroy();
    } catch (e) {
      results.push({ name: "HelpPanel độc quyền lỗi: " + e.message, pass: false });
    }

    // Test 4: Độc quyền panel - AppShell.toggleAiSidebar(true) tự động đóng HelpPanel
    try {
      let helpClosed = false;
      const mockHelpPanel = {
        isOpen: () => true,
        close: () => { helpClosed = true; }
      };

      const shell = new AppShell({ appName: "writer", appTitle: "Doc", helpPanel: mockHelpPanel });

      // Bật AI
      shell.toggleAiSidebar(true);

      if (helpClosed && shell.isAiOpen) {
        results.push({ name: "AppShell.toggleAiSidebar: Tự động đóng Trợ giúp khi mở Trợ lý AI", pass: true });
      } else {
        results.push({ name: "AppShell.toggleAiSidebar: Không đóng Trợ giúp khi mở Trợ lý AI", pass: false });
      }

      shell.toggleAiSidebar(false);
    } catch (e) {
      results.push({ name: "AppShell độc quyền lỗi: " + e.message, pass: false });
    }

    // Test 5: HelpPanel.mount tự động gắn vào .vno-workspace cha nếu có
    try {
      const parentWs = document.createElement("main");
      parentWs.className = "vno-workspace";
      const childHost = document.createElement("div");
      childHost.className = "vno-writer-workspace";
      parentWs.appendChild(childHost);

      const panel = new HelpPanel({ app: "writer" });
      panel.mount(childHost);

      if (panel.root && panel.root.parentNode === parentWs) {
        results.push({ name: "HelpPanel.mount: Gắn vào .vno-workspace cha thay vị trí con để tạo overlay đồng cấp", pass: true });
      } else {
        results.push({ name: "HelpPanel.mount: Gắn sai vị trí host", pass: false });
      }
      panel.destroy();
    } catch (e) {
      results.push({ name: "HelpPanel.mount lỗi: " + e.message, pass: false });
    }
  } finally {
    globalThis.document = originalDoc;
  }

  return results;
}
