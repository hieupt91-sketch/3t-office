param([Parameter(Mandatory=$true)][string]$File, [int]$Retries = 20, [int]$RetryDelayMilliseconds = 2500, [switch]$PerSheet, [switch]$PerSheetOnly)
# Excel COM page-count oracle using the workbook's real saved print setup.
# Run one file per process, in series. RPC_E_CALL_REJECTED (0x80010001) is
# retried after waiting; no busy Office call is skipped.
function Invoke-ComWithRetry([scriptblock]$Action, [string]$Operation) {
  for ($attempt = 0; $attempt -le $Retries; $attempt++) {
    try { return (& $Action) }
    catch {
      $hr = $_.Exception.HResult
      if ($hr -ne -2147418111 -or $attempt -ge $Retries) { throw "${Operation}: $($_.Exception.Message)" }
      Start-Sleep -Milliseconds $RetryDelayMilliseconds
    }
  }
}

$excel = $null
$ownsOfficeProcess = $false
$ownedExcelPid = 0
$workbook = $null
$worksheets = $null
$worksheet = $null
$failed = $false
$existingExcelPids = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoExcelPrintAuditWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue
$pdf = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "vno_excel_oracle_" + [guid]::NewGuid().ToString("N") + ".pdf")
try {
  $excel = Invoke-ComWithRetry { New-Object -ComObject Excel.Application } 'Create Excel'
  $excelHandle = [IntPtr](Invoke-ComWithRetry { [int]$excel.Hwnd } 'Read Excel window')
  $excelOwner = [uint32]0
  [void][VnoExcelPrintAuditWindow]::GetWindowThreadProcessId($excelHandle, [ref]$excelOwner)
  $ownedExcelPid = [int]$excelOwner
  $ownsOfficeProcess = $ownedExcelPid -gt 0 -and $existingExcelPids -notcontains $ownedExcelPid
  if (-not $ownsOfficeProcess) {
    throw 'Excel did not start a private process; existing Excel instances were left untouched.'
  }
  Invoke-ComWithRetry { $excel.Visible = $false; $excel.DisplayAlerts = $false } 'Configure Excel' | Out-Null
  $fullPath = (Resolve-Path -LiteralPath $File).Path
  $workbook = Invoke-ComWithRetry { $excel.Workbooks.Open($fullPath, 0, $true) } 'Open workbook'
  if (-not $PerSheetOnly) {
    Invoke-ComWithRetry { $workbook.ExportAsFixedFormat(0, $pdf) } 'Export PDF' | Out-Null
    $bytes = [System.IO.File]::ReadAllBytes($pdf)
    $text = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
    $pages = ([regex]::Matches($text, "/Type\s*/Page[^s]")).Count
    "OK pages=$pages"
  }
  if ($PerSheet -or $PerSheetOnly) {
    $worksheets = $workbook.Worksheets
    $sheetCount = [int](Invoke-ComWithRetry { $worksheets.Count } 'Read worksheet count')
    for ($index = 1; $index -le $sheetCount; $index++) {
      $worksheet = Invoke-ComWithRetry { $worksheets.Item($index) } "Get worksheet $index"
      $sheetPdf = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "vno_excel_oracle_" + [guid]::NewGuid().ToString("N") + ".pdf")
      try {
        Invoke-ComWithRetry { $worksheet.ExportAsFixedFormat(0, $sheetPdf) } "Export worksheet $index" | Out-Null
        $sheetBytes = [System.IO.File]::ReadAllBytes($sheetPdf)
        $sheetText = [System.Text.Encoding]::GetEncoding(28591).GetString($sheetBytes)
        $sheetPages = ([regex]::Matches($sheetText, "/Type\s*/Page[^s]")).Count
        $sheetName = [string](Invoke-ComWithRetry { $worksheet.Name } "Read worksheet $index name")
        $visible = [int](Invoke-ComWithRetry { $worksheet.Visible } "Read worksheet $index visibility")
        $usedRange = [string](Invoke-ComWithRetry { $worksheet.UsedRange.Address($false, $false) } "Read worksheet $index used range")
        $printArea = [string](Invoke-ComWithRetry { $worksheet.PageSetup.PrintArea } "Read worksheet $index print area")
        $orientation = [int](Invoke-ComWithRetry { $worksheet.PageSetup.Orientation } "Read worksheet $index orientation")
        $zoom = Invoke-ComWithRetry { $worksheet.PageSetup.Zoom } "Read worksheet $index zoom"
        $fitWide = Invoke-ComWithRetry { $worksheet.PageSetup.FitToPagesWide } "Read worksheet $index fit-wide"
        $fitTall = Invoke-ComWithRetry { $worksheet.PageSetup.FitToPagesTall } "Read worksheet $index fit-tall"
        "SHEET name=$sheetName pages=$sheetPages visible=$visible used=$usedRange printArea=$printArea orientation=$orientation zoom=$zoom fitWide=$fitWide fitTall=$fitTall"
      } finally {
        if (Test-Path -LiteralPath $sheetPdf) { Remove-Item -LiteralPath $sheetPdf -Force -ErrorAction SilentlyContinue }
        if ($worksheet) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($worksheet); $worksheet = $null }
      }
    }
  }
} catch {
  $failed = $true
  "FAIL $($_.Exception.Message -replace "`r|`n", " ")"
} finally {
  if ($workbook) { try { Invoke-ComWithRetry { $workbook.Close($false) } 'Close workbook' | Out-Null } catch {} }
  if ($worksheet) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($worksheet) }
  if ($worksheets) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($worksheets) }
  if ($workbook) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook) }
  if ($excel) {
    if ($ownsOfficeProcess) {
      try { Invoke-ComWithRetry { $excel.Quit() } 'Quit Excel' | Out-Null }
      catch { "WARN Excel quit failed for owned PID $ownedExcelPid; no other process was stopped." }
    }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  if (Test-Path -LiteralPath $pdf) { Remove-Item -LiteralPath $pdf -Force -ErrorAction SilentlyContinue }
}
if ($failed) { exit 1 }
