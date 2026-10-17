/**
 * Đổi chữ hoa / thường dùng chung cho Writer, Slides (và app khác): chạy trực tiếp trên các nút văn bản
 * trong vùng chọn của trình duyệt, không cắt/chèn lại DOM nên giữ nguyên cấu trúc, định dạng và vùng chọn.
 *
 * Chế độ: "sentence", "lowercase", "uppercase", "capitalize", "toggle"; bỏ trống = Shift+F3 xoay vòng
 * (thường → Viết Hoa Mỗi Từ → CHỮ HOA → thường). Tương thích chữ có dấu tiếng Việt.
 */

const WORD_START = /(^|[\s\p{P}‘-”]+)(\p{L})/gu;

export function normalizeCaseMode(mode) {
  const value = typeof mode === "string" ? mode : (mode && typeof mode === "object" ? (mode.type || mode.mode || "") : "");
  return String(value).toLowerCase();
}

/** Biến đổi một chuỗi theo chế độ; `cycleSource` là toàn bộ chữ đang chọn (để xoay vòng nhận biết trạng thái). */
export function transformCase(mode, value, cycleSource = value) {
  const m = normalizeCaseMode(mode);
  if (m === "sentence" || m === "sentencecase") {
    return value.toLowerCase().replace(/(^|[.!?]\s+)(\p{L})/gu, (_all, p, c) => p + c.toUpperCase());
  }
  if (m === "lowercase" || m === "lower") return value.toLowerCase();
  if (m === "uppercase" || m === "upper") return value.toUpperCase();
  if (m === "capitalize" || m === "capitalizeeachword" || m === "title") {
    return value.toLowerCase().replace(WORD_START, (_all, p, c) => p + c.toUpperCase());
  }
  if (m === "toggle" || m === "togglecase") {
    return Array.from(value).map((c) => {
      const u = c.toUpperCase();
      const l = c.toLowerCase();
      return c === u && c !== l ? l : (c === l && c !== u ? u : c);
    }).join("");
  }
  const allUpper = cycleSource === cycleSource.toUpperCase() && cycleSource !== cycleSource.toLowerCase();
  const allLower = cycleSource === cycleSource.toLowerCase() && cycleSource !== cycleSource.toUpperCase();
  if (allLower) return value.toLowerCase().replace(WORD_START, (_all, p, c) => p + c.toUpperCase());
  if (allUpper) return value.toLowerCase();
  return value.toUpperCase();
}

/** Nếu con trỏ đang đứng trong một từ mà chưa chọn gì, chọn nguyên từ đó (như Word/PowerPoint). */
export function selectWordAtCaret(selection) {
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return;
  const node = selection.anchorNode;
  if (!node || node.nodeType !== 3 || typeof document === "undefined") return;
  const text = node.textContent || "";
  let start = selection.anchorOffset;
  let end = selection.anchorOffset;
  while (start > 0 && /\S/.test(text[start - 1])) start--;
  while (end < text.length && /\S/.test(text[end])) end++;
  if (end <= start) return;
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Đổi chữ trong vùng chọn hiện tại. Trả về true nếu có chữ được xử lý.
 * `root` (tùy chọn) giới hạn phạm vi: vùng chọn phải nằm trong `root`.
 */
export function applyChangeCaseToSelection(mode, { root = null } = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const selection = window.getSelection?.();
  if (!selection || selection.rangeCount === 0) return false;
  selectWordAtCaret(selection);
  if (selection.rangeCount === 0) return false;
  const range = selection.getRangeAt(0);
  if (root && !root.contains(range.commonAncestorContainer)) return false;
  const selectedText = selection.toString();
  if (!selectedText || typeof document.createTreeWalker !== "function") return false;

  // Range "sống" bị trình duyệt dịch chuyển khi sửa node.data: chụp tọa độ trước khi đổi.
  const { startContainer, startOffset, endContainer } = range;
  const endOffsetOriginal = range.endOffset;
  const common = range.commonAncestorContainer;
  const textNodes = [];
  if (common.nodeType === 3) {
    textNodes.push(common);
  } else {
    const walker = document.createTreeWalker(common, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (range.intersectsNode?.(node) !== false) textNodes.push(node);
    }
  }
  const slices = textNodes.map((node) => {
    const from = node === startContainer ? startOffset : 0;
    const to = node === endContainer ? endOffsetOriginal : node.data.length;
    return { node, from, to: Math.max(from, to) };
  }).filter((slice) => slice.to > slice.from);
  if (!slices.length) return false;

  const fragmentText = slices.map((slice) => slice.node.data.slice(slice.from, slice.to)).join("");
  const convert = (value) => transformCase(mode, value, selectedText);
  const convertedText = convert(fragmentText);
  let sourceOffset = 0;
  let newEndOffset = endOffsetOriginal;
  for (const slice of slices) {
    const sourceEnd = sourceOffset + (slice.to - slice.from);
    const outputStart = convert(fragmentText.slice(0, sourceOffset)).length;
    const outputEnd = convert(fragmentText.slice(0, sourceEnd)).length;
    const piece = convertedText.slice(outputStart, outputEnd);
    slice.node.data = slice.node.data.slice(0, slice.from) + piece + slice.node.data.slice(slice.to);
    if (slice.node === endContainer) newEndOffset = slice.from + piece.length;
    sourceOffset = sourceEnd;
  }
  const restored = document.createRange();
  restored.setStart(startContainer, startOffset);
  restored.setEnd(endContainer, Math.min(newEndOffset, endContainer.nodeType === 3 ? endContainer.data.length : endContainer.childNodes.length));
  selection.removeAllRanges();
  selection.addRange(restored);
  return true;
}
