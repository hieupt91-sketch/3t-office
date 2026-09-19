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
try {
  $wb = $excel.Workbooks.Open((Resolve-Path $File).Path, 0, $true)
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
