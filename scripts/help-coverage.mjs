#!/usr/bin/env node
/**
 * VN Office — Script kiểm tra độ phủ Hướng dẫn sử dụng (Help Coverage)
 *
 * Quét toàn bộ commandId xuất hiện trên Ribbon của VN Writer và VN Sheet,
 * đối chiếu với command-definitions và danh mục bài viết Help trong:
 * - platform/help/entries-writer.js
 * - platform/help/entries-sheet.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { WRITER_RIBBON_TABS } from "../apps/writer/writer-ribbon.js";
import { SHEET_RIBBON_TABS } from "../apps/sheet/sheet-ribbon.js";
import { SLIDES_RIBBON_TABS } from "../apps/slides/slides-ribbon.js";
import {
  COMMON_COMMANDS,
  WRITER_COMMANDS,
  SHEET_COMMANDS,
  SLIDES_COMMANDS
} from "../platform/commands/command-definitions.js";
import { VN_TO_UNO_MAP } from "../adapters/libreoffice/common/command-dispatch-mapper.js";
import { WRITER_HELP_ENTRIES } from "../platform/help/entries-writer.js";
import { SHEET_HELP_ENTRIES } from "../platform/help/entries-sheet.js";
import { SLIDES_HELP_ENTRIES } from "../platform/help/entries-slides.js";
import { HELP_ENTRIES, registerHelpEntries } from "../platform/help/help-catalog.js";
import { viStrings } from "../platform/i18n/strings-vi.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function readSource(relPath) {
  const fullPath = path.join(rootDir, relPath);
  return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : "";
}

const appShellCode = readSource("platform/shell/app-shell.js");
const writerAdapterCode = readSource("adapters/libreoffice/writer/writer-adapter.js");
const sheetAdapterCode = readSource("adapters/libreoffice/sheet/sheet-adapter.js");
const slidesAdapterCode = readSource("adapters/libreoffice/slides/slides-adapter.js");
const writerAppCode = readSource("apps/writer/writer-app.js");
const sheetAppCode = readSource("apps/sheet/sheet-app.js");
const slidesAppCode = readSource("apps/slides/slides-app.js");
const writerVCCode = readSource("apps/writer/writer-view-controller.js");
const writerACCode = readSource("apps/writer/writer-arrange-controller.js");
const sheetGridCode = readSource("apps/sheet/sheet-grid.js");
const slidesCanvasCode = readSource("apps/slides/slides-canvas.js");

export function checkHasHandler(commandId, appKind) {
  const escaped = commandId.replace(/\./g, "\\.");
  const bindPattern = new RegExp(`(?:bindHandler|bind)\\(\\s*["']${escaped}["']`);
  const casePattern = new RegExp(`case\\s+["']${escaped}["']`);

  if (bindPattern.test(appShellCode)) return true;

  if (appKind === "writer") {
    if (bindPattern.test(writerAppCode)) return true;
    if (bindPattern.test(writerAdapterCode)) return true;
    if (bindPattern.test(writerVCCode)) return true;
    if (bindPattern.test(writerACCode)) return true;
    if (casePattern.test(writerAdapterCode)) return true;
  }

  if (appKind === "sheet") {
    if (bindPattern.test(sheetAppCode)) return true;
    if (bindPattern.test(sheetAdapterCode)) return true;
    if (bindPattern.test(sheetGridCode)) return true;
    if (casePattern.test(sheetAdapterCode)) return true;
  }

  if (appKind === "slides") {
    if (bindPattern.test(slidesAppCode)) return true;
    if (bindPattern.test(slidesAdapterCode)) return true;
    if (bindPattern.test(slidesCanvasCode)) return true;
    if (casePattern.test(slidesAdapterCode)) return true;
  }

  const unoUrl = VN_TO_UNO_MAP[commandId];
  if (unoUrl) {
    const unoEscaped = unoUrl.replace(/\./g, "\\.");
    const unoCase = new RegExp(`case\\s+["']${unoEscaped}["']`);
    if (appKind === "writer" && unoCase.test(writerAdapterCode)) return true;
    if (appKind === "sheet" && unoCase.test(sheetAdapterCode)) return true;
    if (appKind === "slides" && unoCase.test(slidesAdapterCode)) return true;
  }

  return false;
}

export function extractRibbonCommands(tabs) {
  const list = [];

  function walk(items, tab, group) {
    if (!items || !Array.isArray(items)) return;
    for (const item of items) {
      if (item.commandId) {
        list.push({
          tabId: tab.id,
          tabLabel: tab.label,
          groupId: group.id,
          groupLabel: group.label,
          commandId: item.commandId,
          type: item.type || "button",
          isLauncher: false
        });
      }
      if (item.items) {
        walk(item.items, tab, group);
      }
    }
  }

  for (const tab of tabs) {
    for (const group of tab.groups || []) {
      if (group.launcherCommandId) {
        list.push({
          tabId: tab.id,
          tabLabel: tab.label,
          groupId: group.id,
          groupLabel: group.label,
          commandId: group.launcherCommandId,
          type: "launcher",
          isLauncher: true
        });
      }
      walk(group.items, tab, group);
    }
  }

  return list;
}

export function analyzeHelpCoverage() {
  registerHelpEntries(SHEET_HELP_ENTRIES);
  registerHelpEntries(SLIDES_HELP_ENTRIES);

  const allDefinitions = new Map();
  for (const def of [...COMMON_COMMANDS, ...WRITER_COMMANDS, ...SHEET_COMMANDS, ...SLIDES_COMMANDS]) {
    allDefinitions.set(def.id, def);
  }

  const apps = [
    {
      name: "VN Writer",
      appKind: "writer",
      tabs: WRITER_RIBBON_TABS,
      entries: HELP_ENTRIES.filter(e => e.app === "writer" || e.app === "common")
    },
    {
      name: "VN Sheet",
      appKind: "sheet",
      tabs: SHEET_RIBBON_TABS,
      entries: HELP_ENTRIES.filter(e => e.app === "sheet" || e.app === "common")
    },
    {
      name: "VN Slides",
      appKind: "slides",
      tabs: SLIDES_RIBBON_TABS,
      entries: HELP_ENTRIES.filter(e => e.app === "slides" || e.app === "common")
    }
  ];

  const results = {};

  for (const app of apps) {
    const rawItems = extractRibbonCommands(app.tabs);
    const coveredCmdIds = new Set();

    for (const entry of app.entries) {
      for (const cmdId of entry.commandIds || []) {
        coveredCmdIds.add(cmdId);
      }
    }

    const uniqueMap = new Map();
    for (const item of rawItems) {
      if (!uniqueMap.has(item.commandId)) {
        const def = allDefinitions.get(item.commandId);
        const i18nLabel = viStrings.commands?.[item.commandId]?.label;
        const label = i18nLabel || def?.label || item.commandId;
        const shortcut = def?.shortcut || "";
        const hasHandler = checkHasHandler(item.commandId, app.appKind);
        const isCovered = coveredCmdIds.has(item.commandId);

        uniqueMap.set(item.commandId, {
          commandId: item.commandId,
          tabId: item.tabId,
          tabLabel: item.tabLabel,
          groupId: item.groupId,
          groupLabel: item.groupLabel,
          type: item.type,
          label,
          shortcut,
          hasHandler,
          isCovered
        });
      }
    }

    const commands = Array.from(uniqueMap.values());
    const totalCount = commands.length;
    const deadButtons = commands.filter((c) => !c.hasHandler);
    const liveCommands = commands.filter((c) => c.hasHandler);
    const coveredCommands = liveCommands.filter((c) => c.isCovered);
    const uncoveredCommands = liveCommands.filter((c) => !c.isCovered);

    results[app.appKind] = {
      name: app.name,
      appKind: app.appKind,
      totalCount,
      liveCount: liveCommands.length,
      coveredCount: coveredCommands.length,
      uncoveredCount: uncoveredCommands.length,
      deadCount: deadButtons.length,
      coveragePercent: totalCount > 0 ? ((coveredCommands.length / liveCommands.length) * 100).toFixed(1) : "0.0",
      commands,
      deadButtons,
      coveredCommands,
      uncoveredCommands,
      entriesCount: app.entries.length
    };
  }

  return results;
}

export function formatReportMarkdown(analysis) {
  let md = "# BÁO CÁO ĐỘ PHỦ HƯỚNG DẪN SỬ DỤNG (HELP COVERAGE)\n\n";
  md += `Ngày kiểm tra: ${new Date().toISOString().split("T")[0]}\n\n`;
  md += "## 1. Tổng quan độ phủ\n\n";
  md += "| Ứng dụng | Tổng lệnh Ribbon | Lệnh có Handler | Có bài Help | Chưa có Help | Nút chết | Tỉ lệ phủ |\n";
  md += "| :--- | :---: | :---: | :---: | :---: | :---: | :---: |\n";

  for (const key of ["writer", "sheet", "slides"]) {
    const r = analysis[key];
    md += `| **${r.name}** | ${r.totalCount} | ${r.liveCount} | ${r.coveredCount} | ${r.uncoveredCount} | ${r.deadCount} | **${r.coveragePercent}%** |\n`;
  }

  md += "\n## 2. Nút chết cần xử lý\n\n";
  const allDead = [...analysis.writer.deadButtons, ...analysis.sheet.deadButtons, ...analysis.slides.deadButtons];
  if (allDead.length === 0) {
    md += "_Không phát hiện nút chết nào trên Ribbon của cả 3 ứng dụng (Doc, Sheet, Slide). 100% lệnh Ribbon đều có handler thực thi._\n\n";
  } else {
    md += "| Ứng dụng | Tab | Nhóm | Command ID | Nhãn |\n";
    md += "| :--- | :--- | :--- | :--- | :--- |\n";
    for (const d of allDead) {
      md += `| ${d.name} | ${d.tabLabel} | ${d.groupLabel} | \`${d.commandId}\` | ${d.label} |\n`;
    }
    md += "\n";
  }

  md += "## 3. Danh sách lệnh CHƯA có bài Help (theo Tab / Nhóm)\n\n";

  for (const [idx, key] of ["writer", "sheet", "slides"].entries()) {
    const r = analysis[key];
    md += `### 3.${idx + 1}. ${r.name} (${r.uncoveredCount} lệnh chưa phủ)\n\n`;

    if (r.uncoveredCount === 0) {
      md += `_100% lệnh có handler của ${r.name} đã được phủ đầy đủ bài viết hướng dẫn sử dụng!_\n\n`;
      continue;
    }

    md += "| Tab | Nhóm | Command ID | Tên chức năng | Phím tắt |\n";
    md += "| :--- | :--- | :--- | :--- | :---: |\n";

    for (const c of r.uncoveredCommands) {
      md += `| ${c.tabLabel} | ${c.groupLabel} | \`${c.commandId}\` | ${c.label} | ${c.shortcut ? `\`${c.shortcut}\`` : "-"} |\n`;
    }
    md += "\n";
  }

  return md;
}

if (process.argv[1] && process.argv[1].endsWith("help-coverage.mjs")) {
  const analysis = analyzeHelpCoverage();
  const md = formatReportMarkdown(analysis);

  if (process.argv.includes("--write-doc")) {
    const target = path.join(rootDir, "docs/HELP-COVERAGE.md");
    fs.writeFileSync(target, md, "utf8");
    console.log(`Đã xuất báo cáo vào ${target}`);
  } else {
    console.log(md);
  }
}
