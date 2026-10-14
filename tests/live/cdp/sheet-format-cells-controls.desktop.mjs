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
const check = (id, condition, detail = "") => {
  checks.push({ id, pass: Boolean(condition), detail });
  console.log(`${condition ? "PASS" : "FAIL"} | ${id}${detail ? ` | ${detail}` : ""}`);
};

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

async function apply(cdp, coord, tab, script = "", range = null, inspect = "true") {
  const opened = await cdp.evaluate(`(async()=>{const g=window.__vnoAppInstance.grid;const m=${JSON.stringify(coord)}.match(/^([A-Z]+)(\\d+)$/);g.selectCell(m[1],Number(m[2]));${range ? `g.selectionRange=${JSON.stringify(range)};` : ""}await g.showFormatCellsDialog(${JSON.stringify(tab)});return !!document.querySelector('.vno-format-cells-overlay')})()`);
  if (!opened) throw new Error(`Could not open dialog for ${coord}/${tab}`);
  const observed = await cdp.evaluate(`(()=>{${script};return (${inspect})})()`);
  await cdp.evaluate(`document.querySelector('.vno-fc-ok-btn').click()`);
  await sleep(60);
  return observed;
}

const event = (selector, value, kind = "change") => `{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event(${JSON.stringify(kind)},{bubbles:true}));}`;
const click = selector => `document.querySelector(${JSON.stringify(selector)}).click()`;
const category = id => click(`.vno-fc-cat-item[data-value="${id}"]`);
const session = await launchApp("sheet", { filePath: output });
const ui = {};
try {
  await ready(session, output);
  const { cdp } = session;
  await cdp.evaluate(`(()=>{const g=window.__vnoAppInstance.grid;const values={
    A1:-1234.1,A2:1234567.89,A3:-1234.1,A4:12.5,A5:12.5,A6:-12.5,A7:12.5,A8:12.5,A9:45365,A10:45365,A11:0.5625,A12:0.5625,A13:0.125,A14:2.375,A15:12345,A16:12345,A17:2125551212,A18:12345,A19:12.5,A20:12.5,A21:12.5,A22:1234.5678,A23:1234.5,A24:1234.5,
    B1:'Horizontal',B2:'Indent',B3:'Vertical',B4:'Wrap',B5:'Shrink',B6:'Merge',C6:'',B7:'RTL',B8:'Rotate',B9:'Vertical text',B10:'Preview',
    D1:'Family',D2:'Style',D3:'Size',D4:'None',D5:'Single',D6:'Double',D7:'Single accounting',D8:'Double accounting',D9:'Color',D10:'Normal',D11:'Strike',D12:'Super',D13:'Sub',D14:'Preview',
    E1:'Line style',E2:'Line color',E10:'None preset',F1:'Outline',F2:'',G1:'',G2:'',F4:'Inside',F5:'',G4:'',G5:'',H1:'Left',H2:'Right',H3:'Top',H4:'Bottom',H5:'Inside H',H6:'',H8:'Inside V',I8:'',J1:'Diagonal up',J2:'Diagonal down',J3:'Preview',
    K1:'Background',K2:'No fill',K3:'Pattern color',K4:'Pattern style',K5:'Gradient',K6:'Clear gradient',K7:'Preview',L1:'Unlocked',L2:'Formula hidden',
    M1:'Number tab',M2:'Alignment tab',M3:'Font tab',M4:'Border tab',M5:'Fill tab',M6:'Protection tab',M7:'Cancel',M8:'Close',M9:'OK'};
    for(const [coord,value] of Object.entries(values)){const m=coord.match(/^([A-Z]+)(\\d+)$/);g.setCellValue(m[1],Number(m[2]),value)}
    g.customNumberFormats=['0.000 "delete"'];
  })()`);

  ui.tabs = {};
  for (const [row, tab] of ["number", "alignment", "font", "border", "fill", "protection"].entries()) {
    ui.tabs[tab] = await apply(cdp, `M${row + 1}`, tab, "", null, `document.querySelector('.vno-fc-tab.is-active')?.dataset.tab===${JSON.stringify(tab)}`);
  }

  await apply(cdp, "A1", "number", `${category("number")};${event("#vno-fc-decimals", 3, "input")}`);
  await apply(cdp, "A2", "number", category("number"));
  await apply(cdp, "A3", "number", `${category("number")};${click('.vno-fc-neg-item[data-value="3"]')}`);
  await apply(cdp, "A4", "number", `${category("currency")};${event("#vno-fc-decimals", 3, "input")}`);
  await apply(cdp, "A5", "number", `${category("currency")};${event("#vno-fc-symbol", "€")}`);
  await apply(cdp, "A6", "number", `${category("currency")};${click('.vno-fc-neg-item[data-value="2"]')}`);
  await apply(cdp, "A7", "number", `${category("accounting")};${event("#vno-fc-decimals", 3, "input")}`);
  await apply(cdp, "A8", "number", `${category("accounting")};${event("#vno-fc-symbol", "£")}`);
  await apply(cdp, "A9", "number", `${category("date")};${click('#vno-fc-date-list [data-value="yyyy-mm-dd"]')}`);
  await apply(cdp, "A10", "number", `${category("date")};${event("#vno-fc-locale", "en-US")}`);
  await apply(cdp, "A11", "number", `${category("time")};${click('#vno-fc-time-list [data-value="hh:mm:ss"]')}`);
  await apply(cdp, "A12", "number", `${category("time")};${event("#vno-fc-locale", "vi-VN")}`);
  await apply(cdp, "A13", "number", `${category("percentage")};${event("#vno-fc-decimals", 1, "input")}`);
  await apply(cdp, "A14", "number", `${category("fraction")};${click('#vno-fc-fraction-list [data-value="# ??/??"]')}`);
  await apply(cdp, "A15", "number", `${category("scientific")};${event("#vno-fc-decimals", 4, "input")}`);
  await apply(cdp, "A16", "number", category("text"));
  await apply(cdp, "A17", "number", `${category("special")};${click('#vno-fc-special-list [data-value="[<=9999999]###-####;(###) ###-####"]')}`);
  await apply(cdp, "A18", "number", `${category("special")};${event("#vno-fc-locale", "en-US")}`);
  await apply(cdp, "A19", "number", `${category("custom")};${event("#vno-fc-custom-pattern", '0.000 "kg"', "input")}`);
  await apply(cdp, "A20", "number", `${category("custom")};${click('.vno-fc-pattern-item[data-value="0.00"]')}`);
  ui.customDelete = await apply(cdp, "A21", "number", `${category("custom")};[...document.querySelectorAll('.vno-fc-pattern-item')].find(node=>node.dataset.value==='0.000 "delete"').click();${click("#vno-fc-delete-custom")}`, null, `![...document.querySelectorAll('.vno-fc-pattern-item')].some(node=>node.dataset.value==='0.000 "delete"')`);
  ui.numberSample = await apply(cdp, "A22", "number", `${category("number")};const before=document.querySelector('#vno-fc-sample-box').textContent;${event("#vno-fc-decimals", 4, "input")}`, null, `({before,after:document.querySelector('#vno-fc-sample-box').textContent})`);
  await apply(cdp, "A23", "number", category("general"));
  await apply(cdp, "A24", "number", category("general"));

  await apply(cdp, "B1", "alignment", event("#vno-fc-align-h", "centerContinuous"));
  await apply(cdp, "B2", "alignment", `${event("#vno-fc-align-h", "left")};${event("#vno-fc-align-indent", 3, "input")}`);
  await apply(cdp, "B3", "alignment", event("#vno-fc-align-v", "distributed"));
  await apply(cdp, "B4", "alignment", click("#vno-fc-wrap"));
  await apply(cdp, "B5", "alignment", click("#vno-fc-shrink"));
  await apply(cdp, "B6", "alignment", click("#vno-fc-merge"), { start: { c: "B", r: 6 }, end: { c: "C", r: 6 } });
  await apply(cdp, "B7", "alignment", event("#vno-fc-text-dir", "rtl"));
  await apply(cdp, "B8", "alignment", event("#vno-fc-orient-deg", 37, "input"));
  await apply(cdp, "B9", "alignment", click('.vno-fc-orient-btn[data-angle="255"]'));
  ui.alignmentPreview = await apply(cdp, "B10", "alignment", event("#vno-fc-orient-slider", -45, "input"), null, `getComputedStyle(document.querySelector('#vno-fc-orient-preview')).transform!=='none'`);

  await apply(cdp, "D1", "font", event("#vno-fc-font-family", "Arial"));
  await apply(cdp, "D2", "font", event("#vno-fc-font-style", "boldItalic"));
  await apply(cdp, "D3", "font", event("#vno-fc-font-size", 14, "input"));
  for (const [row, underline] of [[4, "none"], [5, "single"], [6, "double"], [7, "singleAccounting"], [8, "doubleAccounting"]]) await apply(cdp, `D${row}`, "font", event("#vno-fc-font-underline", underline));
  await apply(cdp, "D9", "font", event("#vno-fc-font-color", "#c00000", "input"));
  await apply(cdp, "D10", "font", `${event("#vno-fc-font-family", "Arial")};${event("#vno-fc-font-size", 20, "input")}`);
  await apply(cdp, "D10", "font", click("#vno-fc-normal-font"));
  await apply(cdp, "D11", "font", click("#vno-fc-strike"));
  await apply(cdp, "D12", "font", click('[name="vno-fc-position"][value="super"]'));
  await apply(cdp, "D13", "font", click('[name="vno-fc-position"][value="sub"]'));
  ui.fontPreview = await apply(cdp, "D14", "font", `${event("#vno-fc-font-family", "Arial")};${event("#vno-fc-font-color", "#c00000", "input")}`, null, `({family:document.querySelector('#vno-fc-font-preview').style.fontFamily,color:document.querySelector('#vno-fc-font-preview').style.color})`);

  await apply(cdp, "E1", "border", `${event("#vno-fc-border-style", "3px double")};${click('[data-border="bottom"]')}`);
  await apply(cdp, "E2", "border", `${event("#vno-fc-border-color", "#ff0000", "input")};${click('[data-border="bottom"]')}`);
  await apply(cdp, "E10", "border", click('[data-border="bottom"]'));
  await apply(cdp, "E10", "border", click('[data-preset="none"]'));
  await apply(cdp, "F1", "border", click('[data-preset="outline"]'), { start: { c: "F", r: 1 }, end: { c: "G", r: 2 } });
  await apply(cdp, "F4", "border", click('[data-preset="inside"]'), { start: { c: "F", r: 4 }, end: { c: "G", r: 5 } });
  for (const [coord, side] of [["H1", "left"], ["H2", "right"], ["H3", "top"], ["H4", "bottom"]]) await apply(cdp, coord, "border", click(`[data-border="${side}"]`));
  await apply(cdp, "H5", "border", click('[data-border="insideHorizontal"]'), { start: { c: "H", r: 5 }, end: { c: "H", r: 6 } });
  await apply(cdp, "H8", "border", click('[data-border="insideVertical"]'), { start: { c: "H", r: 8 }, end: { c: "I", r: 8 } });
  await apply(cdp, "J1", "border", `${event("#vno-fc-border-color", "#ff0000", "input")};${click('[data-border="diagonalUp"]')}`);
  await apply(cdp, "J2", "border", `${event("#vno-fc-border-color", "#ff0000", "input")};${click('[data-border="diagonalDown"]')}`);
  ui.borderPreview = await apply(cdp, "J3", "border", click('[data-border="bottom"]'), null, `document.querySelector('[data-border="bottom"]').classList.contains('vno-btn-primary')`);

  await apply(cdp, "K1", "fill", event("#vno-fc-fill-color", "#ffff00", "input"));
  await apply(cdp, "K2", "fill", event("#vno-fc-fill-color", "#ffff00", "input"));
  await apply(cdp, "K2", "fill", click("#vno-fc-no-fill"));
  await apply(cdp, "K3", "fill", `${event("#vno-fc-pattern-color", "#ff0000", "input")};${event("#vno-fc-pattern-style", "darkDown")}`);
  await apply(cdp, "K4", "fill", event("#vno-fc-pattern-style", "darkUp"));
  await apply(cdp, "K5", "fill", `${event("#vno-fc-fill-color", "#0070c0", "input")};${event("#vno-fc-gradient-color2", "#ffffff", "input")};${event("#vno-fc-gradient-direction", "vertical")};${click("#vno-fc-gradient-apply")}`);
  await apply(cdp, "K6", "fill", `${event("#vno-fc-fill-color", "#0070c0", "input")};${event("#vno-fc-gradient-color2", "#ffffff", "input")};${click("#vno-fc-gradient-apply")}`);
  await apply(cdp, "K6", "fill", click("#vno-fc-gradient-clear"));
  ui.fillPreview = await apply(cdp, "K7", "fill", event("#vno-fc-fill-color", "#ffff00", "input"), null, `document.querySelector('#vno-fc-fill-preview').style.background`);

  await apply(cdp, "L1", "protection", click("#vno-fc-locked"));
  await apply(cdp, "L2", "protection", click("#vno-fc-formula-hidden"));
  await cdp.evaluate(`(async()=>{const g=window.__vnoAppInstance.grid;g.selectCell('L',3);await g.showFormatCellsDialog('protection');document.querySelector('#vno-fc-protect-sheet').click()})()`);
  await sleep(80);
  ui.protectLink = await cdp.evaluate(`!!document.querySelector('#vno-protect-enable')`);
  await cdp.evaluate(`document.querySelector('.vno-rule-cancel')?.click()`);

  await cdp.evaluate(`(async()=>{const g=window.__vnoAppInstance.grid;g.selectCell('M',7);await g.showFormatCellsDialog('font');${event("#vno-fc-font-size", 30, "input")};document.querySelector('.vno-fc-cancel-btn').click()})()`);
  ui.cancel = !(await cdp.evaluate(`window.__vnoAppInstance.grid.cellsData.get('M7')?.style?.fontSize`));
  await cdp.evaluate(`(async()=>{const g=window.__vnoAppInstance.grid;g.selectCell('M',8);await g.showFormatCellsDialog('fill');${event("#vno-fc-fill-color", "#ffff00", "input")};document.querySelector('.vno-fc-close-btn').click()})()`);
  ui.close = !(await cdp.evaluate(`window.__vnoAppInstance.grid.cellsData.get('M8')?.style?.backgroundColor`));
  await apply(cdp, "M9", "font", event("#vno-fc-font-color", "#c00000", "input"));
  ui.ok = (await cdp.evaluate(`window.__vnoAppInstance.grid.cellsData.get('M9')?.style?.color`)) === "#C00000";

  const saveState = await cdp.evaluate(`(()=>{const adapter=window.__vnoAppInstance.adapter;const fods=adapter.serializeToFods();return globalThis.globalUnoBridge.saveRealFileInPlace("sheet",fods,${JSON.stringify(output)},${JSON.stringify(output)})})()`, { timeoutMilliseconds: 300000 });
  check("FC-G03-save", saveState?.status === "ok", JSON.stringify(saveState));
} finally { await session.close(); }

