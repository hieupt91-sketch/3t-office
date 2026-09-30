/**
 * VN Office — Regression Guard: Microsoft Office Shortcut Coverage
 * Tuân thủ AGENTS.md mục 8 (Test truthfulness) & owner rule: phím tắt phải giống Microsoft Office.
 *
 * Bảng baseline này ghi lại TẤT CẢ phím tắt Office chuẩn đã bind trong VN Office tại thời điểm commit.
 * Test CHỈ FAIL nếu một phím tắt đã bind trước đó bị mất (unbound) — coverage chỉ có thể tăng, không giảm.
 * Phím tắt chưa bind được in ra để theo dõi nhưng KHÔNG làm test fail.
 */

import { CommandBus } from "../../platform/commands/command-bus.js";
import { COMMON_COMMANDS, WRITER_COMMANDS, SHEET_COMMANDS, SLIDES_COMMANDS, registerAllStandardCommands } from "../../platform/commands/command-definitions.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";

const OFFICE_SHORTCUTS = {
  writer: [
    { shortcut: "Ctrl+N", action: "New document" },
    { shortcut: "Ctrl+O", action: "Open" },
    { shortcut: "Ctrl+S", action: "Save" },
    { shortcut: "Ctrl+P", action: "Print" },
    { shortcut: "Ctrl+Z", action: "Undo" },
    { shortcut: "Ctrl+Y", action: "Redo" },
    { shortcut: "Ctrl+X", action: "Cut" },
    { shortcut: "Ctrl+C", action: "Copy" },
    { shortcut: "Ctrl+V", action: "Paste" },
    { shortcut: "Ctrl+A", action: "Select All" },
    { shortcut: "Ctrl+F", action: "Find" },
    { shortcut: "Ctrl+H", action: "Replace" },
    { shortcut: "Ctrl+B", action: "Bold" },
    { shortcut: "Ctrl+I", action: "Italic" },
    { shortcut: "Ctrl+U", action: "Underline" },
    { shortcut: "Ctrl+L", action: "Align Left" },
    { shortcut: "Ctrl+E", action: "Align Center" },
    { shortcut: "Ctrl+R", action: "Align Right" },
    { shortcut: "Ctrl+J", action: "Justify" },
    { shortcut: "Ctrl+Shift+>", action: "Grow Font" },
    { shortcut: "Ctrl+Shift+<", action: "Shrink Font" },
    { shortcut: "Ctrl+Enter", action: "Page Break" },
    { shortcut: "Ctrl+M", action: "Indent" },
    { shortcut: "Ctrl+Shift+M", action: "Outdent" },
    { shortcut: "Ctrl+1", action: "Line spacing 1.0" },
    { shortcut: "Ctrl+2", action: "Line spacing 2.0" },
    { shortcut: "Ctrl+5", action: "Line spacing 1.5" },
    { shortcut: "F12", action: "Save As" },
    { shortcut: "F7", action: "Spell check" },
    { shortcut: "Shift+F3", action: "Change case" },
    { shortcut: "Ctrl+K", action: "Hyperlink" },
    { shortcut: "Ctrl+Home", action: "Doc start" },
    { shortcut: "Ctrl+End", action: "Doc end" },
    { shortcut: "Ctrl+]", action: "Grow font (incremental)" },
    { shortcut: "Ctrl+[", action: "Shrink font (incremental)" },
  ],
  sheet: [
    { shortcut: "Ctrl+N", action: "New workbook" },
    { shortcut: "Ctrl+O", action: "Open" },
    { shortcut: "Ctrl+S", action: "Save" },
    { shortcut: "Ctrl+P", action: "Print" },
    { shortcut: "Ctrl+Z", action: "Undo" },
    { shortcut: "Ctrl+Y", action: "Redo" },
    { shortcut: "Ctrl+X", action: "Cut" },
    { shortcut: "Ctrl+C", action: "Copy" },
    { shortcut: "Ctrl+V", action: "Paste" },
    { shortcut: "Ctrl+A", action: "Select All" },
    { shortcut: "Ctrl+F", action: "Find" },
    { shortcut: "Ctrl+H", action: "Replace" },
    { shortcut: "Ctrl+B", action: "Bold" },
    { shortcut: "Ctrl+I", action: "Italic" },
    { shortcut: "Ctrl+U", action: "Underline" },
    { shortcut: "F2", action: "Edit cell" },
    { shortcut: "F4", action: "Repeat last action" },
    { shortcut: "Ctrl+1", action: "Format cells" },
    { shortcut: "Ctrl+;", action: "Insert date" },
    { shortcut: "Ctrl+Shift+;", action: "Insert time" },
    { shortcut: "Ctrl+Shift+L", action: "Filter" },
    { shortcut: "Alt+=", action: "AutoSum" },
    { shortcut: "Ctrl+D", action: "Fill down" },
    { shortcut: "Ctrl+R", action: "Fill right" },
    { shortcut: "Ctrl+Space", action: "Select column" },
    { shortcut: "Shift+Space", action: "Select row" },
    { shortcut: "Ctrl+-", action: "Delete cells/rows/cols" },
    { shortcut: "Ctrl+Shift++", action: "Insert cells/rows/cols" },
    { shortcut: "Ctrl+ArrowUp", action: "Jump to edge (up)" },
    { shortcut: "Ctrl+ArrowDown", action: "Jump to edge (down)" },
    { shortcut: "Ctrl+ArrowLeft", action: "Jump to edge (left)" },
    { shortcut: "Ctrl+ArrowRight", action: "Jump to edge (right)" },
    { shortcut: "Ctrl+PageUp", action: "Previous sheet" },
    { shortcut: "Ctrl+PageDown", action: "Next sheet" },
    { shortcut: "F11", action: "Insert chart" },
    { shortcut: "Shift+F11", action: "Insert new sheet" },
    { shortcut: "Alt+Enter", action: "Newline in cell" },
  ],
  slides: [
    { shortcut: "Ctrl+N", action: "New presentation" },
    { shortcut: "Ctrl+O", action: "Open" },
    { shortcut: "Ctrl+S", action: "Save" },
    { shortcut: "Ctrl+P", action: "Print" },
    { shortcut: "Ctrl+Z", action: "Undo" },
    { shortcut: "Ctrl+Y", action: "Redo" },
    { shortcut: "Ctrl+X", action: "Cut" },
    { shortcut: "Ctrl+C", action: "Copy" },
    { shortcut: "Ctrl+V", action: "Paste" },
    { shortcut: "Ctrl+A", action: "Select All" },
    { shortcut: "Ctrl+F", action: "Find" },
    { shortcut: "Ctrl+H", action: "Replace" },
    { shortcut: "Ctrl+B", action: "Bold" },
    { shortcut: "Ctrl+I", action: "Italic" },
    { shortcut: "Ctrl+U", action: "Underline" },
    { shortcut: "Ctrl+M", action: "New slide" },
    { shortcut: "Ctrl+D", action: "Duplicate slide" },
    { shortcut: "F5", action: "Start from beginning" },
    { shortcut: "Shift+F5", action: "Start from current" },
    { shortcut: "Ctrl+G", action: "Group" },
    { shortcut: "Ctrl+Shift+G", action: "Ungroup" },
    { shortcut: "Ctrl+E", action: "Align center" },
    { shortcut: "Ctrl+L", action: "Align left" },
    { shortcut: "Ctrl+R", action: "Align right" },
    { shortcut: "Ctrl+J", action: "Justify" },
  ],
};

