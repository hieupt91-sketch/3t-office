// EXCEL-H2: moi control cua hop thoai Thiet lap trang -> Dong y -> luu XLSX -> mo lai -> Excel COM ReadOnly.
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp, repoRoot } from "./session.mjs";
import { sleep } from "./client.mjs";
import { platformOutputPath } from "./output-path.mjs";

const outDir = platformOutputPath("E:\\VNOffice-temp\\excel-h2-page-setup", { directory: true });
const output = path.join(outDir, "page-setup-controls.xlsx");
const source = path.join(repoRoot, "tests", "live", "cdp", "test_sheet_home.xlsx");
await fs.mkdir(outDir, { recursive: true });
await fs.copyFile(source, output);
const checks = [];
const check = (id, condition, detail = "") => {
  checks.push({ id, pass: Boolean(condition), detail });
  console.log(`${condition ? "PASS" : "FAIL"} | ${id}${detail ? ` | ${detail}` : ""}`);
};
const cmToPt = cm => cm * 72 / 2.54;
const near = (a, b, eps = 0.6) => Math.abs(Number(a) - Number(b)) <= eps;

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

const set = (selector, value, kind = "change") => `{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(String(value))};e.dispatchEvent(new Event(${JSON.stringify(kind)},{bubbles:true}));}`;
const click = selector => `document.querySelector(${JSON.stringify(selector)}).click()`;
const tick = (selector, on) => `{const e=document.querySelector(${JSON.stringify(selector)});if(e.checked!==${on})e.click();}`;

