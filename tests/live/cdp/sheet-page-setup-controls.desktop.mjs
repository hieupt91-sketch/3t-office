// EXCEL-H2: each Page Setup control gets its own worksheet, then one XLSX save/reopen/COM ReadOnly pass.
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp, repoRoot } from "./session.mjs";
import { sleep } from "./client.mjs";

const outDir = "E:\\VNOffice-temp\\excel-h2-page-setup";
const output = path.join(outDir, "page-setup-controls.xlsx");
const source = path.join(repoRoot, "tests", "live", "cdp", "test_sheet_home.xlsx");
await fs.mkdir(outDir, { recursive: true });
await fs.copyFile(source, output);

const checks = [];
const check = (id, condition, detail = "") => {
  checks.push({ id, pass: Boolean(condition), detail: String(detail || "") });
  console.log(`${condition ? "PASS" : "FAIL"} | ${id}${detail ? ` | ${detail}` : ""}`);
};
const cmToPt = cm => cm * 72 / 2.54;
const near = (a, b, eps = 0.6) => Math.abs(Number(a) - Number(b)) <= eps;
const unabsolute = value => String(value ?? "").replace(/\$/g, "");

async function ready(session, expectedPath) {
  const start = Date.now();
  const normalized = path.resolve(expectedPath).replace(/\\/g, "/").toLowerCase();
  while (Date.now() - start < 180000) {
    const loaded = await session.cdp.evaluate(`(()=>{const app=window.__vnoAppInstance;const source=String(app?.adapter?._sourcePath||app?.adapter?.sourceFilePath||"").replace(/\\\\/g,"/").toLowerCase();return source===${JSON.stringify(normalized)}&&app?.grid?.cellsData?.size>0&&!document.querySelector(".vno-sheet-quick-view")})()`);
    if (loaded) return;
    await sleep(300);
  }
  throw new Error(`Sheet did not finish opening ${expectedPath}`);
}

const set = (selector, value, kind = "change") => `{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error(${JSON.stringify(`missing ${selector}`)});e.value=${JSON.stringify(String(value))};e.dispatchEvent(new Event(${JSON.stringify(kind)},{bubbles:true}));}`;
const click = selector => `{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error(${JSON.stringify(`missing ${selector}`)});e.click();}`;
const tick = (selector, on) => `{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error(${JSON.stringify(`missing ${selector}`)});if(e.checked!==${on})e.click();}`;

async function addCaseSheet(cdp, id, prelude = "") {
  const created = await cdp.evaluate(`(()=>{const g=window.__vnoAppInstance.grid;const name=${JSON.stringify(id)};if(!g.sheets.includes(name))g.addSheet(name,false);else g.switchSheet(name);g.setCellValue("A",1,name,false);${prelude};return g.activeSheet===name})()`);
  if (!created) throw new Error(`Khong tao/chuyen duoc sheet ${id}`);
}

async function openDialog(cdp, tab) {
  const opened = await cdp.evaluate(`(()=>{const g=window.__vnoAppInstance.grid;g.showPageSetupDialog(${JSON.stringify(tab)});return !!document.querySelector(".vno-page-setup-dialog")})()`);
  if (!opened) throw new Error(`Khong mo duoc hop thoai o the ${tab}`);
  await cdp.evaluate(click(`#vno-ps-tab-${tab}`));
}

async function applyCase(cdp, { id, tab, script = "", prelude = "", inspect = "true" }) {
  await addCaseSheet(cdp, id, prelude);
  await openDialog(cdp, tab);
  const observed = await cdp.evaluate(`(()=>{${script};return (${inspect})})()`);
  await cdp.evaluate(click(".vno-page-setup-dialog .vno-rule-apply"));
  await sleep(40);
  const error = await cdp.evaluate(`document.querySelector(".vno-page-setup-dialog .vno-rule-error")?.textContent||""`);
  if (error) throw new Error(`${id}: ${error}`);
  return observed;
}

