/**
 * 3T Office Help Catalog — đăng ký hướng dẫn theo app.
 * Writer được nạp sẵn. Sheet/Slides bổ sung sau bằng registerHelpEntries().
 */

import { WRITER_HELP_ENTRIES } from "./entries-writer.js";
import { ERROR_REPORTING_HELP_ENTRIES } from "./entries-error-reporting.js";
import { AUTORECOVER_HELP_ENTRIES } from "./entries-autorecover.js";
import { UPDATER_HELP_ENTRIES } from "./entries-updater.js";
import { LAUNCHER_HELP_ENTRIES } from "./entries-launcher.js";
import { CONSISTENCY_HELP_ENTRIES } from "./entries-consistency.js";

/** @type {Array<HelpEntry>} */
export const HELP_ENTRIES = [
  ...WRITER_HELP_ENTRIES,
  ...ERROR_REPORTING_HELP_ENTRIES,
  ...AUTORECOVER_HELP_ENTRIES,
  ...UPDATER_HELP_ENTRIES,
  ...LAUNCHER_HELP_ENTRIES,
  ...CONSISTENCY_HELP_ENTRIES
];

/**
 * @typedef {Object} HelpEntry
 * @property {string} id
 * @property {"writer"|"sheet"|"slides"|"common"} app
 * @property {string[]} [commandIds]
 * @property {string} title
 * @property {string} summary
 * @property {{ tab: string, tabId?: string, group: string }} ribbon
 * @property {string[]} [keywords]
 * @property {string[]} steps
 */

/**
 * @param {HelpEntry[]} entries
 */
export function registerHelpEntries(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return HELP_ENTRIES.length;
  for (const entry of entries) {
    if (!entry?.id) continue;
    const index = HELP_ENTRIES.findIndex((item) => item.id === entry.id);
    if (index >= 0) HELP_ENTRIES[index] = entry;
    else HELP_ENTRIES.push(entry);
  }
  return HELP_ENTRIES.length;
}

/**
 * @param {"writer"|"sheet"|"slides"|"common"} app
 * @param {{ includeCommon?: boolean }} [options]
 * @returns {HelpEntry[]}
 */
export function getHelpEntriesForApp(app, options = {}) {
  if (!app) return [...HELP_ENTRIES];
  if (options.includeCommon) {
    return HELP_ENTRIES.filter((entry) => entry.app === app || entry.app === "common");
  }
  return HELP_ENTRIES.filter((entry) => entry.app === app);
}

/**
 * @param {string} id
 * @returns {HelpEntry|null}
 */
export function getHelpEntryById(id) {
  if (!id) return null;
  return HELP_ENTRIES.find((entry) => entry.id === id || (entry.commandIds || []).includes(id)) || null;
}
