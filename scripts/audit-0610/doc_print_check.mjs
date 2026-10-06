// In/xuat PDF khong qua hop thoai he dieu hanh: preparePrintDocument tra so trang that cua LibreOffice cho noi dung hien tai.
// Chay: node --experimental-websocket scripts/audit-0610/doc_print_check.mjs
import { launchApp } from "../../tests/live/cdp/session.mjs";

const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
let failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 200)); };
try {
  const ev = (expression, options) => session.cdp.evaluate(expression, options);
  const A = "window.__vnoAppInstance.adapter";
  await session.cdp.waitFor("!!(globalThis.globalUnoBridge && globalThis.globalUnoBridge.desktopApi && globalThis.globalUnoBridge.hasRealEngine)", { timeoutMilliseconds: 120000, intervalMilliseconds: 500 });
  const pages = async (html) => {
    await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML=${JSON.stringify(html)}; b.focus(); })()`);
    const result = await ev(`(async () => JSON.stringify(await globalThis.globalUnoBridge.preparePrintDocument('writer', ${A}._contentForExport(), 'kiemtra', null, true, null)))()`, { timeoutMilliseconds: 300000 });
    return JSON.parse(result);
  };
  const one = await pages("<p>Mot trang.</p>");
  rec("1 doan ngan = 1 trang", one.status === "ok" && one.pageCount === 1, one);
  const three = await pages('<p>A</p><p style="page-break-before:always">B</p><p style="page-break-before:always">C</p>');
  rec("2 ngat trang thu cong = 3 trang", three.pageCount === 3, three);
  const long = await pages(Array.from({ length: 80 }, (_, i) => `<p>Doan so ${i} cua van ban dai de kiem tra tu dong sang trang khi noi dung vuot qua mot trang giay A4 voi le chuan.</p>`).join(""));
  rec("80 doan dai (~2 dong, 14 pt, cach 6 pt) = 4..6 trang (tu sang trang)", long.pageCount >= 4 && long.pageCount <= 6, long);
  const table = await pages("<table border='1'>" + Array.from({ length: 60 }, (_, i) => `<tr><td>Hang ${i}</td><td>Gia tri ${i}</td></tr>`).join("") + "</table>");
  rec("Bang 60 hang tran nhieu trang", table.pageCount >= 2, table);
} catch (error) {
  failed += 1;
  console.log("FAIL | Loi chay |", String(error?.stack || error).slice(0, 300));
} finally {
  await session.close();
}
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);
