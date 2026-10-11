param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
$existing = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | ForEach-Object { [int]$_.ProcessId })
$owned = @()
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$measurements = @{}
try {
  $control = $word.Documents.Add()
  $owned = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existing } | ForEach-Object { [int]$_.ProcessId })
  if (-not $owned.Count) { throw 'Word COM PID missing' }
  $control.Content.Text = "Title sample`rSubtitle sample`rQuote sample`rList paragraph sample"
  $styleNames = @('Title', 'Subtitle', 'Quote', 'List Paragraph')
  for ($index = 1; $index -le 4; $index++) {
    $paragraph = $control.Paragraphs.Item($index)
    $paragraph.Range.Style = $styleNames[$index - 1]
  }
  $control.SaveAs2("$Dir\styles-gallery-word-t10.docx", 16)
  $control.Close(0)
  foreach ($name in @('styles-gallery-t10.docx', 'styles-gallery-word-t10.docx')) {
    $document = $word.Documents.Open("$Dir\$name", $false, $true)
    try {
      $rows = @()
      for ($index = 1; $index -le 4; $index++) {
        $paragraph = $document.Paragraphs.Item($index)
        $font = $paragraph.Range.Font
        Write-Output ("{0} p{1}: style={2}; font={3}; size={4}; bold={5}; italic={6}; align={7}" -f $name, $index, $paragraph.Range.Style.NameLocal, $font.Name, $font.Size, $font.Bold, $font.Italic, $paragraph.Alignment)
        $rows += ('{0}|{1}|{2}|{3}|{4}|{5}' -f $paragraph.Range.Style.NameLocal, $font.Name, $font.Size, $font.Bold, $font.Italic, $paragraph.Alignment)
      }
      $measurements[$name] = $rows
    } finally { $document.Close(0) }
  }
  if (($measurements['styles-gallery-t10.docx'] -join ';') -ne ($measurements['styles-gallery-word-t10.docx'] -join ';')) {
    throw 'Writer gallery built-in style properties differ from Word COM.'
  }
} finally {
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
  $owned = @($owned + @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existing } | ForEach-Object { [int]$_.ProcessId }) | Select-Object -Unique)
  foreach ($ownedPid in $owned) {
    $process = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
    if ($process) { $process | Wait-Process -Timeout 3 -ErrorAction SilentlyContinue }
    if (Get-Process -Id $ownedPid -ErrorAction SilentlyContinue) { Stop-Process -Id $ownedPid -Force -ErrorAction SilentlyContinue }
  }
}
