param([Parameter(Mandatory=$true)][string]$File, [int]$Retries = 20, [int]$RetryDelayMilliseconds = 500)
$ErrorActionPreference = "Stop"

function Invoke-ComWithRetry([scriptblock]$Action, [string]$Operation, [int]$TransientRetries = 0, [int[]]$TransientHResults = @()) {
  for ($attempt = 0; ; $attempt++) {
    try { return (& $Action) }
    catch {
      $hr = $_.Exception.HResult
      $retryLimit = if ($hr -eq -2147418111) { $Retries } elseif ($TransientHResults -contains $hr) { $TransientRetries } else { -1 }
      if ($retryLimit -lt 0 -or $attempt -ge $retryLimit) {
        throw ("{0}: {1}" -f $Operation, $_.Exception.Message)
      }
      Start-Sleep -Milliseconds $RetryDelayMilliseconds
    }
  }
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoPowerPointAuditWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

$before = @(Get-Process -Name POWERPNT -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$powerpoint = $null
$presentation = $null
$ownsProcess = $false
$ownedPid = 0
$pdf = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "vno_ppt_oracle_" + [guid]::NewGuid().ToString("N") + ".pdf")
$failed = $false
try {
  $powerpoint = Invoke-ComWithRetry { New-Object -ComObject PowerPoint.Application } "Create PowerPoint"
  $handle = [IntPtr](Invoke-ComWithRetry { [int]$powerpoint.HWND } "Read PowerPoint window")
  $owner = [uint32]0
  [void][VnoPowerPointAuditWindow]::GetWindowThreadProcessId($handle, [ref]$owner)
  $ownedPid = [int]$owner
  $ownsProcess = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $ownsProcess) {
    throw "PowerPoint did not start a private process; existing PowerPoint instances were left untouched."
  }
  Invoke-ComWithRetry { $powerpoint.DisplayAlerts = 1 } "Configure PowerPoint alerts" | Out-Null
  $fullPath = (Resolve-Path -LiteralPath $File).Path
  $presentation = Invoke-ComWithRetry { $powerpoint.Presentations.Open($fullPath, -1, 0, 0) } "Open presentation"
  $slideCount = [int](Invoke-ComWithRetry { $presentation.Slides.Count } "Read slide count")
  Invoke-ComWithRetry { $presentation.SaveAs($pdf, 32) } "Export presentation PDF" 2 @(-2147467259) | Out-Null
  $bytes = [System.IO.File]::ReadAllBytes($pdf)
  $text = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
  $pageCount = ([regex]::Matches($text, "/Type\s*/Page\b")).Count
  if ($pageCount -lt 1) { throw "PowerPoint created a PDF with no page objects." }
  "OK pages=$pageCount slides=$slideCount"
} catch {
  $failed = $true
  "FAIL " + ($_.Exception.Message -replace '[\r\n]', ' ')
} finally {
  if ($presentation) {
    try { Invoke-ComWithRetry { $presentation.Close() } "Close presentation" | Out-Null } catch { $failed = $true }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
  }
  if ($powerpoint) {
    if ($ownsProcess) {
      try { Invoke-ComWithRetry { $powerpoint.Quit() } "Quit PowerPoint" | Out-Null }
      catch { "WARN PowerPoint quit failed for owned PID $ownedPid; no other process was stopped." }
    }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($powerpoint)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  if (Test-Path -LiteralPath $pdf) { Remove-Item -LiteralPath $pdf -Force -ErrorAction SilentlyContinue }
}
if ($failed) { exit 1 }
