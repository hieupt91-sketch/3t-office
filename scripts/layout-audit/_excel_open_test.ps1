param([string[]]$Files, [string]$ExcelPidFile)
# Opens each file in one hidden Excel instance and prints "OK sheets=N" or "FAIL <msg>" per file.
# Never terminate an existing Excel process: this probe owns only the COM instance it creates.
$existingExcelIds = @(Get-Process EXCEL -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
$ownedExcelId = 0
$excel = $null
$workbooks = $null

if (-not ('VnoExcelWindowProcess' -as [type])) {
  Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class VnoExcelWindowProcess {
  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
}
'@
}

try {
  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbooks = $excel.Workbooks

  try {
    $window = [IntPtr]([long]$excel.Hwnd)
    [uint32]$excelProcessId = 0
    [void][VnoExcelWindowProcess]::GetWindowThreadProcessId($window, [ref]$excelProcessId)
    if ($excelProcessId -gt 0 -and $existingExcelIds -notcontains [int]$excelProcessId) {
      $ownedExcelId = [int]$excelProcessId
      if ($ExcelPidFile) {
        Set-Content -LiteralPath $ExcelPidFile -Value $ownedExcelId -Encoding ascii -NoNewline
      }
    }
  } catch {
    # Excel.Quit() below still closes the created automation object if PID lookup is unavailable.
  }

  foreach ($file in $Files) {
    $name = Split-Path $file -Leaf
    $workbook = $null
    $sheets = $null
    try {
      $workbook = $workbooks.Open($file, $false, $true)
      if ($null -eq $workbook) { throw 'Excel returned no workbook.' }
      $sheets = $workbook.Worksheets
      "$name OK sheets=$($sheets.Count)"
    } catch {
      "$name FAIL $(($_.Exception.Message) -replace "`r|`n", ' ')"
    } finally {
      if ($workbook) {
        try { $workbook.Close($false) } catch {}
      }
      if ($sheets -and [Runtime.InteropServices.Marshal]::IsComObject($sheets)) {
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sheets)
      }
      if ($workbook -and [Runtime.InteropServices.Marshal]::IsComObject($workbook)) {
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
      }
    }
  }
} finally {
  if ($workbooks -and [Runtime.InteropServices.Marshal]::IsComObject($workbooks)) {
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbooks)
  }
  if ($excel) {
    try { $excel.Quit() } catch {}
    if ([Runtime.InteropServices.Marshal]::IsComObject($excel)) {
      [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
    }
  }

  if ($ownedExcelId -gt 0) {
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
      $owned = Get-Process -Id $ownedExcelId -ErrorAction SilentlyContinue
      if (-not $owned) { break }
      if ($owned.MainWindowHandle -ne 0) { break }
      Start-Sleep -Milliseconds 250
    }
    $owned = Get-Process -Id $ownedExcelId -ErrorAction SilentlyContinue
    if ($owned -and $owned.MainWindowHandle -eq 0) {
      Stop-Process -Id $ownedExcelId -Force -ErrorAction SilentlyContinue
    }
  }
  if ($ExcelPidFile -and (Test-Path -LiteralPath $ExcelPidFile)) {
    Remove-Item -LiteralPath $ExcelPidFile -Force -ErrorAction SilentlyContinue
  }
}
