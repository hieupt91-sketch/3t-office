param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $Path)) { throw "Missing workbook: $Path" }
$resolvedPath = (Resolve-Path -LiteralPath $Path).Path

function Invoke-ComWithRetry([scriptblock]$Action, [string]$Operation, [int]$Retries = 20) {
  for ($attempt = 0; $attempt -le $Retries; $attempt++) {
    try { return (& $Action) }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge $Retries) { throw ("{0}: {1}" -f $Operation, $_.Exception.Message) }
      Start-Sleep -Milliseconds 500
    }
  }
}

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class VnoExcelG3WindowPid {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@

$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$app = $null
$book = $null
$sheet = $null
$ownedPid = 0
try {
  for ($attempt = 0; $attempt -le 20 -and -not $book; $attempt++) {
    $candidateApp = $null
    $candidatePid = 0
    try {
      $candidateApp = New-Object -ComObject Excel.Application
      $candidateApp.Visible = $false
      $candidateApp.DisplayAlerts = $false
      Start-Sleep -Milliseconds 1000
      $candidateBook = $candidateApp.Workbooks.Open($resolvedPath, 0, $true)
      if ($candidateBook) { $app = $candidateApp; $book = $candidateBook; break }
    } catch {
      try { if ($candidateApp) { $candidateApp.Quit() } } catch {}
      if ($candidateApp) { try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($candidateApp) } catch {} }
      [GC]::Collect(); [GC]::WaitForPendingFinalizers()
      Start-Sleep -Milliseconds 700
    }
  }
  if (-not $book) { throw 'Open workbook read-only failed after retries.' }
  # The third Open argument is ReadOnly=true. Do not query workbook properties while Excel is
  # still calculating chart caches; Excel 2016 can reject those calls.
  $isReadOnly = $true
  for ($attempt = 0; $attempt -le 60 -and -not $sheet; $attempt++) {
    try { $sheet = $book.Worksheets.Item(1) } catch {}
    if (-not $sheet) { Start-Sleep -Milliseconds 500 }
  }
  if (-not $sheet) { throw 'Could not read first worksheet.' }
  $pidValue = [uint32]0
  [void][VnoExcelG3WindowPid]::GetWindowThreadProcessId([IntPtr]$app.Hwnd, [ref]$pidValue)
  $ownedPid = [int]$pidValue
  if ($ownedPid -le 0 -or $before -contains $ownedPid) { throw 'Application did not start a private process.' }
  $objectCount = [int]($sheet.ChartObjects().Count)
  if ($objectCount -ne 7) { throw "ChartObjects.Count=$objectCount, expected 7" }
  $expectedTypes = @(57, 52, 53, -4169, 51, -4151, 15)
  $result = @()
  for ($i = 1; $i -le 7; $i++) {
    $object = $null
    for ($attempt = 0; $attempt -le 60 -and -not $object; $attempt++) {
      try { $object = $sheet.ChartObjects($i) } catch {}
      if (-not $object) { Start-Sleep -Milliseconds 500 }
    }
    if (-not $object) { throw "Could not read chart object $i." }
    $chart = $null
    for ($attempt = 0; $attempt -le 60 -and -not $chart; $attempt++) {
      try { $chart = $object.Chart } catch {}
      if (-not $chart) { Start-Sleep -Milliseconds 500 }
    }
    if (-not $chart) { throw "Could not read chart $i." }
    $seriesCount = [int]($chart.SeriesCollection().Count)
    $series = @()
    for ($j = 1; $j -le $seriesCount; $j++) {
      $item = $null
      for ($attempt = 0; $attempt -le 60 -and -not $item; $attempt++) {
        try { $item = $chart.SeriesCollection($j) } catch {}
        if (-not $item) { Start-Sleep -Milliseconds 500 }
      }
      if (-not $item) { throw "Could not read series $i/$j." }
      $series += [ordered]@{
        ChartType = [int]($item.ChartType)
        HasDataLabels = [bool]($item.HasDataLabels)
        Trendlines = [int]($item.Trendlines().Count)
        Formula = [string]($item.Formula)
      }
      [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($item)
    }
    $actualType = [int]($chart.ChartType)
    if ($i -ne 5 -and $actualType -ne $expectedTypes[$i - 1]) { throw "Chart $i ChartType=$actualType, expected $($expectedTypes[$i - 1])" }
    if ($series.Count -lt 1) { throw "Chart $i has no series" }
    if ($i -eq 5) {
      $seriesTypes = @($series | ForEach-Object { $_.ChartType })
      if ($seriesTypes -notcontains 51 -or $seriesTypes -notcontains 4) { throw "Combo series ChartType=$($seriesTypes -join ',')" }
      if (@($series | Where-Object { -not $_.HasDataLabels }).Count -gt 0) { throw 'Combo HasDataLabels is false.' }
      if ($series[0].Trendlines -lt 1) { throw 'Combo first series has no trendline.' }
    }
    $result += [ordered]@{ Index=$i; ChartType=$actualType; SeriesCount=$series.Count; Series=$series }
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($chart)
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($object)
  }
  [ordered]@{ ReadOnly=$isReadOnly; OwnedPid=$ownedPid; Charts=$result } | ConvertTo-Json -Depth 7
} finally {
  if ($book) { try { $book.Close($false) } catch {} }
  if ($app) { try { $app.Quit() } catch {} }
  foreach ($obj in @($sheet, $book, $app)) { if ($obj) { try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($obj) } catch {} } }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
  if ($ownedPid -gt 0) {
    $process = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
    if ($process) { Stop-Process -Id $ownedPid -Force }
  }
}
