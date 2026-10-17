// CDP Desktop test for Sheet Themes, Colors, and Fonts (Excel 2016 parity) with real mouse clicks
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { click, mouseClick, sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\claude-sheet-themes";
mkdirSync(profile, { recursive: true });
const file = path.join(profile, "themes-test.xlsx");
copyFileSync(path.resolve("tests/live/cdp/test_sheet_home.xlsx"), file);

let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${ok ? "" : " | " + detail}`);
  ok ? pass++ : fail++;
};

function readExcelTheme(filePath) {
  const target = path.resolve(filePath).replace(/'/g, "''");
  const psScript = `
    $ErrorActionPreference = 'Stop'
    $resolved = '${target}'
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

      $theme = $wb.Theme
      if (-not $theme) { throw "Workbook.Theme is null" }
      $cs = $theme.ThemeColorScheme
      if (-not $cs) { throw "ThemeColorScheme is null" }

      $cols = @()
      foreach($i in 1..12) {
        $rgbInt = $cs.Colors($i).RGB
        $r = $rgbInt -band 0xFF
        $g = ($rgbInt -shr 8) -band 0xFF
        $b = ($rgbInt -shr 16) -band 0xFF
        $cols += ('{0:X2}{1:X2}{2:X2}' -f $r, $g, $b)
      }
      $fs = $theme.ThemeFontScheme
      if (-not $fs) { throw "ThemeFontScheme is null" }
      $major = $fs.MajorFont.Item(1).Name
      $minor = $fs.MinorFont.Item(1).Name
      $wb.Close($false)
      $wb = $null

      [ordered]@{
        ok = $true
        colors = $cols
        accent1 = $cols[4]
        majorFont = $major
        minorFont = $minor
      } | ConvertTo-Json -Compress
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

function readThemeXmlFromXlsx(filePath) {
  try {
    return execFileSync("python", [
      "-c",
      "import zipfile, sys\nwith zipfile.ZipFile(sys.argv[1]) as z:\n    print(z.read('xl/theme/theme1.xml').decode('utf-8'))",
      filePath
    ], { encoding: "utf8", timeout: 15000 });
  } catch (err) {
    return "";
  }
}

let session = await launchApp("sheet", {
  localAppData: profile,
  filePath: file,
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000
});

let cdp = session.cdp;
let ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });
const g = "window.__vnoAppInstance.grid";

const centerOf = async (expr) => JSON.parse(await ev(`JSON.stringify((() => {
  const el = ${expr};
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
})())`));

async function pickDropdown(dropdownId, textPrefix) {
  const toggle = await centerOf(`[...document.querySelectorAll('[data-dropdown-id="${dropdownId}"], [data-dropdown-toggle="${dropdownId}"]')].find(e => e.getBoundingClientRect().width > 0)`);
  if (!toggle) return false;
  await mouseClick(cdp, toggle.x, toggle.y);
  await sleep(400);

  const item = await centerOf(`[...document.querySelectorAll('.vno-ribbon-dropdown-item')].find(e => e.getBoundingClientRect().width > 0 && e.textContent.trim().startsWith(${JSON.stringify(textPrefix)}))`);
  if (!item) {
    await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
    return false;
  }
  await mouseClick(cdp, item.x, item.y);
  await sleep(450);
  return true;
}

const savedOutPath = path.join(profile, "themes-saved-blue-garamond.xlsx");
const reopenedSavedPath = path.join(profile, "themes-reopened-saved.xlsx");

