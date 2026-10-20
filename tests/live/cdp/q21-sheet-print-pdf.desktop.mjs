// Q21: Sheet print preview and PDF export through the desktop UI.
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { click, press } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to a fresh per-run profile.");
fs.mkdirSync(profile, { recursive: true });
const workbook = path.join(profile, "q21-print.xlsx");
execFileSync("python", ["-c", [
  "import openpyxl,sys",
  "w=openpyxl.Workbook();s=w.active;s.title='InHang'",
  "s.append(['Mã','Vùng','Nhân viên','Sản phẩm','SL','Đơn giá','Thành tiền','Ghi chú'])",
  "[s.append([i,'Bắc','NV1','Bút',i,10000,i*10000,'Kiểm tra in']) for i in range(1,41)]",
  "w.save(sys.argv[1])"
].join(";"), workbook], { stdio: "inherit" });
const session = await launchApp("sheet", { filePath: workbook, localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const results = [];
const check = (name, ok, detail = "") => {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  const { cdp } = session;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size >= 320 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await click(cdp, 'button[aria-label="In tài liệu (Ctrl+P)"]');
  await cdp.waitFor("document.querySelector('.vno-print-dialog')", { timeoutMilliseconds: 60000 });
  await cdp.waitFor("document.querySelector('.vno-print-preview-image, .vno-print-preview-error')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const preview = JSON.parse(await cdp.evaluate('JSON.stringify({pages:Number(document.querySelector(".vno-print-total")?.textContent||0),images:document.querySelectorAll(".vno-print-preview-image").length,error:document.querySelector(".vno-print-preview-error")?.textContent||""})'));
  check("Print toolbar opens rendered preview with pages", preview.pages > 0 && preview.images > 0 && !preview.error, JSON.stringify(preview));
  await press(cdp, "Escape");
  console.log("BLOCKED | Xuất PDF cần hộp thoại lưu tệp native; quy tắc Q21 chỉ cho thao tác CDP và cấm điều khiển OS.");
} catch (error) {
  check("Print preview/PDF flow completes", false, error.stack || error.message);
} finally {
  await session.close().catch(() => {});
}
const failed = results.filter(ok => !ok).length;
console.log(`SUMMARY ${results.length - failed}/${results.length} PASS | ${failed} FAIL`);
if (failed) process.exitCode = 1;
