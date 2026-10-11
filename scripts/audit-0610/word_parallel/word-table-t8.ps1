param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = "Stop"
$existingWordPids = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | ForEach-Object { [int]$_.ProcessId })
$wordPids = @()
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$w.DisplayAlerts = 0
try {
  $bootstrap = $w.Documents.Add()
  $wordPids = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existingWordPids } | ForEach-Object { [int]$_.ProcessId })
  if ($wordPids.Count -eq 0) { throw "Không tìm thấy PID Word Automation do phiên này khởi tạo." }
  Write-Output "Word COM PID: $($wordPids -join ',')"
  $bootstrap.Close(0)

  $d = $w.Documents.Add()
  $t = $d.Tables.Add($d.Range(0,0),3,4)
  $t.Cell(1,1).Merge($t.Cell(2,1))
  $d.SaveAs2("$Dir\word_table_t8_vertical_merged.docx",16)
  $d.Close(0)

  $d = $w.Documents.Open("$Dir\word_table_t8_vertical_merged.docx",$false,$false)
  $t = $d.Tables.Item(1)
  $t.Cell(1,1).Split(2,1)
  $d.SaveAs2("$Dir\word_table_t8_vertical_split.docx",16)
  $d.Close(0)

  $d = $w.Documents.Add()
  $t = $d.Tables.Add($d.Range(0,0),3,4)
  $t.Columns.Item(3).Delete()
  $d.SaveAs2("$Dir\word_table_t8_delete_column.docx",16)
  $d.Close(0)

  $d = $w.Documents.Add()
  $t = $d.Tables.Add($d.Range(0,0),3,4)
  $t.PreferredWidthType = 3
  $t.PreferredWidth = 451.2
  $t.LeftPadding = 1.4; $t.RightPadding = 1.4; $t.TopPadding = 1.4; $t.BottomPadding = 1.4
  $c = $t.Cell(1,1)
  $c.Range.Text = "Alpha"
  $c.Range.Font.Name = "Calibri"; $c.Range.Font.Size = 11
  $c.Range.ParagraphFormat.Alignment = 1
  $c.VerticalAlignment = 1
  $c.Shading.BackgroundPatternColor = 15788258
  foreach ($cell in $t.Range.Cells) { $cell.Borders.Enable = $true }
  $d.SaveAs2("$Dir\word_table_t8_format.docx",16)
  $d.Close(0)

  foreach ($mode in @("all","outside","inside","none")) {
    $d = $w.Documents.Add()
    $t = $d.Tables.Add($d.Range(0,0),3,3)
    $single = 1; $none = 0
    $edgeIds = @(-1,-2,-3,-4)
    $innerIds = @(-5,-6)
    foreach ($id in $edgeIds) { $t.Borders.Item($id).LineStyle = $(if ($mode -in @("all","outside")) { $single } else { $none }) }
    foreach ($id in $innerIds) { $t.Borders.Item($id).LineStyle = $(if ($mode -in @("all","inside")) { $single } else { $none }) }
    $d.SaveAs2("$Dir\word_table_t8_borders_$mode.docx",16)
    $d.Close(0)
  }

  foreach ($mode in @("contents","window")) {
    $d = $w.Documents.Add()
    $t = $d.Tables.Add($d.Range(0,0),3,3)
    $t.Cell(1,1).Range.Text = "Alpha"
    $t.Cell(1,1).Range.Font.Name = "Calibri"
    $t.Cell(1,1).Range.Font.Size = 11
    $t.LeftPadding = 1.4; $t.RightPadding = 1.4
    if ($mode -eq "contents") { $t.AutoFitBehavior(1) } else { $t.AutoFitBehavior(2) }
    $d.SaveAs2("$Dir\word_table_t8_autofit_$mode.docx",16)
    $d.Close(0)
  }

  $d = $w.Documents.Add()
  $t = $d.Tables.Add($d.Range(0,0),3,3)
  $t.Columns.Item(1).SetWidth(258.8,1)
  $t.Columns.Item(2).SetWidth(96.3,1)
  $t.Columns.Item(3).SetWidth(96.2,1)
  $t.Rows.Item(1).HeightRule = 2
  $t.Rows.Item(1).Height = 42
  $d.SaveAs2("$Dir\word_table_t8_resize.docx",16)
  $d.Close(0)

  foreach ($name in @("vertical_merged","vertical_split","delete_column","format","borders_all","borders_outside","borders_inside","borders_none","autofit_contents","autofit_window","resize")) {
    $d = $w.Documents.Open("$Dir\word_table_t8_$name.docx",$false,$true)
    try {
      $t = $d.Tables.Item(1)
      $rowCounts = @()
      for ($i=1; $i -le $t.Rows.Count; $i++) {
        try { $rowCounts += [int]$t.Rows.Item($i).Cells.Count } catch { $rowCounts += -1 }
      }
      $widths = @()
      for ($i=1; $i -le $t.Range.Cells.Count; $i++) {
        try { $widths += [math]::Round([double]$t.Range.Cells.Item($i).Width,1) } catch { break }
      }
      $height = try { [math]::Round([double]$t.Rows.Item(1).Height,1) } catch { "N/A" }
      $heightRule = try { [int]$t.Rows.Item(1).HeightRule } catch { "N/A" }
      $c = $t.Cell(1,1)
      $fill = try { [int]$c.Shading.BackgroundPatternColor } catch { "N/A" }
      $borders = try { [int]$t.Borders.Enable } catch { "N/A" }
      $edgeStyles = @(); foreach ($id in @(-1,-2,-3,-4,-5,-6)) { try { $edgeStyles += [int]$t.Borders.Item($id).LineStyle } catch { $edgeStyles += "N/A" } }
      $align = try { [int]$c.Range.ParagraphFormat.Alignment } catch { "N/A" }
      $vertical = try { [int]$c.VerticalAlignment } catch { "N/A" }
      Write-Output ("{0}: rows={1}; rowCells={2}; allowAutoFit={3}; preferredWidth={4}; cellWidths={5}; rowHeight={6}; heightRule={7}; fill={8}; borders={9}; edgeStyles={10}; align={11}; vertical={12}" -f $name,$t.Rows.Count,($rowCounts -join ','),$t.AllowAutoFit,$t.PreferredWidth,($widths -join ','),$height,$heightRule,$fill,$borders,($edgeStyles -join ','),$align,$vertical)
    } finally { $d.Close(0) }
  }
} finally {
  if ($w) { $w.Quit(); [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($w) }
  $wordPids = @($wordPids + @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existingWordPids } | ForEach-Object { [int]$_.ProcessId }) | Select-Object -Unique)
  foreach ($wordPid in $wordPids) {
    $ownWord = Get-Process -Id $wordPid -ErrorAction SilentlyContinue
    if ($ownWord) { $ownWord | Wait-Process -Timeout 3 -ErrorAction SilentlyContinue }
    if (Get-Process -Id $wordPid -ErrorAction SilentlyContinue) { Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue }
  }
}
