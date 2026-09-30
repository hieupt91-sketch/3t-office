"""Measure basic VN Writer editing against Word 2016 using real app and COM.

Run from any directory:
  python scripts/layout-audit/_writer_basic_ops.py --output "file test/writer-basic-ops"

No window keystrokes are sent. Word is automated through COM; VN Writer is
operated through its pywebview probe, evaluate_js, and command bus.
"""

from __future__ import annotations

import argparse
import base64
import json
import re
import shutil
import struct
import subprocess
import sys
import time
import zipfile
import zlib
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = ROOT / "file test" / "writer-basic-ops"
SPELLCHECK_COMMON_WORDS = """
tôi bạn anh chị em ta chúng họ ông bà
cha mẹ bố má con cháu người nhà cửa đất nước
quê hương xã hội có không được cần phải muốn biết
nghĩ nói làm đi đến về ở ăn uống ngủ
học dạy đọc viết xem nghe hỏi trả lời cảm ơn
xin chào vâng dạ rồi chưa đang sẽ đã từng vừa
mới rất quá khá nhiều ít một hai ba bốn năm
sáu bảy tám chín mười đây đó kia nào gì ai
đâu sao khi hôm ngày tháng tuần giờ phút sáng trưa
chiều tối đêm nay mai qua trước sau trên dưới trong
ngoài giữa cạnh gần xa trái phải cao thấp dài
ngắn rộng hẹp to nhỏ tốt xấu đẹp cũ nhanh chậm
vui buồn khỏe mệt nóng lạnh khô ướt mưa nắng gió
trời biển sông núi cây hoa lá quả rau cá
thịt cơm bánh trà cà phê sữa đường muối ngon ngọt
chua cay màu đỏ xanh vàng trắng đen mắt tai mũi
miệng tay chân đầu tóc lòng tim sức bệnh thuốc bác
sĩ trường lớp sách vở bút giấy bàn ghế phòng phố
đường xe tàu máy bay việc công tiền giá hàng chợ
tiếng chữ câu từ đoạn trang mục tiêu văn bản
""".split()[:200]


def _tiny_png() -> bytes:
    def chunk(name: bytes, payload: bytes) -> bytes:
        return struct.pack(">I", len(payload)) + name + payload + struct.pack(">I", zlib.crc32(name + payload) & 0xFFFFFFFF)

    # Two horizontal RGB pixels make a valid, visible PNG fixture without Pillow or a network fetch.
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", 2, 1, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(b"\x00\x22\x66\xcc\xff\x44\xaa"))
        + chunk(b"IEND", b"")
    )

