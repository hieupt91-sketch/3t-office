param(
  [Parameter(Mandatory=$true)][string]$File,
  [string]$OwnedPidFile,
  [int]$CapRows = 400,
  [int]$CapCols = 50
)
# Oracle Excel an (hidden COM) cho parity gate W2.
# - Doc tung file, dump gia tri (Value2), cong thuc (.Formula), dinh dang so
#   (.NumberFormat) cua UsedRange, cap tai capRows x capCols (truncated=1 neu vuot).
# - Xuat JSON mot dong ra stdout; python ghi cua file dump vao thu muc out rieng.
# - Ap dung co che tu scripts/layout-audit/_excel_open_test.ps1:
#   + Khong tra ve doi tuong COM qua ham de tranh PowerShell giai boc (unwrapping) ve $null
#   + Cho den khi Worksheets.Count > 0 truoc khi doc sheet (tranh RPC_E_CALL_REJECTED / 0x800AC472)
#   + Retry transient RPC_E_CALL_REJECTED (-2147418111 / 0x80010001)
#   + Chi kill PID cua minh ghi trong OwnedPidFile khi timeout
$ErrorActionPreference = "Stop"
$File = [System.IO.Path]::GetFullPath($File)
if (-not $OwnedPidFile) {
  $OwnedPidFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "vno_parity_ex_" + [guid]::NewGuid().ToString("N") + ".pid")
}
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoParityExcelWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

$ci = [System.Globalization.CultureInfo]::InvariantCulture
$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$excel = $null
$wb = $null
$ownedPid = 0

