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
        E2Formula = $sheet.Range("E2").Formula; E2Value = $sheet.Range("E2").Value2
        D3Formula = $sheet.Range("D3").Formula; D3Value = $sheet.Range("D3").Value2
        E5Formula = $sheet.Range("E5").Formula; E5Value = $sheet.Range("E5").Value2
        Tables = @($sheet.ListObjects | ForEach-Object { $_.Name })
      }
    } catch { Start-Sleep -Milliseconds 700 }
  }
  $result | ConvertTo-Json -Compress
  $wb.Close($false)
} finally { try { $x.Quit() } catch {} }
