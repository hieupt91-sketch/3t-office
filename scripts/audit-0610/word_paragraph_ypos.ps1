# Word COM: toa do doc (pt tu dinh trang) cua moi doan chinh (khong trong bang) -> JSON. Chay canh word_dialog_dismisser.ps1.
param([Parameter(Mandatory=$true)][string]$File,[Parameter(Mandatory=$true)][string]$Out,[int]$MaxPage=99)
$ErrorActionPreference="Stop"
function WR([scriptblock]$B,[int]$N=30){ for($__a=0;$__a -lt $N;$__a++){ try { return (& $B) } catch { if($_.Exception.Message -notmatch "rejected|busy|RPC|0x8001010A|0x80010001"){ throw }; Start-Sleep -Milliseconds 700 } }; throw "Word tu choi" }
$word=$null; $doc=$null
try {
  $before=@(Get-Process WINWORD -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
  $word=New-Object -ComObject Word.Application; Start-Sleep -Seconds 3
  $wp=(Get-Process WINWORD | Where-Object { $before -notcontains $_.Id } | Select-Object -First 1).Id
  $word.Visible=$false; $word.DisplayAlerts=0
  $doc=WR { $word.Documents.Open((Resolve-Path -LiteralPath $File).Path, $false, $true, $false) }
  try { $word.ActiveWindow.View.Type = 3 } catch { }
  WR { $doc.Repaginate() } | Out-Null
  $rows=New-Object System.Collections.Generic.List[object]
  $n=WR { $doc.Paragraphs.Count }
  for($i=1;$i -le $n;$i++){
    $p=WR { $doc.Paragraphs.Item($i) }; $rg=$p.Range
    if(WR { $rg.Information(12) }){ continue }   # trong bang
    $pt=$rg.Duplicate; $pt.SetRange($rg.Start,$rg.Start)
    $pg=[int](WR { $pt.Information(3) }); if($pg -gt $MaxPage){ break }
    $y=[double](WR { $pt.Information(6) })
    $t=([string]$rg.Text -replace "[`r`n`a`t]+"," ").Trim(); if($t.Length -gt 60){ $t=$t.Substring(0,60) }
    $rows.Add([pscustomobject]@{ page=$pg; y=$y; text=$t; sb=[double]$p.SpaceBefore; sa=[double]$p.SpaceAfter; ls=[double]$p.LineSpacing; rule=[int]$p.LineSpacingRule; size=[double]$rg.Font.Size })
  }
  $rows | ConvertTo-Json -Depth 3 | Set-Content -Path $Out -Encoding UTF8
  "OK paragraphs=" + $rows.Count
} finally {
  try { if($doc){ $doc.Saved=$true; $doc.Close(0) } } catch {}
  try { if($word){ $word.Quit() } } catch {}
  Start-Sleep 1; if($wp){ Stop-Process -Id $wp -Force -ErrorAction SilentlyContinue }
}