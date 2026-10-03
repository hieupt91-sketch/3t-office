/**
 * Định dạng ô nhập mã kích hoạt: 3TO-XXXXX-XXXXX-XXXXX-XXXXX.
 * Song sinh với adapters/license/keys.py (format_while_typing); phần kiểm checksum nằm ở Python (license_normalize_key).
 */

/** Gõ tới đâu nhóm tới đó; bỏ ký tự lạ; tối đa 20 ký tự sau tiền tố 3TO. */
export function formatLicenseKeyInput(raw) {
  let cleaned = String(raw ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (cleaned.startsWith("3TO")) cleaned = cleaned.slice(3);
  // The box already shows "3TO-", so pasting a whole key gives "3TO-3TO-…": drop the repeated prefix
  // (only while the text is longer than a key body, so a body that really starts with those letters survives).
  while (cleaned.startsWith("3TO") && cleaned.length > 20) cleaned = cleaned.slice(3);
  cleaned = cleaned.slice(0, 20);
  const groups = cleaned.match(/.{1,5}/g) || [];
  return ["3TO", ...groups].join("-") + (groups.length === 0 ? "-" : "");
}

/** Đủ 20 ký tự sau tiền tố — lúc này mới đáng hỏi Python kiểm checksum. */
export function isLicenseKeyComplete(formatted) {
  return String(formatted ?? "").replace(/^3TO-?/, "").replace(/-/g, "").length === 20;
}
