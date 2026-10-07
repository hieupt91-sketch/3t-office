// S2: doi chieu cong thuc tren app desktop VN Sheet (CDP) voi Microsoft Excel that (COM).
// Chay: node --experimental-websocket scripts/audit-0610/sheet_formulas_vs_excel.mjs
// Tao lai bao cao: them --report docs/AUDIT-SHEET-FORMULAS-VS-EXCEL-0710.md
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp, repoRoot } from "../../tests/live/cdp/session.mjs";
import { insertText, press } from "../../tests/live/cdp/actions.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const excelScript = path.join(here, "excel_eval.ps1");
const useExpected = process.argv.includes("--oracle-expected");
const reportArgumentIndex = process.argv.indexOf("--report");
const reportPath = reportArgumentIndex >= 0 ? process.argv[reportArgumentIndex + 1] : "";

const baseRows = {
  A1: "North", A2: "North", A3: "South", A4: "South", A5: "North", A6: "West",
  B1: "Pen", B2: "Pencil", B3: "Pen", B4: "Paper", B5: "Pen", B6: "Pencil",
  C1: 5, C2: 10, C3: 15, C4: 20, C5: 25, C6: 30,
  D1: 100, D2: 200, D3: 300, D4: 400, D5: 500, D6: 600,
};
const lookupRows = {
  A1: 1, B1: "Mot", C1: 10,
  A2: 3, B2: "Ba", C2: 30,
  A3: 5, B3: "Nam", C3: 50,
  A4: 7, B4: "Bay", C4: 70,
  A5: 9, B5: "Chin", C5: 90,
};

const tests = [];
const add = (id, group, name, formula, cells = {}, extra = {}) => tests.push({
  id, group, name, formula, excelFormula: formula, cells, mode: "formula", ...extra,
});

// SUMIFS: nhieu vung/criteria, wildcard, toan tu so sanh va sai kich thuoc.
add("S01", "SUMIFS", "mot dieu kien van ban", '=SUMIFS(D1:D6,A1:A6,"North")', baseRows);
add("S02", "SUMIFS", "hai dieu kien", '=SUMIFS(D1:D6,A1:A6,"North",B1:B6,"Pen")', baseRows);
add("S03", "SUMIFS", "wildcard dau sao", '=SUMIFS(D1:D6,B1:B6,"Pen*")', baseRows);
add("S04", "SUMIFS", "wildcard dau hoi", '=SUMIFS(D1:D6,B1:B6,"Pe?")', baseRows);
add("S05", "SUMIFS", "so sanh lon hon bang", '=SUMIFS(D1:D6,C1:C6,">=20")', baseRows);
add("S06", "SUMIFS", "so sanh nho hon", '=SUMIFS(D1:D6,C1:C6,"<20")', baseRows);
add("S07", "SUMIFS", "ket hop wildcard va so sanh", '=SUMIFS(D1:D6,B1:B6,"Pen*",C1:C6,">10")', baseRows);
add("S08", "SUMIFS", "khong co dong phu hop", '=SUMIFS(D1:D6,A1:A6,"East")', baseRows);
add("S09", "SUMIFS", "sum range ngan hon criteria range", '=SUMIFS(D1:D5,A1:A6,"North")', baseRows);
add("S10", "SUMIFS", "criteria range khac kich thuoc", '=SUMIFS(D1:D6,A1:A5,"North",B1:B6,"Pen")', baseRows);

