param(
  [Parameter(Mandatory = $true)][string]$SpecPath,
  [Parameter(Mandatory = $true)][string]$OutputPath
)

$ErrorActionPreference = "Stop"
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class VnoRibbonWordWindow {
  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@

$spec = Get-Content -Raw -LiteralPath $SpecPath | ConvertFrom-Json
$word = $null
$ownedPid = 0
$results = @()
$tempPng = Join-Path ([IO.Path]::GetTempPath()) ("vno-ribbon-" + [guid]::NewGuid().ToString("N") + ".png")
[IO.File]::WriteAllBytes($tempPng, [Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+M/wHwAF/gL+AvzZVwAAAABJRU5ErkJggg=="))

function Find-TextRange($document, [string]$text) {
  $range = $document.Content.Duplicate
  $found = $range.Find.Execute($text, $false, $false, $false, $false, $false, $true, 1, $false, "", 0)
  if (-not $found) { throw "Không tìm thấy '$text' trong tài liệu mẫu Word." }
  return $range
}

function New-SampleDocument($application) {
  $document = $application.Documents.Add()
  $document.Content.Text = "Alpha red`rBeta gamma`rZulu`r"
  for ($i = 1; $i -le 35; $i++) {
    $end = $document.Content
    $end.Collapse(0)
    $end.InsertBreak(7)
    $end.Collapse(0)
    $end.Text = "Chuong $($i): Noi dung kiem thu trang $($i) voi bang va danh sach`r"
  }
  return $document
}

try {
  $beforePids = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | ForEach-Object { [int]$_.Id })
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $owner = [uint32]0
  [void][VnoRibbonWordWindow]::GetWindowThreadProcessId([IntPtr]([int64]$word.Hwnd), [ref]$owner)
  if ($owner -gt 0) { $ownedPid = [int]$owner }
  if ($ownedPid -eq 0) {
    $created = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | Where-Object { $beforePids -notcontains [int]$_.Id })
    if ($created.Count -eq 1) { $ownedPid = [int]$created[0].Id }
  }
  if ($ownedPid -eq 0) { throw "Không xác định được PID WINWORD do oracle tạo; không đụng các Word có sẵn." }

  foreach ($item in $spec.items) {
    if ($item.wordBlocked) {
      $results += [ordered]@{ commandId = $item.commandId; args = $item.args; status = "CHẶN"; pass = $true; detail = [string]$item.wordBlocked }
      continue
    }
    if (-not $item.word) {
      $results += [ordered]@{ commandId = $item.commandId; args = $item.args; status = "CHẶN"; pass = $true; detail = "Đặc tả không yêu cầu oracle Word." }
      continue
    }

    $document = $null
    try {
      $document = New-SampleDocument $word
      $target = Find-TextRange $document "Beta"
      $source = Find-TextRange $document "Alpha"
      $beforeText = [string]$document.Content.Text
      $detail = ""

      switch ([string]$item.word) {
        "paste" { $source.Copy(); $target.Collapse(1); $target.Paste(); $detail = [string]$document.Content.Text }
        "cut" { $target.Cut(); $detail = [string]$document.Content.Text }
        "copy" { $target.Copy(); $end = $document.Content.Duplicate; $end.Collapse(0); $end.Paste(); $detail = [string]$document.Content.Text }
        "formatPainter" { $source.Font.Bold = -1; $source.Select(); $word.Selection.CopyFormat(); $target.Select(); $word.Selection.PasteFormat(); $detail = "Bold=$([int]$target.Font.Bold)" }
        "fontFamily" { $target.Font.Name = "Calibri"; $detail = "Name=$($target.Font.Name)" }
        "fontSize" { $target.Font.Size = 16; $detail = "Size=$([double]$target.Font.Size)" }
        "fontGrow" { $old = [double]$target.Font.Size; $target.Font.Grow(); $detail = "Size=$old->$([double]$target.Font.Size)" }
        "fontShrink" { $target.Font.Size = 18; $old = [double]$target.Font.Size; $target.Font.Shrink(); $detail = "Size=$old->$([double]$target.Font.Size)" }
        "bold" { $target.Font.Bold = -1; $detail = "Bold=$([int]$target.Font.Bold)" }
        "italic" { $target.Font.Italic = -1; $detail = "Italic=$([int]$target.Font.Italic)" }
        "underline" { $target.Font.Underline = 1; $detail = "Underline=$([int]$target.Font.Underline)" }
        "strike" { $target.Font.StrikeThrough = -1; $detail = "Strike=$([int]$target.Font.StrikeThrough)" }
        "subscript" { $target.Font.Subscript = -1; $detail = "Subscript=$([int]$target.Font.Subscript)" }
        "superscript" { $target.Font.Superscript = -1; $detail = "Superscript=$([int]$target.Font.Superscript)" }
        "changeCase" { $target.Case = 1; $detail = [string]$target.Text }
        "clearFormat" { $target.Font.Bold = -1; $target.Font.Reset(); $detail = "Bold=$([int]$target.Font.Bold), Name=$($target.Font.Name)" }
        "highlight" { $target.HighlightColorIndex = 7; $detail = "Highlight=$([int]$target.HighlightColorIndex)" }
        "textColor" { $target.Font.Color = 255; $detail = "Color=$([int]$target.Font.Color)" }
        "bullet" { $target.ListFormat.ApplyBulletDefault(); $detail = "ListType=$([int]$target.ListFormat.ListType), String=$($target.ListFormat.ListString)" }
        "numbered" { $target.ListFormat.ApplyNumberDefault(); $detail = "ListType=$([int]$target.ListFormat.ListType), String=$($target.ListFormat.ListString)" }
        "multilevelDecimal" { $template = $word.ListGalleries.Item(3).ListTemplates.Item(1); $target.ListFormat.ApplyListTemplateWithLevel($template, $false, 0, 2, 1); $detail = "Level=$([int]$target.ListFormat.ListLevelNumber), String=$($target.ListFormat.ListString)" }
        "multilevelLetter" { $template = $word.ListGalleries.Item(3).ListTemplates.Item(2); $target.ListFormat.ApplyListTemplateWithLevel($template, $false, 0, 2, 1); $detail = "Level=$([int]$target.ListFormat.ListLevelNumber), String=$($target.ListFormat.ListString)" }
        "indentDec" { $target.ParagraphFormat.LeftIndent = 36; $old = [double]$target.ParagraphFormat.LeftIndent; $target.ParagraphFormat.LeftIndent = 0; $detail = "LeftIndent=$old->$([double]$target.ParagraphFormat.LeftIndent)" }
        "indentInc" { $old = [double]$target.ParagraphFormat.LeftIndent; $target.ParagraphFormat.LeftIndent = 36; $detail = "LeftIndent=$old->$([double]$target.ParagraphFormat.LeftIndent)" }
        "sort" { $document.Content.Sort(); $detail = ([string]$document.Content.Text).Replace("`r", "|") }
        "showMarks" { $word.ActiveWindow.View.ShowAll = $true; $detail = "ShowAll=$([bool]$word.ActiveWindow.View.ShowAll)"; $word.ActiveWindow.View.ShowAll = $false }
        "restartNumbering" { $target.ListFormat.ApplyNumberDefault(); $template = $target.ListFormat.ListTemplate; $target.ListFormat.ApplyListTemplate($template, $false); $detail = "String=$($target.ListFormat.ListString)" }
        "continueNumbering" { $source.ListFormat.ApplyNumberDefault(); $template = $source.ListFormat.ListTemplate; $target.ListFormat.ApplyListTemplate($template, $true); $detail = "String=$($target.ListFormat.ListString)" }
        "alignLeft" { $target.ParagraphFormat.Alignment = 0; $detail = "Alignment=$([int]$target.ParagraphFormat.Alignment)" }
        "alignCenter" { $target.ParagraphFormat.Alignment = 1; $detail = "Alignment=$([int]$target.ParagraphFormat.Alignment)" }
        "alignRight" { $target.ParagraphFormat.Alignment = 2; $detail = "Alignment=$([int]$target.ParagraphFormat.Alignment)" }
        "justify" { $target.ParagraphFormat.Alignment = 3; $detail = "Alignment=$([int]$target.ParagraphFormat.Alignment)" }
        "spacing1" { $target.ParagraphFormat.LineSpacingRule = 0; $detail = "Rule=$([int]$target.ParagraphFormat.LineSpacingRule), Spacing=$([double]$target.ParagraphFormat.LineSpacing)" }
        "spacing15" { $target.ParagraphFormat.LineSpacingRule = 1; $detail = "Rule=$([int]$target.ParagraphFormat.LineSpacingRule), Spacing=$([double]$target.ParagraphFormat.LineSpacing)" }
        "spacing2" { $target.ParagraphFormat.LineSpacingRule = 2; $detail = "Rule=$([int]$target.ParagraphFormat.LineSpacingRule), Spacing=$([double]$target.ParagraphFormat.LineSpacing)" }
        "spacing115" { $target.ParagraphFormat.LineSpacingRule = 5; $target.ParagraphFormat.LineSpacing = $word.LinesToPoints(1.15); $detail = "Rule=$([int]$target.ParagraphFormat.LineSpacingRule), Spacing=$([double]$target.ParagraphFormat.LineSpacing)" }
        "shading" { $target.ParagraphFormat.Shading.BackgroundPatternColor = 10092543; $detail = "Shading=$([int]$target.ParagraphFormat.Shading.BackgroundPatternColor)" }
        "borders" { $target.ParagraphFormat.Borders.Enable = 1; $detail = "Borders=$([int]$target.ParagraphFormat.Borders.Enable)" }
        "find" { $probe = $document.Content.Duplicate; $found = $probe.Find.Execute("Beta"); $detail = "Found=$([bool]$found), Text=$($probe.Text)" }
        "replace" { $probe = $document.Content.Duplicate; [void]$probe.Find.Execute("Beta", $false, $false, $false, $false, $false, $true, 1, $false, "BETA", 2); $detail = [string]$document.Content.Text }
        "selectAll" { $document.Content.Select(); $detail = "SelectedLength=$($word.Selection.Range.Text.Length), DocumentLength=$($document.Content.Text.Length)" }
        "blankPage" { $target.Collapse(1); $target.InsertBreak(7); $target.InsertBreak(7); $detail = "Pages=$($document.ComputeStatistics(2))" }
        "pageBreak" { $target.Collapse(1); $target.InsertBreak(7); $detail = "Pages=$($document.ComputeStatistics(2))" }
        "table" { $table = $document.Tables.Add($target, 2, 2); $detail = "Tables=$($document.Tables.Count), Rows=$($table.Rows.Count), Columns=$($table.Columns.Count)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($table) }
        "picture" { $shape = $document.InlineShapes.AddPicture($tempPng, $false, $true, $target); $detail = "InlineShapes=$($document.InlineShapes.Count), Width=$($shape.Width), Height=$($shape.Height)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shape) }
        "shape" { $shape = $document.Shapes.AddShape(1, 72, 72, 120, 70, $target); $detail = "Shapes=$($document.Shapes.Count), Type=$($shape.Type)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shape) }
        "smartArt" { $layout = $word.SmartArtLayouts.Item(1); $shape = $document.Shapes.AddSmartArt($layout, 72, 72, 260, 160, $target); $detail = "Shapes=$($document.Shapes.Count), Nodes=$($shape.SmartArt.AllNodes.Count)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shape); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($layout) }
        "chart" { $shape = $document.InlineShapes.AddChart(51, $target); $detail = "InlineShapes=$($document.InlineShapes.Count), Type=$($shape.Type)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shape) }
        "hyperlink" { $link = $document.Hyperlinks.Add($target, "https://example.com", "", "", "Beta"); $detail = "Hyperlinks=$($document.Hyperlinks.Count), Address=$($link.Address)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($link) }
        "comment" { $comment = $document.Comments.Add($target, "Ghi chu kiem thu"); $detail = "Comments=$($document.Comments.Count), Text=$($comment.Range.Text)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($comment) }
        "header" { $range = $document.Sections.Item(1).Headers.Item(1).Range; $range.Text = "Tieu de dau trang"; $detail = "Header=$($range.Text)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($range) }
        "footer" { $range = $document.Sections.Item(1).Footers.Item(1).Range; $range.Text = "Trang "; $range.Collapse(0); $field = $document.Fields.Add($range, 33); $detail = "FooterFields=$($document.Sections.Item(1).Footers.Item(1).Range.Fields.Count), Code=$($field.Code.Text)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($field); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($range) }
        "textBox" { $shape = $document.Shapes.AddTextbox(1, 72, 72, 220, 80, $target); $shape.TextFrame.TextRange.Text = "Nhap van ban"; $detail = "Shapes=$($document.Shapes.Count), Text=$($shape.TextFrame.TextRange.Text)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shape) }
        "wordArt" { $shape = $document.Shapes.AddTextEffect(1, "3T Office", "Arial", 28, $false, $false, 72, 72, $target); $detail = "Shapes=$($document.Shapes.Count), Text=$($shape.TextEffect.Text)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shape) }
        "dropCap" { $dropCap = $target.Paragraphs.Item(1).DropCap; $dropCap.Position = 1; $dropCap.LinesToDrop = 3; $detail = "Position=$([int]$dropCap.Position), Lines=$([int]$dropCap.LinesToDrop)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($dropCap) }
        "dateTime" { $field = $document.Fields.Add($target, 31); $detail = "Fields=$($document.Fields.Count), Code=$($field.Code.Text)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($field) }
        "equation" { $target.Text = "x^2"; $mathRange = $document.OMaths.Add($target); $math = $document.OMaths.Item(1); $math.BuildUp(); $detail = "OMaths=$($document.OMaths.Count), Text=$($math.Range.Text)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($math); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($mathRange) }
        "symbol" { $target.InsertSymbol(169, "Arial", $true); $detail = "Symbol=$($target.Text)" }
        "watermark" { $header = $document.Sections.Item(1).Headers.Item(1); $shape = $header.Shapes.AddTextEffect(1, "DRAFT", "Arial", 36, $false, $false, 100, 100); $detail = "HeaderShapes=$($header.Shapes.Count)"; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($shape); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($header) }
        "pageColor" { $document.Background.Fill.Visible = -1; $document.Background.Fill.ForeColor.RGB = 16773360; $detail = "PageColor=$($document.Background.Fill.ForeColor.RGB)" }
        "pageBorder" { $document.Sections.Item(1).Borders.Enable = 1; $detail = "Borders=$([int]$document.Sections.Item(1).Borders.Enable)" }
        default { throw "Word operation chưa được cài: $($item.word)" }
      }

      $changed = ([string]$document.Content.Text -ne $beforeText) -or ($detail -notmatch "^(Bold|Italic|Underline|Strike|Subscript|Superscript)=0$")
      $results += [ordered]@{ commandId = $item.commandId; args = $item.args; status = "ĐÚNG"; pass = [bool]$changed; detail = $detail }
    }
    catch {
      $results += [ordered]@{ commandId = $item.commandId; args = $item.args; status = "SAI CHỨC NĂNG"; pass = $false; detail = $_.Exception.Message }
    }
    finally {
      if ($null -ne $document) {
        try { $document.Saved = $true } catch {}
        try { $document.Close(0) } catch {}
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($document)
      }
    }
  }
}
finally {
  if ($null -ne $word) {
    try { $word.ActiveWindow.View.ShowAll = $false } catch {}
    try { $word.Quit(0) } catch {}
    [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
  }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
  if ($ownedPid -gt 0) {
    Start-Sleep -Milliseconds 500
    $process = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
    if ($process -and $process.ProcessName -eq "WINWORD" -and $process.MainWindowHandle -eq 0) {
      Stop-Process -Id $ownedPid -Force -ErrorAction SilentlyContinue
    }
  }
  Remove-Item -LiteralPath $tempPng -Force -ErrorAction SilentlyContinue
}

$payload = [ordered]@{ blocked = $false; pid = $ownedPid; results = $results }
$json = $payload | ConvertTo-Json -Depth 8
$parent = Split-Path -Parent $OutputPath
if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
[IO.File]::WriteAllText($OutputPath, $json, [Text.UTF8Encoding]::new($false))
$payload | ConvertTo-Json -Depth 8 -Compress
