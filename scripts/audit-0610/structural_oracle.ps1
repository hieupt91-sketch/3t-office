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
      $value = $prop.Value
      Retry { if ($value -is [string] -and $value.StartsWith("=")) { $ws.Range($prop.Name).Formula = $value } elseif ($value -is [string]) { $ws.Range($prop.Name).Value2 = $value } else { $ws.Range($prop.Name).Value2 = [double]$value } }
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
        "copyPaste" { Retry { $ws.Range($op.from).Copy($ws.Range($op.to)) | Out-Null } }
        "cutPaste" { Retry { $ws.Range($op.from).Cut($ws.Range($op.to)) | Out-Null } }
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
        if ($f -eq "") { continue }
        $v = $cell.Value2
        if ($v -is [int] -and $errorNames.ContainsKey([int]$v)) { $v = $errorNames[[int]$v] }
        $address = $cell.Address($false, $false)
        $out[$address] = [ordered]@{ f = $f; v = $v }
      }
    }
    $results[$scenario.name] = $out
    Retry { $ws.Delete() } | Out-Null
  }
  ($results | ConvertTo-Json -Depth 6 -Compress) | Set-Content -LiteralPath $OutputJson -Encoding UTF8
  Retry { $wb.Close($false) }
} finally { try { $x.Quit() } catch {} }
