// Sheet: tên bảng đến từ tệp (XLSX) chứa dấu nháy/thẻ HTML phải hiện nguyên văn trong hộp Định dạng bảng, không chèn được thuộc tính hay thẻ.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-tne-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const session = await launchApp("sheet", { localAppData: profile });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await new Promise(r => setTimeout(r, 2500));
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 120000 });
  const EVIL = 'x" data-pwn="1" onfocus="window.__pwned=1" y="';
  await ev(`(() => {
    const g = window.__vnoAppInstance.grid;
    ["A", "B"].forEach((c, i) => { g.setCellValue(c, 1, "H" + i); g.setCellValue(c, 2, i); g.setCellValue(c, 3, i + 1); });
    g.formatAsTable("tableBlue", { start: { c: "A", r: 1 }, end: { c: "B", r: 3 } }, false, { name: "Bang1" });
    g.selectCell("A", 2);
    g.getTableAtSelection().name = ${JSON.stringify(EVIL)};
  })()`);
  ev(`window.globalCommandBus.execute("sheet.style.formatAsTable")`).catch(() => {});
  await cdp.waitFor("document.querySelector('.vno-table-rename')", { timeoutMilliseconds: 20000 });
  const info = JSON.parse(await ev(`JSON.stringify({ value: document.querySelector('.vno-table-rename').value, injected: document.querySelector('.vno-table-rename').hasAttribute('data-pwn'), pwned: window.__pwned || 0 })`));
  check("Tên bảng có dấu nháy hiện nguyên văn trong ô đổi tên", info.value === EVIL, info.value);
  check("Không chèn được thuộc tính vào ô nhập", info.injected === false && info.pwned === 0, JSON.stringify(info));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close(); }
if (results.some(r => !r)) process.exit(1);