WORD_DRIVER = r'''
param(
  [Parameter(Mandatory=$true)][string]$Task,
  [string]$Seed,
  [string]$WordDocx,
  [string]$WordDoc,
  [string]$PngPath,
  [string]$SpellWordsJson,
  [string]$PathsJson,
  [Parameter(Mandatory=$true)][string]$ResultJson,
  [Parameter(Mandatory=$true)][string]$PidFile
)
$ErrorActionPreference = "Stop"

function Initialize-WindowApi {
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoWordWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue
}

function Register-OfficeComRetry {
  Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Threading;
[ComImport, Guid("00000016-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IVnoOleMessageFilter {
  [PreserveSig] int HandleInComingCall(int callType, IntPtr caller, int tickCount, IntPtr interfaceInfo);
  [PreserveSig] int RetryRejectedCall(IntPtr callee, int tickCount, int rejectType);
  [PreserveSig] int MessagePending(IntPtr callee, int tickCount, int pendingType);
}
[ClassInterface(ClassInterfaceType.None)]
public sealed class VnoOleMessageFilter : IVnoOleMessageFilter {
  public int HandleInComingCall(int callType, IntPtr caller, int tickCount, IntPtr interfaceInfo) { return 0; }
  public int RetryRejectedCall(IntPtr callee, int tickCount, int rejectType) {
    if (rejectType == 2 && tickCount < 60000) return 1000;
    return -1;
  }
  public int MessagePending(IntPtr callee, int tickCount, int pendingType) { return 2; }
}
public static class VnoOleMessageFilterRegistration {
  [DllImport("ole32.dll")] private static extern int CoRegisterMessageFilter(IVnoOleMessageFilter next, out IVnoOleMessageFilter previous);
  private static IVnoOleMessageFilter previous;
  public static void Register() { CoRegisterMessageFilter(new VnoOleMessageFilter(), out previous); }
  public static void Unregister() { IVnoOleMessageFilter ignored; CoRegisterMessageFilter(previous, out ignored); previous = null; }
}
"@ -ErrorAction SilentlyContinue
  [VnoOleMessageFilterRegistration]::Register()
}

function New-WordApp($pidPath) {
  Initialize-WindowApi
  $before = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
  $word = New-Object -ComObject Word.Application
  $owner = [uint32]0
  if ($word.Hwnd) {
    [void][VnoWordWindow]::GetWindowThreadProcessId([IntPtr]$word.Hwnd, [ref]$owner)
  }
  if ($owner -le 0 -or $before -contains [int]$owner) {
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
      $created = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id })
      if ($created.Count -eq 1) {
        $owner = [uint32]$created[0].Id
        break
      }
      Start-Sleep -Milliseconds 100
    }
  }
  if ($owner -le 0 -or $before -contains [int]$owner) {
    throw "Could not identify a new WINWORD process owned by this COM run."
  }
  [System.IO.File]::WriteAllText($pidPath, [string]$owner)
  $word.Visible = $false
  $word.DisplayAlerts = 0
  return $word
}

function Set-PageSetup($section) {
  $page = $section.PageSetup
  $page.PaperSize = 7
  $page.Orientation = 0
  $page.TopMargin = 56.692913
  $page.BottomMargin = 56.692913
  $page.LeftMargin = 85.03937
  $page.RightMargin = 56.692913
}

function Set-Paragraph($selection, $alignment, $firstLine, $before, $after, $lineRule, $lineSpacing) {
  $format = $selection.ParagraphFormat
  $format.Alignment = [int]$alignment
  $format.FirstLineIndent = [double]$firstLine
  $format.SpaceBefore = [double]$before
  $format.SpaceAfter = [double]$after
  $format.LineSpacingRule = [int]$lineRule
  $format.LineSpacing = [double]$lineSpacing
  $selection.Font.Name = "Times New Roman"
  $selection.Font.Size = 13
  $selection.Font.Color = 0
}

function Type-Paragraph($selection, $text, $style, $alignment, $firstLine, $before, $after, $lineRule, $lineSpacing) {
  $selection.Style = $style
  Set-Paragraph $selection $alignment $firstLine $before $after $lineRule $lineSpacing
  $selection.TypeText($text)
  $selection.TypeParagraph()
}

function Add-ListItem($selection, $text) {
  $selection.TypeText($text)
  $selection.TypeParagraph()
}

function Exit-List($selection) {
  try { $selection.Range.ListFormat.RemoveNumbers() } catch {}
}

function Read-RangeStyle($range) {
  $font = $range.Font
  return [ordered]@{
    bold = ([int]$font.Bold -ne 0)
    italic = ([int]$font.Italic -ne 0)
    underline = ([int]$font.Underline -ne 0)
    font = [string]$font.Name
    size = [math]::Round([double]$font.Size, 2)
    color = [int]$font.Color
    highlight = [int]$range.HighlightColorIndex
  }
}

function Read-Document($path) {
  $doc = $null
  $result = [ordered]@{ path = $path; opened = $false; error = ""; paragraphs = @(); runs = @{}; tables = @(); headers = @(); footers = @(); pageSetup = @{}; sections = @(); toc = @(); inlineShapes = @(); shapes = @(); revisions = @(); comments = @() }
  try {
    [System.IO.File]::WriteAllText($StageLog, "open " + [System.IO.Path]::GetFileName($path))
    # OpenAndRepair is false. A successful open records that Word accepted the package.
    $doc = $word.Documents.Open($path, $false, $true, $false)
    [System.IO.File]::WriteAllText($StageLog, "repaginate " + [System.IO.Path]::GetFileName($path))
    $doc.Repaginate()
    $result.opened = $true
    $result.readOnly = [bool]$doc.ReadOnly
    [System.IO.File]::WriteAllText($StageLog, "paragraphs " + [System.IO.Path]::GetFileName($path))
    $result.paragraphCount = [int]$doc.Paragraphs.Count
    $rawText = [string]$doc.Content.Text
    $result.text = ([regex]::Replace($rawText, '[\x07\r\f]', [string][char]10)).Trim()
    $paras = New-Object System.Collections.Generic.List[object]
    $pi = 0
    foreach ($paragraph in $doc.Paragraphs) {
      $pi++
      $range = $paragraph.Range
      $text = ([regex]::Replace([string]$range.Text, '[\r\a\n\t]+', ' ')).Trim()
      if (-not $text) { continue }
      $format = $paragraph.Format
      $listType = 0
      $listString = ""
      try { $listType = [int]$range.ListFormat.ListType; $listString = [string]$range.ListFormat.ListString } catch {}
      $paras.Add([ordered]@{
        index = $pi
        text = $text
        style = [string]$paragraph.Style.NameLocal
        alignment = [int]$format.Alignment
        leftIndentCm = [math]::Round([double]$format.LeftIndent / 28.3464567, 3)
        rightIndentCm = [math]::Round([double]$format.RightIndent / 28.3464567, 3)
        firstLineIndentCm = [math]::Round([double]$format.FirstLineIndent / 28.3464567, 3)
        spaceBeforePt = [math]::Round([double]$format.SpaceBefore, 2)
        spaceAfterPt = [math]::Round([double]$format.SpaceAfter, 2)
        lineSpacingRule = [int]$format.LineSpacingRule
        lineSpacingPt = [math]::Round([double]$format.LineSpacing, 2)
        listType = $listType
        listString = $listString.Trim()
      })
    }
    $result.paragraphs = @($paras.ToArray())

    [System.IO.File]::WriteAllText($StageLog, "runs " + [System.IO.Path]::GetFileName($path))
    $runMetrics = [ordered]@{}
    foreach ($token in @("MỨC PHẠT", "THỜI HẠN", "ĐIỀU KHOẢN SAO CHÉP")) {
      $range = $doc.Content.Duplicate
      $find = $range.Find
      $find.ClearFormatting()
      $find.Text = $token
      $find.Forward = $true
      $find.Wrap = 0
      if ($find.Execute()) { $runMetrics[$token] = Read-RangeStyle $range }
      else { $runMetrics[$token] = $null }
    }
    $result.runs = $runMetrics

    [System.IO.File]::WriteAllText($StageLog, "tables " + [System.IO.Path]::GetFileName($path))
    $tables = New-Object System.Collections.Generic.List[object]
    for ($ti = 1; $ti -le $doc.Tables.Count; $ti++) {
      $table = $doc.Tables.Item($ti)
      $rowCounts = @()
      $cells = New-Object System.Collections.Generic.List[string]
      for ($ri = 1; $ri -le $table.Rows.Count; $ri++) {
        $row = $table.Rows.Item($ri)
        $rowCounts += [int]$row.Cells.Count
        foreach ($cell in $row.Cells) { $cells.Add(([regex]::Replace([string]$cell.Range.Text, '[\r\a\n]+', ' ')).Trim()) }
      }
      $columns = 0; $headerCells = 0; $borders = $false
      try { $columns = [int]$table.Columns.Count } catch {}
      try { $headerCells = [int]$table.Rows.Item(1).Cells.Count } catch {}
      try { $borders = [int]$table.Borders.Enable -ne 0 } catch {}
      $headerBold = $false; $columnHeaderBold = $false
      try { $headerBold = [int]$table.Rows.Item(1).Range.Font.Bold -eq -1 } catch {}
      try { $columnHeaderBold = [int]$table.Rows.Item(2).Range.Font.Bold -eq -1 } catch {}
      $tables.Add([ordered]@{
        rows = [int]$table.Rows.Count
        columns = $columns
        rowCellCounts = @($rowCounts)
        mergedHeader = ($headerCells -gt 0 -and $headerCells -lt $columns)
        cells = @($cells.ToArray())
        bordersEnabled = $borders
        headerBold = $headerBold
        columnHeaderBold = $columnHeaderBold
      })
    }
    $result.tables = @($tables.ToArray())

    [System.IO.File]::WriteAllText($StageLog, "page setup " + [System.IO.Path]::GetFileName($path))
    $section = $doc.Sections.Item(1)
    $page = $section.PageSetup
    $result.pageSetup = [ordered]@{
      paperSize = [int]$page.PaperSize
      orientation = [int]$page.Orientation
      widthCm = [math]::Round([double]$page.PageWidth / 28.3464567, 2)
      heightCm = [math]::Round([double]$page.PageHeight / 28.3464567, 2)
      topCm = [math]::Round([double]$page.TopMargin / 28.3464567, 2)
      bottomCm = [math]::Round([double]$page.BottomMargin / 28.3464567, 2)
      leftCm = [math]::Round([double]$page.LeftMargin / 28.3464567, 2)
      rightCm = [math]::Round([double]$page.RightMargin / 28.3464567, 2)
      differentFirstPage = [bool]$page.DifferentFirstPageHeaderFooter
    }
    $sectionMetrics = New-Object System.Collections.Generic.List[object]
    for ($si = 1; $si -le $doc.Sections.Count; $si++) {
      $item = $doc.Sections.Item($si)
      $itemPage = $item.PageSetup
      $firstHeader = $item.Headers.Item(2); $firstFooter = $item.Footers.Item(2)
      $sectionMetrics.Add([ordered]@{
        orientation = [int]$itemPage.Orientation
        paperSize = [int]$itemPage.PaperSize
        widthCm = [math]::Round([double]$itemPage.PageWidth / 28.3464567, 2)
        heightCm = [math]::Round([double]$itemPage.PageHeight / 28.3464567, 2)
        topCm = [math]::Round([double]$itemPage.TopMargin / 28.3464567, 2)
        bottomCm = [math]::Round([double]$itemPage.BottomMargin / 28.3464567, 2)
        leftCm = [math]::Round([double]$itemPage.LeftMargin / 28.3464567, 2)
        rightCm = [math]::Round([double]$itemPage.RightMargin / 28.3464567, 2)
        differentFirstPage = [bool]$itemPage.DifferentFirstPageHeaderFooter
        header = ([regex]::Replace([string]$item.Headers.Item(1).Range.Text, '[\r\a\n\t]+', ' ')).Trim()
        footer = ([regex]::Replace([string]$item.Footers.Item(1).Range.Text, '[\r\a\n\t]+', ' ')).Trim()
        firstPageHeader = ([regex]::Replace([string]$firstHeader.Range.Text, '[\r\a\n\t]+', ' ')).Trim()
        firstPageFooter = ([regex]::Replace([string]$firstFooter.Range.Text, '[\r\a\n\t]+', ' ')).Trim()
      })
    }
    $result.sections = @($sectionMetrics.ToArray())
    $header = $section.Headers.Item(1)
    $footer = $section.Footers.Item(1)
    if ($header.Exists) {
      $codes = @()
      foreach ($field in $header.Range.Fields) { $codes += [string]$field.Code.Text }
      $result.headers = @([ordered]@{ text = ([regex]::Replace([string]$header.Range.Text, '[\r\a\n\t]+', ' ')).Trim(); fields = @($codes) })
    }
    if ($footer.Exists) {
      $codes = @()
      foreach ($field in $footer.Range.Fields) { $codes += [string]$field.Code.Text }
      $result.footers = @([ordered]@{ text = ([regex]::Replace([string]$footer.Range.Text, '[\r\a\n\t]+', ' ')).Trim(); fields = @($codes) })
    }
    $tocMetrics = New-Object System.Collections.Generic.List[object]
    for ($ti = 1; $ti -le $doc.TablesOfContents.Count; $ti++) {
      $tableOfContents = $doc.TablesOfContents.Item($ti)
      $entries = New-Object System.Collections.Generic.List[string]
      foreach ($paragraph in $tableOfContents.Range.Paragraphs) {
        $line = ([regex]::Replace([string]$paragraph.Range.Text, '[\r\a\n\t]+', ' ')).Trim()
        $styleName = [string]$paragraph.Style.NameLocal
        if ($line -and $styleName -match '^TOC\s+[1-3]$') { $entries.Add($line) }
      }
      $tocMetrics.Add([ordered]@{ entries = @($entries.ToArray()); fieldCount = [int]$tableOfContents.Range.Fields.Count })
    }
    $result.toc = @($tocMetrics.ToArray())
    $inlineMetrics = New-Object System.Collections.Generic.List[object]
    foreach ($inline in $doc.InlineShapes) {
      $inlineMetrics.Add([ordered]@{
        widthMm = [math]::Round([double]$inline.Width / 72 * 25.4, 2)
        heightMm = [math]::Round([double]$inline.Height / 72 * 25.4, 2)
        wrap = 'inline'
      })
    }
    $result.inlineShapes = @($inlineMetrics.ToArray())
    $shapeMetrics = New-Object System.Collections.Generic.List[object]
    foreach ($shape in $doc.Shapes) {
      $shapeMetrics.Add([ordered]@{
        widthMm = [math]::Round([double]$shape.Width / 72 * 25.4, 2)
        heightMm = [math]::Round([double]$shape.Height / 72 * 25.4, 2)
        leftMm = [math]::Round([double]$shape.Left / 72 * 25.4, 2)
        topMm = [math]::Round([double]$shape.Top / 72 * 25.4, 2)
        wrapType = [int]$shape.WrapFormat.Type
        relativeH = [int]$shape.RelativeHorizontalPosition
        relativeV = [int]$shape.RelativeVerticalPosition
      })
    }
    $result.shapes = @($shapeMetrics.ToArray())
    $revisionMetrics = New-Object System.Collections.Generic.List[object]
    foreach ($revision in $doc.Revisions) {
      $revisionMetrics.Add([ordered]@{ type = [int]$revision.Type; text = ([regex]::Replace([string]$revision.Range.Text, '[\r\a\n\t]+', ' ')).Trim(); author = [string]$revision.Author })
    }
    $result.revisions = @($revisionMetrics.ToArray())
    $commentMetrics = New-Object System.Collections.Generic.List[object]
    foreach ($comment in $doc.Comments) {
      $replyMetrics = New-Object System.Collections.Generic.List[string]
      try { foreach ($reply in $comment.Replies) { $replyMetrics.Add(([regex]::Replace([string]$reply.Range.Text, '[\r\a\n\t]+', ' ')).Trim()) } } catch {}
      $done = $false; try { $done = [bool]$comment.Done } catch {}
      $commentMetrics.Add([ordered]@{ text = ([regex]::Replace([string]$comment.Range.Text, '[\r\a\n\t]+', ' ')).Trim(); author = [string]$comment.Author; done = $done; replies = @($replyMetrics.ToArray()) })
    }
    $result.comments = @($commentMetrics.ToArray())
    $result.pageBreakCount = ([regex]::Matches([string]$doc.Content.Text, [string][char]12)).Count
    foreach ($paragraph in $doc.Paragraphs) {
      try { if ([int]$paragraph.Format.PageBreakBefore -eq -1) { $result.pageBreakCount++ } } catch {}
    }
    [System.IO.File]::WriteAllText($StageLog, "done " + [System.IO.Path]::GetFileName($path))
  } catch {
    $result.error = [regex]::Replace($_.Exception.Message, '[\r\n]+', ' ')
  } finally {
    if ($doc) { try { $doc.Close(0) } catch {}; [void][Runtime.InteropServices.Marshal]::ReleaseComObject($doc) }
  }
  return $result
}

$word = $null
$stage = "initialize"
$StageLog = "$ResultJson.stage"
try {
  Register-OfficeComRetry
  $word = New-WordApp $PidFile
  if ($Task -eq "Edit") {
    $stage = "create seed"
    $seedDoc = $word.Documents.Add()
    Set-PageSetup $seedDoc.Sections.Item(1)
    $seedDoc.SaveAs2($Seed, 16)
    $seedDoc.Close(0)
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($seedDoc)
    $doc = $word.Documents.Open($Seed, $false, $false, $false)
    Set-PageSetup $doc.Sections.Item(1)
    $stage = "heading and body text"
    $sel = $word.Selection
    $sel.HomeKey(6)

    Type-Paragraph $sel "BÁO CÁO TỔNG HỢP" "Heading 1" 0 0 0 8 0 12
    Type-Paragraph $sel "Kính gửi: Phòng Hành chính và các đơn vị liên quan." "Normal" 3 28.3464567 4 5 5 13.8
    Type-Paragraph $sel "Căn cứ hồ sơ, chúng tôi rà soát bản nháp để hoàn thiện văn bản trước khi ký." "Normal" 3 28.3464567 4 5 5 13.8
    $sel.Style = "Normal"
    Set-Paragraph $sel 3 28.3464567 0 4 5 13.8
    $sel.TypeText("MỨC PHẠT: THỜI HẠN thực hiện theo hợp đồng.")
    $sel.TypeParagraph()
    $range = $doc.Content.Duplicate; $find = $range.Find; $find.ClearFormatting()
    $find.Text = "MỨC PHẠT"; $find.Forward = $true; $find.Wrap = 0
    if ($find.Execute()) { $range.Font.Name = "Times New Roman"; $range.Font.Size = 13; $range.Font.Underline = 1; $range.Font.Color = 192; $range.HighlightColorIndex = 7 }
    $range = $doc.Content.Duplicate; $find = $range.Find; $find.ClearFormatting()
    $find.Text = "THỜI HẠN"; $find.Forward = $true; $find.Wrap = 0
    if ($find.Execute()) { $range.Font.Name = "Times New Roman"; $range.Font.Size = 14; $range.Font.Bold = -1; $range.Font.Italic = -1; $range.Font.Underline = 0; $range.Font.Color = 0; $range.HighlightColorIndex = 0 }
    Type-Paragraph $sel "Điều 1. Nội dung và trách nhiệm thực hiện" "Heading 2" 0 0 0 9 4 18
    Type-Paragraph $sel "Bên A bàn giao hồ sơ đầy đủ; Bên B nghiệm thu, lưu trữ và phản hồi bằng văn bản." "Normal" 3 28.3464567 4 5 4 18
    Type-Paragraph $sel "1.1. Hai bên thống nhất tiến độ, tiêu chuẩn nghiệm thu và đầu mối phối hợp." "Heading 3" 0 0 0 6 3 18
    Type-Paragraph $sel "Đoạn báo cáo giãn dòng 1,5 để người soạn văn bản dễ theo dõi." "Normal" 3 28.3464567 6 1 5 18
    $sel.ParagraphFormat.LineSpacingRule = 1; $sel.ParagraphFormat.LineSpacing = 18; $sel.TypeParagraph()
    $stage = "lists"
    $sel.Style = "Normal"; Set-Paragraph $sel 0 0 0 3 0 13.8
    $sel.Range.ListFormat.ApplyBulletDefault()
    Add-ListItem $sel "Hồ sơ pháp lý và phụ lục kèm theo"
    Add-ListItem $sel "Biên bản bàn giao có chữ ký hai bên"
    Exit-List $sel
    $sel.Range.ListFormat.ApplyNumberDefault()
    Add-ListItem $sel "Kiểm tra chứng từ"
    Add-ListItem $sel "Ký xác nhận nghiệm thu"
    Exit-List $sel
    $alpha = $word.ListGalleries.Item(2).ListTemplates.Item(1)
    $alpha.ListLevels.Item(1).NumberStyle = 4
    $alpha.ListLevels.Item(1).NumberFormat = "%1)"
    $sel.Range.ListFormat.ApplyListTemplateWithLevel($alpha, $false, 0, 2, 1)
    Add-ListItem $sel "Lập biên bản"
    Add-ListItem $sel "Lưu hồ sơ"
    Exit-List $sel
    $sel.Range.ListFormat.ApplyBulletDefault()
    Add-ListItem $sel "— Bổ sung tài liệu đối chiếu"
    Add-ListItem $sel "— Lưu bản chính tại văn thư"
    Exit-List $sel

    # Persist the shared starting document before applying the measured Word operations.
    # VN Writer opens this seed and performs the same operations independently.
    $doc.Save()

    $stage = "find replace and page break"
    $find = $doc.Content.Find
    $find.ClearFormatting(); $find.Replacement.ClearFormatting()
    [void]$find.Execute("bản nháp", $false, $false, $false, $false, $false, $true, 1, $false, "bản chính", 2)
    $sel.EndKey(6); $sel.TypeParagraph(); $sel.InsertBreak(7)
    $sel.TypeText("NỘI DUNG TRANG SAU: Biên bản nghiệm thu và danh sách hồ sơ.")
    $sel.TypeParagraph()

    $stage = "table"
    $table = $doc.Tables.Add($sel.Range, 3, 4)
    $table.Rows.Add() | Out-Null
    $table.Columns.Add() | Out-Null
    $table.Rows.Last.Delete()
    $table.Columns.Last.Delete()
    $table.Cell(1, 1).Merge($table.Cell(1, 4))
    $table.Cell(1, 1).Range.Text = "ĐIỀU KHOẢN SAO CHÉP"
    $table.Cell(2, 1).Range.Text = "STT"
    $table.Cell(2, 2).Range.Text = "Hạng mục"
    $table.Cell(2, 3).Range.Text = "Thời hạn"
    $table.Cell(2, 4).Range.Text = "Phụ trách"
    $table.Cell(3, 1).Range.Text = "01"
    $table.Cell(3, 2).Range.Text = "Nghiệm thu hồ sơ"
    $table.Cell(3, 3).Range.Text = "15 ngày"
    $table.Cell(3, 4).Range.Text = "Bên B"
    $table.Borders.Enable = 1
    $table.Range.Font.Name = "Times New Roman"; $table.Range.Font.Size = 13
    $table.Rows.Item(1).Range.Font.Bold = -1; $table.Rows.Item(2).Range.Font.Bold = -1
    $sel.EndKey(6); $sel.TypeParagraph()
    $sel.TypeText("Xác nhận: ĐẠI DIỆN BÊN A — ĐẠI DIỆN BÊN B")
    $sel.TypeParagraph(); $sel.TypeText("Điều khoản được lập thành hai bản chính có giá trị như nhau.")
    $sel.TypeParagraph()
    $stage = "copy paste and undo redo"
    $range = $doc.Content.Duplicate; $find = $range.Find; $find.ClearFormatting()
    $find.Text = "THỜI HẠN"; $find.Forward = $true; $find.Wrap = 0
    if ($find.Execute()) { $range.Copy(); $sel.EndKey(6); $sel.TypeParagraph(); $sel.Paste() }
    $sel.EndKey(6); $sel.TypeText(" KIỂM TRA UNDO")
    $word.CommandBars.ExecuteMso("Undo")
    $word.CommandBars.ExecuteMso("Redo")
    $stage = "header and footer"
    $section = $doc.Sections.Item(1)
    $section.Headers.Item(1).Range.Text = "VN Office | Báo cáo tổng hợp"
    $section.Headers.Item(1).Range.ParagraphFormat.Alignment = 1
    $footer = $section.Footers.Item(1); $footer.Range.Text = "Trang "
    $footer.Range.Collapse(0); [void]$footer.Range.Fields.Add($footer.Range, 33)
    $footer.Range.ParagraphFormat.Alignment = 1

    $stage = "first-page, toc and landscape section"
    $section.PageSetup.DifferentFirstPageHeaderFooter = -1
    $doc.TablesOfContents.Add($doc.Range(0, 0), $true, 1, 3) | Out-Null
    $sel.EndKey(6); $sel.TypeParagraph(); $sel.Style = "Heading 2"
    $sel.TypeText("PHỤ LỤC BỔ SUNG SAU KHI TẠO MỤC LỤC"); $sel.TypeParagraph()
    $doc.TablesOfContents.Item(1).Update()
    $sel.EndKey(6); $sel.TypeParagraph(); $sel.InsertBreak(2)
    $landscape = $doc.Sections.Item($doc.Sections.Count)
    $landscape.PageSetup.Orientation = 1
    $sel.TypeText("NỘI DUNG MỤC NGANG"); $sel.TypeParagraph()

    $stage = "inline, square and tight pictures"
    $range = $sel.Range.Duplicate
    $inline = $doc.InlineShapes.AddPicture($PngPath, $false, $true, $range)
    $inline.Width = 56.692913; $inline.Height = 28.346457
    $sel.SetRange($inline.Range.End, $inline.Range.End); $sel.TypeParagraph()
    foreach ($wrap in @(0, 1)) {
      $sel.EndKey(6); $sel.TypeParagraph()
      $shape = $doc.InlineShapes.AddPicture($PngPath, $false, $true, $sel.Range).ConvertToShape()
      $shape.Width = 56.692913; $shape.Height = 28.346457
      $shape.WrapFormat.Type = $wrap
      $shape.RelativeHorizontalPosition = 0
      $shape.RelativeVerticalPosition = 0
      $shape.Left = $(if ($wrap -eq 0) { -999998 } else { -999996 })
      $shape.Top = 0
      $sel.SetRange($shape.Anchor.End, $shape.Anchor.End); $sel.TypeParagraph()
    }
    $sel.EndKey(6); $sel.TypeParagraph(); $sel.TypeText("VĂN BẢN CẦN THEO DÕI: xóa và thêm")
    $sel.TypeParagraph(); $sel.TypeText("DÒNG CÓ NHẬN XÉT")

    $stage = "track changes and comments"
    $doc.TrackRevisions = $true
    $range = $doc.Content.Duplicate; $find = $range.Find; $find.ClearFormatting()
    $find.Text = "xóa"; $find.Forward = $true; $find.Wrap = 0
    if ($find.Execute()) { $range.Delete() }
    $sel.EndKey(6); $sel.TypeText(" mới")
    $doc.TrackRevisions = $false
    $range = $doc.Content.Duplicate; $find = $range.Find; $find.ClearFormatting()
    $find.Text = "DÒNG CÓ NHẬN XÉT"; $find.Forward = $true; $find.Wrap = 0
    if ($find.Execute()) {
      $wordComment = $doc.Comments.Add($range, "Ghi chú: kiểm tra nội dung.")
      try { $wordComment.Done = $true } catch {}
      try { $wordComment.Replies.Add("đã cập nhật") | Out-Null } catch {}
    }
    $stage = "Vietnamese spell check"
    $spellWords = @($SpellWordsJson | ConvertFrom-Json)
    $sel.EndKey(6); $sel.TypeParagraph()
    $spellStart = [int]$sel.Range.Start
    $sel.TypeText(($spellWords -join " "))
    $spellEnd = [int]$sel.Range.End
    $spellRange = $doc.Range($spellStart, $spellEnd)
    $spellRange.LanguageID = 1066
    $spellRange.NoProofing = 0
    $word.Selection.SetRange($spellEnd, $spellEnd)
    $word.Selection.TypeText(" chínnh")
    $word.Selection.Range.LanguageID = 1066
    $sampleIssues = -1; $suggestions = @(); $spellError = ""
    try { $sampleIssues = [int]$spellRange.SpellingErrors.Count } catch { $spellError = [string]$_.Exception.Message }
    try {
      $spellSuggestions = $word.GetSpellingSuggestions("chínnh")
      foreach ($suggestion in $spellSuggestions) { $suggestions += [string]$suggestion.Name }
    } catch { if (-not $spellError) { $spellError = [string]$_.Exception.Message } }
    $spellStats = [ordered]@{ sampleWords = $spellWords.Count; correctWordIssues = $sampleIssues; typoSuggestions = @($suggestions); error = $spellError }
    $typoRange = $doc.Content.Duplicate; $typoFind = $typoRange.Find; $typoFind.ClearFormatting()
    $typoFind.Text = "chínnh"; $typoFind.Forward = $true; $typoFind.Wrap = 0
    if ($typoFind.Execute()) { $typoRange.Text = "chính" }
    $stage = "save docx and doc"
    $doc.SaveAs2($WordDocx, 16); $doc.SaveAs2($WordDoc, 0)
    $doc.Close(0); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($doc)
    [System.IO.File]::WriteAllText($ResultJson, (ConvertTo-Json -InputObject ([ordered]@{ ok = $true; spellCheck = $spellStats }) -Depth 5), (New-Object System.Text.UTF8Encoding($false)))
    "WORD_SCENARIO_OK"
  } elseif ($Task -eq "Inspect") {
    $paths = Get-Content -LiteralPath $PathsJson -Raw -Encoding UTF8 | ConvertFrom-Json
    $metrics = [ordered]@{}
    foreach ($entry in $paths.PSObject.Properties) {
      if (Test-Path -LiteralPath $entry.Value) { $metrics[$entry.Name] = Read-Document ([string]$entry.Value) }
      else { $metrics[$entry.Name] = [ordered]@{ path = [string]$entry.Value; opened = $false; error = "File not found" } }
    }
    [System.IO.File]::WriteAllText($ResultJson, (ConvertTo-Json -InputObject $metrics -Depth 12), (New-Object System.Text.UTF8Encoding($false)))
    "WORD_INSPECT_OK"
  } else { throw "Unknown task: $Task" }
} catch {
  [System.IO.File]::WriteAllText($ResultJson, (ConvertTo-Json -InputObject ([ordered]@{ ok = $false; stage = $stage; error = [regex]::Replace($_.Exception.Message, '[\r\n]+', ' '); trace = [string]$_.ScriptStackTrace }) -Depth 5), (New-Object System.Text.UTF8Encoding($false)))
  Write-Error $_
  exit 1
} finally {
  if ($word) { try { $word.Quit() } catch {}; [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
  try { [VnoOleMessageFilterRegistration]::Unregister() } catch {}
}
'''


