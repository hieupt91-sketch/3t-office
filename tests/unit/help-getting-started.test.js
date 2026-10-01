/**
 * VN Office — Unit Tests: Getting Started Help entries (Vietnamese)
 * Validates ribbon locations and shortcuts for 3 new entries per app.
 */

import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import {
  COMMON_COMMANDS,
  WRITER_COMMANDS,
  SHEET_COMMANDS,
  SLIDES_COMMANDS
} from "../../platform/commands/command-definitions.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";

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

/** Dựng bảng vị trí lệnh trên ribbon: commandId -> [{ tabId, tabLabel, groupId, groupLabel }] */
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

/** Kiểm tra vị trí ribbon của entry khớp với ribbon definition */
function checkRibbonLocation(entry, ribbonIndex) {
  const ribbon = entry.ribbon || {};
  const commandIds = Array.isArray(entry.commandIds) ? entry.commandIds : [];
  const mounted = [];
  for (const commandId of commandIds) {
    const locations = ribbonIndex.get(commandId);
    if (locations && locations.length > 0) mounted.push({ commandId, locations });
  }
  if (mounted.length === 0) {
    // Commands không có trên ribbon (chỉ bàn phím/Backstage) - vẫn hợp lệ
    return [];
  }
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
    return [`[${entry.id}] vị trí ribbon (${ribbon.tab} | ${ribbon.tabId} | ${ribbon.group}) không khớp vị trí thật của lệnh: ${actual}`];
  }
  return [];
}

/** Chuẩn hóa shortcut để so sánh */
function normalizeShortcut(raw) {
  return raw
    .replace(/\s+/g, "")
    .replace(/↑/g, "Up")
    .replace(/↓/g, "Down")
    .replace(/←/g, "Left")
    .replace(/→/g, "Right");
}

/** Xây dựng tập shortcut thật của app từ command-definitions.js */
function buildDefinedShortcutSet(app) {
  const ALL_COMMANDS = [...COMMON_COMMANDS, ...WRITER_COMMANDS, ...SHEET_COMMANDS, ...SLIDES_COMMANDS];
  const set = new Set();
  for (const cmd of ALL_COMMANDS) {
    const isAppCmd = cmd.id.startsWith(`${app}.`) || !/^(writer|sheet|slides)\./.test(cmd.id);
    if (isAppCmd && cmd.shortcut) set.add(normalizeShortcut(cmd.shortcut));
  }
  // App-level bindings từ SHORTCUT-COVERAGE.md
  if (app === "sheet") {
    set.add(normalizeShortcut("Shift+F2")); // sheet.review.commentInsert
  }
  if (app === "slides") {
    set.add(normalizeShortcut("Ctrl+Enter")); // slides.review.commentInsert
  }
  // Common-level binding
  if (ALL_COMMANDS.some((cmd) => cmd.id === "common.file.saveAs")) {
    set.add(normalizeShortcut("Ctrl+Shift+S"));
  }
  return set;
}

