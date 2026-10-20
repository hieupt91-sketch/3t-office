// Q21: Pivot filter field through the real Sheet dialog and source refresh.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { click, press, insertText } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to a fresh per-run profile.");
fs.mkdirSync(profile, { recursive: true });
const workbook = path.join(profile, "q21-pivot-filter.xlsx");
const py = [
  "import datetime,openpyxl,sys",
  "w=openpyxl.Workbook();s=w.active;s.title='BanHang'",
  "s.append(['Ngày','Vùng','Nhân viên','Sản phẩm','SL','Đơn giá','Thành tiền','Mã đơn'])",
  "regions=['Bắc','Nam','Trung'];products=['Bút','Vở','Kẹp']",
  "[s.append([datetime.date(2026,10,1)+datetime.timedelta(days=i%28),regions[i%3],f'NV{i%5+1}',products[i%3],i%7+1,10000+(i%9)*5000,f'=E{r}*F{r}',f'DH{i+1:03d}']) for i,r in enumerate(range(2,41))]",
  "[setattr(s.cell(r,1),'number_format','dd/mm/yyyy') for r in range(2,41)]",
  "w.save(sys.argv[1])",
].join(";");
execFileSync("python", ["-c", py, workbook], { stdio: "inherit" });

let session = await launchApp("sheet", { filePath: workbook, localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const results = [];
const check = (name, ok, detail = "") => {
  results.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const clickVisible = async (cdp, selector) => {
  await cdp.evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: "center" })`);
  await click(cdp, selector);
};
try {
  const { cdp } = session;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size >= 320 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  const fixture = await cdp.evaluate('JSON.stringify({cells:window.__vnoAppInstance.grid.cellsData.size,headers:["A1","H1"].map(k=>window.__vnoAppInstance.grid.cellsData.get(k)?.val)})');
  check("Load sales fixture with 40 rows × 8 columns", JSON.parse(fixture).cells >= 320 && JSON.parse(fixture).headers[0] === "Ngày" && JSON.parse(fixture).headers[1] === "Mã đơn", fixture);
  await click(cdp, "#vno-ribbon-tab-data");
  await click(cdp, '[data-command-id="sheet.data.pivotTable"]');
  await cdp.waitFor("document.querySelector('.vno-pivot-dialog')", { timeoutMilliseconds: 15000 });
  await click(cdp, "#vno-pivot-range");
  await press(cdp, "Home");
  await press(cdp, "End", { shift: true });
  await press(cdp, "Backspace");
  await insertText(cdp, "A1:H40");
  await click(cdp, "#vno-pivot-load-fields");
  const filterFields = await cdp.evaluate('document.querySelectorAll(\'.vno-pivot-field input[data-zone="filters"]\').length');
  const dialogState = await cdp.evaluate('JSON.stringify({range:document.querySelector("#vno-pivot-range")?.value,fieldRows:document.querySelectorAll(".vno-pivot-field").length,error:document.querySelector(".vno-rule-error")?.textContent,html:document.querySelector(".vno-pivot-fields")?.innerText})');
  check("Pivot dialog exposes filter fields", filterFields === 8, `filterFields=${filterFields}; ${dialogState}`);
  if (filterFields === 8) {
    await clickVisible(cdp, '.vno-pivot-field[data-field="Vùng"] input[data-zone="rows"]');
    await clickVisible(cdp, '.vno-pivot-field[data-field="Sản phẩm"] input[data-zone="columns"]');
    await clickVisible(cdp, '.vno-pivot-field[data-field="Thành tiền"] input[data-zone="values"]');
    await clickVisible(cdp, '.vno-pivot-field[data-field="Nhân viên"] input[data-zone="filters"]');
    const options = await cdp.evaluate('document.querySelectorAll(\'.vno-pivot-field[data-field="Nhân viên"] input[data-pivot-filter-value]\').length');
    check("Filter field lists all five employees", options === 5, `options=${options}`);
    for (const employee of ["NV2", "NV3", "NV4", "NV5"]) {
      await clickVisible(cdp, `.vno-pivot-field[data-field="Nhân viên"] input[data-pivot-filter-value="${employee}"]`);
    }
    await click(cdp, ".vno-rule-apply");
    await cdp.waitFor("Object.values(window.__vnoAppInstance.grid.pivotTablesBySheet).flat().length === 1", { timeoutMilliseconds: 15000 });
    let pivot = JSON.parse(await cdp.evaluate('JSON.stringify(Object.values(window.__vnoAppInstance.grid.pivotTablesBySheet).flat()[0])'));
    check("Create Pivot summary for region and product, filtered to NV1", pivot?.rows?.[0] === "Vùng" && pivot?.columns?.[0] === "Sản phẩm" && pivot?.values?.[0]?.field === "Thành tiền" && pivot?.filters?.[0]?.selectedValues?.join() === "NV1", JSON.stringify({ rows:pivot?.rows, columns:pivot?.columns, values:pivot?.values, filters:pivot?.filters }));
    const sourceTab = await cdp.evaluate('window.__vnoAppInstance.grid.sheets[0]');
    await click(cdp, `.vno-sheet-tab-item[data-sheet="${sourceTab}"]`);
    await click(cdp, '.vno-grid-cell[data-coord="G2"]');
    await click(cdp, ".vno-formula-input, #vno-formula-val");
    await press(cdp, "Home");
    await press(cdp, "End", { shift: true });
    await press(cdp, "Backspace");
    await insertText(cdp, "30000");
    await press(cdp, "Enter");
    const changed = await cdp.evaluate('window.__vnoAppInstance.grid.cellsData.get("G2")?.val');
    check("Keyboard changes source value before refresh", Number(changed) === 30000, String(changed));
    await click(cdp, `.vno-sheet-tab-item[data-sheet="${pivot.targetSheet}"]`);
    await click(cdp, "#vno-ribbon-tab-data");
    await click(cdp, '[data-command-id="sheet.data.pivotRefresh"]');
    pivot = JSON.parse(await cdp.evaluate('JSON.stringify(Object.values(window.__vnoAppInstance.grid.pivotTablesBySheet).flat()[0])'));
    const target = JSON.parse(await cdp.evaluate(`JSON.stringify({ range:${JSON.stringify(pivot.resultRange)}, value:window.__vnoAppInstance.grid.sheetsData[${JSON.stringify(pivot.targetSheet)}].get("B2")?.val })`));
    check("Refresh keeps the selected filter and recomputes Pivot", pivot.filters?.[0]?.selectedValues?.join() === "NV1" && Number(target.value) === 185000, JSON.stringify(target));
    const saved = await cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 300000 });
    check("Save filtered Pivot workbook", saved === true || saved?.status === "ok", JSON.stringify(saved));
  }
} catch (error) {
  check("Pivot filter desktop scenario completes", false, error.stack || error.message);
} finally {
  await session.close().catch(() => {});
}
if (results.length && results.every(Boolean)) {
  const xml = execFileSync("python", ["-c", "import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); names=[n for n in z.namelist() if n.startswith('xl/pivotTables/pivotTable') and n.endswith('.xml')]; print(json.dumps({'parts':names,'xml':z.read(names[0]).decode('utf-8') if names else ''}))", workbook], { encoding: "utf8", maxBuffer: 5 * 1024 * 1024 });
  const pivotXml = JSON.parse(xml);
  check("XLSX PivotTable keeps VN filter metadata", pivotXml.parts.length > 0 && /vno:filters=/.test(pivotXml.xml) && !/pageFields/.test(pivotXml.xml), `parts=${pivotXml.parts.length}; metadata=${/vno:filters=/.test(pivotXml.xml)}; pageFields=${/pageFields/.test(pivotXml.xml)}`);
  session = await launchApp("sheet", { filePath: workbook, localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    await session.cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
    const reopened = JSON.parse(await session.cdp.evaluate('JSON.stringify(Object.values(window.__vnoAppInstance.grid.pivotTablesBySheet).flat()[0] || null)'));
    check("Reopen keeps Pivot filter choices", reopened?.filters?.[0]?.field === "Nhân viên" && reopened.filters[0].selectedValues.join() === "NV1", JSON.stringify(reopened?.filters));
  } finally { await session.close().catch(() => {}); }
  const comPath = path.resolve("tests/live/cdp/q21-pivot-com-readonly.ps1");
  const com = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", comPath, "-Path", workbook], { encoding: "utf8", maxBuffer: 5 * 1024 * 1024 });
  const comState = JSON.parse(com);
  check("Excel COM ReadOnly reads filtered summary", comState.ReadOnly && comState.SheetCount === 2 && comState.Sheets.some(sheet => Number(sheet.B2) === 185000), JSON.stringify(comState));
}
const failed = results.filter(ok => !ok).length;
console.log(`SUMMARY ${results.length - failed}/${results.length} PASS | ${failed} FAIL`);
if (failed) process.exitCode = 1;