def _vn_html() -> str:
    def p(text: str, extra: str = "") -> str:
        return (
            '<p style="font-family:Times New Roman;font-size:13pt;'
            'text-align:left;text-indent:1cm;line-height:1.15;'
            f'margin:4pt 0 5pt;{extra}">{text}</p>'
        )

    return "".join([
        '<h1 data-basic-style="Heading 1" style="font-family:Times New Roman;font-size:14pt">BÁO CÁO TỔNG HỢP</h1>',
        p("Kính gửi: Phòng Hành chính và các đơn vị liên quan."),
        p("Căn cứ hồ sơ, chúng tôi rà soát bản nháp để hoàn thiện văn bản trước khi ký."),
        p('<span>MỨC PHẠT: </span><span>THỜI HẠN</span><span> thực hiện theo hợp đồng.</span>'),
        '<h2 data-basic-style="Heading 2" style="font-family:Times New Roman;font-size:14pt">Điều 1. Nội dung và trách nhiệm thực hiện</h2>',
        p("Bên A bàn giao hồ sơ đầy đủ; Bên B nghiệm thu, lưu trữ và phản hồi bằng văn bản.", "line-height:18pt"),
        '<h3 data-basic-style="Heading 3" style="font-family:Times New Roman;font-size:13pt">1.1. Hai bên thống nhất tiến độ, tiêu chuẩn nghiệm thu và đầu mối phối hợp.</h3>',
        p("Đoạn báo cáo giãn dòng 1,5 để người soạn văn bản dễ theo dõi.", "margin:6pt 0 1pt;line-height:1.5"),
        '<p><br></p>',
        '<ul style="font-family:Times New Roman;font-size:13pt"><li>Hồ sơ pháp lý và phụ lục kèm theo</li><li>Biên bản bàn giao có chữ ký hai bên</li></ul>',
        '<ol style="font-family:Times New Roman;font-size:13pt"><li>Kiểm tra chứng từ</li><li>Ký xác nhận nghiệm thu</li></ol>',
        '<ol type="a" style="font-family:Times New Roman;font-size:13pt"><li>Lập biên bản</li><li>Lưu hồ sơ</li></ol>',
        '<ul style="list-style-type:disc;font-family:Times New Roman;font-size:13pt"><li>— Bổ sung tài liệu đối chiếu</li><li>— Lưu bản chính tại văn thư</li></ul>',
    ])