/** Trích xuất shortcut token từ text steps */
function extractShortcutTokens(text) {
  const tokens = [];
  // Pattern: Ctrl+..., Shift+..., Alt+..., F1-F12, Page Up/Down
  // Allow special keys like = + as final key (e.g., Ctrl+Shift+=, Ctrl+Shift++)
  // Handle Ctrl+Shift+; (insert time) specially in cleaning step
  const comboRe = /(?:Ctrl|Shift|Alt|Meta|Win)(?:\s*\+\s*(?:Ctrl|Shift|Alt|Meta|Win))*\s*\+\s*(?:[^\s,.)\]}»:/]+|[=+])/gi;
  const fkeyRe = /F(?:[1-9]|1[0-2])\b/g;
  const pageRe = /Page\s*(?:Up|Down)/gi;
  const cleaned = text
    .replace(/không(?:\s+(?:có|phải|dùng|bằng|bấm|nhấn|phím|tổ hợp))*\s*((?:Ctrl|Shift|Alt|Meta|Win)\s*\+\s*[^\s,;.)\]}»]+|F(?:[1-9]|1[0-2])|Page\s*(?:Up|Down))/gi, "")
    .replace(/Alt\+Shift\+↑\/↓/g, "Alt+Shift+Up Alt+Shift+Down")
    .replace(/Ctrl\+Shift\+\>\/</g, "Ctrl+Shift+> Ctrl+Shift+<")
    .replace(/Ctrl\+\]\/\[/g, "Ctrl+] Ctrl+[")
    .replace(/Ctrl\+\+\/-/g, "Ctrl++ Ctrl+-")
    // Handle Ctrl+Shift+; (sheet.insert.time) - protect the semicolon from being treated as punctuation
    .replace(/Ctrl\+Shift\+;/g, "Ctrl+Shift+;")
    // Remove trailing semicolon from shortcuts like "Ctrl+1;" (Vietnamese punctuation)
    .replace(/\b(Ctrl|Shift|Alt|Meta|Win)(?:\s*\+\s*(?:Ctrl|Shift|Alt|Meta|Win))*\s*\+\s*\w+;/g, (m) => m.slice(0, -1));
  // First, collect all combo matches and remember their positions
  const comboMatches = [...cleaned.matchAll(comboRe)];
  for (const m of comboMatches) tokens.push(m[0]);
  // For function keys, only add those NOT already part of a combo match
  for (const m of cleaned.matchAll(fkeyRe)) {
    const fkeyPos = m.index;
    const fkeyText = m[0];
    const isPartOfCombo = comboMatches.some(cm => {
      const comboStart = cm.index;
      const comboEnd = comboStart + cm[0].length;
      return fkeyPos >= comboStart && fkeyPos < comboEnd;
    });
    if (!isPartOfCombo) tokens.push(fkeyText);
  }
  for (const m of cleaned.matchAll(pageRe)) tokens.push(m[0]);
  return tokens.map(t => normalizeShortcut(t));
}

/** Kiểm tra shortcuts trong steps */
function checkShortcuts(entry, definedShortcuts) {
  const problems = [];
  const fullText = [entry.summary, ...(entry.steps || [])].filter(Boolean).join(" ");
  const tokens = extractShortcutTokens(fullText);
  for (const token of tokens) {
    if (!definedShortcuts.has(token)) {
      problems.push(`[${entry.id}] nhắc shortcut "${token}" trong steps/summary nhưng không được định nghĩa cho ${entry.app} (command-definitions.js + app binds)`);
    }
  }
  return problems;
}

