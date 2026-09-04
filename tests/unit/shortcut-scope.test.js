import { CommandBus } from "../../platform/commands/command-bus.js";
import { COMMON_COMMANDS, WRITER_COMMANDS, SHEET_COMMANDS, SLIDES_COMMANDS, registerAllStandardCommands } from "../../platform/commands/command-definitions.js";
import { globalShortcutManager } from "../../platform/commands/shortcut-manager.js";

export async function runShortcutScopeTests() {
  const results = [];
  try {
    globalShortcutManager._shortcuts.clear();
    globalShortcutManager._scopedShortcuts = new Map([["common", new Map()]]);
    globalShortcutManager.setActiveScope(null);
    registerAllStandardCommands(new CommandBus());
    for (const [scope, commands] of Object.entries({ writer: WRITER_COMMANDS, sheet: SHEET_COMMANDS, slides: SLIDES_COMMANDS })) {
      globalShortcutManager.setActiveScope(scope);
      for (const command of [...COMMON_COMMANDS, ...commands].filter(item => item.shortcut)) {
        const combo = globalShortcutManager._normalizeCombo(command.shortcut);
        if (globalShortcutManager._shortcuts.get(combo) !== command.id) {
          throw new Error(`${scope}: ${command.shortcut} không trỏ tới ${command.id}`);
        }
      }
    }
    results.push({ name: "Shortcut runtime giữ đúng command common + app sau đăng ký toàn suite", pass: true });
  } catch (error) {
    results.push({ name: "Shortcut runtime giữ đúng command common + app sau đăng ký toàn suite", pass: false, error: error.message });
  }
  return results;
}
