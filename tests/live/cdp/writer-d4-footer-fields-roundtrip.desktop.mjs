import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import { listZipEntries, readZipEntry } from "../../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-q67-d4-"));
const evidenceRoot = process.env.VNO_Q67_EVIDENCE || path.join("E:\\VNOffice-briefs\\logs", "Q67-evidence");
fs.mkdirSync(evidenceRoot, { recursive: true });
const docxPath = path.join(runRoot, "q67-d4-footer.docx");
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
  await first.cdp.evaluate(`(async () => {
    const body=document.querySelector('.vno-writer-body');
    body.innerHTML='<p>Footer field round-trip</p><p>Second page content</p>';
    window.__vnoAppInstance.adapter.isDirty=true;
    await globalCommandBus.execute('writer.footer.insert');
  })()`, { awaitPromise: true, timeoutMilliseconds: 60000 });
  const before = JSON.parse(await first.cdp.evaluate(`(() => { const f=document.querySelector('.vno-writer-footer'); return JSON.stringify({html:f?.innerHTML,text:f?.innerText}); })()`));
  await first.cdp.evaluate(`(() => { const v=document.querySelector('.vno-writer-viewport'); if(v) v.scrollTop=v.scrollHeight; })()`);
  await capture(first, "q67-d4-before-save.png");
  check("Trước lưu chân trang có PAGE và NUMPAGES", /data-vno-field="PAGE"/.test(before.html) && /data-vno-field="NUMPAGES"/.test(before.html), JSON.stringify(before));
  const saved = await first.cdp.evaluate(`(async () => await globalThis.globalUnoBridge.saveRealFileInPlace('writer', window.__vnoAppInstance.adapter._contentForExport(), ${JSON.stringify(docxPath)}, null))()`, { awaitPromise: true, timeoutMilliseconds: 90000 });
  check("Lưu DOCX qua luồng ứng dụng", saved?.status === "ok" && fs.existsSync(docxPath), JSON.stringify(saved));
  const footerEntry = listZipEntries(docxPath).find((entry) => /^word\/footer\d+\.xml$/i.test(entry.name));
  const footerXml = footerEntry ? readZipEntry(docxPath, footerEntry.name)?.toString("utf8") || "" : "";
  check("DOCX lưu hai trường OOXML động", /PAGE/.test(footerXml) && /NUMPAGES/.test(footerXml) && /w:fldChar/.test(footerXml) && /w:instrText/.test(footerXml), footerEntry?.name || "không có footer XML");
  const oracleScript = path.join(root, "scripts/audit-0610/word_author_report_readback.ps1");
  const oracle = JSON.parse(execFileSync("powershell", ["-NoProfile", "-File", oracleScript, "-Path", docxPath], { encoding: "utf8", timeout: 90000 }).trim());
  check("Word COM ẩn đọc hai trường trong chân trang", oracle.footerFields === 2, JSON.stringify({footerFields:oracle.footerFields,footer:oracle.footer}));
  await first.close(); first = null;

  reopened = await launchApp("writer", { filePath: docxPath, localAppData: path.join(runRoot, "localappdata-after") });
  await reopened.cdp.waitFor("document.querySelector('.vno-writer-footer')?.innerText.includes('Trang')", { timeoutMilliseconds: 180000 });
  const after = JSON.parse(await reopened.cdp.evaluate(`(() => { const f=document.querySelector('.vno-writer-footer'); return JSON.stringify({html:f?.innerHTML,text:f?.innerText}); })()`));
  await reopened.cdp.evaluate(`(() => { const v=document.querySelector('.vno-writer-viewport'); if(v) v.scrollTop=v.scrollHeight; })()`);
  await capture(reopened, "q67-d4-after-reopen.png");
  check("Mở lại giữ marker PAGE và NUMPAGES", /data-vno-field="PAGE"/.test(after.html) && /data-vno-field="NUMPAGES"/.test(after.html), JSON.stringify(after));
} catch (error) {
  check("Không phát sinh ngoại lệ CDP/Word COM", false, error.stack || error.message);
} finally {
  await reopened?.close().catch(() => {}); await first?.close().catch(() => {});
  console.log(`ARTIFACTS | ${runRoot}`);
}
if (checks.some((pass) => !pass)) process.exit(1);
console.log(`D4 footer fields round-trip: ${checks.length}/${checks.length} PASS`);
