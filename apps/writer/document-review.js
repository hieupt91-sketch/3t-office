import { t } from "../../platform/i18n/i18n.js";

const BLOCK_TAGS = "p,h1,h2,h3,h4,h5,h6,li,blockquote,pre,table";

function decodeText(html) {
  if (typeof DOMParser !== "undefined") {
    return new DOMParser().parseFromString(`<body>${html}</body>`, "text/html").body.textContent || "";
  }
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function paragraphRecords(html) {
  const source = String(html || "");
  if (typeof DOMParser !== "undefined") {
    const body = new DOMParser().parseFromString(`<body>${source}</body>`, "text/html").body;
    const nodes = Array.from(body.querySelectorAll(BLOCK_TAGS)).filter(node => !node.parentElement?.closest?.(BLOCK_TAGS));
    if (nodes.length) return nodes.map(node => ({ html: node.outerHTML, text: normalizeText(node.textContent) }));
  }
  const records = [];
  const re = /<(p|h[1-6]|li|blockquote|pre|table)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
  let match;
  while ((match = re.exec(source))) records.push({ html: match[0], text: normalizeText(decodeText(match[0])) });
  return records.length ? records : [{ html: `<p>${source}</p>`, text: normalizeText(decodeText(source)) }];
}

function normalizeText(value) {
  return String(value || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function innerBlockHtml(blockHtml) {
  const match = String(blockHtml || "").match(/^<([a-z0-9]+)\b[^>]*>([\s\S]*)<\/\1\s*>$/i);
  return match ? match[2] : String(blockHtml || "");
}

function blockTag(blockHtml) {
  return String(blockHtml || "").match(/^<([a-z0-9]+)/i)?.[1]?.toLowerCase() || "p";
}

function reviewBlock(record, kind, author, date) {
  const tag = blockTag(record.html);
  const safeTag = /^(?:p|h[1-6]|li|blockquote|pre)$/.test(tag) ? tag : "p";
  const body = innerBlockHtml(record.html);
  return `<${safeTag}><${kind === "delete" ? "del" : "ins"} data-vno-change="${kind}" data-vno-author="${escapeAttr(author)}" data-vno-date="${escapeAttr(date)}"${kind === "delete" ? ' contenteditable="false"' : ""}>${body}</${kind === "delete" ? "del" : "ins"}></${safeTag}>`;
}

function escapeAttr(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * So sánh theo đoạn bằng LCS. Kết quả dùng chính marker revision mà đường lưu DOCX
 * hiện có đã chuyển thành w:ins/w:del native.
 */
export function buildParagraphComparison(originalHtml, revisedHtml, options = {}) {
  const original = paragraphRecords(originalHtml);
  const revised = paragraphRecords(revisedHtml);
  const rows = original.length + 1;
  const cols = revised.length + 1;
  if (rows * cols > 4_000_000) {
    throw new Error(t("writerReview.compareTooLarge", "Hai tài liệu có quá nhiều đoạn để so sánh an toàn trong phiên này."));
  }
  const lcs = Array.from({ length: rows }, () => new Uint32Array(cols));
  for (let i = original.length - 1; i >= 0; i -= 1) {
    for (let j = revised.length - 1; j >= 0; j -= 1) {
      lcs[i][j] = original[i].text === revised[j].text
        ? lcs[i + 1][j + 1] + 1
        : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const author = options.author || "3T Office";
  const date = options.date || new Date().toISOString();
  const output = [];
  let i = 0;
  let j = 0;
  let insertions = 0;
  let deletions = 0;
  while (i < original.length || j < revised.length) {
    if (i < original.length && j < revised.length && original[i].text === revised[j].text) {
      output.push(original[i].html);
      i += 1;
      j += 1;
    } else if (j < revised.length && (i >= original.length || lcs[i][j + 1] >= lcs[i + 1][j])) {
      output.push(reviewBlock(revised[j], "insert", author, date));
      insertions += 1;
      j += 1;
    } else {
      output.push(reviewBlock(original[i], "delete", author, date));
      deletions += 1;
      i += 1;
    }
  }
  return { html: output.join(""), insertions, deletions, changed: insertions + deletions > 0 };
}

function attr(xml, name) {
  return String(xml || "").match(new RegExp(`\\bw:${name}=["']([^"']*)["']`, "i"))?.[1] || "";
}

const PROTECTION_ALGORITHMS_BY_SID = {
  "4": "SHA-1",
  "12": "SHA-256",
  "13": "SHA-384",
  "14": "SHA-512"
};

function normalizeProtectionAlgorithm(value) {
  const normalized = String(value || "").toUpperCase().replace(/_/g, "-");
  if (/^SHA-?(?:1|256|384|512)$/.test(normalized)) {
    return normalized.replace(/^SHA(?=\d)/, "SHA-");
  }
  return "";
}

export function parseDocumentProtection(settingsXml) {
  const tag = String(settingsXml || "").match(/<w:documentProtection\b[^>]*\/?\s*>/i)?.[0] || "";
  if (!tag || /\bw:enforcement=["'](?:0|false|off)["']/i.test(tag)) return { mode: "none" };
  const edit = attr(tag, "edit");
  const mode = edit === "trackedChanges" ? "trackedChanges" : edit === "readOnly" ? "readOnly" : "none";
  if (mode === "none") return { mode };
  const algorithm = PROTECTION_ALGORITHMS_BY_SID[attr(tag, "cryptAlgorithmSid")]
    || normalizeProtectionAlgorithm(attr(tag, "algorithmName"));
  return {
    mode,
    algorithm,
    spinCount: Number(attr(tag, "cryptSpinCount") || attr(tag, "spinCount") || 0),
    hash: attr(tag, "hash") || attr(tag, "hashValue"),
    salt: attr(tag, "salt") || attr(tag, "saltValue")
  };
}

function bytesToBase64(bytes) {
  if (typeof btoa === "function") return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(""));
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(value) {
  if (!value) return new Uint8Array();
  const binary = typeof atob === "function" ? atob(value) : Buffer.from(value, "base64").toString("binary");
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function utf16le(value) {
  const bytes = new Uint8Array(String(value || "").length * 2);
  for (let i = 0; i < String(value || "").length; i += 1) {
    const code = String(value || "").charCodeAt(i);
    bytes[i * 2] = code & 0xff;
    bytes[i * 2 + 1] = code >>> 8;
  }
  return bytes;
}

function concatBytes(...parts) {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) { output.set(part, offset); offset += part.length; }
  return output;
}

async function protectionHash(password, salt, spinCount, cryptoApi, algorithm = "SHA-512") {
  if (!cryptoApi?.subtle) throw new Error(t("writerReview.cryptoUnavailable", "Máy này không cung cấp bộ băm mật khẩu cục bộ."));
  // ISO/IEC 29500 documentProtection prepends the decoded salt to the
  // UTF-16LE password. The initial hash is not part of spinCount.
  let hash = new Uint8Array(await cryptoApi.subtle.digest(algorithm, concatBytes(salt, utf16le(password))));
  for (let i = 0; i < spinCount; i += 1) {
    const counter = Uint8Array.of(i & 255, (i >>> 8) & 255, (i >>> 16) & 255, (i >>> 24) & 255);
    hash = new Uint8Array(await cryptoApi.subtle.digest(algorithm, concatBytes(hash, counter)));
  }
  return hash;
}

export async function createDocumentProtection(mode, password, options = {}) {
  if (!password) throw new Error(t("writerReview.passwordRequired", "Hãy nhập mật khẩu bỏ bảo vệ."));
  const cryptoApi = options.cryptoApi || globalThis.crypto;
  const salt = new Uint8Array(16);
  if (options.salt) salt.set(options.salt.slice(0, 16));
  else cryptoApi.getRandomValues(salt);
  const spinCount = Math.max(1, Number(options.spinCount) || 1000);
  const hash = await protectionHash(password, salt, spinCount, cryptoApi);
  return { mode, algorithm: "SHA-512", spinCount, hash: bytesToBase64(hash), salt: bytesToBase64(salt) };
}

export async function verifyDocumentProtection(password, protection, cryptoApi = globalThis.crypto) {
  if (!protection?.hash) return !password;
  const algorithm = normalizeProtectionAlgorithm(protection.algorithm);
  const spinCount = Number(protection.spinCount);
  if (!algorithm || !protection.salt || !Number.isInteger(spinCount) || spinCount < 0) return false;
  let actual;
  try {
    actual = await protectionHash(password, base64ToBytes(protection.salt), spinCount, cryptoApi, algorithm);
  } catch {
    return false;
  }
  const expected = base64ToBytes(protection.hash);
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < actual.length; i += 1) mismatch |= actual[i] ^ expected[i];
  return mismatch === 0;
}

export function documentProtectionMetadataComment(protection) {
  const payload = JSON.stringify({ version: 1, ...(protection || { mode: "none" }) });
  const hex = Array.from(new TextEncoder().encode(payload), byte => byte.toString(16).padStart(2, "0")).join("");
  return `<!--vno-document-protection-hex:${hex}-->`;
}

function dialogShell(title, body) {
  if (typeof document === "undefined" || !document.body) return null;
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay vno-writer-review-dialog";
  overlay.innerHTML = `<div class="vno-dialog-box" style="width:500px" role="dialog" aria-modal="true" aria-label="${escapeAttr(title)}">
    <div class="vno-dialog-header"><span>${title}</span><button class="vno-btn vno-btn-icon-only vno-dialog-close-btn" aria-label="${t("common.close", "Đóng")}">&times;</button></div>
    <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:10px">${body}<div class="vno-rule-error" role="alert" aria-live="assertive" style="color:#b91c1c;min-height:16px"></div></div>
    <div class="vno-dialog-footer"><button class="vno-btn vno-dialog-cancel-btn">${t("common.cancel", "Hủy bỏ")}</button><button class="vno-btn vno-btn-primary vno-dialog-apply-btn">${t("common.ok", "Đồng ý")}</button></div>
  </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

export function showDocumentProtectionDialog(current = { mode: "none" }) {
  return new Promise(resolve => {
    const removing = current.mode && current.mode !== "none";
    const overlay = dialogShell(
      removing ? t("writerReview.unprotectTitle", "Bỏ hạn chế chỉnh sửa") : t("writerReview.protectTitle", "Hạn chế chỉnh sửa"),
      removing
        ? `<p style="margin:0">${t("writerReview.unprotectHint", "Nhập mật khẩu đã đặt để cho phép chỉnh sửa bình thường.")}</p><label>${t("writerReview.password", "Mật khẩu")}<input id="vno-writer-unprotect-password" class="vno-dialog-input" type="password" autocomplete="off"></label>`
        : `<fieldset style="border:0;padding:0;margin:0"><legend>${t("writerReview.restrictionMode", "Kiểu hạn chế")}</legend><label style="display:block"><input type="radio" name="vno-protection-mode" value="trackedChanges" checked> ${t("writerReview.trackOnly", "Chỉ cho phép chỉnh sửa có theo dõi thay đổi")}</label><label style="display:block"><input type="radio" name="vno-protection-mode" value="readOnly"> ${t("writerReview.readOnly", "Chỉ đọc")}</label></fieldset><p style="margin:0;color:var(--vno-text-muted);font-size:12px">${t("writerReview.noOpenPassword", "Mật khẩu này chỉ dùng để bỏ hạn chế chỉnh sửa; không mã hóa và không tạo mật khẩu mở tệp.")}</p><label>${t("writerReview.password", "Mật khẩu")}<input id="vno-writer-protect-password" class="vno-dialog-input" type="password" autocomplete="new-password"></label><label>${t("writerReview.passwordConfirm", "Nhập lại mật khẩu")}<input id="vno-writer-protect-password-confirm" class="vno-dialog-input" type="password" autocomplete="new-password"></label>`
    );
    if (!overlay) { resolve(null); return; }
    const finish = value => { document.removeEventListener("keydown", onKey); overlay.remove(); resolve(value); };
    const apply = () => {
      const error = overlay.querySelector(".vno-rule-error");
      if (removing) {
        const password = overlay.querySelector("#vno-writer-unprotect-password").value;
        if (!password) { error.textContent = t("writerReview.passwordRequired", "Hãy nhập mật khẩu bỏ bảo vệ."); return; }
        finish({ action: "unprotect", password });
        return;
      }
      const password = overlay.querySelector("#vno-writer-protect-password").value;
      const confirm = overlay.querySelector("#vno-writer-protect-password-confirm").value;
      if (!password) { error.textContent = t("writerReview.passwordRequired", "Hãy nhập mật khẩu bỏ bảo vệ."); return; }
      if (password !== confirm) { error.textContent = t("writerReview.passwordMismatch", "Hai mật khẩu không khớp."); return; }
      finish({ action: "protect", mode: overlay.querySelector('input[name="vno-protection-mode"]:checked').value, password });
    };
    const onKey = event => { if (event.key === "Escape") finish(null); else if (event.key === "Enter") { event.preventDefault(); apply(); } };
    overlay.querySelector(".vno-dialog-apply-btn").addEventListener("click", apply);
    overlay.querySelector(".vno-dialog-cancel-btn").addEventListener("click", () => finish(null));
    overlay.querySelector(".vno-dialog-close-btn").addEventListener("click", () => finish(null));
    document.addEventListener("keydown", onKey);
    overlay.querySelector("input")?.focus();
  });
}
