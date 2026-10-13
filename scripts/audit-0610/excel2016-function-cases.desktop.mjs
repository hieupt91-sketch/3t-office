import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXTENDED_FUNCTION_CATALOG } from "../../apps/sheet/formula-engine.js";
import { click, press, typeText, sleep } from "../../tests/live/cdp/actions.mjs";
import { launchApp } from "../../tests/live/cdp/session.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const source = path.join(root, "tests/live/cdp/test_sheet_home.xlsx");
const workFile = path.join(os.tmpdir(), `vno-e1c-function-cases-${process.pid}.xlsx`);
const localAppData = path.join(process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), "vno-e1c-profile"), "function-cases");
const reportPath = path.join(root, "docs/EXCEL2016-FUNCTIONS-COM-CASES.json");
const catalogPath = path.join(root, "docs/EXCEL2016-FUNCTION-CATALOG.json");
const resultColumn = "H";
const categoryAliases = new Map([
  ["math", "Math and trigonometry functions"],
  ["statistical", "Statistical functions"],
  ["statistics", "Statistical functions"],
  ["text", "Text functions"],
  ["date", "Date and time functions"],
  ["lookup", "Lookup and reference functions"],
  ["logical", "Logical functions"],
  ["financial", "Financial functions"],
  ["engineering", "Engineering functions"],
  ["information", "Information functions"],
  ["cubes", "Cubes"],
  ["database", "Database functions"],
]);
const requestedGroup = String(process.argv[2] || "all").toLowerCase();
const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8"));
const appByName = new Map(EXTENDED_FUNCTION_CATALOG.map(item => [item.name, item]));
const requestedCategory = categoryAliases.get(requestedGroup);
if (requestedGroup !== "all" && !requestedCategory) {
  throw new Error(`Unknown group ${requestedGroup}; use all or a supported category alias.`);
}
const requestedNames = new Set(String(process.env.VNO_E1C_FUNCTIONS || "").split(",").map(name => name.trim().toUpperCase()).filter(Boolean));
const functions = catalog.functions.filter(item => item.excel2016
  && (!requestedCategory || item.category === requestedCategory)
  && (!requestedNames.size || requestedNames.has(item.name)));
if (!functions.length) throw new Error("No Excel 2016 functions matched the requested group/name filter.");
const volatile = new Set(["TODAY", "NOW", "RAND", "RANDBETWEEN"]);

function normalizeDelimiter(formula) {
  let quoted = false;
  let result = "";
  for (let index = 0; index < formula.length; index += 1) {
    const character = formula[index];
    if (character === '"') {
      if (quoted && formula[index + 1] === '"') {
        result += '""';
        index += 1;
      } else {
        quoted = !quoted;
        result += character;
      }
    } else {
      result += character === ";" && !quoted ? "," : character;
    }
  }
  return result;
}

