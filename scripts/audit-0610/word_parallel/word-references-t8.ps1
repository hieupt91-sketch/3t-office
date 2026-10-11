param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference="Stop"
$existingWordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|ForEach-Object{[int]$_.ProcessId})
$wordPids=@();$w=New-Object -ComObject Word.Application;$w.Visible=$false;$w.DisplayAlerts=0
function Read-References($doc,$file){
 $tocText=if($doc.TablesOfContents.Count){(($doc.TablesOfContents.Item(1).Range.Text -replace '[\r\a]',' ').Trim())}else{''}
 $footText=if($doc.Footnotes.Count){(($doc.Footnotes.Item(1).Range.Text -replace '[\r\a]','').Trim())}else{''}
 $endText=if($doc.Endnotes.Count){(($doc.Endnotes.Item(1).Range.Text -replace '[\r\a]','').Trim())}else{''}
 Write-Output ("{0}: TOC={1}; TOCText=[{2}]; Footnotes={3}; FootnoteText=[{4}]; Endnotes={5}; EndnoteText=[{6}]" -f $file,$doc.TablesOfContents.Count,$tocText,$doc.Footnotes.Count,$footText,$doc.Endnotes.Count,$endText)
}
try{
 $d=$w.Documents.Add();$wordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existingWordPids}|ForEach-Object{[int]$_.ProcessId});if(-not $wordPids.Count){throw 'Word COM PID missing'};Write-Output "Word COM PID: $($wordPids -join ',')"
 $d.Content.Text="Updated first heading`rSecond heading`rBody with notes"
 Write-Output 'stage: headings'
 $d.Paragraphs.Item(1).Range.Style=$d.Styles.Item('Heading 1');$d.Paragraphs.Item(2).Range.Style=$d.Styles.Item('Heading 2')
 Write-Output 'stage: toc'
 $range=$d.Range(0,0);$toc=$d.TablesOfContents.Add($range,$true,1,3);$toc.Update()
 Write-Output 'stage: notes'
 $body=$d.Paragraphs|Where-Object{($_.Range.Text -replace '[\r\a]','').Trim() -eq 'Body with notes'}|Select-Object -First 1
 Write-Output 'stage: footnote'
 $note=$d.Footnotes.Add($body.Range);$note.Range.Text='Footnote content'
 Write-Output 'stage: endnote'
 $note=$d.Endnotes.Add($body.Range);$note.Range.Text='Endnote content'
 $d.SaveAs2("$Dir\word_references_t8_new.docx",16);$d.Close(0)
 foreach($file in @('word_references_t8_new.docx','app_references_t8_new.docx')){$d=$w.Documents.Open("$Dir\$file",$false,$true);try{Read-References $d $file}finally{$d.Close(0)}}
}finally{
 if($w){$w.Quit();[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($w)}
 $wordPids=@($wordPids+@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existingWordPids}|ForEach-Object{[int]$_.ProcessId})|Select-Object -Unique)
 foreach($wordPid in $wordPids){$own=Get-Process -Id $wordPid -ErrorAction SilentlyContinue;if($own){$own|Wait-Process -Timeout 3 -ErrorAction SilentlyContinue};if(Get-Process -Id $wordPid -ErrorAction SilentlyContinue){Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue}}
}
