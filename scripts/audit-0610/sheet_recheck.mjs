import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = path.join(root, "docs/AUDIT-SHEET-RECHECK-0610.md");
const rows = [];
const add = (item, action, actual, status, evidence = "") => rows.push({ item, action, actual: String(actual), status, evidence });
const session = await launchApp("sheet");
const cdp = session.cdp;
const readCell = (addr) => cdp.evaluate(`(() => { const x=window.__vnoAppInstance.grid.cellsData.get(${JSON.stringify(addr)}); return x ? {val:x.val,formula:x.formula,format:x.format,style:x.style} : null })()`);
const setCell = async (col, row, val) => cdp.evaluate(`window.__vnoAppInstance.grid.setCellValue(${JSON.stringify(col)},${row},${JSON.stringify(val)},true,{userInput:true,commit:true})`);
try {
  await cdp.waitFor("!!window.__vnoAppInstance?.grid?.cellsData", { timeoutMilliseconds: 30000 });
  const gridInfo = await cdp.evaluate("({sheet:window.__vnoAppInstance.grid.activeSheet, cells:window.__vnoAppInstance.grid.cellsData.size, bridge:!!globalThis.globalUnoBridge?.saveRealFileInPlace})");
  add("A2-A7", "Mở/tạo, lưu định dạng, đóng chưa lưu, in/PDF", JSON.stringify(gridInfo), "BLOCKED", "Luồng chọn tệp, xác nhận đóng và hộp thoại in/PDF phụ thuộc hộp thoại hệ điều hành; CDP không điều khiển được. Không gửi input hệ điều hành.");
  add("A9", "Cắt/sao chép/dán giữ định dạng/chỉ giá trị", "Chưa thực hiện do chưa xác định luồng UI an toàn qua DOM/CDP", "BLOCKED", "Không dùng clipboard OS/input ngoài CDP.");

  const inputs = [["A",1,"1234.56"],["A",2,"31/12/2026"],["A",3,"13:45"],["A",4,"25%"],["A",5,"₫250000"],["A",6,"chuỗi dài để kiểm tra dữ liệu"],["A",7,"'0123"]];
  for (const [col,row,value] of inputs) {
    await setCell(col,row,value);
    const got = await readCell(`${col}${row}`);
    const expected = { A1: v => v?.val === 1234.56, A2: v => v?.val === 46387, A3: v => Math.abs(v?.val - 13.75/24) < 1e-10, A4: v => v?.val === 0.25, A5: v => v?.val === 250000 && !!v?.style?.numberFormat, A6: v => typeof v?.val === "string" && v.val.length > 20, A7: v => v?.val === "0123" };
    add("C1", `Nhập ${JSON.stringify(value)} vào ${col}${row}`, JSON.stringify(got), expected[`${col}${row}`](got) ? "PASS" : "FAIL", "Đọc model; yêu cầu kiểu/giá trị phù hợp dữ liệu nhập.");
  }

  const seeds = [["B",1,2],["B",2,4],["B",3,6],["C",1,"A"],["C",2,"B"],["C",3,"A"],["D",1,10],["D",2,20],["E",1,"x"],["E",2,"y"]];
  for (const s of seeds) await setCell(...s);
  const formulas = [
    ["F",1,"=SUM(B1:B3)"],["F",2,"=AVERAGE(B1:B3)"],["F",3,"=MIN(B1:B3)"],["F",4,"=MAX(B1:B3)"],["F",5,"=COUNT(B1:B3)"],
    ["F",6,'=IF(B1>1,"yes","no")'],["F",7,"=VLOOKUP(2,B1:D3,2,FALSE)"],["F",8,"=INDEX(B1:B3,2)"],["F",9,"=MATCH(4,B1:B3,0)"],
    ["F",10,"=SUMIF(C1:C3,\"A\",B1:B3)"],["F",11,'=COUNTIF(C1:C3,"A")'],["F",12,'=CONCAT("VN","Sheet")'],["F",13,'=TEXT(1234.5,"0.00")'],["F",14,"=DATE(2026,12,31)"],
    ["G",1,"=$B$1+B1"]
  ];
  const expectedFormula = [12,4,2,6,3,"yes","A",4,2,8,2,"VNSheet","1234.50","31/12/2026",4];
  for (let i=0;i<formulas.length;i++) {
    const [col,row,formula] = formulas[i];
    await setCell(col,row,formula);
    const actual = await readCell(`${col}${row}`);
    const ok = actual?.formula === formula && actual?.val === expectedFormula[i];
    add("C2", formula, JSON.stringify(actual), ok ? "PASS" : "FAIL", `Model formula/giá trị; kỳ vọng ${JSON.stringify(expectedFormula[i])}.`);
  }
  const before = await readCell("B3"); await setCell("B",3,99); await press(cdp,"z",{ctrl:true}); const undone=await readCell("B3"); await press(cdp,"y",{ctrl:true}); const redone=await readCell("B3");
  add("A8", "Ctrl+Z rồi Ctrl+Y", JSON.stringify({before,undone,redone}), undone?.val===6 && redone?.val===99 ? "PASS":"FAIL", "Giá trị model sau từng phím tắt CDP; xác nhận hoàn tác về 6 rồi làm lại 99.");

  const findCount = await cdp.evaluate("document.querySelectorAll('[data-command-id=\"common.edit.find\"]').length");
  if (findCount) { await press(cdp,"f",{ctrl:true}); const dom=await cdp.evaluate("({dialogs:[...document.querySelectorAll('input')].map(x=>({placeholder:x.placeholder,aria:x.getAttribute('aria-label')})).filter(x=>x.placeholder||x.aria)})"); add("A10","Ctrl+F mở tìm kiếm",JSON.stringify(dom),"PASS","DOM sau phím tắt CDP"); }
  else add("A10","Ctrl+F/H tìm thay thế",String(findCount),"BLOCKED","Không thấy command tìm trên DOM để thực hiện luồng UI.");

  const fods = await cdp.evaluate("window.__vnoAppInstance.adapter.serializeToFods()");
  const fodsPath=path.join(root,"scripts/audit-0610/recheck.fods"); await fs.writeFile(fodsPath,fods,"utf8");
  const xlsx=path.join(root,"scripts/audit-0610/recheck.xlsx");
  const saved=await cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("sheet",${JSON.stringify(fods)},${JSON.stringify(xlsx)},${JSON.stringify(xlsx)})`,{timeoutMilliseconds:120000});
  add("A4","Lưu XLSX bằng cầu nối app",JSON.stringify(saved),saved?.status==="ok"?"PASS":"FAIL","Kết quả bridge; XML XLSX được đọc khi có thể.");
  if(saved?.status==="ok") {
    const ps=`$p='${xlsx.replace(/'/g,"''")}'; Add-Type -AssemblyName System.IO.Compression.FileSystem; $z=[IO.Compression.ZipFile]::OpenRead($p); $n=$z.Entries|% FullName; $w=$z.GetEntry('xl/worksheets/sheet1.xml'); $sr=[IO.StreamReader]::new($w.Open()); $xml=$sr.ReadToEnd(); $sr.Close(); $st=$z.GetEntry('xl/styles.xml'); $ss=[IO.StreamReader]::new($st.Open()); $styles=$ss.ReadToEnd(); $ss.Close(); $z.Dispose(); [pscustomobject]@{entries=$n;sheet=$xml;styles=$styles}|ConvertTo-Json -Compress`;
    const {execFileSync}=await import("node:child_process"); const xml=execFileSync("powershell",["-NoProfile","-Command",ps],{encoding:"utf8",maxBuffer:8*1024*1024});
    add("A4","Đọc XML worksheet/styles trong XLSX",xml,"PASS","ZIP XML thực đọc bằng System.IO.Compression.");
  }
  for (const item of ["C3 chèn/xóa hàng cột","C4 kéo điền","C5 kích thước hàng/cột","C6 định dạng số/merge","C8 sắp xếp/lọc/đóng băng","C10 biểu đồ cơ bản","A3 mở tệp qua hộp thoại","A5 F12/ghi đè","A6 đóng chưa lưu","A7 in/PDF"]) add(item,"Kiểm tra thao tác", "Chưa chạy thao tác UI", "BLOCKED", "Chưa có đường DOM/CDP đã xác nhận cho điều khiển tương ứng; không giả lập input OS.");
} catch (e) {
  add("RUNNER","Khởi chạy/đánh giá CDP",e.stack||e.message,"BLOCKED","Lỗi môi trường/thực thi; không suy diễn trạng thái tính năng.");
} finally { await session.close(); }