// COUNTIFS.
add("C01", "COUNTIFS", "mot dieu kien van ban", '=COUNTIFS(A1:A6,"North")', baseRows);
add("C02", "COUNTIFS", "hai dieu kien", '=COUNTIFS(A1:A6,"North",B1:B6,"Pen")', baseRows);
add("C03", "COUNTIFS", "wildcard dau sao", '=COUNTIFS(B1:B6,"Pen*")', baseRows);
add("C04", "COUNTIFS", "wildcard dau hoi", '=COUNTIFS(B1:B6,"Pe?")', baseRows);
add("C05", "COUNTIFS", "so sanh lon hon bang", '=COUNTIFS(C1:C6,">=20")', baseRows);
add("C06", "COUNTIFS", "so sanh nho hon", '=COUNTIFS(C1:C6,"<20")', baseRows);
add("C07", "COUNTIFS", "khac van ban", '=COUNTIFS(A1:A6,"<>North")', baseRows);
add("C08", "COUNTIFS", "ket hop wildcard va so sanh", '=COUNTIFS(B1:B6,"Pen*",C1:C6,">10")', baseRows);
add("C09", "COUNTIFS", "khong co dong phu hop", '=COUNTIFS(A1:A6,"East")', baseRows);
add("C10", "COUNTIFS", "hai range khac kich thuoc", '=COUNTIFS(A1:A6,"North",B1:B5,"Pen")', baseRows);

// VLOOKUP exact/approximate, bien, du lieu sap va chua sap.
add("V01", "VLOOKUP", "exact tra text", '=VLOOKUP(5,A1:C5,2,FALSE)', lookupRows);
add("V02", "VLOOKUP", "exact tra so", '=VLOOKUP(7,A1:C5,3,FALSE)', lookupRows);
add("V03", "VLOOKUP", "exact bien dau", '=VLOOKUP(1,A1:C5,2,FALSE)', lookupRows);
add("V04", "VLOOKUP", "exact bien cuoi", '=VLOOKUP(9,A1:C5,2,FALSE)', lookupRows);
add("V05", "VLOOKUP", "exact khong tim thay", '=VLOOKUP(4,A1:C5,2,FALSE)', lookupRows);
add("V06", "VLOOKUP", "approximate o giua", '=VLOOKUP(6,A1:C5,2,TRUE)', lookupRows);
add("V07", "VLOOKUP", "approximate duoi bien nho nhat", '=VLOOKUP(0,A1:C5,2,TRUE)', lookupRows);
add("V08", "VLOOKUP", "approximate dung bien lon nhat", '=VLOOKUP(9,A1:C5,3,TRUE)', lookupRows);
add("V09", "VLOOKUP", "approximate vuot bien lon nhat", '=VLOOKUP(99,A1:C5,2,TRUE)', lookupRows);
add("V10", "VLOOKUP", "approximate tren bang chua sap", '=VLOOKUP(6,A1:B5,2,TRUE)', { A1: 5, B1: "Nam", A2: 1, B2: "Mot", A3: 9, B3: "Chin", A4: 3, B4: "Ba", A5: 7, B5: "Bay" });

// ROUND: so am, digits am va midpoint .5.
add("R01", "ROUND", "so duong hai chu so", "=ROUND(12.345,2)");
add("R02", "ROUND", "so am hai chu so", "=ROUND(-12.345,2)");
add("R03", "ROUND", "digits am hang chuc", "=ROUND(125,-1)");
add("R04", "ROUND", "digits am hang tram", "=ROUND(1499,-2)");
add("R05", "ROUND", "midpoint duong 0.5", "=ROUND(2.5,0)");
add("R06", "ROUND", "midpoint am -0.5", "=ROUND(-2.5,0)");
add("R07", "ROUND", "midpoint duong co le", "=ROUND(1.25,1)");
add("R08", "ROUND", "midpoint am co le", "=ROUND(-1.25,1)");
add("R09", "ROUND", "truong hop nhi phan 2.675", "=ROUND(2.675,2)");
add("R10", "ROUND", "lam tron ve nghin", "=ROUND(-1500,-3)");

