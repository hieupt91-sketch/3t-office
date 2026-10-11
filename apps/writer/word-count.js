/**
 * 3T Doc — Đếm từ (Word Count)
 * Thống kê từ / ký tự / đoạn / dòng dựa trên innerText của thân tài liệu.
 * Không gửi nội dung tài liệu ra ngoài.
 */

import { t } from "../../platform/i18n/i18n.js";

function trapFocus(dialogBox, event) {
  if (event.key !== "Tab") return;
  const focusables = Array.from(dialogBox.querySelectorAll(
    'button:not([disabled]), input:not([disabled]):not([type="hidden"]), [tabindex]:not([tabindex="-1"])'
  )).filter((el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
  if (focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey) {
    if (document.activeElement === first || !dialogBox.contains(document.activeElement)) {
      event.preventDefault();
      last.focus();
    }
  } else if (document.activeElement === last || !dialogBox.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  }
}

function emptyStats(scope = "document") {
  return {
    words: 0,
    charactersWithSpaces: 0,
    charactersNoSpaces: 0,
    paragraphs: 0,
    lines: 0,
    scope
  };
}

function isFloatingShapeContent(element) {
  return Boolean(element?.closest?.("[data-vno-float]"));
}

/**
 * Đếm thống kê từ một chuỗi văn bản thuần.
 * Từ tiếng Việt: tách theo khoảng trắng, bỏ token rỗng.
 * @param {string} text
 * @param {{ scope?: string, paragraphCount?: number, lineCount?: number }} [options]
 */
export function countDocumentStats(text, options = {}) {
  const scope = options.scope || "document";
  const markerStats = options.markerStats || {};
  const raw = String(text ?? "").replace(/\u00a0/g, " ");
  const trimmed = raw.trim();
  if (!trimmed) {
    const empty = emptyStats(scope);
    empty.words = Number(markerStats.words) || 0;
    empty.charactersWithSpaces = Number(markerStats.charactersWithSpaces) || 0;
    empty.charactersNoSpaces = Number(markerStats.charactersNoSpaces) || 0;
    empty.lines = options.lineCount != null ? options.lineCount : 0;
    return empty;
  }

  const words = trimmed.split(/\s+/).filter(Boolean).length + (Number(markerStats.words) || 0);
  const charactersWithSpaces = raw.replace(/[\r\n\u2028\u2029]/g, "").length + (Number(markerStats.charactersWithSpaces) || 0);
  const charactersNoSpaces = raw.replace(/\s+/g, "").length + (Number(markerStats.charactersNoSpaces) || 0);
  const paragraphs = options.paragraphCount != null
    ? options.paragraphCount
    : raw.split(/\n+/).filter((block) => block.trim().length > 0).length;
  const lines = options.lineCount != null
    ? options.lineCount
    : raw.split(/\n/).length;

  return {
    words,
    charactersWithSpaces,
    charactersNoSpaces,
    paragraphs,
    lines,
    scope
  };
}

/**
 * Đếm đoạn văn có nội dung từ các khối DOM trong thân tài liệu.
 * @param {ParentNode | null | undefined} bodyEl
 */
export function countBlockParagraphs(bodyEl) {
  if (!bodyEl || typeof bodyEl.querySelectorAll !== "function") return 0;
  const blocks = bodyEl.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote");
  let count = 0;
  for (const el of blocks) {
    if (isFloatingShapeContent(el)) continue;
    // DOCX list paragraphs are rendered as <li><p>…</p></li>. Count the
    // paragraph, not both its paragraph and its list container.
    if ((el.tagName === "LI" || el.tagName === "BLOCKQUOTE") &&
        el.querySelector?.("p, h1, h2, h3, h4, h5, h6")) {
      continue;
    }
    const value = (el.innerText != null ? el.innerText : el.textContent) || "";
    if (String(value).trim()) count += 1;
  }
  return count;
}

/**
 * Đếm số dòng đang hiển thị theo khung chữ thực tế, thay vì coi mỗi mục
 * innerText là một dòng. Số dòng thay đổi theo độ rộng trang và font hiện tại.
 * @param {ParentNode | null | undefined} bodyEl
 * @returns {number | null} null khi DOM không hỗ trợ đo hình học
 */
export function countBlockLines(bodyEl) {
  if (!bodyEl || typeof bodyEl.querySelectorAll !== "function") return null;
  const blocks = bodyEl.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, blockquote");
  let count = 0;
  let measuredAny = false;
  for (const el of blocks) {
    if (isFloatingShapeContent(el)) continue;
    if ((el.tagName === "LI" || el.tagName === "BLOCKQUOTE") &&
        el.querySelector?.("p, h1, h2, h3, h4, h5, h6")) continue;
    if (el.classList?.contains("vno-section-break") || el.hasAttribute?.("data-vno-section-break") ||
        el.hasAttribute?.("data-vno-auto-page-gap")) continue;
    const ownerDocument = el.ownerDocument || (typeof document !== "undefined" ? document : null);
    if (!ownerDocument || typeof ownerDocument.createRange !== "function") return null;
    const range = ownerDocument.createRange();
    try {
      range.selectNodeContents(el);
      const rects = Array.from(range.getClientRects?.() || [])
        .filter((rect) => rect.width > 0 && rect.height > 0);
      if (rects.length) {
        measuredAny = true;
        count += new Set(rects.map((rect) => Math.round(rect.top * 100) / 100)).size;
      } else if (el.getBoundingClientRect?.().height > 0) {
        measuredAny = true;
        count += 1;
      }
    } catch {
      return null;
    }
  }
  return measuredAny ? count : null;
}

function alphaCounter(value, upper) {
  let number = Math.max(1, Math.trunc(value));
  let label = "";
  while (number > 0) {
    number -= 1;
    label = String.fromCharCode((upper ? 65 : 97) + (number % 26)) + label;
    number = Math.floor(number / 26);
  }
  return label;
}

function romanCounter(value, upper) {
  let number = Math.max(1, Math.trunc(value));
  if (number > 3999) return String(number);
  const pairs = [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let label = "";
  for (const [amount, symbol] of pairs) while (number >= amount) { label += symbol; number -= amount; }
  return upper ? label : label.toLowerCase();
}

/**
 * Word counts generated list labels as characters (numbered labels also count
 * as words), though browser innerText omits the ::marker text and its tab.
 * @param {ParentNode | null | undefined} bodyEl
 */
export function countListMarkerStats(bodyEl) {
  if (!bodyEl || typeof bodyEl.querySelectorAll !== "function") return { words: 0, charactersNoSpaces: 0, charactersWithSpaces: 0 };
  const items = bodyEl.querySelectorAll("li");
  let words = 0;
  let charactersNoSpaces = 0;
  let charactersWithSpaces = 0;
  for (const item of items) {
    if (isFloatingShapeContent(item)) continue;
    const list = item.parentElement;
    const ordered = String(list?.tagName || "").toUpperCase() === "OL";
    const unordered = String(list?.tagName || "").toUpperCase() === "UL";
    if (!ordered && !unordered) continue;
    let listStyle = list.getAttribute?.("type") || (ordered ? "decimal" : "disc");
    try {
      const computed = typeof getComputedStyle === "function" ? getComputedStyle(list).listStyleType : "";
      if (computed && computed !== "none") listStyle = computed;
      else if (computed === "none") continue;
      const markerContent = getComputedStyle(item, "::marker").content;
      if (markerContent && markerContent !== "normal" && markerContent !== "none") {
        const explicit = markerContent.replace(/^(?:["'])(.*)(?:["'])$/, "$1");
        if (explicit) {
          charactersNoSpaces += explicit.length;
          charactersWithSpaces += explicit.length + 1;
          if (/\d|[a-z]/i.test(explicit)) words += 1;
          continue;
        }
      }
    } catch { /* DOM shims and unsupported pseudo styles use the list tag defaults. */ }
    const siblings = Array.from(list.children || []).filter((child) => String(child.tagName || "").toUpperCase() === "LI");
    const itemIndex = Math.max(0, siblings.indexOf(item));
    const ordinal = Number(item.getAttribute?.("value")) || (Number(list.getAttribute?.("start")) || 1) + itemIndex;
    let label = "";
    if (ordered) {
      const style = String(listStyle).toLowerCase();
      if (style.includes("roman")) label = romanCounter(ordinal, style.startsWith("upper")) + ".";
      else if (style.includes("alpha") || style.includes("latin")) label = alphaCounter(ordinal, style.startsWith("upper")) + ".";
      else if (style === "none") continue;
      else label = `${Math.max(1, Math.trunc(ordinal))}.`;
      words += 1;
    } else {
      if (String(listStyle).toLowerCase() === "none") continue;
      label = "•";
    }
    charactersNoSpaces += label.length;
    charactersWithSpaces += label.length + 1;
  }
  return { words, charactersNoSpaces, charactersWithSpaces };
}

function formatNumber(value) {
  try {
    return Number(value || 0).toLocaleString("vi-VN");
  } catch {
    return String(value || 0);
  }
}

function localize(key, fallback) {
  const value = t(key);
  return value && value !== key ? value : fallback;
}

/**
 * Hộp thoại Đếm từ — thống kê từ, ký tự, đoạn văn, dòng.
 * @param {ReturnType<typeof countDocumentStats>} stats
 * @returns {Promise<ReturnType<typeof countDocumentStats>>}
 */
export function showWordCountDialog(stats) {
  const safeStats = stats && typeof stats === "object" ? stats : emptyStats();
  if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body) {
    return Promise.resolve(safeStats);
  }

  const existing = document.getElementById("vno-wordcount-overlay");
  if (existing?.parentNode) existing.parentNode.removeChild(existing);

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.id = "vno-wordcount-overlay";
    const scopeLabel = safeStats.scope === "selection"
      ? localize("writerDialogs.wordCount.scopeSelection", "Thống kê cho vùng đang chọn")
      : localize("writerDialogs.wordCount.scopeDocument", "Thống kê cho toàn bộ tài liệu");

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-wordcount-dialog" role="dialog" aria-modal="true" aria-labelledby="vno-wordcount-title" style="width: 420px;">
        <div class="vno-dialog-header">
          <span id="vno-wordcount-title">${localize("writerDialogs.wordCount.title", "Đếm từ")}</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="${localize("common.close", "Đóng")}" aria-label="${localize("common.close", "Đóng")}">&times;</button>
        </div>
        <div class="vno-dialog-body">
          <p class="vno-wordcount-scope" style="margin:0 0 12px;font-size:12px;color:var(--vno-text-muted);">${scopeLabel}</p>
          <table class="vno-wordcount-table" style="width:100%;border-collapse:collapse;font-size:13px;">
            <tbody>
              <tr>
                <th scope="row" style="text-align:left;padding:7px 8px;font-weight:500;border-bottom:1px solid var(--vno-border-default);">${localize("writerDialogs.wordCount.words", "Từ")}</th>
                <td data-stat="words" style="text-align:right;padding:7px 8px;font-variant-numeric:tabular-nums;border-bottom:1px solid var(--vno-border-default);">${formatNumber(safeStats.words)}</td>
              </tr>
              <tr>
                <th scope="row" style="text-align:left;padding:7px 8px;font-weight:500;border-bottom:1px solid var(--vno-border-default);">${localize("writerDialogs.wordCount.charsNoSpaces", "Ký tự (không khoảng trắng)")}</th>
                <td data-stat="charactersNoSpaces" style="text-align:right;padding:7px 8px;font-variant-numeric:tabular-nums;border-bottom:1px solid var(--vno-border-default);">${formatNumber(safeStats.charactersNoSpaces)}</td>
              </tr>
              <tr>
                <th scope="row" style="text-align:left;padding:7px 8px;font-weight:500;border-bottom:1px solid var(--vno-border-default);">${localize("writerDialogs.wordCount.charsWithSpaces", "Ký tự (có khoảng trắng)")}</th>
                <td data-stat="charactersWithSpaces" style="text-align:right;padding:7px 8px;font-variant-numeric:tabular-nums;border-bottom:1px solid var(--vno-border-default);">${formatNumber(safeStats.charactersWithSpaces)}</td>
              </tr>
              <tr>
                <th scope="row" style="text-align:left;padding:7px 8px;font-weight:500;border-bottom:1px solid var(--vno-border-default);">${localize("writerDialogs.wordCount.paragraphs", "Đoạn văn")}</th>
                <td data-stat="paragraphs" style="text-align:right;padding:7px 8px;font-variant-numeric:tabular-nums;border-bottom:1px solid var(--vno-border-default);">${formatNumber(safeStats.paragraphs)}</td>
              </tr>
              <tr>
                <th scope="row" style="text-align:left;padding:7px 8px;font-weight:500;">${localize("writerDialogs.wordCount.lines", "Dòng")}</th>
                <td data-stat="lines" style="text-align:right;padding:7px 8px;font-variant-numeric:tabular-nums;">${formatNumber(safeStats.lines)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="vno-dialog-footer">
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">${localize("common.close", "Đóng")}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const okBtn = overlay.querySelector(".vno-dialog-ok-btn");
    const closeBtn = overlay.querySelector(".vno-dialog-close-btn");

    const cleanup = () => {
      document.removeEventListener("keydown", onKeyDown);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (previousFocused && typeof previousFocused.focus === "function") previousFocused.focus();
      resolve(safeStats);
    };

    okBtn.addEventListener("click", cleanup);
    closeBtn.addEventListener("click", cleanup);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) cleanup();
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape" || event.key === "Enter") {
        event.preventDefault();
        cleanup();
      } else if (event.key === "Tab") {
        trapFocus(dialogBox, event);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    okBtn.focus();
  });
}
