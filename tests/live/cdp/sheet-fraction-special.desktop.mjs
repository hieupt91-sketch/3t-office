// CDP Desktop test for Sheet Fraction & Special number formatting
import { mkdirSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\claude-fraction-real";
mkdirSync(profile, { recursive: true });

function readExcelCells(filePath, coords) {
  const target = path.resolve(filePath).replace(/'/g, "''");
  const coordsJson = JSON.stringify(coords);
  const psScript = `
    $ErrorActionPreference = 'Stop'
    $resolved = '${target}'
    $coords = ConvertFrom-Json '${coordsJson.replace(/'/g, "''")}'
    $procBefore = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
    $x = $null
    $ourPid = $null
    $wb = $null
    try {
      for ($attempt = 0; $attempt -lt 15 -and -not $x; $attempt++) {
        try { $x = New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 500 }
      }
      $procAfter = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
      $ourPid = ($procAfter | Where-Object { $procBefore -notcontains $_ } | Select-Object -First 1)

      if (-not $x) { throw "Excel.Application unavailable" }
      $x.Visible = $false
      $x.DisplayAlerts = $false
      for ($attempt = 0; $attempt -lt 15 -and -not $wb; $attempt++) {
        try { $wb = $x.Workbooks.Open($resolved, 0, $true) } catch { Start-Sleep -Milliseconds 600 }
      }
      if (-not $wb) { throw "Workbooks.Open returned null" }
      Start-Sleep -Milliseconds 300

      $ws = $wb.Sheets.Item(1)
      $cells = [ordered]@{}
      foreach($coord in $coords) {
        $r = $ws.Range($coord)
        $cells[$coord] = [ordered]@{
          text = [string]$r.Text
          numberFormat = [string]$r.NumberFormat
          value = [string]$r.Value2
        }
      }
      $wb.Close($false)
      $wb = $null
      [ordered]@{ ok = $true; cells = $cells } | ConvertTo-Json -Depth 5 -Compress
    } catch {
      [PSCustomObject]@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
    } finally {
      if ($wb -ne $null) { try { $wb.Close($false) } catch {} }
      if ($x -ne $null) { try { $x.Quit() } catch {} }
      if ($x -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($x) | Out-Null }
      [GC]::Collect()
      [GC]::WaitForPendingFinalizers()
      if ($ourPid) {
        Stop-Process -Id $ourPid -Force -ErrorAction SilentlyContinue
      }
    }
  `;
  try {
    const raw = execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", psScript], { encoding: "utf8", timeout: 60000 });
    return JSON.parse(raw.trim());
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

const session = await launchApp("sheet", { localAppData: profile });
const cdp = session.cdp;
const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`);
  ok ? pass++ : fail++;
};

const g = "window.__vnoAppInstance.grid";

try {
  await sleep(2500);

  // 1. Kiểm tra dropdown danh mục định dạng nhanh trên Ribbon
  const ribbonOptions = JSON.parse(await ev(`JSON.stringify((() => {
    const sel = document.querySelector('select[data-command-id="sheet.format.quickCategory"]');
    if (!sel) return [];
    return Array.from(sel.options).map(opt => ({ value: opt.value, text: opt.text }));
  })())`));

  const hasFractionOption = ribbonOptions.some(opt => opt.value === "fraction");
  const hasSpecialOption = ribbonOptions.some(opt => opt.value === "special");
  check("Dropdown ribbon có tùy chọn Phân số (fraction)", hasFractionOption);
  check("Dropdown ribbon có tùy chọn Đặc biệt (special)", hasSpecialOption);

  // 2. Kiểm tra gán định dạng nhanh Phân số cho ô A1
  await ev(`(() => {
    const grid = ${g};
    grid.selectCell('A', 1);
    grid.setCellValue('A', 1, 0.75);
    grid.applyQuickNumberCategory('fraction');
    return true;
  })()`);

  const a1State = JSON.parse(await ev(`JSON.stringify((() => {
    const grid = ${g};
    const cell = grid.cellsData.get('A1');
    const nf = cell?.style?.numberFormat;
    const dom = grid.container.querySelector('.vno-grid-cell[data-coord="A1"]');
    return {
      category: nf?.category,
      fractionFormat: nf?.fractionFormat,
      text: dom ? dom.textContent.trim() : ""
    };
  })())`));

  check("Ô A1 có category fraction và mẫu # ?/?", a1State.category === "fraction" && a1State.fractionFormat === "# ?/?");
  check("Ô A1 hiển thị phân số 3/4", a1State.text === "3/4", a1State.text);

  // 3. Kiểm tra gán định dạng nhanh Đặc biệt cho ô B1
  await ev(`(() => {
    const grid = ${g};
    grid.selectCell('B', 1);
    grid.setCellValue('B', 1, 123);
    grid.applyQuickNumberCategory('special');
    return true;
  })()`);

  const b1State = JSON.parse(await ev(`JSON.stringify((() => {
    const grid = ${g};
    const cell = grid.cellsData.get('B1');
    const nf = cell?.style?.numberFormat;
    const dom = grid.container.querySelector('.vno-grid-cell[data-coord="B1"]');
    return {
      category: nf?.category,
      specialFormat: nf?.specialFormat,
      text: dom ? dom.textContent.trim() : ""
    };
  })())`));

  check("Ô B1 có category special và mẫu 00000", b1State.category === "special" && b1State.specialFormat === "00000");
  check("Ô B1 hiển thị mã 5 chữ số 00123", b1State.text === "00123", b1State.text);

  // 4. Mở hộp thoại Format Cells (Ctrl+1) và kiểm tra danh sách kiểu Fraction và Special
  await ev(`(() => {
    const grid = ${g};
    grid.selectCell('C', 1);
    grid.setCellValue('C', 1, 0.625);
    grid.showFormatCellsDialog('number');
    return true;
  })()`);
  await sleep(500);

  const dialogState = JSON.parse(await ev(`JSON.stringify((() => {
    const overlay = document.querySelector('.vno-format-cells-overlay');
    if (!overlay) return { hasOverlay: false };

    // Chọn danh mục fraction
    const fracCat = overlay.querySelector('.vno-fc-cat-item[data-value="fraction"]');
    if (fracCat) fracCat.click();
    const fracList = Array.from(overlay.querySelectorAll('#vno-fc-fraction-list [role="option"]')).map(el => el.dataset.value);

    // Chọn danh mục special
    const specCat = overlay.querySelector('.vno-fc-cat-item[data-value="special"]');
    if (specCat) specCat.click();
    const specList = Array.from(overlay.querySelectorAll('#vno-fc-special-list [role="option"]')).map(el => el.dataset.value);

    return {
      hasOverlay: true,
      fractionCount: fracList.length,
      hasEighths: fracList.includes('# ?/8'),
      specialCount: specList.length,
      hasPhone: specList.includes('[<=9999999]###-####;(###) ###-####')
    };
  })())`));

  check("Hộp thoại Định dạng ô mở thành công", dialogState.hasOverlay);
  check("Danh mục Phân số có đủ 9 kiểu chuẩn Excel", dialogState.fractionCount === 9 && dialogState.hasEighths, `count=${dialogState.fractionCount}`);
  check("Danh mục Đặc biệt có đủ 4 kiểu chuẩn Excel", dialogState.specialCount === 4 && dialogState.hasPhone, `count=${dialogState.specialCount}`);

  // Áp dụng kiểu Eighths (# ?/8) cho ô C1 từ hộp thoại
  await ev(`(() => {
    const overlay = document.querySelector('.vno-format-cells-overlay');
    const fracCat = overlay.querySelector('.vno-fc-cat-item[data-value="fraction"]');
    if (fracCat) fracCat.click();
    const eighthItem = overlay.querySelector('#vno-fc-fraction-list [role="option"][data-value="# ?/8"]');
    if (eighthItem) eighthItem.click();
    const okBtn = overlay.querySelector('.vno-fc-ok-btn');
    if (okBtn) okBtn.click();
    return true;
  })()`);
  await sleep(300);

  const c1State = JSON.parse(await ev(`JSON.stringify((() => {
    const grid = ${g};
    const cell = grid.cellsData.get('C1');
    const nf = cell?.style?.numberFormat;
    const dom = grid.container.querySelector('.vno-grid-cell[data-coord="C1"]');
    return {
      category: nf?.category,
      fractionFormat: nf?.fractionFormat,
      text: dom ? dom.textContent.trim() : ""
    };
  })())`));

  check("Ô C1 được gán định dạng # ?/8", c1State.fractionFormat === "# ?/8");
  check("Ô C1 hiển thị 5/8 cho giá trị 0.625", c1State.text === "5/8", c1State.text);

  // 5. Kiểm tra Round-trip FODS: Lưu và nạp lại giữ nguyên Fraction và Special
  const roundtripOk = await ev(`(() => {
    const grid = ${g};
    const adapter = window.__vnoAppInstance.adapter;
    const fods = adapter.serializeToFods();
    const parsed = adapter.parseFods(fods);
    const sheetData = parsed.sheetsData[parsed.activeSheet];
    const a1 = sheetData.get('A1');
    const b1 = sheetData.get('B1');
    const c1 = sheetData.get('C1');
    return (
      a1?.style?.numberFormat?.category === 'fraction' &&
      (b1?.style?.numberFormat?.category === 'special' || b1?.style?.numberFormat?.specialFormat === '00000') &&
      c1?.style?.numberFormat?.fractionFormat === '# ?/8'
    );
  })()`);

  check("Lưu FODS và nạp lại giữ toàn vẹn định dạng Fraction và Special", roundtripOk === true);

  // 6. Kiểm tra lưu thật qua saveRealFileInPlace và đọc lại bằng Excel 2016 COM thật
  const savedXlsx = path.join(profile, "fraction-special-real-saved.xlsx");
  const saveResult = await ev(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    adapter.isDirty = true;
    const fods = adapter.serializeToFods();
    return globalThis.globalUnoBridge.saveRealFileInPlace("sheet", fods, ${JSON.stringify(savedXlsx)}, "");
  })()`);

  check("Lưu XLSX thật qua saveRealFileInPlace", saveResult && saveResult.status === "ok");

  await sleep(1000);
  const comResult = readExcelCells(savedXlsx, ["A1", "B1", "C1"]);
  check("Excel 2016 COM mở tệp đã lưu thành công", comResult.ok, comResult.error);

  if (comResult.ok) {
    check("Excel COM: Ô A1 hiển thị '3/4'", comResult.cells.A1.text.trim() === "3/4", `actual='${comResult.cells.A1.text}'`);
    check("Excel COM: Ô B1 hiển thị '00123'", comResult.cells.B1.text.trim() === "00123", `actual='${comResult.cells.B1.text}'`);
    check("Excel COM: Ô C1 hiển thị '5/8'", comResult.cells.C1.text.trim() === "5/8", `actual='${comResult.cells.C1.text}'`);
    check("Excel COM: Ô A1 có NumberFormat '# ?/?'", comResult.cells.A1.numberFormat === "# ?/?", comResult.cells.A1.numberFormat);
    check("Excel COM: Ô B1 có NumberFormat '00000'", comResult.cells.B1.numberFormat === "00000", comResult.cells.B1.numberFormat);
    check("Excel COM: Ô C1 có NumberFormat '# ?/8'", comResult.cells.C1.numberFormat === "# ?/8", comResult.cells.C1.numberFormat);
  }

} catch (err) {
  check("Lỗi ngoại lệ trong kịch bản kiểm thử", false, err.message);
} finally {
  await session.close();
}

console.log(`\n========================================`);
console.log(`KẾT QUẢ KIỂM THỬ CDP: ${pass} PASS | ${fail} FAIL`);
console.log(`========================================`);
if (fail > 0) process.exit(1);
