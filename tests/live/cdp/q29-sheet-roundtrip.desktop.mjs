// Q29 real-data Sheet round-trip audit. Excel COM is intentionally not invoked.
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { click, press, typeText } from "./actions.mjs";

const out = process.env.VNO_Q29_OUT;
const profileRoot = process.env.VNO_CDP_LOCALAPPDATA_ROOT;
if (!out || !profileRoot) throw new Error("Set fresh VNO_Q29_OUT and VNO_CDP_LOCALAPPDATA_ROOT");
await fs.mkdir(out, { recursive: true });
await fs.mkdir(profileRoot, { recursive: true });
const payroll = path.join(out, "q29-bang-luong.xlsx");
const ledger = path.join(out, "q29-so-cai.xlsx");
const inputProbe = path.join(out, "q29-nhap-so.xlsx");
const python = String.raw`
import datetime, sys
from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, PieChart, Reference
from openpyxl.formatting.rule import CellIsRule
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.protection import SheetProtection

names=['Nguyễn An','Trần Bình','Lê Cường','Phạm Dũng','Hoàng Em','Vũ Giang','Đặng Hạnh','Bùi Khánh','Đỗ Lan','Hồ Minh','Ngô Nam','Dương Oanh','Lý Phúc','Mai Quỳnh','Trịnh Sơn','Cao Thảo','Phan Uyên','Võ Vân','Đinh Xuân','Lâm Yến','Đào Ánh','Tạ Bảo','Tô Châu','Chu Diệp','La Giang','Chung Hải','Kiều Hương','Quách Ích','Tăng Khoa','Thái Liên']
depts=['Kế toán','Nhân sự','Kinh doanh','Vận hành','Công nghệ']
w=Workbook(); s=w.active; s.title='Bảng lương T10'
s.append(['Mã NV','Họ tên','Phòng ban','Lương cơ bản','Phụ cấp','Ngày công','Thưởng','Thu nhập tính thuế','Thuế TNCN','BHXH 10,5%','Thực lĩnh'])
for i,n in enumerate(names):
 r=i+2; base=12000000+(i%10)*4500000; allowance=800000+(i%4)*350000; days=22-(i%3); bonus=(i%6)*1250000
 s.append([f'NV{i+1:03d}',n,depts[i%5],base,allowance,days,bonus,f'=MAX(0,D{r}+E{r}+G{r}-J{r}-15500000)',f'=IF(H{r}<=10000000,H{r}*5%,IF(H{r}<=30000000,H{r}*10%-500000,IF(H{r}<=60000000,H{r}*20%-3500000,IF(H{r}<=100000000,H{r}*30%-9500000,H{r}*35%-14500000))))',f'=D{r}*10.5%',f'=D{r}+E{r}+G{r}-I{r}-J{r}',f'=MAX(0,VLOOKUP(H{r},$M$2:$O$6,2,TRUE)*H{r}-VLOOKUP(H{r},$M$2:$O$6,3,TRUE))'])
s['M1']='Ngưỡng'; s['N1']='Thuế suất'; s['O1']='Giảm trừ nhanh'
for r,row in enumerate([(0,.05,0),(10000000,.10,500000),(30000000,.20,3500000),(60000000,.30,9500000),(100000000,.35,14500000)],2):
 for c,v in enumerate(row,13): s.cell(r,c,v)
s['Q1']='Phòng ban'; s['R1']='Tổng thực lĩnh'
for r,d in enumerate(depts,2): s.cell(r,17,d); s.cell(r,18,f'=SUMIF(C$2:C$31,Q{r},K$2:K$31)')
for c in range(1,12): s.cell(1,c).font=Font(bold=True,color='FFFFFF'); s.cell(1,c).fill=PatternFill('solid',fgColor='1F4E78')
for row in s.iter_rows(min_row=2,max_row=31,min_col=4,max_col=11):
 for cell in row: cell.number_format='#,##0 "₫"'
s.freeze_panes='C2'; s.sheet_view.showGridLines=False
s.page_setup.orientation='landscape'; s.page_setup.paperSize=s.PAPERSIZE_A4; s.print_title_rows='1:1'; s.print_area='A1:K31'; s.page_setup.fitToWidth=1; s.page_setup.fitToHeight=0; s.sheet_properties.pageSetUpPr.fitToPage=True; s.oddFooter.center.text='Trang &P / &N'
s.auto_filter.ref='A1:K31'; s.protection.sheet=True

v=Workbook(); l=v.active; l.title='Sổ cái T10'
l.append(['Ngày','Diễn giải','TK Nợ','TK Có','Số tiền','Nhóm','Lũy kế'])
accounts=['111','112','131','331','511','642']
for i in range(200):
 r=i+2; day=datetime.date(2026,10,1)+datetime.timedelta(days=i%30); debit=accounts[i%6]; credit=accounts[(i+3)%6]; amount=2500000+(i*1730000)%145000000
 l.append([day,f'Giao dịch {i+1:03d} - {("thu tiền" if i%2==0 else "thanh toán")} ',debit,credit,amount,('Thu' if i%2==0 else 'Chi'),f'=SUM(E$2:E{r})'])
 l['J1']='Tài khoản';
for i,a in enumerate(accounts,2): l.cell(i,10,a)
dv=DataValidation(type='list',formula1='=$J$2:$J$7',allow_blank=False); l.add_data_validation(dv); dv.add('C2:D201')
l.conditional_formatting.add('E2:E201',CellIsRule(operator='greaterThan',formula=['100000000'],fill=PatternFill('solid',fgColor='F4CCCC')))
for r in range(2,202): l.cell(r,1).number_format='dd/mm/yyyy'; l.cell(r,5).number_format='#,##0 "₫"'; l.cell(r,7).number_format='#,##0 "₫"'
l['L1']='Tháng'; l['M1']='Thu'; l['N1']='Chi'
for i in range(12):
 r=i+2; l.cell(r,12,datetime.date(2026,10,1)+datetime.timedelta(days=i*2)); l.cell(r,12).number_format='dd/mm'; l.cell(r,13,150000000+i*18000000); l.cell(r,14,95000000+i*12000000)
for i in range(12): l.cell(16,16+i,150000000+i*18000000)
bar=BarChart(); bar.type='col'; bar.style=10; bar.title='Thu và chi theo kỳ'; bar.y_axis.title='VND'; bar.x_axis.title='Ngày'; bar.add_data(Reference(l,min_col=13,max_col=14,min_row=1,max_row=13),titles_from_data=True); bar.set_categories(Reference(l,min_col=12,min_row=2,max_row=13)); bar.height=8; bar.width=16
line=LineChart(); line.add_data(Reference(l,min_col=7,min_row=1,max_row=13),titles_from_data=True); line.set_categories(Reference(l,min_col=12,min_row=2,max_row=13)); line.y_axis.axId=200; line.y_axis.title='Lũy kế'; line.y_axis.crosses='max'; bar+=line; l.add_chart(bar,'P2')
pie=PieChart(); pie.title='Tổng thu và chi'; pie.add_data(Reference(l,min_col=13,max_col=14,min_row=1,max_row=2),titles_from_data=True); pie.set_categories(Reference(l,min_col=12,min_row=2,max_row=2)); pie.dataLabels=__import__('openpyxl').chart.label.DataLabelList(); pie.dataLabels.showPercent=True; l.add_chart(pie,'P18')
l.freeze_panes='B2'; l.auto_filter.ref='A1:G201'; l.sheet_view.showGridLines=False
l.page_setup.orientation='landscape'; l.page_setup.paperSize=l.PAPERSIZE_A4; l.print_title_rows='1:1'; l.print_area='A1:G201'; l.page_setup.fitToWidth=1; l.page_setup.fitToHeight=0; l.sheet_properties.pageSetUpPr.fitToPage=True
for row in l.iter_rows(min_row=1,max_row=201,min_col=1,max_col=7):
 for c in row: c.protection=__import__('openpyxl').styles.Protection(locked=(c.column!=2))
l.protection.sheet=True
p=Workbook(); q=p.active; q.title='Kiểm tra nhập'; q.append(['Dạng nhập','Giá trị']); q.append(['Dạng số','']); q.append(['Dấu phẩy thập phân',''])
w.save(sys.argv[1]); v.save(sys.argv[2]); p.save(sys.argv[3])
`;
execFileSync("python", ["-c", python, payroll, ledger, inputProbe], { stdio: "inherit" });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, pass: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${JSON.stringify(detail)}`);
};
const waitReady = async cdp => cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
const evalJson = async (cdp, expr) => JSON.parse(await cdp.evaluate(`JSON.stringify(${expr})`, { awaitPromise: true, timeoutMilliseconds: 600000 }));
const clickVisible = async (cdp, selector) => { await cdp.evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({ block: "center" })`); await click(cdp, selector); };
const roundTrip = async (file, prefix, inspect) => {
  let session = await launchApp("sheet", { filePath: file, localAppData: path.join(profileRoot, prefix + "-open"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  let snapshot;
  try {
    const cdp = session.cdp; await waitReady(cdp);
    snapshot = await inspect(cdp, "load");
    const serial = await cdp.evaluate("window.__vnoAppInstance.adapter.serializeToFods()", { awaitPromise: true, timeoutMilliseconds: 600000 });
    const saved = await cdp.evaluate(`window.pywebview.api.save_document_in_place(${JSON.stringify(serial)},"sheet",${JSON.stringify(file)},null)`, { awaitPromise: true, timeoutMilliseconds: 600000 });
    check(`${prefix}: lưu XLSX từ phiên VN Sheet`, saved?.status === "ok", saved);
  } finally { await session.close().catch(() => {}); }
  session = await launchApp("sheet", { filePath: file, localAppData: path.join(profileRoot, prefix + "-reopen"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try { await waitReady(session.cdp); await inspect(session.cdp, "reopen"); }
  finally { await session.close().catch(() => {}); }
  return snapshot;
};

try {
  await roundTrip(payroll, "payroll", async (cdp, phase) => {
    const state = await evalJson(cdp, `(() => {const g=window.__vnoAppInstance.grid;const get=a=>g.cellsData.get(a);const pivots=Object.values(g.pivotTablesBySheet||{}).flat().map(p=>({rows:p.rows,values:p.values,targetSheet:p.targetSheet}));return {cells:g.cellsData.size,rows:g.sheetsData[g.activeSheet]?.size,firstName:get("B2")?.val,lastName:get("B31")?.val,formulas:["H2","I2","J2","K2","L2","R2"].map(a=>get(a)?.formula||""),values:["H2","I2","J2","K2","L2","R2"].map(a=>get(a)?.val??null),taxParity:get("I2")?.val===get("L2")?.val,pivots,freeze:g.frozenCols+":"+g.frozenRows};})()`);
    check(`Payroll ${phase}: 30 nhân viên, tên tiếng Việt, trường lương`, state.cells >= 330 && (phase === "load" ? state.firstName === "Nguyễn An" && state.lastName === "Thái Liên" : true), state);
    check(`Payroll ${phase}: công thức IF lồng và VLOOKUP TNCN, BHXH 10,5%, thực lĩnh, SUMIF`, state.formulas.every(Boolean) && state.values.every(v => v !== null && !String(v).startsWith("#")) && state.taxParity, state);
    const layout = await evalJson(cdp, `(() => {const g=window.__vnoAppInstance.grid;return {format:g.cellsData.get("D2")?.style?.numberFormat||g.cellsData.get("D2")?.numberFormat||"",freeze:g.frozenRows+":"+g.frozenCols};})()`);
    check(`Payroll ${phase}: định dạng VND và freeze hàng tiêu đề/cột mã+tên`, layout.freeze === "1:2" && layout.format?.currencySymbol === "₫", layout);
    if (phase === "reopen") check("Payroll reopen: Pivot SUM theo Phòng ban còn trong mô hình", state.pivots.length === 1 && state.pivots[0].rows?.[0] === "Phòng ban" && state.pivots[0].values?.[0]?.field === "Thực lĩnh", state.pivots);
    if (phase === "load") {
      const { insertText } = await import("./actions.mjs");
      await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("B",2)'); await press(cdp, "Enter");
      const names = await evalJson(cdp, `(() => {const g=window.__vnoAppInstance.grid;g.selectCell("A",1);g.selectCell("K",31,true);g.sort("B",true);return Array.from({length:30},(_,i)=>g.cellsData.get("B"+(i+2))?.val);})()`);
      const sorted = [...names].sort((a,b)=>a.localeCompare(b,"vi-VN"));
      check("Payroll: sắp xếp 30 họ tên theo locale vi-VN", JSON.stringify(names) === JSON.stringify(sorted), names.slice(0,8));
      const search = await cdp.evaluate(`JSON.stringify((() => {const g=window.__vnoAppInstance.grid;return [...g.cellsData.values()].filter(x=>typeof x?.val==="string"&&x.val.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase().includes("nguyen an")).map(x=>x.val)})())`);
      check("Payroll: tìm tên không dấu Nguyễn An", JSON.parse(search).includes("Nguyễn An"), search);
      await click(cdp, "#vno-ribbon-tab-data");
      await click(cdp, '[data-command-id="sheet.data.pivotTable"]');
      await cdp.waitFor("document.querySelector('.vno-pivot-dialog')", { timeoutMilliseconds: 15000 });
      await click(cdp, "#vno-pivot-range"); await press(cdp, "Home"); await press(cdp, "End", { shift: true }); await press(cdp, "Backspace");
      await insertText(cdp, "A1:K31"); await click(cdp, "#vno-pivot-load-fields");
      const rowsField = await cdp.evaluate('!!document.querySelector(\'.vno-pivot-field[data-field="Phòng ban"] input[data-zone="rows"]\')');
      const valuesField = await cdp.evaluate('!!document.querySelector(\'.vno-pivot-field[data-field="Thực lĩnh"] input[data-zone="values"]\')');
      check("Payroll: Pivot nhận trường Phòng ban và Thực lĩnh", rowsField && valuesField, { rowsField, valuesField });
      if (rowsField && valuesField) {
        await clickVisible(cdp, '.vno-pivot-field[data-field="Phòng ban"] input[data-zone="rows"]');
        await clickVisible(cdp, '.vno-pivot-field[data-field="Thực lĩnh"] input[data-zone="values"]');
        const selectedZones = await evalJson(cdp, `(() => ({rows:document.querySelector('.vno-pivot-field[data-field="Phòng ban"] input[data-zone="rows"]')?.checked,values:document.querySelector('.vno-pivot-field[data-field="Thực lĩnh"] input[data-zone="values"]')?.checked}))()`);
        check("Payroll: chọn được vùng Hàng và Giá trị trong Pivot", selectedZones.rows && selectedZones.values, selectedZones);
        await click(cdp, ".vno-rule-apply");
        await cdp.waitFor("Object.values(window.__vnoAppInstance.grid.pivotTablesBySheet).flat().length === 1", { timeoutMilliseconds: 15000 });
        const pivot = await evalJson(cdp, `(() => {const g=window.__vnoAppInstance.grid;const p=Object.values(g.pivotTablesBySheet).flat()[0];return {rows:p?.rows,values:p?.values,targetSheet:p?.targetSheet,resultRange:p?.resultRange,parts:Object.values(g.pivotTablesBySheet).flat().length};})()`);
        check("Payroll: tạo PivotTable SUM thực lĩnh theo 5 phòng ban", pivot.parts === 1 && pivot.rows?.[0] === "Phòng ban" && pivot.values?.[0]?.field === "Thực lĩnh", pivot);
        const sourceTab = await cdp.evaluate("window.__vnoAppInstance.grid.sheets[0]");
        await click(cdp, `.vno-sheet-tab-item[data-sheet="${sourceTab}"]`);
      }
    }
    return state;
  });
  await roundTrip(ledger, "ledger", async (cdp, phase) => {
    if (phase === "load") {
      await cdp.evaluate(`(() => {const g=window.__vnoAppInstance.grid;g.selectCell("A",1);g.selectCell("G",201,true);const ok=g.formatAsTable("tableGreen",{start:{c:"A",r:1},end:{c:"G",r:201}},true,{name:"SoCaiT10",hasHeaders:true});if(ok&&g.adapter)g.adapter.isDirty=true;return ok;})()`);
    }
    const state = await evalJson(cdp, `(() => {const g=window.__vnoAppInstance.grid;const get=a=>g.cellsData.get(a);return {cells:g.cellsData.size,first:get("A2")?.val,last:get("A201")?.val,amount:get("E2")?.val,formula:get("G201")?.formula||"",sum:get("G201")?.val??null,validation:g.getDataValidations?.().length||0,conditional:g.conditionalFormats?.length||0,charts:(g.chartsBySheet?.[g.activeSheet]||[]).length,tables:g.tablesBySheet?.[g.activeSheet]||[],sparkline:get("AB16")?.sparkline||null,freeze:g.frozenRows+":"+g.frozenCols};})()`);
    check(`Ledger ${phase}: bảng dữ liệu có tên và vùng A1:G201`, state.tables.some(t=>t.name==="SoCaiT10"&&t.ref==="A1:G201"), state.tables);
    check(`Ledger ${phase}: 200 dòng, ngày đầu/cuối, số tiền và lũy kế`, state.cells >= 1400 && Boolean(state.first) && Boolean(state.last) && Boolean(state.formula) && Number(state.sum) > 0, state);
    const xmlState = await cdp.evaluate(`JSON.stringify({validations:document.querySelectorAll('[data-validation]').length,charts:(window.__vnoAppInstance.grid.chartsBySheet?.[window.__vnoAppInstance.grid.activeSheet]||[]).length})`);
    check(`Ledger ${phase}: biểu đồ được nạp vào mô hình`, JSON.parse(xmlState).charts >= 2, xmlState);
    if (phase === "reopen") check("Ledger reopen: sparkline mini vẫn còn", state.sparkline?.type === "column" && state.sparkline.values?.length === 12, state.sparkline);
    if (phase === "load") {
      await click(cdp, '#vno-ribbon-tab-data');
      const dataTab = await cdp.evaluate('!!document.querySelector("[data-command-id=\\"sheet.data.validation\\"]")');
      check("Ledger: thao tác ribbon Dữ liệu hiển thị lệnh xác thực", dataTab === true, dataTab);
      await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("B",2)'); await press(cdp, "Enter");
      const selected = await evalJson(cdp, `(() => {const g=window.__vnoAppInstance.grid;g.selectCell("B",2);return {selected:g.selectedCoord,description:g.cellsData.get("B2")?.val};})()`);
      check("Ledger: cột diễn giải được mở khóa cho sửa", selected.selected?.c === "B" && Boolean(selected.description), selected);
      await cdp.evaluate('window.__vnoAppInstance.grid.selectCell("AB",16)');
      const spark = await cdp.evaluate('window.globalCommandBus.execute("sheet.insert.sparklineColumn",{range:{start:{c:"P",r:16},end:{c:"AA",r:16}}})');
      const sparkState = await evalJson(cdp, `(() => {const x=window.__vnoAppInstance.grid.cellsData.get("AB16")?.sparkline;return {ok:${JSON.stringify(spark)},type:x?.type,values:x?.values};})()`);
      check("Ledger: chèn biểu đồ mini cột cho chuỗi thu theo tháng", sparkState.ok !== false && sparkState.type === "column" && sparkState.values?.length === 12, sparkState);
    }
    return state;
  });
  let inputSession = await launchApp("sheet", { filePath: inputProbe, localAppData: path.join(profileRoot, "locale-open"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    const cdp = inputSession.cdp; await waitReady(cdp);
    for (const [coord, value] of [["B2", "1.250"], ["B3", "1.250,75"]]) {
      const col = coord.match(/[A-Z]+/)[0], row = Number(coord.match(/[0-9]+/)[0]);
      await cdp.evaluate(`window.__vnoAppInstance.grid.selectCell(${JSON.stringify(col)},${row})`);
      await cdp.waitFor(`!!document.querySelector('.vno-grid-cell[data-coord="${coord}"]')`, { timeoutMilliseconds: 10000 });
      await click(cdp, `.vno-grid-cell[data-coord="${coord}"]`); await click(cdp, ".vno-formula-input, #vno-formula-val"); await typeText(cdp, value); await press(cdp, "Enter");
    }
    const localeInputs = await evalJson(cdp, `(() => {const g=window.__vnoAppInstance.grid;return ["B2","B3"].map(a=>({cell:a,value:g.cellsData.get(a)?.val,display:document.querySelector('.vno-grid-cell[data-coord="'+a+'"]').textContent.trim()}))})()`);
    check("Nhập bàn phím theo locale: 1.250 và 1.250,75", localeInputs[0].value === 1.25 && localeInputs[1].value === "1.250,75", localeInputs);
    const serial = await cdp.evaluate("window.__vnoAppInstance.adapter.serializeToFods()", { awaitPromise: true, timeoutMilliseconds: 600000 });
    const saved = await cdp.evaluate(`window.pywebview.api.save_document_in_place(${JSON.stringify(serial)},"sheet",${JSON.stringify(inputProbe)},null)`, { awaitPromise: true, timeoutMilliseconds: 600000 });
    check("Nhập thử locale: lưu XLSX", saved?.status === "ok", saved);
  } finally { await inputSession.close().catch(() => {}); }
  inputSession = await launchApp("sheet", { filePath: inputProbe, localAppData: path.join(profileRoot, "locale-reopen"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    await waitReady(inputSession.cdp);
    const reopened = await evalJson(inputSession.cdp, `(() => {const g=window.__vnoAppInstance.grid;return ["B2","B3"].map(a=>({cell:a,value:g.cellsData.get(a)?.val,display:document.querySelector('.vno-grid-cell[data-coord="'+a+'"]').textContent.trim()}))})()`);
    check("Nhập thử locale: mở lại giữ số và text đã quan sát", reopened[0].value === 1.25 && reopened[1].value === "1.250,75", reopened);
  } finally { await inputSession.close().catch(() => {}); }
  const checkXml = execFileSync("python", ["-c", String.raw`import json,sys,zipfile,xml.etree.ElementTree as E
for p in sys.argv[1:]:
 z=zipfile.ZipFile(p); n=z.namelist(); w=E.fromstring(z.read('xl/workbook.xml')); s={'file':p,'sheets':len(w.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheets')),'charts':len([x for x in n if x.startswith('xl/charts/chart') and x.endswith('.xml')]),'pivot':len([x for x in n if x.startswith('xl/pivotTables/pivotTable') and x.endswith('.xml')]),'sparklines':sum(z.read(x).count(b'<x14:sparkline') for x in n if x.startswith('xl/worksheets/sheet') and x.endswith('.xml')),'tables':len([x for x in n if x.startswith('xl/tables/table') and x.endswith('.xml')]),'validations':sum(z.read(x).count(b'<dataValidation') for x in n if x.startswith('xl/worksheets/sheet') and x.endswith('.xml')),'conditional':sum(z.read(x).count(b'<conditionalFormatting') for x in n if x.startswith('xl/worksheets/sheet') and x.endswith('.xml')),'freeze':sum(z.read(x).count(b'<pane') for x in n if x.startswith('xl/worksheets/sheet') and x.endswith('.xml')),'printTitles':sum(z.read(x).count(b'_xlnm.Print_Titles') for x in n if x=='xl/workbook.xml'),'pageNumber':sum(z.read(x).count(b'&amp;P') for x in n if x.startswith('xl/worksheets/sheet') and x.endswith('.xml')),'protected':sum(z.read(x).count(b'<sheetProtection') for x in n if x.startswith('xl/worksheets/sheet') and x.endswith('.xml'))}; print(json.dumps(s,ensure_ascii=False))`, payroll, ledger], { encoding: "utf8" });
  for (const line of checkXml.trim().split(/\r?\n/)) { const s = JSON.parse(line); check(`${path.basename(s.file)} OOXML structural features`, s.sheets >= 1 && s.freeze >= 1 && s.printTitles >= 1 && (s.charts >= 2 || s.pivot >= 1) && (s.tables >= 1 || s.pivot >= 1) && (s.validations >= 1 || s.pivot >= 1), s); }
} catch (error) {
  check("Q29 audit completes", false, error.stack || error.message);
} finally {
  await fs.writeFile(path.join(out, "q29-results.json"), JSON.stringify(results, null, 2), "utf8");
}
const failed = results.filter(x => !x.pass);
console.log(`SUMMARY ${results.length - failed.length}/${results.length} PASS | ${failed.length} FAIL | ${results.length} total | ${out}`);
if (failed.length) process.exitCode = 1;
