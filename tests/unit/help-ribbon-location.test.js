/**
 * VN Office — Unit Tests: Help ⇄ Ribbon location consistency (Help Ribbon Location Guard)
 *
 * Sau đợt tổ chức lại ribbon (các file apps/&lt;app&gt;/&lt;app&gt;-ribbon.js), mỗi bài Hướng dẫn sử dụng có:
 *   - commandIds: các lệnh gắn với bài (để tra cứu/deep-link).
 *   - ribbon: { tab, tabId, group }: vị trí hiển thị trong panel Trợ giúp.
 *
 * Bài kiểm tra này đảm bảo:
 *   1. Mọi commandId của bài Help đều là lệnh THẬT của app đó (tồn tại trong
 *      command registry: COMMON_COMMANDS + lệnh app) — không còn tham chiếu chết.
 *   2. Với mỗi commandId cóắn trên ribbon (nút hoặc dialog-launcher), vị trí tab/nhóm
 *      của bài phải khớp ít nhất một vị trí thật của lệnh trên ribbon hiện tại.
 *      Nhãn tab/nhóm so sánh theo tiếng Việt từ platform/i18n/strings-vi.js
 *      (giống runtime applyLocaleToTabs: labelKey → dịch, fallback nhãn hard-code).
 *
 * Lệnh chỉ tồn tại ở Backstage/bàn phím (không nằm trên ribbon) vẫn hợp lệ —
 * chúng là lệnh thật của command registry, bài Help chỉ không thể chỉ vị trí ribbon.
 */

import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";
import { SLIDES_HELP_ENTRIES } from "../../platform/help/entries-slides.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import {
  COMMON_COMMANDS,
  WRITER_COMMANDS,
  SHEET_COMMANDS,
  SLIDES_COMMANDS
} from "../../platform/commands/command-definitions.js";

/** Tra cứu chuỗi theo khóa chấm trong strings-vi — mirror hàm t() của platform/i18n/i18n.js */
function tVi(key) {
  let val = viStrings;
  for (const part of key.split(".")) {
    if (val && typeof val === "object" && part in val) {
      val = val[part];
    } else {
      return undefined;
    }
  }
  return typeof val === "string" ? val : undefined;
}

/** Nhãn runtime của tab/nhóm: dịch qua labelKey, fallback về nhãn hard-code trong ribbon */
function resolveLabel(label, labelKey) {
  if (labelKey) {
    const translated = tVi(labelKey);
    if (translated) return translated;
  }
  return label;
}

/**
 * Dựng bảng vị trí lệnh trên ribbon: commandId -> [{ tabId, tabLabel, groupId, groupLabel }]
 * Gồm cả dialog-launcher (launcherCommandId) vì launcher là một phần của nhóm ribbon.
 */
function buildRibbonCommandIndex(tabs) {
  const index = new Map();
  const add = (commandId, location) => {
    if (!index.has(commandId)) index.set(commandId, []);
    index.get(commandId).push(location);
  };
  for (const tab of tabs) {
    const tabLabel = resolveLabel(tab.label, tab.labelKey);
    for (const group of tab.groups || []) {
      const groupLabel = resolveLabel(group.label, group.labelKey);
      const location = { tabId: tab.id, tabLabel, groupId: group.id, groupLabel };
      if (group.launcherCommandId) add(group.launcherCommandId, location);
      const walk = (items) => {
        for (const item of items || []) {
          if (item.commandId) add(item.commandId, location);
          if (item.items) walk(item.items);
        }
      };
      walk(group.items);
    }
  }
  return index;
}

const APPS = [
  { app: "writer", entries: WRITER_HELP_ENTRIES, tabs: WRITER_RIBBON_TABS, commands: [...COMMON_COMMANDS, ...WRITER_COMMANDS] },
  { app: "sheet", entries: SHEET_HELP_ENTRIES, tabs: SHEET_RIBBON_TABS, commands: [...COMMON_COMMANDS, ...SHEET_COMMANDS] },
  { app: "slides", entries: SLIDES_HELP_ENTRIES, tabs: SLIDES_RIBBON_TABS, commands: [...COMMON_COMMANDS, ...SLIDES_COMMANDS] }
];

function collectEntryProblems(entry, commandRegistry, ribbonIndex) {
  const problems = [];
  const commandIds = Array.isArray(entry.commandIds) ? entry.commandIds : [];
  if (commandIds.length === 0) return problems;

  const mounted = [];
  for (const commandId of commandIds) {
    if (!commandRegistry.has(commandId)) {
      problems.push(`commandId "${commandId}" không tồn tại trong command registry của ${entry.app} (tham chiếu chết)`);
      continue;
    }
    const locations = ribbonIndex.get(commandId);
    if (locations && locations.length > 0) mounted.push({ commandId, locations });
  }

  if (mounted.length > 0) {
    const ribbon = entry.ribbon || {};
    const matches = mounted.some(({ locations }) =>
      locations.some((loc) =>
        loc.tabId === ribbon.tabId &&
        loc.tabLabel === ribbon.tab &&
        loc.groupLabel === ribbon.group
      )
    );
    if (!matches) {
      const actual = mounted
        .flatMap(({ commandId, locations }) => locations.map((loc) => `${commandId} → ${loc.tabLabel} > ${loc.groupLabel}`))
        .join("; ");
      problems.push(
        `vị trí ribbon (${ribbon.tab} | ${ribbon.tabId} | ${ribbon.group}) không khớp vị trí thật của lệnh: ${actual}`
      );
    }
  }
  return problems;
}

export async function runHelpRibbonLocationTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  for (const { app, entries, tabs, commands } of APPS) {
    const commandRegistry = new Set(commands.map((cmd) => cmd.id));
    const ribbonIndex = buildRibbonCommandIndex(tabs);

    await test(`Help Ribbon Location: mọi commandId bài Help ${app} là lệnh thật và vị trí tab/nhóm khớp ribbon hiện tại`, () => {
      const problems = [];
      let checked = 0;
      for (const entry of entries) {
        const entryProblems = collectEntryProblems(entry, commandRegistry, ribbonIndex);
        checked += (entry.commandIds || []).length;
        for (const problem of entryProblems) {
          problems.push(`[${entry.id}] ${problem}`);
        }
      }
      if (problems.length > 0) {
        throw new Error(`Phát hiện ${problems.length} bất đồng bộ trên ${checked} commandId đã quét:\n  - ${problems.join("\n  - ")}`);
      }
    });
  }

  return results;
}
