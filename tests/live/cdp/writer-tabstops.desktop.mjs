// Writer: Dừng tab (lệnh writer.format.tabStops) -> lưu DOCX -> Word COM đọc TabStops (vị trí, căn, ký tự dẫn).
// Cần VNO_CDP_LOCALAPPDATA. Đọc lại bằng scripts/audit-0610/word_tabstops_readback.ps1.
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, insertText, sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const output = path.join(profile, "writer-tabstops.docx");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  await sleep(1500);
  await click(cdp, ".vno-writer-body");
  await insertText(cdp, "Muc luc");
  await cdp.evaluate(`document.execCommand('insertText', false, '\\t')`);
  await insertText(cdp, "12");
  await sleep(300);
  const applied = await cdp.evaluate(`window.__vnoAppInstance.adapter.applyTabStops([{ cm: 12, align: "r", leader: "d" }, { cm: 5, align: "l", leader: "n" }])`);
  check("Đặt 2 dừng tab (5 cm trái; 12 cm phải, dẫn chấm)", applied === true);
  const tabs = await cdp.evaluate(`document.querySelector('.vno-writer-body p, .vno-writer-body div')?.dataset?.vnoTabs || ''`);
  check("Đoạn mang data-vno-tabs đã sắp tăng dần", tabs === "5:l:n;12:r:d", tabs);
  const content = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  const result = await cdp.evaluate(
    `globalThis.globalUnoBridge.saveRealFileInPlace("writer", ${JSON.stringify(content)}, ${JSON.stringify(output)}, null)`,
    { timeoutMilliseconds: 1200000 },
  );
  check("Lưu DOCX", result?.status === "ok", JSON.stringify(result).slice(0, 100));
  console.log("OUT " + output);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
