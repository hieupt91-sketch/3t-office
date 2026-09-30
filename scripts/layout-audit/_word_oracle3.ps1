param([string]$File, [int]$Retries = 20, [int]$RetryDelayMilliseconds = 2500)
# Word PDF page-count oracle. Keep COM automation synchronous so another audit cannot
# overlap this process. Word can reject calls while busy (RPC_E_CALL_REJECTED); wait
# and retry that HRESULT only. ComputeStatistics(wdStatisticPages) is not reliable.
$ErrorActionPreference = 'Stop'
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

$word = $null; $doc = $null
$pdf = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "vno_oracle_" + [guid]::NewGuid().ToString("N") + ".pdf")
try {
  $word = Invoke-ComWithRetry { New-Object -ComObject Word.Application } 'Create Word'
  $word.Visible = $false; $word.DisplayAlerts = 0
  $doc = Invoke-ComWithRetry { $word.Documents.Open($File, $false, $true, $false) } 'Open document'
  Invoke-ComWithRetry { $doc.ExportAsFixedFormat($pdf, 17) } 'Export PDF' | Out-Null
  $doc.Close(0); $doc = $null
  $bytes = [System.IO.File]::ReadAllBytes($pdf)
  $text = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
  $n = ([regex]::Matches($text, "/Type\s*/Page[^s]")).Count
  "OK pages=$n"
} catch { "FAIL " + ($_.Exception.Message -replace "`r|`n"," ") }
finally {
  if ($doc) { try { $doc.Close(0) } catch {} }
  if ($word) { try { $word.Quit() } catch {}; [Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null }
  if (Test-Path $pdf) { Remove-Item $pdf -Force -ErrorAction SilentlyContinue }
}
