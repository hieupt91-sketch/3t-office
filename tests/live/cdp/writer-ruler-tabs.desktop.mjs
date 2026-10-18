// Writer: nút loại dừng tab ở góc thước + nhấp thước đặt dừng tab (phải) + kéo ra ngoài thước để xóa; lưu DOCX.
// Cần VNO_CDP_LOCALAPPDATA. Đọc lại bằng scripts/audit-0610/word_tabstops_readback.ps1.
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, insertText, mouseClick, sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const output = path.join(profile, "writer-ruler-tabs.docx");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const boxOf = (selector) => cdp.evaluate(`(() => { const el = ${selector}; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, w: r.width, h: r.height }; })()`);
try {
  await sleep(1500);
  await click(cdp, ".vno-writer-body");
  await insertText(cdp, "Muc luc");
  await cdp.evaluate(`document.execCommand('insertText', false, '\\t')`);
  await insertText(cdp, "12");
  await sleep(500);
  const btn = await boxOf(`document.querySelector('.vno-ruler-tab-kind')`);
  check("Có nút loại dừng tab ở góc thước", !!btn && btn.w > 10 && btn.h > 10);
  await mouseClick(cdp, btn.x, btn.y); // Trái -> Giữa
  await sleep(150);
  await mouseClick(cdp, btn.x, btn.y); // Giữa -> Phải
  await sleep(150);
  const label = await cdp.evaluate(`document.querySelector('.vno-ruler-tab-kind').title`);
  check("Nhấp 2 lần: loại là Phải", /Phải/.test(label), label);
  const scale = await boxOf(`document.querySelector('.vno-ruler-scale')`);
  await mouseClick(cdp, scale.left + scale.w * 0.6, scale.y);
  await sleep(500);
  const tabs = await cdp.evaluate(`document.querySelector('.vno-writer-body p')?.dataset?.vnoTabs || ''`);
  check("Nhấp thước đặt dừng tab PHẢI", /^\d+(\.\d+)?:r:n$/.test(tabs), tabs);
  const icons = await cdp.evaluate(`[...document.querySelectorAll('.vno-ruler-tab-stop')].map(e => e.textContent).join(',')`);
  check("Thước vẽ dấu dừng tab phải", icons === "┘", icons);
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
