param([string]$File)
# Doc cac luat dinh dang co dieu kien do VN Sheet luu, bang Excel 2016 that (ReadOnly, chi doc).
$x = $null
for ($a = 0; $a -lt 20 -and -not $x; $a++) { try { $x = New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 500 } }
$out = @()
try {
  try { $x.DisplayAlerts = $false } catch {}
  $wb = $null
  for ($a = 0; $a -lt 25 -and -not $wb; $a++) { try { $wb = $x.Workbooks.Open($File, 0, $true) } catch { Start-Sleep -Milliseconds 700 } }
  if (-not $wb) { "OPEN FAILED"; return }
  $ws = $wb.Worksheets.Item(1)
  foreach ($col in "B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T") {
    $fc = $ws.Range("${col}1:${col}6").FormatConditions
    $n = [int]$fc.Count
    for ($i = 1; $i -le $n; $i++) {
      $c = $fc.Item($i)
      $row = [ordered]@{ col = $col; type = [int]$c.Type; applies = [string]$c.AppliesTo.Address($false,$false) }
      try { $row.operator = [int]$c.Operator } catch {}
      try { $row.f1 = [string]$c.Formula1 } catch {}
      try { $row.f2 = [string]$c.Formula2 } catch {}
      try { $row.text = [string]$c.Text } catch {}
      try { $row.rank = [int]$c.Rank; $row.topBottom = [int]$c.TopBottom; $row.percent = [bool]$c.Percent } catch {}
      try { $row.aboveBelow = [int]$c.AboveBelow } catch {}
      try { $row.dupUnique = [int]$c.DupeUnique } catch {}
      try { $row.timePeriod = [int]$c.DateOperator } catch {}
      try { if ($c.Type -eq 4) { $row.dbColor = [int]$c.BarColor.Color } } catch {}
      try { if ($c.Type -eq 3) { $row.criteria = [int]$c.ColorScaleCriteria.Count; $row.c1 = [int]$c.ColorScaleCriteria.Item(1).FormatColor.Color } } catch {}
      try { if ($c.Type -eq 6) { $row.iconSet = [int]$c.IconSet.ID } } catch {}
      $out += [pscustomobject]$row
    }
  }
  $out | ConvertTo-Json -Compress -Depth 3
  $wb.Close($false)
} finally { try { $x.Quit() } catch {} }
