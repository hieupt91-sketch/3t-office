import { CommandBus } from "../platform/commands/command-bus.js";
import { COMMON_COMMANDS, WRITER_COMMANDS, SHEET_COMMANDS, SLIDES_COMMANDS, registerAllStandardCommands } from "../platform/commands/command-definitions.js";
import { globalShortcutManager } from "../platform/commands/shortcut-manager.js";

const groups = { common: COMMON_COMMANDS, writer: WRITER_COMMANDS, sheet: SHEET_COMMANDS, slides: SLIDES_COMMANDS };
globalShortcutManager._shortcuts.clear();
globalShortcutManager._scopedShortcuts = new Map([["common", new Map()]]);
globalShortcutManager.setActiveScope(null);
registerAllStandardCommands(new CommandBus());

let failures = 0;
for (const [scope, commands] of Object.entries(groups)) {
  globalShortcutManager.setActiveScope(scope === "common" ? null : scope);
  console.log(`\n[${scope.toUpperCase()}]`);
  for (const command of commands.filter(item => item.shortcut)) {
    const combo = globalShortcutManager._normalizeCombo(command.shortcut);
    const actual = globalShortcutManager._shortcuts.get(combo);
    const ok = actual === command.id;
    if (!ok) failures++;
    console.log(`${ok ? "OK" : "LOST"}\t${command.shortcut}\t${command.id}\t${actual || "<none>"}`);
  }
}
if (failures) {
  console.error(`\n${failures} shortcut bị ghi đè hoặc thất lạc.`);
  process.exitCode = 1;
} else {
  console.log("\nPASS: mọi shortcut còn đúng command trong scope ứng dụng thực tế.");
}
