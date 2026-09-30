/**
 * Test Suite: Vietnamese i18n Localization Layer Tests
 * Tuân thủ 03-ui-ux/VIETNAMESE-I18N.md & 00-governance/NON-NEGOTIABLE-RULES.md
 */

import { t, getLocale, setLocale } from "../../platform/i18n/i18n.js";

export async function runI18nTests() {
  const results = [];

  // 1. Kiểm tra locale mặc định
  if (getLocale() === "vi") {
    results.push({ name: "i18n: Locale mặc định là vi (tiếng Việt)", pass: true });
  } else {
    results.push({ name: "i18n: Locale mặc định không phải vi", pass: false });
  }

  // 1b. Windows/WebView tiếng Anh, chưa từng chọn ngôn ngữ -> vẫn tiếng Việt (lỗi dùng thử 30/9: ribbon hiện tiếng Anh)
  {
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", { value: { languages: ["en-US", "en"], language: "en-US" }, configurable: true });
    try {
      const fresh = await import("../../platform/i18n/i18n.js?english-windows");
      results.push({ name: "i18n: Windows tiếng Anh vẫn mặc định tiếng Việt", pass: fresh.getLocale() === "vi", error: `got ${fresh.getLocale()}` });
    } finally {
      if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
      else delete globalThis.navigator;
    }
  }

  // 2. Kiểm tra tra cứu chuỗi chung
  if (t("common.save") === "Lưu tài liệu" && t("common.undo") === "Hoàn tác") {
    results.push({ name: "i18n: Tra cứu đúng các chuỗi common tiêu chuẩn", pass: true });
  } else {
    results.push({ name: "i18n: Lỗi tra cứu chuỗi common", pass: false });
  }

  // 3. Kiểm tra tra cứu chuỗi Backstage
  if (t("backstage.home") === "Trang chủ" && t("backstage.templateTitle") === "Mẫu văn bản tiêu chuẩn Việt Nam") {
    results.push({ name: "i18n: Tra cứu đúng các chuỗi Backstage menu", pass: true });
  } else {
    results.push({ name: "i18n: Lỗi tra cứu chuỗi Backstage", pass: false });
  }

  // 4. Kiểm tra fallback khi không tìm thấy key
  const fallbackKey = "non.existing.key.test";
  if (t(fallbackKey) === fallbackKey) {
    results.push({ name: "i18n: Fallback an toàn về chính tên key nếu không tìm thấy trong từ điển", pass: true });
  } else {
    results.push({ name: "i18n: Fallback thất bại", pass: false });
  }

  return results;
}
