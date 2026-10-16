// EXCEL-G2 desktop acceptance: validation, typed/color filters and XLSX reopen.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, sleep } from "./actions.mjs";
import { readZipEntry } from "../../helpers/zip-package.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to a dedicated EXCEL-G2 profile.");
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "excel-g2-roundtrip.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);

const check = (condition, message, detail = "") => {
  if (!condition) throw new Error(`${message}${detail ? ` | ${detail}` : ""}`);
  console.log(`PASS | ${message}${detail ? ` | ${detail}` : ""}`);
};

let session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0", { timeoutMilliseconds: 120000 });
  await cdp.evaluate(`(() => {
    const g=window.__vnoAppInstance.grid;
    [[1,"Tên",0],[2,"An",5],[3,"Bình",12],[4,"Anh",20],[5,"Chi",8],[6,"An",30]].forEach(([r,n,v])=>{g.setCellValue("A",r,n);g.setCellValue("B",r,v)});
    g.cellsData.get("A2").style.backgroundColor="#ff0000";
    g.cellsData.get("A4").style.backgroundColor="#0000ff";
    g.selectCell("A",1);g.selectCell("B",6,true);return true;
  })()`);

  await click(cdp, "#vno-ribbon-tab-data");
  await click(cdp, '[data-command-id="sheet.data.filter"]');
  await sleep(250);
  await click(cdp, '.vno-filter-btn[data-col="A"]');
  await cdp.evaluate(`(() => {
    const type=document.querySelector("#vno-filter-type");type.value="text";type.dispatchEvent(new Event("change",{bubbles:true}));
    const op=document.querySelector("#vno-filter-operator");op.value="startsWith";op.dispatchEvent(new Event("change",{bubbles:true}));
    document.querySelector("#vno-filter-criterion").value="An";return true;
  })()`);
  await click(cdp, "#vno-filter-advanced-apply");
  let hidden = await cdp.evaluate("JSON.stringify([...window.__vnoAppInstance.grid.hiddenRows])");
  check(hidden === "[3,5]", "Lọc văn bản bắt đầu bằng ẩn đúng hàng", hidden);

  await cdp.evaluate("window.__vnoAppInstance.grid.clearAllFilters()");
  await click(cdp, '.vno-filter-btn[data-col="A"]');
  await click(cdp, '[data-filter-color="#ff0000"][data-color-type="fill"]');
  hidden = await cdp.evaluate("JSON.stringify([...window.__vnoAppInstance.grid.hiddenRows])");
  check(hidden === "[3,4,5,6]", "Lọc theo màu ô phân biệt giá trị trùng", hidden);

  await cdp.evaluate("window.__vnoAppInstance.grid.clearAllFilters()");
  await click(cdp, '.vno-filter-btn[data-col="A"]');
  await click(cdp, '[data-sort-color="#ff0000"][data-color-type="fill"]');
  const firstAfterColorSort = await cdp.evaluate('String(window.__vnoAppInstance.grid.cellsData.get("A2")?.val||"")');
  check(firstAfterColorSort === "An", "Sắp xếp theo màu đưa màu chọn lên đầu", firstAfterColorSort);

  await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("D",2);window.__vnoAppInstance.grid.selectCell("D",6,true)');
  await click(cdp, '[data-command-id="sheet.data.validation"]');
  await cdp.evaluate(`(() => {
    const set=(q,v,event="input")=>{const n=document.querySelector(q);n.value=v;n.dispatchEvent(new Event(event,{bubbles:true}))};
    set("#vno-dv-type","whole","change");set("#vno-dv-operator","between","change");set("#vno-dv-value1","1");set("#vno-dv-value2","10");
    document.querySelector("#vno-dv-show-input").checked=true;set("#vno-dv-input-title","Gợi ý");set("#vno-dv-input-message","Nhập từ 1 đến 10");
    set("#vno-dv-error-style","warning","change");set("#vno-dv-error-title","Chưa đúng");set("#vno-dv-error-message","Kiểm tra lại");return true;
  })()`);
  await click(cdp, ".vno-rule-apply");
  const validation = JSON.parse(await cdp.evaluate('JSON.stringify(window.__vnoAppInstance.grid.getValidationForCell("D",2))'));
  check(validation?.type === "whole" && validation.operator === "between" && validation.errorStyle === "warning" && validation.inputTitle === "Gợi ý", "Hộp thoại lưu đủ loại/toán tử/thông báo/cảnh báo", JSON.stringify(validation));

  await cdp.evaluate(`(() => {const g=window.__vnoAppInstance.grid;
    const add=(c,config)=>g.addDataValidation({start:{c,r:2},end:{c,r:6}},config);
    add("E",{type:"decimal",operator:"greaterThan",formula1:1.5,errorStyle:"stop",showErrorMessage:true,errorTitle:"Lỗi",errorMessage:"Số phải lớn hơn 1,5"});
    add("F",{type:"date",operator:"between",formula1:"2026-10-01",formula2:"2026-10-31"});
    add("G",{type:"time",operator:"lessThan",formula1:"12:00"});
    add("H",{type:"textLength",operator:"lessThanOrEqual",formula1:12});
    add("I",{type:"custom",formula1:"=MOD(I2,2)=0"});
    add("J",{type:"list",values:"Mới,Đóng"});
    add("K",{type:"decimal",operator:"notBetween",formula1:1,formula2:2});
    add("L",{type:"decimal",operator:"equal",formula1:2});
    add("M",{type:"decimal",operator:"notEqual",formula1:2});
    add("N",{type:"decimal",operator:"greaterThanOrEqual",formula1:2});
    g.applyAdvancedFilter("A",{type:"text",operator:"startsWith",value:"An"});
    window.__vnoAppInstance.adapter.isDirty=true;return true;})()`);
  const saved = await cdp.evaluate("window.__vnoAppInstance.adapter.save()", { awaitPromise: true, timeoutMilliseconds: 180000 });
  check(saved !== false, "Lưu XLSX qua app desktop");
  await sleep(800);
} finally {
  await session.close();
}