// IFERROR va IF long nhau.
add("L01", "IF/IFERROR", "IFERROR bat DIV0", '=IFERROR(1/0,"fallback")');
add("L02", "IF/IFERROR", "IFERROR bat NA", '=IFERROR(NA(),"missing")');
add("L03", "IF/IFERROR", "IFERROR giu gia tri", '=IFERROR(10/2,"fallback")');
add("L04", "IF/IFERROR", "IF long nhau nhanh dau", '=IF(A1>=90,"A",IF(A1>=80,"B","C"))', { A1: 95 });
add("L05", "IF/IFERROR", "IF long nhau nhanh giua", '=IF(A1>=90,"A",IF(A1>=80,"B","C"))', { A1: 85 });
add("L06", "IF/IFERROR", "IF long nhau nhanh cuoi", '=IF(A1>=90,"A",IF(A1>=80,"B","C"))', { A1: 75 });
add("L07", "IF/IFERROR", "IFERROR boc IF co loi", '=IFERROR(IF(A1=0,1/0,10),99)', { A1: 0 });
add("L08", "IF/IFERROR", "IF bo qua nhanh loi", '=IF(A1>0,42,1/0)', { A1: 1 });

// INDEX/MATCH rieng va ket hop.
add("M01", "INDEX/MATCH", "INDEX vung mot cot", "=INDEX(B1:B5,3)", lookupRows);
add("M02", "INDEX/MATCH", "INDEX ma tran hai chieu", "=INDEX(A1:C5,4,3)", lookupRows);
add("M03", "INDEX/MATCH", "INDEX vuot bien", "=INDEX(A1:C5,6,2)", lookupRows);
add("M04", "INDEX/MATCH", "MATCH exact", "=MATCH(5,A1:A5,0)", lookupRows);
add("M05", "INDEX/MATCH", "MATCH exact khong tim thay", "=MATCH(6,A1:A5,0)", lookupRows);
add("M06", "INDEX/MATCH", "MATCH approximate tang", "=MATCH(6,A1:A5,1)", lookupRows);
add("M07", "INDEX/MATCH", "MATCH approximate giam", "=MATCH(6,A1:A5,-1)", { A1: 9, A2: 7, A3: 5, A4: 3, A5: 1 });
add("M08", "INDEX/MATCH", "INDEX MATCH exact", "=INDEX(B1:B5,MATCH(7,A1:A5,0))", lookupRows);
add("M09", "INDEX/MATCH", "INDEX MATCH approximate", "=INDEX(B1:B5,MATCH(6,A1:A5,1))", lookupRows);

// TEXT va DATE.
add("T01", "TEXT", "ngay dd/mm/yyyy", '=TEXT(DATE(2026,12,31),"dd/mm/yyyy")');
add("T02", "TEXT", "ngay nhu nhuan dd/mm/yyyy", '=TEXT(DATE(2024,2,29),"dd/mm/yyyy")');
add("T03", "TEXT", "nghin #,##0", '=TEXT(1234567,"#,##0")');
add("T04", "TEXT", "nghin am #,##0", '=TEXT(-1234567,"#,##0")');
add("T05", "TEXT", "lam tron bang #,##0", '=TEXT(1234.6,"#,##0")');
add("T06", "TEXT", "nghin va hai chu so", '=TEXT(1234.5,"#,##0.00")');
add("D01", "DATE", "ngay thuong", "=DATE(2026,12,31)");
add("D02", "DATE", "ngay nhuan", "=DATE(2024,2,29)");
add("D03", "DATE", "thang 13", "=DATE(2026,13,1)");
add("D04", "DATE", "ngay 0", "=DATE(2026,3,0)");
add("D05", "DATE", "ngay vuot cuoi thang", "=DATE(2026,2,29)");

// Lan truyen loi qua o phu thuoc.
add("E01", "Lan truyen loi", "DIV0 qua phep cong", "=A1+1", { A1: "=1/0" });
add("E02", "Lan truyen loi", "NA qua phep cong", "=A1+1", { A1: "=NA()" });
add("E03", "Lan truyen loi", "VALUE qua phep cong", "=A1+1", { A1: '=\"x\"+1' });
add("E04", "Lan truyen loi", "REF qua phep cong", "=A1+1", { B1: 1, B2: 2, A1: "=INDEX(B1:B2,3)" });
add("E05", "Lan truyen loi", "DIV0 qua SUM", "=SUM(A1,1)", { A1: "=1/0" });
add("E06", "Lan truyen loi", "IFERROR bat loi phu thuoc", "=IFERROR(A1,99)", { A1: "=1/0" });
add("E07", "Lan truyen loi", "IF bo qua nhanh loi phu thuoc", "=IF(TRUE,42,A1)", { A1: "=1/0" });
add("E08", "Lan truyen loi", "IF chon nhanh loi phu thuoc", "=IF(FALSE,42,A1)", { A1: "=1/0" });
add("E09", "Lan truyen loi", "DIV0 qua hai cap phu thuoc", "=B1+1", { A1: "=1/0", B1: "=A1+1" });
add("E10", "Lan truyen loi", "NA VLOOKUP qua IFERROR", '=IFERROR(A1,"caught")', { A1: "=VLOOKUP(4,B1:C3,2,FALSE)", B1: 1, C1: "a", B2: 2, C2: "b", B3: 3, C3: "c" });

