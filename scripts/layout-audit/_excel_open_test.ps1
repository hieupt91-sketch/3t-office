param([string[]]$Files)
# Opens each file in ONE Excel instance and prints "OK sheets=N" or "FAIL <msg>" per file.
$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$xl = $null
$ownedProcessId = $null
$ownedWorkbooks = @()
try {
  $xl = New-Object -ComObject Excel.Application
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoExcelAuditWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

  $windowOwner = [uint32]0
  if ($xl.Hwnd) {
    [void][VnoExcelAuditWindow]::GetWindowThreadProcessId([IntPtr]$xl.Hwnd, [ref]$windowOwner)
  }
  if ($windowOwner -gt 0 -and $before -notcontains [int]$windowOwner) {
    $ownedProcessId = [int]$windowOwner
  } else {
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
      $created = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id })
      if ($created.Count -eq 1) { $ownedProcessId = [int]$created[0].Id; break }
      Start-Sleep -Milliseconds 100
    }
  }

  if (-not $ownedProcessId -or $before -contains [int]$ownedProcessId) {
    foreach ($f in $Files) {
      $name = Split-Path $f -Leaf
      "$name FAIL Excel COM did not create an isolated process; existing Excel was left untouched"
    }
    return
  }

  $xl.DisplayAlerts = $false
  $xl.Visible = $false
  foreach ($f in $Files) {
    $name = Split-Path $f -Leaf
    $wb = $null
    try {
      $wb = $xl.Workbooks.Open($f, $false, $true)
      $ownedWorkbooks += $wb
      "$name OK sheets=" + $wb.Worksheets.Count
      $wb.Close($false)
      [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb)
      $ownedWorkbooks = @($ownedWorkbooks | Where-Object { $_ -ne $wb })
      $wb = $null
    } catch {
      "$name FAIL " + ($_.Exception.Message -replace "`r|`n", " ")
      if ($wb) {
        try { $wb.Close($false) } catch {}
        [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb)
        $ownedWorkbooks = @($ownedWorkbooks | Where-Object { $_ -ne $wb })
      }
    }
  }
} catch {
  "FAIL Excel COM: " + ($_.Exception.Message -replace "`r|`n", " ")
} finally {
  foreach ($wb in $ownedWorkbooks) {
    try { $wb.Close($false) } catch {}
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($wb)
  }
  if ($xl -and $ownedProcessId) {
    try { $xl.Quit() } catch {}
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
  } elseif ($xl) {
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
  }
}
