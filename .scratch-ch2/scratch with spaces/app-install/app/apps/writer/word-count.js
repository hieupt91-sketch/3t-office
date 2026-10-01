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

/**
 * Đếm thống kê từ một chuỗi văn bản thuần.
 * Từ tiếng Việt: tách theo khoảng trắng, bỏ token rỗng.
 * @param {string} text
 * @param {{ scope?: string, paragraphCount?: number, lineCount?: number }} [options]
 */
export function countDocumentStats(text, options = {}) {
  const scope = options.scope || "document";
  const raw = String(text ?? "").replace(/\u00a0/g, " ");
  const trimmed = raw.trim();
  if (!trimmed) {
    return emptyStats(scope);
  }

  const words = trimmed.split(/\s+/).filter(Boolean).length;
  const charactersWithSpaces = raw.replace(/[\r\n\u2028\u2029]/g, "").length;
  const charactersNoSpaces = raw.replace(/\s+/g, "").length;
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
    const value = (el.innerText != null ? el.innerText : el.textContent) || "";
    if (String(value).trim()) count += 1;
  }
  return count;
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
