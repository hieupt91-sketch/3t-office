const PAGE_RANGE_ERROR = "Phạm vi trang không hợp lệ. Nhập số trang từ 1 đến tổng số trang, ví dụ: 1-3,5.";

export function parsePageRange(value, totalPages) {
  const total = Number(totalPages);
  if (!Number.isInteger(total) || total < 1) {
    throw new Error("Không xác định được số trang của tài liệu.");
  }

  const input = String(value ?? "").trim();
  if (!input || /^(all|tất cả)$/i.test(input)) {
    return { pageRange: "", pages: null };
  }

  const requested = new Set();
  for (const rawPart of input.split(",")) {
    const part = rawPart.trim();
    const match = part.match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!match) throw new Error(PAGE_RANGE_ERROR);

    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end < start || end > total) throw new Error(PAGE_RANGE_ERROR);
    for (let page = start; page <= end; page += 1) requested.add(page);
  }

  if (!requested.size) throw new Error(PAGE_RANGE_ERROR);
  const pages = [...requested].sort((left, right) => left - right);
  const ranges = [];
  let first = pages[0];
  let previous = first;
  for (const page of pages.slice(1)) {
    if (page === previous + 1) {
      previous = page;
      continue;
    }
    ranges.push(first === previous ? String(first) : `${first}-${previous}`);
    first = previous = page;
  }
  ranges.push(first === previous ? String(first) : `${first}-${previous}`);
  return { pageRange: ranges.join(","), pages };
}

export function chooseDefaultPrinter(printers) {
  const list = Array.isArray(printers) ? printers.filter((printer) => printer && typeof printer.name === "string" && printer.name.trim()) : [];
  return list.find((printer) => printer.isDefault || printer.default)?.name || list[0]?.name || "";
}

export function getPrintErrorMessage(error) {
  const detail = typeof error === "string" ? error : error?.message;
  return detail
    ? `Không thể in tài liệu. ${detail}`
    : "Không thể in tài liệu. Hãy kiểm tra máy in đã bật, còn giấy và kết nối bình thường rồi thử lại.";
}
