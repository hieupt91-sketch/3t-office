param([Parameter(Mandatory = $true)][string]$Path)
$x = $null
for ($a = 0; $a -lt 30 -and -not $x; $a++) { try { $x = New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 700 } }
try {
  try { $x.DisplayAlerts = $false } catch {}
  $wb = $null
  for ($a = 0; $a -lt 30 -and -not $wb; $a++) { try { $wb = $x.Workbooks.Open($Path, 0, $true) } catch { Start-Sleep -Milliseconds 700 } }
  if (-not $wb) { Write-Output '{"ReadOnly":false,"OpenFailed":true}'; return }
  $sheet = $null
  for ($a = 0; $a -lt 30 -and -not $sheet; $a++) { try { $sheet = $wb.Worksheets.Item(1) } catch { Start-Sleep -Milliseconds 700 } }
  $result = $null
  for ($a = 0; $a -lt 30 -and -not $result; $a++) {
    try {
      $result = @{
        ReadOnly = $wb.ReadOnly
        Linear = @(1..5 | ForEach-Object { $sheet.Range("G$_").Value2 })
        Growth = @("H","I","J","K","L" | ForEach-Object { $sheet.Range("${_}20").Value2 })
        Up = $sheet.Range("A1").Value2
        Left = $sheet.Range("B10").Value2
      }
    } catch { Start-Sleep -Milliseconds 700 }
  }
  $result | ConvertTo-Json -Compress
  $wb.Close($false)
} finally { try { $x.Quit() } catch {} }