function normalFormula(item) {
  const name = item.name;
  const exact = {
    IF: "=IF(A2=1,\"yes\",\"no\")",
    FALSE: "=FALSE()",
    TRUE: "=TRUE()",
    IFERROR: '=IFERROR(1/0,"caught")',
    IFNA: '=IFNA(NA(),"caught")',
    XOR: "=XOR(TRUE,FALSE)",
    SUMIF: '=SUMIF(A2:A6,">2",C2:C6)',
    SUMIFS: '=SUMIFS(C2:C6,A2:A6,">2",D2:D6,">=0.1")',
    COUNTIF: '=COUNTIF(A2:A6,">2")',
    COUNTIFS: '=COUNTIFS(A2:A6,">2",D2:D6,">=0.1")',
    AVERAGEIF: '=AVERAGEIF(A2:A6,">2",C2:C6)',
    AVERAGEIFS: '=AVERAGEIFS(C2:C6,A2:A6,">2",D2:D6,">=0.1")',
    VLOOKUP: "=VLOOKUP(3,A2:C6,3,FALSE)",
    HLOOKUP: "=HLOOKUP(2,A2:E6,2,FALSE)",
    LOOKUP: "=LOOKUP(3,A2:A6,C2:C6)",
    INDEX: "=INDEX(C2:C6,3)",
    MATCH: "=MATCH(3,A2:A6,0)",
    TEXT: '=TEXT(C2,"0.00")',
    DATEVALUE: '=DATEVALUE("1/15/2020")',
    TIMEVALUE: '=TIMEVALUE("14:30:45")',
    NETWORKDAYS: "=NETWORKDAYS(DATE(2020,1,1),DATE(2020,1,10))",
    "NETWORKDAYS.INTL": "=NETWORKDAYS.INTL(DATE(2020,1,1),DATE(2020,1,10),1)",
    WORKDAY: "=WORKDAY(DATE(2020,1,1),5)",
    "WORKDAY.INTL": "=WORKDAY.INTL(DATE(2020,1,1),5,1)",
    PMT: "=PMT(0.01,12,1000)",
    PV: "=PV(0.01,12,-100)",
    FV: "=FV(0.01,12,-100)",
    NPV: "=NPV(0.1,-100,60,60)",
    IRR: "=IRR(C10:C12)",
  };
  if (exact[name]) return exact[name];
  const appItem = appByName.get(name);
  if (appItem?.example && !/\[[^\]]+\]/.test(appItem.example)) {
    const localReferences = String(appItem.example)
      .replace(/(?:'(?:(?:[^']|'')*)'|[\p{L}_][\p{L}\p{N}_. ]*)!/gu, "")
      .replace(/\bB(?=\$?\d|:)/gi, "A");
    return normalizeDelimiter(localReferences.startsWith("=") ? localReferences : `=${name}(1)`);
  }
  switch (item.category) {
    case "Math and trigonometry functions": return `=${name}(1)`;
    case "Statistical functions": return `=${name}(A2:A6)`;
    case "Text functions": return `=${name}("Ab c")`;
    case "Date and time functions": return `=${name}(DATE(2020,1,15))`;
    case "Lookup and reference functions": return `=${name}(A2:A6)`;
    case "Logical functions": return `=${name}(TRUE)`;
    case "Financial functions": return `=${name}(0.1,10,-1000)`;
    default: return `=${name}(1)`;
  }
}

