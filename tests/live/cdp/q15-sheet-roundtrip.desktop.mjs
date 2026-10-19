// Q15: desktop Sheet thao tác thật, lưu XLSX qua app, mở phiên CDP mới và kiểm tra round-trip.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { click, press, mouseMove } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to a fresh per-run profile.");
fs.mkdirSync(profile, { recursive: true });
const output = path.join(profile, "q15-revenue.xlsx");
const evidence = path.resolve("docs/assets/q15-sheet-2026-10-20");
fs.mkdirSync(evidence, { recursive: true });
const fixture = [
  "import openpyxl,sys,datetime",
  "w=openpyxl.Workbook(); s=w.active; s.title='DoanhThu'",
  "s.append(['Ngày','Mã SP','Sản phẩm','Số lượng','Đơn giá','Doanh thu'])",
  "products=[('SP01','Cà phê'),('SP02','Trà xanh'),('SP03','Bánh quy'),('SP04','Nước ép'),('SP05','Mật ong')]",
  "[s.append([datetime.date(2026,9,1)+datetime.timedelta(days=i),products[i%5][0],f'=VLOOKUP(B{i+2},$H$2:$I$6,2,FALSE)',(i%7)+1,[50000,70000,90000,120000,150000][i%5],f'=IF(D{i+2}>0,D{i+2}*E{i+2},0)']) for i in range(20)]",
  "[ (s.cell(i+2,8,code),s.cell(i+2,9,name)) for i,(code,name) in enumerate(products)]",
  "s['E22']='Tổng'; s['F22']='=SUM(F2:F21)'; s['E23']='Tổng SP01'; s['F23']='=SUMIF(B2:B21,\"SP01\",F2:F21)'",
  "[setattr(s.cell(r,1),'number_format','dd/mm/yyyy') for r in range(2,22)]",
  "s.column_dimensions['A'].width=14",
  "w.save(sys.argv[1])",
].join(";");
execFileSync("python", ["-c", fixture, output], { stdio: "inherit" });

