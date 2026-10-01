param([string[]]$Files)
# Own one hidden COM instance. Never terminate another user's Excel process.
$ErrorActionPreference = 'Stop'
$xl = $null
try {
  $xl = New-Object -ComObject Excel.Application
  $xl.DisplayAlerts = $false
  $xl.Visible = $false
  foreach ($f in $Files) {
    $wb = $null
    $name = Split-Path $f -Leaf
    try {
      $wb = $xl.Workbooks.Open($f, $false, $true)
      "$name OK sheets=" + $wb.Worksheets.Count
    } catch {
      "$name FAIL " + ($_.Exception.Message -replace "`r|`n", " ")
    } finally {
      if ($wb) {
        $wb.Close($false)
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($wb)
      }
    }
  }
} finally {
  if ($xl) {
    $xl.Quit()
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($xl)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
