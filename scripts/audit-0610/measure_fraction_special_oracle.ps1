# -*- coding: utf-8 -*-
# scripts/audit-0610/measure_fraction_special_oracle.ps1
# Đo lường định dạng Phân số (Fraction) và Đặc biệt (Special) từ Excel 2016 COM thật

$ErrorActionPreference = "Stop"
$outJson = Join-Path (Get-Location) "tests\functions\structural-cases-18.json"

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
    fractions = [System.Collections.ArrayList]@()
    specials = [System.Collections.ArrayList]@()
}

try {
    for ($k = 0; $k -lt 30; $k++) {
        try {
            $excel.Visible = $false
            $excel.DisplayAlerts = $false
            break
        } catch { Start-Sleep -Milliseconds 700 }
    }

    $wb = $null
    for ($k = 0; $k -lt 30; $k++) {
        try {
            $wb = $excel.Workbooks.Add()
            if ($null -ne $wb) { break }
        } catch {
            Write-Host "Workbooks.Add retry $k error: $($_.Exception.Message)"
            Start-Sleep -Milliseconds 700
        }
    }
    if ($null -eq $wb) { throw "Không tạo được Workbook" }

    $ws = $null
    for ($k = 0; $k -lt 30; $k++) {
        try {
            $ws = $wb.Worksheets.Item(1)
            if ($null -ne $ws) { break }
        } catch {
            Write-Host "Worksheets.Item retry $k error: $($_.Exception.Message)"
            Start-Sleep -Milliseconds 700
        }
    }
    if ($null -eq $ws) { throw "Không lấy được Worksheet" }

    $ws.Columns.Item(1).ColumnWidth = 30
    $ws.Columns.Item(2).ColumnWidth = 30

    # 1. Phép đo Phân số (Fraction)
    $fractionFormats = @(
        '# ?/?',
        '# ??/??',
        '# ???/???',
        '# ?/2',
        '# ?/4',
        '# ?/8',
        '# ??/16',
        '# ?/10',
        '# ??/100'
    )
    $testValues = @(0, 0.5, 0.25, 0.75, 0.125, 0.3333333, 0.6666667, 1.25, 2.625, 0.1, 0.05, 12.3456, -1.5, 0.9999)

    foreach ($fmt in $fractionFormats) {
        $cellTests = New-Object System.Collections.ArrayList
        foreach ($val in $testValues) {
            $ws.Range("A1").NumberFormat = $fmt
            $ws.Range("A1").Value2 = [double]$val
            $text = $ws.Range("A1").Text
            $cellTests.Add([ordered]@{
                value = $val
                text = $text.Trim()
                rawText = $text
            }) | Out-Null
        }
        $oracleResults.fractions.Add([ordered]@{
            format = $fmt
            cases = $cellTests
        }) | Out-Null
    }

    # 2. Phép đo Đặc biệt (Special)
    $specialFormats = @(
        [ordered]@{ name = "postal5"; format = "00000"; values = @(123, 12345, 90210, 70000) },
        [ordered]@{ name = "postalPlus4"; format = "00000-0000"; values = @(123456789, 12345, 902101234) },
        [ordered]@{ name = "phone"; format = "[<=9999999]###-####;(###) ###-####"; values = @(1234567, 8005551212, 5551234) },
        [ordered]@{ name = "ssn"; format = "000-00-0000"; values = @(123456789, 12345, 987654321) }
    )

    foreach ($spec in $specialFormats) {
        $cellTests = New-Object System.Collections.ArrayList
        foreach ($val in $spec.values) {
            $ws.Range("B1").NumberFormat = $spec.format
            $ws.Range("B1").Value2 = [double]$val
            $text = $ws.Range("B1").Text
            $cellTests.Add([ordered]@{
                value = $val
                text = $text.Trim()
                rawText = $text
            }) | Out-Null
        }
        $oracleResults.specials.Add([ordered]@{
            name = $spec.name
            format = $spec.format
            cases = $cellTests
        }) | Out-Null
    }

    try { $wb.Close($false) } catch {}
    try { $excel.Quit() } catch {}
} finally {
    if ($excel -ne $null) {
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null } catch {}
    }
    if ($pidExcel) {
        Start-Sleep -Milliseconds 500
        Stop-Process -Id $pidExcel -Force -ErrorAction SilentlyContinue
    }
}

$jsonText = $oracleResults | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($outJson, $jsonText, [System.Text.Encoding]::UTF8)
Write-Host "Đã xuất kết quả đối chiếu ra file: $outJson"
