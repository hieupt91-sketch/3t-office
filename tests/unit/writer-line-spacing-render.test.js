/**
 * Unit Tests: Writer Line Spacing Rendering & Scale (TICKET-RB-D1c LỖI 1)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runWriterLineSpacingRenderTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("writer.css: contains high-priority --vno-lh rule and refined line-height inheritance", () => {
    const cssPath = path.resolve(__dirname, "../../apps/writer/writer.css");
    const css = fs.readFileSync(cssPath, "utf8");
    assert.ok(
      css.includes('.vno-writer-page [style*="--vno-lh"]'),
      "writer.css must have explicit rule for .vno-writer-page [style*=\"--vno-lh\"]"
    );
    assert.ok(
      css.includes('[style*="line-height:"]:not([style*="-line-height:"])'),
      "writer.css must avoid matching custom properties like --vno-doc-line-height with substring"
    );
  });

  await test("WriterAdapter._setLineHeight: sets --vno-lh and clears inline line-height on target and children", () => {
    const p = {
      tagName: "P",
      style: {
        _props: { "line-height": "20px" },
        setProperty(name, val) { this._props[name] = String(val); },
        removeProperty(name) { delete this._props[name]; },
        getPropertyValue(name) { return this._props[name] || ""; }
      },
      querySelectorAll(sel) {
        if (sel === "[style*='line-height']") {
          return [
            {
              style: {
                removeProperty(name) { delete this._props[name]; },
                _props: { "line-height": "18px" }
              }
            }
          ];
        }
        return [];
      }
    };
    const body = {
      children: [p],
      contains: (node) => node === p
    };
    const adapter = new WriterAdapter({
      querySelector: (sel) => (sel === ".vno-writer-body" ? body : null),
      innerHTML: ""
    });
    adapter.bodyDom = body;
    adapter._getSelectedParagraphBlocks = () => [p];
    adapter.recordSnapshot = () => {};

    const res = adapter._setLineHeight("2.0");
    assert.equal(res, true, "_setLineHeight must succeed");
    assert.equal(p.style.getPropertyValue("--vno-lh"), "2", "--vno-lh should be set to 2");
    assert.equal(p.style.getPropertyValue("line-height"), "", "inline line-height on p should be removed");
  });

  await test("WriterAdapter: supports lineSpacing 2.5 and 3.0", async () => {
    const p = {
      tagName: "P",
      style: {
        _props: {},
        setProperty(name, val) { this._props[name] = String(val); },
        removeProperty(name) { delete this._props[name]; },
        getPropertyValue(name) { return this._props[name] || ""; }
      },
      querySelectorAll: () => []
    };
    const body = {
      children: [p],
      contains: () => true
    };
    const adapter = new WriterAdapter({
      querySelector: () => body,
      innerHTML: ""
    });
    adapter.bodyDom = body;
    adapter._getSelectedParagraphBlocks = () => [p];
    adapter.recordSnapshot = () => {};
    adapter.attach();

    await globalCommandBus.execute("writer.para.lineSpacing", "2.5");
    assert.equal(p.style.getPropertyValue("--vno-lh"), "2.5", "Line spacing 2.5 must set --vno-lh to 2.5");

    await globalCommandBus.execute("writer.para.lineSpacing", "3.0");
    assert.equal(p.style.getPropertyValue("--vno-lh"), "3", "Line spacing 3.0 must set --vno-lh to 3");
  });

  await test("Ribbon menu: contains 2.5 and 3.0 in line spacing dropdown", () => {
    const homeTab = WRITER_RIBBON_TABS.find((t) => t.id === "home");
    assert.ok(homeTab, "Home tab must exist");
    const paraGroup = homeTab.groups.find((g) => g.id === "paragraph");
    assert.ok(paraGroup, "Paragraph group must exist");
    const flattenItems = (items) => items.flatMap((i) => (i.items ? [i, ...flattenItems(i.items)] : [i]));
    const allItems = flattenItems(paraGroup.items);
    const spacingDropdown = allItems.find((item) => item.id === "writer.para.lineSpacing");
    assert.ok(spacingDropdown, "writer.para.lineSpacing dropdown must exist");
    const argsList = spacingDropdown.items.map((i) => i.args || i.commandId);
    assert.ok(argsList.includes("2.5"), "Dropdown must contain 2.5");
    assert.ok(argsList.includes("3.0"), "Dropdown must contain 3.0");
  });

  return results;
}
