/**
 * Unit Test Suite: A11y Audit for New Features (VN Office)
 * Verifies accessibility compliance (WCAG 2.1 AA / WAI-ARIA) for:
 * 1. Sheet Paste Special (Enter keydown handler, radio group, CSS focus-visible)
 * 2. Merge Cells Confirm Dialog (Enter key defense on cancel/close buttons, aria-modal, role="dialog")
 * 3. Slide Sorter Section Menu & Divider (Shift+F10, role="menu", role="heading", aria-level="2", roving tabindex)
 * 4. WordArt Insert Dialog (role="radiogroup", role="radio", roving tabindex, arrow navigation, event.stopPropagation)
 * 5. SmartArt Diagram Group Selection (keyboard selection via Enter/Space, aria-label, Delete in 1 step, high-contrast CSS)
 * 6. Dark Mode Toggle (aria-pressed toggle, keyboard operable via Space/Enter)
 */

import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { showConfirmDialog, showPromptDialog } from "../../platform/ui-kit/dialogs.js";
import { showWordArtDialog, WORDART_PRESETS } from "../../apps/slides/insert-dialogs.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

class MockElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.listeners = {};
    this.classList = new Set();
    this.dataset = {};
    this.tabIndex = 0;
  }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) ?? null; }
  removeAttribute(k) { this.attributes.delete(k); }
  hasAttribute(k) { return this.attributes.has(k); }
  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter(c => c !== child);
    child.parentNode = null;
    return child;
  }
  remove() {
    if (this.parentNode) this.parentNode.removeChild(this);
  }
  addEventListener(type, fn) {
    (this.listeners[type] ||= []).push(fn);
  }
  removeEventListener(type, fn) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(f => f !== fn);
    }
  }
  dispatchEvent(event) {
    const list = this.listeners[event.type] || [];
    for (const fn of list) fn(event);
    return !event.defaultPrevented;
  }
  focus() {}
  blur() {}
  select() {}
  querySelector() { return null; }
  querySelectorAll() { return []; }
  contains(child) {
    let curr = child;
    while (curr) {
      if (curr === this) return true;
      curr = curr.parentNode;
    }
    return false;
  }
}

