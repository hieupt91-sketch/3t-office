param(
  [Parameter(Mandatory = $true)][string]$ReportPath,
  [Parameter(Mandatory = $true)][int]$TargetProcessId,
  [ValidateSet("inspect", "cancel", "pdf")][string]$Action = "cancel",
  [string]$OutputPath = "",
  [string]$PrinterName = "Microsoft Print to PDF",
  [int]$TimeoutSeconds = 25
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$root = [System.Windows.Automation.AutomationElement]::RootElement
$deadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
$targetWindows = @()
do {
  $children = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
  $targetWindows = @($children | Where-Object { $_.Current.ProcessId -eq $TargetProcessId })
  if ($targetWindows.Count -eq 0) { Start-Sleep -Milliseconds 250 }
} while ($targetWindows.Count -eq 0 -and [DateTime]::UtcNow -lt $deadline)

function Get-ElementDetails($element, [int]$depth, [int]$maxDepth) {
  $current = $element.Current
  $patternNames = @()
  foreach ($pattern in @(
    [System.Windows.Automation.InvokePattern]::Pattern,
    [System.Windows.Automation.ValuePattern]::Pattern,
    [System.Windows.Automation.SelectionItemPattern]::Pattern,
    [System.Windows.Automation.ExpandCollapsePattern]::Pattern
  )) {
    $ignored = $null
    if ($element.TryGetCurrentPattern($pattern, [ref]$ignored)) { $patternNames += $pattern.ProgrammaticName }
  }
  $node = [ordered]@{
    name = $current.Name
    type = $current.ControlType.ProgrammaticName
    className = $current.ClassName
    automationId = $current.AutomationId
    processId = $current.ProcessId
    nativeWindowHandle = $current.NativeWindowHandle
    bounds = $current.BoundingRectangle.ToString()
    enabled = $current.IsEnabled
    patterns = $patternNames
    value = $null
    children = @()
  }
  $valuePattern = $null
  if ($element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valuePattern)) {
    $node.value = $valuePattern.Current.Value
  }
  if ($depth -lt $maxDepth) {
    $children = $element.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
    foreach ($child in $children) {
      if ($node.children.Count -ge 100) { break }
      $node.children += Get-ElementDetails $child ($depth + 1) $maxDepth
    }
  }
  return $node
}

$windowDetails = @()
$controlDetails = @()
$printDialogs = @()
$targetWindow = $null
$targetDescendants = @()
$printerControl = $null
$printButton = $null
$controlDeadline = [DateTime]::UtcNow.AddSeconds($TimeoutSeconds)
do {
  foreach ($window in $targetWindows) {
    $descendants = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
    $printerCandidate = @($descendants | Where-Object { $_.Current.AutomationId -eq "input-39" -and $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::ComboBox } | Select-Object -First 1)
    $printCandidate = @($descendants | Where-Object {
      $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and
      ($_.Current.AutomationId -eq "print" -or $_.Current.Name -match '(?i)^print$|^in$')
    } | Select-Object -First 1)
    $cancelCandidate = @($descendants | Where-Object { $_.Current.AutomationId -eq "cancel" -and $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button } | Select-Object -First 1)
    $moreSettingsCandidate = @($descendants | Where-Object { $_.Current.AutomationId -eq "more-settings-toggle" -and $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button } | Select-Object -First 1)
    $allPagesCandidate = @($descendants | Where-Object { $_.Current.AutomationId -eq "input50" -and $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::RadioButton } | Select-Object -First 1)
    $rangeCandidate = @($descendants | Where-Object { $_.Current.AutomationId -eq "input77" -and $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::RadioButton } | Select-Object -First 1)
    if ($printerCandidate.Count -gt 0 -and $printCandidate.Count -gt 0 -and $cancelCandidate.Count -gt 0 -and
        $moreSettingsCandidate.Count -gt 0 -and $allPagesCandidate.Count -gt 0 -and $rangeCandidate.Count -gt 0) {
      $targetWindow = $window
      $targetDescendants = @($descendants)
      $printerControl = $printerCandidate[0]
      $printButton = $printCandidate[0]
      break
    }
  }
  if ($targetWindow -or $targetWindows.Count -eq 0) { break }
  Start-Sleep -Milliseconds 250
} while ([DateTime]::UtcNow -lt $controlDeadline)

if (-not $targetWindow -and $targetWindows.Count -gt 0) { $targetWindow = $targetWindows[0] }
if ($targetWindow) {
  $targetWindows = @($targetWindow)
  $targetDescendants = @($targetWindow.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition))
}

