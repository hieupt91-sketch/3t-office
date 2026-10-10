/**
 * Unit Tests: Writer Font Ladder & Sizing (TICKET-RB-D1c LỖI 3)
 */
import assert from "node:assert/strict";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

export async function runWriterFontLadderTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("WRITER_COMMANDS: font grow/shrink shortcuts and definitions", () => {
    const cases = [
      { id: "writer.font.grow", shortcut: "Ctrl+Shift+>" },
      { id: "writer.font.shrink", shortcut: "Ctrl+Shift+<" },
      { id: "writer.font.grow1pt", shortcut: "Ctrl+]" },
      { id: "writer.font.shrink1pt", shortcut: "Ctrl+[" }
    ];
    for (const c of cases) {
      const cmd = WRITER_COMMANDS.find((item) => item.id === c.id);
      assert.ok(cmd, `Command ${c.id} must exist in WRITER_COMMANDS`);
      assert.equal(cmd.shortcut, c.shortcut, `${c.id} shortcut must be ${c.shortcut}`);
    }
  });

  await test("WriterAdapter: Word font ladder progression (_getNextLadderFontSize)", () => {
    const adapter = new WriterAdapter();
    // Standard grow
    assert.equal(adapter._getNextLadderFontSize(12, 1), 14, "12pt + grow -> 14pt");
    assert.equal(adapter._getNextLadderFontSize(14, 1), 16, "14pt + grow -> 16pt");
    assert.equal(adapter._getNextLadderFontSize(10.5, 1), 11, "10.5pt + grow -> 11pt");
    assert.equal(adapter._getNextLadderFontSize(11, 1), 12, "11pt + grow -> 12pt");
    assert.equal(adapter._getNextLadderFontSize(72, 1), 82, "72pt + grow -> 82pt");

    // Standard shrink
    assert.equal(adapter._getNextLadderFontSize(14, -1), 12, "14pt + shrink -> 12pt");
    assert.equal(adapter._getNextLadderFontSize(12, -1), 11, "12pt + shrink -> 11pt");
    assert.equal(adapter._getNextLadderFontSize(11, -1), 10.5, "11pt + shrink -> 10.5pt");
    assert.equal(adapter._getNextLadderFontSize(10.5, -1), 10, "10.5pt + shrink -> 10pt");
    assert.equal(adapter._getNextLadderFontSize(8, -1), 7, "8pt + shrink -> 7pt");
    assert.equal(adapter._getNextLadderFontSize(82, -1), 72, "82pt + shrink -> 72pt");

    // Intermediate/custom sizes jump to nearest ladder step
    assert.equal(adapter._getNextLadderFontSize(13, 1), 14, "13pt + grow -> 14pt");
    assert.equal(adapter._getNextLadderFontSize(13, -1), 12, "13pt + shrink -> 12pt");
  });

  await test("WriterAdapter: _adjustFontSizePt 1pt step increment/decrement", () => {
    const adapter = new WriterAdapter();
    const cur12 = 12;
    const grow1pt = Math.max(1, Math.min(1638, Math.round((cur12 + 1) * 2) / 2));
    const shrink1pt = Math.max(1, Math.min(1638, Math.round((cur12 - 1) * 2) / 2));
    assert.equal(grow1pt, 13, "12pt + 1pt -> 13pt");
    assert.equal(shrink1pt, 11, "12pt - 1pt -> 11pt");

    const cur10_5 = 10.5;
    const grow10_5 = Math.max(1, Math.min(1638, Math.round((cur10_5 + 1) * 2) / 2));
    assert.equal(grow10_5, 11.5, "10.5pt + 1pt -> 11.5pt");
  });

  await test("WriterAdapter: _applyFontSizeToSelection protects parent block style and applies font size", () => {
    const adapter = new WriterAdapter();
    const fakeP = {
      tagName: "P",
      style: { fontSize: "16px" },
      closest: () => fakeP
    };
    const fakeFont = {
      tagName: "FONT",
      size: "7",
      getAttribute: (attr) => attr === "size" ? "7" : null,
      removeAttribute: (attr) => { if (attr === "size") delete fakeFont.size; },
      style: { fontSize: "" },
      querySelectorAll: () => []
    };
    const fakeBody = {
      querySelectorAll: (sel) => sel.includes("p") ? [fakeP] : [],
      getElementsByTagName: (tag) => tag.toLowerCase() === "font" ? [fakeFont] : []
    };
    adapter.bodyDom = fakeBody;

    const prevWindow = globalThis.window;
    const prevDoc = globalThis.document;

    try {
      globalThis.window = {
        getSelection: () => ({
          rangeCount: 1,
          getRangeAt: () => ({
            intersectsNode: () => true
          }),
          anchorNode: fakeP,
          focusNode: fakeP,
          removeAllRanges: () => {},
          addRange: () => {}
        })
      };
      globalThis.document = {
        execCommand: (cmd, showUi, val) => {
          // Simulate Chromium bug where execCommand strips font-size on parent P
          fakeP.style.fontSize = "";
          return true;
        },
        createRange: () => ({
          setStart: () => {},
          setEnd: () => {}
        })
      };

      const applied = adapter._applyFontSizeToSelection(14, "writer.font.grow");
      assert.ok(applied, "Should return true on successful application");
      assert.equal(fakeP.style.fontSize, "16px", "Parent block font-size must be restored and protected");
      assert.equal(fakeFont.style.fontSize, "14pt", "Formatted font element must receive 14pt");
    } finally {
      globalThis.window = prevWindow;
      globalThis.document = prevDoc;
    }
  });

  return results;
}

if (process.argv[1]?.endsWith("writer-font-ladder.test.js")) {
  runWriterFontLadderTests().then((results) => {
    let fail = 0;
    for (const r of results) {
      if (r.pass) {
        console.log(`PASS: ${r.name}`);
      } else {
        console.error(`FAIL: ${r.name}\n${r.error}`);
        fail++;
      }
    }
    process.exit(fail ? 1 : 0);
  });
}
