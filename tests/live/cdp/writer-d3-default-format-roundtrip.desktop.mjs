import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { click } from "./actions.mjs";
import { launchApp } from "./session.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-q67-d3-"));
const evidenceRoot = process.env.VNO_Q67_EVIDENCE || path.join("E:\\VNOffice-briefs\\logs", "Q67-evidence");
fs.mkdirSync(evidenceRoot, { recursive: true });
const docxPath = path.join(runRoot, "q67-d3-defaults.docx");
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
  await click(first.cdp, ".vno-writer-body p");
  await first.cdp.evaluate(`(() => { const body=document.querySelector('.vno-writer-body'); body.innerHTML='<p>Document default format check</p>'; window.__vnoAppInstance.adapter.isDirty=true; })()`);
  const before = JSON.parse(await first.cdp.evaluate(`(() => {
    const p = document.querySelector('.vno-writer-body p'); const s = getComputedStyle(p);
    return JSON.stringify({family:s.fontFamily,size:s.fontSize,lineHeight:s.lineHeight});
  })()`));
  await capture(first, "q67-d3-before-save.png");
  check("Tài liệu mới hiển thị Times New Roman 14 pt", /Times New Roman/i.test(before.family) && Math.abs(parseFloat(before.size) - 18.6667) < 0.1, JSON.stringify(before));
  const saved = await first.cdp.evaluate(`(async () => await globalThis.globalUnoBridge.saveRealFileInPlace('writer', window.__vnoAppInstance.adapter._contentForExport(), ${JSON.stringify(docxPath)}, null))()`, { awaitPromise: true, timeoutMilliseconds: 90000 });
  check("Lưu DOCX qua luồng ứng dụng", saved?.status === "ok" && fs.existsSync(docxPath), JSON.stringify(saved));
  const oracleScript = path.join(root, "tests/live/cdp/writer-d3-word-readonly.ps1");
  const oracle = JSON.parse(execFileSync("powershell", ["-NoProfile", "-File", oracleScript, "-Path", docxPath], { encoding: "utf8", timeout: 90000 }).trim());
  check("Word COM đọc lại Times New Roman 14 pt và giãn dòng 1,5", /Times New Roman/i.test(oracle.font) && Math.abs(oracle.fontSize - 14) < 0.1 && oracle.lineSpacingRule === 1, JSON.stringify(oracle));
  await first.close(); first = null;

  reopened = await launchApp("writer", { filePath: docxPath, localAppData: path.join(runRoot, "localappdata-after") });
  await reopened.cdp.waitFor("document.querySelector('.vno-writer-body')?.innerText.includes('Document default format check')", { timeoutMilliseconds: 180000 });
  const after = JSON.parse(await reopened.cdp.evaluate(`(() => { const p=document.querySelector('.vno-writer-body p'); const s=getComputedStyle(p); return JSON.stringify({family:s.fontFamily,size:s.fontSize,lineHeight:s.lineHeight,text:p.innerText}); })()`));
  await capture(reopened, "q67-d3-after-reopen.png");
  check("Mở lại giữ Times New Roman 14 pt và văn bản", /Times New Roman/i.test(after.family) && Math.abs(parseFloat(after.size) - 18.6667) < 0.1 && after.text.includes("Document default"), JSON.stringify(after));
} catch (error) {
  check("Không phát sinh ngoại lệ CDP/Word COM", false, error.stack || error.message);
} finally {
  await reopened?.close().catch(() => {}); await first?.close().catch(() => {});
  console.log(`ARTIFACTS | ${runRoot}`);
}
if (checks.some((pass) => !pass)) process.exit(1);
console.log(`D3 defaults round-trip: ${checks.length}/${checks.length} PASS`);
