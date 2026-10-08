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

function Find-TextRange($document, [string]$text) {
  $range = $document.Content.Duplicate
  $found = $range.Find.Execute($text, $false, $false, $false, $false, $false, $true, 1, $false, "", 0)
  if (-not $found) { throw "Không tìm thấy '$text' trong tài liệu mẫu Word." }
  return $range
}

function New-SampleDocument($application) {
  $document = $application.Documents.Add()
  $document.Content.Text = "Alpha red`rBeta gamma`rZulu`r"
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
        "fontFamily" { $target.Font.Name = "Arial"; $detail = "Name=$($target.Font.Name)" }
        "fontSize" { $target.Font.Size = 18; $detail = "Size=$([double]$target.Font.Size)" }
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
}

$payload = [ordered]@{ blocked = $false; pid = $ownedPid; results = $results }
$json = $payload | ConvertTo-Json -Depth 8
$parent = Split-Path -Parent $OutputPath
if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
[IO.File]::WriteAllText($OutputPath, $json, [Text.UTF8Encoding]::new($false))
$payload | ConvertTo-Json -Depth 8 -Compress
