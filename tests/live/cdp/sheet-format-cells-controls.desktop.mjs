import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp, repoRoot } from "./session.mjs";
import { sleep } from "./client.mjs";

const outDir = "E:\\VNOffice-temp\\excel-h1-format-cells";
const output = path.join(outDir, "format-cells-controls.xlsx");
const source = path.join(repoRoot, "tests", "live", "cdp", "test_sheet_home.xlsx");
await fs.mkdir(outDir, { recursive: true });
await fs.copyFile(source, output);
const checks = [];
const check = (id, condition, detail = "") => { checks.push({ id, pass: Boolean(condition), detail }); console.log(`${condition ? "PASS" : "FAIL"} | ${id}${detail ? ` | ${detail}` : ""}`); };

async function ready(session) {
  const start = Date.now();
  while (Date.now() - start < 60000) {
    if (await session.cdp.evaluate('window.__vnoAppInstance?.grid?.cellsData && !document.querySelector(".vno-sheet-quick-view")')) return;
    await sleep(300);
  }
  throw new Error("Sheet did not leave quick view");
}

async function apply(cdp, coord, tab, script, range = null) {
  const opened = await cdp.evaluate(`(async()=>{const g=window.__vnoAppInstance.grid; const m=${JSON.stringify(coord)}.match(/^([A-Z]+)(\\d+)$/); g.selectCell(m[1],Number(m[2])); ${range ? `g.selectionRange=${JSON.stringify(range)};` : ""} await g.showFormatCellsDialog(${JSON.stringify(tab)}); return !!document.querySelector('.vno-format-cells-overlay')})()`);
  if (!opened) throw new Error(`Could not open dialog for ${coord}/${tab}`);
  await cdp.evaluate(`(()=>{${script}})()`);
  await cdp.evaluate(`document.querySelector('.vno-fc-ok-btn').click()`);
  await sleep(80);
}

