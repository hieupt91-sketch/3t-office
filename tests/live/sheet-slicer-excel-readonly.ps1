param(
  [Parameter(Mandatory = $true)][string]$File
)

$ErrorActionPreference = 'Stop'

if (-not ('VnoSlicerReadOnlyPid' -as [type])) {
  Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class VnoSlicerReadOnlyPid {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@
}

$excel = $null
$workbook = $null
$ownedPid = 0
try {
  $resolved = [IO.Path]::GetFullPath($File)
  if (-not [IO.File]::Exists($resolved)) { throw "Workbook not found: $resolved" }
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $true
  $excel.DisplayAlerts = $false
  $pidValue = [uint32]0
  [void][VnoSlicerReadOnlyPid]::GetWindowThreadProcessId([IntPtr][int]$excel.Hwnd, [ref]$pidValue)
  $ownedPid = [int]$pidValue
  $workbook = $excel.Workbooks.Open($resolved, 0, $true)
  $workbookName = [string]$workbook.Name
  $workbookFullName = [string]$workbook.FullName
  $workbooksCount = [int]$excel.Workbooks.Count
  $readOnly = [bool]$workbook.ReadOnly
  $slicerCacheCount = [int]$workbook.SlicerCaches.Count
  $caches = @()
  for ($cacheIndex = 1; $cacheIndex -le $slicerCacheCount; $cacheIndex++) {
    $cache = $workbook.SlicerCaches.Item($cacheIndex)
    $slicers = @()
    for ($slicerIndex = 1; $slicerIndex -le [int]$cache.Slicers.Count; $slicerIndex++) {
      $slicer = $cache.Slicers.Item($slicerIndex)
      $slicers += [ordered]@{
        name = [string]$slicer.Name
        caption = [string]$slicer.Caption
        left = [double]$slicer.Left
        top = [double]$slicer.Top
        width = [double]$slicer.Width
        height = [double]$slicer.Height
        numberOfColumns = [int]$slicer.NumberOfColumns
      }
    }
    $items = @()
    for ($itemIndex = 1; $itemIndex -le [int]$cache.SlicerItems.Count; $itemIndex++) {
      $item = $cache.SlicerItems.Item($itemIndex)
      $items += [ordered]@{ name = [string]$item.Name; selected = [bool]$item.Selected; hasData = [bool]$item.HasData }
    }
    $caches += [ordered]@{
      name = [string]$cache.Name
      sourceName = [string]$cache.SourceName
      slicers = $slicers
      items = $items
    }
  }
  if ([IO.Path]::GetFullPath($workbookFullName) -ne $resolved) { throw "Excel opened an unexpected workbook: $workbookFullName" }
  if (-not $readOnly) { throw "Excel did not open the workbook read-only" }
  if ($slicerCacheCount -lt 1) { throw "Excel did not recognize any SlicerCache" }
  [ordered]@{
    file = $resolved
    ownedPid = $ownedPid
    excelVersion = [string]$excel.Version
    workbookName = $workbookName
    workbookFullName = $workbookFullName
    workbooksCount = $workbooksCount
    readOnly = $readOnly
    slicerCacheCount = $slicerCacheCount
    slicerCount = [int](($caches | ForEach-Object { $_.slicers.Count } | Measure-Object -Sum).Sum)
    caches = $caches
  } | ConvertTo-Json -Depth 10 -Compress
} finally {
  if ($workbook) { try { $workbook.Close($false) } catch {} }
  if ($excel) { try { $excel.Quit() } catch {} }
  foreach ($comObject in @($workbook, $excel)) {
    if ($comObject) { try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($comObject) } catch {} }
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  if ($ownedPid -gt 0) {
    $ownedProcess = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
    if ($ownedProcess -and $ownedProcess.ProcessName -eq 'EXCEL') { Stop-Process -Id $ownedPid -Force }
  }
}
