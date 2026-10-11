/**
 * Thụt lề đoạn kiểu Word: Tăng/Giảm thụt lề (Ctrl+M / Ctrl+Shift+M) dịch lề TRÁI của đoạn theo các điểm dừng
 * tab mặc định 1,27 cm (0,5 inch), không bọc đoạn vào khối trích dẫn. Lề trái ghi vào style của đoạn nên
 * khi lưu DOCX ra đúng w:ind w:left (720 twips mỗi bước).
 */
export const INDENT_STEP_PX = 48; // 1,27 cm = 0,5 inch = 48 px CSS
const CSS_PX_PER_INCH = 96;
const CM_PER_INCH = 2.54;
const EPSILON_PX = 0.5;

/** Điểm dừng kế tiếp (tăng) hoặc liền trước (giảm) so với lề hiện tại, tính bằng px. Không âm. */
export function nextIndentPx(currentPx, direction) {
  const current = Number.isFinite(currentPx) && currentPx > 0 ? currentPx : 0;
  if (direction > 0) return (Math.floor((current + EPSILON_PX) / INDENT_STEP_PX) + 1) * INDENT_STEP_PX;
  return Math.max(0, (Math.ceil((current - EPSILON_PX) / INDENT_STEP_PX) - 1) * INDENT_STEP_PX);
}

/** Giá trị CSS lề trái (cm, 2 chữ số) cho px; chuỗi rỗng khi không còn thụt lề. */
export function indentPxToCss(px) {
  return px > 0 ? `${(px / CSS_PX_PER_INCH * CM_PER_INCH).toFixed(2)}cm` : "";
}

/** Đổi chuỗi độ dài CSS (px, cm, mm, pt, in) sang px; NaN nếu không đọc được. */
export function cssLengthToPx(value) {
  const match = /^(-?\d*\.?\d+)\s*(px|cm|mm|pt|in)?$/i.exec(String(value ?? "").trim());
  if (!match) return Number.NaN;
  const amount = Number(match[1]);
  switch ((match[2] || "px").toLowerCase()) {
    case "cm": return amount / CM_PER_INCH * CSS_PX_PER_INCH;
    case "mm": return amount / 10 / CM_PER_INCH * CSS_PX_PER_INCH;
    case "pt": return amount / 72 * CSS_PX_PER_INCH;
    case "in": return amount * CSS_PX_PER_INCH;
    default: return amount;
  }
}