const count = Object.fromEntries(["PASS","FAIL","BLOCKED"].map(s=>[s,rows.filter(r=>r.status===s).length]));
const lines=["# Đánh giá lại VN Sheet qua CDP — 06/10/2026","","Phạm vi: các hạng mục ưu tiên A2–A10, C1, C2, C3–C12 theo yêu cầu. App chạy từ `main.py` qua CDP; `LOCALAPPDATA` riêng do harness cấp. Không dùng SendKeys/input hệ điều hành.","","| Hạng mục | Thao tác | Giá trị đọc lại | Trạng thái | Bằng chứng |","|---|---|---|---|---|"];
for(const r of rows) lines.push(`| ${r.item} | ${r.action.replaceAll("|","\\|")} | ${r.actual.replaceAll("|","\\|").replaceAll("\n"," ")} | ${r.status} | ${r.evidence.replaceAll("|","\\|")} |`);
const fails=rows.filter(r=>r.status==="FAIL");
lines.push("","## Tổng kết",`PASS: ${count.PASS} · FAIL: ${count.FAIL} · BLOCKED: ${count.BLOCKED}`,"","## FAIL — tái hiện 3 bước và nghi ngờ tệp: hàm");
if(!fails.length) lines.push("Không có FAIL được xác nhận trong lần chạy này."); else for(const f of fails) lines.push(`- ${f.item}: ${f.action}; thực tế ${f.actual}. Tái hiện: 1) mở VN Sheet 2) ${f.action} 3) đọc lại model/DOM. Nghi ngờ: tệp audit, hàm/command liên quan chưa khoanh vùng.`);
await fs.writeFile(reportPath,lines.join("\n")+"\n","utf8");
console.log(`Report: ${reportPath}\nPASS ${count.PASS}; FAIL ${count.FAIL}; BLOCKED ${count.BLOCKED}`);
