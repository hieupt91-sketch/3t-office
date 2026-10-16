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
    if ($scenario.calcMode) {
      switch ($scenario.calcMode.ToLower()) {
        "auto" { Retry { $x.Calculation = -4105 } }
        "manual" { Retry { $x.Calculation = -4135 } }
        "autonotable" { Retry { $x.Calculation = 2 } }
      }
    }
    if ($scenario.iteration) {
      Retry {
        if ($scenario.iteration.maxIterations) { $x.MaxIterations = [int]$scenario.iteration.maxIterations }
        if ($scenario.iteration.maxChange) { $x.MaxChange = [double]$scenario.iteration.maxChange }
        $x.Iteration = [bool]$scenario.iteration.enabled
      }
    }
    if ($scenario.precisionAsDisplayed -ne $null) {
      Retry { $wb.PrecisionAsDisplayed = [bool]$scenario.precisionAsDisplayed }
    }
    if ($scenario.date1904 -ne $null) {
      Retry { $wb.Date1904 = [bool]$scenario.date1904 }
    }
    if ($scenario.referenceStyle) {
      $style = if ($scenario.referenceStyle -eq "R1C1") { -4150 } else { 1 }
      Retry { $x.ReferenceStyle = $style }
    }
    if ($scenario.colWidths) {
      foreach ($colProp in $scenario.colWidths.PSObject.Properties) {
        Retry { $ws.Columns($colProp.Name).ColumnWidth = [double]$colProp.Value }
      }
    }
    if ($scenario.shapes) {
      foreach ($s in $scenario.shapes) {
        $left = if ($s.left -ne $null) { [double]$s.left } else { 0 }
        $top = if ($s.top -ne $null) { [double]$s.top } else { 0 }
        $width = if ($s.width -ne $null) { [double]$s.width } else { 100 }
        $height = if ($s.height -ne $null) { [double]$s.height } else { 60 }
        $sh = Retry { $ws.Shapes.AddShape(1, $left, $top, $width, $height) }
        if ($s.name) { Retry { $sh.Name = [string]$s.name } }
        if ($s.rotation) { Retry { $sh.IncrementRotation([double]$s.rotation) } }
        if ($s.flipH) { Retry { $sh.Flip(0) } }
        if ($s.flipV) { Retry { $sh.Flip(1) } }
        if ($s.visible -eq $false) { Retry { $sh.Visible = 0 } }
      }
    }
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
          $fmt = if ($valObj.format) { $valObj.format } else { $valObj.numberFormat }
          if ($fmt) { $ws.Range($prop.Name).NumberFormat = [string]$fmt }
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
        }
      } else {
        $value = $valObj
        Retry { if ($value -is [string] -and $value.StartsWith("=")) { $ws.Range($prop.Name).Formula = $value } elseif ($value -is [string]) { $ws.Range($prop.Name).Value2 = $value } else { $ws.Range($prop.Name).Value2 = [double]$value } }
      }
    }
    foreach ($op in $scenario.ops) {
      switch ($op.type) {
        "setColWidth" { Retry { $ws.Columns($op.col).ColumnWidth = [double]$op.width } }
        "justify" {
          if ($op.colWidth) {
            $colLetter = $op.col
            if (-not $colLetter) { $colLetter = [regex]::Match($op.range, "^[A-Z]+").Value }
            Retry { $ws.Columns($colLetter).ColumnWidth = [double]$op.colWidth }
          }
          Retry { [void]$ws.Range($op.range).Justify() }
        }
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
        "autoFill" { Retry { [void]$ws.Range($op.src).AutoFill($ws.Range($op.dest), 0) } }
        "advancedFilter" { Retry { if ($op.copyTo) { [void]$ws.Range($op.list).AdvancedFilter(2, $ws.Range($op.criteria), $ws.Range($op.copyTo), [bool]$op.unique) } else { [void]$ws.Range($op.list).AdvancedFilter(1, $ws.Range($op.criteria), $missing, [bool]$op.unique) } } }
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
        "createTable" {
            $xlHeaders = if ($op.hasHeaders -eq $false) { 2 } else { 1 }
            $tbl = Retry { $ws.ListObjects.Add(1, $ws.Range($op.range), $missing, $xlHeaders) }
            if ($op.name) { Retry { $tbl.Name = [string]$op.name } }
          }
          "enterCell" {
            $targetCell = $ws.Range($op.coord)
            if ($op.formula) { Retry { $targetCell.Formula = [string]$op.formula } }
            elseif ($op.val -is [string] -and $op.val.StartsWith("=")) { Retry { $targetCell.Formula = [string]$op.val } }
            elseif ($op.val -is [string]) { Retry { $targetCell.Value2 = [string]$op.val } }
            elseif ($op.val -ne $null) { Retry { $targetCell.Value2 = [double]$op.val } }
            else { Retry { $targetCell.ClearContents() } }
          }
          "insertTableRow" {
            $tbl = if ($op.table) { $ws.ListObjects.Item($op.table) } else { $ws.ListObjects.Item(1) }
            if ($op.at) { Retry { [void]$tbl.ListRows.Add([int]$op.at) } }
            else { Retry { [void]$tbl.ListRows.Add() } }
          }
          "deleteTableRow" {
            $tbl = if ($op.table) { $ws.ListObjects.Item($op.table) } else { $ws.ListObjects.Item(1) }
            $idx = if ($op.at) { [int]$op.at } else { 1 }
            Retry { [void]$tbl.ListRows.Item($idx).Delete() }
          }
          "insertTableCol" {
            $tbl = if ($op.table) { $ws.ListObjects.Item($op.table) } else { $ws.ListObjects.Item(1) }
            if ($op.at) { Retry { [void]$tbl.ListColumns.Add([int]$op.at) } }
            else { Retry { [void]$tbl.ListColumns.Add() } }
          }
          "deleteTableCol" {
            $tbl = if ($op.table) { $ws.ListObjects.Item($op.table) } else { $ws.ListObjects.Item(1) }
            $idx = if ($op.at) { [int]$op.at } else { 1 }
            Retry { [void]$tbl.ListColumns.Item($idx).Delete() }
          }
          "resizeTable" {
            $tbl = if ($op.table) { $ws.ListObjects.Item($op.table) } else { $ws.ListObjects.Item(1) }
            Retry { [void]$tbl.Resize($ws.Range($op.range)) }
          }
          "toggleTableTotalRow" {
            $tbl = if ($op.table) { $ws.ListObjects.Item($op.table) } else { $ws.ListObjects.Item(1) }
            $show = if ($op.show -ne $null) { [bool]$op.show } else { -not $tbl.ShowTotals }
            Retry { $tbl.ShowTotals = $show }
          }
          "renameTable" {
            $tbl = if ($op.table) { $ws.ListObjects.Item($op.table) } else { $ws.ListObjects.Item(1) }
            Retry { $tbl.Name = [string]$op.newName }
          }
          "renameTableCol" {
            $tbl = if ($op.table) { $ws.ListObjects.Item($op.table) } else { $ws.ListObjects.Item(1) }
            $col = if ($op.col -is [int]) { $tbl.ListColumns.Item([int]$op.col) } else { $tbl.ListColumns.Item([string]$op.col) }
            Retry { $col.Name = [string]$op.newName }
          }
          "sortTable" {
            $tbl = if ($op.table) { $ws.ListObjects.Item($op.table) } else { $ws.ListObjects.Item(1) }
            $order = if ($op.order -eq 2) { 2 } else { 1 }
            Retry { [void]$tbl.Range.Sort($ws.Range($op.key), $order, $missing, $missing, 1, $missing, 1, 1) }
          }
          "filterTable" {
            $tbl = if ($op.table) { $ws.ListObjects.Item($op.table) } else { $ws.ListObjects.Item(1) }
            Retry { [void]$tbl.Range.AutoFilter([int]$op.field, [string]$op.value) }
          }
          "unlistTable" {
            $tbl = if ($op.table) { $ws.ListObjects.Item($op.table) } else { $ws.ListObjects.Item(1) }
            Retry { [void]$tbl.Unlist() }
          }
          "bringToFront" { Retry { $ws.Shapes.Item([string]$op.target).ZOrder(0) } }
          "sendToBack" { Retry { $ws.Shapes.Item([string]$op.target).ZOrder(1) } }
          "bringForward" { Retry { $ws.Shapes.Item([string]$op.target).ZOrder(2) } }
          "sendBackward" { Retry { $ws.Shapes.Item([string]$op.target).ZOrder(3) } }
          "align" {
            $alignCmd = switch ($op.alignment) {
              "left" { 0 }
              "center" { 1 }
              "right" { 2 }
              "top" { 3 }
              "middle" { 4 }
              "bottom" { 5 }
              default { 0 }
            }
            $targets = [string[]]$op.targets
            Retry { $ws.Shapes.Range($targets).Align($alignCmd, 0) }
          }
          "distribute" {
            $distCmd = switch ($op.direction) {
              "horizontal" { 0 }
              "vertical" { 1 }
              default { 0 }
            }
            $targets = [string[]]$op.targets
            Retry { $ws.Shapes.Range($targets).Distribute($distCmd, 0) }
          }
          "group" {
            $targets = [string[]]$op.targets
            Retry {
              $grp = $ws.Shapes.Range($targets).Group()
              if ($op.name) { $grp.Name = [string]$op.name }
            }
          }
          "ungroup" {
            Retry { [void]$ws.Shapes.Item([string]$op.target).Ungroup() }
          }
          "rotate" {
            Retry { $ws.Shapes.Item([string]$op.target).IncrementRotation([double]$op.angle) }
          }
          "flip" {
            $flipCmd = if ($op.direction -eq "vertical") { 1 } else { 0 }
            Retry { $ws.Shapes.Item([string]$op.target).Flip($flipCmd) }
          }
          "setShapeVisible" {
            $vis = if ($op.visible -eq $false) { 0 } else { -1 }
            Retry { $ws.Shapes.Item([string]$op.target).Visible = $vis }
          }
          "renameShape" {
            Retry { $ws.Shapes.Item([string]$op.target).Name = [string]$op.newName }
          }
          "setCalculationMode" {
            $mode = [string]$op.mode
            switch ($mode.ToLower()) {
              "auto" { Retry { $x.Calculation = -4105 } }
              "automatic" { Retry { $x.Calculation = -4105 } }
              "manual" { Retry { $x.Calculation = -4135 } }
              "autonotable" { Retry { $x.Calculation = 2 } }
            }
          }
          "setIteration" {
            Retry {
              $x.Iteration = [bool]$op.enabled
              if ($op.maxIterations) { $x.MaxIterations = [int]$op.maxIterations }
              if ($op.maxChange) { $x.MaxChange = [double]$op.maxChange }
            }
          }
          "setPrecisionAsDisplayed" {
            Retry { $wb.PrecisionAsDisplayed = [bool]$op.enabled }
          }
          "setDate1904" {
            Retry { $wb.Date1904 = [bool]$op.enabled }
          }
          "setReferenceStyle" {
            $style = if ($op.style -eq "R1C1") { -4150 } else { 1 }
            Retry { $x.ReferenceStyle = $style }
          }
          "calculateNow" {
            Retry { $x.Calculate() }
          }
          "calculateSheet" {
            Retry { $ws.Calculate() }
          }
          "enterR1C1Formula" {
            Retry { $ws.Range($op.coord).FormulaR1C1 = [string]$op.formula }
          }
          "breakLink" {
            $src = [string]$op.source
            $type = if ($op.typeParam) { [int]$op.typeParam } else { 1 }
            Retry { [void]$wb.BreakLink($src, $type) }
          }
          "changeLink" {
            $oldSrc = [string]$op.oldSource
            $newSrc = [string]$op.newSource
            $type = if ($op.typeParam) { [int]$op.typeParam } else { 1 }
            Retry { [void]$wb.ChangeLink($oldSrc, $newSrc, $type) }
          }
        }
      }
    if (-not $scenario.skipFinalCalculate -and $x.Calculation -ne -4135) {
      Retry { $x.Calculate() }
    }
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
    for ($r = 1; $r -le [Math]::Max($rows, 1); $r++) { if ($ws.Rows($r).Hidden) { $out["_H$r"] = [ordered]@{ f = "hidden"; v = $true } } }
    $tableData = @()
    foreach ($tbl in $ws.ListObjects) {
      $headers = @()
      foreach ($col in $tbl.ListColumns) {
        $headers += [string]$col.Name
      }
      $tableData += [ordered]@{
        name = [string]$tbl.Name
        range = [string]$tbl.Range.Address($false, $false)
        headers = $headers
        showTotals = [bool]$tbl.ShowTotals
      }
    }
    $shapeData = @()
    if ($ws.Shapes.Count -gt 0) {
      foreach ($shape in $ws.Shapes) {
        $shapeData += [ordered]@{
          name = [string]$shape.Name
          left = [Math]::Round([double]$shape.Left, 2)
          top = [Math]::Round([double]$shape.Top, 2)
          width = [Math]::Round([double]$shape.Width, 2)
          height = [Math]::Round([double]$shape.Height, 2)
          zOrder = [int]$shape.ZOrderPosition
          rotation = [Math]::Round(([double]$shape.Rotation % 360 + 360) % 360, 1)
          flipH = [bool]($shape.HorizontalFlip -ne 0)
          flipV = [bool]($shape.VerticalFlip -ne 0)
          visible = [bool]($shape.Visible -ne 0)
          type = [int]$shape.Type
        }
      }
    }
    $hasShapeOps = $false
    foreach ($op in $scenario.ops) {
      if ($op.type -in @("bringToFront", "sendToBack", "bringForward", "sendBackward", "align", "distribute", "group", "ungroup", "rotate", "flip", "setShapeVisible", "renameShape")) {
        $hasShapeOps = $true; break
      }
    }
    $shouldCompareShapes = ($scenario.shapes -ne $null -or $hasShapeOps)
    if ($tableData.Count -gt 0 -or $scenario.compareTables -or $hasTableOps -or $shouldCompareShapes) {
      $itemRes = [ordered]@{ cells = $out }
      if ($tableData.Count -gt 0 -or $scenario.compareTables -or $hasTableOps) {
        $itemRes["tables"] = $tableData
      }
      if ($shouldCompareShapes) {
        $itemRes["shapes"] = $shapeData
      }
      $results[$scenario.name] = $itemRes
    } else {
      $results[$scenario.name] = $out
    }
    Retry { $ws.Delete() } | Out-Null
    Retry {
      $x.Calculation = -4105
      $x.Iteration = $false
      $x.MaxIterations = 100
      $x.MaxChange = 0.001
      $x.ReferenceStyle = 1
      $wb.PrecisionAsDisplayed = $false
      $wb.Date1904 = $false
    }
  }
  ($results | ConvertTo-Json -Depth 6 -Compress) | Set-Content -LiteralPath $OutputJson -Encoding UTF8
  Retry { $wb.Close($false) }
} finally { try { $x.Quit() } catch {} }
