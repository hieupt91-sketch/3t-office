param([string]$File)
# Word 2016 page-count oracle. Exports the document to PDF (real print layout) and counts
# /Type /Page objects. ComputeStatistics(wdStatisticPages) is NOT used: in a hidden COM
# window it returned 12 for a 5-page contract and 88 for a 44-page manual (2026-09-14).
$job = Start-Job -ScriptBlock {
  param($f)
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false; $word.DisplayAlerts = 0
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
  finally { $word.Quit(); if (Test-Path $pdf) { Remove-Item $pdf -Force -ErrorAction SilentlyContinue } }
} -ArgumentList $File
if (Wait-Job $job -Timeout 240) { Receive-Job $job } else { "FAIL (timeout - Word blocked by modal error dialog)"; Stop-Job $job; Get-Process WINWORD -ErrorAction SilentlyContinue | Stop-Process -Force }
Remove-Job $job -Force -ErrorAction SilentlyContinue
