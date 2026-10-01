param([string[]]$Files)
# Opens files sequentially in one hidden Word COM instance. Never touches other Word processes.
$ErrorActionPreference = 'Stop'

function Invoke-ComWithRetry([string]$Operation, [scriptblock]$Action) {
  $delays = @(250, 500, 1000, 2000, 4000)
  for ($attempt = 0; $attempt -le $delays.Count; $attempt++) {
    try { return (& $Action) }
    catch {
      $hr = [int]$_.Exception.HResult
      $busy = ($hr -eq -2147418111) -or ($hr -eq -2147417846) -or
        ([string]$_.Exception.Message -match '(?i)RPC_E_CALL_REJECTED|rejected by callee|server busy|application is busy')
      if (-not $busy -or $attempt -ge $delays.Count) { throw "${Operation}: $($_.Exception.Message)" }
      Start-Sleep -Milliseconds $delays[$attempt]
    }
  }
}

$word = $null
try {
  $word = Invoke-ComWithRetry 'Create Word' { New-Object -ComObject Word.Application }
  Invoke-ComWithRetry 'Hide Word' { $word.Visible = $false }
  Invoke-ComWithRetry 'Disable Word alerts' { $word.DisplayAlerts = 0 }
  foreach ($f in $Files) {
    $name = Split-Path $f -Leaf
    $doc = $null
    try {
      $doc = Invoke-ComWithRetry "Open $name" { $word.Documents.Open($f, $false, $true, $false) }
      Invoke-ComWithRetry "Repaginate $name" { $doc.Repaginate() } | Out-Null
      $pages = Invoke-ComWithRetry "Read pages in $name" { [int]$doc.Content.Information(4) }
      "$name OK pages=$pages"
    } catch {
      "$name FAIL " + ($_.Exception.Message -replace "`r|`n", " ")
    } finally {
      if ($doc) { try { Invoke-ComWithRetry "Close $name" { $doc.Close(0) } | Out-Null } catch {} }
      if ($doc) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) }
    }
  }
} finally {
  if ($word) {
    try { Invoke-ComWithRetry 'Quit Word' { $word.Quit() } | Out-Null } catch {}
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
  }
}
