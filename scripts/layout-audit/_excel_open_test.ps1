param([string[]]$Files)
# Opens each workbook sequentially in one owned Excel COM instance. Never kills
# unrelated Excel sessions; transient RPC_E_CALL_REJECTED calls are retried.
$xl = $null
try {
  $xl = New-Object -ComObject Excel.Application
  $xl.DisplayAlerts = $false
  $xl.Visible = $false
  $xl.AskToUpdateLinks = $false

  foreach ($f in $Files) {
    $name = Split-Path $f -Leaf
    $wb = $null
    try {
      $attempt = 0
      while ($true) {
        $attempt++
        try {
          $wb = $xl.Workbooks.Open($f, 0, $true)
          break
        } catch {
          $hresult = $_.Exception.HResult
          if (($hresult -eq -2147418111 -or $_.Exception.Message -match "RPC_E_CALL_REJECTED") -and $attempt -lt 7) {
            Start-Sleep -Milliseconds 250
            continue
          }
          throw
        }
      }
      "$name OK sheets=$($wb.Worksheets.Count)"
    } catch {
      "$name FAIL " + ($_.Exception.Message -replace "`r|`n", " ")
    } finally {
      if ($wb) {
        try { $wb.Close($false) } catch {}
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb)
      }
    }
  }
} finally {
  if ($xl) {
    try { $xl.Quit() } catch {}
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
  }
}