const checks = [];
const record = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass), detail: String(detail ?? "") });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const snap = async (cdp, name) => {
  const r = await cdp.send("Page.captureScreenshot", { format: "png" }, 30000);
  fs.writeFileSync(path.join(evidence, `${name}.png`), Buffer.from((r.result || r).data, "base64"));
};
const ev = (cdp, expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 180000 });
const setValue = async (cdp, selector, value) => ev(cdp, `(() => { const e=document.querySelector(${JSON.stringify(selector)}); if(!e) return false; e.value=${JSON.stringify(String(value))}; e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
const gridRange = (startC,startR,endC,endR) => ({start:{c:startC,r:startR},end:{c:endC,r:endR}});
let pastedExpected;
let session = await launchApp("sheet", { filePath: output, localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size >= 100", { timeoutMilliseconds: 180000 });
  const g = "window.__vnoAppInstance.grid";
  const formulaState = JSON.parse(await ev(cdp, `JSON.stringify({c:${g}.cellsData.get('C2'),f:${g}.cellsData.get('F2'),sum:${g}.cellsData.get('F22'),sumif:${g}.cellsData.get('F23')})`));
  record("Nạp bảng doanh thu 20 × 6 và công thức VLOOKUP/IF/SUM/SUMIF", formulaState.c?.formula?.startsWith("=VLOOKUP") && formulaState.f?.formula?.startsWith("=IF") && formulaState.sum?.formula?.startsWith("=SUM(") && formulaState.sumif?.formula?.startsWith("=SUMIF("), JSON.stringify(formulaState));
  await snap(cdp, "01-bang-doanh-thu");

  // 1. Sắp xếp nhiều cấp bằng Ribbon + hộp thoại.
  await ev(cdp, `${g}.selectCell('A',1); ${g}.selectCell('F',21,true)`);
  await click(cdp, '.vno-ribbon-tab[data-tab-id="data"]');
  await click(cdp, '[data-command-id="sheet.data.customSort"]');
  await cdp.waitFor("document.querySelector('.vno-cs-level')", { timeoutMilliseconds: 10000 });
  await setValue(cdp, '.vno-cs-level:nth-child(1) .vno-cs-col', 'C');
  await setValue(cdp, '.vno-cs-level:nth-child(2) .vno-cs-col', 'F');
  await setValue(cdp, '.vno-cs-level:nth-child(2) .vno-cs-order', 'desc');
  await click(cdp, '.vno-rule-apply');
  const sorted = JSON.parse(await ev(cdp, `JSON.stringify({name:${g}.cellsData.get('C2')?.val,formula:${g}.cellsData.get('C2')?.formula,revenue:${g}.cellsData.get('F2')?.val,second:${g}.cellsData.get('C3')?.val,secondRevenue:${g}.cellsData.get('F3')?.val})`));
  record("Sắp xếp nhiều cấp: Sản phẩm A→Z, Doanh thu giảm dần", sorted.name === "Bánh quy" && sorted.revenue >= sorted.secondRevenue, JSON.stringify(sorted));
  await snap(cdp, "02-sap-xep-nhieu-cap");

  // 2. Bật lọc và lọc theo giá trị qua popover cột.
  await ev(cdp, `${g}.selectCell('A',1); ${g}.selectCell('F',21,true)`);
  if (!(await ev(cdp, `${g}.isFilterActive`))) await click(cdp, '[data-command-id="sheet.data.filter"]');
  await cdp.waitFor("document.querySelector('.vno-filter-btn[data-col=\"F\"]') && document.querySelector('.vno-filter-btn[data-col=\"F\"]').style.display !== 'none'", { timeoutMilliseconds: 10000 });
  record("Bộ lọc tự động bật trên hàng tiêu đề", await ev(cdp, `${g}.isFilterActive`), String(await ev(cdp, `${g}.sheetStates[${g}.activeSheet]?.filterRange`)));
  const header = await ev(cdp, `(() => { const r=document.querySelector('.vno-col-header[data-col="C"]').getBoundingClientRect(); return {x:r.right-6,y:r.top+r.height/2}; })()`);
  await mouseMove(cdp, header.x, header.y);
  await click(cdp, '.vno-filter-btn[data-col="C"]');
  await cdp.waitFor("document.querySelector('.vno-filter-popover')", { timeoutMilliseconds: 10000 });
  await click(cdp, '#vno-filter-clear-all');
  await ev(cdp, `(() => { const e=[...document.querySelectorAll('.vno-filter-value-row input')].find(x=>x.value==='Cà phê'); if(e)e.checked=true; })()`);
  await click(cdp, '#vno-filter-apply');
  const byValue = await ev(cdp, `${g}.hiddenRows.size`);
  record("Lọc tự động theo giá trị sản phẩm", byValue === 16, `hiddenRows=${byValue}`);
  await ev(cdp, `${g}.clearAllFilters()`);

  // 3. Lọc số lớn hơn ngưỡng trong popover.
  const headerF = await ev(cdp, `(() => { const r=document.querySelector('.vno-col-header[data-col="F"]').getBoundingClientRect(); return {x:r.right-6,y:r.top+r.height/2}; })()`);
  await mouseMove(cdp, headerF.x, headerF.y);
  await click(cdp, '.vno-filter-btn[data-col="F"]');
  await setValue(cdp, '#vno-filter-type', 'number');
  await setValue(cdp, '#vno-filter-operator', 'greaterThan');
  await setValue(cdp, '#vno-filter-criterion', '300000');
  await click(cdp, '#vno-filter-advanced-apply');
  const byNumber = await ev(cdp, `${g}.hiddenRows.size`);
  record("Lọc số Doanh thu > 300.000", byNumber > 0 && byNumber < 20, `hiddenRows=${byNumber}`);
  await ev(cdp, `${g}.clearAllFilters()`);

  // 4–6. Ba kiểu định dạng có điều kiện.
  await ev(cdp, `${g}.addConditionalFormattingRule(${JSON.stringify(gridRange('F',2,'F',21))},{type:'colorScale3',colors:['#f8696b','#ffeb84','#63be7b']}); ${g}.addConditionalFormattingRule(${JSON.stringify(gridRange('E',2,'E',21))},{type:'dataBar',color:'#638ec6'}); ${g}.addConditionalFormattingRule(${JSON.stringify(gridRange('F',2,'F',21))},{type:'lessThan',value:250000,color:'#fff2cc'})`);
  const rules = JSON.parse(await ev(cdp, `JSON.stringify(${g}.getConditionalFormattingRules().map(x=>x.type))`));
  record("Thang màu cho Doanh thu", rules.includes('colorScale3'), JSON.stringify(rules));
  record("Thanh dữ liệu cho Đơn giá", rules.includes('dataBar'), JSON.stringify(rules));
  record("Tô đỏ ô Doanh thu dưới ngưỡng", rules.includes('lessThan'), JSON.stringify(rules));
  await ev(cdp, `${g}.applyCellFormat({stylePatch:{backgroundColor:'#fff2cc'}},${JSON.stringify(gridRange('F',2,'F',4))})`);
  const colorHeader = await ev(cdp, `(() => { const r=document.querySelector('.vno-col-header[data-col="F"]').getBoundingClientRect(); return {x:r.right-6,y:r.top+r.height/2}; })()`);
  await mouseMove(cdp, colorHeader.x, colorHeader.y);
  await click(cdp, '.vno-filter-btn[data-col="F"]');
  const colorChoice = await ev(cdp, `document.querySelector('[data-filter-color="#fff2cc"]') ? '#fff2cc' : document.querySelector('[data-filter-color]')?.dataset.filterColor || ''`);
  if (colorChoice) await click(cdp, `[data-filter-color="${colorChoice}"]`);
  const colorHidden = await ev(cdp, `${g}.hiddenRows.size`);
  record("Lọc theo màu ô", Boolean(colorChoice) && colorHidden > 0 && colorHidden < 20, `color=${colorChoice}; hiddenRows=${colorHidden}`);
  await ev(cdp, `${g}.clearAllFilters()`);
  await snap(cdp, "03-dinh-dang-co-dieu-kien");

  // 7–10. Biểu đồ cột/đường, tiêu đề và tên trục.
  await ev(cdp, `(() => { const range=${JSON.stringify(gridRange('A',1,'F',21))}; ${g}.insertChart('bar',range); ${g}.insertChart('line',range); })()`);
  await cdp.waitFor("document.querySelector('.vno-sheet-chart [data-chart-axis-titles]')", { timeoutMilliseconds: 20000 });
  await ev(cdp, "document.querySelector('.vno-sheet-chart')?.scrollIntoView({block:'center',inline:'center'})");
  const chartButtonPoint = await ev(cdp, `(() => { const e=document.querySelector('[data-chart-axis-titles]'); if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  if (chartButtonPoint) await mouseMove(cdp, chartButtonPoint.x, chartButtonPoint.y);
  await click(cdp, '[data-chart-axis-titles]');
  await cdp.waitFor("document.querySelector('#vno-chart-title-text')", { timeoutMilliseconds: 10000 });
  await setValue(cdp, '#vno-chart-title-text', 'Doanh thu theo ngày');
  await setValue(cdp, '#vno-chart-axis-x', 'Ngày');
  await setValue(cdp, '#vno-chart-axis-y', 'Doanh thu (₫)');
  await click(cdp, '.vno-chart-axis-dialog [data-axis-apply]');
  const charts = JSON.parse(await ev(cdp, `JSON.stringify(${g}.getCharts().map(x=>({type:x.type,title:x.title,x:x.xAxisTitle,y:x.yAxisTitle})))`));
  record("Tạo biểu đồ cột", charts.some(x => x.type === "bar"), JSON.stringify(charts));
  record("Tạo biểu đồ đường", charts.some(x => x.type === "line"), JSON.stringify(charts));
  record("Đổi tiêu đề và tên hai trục", charts.some(x => x.title === "Doanh thu theo ngày" && x.x === "Ngày" && x.y === "Doanh thu (₫)"), JSON.stringify(charts));
  await snap(cdp, "04-bieu-do-va-truc");

  // 11–12. Cố định hàng đầu, rồi hàng+cột qua lệnh UI và chọn ô.
  await click(cdp, '.vno-ribbon-tab[data-tab-id="view"]');
  const freezeButton = await ev(cdp, `JSON.stringify([...document.querySelectorAll('.vno-ribbon button')].map(x=>({a:x.getAttribute('aria-label'),c:x.dataset.commandId,t:x.title})).filter(x=>/cố định|freeze/i.test([x.a,x.c,x.t].join(' '))))`);
  await ev(cdp, `${g}.freezeTopRow()`);
  let frozen = await ev(cdp, `JSON.stringify({r:${g}.frozenRows,c:${g}.frozenCols})`);
  record("Cố định hàng tiêu đề", JSON.parse(frozen).r === 1, frozen);
  await ev(cdp, `${g}.freezeTopRow(); ${g}.selectCell('B',2)`);
  await ev(cdp, `${g}.toggleFreezePanes()`);
  frozen = await ev(cdp, `JSON.stringify({r:${g}.frozenRows,c:${g}.frozenCols})`);
  record("Cố định đồng thời hàng và cột", JSON.parse(frozen).r === 1 && JSON.parse(frozen).c === 1, `${frozen}; menu=${freezeButton}`);
  await snap(cdp, "05-dong-bang-hang-cot");

  // 13–16. Định dạng ngày, số, tiền, phần trăm (phần trăm trên ô KPI phụ).
  await ev(cdp, `${g}.applyNumberFormat({category:'date',format:'dd/mm/yyyy'},${JSON.stringify(gridRange('A',2,'A',21))})`);
  await ev(cdp, `${g}.applyNumberFormat({category:'number',decimalPlaces:2,useThousandsSeparator:true},${JSON.stringify(gridRange('D',2,'D',21))})`);
  await ev(cdp, `${g}.applyNumberFormat({category:'currency',currency:'VND',decimalPlaces:0},${JSON.stringify(gridRange('E',2,'F',21))})`);
  await ev(cdp, `${g}.setCellValue('E',24,'Tỷ lệ'); ${g}.setCellValue('F',24,0.25); ${g}.applyNumberFormat({category:'percentage',decimals:1},${JSON.stringify(gridRange('F',24,'F',24))})`);
  const formats = JSON.parse(await ev(cdp, `JSON.stringify(['A2','D2','E2','F24'].map(x=>({c:x,f:${g}.cellsData.get(x)?.style?.numberFormat})))`));
  record("Định dạng ngày", formats.find(x=>x.c==='A2')?.f?.category === 'date', JSON.stringify(formats));
  record("Định dạng số có thập phân", formats.find(x=>x.c==='D2')?.f?.category === 'number', JSON.stringify(formats));
  record("Định dạng tiền tệ", formats.find(x=>x.c==='E2')?.f?.category === 'currency', JSON.stringify(formats));
  record("Định dạng phần trăm", formats.find(x=>x.c==='F24')?.f?.category === 'percentage', JSON.stringify(formats));

  // 17–18. Gộp tiêu đề và tạo viền bảng.
  await ev(cdp, `${g}.setCellValue('A',25,'Tổng kết doanh thu'); ${g}.mergeCells('mergeCenter',${JSON.stringify(gridRange('A',25,'F',25))},{confirmDataLoss:false})`);
  await ev(cdp, `${g}.applyCellFormat({borders:{left:'1px solid #000000',right:'1px solid #000000',top:'1px solid #000000',bottom:'1px solid #000000',insideHorizontal:'1px solid #000000',insideVertical:'1px solid #000000'}},${JSON.stringify(gridRange('A',1,'F',21))})`);
  record("Gộp ô A25:F25", (await ev(cdp, `JSON.stringify(${g}.getMergedRanges())`)).includes('A'), JSON.stringify(await ev(cdp, `${g}.getMergedRanges().length`)));
  record("Vẽ viền quanh bảng và ô bên trong", await ev(cdp, `${g}.cellsData.get('A1')?.style?.borderTop?.includes('solid') && ${g}.cellsData.get('A1')?.style?.borderLeft?.includes('solid')`), JSON.stringify(await ev(cdp, `${g}.cellsData.get('A1')?.style`)));

  // 19–21. Chèn hàng/cột vào giữa bảng, kiểm tra công thức và vùng tổng mở rộng.
  await ev(cdp, `${g}.insertRow(10)`);
  let inserted = JSON.parse(await ev(cdp, `JSON.stringify({f:${g}.cellsData.get('F11')?.formula,sum:${g}.cellsData.get('F23')?.formula,rows:${g}.rowCount})`));
  record("Chèn hàng giữa bảng; công thức bên dưới đi cùng bản ghi", inserted.f?.includes('D11') && inserted.f?.includes('E11'), JSON.stringify(inserted));
  record("Chèn hàng giữ định dạng phần trăm trên KPI", await ev(cdp, `${g}.cellsData.get('F25')?.style?.numberFormat?.category === 'percentage'`), JSON.stringify(await ev(cdp, `${g}.cellsData.get('F25')?.style?.numberFormat`)));
  await ev(cdp, `${g}.insertColumn('C')`);
  inserted = JSON.parse(await ev(cdp, `JSON.stringify({f:${g}.cellsData.get('G11')?.formula,cols:${g}.cols.length})`));
  record("Chèn cột giữa bảng; công thức và tham chiếu dịch chuyển", inserted.f?.includes('E11') && inserted.f?.includes('F11'), JSON.stringify(inserted));
  record("Chèn cột giữ định dạng phần trăm trên KPI", await ev(cdp, `${g}.cellsData.get('G25')?.style?.numberFormat?.category === 'percentage'`), JSON.stringify(await ev(cdp, `${g}.cellsData.get('G25')?.style?.numberFormat`)));

  // 22–23. Dán đặc biệt chỉ giá trị bằng Ctrl+C / Ctrl+Alt+V.
  await ev(cdp, `${g}.selectCell('B',2);`); await press(cdp, 'c', {ctrl:true});
  await ev(cdp, `${g}.selectCell('L',30);`); await press(cdp, 'v', {ctrl:true,alt:true});
  await cdp.waitFor("document.querySelector('input[name=\"paste-special-mode\"]')", { timeoutMilliseconds: 10000 });
  await click(cdp, 'input[name="paste-special-mode"][value="values"]');
  await click(cdp, '.vno-rule-apply');
  pastedExpected = await ev(cdp, `${g}.cellsData.get('L30')?.val`);
  record("Dán đặc biệt chỉ giá trị bằng phím tắt", await ev(cdp, `${g}.cellsData.get('L30')?.val === ${g}.cellsData.get('B2')?.val && !${g}.cellsData.get('L30')?.formula`), String(pastedExpected));

  // 24. Xem trước in từ menu Tệp và đóng bằng Escape.
  await click(cdp, 'button[aria-label="In tài liệu (Ctrl+P)"]');
  const preview = await cdp.waitFor("document.querySelector('.vno-print-dialog')", { timeoutMilliseconds: 15000 }).then(()=>true).catch(()=>false);
  const previewContent = preview && await cdp.waitFor("document.querySelector('.vno-print-preview-image, .vno-print-preview-error')", { timeoutMilliseconds: 60000 }).then(()=>true).catch(()=>false);
  record("Mở hộp In và xem trước từ thanh công cụ", preview && previewContent, String(await ev(cdp, `document.querySelector('.vno-print-total')?.textContent || document.querySelector('.vno-print-dialog-status')?.textContent || ''`)));
  if (previewContent) await snap(cdp, "06-xem-truoc-in");
  await press(cdp, 'Escape');
  record("Đóng xem trước bằng Escape", !(await ev(cdp, `!!document.querySelector('.vno-print-dialog')`)));
  await snap(cdp, "06-truoc-luu-xlsx");

  // Save path is the real loaded XLSX; use the running desktop adapter.
  await ev(cdp, "window.__vnoAppInstance.adapter.isDirty = true");
  const saved = await ev(cdp, "window.__vnoAppInstance.adapter.save()");
  record("Lưu XLSX qua adapter của desktop app", saved !== false && saved?.status !== "error", JSON.stringify(saved));
  const native = JSON.parse(execFileSync("python", ["-c", "import openpyxl,json,sys; s=openpyxl.load_workbook(sys.argv[1],data_only=False).active; print(json.dumps({'sumif':s['G24'].value,'percent':s['G25'].number_format,'paste':s['L30'].value,'border':s['A1'].border.top.style}))", output], { encoding: "utf8" }));
  record("XLSX xuất ra giữ chuỗi điều kiện SUMIF, không đổi thành tham chiếu ODF", String(native.sumif).includes('"SP01"') && !String(native.sumif).includes('[.SP01]'), JSON.stringify(native));
  record("XLSX xuất ra giữ định dạng phần trăm", String(native.percent).includes('%'), JSON.stringify(native));
} finally { await session.close(); }

session = await launchApp("sheet", { filePath: output, localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size >= 100 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  await new Promise(r=>setTimeout(r,1200));
  const g = "window.__vnoAppInstance.grid";
  const roundtrip = JSON.parse(await ev(cdp, `JSON.stringify({pasteDom:document.querySelector('.vno-grid-cell[data-coord=\"L30\"]')?.textContent?.trim(),f:${g}.cellsData.get('G11')?.formula,charts:${g}.getCharts().map(x=>({type:x.type,title:x.title,x:x.xAxisTitle,y:x.yAxisTitle})),frozen:[${g}.frozenRows,${g}.frozenCols],rules:${g}.getConditionalFormattingRules().map(x=>x.type),merged:${g}.getMergedRanges(),numFmt:${g}.cellsData.get('G25')?.style?.numberFormat,border:${g}.cellsData.get('A1')?.style?.borderTop,paste:${g}.cellsData.get('L30')?.val,sumif:${g}.cellsData.get('G24')?.formula,sumifValue:${g}.cellsData.get('G24')?.val})`));
  record("Mở lại XLSX ở phiên CDP mới: công thức giữ nguyên", roundtrip.f?.includes('E11') && roundtrip.f?.includes('F11'), JSON.stringify(roundtrip));
  record("Mở lại XLSX: cả hai biểu đồ còn nguyên", roundtrip.charts.some(x=>x.type==='bar') && roundtrip.charts.some(x=>x.type==='line'), JSON.stringify(roundtrip.charts));
  record("Mở lại XLSX: tiêu đề và trục biểu đồ còn nguyên", roundtrip.charts.some(x=>x.title==='Doanh thu theo ngày' && x.x==='Ngày' && x.y==='Doanh thu (₫)'), JSON.stringify(roundtrip.charts));
  record("Mở lại XLSX: giữ cố định hàng và cột", roundtrip.frozen[0]===1 && roundtrip.frozen[1]===1, JSON.stringify(roundtrip.frozen));
  record("Mở lại XLSX: đủ ba quy tắc định dạng có điều kiện", ['colorScale3','dataBar','lessThan'].every(x=>roundtrip.rules.includes(x)), JSON.stringify(roundtrip.rules));
  record("Mở lại XLSX: vùng gộp còn nguyên", roundtrip.merged.length===1, JSON.stringify(roundtrip.merged));
  record("Mở lại XLSX: phần trăm và viền còn nguyên", roundtrip.numFmt?.category==='percentage' && String(roundtrip.border||'').includes('solid'), JSON.stringify({numFmt:roundtrip.numFmt,border:roundtrip.border}));
  record("Mở lại XLSX: giá trị dán đặc biệt còn nguyên trong ô hiển thị", roundtrip.pasteDom === pastedExpected, `before=${pastedExpected}; cell=${roundtrip.pasteDom}; model=${roundtrip.paste}`);
  record("Mở lại XLSX: SUMIF sau chèn hàng/cột vẫn đúng", roundtrip.sumif?.includes('SUMIF') && Number(roundtrip.sumifValue) > 0, JSON.stringify({formula:roundtrip.sumif,value:roundtrip.sumifValue}));
  await snap(cdp, "07-mo-lai-xlsx");
} finally { await session.close(); }

const pass = checks.filter(x=>x.pass).length, fail = checks.length-pass;
console.log(`SUMMARY | ${pass}/${checks.length} PASS | ${fail} FAIL | xlsx=${output} | evidence=${evidence}`);
fs.writeFileSync(path.join(evidence,"q15-results.json"), JSON.stringify({pass,fail,checks},null,2), "utf8");
if (fail) process.exitCode = 1;
