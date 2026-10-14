param(
  [Parameter(Mandatory = $true)][string]$InputJson,
  [Parameter(Mandatory = $true)][string]$OutputJson,
  [string]$DataFile = ""
)
# Oracle hàm: Excel 2016 thật (COM) tính từng công thức bằng Application.Evaluate (không mở, không ghi, không lưu tệp nào).
# Excel chưa kích hoạt không cho nhập ô, nên dữ liệu được truyền bằng hằng mảng {1,2;3,4} do function_oracle.mjs dựng sẵn.
$ErrorActionPreference = "Stop"
$spec = Get-Content -LiteralPath $InputJson -Raw -Encoding UTF8 | ConvertFrom-Json
$x = $null
for ($a = 0; $a -lt 30 -and -not $x; $a++) { try { $x = New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 700 } }
if (-not $x) { throw "Không khởi động được Excel" }
function Retry([scriptblock]$Block) { for ($a = 0; $a -lt 40; $a++) { try { return (& $Block) } catch { if ($a -eq 39) { throw }; Start-Sleep -Milliseconds 500 } } }
$errorNames = @{ -2146826281 = "#DIV/0!"; -2146826246 = "#N/A"; -2146826259 = "#NAME?"; -2146826288 = "#NULL!"; -2146826252 = "#NUM!"; -2146826265 = "#REF!"; -2146826273 = "#VALUE!" }
try {
  Retry { $x.DisplayAlerts = $false }
  for ($a = 0; $a -lt 120; $a++) { try { if ($x.Ready) { break } } catch {}; Start-Sleep -Milliseconds 500 }
  $evaluator = $x
  $wb = $null
  if ($DataFile) {
    for ($a = 0; $a -lt 90 -and -not $wb; $a++) { try { $wb = $x.Workbooks.Open($DataFile, 0, $true) } catch { Start-Sleep -Milliseconds 700 } }
    if (-not $wb) { throw "Không mở được tệp dữ liệu oracle" }
    Start-Sleep -Seconds 2
    $sheetObj = $null
    for ($a = 0; $a -lt 60 -and -not $sheetObj; $a++) { try { $sheetObj = $wb.Worksheets.Item(1) } catch { Start-Sleep -Milliseconds 700 } }
    if (-not $sheetObj) { throw "Không lấy được trang tính oracle" }
    $evaluator = $sheetObj
  }
  $results = New-Object System.Collections.ArrayList
  foreach ($f in $spec.formulas) {
    $item = [ordered]@{ formula = $f; type = "error"; value = $null }
    try {
      $r = $null
      for ($a = 0; $a -lt 40 -and $null -eq $r; $a++) { try { $r = $evaluator.Evaluate($f) } catch { if ($a -eq 39) { throw }; Start-Sleep -Milliseconds 500 } }
      if ($r -is [int] -and $errorNames.ContainsKey([int]$r)) { $item.type = "error"; $item.value = $errorNames[[int]$r] }
      elseif ($r -is [double] -or $r -is [int] -or $r -is [decimal] -or $r -is [long]) { $item.type = "number"; $item.value = [double]$r }
      elseif ($r -is [string]) { $item.type = "string"; $item.value = $r }
      elseif ($r -is [bool]) { $item.type = "boolean"; $item.value = $r }
      elseif ($r -is [System.Array]) {
        $flat = @()
        foreach ($cell in $r) { if ($cell -is [int] -and $errorNames.ContainsKey([int]$cell)) { $flat += $errorNames[[int]$cell] } else { $flat += $cell } }
        $item.type = "array"; $item.value = $flat
      }
      else { $item.type = "other"; $item.value = "$r" }
    } catch { $item.type = "exception"; $item.value = $_.Exception.Message }
    [void]$results.Add($item)
  }
  ($results | ConvertTo-Json -Depth 5 -Compress) | Set-Content -LiteralPath $OutputJson -Encoding UTF8
  if ($wb) { try { $wb.Close($false) } catch {} }
} finally { try { $x.Quit() } catch {} }
