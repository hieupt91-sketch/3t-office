param(
  [Parameter(Mandatory=$true)][string]$Dir,
  [Parameter(Mandatory=$true)][string]$ImagePath
)
$ErrorActionPreference = "Stop"
$existingPids = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | ForEach-Object { [int]$_.ProcessId })
$ownedPids = @()
$word = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $doc = $word.Documents.Add()
  $ownedPids = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existingPids } | ForEach-Object { [int]$_.ProcessId })
  if (-not $ownedPids.Count) { throw "Không tìm thấy PID Word COM do script tạo." }
  Write-Output "Word COM PID: $($ownedPids -join ',')"

  $page = $doc.Sections.Item(1).PageSetup
  $page.PaperSize = 7 # A4
  $page.TopMargin = 56.7; $page.BottomMargin = 56.7
  $page.LeftMargin = 85.05; $page.RightMargin = 42.5
  $range = $doc.Range($doc.Content.End - 1, $doc.Content.End - 1)
  $picture = $doc.InlineShapes.AddPicture($ImagePath, $false, $true, $range)
  $shape = $picture.ConvertToShape()
  $shape.Width = 42; $shape.Height = 24
  $shape.WrapFormat.Type = 0 # wdWrapSquare
  $shape.RelativeHorizontalPosition = 1 # page
  $shape.RelativeVerticalPosition = 1 # page
  $shape.Left = 510.8; $shape.Top = 56.7
  $doc.SaveAs2("$Dir\word_image_edit_t9.docx", 16)
  $doc.Close(0)

  foreach ($name in @("word_image_edit_t9.docx", "app_image_edit_t9.docx")) {
    $doc = $word.Documents.Open("$Dir\$name", $false, $true)
    try {
      $shape = $doc.Shapes.Item(1)
      Write-Output ("{0}: inline={1}; shapes={2}; size={3}x{4}pt; wrap={5}; relative={6}/{7}; position={8}/{9}pt" -f $name,$doc.InlineShapes.Count,$doc.Shapes.Count,[math]::Round($shape.Width,1),[math]::Round($shape.Height,1),[int]$shape.WrapFormat.Type,[int]$shape.RelativeHorizontalPosition,[int]$shape.RelativeVerticalPosition,[math]::Round($shape.Left,1),[math]::Round($shape.Top,1))
    } finally { $doc.Close(0) }
  }
} finally {
  if ($word) { $word.Quit(); [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
  $ownedPids = @($ownedPids + @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existingPids } | ForEach-Object { [int]$_.ProcessId }) | Select-Object -Unique)
  foreach ($ownedPid in $ownedPids) {
    try { Wait-Process -Id $ownedPid -Timeout 3 -ErrorAction Stop } catch {}
    if (Get-Process -Id $ownedPid -ErrorAction SilentlyContinue) { Stop-Process -Id $ownedPid -Force -ErrorAction SilentlyContinue }
  }
}
