/**
 * VN Office Platform — i18n Localization Layer (Đa ngôn ngữ: Tiếng Việt + English)
 * Tuân thủ 03-ui-ux/VIETNAMESE-I18N.md & 00-governance/NON-NEGOTIABLE-RULES.md (#16)
 */

import { viStrings } from "./strings-vi.js";
import { enStrings } from "./strings-en.js";

const STORAGE_KEY = "vno-locale";
const SUPPORTED_LOCALES = ["vi", "en"];

function _detectSystemLocale() {
  try {
    if (typeof navigator === "undefined") return "vi";
    const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
    for (const lang of langs || []) {
      const short = String(lang || "").toLowerCase().split("-")[0];
      if (SUPPORTED_LOCALES.includes(short)) return short;
    }
    return "vi";
  } catch {
    return "vi";
  }
}

function _readPersistedLocale() {
  try {
    if (typeof localStorage === "undefined") return _detectSystemLocale();
    const saved = localStorage.getItem(STORAGE_KEY);
    // Chưa từng chọn thủ công lần nào -> dùng ngôn ngữ hệ thống trình duyệt/OS làm mặc định.
    return SUPPORTED_LOCALES.includes(saved) ? saved : _detectSystemLocale();
  } catch {
    return "vi";
  }
}

let _currentLocale = _readPersistedLocale();
const _catalogs = {
  vi: viStrings,
  en: enStrings
};

/**
 * Tra cứu chuỗi theo khóa chấm (ví dụ: 'backstage.templateTitle')
 * @param {string} key
 * @param {Object} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const catalog = _catalogs[_currentLocale] || _catalogs.vi;
  const parts = key.split(".");
  let val = catalog;

  for (const p of parts) {
    if (val && typeof val === "object" && p in val) {
      val = val[p];
    } else {
      return typeof params === "string" ? params : key; // Fallback về chuỗi mặc định hoặc key nếu không tìm thấy
    }
  }

  if (typeof val === "string" && params && typeof params === "object") {
    for (const [k, v] of Object.entries(params)) {
      val = val.replaceAll(`{${k}}`, String(v));
    }
  }

  return typeof val === "string" ? val : (typeof params === "string" ? params : key);
}

/**
 * Tra cứu chuỗi nhãn/tooltip của 1 command theo commandId — dùng cho
 * `platform/commands/command-definitions.js`'s applyLocaleToCommandDefinitions().
 * @param {string} commandId
 * @param {"label"|"tooltip"} field
 * @returns {string|null}
 */
export function tCommand(commandId, field) {
  const catalog = _catalogs[_currentLocale] || _catalogs.vi;
  return catalog.commands?.[commandId]?.[field] || null;
}

/**
 * Thiết lập ngôn ngữ hoạt động và LƯU LẠI (localStorage) để tải lại đúng ngôn ngữ
 * ở lần mở ứng dụng tiếp theo. Việc thay đổi ngôn ngữ trên các thành phần UI đang
 * hiển thị (ribbon, dialog, backstage...) cần tải lại trang (SPA dựng DOM một lần
 * khi khởi động) — xem `getSupportedLocales()`/`STORAGE_KEY` — gọi `location.reload()`
 * ở tầng UI (nút chuyển ngôn ngữ trên topbar) sau khi gọi hàm này.
 * @param {"vi"|"en"} locale
 */
export function setLocale(locale) {
  if (_catalogs[locale]) {
    _currentLocale = locale;
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, locale);
    } catch {}
  }
}

/**
 * Lấy ngôn ngữ hiện tại
 */
export function getLocale() {
  return _currentLocale;
}

/**
 * Danh sách ngôn ngữ được hỗ trợ, dùng để dựng UI chuyển ngôn ngữ.
 */
export function getSupportedLocales() {
  return SUPPORTED_LOCALES.slice();
}

/**
 * Tạo bản sao cấu trúc ribbon với nhãn tab/nhóm theo locale hiện tại.
 * Giữ nguyên `label` làm fallback và không mutate cấu hình export dùng chung.
 * @param {Array<Object>} tabs
 * @returns {Array<Object>}
 */
export function applyLocaleToTabs(tabs) {
  return (tabs || []).map(tab => ({
    ...tab,
    label: tab.labelKey ? (t(tab.labelKey) || tab.label) : tab.label,
    groups: (tab.groups || []).map(group => ({
      ...group,
      label: group.labelKey ? (t(group.labelKey) || group.label) : group.label
    }))
  }));
}
