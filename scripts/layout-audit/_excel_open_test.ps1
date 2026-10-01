param([string[]]$Files)
# Opens each workbook sequentially in a hidden Excel COM instance. No UI
# Automation is used; transient RPC_E_CALL_REJECTED calls are retried.

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
          $sheetCount = [int]$wb.Worksheets.Count
          if ($sheetCount -gt 0) { break }
          try { $wb.Close($false) } catch {}
          [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb)
          $wb = $null
          if ($attempt -ge 7) { throw "Excel opened the workbook but returned zero worksheets." }
          Start-Sleep -Milliseconds 250
        } catch {
          $hresult = $_.Exception.HResult
          if (($hresult -eq -2147418111 -or $_.Exception.Message -match "RPC_E_CALL_REJECTED") -and $attempt -lt 7) {
            Start-Sleep -Milliseconds 250
            continue
          }
          throw
        }
      }
      "$name OK sheets=$sheetCount"
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