let reopenedState;
const reopened = await launchApp("sheet", { filePath: output });
try {
  await ready(reopened, output);
  reopenedState = await reopened.cdp.evaluate(`(()=>{const g=window.__vnoAppInstance.grid;const custom=g.cellsData.get('A19')?.style?.numberFormat;return {custom:custom?.customPattern||custom?.excelCode,rtl:g.cellsData.get('B7')?.style?.textDirection,sub:g.cellsData.get('D13')?.style?.fontPosition,diag:g.cellsData.get('J1')?.style?.borderDiagonalUp,noFill:g.cellsData.get('K2')?.style?.backgroundColor,unlocked:g.cellsData.get('L1')?.style?.locked,hidden:g.cellsData.get('L2')?.style?.formulaHidden,merged:!!g.getMergedRangeForCell('B',6)}})()`);
} finally { await reopened.close(); }

const ps = path.join(repoRoot, "tests", "live", "cdp", "sheet-format-cells-controls-readonly.ps1");
const raw = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps, "-File", output], { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }).trim();
const com = JSON.parse(raw.split(/\r?\n/).at(-1));
const nf = com.Number, al = com.Alignment, font = com.Font, border = com.Border, fill = com.Fill, protection = com.Protection;
const nonEmpty = value => value !== null && value !== undefined && value !== "";
const borderOn = item => item && item.LineStyle !== -4142;

