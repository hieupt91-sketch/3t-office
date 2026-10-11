param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference="Stop"
$existingWordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|ForEach-Object{[int]$_.ProcessId})
$wordPids=@()
$w=New-Object -ComObject Word.Application;$w.Visible=$false;$w.DisplayAlerts=0
function Read-TextBox($doc,$file) {
  $shape=$null
  foreach($candidate in $doc.Shapes){if($candidate.TextFrame.HasText -and ([string]$candidate.TextFrame.TextRange.Text).Contains('Audit textbox')){$shape=$candidate;break}}
  if(-not $shape){return "$file`: textbox missing"}
  $tf=$shape.TextFrame
  return ("{0}: type={1}; text={2}; width={3}; height={4}; autosize={5}; wrap={6}; margins={7}/{8}/{9}/{10}; textbox={11}" -f $file,$shape.Type,($tf.TextRange.Text -replace '[\r\a]',''),[math]::Round([double]$shape.Width,1),[math]::Round([double]$shape.Height,1),$tf.AutoSize,$tf.WordWrap,[math]::Round([double]$tf.MarginLeft,1),[math]::Round([double]$tf.MarginRight,1),[math]::Round([double]$tf.MarginTop,1),[math]::Round([double]$tf.MarginBottom,1),$tf.Valid)
}
try {
  $d=$w.Documents.Add()
  $wordPids=@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existingWordPids}|ForEach-Object{[int]$_.ProcessId})
  if(-not $wordPids.Count){throw "Word COM PID missing"}
  Write-Output "Word COM PID: $($wordPids -join ',')"
  $shape=$d.Shapes.AddTextbox(1,72,72,94.1,34.2)
  $shape.TextFrame.TextRange.Text="Audit textbox"
  Write-Output ("Word before save: width={0}; height={1}; autosize={2}; margins={3}/{4}/{5}/{6}" -f [math]::Round([double]$shape.Width,1),[math]::Round([double]$shape.Height,1),$shape.TextFrame.AutoSize,[math]::Round([double]$shape.TextFrame.MarginLeft,1),[math]::Round([double]$shape.TextFrame.MarginRight,1),[math]::Round([double]$shape.TextFrame.MarginTop,1),[math]::Round([double]$shape.TextFrame.MarginBottom,1))
  $d.SaveAs2("$Dir\word_textbox_t8_new.docx",16);$d.Close(0)
  foreach($file in @("word_textbox_t8_new.docx","app_textbox_t8_new.docx")){
    $d=$w.Documents.Open("$Dir\$file",$false,$true)
    try{Write-Output (Read-TextBox $d $file)}finally{$d.Close(0)}
  }
}finally{
  if($w){$w.Quit();[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($w)}
  $wordPids=@($wordPids+@(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'"|Where-Object{[int]$_.ProcessId -notin $existingWordPids}|ForEach-Object{[int]$_.ProcessId})|Select-Object -Unique)
  foreach($wordPid in $wordPids){$own=Get-Process -Id $wordPid -ErrorAction SilentlyContinue;if($own){$own|Wait-Process -Timeout 3 -ErrorAction SilentlyContinue};if(Get-Process -Id $wordPid -ErrorAction SilentlyContinue){Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue}}
}
