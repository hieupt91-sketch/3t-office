param(
  [Parameter(Mandatory = $true)][string]$InputJson,
  [Parameter(Mandatory = $true)][string]$OutputJson
)
# Oracle thao tac cau truc: Excel 2016 that (COM) thuc hien chen/xoa dong-cot, dien, sap xep tren so lam viec moi (khong luu),
# roi doc lai cong thuc + gia tri cua tung o. Dung de doi chieu VN Sheet (scripts/audit-0610/structural_oracle.mjs).
$ErrorActionPreference = "Stop"
$spec = Get-Content -LiteralPath $InputJson -Raw -Encoding UTF8 | ConvertFrom-Json
$x = $null
for ($a = 0; $a -lt 30 -and -not $x; $a++) { try { $x = New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 700 } }
if (-not $x) { throw "Khong khoi dong duoc Excel" }
function Retry([scriptblock]$Block) { for ($a = 0; $a -lt 40; $a++) { try { return (& $Block) } catch { if ($a -eq 39) { throw }; Start-Sleep -Milliseconds 500 } } }
$errorNames = @{ -2146826281 = "#DIV/0!"; -2146826246 = "#N/A"; -2146826259 = "#NAME?"; -2146826288 = "#NULL!"; -2146826252 = "#NUM!"; -2146826265 = "#REF!"; -2146826273 = "#VALUE!" }
$missing = [Type]::Missing
try {
  Retry { $x.DisplayAlerts = $false }
  for ($a = 0; $a -lt 120; $a++) { try { if ($x.Ready) { break } } catch {}; Start-Sleep -Milliseconds 500 }
  $wb = Retry { $x.Workbooks.Add() }
  $results = [ordered]@{}
  foreach ($scenario in $spec.scenarios) {
    $ws = Retry { $wb.Worksheets.Add() }
    foreach ($prop in $scenario.cells.PSObject.Properties) {
      $valObj = $prop.Value
      if ($valObj -is [System.Management.Automation.PSCustomObject]) {
        $hasV = $valObj.PSObject.Properties["v"] -ne $null
        $hasVal = $valObj.PSObject.Properties["val"] -ne $null
        $cellVal = if ($hasV) { $valObj.v } elseif ($hasVal) { $valObj.val } else { $null }
        $hasF = $valObj.PSObject.Properties["f"] -ne $null
        $hasFormula = $valObj.PSObject.Properties["formula"] -ne $null
        $cellForm = if ($hasF) { $valObj.f } elseif ($hasFormula) { $valObj.formula } else { $null }
        Retry {
          if ($cellForm) { $ws.Range($prop.Name).Formula = [string]$cellForm }
          elseif ($cellVal -ne $null) {
            if ($cellVal -is [string]) { $ws.Range($prop.Name).Value2 = $cellVal }
            else { $ws.Range($prop.Name).Value2 = [double]$cellVal }
          }
          if ($valObj.bold) { $ws.Range($prop.Name).Font.Bold = [bool]$valObj.bold }
          $col = if ($valObj.color) { $valObj.color } else { $valObj.backgroundColor }
          if ($col) {
            $hex = [string]$col.TrimStart('#')
            $r = [Convert]::ToInt32($hex.Substring(0,2), 16)
            $g = [Convert]::ToInt32($hex.Substring(2,2), 16)
            $b = [Convert]::ToInt32($hex.Substring(4,2), 16)
            $ws.Range($prop.Name).Interior.Color = $r + ($g -shl 8) + ($b -shl 16)
          }
          $fmt = if ($valObj.format) { $valObj.format } else { $valObj.numberFormat }
          if ($fmt) { $ws.Range($prop.Name).NumberFormat = [string]$fmt }
        }
      } else {
        $value = $valObj
        Retry { if ($value -is [string] -and $value.StartsWith("=")) { $ws.Range($prop.Name).Formula = $value } elseif ($value -is [string]) { $ws.Range($prop.Name).Value2 = $value } else { $ws.Range($prop.Name).Value2 = [double]$value } }
      }
    }
    foreach ($op in $scenario.ops) {
      switch ($op.type) {
        "deleteRow" { Retry { [void]$ws.Rows($op.at).Delete() } }
        "insertRow" { Retry { [void]$ws.Rows($op.at).Insert() } }
        "deleteCol" { Retry { [void]$ws.Columns($op.at).Delete() } }
        "insertCol" { Retry { [void]$ws.Columns($op.at).Insert() } }
        "fillDown" { Retry { [void]$ws.Range($op.range).FillDown() } }
        "fillRight" { Retry { [void]$ws.Range($op.range).FillRight() } }
        "fillUp" { Retry { [void]$ws.Range($op.range).FillUp() } }
        "fillLeft" { Retry { [void]$ws.Range($op.range).FillLeft() } }
        "sort" { Retry { [void]$ws.Range($op.range).Sort($ws.Range($op.key), [int]$op.order, $missing, $missing, 1, $missing, 1, 0) } }
        "filterEq" { Retry { [void]$ws.Range($op.range).AutoFilter([int]$op.field, [string]$op.value) } }
        "hideRow" { Retry { $ws.Rows($op.at).Hidden = $true } }
        "deleteRows" { Retry { [void]$ws.Rows("$($op.from):$($op.to)").Delete() } }
        "insertRows" { Retry { [void]$ws.Rows("$($op.at):$($op.at + $op.count - 1)").Insert() } }
        "copyPaste" { Retry { $ws.Range($op.from).Copy($ws.Range($op.to)) | Out-Null } }
        "cutPaste" { Retry { $ws.Range($op.from).Cut($ws.Range($op.to)) | Out-Null } }
        "pasteSpecial" {
          $paste = -4104
          $mode = if ($op.mode) { [string]$op.mode } elseif ($op.paste) { [string]$op.paste } else { "all" }
          switch ($mode) {
            "values" { $paste = -4163 }
            "formulas" { $paste = -4123 }
            "formats" { $paste = -4122 }
            "allExceptBorders" { $paste = 7 }
            "all" { $paste = -4104 }
            "source" { $paste = -4104 }
            "transpose" { $paste = -4104 }
            default { if ($op.paste -is [int]) { $paste = [int]$op.paste } }
          }
          $operation = -4142
          $opType = if ($op.operation) { [string]$op.operation } else { "none" }
          switch ($opType) {
            "add" { $operation = 2 }
            "subtract" { $operation = 3 }
            "multiply" { $operation = 4 }
            "divide" { $operation = 5 }
            "none" { $operation = -4142 }
            default { if ($op.operation -is [int]) { $operation = [int]$op.operation } }
          }
          $skipBlanks = if ($op.skipBlanks) { [bool]$op.skipBlanks } else { $false }
          $transpose = if ($op.transpose -or $op.mode -eq "transpose") { $true } else { $false }
          $dest = $op.to.Split(":")[0]
          Retry {
            $ws.Range($op.from).Copy() | Out-Null
            $ws.Range($dest).PasteSpecial($paste, $operation, $skipBlanks, $transpose) | Out-Null
          }
        }
      }
    }
    Retry { $x.Calculate() }
    $out = [ordered]@{}
    $used = $ws.UsedRange
    $rows = $used.Rows.Count + $used.Row - 1
    $cols = $used.Columns.Count + $used.Column - 1
    for ($r = 1; $r -le [Math]::Max($rows, 1); $r++) {
      for ($c = 1; $c -le [Math]::Max($cols, 1); $c++) {
        $cell = $ws.Cells.Item($r, $c)
        $f = [string]$cell.Formula
        $v = $cell.Value2
        if ($v -is [int] -and $errorNames.ContainsKey([int]$v)) { $v = $errorNames[[int]$v] }
        $address = $cell.Address($false, $false)

        $bold = [bool]$cell.Font.Bold
        $colorHex = ""
        if ($cell.Interior.ColorIndex -ne -4142) {
          $cv = [int64]$cell.Interior.Color
          $red = $cv -band 0xFF
          $green = ($cv -shr 8) -band 0xFF
          $blue = ($cv -shr 16) -band 0xFF
          $colorHex = "#{0:X2}{1:X2}{2:X2}" -f $red, $green, $blue
        }
        $nf = [string]$cell.NumberFormat
        $hasFmt = ($bold -or $colorHex -or ($nf -and $nf -ne "General"))

        if ($f -eq "" -and (-not $scenario.compareFormat -or -not $hasFmt)) { continue }

        $cellData = [ordered]@{ f = $f; v = $v }
        if ($scenario.compareFormat) {
          $fmt = [ordered]@{}
          if ($bold) { $fmt["bold"] = $true }
          if ($colorHex) { $fmt["color"] = $colorHex }
          if ($nf -and $nf -ne "General") { $fmt["format"] = $nf }
          $cellData["fmt"] = $fmt
        }
        $out[$address] = $cellData
      }
    }
    $results[$scenario.name] = $out
    Retry { $ws.Delete() } | Out-Null
  }
  ($results | ConvertTo-Json -Depth 6 -Compress) | Set-Content -LiteralPath $OutputJson -Encoding UTF8
  Retry { $wb.Close($false) }
} finally { try { $x.Quit() } catch {} }