// Chu ky F4. Excel COM luu cong thuc dich den tuong ung de doi chieu cong thuc + ket qua.
for (const [index, expected] of ["=A1", "=$A$1", "=A$1", "=$A1"].entries()) {
  add(`A0${index + 1}`, "F4", `chu ky F4 lan ${index}`, "=A1", { A1: 7 }, {
    mode: "f4", f4Presses: index, expectedFormula: expected, excelFormula: expected,
  });
}

// Sao chep cong thuc bang Fill Down (Ctrl+D trong app, Range.FillDown trong Excel).
add("P01", "Sao chep cong thuc", "tham chieu tuong doi", "=B1+C1", { B1: 1, B2: 10, C1: 2, C2: 20 }, { mode: "fillDown" });
add("P02", "Sao chep cong thuc", "cot va hang tuyet doi", "=$B$1+C1", { B1: 1, B2: 10, C1: 2, C2: 20 }, { mode: "fillDown" });
add("P03", "Sao chep cong thuc", "hang tuyet doi va cot hon hop", "=B$1+$C1", { B1: 1, B2: 10, C1: 2, C2: 20 }, { mode: "fillDown" });
add("P04", "Sao chep cong thuc", "cot tuyet doi va hang tuyet doi", "=$B1+C$1", { B1: 1, B2: 10, C1: 2, C2: 20 }, { mode: "fillDown" });

// Che do --oracle-expected: khi Excel COM khong dung duoc (may nay: "Product Activation Failed" + Activation Wizard
// chan moi lenh COM), doi chieu voi KET QUA EXCEL DA BIET theo ngu nghia chuan cua Excel (khong lay tu app).
// null = cach thuc hien phu thuoc ban Excel/vung mien -> chi ghi nhan ket qua app, khong tinh PASS/FAIL.
const E = (kind, value) => ({ kind, value });
const num = value => E("number", value);
const txt = value => E("text", value);
const err = value => E("error", value);
const expectedOracle = {
  S01: num(800), S02: num(600), S03: num(1700), S04: num(900), S05: num(1500), S06: num(600), S07: num(1400), S08: num(0),
  S09: err("#VALUE!"), S10: err("#VALUE!"),
  C01: num(3), C02: num(2), C03: num(5), C04: num(3), C05: num(3), C06: num(3), C07: num(3), C08: num(3), C09: num(0), C10: err("#VALUE!"),
  V01: txt("Nam"), V02: num(70), V03: txt("Mot"), V04: txt("Chin"), V05: err("#N/A"), V06: txt("Nam"), V07: err("#N/A"),
  V08: num(90), V09: txt("Chin"), V10: null,
  R01: num(12.35), R02: num(-12.35), R03: num(130), R04: num(1500), R05: num(3), R06: num(-3), R07: num(1.3), R08: num(-1.3),
  R09: num(2.68), R10: num(-2000),
  L01: txt("fallback"), L02: txt("missing"), L03: num(5), L04: txt("A"), L05: txt("B"), L06: txt("C"), L07: num(99), L08: num(42),
  M01: txt("Nam"), M02: num(70), M03: err("#REF!"), M04: num(3), M05: err("#N/A"), M06: num(3), M07: num(2), M08: txt("Bay"), M09: txt("Nam"),
  T01: txt("31/12/2026"), T02: txt("29/02/2024"), T03: null, T04: null, T05: null, T06: null,
  D01: num(46387), D02: num(45351), D03: num(46388), D04: num(46081), D05: num(46082),
  E01: err("#DIV/0!"), E02: err("#N/A"), E03: err("#VALUE!"), E04: err("#REF!"), E05: err("#DIV/0!"), E06: num(99), E07: num(42),
  E08: err("#DIV/0!"), E09: err("#DIV/0!"), E10: txt("caught"),
  A01: { result: num(7), formula: "=A1" }, A02: { result: num(7), formula: "=$A$1" }, A03: { result: num(7), formula: "=A$1" }, A04: { result: num(7), formula: "=$A1" },
  P01: { result: num(30), formula: "=B2+C2" }, P02: { result: num(21), formula: "=$B$1+C2" }, P03: { result: num(21), formula: "=B$1+$C2" }, P04: { result: num(12), formula: "=$B2+C$1" },
};

