param([Parameter(Mandatory = $true)][string]$File)
$ErrorActionPreference = "Stop"

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoSheetTableAuditWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

function Invoke-ExcelRetry([scriptblock]$Action, [string]$Operation, [int]$Retries = 20) {
  for ($attempt = 0; $attempt -le $Retries; $attempt++) {
    try { return (& $Action) }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge $Retries) {
        throw ("{0}: {1}" -f $Operation, $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 500
    }
  }
}

$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$excel = $null
$workbook = $null
$owned = $false
$ownedPid = 0
$failed = $false
try {
  # Keep Office COM objects in this scope. Returning them through a PowerShell
  # function can enumerate/coerce the automation object.
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $excel = New-Object -ComObject Excel.Application; break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $excel) { throw "Create Excel returned no application object." }
  $handle = [IntPtr](Invoke-ExcelRetry { [int]$excel.Hwnd } "Read Excel window")
  $owner = [uint32]0
  [void][VnoSheetTableAuditWindow]::GetWindowThreadProcessId($handle, [ref]$owner)
  $ownedPid = [int]$owner
  $owned = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $owned) { throw "Excel did not start a private process; existing Excel instances were left untouched." }
  if ($excel.Visible) { Invoke-ExcelRetry { $excel.Visible = $false } "Hide Excel" | Out-Null }
  Invoke-ExcelRetry { $excel.DisplayAlerts = $false } "Disable Excel alerts" | Out-Null

  $resolvedFile = (Resolve-Path -LiteralPath $File).Path
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $workbook = $excel.Workbooks.Open($resolvedFile, 0, $true); break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $workbook) { throw "Open read-only workbook returned no workbook object." }

  $readOnly = [bool]$workbook.ReadOnly
  $sheetCount = 0
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $sheetCount = [int]$workbook.Worksheets.Count }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
    }
    if ($sheetCount -gt 0) { break }
    if ($attempt -ge 20) { throw "Workbook returned no worksheets after retries." }
    Start-Sleep -Milliseconds 500
  }
  if ($sheetCount -lt 1) { throw "Workbook contains no worksheets." }
  $worksheet = $null
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try { $worksheet = $workbook.Worksheets.Item(1); break }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
      Start-Sleep -Milliseconds 500
    }
  }
  $sheetName = [string](Invoke-ExcelRetry { $worksheet.Name } "Read worksheet name")
  $count = [int](Invoke-ExcelRetry { $worksheet.ListObjects.Count } "Read table count")
  "File=$File ReadOnly=$readOnly Worksheet=$sheetName ListObjects.Count=$count"
  for ($index = 1; $index -le $count; $index++) {
    $table = $null
    for ($attempt = 0; $attempt -le 20; $attempt++) {
      try { $table = $worksheet.ListObjects.Item($index); break }
      catch {
        if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
        Start-Sleep -Milliseconds 500
      }
    }
    $name = [string](Invoke-ExcelRetry { $table.Name } "Read table name")
    $range = [string](Invoke-ExcelRetry { $table.Range.Address($false, $false) } "Read table range")
    $showAutoFilter = [bool](Invoke-ExcelRetry { $table.ShowAutoFilter } "Read ShowAutoFilter")
    $styleValue = Invoke-ExcelRetry { $table.TableStyle } "Read TableStyle"
    $style = if ($styleValue -and $styleValue.GetType().IsCOMObject) {
      [string](Invoke-ExcelRetry { $table.TableStyle.Name } "Read TableStyle name")
    } else { [string]$styleValue }
    "Name=$name Range=$range ShowAutoFilter=$showAutoFilter TableStyle=$style"
  }
} catch {
  $failed = $true
  "FAIL " + ($_.Exception.Message -replace '[\r\n]', ' ')
} finally {
  if ($workbook) {
    try { Invoke-ExcelRetry { $workbook.Close($false) } "Close read-only workbook" | Out-Null }
    catch { Write-Warning ("Could not close read-only workbook cleanly: {0}" -f $_.Exception.Message); $failed = $true }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
  }
  if ($excel) {
    if ($owned) {
      try { Invoke-ExcelRetry { $excel.Quit() } "Quit audit-owned Excel" | Out-Null }
      catch { Write-Warning ("Could not quit audit-owned Excel process {0}: {1}" -f $ownedPid, $_.Exception.Message); $failed = $true }
    }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
if ($failed) { exit 1 }
