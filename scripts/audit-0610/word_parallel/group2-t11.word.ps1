param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$rows = @()
$progressPath = Join-Path $Dir 't11_group2_word_progress.log'
function Log($message) { [System.IO.File]::AppendAllText($progressPath, "$message`r`n") }
function New-Fixture {
  $d = $word.Documents.Add()
  $d.Content.Text = "Mot doan dau tien.`rAlpha beta gamma delta.`rDoan cuoi cung."
  return $d
}
function Read-State($d) {
  $rowsCount=0; $columnsCount=0
  if ($d.Tables.Count) { $rowsCount=$d.Tables.Item(1).Rows.Count; $columnsCount=$d.Tables.Item(1).Columns.Count }
  $hyperlinks=@(); foreach($h in $d.Hyperlinks){$hyperlinks += [ordered]@{Text=(($h.Range.Text -replace '[\r\a]','').Trim());Address=[string]$h.Address}}
  $bookmarkNames=@(); foreach($b in $d.Bookmarks){$bookmarkNames += $b.Name}
  $dropPosition=0; $dropLines=0; try{$dropPosition=[int]$d.Paragraphs.Item(1).DropCap.Position;$dropLines=[int]$d.Paragraphs.Item(1).DropCap.LinesToDrop}catch{}
  $mathText=@(); foreach($m in $d.OMaths){$mathText += (($m.Range.Text -replace '[\r\a]','').Trim())}
  return [ordered]@{Pages=[int]$d.ComputeStatistics(2);Tables=[int]$d.Tables.Count;TableRows=$rowsCount;TableColumns=$columnsCount;Hyperlinks=$hyperlinks;Bookmarks=$bookmarkNames;DropCapPosition=$dropPosition;DropCapLines=$dropLines;OMaths=[int]$d.OMaths.Count;MathText=$mathText;InlineShapes=[int]$d.InlineShapes.Count;Shapes=[int]$d.Shapes.Count;Text=(($d.Content.Text -replace '[\r\a]',' ').Trim())}
}
try {
  foreach($op in @('blank-page','text-to-table','hyperlink','bookmark','drop-cap','date-time','equation')) {
    $d=New-Fixture
    Log "$op before operation"
    $first=$d.Paragraphs.Item(1)
    $second=$d.Paragraphs.Item(2)
    try {
      switch($op) {
        'blank-page' { $r=$first.Range; $r.Collapse(0); $r.InsertBreak(7); $r.InsertBreak(7) }
        'text-to-table' { $r=$d.Range($first.Range.Start,$second.Range.End-1); $table=$r.ConvertToTable(1,2,4) }
        'hyperlink' { $r=$first.Range; $r.End=$r.End-1; [void]$d.Hyperlinks.Add($r,'https://example.org/report') }
        'bookmark' { [void]$d.Bookmarks.Add('SectionStart',$first.Range) }
        'drop-cap' { $first.DropCap.Position=1; $first.DropCap.LinesToDrop=3 }
        'date-time' { $r=$first.Range; $r.End=$r.End-1; $r.Collapse(0); $r.InsertAfter('2026-10-11') }
        'equation' { $formula='x^2 + y^2 = z^2'; $r=$first.Range; $r.End=$r.End-1; $r.Collapse(0); $start=$r.Start; $r.InsertAfter($formula); $eq=$d.Range($start,$start+$formula.Length); [void]$d.OMaths.Add($eq); $d.OMaths.Item(1).BuildUp() }
      }
      Log "$op after operation"
      $state=Read-State $d
      $rows += [pscustomobject]@{Operation=$op;Result='PASS';Word=$state}
      Write-Output ("{0}: {1}" -f $op, ($state|ConvertTo-Json -Compress -Depth 6))
    } catch {
      $rows += [pscustomobject]@{Operation=$op;Result='FAIL';Error=$_.Exception.Message}
      Write-Output ("{0}: FAIL {1}" -f $op,$_.Exception.Message)
    } finally { $d.Close(0) }
  }
  [System.IO.File]::WriteAllText((Join-Path $Dir 't11_group2_word.json'),($rows|ConvertTo-Json -Depth 8),(New-Object System.Text.UTF8Encoding($false)))
} finally { if($word){$word.Quit();[void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)} }
