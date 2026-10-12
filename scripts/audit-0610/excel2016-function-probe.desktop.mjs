import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXTENDED_FUNCTION_CATALOG, FormulaEngine } from "../../apps/sheet/formula-engine.js";
import { click, press, typeText, sleep } from "../../tests/live/cdp/actions.mjs";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = path.join(root, "tests/live/cdp/test_sheet_home.xlsx");
const workFile = path.join(os.tmpdir(), `vno-e1-functionAudit-${process.pid}_e1functionAudit.xlsx`);
const localAppData = path.join(process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), "vno-e1-profile"), "e1-functions");
const volatile = new Set(["TODAY", "NOW", "RAND", "RANDBETWEEN"]);
const limitArg = Number(process.argv[2] || EXTENDED_FUNCTION_CATALOG.length);
const startArg = Number(process.argv[3] || 0);
const excludedFromExcel2016Oracle = new Set(["VND", "FILTER", "SORT", "UNIQUE", "IFS", "SWITCH"]);
const excelFunctions = EXTENDED_FUNCTION_CATALOG.filter(item => !excludedFromExcel2016Oracle.has(item.name));
const startIndex = Number.isInteger(startArg) && startArg >= 0 ? startArg : 0;
const items = excelFunctions.slice(startIndex, startIndex + (Number.isInteger(limitArg) && limitArg > 0 ? limitArg : excelFunctions.length));
const cells = new Map();
let session = null;

function formulaFor(item) {
  if (item.name === "SUMPRODUCT") return "=SUMPRODUCT(A2:A6,C2:C6)";
  if (item.name === "RANK.EQ") return "=_xlfn.RANK.EQ(A2, $A$2:$A$50, 0)";
  if (item.name === "HYPERLINK") return '=HYPERLINK("#A1", "Ô đầu tiên")';
  if (item.name === "FORMULATEXT") return "=_xlfn.FORMULATEXT(B2)";
  if (item.name === "SIN") return "=SIN(1.5707963267948966)";
  if (item.name === "TAN") return "=TAN(0.7853981633974483)";
  if (item.name === "COUNTBLANK") return "=COUNTBLANK(D1:D20)";
  if (item.name === "INDIRECT") return '=INDIRECT("A" & 5)';
  if (item.name === "ISNA") return "=ISNA(NA())";
  const sample = String(item.example || `=${item.name}()`).trim();
  if (/\[[^\]]+\]/.test(sample)) return `=${item.name}()`;
  const localReferences = sample.replace(/(?:'(?:(?:[^']|'')*)'|[\p{L}_][\p{L}\p{N}_. ]*)!/gu, "").replace(/\bB(?=\$?\d|:)/gi, "A");
  return localReferences.startsWith("=") ? localReferences : `=${item.name}()`;
}

function normalizeDelimiter(formula) {
  let quoted = false;
  let result = "";
  for (let index = 0; index < formula.length; index += 1) {
    const character = formula[index];
    if (character === '"') {
      if (quoted && formula[index + 1] === '"') {
        result += '""';
        index += 1;
        continue;
      }
      quoted = !quoted;
      result += character;
    } else {
      result += character === ";" && !quoted ? "," : character;
    }
  }
  return result;
}

function sameValue(appValue, excelRow) {
  const errorText = String(excelRow.text || "").trim();
  if (excelRow.valueType === "ErrorWrapper" || excelRow.valueType === "Error" || /^#(?:N\/A|VALUE!|REF!|DIV\/0!|NUM!|NAME\?|NULL!)/i.test(errorText)) {
    const expectedError = errorText || String(excelRow.value2 || "").trim();
    const got = String(appValue ?? "").replace(/\s*\([^)]*\)$/, "").trim();
    return got === expectedError;
  }
  if (excelRow.valueType === "empty") return appValue === "" || appValue === null || appValue === undefined;
  if (typeof appValue === "number" && typeof excelRow.value2 === "number") {
    return Math.abs(appValue - excelRow.value2) <= Math.max(1e-9, Math.abs(excelRow.value2) * 1e-9);
  }
  return String(appValue ?? "") === String(excelRow.value2 ?? "");
}