async function applyPickerCase(cdp, { id, field, prelude = "", selectScript, expected }) {
  await addCaseSheet(cdp, id, prelude);
  await openDialog(cdp, "sheet");
  await cdp.evaluate(click(`#vno-sheet-${field}-pick`));
  check(`${id}-UI`, await cdp.evaluate(`!!document.querySelector(".vno-print-title-hint-back")`));
  await cdp.evaluate(`(()=>{${selectScript};document.querySelector(".vno-print-title-hint-back")?.click();})()`);
  const selector = field === "print-area" ? "#vno-sheet-print-area" : field === "title-rows" ? "#vno-sheet-title-rows" : "#vno-sheet-title-cols";
  const picked = await cdp.evaluate(`document.querySelector(${JSON.stringify(selector)})?.value||""`);
  check(`${id}-VALUE`, picked === expected, picked);
  await cdp.evaluate(click(".vno-page-setup-dialog .vno-rule-apply"));
  await sleep(40);
}

const cases = [
  { id: "PS-P01", tab: "page", prelude: `g.setPageSetup({orientation:"landscape"})`, script: click("#vno-sheet-orientation-portrait") },
  { id: "PS-P02", tab: "page", script: click("#vno-sheet-orientation-landscape") },
  { id: "PS-P03", tab: "page", script: `${click("#vno-sheet-scale-percent-mode")};${set("#vno-sheet-scale-percent", 83, "input")}` },
  { id: "PS-P04", tab: "page", script: click("#vno-sheet-scale-pages-mode") },
  { id: "PS-P05", tab: "page", script: `${click("#vno-sheet-scale-pages-mode")};${set("#vno-sheet-scale-wide", 2, "input")}` },
  { id: "PS-P06", tab: "page", script: `${click("#vno-sheet-scale-pages-mode")};${set("#vno-sheet-scale-tall", 3, "input")}` },
  { id: "PS-P07", tab: "page", script: set("#vno-sheet-size", "a3") },
  { id: "PS-P08", tab: "page", script: set("#vno-sheet-print-quality", 300) },
  { id: "PS-P09", tab: "page", script: set("#vno-sheet-first-page-number", 7, "input") },
  { id: "PS-M01", tab: "margins", script: set("#vno-sheet-margin-top", 2.11, "input") },
  { id: "PS-M02", tab: "margins", script: set("#vno-sheet-margin-bottom", 2.22, "input") },
  { id: "PS-M03", tab: "margins", script: set("#vno-sheet-margin-left", 1.33, "input") },
  { id: "PS-M04", tab: "margins", script: set("#vno-sheet-margin-right", 1.44, "input") },
  { id: "PS-M05", tab: "margins", script: set("#vno-sheet-margin-header", 0.75, "input") },
  { id: "PS-M06", tab: "margins", script: set("#vno-sheet-margin-footer", 0.85, "input") },
  { id: "PS-M07", tab: "margins", script: tick("#vno-sheet-center-horizontal", true) },
  { id: "PS-M08", tab: "margins", script: tick("#vno-sheet-center-vertical", true) },
  { id: "PS-H01", tab: "headerFooter", script: set("#vno-sheet-header-preset", "page") },
  { id: "PS-H02", tab: "headerFooter", script: `${click(".vno-ps-custom-hf[data-kind=\"header\"]")};${set("#vno-sheet-header-left", "CUSTOM-H02", "input")}`, inspect: `[...document.querySelectorAll('[data-editor="header"] input')].length===3&&!document.querySelector('[data-editor="header"]').hidden` },
  { id: "PS-H03", tab: "headerFooter", script: `${click(".vno-ps-custom-hf[data-kind=\"header\"]")};${set("#vno-sheet-header-left", "Trai-DAU", "input")}` },
  { id: "PS-H04", tab: "headerFooter", script: `${click(".vno-ps-custom-hf[data-kind=\"header\"]")};${set("#vno-sheet-header-center", "&P Giua-DAU", "input")}` },
  { id: "PS-H05", tab: "headerFooter", script: `${click(".vno-ps-custom-hf[data-kind=\"header\"]")};${set("#vno-sheet-header-right", "Phai-DAU", "input")}` },
  { id: "PS-H06", tab: "headerFooter", script: set("#vno-sheet-footer-preset", "date") },
  { id: "PS-H07", tab: "headerFooter", script: `${click(".vno-ps-custom-hf[data-kind=\"footer\"]")};${set("#vno-sheet-footer-right", "CUSTOM-H07", "input")}`, inspect: `[...document.querySelectorAll('[data-editor="footer"] input')].length===3&&!document.querySelector('[data-editor="footer"]').hidden` },
  { id: "PS-H08", tab: "headerFooter", script: `${click(".vno-ps-custom-hf[data-kind=\"footer\"]")};${set("#vno-sheet-footer-left", "Trai-CHAN", "input")}` },
  { id: "PS-H09", tab: "headerFooter", script: `${click(".vno-ps-custom-hf[data-kind=\"footer\"]")};${set("#vno-sheet-footer-center", "&D Giua-CHAN", "input")}` },
  { id: "PS-H10", tab: "headerFooter", script: `${click(".vno-ps-custom-hf[data-kind=\"footer\"]")};${set("#vno-sheet-footer-right", "Phai-CHAN", "input")}` },
  { id: "PS-H11", tab: "headerFooter", script: tick("#vno-sheet-hf-odd-even", true) },
  { id: "PS-H12", tab: "headerFooter", script: tick("#vno-sheet-hf-first", true) },
  { id: "PS-H13", tab: "headerFooter", script: tick("#vno-sheet-hf-scale", false) },
  { id: "PS-H14", tab: "headerFooter", script: tick("#vno-sheet-hf-align", false) },
  { id: "PS-S01", tab: "sheet", script: set("#vno-sheet-print-area", "A1:H40", "input") },
  { id: "PS-S03", tab: "sheet", script: set("#vno-sheet-title-rows", "1:2", "input") },
  { id: "PS-S05", tab: "sheet", script: set("#vno-sheet-title-cols", "A:B", "input") },
  { id: "PS-S07", tab: "sheet", script: tick("#vno-sheet-print-gridlines", true) },
  { id: "PS-S08", tab: "sheet", script: tick("#vno-sheet-print-black-white", true) },
  { id: "PS-S09", tab: "sheet", script: tick("#vno-sheet-print-draft", true) },
  { id: "PS-S10", tab: "sheet", script: tick("#vno-sheet-print-headings", true) },
  { id: "PS-S11", tab: "sheet", script: set("#vno-sheet-print-comments", "sheetEnd") },
  { id: "PS-S12", tab: "sheet", script: set("#vno-sheet-print-cell-errors", "dash") },
  { id: "PS-S13", tab: "sheet", prelude: `g.setPageSetup({printOptions:{pageOrder:"overThenDown"}})`, script: click("#vno-sheet-order-down-over") },
  { id: "PS-S14", tab: "sheet", script: click("#vno-sheet-order-over-down") },
  { id: "PS-C01", tab: "margins", script: set("#vno-sheet-margin-top", 2.37, "input") }
];

