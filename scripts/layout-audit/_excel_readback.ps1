# Doc lai file XLSX bang Excel 2016 COM va doi chieu voi <file>.expected.json (sinh boi _create_new_sheet.py).
# Usage: powershell -File _excel_readback.ps1 -File out.xlsx
param([string]$File)
Add-Type -AssemblyName System.Web.Extensions
$json = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$expected = $json.DeserializeObject([IO.File]::ReadAllText("$File.expected.json", [Text.Encoding]::UTF8))
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false; $excel.DisplayAlerts = $false
$hex = { param($v) "#{0:X2}{1:X2}{2:X2}" -f ($v -band 0xFF), (($v -shr 8) -band 0xFF), (($v -shr 16) -band 0xFF) }
$diffs = 0; $checks = 0
function Compare-Value([string]$label, $want, $got) {
  $script:checks++
  if (($want -is [double] -or $want -is [int] -or $want -is [decimal]) -and $null -ne $got) {
    $gotNumber = 0.0
    if ([double]::TryParse("$got", [ref]$gotNumber) -and [math]::Abs($gotNumber - [double]$want) -lt 1e-6) { $got = $want }
  }
  if ("$got" -ne "$want") { $script:diffs++; "$label`: expected [$want] Excel [$got]" }
}
try {
  $wb = $excel.Workbooks.Open((Resolve-Path $File).Path, 0, $true)
  if ($expected["scenario"] -eq 2) {
    Compare-Value "workbook.sheetCount" $expected["workbook"]["sheetCount"] $wb.Worksheets.Count
    for ($i = 0; $i -lt $expected["workbook"]["sheetNames"].Count; $i++) {
      Compare-Value "workbook.sheetNames[$i]" $expected["workbook"]["sheetNames"][$i] $wb.Worksheets.Item($i + 1).Name
    }
    foreach ($sheetName in $expected["sheets"].Keys) {
      $sheetExpected = $expected["sheets"][$sheetName]
      $ws = $wb.Worksheets.Item($sheetName)
      $ws.Activate()
      if ($sheetExpected.ContainsKey("window")) {
        Compare-Value "$sheetName.window.splitRow" $sheetExpected["window"]["splitRow"] $excel.ActiveWindow.SplitRow
        Compare-Value "$sheetName.window.splitColumn" $sheetExpected["window"]["splitColumn"] $excel.ActiveWindow.SplitColumn
        Compare-Value "$sheetName.window.freezePanes" $sheetExpected["window"]["freezePanes"] ([bool]$excel.ActiveWindow.FreezePanes)
      }
      foreach ($coord in $sheetExpected["cells"].Keys) {
        $r = $ws.Range($coord)
        foreach ($prop in $sheetExpected["cells"][$coord].Keys) {
          $want = $sheetExpected["cells"][$coord][$prop]; $got = $null
          switch ($prop) {
            "value" { $got = $r.Value2 }
            "formula" { $got = $r.Formula }
            "numFmtContains" { $got = $r.NumberFormat; if ("$got" -like "*$want*") { $got = $want } }
            "numberFormat" { $got = $r.NumberFormat }
            "bottomBorderStyle" { $got = $r.Borders.Item(9).LineStyle }
            "fill" { $got = & $hex ([int]$r.Interior.Color) }
            "color" { $got = & $hex ([int]$r.Font.Color) }
            "comment" { if ($null -ne $r.Comment) { $got = $r.Comment.Text() } }
            "halign" { $got = @{ "-4108" = "center"; "-4131" = "left"; "-4152" = "right"; "1" = "general" }[[string][int]$r.HorizontalAlignment] }
            "valign" { $got = @{ "-4160" = "top"; "-4108" = "center"; "-4107" = "bottom" }[[string][int]$r.VerticalAlignment] }
            "orientation" { $got = $r.Orientation }
            "indentLevel" { $got = $r.IndentLevel }
          }
          Compare-Value "$sheetName.$coord.$prop" $want $got
        }
      }
      foreach ($address in $sheetExpected["ranges"].Keys) {
        $r = $ws.Range($address); $rangeExpected = $sheetExpected["ranges"][$address]
        foreach ($prop in $rangeExpected.Keys) {
          $want = $rangeExpected[$prop]; $got = $null
          switch ($prop) {
            "outsideBorderWeight" { $got = $r.Borders.Item(7).Weight }
            "insideHorizontalWeight" { $got = $r.Borders.Item(12).Weight }
            "formatConditionCount" { $got = $r.FormatConditions.Count }
            "formatConditionType" { if ($r.FormatConditions.Count -gt 0) { $got = $r.FormatConditions.Item(1).Type } }
            "formatConditionFormula1" { if ($r.FormatConditions.Count -gt 0) { $got = $r.FormatConditions.Item(1).Formula1 } }
            "formatConditionFill" { if ($r.FormatConditions.Count -gt 0) { $got = & $hex ([int]$r.FormatConditions.Item(1).Interior.Color) } }
            "validationType" { $got = $r.Validation.Type }
            "validationFormula1Contains" { $got = $r.Validation.Formula1; if ("$got" -like "*$want*") { $got = $want } }
          }
          Compare-Value "$sheetName.$address.$prop" $want $got
        }
      }
      foreach ($column in $sheetExpected["columns"].Keys) {
        $r = $ws.Columns.Item($column)
        foreach ($prop in $sheetExpected["columns"][$column].Keys) {
          $want = $sheetExpected["columns"][$column][$prop]
          if ($prop -eq "widthGreaterThan") { $checks++; if ([double]$r.ColumnWidth -le [double]$want) { $diffs++; "$sheetName.COL $column widthGreaterThan: expected > [$want] Excel [$($r.ColumnWidth)]" } }
          if ($prop -eq "hidden") { Compare-Value "$sheetName.COL $column.hidden" $want ([bool]$r.Hidden) }
        }
      }
      foreach ($row in $sheetExpected["rows"].Keys) { Compare-Value "$sheetName.ROW $row.hidden" $sheetExpected["rows"][$row]["hidden"] ([bool]$ws.Rows.Item([int]$row).Hidden) }
      if ($sheetExpected.ContainsKey("autoFilter")) {
        Compare-Value "$sheetName.autoFilter.enabled" $sheetExpected["autoFilter"]["enabled"] ([bool]$ws.AutoFilterMode)
        $filterAddress = $null; if ($ws.AutoFilterMode) { $filterAddress = $ws.AutoFilter.Range.Address() }
        Compare-Value "$sheetName.autoFilter.range" $sheetExpected["autoFilter"]["range"] $filterAddress
      }
      if ($sheetExpected.ContainsKey("pageSetup")) {
        $page = $sheetExpected["pageSetup"]
        Compare-Value "$sheetName.pageSetup.orientation" $page["orientation"] $ws.PageSetup.Orientation
        Compare-Value "$sheetName.pageSetup.paperSize" $page["paperSize"] $ws.PageSetup.PaperSize
        $cm = [math]::Round($ws.PageSetup.LeftMargin / 72 * 2.54, 2)
        Compare-Value "$sheetName.pageSetup.marginCm" $page["marginCm"] $cm
        Compare-Value "$sheetName.pageSetup.printTitleRows" $page["printTitleRows"] $ws.PageSetup.PrintTitleRows
        Compare-Value "$sheetName.pageSetup.printArea" $page["printArea"] $ws.PageSetup.PrintArea
      }
    }
    $wb.Close($false)
    "CHECKS=$checks DIFFS=$diffs"
    return
  }
  $ws = $wb.Worksheets.Item(1)
  foreach ($key in $expected.Keys) {
    $exp = $expected[$key]
    if ($key -match '^\d+$') {
      $checks++; $px = [math]::Round($ws.Rows.Item([int]$key).Height * 96 / 72)
      if ([math]::Abs($px - $exp["rowHeightPx"]) -gt 1) { $diffs++; "ROW $key height: expected $($exp['rowHeightPx']) px, Excel $px px" }
      continue
    }
    if ($key -match '^[A-Z]+$') {
      $checks++; $px = [math]::Round($ws.Columns.Item($key).Width * 96 / 72)
      if ([math]::Abs($px - $exp["colWidthPx"]) -gt 1) { $diffs++; "COL $key width: expected $($exp['colWidthPx']) px, Excel $px px" }
      continue
    }
    $r = $ws.Range($key)
    foreach ($prop in $exp.Keys) {
      $checks++; $want = $exp[$prop]; $got = $null
      switch ($prop) {
        "value"   { $got = $r.Value2; if ($want -is [double] -or $want -is [int] -or $want -is [decimal]) { if ([math]::Abs([double]$got - [double]$want) -lt 1e-6) { $got = $want } } }
        "formula" { $got = $r.Formula }
        "bold"    { $got = [bool]$r.Font.Bold }
        "italic"  { $got = [bool]$r.Font.Italic }
        "underline" { $got = ($r.Font.Underline -ne -4142) }
        "font"    { $got = $r.Font.Name }
        "size"    { $got = [double]$r.Font.Size }
        "color"   { $got = & $hex ([int]$r.Font.Color) }
        "fill"    { $got = & $hex ([int]$r.Interior.Color) }
        "halign"  { $got = @{ "-4108" = "center"; "-4131" = "left"; "-4152" = "right"; "1" = "general" }[[string][int]$r.HorizontalAlignment] }
        "valign"  { $got = @{ "-4160" = "top"; "-4108" = "center"; "-4107" = "bottom" }[[string][int]$r.VerticalAlignment] }
        "wrap"    { $got = [bool]$r.WrapText }
        "mergeArea" { $got = $r.MergeArea.Address() }
        "numFmtContains" { $got = $r.NumberFormat; if ($got -like "*$want*") { $got = $want } }
        "borders" { $got = ($r.Borders.Item(7).LineStyle -ne -4142) -and ($r.Borders.Item(8).LineStyle -ne -4142) -and ($r.Borders.Item(9).LineStyle -ne -4142) -and ($r.Borders.Item(10).LineStyle -ne -4142) }
      }
      if ("$got" -ne "$want") { $diffs++; "$key.$prop`: expected [$want] Excel [$got]" }
    }
  }
  $wb.Close($false)
} finally { $excel.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel) }
"CHECKS=$checks DIFFS=$diffs"
