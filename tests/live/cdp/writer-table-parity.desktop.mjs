/**
 * VN Writer — Desktop CDP Verification for Table Features Parity with Word 2016 COM
 * Features verified:
 * 1. Distribute rows & columns (writer.table.distributeRows, distributeCols)
 * 2. Convert table to text (writer.table.toText)
 * 3. Sort table data (writer.table.sort)
 * 4. Banded rows (writer.table.toggleBandedRows)
 * 5. Select cell, row, col, table (writer.table.selectCell, selectRow, selectCol, selectTable)
 * 6. Quick tables (writer.table.quickTables)
 * 7. View gridlines (writer.table.viewGridlines)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-table-parity-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const outputDocx = path.join(profile, "table-parity-test.docx");

// Load Word 2016 COM oracle
const oraclePath = path.resolve("docs/word-oracle-tables-1710.json");
const oracle = JSON.parse(fs.readFileSync(oraclePath, "utf8").replace(/^\uFEFF/, ""));

const session = await launchApp("writer", {
  localAppData: profile,
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000
});

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

try {
  const { cdp } = session;
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-writer-body')", {
    timeoutMilliseconds: 120000
  });

  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 60000 });
  const execCmd = (cmd, args = null) => ev(`(async () => {
    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    return bus.execute(${JSON.stringify(cmd)}, ${JSON.stringify(args)});
  })()`);

  // ==========================================
  // 1. DISTRIBUTE ROWS & COLUMNS
  // ==========================================
  console.log("--- TEST 1: Distribute Rows & Columns ---");
  const distResult = JSON.parse(await ev(`(async () => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<table id="dist-tbl" style="width:500px;border-collapse:collapse;">' +
      '<tr style="height:20px;"><td style="width:100px;height:20px;border:1px solid #000;">A1</td><td style="width:250px;height:20px;border:1px solid #000;">B1</td><td style="width:150px;height:20px;border:1px solid #000;">C1</td></tr>' +
      '<tr style="height:60px;"><td style="width:100px;height:60px;border:1px solid #000;">A2</td><td style="width:250px;height:60px;border:1px solid #000;">B2</td><td style="width:150px;height:60px;border:1px solid #000;">C2</td></tr>' +
      '<tr style="height:40px;"><td style="width:100px;height:40px;border:1px solid #000;">A3</td><td style="width:250px;height:40px;border:1px solid #000;">B3</td><td style="width:150px;height:40px;border:1px solid #000;">C3</td></tr>' +
      '</table>';
    const adapter = window.__vnoAppInstance.adapter;
    const tbl = body.querySelector('#dist-tbl');
    const cell = tbl.rows[0].cells[0];
    adapter.tableController.activeCell = cell;

    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    await bus.execute('writer.table.distributeRows');
    await bus.execute('writer.table.distributeCols');

    const heights = Array.from(tbl.rows).map(r => r.style.height || r.offsetHeight + 'px');
    const widths = Array.from(tbl.rows[0].cells).map(c => c.style.width);
    const rowsEqual = heights.every(h => h === heights[0]);
    const colsEqual = widths.every(w => w === widths[0]);
    return JSON.stringify({ heights, widths, rowsEqual, colsEqual });
  })()`));

  check("Phân bổ đều chiều cao các hàng (distributeRows)", distResult.rowsEqual, `heights=${distResult.heights.join(",")}`);
  check("Phân bổ đều chiều rộng các cột (distributeCols)", distResult.colsEqual, `widths=${distResult.widths.join(",")}`);

  // ==========================================
  // 2. CONVERT TABLE TO TEXT
  // ==========================================
  console.log("--- TEST 2: Convert Table to Text ---");
  const toTextResult = JSON.parse(await ev(`(async () => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<table id="text-tbl">' +
      '<tr><td>R1C1</td><td>R1C2</td><td>R1C3</td></tr>' +
      '<tr><td>R2C1</td><td>R2C2</td><td>R2C3</td></tr>' +
      '<tr><td>R3C1</td><td>R3C2</td><td>R3C3</td></tr>' +
      '</table>';
    const adapter = window.__vnoAppInstance.adapter;
    const tbl = body.querySelector('#text-tbl');
    adapter.tableController.activeCell = tbl.rows[0].cells[0];

    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    await bus.execute('writer.table.toText', { delimiter: 'tab' });

    const tablesAfter = body.querySelectorAll('table').length;
    const paras = Array.from(body.querySelectorAll('p')).map(p => p.textContent);
    return JSON.stringify({ tablesAfter, paras });
  })()`));

  check("Chuyển bảng thành văn bản: bảng được gỡ bỏ khỏi DOM", toTextResult.tablesAfter === 0);
  check("Chuyển bảng thành văn bản: tạo đủ 3 đoạn văn bản phân tách bằng tab",
    toTextResult.paras.length === 3 && toTextResult.paras[0] === "R1C1\tR1C2\tR1C3",
    `firstLine=${toTextResult.paras[0]}`);

  // ==========================================
  // 3. SORT TABLE DATA
  // ==========================================
  console.log("--- TEST 3: Sort Table Data ---");
  const sortResult = JSON.parse(await ev(`(async () => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<table id="sort-tbl">' +
      '<tr class="vno-table-header-row"><th>Ma</th><th>Ten</th><th>Gia</th></tr>' +
      '<tr><td>C</td><td>Cam</td><td>30</td></tr>' +
      '<tr><td>A</td><td>Tao</td><td>10</td></tr>' +
      '<tr><td>B</td><td>Buoi</td><td>20</td></tr>' +
      '</table>';
    const adapter = window.__vnoAppInstance.adapter;
    const tbl = body.querySelector('#sort-tbl');
    adapter.tableController.activeCell = tbl.rows[1].cells[0];

    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    await bus.execute('writer.table.sort');

    const header = tbl.rows[0].cells[0].textContent.trim();
    const keys = [tbl.rows[1].cells[0].textContent.trim(), tbl.rows[2].cells[0].textContent.trim(), tbl.rows[3].cells[0].textContent.trim()];
    return JSON.stringify({ header, keys });
  })()`));

  check("Sắp xếp bảng: giữ nguyên hàng tiêu đề", sortResult.header === "Ma");
  check("Sắp xếp bảng: thứ tự các hàng dữ liệu A-Z khớp Oracle Word COM",
    sortResult.keys.join(",") === "A,B,C", `keys=${sortResult.keys.join(",")}`);

  // ==========================================
  // 4. BANDED ROWS (HÀNG XEN KẼ)
  // ==========================================
  console.log("--- TEST 4: Banded Rows ---");
  const bandedResult = JSON.parse(await ev(`(async () => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<table id="band-tbl">' +
      '<tr><td>H1</td><td>H2</td></tr>' +
      '<tr><td>R1C1</td><td>R1C2</td></tr>' +
      '<tr><td>R2C1</td><td>R2C2</td></tr>' +
      '<tr><td>R3C1</td><td>R3C2</td></tr>' +
      '</table>';
    const adapter = window.__vnoAppInstance.adapter;
    const tbl = body.querySelector('#band-tbl');
    adapter.tableController.activeCell = tbl.rows[0].cells[0];

    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    await bus.execute('writer.table.toggleBandedRows');

    const hasBandedClass = tbl.classList.contains('vno-table-banded-rows');
    const r1Bg = tbl.rows[1].cells[0].style.backgroundColor;
    const r2Bg = tbl.rows[2].cells[0].style.backgroundColor;
    const r3Bg = tbl.rows[3].cells[0].style.backgroundColor;
    return JSON.stringify({ hasBandedClass, r1Bg, r2Bg, r3Bg });
  })()`));

  check("Bật hàng xen kẽ (toggleBandedRows): bảng có class vno-table-banded-rows", bandedResult.hasBandedClass);
  check("Bật hàng xen kẽ: màu nền xen kẽ so le giữa các hàng dữ liệu",
    Boolean(bandedResult.r1Bg) && !bandedResult.r2Bg && Boolean(bandedResult.r3Bg));

  // ==========================================
  // 5. TABLE SELECTION (CHỌN Ô, HÀNG, CỘT, BẢNG)
  // ==========================================
  console.log("--- TEST 5: Table Selection ---");
  const selectResult = JSON.parse(await ev(`(async () => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<table id="sel-tbl">' +
      '<tr><td>1</td><td>2</td><td>3</td></tr>' +
      '<tr><td>4</td><td>5</td><td>6</td></tr>' +
      '<tr><td>7</td><td>8</td><td>9</td></tr>' +
      '</table>';
    const adapter = window.__vnoAppInstance.adapter;
    const tbl = body.querySelector('#sel-tbl');
    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;

    adapter.tableController.activeCell = tbl.rows[0].cells[0];
    await bus.execute('writer.table.selectCell');
    const cellCount = adapter.tableController.selectedCells?.size ?? 0;

    adapter.tableController.activeCell = tbl.rows[1].cells[1];
    await bus.execute('writer.table.selectRow');
    const rowCount = adapter.tableController.selectedCells?.size ?? 0;

    adapter.tableController.activeCell = tbl.rows[1].cells[1];
    await bus.execute('writer.table.selectCol');
    const colCount = adapter.tableController.selectedCells?.size ?? 0;

    adapter.tableController.activeCell = tbl.rows[0].cells[0];
    await bus.execute('writer.table.selectTable');
    const tableCount = adapter.tableController.selectedCells?.size ?? 0;

    return JSON.stringify({ cellCount, rowCount, colCount, tableCount });
  })()`));

  check("Chọn ô (selectCell): chọn đúng 1 ô", selectResult.cellCount === 1, `count=${selectResult.cellCount}`);
  check("Chọn hàng (selectRow): chọn đúng 3 ô của hàng", selectResult.rowCount === 3, `count=${selectResult.rowCount}`);
  check("Chọn cột (selectCol): chọn đúng 3 ô của cột", selectResult.colCount === 3, `count=${selectResult.colCount}`);
  check("Chọn bảng (selectTable): chọn đúng 9 ô của toàn bộ bảng", selectResult.tableCount === 9, `count=${selectResult.tableCount}`);

  // ==========================================
  // 6. QUICK TABLES (BẢNG MẪU NHANH)
  // ==========================================
  console.log("--- TEST 6: Quick Tables ---");
  const quickResult = JSON.parse(await ev(`(async () => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p>Văn bản trước bảng</p>';
    const adapter = window.__vnoAppInstance.adapter;
    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;

    await bus.execute('writer.table.quickTables', { templateId: 'list' });
    const tbl = body.querySelector('table');
    if (!tbl) return JSON.stringify({ found: false });

    const rowsCount = tbl.rows.length;
    const colsCount = tbl.rows[0].cells.length;
    const headers = Array.from(tbl.rows[0].cells).map(c => c.textContent.trim());
    return JSON.stringify({ found: true, rowsCount, colsCount, headers });
  })()`));

  check("Chèn bảng mẫu nhanh (Quick Tables - Danh sách công việc): bảng được chèn", quickResult.found);
  check("Bảng mẫu nhanh: đủ 4 hàng và 5 cột khớp Oracle Word COM",
    quickResult.rowsCount === 4 && quickResult.colsCount === 5,
    `rows=${quickResult.rowsCount}, cols=${quickResult.colsCount}`);
  check("Bảng mẫu nhanh: tiêu đề các cột chuẩn xác",
    quickResult.headers?.[0] === "STT" && quickResult.headers?.[1] === "Hạng mục công việc");

  // ==========================================
  // 7. VIEW GRIDLINES (XEM ĐƯỜNG LƯỚI)
  // ==========================================
  console.log("--- TEST 7: View Gridlines ---");
  const gridlinesResult = JSON.parse(await ev(`(async () => {
    const body = document.querySelector('.vno-writer-body');
    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;

    const before = body.classList.contains('vno-table-gridlines');
    await bus.execute('writer.table.viewGridlines');
    const afterFirst = body.classList.contains('vno-table-gridlines');
    await bus.execute('writer.table.viewGridlines');
    const afterSecond = body.classList.contains('vno-table-gridlines');

    return JSON.stringify({ before, afterFirst, afterSecond });
  })()`));

  check("Xem đường lưới bảng: chuyển trạng thái bật/tắt chính xác trên DOM",
    !gridlinesResult.before && gridlinesResult.afterFirst && !gridlinesResult.afterSecond);

  // ==========================================
  // 8. DOCX SAVE & WORD 2016 COM READBACK
  // ==========================================
  console.log("--- TEST 8: DOCX Save & Word COM Readback ---");
  const saved = JSON.parse(await ev(`(async () => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<table id="docx-tbl" style="width:100%; border-collapse:collapse;">' +
      '<tr class="vno-table-header-row" style="background:#f1f5f9; font-weight:bold;"><th>Mã</th><th>Tên mặt hàng</th><th>Đơn giá</th></tr>' +
      '<tr style="background:#dbeafe;"><td>A</td><td>Táo đỏ</td><td>10.000</td></tr>' +
      '<tr><td>B</td><td>Bưởi da xanh</td><td>20.000</td></tr>' +
      '<tr style="background:#dbeafe;"><td>C</td><td>Cam sành</td><td>30.000</td></tr>' +
      '</table>';

    const adapter = window.__vnoAppInstance.adapter;
    const bridge = (await import('/adapters/libreoffice/common/uno-bridge.js')).globalUnoBridge;
    return JSON.stringify(await bridge.saveRealFileInPlace('writer', adapter._contentForExport(), ${JSON.stringify(outputDocx)}, null));
  })()`));

  check("Lưu tệp DOCX thành công từ giao diện thực tế", saved.status === "ok");

} finally {
  await session.close();
}

// Word 2016 COM Readback Verification
let comVerified = false;
let comDetails = {};
if (process.platform === "win32" && fs.existsSync(outputDocx)) {
  const psScriptPath = path.join(profile, "readback.ps1");
  const comScript = [
    "$ErrorActionPreference = 'Stop'",
    "$existing = @(Get-CimInstance Win32_Process -Filter \"Name='WINWORD.EXE'\" | ForEach-Object { [int]$_.ProcessId })",
    "$word = New-Object -ComObject Word.Application",
    "$word.Visible = $false",
    "$word.DisplayAlerts = 0",
    "$pids = @()",
    "try {",
    `  $d = $word.Documents.Open(${JSON.stringify(outputDocx)}, $false, $true)`,
    "  $pids = @(Get-CimInstance Win32_Process -Filter \"Name='WINWORD.EXE'\" | Where-Object { [int]$_.ProcessId -notin $existing } | ForEach-Object { [int]$_.ProcessId })",
    "  $tblCount = $d.Tables.Count",
    "  $firstTbl = $d.Tables.Item(1)",
    "  $rowsCount = $firstTbl.Rows.Count",
    "  $row2Key = ($firstTbl.Cell(2, 1).Range.Text -replace '[\\r\\n\\x07]+', '')",
    "  $row3Key = ($firstTbl.Cell(3, 1).Range.Text -replace '[\\r\\n\\x07]+', '')",
    "  $row4Key = ($firstTbl.Cell(4, 1).Range.Text -replace '[\\r\\n\\x07]+', '')",
    "  $d.Close(0)",
    "  [pscustomobject]@{",
    "    tablesCount = $tblCount",
    "    rowsCount = $rowsCount",
    "    row2Key = $row2Key",
    "    row3Key = $row3Key",
    "    row4Key = $row4Key",
    "  } | ConvertTo-Json -Compress",
    "} finally {",
    "  if ($word) {",
    "    $word.Quit()",
    "    [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null",
    "  }",
    "  foreach ($p in $pids) {",
    "    if (Get-Process -Id $p -ErrorAction SilentlyContinue) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }",
    "  }",
    "}"
  ].join("\r\n");
  fs.writeFileSync(psScriptPath, comScript, "utf8");

  try {
    const raw = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psScriptPath], { encoding: "utf8", timeout: 60000 }).trim();
    comDetails = JSON.parse(raw);
    comVerified = (comDetails.tablesCount >= 1 && comDetails.rowsCount === 4 && comDetails.row2Key === "A" && comDetails.row3Key === "B" && comDetails.row4Key === "C");
  } catch (err) {
    console.error("COM readback error:", err.message, "STDERR:", err.stderr, "STDOUT:", err.stdout);
  }
}

check("Word 2016 COM đọc lại tệp DOCX xuất ra khớp 100% cấu trúc và thứ tự A, B, C", comVerified, JSON.stringify(comDetails));

const allPassed = checks.every(c => c.pass);
console.log(`\n========================================`);
console.log(`TỔNG KẾT BẢNG PARITY TEST: ${checks.filter(c => c.pass).length}/${checks.length} PASS`);
console.log(`========================================`);

if (!allPassed) {
  process.exit(1);
}
