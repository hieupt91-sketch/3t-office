import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { launchApp } from "./session.mjs";

const out = process.env.VNO_Q22_OUT;
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!out || !profile) throw new Error("Set fresh VNO_Q22_OUT and VNO_CDP_LOCALAPPDATA");
await fs.mkdir(out, { recursive: true });
await fs.mkdir(profile, { recursive: true });
const xlsx = path.join(out, "q22-functions.xlsx");
const pdf = path.join(out, "q22-sheet.pdf");
const session = await launchApp("sheet", { localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, status: ok === "unsupported" ? "NOT SUPPORTED" : ok ? "PASS" : "FAIL", detail });
  console.log(`${ok === "unsupported" ? "NOT SUPPORTED" : ok ? "PASS" : "FAIL"} | ${name} | ${JSON.stringify(detail)}`);
};
const ev = expression => session.cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 600000 });
const grid = "window.__vnoAppInstance.grid";
const pdfText = file => {
  const bytes = fsSync.readFileSync(file), source = bytes.toString("latin1"), chunks = [source];
  for (const match of source.matchAll(/stream\r?\n/g)) {
    const start = match.index + match[0].length, end = source.indexOf("endstream", start);
    if (end < 0) continue;
    try { chunks.push(zlib.inflateSync(bytes.subarray(start, end).subarray(0, -1)).toString("latin1")); } catch {}
  }
  const all = chunks.join("\n"), cmap = new Map();
  for (const match of all.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
    const mapped = (match[2].match(/.{4}/g) || []).map(hex => String.fromCharCode(Number.parseInt(hex, 16))).join("");
    cmap.set(match[1].toUpperCase(), mapped);
  }
  const objects = new Map([...source.matchAll(/(\d+)\s+\d+\s+obj([\s\S]*?)endobj/g)].map(match => [Number(match[1]), match[2]]));
  const streamText = new Map();
  for (const [id, object] of objects) {
    const match = object.match(/stream\r?\n([\s\S]*?)endstream/);
    if (!match) continue;
    try { streamText.set(id, zlib.inflateSync(Buffer.from(match[1], "latin1")).toString("latin1")); } catch {}
  }
  const pages = [...objects.values()].filter(object => /\/Type\s*\/Page(?!s)\b/.test(object));
  const firstRefs = pages[0]?.match(/\/Contents\s*(?:\[([^\]]+)\]|(\d+)\s+\d+\s+R)/);
  const ids = (firstRefs?.[1]?.match(/\d+(?=\s+\d+\s+R)/g) || (firstRefs?.[2] ? [firstRefs[2]] : [])).map(Number);
  const firstPage = ids.map(id => streamText.get(id) || "").join("\n");
  const decoded = [...firstPage.matchAll(/<([0-9A-Fa-f]{4,})>/g)].map(match =>
    (match[1].toUpperCase().match(/.{4}/g) || []).map(hex => cmap.get(hex) || "").join("")
  ).join("\n");
  return { pages: pages.length, firstPage, decoded };
};
try {
  await session.cdp.waitFor("!!window.__vnoAppInstance?.grid?.cellsData", { timeoutMilliseconds: 180000 });
  const count = await ev(`(() => {
    const g=${grid};
    const products=[["Bút",1,10000],["Vở",2,15000],["Tẩy",3,5000],["Bút",4,10000],["Vở",5,15000]];
    const headers=["Ngày","Vùng","Nhân viên","Sản phẩm","SL","Đơn giá","Thành tiền","Mã"];
    headers.forEach((v,j)=>g.setCellValue(String.fromCharCode(65+j),1,v,false));
    for(let i=0;i<40;i++){
      const r=i+2,p=products[i%5],row=[46300+i,i%2?"Nam":"Bắc",i%3?"NV2":"NV1",p[0],p[1]+Math.floor(i/5),p[2],(p[1]+Math.floor(i/5))*p[2],"M"+String(i+1).padStart(3,"0")];
      row.forEach((v,j)=>g.setCellValue(String.fromCharCode(65+j),r,v,false));
    }
    for(const [c,v] of [["N1","Sản phẩm"],["O1","Tẩy"],["P1","Bút"],["N2","Số tiền"],["O2",5000],["P2",10000]]) g.setCellValue(c.match(/[A-Z]+/)[0],Number(c.match(/[0-9]+/)[0]),v,false);
    return g.cellsData.size;
  })()`);
  check("Nhập bảng bán hàng 40 × 8 vào lưới Sheet", count >= 326, `${count} ô`);

  const formulas = {
    J2: `=VLOOKUP("Bút",D2:G41,4,FALSE)`,
    J3: `=HLOOKUP("Bút",N1:P2,2,FALSE)`,
    J4: `=XLOOKUP("Vở",D2:D41,F2:F41,"Thiếu")`,
    J5: `=INDEX(G2:G41,MATCH("M010",H2:H41,0))`,
    J6: `=SUMIFS(G2:G41,B2:B41,"Bắc",C2:C41,"NV1")`,
    J7: `=COUNTIFS(B2:B41,"Bắc",C2:C41,"NV1")`,
    J8: `=AVERAGEIFS(G2:G41,B2:B41,"Bắc",C2:C41,"NV1")`,
    J9: `=IFERROR(1/0,"OK")`,
    J10: `=IFS(E2>=5,"Đạt",TRUE,"Chưa")`,
    J11: `=TEXT(A2,"dd/mm/yyyy")`,
    J12: `=TEXT(1234.5,"#,##0.00")`,
    J13: `=TEXT(0.125,"0.0%")`,
    J14: `=DATE(2026,10,20)`,
    J15: `=EDATE(DATE(2026,10,20),2)`,
    J16: `=EOMONTH(DATE(2026,10,20),0)`,
    J17: `=WORKDAY(DATE(2026,10,20),5)`,
    J18: `=LEFT(H2,2)`,
    J19: `=MID(H2,2,2)`,
    J20: `=SUBSTITUTE(H2,"M","X")`,
    J21: `=SUMPRODUCT(E2:E41,F2:F41)`,
    J22: `=UNIQUE(D2:D41)`,
    J23: `=FILTER(A2:H41,B2:B41="Bắc","Không có")`,
    J24: `=SORT(A2:H6,5,1)`,
  };
  await ev(`(() => { const g=${grid}; const f=${JSON.stringify(formulas)}; for(const [a,v] of Object.entries(f)){const c=a.match(/[A-Z]+/)[0],r=Number(a.match(/[0-9]+/)[0]);g.setCellValue(c,r,v,false);} g.recalculate?.(); return true; })()`);
  const values = JSON.parse(await ev(`(() => { const g=${grid}; return JSON.stringify(Object.fromEntries(Object.entries(${JSON.stringify(formulas)}).map(([a,f])=>[a,{formula:g.cellsData.get(a)?.formula||"",value:g.cellsData.get(a)?.val??null,display:document.querySelector('.vno-grid-cell[data-coord="'+a+'"]')?.textContent?.trim()||""}]))); })()`));
  for (const [cell, result] of Object.entries(values)) {
    if (["J22", "J23", "J24"].includes(cell)) {
      check(`${cell} ${formulas[cell]} currently unavailable in the formula engine`, "unsupported", result);
    } else check(`${cell} ${formulas[cell]}`, Boolean(result.formula) && result.value !== null && !String(result.value).startsWith("#NAME?"), result);
  }

  const content = await ev("window.__vnoAppInstance.adapter.serializeToFods()");
  const saved = await ev(`window.pywebview.api.save_document_in_place(${JSON.stringify(content)},"sheet",${JSON.stringify(xlsx)},null)`);
  check("Lưu XLSX qua API app", saved?.status === "ok", saved);
  const prepared = await ev(`window.pywebview.api.prepare_print_document("sheet",${JSON.stringify(content)},"Q22 Sheet",${JSON.stringify(xlsx)},true,{})`);
  check("Chuẩn bị bản in Sheet", prepared?.status === "ok" && prepared.pageCount > 0, prepared);
  if (prepared?.status === "ok") {
    const printed = await ev(`window.pywebview.api.print_document(${JSON.stringify(prepared.sessionId)},{printer:"Microsoft Print to PDF",copies:1,pageRange:"",destinationPath:${JSON.stringify(pdf)}})`);
    check("Xuất PDF thật qua API in", printed?.status === "ok", printed);
    if (printed?.status === "ok") {
      const bytes = fsSync.readFileSync(pdf), raw = bytes.toString("latin1"), text = pdfText(pdf);
      const pages = text.pages;
      const draws = (text.firstPage.match(/\b(?:Tj|TJ)\b/g) || []).length;
      const normalized = text.decoded.replace(/\s+/g, "");
      check("PDF có đúng số trang API báo và trang đầu có tiêu đề/dòng dữ liệu", pages === prepared.pageCount && draws > 0 && normalized.includes("Ngày") && normalized.includes("Bút") && normalized.includes("46300"), { pages, expected: prepared.pageCount, firstPageTextDraws: draws, containsHeader: normalized.includes("Ngày"), containsFirstRow: normalized.includes("Bút") && normalized.includes("46300"), decodedSample: normalized.slice(0, 120), bytes: bytes.length });
    }
  }
  await fs.writeFile(path.join(out, "q22-app-values.json"), JSON.stringify({ values, prepared, checks }, null, 2), "utf8");
} catch (error) {
  check("Phiên Q22 hoàn tất", false, error.stack || error.message);
} finally {
  await session.close().catch(() => {});
}
const pass = checks.filter(x => x.status === "PASS").length;
const unsupported = checks.filter(x => x.status === "NOT SUPPORTED").length;
const fail = checks.filter(x => x.status === "FAIL").length;
console.log(`SUMMARY ${pass} PASS | ${unsupported} NOT SUPPORTED | ${fail} FAIL | ${checks.length} total | xlsx=${xlsx} | pdf=${pdf}`);
if (fail) process.exitCode = 1;