VN_PROBE = r'''
import os, sys, time, json
ROOT, SEED, OUTPUT, MODE = sys.argv[1:5]
sys.path.insert(0, ROOT)
import webview, main as vnmain
server, port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args([SEED])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
window = webview.create_window(title="VN Writer Basic Ops", url=vnmain.build_launch_url(app_kind, initial_file, port=port), width=1400, height=900, js_api=api)
window.create_file_dialog = lambda *args, **kwargs: OUTPUT
STATUS = os.path.join(os.path.dirname(OUTPUT), "_writer_basic_ops_probe_status.json")

def write_status(result):
    with open(STATUS, "w", encoding="utf-8") as status_file:
        json.dump(result, status_file, ensure_ascii=False)

def after_load(win):
    result = {"loaded": False, "actions": {}, "error": "", "save": {"path": OUTPUT, "exists": False, "error": ""}}
    write_status({"phase": "waiting-for-writer", "mode": MODE})
    for _ in range(90):
        time.sleep(2)
        try:
            ready = win.evaluate_js(
                "(() => { const b=document.querySelector('.vno-writer-body'); "
                "return JSON.stringify({body:!!b, loading:document.querySelector('.vno-loading-screen')?.innerText||'', "
                "title:document.title, text:b?.innerText?.slice(0,100)||''}); })()"
            )
            state = json.loads(ready) if ready else {}
            write_status({"phase": "waiting-for-writer", "mode": MODE, "state": state})
            ready = bool(state.get("body") and (MODE != "resave" or "BÁO CÁO TỔNG HỢP" in state.get("text", "")))
        except Exception as error:
            result["error"] = "WebView evaluate_js while waiting: " + str(error)
            write_status({"phase": "webview-error", "error": result["error"]})
            break
        if ready:
            result["loaded"] = True
            break
    if not result["loaded"] and not result["error"]:
        result["error"] = "Writer editor did not become ready"
    if result["loaded"]:
        write_status({"phase": "writer-ready", "mode": MODE})
        if MODE == "edit":
            script = r"""
            (async function() {
              const out = { actions: {}, error: "" };
              try {
                const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
                const body = () => document.querySelector('.vno-writer-body');
                const selectText = (needle) => {
                  const root = body(); if (!root) return false;
                  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
                  let node;
                  while ((node = walker.nextNode())) {
                    const at = node.textContent.indexOf(needle);
                    if (at >= 0) {
                      const range = document.createRange(); range.setStart(node, at); range.setEnd(node, at + needle.length);
                      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(range); root.focus(); return true;
                    }
                  }
                  return false;
                };
                const run = async (id, args = null) => {
                  const value = await bus.execute(id, args); out.actions[id] = value !== false; return value;
                };
                const root = body(); root.focus(); document.execCommand('selectAll');
                if (!document.execCommand('insertHTML', false, __HTML__)) throw new Error('Could not insert scenario text');
                for (const [needle, command, args] of [
                  ['THỜI HẠN', 'writer.text.bold'], ['THỜI HẠN', 'writer.text.italic'],
                  ['MỨC PHẠT', 'writer.text.underline'], ['MỨC PHẠT', 'writer.color.text', '#c00000'],
                  ['MỨC PHẠT', 'writer.color.highlight', '#ffff00'], ['THỜI HẠN', 'writer.font.family', 'Times New Roman'],
                  ['THỜI HẠN', 'writer.font.size', '4']
                ]) if (selectText(needle)) await run(command, args ?? null);
                for (const [needle, style] of [
                  ['BÁO CÁO TỔNG HỢP', 'heading1'],
                  ['Điều 1. Nội dung và trách nhiệm thực hiện', 'heading2'],
                  ['1.1. Hai bên thống nhất tiến độ, tiêu chuẩn nghiệm thu và đầu mối phối hợp.', 'heading3']
                ]) if (selectText(needle)) out.actions['style:' + style] = (await run('writer.style.apply', style)) !== false;
                for (const needle of ['Kính gửi:', 'Bên A bàn giao', 'Đoạn báo cáo giãn dòng']) {
                  if (selectText(needle)) await run('writer.para.justify');
                }
                if (selectText('Bên A bàn giao')) {
                  const block = getSelection().anchorNode.parentElement.closest('p');
                  if (block) block.style.lineHeight = '18pt';
                }
                await run('common.edit.replace');
                for (let i = 0; i < 40 && !document.querySelector('#vno-fr-find-input'); i++) await new Promise(r => setTimeout(r, 50));
                const find = document.querySelector('#vno-fr-find-input'), replacement = document.querySelector('#vno-fr-replace-input');
                if (!find || !replacement) throw new Error('Replace dialog did not open');
                find.value = 'bản nháp'; replacement.value = 'bản chính';
                document.querySelector('#vno-fr-replace-all-btn').click(); document.querySelector('.vno-fr-close-btn')?.click();
                out.actions.findReplace = !body().innerText.includes('bản nháp') && body().innerText.includes('bản chính');

                const setupPromise = bus.execute('writer.page.margins');
                for (let i = 0; i < 40 && !document.querySelector('#vno-pagesetup-margin-top'); i++) await new Promise(r => setTimeout(r, 50));
                const setField = (id, value) => { const el = document.querySelector(id); if (!el) throw new Error('Missing page setup field ' + id); el.value = value; };
                setField('#vno-pagesetup-size', 'a4'); setField('#vno-pagesetup-orientation', 'portrait');
                const firstPageToggle = document.querySelector('#vno-pagesetup-different-first-page');
                if (firstPageToggle) firstPageToggle.checked = true;
                setField('#vno-pagesetup-margin-top', 20); setField('#vno-pagesetup-margin-bottom', 20);
                setField('#vno-pagesetup-margin-left', 30); setField('#vno-pagesetup-margin-right', 20);
                document.querySelector('.vno-dialog-ok-btn').click(); out.actions.pageSetup = (await setupPromise) !== false;

                let current = body(); current.focus();
                current.insertAdjacentHTML('beforeend', '<p><br></p><p><br></p>');
                const endRange = document.createRange(); endRange.selectNodeContents(current.lastElementChild); endRange.collapse(false);
                getSelection().removeAllRanges(); getSelection().addRange(endRange);
                await run('writer.page.break');
                document.execCommand('insertText', false, 'NỘI DUNG TRANG SAU: Biên bản nghiệm thu và danh sách hồ sơ.');
                document.execCommand('insertParagraph');
                const breakMarker = Array.from(body().querySelectorAll('p')).find(p => p.getAttribute('data-vno-page-break') === 'true');
                out.actions.pageBreak = Boolean(breakMarker && /page-break-before:\s*always|break-before:\s*page/i.test(breakMarker.getAttribute('style') || ''));
                current = body(); const tablePos = document.createRange(); tablePos.selectNodeContents(current); tablePos.collapse(false);
                getSelection().removeAllRanges(); getSelection().addRange(tablePos); await run('writer.table.insert');
                const tables = body().querySelectorAll('table'); const table = tables[tables.length - 1];
                if (!table) throw new Error('writer.table.insert did not create a table');
                const tb = table.tBodies[0] || table.appendChild(document.createElement('tbody'));
                while (tb.rows.length < 3) { const row = tb.insertRow(); for (let c = 0; c < 3; c++) row.insertCell(); }
                const addRow = tb.insertRow(); for (let c = 0; c < 4; c++) addRow.insertCell(); addRow.remove();
                for (const row of Array.from(tb.rows)) row.insertCell();
                for (const row of Array.from(tb.rows)) row.deleteCell(row.cells.length - 1);
                const head = tb.rows[0]; while (head.cells.length > 1) head.deleteCell(1); head.cells[0].colSpan = 4;
                head.cells[0].textContent = 'ĐIỀU KHOẢN SAO CHÉP';
                const values = [['STT', 'Hạng mục', 'Thời hạn', 'Phụ trách'], ['01', 'Nghiệm thu hồ sơ', '15 ngày', 'Bên B']];
                for (let r = 1; r < 3; r++) for (let c = 0; c < 4; c++) tb.rows[r].cells[c].textContent = values[r - 1][c];
                for (const cell of table.querySelectorAll('th,td')) { cell.style.border = '1px solid #000'; cell.style.padding = '6pt'; cell.style.fontFamily = 'Times New Roman'; cell.style.fontSize = '13pt'; }
                for (const row of [tb.rows[0], tb.rows[1]]) for (const cell of row.cells) cell.style.fontWeight = 'bold';
                out.actions.tableAddDeleteMergeBorders = tables.length === 1 && tb.rows.length === 3 && tb.rows[0].cells.length === 1 && tb.rows[1].cells.length === 4;
                const tail = document.createElement('p'); tail.textContent = 'Xác nhận: ĐẠI DIỆN BÊN A — ĐẠI DIỆN BÊN B'; body().appendChild(tail);
                const finalLine = document.createElement('p'); finalLine.textContent = 'Điều khoản được lập thành hai bản chính có giá trị như nhau.'; body().appendChild(finalLine);
                await run('writer.header.insert'); const header = document.querySelector('.vno-writer-header');
                if (header) header.innerHTML = '<p style="text-align:center;font:10pt Times New Roman">VN Office | Báo cáo tổng hợp</p>';
                await run('writer.footer.insert'); const footer = document.querySelector('.vno-writer-footer');
                if (footer) footer.innerHTML = '<p style="text-align:center;font:10pt Times New Roman">Trang <span data-vno-field="PAGE">1</span></p>';
                out.actions.headerFooter = Boolean(header && footer);
                body().insertAdjacentHTML('beforeend', '<p><br></p>');
                const copyLine = document.createElement('p'); body().appendChild(copyLine);
                if (selectText('TH\u1edcI H\u1ea0N')) {
                  const copied = getSelection().getRangeAt(0).cloneContents(); const holder = document.createElement('div'); holder.appendChild(copied);
                  const copiedHtml = holder.innerHTML;
                  const paste = document.createRange(); paste.selectNodeContents(copyLine); paste.collapse(false);
                  paste.insertNode(holder.firstChild);
                  out.actions.copyPaste = copyLine.textContent.includes('TH\u1edcI H\u1ea0N') && copyLine.innerHTML === copiedHtml;
                }
                const earlyUndoAdapter = window.__vnoAppInstance?.adapter;
                earlyUndoAdapter?.clearUndoRedo();
                const undoRange = document.createRange(); undoRange.selectNodeContents(copyLine); undoRange.collapse(false);
                getSelection().removeAllRanges(); getSelection().addRange(undoRange); document.execCommand('insertText', false, ' KIỂM TRA UNDO');
                earlyUndoAdapter?.recordSnapshot('Basic operations undo probe marker');
                await new Promise(r => setTimeout(r, 800)); await run('common.edit.undo'); await run('common.edit.redo');
                out.actions.undoRedo = body().innerText.includes('KIỂM TRA UNDO');

                const firstHeading = body().querySelector('h1, [data-basic-style="Heading 1"]');
                if (firstHeading) {
                  const firstText = firstHeading.textContent.trim();
                  if (selectText(firstText)) out.actions.tocInsert = (await run('writer.reference.tocInsert')) !== false;
                }
                body().insertAdjacentHTML('beforeend', '<h2 data-basic-style="Heading 2">PHỤ LỤC BỔ SUNG SAU KHI TẠO MỤC LỤC</h2>');
                out.actions.tocUpdate = (await run('writer.reference.tocUpdate')) !== false;
                const toc = body().querySelector('[data-vno-toc="true"]');
                out.actions.tocEntries = toc ? [...toc.querySelectorAll('.vno-toc-item')].map(item => ({
                  text: item.querySelector('.vno-toc-text')?.textContent?.trim() || '',
                  page: item.querySelector('.vno-toc-page')?.textContent?.trim() || '',
                  level: Number((item.className.match(/vno-toc-level-(\d+)/) || [])[1] || 0)
                })) : [];

                const end = document.createRange(); end.selectNodeContents(body()); end.collapse(false);
                getSelection().removeAllRanges(); getSelection().addRange(end);
                out.actions.sectionBreak = (await run('writer.section.nextPage')) !== false;
                const sectionSetup = bus.execute('writer.page.margins');
                for (let i = 0; i < 40 && !document.querySelector('#vno-pagesetup-orientation'); i++) await new Promise(r => setTimeout(r, 50));
                const orientation = document.querySelector('#vno-pagesetup-orientation');
                if (orientation) {
                  orientation.value = 'landscape';
                  document.querySelector('.vno-dialog-ok-btn').click();
                  out.actions.landscapeSection = (await sectionSetup) !== false;
                  body().insertAdjacentHTML('beforeend', '<p>NỘI DUNG MỤC NGANG</p>');
                } else out.actions.landscapeSection = false;

                out.actions.differentFirstPage = firstPageToggle?.checked === true;
                const pngDataUrl = __PNG_DATA_URL__;
                const originalInputClick = HTMLInputElement.prototype.click;
                HTMLInputElement.prototype.click = function() {
                  if (this.type === 'file' && /image/i.test(this.accept || '')) {
                    const bytes = Uint8Array.from(atob(pngDataUrl.split(',')[1]), c => c.charCodeAt(0));
                    const file = new File([bytes], 'writer-basic-ops.png', { type: 'image/png' });
                    Object.defineProperty(this, 'files', { configurable: true, value: [file] });
                    this.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
                  }
                  return originalInputClick.call(this);
                };
                for (let i = 0; i < 3; i++) {
                  await run('writer.image.insert');
                  for (let wait = 0; wait < 80 && body().querySelectorAll('img').length < i + 1; wait++) await new Promise(r => setTimeout(r, 50));
                }
                HTMLInputElement.prototype.click = originalInputClick;
                const pictures = [...body().querySelectorAll('img')].slice(-3);
                const wraps = ['square', 'tight', 'inline'];
                const positions = ['topLeft', 'topRight', ''];
                for (let i = 0; i < pictures.length; i++) {
                  const picture = pictures[i];
                  picture.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                  for (let wait = 0; wait < 40 && !document.querySelector('#vno-ribbon-tabpanel-pictureFormat select[data-arrange="wrap"]'); wait++) await new Promise(r => setTimeout(r, 50));
                  const wrapSelect = document.querySelector('#vno-ribbon-tabpanel-pictureFormat select[data-arrange="wrap"]');
                  if (!wrapSelect) break;
                  wrapSelect.value = wraps[i]; wrapSelect.dispatchEvent(new Event('change', { bubbles: true }));
                  const widthInput = document.querySelector('#vno-ribbon-tabpanel-pictureFormat input[data-arrange="width"]');
                  if (widthInput) { widthInput.value = '20'; widthInput.dispatchEvent(new Event('change', { bubbles: true })); }
                  const positionSelect = document.querySelector('#vno-ribbon-tabpanel-pictureFormat select[data-arrange="position"]');
                  if (positions[i] && positionSelect) { positionSelect.value = positions[i]; positionSelect.dispatchEvent(new Event('change', { bubbles: true })); }
                  await new Promise(r => setTimeout(r, 80));
                }
                out.actions.pictureWraps = pictures.map(picture => ({
                  wrap: picture.dataset.vnoWrap || '', width: picture.dataset.vnoWidthMm || picture.style.width, height: picture.dataset.vnoHeightMm || picture.style.height,
                  position: picture.style.position, left: picture.style.left || '', top: picture.style.top || '', float: picture.style.float || ''
                }));
                out.actions.pictureSize = pictures.length === 3 && pictures.every(picture => Math.abs(Number(picture.dataset.vnoWidthMm) - 20) < 0.1 && Math.abs(Number(picture.dataset.vnoHeightMm) - 10) < 0.1);

                await run('writer.trackChanges.toggle', { enabled: true });
                const acceptPara = document.createElement('p'); body().appendChild(acceptPara);
                const acceptRange = document.createRange(); acceptRange.selectNodeContents(acceptPara); acceptRange.collapse(false);
                getSelection().removeAllRanges(); getSelection().addRange(acceptRange);
                body().dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'ACCEPTED_CHANGE', bubbles: true, cancelable: true }));
                const acceptApplied = (await run('writer.trackChanges.acceptOne')) !== false;
                const acceptedChange = acceptPara.textContent.includes('ACCEPTED_CHANGE') && !acceptPara.querySelector('[data-vno-change]');
                const rejectPara = document.createElement('p'); rejectPara.textContent = 'REJECTED_CHANGE'; body().appendChild(rejectPara);
                const rejectSelected = selectText('REJECTED_CHANGE');
                if (rejectSelected) body().dispatchEvent(new InputEvent('beforeinput', { inputType: 'deleteByCut', bubbles: true, cancelable: true }));
                const rejectApplied = (await run('writer.trackChanges.rejectOne')) !== false;
                const rejectedChange = rejectPara.textContent.includes('REJECTED_CHANGE') && !rejectPara.querySelector('[data-vno-change]');
                out.actions.trackChangeAcceptReject = { accepted: acceptApplied && acceptedChange, rejected: rejectApplied && rejectedChange };
                const trackedText = 'xóa';
                await run('writer.trackChanges.toggle', { enabled: false });
                acceptPara.remove(); rejectPara.remove();
                body().insertAdjacentHTML('beforeend', '<p>VĂN BẢN CẦN THEO DÕI: xóa và thêm</p><p>DÒNG CÓ NHẬN XÉT</p>');
                await run('writer.trackChanges.toggle', { enabled: true });
                if (selectText(trackedText)) body().dispatchEvent(new InputEvent('beforeinput', { inputType: 'deleteByCut', bubbles: true, cancelable: true }));
                const trackParagraph = [...body().querySelectorAll('p')].find(p => p.textContent.includes('VĂN BẢN CẦN THEO DÕI'));
                if (trackParagraph) {
                  const insertionRange = document.createRange(); insertionRange.selectNodeContents(trackParagraph); insertionRange.collapse(false);
                  getSelection().removeAllRanges(); getSelection().addRange(insertionRange);
                  body().dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'mới', bubbles: true, cancelable: true }));
                }
                out.actions.trackChanges = {
                  on: true,
                  insertions: body().querySelectorAll('ins[data-vno-change="insert"]').length,
                  deletions: body().querySelectorAll('del[data-vno-change="delete"]').length
                };
                await run('writer.trackChanges.toggle', { enabled: false });
                out.actions.trackChanges.off = true;

                if (selectText('DÒNG CÓ NHẬN XÉT')) {
                  out.actions.commentAdd = (await run('writer.comment.insert', { content: 'Ghi chú: kiểm tra nội dung.' })) !== false;
                }
                out.actions.commentReply = (await run('writer.review.commentReply', { content: 'đã cập nhật' })) !== false;
                out.actions.commentResolve = (await run('writer.review.commentResolve')) !== false;
                out.actions.commentState = {
                  count: document.querySelectorAll('.vno-comment-card').length,
                  resolved: document.querySelector('.vno-comment-card')?.dataset.commentResolved || 'false',
                  text: document.querySelector('.vno-comment-card .vno-comment-content')?.textContent || '',
                  replies: [...document.querySelectorAll('.vno-comment-reply')].map(node => node.textContent)
                };

                const spellWords = __SPELLCHECK_CORPUS__;
                const spellParagraph = document.createElement('p');
                spellParagraph.textContent = spellWords.join(' ') + ' chínnh';
                body().appendChild(spellParagraph);
                let offline = false, correctWordIssues = -1, suggestions = [];
                const previousFetch = window.fetch;
                let misspelling = null;
                try {
                  window.fetch = () => { throw new Error('Spell checker attempted a network request'); };
                  body().dispatchEvent(new InputEvent('input', { bubbles: true }));
                  for (let wait = 0; wait < 30 && ![...spellParagraph.querySelectorAll('[data-vno-spelling-uncertain]')].some(node => node.textContent === 'chínnh'); wait++) await new Promise(r => setTimeout(r, 50));
                  misspelling = [...spellParagraph.querySelectorAll('[data-vno-spelling-uncertain]')].find(node => node.textContent === 'chínnh') || null;
                  const { VietnameseSpellChecker } = await import('/platform/text/vi-spellchecker.js');
                  const { VIETNAMESE_DICTIONARY_WORDS } = await import('/platform/text/dictionaries/vi-dictionary.js');
                  const checker = new VietnameseSpellChecker(VIETNAMESE_DICTIONARY_WORDS);
                  correctWordIssues = checker.checkText(spellWords.join(' ')).length;
                  offline = true;
                } finally { window.fetch = previousFetch; }
                const spellStatus = document.querySelector('.vno-writer-page')?.dataset.spellcheckStatus || 'missing';
                if (misspelling) {
                  misspelling.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 20, clientY: 20 }));
                  suggestions = [...document.querySelectorAll('.vno-spellcheck-suggestion')].map(button => button.textContent);
                  [...document.querySelectorAll('.vno-spellcheck-suggestion')].find(button => button.textContent.trim() === 'chính')?.click();
                }
                out.actions.spellCheck = {
                  status: spellStatus, offline, sampleWords: spellWords.length, correctWordIssues,
                  underlined: misspelling?.textContent || '', suggestions, corrected: body().innerText.includes('chính') && !body().innerText.includes('chínnh')
                };

                const keyboard = (key, modifiers = {}) => {
                  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers });
                  window.dispatchEvent(event);
                  return event.defaultPrevented;
                };
                const lastCommand = () => bus.getHistory?.().filter(item => item.commandId).at(-1)?.commandId || '';
                const historyLength = () => bus.getHistory?.().filter(item => item.commandId).length || 0;
                const shortcutResults = {};
                const keyboardAdapter = window.__vnoAppInstance?.adapter;
                const keyboardSnapshot = keyboardAdapter?._createSnapshot('before shortcut checks') || null;
                keyboardAdapter?.clearUndoRedo();
                const checkShortcut = async (name, key, modifiers, commandId, revert = false) => {
                  const beforeLength = historyLength(); keyboard(key, modifiers); await new Promise(r => setTimeout(r, 100));
                  const handled = historyLength() > beforeLength && lastCommand() === commandId;
                  shortcutResults[name] = { handled, command: lastCommand() };
                  if (handled && revert) { await bus.execute('common.edit.undo'); await new Promise(r => setTimeout(r, 50)); }
                };
                const previousPrint = window.print;
                let printCalls = 0;
                window.print = () => { printCalls++; };
                for (const name of ['Ctrl+B', 'Ctrl+I', 'Ctrl+U', 'Ctrl+Shift+>', 'Ctrl+Shift+<', 'Ctrl+L', 'Ctrl+E', 'Ctrl+R', 'Ctrl+J']) selectText('KIỂM TRA UNDO');
                const shortcutUndoRange = document.createRange(); shortcutUndoRange.selectNodeContents(body()); shortcutUndoRange.collapse(false);
                getSelection().removeAllRanges(); getSelection().addRange(shortcutUndoRange);
                document.execCommand('insertText', false, ' SHORTCUT_UNDO_TEST');
                keyboardAdapter?.recordSnapshot('Shortcut undo probe marker');
                await new Promise(r => setTimeout(r, 500));
                keyboard('z', { ctrlKey: true }); await new Promise(r => setTimeout(r, 250));
                const shortcutUndoWorked = !body().innerText.includes('SHORTCUT_UNDO_TEST');
                keyboard('y', { ctrlKey: true }); await new Promise(r => setTimeout(r, 250));
                const shortcutRedoWorked = body().innerText.includes('SHORTCUT_UNDO_TEST');
                shortcutResults['Ctrl+Z'] = { handled: shortcutUndoWorked, command: 'common.edit.undo' };
                shortcutResults['Ctrl+Y'] = { handled: shortcutRedoWorked, command: 'common.edit.redo' };
                for (const [key, name, mods, commandId] of [
                  ['b', 'Ctrl+B', { ctrlKey: true }, 'writer.text.bold'], ['i', 'Ctrl+I', { ctrlKey: true }, 'writer.text.italic'],
                  ['u', 'Ctrl+U', { ctrlKey: true }, 'writer.text.underline'], ['>', 'Ctrl+Shift+>', { ctrlKey: true, shiftKey: true }, 'writer.font.grow'],
                  ['<', 'Ctrl+Shift+<', { ctrlKey: true, shiftKey: true }, 'writer.font.shrink'],
                  ['l', 'Ctrl+L', { ctrlKey: true }, 'writer.para.alignLeft'], ['e', 'Ctrl+E', { ctrlKey: true }, 'writer.para.alignCenter'],
                  ['r', 'Ctrl+R', { ctrlKey: true }, 'writer.para.alignRight'], ['j', 'Ctrl+J', { ctrlKey: true }, 'writer.para.justify'],
                  ['Enter', 'Ctrl+Enter', { ctrlKey: true }, 'writer.page.break'], ['f', 'Ctrl+F', { ctrlKey: true }, 'common.edit.find'],
                  ['h', 'Ctrl+H', { ctrlKey: true }, 'common.edit.replace'], ['s', 'Ctrl+S', { ctrlKey: true }, 'common.file.save'],
                  ['F12', 'F12', {}, 'common.file.saveAs'], ['p', 'Ctrl+P', { ctrlKey: true }, 'common.file.print']
                ]) await checkShortcut(name, key, mods, commandId, ['Ctrl+B','Ctrl+I','Ctrl+U','Ctrl+Shift+>','Ctrl+Shift+<','Ctrl+L','Ctrl+E','Ctrl+R','Ctrl+J','Ctrl+Enter'].includes(name));
                window.print = previousPrint;
                shortcutResults['Ctrl+P'].printHandlerCalled = printCalls > 0;
                if (keyboardSnapshot && keyboardAdapter) {
                  keyboardAdapter._restoreSnapshot(keyboardSnapshot);
                  keyboardAdapter.clearUndoRedo();
                }
                out.actions.keyboardShortcuts = shortcutResults;
                const adapter = window.__vnoAppInstance?.adapter;
                const exported = adapter?._contentForOfficeSave?.() || '';
                const bodyHtml = body()?.innerHTML || '';
                out.actions.exportProbe = {
                  appInstance: !!adapter,
                  adapterUsesVisibleBody: adapter?.bodyDom === body(),
                  liveChars: body()?.innerText?.length || 0,
                  liveHtml: bodyHtml.length,
                  liveTable: !!body()?.querySelector('table'),
                  liveToc: !!body()?.querySelector('[data-vno-toc="true"]'),
                  liveSectionBreak: !!body()?.querySelector('[data-vno-section-break]'),
                  liveImageCount: body()?.querySelectorAll('img').length || 0,
                  liveTrackChanges: !!body()?.querySelector('[data-vno-change]'),
                  exportChars: exported.length,
                  exportTable: exported.includes('<table'),
                  exportToc: exported.includes('data-vno-toc-field='),
                  exportSectionCount: exported.split('data-vno-export-section=').length - 1,
                  exportImageCount: exported.split('<img').length - 1,
                  exportReviewState: exported.includes('data-vno-review-state=')
                };
                document.querySelector('.vno-fr-close-btn')?.click();
                document.querySelector('.vno-writer-print-preview-close, .vno-print-preview-close')?.click();
              } catch (error) { out.error = String(error && error.stack || error); }
              window.__writerOpsDone = out;
            })();
            """
            win.evaluate_js("window.__writerOpsDone=null; 1")
            win.evaluate_js(script)
            for _ in range(1200):
                time.sleep(1)
                state = win.evaluate_js("window.__writerOpsDone||null")
                if state:
                    result["actions"] = state.get("actions", {})
                    result["error"] = state.get("error", "")
                    break
            else:
                result["error"] = "Timed out waiting for editing operations"
        try:
            win.evaluate_js("window.__writerSaveDone=null; window.__writerSaveErr=''; import('/platform/commands/command-bus.js').then(async m => { try { window.__writerSaveDone=await m.globalCommandBus.execute('common.file.saveAs'); } catch(e) { window.__writerSaveErr=String(e && e.stack || e); } }); 'queued'")
            for _ in range(300):
                time.sleep(1)
                result["save"]["exists"] = os.path.exists(OUTPUT) and os.path.getsize(OUTPUT) > 0
                result["save"]["error"] = win.evaluate_js("window.__writerSaveErr") or ""
                if win.evaluate_js("window.__writerSaveDone !== null") or result["save"]["error"]: break
            result["save"]["result"] = win.evaluate_js("window.__writerSaveDone")
        except Exception as error:
            result["save"]["error"] = str(error)
    write_status({"phase": "finished", "result": result})
    print("RESULT " + json.dumps(result, ensure_ascii=False), flush=True)
    win.destroy()

webview.start(after_load, window, debug=False)
'''