try {
  await fs.copyFile(source, workFile);
  session = await launchApp("sheet", { root, filePath: workFile, localAppData });
  const { cdp } = session;
  const workName = path.basename(workFile).toLowerCase();
  await cdp.waitFor(
    `String(window.__vnoAppInstance?.adapter?.sourceFilePath || "").toLowerCase().endsWith(${JSON.stringify(workName)}) && window.__vnoAppInstance?.grid?.cellsData?.size > 0`,
    { timeoutMilliseconds: 60000 },
  );
  console.log("CDP desktop document ready; starting formula entry.");
  await cdp.waitFor("document.querySelector('.vno-grid-cell[data-coord=\"B2\"]')", { timeoutMilliseconds: 30000 });
  await click(cdp, '.vno-grid-cell[data-coord="B2"]');
  await sleep(250);

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const coord = `B${index + 2}`;
    const formula = normalizeDelimiter(formulaFor(item));
    await click(cdp, "#vno-formula-val");
    await press(cdp, "Home", {}, 0);
    await press(cdp, "End", { shift: true }, 0);
    await press(cdp, "Backspace", {}, 0);
    await typeText(cdp, formula, 0);
    await press(cdp, "Enter", {}, 80);
    await sleep(250);
    const cell = await cdp.evaluate(`(() => { const cell = window.__vnoAppInstance.grid.cellsData.get(${JSON.stringify(coord)}); return cell ? {formula: cell.formula, val: cell.val} : null; })()`);
    if (!cell) throw new Error(`App did not retain formula cell ${coord}; selection=${JSON.stringify(await cdp.evaluate("window.__vnoAppInstance.grid.selectedCoord"))}; formulaInput=${JSON.stringify(await cdp.evaluate("document.querySelector('#vno-formula-val')?.value"))}`);
    if (cell.formula !== formula) {
      throw new Error(`CDP nhập ${item.name} sai ô ${coord}: formula=${JSON.stringify(cell.formula)} value=${JSON.stringify(cell.val)} expected=${JSON.stringify(formula)}`);
    }
    cells.set(coord, { name: item.name, formula, appValue: cell.val, volatile: /\b(?:TODAY|NOW|RAND|RANDBETWEEN)\s*\(/i.test(formula) || volatile.has(item.name) });
    if ((index + 1) % 20 === 0) console.log(`CDP đã nhập ${index + 1}/${items.length} hàm`);
  }

  const saved = await cdp.evaluate("window.__vnoAppInstance.adapter.save()");
  if (saved !== true) throw new Error("VN Sheet did not save the generated XLSX workbook.");
  await sleep(1000);
} finally {
  if (session) await session.close();
}

const psScript = path.join(root, "scripts/audit-0610/word_parallel/excel-read.ps1");
const raw = execFileSync("powershell", [
  "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psScript, "-Files", workFile,
  "-FormulaRange", `B2:B${items.length + 1}`,
], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
const jsonLine = raw.split(/\r?\n/).find(line => line.startsWith("E1JSON:"));
if (!jsonLine) throw new Error("Excel read-only audit returned no E1JSON rows.");
const excelRows = JSON.parse(jsonLine.slice("E1JSON:".length)).slice(0, items.length);
const oracle = { excelVersion: "16.0.4266.1001", readOnlyRequested: true, rows: excelRows };
const rows = oracle.rows.map((row, index) => {
    const app = cells.get(`B${index + 2}`);
  return {
    name: app.name,
    formula: app.formula,
    appValue: app.appValue,
    excelValue: row.value2,
    excelText: row.text,
    excelType: row.valueType,
    volatile: app.volatile,
    match: app.volatile ? null : sameValue(app.appValue, row),
  };
});
const reportPath = path.join(root, "docs/EXCEL2016-FUNCTIONS-COM-RESULTS.json");
await fs.writeFile(reportPath, `${JSON.stringify({ excelVersion: oracle.excelVersion, readOnly: oracle.readOnlyRequested, calculation: "CalculateFullRebuild", rows }, null, 2)}\n`, "utf8");
const mismatches = rows.filter(row => row.match === false);
console.log(JSON.stringify({ workbook: workFile, excelVersion: oracle.excelVersion, readOnlyRequested: oracle.readOnlyRequested, functions: rows.length, compared: rows.filter(row => row.match !== null).length, mismatches: mismatches.length, mismatchNames: mismatches.map(row => row.name), report: reportPath }, null, 2));
