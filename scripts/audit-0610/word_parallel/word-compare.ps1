param([string]$Dir)
$ErrorActionPreference="Continue"
$ops=@('bold','italic','underline','strike','subscript','superscript','size16','fontArial','colorRed','highlightYellow','alignCenter','alignRight','alignJustify','bullet','numbered','indentInc','lineSpacing15','spaceBefore12','spaceAfter12','caseUpper','default')
$existingWordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | ForEach-Object { [int]$_.ProcessId })
$wordPids=@()
$w=New-Object -ComObject Word.Application; $w.Visible=$false; $w.DisplayAlerts=0
function Find-Para($d){ foreach($p in $d.Paragraphs){ if($p.Range.Text -match 'Alpha|ALPHA|alpha'){ return $p } } return $null }
function Props($path){
  $d=$w.Documents.Open($path,$false,$true)
  try { $p=Find-Para $d; if(-not $p){ return @{ERR='khong thay doan'} }
    $r=$p.Range; $f=$r.Font; $pf=$p.Format
    return [ordered]@{ Bold=[int]$f.Bold; Italic=[int]$f.Italic; Underline=[int]$f.Underline; Strike=[int]$f.StrikeThrough; Sub=[int]$f.Subscript; Sup=[int]$f.Superscript; Size=[double]$f.Size; Name=[string]$f.Name; Color=[int]$f.Color; Highlight=[int]$r.HighlightColorIndex; Align=[int]$pf.Alignment; LeftIndent=[math]::Round([double]$pf.LeftIndent,1); SpaceBefore=[math]::Round([double]$pf.SpaceBefore,1); SpaceAfter=[math]::Round([double]$pf.SpaceAfter,1); LineRule=[int]$pf.LineSpacingRule; ListType=[int]$r.ListFormat.ListType; Text=($r.Text.Trim()) }
  } finally { $d.Close(0) }
}
try {
  $bootstrap=$w.Documents.Add()
  $wordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existingWordPids } | ForEach-Object { [int]$_.ProcessId })
  if ($wordPids.Count -eq 0) { throw "Không tìm thấy PID Word Automation do phiên này khởi tạo." }
  Write-Output "Word COM PID: $($wordPids -join ',')"
  $bootstrap.Close(0)
  foreach($op in $ops){
    $out="$Dir\word_$op.docx"; Copy-Item "$Dir\template.docx" $out -Force
    $d=$w.Documents.Open($out,$false,$false); $p=Find-Para $d; $r=$p.Range; $r.MoveEnd(1,-1) | Out-Null
    switch($op){
      'default'{}
      'bold'{$r.Font.Bold=-1}; 'italic'{$r.Font.Italic=-1}; 'underline'{$r.Font.Underline=1}; 'strike'{$r.Font.StrikeThrough=-1}
      'subscript'{$r.Font.Subscript=-1}; 'superscript'{$r.Font.Superscript=-1}; 'size16'{$r.Font.Size=16}; 'fontArial'{$r.Font.Name='Arial'}
      'colorRed'{$r.Font.Color=255}; 'highlightYellow'{$r.HighlightColorIndex=7}
      'alignCenter'{$p.Format.Alignment=1}; 'alignRight'{$p.Format.Alignment=2}; 'alignJustify'{$p.Format.Alignment=3}
      'bullet'{$r.ListFormat.ApplyBulletDefault()}; 'numbered'{$r.ListFormat.ApplyNumberDefault()}
      'indentInc'{$p.Indent()}; 'lineSpacing15'{$p.Format.LineSpacingRule=1}
      'spaceBefore12'{$p.Format.SpaceBefore=12}; 'spaceAfter12'{$p.Format.SpaceAfter=12}; 'caseUpper'{$r.Case=0}
    }
    $d.Save(); $d.Close(0)
  }
  $rows=@()
  foreach($op in $ops){
    $app="$Dir\app_$op.docx"; $word="$Dir\word_$op.docx"
    if(-not (Test-Path $app)){ $rows += [pscustomobject]@{op=$op; ket_qua='THIEU tep app'; khac=''}; continue }
    $a=Props $app; $b=Props $word; $diff=@()
    foreach($k in $b.Keys){ if("$($a[$k])" -ne "$($b[$k])"){ $diff += "$k app=$($a[$k]) | Word=$($b[$k])" } }
    $rows += [pscustomobject]@{op=$op; ket_qua=$(if($diff.Count -eq 0){'KHOP'}else{'LECH'}); khac=($diff -join ' ; ')}
  }
  $rows | Format-Table -AutoSize -Wrap | Out-String -Width 250
} finally {
  if ($w) { $w.Quit(); [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($w) }
  $wordPids=@($wordPids + @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existingWordPids } | ForEach-Object { [int]$_.ProcessId }) | Select-Object -Unique)
  foreach($wordPid in $wordPids){
    $ownWord=Get-Process -Id $wordPid -ErrorAction SilentlyContinue
    if ($ownWord) { $ownWord | Wait-Process -Timeout 3 -ErrorAction SilentlyContinue }
    if (Get-Process -Id $wordPid -ErrorAction SilentlyContinue) { Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue }
  }
}
