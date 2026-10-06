param([string]$Name)
$w=Get-Content "E:\VNOffice-profiles\d29\$Name-wt.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$a=Get-Content "E:\VNOffice-profiles\d29\$Name-at.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$wt=@($w); $at=@($a); $tot=0; $big=@()
for($i=0;$i -lt [Math]::Min($wt.Count,$at.Count);$i++){ $wr=@($wt[$i].rows); $ar=@($at[$i].rows)
  for($k=0;$k -lt $wr.Count-1;$k++){ if($wr[$k].p -eq $wr[$k+1].p -and $k -lt $ar.Count){ $wp=$wr[$k+1].y-$wr[$k].y; $d=$ar[$k].h-$wp; $tot+=$d; if([math]::Abs($d) -gt 5){ $big += "T$($i+1) r$($wr[$k].r) word=$([math]::Round($wp,1)) app=$($ar[$k].h) diff=$([math]::Round($d,1)) | $($ar[$k].t)" } } } }
"$Name : tables word=$($wt.Count) app=$($at.Count); tong lech chieu cao (app-word, cac hang cung trang) = $([math]::Round($tot,1)) pt; hang lech >5pt: $($big.Count)"
$big | Select-Object -First 12