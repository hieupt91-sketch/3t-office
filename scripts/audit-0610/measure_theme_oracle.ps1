# -*- coding: utf-8 -*-
# scripts/audit-0610/measure_theme_oracle.ps1
# Đo lường Chủ đề (Themes), Bảng màu (Colors), Bộ phông chữ (Fonts) từ Excel 2016 COM thật

$ErrorActionPreference = "Stop"
$outJson = Join-Path (Get-Location) "tests\functions\structural-cases-19.json"
$tempDir = Join-Path (Get-Location) "temp_theme_tests"

Write-Host "--- Bước 1: Chuẩn bị tệp XLSX kiểm thử chủ đề qua Node.js ---"
node scripts/audit-0610/prepare_theme_test_files.mjs $tempDir
if (-not (Test-Path $tempDir)) {
    throw "Không tạo được thư mục kiểm thử: $tempDir"
}
$manifestFile = Join-Path $tempDir "manifest.json"
$manifest = Get-Content -Raw -Path $manifestFile -Encoding UTF8 | ConvertFrom-Json

Write-Host "--- Bước 2: Khởi động Excel 2016 COM ---"
$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$excel = $null
for ($a = 0; $a -lt 30 -and -not $excel; $a++) {
    try { $excel = New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 700 }
}
if (-not $excel) { throw "Không khởi động được Excel" }

$after = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$pidExcel = ($after | Where-Object { $before -notcontains $_ })[0]
Write-Host "Excel 2016 COM khởi động thành công (Version: $($excel.Version), Build: $($excel.Build), PID: $pidExcel)"

$oracleResults = [ordered]@{
    version = $excel.Version
    build = $excel.Build
    measuredAt = [DateTime]::Now.ToString("o")
    themeCount = $manifest.Count
    themes = [System.Collections.ArrayList]@()
}

$colorNames = @(
    "dk1", "lt1", "dk2", "lt2",
    "accent1", "accent2", "accent3", "accent4", "accent5", "accent6",
    "hlink", "folHlink"
)

$passedCount = 0
$totalCount = $manifest.Count

try {
    for ($k = 0; $k -lt 30; $k++) {
        try {
            $excel.DisplayAlerts = $false
            $excel.AskToUpdateLinks = $false
            $excel.EnableEvents = $false
            break
        } catch { Start-Sleep -Milliseconds 700 }
    }

    foreach ($entry in $manifest) {
        $filePath = $entry.filePath
        $wb = $null
        for ($k = 0; $k -lt 30; $k++) {
            try {
                $wb = $excel.Workbooks.Open($filePath, 0, $true)
                if ($null -ne $wb) { break }
            } catch {
                Start-Sleep -Milliseconds 500
            }
        }
        if ($null -eq $wb) {
            throw "Không thể mở tệp kiểm thử: $filePath"
        }

        $theme = $wb.Theme
        $cs = $theme.ThemeColorScheme
        $fs = $theme.ThemeFontScheme

        # Read back colors
        $readColors = [ordered]@{}
        $colorMatches = $true
        for ($i = 1; $i -le 12; $i++) {
            $cName = $colorNames[$i - 1]
            $rgbInt = $cs.Colors($i).RGB
            $r = $rgbInt -band 0xFF
            $g = ($rgbInt -shr 8) -band 0xFF
            $b = ($rgbInt -shr 16) -band 0xFF
            $hex = "{0:X2}{1:X2}{2:X2}" -f $r, $g, $b
            $readColors[$cName] = $hex

            $expectedHex = $entry.expectedColors.$cName
            if ($expectedHex -and ($hex.ToUpper() -ne $expectedHex.ToUpper())) {
                $colorMatches = $false
                Write-Host "[$($entry.id)] Màu $cName không khớp: đọc được $hex, mong đợi $expectedHex"
            }
        }

        # Read back font scheme
        $tempFontXml = [System.IO.Path]::GetTempFileName()
        $fs.Save($tempFontXml)
        $fontXml = [System.IO.File]::ReadAllText($tempFontXml, [System.Text.Encoding]::UTF8)
        [System.IO.File]::Delete($tempFontXml)

        $majorMatch = [regex]::Match($fontXml, '<a:majorFont[^>]*>\s*<a:latin\s+typeface="([^"]+)"')
        $minorMatch = [regex]::Match($fontXml, '<a:minorFont[^>]*>\s*<a:latin\s+typeface="([^"]+)"')
        $readMajor = if ($majorMatch.Success) { $majorMatch.Groups[1].Value } else { "" }
        $readMinor = if ($minorMatch.Success) { $minorMatch.Groups[1].Value } else { "" }

        $fontMatches = ($readMajor -eq $entry.expectedMajorFont) -and ($readMinor -eq $entry.expectedMinorFont)
        if (-not $fontMatches) {
            Write-Host "[$($entry.id)] Phông không khớp: Major='$readMajor' (mong đợi '$($entry.expectedMajorFont)'), Minor='$readMinor' (mong đợi '$($entry.expectedMinorFont)')"
        }

        $isPass = $colorMatches -and $fontMatches
        if ($isPass) {
            $passedCount++
            Write-Host "  [PASS] $($entry.testType) id=$($entry.id): 12/12 colors match, Major='$readMajor', Minor='$readMinor'"
        } else {
            Write-Host "  [FAIL] $($entry.testType) id=$($entry.id) mismatched"
        }

        $resultItem = [ordered]@{
            testType = $entry.testType
            id = $entry.id
            name = $entry.name
            colorSchemeId = $entry.colorSchemeId
            colorSchemeName = $entry.colorSchemeName
            readColors = $readColors
            expectedColors = $entry.expectedColors
            colorsMatch = $colorMatches
            fontSchemeId = $entry.fontSchemeId
            fontSchemeName = $entry.fontSchemeName
            readMajorFont = $readMajor
            readMinorFont = $readMinor
            expectedMajorFont = $entry.expectedMajorFont
            expectedMinorFont = $entry.expectedMinorFont
            fontsMatch = $fontMatches
            pass = $isPass
        }
        $oracleResults.themes.Add($resultItem) | Out-Null

        try { $wb.Close($false) } catch {}
    }

    try { $excel.Quit() } catch {}
} finally {
    if ($excel -ne $null) {
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null } catch {}
    }
    if ($pidExcel) {
        Start-Sleep -Milliseconds 500
        Stop-Process -Id $pidExcel -Force -ErrorAction SilentlyContinue
    }
    if (Test-Path $tempDir) {
        Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $tempDir
    }
}

$oracleResults.passedCount = $passedCount
$oracleResults.allPass = ($passedCount -eq $totalCount)

$jsonText = $oracleResults | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($outJson, $jsonText, [System.Text.Encoding]::UTF8)

Write-Host "----------------------------------------------------"
Write-Host "KẾT QUẢ ĐỐI CHIẾU CHỦ ĐỀ EXCEL 2016 COM: $passedCount / $totalCount PASS"
Write-Host "Đã xuất dữ liệu đối chiếu chuẩn ra file: $outJson"
if ($passedCount -ne $totalCount) {
    exit 1
}