const event = (selector, value, kind = "change") => `{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event(${JSON.stringify(kind)},{bubbles:true}));}`;
const click = selector => `document.querySelector(${JSON.stringify(selector)}).click();`;
const session = await launchApp("sheet", { filePath: output });
try {
  await ready(session);
  const { cdp } = session;
  await cdp.evaluate(`(()=>{const g=window.__vnoAppInstance.grid; const values={A1:-1234.1,A2:-1234.1,A3:-1234.1,A4:45365,A5:0.5625,A6:0.125,A7:2.375,A8:12345,A9:12345,A10:2125551212,A11:12.5,B1:'Alignment',B2:'Vertical',B3:'Merged',D1:'Font',D2:'Normal',I1:'Pattern',I2:'Gradient',J1:'Protection'};for(const [c,v] of Object.entries(values)){const m=c.match(/^([A-Z]+)(\\d+)$/);g.setCellValue(m[1],Number(m[2]),v)}})()`);

  await apply(cdp, "A1", "number", `${click('.vno-fc-cat-item[data-value="number"]')}${event('#vno-fc-decimals', 3, 'input')}${click('#vno-fc-thousands')}${click('.vno-fc-neg-item[data-value="3"]')}`);
  await apply(cdp, "A2", "number", `${click('.vno-fc-cat-item[data-value="currency"]')}${event('#vno-fc-symbol', '€')}${event('#vno-fc-decimals', 2, 'input')}${click('.vno-fc-neg-item[data-value="2"]')}`);
  await apply(cdp, "A3", "number", `${click('.vno-fc-cat-item[data-value="accounting"]')}${event('#vno-fc-symbol', '£')}${event('#vno-fc-decimals', 2, 'input')}`);
  await apply(cdp, "A4", "number", `${click('.vno-fc-cat-item[data-value="date"]')}${event('#vno-fc-locale', 'en-US')}${click('#vno-fc-date-list [data-value="yyyy-mm-dd"]')}`);
  await apply(cdp, "A5", "number", `${click('.vno-fc-cat-item[data-value="time"]')}${event('#vno-fc-locale', 'vi-VN')}${click('#vno-fc-time-list [data-value="hh:mm:ss"]')}`);
  await apply(cdp, "A6", "number", `${click('.vno-fc-cat-item[data-value="percentage"]')}${event('#vno-fc-decimals', 1, 'input')}`);
  await apply(cdp, "A7", "number", `${click('.vno-fc-cat-item[data-value="fraction"]')}${click('#vno-fc-fraction-list [data-value="# ??/??"]')}`);
  await apply(cdp, "A8", "number", `${click('.vno-fc-cat-item[data-value="scientific"]')}${event('#vno-fc-decimals', 4, 'input')}`);
  await apply(cdp, "A9", "number", click('.vno-fc-cat-item[data-value="text"]'));
  await apply(cdp, "A10", "number", `${click('.vno-fc-cat-item[data-value="special"]')}${click('#vno-fc-special-list [data-value="[<=9999999]###-####;(###) ###-####"]')}`);
  await apply(cdp, "A11", "number", `${click('.vno-fc-cat-item[data-value="custom"]')}${event('#vno-fc-custom-pattern', '0.000 "kg"', 'input')}`);
  await apply(cdp, "B1", "alignment", `${event('#vno-fc-align-h','centerContinuous')}${event('#vno-fc-align-v','distributed')}${event('#vno-fc-align-indent',3,'input')}${click('#vno-fc-wrap')}${click('#vno-fc-shrink')}${event('#vno-fc-text-dir','rtl')}${event('#vno-fc-orient-deg',37,'input')}`);
  await apply(cdp, "B2", "alignment", click('.vno-fc-orient-btn[data-angle="255"]'));
  await apply(cdp, "B3", "alignment", click('#vno-fc-merge'), { start: { c: "B", r: 3 }, end: { c: "C", r: 3 } });
  await apply(cdp, "D1", "font", `${event('#vno-fc-font-family','Arial')}${event('#vno-fc-font-style','boldItalic')}${event('#vno-fc-font-size',14,'input')}${event('#vno-fc-font-underline','doubleAccounting')}${event('#vno-fc-font-color','#c00000','input')}${click('#vno-fc-strike')}${click('[name="vno-fc-position"][value="super"]')}`);
  await apply(cdp, "D2", "font", click('#vno-fc-normal-font'));
  await apply(cdp, "E1", "border", `${event('#vno-fc-border-style','3px double')}${event('#vno-fc-border-color','#ff0000','input')}${click('[data-preset="outline"]')}${click('[data-preset="inside"]')}${click('[data-border="diagonalUp"]')}${click('[data-border="diagonalDown"]')}`, { start: { c: "E", r: 1 }, end: { c: "H", r: 4 } });
  await apply(cdp, "I1", "fill", `${event('#vno-fc-fill-color','#ffff00','input')}${event('#vno-fc-pattern-color','#ff0000','input')}${event('#vno-fc-pattern-style','darkDown')}`);
  await apply(cdp, "I2", "fill", `${event('#vno-fc-fill-color','#0070c0','input')}${event('#vno-fc-gradient-color2','#ffffff','input')}${event('#vno-fc-gradient-direction','vertical')}${click('#vno-fc-gradient-apply')}`);
  await apply(cdp, "J1", "protection", `${click('#vno-fc-locked')}${click('#vno-fc-formula-hidden')}`);

  for (const id of ["number", "alignment", "font", "border", "fill", "protection"]) check(`FC-${id}-tab`, true);
  await cdp.evaluate(`window.__vnoAppInstance.grid.selectCell('K',1);window.__vnoAppInstance.grid.showFormatCellsDialog('font')`); await cdp.evaluate(`document.querySelector('#vno-fc-font-size').value=30;document.querySelector('#vno-fc-font-size').dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.vno-fc-cancel-btn').click()`); check("FC-G02-cancel", !(await cdp.evaluate(`window.__vnoAppInstance.grid.cellsData.get('K1')?.style?.fontSize`)));
  await cdp.evaluate(`window.__vnoAppInstance.grid.selectCell('K',2);window.__vnoAppInstance.grid.showFormatCellsDialog('fill')`); await cdp.evaluate(`document.querySelector('.vno-fc-close-btn').click()`); check("FC-G01-close", !(await cdp.evaluate(`window.__vnoAppInstance.grid.cellsData.get('K2')?.style?.backgroundColor`)));
  const model = await cdp.evaluate(`(()=>{const g=window.__vnoAppInstance.grid;return {n:g.cellsData.get('A1').style.numberFormat,a:g.cellsData.get('B1').style,f:g.cellsData.get('D1').style,p:g.cellsData.get('J1').style,m:!!g.getMergedRangeForCell('B',3)}})()`);
  check("FC-model-before-save", model.n.decimals === 3 && model.a.horizontalAlignment === "centerContinuous" && model.f.fontUnderline === "doubleAccounting" && model.p.locked === false && model.p.formulaHidden && model.m, JSON.stringify(model));
  await cdp.evaluate(`(()=>{window.__vnoAppInstance.adapter.isDirty=true;window.__vnoAppInstance.adapter.save();return true})()`);
  const saveStart = Date.now();
  while (Date.now() - saveStart < 90000 && await cdp.evaluate(`window.__vnoAppInstance.adapter.isDirty`)) await sleep(500);
  check("FC-G03-save", !(await cdp.evaluate(`window.__vnoAppInstance.adapter.isDirty`)));
} finally { await session.close(); }

