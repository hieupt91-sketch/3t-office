param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference="Stop"
$existingWordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|ForEach-Object{[int]$_.ProcessId})
$wordPids=@()
$w=New-Object -ComObject Word.Application;$w.Visible=$false;$w.DisplayAlerts=0
function Read-Heading($doc,$name) {
  $p=$doc.Paragraphs | Where-Object { (($_.Range.Text -replace '[\r\a]','').Trim()) -eq $name } | Select-Object -First 1
  if(-not $p){return "missing:$name"}
  $f=$p.Range.Font;$pf=$p.Range.ParagraphFormat
  $color=try{[int]$f.Color}catch{"N/A"}
  return ("{0}: style={1}; font={2}; size={3}; bold={4}; color={5}; before={6}; after={7}; outline={8}; align={9}; keepNext={10}" -f $name,$p.Range.Style.NameLocal,$f.Name,$f.Size,$f.Bold,$color,[math]::Round([double]$pf.SpaceBefore,1),[math]::Round([double]$pf.SpaceAfter,1),$pf.OutlineLevel,$pf.Alignment,$pf.KeepWithNext)
}
try {
  $d=$w.Documents.Add()
  $wordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existingWordPids}|ForEach-Object{[int]$_.ProcessId})
  if(-not $wordPids.Count){throw "Word COM PID missing"}
  Write-Output "Word COM PID: $($wordPids -join ',')"
  $d.Content.Text="Heading one`rHeading two`rHeading three"
  $d.Paragraphs.Item(1).Range.Style=$d.Styles.Item("Heading 1")
  $d.Paragraphs.Item(2).Range.Style=$d.Styles.Item("Heading 2")
  $d.Paragraphs.Item(3).Range.Style=$d.Styles.Item("Heading 3")
  $d.SaveAs2("$Dir\word_heading_t8_new.docx",16);$d.Close(0)
  foreach($file in @("word_heading_t8_new.docx","app_heading_t8_new.docx")){
    $d=$w.Documents.Open("$Dir\$file",$false,$true)
    try{Write-Output "[$file]";Write-Output (Read-Heading $d "Heading one");Write-Output (Read-Heading $d "Heading two");Write-Output (Read-Heading $d "Heading three")}finally{$d.Close(0)}
  }
}finally{
 if($w){$w.Quit();[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($w)}
 $wordPids=@($wordPids+@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existingWordPids}|ForEach-Object{[int]$_.ProcessId})|Select-Object -Unique)
 foreach($wordPid in $wordPids){$own=Get-Process -Id $wordPid -ErrorAction SilentlyContinue;if($own){$own|Wait-Process -Timeout 3 -ErrorAction SilentlyContinue};if(Get-Process -Id $wordPid -ErrorAction SilentlyContinue){Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue}}
}