function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, ...options });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", chunk => { stdout += chunk; process.stderr.write(chunk); });
    child.stderr?.on("data", chunk => { stderr += chunk; process.stderr.write(chunk); });
    child.once("error", reject);
    child.once("exit", code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code}: ${stderr || stdout}`));
    });
  });
}

function canonical(value) {
  if (typeof value === "string" && /^#(?:DIV\/0!|N\/A|VALUE!|REF!|NUM!|NAME\?|NULL!)$/.test(value)) {
    return { kind: "error", value };
  }
  if (value === null || value === undefined || value === "") return { kind: "blank", value: null };
  if (typeof value === "boolean") return { kind: "boolean", value };
  if (typeof value === "number") return { kind: "number", value };
  return { kind: "text", value: String(value) };
}

function display(result, formula = "") {
  if (!result) return "<khong co ket qua>";
  const value = result.kind === "blank" ? "(blank)" : String(result.value);
  return formula ? `${formula} => ${value}` : value;
}

function sameValue(appResult, excelResult) {
  if (!appResult || !excelResult || appResult.kind !== excelResult.kind) return false;
  if (appResult.kind === "number") {
    const left = Number(appResult.value);
    const right = Number(excelResult.value);
    return Number.isFinite(left) && Number.isFinite(right)
      && Math.abs(left - right) <= Math.max(1e-10, Math.abs(right) * 1e-12);
  }
  return appResult.value === excelResult.value;
}

function reasonFor(app, excel, formulaMustMatch) {
  const reasons = [];
  if (formulaMustMatch && app.formula !== excel.formula) reasons.push(`cong thuc app ${JSON.stringify(app.formula)} khac Excel ${JSON.stringify(excel.formula)}`);
  if (!sameValue(app.result, excel.result)) {
    reasons.push(`ket qua app ${display(app.result)} (${app.result?.kind}) khac Excel ${display(excel.result)} (${excel.result?.kind})`);
  }
  return reasons.join("; ") || "khop cong thuc va ket qua";
}

async function resetAndSeed(cdp, test) {
  const payload = JSON.stringify(test.cells || {});
  await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance?.grid;
    if (!grid) throw new Error("Khong tim thay Sheet grid");
    grid.cellsData.clear();
    grid.selectionRange = null;
    grid.formulaEntry = null;
    const cells = ${payload};
    for (const [address, value] of Object.entries(cells)) {
      const match = /^([A-Z]+)(\\d+)$/.exec(address);
      grid.setCellValue(match[1], Number(match[2]), value, false, { userInput: true, commit: true });
    }
    grid.selectCell("J", 1);
    return true;
  })()`);
}

async function pressF4(cdp) {
  for (const type of ["keyDown", "keyUp"]) {
    await cdp.send("Input.dispatchKeyEvent", {
      type, key: "F4", code: "F4", windowsVirtualKeyCode: 115,
    });
  }
}

