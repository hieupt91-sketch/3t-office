import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-q67-d5-"));
const evidenceRoot = process.env.VNO_Q67_EVIDENCE || path.join("E:\\VNOffice-briefs\\logs", "Q67-evidence");
fs.mkdirSync(evidenceRoot, { recursive: true });
const docxPath = path.join(runRoot, "q67-d5-break.docx");
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const capture = async (session, name) => {
  const shot = await session.cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const file = path.join(evidenceRoot, name);
  fs.writeFileSync(file, Buffer.from(shot.result.data, "base64"));
  console.log(`SCREENSHOT | ${file}`);
};

let first;
let reopened;
try {
  first = await launchApp("writer", { localAppData: path.join(runRoot, "localappdata-before") });
  await first.cdp.evaluate(`(() => {
    const body=document.querySelector('.vno-writer-body');
    body.innerHTML='<p>Content before the page break.</p>'
      + '<p data-vno-page-break="true" style="page-break-before:always;break-before:page"><br></p>'
      + '<p>Content after the page break.</p>';
    window.__vnoAppInstance.adapter.isDirty=true;
  })()`);
  const before = JSON.parse(await first.cdp.evaluate(`(() => { const b=document.querySelector('.vno-writer-body'); const m=b.querySelector('[data-vno-page-break="true"]'); return JSON.stringify({pageContainers:document.querySelectorAll('.vno-writer-page').length,markers:b.querySelectorAll('[data-vno-page-break="true"]').length,bodyHeight:b.getBoundingClientRect().height,breakY:m.getBoundingClientRect().top-b.getBoundingClientRect().top}); })()`));
  await capture(first, "q67-d5-before-save.png");
  const saved = await first.cdp.evaluate(`(async () => await globalThis.globalUnoBridge.saveRealFileInPlace('writer', window.__vnoAppInstance.adapter._contentForExport(), ${JSON.stringify(docxPath)}, null))()`, { awaitPromise: true, timeoutMilliseconds: 90000 });
  check("Lưu DOCX có dấu ngắt trang", saved?.status === "ok", JSON.stringify(saved));
  const oracleScript = path.join(root, "scripts/audit-0610/word_author_report_readback.ps1");
  const oracle = JSON.parse(execFileSync("powershell", ["-NoProfile", "-File", oracleScript, "-Path", docxPath], { encoding: "utf8", timeout: 90000 }).trim());
  check("Word COM ẩn phân trang thành hai trang", oracle.pages === 2 && oracle.pageBreaks >= 1, JSON.stringify({pages:oracle.pages,pageBreaks:oracle.pageBreaks}));
  await first.close(); first = null;

  reopened = await launchApp("writer", { filePath: docxPath, localAppData: path.join(runRoot, "localappdata-after") });
  await reopened.cdp.waitFor("document.querySelector('.vno-writer-body')?.innerText.includes('Content after the page break')", { timeoutMilliseconds: 180000 });
  const after = JSON.parse(await reopened.cdp.evaluate(`(() => { const b=document.querySelector('.vno-writer-body'); const m=b.querySelector('[data-vno-page-break="true"]')||b.querySelector('[style*="page-break-before"]'); return JSON.stringify({pageContainers:document.querySelectorAll('.vno-writer-page').length,markers:b.querySelectorAll('[data-vno-page-break="true"]').length,breakStyles:[...b.querySelectorAll('[style*="page-break-before"],[style*="break-before"]')].map(x=>x.getAttribute('style')),bodyHeight:b.getBoundingClientRect().height,breakY:m?m.getBoundingClientRect().top-b.getBoundingClientRect().top:null,text:b.innerText.slice(-80)}); })()`));
  await capture(reopened, "q67-d5-after-reopen.png");
  check("Mở lại giữ nội dung và vị trí ngắt tương đối trong cùng vùng soạn", after.text.includes("Content after the page break") && (after.markers + after.breakStyles.length) > 0, JSON.stringify(after));
  console.log(`D5 architecture evidence | before=${JSON.stringify(before)} after=${JSON.stringify(after)} Word=${JSON.stringify({pages:oracle.pages,pageBreaks:oracle.pageBreaks})}`);
} catch (error) {
  check("Không phát sinh ngoại lệ CDP/Word COM", false, error.stack || error.message);
} finally {
  await reopened?.close().catch(() => {}); await first?.close().catch(() => {});
  console.log(`ARTIFACTS | ${runRoot}`);
}
if (checks.some((pass) => !pass)) process.exit(1);
console.log(`D5 page-break inspection: ${checks.length}/${checks.length} PASS`);
