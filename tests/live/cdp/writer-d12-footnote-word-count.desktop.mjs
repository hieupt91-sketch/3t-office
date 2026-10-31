import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const fixture = path.join(root, "tests/fixtures/real-office-samples/sample-writer-footnotes.docx");
const evidenceRoot = process.env.VNO_Q67_EVIDENCE || path.join("E:\\VNOffice-briefs\\logs", "Q67-evidence");
fs.mkdirSync(evidenceRoot, { recursive: true });
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("writer", { filePath: fixture });
try {
  const { cdp } = session;
  await cdp.waitFor("document.querySelector('.vno-writer-footnotes-container') && document.querySelector('.vno-writer-body')?.innerText.trim().length", { timeoutMilliseconds: 180000 });
  const actual = JSON.parse(await cdp.evaluate(`(() => {
    const adapter=window.__vnoAppInstance.adapter;
    const stats=adapter.getWordCountStats();
    const body=document.querySelector('.vno-writer-body');
    return JSON.stringify({words:stats.words,bodyText:body.innerText.slice(0,70),footnotes:[...body.querySelectorAll('.vno-footnote-item .vno-note-text')].map(x=>x.innerText)});
  })()`));
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const screenshot = path.join(evidenceRoot, "q67-d12-after-reopen.png");
  fs.writeFileSync(screenshot, Buffer.from(shot.result.data, "base64"));
  console.log(`SCREENSHOT | ${screenshot}`);
  const oracleScript = path.join(root, "tests/live/cdp/writer-d12-word-readonly.ps1");
  const oracle = JSON.parse(execFileSync("powershell", ["-NoProfile", "-File", oracleScript, "-Path", fixture], { encoding: "utf8", timeout: 90000 }).trim());
  check("Có chú thích chân trang trong tài liệu mở lại", actual.footnotes.length > 0, JSON.stringify({footnotes:actual.footnotes.length}));
  check("Bộ đếm Writer khớp Word COM có tính chú thích", actual.words === oracle.wordsWithNotes, JSON.stringify({writer:actual.words,wordBody:oracle.wordsBody,wordWithNotes:oracle.wordsWithNotes,footnoteWords:actual.footnotes}));
  check("Đối chiếu Word COM cho cả hai chế độ đếm", oracle.wordsWithNotes >= oracle.wordsBody && oracle.wordsWithNotes > 0, JSON.stringify(oracle));
  console.log(`D12 count evidence | Writer=${actual.words} WordBody=${oracle.wordsBody} WordWithNotes=${oracle.wordsWithNotes}`);
} catch (error) {
  check("Không phát sinh ngoại lệ CDP/Word COM", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((pass) => !pass)) process.exit(1);
console.log(`D12 footnote word count: ${checks.length}/${checks.length} PASS`);
