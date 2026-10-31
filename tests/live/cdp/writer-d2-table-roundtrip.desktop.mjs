import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import { readZipEntry } from "../../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const runRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-q67-d2-"));
const evidenceRoot = process.env.VNO_Q67_EVIDENCE || path.join("E:\\VNOffice-briefs\\logs", "Q67-evidence");
fs.mkdirSync(evidenceRoot, { recursive: true });
const docxPath = path.join(runRoot, "q67-d2-table.docx");
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
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
  const before = JSON.parse(await first.cdp.evaluate(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    adapter.insertTable(4, 3);
    const table = document.querySelector('.vno-writer-body table');
    [...table.rows].forEach((row, r) => [...row.cells].forEach((cell, c) => { cell.textContent = ['ID', 'Item', 'Note'][c] + ' ' + (r + 1); }));
    const cell = table.rows[0].cells[0];
    return JSON.stringify({width: table.getBoundingClientRect().width, bodyWidth: document.querySelector('.vno-writer-body').getBoundingClientRect().width,
      border: getComputedStyle(cell).borderTop, html: adapter._contentForExport()});
  })()`));
  await capture(first, "q67-d2-before-save.png");
  check("Bảng mới phủ vùng soạn và có viền trước lưu", before.width >= before.bodyWidth * 0.95 && !/none|0px/.test(before.border), `table=${before.width}px body=${before.bodyWidth}px border=${before.border}`);
  const saved = await first.cdp.evaluate(`(async () => await globalThis.globalUnoBridge.saveRealFileInPlace('writer', window.__vnoAppInstance.adapter._contentForExport(), ${JSON.stringify(docxPath)}, null))()`, { awaitPromise: true, timeoutMilliseconds: 90000 });
  check("Lưu DOCX qua luồng ứng dụng", saved?.status === "ok" && fs.existsSync(docxPath), JSON.stringify(saved));
  const oracleScript = path.join(root, "tests/live/cdp/writer-table-properties-word-readonly.ps1");
  const oracle = JSON.parse(execFileSync("powershell", ["-NoProfile", "-File", oracleScript, "-Path", docxPath], { encoding: "utf8", timeout: 90000 }).trim());
  const docXml = readZipEntry(docxPath, "word/document.xml")?.toString("utf8") || "";
  const borders = [...docXml.matchAll(/<w:tcBorders\b[^>]*>([\s\S]*?)<\/w:tcBorders>/gi)].map((match) => match[1]);
  check("Word COM và OOXML đọc bảng 4 hàng, đủ bề rộng và có viền", oracle.rowsByTable?.[0] === 4 && oracle.ooxmlPreferredWidth >= 6000
    && borders.length >= 12 && borders.every((border) => /w:val="single"/i.test(border)), JSON.stringify({ oracle, borderCells: borders.length, borderSample: borders[0] }));
  await first.close();
  first = null;

  reopened = await launchApp("writer", { filePath: docxPath, localAppData: path.join(runRoot, "localappdata-after") });
  await reopened.cdp.waitFor("!!document.querySelector('.vno-writer-body table')");
  const after = JSON.parse(await reopened.cdp.evaluate(`(() => {
    const table = document.querySelector('.vno-writer-body table');
    const cell = table?.rows?.[0]?.cells?.[0];
    return JSON.stringify({width: table?.getBoundingClientRect().width, bodyWidth: document.querySelector('.vno-writer-body').getBoundingClientRect().width,
      border: cell ? getComputedStyle(cell).borderTop : '', shadow: cell ? getComputedStyle(cell).boxShadow : '', cells: table?.rows?.length});
  })()`));
  await capture(reopened, "q67-d2-after-reopen.png");
  check("Mở lại giữ bề rộng và viền bảng", after.cells === 4 && after.width >= after.bodyWidth * 0.95
    && (!/none|0px/.test(after.border) || after.shadow !== "none"), `table=${after.width}px body=${after.bodyWidth}px border=${after.border} shadow=${after.shadow}`);
} catch (error) {
  check("Không phát sinh ngoại lệ CDP", false, error.stack || error.message);
} finally {
  await reopened?.close().catch(() => {});
  await first?.close().catch(() => {});
  fs.rmSync(runRoot, { recursive: true, force: true });
}
if (checks.some((pass) => !pass)) process.exit(1);
console.log(`D2 table round-trip: ${checks.length}/${checks.length} PASS`);
