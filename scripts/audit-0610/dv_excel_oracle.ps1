param([string]$Spec='E:\VNOffice-briefs\dvdiff\spec.json',[string]$Out='E:\VNOffice-briefs\dvdiff\excel.json')
function Retry([scriptblock]$b){ $last=$null; for($k=0;$k -lt 25;$k++){ try { return (& $b) } catch { $last=$_; if($_.Exception.Message -notmatch 'rejected|busy|RPC'){ break }; Start-Sleep -Milliseconds 700 } }; throw ("Excel loi: "+$last.Exception.Message+" @ "+$b.ToString().Trim()) }
$cases = Get-Content -Raw -Encoding UTF8 $Spec | ConvertFrom-Json
$before=@(Get-Process EXCEL -ErrorAction SilentlyContinue | % Id)
$x=$null; for($a=0;$a -lt 30 -and -not $x;$a++){ try { $x=New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 700 } }
if(-not $x){ throw "Khong khoi dong duoc Excel" }
$mine=@(Get-Process EXCEL -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
$ops=@{ between=1; notBetween=2; equal=3; notEqual=4; greaterThan=5; lessThan=6; greaterThanOrEqual=7; lessThanOrEqual=8 }
$types=@{ whole=1; decimal=2; list=3; date=4; time=5; textLength=6 }
$res=@()
try {
  Retry { $x.DisplayAlerts=$false } | Out-Null
  $wb = Retry { $x.Workbooks.Add() }
  while((Retry { $wb.Worksheets.Count }) -lt $cases.Count){ Retry { [void]$wb.Worksheets.Add([Type]::Missing,$wb.Worksheets.Item($wb.Worksheets.Count)) } | Out-Null }
  $i=0
  foreach($c in $cases){
    $i++; $ws = Retry { $wb.Worksheets.Item($i) }; $rule=$c.rule
    $cell=$null; for($k=0;$k -lt 25 -and $null -eq $cell;$k++){ try { $cell=$ws.Range("A1") } catch { Start-Sleep -Milliseconds 700 } }
    $v = $cell.Validation
    if($rule.type -eq 'list'){
      $f1 = ($rule.values -join ',')
      Retry { $v.Add(3,1,1,$f1) } | Out-Null
    } else {
      $t=$types[$rule.type]; $o=$ops[$rule.operator]
      $f1 = "$($rule.formula1)"; $f2 = if($null -ne $rule.formula2){ "$($rule.formula2)" } else { [Type]::Missing }
      Retry { $v.Add($t,1,$o,$f1,$f2) } | Out-Null
    }
    Retry { $v.IgnoreBlank = $true } | Out-Null
    $hit=@()
    foreach($val in $c.values){
      Retry { $cell.ClearContents() } | Out-Null
      if($val -is [string]){ if($val -ne ''){ Retry { $cell.NumberFormat='@' } | Out-Null; Retry { $cell.Value2=[string]$val } | Out-Null } else { Retry { $cell.NumberFormat='General' } | Out-Null } }
      else { Retry { $cell.NumberFormat='General' } | Out-Null; Retry { $cell.Value2=[double]$val } | Out-Null }
      $hit += [bool](Retry { $cell.Validation.Value })
    }
    $res += [pscustomobject]@{ name=$c.name; valid=$hit }
  }
  Retry { $wb.Close($false) } | Out-Null
} finally {
  try { $x.Quit() } catch {}
  foreach($p in $mine){ Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
}
$res | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $Out
"ok $($res.Count)"