def _stop_owned_hidden_word(pid_file: Path) -> None:
    """Kill only the hidden WINWORD PID recorded by our own COM driver."""
    if not pid_file.exists():
        return
    try:
        pid = int(pid_file.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        return
    command = (
        "$p=Get-Process -Id " + str(pid) + " -ErrorAction SilentlyContinue; "
        "if ($p -and $p.ProcessName -eq 'WINWORD' -and $p.MainWindowHandle -eq 0) "
        "{ Stop-Process -Id " + str(pid) + " -Force }"
    )
    subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command], capture_output=True, timeout=15)


def _run_word(driver: Path, task: str, result_json: Path, pid_file: Path, args: list[str], timeout: int = 300) -> dict[str, Any]:
    command = [
        "powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", str(driver), "-Task", task, "-ResultJson", str(result_json), "-PidFile", str(pid_file),
    ] + args
    try:
        proc = subprocess.run(command, capture_output=True, text=True, timeout=timeout, encoding="utf-8", errors="replace")
    except subprocess.TimeoutExpired as exc:
        _stop_owned_hidden_word(pid_file)
        raise RuntimeError(f"Word COM {task} timed out after {timeout}s; cleanup targeted only its recorded hidden WINWORD PID.") from exc
    if proc.returncode != 0:
        _stop_owned_hidden_word(pid_file)
        details = result_json.read_text(encoding="utf-8") if result_json.exists() else ""
        raise RuntimeError(f"Word COM {task} failed ({proc.returncode}): {details[-1200:]} {(proc.stderr or proc.stdout).strip()[-700:]}")
    if not result_json.exists():
        raise RuntimeError(f"Word COM {task} completed without result JSON: {proc.stdout[-1000:]}")
    return json.loads(result_json.read_text(encoding="utf-8"))


