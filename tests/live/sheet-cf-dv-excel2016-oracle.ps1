param(
  [string]$WorkbookPath = "$env:TEMP\vno-cf-dv-excel2016-oracle.xlsx",
  [string]$ReportPath = "$env:TEMP\vno-cf-dv-excel2016-oracle.json"
)

$ErrorActionPreference = 'Stop'

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class VnoCfDvExcelPid {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
'@

function Invoke-ExcelRetry([scriptblock]$Operation, [string]$Label) {
  for ($attempt = 1; $attempt -le 40; $attempt++) {
    try { return & $Operation } catch {
      if ($_.Exception.Message -notmatch 'rejected by callee|0x800AC472') { throw }
      if ($attempt -eq 40) { throw "$Label failed after $attempt attempts: $($_.Exception.Message)" }
      Start-Sleep -Milliseconds 500
    }
  }
}

function Convert-ExcelColor([object]$Value) {
  if ($null -eq $Value) { return $null }
  $number = [long]$Value
  $red = $number -band 255
  $green = ($number -shr 8) -band 255
  $blue = ($number -shr 16) -band 255
  return '#{0:X2}{1:X2}{2:X2}' -f $red, $green, $blue
}

function Set-Values($Range, [object[]]$Values) {
  for ($index = 0; $index -lt $Values.Count; $index++) {
    $offset = $index
    $cell = $Range.Cells.Item($offset + 1, 1)
    $currentValue = $Values[$offset]
    if ($null -eq $currentValue) {
      $cell.ClearContents() | Out-Null
    } elseif ($currentValue -is [string]) {
      $cell.Value2 = [string]$currentValue
    } else {
      $cell.Value2 = [double]$currentValue
    }
  }
}

function Set-RuleFill($Rule, [long]$Color) {
  $Rule.Interior.Pattern = 1
  $Rule.Interior.Color = $Color
}

function Read-ConditionalCase($Sheet, [string]$Name, [string]$Address) {
  $range = $Sheet.Range($Address)
  $condition = $range.FormatConditions.Item(1)
  $cells = @()
  for ($index = 1; $index -le $range.Cells.Count; $index++) {
    $cell = $range.Cells.Item($index, 1)
    $colorIndex = [int]$cell.DisplayFormat.Interior.ColorIndex
    $cells += [ordered]@{
      address = [string]$cell.Address($false, $false)
      value = $cell.Value2
      fill = if ($colorIndex -eq -4142) { $null } else { Convert-ExcelColor $cell.DisplayFormat.Interior.Color }
    }
  }
  $metadata = [ordered]@{
    type = [int]$condition.Type
    appliesTo = [string]$condition.AppliesTo.Address($false, $false)
  }
  foreach ($property in 'Operator','Formula1','Formula2','Text','Rank','Percent','TopBottom','AboveBelow','DupeUnique','DateOperator') {
    try { $metadata[$property.Substring(0,1).ToLowerInvariant() + $property.Substring(1)] = $condition.$property } catch {}
  }
  try {
    if ([int]$condition.Type -eq 4) {
      $metadata.dataBar = [ordered]@{
        color = Convert-ExcelColor $condition.BarColor.Color
        minType = [int]$condition.MinPoint.Type
        minValue = $condition.MinPoint.Value
        maxType = [int]$condition.MaxPoint.Type
        maxValue = $condition.MaxPoint.Value
        percentMin = [int]$condition.PercentMin
        percentMax = [int]$condition.PercentMax
        showValue = [bool]$condition.ShowValue
      }
    }
  } catch {}
  try {
    if ([int]$condition.Type -eq 3) {
      $criteria = @()
      for ($index = 1; $index -le [int]$condition.ColorScaleCriteria.Count; $index++) {
        $criterion = $condition.ColorScaleCriteria.Item($index)
        $criteria += [ordered]@{
          type = [int]$criterion.Type
          value = $criterion.Value
          color = Convert-ExcelColor $criterion.FormatColor.Color
        }
      }
      $metadata.colorScale = $criteria
    }
  } catch {}
  try {
    if ([int]$condition.Type -eq 6) {
      $criteria = @()
      for ($index = 1; $index -le [int]$condition.IconCriteria.Count; $index++) {
        $criterion = $condition.IconCriteria.Item($index)
        $criteria += [ordered]@{ type = [int]$criterion.Type; value = $criterion.Value; operator = [int]$criterion.Operator }
      }
      $metadata.iconSet = [ordered]@{
        id = [int]$condition.IconSet.ID
        reverse = [bool]$condition.ReverseOrder
        showIconOnly = [bool]$condition.ShowIconOnly
        criteria = $criteria
      }
    }
  } catch {}
  return [ordered]@{ name = $Name; metadata = $metadata; cells = $cells }
}

function Add-Validation($Cell, [int]$Type, [int]$AlertStyle, [int]$Operator, [string]$Formula1, [string]$Formula2, [bool]$IgnoreBlank) {
  $Cell.Validation.Delete() | Out-Null
  $Cell.Validation.Add($Type, $AlertStyle, $Operator, $Formula1, $Formula2) | Out-Null
  $Cell.Validation.IgnoreBlank = $IgnoreBlank
  $Cell.Validation.ShowInput = $true
  $Cell.Validation.InputTitle = 'Input hint'
  $Cell.Validation.InputMessage = 'Enter a value that meets the rule'
  $Cell.Validation.ShowError = $true
  $Cell.Validation.ErrorTitle = 'Invalid value'
  $Cell.Validation.ErrorMessage = 'Check the entered value'
}

function Set-CellValue($Cell, [object]$Value) {
  if ($null -eq $Value -or $Value -eq '') {
    $Cell.ClearContents() | Out-Null
  } elseif ($Value -is [string]) {
    $Cell.Value2 = [string]$Value
  } else {
    $Cell.Value2 = [double]$Value
  }
}

function Test-ValidationValues($Cell, [object[]]$Candidates) {
  $results = @()
  foreach ($candidate in $Candidates) {
    Set-CellValue $Cell $candidate
    $results += [ordered]@{ value = $candidate; valid = [bool]$Cell.Validation.Value }
  }
  return $results
}

$excel = $null
$workbook = $null
$reopened = $null
$ownedPid = 0
try {
  $excel = New-Object -ComObject Excel.Application
  $excel.DisplayAlerts = $false
  $excelVersion = [string]$excel.Version
  $workbook = $excel.Workbooks.Add()
  $pidValue = [uint32]0
  [void][VnoCfDvExcelPid]::GetWindowThreadProcessId([IntPtr]$excel.Hwnd, [ref]$pidValue)
  $ownedPid = [int]$pidValue
  $cf = $workbook.Worksheets.Item(1)
  $cf.Name = 'CF'
  $dv = $workbook.Worksheets.Add()
  $dv.Name = 'DV'
  $highlight = [long](255 + 242 * 256 + 204 * 65536)

  $cases = @()
  $definitions = @(
    @{ name='greaterThan'; col='A'; values=@(1,2,3,4,5); add={ param($r) $r.FormatConditions.Add(1,5,'=3') } },
    @{ name='lessThan'; col='B'; values=@(1,2,3,4,5); add={ param($r) $r.FormatConditions.Add(1,6,'=3') } },
    @{ name='between'; col='C'; values=@(1,2,3,4,5); add={ param($r) $r.FormatConditions.Add(1,1,'=2','=4') } },
    @{ name='equal'; col='D'; values=@(1,2,3,4,5); add={ param($r) $r.FormatConditions.Add(1,3,'=3') } },
    @{ name='textContains'; col='E'; values=@('an','ban','car','AN','empty'); add={ param($r) $r.FormatConditions.Add(9,[Type]::Missing,[Type]::Missing,[Type]::Missing,'an',0) } },
    @{ name='dateOccursToday'; col='F'; values=@([datetime]::Today.AddDays(-1).ToOADate(),[datetime]::Today.ToOADate(),[datetime]::Today.AddDays(1).ToOADate(),[datetime]::Today.AddDays(-7).ToOADate(),[datetime]::Today.AddMonths(1).ToOADate()); add={ param($r) $r.FormatConditions.Add(11,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,0,[Type]::Missing) } },
    @{ name='duplicate'; col='G'; values=@(1,2,2,4,4); add={ param($r) $rule=$r.FormatConditions.Add(8,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing); $rule.DupeUnique=1; $rule } },
    @{ name='topN'; col='H'; values=@(10,40,30,20,50); add={ param($r) $rule=$r.FormatConditions.Add(5,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing); $rule.TopBottom=1; $rule.Rank=2; $rule.Percent=$false; $rule } },
    @{ name='bottomN'; col='I'; values=@(10,40,30,20,50); add={ param($r) $rule=$r.FormatConditions.Add(5,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing); $rule.TopBottom=0; $rule.Rank=2; $rule.Percent=$false; $rule } },
    @{ name='topPercent'; col='J'; values=@(10,40,30,20,50); add={ param($r) $rule=$r.FormatConditions.Add(5,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing); $rule.TopBottom=1; $rule.Rank=40; $rule.Percent=$true; $rule } },
    @{ name='bottomPercent'; col='K'; values=@(10,40,30,20,50); add={ param($r) $rule=$r.FormatConditions.Add(5,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing); $rule.TopBottom=0; $rule.Rank=40; $rule.Percent=$true; $rule } },
    @{ name='aboveAverage'; col='L'; values=@(1,2,3,4,10); add={ param($r) $rule=$r.FormatConditions.Add(12,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing); $rule.AboveBelow=0; $rule } },
    @{ name='belowAverage'; col='M'; values=@(1,2,3,4,10); add={ param($r) $rule=$r.FormatConditions.Add(12,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing); $rule.AboveBelow=1; $rule } },
    @{ name='dataBar'; col='N'; values=@(0,25,50,75,100); add={ param($r) $rule=$r.FormatConditions.AddDatabar(); $rule.BarColor.Color=[long](99 + 142*256 + 198*65536); $rule } },
    @{ name='colorScale2'; col='O'; values=@(0,25,50,75,100); add={ param($r) $rule=$r.FormatConditions.AddColorScale(2); $rule.ColorScaleCriteria.Item(1).FormatColor.Color=7039480; $rule.ColorScaleCriteria.Item(2).FormatColor.Color=8109667; $rule } },
    @{ name='colorScale3'; col='P'; values=@(0,1,2,3,100); add={ param($r) $r.FormatConditions.AddColorScale(3) } },
    @{ name='iconSet'; col='Q'; values=@(0,25,50,75,100); add={ param($r) $r.FormatConditions.AddIconSetCondition() } },
    @{ name='formula'; col='R'; values=@(1,2,3,4,5); add={ param($r) $r.FormatConditions.Add(2,[Type]::Missing,'=MOD(R1,2)=0') } },
    @{ name='blank'; col='S'; values=@($null,'x',$null,0,' '); add={ param($r) $r.FormatConditions.Add(10,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing,[Type]::Missing) } }
  )
  foreach ($definition in $definitions) {
    $range = $cf.Range("$($definition.col)1:$($definition.col)5")
    Set-Values $range $definition.values
    $rule = & $definition.add $range
    if ($definition.name -notin @('dataBar','colorScale2','colorScale3','iconSet')) { Set-RuleFill $rule $highlight }
    $cases += Read-ConditionalCase $cf $definition.name $range.Address($false,$false)
  }

  $validationDefinitions = @(
    @{ name='whole'; cell='A1'; type=1; style=1; op=1; f1='1'; f2='10'; blank=$true; candidates=@(5,11,'') },
    @{ name='decimal'; cell='B1'; type=2; style=2; op=5; f1='1.5'; f2=''; blank=$true; candidates=@(2.25,1,'') },
    @{ name='list'; cell='C1'; type=3; style=3; op=1; f1='Pass,Fail'; f2=''; blank=$true; candidates=@('Pass','Other','') },
    @{ name='date'; cell='D1'; type=4; style=1; op=1; f1=([datetime]::Today.ToOADate().ToString([Globalization.CultureInfo]::InvariantCulture)); f2=([datetime]::Today.AddDays(10).ToOADate().ToString([Globalization.CultureInfo]::InvariantCulture)); blank=$true; candidates=@([datetime]::Today.AddDays(2).ToOADate(),[datetime]::Today.AddDays(20).ToOADate(),'') },
    @{ name='time'; cell='E1'; type=5; style=2; op=6; f1='0.5'; f2=''; blank=$true; candidates=@(0.25,0.75,'') },
    @{ name='textLength'; cell='F1'; type=6; style=3; op=8; f1='4'; f2=''; blank=$true; candidates=@('Four','Five5','') },
    @{ name='custom'; cell='G1'; type=7; style=1; op=1; f1='=MOD(G1,2)=0'; f2=''; blank=$true; candidates=@(2,3,'') },
    @{ name='wholeNoBlank'; cell='H1'; type=1; style=1; op=5; f1='0'; f2=''; blank=$false; candidates=@(1,-1,'') },
    @{ name='operatorBetween'; cell='I1'; type=2; style=1; op=1; f1='1'; f2='2'; blank=$true; candidates=@(1.5,3,'') },
    @{ name='operatorNotBetween'; cell='J1'; type=2; style=1; op=2; f1='1'; f2='2'; blank=$true; candidates=@(3,1.5,'') },
    @{ name='operatorEqual'; cell='K1'; type=2; style=1; op=3; f1='2'; f2=''; blank=$true; candidates=@(2,3,'') },
    @{ name='operatorNotEqual'; cell='L1'; type=2; style=1; op=4; f1='2'; f2=''; blank=$true; candidates=@(3,2,'') },
    @{ name='operatorGreaterThan'; cell='M1'; type=2; style=1; op=5; f1='2'; f2=''; blank=$true; candidates=@(3,2,'') },
    @{ name='operatorLessThan'; cell='N1'; type=2; style=1; op=6; f1='2'; f2=''; blank=$true; candidates=@(1,2,'') },
    @{ name='operatorGreaterThanOrEqual'; cell='O1'; type=2; style=1; op=7; f1='2'; f2=''; blank=$true; candidates=@(2,1,'') },
    @{ name='operatorLessThanOrEqual'; cell='P1'; type=2; style=1; op=8; f1='2'; f2=''; blank=$true; candidates=@(2,3,'') }
  )
  $validationCases = @()
  foreach ($definition in $validationDefinitions) {
    $cell = $dv.Range($definition.cell)
    Add-Validation $cell $definition.type $definition.style $definition.op $definition.f1 $definition.f2 $definition.blank
    $validationCases += [ordered]@{
      name = $definition.name
      cell = $definition.cell
      metadata = [ordered]@{
        type = [int]$cell.Validation.Type
        operator = [int]$cell.Validation.Operator
        formula1 = [string]$cell.Validation.Formula1
        formula2 = [string]$cell.Validation.Formula2
        ignoreBlank = [bool]$cell.Validation.IgnoreBlank
        showInput = [bool]$cell.Validation.ShowInput
        inputTitle = [string]$cell.Validation.InputTitle
        inputMessage = [string]$cell.Validation.InputMessage
        showError = [bool]$cell.Validation.ShowError
        alertStyle = [int]$cell.Validation.AlertStyle
        errorTitle = [string]$cell.Validation.ErrorTitle
        errorMessage = [string]$cell.Validation.ErrorMessage
      }
      values = Test-ValidationValues $cell $definition.candidates
    }
  }
  foreach ($definition in $validationDefinitions) {
    Set-CellValue $dv.Range($definition.cell) $definition.candidates[1]
  }
  $dv.CircleInvalid() | Out-Null
  $invalidCells = @()
  foreach ($definition in $validationDefinitions) {
    $cell = $dv.Range($definition.cell)
    if (-not [bool]$cell.Validation.Value) { $invalidCells += $definition.cell }
  }

  $resolvedWorkbook = [IO.Path]::GetFullPath($WorkbookPath)
  $resolvedReport = [IO.Path]::GetFullPath($ReportPath)
  New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($resolvedWorkbook)) | Out-Null
  New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($resolvedReport)) | Out-Null
  $workbook.SaveAs($resolvedWorkbook, 51)
  $workbook.Close($false)
  $workbook = $null
  $reopened = $excel.Workbooks.Open($resolvedWorkbook, 0, $true)
  $roundTripCf = $reopened.Worksheets.Item('CF')
  $roundTripDv = $reopened.Worksheets.Item('DV')
  $roundTrip = [ordered]@{
    cfCount = [int]$roundTripCf.Cells.FormatConditions.Count
    cfByCase = @($definitions | ForEach-Object { [ordered]@{ name=$_.name; count=[int]$roundTripCf.Range("$($_.col)1:$($_.col)5").FormatConditions.Count; type=[int]$roundTripCf.Range("$($_.col)1:$($_.col)5").FormatConditions.Item(1).Type } })
    dvByCase = @($validationDefinitions | ForEach-Object { $validation=$roundTripDv.Range($_.cell).Validation; [ordered]@{ name=$_.name; type=[int]$validation.Type; operator=[int]$validation.Operator; ignoreBlank=[bool]$validation.IgnoreBlank; alertStyle=[int]$validation.AlertStyle } })
  }
  $report = [ordered]@{
    excelVersion = $excelVersion
    workbook = $resolvedWorkbook
    conditionalFormatting = $cases
    dataValidation = $validationCases
    circleInvalid = [ordered]@{ invoked = $true; invalidCells = $invalidCells }
    roundTrip = $roundTrip
  }
  $json = $report | ConvertTo-Json -Depth 12
  $json | Set-Content -LiteralPath $resolvedReport -Encoding UTF8
  $reopened.Close($false)
  $reopened = $null
  Invoke-ExcelRetry { $excel.Visible = $true } 'Show Excel' | Out-Null
  Start-Sleep -Seconds 1
  $json
} finally {
  if ($reopened) { try { $reopened.Close($false) } catch {} }
  if ($workbook) { try { $workbook.Close($false) } catch {} }
  if ($excel) { try { $excel.Quit() } catch {} }
  foreach ($comObject in @($roundTripDv,$roundTripCf,$reopened,$dv,$cf,$workbook,$excel)) {
    if ($comObject) { try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($comObject) } catch {} }
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  if ($ownedPid -gt 0) {
    $ownedProcess = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
    if ($ownedProcess -and $ownedProcess.ProcessName -eq 'EXCEL') { Stop-Process -Id $ownedPid -Force }
  }
}