check("FC-N00", ui.tabs.number && com.Tabs.Number === "General");
check("FC-N01", [nf.NumberDecimals,nf.NumberThousands,nf.CurrencySymbol,nf.AccountingSymbol,nf.DateType,nf.TimeType,nf.Percentage,nf.Fraction,nf.Scientific,nf.Text,nf.SpecialType,nf.CustomInput].every(nonEmpty), JSON.stringify(nf));
check("FC-N02", ui.numberSample.before !== ui.numberSample.after && String(nf.Sample).includes("0000"));
check("FC-N03", String(nf.NumberDecimals).includes("000"));
check("FC-N04", String(nf.NumberThousands).includes("#,##0"));
check("FC-N05", /\[Red\].*\(.*\)/i.test(String(nf.NumberNegative)));
check("FC-N06", String(nf.CurrencyDecimals).includes("000"));
check("FC-N07", String(nf.CurrencySymbol).includes("€"));
check("FC-N08", /\(.*\)/.test(String(nf.CurrencyNegative)));
check("FC-N09", String(nf.AccountingDecimals).includes("000"));
check("FC-N10", String(nf.AccountingSymbol).includes("£") && /[_*]/.test(String(nf.AccountingSymbol)));
check("FC-N11", /yyyy-mm-dd/i.test(String(nf.DateType)));
check("FC-N12", /\[\$-409\]/i.test(String(nf.DateLocale)));
check("FC-N13", /h{1,2}:mm:ss/i.test(String(nf.TimeType)));
check("FC-N14", /\[\$-42a\]/i.test(String(nf.TimeLocale)));
check("FC-N15", String(nf.Percentage).includes("0.0%"));
check("FC-N16", String(nf.Fraction).includes("??/??"));
check("FC-N17", /0\.0000E\+00/i.test(String(nf.Scientific)));
check("FC-N18", nf.Text === "@");
check("FC-N19", String(nf.SpecialType).includes("###-####"));
check("FC-N20", /\[\$-409\]/i.test(String(nf.SpecialLocale)));
check("FC-N21", String(nf.CustomInput).includes('0.000 "kg"') && reopenedState.custom === '0.000 "kg"');
check("FC-N22", nf.CustomList === "0.00");
check("FC-N23", ui.customDelete && nf.CustomDelete === "General");

