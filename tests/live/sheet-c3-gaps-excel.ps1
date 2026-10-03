param([string[]]$Files)
$ErrorActionPreference = "Stop"

function Invoke-ComWithRetry([scriptblock]$Action, [string]$Operation, [int]$Retries = 20) {
  for ($attempt = 0; $attempt -le $Retries; $attempt++) {
    try { return (& $Action) }
    catch {
      $hr = $_.Exception.HResult
      if ($hr -ne -2147418111 -or $attempt -ge $Retries) {
        throw ("{0}: {1}" -f $Operation, $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 500
    }
  }
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoExcelAuditWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$excel = $null
$owned = $false
$ownedPid = 0
$failed = $false
try {
  $excel = Invoke-ComWithRetry { New-Object -ComObject Excel.Application } "Create Excel"
  $handle = [IntPtr](Invoke-ComWithRetry { [int]$excel.Hwnd } "Read Excel window")
  $owner = [uint32]0
  [void][VnoExcelAuditWindow]::GetWindowThreadProcessId($handle, [ref]$owner)
  $ownedPid = [int]$owner
  $owned = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $owned) {
    throw "Excel did not start a private process; existing Excel instances were left untouched."
  }

  Invoke-ComWithRetry { $excel.Visible = $false } "Hide Excel" | Out-Null
  Invoke-ComWithRetry { $excel.DisplayAlerts = $false } "Disable Excel alerts" | Out-Null
  foreach ($file in $Files) {
    $workbook = $null
    $name = Split-Path $file -Leaf
    try {
      $workbook = Invoke-ComWithRetry { $excel.Workbooks.Open($file, 0, $true) } "Open $name"
      $count = [int](Invoke-ComWithRetry { $workbook.Worksheets.Count } "Read $name sheet count")
      $sheet = $workbook.Worksheets.Item(1)
      $values = @()
      foreach ($coord in @("A1", "A2", "A3", "A4", "B1")) {
        $cell = $sheet.Range($coord)
        $value = $cell.Value2
        $values += [ordered]@{cell=$coord; value=$value; type=$(if ($null -eq $value) {"null"} else {$value.GetType().Name}); formula=$cell.Formula; format=$cell.NumberFormat}
      }
      $page = $sheet.PageSetup
      [ordered]@{file=$name; ownedPid=$ownedPid; visible=$excel.Visible; sheets=$count; values=$values; page=[ordered]@{orientation=$page.Orientation; paperSize=$page.PaperSize; topCm=$page.TopMargin*2.54/72; bottomCm=$page.BottomMargin*2.54/72; leftCm=$page.LeftMargin*2.54/72; rightCm=$page.RightMargin*2.54/72; area=$page.PrintArea; repeatRows=$page.PrintTitleRows; fitWide=$page.FitToPagesWide; fitTall=$page.FitToPagesTall; zoom=$page.Zoom; header=$page.CenterHeader; footer=$page.CenterFooter}; tabColor=$sheet.Tab.Color} | ConvertTo-Json -Depth 6 -Compress
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($page)
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sheet)
    } catch {
      $failed = $true
      "$name FAIL " + ($_.Exception.Message -replace '[\r\n]', ' ')
    } finally {
      if ($workbook) {
        try { Invoke-ComWithRetry { $workbook.Close($false) } "Close $name" | Out-Null } catch { $failed = $true }
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
      }
    }
  }
} catch {
  $failed = $true
  "BLOCKED " + ($_.Exception.Message -replace '[\r\n]', ' ')
} finally {
  if ($excel) {
    if ($owned) {
      try { Invoke-ComWithRetry { $excel.Quit() } "Quit Excel" | Out-Null }
      catch { "WARN Excel quit failed for owned PID $ownedPid; no other process was stopped." }
    }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
if ($failed) { exit 1 }
