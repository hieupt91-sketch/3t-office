# Word COM: moi hang cua moi bang cap cao nhat (trang, y pt) -> JSON. Chay canh word_dialog_dismisser.ps1.
param([Parameter(Mandatory=$true)][string]$File,[Parameter(Mandatory=$true)][string]$Out,[int]$MaxRowsPerTable=400)
$ErrorActionPreference="Stop"
$before=@(Get-Process WINWORD -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$w=New-Object -ComObject Word.Application; Start-Sleep 3; $wp=(Get-Process WINWORD | Where-Object { $before -notcontains $_.Id } | Select-Object -First 1).Id
try {
  $w.Visible=$false; $w.DisplayAlerts=0
  $d=$w.Documents.Open((Resolve-Path -LiteralPath $File).Path,$false,$true,$false)
  try { $w.ActiveWindow.View.Type = 3 } catch {}; $d.Repaginate() | Out-Null
  $res=@(); $ti=0
  foreach($t in $d.Tables){ $ti++
    if($t.NestingLevel -gt 1){ continue }
    $rows=@(); $n=[Math]::Min($t.Rows.Count,$MaxRowsPerTable)
    for($r=1;$r -le $n;$r++){ try { $c=$t.Cell($r,1); $rg=$c.Range.Duplicate; $rg.SetRange($rg.Start,$rg.Start); $rows += [pscustomobject]@{ r=$r; p=[int]$rg.Information(3); y=[math]::Round([double]$rg.Information(6),1) } } catch { } }
    $res += [pscustomobject]@{ table=$ti; rows=$rows }
  }
  $res | ConvertTo-Json -Depth 5 | Set-Content -Path $Out -Encoding UTF8
  "OK tables=" + $res.Count
  $d.Saved=$true; $d.Close(0)
} finally { try { $w.Quit() } catch {}; Start-Sleep 1; if($wp){ Stop-Process -Id $wp -Force -ErrorAction SilentlyContinue } }