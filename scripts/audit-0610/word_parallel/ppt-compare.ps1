param([string]$Dir)
$ops=@('bold','italic','underline','strike','fontGrow','fontTimes','colorDefault','alignCenter','alignRight','alignJustify','bullet','numbered','lineSpacing15','slideNew','slideDuplicate','slideHide')
$before=@(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id)
$p=New-Object -ComObject PowerPoint.Application
function Props($path){
  $pr=$p.Presentations.Open($path,-1,0,0)   # ReadOnly, Untitled, WithWindow=false
  try { $s=$pr.Slides.Item(1); $tb=$null; foreach($sh in $s.Shapes){ if($sh.HasTextFrame -and $sh.TextFrame.TextRange.Text -match 'Alpha'){ $tb=$sh; break } }
    $r=[ordered]@{ Slides=[int]$pr.Slides.Count; Hidden1=[int]$s.SlideShowTransition.Hidden }
    if($tb){ $tr=$tb.TextFrame.TextRange; $r.Bold=[int]$tr.Font.Bold; $r.Italic=[int]$tr.Font.Italic; $r.Underline=[int]$tr.Font.Underline; $r.Size=[double]$tr.Font.Size; $r.Name=[string]$tr.Font.Name; $r.Color=[int]$tr.Font.Color.RGB; $r.Align=[int]$tr.ParagraphFormat.Alignment; $r.Bullet=[int]$tr.ParagraphFormat.Bullet.Visible; $r.BulletType=[int]$tr.ParagraphFormat.Bullet.Type; $r.SpaceWithin=[math]::Round([double]$tr.ParagraphFormat.SpaceWithin,2); $r.LineRule=[int]$tr.ParagraphFormat.LineRuleWithin; $r.Strike=[int]$tr.Font.StrikeThrough } else { $r.TB='khong thay' }
    $r } finally { $pr.Close() } }
try {
  foreach($op in $ops){
    $out="$Dir\ppt_$op.pptx"; Copy-Item "$Dir\template.pptx" $out -Force
    $pr=$p.Presentations.Open($out,0,0,0); $s=$pr.Slides.Item(1); $tb=$null; foreach($sh in $s.Shapes){ if($sh.Name -eq 'TB1'){ $tb=$sh } }; $tr=$tb.TextFrame.TextRange
    switch($op){
      'bold'{$tr.Font.Bold=-1}; 'italic'{$tr.Font.Italic=-1}; 'underline'{$tr.Font.Underline=-1}; 'strike'{ $tb.TextFrame2.TextRange.Font.Strike=1 }
      'fontGrow'{ $tr.Font.Size=20 }   # Increase Font Size cua PowerPoint: 18 -> 20
      'fontTimes'{$tr.Font.Name='Times New Roman'}; 'colorDefault'{$tr.Font.Color.RGB=255}
      'alignCenter'{$tr.ParagraphFormat.Alignment=2}; 'alignRight'{$tr.ParagraphFormat.Alignment=3}; 'alignJustify'{$tr.ParagraphFormat.Alignment=4}
      'bullet'{$tr.ParagraphFormat.Bullet.Visible=-1; $tr.ParagraphFormat.Bullet.Type=1}; 'numbered'{$tr.ParagraphFormat.Bullet.Visible=-1; $tr.ParagraphFormat.Bullet.Type=2}
      'lineSpacing15'{$tr.ParagraphFormat.LineRuleWithin=-1; $tr.ParagraphFormat.SpaceWithin=1.5}
      'slideNew'{ [void]$pr.Slides.Add(2,12) }; 'slideDuplicate'{ [void]$s.Duplicate() }; 'slideHide'{ $s.SlideShowTransition.Hidden=-1 }
    }
    $pr.Save(); $pr.Close()
  }
  $rows=@()
  foreach($op in $ops){
    $app="$Dir\app_$op.pptx"; if(-not (Test-Path $app)){ $rows += [pscustomobject]@{op=$op; ket_qua='THIEU'; khac=''}; continue }
    $a=Props $app; $b=Props "$Dir\ppt_$op.pptx"; $diff=@()
    foreach($k in $b.Keys){ if("$($a[$k])" -ne "$($b[$k])"){ $diff += "$k app=$($a[$k]) | PPT=$($b[$k])" } }
    $rows += [pscustomobject]@{op=$op; ket_qua=$(if($diff.Count -eq 0){'KHOP'}else{'LECH'}); khac=($diff -join ' ; ')}
  }
  $rows | Format-Table -AutoSize -Wrap | Out-String -Width 260
} finally { try { $p.Quit() } catch {} }
Start-Sleep -Milliseconds 800; $after=@(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id) | ? { $_ -notin $before }; foreach($i in $after){ Stop-Process -Id $i -Force -ErrorAction SilentlyContinue }