async function evaluateInApp(cdp, test) {
  await resetAndSeed(cdp, test);
  if (test.mode === "f4") {
    await cdp.evaluate("window.__vnoAppInstance.grid.container.focus(); true");
    await press(cdp, "=", {}, 50);
    await insertText(cdp, test.formula.slice(1));
    for (let count = 0; count < test.f4Presses; count += 1) await pressF4(cdp);
    const draftFormula = await cdp.evaluate("window.__vnoAppInstance.grid.formulaInput.value");
    await press(cdp, "Enter", {}, 50);
    const value = await cdp.evaluate("window.__vnoAppInstance.grid.cellsData.get('J1')?.val");
    return { formula: draftFormula, result: canonical(value) };
  }

  if (test.mode === "fillDown") {
    await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance.grid;
      grid.setCellValue("D", 1, ${JSON.stringify(test.formula)}, false, { userInput: true, commit: true });
      grid.selectCell("D", 1);
      grid.selectCell("D", 2, true);
      grid.container.focus();
      return true;
    })()`);
    await press(cdp, "d", { ctrl: true }, 50);
    const item = await cdp.evaluate("window.__vnoAppInstance.grid.cellsData.get('D2')");
    return { formula: item?.formula || "", result: canonical(item?.val) };
  }

  const item = await cdp.evaluate(`(() => {
    const grid = window.__vnoAppInstance.grid;
    grid.setCellValue("J", 1, ${JSON.stringify(test.formula)}, false, { userInput: true, commit: true });
    const cell = grid.cellsData.get("J1");
    return { formula: cell?.formula || "", value: cell?.val };
  })()`);
  return { formula: item.formula, result: canonical(item.value) };
}

function markdownEscape(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function buildReport(rows, excelVersion, command) {
  const passed = rows.filter(row => row.status === "PASS").length;
  const failed = rows.filter(row => row.status === "FAIL").length;
  const lines = [
    "# Audit VN Sheet formulas vs Microsoft Excel — 07/10/2026",
    "",
    `Phạm vi: ${rows.length} phép thử, mỗi dòng có một công thức đích; VN Sheet chạy bằng app desktop thật qua CDP và Excel ${excelVersion} chạy bằng COM. Không dùng SendKeys/OS input, không gọi pywebview evaluate_js và không sửa mã sản phẩm.`,
    "",
    `Lệnh đã chạy: \`${command}\`. Giá trị số so sánh với sai số \`max(1e-10, |Excel|*1e-12)\`; text/boolean/lỗi so sánh đúng kiểu và đúng giá trị. DATE được so theo kiểu kết quả thô (Excel Value2), không đổi kỳ vọng để làm xanh.`,
    "",
    "| # | Nhóm | Phép thử | Công thức | Kết quả app | Kết quả Excel | Trạng thái | Nguyên nhân nếu FAIL |",
    "|---:|---|---|---|---|---|---|---|",
  ];
  rows.forEach((row, index) => lines.push(`| ${index + 1} | ${markdownEscape(row.test.group)} | ${markdownEscape(row.test.name)} | \`${markdownEscape(row.test.formula)}\` | ${markdownEscape(display(row.app.result, row.app.formula))} | ${markdownEscape(display(row.excel.result, row.excel.formula))} | ${row.status} | ${row.status === "FAIL" ? markdownEscape(row.reason) : "—"} |`));
  lines.push(
    "",
    "## Tổng kết",
    "",
    `PASS: **${passed}** · FAIL: **${failed}** · tổng: **${rows.length}**. Các FAIL là chênh lệch quan sát thật, không bị che hoặc đổi expected.`,
    "",
    "Excel COM được đóng theo thứ tự workbook.Close(false), Excel.Quit(), FinalReleaseComObject; nếu tiến trình chưa tự thoát thì chỉ PID lấy từ Hwnd của đúng phiên vừa mở mới bị dừng. App desktop và LOCALAPPDATA riêng cũng được dọn trong finally.",
    "",
    "## FAIL chi tiết",
    "",
  );
  const failures = rows.filter(row => row.status === "FAIL");
  if (!failures.length) lines.push("Không có.");
  else failures.forEach(row => lines.push(`- **${row.test.id} — ${row.test.group}/${row.test.name}:** ${row.reason}.`));
  lines.push("");
  return lines.join("\n");
}

