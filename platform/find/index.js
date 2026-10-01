/**
 * 3T Office — Platform Find & Replace Module
 * Xuất các hàm và lớp dùng chung cho công cụ Tìm kiếm và Thay thế (CH-7.1).
 */

export {
  normalizeNFC,
  stripDiacritics,
  escapeRegExp,
  createMatcher,
  FindReplaceEngine
} from "./find-engine.js";

export {
  showFindReplaceDialog,
  getLastFindSession,
  setLastFindSession,
  findNextFromSession,
  findPrevFromSession,
  attachF3GlobalListener
} from "./find-dialog.js";
