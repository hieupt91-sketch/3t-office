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
  const entries = getHelpEntriesForApp(options.app);
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

export { getHelpEntryById, getHelpEntriesForApp };
