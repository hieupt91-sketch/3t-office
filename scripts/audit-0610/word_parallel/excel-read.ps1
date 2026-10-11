param([string[]]$Files)
$cellMap=@{ bold="B2"; italic="B2"; underline="B2"; size16="B2"; fontArial="B2"; fillDefault="B2"; textColorDefault="B2"; alignCenter="B2"; alignRight="B2"; wrap="B2"; numNumber="C2"; numCurrency="C2"; numAccounting="C2"; numPercent="D2"; numDate="E2"; decInc="C2"; decDec="C2"; standard="C2"; percentBtn="D2"; bordersDefault="B2"; indentIncrease="B2"; mergeCenter="A8"; autoSum="C7"; fillDown="B3"; sortAsc="B2"; filter="B1"; formulaSum="H2"; formulaAverage="H3"; formulaCount="H4"; formulaIf="H5"; formulaVlookup="H6"; formulaIndexMatch="H7"; formulaConcat="H8"; formulaText="H9"; formulaDate="H10"; insertRow="A3"; deleteRow="A3"; insertCol="B2"; deleteCol="B2"; conditional="C2"; formatAsTable="A1"; cellGood="B2" }
$ErrorActionPreference = "Stop"

function Invoke-ComWithRetry([scriptblock]$Action, [string]$Operation, [int]$Retries = 20) {
  for ($attempt = 0; $attempt -le $Retries; $attempt++) {
    try { return (& $Action) }
    catch {
      $hr = $_.Exception.HResult
      if ($hr -ne -2147418111 -or $attempt -ge $Retries) {
        throw ("{0}: {1}" -f $Operation, $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 500
    }
  }
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoExcelAuditWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$excel = $null
$owned = $false
$ownedPid = 0
$failed = $false
try {
  # Keep the Application COM object in this scope too. Returning Office COM
  # automation objects through a PowerShell function can enumerate/coerce them.
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
  $handle = [IntPtr](Invoke-ComWithRetry { [int]$excel.Hwnd } "Read Excel window")
  $owner = [uint32]0
  [void][VnoExcelAuditWindow]::GetWindowThreadProcessId($handle, [ref]$owner)
  $ownedPid = [int]$owner
  $owned = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $owned) {
    throw "Excel did not start a private process; existing Excel instances were left untouched."
  }

  if ($excel.Visible) {
    Invoke-ComWithRetry { $excel.Visible = $false } "Hide Excel" | Out-Null
  }
  Invoke-ComWithRetry { $excel.DisplayAlerts = $false } "Disable Excel alerts" | Out-Null
  foreach ($file in $Files) {
    $workbook = $null
    $name = Split-Path $file -Leaf
    try {
      # Do not return a Workbook COM object through Invoke-ComWithRetry:
      # PowerShell enumerates that automation object at the function boundary
      # and can turn it into $null. Open in this scope and retry only transient
      # RPC_E_CALL_REJECTED responses.
      for ($attempt = 0; $attempt -le 20; $attempt++) {
        try {
          $workbook = $excel.Workbooks.Open($file, 0, $true)
          break
        } catch {
          if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
            throw ("Open {0}: {1}" -f $name, $_.Exception.Message)
          }
          Start-Sleep -Milliseconds 500
        }
      }
      if (-not $workbook) { throw "Open $name returned no workbook object." }
      $count = 0
      for ($attempt = 0; $attempt -le 20; $attempt++) {
        try {
          $count = [int]$workbook.Worksheets.Count
        } catch {
          if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
            throw ("Read {0} sheet count: {1}" -f $name, $_.Exception.Message)
          }
        }
        if ($count -gt 0) { break }
        if ($attempt -ge 20) { throw "Read $name sheet count returned $count." }
        Start-Sleep -Milliseconds 500
      }
      $opn=([IO.Path]::GetFileNameWithoutExtension($file) -replace "^app_",""); $ws=$workbook.Worksheets.Item(1); $cc=$ws.Range($cellMap[$opn]); $columnWidth=$ws.Columns.Item($cc.Column).ColumnWidth; $sortValues=if($opn -eq "sortAsc"){@(2..6 | ForEach-Object { [string]$ws.Range("B$_").Value2 }) -join " / "}else{""}; $neighborCell=switch($opn){ "insertRow" {"A4"} "deleteRow" {"A3"} "insertCol" {"C2"} "deleteCol" {"B2"} default {""} }; $neighborValue=if($neighborCell){$ws.Range($neighborCell).Value2}else{""}; "{0,-17} {1} | Text='{2}' | Value2='{3}' | Formula='{4}' | Neighbor({5})='{6}' | Fmt='{7}' | B={8} I={9} U={10} Size={11} Font={12} Color={13} Fill={14} HAl={15} Wrap={16} Indent={17} Orient={18} Merge={19} ColWidth={20} Filter={21} Sort(B2:B6)='{22}' Brd(B/T/L/R)={23}/{24}/{25}/{26}" -f $opn,$cellMap[$opn],$cc.Text,$cc.Value2,$cc.Formula,$neighborCell,$neighborValue,$cc.NumberFormat,[int]$cc.Font.Bold,[int]$cc.Font.Italic,[int]$cc.Font.Underline,$cc.Font.Size,$cc.Font.Name,[int]$cc.Font.Color,[int]$cc.Interior.Color,[int]$cc.HorizontalAlignment,[int]$cc.WrapText,[int]$cc.IndentLevel,[int]$cc.Orientation,[int]$cc.MergeCells,$columnWidth,[int]$ws.AutoFilterMode,$sortValues,[int]$cc.Borders.Item(9).LineStyle,[int]$cc.Borders.Item(8).LineStyle,[int]$cc.Borders.Item(7).LineStyle,[int]$cc.Borders.Item(10).LineStyle
      $cfCount=0; $cfFormula=""; $cfType=""; $cfOperator=""; $cfColor=""; try{$cfCount=[int]$ws.Range("C2:C6").FormatConditions.Count; if($cfCount){$cf=$ws.Range("C2:C6").FormatConditions.Item(1);$cfFormula=[string]$cf.Formula1;$cfType=[string]$cf.Type;$cfOperator=[string]$cf.Operator;$cfColor=[string]$cf.Interior.Color}}catch{}; $tableCount=[int]$ws.ListObjects.Count; "  Excel ColumnWidth A:C = {0} / {1} / {2} | CF(C2:C6)={3} type={4} op={5} formula={6} color={7} | Tables={8} A1Fill={9} B2Fill={10}" -f [double]$ws.Columns.Item(1).ColumnWidth,[double]$ws.Columns.Item(2).ColumnWidth,[double]$ws.Columns.Item(3).ColumnWidth,$cfCount,$cfType,$cfOperator,$cfFormula,$cfColor,$tableCount,[int]$ws.Range("A1").Interior.Color,[int]$ws.Range("B2").Interior.Color
    } catch {
      $failed = $true
      "$name FAIL " + ($_.Exception.Message -replace '[\r\n]', ' ')
    } finally {
      if ($workbook) {
        try { Invoke-ComWithRetry { $workbook.Close($false) } "Close $name" | Out-Null }
        catch {
          $failed = $true
          "$name FAIL " + ($_.Exception.Message -replace '[\r\n]', ' ')
        }
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
      }
    }
  }
} catch {
  $failed = $true
  "BLOCKED " + ($_.Exception.Message -replace '[\r\n]', ' ')
} finally {
  if ($excel) {
    if ($owned) {
      try { Invoke-ComWithRetry { $excel.Quit() } "Quit Excel" | Out-Null }
      catch { "WARN Excel quit failed for owned PID $ownedPid; no other process was stopped." }
    }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  if ($owned -and $ownedPid -gt 0) {
    $leftover = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
    if ($leftover) {
      Stop-Process -Id $ownedPid -Force
      "CLEANUP stopped owned Excel PID $ownedPid after COM quit did not exit."
    }
  }
}
if ($failed) { exit 1 }
