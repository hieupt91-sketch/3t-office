/**
 * VN Office Platform — Lightweight Vietnamese i18n Localization Layer
 * Tuân thủ 03-ui-ux/VIETNAMESE-I18N.md & 00-governance/NON-NEGOTIABLE-RULES.md (#16)
 */

import { viStrings } from "./strings-vi.js";

let _currentLocale = "vi";
const _catalogs = {
  vi: viStrings
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
      return key; // Fallback về key nếu không tìm thấy
    }
  }

  if (typeof val === "string" && params) {
    for (const [k, v] of Object.entries(params)) {
      val = val.replace(new RegExp(`{${k}}`, "g"), String(v));
    }
  }

  return typeof val === "string" ? val : key;
}

/**
 * Thiết lập ngôn ngữ hoạt động
 * @param {"vi"} locale 
 */
export function setLocale(locale) {
  if (_catalogs[locale]) {
    _currentLocale = locale;
  }
}

/**
 * Lấy ngôn ngữ hiện tại
 */
export function getLocale() {
  return _currentLocale;
}
