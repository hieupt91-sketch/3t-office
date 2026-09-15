param([string[]]$Files)
# Opens each file in ONE Excel instance and prints "OK sheets=N" or "FAIL <msg>" per file.
Get-Process EXCEL -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 800
$xl = New-Object -ComObject Excel.Application
$xl.DisplayAlerts = $false
$xl.Visible = $false
foreach ($f in $Files) {
  $name = Split-Path $f -Leaf
  try {
    $wb = $xl.Workbooks.Open($f, $false, $true)
    "$name OK sheets=" + $wb.Worksheets.Count
    $wb.Close($false)
  } catch {
    "$name FAIL " + ($_.Exception.Message -replace "`r|`n", " ")
  }
}
$xl.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