const sheetXml = readZipEntry(readFileSync(file), "xl/worksheets/sheet1.xml").toString("utf8");
check(/<dataValidations count="11">/.test(sheetXml), "XLSX có đủ 7 kiểu và 8 toán tử validation");
for (const type of ["whole", "decimal", "date", "time", "textLength", "custom", "list"]) check(sheetXml.includes(`type="${type}"`), `XLSX ghi Validation.Type ${type}`);
for (const operator of ["between", "notBetween", "equal", "notEqual", "greaterThan", "lessThan", "greaterThanOrEqual", "lessThanOrEqual"]) check(sheetXml.includes(`operator="${operator}"`), `XLSX ghi Validation.Operator ${operator}`);
check(sheetXml.includes('errorStyle="warning"') && sheetXml.includes('promptTitle="Gợi ý"') && sheetXml.includes('errorTitle="Chưa đúng"'), "XLSX giữ nội dung cảnh báo");
check(sheetXml.includes('<customFilter operator="equal" val="An*"/>'), "XLSX ghi bộ lọc văn bản chuẩn");

session = await launchApp("sheet", { localAppData: profile, filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  await session.cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  const reopened = JSON.parse(await session.cdp.evaluate(`JSON.stringify((() => {const g=window.__vnoAppInstance.grid;const rules=g.getDataValidations();return {count:rules.length,types:rules.map(r=>r.type),filter:g.isFilterActive,hidden:[...g.hiddenRows]}})())`));
  check(reopened.count === 11, "Mở lại trong app giữ đủ validation", JSON.stringify(reopened));
  check(reopened.filter === true, "Mở lại trong app giữ trạng thái bộ lọc", JSON.stringify(reopened));
} finally {
  await session.close();
}

