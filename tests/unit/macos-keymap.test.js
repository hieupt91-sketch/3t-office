import assert from "node:assert/strict";
import { MACOS_SHORTCUTS, formatShortcutForMac, getMacOSShortcut, isMacOSRuntime, usesPrimaryModifier } from "../../platform/commands/keymap-macos.js";
import { ShortcutManager } from "../../platform/commands/shortcut-manager.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { MACOS_SHORTCUT_HELP_ENTRIES } from "../../platform/help/entries-macos-shortcuts.js";

export async function runMacOSKeymapTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("MAC-14: bảng macOS đủ bảy command và tên Cmd/Option chính xác", () => {
    assert.equal(MACOS_SHORTCUTS.length, 7);
    assert.equal(getMacOSShortcut("writer.style.heading1")?.macos, "Cmd+Option+1");
    assert.equal(getMacOSShortcut("writer.list.bullet")?.macos, "Cmd+Shift+L");
    assert.equal(getMacOSShortcut("sheet.data.filter")?.macos, "Cmd+Shift+L");
    assert.equal(getMacOSShortcut("slides.edit.selectionPane")?.macos, "Option+F10");
    assert.equal(getMacOSShortcut("writer.trackChanges.toggle")?.macos, "Cmd+Shift+E");
    assert.equal(formatShortcutForMac("Ctrl+Alt+3"), "Cmd+Option+3");
  });

  await test("MAC-14: nhận diện Mac và primary modifier không làm mất Ctrl Windows", () => {
    assert.equal(isMacOSRuntime({ platform: "MacIntel" }), true);
    assert.equal(isMacOSRuntime({ userAgentData: { platform: "macOS" } }), true);
    assert.equal(isMacOSRuntime({ platform: "Win32" }), false);
    assert.equal(usesPrimaryModifier({ metaKey: true, ctrlKey: false }), true);
    assert.equal(usesPrimaryModifier({ metaKey: false, ctrlKey: true }), true);
  });

  await test("MAC-14: Cmd chạy đúng command theo scope Writer/Sheet/Slides", async () => {
    const manager = new ShortcutManager();
    const calls = [];
    const originalExecute = globalCommandBus.execute;
    globalCommandBus.execute = (commandId) => { calls.push(commandId); return true; };
    const target = { tagName: "DIV", isContentEditable: false, closest: () => null, matches: () => false };
    const press = (key, modifiers = {}) => manager._handleKeyDown({
      key, target, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
      preventDefault() {}, stopPropagation() {}, ...modifiers
    });
    try {
      manager.bind("Ctrl+Alt+1", "writer.style.heading1", "writer");
      manager.bind("Ctrl+Shift+L", "writer.list.bullet", "writer");
      manager.bind("Ctrl+Shift+L", "sheet.data.filter", "sheet");
      manager.bind("Alt+F10", "slides.edit.selectionPane", "slides");
      manager.bind("Ctrl+Shift+E", "writer.trackChanges.toggle", "writer");

      manager.setActiveScope("writer");
      press("1", { metaKey: true, altKey: true });
      press("l", { metaKey: true, shiftKey: true });
      press("e", { metaKey: true, shiftKey: true });
      manager.setActiveScope("sheet");
      press("l", { metaKey: true, shiftKey: true });
      manager.setActiveScope("slides");
      press("F10", { altKey: true });
      assert.deepEqual(calls, [
        "writer.style.heading1", "writer.list.bullet", "writer.trackChanges.toggle",
        "sheet.data.filter", "slides.edit.selectionPane"
      ]);
    } finally {
      globalCommandBus.execute = originalExecute;
    }
  });

  await test("MAC-14: Ctrl trên Windows vẫn khớp command cũ", () => {
    const manager = new ShortcutManager();
    manager.bind("Ctrl+Shift+E", "writer.trackChanges.toggle", "writer");
    manager.setActiveScope("writer");
    assert.equal(manager._shortcuts.get(manager._normalizeCombo("Ctrl+Shift+E")), "writer.trackChanges.toggle");
  });

  await test("MAC-14: Help VI hướng dẫn đủ Doc, Sheet, Slide và Fn+F10", () => {
    const source = JSON.stringify(MACOS_SHORTCUT_HELP_ENTRIES);
    for (const token of ["Cmd+Option+1", "Cmd+Shift+L", "Cmd+Shift+E", "Option+F10", "Doc", "Sheet", "Slide", "Fn"]) {
      assert.match(source, new RegExp(token.replaceAll("+", "\\+"), "i"), `Help thiếu ${token}`);
    }
  });

  return results;
}