const BASELINE_BOUND = {
  writer: [
    "Ctrl+N", "Ctrl+O", "Ctrl+S", "Ctrl+P", "Ctrl+Z", "Ctrl+Y", "Ctrl+X", "Ctrl+C", "Ctrl+V",
    "Ctrl+A", "Ctrl+F", "Ctrl+H", "Ctrl+B", "Ctrl+I", "Ctrl+U", "Ctrl+L", "Ctrl+E", "Ctrl+R",
    "Ctrl+J", "Ctrl+Shift+>", "Ctrl+Shift+<", "Ctrl+Enter", "Ctrl+M", "Ctrl+Shift+M",
    "Ctrl+1", "Ctrl+2", "Ctrl+5", "F12", "F7", "Shift+F3", "Ctrl+K", "Ctrl+Home", "Ctrl+End",
    "Ctrl+]", "Ctrl+[",
  ],
  sheet: [
    "Ctrl+N", "Ctrl+O", "Ctrl+S", "Ctrl+P", "Ctrl+Z", "Ctrl+Y", "Ctrl+X", "Ctrl+C", "Ctrl+V",
    "Ctrl+A", "Ctrl+F", "Ctrl+H", "Ctrl+B", "Ctrl+I", "Ctrl+U", "F2", "F4", "Ctrl+1",
    "Ctrl+;", "Ctrl+Shift+;", "Ctrl+Shift+L", "Alt+=", "Ctrl+D", "Ctrl+R", "Ctrl+Space",
    "Shift+Space", "Ctrl+ArrowUp", "Ctrl+ArrowDown", "Ctrl+ArrowLeft", "Ctrl+ArrowRight",
    "Ctrl+PageUp", "Ctrl+PageDown", "Alt+Enter",
    "Ctrl+-", "Ctrl+Shift++", "F11", "Shift+F11",
  ],
  slides: [
    "Ctrl+N", "Ctrl+O", "Ctrl+S", "Ctrl+P", "Ctrl+Z", "Ctrl+Y", "Ctrl+X", "Ctrl+C", "Ctrl+V",
    "Ctrl+A", "Ctrl+F", "Ctrl+H", "Ctrl+B", "Ctrl+I", "Ctrl+U", "Ctrl+M", "Ctrl+D",
    "F5", "Shift+F5", "Ctrl+G", "Ctrl+Shift+G", "Ctrl+E", "Ctrl+L", "Ctrl+R", "Ctrl+J",
  ],
};