def _word_pages(path: Path, output_dir: Path) -> int | str:
    pid_file = output_dir / f"_word_oracle_{path.stem}.pid"
    command = [
        "powershell.exe", "-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
        "-File", str(ROOT / "scripts" / "layout-audit" / "_word_oracle3.ps1"),
        "-File", str(path.resolve()), "-OwnedPidFile", str(pid_file),
    ]
    try:
        proc = subprocess.run(command, capture_output=True, text=True, timeout=280, encoding="utf-8", errors="replace")
    except subprocess.TimeoutExpired:
        _stop_owned_hidden_word(pid_file)
        return "FAIL (Word PDF export exceeded 280s)"
    output = (proc.stdout or "").strip()
    match = re.search(r"OK pages=(\d+)", output)
    if proc.returncode == 0 and match:
        return int(match.group(1))
    return output or (proc.stderr or "FAIL (Word oracle returned no result)").strip()[:160]


def _run_vn(seed: Path, output: Path, output_dir: Path, mode: str = "edit", png_data_uri: str = "") -> dict[str, Any]:
    probe_path = output_dir / "_writer_basic_ops_probe.py"
    probe_path.write_text(
        VN_PROBE.replace("__HTML__", json.dumps(_vn_html(), ensure_ascii=False))
        .replace("__PNG_DATA_URL__", json.dumps(png_data_uri, ensure_ascii=False))
        .replace("__SPELLCHECK_CORPUS__", json.dumps(SPELLCHECK_COMMON_WORDS, ensure_ascii=False)),
        encoding="utf-8",
    )
    try:
        proc = subprocess.run(
            [sys.executable, str(probe_path), str(ROOT), str(seed), str(output), mode],
            capture_output=True, text=True, cwd=ROOT, timeout=1800, encoding="utf-8", errors="replace",
        )
    except subprocess.TimeoutExpired as exc:
        raise RuntimeError("VN real-app probe timed out after 1800 seconds.") from exc
    match = re.search(r"RESULT (\{.*\})", proc.stdout or "")
    if proc.returncode != 0 and not match:
        raise RuntimeError(f"VN real-app probe failed ({proc.returncode}): {(proc.stderr or proc.stdout)[-1800:]}")
    return json.loads(match.group(1)) if match else {"loaded": False, "error": (proc.stderr or proc.stdout)[-1800:]}


def _docx_structure(path: Path) -> dict[str, Any]:
    try:
        with zipfile.ZipFile(path) as package:
            document = package.read("word/document.xml").decode("utf-8", "replace")
            names = package.namelist()
            footer_parts = [name for name in names if re.fullmatch(r"word/footer\d+\.xml", name)]
            footer_xml = "\n".join(package.read(name).decode("utf-8", "replace") for name in footer_parts)
            body = re.sub(r"<w:txbxContent\b[\s\S]*?</w:txbxContent>", "", document)
            return {
                "paragraphs": len(re.findall(r"<w:p(?:\s|>)", body)),
                "pageBreaks": len(re.findall(r"<w:br\b[^>]*w:type=['\"]page", body, re.I)),
                "pageBreakBefore": len(re.findall(r"<w:pageBreakBefore\b", body, re.I)),
                "tables": len(re.findall(r"<w:tbl(?:\s|>)", body, re.I)),
                "footerParts": len(footer_parts),
                "pageField": bool(re.search(r"<w:instrText\b[^>]*>\s*PAGE(?:\s+\\[^<]*)?\s*</w:instrText>|<w:fldSimple\b[^>]*\binstr=['\"]\s*PAGE(?:\s+[^'\"]*)?['\"]", footer_xml, re.I)),
                "tocField": bool(re.search(r"<w:instrText\b[^>]*>\s*TOC\b", document, re.I)),
                "differentFirstPage": bool(re.search(r"<w:titlePg\b", document, re.I)),
                "revisionInsertions": len(re.findall(r"<w:ins\b", document, re.I)),
                "revisionDeletions": len(re.findall(r"<w:del\b", document, re.I)),
                "commentsPart": "word/comments.xml" in names,
                "mergedHeader": bool(re.search(r"<w:gridSpan\b[^>]*w:val=['\"]4", body, re.I)),
                "text": " ".join(re.findall(r"<w:t\b[^>]*>([\s\S]*?)</w:t>", body)),
            }
    except (OSError, KeyError, zipfile.BadZipFile) as exc:
        return {"error": str(exc)}


