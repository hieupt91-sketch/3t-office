// EXCEL-G1: định dạng có điều kiện đủ loại - tạo trong app desktop, lưu XLSX, (Excel 2016 đọc bằng PS riêng), mở lại.
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "excel-g1-roundtrip.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);
const check = (ok, msg, detail = "") => { if (!ok) throw new Error(`${msg}${detail ? " | " + detail : ""}`); console.log(`PASS | ${msg}${detail ? " | " + detail : ""}`); };
const RULES = [
  ["B", { type: "greaterThan", value: 10 }], ["C", { type: "lessThan", value: 10 }], ["D", { type: "between", value: 5, value2: 20 }],
  ["E", { type: "equal", value: 12 }], ["F", { type: "textContains", text: "An" }], ["G", { type: "duplicate" }],
  ["H", { type: "top", rank: 2 }], ["I", { type: "bottom", rank: 2 }], ["J", { type: "aboveAverage" }], ["K", { type: "belowAverage" }],
  ["L", { type: "dataBar", color: "#638ec6" }], ["M", { type: "colorScale2", colors: ["#f8696b", "#63be7b"] }],
  ["N", { type: "colorScale3", colors: ["#f8696b", "#ffeb84", "#63be7b"] }], ["O", { type: "iconSet", iconSet: "3Arrows" }],
  ["P", { type: "formula", formula: "=$B2>10" }], ["Q", { type: "blank" }], ["R", { type: "dateOccurs", timePeriod: "thisMonth" }]
];
let session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0", { timeoutMilliseconds: 120000 });
  const result = JSON.parse(await cdp.evaluate(`JSON.stringify((() => {
    const g = window.__vnoAppInstance.grid;
    const cols = "BCDEFGHIJKLMNOPQR".split("");
    const vals = [0, 5, 12, 20, 8, 30];
    cols.forEach(c => vals.forEach((v, i) => g.setCellValue(c, i + 1, c === "F" ? ["An", "Bình", "Anh", "Chi", "An", "Lan"][i] : v)));
    const out = [];
    for (const [col, config] of ${JSON.stringify(RULES)}) {
      const rule = g.addConditionalFormattingRule({ start: { c: col, r: 1 }, end: { c: col, r: 6 } }, config);
      out.push(rule ? rule.type : "FAILED:" + config.type);
    }
    window.__vnoAppInstance.adapter.isDirty = true;
    return out;
  })())`));
  check(result.length === RULES.length && result.every((t, i) => t === RULES[i][1].type), "Tạo đủ 17 loại luật qua app", result.join(","));
  const saved = await cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 180000 });
  check(saved !== false && saved?.status !== "error", "Lưu XLSX qua app desktop");
  await new Promise((r) => setTimeout(r, 800));
} finally { await session.close(); }
console.log(`FILE ${file}`);
session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  await session.cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const reopened = JSON.parse(await session.cdp.evaluate(`JSON.stringify(window.__vnoAppInstance.grid.getConditionalFormattingRules().map(r => ({ type: r.type, range: window.__vnoAppInstance.grid._rangeLabel(r.range) })))`));
  check(reopened.length === RULES.length, "Mở lại trong app giữ đủ số luật", JSON.stringify(reopened.map(r => r.type)));
  const missing = RULES.filter(([col, c]) => !reopened.some((r) => r.type === c.type && r.range.startsWith(col))).map(([col, c]) => `${col}:${c.type}`);
  check(missing.length === 0, "Mỗi luật mở lại đúng loại và vùng", missing.join(","));
} finally { await session.close(); }