foreach ($window in $targetWindows) {
  $windowDetails += Get-ElementDetails $window 0 8
  $windowCondition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    [System.Windows.Automation.ControlType]::Window
  )
  $descendantWindows = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $windowCondition)
  foreach ($childWindow in $descendantWindows) {
    if ($childWindow.Current.Name -match '(?i)^print$|^in ra$|save print|lưu kết quả in') {
      $printDialogs += $childWindow
    }
  }
  foreach ($type in @(
    [System.Windows.Automation.ControlType]::Button,
    [System.Windows.Automation.ControlType]::ComboBox,
    [System.Windows.Automation.ControlType]::Edit,
    [System.Windows.Automation.ControlType]::ListItem,
    [System.Windows.Automation.ControlType]::RadioButton,
    [System.Windows.Automation.ControlType]::CheckBox
  )) {
    $condition = New-Object System.Windows.Automation.PropertyCondition(
      [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
      $type
    )
    $elements = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)
    foreach ($element in $elements) {
      if ($controlDetails.Count -ge 500) { break }
      $current = $element.Current
      $patternNames = @()
      foreach ($pattern in @(
        [System.Windows.Automation.InvokePattern]::Pattern,
        [System.Windows.Automation.ValuePattern]::Pattern,
        [System.Windows.Automation.SelectionItemPattern]::Pattern,
        [System.Windows.Automation.ExpandCollapsePattern]::Pattern,
        [System.Windows.Automation.RangeValuePattern]::Pattern,
        [System.Windows.Automation.TogglePattern]::Pattern
      )) {
        $ignored = $null
        if ($element.TryGetCurrentPattern($pattern, [ref]$ignored)) { $patternNames += $pattern.ProgrammaticName }
      }
      $controlDetails += [ordered]@{
        name = $current.Name
        type = $current.ControlType.ProgrammaticName
        className = $current.ClassName
        automationId = $current.AutomationId
        processId = $current.ProcessId
        enabled = $current.IsEnabled
        bounds = $current.BoundingRectangle.ToString()
        patterns = $patternNames
        value = $null
      }
      $valuePattern = $null
      if ($element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$valuePattern)) {
        $controlDetails[-1].value = $valuePattern.Current.Value
      }
    }
  }
}

$cancelled = $false
$printActionResult = [ordered]@{
  action = $Action
  dialogFound = ($printerControl -ne $null -and $printButton -ne $null)
  printerSelected = $false
  copiesSet = $false
  allPagesSelected = $false
  pageRangeControlAvailable = $false
  dialogFoundForSave = $false
  outputSaved = $false
  outputBytes = 0
  outputPath = $OutputPath
  error = ""
}

function Find-ByAutomationId($elements, [string]$automationId, $controlType = $null) {
  foreach ($element in $elements) {
    if ($element.Current.AutomationId -ne $automationId) { continue }
    if ($null -ne $controlType -and $element.Current.ControlType -ne $controlType) { continue }
    return $element
  }
  return $null
}

function Set-Value($element, [string]$value) {
  if (-not $element) { return $false }
  $pattern = $null
  if (-not $element.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$pattern)) { return $false }
  try { $pattern.SetValue($value); return $true } catch { return $false }
}