export async function runHelpGettingStartedTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  // --- Writer tests ---
  await test("Help Writer Getting Started: entry writer.gettingStarted tồn tại và ribbon location khớp", async () => {
    const { WRITER_HELP_ENTRIES } = await import("../../platform/help/entries-writer.js");
    const entry = WRITER_HELP_ENTRIES.find(e => e.id === "writer.gettingStarted");
    if (!entry) throw new Error("Thiếu entry writer.gettingStarted");
    const ribbonIndex = buildRibbonCommandIndex(WRITER_RIBBON_TABS);
    const problems = checkRibbonLocation(entry, ribbonIndex);
    if (problems.length > 0) throw new Error(problems.join("\n"));
  });

  await test("Help Writer Shortcuts: entry writer.shortcuts tồn tại và shortcuts hợp lệ", async () => {
    const { WRITER_HELP_ENTRIES } = await import("../../platform/help/entries-writer.js");
    const entry = WRITER_HELP_ENTRIES.find(e => e.id === "writer.shortcuts");
    if (!entry) throw new Error("Thiếu entry writer.shortcuts");
    const ribbonIndex = buildRibbonCommandIndex(WRITER_RIBBON_TABS);
    const problems = checkRibbonLocation(entry, ribbonIndex);
    if (problems.length > 0) throw new Error(problems.join("\n"));
    const definedShortcuts = buildDefinedShortcutSet("writer");
    const shortcutProblems = checkShortcuts(entry, definedShortcuts);
    if (shortcutProblems.length > 0) throw new Error(shortcutProblems.join("\n"));
  });

  await test("Help Writer Differences: entry writer.differences tồn tại và ribbon location khớp", async () => {
    const { WRITER_HELP_ENTRIES } = await import("../../platform/help/entries-writer.js");
    const entry = WRITER_HELP_ENTRIES.find(e => e.id === "writer.differences");
    if (!entry) throw new Error("Thiếu entry writer.differences");
    const ribbonIndex = buildRibbonCommandIndex(WRITER_RIBBON_TABS);
    const problems = checkRibbonLocation(entry, ribbonIndex);
    if (problems.length > 0) throw new Error(problems.join("\n"));
  });

  // --- Sheet tests ---
  await test("Help Sheet Getting Started: entry sheet.gettingStarted tồn tại và ribbon location khớp", async () => {
    const { SHEET_HELP_ENTRIES } = await import("../../platform/help/entries-sheet.js");
    const entry = SHEET_HELP_ENTRIES.find(e => e.id === "sheet.gettingStarted");
    if (!entry) throw new Error("Thiếu entry sheet.gettingStarted");
    const ribbonIndex = buildRibbonCommandIndex(SHEET_RIBBON_TABS);
    const problems = checkRibbonLocation(entry, ribbonIndex);
    if (problems.length > 0) throw new Error(problems.join("\n"));
  });

  await test("Help Sheet Shortcuts: entry sheet.shortcuts tồn tại và shortcuts hợp lệ", async () => {
    const { SHEET_HELP_ENTRIES } = await import("../../platform/help/entries-sheet.js");
    const entry = SHEET_HELP_ENTRIES.find(e => e.id === "sheet.shortcuts");
    if (!entry) throw new Error("Thiếu entry sheet.shortcuts");
    const ribbonIndex = buildRibbonCommandIndex(SHEET_RIBBON_TABS);
    const problems = checkRibbonLocation(entry, ribbonIndex);
    if (problems.length > 0) throw new Error(problems.join("\n"));
    const definedShortcuts = buildDefinedShortcutSet("sheet");
    const shortcutProblems = checkShortcuts(entry, definedShortcuts);
    if (shortcutProblems.length > 0) throw new Error(shortcutProblems.join("\n"));
  });

  await test("Help Sheet Differences: entry sheet.differences tồn tại và ribbon location khớp", async () => {
    const { SHEET_HELP_ENTRIES } = await import("../../platform/help/entries-sheet.js");
    const entry = SHEET_HELP_ENTRIES.find(e => e.id === "sheet.differences");
    if (!entry) throw new Error("Thiếu entry sheet.differences");
    const ribbonIndex = buildRibbonCommandIndex(SHEET_RIBBON_TABS);
    const problems = checkRibbonLocation(entry, ribbonIndex);
    if (problems.length > 0) throw new Error(problems.join("\n"));
  });

  // --- Slides tests ---
  await test("Help Slides Getting Started: entry slides.gettingStarted tồn tại và ribbon location khớp", async () => {
    const { SLIDES_HELP_ENTRIES } = await import("../../platform/help/entries-slides.js");
    const entry = SLIDES_HELP_ENTRIES.find(e => e.id === "slides.gettingStarted");
    if (!entry) throw new Error("Thiếu entry slides.gettingStarted");
    const ribbonIndex = buildRibbonCommandIndex(SLIDES_RIBBON_TABS);
    const problems = checkRibbonLocation(entry, ribbonIndex);
    if (problems.length > 0) throw new Error(problems.join("\n"));
  });

  await test("Help Slides Shortcuts: entry slides.shortcuts tồn tại và shortcuts hợp lệ", async () => {
    const { SLIDES_HELP_ENTRIES } = await import("../../platform/help/entries-slides.js");
    const entry = SLIDES_HELP_ENTRIES.find(e => e.id === "slides.shortcuts");
    if (!entry) throw new Error("Thiếu entry slides.shortcuts");
    const ribbonIndex = buildRibbonCommandIndex(SLIDES_RIBBON_TABS);
    const problems = checkRibbonLocation(entry, ribbonIndex);
    if (problems.length > 0) throw new Error(problems.join("\n"));
    const definedShortcuts = buildDefinedShortcutSet("slides");
    const shortcutProblems = checkShortcuts(entry, definedShortcuts);
    if (shortcutProblems.length > 0) throw new Error(shortcutProblems.join("\n"));
  });

  await test("Help Slides Differences: entry slides.differences tồn tại và ribbon location khớp", async () => {
    const { SLIDES_HELP_ENTRIES } = await import("../../platform/help/entries-slides.js");
    const entry = SLIDES_HELP_ENTRIES.find(e => e.id === "slides.differences");
    if (!entry) throw new Error("Thiếu entry slides.differences");
    const ribbonIndex = buildRibbonCommandIndex(SLIDES_RIBBON_TABS);
    const problems = checkRibbonLocation(entry, ribbonIndex);
    if (problems.length > 0) throw new Error(problems.join("\n"));
  });

  // --- Verify names: no old product names ---
  await test("Help entries: không dùng tên cũ (VN Writer/VN Sheet/VN Slides/VN Office) và không gọi sản phẩm của chúng ta là Word/Excel/PowerPoint", async () => {
    const { WRITER_HELP_ENTRIES } = await import("../../platform/help/entries-writer.js");
    const { SHEET_HELP_ENTRIES } = await import("../../platform/help/entries-sheet.js");
    const { SLIDES_HELP_ENTRIES } = await import("../../platform/help/entries-slides.js");
    // Forbid old VN product names; forbid calling OUR product Word/Excel/PowerPoint
    // Allow "Microsoft Office/WPS" as factual reference to print engine
    const bannedOldVN = /\b(VN Writer|VN Sheet|VN Slides|VN Office)\b/i;
    const bannedOurProductAsMS = /\b(3T (Doc|Sheet|Slide|Office)\s+(là|gọi là|được gọi là)\s+(Word|Excel|PowerPoint)|(Word|Excel|PowerPoint)\s+là\s+(3T (Doc|Sheet|Slide|Office)))\b/i;
    const newEntries = [
      ...WRITER_HELP_ENTRIES.filter(e => ["writer.gettingStarted", "writer.shortcuts", "writer.differences"].includes(e.id)),
      ...SHEET_HELP_ENTRIES.filter(e => ["sheet.gettingStarted", "sheet.shortcuts", "sheet.differences"].includes(e.id)),
      ...SLIDES_HELP_ENTRIES.filter(e => ["slides.gettingStarted", "slides.shortcuts", "slides.differences"].includes(e.id))
    ];
    for (const entry of newEntries) {
      const blob = [entry.title, entry.summary, ...entry.steps].join(" ");
      if (bannedOldVN.test(blob)) {
        throw new Error(`[${entry.id}] chứa tên VN cũ cấm: ${blob.match(bannedOldVN)[0]}`);
      }
      if (bannedOurProductAsMS.test(blob)) {
        throw new Error(`[${entry.id}] gọi sản phẩm 3T là Word/Excel/PowerPoint: ${blob.match(bannedOurProductAsMS)[0]}`);
      }
      // Must use 3T Doc/3T Sheet/3T Slide/3T Office
      const has3TName = /3T (Doc|Sheet|Slide|Office)/.test(blob);
      if (!has3TName) {
        throw new Error(`[${entry.id}] thiếu tên sản phẩm 3T Doc/3T Sheet/3T Slide/3T Office`);
      }
    }
  });

  return results;
}