try {
  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  await sleep(1000);

  // 1. Chuyển sang tab Bố trí trang (Page Layout) bằng click chuột thật
  await click(cdp, "#vno-ribbon-tab-pageLayout");
  await sleep(600);

  // 2. Kiểm tra nhóm Chủ đề (Themes) và 3 nút dropdown trên Ribbon
  const ribbonThemeState = JSON.parse(await ev(`JSON.stringify((() => {
    const group = document.querySelector('.vno-ribbon-group[data-group-id="themes"]');
    const themesBtn = document.querySelector('[data-dropdown-toggle="sheet.page.themes"], [data-command-id="sheet.page.themes"]');
    const colorsBtn = document.querySelector('[data-dropdown-toggle="sheet.page.themeColors"], [data-command-id="sheet.page.themeColors"]');
    const fontsBtn = document.querySelector('[data-dropdown-toggle="sheet.page.themeFonts"], [data-command-id="sheet.page.themeFonts"]');
    return {
      hasGroup: !!group,
      hasThemesBtn: !!themesBtn,
      hasColorsBtn: !!colorsBtn,
      hasFontsBtn: !!fontsBtn
    };
  })())`));

  check("Thanh Ribbon tab Bố trí trang có nhóm Chủ đề (themes)", ribbonThemeState.hasGroup);
  check("Nút Chủ đề (sheet.page.themes) hiển thị", ribbonThemeState.hasThemesBtn);
  check("Nút Màu (sheet.page.themeColors) hiển thị", ribbonThemeState.hasColorsBtn);
  check("Nút Phông chữ (sheet.page.themeFonts) hiển thị", ribbonThemeState.hasFontsBtn);

  // 3. Kiểm tra chủ đề ban đầu
  const initialTheme = JSON.parse(await ev(`JSON.stringify(${g}.getWorkbookTheme())`));
  check("Chủ đề ban đầu hợp lệ", ["office", "office2007", "custom"].includes(initialTheme.themeId));
  check("Bảng màu ban đầu là Office", ["office", "office2007"].includes(initialTheme.colorSchemeId));
  check("Bộ phông ban đầu là Office", ["office", "calibri"].includes(initialTheme.fontSchemeId));

  // 4. Chọn chủ đề Góc cạnh (Facet) qua dropdown bằng chuột thật
  const pickedFacet = await pickDropdown("sheet.page.themes", "Góc cạnh");
  check("Click chọn chủ đề Góc cạnh (Facet) trong dropdown", pickedFacet);

  const facetTheme = JSON.parse(await ev(`JSON.stringify((() => {
    const grid = ${g};
    const t = grid.getWorkbookTheme();
    const colors = grid.getThemeColors();
    return {
      themeId: t.themeId,
      colorSchemeId: t.colorSchemeId,
      fontSchemeId: t.fontSchemeId,
      accent1: colors.accent1
    };
  })())`));

  check("Chủ đề đã chuyển sang Facet", facetTheme.themeId === "facet");
  check("Facet tự động kích hoạt bảng màu Facet", facetTheme.colorSchemeId === "facet");
  check("Facet màu Accent 1 là 94C600", facetTheme.accent1?.toUpperCase() === "94C600");

  // 5. Chọn bảng màu Xanh dương (Blue) qua dropdown bằng chuột thật
  const pickedBlue = await pickDropdown("sheet.page.themeColors", "Xanh dương");
  check("Click chọn bảng màu Xanh dương (Blue) trong dropdown", pickedBlue);

  const blueTheme = JSON.parse(await ev(`JSON.stringify(${g}.getWorkbookTheme())`));
  check("Bảng màu đã chuyển sang Blue", blueTheme.colorSchemeId === "blue");
  check("Bảng màu Blue có màu Accent 1 là 2B6CB0", blueTheme.colorScheme?.colors?.accent1?.toUpperCase() === "2B6CB0");

  // 6. Chọn bộ phông Garamond qua dropdown bằng chuột thật
  const pickedGaramond = await pickDropdown("sheet.page.themeFonts", "Garamond");
  check("Click chọn bộ phông Garamond trong dropdown", pickedGaramond);

  const garamondTheme = JSON.parse(await ev(`JSON.stringify(${g}.getWorkbookTheme())`));
  check("Bộ phông đã chuyển sang Garamond", garamondTheme.fontSchemeId === "garamond");

  // 7. Kiểm tra ma trận bảng chọn màu (Theme Color Picker Matrix: 6x10)
  const matrixInfo = JSON.parse(await ev(`JSON.stringify((() => {
    const grid = ${g};
    const matrix = grid.getThemeColorPickerMatrix();
    return {
      rows: matrix.length,
      cols: matrix[0]?.length || 0,
      isHex: /^#[0-9A-Fa-f]{6}$/.test(matrix[0][0])
    };
  })())`));

  check("Ma trận màu chủ đề gồm đúng 6 hàng", matrixInfo.rows === 6);
  check("Mỗi hàng trong ma trận có 10 ô màu", matrixInfo.cols === 10);
  check("Các mã màu trong ma trận đúng chuẩn Hex #RRGGBB", matrixInfo.isHex);

  // 8. Kiểm tra đóng gói cấu trúc chủ đề trong FODS khi lưu tệp
  const fodsSerialization = await ev(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    if (adapter && typeof adapter.serializeToFods === 'function') {
      return adapter.serializeToFods();
    }
    return "";
  })()`);

  const hasFodsThemeMeta = fodsSerialization.includes('vno:workbook-theme="') || fodsSerialization.includes("workbook-theme");
  check("FODS lưu trữ thuộc tính chủ đề vno:workbook-theme", hasFodsThemeMeta);

  // 9. Lưu thật qua saveRealFileInPlace ra tệp XLSX
  await ev("window.__vnoAppInstance.adapter.isDirty = true");
  const saveResult = await ev(`(() => {
    const fods = window.__vnoAppInstance.adapter.serializeToFods();
    return globalThis.globalUnoBridge.saveRealFileInPlace("sheet", fods, ${JSON.stringify(savedOutPath)}, ${JSON.stringify(file)});
  })()`);

  check("Lưu tệp thật qua saveRealFileInPlace thành công", saveResult && saveResult.status === "ok");

  // 10. Đọc trực tiếp xl/theme/theme1.xml trong gói tệp XLSX đã lưu
  const themeXml = readThemeXmlFromXlsx(savedOutPath);
  check("Gói XLSX chứa xl/theme/theme1.xml", themeXml.length > 0);
  check("xl/theme/theme1.xml chứa mã màu Accent 1 Blue 2B6CB0", themeXml.includes("2B6CB0") || themeXml.includes("2b6cb0"));
  check("xl/theme/theme1.xml chứa phông chữ Garamond", themeXml.includes("Garamond"));

  // 11. Đọc và xác thực bằng Excel 2016 COM thật
  await sleep(1000);
  const excelComResult = readExcelTheme(savedOutPath);
  check("Excel 2016 COM mở tệp XLSX đã lưu thành công", excelComResult.ok, excelComResult.error);
  if (excelComResult.ok) {
    check("Excel COM: Accent 1 khớp chuẩn Blue (2B6CB0)", excelComResult.accent1 === "2B6CB0", `actual=${excelComResult.accent1}`);
    check("Excel COM: MajorFont khớp chuẩn Garamond", excelComResult.majorFont === "Garamond", `actual=${excelComResult.majorFont}`);
    check("Excel COM: MinorFont khớp chuẩn Garamond", excelComResult.minorFont === "Garamond", `actual=${excelComResult.minorFont}`);
  }

  // 12. Mở lại tệp có theme tùy chỉnh và lưu lại (Open-Save roundtrip preservation)
  await session.close();
  session = null;

  session = await launchApp("sheet", {
    localAppData: profile + "-reopen",
    filePath: savedOutPath,
    startTimeoutMilliseconds: 180000,
    readyTimeoutMilliseconds: 180000
  });
  cdp = session.cdp;
  ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 120000 });

  await cdp.waitFor("window.__vnoAppInstance?.grid?.cellsData?.size > 0 && !document.querySelector('.vno-sheet-quick-view')", { timeoutMilliseconds: 180000 });
  await sleep(1000);

  const reloadedTheme = JSON.parse(await ev(`JSON.stringify(${g}.getWorkbookTheme())`));
  check("Mở lại: Bảng màu nạp từ tệp là Blue", reloadedTheme.colorSchemeId === "blue");
  check("Mở lại: Bộ phông nạp từ tệp là Garamond", reloadedTheme.fontSchemeId === "garamond");

  // Lưu lại tệp đã mở sang reopenedSavedPath
  await ev("window.__vnoAppInstance.adapter.isDirty = true");
  const save2Result = await ev(`(() => {
    const fods = window.__vnoAppInstance.adapter.serializeToFods();
    return globalThis.globalUnoBridge.saveRealFileInPlace("sheet", fods, ${JSON.stringify(reopenedSavedPath)}, ${JSON.stringify(savedOutPath)});
  })()`);
  check("Lưu lại tệp đã mở qua saveRealFileInPlace thành công", save2Result && save2Result.status === "ok");

  await sleep(1000);
  const reopenExcelComResult = readExcelTheme(reopenedSavedPath);
  check("Excel COM mở tệp roundtrip thành công", reopenExcelComResult.ok, reopenExcelComResult.error);
  if (reopenExcelComResult.ok && excelComResult.ok) {
    check("Roundtrip: Accent 1 không đổi (2B6CB0)", reopenExcelComResult.accent1 === "2B6CB0", `actual=${reopenExcelComResult.accent1}`);
    check("Roundtrip: MajorFont không đổi (Garamond)", reopenExcelComResult.majorFont === "Garamond", `actual=${reopenExcelComResult.majorFont}`);
    check("Roundtrip: Toàn bộ 12 màu chủ đề bảo toàn 100%", JSON.stringify(reopenExcelComResult.colors) === JSON.stringify(excelComResult.colors));
  }

} catch (err) {
  console.error("Lỗi trong quá trình chạy kiểm thử CDP:", err);
  fail++;
} finally {
  if (session) {
    await session.close();
  }
}

console.log(`\n==================================================`);
console.log(`KẾT QUẢ CDP DESKTOP TEST: ${pass} PASS | ${fail} FAIL`);
console.log(`==================================================`);

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