const DIRECTLY_HANDLED = {
  sheet: {
    "Ctrl+ArrowUp": "sheet-grid.js keydown handler (jump to data edge)",
    "Ctrl+ArrowDown": "sheet-grid.js keydown handler (jump to data edge)",
    "Ctrl+ArrowLeft": "sheet-grid.js keydown handler (jump to data edge)",
    "Ctrl+ArrowRight": "sheet-grid.js keydown handler (jump to data edge)",
    "Ctrl+PageUp": "sheet-grid.js keydown handler (previousSheet)",
    "Ctrl+PageDown": "sheet-grid.js keydown handler (nextSheet)",
    "Alt+Enter": "sheet-grid.js formulaInput keydown handler (newline in cell)",
    "Ctrl+-": "sheet-grid.js keydown handler (delete cells/rows/cols dialog or immediate)",
    "F11": "sheet-grid.js keydown handler (insert chart)",
  },
};

function getBoundShortcutsForScope(scope) {
  const bound = new Map();
  const commands = scope === "writer" ? WRITER_COMMANDS
    : scope === "sheet" ? SHEET_COMMANDS
      : scope === "slides" ? SLIDES_COMMANDS
        : [];
  for (const cmd of [...COMMON_COMMANDS, ...commands]) {
    if (cmd.shortcut) {
      const normalized = globalShortcutManager._normalizeCombo(cmd.shortcut);
      bound.set(normalized, cmd.id);
    }
  }
  return bound;
}

export async function runOfficeShortcutCoverageTests() {
  const results = [];

  try {
    globalShortcutManager._shortcuts.clear();
    globalShortcutManager._scopedShortcuts = new Map([["common", new Map()]]);
    globalShortcutManager.setActiveScope(null);
    registerAllStandardCommands(new CommandBus());

    const scopeMap = { writer: "writer", sheet: "sheet", slides: "slides" };

    for (const [app, shortcuts] of Object.entries(OFFICE_SHORTCUTS)) {
      globalShortcutManager.setActiveScope(scopeMap[app]);
      const bound = getBoundShortcutsForScope(app);

      const boundList = [];
      const missingList = [];

      for (const { shortcut, action } of shortcuts) {
        const normalized = globalShortcutManager._normalizeCombo(shortcut);
        const cmdId = bound.get(normalized);
        const directHandler = DIRECTLY_HANDLED[app]?.[shortcut];
        if (cmdId) {
          boundList.push(`${shortcut} → ${cmdId}`);
        } else if (directHandler) {
          boundList.push(`${shortcut} → ${directHandler}`);
        } else {
          missingList.push(`${shortcut} (${action})`);
        }
      }

      const coverage = boundList.length;
      const total = shortcuts.length;
      const pct = total > 0 ? Math.round((coverage / total) * 100) : 0;

      console.log(`\n  📊 ${app.toUpperCase()}: ${coverage}/${total} (${pct}%)`);
      if (missingList.length > 0) {
        console.log(`    ❌ Chưa bind: ${missingList.join(", ")}`);
      }

      results.push({
        name: `Office Shortcut Coverage — ${app}: ${coverage}/${total} (${pct}%)`,
        pass: true,
      });
    }

    for (const [app, baseline] of Object.entries(BASELINE_BOUND)) {
      globalShortcutManager.setActiveScope(scopeMap[app]);
      const bound = getBoundShortcutsForScope(app);

      const lost = [];
      for (const shortcut of baseline) {
        const normalized = globalShortcutManager._normalizeCombo(shortcut);
        const cmdId = bound.get(normalized);
        const directHandler = DIRECTLY_HANDLED[app]?.[shortcut];
        if (!cmdId && !directHandler) {
          lost.push(shortcut);
        }
      }

      if (lost.length > 0) {
        results.push({
          name: `Office Shortcut Guard — ${app}: ${lost.length} shortcut bị mất`,
          pass: false,
          error: `Các shortcut đã bind trước đó giờ không còn: ${lost.join(", ")}`,
        });
      } else {
        results.push({
          name: `Office Shortcut Guard — ${app}: ${baseline.length} shortcut baseline giữ nguyên`,
          pass: true,
        });
      }
    }

    globalShortcutManager.setActiveScope(null);
  } catch (error) {
    results.push({
      name: "Office Shortcut Coverage — runtime error",
      pass: false,
      error: error.message,
    });
  }

  return results;
}
