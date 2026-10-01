/**
 * Đọc số tiền thành chữ tiếng Việt — tương thích hàm VND() của add-in XLL
 * phổ biến ở Việt Nam (công thức lưu trong XLSX là `_xll.VND(...)`).
 *
 * Quy tắc lấy từ giá trị cache thật trong tài liệu của người dùng (28/9/2026):
 *   24975666          → "Hai mươi bốn triệu chín trăm bảy mươi lăm ngàn sáu trăm sáu mươi sáu đồng chẵn."
 *   3193080           → "Ba triệu một trăm chín mươi ba ngàn không trăm tám mươi đồng chẵn."
 *   13625921.48926384 → "Mười ba triệu sáu trăm hai mươi lăm ngàn chín trăm hai mươi mốt đồng và
 *                        bốn triệu tám trăm chín mươi hai ngàn sáu trăm ba mươi tám xu."
 * – "ngàn" (không phải "nghìn"), "mốt"/"lăm" sau "mươi", "lẻ" khi hàng chục bằng 0,
 * – phần lẻ đọc là 7 chữ số thập phân (bỏ số 0 cuối) + "xu".
 */

const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
const SCALES = ["", " ngàn", " triệu", " tỷ"];

/** Đọc một nhóm 3 chữ số. `full` = nhóm không đứng đầu (phải đọc "không trăm", "lẻ"). */
function readTriple(value, full) {
  const hundreds = Math.floor(value / 100);
  const tens = Math.floor((value % 100) / 10);
  const ones = value % 10;
  const words = [];
  if (hundreds > 0 || full) words.push(`${DIGITS[hundreds]} trăm`);
  if (tens === 0) {
    if (ones > 0 && (hundreds > 0 || full)) words.push("lẻ");
  } else if (tens === 1) {
    words.push("mười");
  } else {
    words.push(`${DIGITS[tens]} mươi`);
  }
  if (ones > 0) {
    if (ones === 1 && tens > 1) words.push("mốt");
    else if (ones === 5 && tens > 0) words.push("lăm");
    else words.push(DIGITS[ones]);
  }
  return words.join(" ");
}

/** Đọc phần nhỏ hơn một tỷ (tối đa 3 nhóm: triệu, ngàn, đơn vị). */
function readBelowBillion(value, full) {
  const groups = [Math.floor(value / 1e6), Math.floor((value % 1e6) / 1000), value % 1000];
  const parts = [];
  let started = full;
  groups.forEach((group, index) => {
    if (group === 0) return;
    parts.push(`${readTriple(group, started)}${SCALES[2 - index]}`);
    started = true;
  });
  return parts.join(" ");
}

function readInteger(value, full) {
  if (value >= 1e9) {
    // "tỷ" lặp lại cho số lớn hơn: 1.234.567.890.123 = "một ngàn hai trăm ba mươi bốn tỷ …".
    const billions = Math.floor(value / 1e9);
    const rest = value % 1e9;
    const head = `${readInteger(billions, full)} tỷ`;
    return rest > 0 ? `${head} ${readBelowBillion(rest, true)}` : head;
  }
  return readBelowBillion(value, full);
}

/** Đọc số nguyên không âm thành chữ (không viết hoa, không đơn vị). */
export function readVietnameseInteger(integer) {
  const n = Math.floor(Math.abs(integer));
  return n === 0 ? "không" : readInteger(n, false);
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * VND(số) — số tiền bằng chữ.
 * @param {number} amount
 * @returns {string}
 */
export function vndInWords(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "#VALUE!";
  const negative = value < 0;
  const absolute = Math.abs(value);
  const integer = Math.floor(absolute);
  const fraction = Math.round((absolute - integer) * 1e7);
  let text = `${readVietnameseInteger(integer)} đồng`;
  if (fraction > 0) {
    const digits = String(fraction).padStart(7, "0").replace(/0+$/, "");
    text += ` và ${readVietnameseInteger(Number(digits))} xu.`;
  } else {
    text += " chẵn.";
  }
  if (negative) text = `âm ${text}`;
  return capitalize(text);
}