const session = await launchApp("sheet", { filePath: output });
try {
  await ready(session, output);
  const { cdp } = session;
  const tabs = await cdp.evaluate(`(()=>{const g=window.__vnoAppInstance.grid;g.showPageSetupDialog("margins");const result=[...document.querySelectorAll(".vno-ps-tab")].map(b=>b.dataset.tab);document.querySelector(".vno-page-setup-dialog .vno-rule-cancel")?.click();return result})()`);
  check("PS-C00", JSON.stringify(tabs) === JSON.stringify(["page", "margins", "headerFooter", "sheet"]), JSON.stringify(tabs));
  for (const [tab, id] of [["page", "PS-P00"], ["margins", "PS-M00"], ["headerFooter", "PS-H00"], ["sheet", "PS-S00"]]) {
    await openDialog(cdp, tab);
    check(id, await cdp.evaluate(`!document.querySelector("#vno-ps-panel-${tab}").hidden&&document.querySelector("#vno-ps-tab-${tab}").getAttribute("aria-selected")==="true"`));
    await cdp.evaluate(click(".vno-page-setup-dialog .vno-rule-cancel"));
  }
  for (const spec of cases) {
    const observed = await applyCase(cdp, spec);
    if (spec.inspect) check(`${spec.id}-UI`, observed === true);
  }
  await applyPickerCase(cdp, { id: "PS-S02", field: "print-area", prelude: `g.selectionRange={start:{c:"A",r:1},end:{c:"H",r:40}};g.selectionRanges=[g.selectionRange]`, selectScript: "", expected: "A1:H40" });
  await applyPickerCase(cdp, { id: "PS-S04", field: "title-rows", selectScript: `document.querySelector('.vno-row-header[data-row="3"]').dispatchEvent(new MouseEvent("click",{bubbles:true}));document.querySelector('.vno-row-header[data-row="4"]').dispatchEvent(new MouseEvent("click",{bubbles:true,shiftKey:true}))`, expected: "3:4" });
  await applyPickerCase(cdp, { id: "PS-S06", field: "title-cols", selectScript: `document.querySelector('.vno-col-header[data-col="C"]').dispatchEvent(new MouseEvent("click",{bubbles:true}));document.querySelector('.vno-col-header[data-col="D"]').dispatchEvent(new MouseEvent("click",{bubbles:true,shiftKey:true}))`, expected: "C:D" });

  await addCaseSheet(cdp, "PS-C02");
  await openDialog(cdp, "margins");
  const before = await cdp.evaluate(`JSON.stringify(window.__vnoAppInstance.grid.getPageSetup())`);
  await cdp.evaluate(set("#vno-sheet-margin-top", 9.9, "input"));
  await cdp.evaluate(click(".vno-page-setup-dialog .vno-rule-cancel"));
  check("PS-C02-UI", before === await cdp.evaluate(`JSON.stringify(window.__vnoAppInstance.grid.getPageSetup())`));

  const saveState = await cdp.evaluate(`(()=>{const adapter=window.__vnoAppInstance.adapter;adapter.isDirty=true;const fods=adapter.serializeToFods();return globalThis.globalUnoBridge.saveRealFileInPlace("sheet",fods,${JSON.stringify(output)},${JSON.stringify(output)})})()`, { timeoutMilliseconds: 300000 });
  check("PS-SAVE", saveState?.status === "ok", JSON.stringify(saveState));
} finally { await session.close(); }

