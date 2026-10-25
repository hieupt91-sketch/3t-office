param(
  [Parameter(Mandatory=$true)][string]$File,
  [string]$OwnedPidFile = "",
  [int]$Retries = 20,
  [int]$RetryDelayMilliseconds = 500
)
$ErrorActionPreference = "Stop"

function Invoke-ComWithRetry([scriptblock]$Action, [string]$Operation) {
  for ($attempt = 0; ; $attempt++) {
    try { return (& $Action) }
    catch {
      $hr = $_.Exception.HResult
      if ($hr -ne -2147418111 -or $attempt -ge $Retries) {
        throw ("{0}: {1}" -f $Operation, $_.Exception.Message)
      }
      Start-Sleep -Milliseconds $RetryDelayMilliseconds
    }
  }
}

function Safe-ReleaseComObject($obj) {
  if ($obj -ne $null -and [System.Runtime.InteropServices.Marshal]::IsComObject($obj)) {
    try { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($obj) } catch {}
  }
}

$fullPath = (Resolve-Path -LiteralPath $File).Path
$before = @(Get-Process -Name POWERPNT -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$pp = $null
$pres = $null
$mine = @()
$failed = $false
$resultObj = $null

try {
  $pp = Invoke-ComWithRetry { New-Object -ComObject PowerPoint.Application } "Create PowerPoint"
  $mine = @(Get-Process -Name POWERPNT -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id } | ForEach-Object { $_.Id })
  if ($OwnedPidFile -and $mine.Count -gt 0) {
    [System.IO.File]::WriteAllText($OwnedPidFile, [string]$mine[0])
  }
  try { $pp.DisplayAlerts = 1 } catch {}

  # Presentations.Open(FileName, ReadOnly, Untitled, WithWindow)
  # WithWindow = 0 keeps PowerPoint completely hidden / no window.
  $pres = Invoke-ComWithRetry { $pp.Presentations.Open($fullPath, -1, 0, 0) } "Open presentation"
  $slideCount = [int](Invoke-ComWithRetry { $pres.Slides.Count } "Slide count")

  $shapesTotal = 0
  $picturesTotal = 0
  $chartsTotal = 0
  $withNotes = 0
  $withAnim = 0
  $title1 = ""

  for ($i = 1; $i -le $slideCount; $i++) {
    $slide = Invoke-ComWithRetry { $pres.Slides.Item($i) } "Slide $i"
    $shapes = Invoke-ComWithRetry { $slide.Shapes } "Shapes $i"
    $count = [int](Invoke-ComWithRetry { $shapes.Count } "Shapes count $i")
    $shapesTotal += $count

    for ($k = 1; $k -le $count; $k++) {
      try {
        $sh = Invoke-ComWithRetry { $shapes.Item($k) } "Shape $i.$k"
        $tp = [int](Invoke-ComWithRetry { $sh.Type } "Shape type")
        if ($tp -eq 13) { $picturesTotal++ }
        if ($tp -eq 3) { $chartsTotal++ }
        Safe-ReleaseComObject $sh
      } catch {}
    }

    # Notes count: check slide notes placeholder (index 2)
    try {
      $np = Invoke-ComWithRetry { $slide.NotesPage } "NotesPage $i"
      $ph = Invoke-ComWithRetry { $np.Shapes.Placeholders.Item(2) } "Notes placeholder $i"
      $txt = [string](Invoke-ComWithRetry { $ph.TextFrame.TextRange.Text } "Notes text $i")
      if ($txt -and $txt.Trim().Length -gt 0) { $withNotes++ }
      Safe-ReleaseComObject $ph
      Safe-ReleaseComObject $np
    } catch {}

    # Animation check: main animation sequence
    try {
      $tl = Invoke-ComWithRetry { $slide.TimeLine } "TimeLine $i"
      $ms = Invoke-ComWithRetry { $tl.MainSequence } "MainSequence $i"
      $animCount = [int](Invoke-ComWithRetry { $ms.Count } "Animation count $i")
      if ($animCount -gt 0) { $withAnim++ }
      Safe-ReleaseComObject $ms
      Safe-ReleaseComObject $tl
    } catch {}

    # Title of slide 1
    if ($i -eq 1) {
      try {
        $title1 = [string](Invoke-ComWithRetry { $slide.Shapes.Title.TextFrame.TextRange.Text } "Title text 1")
      } catch {
        for ($k = 1; $k -le $count; $k++) {
          try {
            $sh = $shapes.Item($k)
            if ($sh.HasTextFrame -and $sh.TextFrame.HasText) {
              $title1 = [string]$sh.TextFrame.TextRange.Text
              Safe-ReleaseComObject $sh
              break
            }
            Safe-ReleaseComObject $sh
          } catch {}
        }
      }
    }

    Safe-ReleaseComObject $shapes
    Safe-ReleaseComObject $slide
  }

  $resultObj = [ordered]@{
    status = "PASS"
    file = $fullPath
    slides = $slideCount
    shapes = $shapesTotal
    pics = $picturesTotal
    charts = $chartsTotal
    withNotes = $withNotes
    withAnim = $withAnim
    title1 = $title1.Trim()
  }
} catch {
  $failed = $true
  $resultObj = [ordered]@{
    status = "FAIL"
    file = $fullPath
    error = ($_.Exception.Message -replace '[\r\n]', ' ')
  }
} finally {
  if ($pres) {
    try { Invoke-ComWithRetry { $pres.Close() } "Close presentation" | Out-Null } catch {}
    Safe-ReleaseComObject $pres
  }
  if ($pp) {
    try { Invoke-ComWithRetry { $pp.Quit() } "Quit PowerPoint" | Out-Null } catch {}
    Safe-ReleaseComObject $pp
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  # Only terminate the PowerPoint PID launched by this invocation
  foreach ($id in $mine) {
    Get-Process -Id $id -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  }
}

$json = ConvertTo-Json -InputObject $resultObj -Compress
Write-Output $json
if ($failed) { exit 1 }
