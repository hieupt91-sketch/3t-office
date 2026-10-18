// Sheet: Xóa quy tắc định dạng có điều kiện ở ô đã chọn (tách vùng) và cả trang tính; hoàn tác; lưu XLSX giữ các vùng còn lại.
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "clear-rules.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
let session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const { cdp } = session;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0", { timeoutMilliseconds: 120000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 600000 });
  const cells = () => ev(`(() => { const g = window.__vnoAppInstance.grid; const out = []; for (const r of g.getConditionalFormattingRules()) { const n = g._normalizeRange(r.range); for (let c = g.cols.indexOf(n.start.c); c <= g.cols.indexOf(n.end.c); c++) for (let row = n.start.r; row <= n.end.r; row++) out.push(g.cols[c] + row); } return JSON.stringify({ rules: g.getConditionalFormattingRules().length, covered: [...new Set(out)].sort() }); })()`).then(JSON.parse);
  await ev(`(() => { const g = window.__vnoAppInstance.grid; g.addConditionalFormattingRule({ start: { c: "A", r: 1 }, end: { c: "D", r: 4 } }, { type: "greaterThan", value: 5 }); })()`);
  let s = await cells();
  check("Một quy tắc phủ A1:D4 (16 ô)", s.rules === 1 && s.covered.length === 16, JSON.stringify(s));
  await ev(`(() => { const g = window.__vnoAppInstance.grid; g.selectCell("B", 2); g.selectCell("C", 3, true); })()`);
  const done = await ev(`window.globalCommandBus.execute("sheet.format.clearRulesSelection")`);
  s = await cells();
  const hole = ["B2", "B3", "C2", "C3"];
  check("Xóa ở ô đã chọn: 12 ô còn lại, 4 ô giữa bị gỡ", done !== false && s.covered.length === 12 && hole.every(c => !s.covered.includes(c)) && s.covered.includes("A1") && s.covered.includes("D4"), JSON.stringify({ done, rules: s.rules, n: s.covered.length }));
  await ev(`window.__vnoAppInstance.grid.undo()`);
  s = await cells();
  check("Hoàn tác trả lại quy tắc nguyên vẹn", s.rules === 1 && s.covered.length === 16, JSON.stringify({ rules: s.rules, n: s.covered.length }));
  // Vùng chọn ngoài quy tắc: không làm gì
  await ev(`(() => { const g = window.__vnoAppInstance.grid; g.selectCell("H", 10); })()`);
  const none = await ev(`window.globalCommandBus.execute("sheet.format.clearRulesSelection")`);
  s = await cells();
  check("Vùng chọn không giao quy tắc: không đổi gì", s.rules === 1 && s.covered.length === 16, `${none} ${s.rules}`);
  // Cắt lần nữa rồi lưu XLSX để kiểm các vùng còn lại
  await ev(`(() => { const g = window.__vnoAppInstance.grid; g.selectCell("B", 2); g.selectCell("C", 3, true); })()`);
  await ev(`window.globalCommandBus.execute("sheet.format.clearRulesSelection")`);
  await ev(`window.__vnoAppInstance.adapter.isDirty = true`);
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("sheet", window.__vnoAppInstance.adapter.serializeToFods(), ${JSON.stringify(file)}, null)`);
  check("Lưu XLSX", saved?.status === "ok", JSON.stringify(saved).slice(0, 60));
  await new Promise(r => setTimeout(r, 800));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const { cdp } = session;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 600000 });
  const s = JSON.parse(await ev(`(() => { const g = window.__vnoAppInstance.grid; const out = []; for (const r of g.getConditionalFormattingRules()) { const n = g._normalizeRange(r.range); for (let c = g.cols.indexOf(n.start.c); c <= g.cols.indexOf(n.end.c); c++) for (let row = n.start.r; row <= n.end.r; row++) out.push(g.cols[c] + row); } return JSON.stringify({ rules: g.getConditionalFormattingRules().length, covered: [...new Set(out)].filter(x => /^[A-D][1-4]$/.test(x)).sort() }); })()`));
  check("Mở lại: vẫn 12 ô trong A1:D4 có quy tắc, 4 ô giữa không", s.covered.length === 12 && !["B2", "B3", "C2", "C3"].some(c => s.covered.includes(c)), JSON.stringify(s));
  await ev(`window.globalCommandBus.execute("sheet.format.clearRulesSheet")`);
  const left = await ev(`window.__vnoAppInstance.grid.getConditionalFormattingRules().length`);
  check("Xóa cả trang tính: hết quy tắc", left === 0, String(left));
  await ev(`window.__vnoAppInstance.grid.undo()`);
  check("Hoàn tác xóa cả trang: quy tắc trở lại", (await ev(`window.__vnoAppInstance.grid.getConditionalFormattingRules().length`)) > 0);
} catch (error) {
  check("Mở lại không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