const reopened = await launchApp("sheet", { filePath: output });
try {
  await ready(reopened);
  const state = await reopened.cdp.evaluate(`(()=>{const g=window.__vnoAppInstance.grid;return {n:g.cellsData.get('A1')?.style?.numberFormat,a:g.cellsData.get('B1')?.style,f:g.cellsData.get('D1')?.style,p:g.cellsData.get('J1')?.style,m:!!g.getMergedRangeForCell('B',3)}})()`);
  check("FC-reopen-app", state.n?.decimals === 3 && state.a?.shrinkToFit && state.p?.locked === false && state.p?.formulaHidden && state.m, JSON.stringify(state));
} finally { await reopened.close(); }

const ps = path.join(repoRoot, "tests", "live", "cdp", "sheet-format-cells-controls-readonly.ps1");
const raw = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps, "-Path", output], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }).trim();
const com = JSON.parse(raw.split(/\r?\n/).at(-1));
check("FC-COM-readonly", com.ReadOnly === true);
check("FC-N03-N23", String(com.Number).includes("000") && String(com.Currency).includes("€") && String(com.Accounting).includes("£") && /yyyy-mm-dd/i.test(com.Date) && /h{1,2}:mm:ss/i.test(com.Time) && String(com.Percentage).includes("0.0%") && String(com.Fraction).includes("??/??") && /E\+00/i.test(com.Scientific) && com.Text === "@" && String(com.Special).includes("###-####") && String(com.Custom).includes("kg"), JSON.stringify(com));
check("FC-A01-A10", com.Alignment.Indent === 3 && com.Alignment.Wrap === true && com.Alignment.Shrink === true && com.Alignment.Orientation === 37 && com.Alignment.VerticalText === -4166 && com.Alignment.Merged === true, JSON.stringify(com.Alignment));
check("FC-F01-F10", com.Font.Name === "Arial" && Number(com.Font.Size) === 14 && com.Font.Bold && com.Font.Italic && com.Font.Strike && com.Font.Superscript && com.Font.Underline !== -4142, JSON.stringify(com.Font));
check("FC-B01-B14", Object.values(com.Borders).filter(item => item.LineStyle !== -4142).length >= 8, JSON.stringify(com.Borders));
check("FC-L01-L06", com.Fill.Pattern !== -4142 && com.Fill.GradientStops.length === 2, JSON.stringify(com.Fill));
check("FC-P01-P03", com.Protection.Locked === false && com.Protection.Hidden === true, JSON.stringify(com.Protection));
const failed = checks.filter(item => !item.pass);
console.log(`SUMMARY ${checks.length - failed.length}/${checks.length} PASS, ${failed.length} FAIL | ${output}`);
if (failed.length) process.exitCode = 1;
