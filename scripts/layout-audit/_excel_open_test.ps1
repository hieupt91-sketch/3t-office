param([string[]]$Files)
# Opens each workbook sequentially in one owned Excel COM instance. Never kills
# unrelated Excel sessions; transient RPC_E_CALL_REJECTED calls are retried.
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class VnoExcelOpenWin32 {
  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@

function Get-OwnedExcelProcessId($app) {
  try {
    $processIdValue = [uint32]0
    [void][VnoExcelOpenWin32]::GetWindowThreadProcessId([IntPtr]$app.Hwnd, [ref]$processIdValue)
    return [int]$processIdValue
  } catch { return 0 }
}

function Dismiss-OwnedActivationDialog([int]$processId) {
  if ($processId -le 0) { return }
  for ($probe = 0; $probe -lt 5; $probe++) {
    Start-Sleep -Milliseconds 250
    try {
      $elements = [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
        [System.Windows.Automation.TreeScope]::Descendants,
        [System.Windows.Automation.Condition]::TrueCondition)
    } catch { continue }
    $hasWizard = $false
    foreach ($element in $elements) {
      try {
        if ([int]$element.Current.ProcessId -eq $processId -and $element.Current.Name -eq "Microsoft Office Activation Wizard") {
          $hasWizard = $true
          break
        }
      } catch {}
    }
    if (-not $hasWizard) { return }
    foreach ($element in $elements) {
      try {
        if ([int]$element.Current.ProcessId -ne $processId -or $element.Current.Name -ne "Close" -or $element.Current.ControlType -ne [System.Windows.Automation.ControlType]::Button) { continue }
        $pattern = $null
        if ($element.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) {
          ([System.Windows.Automation.InvokePattern]$pattern).Invoke()
          Start-Sleep -Milliseconds 150
          break
        }
      } catch {}
    }
    return
  }
}

$xl = $null
try {
  $xl = New-Object -ComObject Excel.Application
  $xl.DisplayAlerts = $false
  $xl.Visible = $false
  $xl.AskToUpdateLinks = $false
  $ownedProcessId = Get-OwnedExcelProcessId $xl

  foreach ($f in $Files) {
    $name = Split-Path $f -Leaf
    $wb = $null
    try {
      $attempt = 0
      while ($true) {
        $attempt++
        try {
          $wb = $xl.Workbooks.Open($f, 0, $true)
          Dismiss-OwnedActivationDialog $ownedProcessId
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
            Dismiss-OwnedActivationDialog $ownedProcessId
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
