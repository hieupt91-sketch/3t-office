/**
 * Unit Tests: Writer Heading Styles & Shortcuts (TICKET-RB-D1c LỖI 2)
 */
import assert from "node:assert/strict";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";

export async function runWriterHeadingShortcutsTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("WRITER_COMMANDS: heading1, heading2, heading3 defined with Ctrl+Alt+1/2/3", () => {
    const cases = [
      { id: "writer.style.heading1", shortcut: "Ctrl+Alt+1" },
      { id: "writer.style.heading2", shortcut: "Ctrl+Alt+2" },
      { id: "writer.style.heading3", shortcut: "Ctrl+Alt+3" },
      { id: "writer.style.normal", shortcut: "Ctrl+Shift+N" }
    ];
    for (const c of cases) {
      const cmd = WRITER_COMMANDS.find((item) => item.id === c.id);
      assert.ok(cmd, `Command ${c.id} must exist in WRITER_COMMANDS`);
      assert.equal(cmd.shortcut, c.shortcut, `${c.id} shortcut must be ${c.shortcut}`);
      assert.ok(viStrings.commands[c.id]?.label, `VI label missing for ${c.id}`);
      assert.ok(enStrings.commands[c.id]?.label, `EN label missing for ${c.id}`);
    }
  });

  await test("ShortcutManager: registers Ctrl+Alt+1/2/3 in writer scope", () => {
    registerAllStandardCommands(globalCommandBus);
    globalShortcutManager.setActiveScope("writer");
    const h1 = globalShortcutManager._shortcuts.get(globalShortcutManager._normalizeCombo("Ctrl+Alt+1"));
    const h2 = globalShortcutManager._shortcuts.get(globalShortcutManager._normalizeCombo("Ctrl+Alt+2"));
    const h3 = globalShortcutManager._shortcuts.get(globalShortcutManager._normalizeCombo("Ctrl+Alt+3"));
    const normal = globalShortcutManager._shortcuts.get(globalShortcutManager._normalizeCombo("Ctrl+Shift+N"));

    assert.equal(h1, "writer.style.heading1", "Ctrl+Alt+1 must map to writer.style.heading1");
    assert.equal(h2, "writer.style.heading2", "Ctrl+Alt+2 must map to writer.style.heading2");
    assert.equal(h3, "writer.style.heading3", "Ctrl+Alt+3 must map to writer.style.heading3");
    assert.equal(normal, "writer.style.normal", "Ctrl+Shift+N must map to writer.style.normal");
  });

  await test("WriterAdapter: transforms paragraph block tag and preserves block ID", () => {
    let currentTag = "p";
    const block = {
      tagName: "P",
      id: "test-target-p",
      innerHTML: "Sample paragraph text",
      className: "",
      classList: {
        remove() {},
        add() {}
      },
      style: {
        removeProperty() {}
      }
    };
    block.parentNode = {
      replaceChild(newChild, oldChild) {
        if (oldChild === block) {
          currentTag = newChild.tagName.toLowerCase();
          block.tagName = newChild.tagName;
          block.id = newChild.id;
        }
      }
    };
    const body = {
      children: [block],
      firstElementChild: block,
      contains: () => true
    };
    const adapter = new WriterAdapter({
      querySelector: () => body,
      innerHTML: ""
    });
    adapter.bodyDom = body;
    adapter.flushTyping = () => {};
    adapter.recordSnapshot = () => {};
    adapter._syncActiveStyleUI = () => {};

    // Mock document & window
    const origDoc = globalThis.document;
    const origWin = globalThis.window;
    globalThis.window = { getSelection: () => null };
    globalThis.document = {
      createElement(tag) {
        return {
          tagName: tag.toUpperCase(),
          innerHTML: "",
          className: "",
          classList: { remove() {}, add() {} },
          style: { removeProperty() {} }
        };
      },
      execCommand() {}
    };

    try {
      adapter._applyParagraphStyle("h1");
      assert.equal(currentTag, "h1", "Block tag must change to h1");
      assert.equal(block.id, "test-target-p", "Block ID must be preserved");

      adapter._applyParagraphStyle("normal");
      assert.equal(currentTag, "p", "Block tag must revert to p on Normal");
      assert.equal(block.id, "test-target-p", "Block ID must be preserved on Normal");
    } finally {
      globalThis.document = origDoc;
      globalThis.window = origWin;
    }
  });

  await test("Help entries: writer.style.galleryAndNormal includes heading1/2/3", () => {
    const entry = WRITER_HELP_ENTRIES.find((item) => item.id === "writer.style.galleryAndNormal");
    assert.ok(entry, "Help entry writer.style.galleryAndNormal must exist");
    assert.ok(entry.commandIds.includes("writer.style.heading1"), "Must include writer.style.heading1");
    assert.ok(entry.commandIds.includes("writer.style.heading2"), "Must include writer.style.heading2");
    assert.ok(entry.commandIds.includes("writer.style.heading3"), "Must include writer.style.heading3");
  });

  return results;
}
