// Do do phu Huong dan: lenh nao CHUA co bai Tro giup (commandIds) trong Doc/Sheet/Slide.
// Chay: node scripts/perf-proto/help-coverage-report.mjs > bang.md   (chi doc, khong sua gi)
import { COMMON_COMMANDS, WRITER_COMMANDS, SHEET_COMMANDS, SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { HELP_ENTRIES } from "../../platform/help/help-catalog.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";
import { SLIDES_HELP_ENTRIES } from "../../platform/help/entries-slides.js";

const apps = [["writer", "Doc", WRITER_COMMANDS], ["sheet", "Sheet", SHEET_COMMANDS], ["slides", "Slide", SLIDES_COMMANDS]];
const allEntries = [...HELP_ENTRIES, ...SHEET_HELP_ENTRIES, ...SLIDES_HELP_ENTRIES];
const covered = (app) => {
  const ids = new Set();
  for (const entry of allEntries) {
    if (entry.app !== app && entry.app !== "common") continue;
    for (const id of entry.commandIds || []) ids.add(id);
  }
  return ids;
};

console.log("# Do phu Huong dan theo lenh (tu lenh that)\n");
for (const [app, label, commands] of apps) {
  const have = covered(app);
  const list = [...COMMON_COMMANDS, ...commands];
  const missing = list.filter((command) => !have.has(command.id));
  console.log(`## ${label}: ${list.length - missing.length}/${list.length} lenh co bai (thieu ${missing.length})\n`);
  const byCategory = new Map();
  for (const command of missing) {
    const key = command.category || "khac";
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(`${command.id} (${command.label || ""})`);
  }
  for (const [category, items] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`- **${category}** (${items.length}): ${items.slice(0, 12).join("; ")}${items.length > 12 ? "; ..." : ""}`);
  }
  console.log("");
}
console.log(`Tong so bai Huong dan: ${allEntries.length}`);
