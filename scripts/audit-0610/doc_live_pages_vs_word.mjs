// Compare VN Writer's live pagination with real Word page counts for the 43-file corpus.
// Run: node --experimental-websocket scripts/audit-0610/doc_live_pages_vs_word.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const wordTsv = "E:\\VNOffice-profiles\\word-pages-originals.tsv";
const roots = ["E:\\VN OFice\\file test\\landocx", "E:\\VN OFice\\file test\\lan-legacy"];
const reportPath = path.resolve("docs/AUDIT-DOC-LIVE-PAGES-0610.md");
const wordRows = new Map((await fs.readFile(wordTsv, "utf8")).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean).map(line => {
  const [name, pages, ...rest] = line.split("\t");
  return [name.toLowerCase(), { pages: /^\d+$/.test(pages) ? Number(pages) : null, note: rest.join(" ") }];
}));
const files = [];
for (const root of roots) for (const name of (await fs.readdir(root)).sort((a, b) => a.localeCompare(b, "en"))) {
  if (/\.(docx?)$/i.test(name) && !/^d10\./i.test(name)) files.push(path.join(root, name));
}
const rows = [];
for (const file of files) {
  const name = path.basename(file);
  const original = wordRows.get(name.toLowerCase());
  if (!original?.pages) { rows.push({ name, word: original?.note || "MISSING", app: "—", delta: "—", breaks: [], error: "Thiếu số trang Word hợp lệ trong TSV" }); continue; }
  let session;
  try {
    session = await launchApp("writer", { filePath: file });
    await session.cdp.waitFor("(() => { const a=window.__vnoAppInstance?.adapter; return !!a?._sourcePath && !!document.querySelector('.vno-writer-body') && (document.querySelector('.vno-writer-body')?.innerText || '').length > 0 && Number.isFinite(a._livePageCount); })()", { timeoutMilliseconds: 600000, intervalMilliseconds: 1000 });
    await new Promise(resolve => setTimeout(resolve, 4000));
    const result = await session.cdp.evaluate(`(() => { const a=window.__vnoAppInstance?.adapter; const body=document.querySelector('.vno-writer-body'); return {pages:a?._livePageCount, breaks:Array.from(body?.querySelectorAll('[data-vno-auto-page-gap]')||[]).map(g=>(g.nextElementSibling?.innerText||g.nextElementSibling?.textContent||'').trim().replace(/\\s+/g,' ').slice(0,100))}; })()`);
    const app = Number(result?.pages);
    rows.push({ name, word: original.pages, app: Number.isFinite(app) ? app : "—", delta: Number.isFinite(app) ? app - original.pages : "—", breaks: result?.breaks || [], error: Number.isFinite(app) ? "" : "_livePageCount không hợp lệ" });
    console.log(`${name}\tWord ${original.pages}\tApp ${app}\tΔ ${Number.isFinite(app) ? app - original.pages : "—"}`);
  } catch (error) {
    rows.push({ name, word: original.pages, app: "—", delta: "—", breaks: [], error: String(error).replace(/\s+/g, " ").slice(0, 180) });
    console.log(`${name}\tERROR\t${String(error).replace(/\s+/g, " ").slice(0, 150)}`);
  } finally { try { await session?.close(); } catch {} }
}

const measured = rows.filter(r => typeof r.app === "number");
const exact = measured.filter(r => r.delta === 0).length;
const overOne = measured.filter(r => Math.abs(r.delta) > 1);
const out = [
  "# Audit VN Writer: số trang hiển thị so với Word thật — 06/10/2026", "",
  "Phương pháp: mở từng DOC/DOCX bằng `launchApp('writer', { filePath })`; đợi body nạp và `_livePageCount` hợp lệ, chờ thêm 4 giây rồi đọc `_livePageCount` qua CDP. Số Word lấy từ `E:\\VNOffice-profiles\\word-pages-originals.tsv` (đo Word thật); bỏ `d10.docx` theo yêu cầu. Không lưu/chỉnh tài liệu corpus.", "",
  `Kết quả: ${exact}/${measured.length} khớp tuyệt đối (${measured.length ? (100 * exact / measured.length).toFixed(1) : "0.0"}%); ${overOne.length} tài liệu lệch trên 1 trang; ${rows.length - measured.length} lỗi/thiếu số đo. Mục tiêu: ≥90% khớp và không lệch quá 1 trang.`, "",
  "| Tài liệu | Word gốc | App trước | App sau | Chênh sau (App − Word) |", "|---|---:|---:|---:|---:|",
  ...rows.map(r => `| ${r.name} | ${r.word} | ${r.app} | ${r.app} | ${r.delta} |`), "",
  "## Chẩn đoán các trường hợp lệch", "",
  rows.filter(r => typeof r.app === "number" && r.delta !== 0).length ? "Vị trí ngắt do bộ phân trang app ghi nhận (đoạn đầu trang, rút gọn):" : "Không có trường hợp lệch trang để chẩn đoán.",
  ...rows.filter(r => typeof r.app === "number" && r.delta !== 0).flatMap(r => [`- **${r.name}**: lệch ${r.delta > 0 ? "+" : ""}${r.delta}; ngắt đầu trang trong app: ${r.breaks.map(x => `“${x || "[khối không có chữ]"}”`).join("; ") || "không có gap tự động"}. Số trang tổng hợp không đủ xác định ngắt tương ứng của Word; cần đối chiếu trực quan hai bản tại các vị trí trên trước khi quy nguyên nhân font/khoảng cách/bảng/ảnh/header-footer. Chưa sửa mã khi chưa có bằng chứng vị trí ngắt tương ứng.`]),
  ...rows.filter(r => r.error).map(r => `- **${r.name}**: BLOCKED đo app — ${r.error}.`), "",
  "## Quyết định sửa mã", "",
  "Chưa sửa `apps/writer`/`adapters/libreoffice/writer`: d24 có nhiều `Ngắt mục (Trang tiếp theo)`, các khối không có chữ (khả năng là ảnh neo) và nội dung catalogue có bảng/ảnh. Word COM `GoTo(page)` mở được tệp nhưng không đọc ra mốc chữ đáng tin cậy ở hầu hết đầu trang, vì nhiều trang bắt đầu bởi đối tượng không văn bản; do đó chưa thể gán chính xác hai trang chênh cho font, khoảng cách, bảng, ảnh hay header/footer. Nơi nghi ngờ để điều tra tiếp: `WriterAdapter._recomputeLivePagination()` tại `adapters/libreoffice/writer/writer-adapter.js` (ước lượng khối và xử lý ngắt mục/ảnh/bảng). Không đổi mã khi chưa có bằng chứng vị trí ghép cặp. Không có thay đổi tính năng UI; hướng dẫn/i18n không phát sinh.", "",
  "Handoff: kết quả và lệnh tái chạy nằm trong ticket D21; corpus chỉ đọc. Trạng thái kiểm chứng: phép đo thực thi bởi script này; bảng ghi riêng từng tài liệu."
];
await fs.mkdir(path.dirname(reportPath), { recursive: true });
await fs.writeFile(reportPath, out.join("\n") + "\n", "utf8");
console.log(`REPORT\t${reportPath}\t${exact}/${measured.length} exact; ${overOne.length} over 1 page`);
