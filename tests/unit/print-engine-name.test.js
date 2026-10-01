// Kiem tra nhan bo dung trang in khong lo ten thu vien ben trong.
import { engineDisplayName } from "../../platform/print/print-dialog.js";

export async function runPrintEngineNameTests() {
  const results = [];
  const check = (name, condition, detail = "") => results.push({ name, pass: Boolean(condition), error: condition ? "" : detail });
  const banned = /libre\s?office|soffice|openoffice|microsoft|powerpoint|\bwps\b|(?<![-\w])(?:word|excel)(?![-\w])/i;

  for (const id of ["LibreOffice", "libreoffice", "soffice.bin", "OpenOffice"]) {
    const shown = engineDisplayName(id);
    check(
      `Bộ dựng nội bộ "${id}" hiển thị trung tính, không lộ tên thư viện`,
      !banned.test(shown) && shown.includes("3T Office"),
      shown
    );
  }
  for (const id of ["Microsoft Office", "WPS", "Microsoft Word", "Kingsoft WPS"]) {
    const shown = engineDisplayName(id);
    check(
      `Bộ dựng ngoài "${id}" hiển thị trung tính, không nêu tên hãng`,
      !banned.test(shown),
      shown
    );
  }
  check("Chưa biết bộ dựng thì báo đang kiểm tra", engineDisplayName("") === "đang kiểm tra…", engineDisplayName(""));

  const source = await (await import("node:fs/promises")).readFile(
    new URL("../../platform/print/print-dialog.js", import.meta.url), "utf-8"
  );
  const visible = source.match(/(?:textContent\s*=|<span>|<p[^>]*>)[^\n]*/g) || [];
  const leaking = visible.filter(line => banned.test(line) && !line.includes("banned") && !line.includes("engineDisplayName"));
  check(
    "Hộp thoại In không in thẳng tên thư viện ra giao diện",
    leaking.length === 0,
    leaking.slice(0, 2).join(" | ")
  );
  return results;
}
