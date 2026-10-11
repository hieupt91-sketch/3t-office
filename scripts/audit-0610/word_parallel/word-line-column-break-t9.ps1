param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = "Stop"
$existing = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | ForEach-Object { [int]$_.ProcessId })
$created = @()
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0
try {
  $doc = $word.Documents.Add()
  $created = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existing } | ForEach-Object { [int]$_.ProcessId })
  $setup = $doc.Sections.Item(1).PageSetup
  $setup.TextColumns.SetCount(2)
  $range = $doc.Range(0,0); $range.InsertAfter("Alpha")
  $range = $doc.Range($doc.Content.End-1,$doc.Content.End-1); $range.InsertBreak(6)
  $range = $doc.Range($doc.Content.End-1,$doc.Content.End-1); $range.InsertAfter("Line after")
  $range = $doc.Range($doc.Content.End-1,$doc.Content.End-1); $range.InsertBreak(8)
  $range = $doc.Range($doc.Content.End-1,$doc.Content.End-1); $range.InsertAfter("Next column")
  $doc.SaveAs2("$Dir\word_line_column_break_t9.docx",16); $doc.Close(0)
  foreach ($name in @("app_line_column_break_t9","word_line_column_break_t9")) {
    $doc = $word.Documents.Open("$Dir\$name.docx",$false,$true)
    try {
      $text = $doc.Content.Text
      $details = foreach ($section in $doc.Sections) { "columns=$($section.PageSetup.TextColumns.Count)" }
      Write-Output ("{0}: lineBreaks={1}; columnBreaks={2}; alpha={3}; lineText={4}; nextColumn={5}; {6}" -f $name,([regex]::Matches($text,[char]11).Count),([regex]::Matches($text,[char]14).Count),$text.Contains("Alpha"),$text.Contains("Line after"),$text.Contains("Next column"),($details -join ";"))
    } finally { $doc.Close(0) }
  }
} finally {
  if ($doc) { try { $doc.Close(0) } catch {} }
  $word.Quit()
  if ($doc) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($doc) }
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word)
  Start-Sleep -Milliseconds 250
  foreach ($processId in $created) { try { Wait-Process -Id $processId -Timeout 2 -ErrorAction Stop } catch { $p=Get-Process -Id $processId -ErrorAction SilentlyContinue; if($p){ Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue } } }
}