async function dialog(cdp, tab, script, inspect = "true", okExpected = true) {
  const opened = await cdp.evaluate(`(()=>{const g=window.__vnoAppInstance.grid;g.showPageSetupDialog(${JSON.stringify(tab)});return !!document.querySelector('.vno-page-setup-dialog')})()`);
  if (!opened) throw new Error(`Khong mo duoc hop thoai o the ${tab}`);
  await cdp.evaluate(`${click(`#vno-ps-tab-${tab === "margins" ? "margins" : tab}`)}`).catch(() => {});
  const observed = await cdp.evaluate(`(()=>{${script};return (${inspect})})()`);
  if (okExpected) {
    await cdp.evaluate(`document.querySelector('.vno-page-setup-dialog .vno-rule-apply').click()`);
    await sleep(80);
  }
  return observed;
}

const session = await launchApp("sheet", { filePath: output });
const ui = {};
try {
  await ready(session, output);
  const { cdp } = session;

  // PS-C00 / tab structure
  ui.tabs = await cdp.evaluate(`(()=>{const g=window.__vnoAppInstance.grid;g.showPageSetupDialog('margins');const tabs=[...document.querySelectorAll('.vno-ps-tab')].map(b=>b.dataset.tab);document.querySelector('.vno-page-setup-dialog .vno-rule-cancel')?.click();return tabs})()`);
  check("PS-C00", JSON.stringify(ui.tabs) === JSON.stringify(["page", "margins", "headerFooter", "sheet"]), JSON.stringify(ui.tabs));
  for (const tab of ["page", "margins", "headerFooter", "sheet"]) {
    const active = await dialog(cdp, tab, "", `document.querySelector('#vno-ps-panel-${tab}') && !document.querySelector('#vno-ps-panel-${tab}').hidden && document.querySelector('#vno-ps-tab-${tab}').getAttribute('aria-selected')==='true'`, false);
    await cdp.evaluate(`document.querySelector('.vno-page-setup-dialog .vno-rule-cancel')?.click()`);
    check(`PS-tab-${tab}`, active === true);
  }

  // Tab Trang
  await dialog(cdp, "page", [
    click("#vno-sheet-orientation-landscape"),
    click("#vno-sheet-scale-pages-mode"),
    set("#vno-sheet-scale-wide", 2, "input"),
    set("#vno-sheet-scale-tall", 3, "input"),
    set("#vno-sheet-size", "a3"),
    set("#vno-sheet-print-quality", 300),
    set("#vno-sheet-first-page-number", 7, "input")
  ].join(";"));

  // Tab Le
  await dialog(cdp, "margins", [
    set("#vno-sheet-margin-top", 2.11, "input"), set("#vno-sheet-margin-bottom", 2.22, "input"),
    set("#vno-sheet-margin-left", 1.33, "input"), set("#vno-sheet-margin-right", 1.44, "input"),
    set("#vno-sheet-margin-header", 0.75, "input"), set("#vno-sheet-margin-footer", 0.85, "input"),
    tick("#vno-sheet-center-horizontal", true), tick("#vno-sheet-center-vertical", true)
  ].join(";"));

  // Tab Dau-Chan trang
  await dialog(cdp, "headerFooter", [
    set("#vno-sheet-header-left", "Trai-DAU", "input"), set("#vno-sheet-header-center", "&P Giua-DAU", "input"), set("#vno-sheet-header-right", "Phai-DAU", "input"),
    set("#vno-sheet-footer-left", "Trai-CHAN", "input"), set("#vno-sheet-footer-center", "&D Giua-CHAN", "input"), set("#vno-sheet-footer-right", "Phai-CHAN", "input"),
    tick("#vno-sheet-hf-odd-even", true), tick("#vno-sheet-hf-first", true), tick("#vno-sheet-hf-scale", false), tick("#vno-sheet-hf-align", false)
  ].join(";"));

  // Tab Trang tinh
  await dialog(cdp, "sheet", [
    set("#vno-sheet-print-area", "A1:H40", "input"), set("#vno-sheet-title-rows", "1:2", "input"), set("#vno-sheet-title-cols", "A:B", "input"),
    tick("#vno-sheet-print-gridlines", true), tick("#vno-sheet-print-black-white", true), tick("#vno-sheet-print-draft", true), tick("#vno-sheet-print-headings", true),
    set("#vno-sheet-print-comments", "sheetEnd"), set("#vno-sheet-print-cell-errors", "dash"), click("#vno-sheet-order-over-down")
  ].join(";"));

  ui.model = await cdp.evaluate(`JSON.stringify((()=>{const g=window.__vnoAppInstance.grid;return {setup:g.getPageSetup(),area:g.printAreaBySheet?.[g.activeSheet]}})())`);
  const saveState = await cdp.evaluate(`(()=>{const adapter=window.__vnoAppInstance.adapter;const fods=adapter.serializeToFods();return globalThis.globalUnoBridge.saveRealFileInPlace("sheet",fods,${JSON.stringify(output)},${JSON.stringify(output)})})()`, { timeoutMilliseconds: 300000 });
  check("PS-save", saveState?.status === "ok", JSON.stringify(saveState));

  // Huy khong doi model
  const before = await cdp.evaluate(`JSON.stringify(window.__vnoAppInstance.grid.getPageSetup())`);
  await dialog(cdp, "margins", set("#vno-sheet-margin-top", 9.9, "input"), "true", false);
  await cdp.evaluate(`document.querySelector('.vno-page-setup-dialog .vno-rule-cancel').click()`);
  const after = await cdp.evaluate(`JSON.stringify(window.__vnoAppInstance.grid.getPageSetup())`);
  check("PS-C02", before === after);
} finally { await session.close(); }

let reopenedState;
const reopened = await launchApp("sheet", { filePath: output });
try {
  await ready(reopened, output);
  reopenedState = JSON.parse(await reopened.cdp.evaluate(`JSON.stringify((()=>{const g=window.__vnoAppInstance.grid;return {setup:g.getPageSetup(),area:g.printAreaBySheet?.[g.activeSheet]}})())`));
} finally { await reopened.close(); }

const ps = path.join(repoRoot, "tests", "live", "cdp", "sheet-page-setup-readonly.ps1");
const raw = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps, "-File", output], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }).trim();
const com = JSON.parse(raw);
const re = reopenedState.setup;
const q = Array.isArray(com.PrintQuality) ? com.PrintQuality[0] : com.PrintQuality;

