import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "vno-word-tabs-import-"));
const docxPath = path.join(outputDir, "word-tabs.docx");
let session = null;

try {
  execFileSync("powershell", ["-NoProfile", "-File", path.join(scriptDir, "writer-tabs-word-readonly.ps1"), "-Mode", "Create", "-Path", docxPath], { encoding: "utf8", timeout: 60000 });
  check("Word COM ẩn tạo tài liệu có hai điểm dừng Tab", fs.existsSync(docxPath), docxPath);
  session = await launchApp("writer", { filePath: docxPath });
  const { cdp } = session;
  const ev = expression => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
  await cdp.waitFor("!!document.querySelector('.vno-writer-body p')?.textContent?.includes('Tab giua')", { timeoutMilliseconds: 45000 });
  const imported = await ev(`(() => { const p=document.querySelector('.vno-writer-body p'); return {text:p?.textContent || '', tabs:p?.dataset?.vnoTabs || ''}; })()`);
  check("Mở tệp do Word tạo khôi phục metadata w:tabs vào đoạn tương ứng", /Tab giua/.test(imported.text) && /7.*c.*n/.test(imported.tabs) && /14.*r.*d/.test(imported.tabs), JSON.stringify(imported));
  await click(cdp, ".vno-writer-body p");
  await click(cdp, '[data-command="writer.format.paragraphDialog"]');
  await sleep(250);
  await click(cdp, "#vno-para-tabs-btn");
  await sleep(200);
  const list = await ev(`(() => [...document.querySelectorAll('#vno-tabs-list option')].map(x=>x.textContent))()`);
  check("Dialog hiện lại hai vị trí Word, căn lề và leader chính xác", list.length === 2 && /7/.test(list[0]) && /Giữa/.test(list[0]) && /14/.test(list[1]) && /Phải/.test(list[1]) && /dẫn/.test(list[1]), JSON.stringify(list));
} catch (error) {
  check("Word → Writer import CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  if (session) await session.close();
}

if (checks.some(item => !item.pass)) process.exit(1);
console.log(`Writer Word tabs import desktop CDP: ${checks.length}/${checks.length} PASS`);