def _normal_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _paragraph(document: dict[str, Any], start: str) -> dict[str, Any] | None:
    return next((p for p in document.get("paragraphs", []) if p.get("text", "").startswith(start)), None)


def _paragraph_data(document: dict[str, Any], start: str) -> dict[str, Any] | None:
    p = _paragraph(document, start)
    if not p:
        return None
    return {"align": p.get("alignment"), "firstCm": p.get("firstLineIndentCm"), "beforePt": p.get("spaceBeforePt"),
            "afterPt": p.get("spaceAfterPt"), "lineRule": p.get("lineSpacingRule"), "linePt": p.get("lineSpacingPt")}


def _close_number(a: Any, b: Any, tolerance: float = 0.2) -> bool:
    try:
        return abs(float(a) - float(b)) <= tolerance
    except (TypeError, ValueError):
        return a == b


def _run_data(document: dict[str, Any]) -> dict[str, Any]:
    result = {}
    for key in ("MỨC PHẠT", "THỜI HẠN", "ĐIỀU KHOẢN SAO CHÉP"):
        run = document.get("runs", {}).get(key) or {}
        result[key] = {name: run.get(name) for name in ("bold", "italic", "underline", "font", "size", "color", "highlight") if name in run}
        if result[key].get("color") == -16777216:
            result[key]["color"] = 0
    return result


def _list_data(document: dict[str, Any]) -> list[str]:
    markers = []
    for p in document.get("paragraphs", []):
        if p.get("listType"):
            marker = str(p.get("listString", "")).strip()
            markers.append("•" if marker in {"•", "", "▪", "‣"} else marker)
    return markers


def _table_data(document: dict[str, Any]) -> list[dict[str, Any]]:
    return [{key: table.get(key) for key in ("rows", "columns", "rowCellCounts", "mergedHeader", "bordersEnabled", "headerBold", "columnHeaderBold", "cells")} for table in document.get("tables", [])]


def _header_footer_data(document: dict[str, Any]) -> dict[str, Any]:
    footers = []
    for footer in document.get("footers", []):
        fields = [re.sub(r"\s+", "", field).upper() for field in footer.get("fields", [])]
        footers.append({"text": _normal_text(footer.get("text")), "PAGE": any("PAGE" in f and "NUMPAGES" not in f for f in fields), "NUMPAGES": any("NUMPAGES" in f for f in fields)})
    return {"headers": [_normal_text(h.get("text")) for h in document.get("headers", [])], "footers": footers}


def _features(metrics: dict[str, Any], app: dict[str, Any]) -> list[dict[str, Any]]:
    word, vn = metrics.get("word_docx", {}), metrics.get("vn_docx", {})
    wt, vt = _normal_text(word.get("text")), _normal_text(vn.get("text"))
    wruns, vruns = _run_data(word), _run_data(vn)
    wp, vp = _paragraph_data(word, "Kính gửi:"), _paragraph_data(vn, "Kính gửi:")
    we, ve = _paragraph_data(word, "Bên A bàn giao"), _paragraph_data(vn, "Bên A bàn giao")
    wm, vm = _paragraph_data(word, "Đoạn báo cáo giãn dòng"), _paragraph_data(vn, "Đoạn báo cáo giãn dòng")
    wstyles = [p.get("style") for p in word.get("paragraphs", []) if p.get("style", "").lower().startswith("heading")]
    vstyles = [p.get("style") for p in vn.get("paragraphs", []) if p.get("style", "").lower().startswith("heading")]
    wlists, vlists = _list_data(word), _list_data(vn)
    wtables, vtables = _table_data(word), _table_data(vn)
    whf, vhf = _header_footer_data(word), _header_footer_data(vn)
    word_toc = word.get("toc", [{}])[0] if word.get("toc") else {}
    vn_toc = vn.get("toc", [{}])[0] if vn.get("toc") else {}
    word_toc_entries = [_normal_text(entry) for entry in word_toc.get("entries", [])]
    vn_toc_entries = [_normal_text(entry) for entry in vn_toc.get("entries", [])]
    wsections = word.get("sections", [])
    vsections = vn.get("sections", [])
    wimages = word.get("inlineShapes", [])
    vimages = vn.get("inlineShapes", [])
    wshapes = word.get("shapes", [])
    vshapes = vn.get("shapes", [])

    def close_image_group(left: list[dict[str, Any]], right: list[dict[str, Any]], floating: bool = False) -> bool:
        if len(left) != len(right):
            return False
        keys = ["widthMm", "heightMm"] + (["leftMm", "topMm", "wrapType"] if floating else [])
        for first, second in zip(left, right):
            for key in keys:
                if key == "wrapType":
                    if first.get(key) != second.get(key): return False
                elif not _close_number(first.get(key), second.get(key), 2.0):
                    return False
            if floating and any(first.get(key) != second.get(key) for key in ("relativeH", "relativeV")):
                return False
        return True

    def same_revisions(left: list[dict[str, Any]], right: list[dict[str, Any]]) -> bool:
        normalize = lambda rows: sorted((_normal_text(item.get("text")), item.get("type")) for item in rows)
        return normalize(left) == normalize(right) and len(left) == 2

    def same_comments(left: list[dict[str, Any]], right: list[dict[str, Any]]) -> bool:
        normalize = lambda rows: sorted((
            _normal_text(item.get("text")),
            sorted(_normal_text(reply) for reply in item.get("replies", [])),
            bool(item.get("done")),
        ) for item in rows)
        return normalize(left) == normalize(right) and len(left) == 1
    text_ok = wt == vt
    replacement_ok = "bản chính" in wt and "bản nháp" not in wt and "bản chính" in vt and "bản nháp" not in vt
    actions_word = {"findReplace": replacement_ok, "copyPaste": wt.count("THỜI HẠN") >= 2, "undoRedo": "KIỂM TRA UNDO" in wt}
    actions_vn = {"findReplace": bool(app.get("actions", {}).get("findReplace")) and replacement_ok, "copyPaste": bool(app.get("actions", {}).get("copyPaste")) and vt.count("THỜI HẠN") >= 2, "undoRedo": bool(app.get("actions", {}).get("undoRedo")) and "KIỂM TRA UNDO" in vt}
    word_docx = {"repairFree": bool(word.get("opened") and not word.get("error")), "paragraphs": word.get("paragraphCount")}
    vn_docx = {"repairFree": bool(vn.get("opened") and not vn.get("error")), "paragraphs": vn.get("paragraphCount")}
    wd, vd = metrics.get("word_doc", {}), metrics.get("vn_doc", {})
    word_doc = {"repairFree": bool(wd.get("opened") and not wd.get("error")), "paragraphs": wd.get("paragraphCount")}
    vn_doc = {"repairFree": bool(vd.get("opened") and not vd.get("error")), "paragraphs": vd.get("paragraphCount")}
    body_match = bool(wp and vp and wp.get("align") == vp.get("align") == 3 and wp.get("firstCm") == vp.get("firstCm") == 1.0 and _close_number(wp.get("beforePt"), vp.get("beforePt")) and _close_number(wp.get("afterPt"), vp.get("afterPt")) and wp.get("lineRule") == vp.get("lineRule") == 5 and _close_number(wp.get("linePt"), vp.get("linePt")))
    exact_match = bool(we and ve and we.get("lineRule") == ve.get("lineRule") == 4 and _close_number(we.get("linePt"), ve.get("linePt")))
    multiple_match = bool(wm and vm and wm.get("lineRule") == vm.get("lineRule") == 1 and _close_number(wm.get("linePt"), vm.get("linePt")))
    return [
        {"scenario": "Vietnamese text, typing and find/replace", "word": "same content" if text_ok else f"{len(wt)} chars", "vn": "same content" if text_ok else f"{len(vt)} chars", "match": text_ok and replacement_ok},
        {"scenario": "Bold/italic/underline, font, size, color, highlight", "word": wruns, "vn": vruns, "match": wruns == vruns},
        {"scenario": "Paragraph justify, first indent, spacing, 1.15", "word": wp, "vn": vp, "match": body_match},
        {"scenario": "Paragraph exact line spacing 18 pt", "word": we, "vn": ve, "match": exact_match},
        {"scenario": "Paragraph line spacing 1.5", "word": wm, "vn": vm, "match": multiple_match},
        {"scenario": "Heading 1–3 styles", "word": wstyles, "vn": vstyles, "match": wstyles == vstyles},
        {"scenario": "B5 Heading styles including the new Heading 2", "word": wstyles, "vn": vstyles, "match": wstyles == vstyles and wstyles.count("Heading 1") == 1 and wstyles.count("Heading 2") == 2 and wstyles.count("Heading 3") == 1},
        {"scenario": "B5 real TOC field, updated entry and Word page numbers", "word": {"entries": word_toc_entries, "fields": word_toc.get("fieldCount")}, "vn": {"entries": vn_toc_entries, "fields": vn_toc.get("fieldCount"), "packageField": vn.get("packageFacts", {}).get("tocField")}, "match": word_toc_entries == vn_toc_entries and len(word_toc_entries) >= 4 and word_toc.get("fieldCount", 0) > 0 and vn_toc.get("fieldCount", 0) > 0 and vn.get("packageFacts", {}).get("tocField") and any("PHỤ LỤC BỔ SUNG SAU KHI TẠO MỤC LỤC" in entry for entry in vn_toc_entries)},
        {"scenario": "Bullets, numbering, a), dash list", "word": wlists, "vn": vlists, "match": wlists == vlists},
        {"scenario": "3×4 table, add/delete row/column, merge, borders", "word": wtables, "vn": vtables, "match": wtables == vtables},
        {"scenario": "A4 portrait page setup and margins", "word": wsections[0] if wsections else {}, "vn": vsections[0] if vsections else {}, "match": bool(wsections and vsections) and all(wsections[0].get(key) == vsections[0].get(key) for key in ("orientation", "paperSize")) and all(_close_number(wsections[0].get(key), vsections[0].get(key), 0.1) for key in ("widthCm", "heightCm", "topCm", "bottomCm", "leftCm", "rightCm"))},
        {"scenario": "Header/footer with live page-number fields", "word": whf, "vn": vhf, "match": whf["headers"] == vhf["headers"] and bool(whf["footers"]) and bool(vhf["footers"]) and whf["footers"][0]["PAGE"] and vhf["footers"][0]["PAGE"]},
        {"scenario": "B8 different first page", "word": {"enabled": wsections[0].get("differentFirstPage") if wsections else False}, "vn": {"enabled": vsections[0].get("differentFirstPage") if vsections else False, "package": vn.get("packageFacts", {}).get("differentFirstPage")}, "match": bool(wsections and vsections and wsections[0].get("differentFirstPage") == vsections[0].get("differentFirstPage") is True and vn.get("packageFacts", {}).get("differentFirstPage"))},
        {"scenario": "Page break (Ctrl+Enter)", "word": word.get("pageBreakCount"), "vn": vn.get("pageBreakCount"), "match": word.get("pageBreakCount") == vn.get("pageBreakCount") and (word.get("pageBreakCount") or 0) > 0},
        {"scenario": "B7 section break with a landscape page", "word": [{key: item.get(key) for key in ("orientation", "paperSize", "widthCm", "heightCm", "differentFirstPage")} for item in wsections], "vn": [{key: item.get(key) for key in ("orientation", "paperSize", "widthCm", "heightCm", "differentFirstPage")} for item in vsections], "match": len(wsections) == len(vsections) >= 2 and all(w.get("orientation") == v.get("orientation") and w.get("paperSize") == v.get("paperSize") and _close_number(w.get("widthCm"), v.get("widthCm"), 0.1) and _close_number(w.get("heightCm"), v.get("heightCm"), 0.1) for w, v in zip(wsections, vsections)) and wsections[1].get("orientation") == 1},
        {"scenario": "B9 PNG size, wrap and floating position (±2 mm)", "word": {"inline": wimages, "floating": wshapes}, "vn": {"inline": vimages, "floating": vshapes}, "match": close_image_group(wimages, vimages) and close_image_group(wshapes, vshapes, True) and len(wimages) == 1 and len(wshapes) == 2},
        {"scenario": "B11 Vietnamese spelling works offline: 200 common words and suggestions", "word": metrics.get("wordSpellCheck", {}), "vn": app.get("actions", {}).get("spellCheck", {}), "match": bool(app.get("actions", {}).get("spellCheck", {}).get("offline")) and app.get("actions", {}).get("spellCheck", {}).get("status") == "ready" and app.get("actions", {}).get("spellCheck", {}).get("sampleWords") == 200 and app.get("actions", {}).get("spellCheck", {}).get("correctWordIssues") == 0 and app.get("actions", {}).get("spellCheck", {}).get("underlined") == "chínnh" and "chính" in app.get("actions", {}).get("spellCheck", {}).get("suggestions", []) and app.get("actions", {}).get("spellCheck", {}).get("corrected")},
        {"scenario": "B12 track on/off, accept/reject, and native insert/delete in Word", "word": word.get("revisions", []), "vn": {"revisions": vn.get("revisions", []), "acceptReject": app.get("actions", {}).get("trackChangeAcceptReject"), "off": app.get("actions", {}).get("trackChanges", {}).get("off")}, "match": same_revisions(word.get("revisions", []), vn.get("revisions", [])) and vn.get("packageFacts", {}).get("revisionInsertions") == 1 and vn.get("packageFacts", {}).get("revisionDeletions") == 1 and bool(app.get("actions", {}).get("trackChanges", {}).get("off")) and all(app.get("actions", {}).get("trackChangeAcceptReject", {}).get(key) for key in ("accepted", "rejected"))},
        {"scenario": "B12 comments, reply text and resolved state remain in Word", "word": word.get("comments", []), "vn": vn.get("comments", []), "match": same_comments(word.get("comments", []), vn.get("comments", [])) and vn.get("packageFacts", {}).get("commentsPart") and bool(app.get("actions", {}).get("commentReply")) and bool(app.get("actions", {}).get("commentResolve"))},
        {"scenario": "Copy/paste formatted text; undo/redo", "word": actions_word, "vn": actions_vn, "match": actions_word == actions_vn},
        {"scenario": "Word page counts (.docx)", "word": word.get("pageCount"), "vn": vn.get("pageCount"), "match": word.get("pageCount") == vn.get("pageCount")},
        {"scenario": "Word reopen without repair (.docx), paragraph count", "word": word_docx, "vn": vn_docx, "match": word_docx == vn_docx},
        {"scenario": "Word reopen without repair (.doc), paragraph count", "word": word_doc, "vn": vn_doc, "match": word_doc == vn_doc},
        {"scenario": "Word page counts (.doc)", "word": wd.get("pageCount"), "vn": vd.get("pageCount"), "match": wd.get("pageCount") == vd.get("pageCount")},
    ]
    for name in ("Ctrl+B", "Ctrl+I", "Ctrl+U", "Ctrl+Shift+>", "Ctrl+Shift+<", "Ctrl+L", "Ctrl+E", "Ctrl+R", "Ctrl+J", "Ctrl+Enter", "Ctrl+Z", "Ctrl+Y", "Ctrl+F", "Ctrl+H", "Ctrl+S", "F12", "Ctrl+P"):
        result = app.get("actions", {}).get("keyboardShortcuts", {}).get(name, {})
        match = bool(result.get("handled")) and (name != "Ctrl+P" or bool(result.get("printHandlerCalled")))
        features.append({"scenario": f"Keyboard {name}", "word": "Word 2016 shortcut", "vn": result or "NOT RUN", "match": match})
    return features


