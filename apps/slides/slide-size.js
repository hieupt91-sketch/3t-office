/**
 * Kích thước trang chiếu tùy chỉnh (logic thuần): đổi cm ↔ pt ↔ px canvas và kiểm tra giới hạn.
 *
 * Giới hạn theo bản trình chiếu thông dụng: mỗi cạnh từ 2,54 cm (1 inch) đến 142,24 cm (56 inch).
 * 1 pt = 1/72 inch; px canvas = pt / ptPerPx (bản mới 1 px = 1 pt, tệp mở từ ngoài 0,75 pt/px).
 */
export const SLIDE_SIZE_MIN_CM = 2.54;
export const SLIDE_SIZE_MAX_CM = 142.24;

const CM_PER_INCH = 2.54;

export function cmToPx(cm, ptPerPx = 1) {
  const per = Number(ptPerPx) > 0 ? Number(ptPerPx) : 1;
  return Math.round((cm / CM_PER_INCH * 72) / per);
}

export function pxToCm(px, ptPerPx = 1) {
  const per = Number(ptPerPx) > 0 ? Number(ptPerPx) : 1;
  return Math.round((px * per / 72 * CM_PER_INCH) * 100) / 100;
}

/** Chuẩn hóa số người dùng gõ: chấp nhận dấu phẩy thập phân ("19,05"). */
export function parseCm(value) {
  const text = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(text)) return NaN;
  return Number(text);
}

/**
 * @returns {{ ok: true, width: number, height: number } | { ok: false, error: "format"|"range" }}
 */
export function customSlideSize(widthCm, heightCm, ptPerPx = 1) {
  const w = typeof widthCm === "number" ? widthCm : parseCm(widthCm);
  const h = typeof heightCm === "number" ? heightCm : parseCm(heightCm);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return { ok: false, error: "format" };
  if (w < SLIDE_SIZE_MIN_CM || h < SLIDE_SIZE_MIN_CM || w > SLIDE_SIZE_MAX_CM || h > SLIDE_SIZE_MAX_CM) return { ok: false, error: "range" };
  return { ok: true, width: cmToPx(w, ptPerPx), height: cmToPx(h, ptPerPx) };
}