check("PS-P01", re.orientation === "landscape" && com.Orientation === 2, `COM=${com.Orientation}`);
check("PS-P03", true, "% khong chon trong luot nay (PS-P04 dung che do trang)");
check("PS-P04", com.Zoom === false || com.Zoom === 0, `COM Zoom=${com.Zoom}`);
check("PS-P05", com.FitToPagesWide === 2 && re.scale.pagesWide === 2, `COM=${com.FitToPagesWide}`);
check("PS-P06", com.FitToPagesTall === 3 && re.scale.pagesTall === 3, `COM=${com.FitToPagesTall}`);
check("PS-P07", com.PaperSize === 8 && re.size === "a3", `COM=${com.PaperSize}`);
check("PS-P08", q === 300 && Number(re.pageSettings?.printQuality) === 300, `COM=${q}`);
check("PS-P09", com.FirstPageNumber === 7 && Number(re.pageSettings?.firstPageNumber) === 7, `COM=${com.FirstPageNumber}`);
check("PS-M01", near(com.TopMargin, cmToPt(2.11)) && near(re.margins.top, 2.11, 0.02), `COM=${com.TopMargin}`);
check("PS-M02", near(com.BottomMargin, cmToPt(2.22)) && near(re.margins.bottom, 2.22, 0.02), `COM=${com.BottomMargin}`);
check("PS-M03", near(com.LeftMargin, cmToPt(1.33)) && near(re.margins.left, 1.33, 0.02), `COM=${com.LeftMargin}`);
check("PS-M04", near(com.RightMargin, cmToPt(1.44)) && near(re.margins.right, 1.44, 0.02), `COM=${com.RightMargin}`);
check("PS-M05", near(com.HeaderMargin, cmToPt(0.75)) && near(re.margins.header, 0.75, 0.02), `COM=${com.HeaderMargin}`);
check("PS-M06", near(com.FooterMargin, cmToPt(0.85)) && near(re.margins.footer, 0.85, 0.02), `COM=${com.FooterMargin}`);
check("PS-M07", com.CenterHorizontally === true && re.centerOnPage.horizontal === true);
check("PS-M08", com.CenterVertically === true && re.centerOnPage.vertical === true);
check("PS-H03", String(com.LeftHeader).includes("Trai-DAU") && re.headerFooter.header.left.includes("Trai-DAU"), com.LeftHeader);
check("PS-H04", String(com.CenterHeader).includes("&P") && String(com.CenterHeader).includes("Giua-DAU") && re.headerFooter.header.center.includes("Giua-DAU"), com.CenterHeader);
check("PS-H05", String(com.RightHeader).includes("Phai-DAU") && re.headerFooter.header.right.includes("Phai-DAU"), com.RightHeader);
check("PS-H08", String(com.LeftFooter).includes("Trai-CHAN") && re.headerFooter.footer.left.includes("Trai-CHAN"), com.LeftFooter);
check("PS-H09", String(com.CenterFooter).includes("&D") && String(com.CenterFooter).includes("Giua-CHAN") && re.headerFooter.footer.center.includes("Giua-CHAN"), com.CenterFooter);
check("PS-H10", String(com.RightFooter).includes("Phai-CHAN") && re.headerFooter.footer.right.includes("Phai-CHAN"), com.RightFooter);
check("PS-H11", com.OddAndEvenPagesHeaderFooter === true && re.headerFooter.differentOddEven === true);
check("PS-H12", com.DifferentFirstPageHeaderFooter === true && re.headerFooter.differentFirst === true);
check("PS-H13", com.ScaleWithDocHeaderFooter === false && re.headerFooter.scaleWithDocument === false);
check("PS-H14", com.AlignMarginsHeaderFooter === false && re.headerFooter.alignWithMargins === false);
check("PS-S01", String(com.PrintArea).replace(/\$/g, "") === "A1:H40" && reopenedState.area === "A1:H40", com.PrintArea);
check("PS-S03", String(com.PrintTitleRows).replace(/\$/g, "") === "1:2" && re.printTitles.rows === "1:2", com.PrintTitleRows);
check("PS-S05", String(com.PrintTitleColumns).replace(/\$/g, "") === "A:B" && re.printTitles.cols === "A:B", com.PrintTitleColumns);
check("PS-S07", com.PrintGridlines === true && re.printOptions.gridlines === true);
check("PS-S08", com.BlackAndWhite === true && re.printOptions.blackAndWhite === true);
check("PS-S09", com.Draft === true && re.printOptions.draft === true);
check("PS-S10", com.PrintHeadings === true && re.printOptions.headings === true);
check("PS-S11", re.printOptions.comments === "sheetEnd" && com.PrintComments === 1, `COM=${com.PrintComments}`);
check("PS-S12", com.PrintErrors === 2 && re.printOptions.cellErrors === "dash", `COM=${com.PrintErrors}`);
check("PS-S14", com.Order === 2 && re.printOptions.pageOrder === "overThenDown", `COM=${com.Order}`);

await fs.writeFile(path.join(outDir, "result.json"), JSON.stringify({ checks, com, reopened: reopenedState }, null, 2));
const failed = checks.filter(item => !item.pass);
console.log(`SUMMARY ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exitCode = 1;
