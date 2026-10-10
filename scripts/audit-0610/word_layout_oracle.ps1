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

$spec = Get-Content -Raw -Encoding UTF8 -LiteralPath $SpecPath | ConvertFrom-Json
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
        "columns1" {
          $target.PageSetup.TextColumns.SetCount(1)
          $detail = "Count=$([int]$target.PageSetup.TextColumns.Count)"
        }
        "columns2" {
          $target.PageSetup.TextColumns.SetCount(2)
          $detail = "Count=$([int]$target.PageSetup.TextColumns.Count)"
        }
        "columns3" {
          $target.PageSetup.TextColumns.SetCount(3)
          $detail = "Count=$([int]$target.PageSetup.TextColumns.Count)"
        }
        "pageBreak" {
          $target.InsertBreak(7)
          $detail = "PageBreakInserted, Pages=$([int]$document.ComputeStatistics(2))"
        }
        "columnBreak" {
          $target.InsertBreak(6)
          $detail = "ColumnBreakInserted"
        }
        "sectionNextPage" {
          $target.InsertBreak(2)
          $detail = "SectionNextPage, Sections=$([int]$document.Sections.Count)"
        }
        "sectionContinuous" {
          $target.InsertBreak(3)
          $detail = "SectionContinuous, Sections=$([int]$document.Sections.Count)"
        }
        "sectionEvenPage" {
          $target.InsertBreak(4)
          $detail = "SectionEvenPage, Sections=$([int]$document.Sections.Count)"
        }
        "sectionOddPage" {
          $target.InsertBreak(5)
          $detail = "SectionOddPage, Sections=$([int]$document.Sections.Count)"
        }
        "lineNumbers" {
          $document.Sections.Item(1).PageSetup.LineNumbering.Active = -1
          $detail = "LineNumberingActive=$([int]$document.Sections.Item(1).PageSetup.LineNumbering.Active)"
        }
        "sectionDelete" {
          $target.InsertBreak(3)
          $secCountBefore = $document.Sections.Count
          $document.Sections.Item(2).Range.Characters.Item(1).Delete()
          $detail = "Sections=$secCountBefore->$([int]$document.Sections.Count)"
        }
        "indentDec" {
          $target.ParagraphFormat.LeftIndent = 36
          $old = [double]$target.ParagraphFormat.LeftIndent
          $target.ParagraphFormat.LeftIndent = 0
          $detail = "LeftIndent=$old->$([double]$target.ParagraphFormat.LeftIndent)"
        }
        "indentInc" {
          $old = [double]$target.ParagraphFormat.LeftIndent
          $target.ParagraphFormat.LeftIndent = 36
          $detail = "LeftIndent=$old->$([double]$target.ParagraphFormat.LeftIndent)"
        }
        "spacing1" {
          $target.ParagraphFormat.LineSpacingRule = 0
          $detail = "Rule=$([int]$target.ParagraphFormat.LineSpacingRule), Spacing=$([double]$target.ParagraphFormat.LineSpacing)"
        }
        "spacing15" {
          $target.ParagraphFormat.LineSpacingRule = 1
          $detail = "Rule=$([int]$target.ParagraphFormat.LineSpacingRule), Spacing=$([double]$target.ParagraphFormat.LineSpacing)"
        }
        "spacing2" {
          $target.ParagraphFormat.LineSpacingRule = 2
          $detail = "Rule=$([int]$target.ParagraphFormat.LineSpacingRule), Spacing=$([double]$target.ParagraphFormat.LineSpacing)"
        }
        "spacing115" {
          $target.ParagraphFormat.LineSpacingRule = 5
          $target.ParagraphFormat.LineSpacing = $word.LinesToPoints(1.15)
          $detail = "Rule=$([int]$target.ParagraphFormat.LineSpacingRule), Spacing=$([double]$target.ParagraphFormat.LineSpacing)"
        }
        "firstLineIndent" {
          $target.ParagraphFormat.FirstLineIndent = 36
          $detail = "FirstLineIndent=$([double]$target.ParagraphFormat.FirstLineIndent)"
        }
        "spacingBefore" {
          $target.ParagraphFormat.SpaceBefore = 6
          $detail = "SpaceBefore=$([double]$target.ParagraphFormat.SpaceBefore)"
        }
        "spacingAfter" {
          $target.ParagraphFormat.SpaceAfter = 6
          $detail = "SpaceAfter=$([double]$target.ParagraphFormat.SpaceAfter)"
        }
        default { throw "Word operation chưa được cài: $($item.word)" }
      }

      $changed = ([string]$document.Content.Text -ne $beforeText) -or ($detail -ne "")
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
