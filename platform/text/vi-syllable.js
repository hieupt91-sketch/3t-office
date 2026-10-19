// Kiểm tra một âm tiết tiếng Việt có HỢP LỆ theo quy tắc chính tả hay không (phụ âm đầu + nguyên âm + phụ âm cuối + thanh điệu).
// Tự biên soạn theo quy tắc ghép vần tiếng Việt (CC0-1.0); không dùng dữ liệu từ điển bên ngoài.
// Tiếng Việt viết mỗi âm tiết cách nhau bằng dấu cách nên bộ kiểm tra chính tả có thể chấp nhận mọi âm tiết hợp lệ
// thay vì chỉ danh sách từ hữu hạn (danh sách chỉ có ~2.800 âm tiết nên gạch đỏ nhầm "thuế", "kênh", "trực"...).

const TONE_MARKS = {
  "̀": "huyen",
  "́": "sac",
  "̉": "hoi",
  "̃": "nga",
  "̣": "nang"
};

// Phụ âm đầu (dài trước ngắn khi ghép).
const INITIALS = ["ngh", "ng", "nh", "ch", "gh", "gi", "kh", "ph", "qu", "th", "tr",
  "b", "c", "d", "đ", "g", "h", "k", "l", "m", "n", "p", "r", "s", "t", "v", "x", ""];
const FINALS = ["ng", "nh", "ch", "c", "m", "n", "p", "t", ""];
const STOP_FINALS = new Set(["c", "ch", "p", "t"]);

const F_ALL = ["", "c", "ch", "m", "n", "ng", "nh", "p", "t"];
// Nguyên âm (đã bỏ dấu thanh, còn dấu mũ/móc) → các phụ âm cuối được phép.
const NUCLEI = new Map(Object.entries({
  a: F_ALL,
  "ă": ["c", "m", "n", "ng", "p", "t"],
  "â": ["c", "m", "n", "ng", "p", "t"],
  e: F_ALL,
  "ê": ["", "ch", "m", "n", "nh", "p", "t"],
  i: ["", "ch", "m", "n", "nh", "p", "t"],
  y: ["", "ch", "n", "nh", "t"],
  o: ["", "c", "m", "n", "ng", "p", "t"],
  "ô": ["", "c", "m", "n", "ng", "p", "t"],
  "ơ": ["", "m", "n", "p", "t"],
  u: ["", "c", "m", "n", "ng", "p", "t"],
  "ư": ["", "c", "m", "n", "ng", "t"],
  ia: [""], "iê": ["c", "m", "n", "ng", "p", "t"], "yê": ["m", "n", "ng", "t"],
  ua: [""], "uô": ["", "c", "m", "n", "ng", "t"],
  "ưa": [""], "ươ": ["", "c", "m", "n", "ng", "p", "t"],
  ai: [""], ay: [""], ao: [""], au: [""], "ây": [""], "âu": [""], eo: [""], "êu": [""], iu: [""],
  oi: [""], "ôi": [""], "ơi": [""], ui: [""], "ưi": [""], "ưu": [""],
  oa: ["", "c", "ch", "m", "n", "ng", "nh", "t"], "oă": ["c", "m", "n", "ng", "t"],
  oe: ["", "n", "t"], oo: ["c", "ng"],
  "uê": ["", "ch", "n", "nh"], uy: ["", "ch", "n", "nh", "t"], "uâ": ["n", "ng", "t"], "uyê": ["n", "t"],
  "uơ": [""], uya: [""],
  "iêu": [""], "yêu": [""], oai: [""], oay: [""], "uây": [""], "uôi": [""], "ươi": [""], "ươu": [""], oeo: [""]
}));

const FRONT_VOWEL = /^(e|ê|i|y|ia|iê|yê)/;

function splitTone(syllable) {
  let tone = "ngang";
  let count = 0;
  let base = "";
  for (const ch of syllable.normalize("NFD")) {
    if (TONE_MARKS[ch]) { tone = TONE_MARKS[ch]; count += 1; } else base += ch;
  }
  return count > 1 ? null : { base: base.normalize("NFC"), tone };
}

function nucleusFits(initial, nucleus, final, tone) {
  const allowed = NUCLEI.get(nucleus);
  if (!allowed || !allowed.includes(final)) return false;
  // c / g / ng đứng trước nguyên âm hàng trước phải viết k / gh / ngh, và ngược lại.
  if ((initial === "c" || initial === "g" || initial === "ng") && FRONT_VOWEL.test(nucleus)) return false;
  if ((initial === "k" || initial === "gh" || initial === "ngh") && !FRONT_VOWEL.test(nucleus)) return false;
  // "qu" đã gồm u: nguyên âm sau nó không bắt đầu bằng u/o.
  if (initial === "qu" && /^(u|o)/.test(nucleus)) return false;
  // "gi" đã gồm i: sau nó không có nguyên âm bắt đầu bằng i.
  if (initial === "gi" && /^(i|y)/.test(nucleus)) return false;
  if (STOP_FINALS.has(final) && tone !== "sac" && tone !== "nang") return false;
  return true;
}

/** @param {string} word đã chuẩn hóa NFC, chữ thường */
export function isValidVietnameseSyllable(word) {
  const parts = splitTone(String(word || ""));
  if (!parts) return false;
  const { base, tone } = parts;
  if (!base || base.length > 7 || !/^[a-zăâđêôơư]+$/.test(base)) return false;
  for (const initial of INITIALS) {
    if (initial && !base.startsWith(initial)) continue;
    const rest = base.slice(initial.length);
    // "gì": chữ i của "gi" đồng thời là nguyên âm, nên chỉ còn phụ âm đầu "gi" và thanh điệu.
    if (!rest && initial === "gi") return true;
    if (!rest) continue;
    for (const final of FINALS) {
      if (final && !rest.endsWith(final)) continue;
      const nucleus = final ? rest.slice(0, rest.length - final.length) : rest;
      if (nucleus && nucleusFits(initial, nucleus, final, tone)) return true;
      // "gì", "gìn": chữ i của "gi" đồng thời là nguyên âm.
      if (initial === "gi" && nucleus === "" && ["", "ch", "m", "n", "nh", "p", "t"].includes(final)
        && !(STOP_FINALS.has(final) && tone !== "sac" && tone !== "nang")) return true;
    }
  }
  return false;
}

