/**
 * Tra cứu hướng dẫn: tìm theo tên tính năng, tab ribbon, command id.
 */

import { getHelpEntriesForApp, getHelpEntryById } from "./help-catalog.js";

export function foldHelpText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d");
}

function entrySearchText(entry) {
  return foldHelpText([
    entry.id,
    entry.title,
    entry.summary,
    entry.ribbon?.tab,
    entry.ribbon?.group,
    ...(entry.keywords || []),
    ...(entry.commandIds || []),
    ...(entry.steps || [])
  ].join(" "));
}

/**
 * @param {string} query
 * @param {{ app?: "writer"|"sheet"|"slides" }} [options]
 */
export function searchHelpEntries(query, options = {}) {
  const entries = getHelpEntriesForApp(options.app, { includeCommon: true });
  const needle = foldHelpText(query).trim();
  if (!needle) return entries;
  return entries.filter((entry) => entrySearchText(entry).includes(needle));
}

export function groupHelpEntriesByTab(entries) {
  const groups = [];
  const indexByTab = new Map();
  for (const entry of entries) {
    const tab = entry.ribbon?.tab || "Khác";
    if (!indexByTab.has(tab)) {
      indexByTab.set(tab, groups.length);
      groups.push({ tab, tabId: entry.ribbon?.tabId || "", entries: [] });
    }
    groups[indexByTab.get(tab)].entries.push(entry);
  }
  return groups;
}

/**
 * Tìm bài hướng dẫn phù hợp với ngữ cảnh hiện tại (nút ribbon, hộp thoại đang mở...)
 * @param {HTMLElement|null} activeElement
 * @param {string} [appKind]
 * @returns {HelpEntry|null}
 */
export function findHelpEntryForContext(activeElement, appKind) {
  if (!activeElement || typeof activeElement.closest !== "function") {
    const appEntries = getHelpEntriesForApp(appKind);
    return appEntries[0] || null;
  }

  // 1. Kiểm tra data-help-id hoặc data-help-entry trực tiếp
  const explicitHelpEl = activeElement.closest("[data-help-id], [data-help-entry]");
  if (explicitHelpEl) {
    const helpId = explicitHelpEl.getAttribute("data-help-id") || explicitHelpEl.getAttribute("data-help-entry");
    const entry = getHelpEntryById(helpId);
    if (entry) return entry;
  }

  // 2. Kiểm tra nếu đang focus vào nút lệnh có commandId
  const cmdEl = activeElement.closest("[data-command-id], [data-command]");
  if (cmdEl) {
    const cmdId = cmdEl.getAttribute("data-command-id") || cmdEl.getAttribute("data-command");
    if (cmdId) {
      const match = getHelpEntryById(cmdId);
      if (match) return match;
    }
  }

  // 3. Kiểm tra nếu đang nằm trong một hộp thoại cụ thể
  const dialog = activeElement.closest("[role='dialog'], [role='alertdialog'], .vno-dialog-box, .vno-about-dialog, .vno-symbol-picker");
  if (dialog) {
    if (dialog.closest?.(".vno-about-backdrop") || dialog.querySelector?.(".vno-about-title")) {
      return getHelpEntryById("common.help.about") || getHelpEntryById("common.help.whatsNew");
    }
    if (dialog.querySelector?.("#vno-options-dialog-title") || dialog.id === "vno-options-dialog") {
      return getHelpEntryById("common.help.themeAndFontSize");
    }
    if (dialog.classList?.contains("vno-symbol-picker") || dialog.id?.includes("symbol")) {
      return getHelpEntryById("writer.insert.symbol") || getHelpEntryById("slides.insert.symbol");
    }
    if (dialog.querySelector?.("#vno-fr-find-input")) {
      return getHelpEntryById("slides.edit.findReplace") || getHelpEntryById("writer.edit.findReplace");
    }
  }

  // 4. Kiểm tra nếu đang ở tab ribbon cụ thể
  const tabEl = activeElement.closest(".vno-ribbon-tab, .vno-ribbon-tab-file");
  if (tabEl) {
    const tabText = tabEl.textContent.trim();
    const match = getHelpEntriesForApp(appKind, { includeCommon: true }).find(e => e.ribbon?.tab?.toLowerCase() === tabText.toLowerCase());
    if (match) return match;
  }

  const appEntries = getHelpEntriesForApp(appKind, { includeCommon: true });
  return appEntries[0] || null;
}

export { getHelpEntryById, getHelpEntriesForApp };