def _compact_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("|", "\\|").replace("\n", " ")


def _read_before_run(path: Path | None) -> tuple[dict[str, Any], dict[str, Any]]:
    if path is None:
        return {}, {}
    metrics_path, app_path = path / "_writer_basic_ops_metrics.json", path / "_writer_basic_ops_app.json"
    if metrics_path.exists():
        return json.loads(metrics_path.read_text(encoding="utf-8")), json.loads(app_path.read_text(encoding="utf-8")) if app_path.exists() else {}
    raw = path / "_word_inspect_result.json"
    metrics = json.loads(raw.read_text(encoding="utf-8-sig")) if raw.exists() else {}
    app: dict[str, Any] = {}
    report = path / "writer_basic_ops_report.md"
    if report.exists():
        content = report.read_text(encoding="utf-8")
        match = re.search(r"- VN app loaded: (True|False); actions: (\{[^\n]+\})", content)
        if match:
            app = {"loaded": match.group(1) == "True", "actions": json.loads(match.group(2))}
        for line in content.splitlines():
            if line.startswith("| Word page count |"):
                cells = [cell.strip() for cell in line.split("|")]
                for key, index in (("word_docx", 2), ("vn_docx", 3)):
                    try: metrics.setdefault(key, {})["pageCount"] = json.loads(cells[index])
                    except (IndexError, ValueError): pass
            elif line.startswith(("| word_doc |", "| vn_doc |")):
                cells = [cell.strip() for cell in line.split("|")]
                key = cells[1] if len(cells) > 1 else ""
                try: metrics.setdefault(key, {})["pageCount"] = int(cells[3])
                except (IndexError, ValueError): pass
    return metrics, app


def _write_report(output_dir: Path, app: dict[str, Any], metrics: dict[str, Any], structures: dict[str, Any], before: dict[str, Any], before_app: dict[str, Any], before_label: str) -> None:
    lines = [
        "# Writer basic editing parity — measured run", "",
        f"- Worktree: {ROOT}",
        f"- Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}",
        "- Oracle: Word 2016 COM, hidden instance created by this harness; page count from Word PDF export.",
        "- VN path: main.py, pywebview probe, evaluate_js, Writer command bus, production save bridge.",
        f"- VN before: {before_label or 'not supplied'}",
        f"- VN app loaded: {app.get('loaded')}; actions: {json.dumps(app.get('actions', {}), ensure_ascii=False)}",
        f"- VN .docx saved: {app.get('save', {}).get('exists')}; .doc resave loaded: {app.get('doc_resave', {}).get('loaded')}; .doc saved: {app.get('doc_resave', {}).get('save', {}).get('exists')}",
        f"- VN probe error: {app.get('error') or 'none'}", "",
        "| scenario | Word | VN before | VN after | status |",
        "|---|---|---|---|---|",
    ]
    before_rows = {row["scenario"]: row for row in _features(before, before_app)} if before else {}
    for row in _features(metrics, app):
        previous = before_rows.get(row["scenario"])
        word, vn = _compact_json(row["word"]), _compact_json(row["vn"])
        vn_before = _compact_json(previous["vn"]) if previous else "—"
        lines.append(f"| {row['scenario']} | {word} | {vn_before} | {vn} | {'PASS' if row['match'] else 'FAIL'} |")
    lines.extend(["", "## Saved package facts", "", "| file | Word open | pages | paragraphs | repair-free open | package facts |", "|---|---:|---:|---:|---|---|"])
    for key in ("word_docx", "vn_docx", "word_doc", "vn_doc"):
        value = metrics.get(key, {})
        facts = structures.get(key, {})
        lines.append(
            f"| {key} | {value.get('opened')} | {value.get('pageCount', '-')} | {value.get('paragraphCount', '-')} | "
            f"{'yes' if value.get('opened') and not value.get('error') else 'no'} | "
            f"{json.dumps(facts, ensure_ascii=False, separators=(',', ':'))} |"
        )
    lines.extend(["", "Word open checks use the repair-disabled COM option. PASS means the saved VN file met the Word result comparator for that scenario.", ""])
    (output_dir / "writer_basic_ops_report.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Directory for saved Word/VN files and reports.")
    parser.add_argument("--before", type=Path, help="Prior harness output directory for the VN before column.")
    args = parser.parse_args()
    if not sys.platform.startswith("win"):
        parser.error("Word 2016 COM automation is available only on Windows.")
    if not shutil.which("powershell.exe"):
        parser.error("powershell.exe is required for Word COM automation.")
    output_dir = args.output.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    png_path = output_dir / "writer_basic_ops.png"
    png_bytes = _tiny_png()
    png_path.write_bytes(png_bytes)
    png_data_uri = "data:image/png;base64," + base64.b64encode(png_bytes).decode("ascii")
    driver = output_dir / "_writer_basic_ops_word.ps1"
    driver.write_text(WORD_DRIVER, encoding="utf-8-sig")
    seed = output_dir / "writer_basic_ops_seed.docx"
    word_docx = output_dir / "writer_basic_ops_word.docx"
    word_doc = output_dir / "writer_basic_ops_word.doc"
    vn_docx = output_dir / "writer_basic_ops_vn.docx"
    vn_doc = output_dir / "writer_basic_ops_vn.doc"
    word_result = output_dir / "_word_edit_result.json"
    inspect_result = output_dir / "_word_inspect_result.json"
    pid_file = output_dir / "_owned_winword_pid.txt"
    edit = _run_word(driver, "Edit", word_result, pid_file, ["-Seed", str(seed), "-WordDocx", str(word_docx), "-WordDoc", str(word_doc), "-PngPath", str(png_path), "-SpellWordsJson", json.dumps(SPELLCHECK_COMMON_WORDS, ensure_ascii=False)])
    if not edit.get("ok"):
        raise RuntimeError(f"Word scenario failed: {edit.get('error', edit)}")
    app = _run_vn(seed, vn_docx, output_dir, "edit", png_data_uri)
    if vn_docx.exists():
        resave = _run_vn(vn_docx, vn_doc, output_dir, "resave")
        app["doc_resave"] = resave
        if resave.get("error"):
            app["error"] = (app.get("error", "") + " .doc resave: " + resave["error"]).strip()
    paths = {"word_docx": str(word_docx), "vn_docx": str(vn_docx), "word_doc": str(word_doc), "vn_doc": str(vn_doc)}
    paths_json = output_dir / "_word_paths.json"
    paths_json.write_text(json.dumps(paths, ensure_ascii=False), encoding="utf-8")
    metrics = _run_word(driver, "Inspect", inspect_result, pid_file, ["-PathsJson", str(paths_json)], timeout=400)
    for key, path in paths.items():
        metrics.setdefault(key, {})["pageCount"] = _word_pages(Path(path), output_dir)
    structures = {key: _docx_structure(Path(path)) for key, path in paths.items() if path.lower().endswith(".docx") and Path(path).exists()}
    metrics["wordSpellCheck"] = edit.get("spellCheck", {})
    for key in ("word_docx", "vn_docx"):
        metrics.setdefault(key, {})["packageFacts"] = structures.get(key, {})
    (output_dir / "_writer_basic_ops_metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    (output_dir / "_writer_basic_ops_app.json").write_text(json.dumps(app, ensure_ascii=False, indent=2), encoding="utf-8")
    before, before_app = _read_before_run(args.before.resolve() if args.before else None)
    _write_report(output_dir, app, metrics, structures, before, before_app, str(args.before.resolve()) if args.before else "")
    print(f"Report: {output_dir / 'writer_basic_ops_report.md'}")
    print(f"Word files: {word_docx} / {word_doc}")
    print(f"VN files: {vn_docx if vn_docx.exists() else 'NOT SAVED'} / {vn_doc if vn_doc.exists() else 'NOT SAVED'}")
    print(f"Word COM opened: {sum(bool(v.get('opened')) for v in metrics.values())}/{len(metrics)} saved files")
    docx_saved = bool(app.get("save", {}).get("exists"))
    doc_resave = app.get("doc_resave", {})
    doc_saved = bool(doc_resave.get("save", {}).get("exists"))
    return 0 if app.get("loaded") and docx_saved and doc_resave.get("loaded") and doc_saved else 1


if __name__ == "__main__":
    raise SystemExit(main())
