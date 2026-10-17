param(
  [Parameter(Mandatory = $true)][string]$Path
)

$ErrorActionPreference = "Stop"
$resolved = (Resolve-Path -LiteralPath $Path).Path
$excel = $null
$workbook = $null
$sheet = $null
$cell = $null
for ($attempt = 0; $attempt -lt 30 -and -not $excel; $attempt++) {
  try { $excel = New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 700 }
}
if (-not $excel) { throw "Không khởi động được ứng dụng kiểm chứng" }

try {
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    try { $excel.DisplayAlerts = $false; break } catch { if ($attempt -eq 39) { throw }; Start-Sleep -Milliseconds 500 }
  }
  for ($attempt = 0; $attempt -lt 120; $attempt++) {
    try { if ($excel.Ready) { break } } catch {}
    Start-Sleep -Milliseconds 500
  }
  for ($attempt = 0; $attempt -lt 90 -and -not $workbook; $attempt++) {
    try { $workbook = $excel.Workbooks.Open($resolved, 0, $true) } catch { Start-Sleep -Milliseconds 700 }
  }
  if (-not $workbook) { throw "Không mở được tệp ở chế độ chỉ đọc" }
  for ($attempt = 0; $attempt -lt 60 -and -not $sheet; $attempt++) {
    try { $sheet = $workbook.Worksheets.Item(1) } catch { Start-Sleep -Milliseconds 500 }
  }
  if (-not $sheet) { throw "Không lấy được trang tính" }
  # Không trả Range qua hàm trợ: gán trực tiếp COM object trong vòng retry.
  for ($attempt = 0; $attempt -lt 60 -and -not $cell; $attempt++) {
    try { $cell = $sheet.Range("D1") } catch { Start-Sleep -Milliseconds 500 }
  }
  if (-not $cell) { throw "Không lấy được ô neo D1" }
  $hasArray = $false
  $formulaArray = ""
  $currentAddress = ""
  for ($attempt = 0; $attempt -lt 40; $attempt++) {
    try {
      $hasArray = [bool]$cell.HasArray
      $formulaArray = [string]$cell.FormulaArray
      $currentAddress = [string]$cell.CurrentArray.Address($false, $false)
      break
    } catch { if ($attempt -eq 39) { throw }; Start-Sleep -Milliseconds 500 }
  }
  [ordered]@{
    ReadOnly = [bool]$workbook.ReadOnly
    HasArray = $hasArray
    FormulaArray = $formulaArray
    CurrentArrayAddress = $currentAddress
  } | ConvertTo-Json -Compress
} finally {
  if ($workbook) { try { $workbook.Close($false) } catch {} }
  if ($excel) { try { $excel.Quit() } catch {} }
  foreach ($object in @($cell, $sheet, $workbook, $excel)) {
    if ($object) { try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($object) } catch {} }
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
