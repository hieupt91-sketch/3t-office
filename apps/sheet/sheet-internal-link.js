/**
 * Liên kết nội bộ của VN Sheet: "#Trang!A1" hoặc "#'Trang 2'!B3:C5".
 * Dạng lưu trong ô (cellsData[].hyperlink); trong FODS dùng "#Trang.A1" (LibreOffice đổi sang location="Trang!A1" của XLSX).
 */

const REF = /^\$?[A-Za-z]{1,3}\$?\d{1,7}(?::\$?[A-Za-z]{1,3}\$?\d{1,7})?$/;

function needsQuote(name) {
  return !/^[A-Za-z_À-ỹ][A-Za-z0-9_À-ỹ]*$/.test(name);
}

function quoteName(name) {
  return needsQuote(name) ? `'${name.replace(/'/g, "''")}'` : name;
}

function unquoteName(raw) {
  const text = String(raw || "").replace(/^\$/, "");
  if (text.startsWith("'") && text.endsWith("'") && text.length >= 2) return text.slice(1, -1).replace(/''/g, "'");
  return text;
}

/** Tách "#Trang!A1" / "#Trang.A1" thành { sheet, ref }; null nếu không phải liên kết nội bộ hợp lệ. */
export function parseInternalLink(url) {
  const text = String(url || "").trim();
  if (!text.startsWith("#")) return null;
  const body = text.slice(1);
  let split = -1;
  if (body.startsWith("'") || body.startsWith("$'")) {
    const close = body.search(/'(?!')(?=[!.])/);
    if (close >= 0) split = close + 1;
  } else {
    split = Math.max(body.lastIndexOf("!"), body.lastIndexOf("."));
  }
  if (split <= 0) return null;
  const sheet = unquoteName(body.slice(0, split));
  const ref = body.slice(split + 1).trim();
  if (!sheet || !REF.test(ref)) return null;
  return { sheet, ref: ref.replace(/\$/g, "").toUpperCase() };
}

export function formatInternalLink(sheet, ref) {
  const cleanRef = String(ref || "").replace(/\$/g, "").trim().toUpperCase();
  if (!sheet || !REF.test(cleanRef)) return "";
  return `#${quoteName(sheet)}!${cleanRef}`;
}

/** Dạng ghi vào FODS ("#Trang.A1"). */
export function toFodsHref(url) {
  const parsed = parseInternalLink(url);
  return parsed ? `#${quoteName(parsed.sheet)}.${parsed.ref}` : "";
}

/** Từ href trong FODS về dạng lưu trong ô; "" nếu không phải liên kết nội bộ. */
export function fromFodsHref(href) {
  const parsed = parseInternalLink(href);
  return parsed ? formatInternalLink(parsed.sheet, parsed.ref) : "";
}
