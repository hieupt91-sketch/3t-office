// Đối chiếu hàm của VN Sheet với Excel 2016 thật (Application.Evaluate trên sổ tạm không lưu).
// Dùng: node scripts/audit-0610/function_oracle.mjs <cases.json> [--out results.json]
// cases.json: { "cells": { "A1": 1, ... }, "formulas": ["=ROMAN(1999)", ...] }
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const argv = process.argv.slice(2);
const casesPath = path.resolve(argv[0] || "");
const outIndex = argv.indexOf("--out");
const spec = JSON.parse(readFileSync(casesPath, "utf8"));
const work = mkdtempSync(path.join(tmpdir(), "vno-oracle-"));
// Excel chưa kích hoạt không cho nhập ô: đổi mỗi vùng A1:B3 trong công thức thành hằng mảng {..;..} từ chính dữ liệu cells.
const colNum = name => [...name].reduce((v, ch) => v * 26 + ch.charCodeAt(0) - 64, 0);
const colName = n => { let s = ""; while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); } return s; };
const literal = value => typeof value === "number" ? String(value) : typeof value === "boolean" ? (value ? "TRUE" : "FALSE") : `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
const toArrayLiteral = formula => formula.replace(/(?<![A-Za-z0-9_$!])\$?([A-Z]{1,2})\$?(\d+):\$?([A-Z]{1,2})\$?(\d+)(?![A-Za-z0-9_(])/g, (_m, c1, r1, c2, r2) => {
  const rows = [];
  for (let r = Number(r1); r <= Number(r2); r++) {
    const row = [];
    for (let c = colNum(c1); c <= colNum(c2); c++) {
      const v = spec.cells?.[`${colName(c)}${r}`];
      row.push(v === undefined ? "0" : literal(v));
    }
    rows.push(row.join(","));
  }
  return `{${rows.join(";")}}`;
});
// Mặc định: tạo tệp XLSX tạm từ spec.cells để Excel (chỉ-đọc) tính công thức có vùng ô thật. --array-literals: dùng hằng mảng thay vì tệp.
const useArrays = argv.includes("--array-literals");
const formulaText = item => (typeof item === "string" ? item : item.f);
const excelFormulas = (spec.formulas || []).map(item => (useArrays ? toArrayLiteral(formulaText(item)) : formulaText(item)));
const input = path.join(work, "in.json");
const output = path.join(work, "out.json");
writeFileSync(input, JSON.stringify({ formulas: excelFormulas }));
const dataFile = path.join(work, "data.xlsx");
if (!useArrays) {
  const cellsJson = path.join(work, "cells.json");
  writeFileSync(cellsJson, JSON.stringify(spec.sheets ? { __sheets__: { Sheet1: spec.cells || {}, ...spec.sheets } } : (spec.cells || {})));
  execFileSync("python", ["-I", path.resolve("scripts/audit-0610/make_oracle_xlsx.py"), cellsJson, dataFile], { encoding: "utf8" });
}

let excel = null;
for (let attempt = 0; attempt < 6 && !excel; attempt++) {
  try {
    execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", path.resolve("scripts/audit-0610/function_oracle.ps1"), "-InputJson", input, "-OutputJson", output, ...(useArrays ? [] : ["-DataFile", dataFile])], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
    excel = JSON.parse(readFileSync(output, "utf8").replace(/^﻿/, ""));
  } catch (error) { console.error("Excel oracle lỗi lần", attempt + 1, String(error.message).slice(0, 200)); }
}
if (!excel) { console.error("BLOCKED: không lấy được kết quả Excel"); process.exit(2); }
const excelList = Array.isArray(excel) ? excel : [excel];

const { FormulaEngine } = await import(pathToFileURL(path.resolve("apps/sheet/formula-engine.js")).href);
const toMap = obj => { const map = new Map(); for (const [key, value] of Object.entries(obj || {})) map.set(key, { val: value, formula: "", style: {} }); return map; };
const cells = toMap(spec.cells);
const sheetMaps = { Sheet1: cells, ...Object.fromEntries(Object.entries(spec.sheets || {}).map(([name, obj]) => [name, toMap(obj)])) };
const { EN_LOCALE } = await import(pathToFileURL(path.resolve("apps/sheet/excel-format-code.js")).href);
const engine = new FormulaEngine(() => cells, null, name => sheetMaps[String(name).trim()] || null, () => "Sheet1", () => Object.keys(sheetMaps));
engine.textLocale = EN_LOCALE;

let currentTol = 1e-9;
const near = (a, b) => Math.abs(a - b) <= currentTol * Math.max(1, Math.abs(a), Math.abs(b));
const rows = [];
const mineFormulas = (spec.formulas || []).map(formulaText);
const tolerances = (spec.formulas || []).map(item => (typeof item === "string" ? null : item.tol ?? null));
for (const [index, item] of excelList.entries()) {
  let mine;
  currentTol = tolerances[index] ?? 1e-9;
  try { mine = engine.evaluate(mineFormulas[index]); } catch (error) { mine = `#THROW ${error.message}`; }
  if (mine instanceof String) mine = String(mine);
  let pass = false;
  if (item.type === "number") pass = typeof mine === "number" && near(mine, item.value);
  else if (item.type === "string") pass = String(mine) === item.value;
  else if (item.type === "boolean") pass = mine === item.value;
  else if (item.type === "error") pass = String(mine).split(" ")[0] === item.value;
  else if (item.type === "array") pass = Array.isArray(mine) && mine.length === item.value.length && item.value.every((v, i) => (typeof v === "number" ? near(Number(mine[i]), v) : String(mine[i]) === String(v)));
  rows.push({ formula: mineFormulas[index], excel: item.value, excelType: item.type, mine, pass, tol: tolerances[index] ?? undefined });
}
const failed = rows.filter(row => !row.pass);
for (const row of failed) console.log(`FAIL | ${row.formula} | Excel=${JSON.stringify(row.excel)} (${row.excelType}) | VN=${JSON.stringify(row.mine)}`);
console.log(`SUMMARY ${rows.length - failed.length}/${rows.length} khớp Excel 2016`);
if (outIndex >= 0) writeFileSync(path.resolve(argv[outIndex + 1]), JSON.stringify(rows, null, 1));
// --golden <file>: lưu giá trị Excel làm bộ kiểm thử vàng cho npm test (không cần Excel khi chạy lại).
const goldenIndex = argv.indexOf("--golden");
if (goldenIndex >= 0 && !failed.length) {
  const golden = { generatedFrom: "Excel 2016 (16.0.4266) Application.Evaluate", cells: spec.cells || {}, ...(spec.sheets ? { sheets: spec.sheets } : {}), cases: rows.map(row => ({ formula: row.formula, excel: row.excel, type: row.excelType, ...(row.tol ? { tol: row.tol } : {}) })) };
  writeFileSync(path.resolve(argv[goldenIndex + 1]), JSON.stringify(golden, null, 1));
  console.log(`Đã lưu bộ giá trị vàng: ${argv[goldenIndex + 1]}`);
}
process.exitCode = failed.length ? 1 : 0;