try {
  # Khoi tao Excel application voi retry
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try {
      $excel = New-Object -ComObject Excel.Application
      break
    } catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
        throw ("Create Excel: {0}" -f $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $excel) { throw "Create Excel returned no application object." }

  # Lay Hwnd va xac dinh PID do tien trinh nay so huu
  $handle = [IntPtr]0
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try {
      $handle = [IntPtr][int]$excel.Hwnd
      break
    } catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
        throw ("Read Excel Hwnd: {0}" -f $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 500
    }
  }

  $owner = [uint32]0
  [void][VnoParityExcelWindow]::GetWindowThreadProcessId($handle, [ref]$owner)
  $ownedPid = [int]$owner
  if ($ownedPid -le 0 -or $before -contains $ownedPid) {
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
      $created = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id })
      if ($created.Count -ge 1) { $ownedPid = [int]($created[0].Id); break }
      Start-Sleep -Milliseconds 100
    }
  }
  [System.IO.File]::WriteAllText($OwnedPidFile, [string]$ownedPid)

  # Dat Visible=false va DisplayAlerts=false voi retry
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try {
      if ($excel.Visible) { $excel.Visible = $false }
      $excel.DisplayAlerts = $false
      break
    } catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
        throw ("Set Visible/DisplayAlerts: {0}" -f $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 500
    }
  }

  # Mo Workbook voi retry
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try {
      $wb = $excel.Workbooks.Open($File, 0, $true)
      break
    } catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
        throw ("Open {0}: {1}" -f (Split-Path $File -Leaf), $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $wb) { throw ("Open {0} returned no workbook object." -f (Split-Path $File -Leaf)) }

  # Cho Worksheets.Count > 0 (giong _excel_open_test.ps1)
  $sheetCount = 0
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try {
      $sheetCount = [int]$wb.Worksheets.Count
    } catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
        throw ("Read sheet count: {0}" -f $_.Exception.Message)
      }
    }
    if ($sheetCount -gt 0) { break }
    if ($attempt -ge 20) { throw "Read sheet count returned $sheetCount." }
    Start-Sleep -Milliseconds 500
  }

  $rows = [System.Collections.Generic.List[object]]::new()
  $sheetUsed = [System.Collections.Generic.List[object]]::new()
  $truncated = $false
  $cellTotal = 0

  for ($sheetIndex = 1; $sheetIndex -le $sheetCount; $sheetIndex++) {
    $ws = $null
    for ($attempt = 0; $attempt -le 20; $attempt++) {
      try {
        $ws = $wb.Worksheets.Item($sheetIndex)
        if ($ws) { break }
      } catch {
        if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
          throw ("Get sheet {0}: {1}" -f $sheetIndex, $_.Exception.Message)
        }
        Start-Sleep -Milliseconds 500
      }
    }
    if (-not $ws) { continue }

    $ur = $null
    $urRows = 0
    $urCols = 0
    for ($attempt = 0; $attempt -le 20; $attempt++) {
      try {
        $ur = $ws.UsedRange
        $urRows = [int]$ur.Rows.Count
        $urCols = [int]$ur.Columns.Count
        break
      } catch {
        if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
          throw ("UsedRange sheet {0}: {1}" -f $sheetIndex, $_.Exception.Message)
        }
        Start-Sleep -Milliseconds 500
      }
    }

    $dumpRows = [Math]::Min($urRows, $CapRows)
    $dumpCols = [Math]::Min($urCols, $CapCols)

    if ($urRows -gt 0 -and $urCols -gt 0 -and $dumpRows -gt 0 -and $dumpCols -gt 0) {
      $vals = $null
      $forms = $null
      $fmts = $null
      for ($attempt = 0; $attempt -le 20; $attempt++) {
        try {
          $vals = $ur.Value2
          $forms = $ur.Formula
          $fmts = $ur.NumberFormat
          break
        } catch {
          if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
            throw ("Dump values sheet {0}: {1}" -f $sheetIndex, $_.Exception.Message)
          }
          Start-Sleep -Milliseconds 500
        }
      }

      $is2DVal = ($vals -is [System.Array]) -and ($vals.Rank -eq 2)
      $is2DForm = ($forms -is [System.Array]) -and ($forms.Rank -eq 2)
      $is2DFmt = ($fmts -is [System.Array]) -and ($fmts.Rank -eq 2)

      for ($r = 1; $r -le $dumpRows; $r++) {
        for ($c = 1; $c -le $dumpCols; $c++) {
          $v = if ($is2DVal) { $vals[$r, $c] } else { $vals }
          $f = if ($is2DForm) { $forms[$r, $c] } else { $forms }
          $m = if ($is2DFmt) { $fmts[$r, $c] } else { $fmts }

          $vt = "s"
          if ($v -is [bool]) { $vt = "b"; $vs = "1" }
          elseif ($v -is [double] -or $v -is [int] -or $v -is [long] -or $v -is [float]) { $vt = "d"; $vs = [Convert]::ToString($v, $ci) }
          elseif ($null -eq $v) { $vt = "n"; $vs = "" }
          else { $vt = "s"; $vs = [Convert]::ToString($v) }

          if ($null -eq $f) { $fs = "" } else { $fs = [Convert]::ToString($f) }

          if ($null -eq $m) { $ms = "" }
          elseif ($m -is [double] -or $m -is [int]) { $ms = [Convert]::ToString($m, $ci) }
          else { $ms = [Convert]::ToString($m) }

          $rows.Add(@($sheetIndex, $r, $c, $vt, $vs, $fs, $ms))
          $cellTotal++
        }
      }
    }

    if ($urRows -gt $CapRows -or $urCols -gt $CapCols) { $truncated = $true }
    $sheetUsed.Add(@($urRows, $urCols))

    try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($ws) } catch {}
  }

  if ($wb) {
    for ($attempt = 0; $attempt -le 20; $attempt++) {
      try { $wb.Close($false); break }
      catch {
        if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { break }
        Start-Sleep -Milliseconds 500
      }
    }
  }

  @{ status = "PASS"; sheets = $sheetCount; cells = $cellTotal; capRows = $CapRows; capCols = $CapCols;
     truncated = $truncated; sheetUsed = $sheetUsed; dump = $rows } |
    ConvertTo-Json -Compress -Depth 8 | Write-Output

} catch {
  @{ status = "FAIL"; error = $_.Exception.Message; pidFile = $OwnedPidFile } | ConvertTo-Json -Compress -Depth 4 | Write-Output
} finally {
  if ($wb) {
    try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($wb) } catch {}
  }
  if ($excel) {
    for ($attempt = 0; $attempt -le 20; $attempt++) {
      try { $excel.Quit(); break }
      catch {
        if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { break }
        Start-Sleep -Milliseconds 500
      }
    }
    try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel) } catch {}
  }
  [System.GC]::Collect() | Out-Null
  [System.GC]::WaitForPendingFinalizers() | Out-Null
  [System.GC]::Collect() | Out-Null
}