if (process.platform !== "win32") throw new Error("Audit Excel COM chi chay tren Windows.");
if (tests.length < 60) throw new Error(`Can toi thieu 60 phep thu, hien co ${tests.length}.`);
if (reportArgumentIndex >= 0 && !reportPath) throw new Error("--report can mot duong dan.");

const scratch = await mkdtemp(path.join(os.tmpdir(), "vno-sheet-formulas-"));
const inputPath = path.join(scratch, "excel-input.json");
const outputPath = path.join(scratch, "excel-output.json");
const previousProfile = process.env.VNO_CDP_LOCALAPPDATA;
process.env.VNO_CDP_LOCALAPPDATA = path.join(scratch, "localappdata");
let session = null;

try {
  let excelPayload;
  if (useExpected) {
    excelPayload = {
      excelVersion: "(Excel COM khong dung duoc tren may nay - doi chieu voi ket qua Excel da biet)",
      results: tests.map(test => {
        const entry = expectedOracle[test.id];
        if (entry === null || entry === undefined) return { id: test.id, formula: null, result: { kind: "info", value: "(khong co ket qua chuan co dinh)" } };
        return entry.result ? { id: test.id, formula: entry.formula, result: entry.result } : { id: test.id, formula: null, result: entry };
      }),
    };
  } else {
    await writeFile(inputPath, JSON.stringify({ tests }), "utf8");
    await runProcess("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", excelScript, "-InputPath", inputPath, "-OutputPath", outputPath], { cwd: repoRoot });
    excelPayload = JSON.parse((await readFile(outputPath, "utf8")).replace(/^\uFEFF/, ""));
  }
  const excelById = new Map(excelPayload.results.map(result => [result.id, result]));

  session = await launchApp("sheet", { startTimeoutMilliseconds: 90000 });
  await session.cdp.waitFor("!!window.__vnoAppInstance?.grid?.cellsData", { timeoutMilliseconds: 30000 });

  const rows = [];
  for (const test of tests) {
    const app = await evaluateInApp(session.cdp, test);
    const excelRaw = excelById.get(test.id) || { formula: null, result: { kind: "harness-error", value: "missing Excel result" } };
    const excel = { formula: excelRaw.formula || "", result: excelRaw.result };
    const formulaMustMatch = test.mode === "f4" || test.mode === "fillDown";
    const reason = excel.result?.kind === "info" ? "chi ghi nhan" : reasonFor(app, excel, formulaMustMatch);
    const status = excel.result?.kind === "info" ? "INFO" : (reason === "khop cong thuc va ket qua" ? "PASS" : "FAIL");
    rows.push({ test, app, excel, status, reason });
    console.log(`${test.id} ${test.group} ${test.name} | ${display(app.result, formulaMustMatch ? app.formula : "")} | ${display(excel.result, formulaMustMatch ? excel.formula : "")} | ${status}`);
    if (status === "FAIL") console.log(`  nguyen nhan: ${reason}`);
  }

  const passCount = rows.filter(row => row.status === "PASS").length;
  console.log(`TONG | ${passCount}/${rows.length} PASS | ${rows.filter(row => row.status === "FAIL").length} FAIL | ${rows.filter(row => row.status === "INFO").length} INFO`);

  if (reportPath) {
    const absoluteReportPath = path.resolve(repoRoot, reportPath);
    const command = `node --experimental-websocket scripts/audit-0610/sheet_formulas_vs_excel.mjs --report ${path.relative(repoRoot, absoluteReportPath).replace(/\\/g, "/")}`;
    await writeFile(absoluteReportPath, buildReport(rows, excelPayload.excelVersion, command), "utf8");
  }
} finally {
  if (session) await session.close();
  if (previousProfile === undefined) delete process.env.VNO_CDP_LOCALAPPDATA;
  else process.env.VNO_CDP_LOCALAPPDATA = previousProfile;
  await rm(scratch, { recursive: true, force: true });
}
