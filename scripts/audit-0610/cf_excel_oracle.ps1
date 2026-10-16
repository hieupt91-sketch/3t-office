param([string]$Spec='E:\VNOffice-briefs\cfdiff\spec.json',[string]$Out='E:\VNOffice-briefs\cfdiff\excel.json')
function Retry([scriptblock]$b){ $last=$null; for($k=0;$k -lt 25;$k++){ try { return (& $b) } catch { $last=$_; if($_.Exception.Message -notmatch 'rejected|busy|RPC') { break }; Start-Sleep -Milliseconds 700 } }; throw ("Excel loi: "+$last.Exception.Message+" @ "+$b.ToString().Trim()) }
$cases = Get-Content -Raw -Encoding UTF8 $Spec | ConvertFrom-Json
$before=@(Get-Process EXCEL -ErrorAction SilentlyContinue | % Id)
$x=$null; for($a=0;$a -lt 30 -and -not $x;$a++){ try { $x=New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 700 } }
if(-not $x){ throw "Khong khoi dong duoc Excel" }
$mine=@(Get-Process EXCEL -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
$res=@()
try {
  Retry { $x.DisplayAlerts=$false } | Out-Null
  $wb = Retry { $x.Workbooks.Add() }
  while((Retry { $wb.Worksheets.Count }) -lt $cases.Count){ Retry { [void]$wb.Worksheets.Add([Type]::Missing,$wb.Worksheets.Item($wb.Worksheets.Count)) } | Out-Null }
  $i=0
  foreach($c in $cases){
    $i++; $ws = Retry { $wb.Worksheets.Item($i) }; $n=$c.values.Count
    for($r=1;$r -le $n;$r++){
      $v=$c.values[$r-1]; $cell=$null; for($k=0;$k -lt 25 -and $null -eq $cell;$k++){ try { $cell=$ws.Range("A$r") } catch { Start-Sleep -Milliseconds 700 } }
      if($v -is [string]){ if($v -ne ''){ Retry { $cell.NumberFormat='@' } | Out-Null; Retry { $cell.Value2=[string]$v } | Out-Null } }
      elseif($v -is [bool]){ Retry { $cell.Value2=[bool]$v } | Out-Null }
      else { Retry { $cell.Value2=[double]$v } | Out-Null }
    }
    $rng=$null; for($k=0;$k -lt 25 -and $null -eq $rng;$k++){ try { $rng=$ws.Range("A1:A$n") } catch { Start-Sleep -Milliseconds 700 } }; $rule=$c.rule; $fc=$null
    $fcs=$null; for($k=0;$k -lt 25 -and $null -eq $fcs;$k++){ try { $fcs=$rng.FormatConditions } catch { Start-Sleep -Milliseconds 700 } }
    switch($rule.type){
      'greaterThan' { $fc = Retry { $fcs.Add(1,5,"=$($rule.value)") } }
      'lessThan'    { $fc = Retry { $fcs.Add(1,6,"=$($rule.value)") } }
      'between'     { $fc = Retry { $fcs.Add(1,1,"=$($rule.value)","=$($rule.value2)") } }
      'equal'       { $f = if($rule.value -is [string]){ '="'+$rule.value+'"' } else { "=$($rule.value)" }; $fc = Retry { $fcs.Add(1,3,$f) } }
      'textContains'{ $fc = Retry { $fcs.Add(9,[Type]::Missing,[Type]::Missing,[Type]::Missing,[string]$rule.text,0) } }
      'duplicate'   { $fc = Retry { $fcs.AddUniqueValues() }; Retry { $fc.DupeUnique=1 } | Out-Null }
      'top'         { $fc = Retry { $fcs.AddTop10() }; Retry { $fc.TopBottom=1; $fc.Rank=[int]$rule.rank; $fc.Percent=$false } | Out-Null }
      'bottom'      { $fc = Retry { $fcs.AddTop10() }; Retry { $fc.TopBottom=0; $fc.Rank=[int]$rule.rank; $fc.Percent=$false } | Out-Null }
      'topPercent'  { $fc = Retry { $fcs.AddTop10() }; Retry { $fc.TopBottom=1; $fc.Rank=[int]$rule.rank; $fc.Percent=$true } | Out-Null }
      'bottomPercent'{ $fc = Retry { $fcs.AddTop10() }; Retry { $fc.TopBottom=0; $fc.Rank=[int]$rule.rank; $fc.Percent=$true } | Out-Null }
      'aboveAverage'{ $fc = Retry { $fcs.AddAboveAverage() }; Retry { $fc.AboveBelow=0 } | Out-Null }
      'belowAverage'{ $fc = Retry { $fcs.AddAboveAverage() }; Retry { $fc.AboveBelow=1 } | Out-Null }
      'blank'       { $fc = Retry { $fcs.Add(10) } }
      'formula'     { $fc = Retry { $fcs.Add(2,[Type]::Missing,[string]$rule.formula) } }
    }
    Retry { $fc.Interior.Color=13431551 } | Out-Null
    $hit=@()
    for($r=1;$r -le $n;$r++){ $col = Retry { $ws.Range("A$r").DisplayFormat.Interior.Color }; $hit += [bool]($col -eq 13431551) }
    $res += [pscustomobject]@{ name=$c.name; hit=$hit }
  }
  Retry { $wb.Close($false) } | Out-Null
} finally {
  try { $x.Quit() } catch {}
  foreach($p in $mine){ Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
}
$res | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $Out
"ok $($res.Count)"
