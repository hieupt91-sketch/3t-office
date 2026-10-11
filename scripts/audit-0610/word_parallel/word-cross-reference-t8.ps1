param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference="Stop";$existingWordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|ForEach-Object{[int]$_.ProcessId});$wordPids=@();$w=New-Object -ComObject Word.Application;$w.Visible=$false;$w.DisplayAlerts=0
function Read-Xref($d,$file){
 $rows=@();foreach($field in $d.Fields){if([int]$field.Type -eq 3){$rows+=([string]$field.Result.Text -replace '[\r\a]','').Trim()}}
 Write-Output ("{0}: REFFields={1}; Results=[{2}]; Bookmarks={3}" -f $file,$rows.Count,($rows -join '|'),$d.Bookmarks.Count)
}
try{
 $d=$w.Documents.Add();$wordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existingWordPids}|ForEach-Object{[int]$_.ProcessId});if(-not $wordPids.Count){throw 'Word COM PID missing'};Write-Output "Word COM PID: $($wordPids -join ',')"
 $d.Content.Text="Target heading`rReference goes here";$d.Paragraphs.Item(1).Range.Style=$d.Styles.Item('Heading 1')
 $h=$d.Paragraphs.Item(1).Range;$h.End=$h.End-1;$d.Bookmarks.Add('Target_heading',$h)|Out-Null
 $r=$d.Paragraphs.Item(2).Range;$r.Collapse(0);$d.Fields.Add($r,3,'Target_heading \h',$true)|Out-Null
 $d.SaveAs2("$Dir\word_crossref_t8_new.docx",16);$d.Close(0)
 foreach($file in @('word_crossref_t8_new.docx','app_crossref_t8_new.docx')){$d=$w.Documents.Open("$Dir\$file",$false,$true);try{Read-Xref $d $file}finally{$d.Close(0)}}
}finally{
 if($w){$w.Quit();[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($w)}
 $wordPids=@($wordPids+@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existingWordPids}|ForEach-Object{[int]$_.ProcessId})|Select-Object -Unique)
 foreach($wordPid in $wordPids){$own=Get-Process -Id $wordPid -ErrorAction SilentlyContinue;if($own){$own|Wait-Process -Timeout 3 -ErrorAction SilentlyContinue};if(Get-Process -Id $wordPid -ErrorAction SilentlyContinue){Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue}}
}
