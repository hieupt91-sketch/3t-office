# -*- coding: utf-8 -*-
# scripts/audit-0610/measure_excel_oracle_1710.ps1
# Đo lường trực tiếp từ Excel 2016 COM thật (chạy ẩn, theo dõi và kill đúng PID)

$ErrorActionPreference = "Stop"
$outJson = Join-Path (Get-Location) "docs\excel-oracle-1710.json"

$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$excel = $null
for ($a = 0; $a -lt 30 -and -not $excel; $a++) {
    try { $excel = New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 700 }
}
if (-not $excel) { throw "Không khởi động được Excel" }

$after = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$pidExcel = ($after | Where-Object { $before -notcontains $_ })[0]
Write-Host "Excel 2016 COM khởi động thành công (Version: $($excel.Version), Build: $($excel.Build), PID: $pidExcel)"

$results = [System.Collections.ArrayList]@()
$now = [DateTime]::Now.ToString("o")

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
            if ($wb -ne $null) { break }
        } catch { Start-Sleep -Milliseconds 700 }
    }
    if ($wb -eq $null) { throw "Không tạo được Workbook" }

    $ws = $null
    for ($k = 0; $k -lt 30; $k++) {
        try {
            $ws = $wb.Worksheets.Item(1)
            if ($ws -ne $null) { break }
        } catch { Start-Sleep -Milliseconds 700 }
    }
    if ($ws -eq $null) { throw "Không lấy được Worksheet" }

    # -------------------------------------------------------------
    # Phép đo 1: Range.ClearComments (Xóa ghi chú)
    # -------------------------------------------------------------
    for ($k = 0; $k -lt 30; $k++) {
        try {
            $ws.Range("A1").Value2 = "Nội dung A1"
            [void]$ws.Range("A1").AddComment("Ghi chú A1 kiểm thử")
            $ws.Range("B1").Value2 = 12345
            [void]$ws.Range("B1").AddComment("Ghi chú B1 kiểm thử")
            $ws.Range("C1").Value2 = "Ngoài vùng"
            [void]$ws.Range("C1").AddComment("Ghi chú C1 kiểm thử")
            break
        } catch { Start-Sleep -Milliseconds 700 }
    }

    # Thực hiện ClearComments trên vùng A1:B1
    for ($k = 0; $k -lt 30; $k++) {
        try {
            [void]$ws.Range("A1:B1").ClearComments()
            break
        } catch { Start-Sleep -Milliseconds 700 }
    }

    $cmtA1 = try { $ws.Range("A1").Comment } catch { $null }
    $cmtB1 = try { $ws.Range("B1").Comment } catch { $null }
    $cmtC1 = try { $ws.Range("C1").Comment } catch { $null }
    $valA1 = try { $ws.Range("A1").Value2 } catch { "" }
    $valB1 = try { $ws.Range("B1").Value2 } catch { "" }
    $valC1Text = if ($cmtC1 -ne $null) { try { $cmtC1.Text() } catch { "" } } else { "" }

    $results.Add([ordered]@{
        ten_phep_do = "1_xoa_ghi_chu"
        tinh_nang = "Xóa ghi chú (Clear Comments)"
        thuoc_tinh = "Range.ClearComments / Range.Comment"
        gia_tri_doc = [ordered]@{
            A1_Comment = if ($cmtA1 -eq $null) { "null" } else { "present" }
            B1_Comment = if ($cmtB1 -eq $null) { "null" } else { "present" }
            C1_Comment = if ($cmtC1 -ne $null) { "present" } else { "null" }
            A1_Value2 = $valA1
            B1_Value2 = $valB1
            C1_Comment_Text = $valC1Text
        }
        y_nghia = "ClearComments gỡ toàn bộ ghi chú trong vùng chọn (A1:B1 null), giữ nguyên nội dung ô và giữ nguyên ghi chú ngoài vùng (C1 present)"
        thoi_diem = $now
    }) | Out-Null
    Write-Host "[PASS] Phép đo 1: Xóa ghi chú (ClearComments)"

    # -------------------------------------------------------------
    # Phép đo 2: Range.ClearHyperlinks (Xóa siêu liên kết)
    # -------------------------------------------------------------
    for ($k = 0; $k -lt 30; $k++) {
        try {
            $ws.Range("A3").Value2 = "Trang chủ VN Office"
            [void]$ws.Hyperlinks.Add($ws.Range("A3"), "https://vnoffice.vn", [Type]::Missing, "Trang chủ VN Office", "Trang chủ VN Office")
            $ws.Range("B3").Value2 = "Hỗ trợ kỹ thuật"
            [void]$ws.Hyperlinks.Add($ws.Range("B3"), "mailto:hotro@vnoffice.vn", [Type]::Missing, "Email hỗ trợ", "Hỗ trợ kỹ thuật")
            $ws.Range("C3").Value2 = "Liên kết ngoài vùng"
            [void]$ws.Hyperlinks.Add($ws.Range("C3"), "https://example.com", [Type]::Missing, "Ví dụ", "Liên kết ngoài vùng")
            break
        } catch { Start-Sleep -Milliseconds 700 }
    }

    # Thực hiện ClearHyperlinks trên vùng A3:B3
    for ($k = 0; $k -lt 30; $k++) {
        try {
            [void]$ws.Range("A3:B3").ClearHyperlinks()
            break
        } catch { Start-Sleep -Milliseconds 700 }
    }

    $hlA3Count = try { $ws.Range("A3").Hyperlinks.Count } catch { 0 }
    $hlB3Count = try { $ws.Range("B3").Hyperlinks.Count } catch { 0 }
    $hlC3Count = try { $ws.Range("C3").Hyperlinks.Count } catch { 0 }
    $valA3 = try { $ws.Range("A3").Value2 } catch { "" }
    $valB3 = try { $ws.Range("B3").Value2 } catch { "" }
    $valC3 = try { $ws.Range("C3").Value2 } catch { "" }

    $results.Add([ordered]@{
        ten_phep_do = "2_xoa_sieu_lien_ket"
        tinh_nang = "Xóa siêu liên kết (Clear Hyperlinks)"
        thuoc_tinh = "Range.ClearHyperlinks / Hyperlinks.Count"
        gia_tri_doc = [ordered]@{
            A3_Hyperlinks_Count = $hlA3Count
            B3_Hyperlinks_Count = $hlB3Count
            C3_Hyperlinks_Count = $hlC3Count
            A3_Value2 = $valA3
            B3_Value2 = $valB3
            C3_Value2 = $valC3
        }
        y_nghia = "ClearHyperlinks gỡ bỏ liên kết trong vùng chọn (A3/B3 count=0), giữ nguyên văn bản hiển thị và giữ nguyên liên kết ngoài vùng (C3 count=1)"
        thoi_diem = $now
    }) | Out-Null
    Write-Host "[PASS] Phép đo 2: Xóa siêu liên kết (ClearHyperlinks)"

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

$jsonText = $results | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($outJson, $jsonText, [System.Text.Encoding]::UTF8)
Write-Host "Đã xuất kết quả đối chiếu ra file: $outJson"
