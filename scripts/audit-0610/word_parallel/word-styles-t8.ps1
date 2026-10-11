param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference="Stop"
$existingWordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|ForEach-Object{[int]$_.ProcessId})
$wordPids=@();$w=New-Object -ComObject Word.Application;$w.Visible=$false;$w.DisplayAlerts=0
function Read-Styles($doc,$file){
 foreach($name in @('Normal sample','Title sample','Quote sample')){
  $p=$doc.Paragraphs|Where-Object{($_.Range.Text -replace '[\r\a]','').Trim() -eq $name}|Select-Object -First 1
  if(-not $p){Write-Output "$file $name missing";continue}
  $f=$p.Range.Font;$pf=$p.Format
  Write-Output ("{0} {1}: style={2}; font={3}; size={4}; bold={5}; italic={6}; color={7}; align={8}; before={9}; after={10}" -f $file,$name,$p.Range.Style.NameLocal,$f.Name,$f.Size,$f.Bold,$f.Italic,$f.Color,$pf.Alignment,[math]::Round([double]$pf.SpaceBefore,1),[math]::Round([double]$pf.SpaceAfter,1))
 }
}
try{
 $d=$w.Documents.Add();$wordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existingWordPids}|ForEach-Object{[int]$_.ProcessId});if(-not $wordPids.Count){throw 'Word COM PID missing'};Write-Output "Word COM PID: $($wordPids -join ',')"
 $d.Content.Text="Normal sample`rTitle sample`rQuote sample"
 $d.Paragraphs.Item(1).Range.Style=$d.Styles.Item('Normal')
 $d.Paragraphs.Item(2).Range.Style=$d.Styles.Item('Title')
 $d.Paragraphs.Item(3).Range.Style=$d.Styles.Item('Quote')
 $d.SaveAs2("$Dir\word_styles_t8_new.docx",16);$d.Close(0)
 foreach($file in @('word_styles_t8_new.docx','app_styles_t8_new.docx')){$d=$w.Documents.Open("$Dir\$file",$false,$true);try{Read-Styles $d $file}finally{$d.Close(0)}}
}finally{
 if($w){$w.Quit();[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($w)}
 $wordPids=@($wordPids+@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existingWordPids}|ForEach-Object{[int]$_.ProcessId})|Select-Object -Unique)
 foreach($wordPid in $wordPids){$own=Get-Process -Id $wordPid -ErrorAction SilentlyContinue;if($own){$own|Wait-Process -Timeout 3 -ErrorAction SilentlyContinue};if(Get-Process -Id $wordPid -ErrorAction SilentlyContinue){Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue}}
}
