param([string[]]$Files)
# Opens files sequentially in one hidden Excel COM instance. Never touches other Excel processes.
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

$xl = $null
try {
  $xl = Invoke-ComWithRetry 'Create Excel' { New-Object -ComObject Excel.Application }
  Invoke-ComWithRetry 'Hide Excel' { $xl.Visible = $false }
  Invoke-ComWithRetry 'Disable Excel alerts' { $xl.DisplayAlerts = $false }
  foreach ($f in $Files) {
    $name = Split-Path $f -Leaf
    $wb = $null
    try {
      $wb = Invoke-ComWithRetry "Open $name" { $xl.Workbooks.Open($f, 0, $true) }
      $sheets = Invoke-ComWithRetry "Count sheets in $name" { [int]$wb.Worksheets.Count }
      "$name OK sheets=$sheets"
    } catch {
      "$name FAIL " + ($_.Exception.Message -replace "`r|`n", " ")
    } finally {
      if ($wb) { try { Invoke-ComWithRetry "Close $name" { $wb.Close($false) } | Out-Null } catch {} }
      if ($wb) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb) }
    }
  }
} finally {
  if ($xl) {
    try { Invoke-ComWithRetry 'Quit Excel' { $xl.Quit() } | Out-Null } catch {}
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
  }
}
