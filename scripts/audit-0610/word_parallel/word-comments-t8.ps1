param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference='Stop'
$existing=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|ForEach-Object{[int]$_.ProcessId})
$owned=@();$w=New-Object -ComObject Word.Application;$w.Visible=$false;$w.DisplayAlerts=0
try{
 $d=$w.Documents.Add();$owned=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existing}|ForEach-Object{[int]$_.ProcessId});if(-not $owned.Count){throw 'Word COM PID missing'}
 $d.Content.Text='Alpha comment target. Beta comment target.'
 $start=$d.Content.Start;$a=$d.Range($start,$start+5);$c1=$d.Comments.Add($a,'Resolve audit');$c1.Author='3T Office';$c1.Done=$true
 $pos=$d.Content.Text.IndexOf('Beta');$b=$d.Range($start+$pos,$start+$pos+4);$c2=$d.Comments.Add($b,'Delete audit');$c2.Author='3T Office';$c2.Delete()
 $d.SaveAs2("$Dir\word_comments_t8_new.docx",16);$d.Close(0)
 foreach($name in @('word_comments_t8_new.docx','app_comments_t8_new.docx')){
  $d=$w.Documents.Open("$Dir\$name",$false,$true);try{$rows=@();foreach($c in $d.Comments){$rows+=('{0}|{1}|{2}|{3}' -f $c.Author,($c.Scope.Text -replace '[\r\a]',''),($c.Range.Text -replace '[\r\a]',''),$c.Done)};Write-Output ("{0}: comments={1}; {2}" -f $name,$d.Comments.Count,($rows -join '; '))}finally{$d.Close(0)}
 }
}finally{if($w){$w.Quit();[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($w)};$owned=@($owned+@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existing}|ForEach-Object{[int]$_.ProcessId})|Select-Object -Unique);foreach($ownedPid in $owned){$p=Get-Process -Id $ownedPid -ErrorAction SilentlyContinue;if($p){$p|Wait-Process -Timeout 3 -ErrorAction SilentlyContinue};if(Get-Process -Id $ownedPid -ErrorAction SilentlyContinue){Stop-Process -Id $ownedPid -Force -ErrorAction SilentlyContinue}}}
