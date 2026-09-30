param([string]$File, [string]$OwnedPidFile)
# Word 2016 page-count oracle. Exports the document to PDF (real print layout) and counts
# /Type /Page objects. ComputeStatistics(wdStatisticPages) is NOT used: in a hidden COM
# window it returned 12 for a 5-page contract and 88 for a 44-page manual (2026-09-14).
if (-not $OwnedPidFile) {
  $OwnedPidFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "vno_oracle_" + [guid]::NewGuid().ToString("N") + ".pid")
}
$ownedPidFile = $OwnedPidFile
$job = Start-Job -ScriptBlock {
  param($f, $pidFile)
  $before = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoOracleWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue
  $word = New-Object -ComObject Word.Application
  # Capture this COM run's process using the process list snapshot around activation.
  # If activation reused an existing Word process or the result is ambiguous, do not
  # leave an unsafe PID that a timeout handler could mistake for the user's instance.
  $windowOwner = [uint32]0
  if ($word.Hwnd) {
    [void][VnoOracleWindow]::GetWindowThreadProcessId([IntPtr]$word.Hwnd, [ref]$windowOwner)
  }
  $ownedWordProcessId = if ($windowOwner -gt 0 -and $before -notcontains [int]$windowOwner) { [int]$windowOwner } else { $null }
  if (-not $ownedWordProcessId) {
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
      $created = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id })
      if ($created.Count -eq 1) { $ownedWordProcessId = [int]$created[0].Id; break }
      Start-Sleep -Milliseconds 100
    }
  }
  if (-not $ownedWordProcessId -or $before -contains [int]$ownedWordProcessId) {
    "FAIL could not identify a newly created WINWORD process; left existing Word instances untouched"
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    return
  }
  [System.IO.File]::WriteAllText($pidFile, [string]$ownedWordProcessId)
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $pdf = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "vno_oracle_" + [guid]::NewGuid().ToString("N") + ".pdf")
  try {
    $doc = $word.Documents.Open($f, $false, $true, $false)
    $doc.ExportAsFixedFormat($pdf, 17)   # wdExportFormatPDF
    $doc.Close(0)
    $bytes = [System.IO.File]::ReadAllBytes($pdf)
    $text = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
    $n = ([regex]::Matches($text, "/Type\s*/Page[^s]")).Count
    "OK pages=$n"
  } catch { "FAIL " + ($_.Exception.Message -replace "`r|`n"," ") }
  finally {
    try { $word.Quit() } catch {}
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)
    if (Test-Path $pdf) { Remove-Item $pdf -Force -ErrorAction SilentlyContinue }
  }
} -ArgumentList $File, $ownedPidFile
if (Wait-Job $job -Timeout 240) {
  Receive-Job $job
} else {
  "FAIL (timeout - Word blocked by modal error dialog)"
  Stop-Job $job
  if (Test-Path -LiteralPath $ownedPidFile) {
    $wordProcessId = 0
    [int]::TryParse((Get-Content -LiteralPath $ownedPidFile -Raw), [ref]$wordProcessId) | Out-Null
    $process = if ($wordProcessId -gt 0) { Get-Process -Id $wordProcessId -ErrorAction SilentlyContinue } else { $null }
    if ($process -and $process.ProcessName -eq "WINWORD" -and $process.MainWindowHandle -eq 0) {
      Stop-Process -Id $wordProcessId -Force
    }
  }
}
Remove-Job $job -Force -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $ownedPidFile) { Remove-Item -LiteralPath $ownedPidFile -Force -ErrorAction SilentlyContinue }
