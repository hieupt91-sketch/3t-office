param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference='Stop'
$word=$null; $doc=$null
try {
  $word=New-Object -ComObject Word.Application
  $word.DisplayAlerts=0
  $doc=$word.Documents.Add()
  $doc.Content.Text="Muc mot`rKhoan mot`rDiem a`r"
  $template=$word.ListGalleries.Item(3).ListTemplates.Item(1)
  for($i=1;$i -le 3;$i++) {
    $paragraph=$doc.Paragraphs.Item($i)
    $paragraph.Range.ListFormat.ApplyListTemplateWithLevel($template, ($i -gt 1), 2, 1, $i)
  }
  $doc.SaveAs2($Path,16)
  $out=@()
  for($i=1;$i -le $doc.Paragraphs.Count;$i++) { $lf=$doc.Paragraphs.Item($i).Range.ListFormat; $out += [pscustomobject]@{text=$doc.Paragraphs.Item($i).Range.Text.Trim();label=[string]$lf.ListString;level=[int]$lf.ListLevelNumber} }
  [pscustomobject]@{Path=$Path;paragraphs=$out}|ConvertTo-Json -Depth 4 -Compress
} finally { if($doc){$saveChanges=0;$doc.Close([ref]$saveChanges)|Out-Null};if($word){$word.Quit()} }