check("FC-A00", ui.tabs.alignment && com.Tabs.Alignment.Horizontal === 1);
check("FC-A01", al.Horizontal === 7);
check("FC-A02", al.Indent === 3);
check("FC-A03", al.Vertical === -4117);
check("FC-A04", al.Wrap === true);
check("FC-A05", al.Shrink === true);
check("FC-A06", al.Merged === true && reopenedState.merged);
check("FC-A07", al.ReadingOrder === -5004 && reopenedState.rtl === "rtl");
check("FC-A08", al.Orientation === 37);
check("FC-A09", al.VerticalText === -4166);
check("FC-A10", ui.alignmentPreview && al.PreviewOrientation === -45);

check("FC-F00", ui.tabs.font && com.Tabs.Font.Name === com.NormalFont.Name);
check("FC-F01", font.Family.Name === "Arial");
check("FC-F02", font.Style.Bold === true && font.Style.Italic === true);
check("FC-F03", Number(font.Size.Size) === 14);
check("FC-F04", font.Underline.None === -4142 && font.Underline.Single === 2 && font.Underline.Double === -4119 && font.Underline.SingleAccounting === 4 && font.Underline.DoubleAccounting === 5, JSON.stringify(font.Underline));
check("FC-F05", font.Color.Color === 192);
check("FC-F06", font.Normal.Name === com.NormalFont.Name && Number(font.Normal.Size) === Number(com.NormalFont.Size));
check("FC-F07", font.Strike.Strikethrough === true);
check("FC-F08", font.Super.Superscript === true);
check("FC-F09", font.Sub.Subscript === true && reopenedState.sub === "sub");
check("FC-F10", /Arial/i.test(ui.fontPreview.family) && /192|c00000/i.test(ui.fontPreview.color) && font.Preview.Name === "Arial" && font.Preview.Color === 192);