function casesFor(item) {
  const name = item.name;
  const dateCases = {
    DATE: ["=DATE(2020,1,15)", "=DATE(2020,1,H1)", '=DATE("2020","2","3")'],
    DATEDIF: ['=DATEDIF(DATE(2020,1,1),DATE(2021,2,3),"m")', '=DATEDIF(H1,H1,"d")', '=DATEDIF("1/1/2020","2/1/2020","d")'],
    DATEVALUE: ['=DATEVALUE("1/15/2020")', "=DATEVALUE(H1)", "=DATEVALUE(45000)"],
    DAY: ["=DAY(DATE(2020,1,15))", "=DAY(H1)", '=DAY("1/15/2020")'],
    DAYS: ["=DAYS(DATE(2020,2,1),DATE(2020,1,1))", "=DAYS(H1,H1)", '=DAYS("2/1/2020","1/1/2020")'],
    DAYS360: ["=DAYS360(DATE(2020,1,1),DATE(2020,2,1))", "=DAYS360(H1,H1)", '=DAYS360("1/1/2020","2/1/2020",TRUE)'],
    EDATE: ["=EDATE(DATE(2020,1,31),1)", "=EDATE(H1,0)", '=EDATE("1/31/2020","1")'],
    EOMONTH: ["=EOMONTH(DATE(2020,1,15),1)", "=EOMONTH(H1,0)", '=EOMONTH("1/15/2020","1")'],
    HOUR: ["=HOUR(TIME(14,30,45))", "=HOUR(H1)", '=HOUR("14:30:45")'],
    ISOWEEKNUM: ["=ISOWEEKNUM(DATE(2020,1,15))", "=ISOWEEKNUM(H1)", '=ISOWEEKNUM("1/15/2020")'],
    MINUTE: ["=MINUTE(TIME(14,30,45))", "=MINUTE(H1)", '=MINUTE("14:30:45")'],
    MONTH: ["=MONTH(DATE(2020,12,15))", "=MONTH(H1)", '=MONTH("12/15/2020")'],
    NETWORKDAYS: ["=NETWORKDAYS(DATE(2020,1,1),DATE(2020,1,10))", "=NETWORKDAYS(H1,H1)", '=NETWORKDAYS("1/1/2020","1/10/2020",DATE(2020,1,6))'],
    "NETWORKDAYS.INTL": ["=NETWORKDAYS.INTL(DATE(2020,1,1),DATE(2020,1,10),1)", "=NETWORKDAYS.INTL(H1,H1,1)", '=NETWORKDAYS.INTL("1/1/2020","1/10/2020","0000011")'],
    NOW: ["=NOW()", "=IF(H1,NOW(),0)", '=TEXT(NOW(),"yyyy")'],
    SECOND: ["=SECOND(TIME(14,30,45))", "=SECOND(H1)", '=SECOND("14:30:45")'],
    TIME: ["=TIME(14,30,45)", "=TIME(H1,H1,H1)", '=TIME("14","30","45")'],
    TIMEVALUE: ['=TIMEVALUE("14:30:45")', "=TIMEVALUE(H1)", "=TIMEVALUE(0.5)"],
    TODAY: ["=TODAY()", "=IF(H1,TODAY(),0)", '=TEXT(TODAY(),"yyyy")'],
    WEEKDAY: ["=WEEKDAY(DATE(2020,1,15),2)", "=WEEKDAY(H1,2)", '=WEEKDAY("1/15/2020","2")'],
    WEEKNUM: ["=WEEKNUM(DATE(2020,1,15),2)", "=WEEKNUM(H1,2)", '=WEEKNUM("1/15/2020","2")'],
    WORKDAY: ["=WORKDAY(DATE(2020,1,1),5)", "=WORKDAY(H1,0)", '=WORKDAY("1/1/2020","5",DATE(2020,1,6))'],
    "WORKDAY.INTL": ["=WORKDAY.INTL(DATE(2020,1,1),5,1)", "=WORKDAY.INTL(H1,0,1)", '=WORKDAY.INTL("1/1/2020","5","0000011")'],
    YEAR: ["=YEAR(DATE(2020,1,15))", "=YEAR(H1)", '=YEAR("1/15/2020")'],
    YEARFRAC: ["=YEARFRAC(DATE(2020,1,1),DATE(2021,1,1),1)", "=YEARFRAC(H1,H1,1)", '=YEARFRAC("1/1/2020","7/1/2020","2")'],
  };
  if (dateCases[name]) {
    return ["normal", "blank_or_error", "mixed_type"].map((kind, index) => ({ kind, formula: dateCases[name][index] }));
  }
  const blank = {
    FALSE: "=IF(H1,FALSE(),FALSE())",
    TRUE: "=IF(H1,TRUE(),FALSE())",
    IF: "=IF(H1,1,0)",
    IFERROR: '=IFERROR(H1,"caught")',
    IFNA: '=IFNA(H1,"caught")',
    XOR: "=XOR(H1)",
    SUMIF: '=SUMIF(A2:A6,"",C2:C6)',
    VLOOKUP: "=VLOOKUP(H1,A2:C6,3,FALSE)",
    TEXT: '=TEXT(H1,"0.00")',
  }[name] || `=${name}(H1)`;
  const mixed = {
    FALSE: '=IF(FALSE(),"text",0)',
    TRUE: '=IF(TRUE(),"text",0)',
    IF: '=IF("text",1,0)',
    IFERROR: '=IFERROR("text","caught")',
    IFNA: '=IFNA("text","caught")',
    XOR: '=XOR(TRUE,"text")',
    SUMIF: '=SUMIF(A2:A6,">2","text")',
    VLOOKUP: '=VLOOKUP("3",A2:C6,3,FALSE)',
    TEXT: '=TEXT("12.5","0.00")',
  }[name] || `=${name}("2")`;
  return [
    { kind: "normal", formula: normalFormula(item) },
    { kind: "blank_or_error", formula: blank },
    { kind: "mixed_type", formula: mixed },
  ];
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

const probes = functions.flatMap(item => casesFor(item).map(testCase => ({ ...testCase, ...item })));
const entered = [];
let session = null;
try {
  await fs.copyFile(source, workFile);
  session = await launchApp("sheet", { root, filePath: workFile, localAppData });
  const { cdp } = session;
  const workName = path.basename(workFile).toLowerCase();
  await cdp.waitFor(
    `String(window.__vnoAppInstance?.adapter?.sourceFilePath || "").toLowerCase().endsWith(${JSON.stringify(workName)}) && window.__vnoAppInstance?.grid?.cellsData?.size > 0`,
    { timeoutMilliseconds: 60000 },
  );
  // Imported workbooks intentionally expose only 50 spare rows beyond their used range.
  // This audit needs one visible desktop cell per probe, so extend the in-memory grid
  // before entering formulas; the saved XLSX still contains only the cells we touch.
  await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    grid.rowCount = Math.max(grid.rowCount, ${probes.length + 2});
    grid._renderVirtualRows(grid.currentStartRow || 1, grid.currentEndRow || 40);
    return grid.rowCount;
  })()`);
  await cdp.waitFor(`document.querySelector('.vno-grid-cell[data-coord="${resultColumn}2"]')`, { timeoutMilliseconds: 30000 });
  await click(cdp, `.vno-grid-cell[data-coord="${resultColumn}2"]`);
  for (let index = 0; index < probes.length; index += 1) {
    const probe = probes[index];
    const coord = `${resultColumn}${index + 2}`;
    await click(cdp, "#vno-formula-val");
    await press(cdp, "Home", {}, 0);
    await press(cdp, "End", { shift: true }, 0);
    await press(cdp, "Backspace", {}, 0);
    await typeText(cdp, probe.formula, 0);
    await press(cdp, "Enter", {}, 10);
    const cell = await cdp.evaluate(`(() => { const cell = window.__vnoAppInstance.grid.cellsData.get(${JSON.stringify(coord)}); return cell ? {formula: cell.formula, val: cell.val} : null; })()`);
    if (!cell || cell.formula !== probe.formula) {
      throw new Error(`CDP entry failed at ${coord}: ${JSON.stringify({ probe, cell })}`);
    }
    entered.push({ ...probe, coord, appValue: cell.val, implemented: appByName.has(probe.name) });
    if ((index + 1) % 75 === 0) console.log(`CDP entered ${index + 1}/${probes.length} cases.`);
  }
  const saved = await cdp.evaluate("window.__vnoAppInstance.adapter.save()");
  if (saved !== true) throw new Error("VN Sheet did not save the function-case workbook.");
  await sleep(1000);
} finally {
  if (session) await session.close();
}

const psScript = path.join(root, "scripts/audit-0610/word_parallel/excel-read.ps1");
const raw = execFileSync("powershell", [
  "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psScript, "-Files", workFile,
  "-FormulaRange", `${resultColumn}2:${resultColumn}${probes.length + 1}`,
], { encoding: "utf8", maxBuffer: 30 * 1024 * 1024 });
const jsonLine = raw.split(/\r?\n/).find(line => line.startsWith("E1JSON:"));
if (!jsonLine) throw new Error(`Excel read-only audit returned no E1JSON rows: ${raw.slice(-2000)}`);
const excelRows = JSON.parse(jsonLine.slice("E1JSON:".length));
if (excelRows.length !== entered.length) throw new Error(`Excel returned ${excelRows.length}/${entered.length} case rows.`);
const rows = entered.map((row, index) => ({
  ...row,
  excelFormula: excelRows[index].formula,
  excelValue: excelRows[index].value2,
  excelText: excelRows[index].text,
  excelType: excelRows[index].valueType,
  volatile: volatile.has(row.name),
  match: volatile.has(row.name) ? null : sameValue(row.appValue, excelRows[index]),
}));
let previous = { rows: [] };
try { previous = JSON.parse(await fs.readFile(reportPath, "utf8")); } catch {}
const replacedNames = new Set(functions.map(item => item.name));
const mergedRows = [...(previous.rows || []).filter(row => !replacedNames.has(row.name)), ...rows]
  .sort((a, b) => a.name.localeCompare(b.name) || a.kind.localeCompare(b.kind));
await fs.writeFile(reportPath, `${JSON.stringify({
  excelVersion: "16.0.4266.1001",
  readOnly: true,
  calculation: "CalculateFullRebuild",
  generatedAt: new Date().toISOString(),
  rows: mergedRows,
}, null, 2)}\n`, "utf8");
const mismatches = rows.filter(row => row.match === false);
console.log(JSON.stringify({
  group: requestedGroup,
  functions: functions.length,
  cases: rows.length,
  compared: rows.filter(row => row.match !== null).length,
  matches: rows.filter(row => row.match === true).length,
  mismatches: mismatches.length,
  implementedMismatches: [...new Set(mismatches.filter(row => row.implemented).map(row => row.name))],
  unsupportedExcel2016: [...new Set(mismatches.filter(row => row.excel2016 && !row.implemented).map(row => row.name))].length,
  report: reportPath,
  workbook: workFile,
}, null, 2));
