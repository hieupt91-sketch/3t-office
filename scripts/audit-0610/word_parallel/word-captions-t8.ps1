param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference="Stop";$existingWordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|ForEach-Object{[int]$_.ProcessId});$wordPids=@();$w=New-Object -ComObject Word.Application;$w.Visible=$false;$w.DisplayAlerts=0
function Read-Captions($d,$file){
 $captionFields=@();foreach($f in $d.Fields){if([int]$f.Type -eq 12){$captionFields+=(([string]$f.Result.Text -replace '[\r\a]','').Trim())}}
 $tofText=if($d.TablesOfFigures.Count){(($d.TablesOfFigures.Item(1).Range.Text -replace '[\r\a]',' ').Trim())}else{''}
 Write-Output ("{0}: TOF={1}; TOFText=[{2}]; SeqFields={3}; SeqResults=[{4}]" -f $file,$d.TablesOfFigures.Count,$tofText,$captionFields.Count,($captionFields -join '|'))
}
try{
 $d=$w.Documents.Add();$wordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existingWordPids}|ForEach-Object{[int]$_.ProcessId});if(-not $wordPids.Count){throw 'Word COM PID missing'};Write-Output "Word COM PID: $($wordPids -join ',')"
 $d.Content.Text='Caption audit';$sel=$w.Selection;$sel.SetRange($d.Content.End-1,$d.Content.End-1)
 $figureLabel='H'+[char]236+'nh'
 $w.CaptionLabels.Add($figureLabel)|Out-Null
 $sel.InsertCaption($figureLabel,'Revenue chart',$null,1,$false);$sel.Collapse(0);$sel.InsertCaption($figureLabel,'Expense chart',$null,1,$false)
 $range=$d.Range(0,0);$d.Fields.Add($range,13,("\h \c `"{0}`"" -f $figureLabel),$true)|Out-Null;$d.Fields.Update()|Out-Null
 $d.SaveAs2("$Dir\word_captions_t8_new.docx",16);$d.Close(0)
 foreach($file in @('word_captions_t8_new.docx','app_captions_t8_new.docx')){$d=$w.Documents.Open("$Dir\$file",$false,$true);try{Read-Captions $d $file}finally{$d.Close(0)}}
}finally{
 if($w){$w.Quit();[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($w)}
 $wordPids=@($wordPids+@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existingWordPids}|ForEach-Object{[int]$_.ProcessId})|Select-Object -Unique)
 foreach($wordPid in $wordPids){$own=Get-Process -Id $wordPid -ErrorAction SilentlyContinue;if($own){$own|Wait-Process -Timeout 3 -ErrorAction SilentlyContinue};if(Get-Process -Id $wordPid -ErrorAction SilentlyContinue){Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue}}
}