if ($Action -eq "pdf" -and $printActionResult.dialogFound) {
  try {
    $selectedPrinterItem = $false
    $currentPrinter = $null
    $printerPattern = $null
    if ($printerControl.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$printerPattern)) {
      $currentPrinter = $printerPattern.Current.Value
    }
    if ($currentPrinter -ne $PrinterName) {
      if (-not (Set-Value $printerControl $PrinterName)) {
        $expand = $null
        if ($printerControl.TryGetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$expand)) {
          $expand.Expand()
          Start-Sleep -Milliseconds 500
          $expanded = @($targetWindow.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition))
          $item = @($expanded | Where-Object { $_.Current.Name -like "*$PrinterName*" } | Select-Object -First 1)
          if ($item.Count -gt 0) {
            $selection = $null
            if ($item[0].TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$selection)) {
              $selection.Select()
              $selectedPrinterItem = $true
            } elseif ($item[0].TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$selection)) {
              $selection.Invoke()
              $selectedPrinterItem = $true
            }
          }
        }
      }
      Start-Sleep -Milliseconds 500
      $printerPattern = $null
      if ($printerControl.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$printerPattern)) {
        $currentPrinter = $printerPattern.Current.Value
      }
    }
    $printActionResult.printerSelected = ($currentPrinter -eq $PrinterName -or $selectedPrinterItem)

    $copiesControl = Find-ByAutomationId $targetDescendants "control" ([System.Windows.Automation.ControlType]::Edit)
    $printActionResult.copiesSet = Set-Value $copiesControl "1"
    $allPagesControl = Find-ByAutomationId $targetDescendants "input50" ([System.Windows.Automation.ControlType]::RadioButton)
    if ($allPagesControl) {
      $selection = $null
      if ($allPagesControl.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$selection)) {
        $selection.Select()
      } elseif ($allPagesControl.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$selection)) {
        $selection.Invoke()
      }
      $printActionResult.allPagesSelected = $true
    }
    $rangeControl = Find-ByAutomationId $targetDescendants "input77" ([System.Windows.Automation.ControlType]::RadioButton)
    $printActionResult.pageRangeControlAvailable = ($rangeControl -ne $null)
    if (-not $printActionResult.printerSelected) { throw "Microsoft Print to PDF was not selected; refusing to submit to another printer." }
    if (-not $printActionResult.copiesSet) { throw "The copies field could not be set to 1." }
    if (-not $printActionResult.allPagesSelected) { throw "The All pages option could not be selected." }
    if (-not $printActionResult.pageRangeControlAvailable) { throw "The page-range option was not exposed by the print dialog." }

    if ([string]::IsNullOrWhiteSpace($OutputPath)) { throw "OutputPath is required for the PDF action." }
    if (Test-Path -LiteralPath $OutputPath) { throw "PDF output path already exists: $OutputPath" }
    $invokePrint = $null
    if ($printButton.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invokePrint)) {
      $invokePrint.Invoke()
    } else {
      throw "The native Print button does not expose InvokePattern."
    }

    $saveDeadline = [DateTime]::UtcNow.AddSeconds(30)
    $saveWindow = $null
    do {
      $topWindows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
      $saveWindow = @($topWindows | Where-Object { $_.Current.Name -match '(?i)^save print output as$|^save print output$|^lưu kết quả in$' } | Select-Object -First 1)
      if ($saveWindow.Count -gt 0) { $saveWindow = $saveWindow[0]; break }
      Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $saveDeadline)

    if ($saveWindow) {
      $printActionResult.dialogFoundForSave = $true
      $saveDescendants = $saveWindow.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
      $filenameControl = @($saveDescendants | Where-Object { $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Edit } | Select-Object -First 1)
      if ($filenameControl.Count -eq 0 -or -not (Set-Value $filenameControl[0] $OutputPath)) {
        throw "Could not set the PDF path in the Windows save dialog."
      }
      $saveButton = @($saveDescendants | Where-Object { $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button -and $_.Current.Name -match '(?i)^save$|^lưu$' } | Select-Object -First 1)
      if ($saveButton.Count -eq 0) { throw "Could not find Save in the Windows print output dialog." }
      $invokeSave = $null
      if ($saveButton[0].TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invokeSave)) {
        $invokeSave.Invoke()
      } else {
        throw "The Windows Save button does not expose InvokePattern."
      }
      $fileDeadline = [DateTime]::UtcNow.AddSeconds(30)
      do {
        if (Test-Path -LiteralPath $OutputPath) {
          $fileInfo = Get-Item -LiteralPath $OutputPath
          if ($fileInfo.Length -gt 0) { $printActionResult.outputSaved = $true; $printActionResult.outputBytes = $fileInfo.Length; break }
        }
        Start-Sleep -Milliseconds 250
      } while ([DateTime]::UtcNow -lt $fileDeadline)
    } else {
      throw "The Windows Save Print Output As dialog did not appear."
    }
  } catch {
    $printActionResult.error = $_.Exception.Message
  }
}

if ($Action -eq "cancel" -or ($Action -eq "pdf" -and -not $printActionResult.outputSaved)) {
  $cancelButton = Find-ByAutomationId $targetDescendants "cancel" ([System.Windows.Automation.ControlType]::Button)
  if ($cancelButton) {
    try {
      $invokeCancel = $null
      if ($cancelButton.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invokeCancel)) {
        $invokeCancel.Invoke()
        $cancelled = $true
      }
    } catch {}
  }
}

$allWindows = @()
$children = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
foreach ($window in $children) {
  $allWindows += [ordered]@{ name = $window.Current.Name; className = $window.Current.ClassName; processId = $window.Current.ProcessId }
}
$result = [ordered]@{
  found = ($targetWindows.Count -gt 0)
  printDialogFound = $printActionResult.dialogFound
  matchedWindows = $windowDetails
  printDialogs = @($printDialogs | ForEach-Object { Get-ElementDetails $_ 0 8 })
  controls = $controlDetails
  cancelled = $cancelled
  printAction = $printActionResult
  allWindows = $allWindows
}
$result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $ReportPath -Encoding UTF8
if (-not $result.found) { exit 2 }
exit 0