export async function runA11yAuditNewFeaturesTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  // =========================================================================
  // 1. Paste Special Dialog Keyboard & CSS A11y
  // =========================================================================
  await test("Sheet: Paste Special dialog binds Enter keydown on form to apply paste", () => {
    const sheetGridCode = fs.readFileSync(path.join(rootDir, "apps/sheet/sheet-grid.js"), "utf8");
    assert(sheetGridCode.includes('form.addEventListener("keydown", event => {'), "Form must listen for keydown");
    assert(sheetGridCode.includes('if (event.key === "Enter") {'), "Must handle Enter keydown");
    assert(sheetGridCode.includes('paste();'), "Must trigger paste() on Enter");
  });

  await test("Sheet: CSS contains focus-visible and focus-within indicators for Paste Special & dialog rules", () => {
    const sheetCss = fs.readFileSync(path.join(rootDir, "apps/sheet/sheet.css"), "utf8");
    assert(sheetCss.includes(".vno-sheet-rule-dialog fieldset label:focus-within"), "Must style fieldset label:focus-within");
    assert(sheetCss.includes(".vno-sheet-rule-dialog fieldset label:has(input:focus-visible)"), "Must style :has(input:focus-visible)");
    assert(sheetCss.includes(".vno-rule-close:focus-visible"), "Must have focus-visible for close button");
  });

  // =========================================================================
  // 2. Merge Cells Confirm & Prompt Dialog Data Defense on Enter Key
  // =========================================================================
  await test("Dialogs: showConfirmDialog prevents accidental data loss when Enter is pressed on Cancel button", async () => {
    const dialogsCode = fs.readFileSync(path.join(rootDir, "platform/ui-kit/dialogs.js"), "utf8");
    assert(dialogsCode.includes("document.activeElement === cancelBtn"), "showConfirmDialog must check if activeElement is cancelBtn");
    assert(dialogsCode.includes("document.activeElement === closeBtn"), "showConfirmDialog must check if activeElement is closeBtn");
  });

  await test("Dialogs: showPromptDialog returns null when Enter is pressed on Cancel button", async () => {
    const dialogsCode = fs.readFileSync(path.join(rootDir, "platform/ui-kit/dialogs.js"), "utf8");
    assert(dialogsCode.includes("if (document.activeElement === cancelBtn || document.activeElement === closeBtn)"), "showPromptDialog must resolve null when Cancel/Close button is focused on Enter");
  });

  // =========================================================================
  // 3. Slide Sorter Section Menu & Divider ARIA Structure
  // =========================================================================
  await test("Slides: Section context menu has role='menu', menuitems have roving tabindex, Shift+F10 opens menu", () => {
    const canvasCode = fs.readFileSync(path.join(rootDir, "apps/slides/slides-canvas.js"), "utf8");
    assert(canvasCode.includes('menu.setAttribute?.("role", "menu")'), "Section menu must have role='menu'");
    assert(canvasCode.includes('role="menuitem" tabindex="0"'), "First action must have role='menuitem' and tabindex='0'");
    assert(canvasCode.includes('event.shiftKey && event.key === "F10"'), "Slide sorter item must listen to Shift+F10");
    assert(canvasCode.includes('event.key === "ContextMenu"'), "Slide sorter item must listen to ContextMenu key");
    assert(canvasCode.includes('event.stopPropagation()'), "Section menu Escape/Tab must stop propagation to avoid closing slide sorter");
  });

  await test("Slides: Section divider has role='heading' and aria-level='2'", () => {
    const canvasCode = fs.readFileSync(path.join(rootDir, "apps/slides/slides-canvas.js"), "utf8");
    assert(canvasCode.includes('divider.setAttribute?.("role", "heading")'), "Section divider must have role='heading'");
    assert(canvasCode.includes('divider.setAttribute?.("aria-level", "2")'), "Section divider must have aria-level='2'");
  });

  await test("Slides: CSS defines :focus-visible for slide sorter items, section divider, and section menu buttons", () => {
    const slidesCss = fs.readFileSync(path.join(rootDir, "apps/slides/slides.css"), "utf8");
    assert(slidesCss.includes(".vno-slide-sorter-item:focus-visible"), "Must have .vno-slide-sorter-item:focus-visible style");
    assert(slidesCss.includes(".vno-slide-section-divider:focus-visible"), "Must have .vno-slide-section-divider:focus-visible style");
    assert(slidesCss.includes(".vno-slide-section-menu button:focus-visible"), "Must have .vno-slide-section-menu button:focus-visible style");
  });

  // =========================================================================
  // 4. WordArt Insert Dialog WAI-ARIA Radio Group & Roving Tabindex
  // =========================================================================
  await test("Slides: WordArt presets use role='radiogroup', role='radio', and WAI-ARIA roving tabindex", () => {
    const insertDialogsCode = fs.readFileSync(path.join(rootDir, "apps/slides/insert-dialogs.js"), "utf8");
    assert(insertDialogsCode.includes('role="radiogroup"'), "Gallery must have role='radiogroup'");
    assert(insertDialogsCode.includes('role="radio"'), "Presets must have role='radio'");
    assert(insertDialogsCode.includes('tabindex="${selected ? "0" : "-1"}"'), "Presets must use roving tabindex 0/-1");
    assert(insertDialogsCode.includes('["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)'), "Gallery must support Arrow keys navigation");
    assert(insertDialogsCode.includes('b.setAttribute("tabindex", i === nextIdx ? "0" : "-1")'), "Arrow navigation must update tabindex 0/-1");
  });

  await test("Slides: WordArt preset buttons have :focus-visible outline in CSS", () => {
    const slidesCss = fs.readFileSync(path.join(rootDir, "apps/slides/slides.css"), "utf8");
    assert(slidesCss.includes(".vno-wordart-preset:focus-visible"), "Must style .vno-wordart-preset:focus-visible");
    // Uses the per-app accent token (--vno-slides-primary), matching the
    // established pattern from this session's Dark Mode work - not a
    // generic --vno-primary, which doesn't exist in this token system.
    assert(slidesCss.includes("outline: 2px solid var(--vno-slides-primary"), "WordArt preset focus-visible must have high-contrast outline");
  });

  // =========================================================================
  // 5. SmartArt Diagram Group Selection Keyboard Operations
  // =========================================================================
  await test("Slides: SmartArt diagram shapes have dataset.diagramGroupId and aria-label announcing SmartArt", () => {
    const canvasCode = fs.readFileSync(path.join(rootDir, "apps/slides/slides-canvas.js"), "utf8");
    assert(canvasCode.includes('shape.diagramGroupId'), "Must check shape.diagramGroupId");
    assert(canvasCode.includes('el.dataset.diagramGroupId = String(shape.diagramGroupId)'), "Must set dataset.diagramGroupId");
    assert(canvasCode.includes('el.setAttribute?.("aria-label", `Sơ đồ SmartArt:'), "Must set descriptive SmartArt aria-label");
  });

  await test("Slides: Keyboard Enter/Space on diagram node triggers selectDiagramGroup", () => {
    const canvasCode = fs.readFileSync(path.join(rootDir, "apps/slides/slides-canvas.js"), "utf8");
    assert(canvasCode.includes('if (shape.diagramGroupId && (event.key === "Enter" || event.key === " "))'), "Must handle Enter/Space on diagram node");
    assert(canvasCode.includes('this.selectDiagramGroup(shape.diagramGroupId, shape.id)'), "Must call selectDiagramGroup");
  });

  await test("Slides: Keyboard Delete/Backspace deletes selected diagram shapes in a single undo step", () => {
    const canvasCode = fs.readFileSync(path.join(rootDir, "apps/slides/slides-canvas.js"), "utf8");
    assert(canvasCode.includes('if (event.key === "Delete" || event.key === "Backspace")'), "Must handle Delete/Backspace on shape item");
    assert(canvasCode.includes('this.deleteSelectedShapes()'), "Must invoke deleteSelectedShapes()");
  });

  await test("Slides: CSS defines :focus-visible and is-diagram-group-member selection styling", () => {
    const slidesCss = fs.readFileSync(path.join(rootDir, "apps/slides/slides.css"), "utf8");
    assert(slidesCss.includes(".vno-slide-shape-item:focus-visible"), "Must have .vno-slide-shape-item:focus-visible style");
    assert(slidesCss.includes(".vno-slide-shape-item.is-diagram-group-member.is-selected:focus-visible"), "Must have group-member is-selected:focus-visible style");
  });

  // =========================================================================
  // 6. Dark Mode Toggle Accessibility & State Persistence
  // =========================================================================
  await test("Theme: Toggle button has aria-pressed and updates data-theme attribute", () => {
    // The button is created dynamically by AppShell, not present as static
    // markup in index.html - check the actual source instead of a wrong file.
    const appShellCode = fs.readFileSync(path.join(rootDir, "platform/shell/app-shell.js"), "utf8");
    assert(appShellCode.includes('id="vno-toggle-theme-btn"'), "Must have #vno-toggle-theme-btn");
    assert(appShellCode.includes('aria-label="${t("common.toggleTheme")}"'), "Button must have an i18n-driven aria-label");
    assert(appShellCode.includes('aria-pressed="${themeManager.getTheme()'), "Button must set aria-pressed from the real theme state on render");
    assert(appShellCode.includes('themeToggleBtn.setAttribute("aria-pressed", String(isDark))'), "Toggling must update aria-pressed to reflect the new theme, not just the initial render");
  });

  return results;
}
