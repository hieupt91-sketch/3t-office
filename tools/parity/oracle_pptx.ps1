param(
  [Parameter(Mandatory=$true)][string]$File,
  [string]$OwnedPidFile
)
# Oracle PowerPoint an (hidden COM) cho parity gate W2.
# - Tong so slide, tong so shape, so hinh (msoPicture), so chart, so khung co chu;
#   tung slide: co tieu de khong, co ghi chu khong; hash SHA-256 cua ghi chu ghep lai.
# - Kill chi PID cua minh (compare.py do pidFile neu timeout).
$ErrorActionPreference = "Stop"
$File = [System.IO.Path]::GetFullPath($File)
if (-not $OwnedPidFile) {
  $OwnedPidFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "vno_parity_pp_" + [guid]::NewGuid().ToString("N") + ".pid")
}
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoParityPowerPointWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

function Invoke-ComWithRetry([scriptblock]$Action, [string]$Operation, [int]$Retries = 20, [int]$RetryDelayMilliseconds = 500) {
  for ($attempt = 0; $attempt -le $Retries; $attempt++) {
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

$before = @(Get-Process -Name POWERPNT -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$pp = $null
try {
  $pp = Invoke-ComWithRetry { New-Object -ComObject PowerPoint.Application } "Create PowerPoint"
  $handle = [IntPtr](Invoke-ComWithRetry { $pp.HWND } "Read PPT Hwnd")
  $owner = [uint32]0
  [void][VnoParityPowerPointWindow]::GetWindowThreadProcessId($handle, [ref]$owner)
  $ownedPid = [int]$owner
  if ($ownedPid -le 0 -or $before -contains $ownedPid) {
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
      $created = @(Get-Process -Name POWERPNT -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id })
      if ($created.Count -ge 1) { $ownedPid = [int]($created[0].Id); break }
      Start-Sleep -Milliseconds 100
    }
  }
  [System.IO.File]::WriteAllText($OwnedPidFile, [string]$ownedPid)
  $pres = Invoke-ComWithRetry { $pp.Presentations.Open($File, $true, $false, $false) } "Open presentation"
  $slides = [int](Invoke-ComWithRetry { $pres.Slides.Count } "Slides count")
  $shapesTotal = 0
  $pictures = 0
  $charts = 0
  $textHidden = 0
  $withTitle = 0
  $withNotes = 0
  $notesBuilder = ""
  for ($i = 1; $i -le $slides; $i++) {
    $slide = Invoke-ComWithRetry { $pres.Slides.Item($i) } "Slide $i"
    $shapes = Invoke-ComWithRetry { $slide.Shapes } "Shapes $i"
    $n = [int](Invoke-ComWithRetry { $shapes.Count } "Shapes count $i")
    $shapesTotal += $n
    if ($n -gt 0) {
      for ($k = 1; $k -le $n; $k++) {
        try {
          $sh = Invoke-ComWithRetry { $shapes.Item($k) } "Shape $i.$k"
          $tp = [int](Invoke-ComWithRetry { $sh.Type } "Shape type")
          if ($tp -eq 13) { $pictures++ }
          if ($tp -eq 3) { $charts++ }
          $hasTf = [bool](Invoke-ComWithRetry { $sh.HasTextFrame -ne 0 } "HasTextFrame")
          if ($hasTf) { $textHidden++ }
          Invoke-ComWithRetry { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sh) } "Release shape" | Out-Null
        } catch { continue }
      }
    }
    # Tieu de: slide de co khung tieu de co chu
    $titleLen = 0
    try {
      $titleLen = [int](Invoke-ComWithRetry { $slide.Shapes.Title.TextFrame.TextRange.Text.Length } "Title len $i" 4 200)
    } catch {}
    if ($titleLen -gt 0) { $withTitle++ }
    # Ghi chu (tai shapes.Placeholders(2) cua trang GhiChu)
    try {
      $notesPage = Invoke-ComWithRetry { $slide.NotesPage } "NotesPage $i"
      $ph = Invoke-ComWithRetry { $notesPage.Shapes.Placeholders.Item(2) } "Notes placeholder $i"
      $nt = Invoke-ComWithRetry { $ph.TextFrame.TextRange.Text } "Notes text $i"
      $notesBuilder += [Convert]::ToString($nt)
      if ($nt -ne $null -and [Convert]::ToString($nt).Length -gt 0) { $withNotes++ }
      Invoke-ComWithRetry { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($ph) } "Release notes ph" | Out-Null
      Invoke-ComWithRetry { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($notesPage) } "Release notespage" | Out-Null
    } catch {}
    Invoke-ComWithRetry { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($slide) } "Release slide" | Out-Null
  }
  Invoke-ComWithRetry { $pres.Close() } "Close presentation" | Out-Null
  $sha = ""
  $bytes = [System.Text.Encoding]::Unicode.GetBytes($notesBuilder)
  if ($bytes.Length -gt 0) {
    $hasher = [System.Security.Cryptography.SHA256CryptoServiceProvider]::new()
    $sha = [BitConverter]::ToString($hasher.ComputeHash($bytes)).Replace("-", "").ToLowerInvariant()
  }
  @{ status = "PASS"; slides = $slides; shapesTotal = $shapesTotal; pictures = $pictures; charts = $charts;
     textShapes = $textHidden; withTitle = $withTitle; withNotes = $withNotes;
     notesTextSha256 = $sha } | ConvertTo-Json -Compress -Depth 4 | Write-Output
} catch {
  @{ status = "FAIL"; error = $_.Exception.Message; pidFile = $OwnedPidFile } | ConvertTo-Json -Compress -Depth 4 | Write-Output
} finally {
  if ($pp) {
    try { Invoke-ComWithRetry { $pp.Quit() } "Quit PowerPoint" 2>$null | Out-Null } catch {}
    try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($pp) } catch {}
  }
  [System.GC]::Collect() | Out-Null
  [System.GC]::WaitForPendingFinalizers() | Out-Null
  [System.GC]::Collect() | Out-Null
}
