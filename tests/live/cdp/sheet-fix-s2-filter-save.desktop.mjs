import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { readZipEntry } from "../../helpers/zip-package.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to the dedicated Sheet profile.");
const source = path.resolve("tests/live/cdp/test_sheet_home.xlsx");
const file = path.join(profile, "sheet-fix-s2-filter-roundtrip.xlsx");
mkdirSync(profile, { recursive: true });
copyFileSync(source, file);

let session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData}`);
  await session.cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0", { timeoutMilliseconds: 120000 });
  await click(session.cdp, "#vno-ribbon-tab-data");
  const filterCommand = '[data-command-id="sheet.data.filter"]';
  const visibleIndex = await session.cdp.evaluate(`(() => [...document.querySelectorAll(${JSON.stringify(filterCommand)})].findIndex(node=>node.getBoundingClientRect().width>0))()`);
  if (visibleIndex < 0) throw new Error("Không tìm thấy nút Dữ liệu > Bộ lọc");
  await click(session.cdp, filterCommand, visibleIndex);
  const filterState = await session.cdp.evaluate(`(() => {
    const grid=window.__vnoAppInstance.grid;
    grid.applyFilter("B", new Set(["Nguyễn Văn A"]));
    return {active:grid.isFilterActive, range:grid.sheetStates[grid.activeSheet]?.filterRange};
  })()`);
  if (!filterState.active || !filterState.range) throw new Error(`AutoFilter chưa bật trong lưới: ${JSON.stringify(filterState)}`);
  await session.cdp.evaluate("window.__vnoAppInstance.adapter.isDirty=true");
  const saved = await session.cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true });
  if (saved === false) throw new Error("Lưu XLSX trả về false");
  await sleep(800);
} finally {
  await session.close();
}

const sheetXml = readZipEntry(readFileSync(file), "xl/worksheets/sheet1.xml").toString("utf8");
const workbookXml = readZipEntry(readFileSync(file), "xl/workbook.xml").toString("utf8");
const autoFilter = sheetXml.match(/<autoFilter\b[^>]*>/)?.[0] || "";
if (!/ref="A1:G12"/.test(autoFilter)) throw new Error(`Sai hoặc thiếu AutoFilter ref: ${autoFilter || "missing"}`);
if (!sheetXml.includes('<filterColumn colId="1"><filters><filter val="Nguyễn Văn A"/></filters></filterColumn>')) {
  throw new Error("Không lưu tiêu chí filterColumn của cột B vào XLSX");
}
if (!workbookXml.includes("_xlnm._FilterDatabase") || !workbookXml.includes("$A$1:$G$12")) {
  throw new Error("Thiếu definedName _xlnm._FilterDatabase với vùng A1:G12");
}
console.log(`PASS | XLSX lưu bộ lọc | ${autoFilter} | filterColumn cột B | _FilterDatabase A1:G12`);

session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  await session.cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0", { timeoutMilliseconds: 120000 });
  const reopened = await session.cdp.evaluate(`(() => ({
    active:window.__vnoAppInstance.grid.isFilterActive,
    arrows:[...document.querySelectorAll(".vno-filter-btn")].filter(node=>getComputedStyle(node).display!=="none").length
  }))()`);
  if (!reopened.active || reopened.arrows < 1) throw new Error(`Mở lại không hiện trạng thái/mũi tên lọc: ${JSON.stringify(reopened)}`);
  console.log(`PASS | Mở lại XLSX hiện AutoFilter | ${JSON.stringify(reopened)}`);
} finally {
  await session.close();
}