let reopenedState;
const reopened = await launchApp("sheet", { filePath: output });
try {
  await ready(reopened, output);
  reopenedState = JSON.parse(await reopened.cdp.evaluate(`JSON.stringify((()=>{const g=window.__vnoAppInstance.grid;return Object.fromEntries(g.sheets.map(name=>[name,{setup:g.getPageSetup(name),area:g.printAreaBySheet?.[name]||""}]))})())`));
} finally { await reopened.close(); }

const ps = path.join(repoRoot, "tests", "live", "cdp", "sheet-page-setup-readonly.ps1");
const raw = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps, "-File", output], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, timeout: 300000 }).trim();
const comBySheet = JSON.parse(raw);
const state = id => reopenedState[id] || {};
const setup = id => state(id).setup || {};
const com = id => comBySheet[id] || {};

const savedChecks = [
  ["PS-P01", () => setup("PS-P01").orientation === "portrait" && com("PS-P01").Orientation === 1],
  ["PS-P02", () => setup("PS-P02").orientation === "landscape" && com("PS-P02").Orientation === 2],
  ["PS-P03", () => setup("PS-P03").scale?.mode === "percent" && setup("PS-P03").scale?.percent === 83 && com("PS-P03").Zoom === 83],
  ["PS-P04", () => setup("PS-P04").scale?.mode === "pages" && (com("PS-P04").Zoom === false || com("PS-P04").Zoom === 0)],
  ["PS-P05", () => setup("PS-P05").scale?.pagesWide === 2 && com("PS-P05").FitToPagesWide === 2],
  ["PS-P06", () => setup("PS-P06").scale?.pagesTall === 3 && com("PS-P06").FitToPagesTall === 3],
  ["PS-P07", () => setup("PS-P07").size === "a3" && com("PS-P07").PaperSize === 8],
  ["PS-P08", () => Number(setup("PS-P08").pageSettings?.printQuality) === 300 && (Array.isArray(com("PS-P08").PrintQuality) ? com("PS-P08").PrintQuality[0] : com("PS-P08").PrintQuality) === 300],
  ["PS-P09", () => Number(setup("PS-P09").pageSettings?.firstPageNumber) === 7 && com("PS-P09").FirstPageNumber === 7],
  ["PS-M01", () => near(setup("PS-M01").margins?.top, 2.11, .02) && near(com("PS-M01").TopMargin, cmToPt(2.11))],
  ["PS-M02", () => near(setup("PS-M02").margins?.bottom, 2.22, .02) && near(com("PS-M02").BottomMargin, cmToPt(2.22))],
  ["PS-M03", () => near(setup("PS-M03").margins?.left, 1.33, .02) && near(com("PS-M03").LeftMargin, cmToPt(1.33))],
  ["PS-M04", () => near(setup("PS-M04").margins?.right, 1.44, .02) && near(com("PS-M04").RightMargin, cmToPt(1.44))],
  ["PS-M05", () => near(setup("PS-M05").margins?.header, .75, .02) && near(com("PS-M05").HeaderMargin, cmToPt(.75))],
  ["PS-M06", () => near(setup("PS-M06").margins?.footer, .85, .02) && near(com("PS-M06").FooterMargin, cmToPt(.85))],
  ["PS-M07", () => setup("PS-M07").centerOnPage?.horizontal === true && com("PS-M07").CenterHorizontally === true],
  ["PS-M08", () => setup("PS-M08").centerOnPage?.vertical === true && com("PS-M08").CenterVertically === true],
  ["PS-H01", () => setup("PS-H01").headerFooter?.header?.center.includes("&P") && String(com("PS-H01").CenterHeader).includes("&P")],
  ["PS-H02", () => setup("PS-H02").headerFooter?.header?.left === "CUSTOM-H02" && com("PS-H02").LeftHeader === "CUSTOM-H02"],
  ["PS-H03", () => setup("PS-H03").headerFooter?.header?.left === "Trai-DAU" && com("PS-H03").LeftHeader === "Trai-DAU"],
  ["PS-H04", () => setup("PS-H04").headerFooter?.header?.center === "&P Giua-DAU" && String(com("PS-H04").CenterHeader).includes("&P Giua-DAU")],
  ["PS-H05", () => setup("PS-H05").headerFooter?.header?.right === "Phai-DAU" && com("PS-H05").RightHeader === "Phai-DAU"],
  ["PS-H06", () => setup("PS-H06").headerFooter?.footer?.center.includes("&D") && String(com("PS-H06").CenterFooter).includes("&D")],
  ["PS-H07", () => setup("PS-H07").headerFooter?.footer?.right === "CUSTOM-H07" && com("PS-H07").RightFooter === "CUSTOM-H07"],
  ["PS-H08", () => setup("PS-H08").headerFooter?.footer?.left === "Trai-CHAN" && com("PS-H08").LeftFooter === "Trai-CHAN"],
  ["PS-H09", () => setup("PS-H09").headerFooter?.footer?.center === "&D Giua-CHAN" && String(com("PS-H09").CenterFooter).includes("&D Giua-CHAN")],
  ["PS-H10", () => setup("PS-H10").headerFooter?.footer?.right === "Phai-CHAN" && com("PS-H10").RightFooter === "Phai-CHAN"],
  ["PS-H11", () => setup("PS-H11").headerFooter?.differentOddEven === true && com("PS-H11").OddAndEvenPagesHeaderFooter === true],
  ["PS-H12", () => setup("PS-H12").headerFooter?.differentFirst === true && com("PS-H12").DifferentFirstPageHeaderFooter === true],
  ["PS-H13", () => setup("PS-H13").headerFooter?.scaleWithDocument === false && com("PS-H13").ScaleWithDocHeaderFooter === false],
  ["PS-H14", () => setup("PS-H14").headerFooter?.alignWithMargins === false && com("PS-H14").AlignMarginsHeaderFooter === false],
  ["PS-S01", () => state("PS-S01").area === "A1:H40" && unabsolute(com("PS-S01").PrintArea) === "A1:H40"],
  ["PS-S02", () => state("PS-S02").area === "A1:H40" && unabsolute(com("PS-S02").PrintArea) === "A1:H40"],
  ["PS-S03", () => setup("PS-S03").printTitles?.rows === "1:2" && unabsolute(com("PS-S03").PrintTitleRows) === "1:2"],
  ["PS-S04", () => setup("PS-S04").printTitles?.rows === "3:4" && unabsolute(com("PS-S04").PrintTitleRows) === "3:4"],
  ["PS-S05", () => setup("PS-S05").printTitles?.cols === "A:B" && unabsolute(com("PS-S05").PrintTitleColumns) === "A:B"],
  ["PS-S06", () => setup("PS-S06").printTitles?.cols === "C:D" && unabsolute(com("PS-S06").PrintTitleColumns) === "C:D"],
  ["PS-S07", () => setup("PS-S07").printOptions?.gridlines === true && com("PS-S07").PrintGridlines === true],
  ["PS-S08", () => setup("PS-S08").printOptions?.blackAndWhite === true && com("PS-S08").BlackAndWhite === true],
  ["PS-S09", () => setup("PS-S09").printOptions?.draft === true && com("PS-S09").Draft === true],
  ["PS-S10", () => setup("PS-S10").printOptions?.headings === true && com("PS-S10").PrintHeadings === true],
  ["PS-S11", () => setup("PS-S11").printOptions?.comments === "sheetEnd" && com("PS-S11").PrintComments === 1],
  ["PS-S12", () => setup("PS-S12").printOptions?.cellErrors === "dash" && com("PS-S12").PrintErrors === 2],
  ["PS-S13", () => setup("PS-S13").printOptions?.pageOrder === "downThenOver" && com("PS-S13").Order === 1],
  ["PS-S14", () => setup("PS-S14").printOptions?.pageOrder === "overThenDown" && com("PS-S14").Order === 2],
  ["PS-C01", () => near(setup("PS-C01").margins?.top, 2.37, .02) && near(com("PS-C01").TopMargin, cmToPt(2.37))],
  ["PS-C02", () => near(setup("PS-C02").margins?.top, 1.91, .02) && near(com("PS-C02").TopMargin, cmToPt(1.91))]
];

for (const [id, verify] of savedChecks) {
  try {
    const passed = verify();
    check(id, passed, passed ? "" : JSON.stringify({ app: state(id), com: com(id) }));
  }
  catch (error) { check(id, false, error.message); }
}

await fs.writeFile(path.join(outDir, "result.json"), JSON.stringify({ checks, com: comBySheet, reopened: reopenedState }, null, 2));
const failed = checks.filter(item => !item.pass);
console.log(`SUMMARY ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exitCode = 1;
