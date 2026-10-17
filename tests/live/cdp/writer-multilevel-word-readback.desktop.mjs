import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { click, sleep } from "./actions.mjs";
import { launchApp } from "./session.mjs";

const profile = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-word-list-readback-"));
const tempRoot = path.resolve(os.tmpdir()) + path.sep;
const safeProfile = path.resolve(profile);
if (!safeProfile.startsWith(tempRoot)) throw new Error("Temporary profile escaped the system temp directory");
const source = path.join(profile, "word-gallery.docx");
const fixtureScript = path.join(path.dirname(fileURLToPath(import.meta.url)), "writer-multilevel-word-gallery-fixture.ps1");
const fixture = JSON.parse(execFileSync("powershell", ["-NoProfile", "-File", fixtureScript, "-Path", source], { encoding: "utf8", timeout: 60000 }).trim());
if (fixture.paragraphs.slice(0, 3).map(item => item.label).join("|") !== "1)|a)|i)") throw new Error("Word ListGalleries(3) fixture did not contain the expected three levels");
const session = await launchApp("writer", { filePath: source, localAppData: path.join(profile, "localappdata") });
const checks = [];
const check = (label, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${label}${detail ? ` | ${detail}` : ""}`); };
const ev = expression => session.cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body li') && document.querySelector('.vno-writer-body').innerText.includes('Muc mot')");
  await click(session.cdp, ".vno-writer-body li", 0);
  await click(session.cdp, '[data-dropdown-id="writer.para.multilevelList"]');
  await click(session.cdp, '[data-command-id="writer.para.defineMultilevelList"]');
  await session.cdp.waitFor("!!document.querySelector('#vno-ml-apply')");
  const values = [];
  for (const index of [0, 1, 2]) {
    if (index) await click(session.cdp, `[data-level="${index}"]`);
    values.push(await ev("({format:document.querySelector('#vno-ml-format').value,prefix:document.querySelector('#vno-ml-prefix').value,suffix:document.querySelector('#vno-ml-suffix').value,start:Number(document.querySelector('#vno-ml-start').value)})"));
  }
  check("Mở DOCX do Word ListGalleries(3) tạo và đọc định dạng ba cấp", values[0].format === "decimal" && values[0].suffix === ")" && values[1].format === "lowerLetter" && values[1].suffix === ")" && values[2].format === "lowerRoman" && values[2].suffix === ")", JSON.stringify(values));
  await click(session.cdp, ".vno-dialog-close-footer-btn");
} catch (error) { check("Đọc danh sách Word không phát sinh ngoại lệ", false, error.stack || error.message); }
finally { await session.close(); fs.rmSync(safeProfile, { recursive: true, force: true }); }
if (checks.some(value => !value)) process.exit(1);
console.log(`Word-generated multilevel readback CDP: ${checks.length}/${checks.length} PASS`);