check("FC-B00", ui.tabs.border && com.Tabs.Border.Bottom.LineStyle === -4142);
check("FC-B01", border.LineStyle.LineStyle === -4119);
check("FC-B02", border.LineColor.Color === 255);
check("FC-B03", [border.None.Left,border.None.Right,border.None.Top,border.None.Bottom].every(item => item.LineStyle === -4142));
check("FC-B04", [border.Outline.Left,border.Outline.Right,border.Outline.Top,border.Outline.Bottom].every(borderOn));
check("FC-B05", borderOn(border.Inside.Horizontal) && borderOn(border.Inside.Vertical));
check("FC-B06", borderOn(border.Left));
check("FC-B07", borderOn(border.Right));
check("FC-B08", borderOn(border.Top));
check("FC-B09", borderOn(border.Bottom));
check("FC-B10", borderOn(border.InsideHorizontal));
check("FC-B11", borderOn(border.InsideVertical));
check("FC-B12", borderOn(border.DiagonalUp) && border.DiagonalUp.Color === 255 && /#FF0000/i.test(reopenedState.diag || ""), JSON.stringify(border.DiagonalUp));
check("FC-B13", borderOn(border.DiagonalDown) && border.DiagonalDown.Color === 255, JSON.stringify(border.DiagonalDown));
check("FC-B14", ui.borderPreview && borderOn(border.Preview));

check("FC-L00", ui.tabs.fill && com.Tabs.Fill.Pattern === -4142);
check("FC-L01", fill.Background.Color === 65535 && fill.Background.Pattern === 1);
check("FC-L02", fill.None.Pattern === -4142 && !reopenedState.noFill);
check("FC-L03", fill.PatternColor.PatternColor === 255);
check("FC-L04", fill.PatternStyle.Pattern !== -4142 && fill.PatternStyle.Pattern !== 1);
check("FC-L05", fill.Gradient.Stops.length === 2 && fill.Gradient.Stops[0].Color === 12611584 && fill.Gradient.Stops[1].Color === 16777215 && Number(fill.Gradient.Degree) === 90, JSON.stringify(fill.Gradient));
check("FC-L06", /255|ffff00/i.test(ui.fillPreview) && fill.Preview.Color === 65535);

check("FC-P00", ui.tabs.protection && com.Tabs.Protection.Locked === true);
check("FC-P01", protection.Unlocked.Locked === false && reopenedState.unlocked === false);
check("FC-P02", protection.Hidden.FormulaHidden === true && reopenedState.hidden === true);
check("FC-P03", ui.protectLink && protection.Unlocked.Locked === false);
check("FC-G01", ui.close && com.General.Close.Pattern === -4142);
check("FC-G02", ui.cancel && Number(com.General.Cancel.Size) === Number(com.NormalFont.Size));
check("FC-G03", ui.ok && com.General.Ok.Color === 192);
check("FC-COM-readonly", com.ReadOnly === true);

const failed = checks.filter(item => !item.pass);
console.log(`SUMMARY ${checks.length - failed.length}/${checks.length} PASS, ${failed.length} FAIL | ${output}`);
if (failed.length) process.exitCode = 1;
