# Doc lai file DOCX bang Word 2016 COM va doi chieu voi <file>.expected.json (sinh boi _create_new_writer.py).
# Usage: powershell -File _word_readback.ps1 -File out.docx
param([string]$File, [switch]$SelfTest)
Add-Type -AssemblyName System.Web.Extensions
$hex = { param($v) "#{0:X2}{1:X2}{2:X2}" -f ($v -band 0xFF), (($v -shr 8) -band 0xFF), (($v -shr 16) -band 0xFF) }
$pt2cm = 0.0352778  # 1 pt = 0.0352778 cm
$twip2cm = 0.00176389  # 1 twip = 0.00176389 cm
$script:diffs = 0; $script:checks = 0

function Check($key, $prop, $want, $got) {
    $script:checks++
    $mismatch = $false
    $wNum = 0.0; $gNum = 0.0
    if ([double]::TryParse("$want", [ref]$wNum) -and [double]::TryParse("$got", [ref]$gNum)) {
        $mismatch = ([math]::Abs($wNum - $gNum) -gt 0.001)
    } else {
        $mismatch = ("$got" -ne "$want")
    }
    if ($mismatch) {
        $script:diffs++; Write-Host "${key}.${prop}: expected [$want] Word [$got]"
    }
}

function GetFontSize($range) {
    try { return [double]$range.Font.Size } catch { return 0 }
}
function GetFontBold($range) {
    try { return [bool]$range.Font.Bold } catch { return $false }
}
function GetFontItalic($range) {
    try { return [bool]$range.Font.Italic } catch { return $false }
}
function GetFontUnderline($range) {
    try { return ($range.Font.Underline -ne 0) } catch { return $false }
}
function GetFontColor($range) {
    try { return & $hex ([int]$range.Font.Color) } catch { return "" }
}
function GetFontName($range) {
    try { return $range.Font.Name } catch { return "" }
}
function GetAlignment($range) {
    $alignMap = @{ 0="left"; 1="center"; 2="right"; 3="justify" }
    try { return $alignMap[[int]$range.ParagraphFormat.Alignment] } catch { return "" }
}
function NormalizeLineSpacing($rule, $spacing) {
    if ([int]$rule -eq 0) { return 1.0 }
    if ([int]$rule -eq 1) { return 1.5 }
    if ([int]$rule -eq 2) { return 2.0 }
    if ([int]$rule -eq 5) { return [double]$spacing / 12.0 }
    return [double]$spacing
}
function GetLineSpacing($range) {
    try { return NormalizeLineSpacing $range.ParagraphFormat.LineSpacingRule $range.ParagraphFormat.LineSpacing } catch { return 0 }
}
function GetLineSpacingRule($range) {
    $labels = @{ 0="single"; 1="1.5 lines"; 2="double"; 3="at least"; 4="exactly"; 5="multiple" }
    try { return $labels[[int]$range.ParagraphFormat.LineSpacingRule] } catch { return "" }
}
function GetFirstLineIndentCm($range) {
    try { return [math]::Round($range.ParagraphFormat.FirstLineIndent * $pt2cm, 2) } catch { return 0 }
}
function NormalizeListType($listType, $listString) {
    if ([int]$listType -eq 0) { return "none" }
    $marker = "$listString"
    $bulletCodes = @(0x2022, 0x00B7, 0x25AA, 0x25E6, 0x25CB, 0x25CF, 0x25A0, 0x002D)
    if ($marker.Length -eq 1 -and $bulletCodes -contains [int][char]$marker) { return "bullet" }
    return "numbered"
}
function GetListType($range) {
    try {
        return NormalizeListType $range.ListFormat.ListType $range.ListFormat.ListString
    } catch { return "error" }
}
function NormalizeTableCellText($text) {
    return "$text".TrimEnd([char]13, [char]7)
}
function GetTableCellText($table, $row, $col) {
    # Word COM appends CR + end-of-cell (0x07); neither is user content.
    try { return NormalizeTableCellText $table.Cell($row,$col).Range.Text } catch { return "" }
}
function GetPrintPageCount($doc) {
    $pdf = [IO.Path]::Combine([IO.Path]::GetTempPath(), "vno_readback_" + [guid]::NewGuid().ToString("N") + ".pdf")
    try {
        $doc.ExportAsFixedFormat($pdf, 17)  # wdExportFormatPDF: real print layout
        $bytes = [IO.File]::ReadAllBytes($pdf)
        $text = [Text.Encoding]::GetEncoding(28591).GetString($bytes)
        return ([regex]::Matches($text, "/Type\s*/Page[^s]")).Count
    } finally {
        if (Test-Path -LiteralPath $pdf) { Remove-Item -LiteralPath $pdf -Force -ErrorAction SilentlyContinue }
    }
}

function FindRangeByText($doc, [string]$text) {
    try {
        $r = $doc.Content.Duplicate
        $f = $r.Find
        $f.ClearFormatting()
        $f.Text = $text
        $f.Forward = $true
        $f.Wrap = 0  # wdFindStop
        if ($f.Execute()) {
            return $r
        }
    } catch {}
    return $null
}

function FindParagraphByText($doc, [string]$matchText) {
    try {
        for ($i = 1; $i -le $doc.Paragraphs.Count; $i++) {
            $p = $doc.Paragraphs.Item($i)
            $t = NormalizeTableCellText $p.Range.Text
            if ($t.Trim() -like "*$matchText*") {
                return $p
            }
        }
    } catch {}
    return $null
}

if ($SelfTest) {
    if ((NormalizeTableCellText "merged$([char]13)$([char]7)") -ne "merged") { throw "Word cell terminator was not removed" }
    if ("$([bool]$true)" -ne "True") { throw "Boolean was not normalized to True" }
    if ((NormalizeLineSpacing 1 18) -ne 1.5) { throw "wdLineSpace1pt5 was interpreted incorrectly" }
    if ((NormalizeListType 4 ([char]0x2022)) -ne "bullet") { throw "Word bullet marker was interpreted incorrectly" }
    if ([math]::Round(36 * $pt2cm, 2) -ne 1.27) { throw "Word point indent was interpreted as twips" }
    Write-Output "SELFTEST=PASS"
    exit 0
}

$json = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$expected = $json.DeserializeObject([IO.File]::ReadAllText("$File.expected.json", [Text.Encoding]::UTF8))
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0  # wdAlertsNone = 0

try {
    $doc = $word.Documents.Open((Resolve-Path $File).Path, 0, $true)
    
    if ($expected.ContainsKey("scenario") -and [int]$expected["scenario"] -eq 2) {
        # --- 1. Đoạn canh đều (justify), đoạn canh phải ---
        $pJ = FindParagraphByText $doc "Đoạn canh đều hai bên (justify)"
        if ($pJ) {
            Check "justifyPara" "alignment" $expected["justifyPara"]["alignment"] (GetAlignment $pJ.Range)
        } else {
            Check "justifyPara" "alignment" $expected["justifyPara"]["alignment"] "missing"
        }
        $pR = FindParagraphByText $doc "Đoạn canh phải (right)"
        if ($pR) {
            Check "rightPara" "alignment" $expected["rightPara"]["alignment"] (GetAlignment $pR.Range)
        } else {
            Check "rightPara" "alignment" $expected["rightPara"]["alignment"] "missing"
        }

        # --- 2. Khoảng cách đoạn trước 6pt / sau 12pt ---
        $pS = FindParagraphByText $doc "Đoạn khoảng cách trước 6pt và sau 12pt"
        if ($pS) {
            $sb = [math]::Round([double]$pS.Range.ParagraphFormat.SpaceBefore, 1)
            $sa = [math]::Round([double]$pS.Range.ParagraphFormat.SpaceAfter, 1)
            Check "spacingPara" "spaceBefore" $expected["spacingPara"]["spaceBefore"] $sb
            Check "spacingPara" "spaceAfter" $expected["spacingPara"]["spaceAfter"] $sa
        } else {
            Check "spacingPara" "spaceBefore" $expected["spacingPara"]["spaceBefore"] "missing"
            Check "spacingPara" "spaceAfter" $expected["spacingPara"]["spaceAfter"] "missing"
        }

        # --- 4. Thụt lề trái 2cm + treo (hanging) 1cm ---
        $pH = FindParagraphByText $doc "Đoạn thụt lề trái 2cm và thụt lề treo 1cm"
        if ($pH) {
            $li = [math]::Round([double]$pH.Range.ParagraphFormat.LeftIndent, 1)
            $fli = [math]::Round([double]$pH.Range.ParagraphFormat.FirstLineIndent, 2)
            Check "hangingPara" "leftIndentPt" $expected["hangingPara"]["leftIndentPt"] $li
            Check "hangingPara" "firstLineIndentPt" $expected["hangingPara"]["firstLineIndentPt"] $fli
        } else {
            Check "hangingPara" "leftIndentPt" $expected["hangingPara"]["leftIndentPt"] "missing"
            Check "hangingPara" "firstLineIndentPt" $expected["hangingPara"]["firstLineIndentPt"] "missing"
        }

        # --- 5. Chữ đậm + nghiêng + gạch chân; gạch ngang; x²; H₂O; highlight vàng ---
        $rBiU = FindRangeByText $doc "Chữ đậm nghiêng gạch chân"
        if ($rBiU) {
            Check "styles" "bold" $expected["styles"]["bold"] (GetFontBold $rBiU)
            Check "styles" "italic" $expected["styles"]["italic"] (GetFontItalic $rBiU)
            Check "styles" "underline" $expected["styles"]["underline"] (GetFontUnderline $rBiU)
        } else {
            Check "styles" "bold" $expected["styles"]["bold"] "missing"
            Check "styles" "italic" $expected["styles"]["italic"] "missing"
            Check "styles" "underline" $expected["styles"]["underline"] "missing"
        }

        $rStrike = FindRangeByText $doc "Chữ gạch ngang"
        if ($rStrike) {
            $st = try { [bool]($rStrike.Font.StrikeThrough -ne 0) } catch { $false }
            Check "styles" "strikeThrough" $expected["styles"]["strikeThrough"] $st
        } else {
            Check "styles" "strikeThrough" $expected["styles"]["strikeThrough"] "missing"
        }

        $rX2 = FindRangeByText $doc "x2"
        if (-not $rX2) { $rX2 = FindRangeByText $doc "x²" }
        if ($rX2) {
            $char2 = $rX2.Characters.Item($rX2.Characters.Count)
            $isSuper = try { [bool]($char2.Font.Superscript -ne 0) } catch { $false }
            Check "styles" "superscript" $expected["styles"]["superscript"] $isSuper
        } else {
            Check "styles" "superscript" $expected["styles"]["superscript"] "missing"
        }

        $rH2O = FindRangeByText $doc "H2O"
        if (-not $rH2O) { $rH2O = FindRangeByText $doc "H₂O" }
        if ($rH2O) {
            $char2 = $rH2O.Characters.Item(2)
            $isSub = try { [bool]($char2.Font.Subscript -ne 0) } catch { $false }
            Check "styles" "subscript" $expected["styles"]["subscript"] $isSub
        } else {
            Check "styles" "subscript" $expected["styles"]["subscript"] "missing"
        }

        $rHl = FindRangeByText $doc "Chữ highlight vàng"
        if ($rHl) {
            $hlColor = try { [int]$rHl.HighlightColorIndex } catch { 0 }
            Check "styles" "highlightColorIndex" $expected["styles"]["highlightColorIndex"] $hlColor
        } else {
            Check "styles" "highlightColorIndex" $expected["styles"]["highlightColorIndex"] "missing"
        }

        # --- 6. Font khác nhau trong 1 đoạn: Arial 11pt + Times New Roman 14pt + màu xanh #0070C0 ---
        $rArial = FindRangeByText $doc "Chữ Arial 11pt"
        if ($rArial) {
            Check "fonts" "arialName" $expected["fonts"]["arialName"] (GetFontName $rArial)
            Check "fonts" "arialSize" $expected["fonts"]["arialSize"] (GetFontSize $rArial)
        } else {
            Check "fonts" "arialName" $expected["fonts"]["arialName"] "missing"
            Check "fonts" "arialSize" $expected["fonts"]["arialSize"] "missing"
        }

        $rTnr = FindRangeByText $doc "Chữ Times New Roman 14pt màu xanh"
        if ($rTnr) {
            Check "fonts" "tnrName" $expected["fonts"]["tnrName"] (GetFontName $rTnr)
            Check "fonts" "tnrSize" $expected["fonts"]["tnrSize"] (GetFontSize $rTnr)
            Check "fonts" "tnrColor" $expected["fonts"]["tnrColor"] (GetFontColor $rTnr)
        } else {
            Check "fonts" "tnrName" $expected["fonts"]["tnrName"] "missing"
            Check "fonts" "tnrSize" $expected["fonts"]["tnrSize"] "missing"
            Check "fonts" "tnrColor" $expected["fonts"]["tnrColor"] "missing"
        }

        # --- 7. Liên kết https://example.com với chữ "Trang chủ" ---
        Check "hyperlink" "count" $expected["hyperlink"]["count"] $doc.Hyperlinks.Count
        if ($doc.Hyperlinks.Count -ge 1) {
            $hl = $doc.Hyperlinks.Item(1)
            $addr = "$($hl.Address)".TrimEnd('/')
            Check "hyperlink" "address" $expected["hyperlink"]["address"] $addr
            Check "hyperlink" "textToDisplay" $expected["hyperlink"]["textToDisplay"] "$($hl.TextToDisplay)".Trim()
        } else {
            Check "hyperlink" "address" $expected["hyperlink"]["address"] "none"
            Check "hyperlink" "textToDisplay" $expected["hyperlink"]["textToDisplay"] "none"
        }

        # --- 8. Danh sách đánh số bắt đầu lại từ 1 sau một đoạn thường ---
        $pList2 = FindParagraphByText $doc "Mục 2.1"
        if ($pList2) {
            Check "listRestart" "firstNumber" $expected["listRestart"]["firstNumber"] "$($pList2.Range.ListFormat.ListString)".Trim()
        } else {
            Check "listRestart" "firstNumber" $expected["listRestart"]["firstNumber"] "missing"
        }

        # --- 9. Danh sách 2 cấp (mục con thụt vào) ---
        $pSub = FindParagraphByText $doc "Mục cấp 2"
        if ($pSub) {
            Check "multilevelList" "subItemLevel" $expected["multilevelList"]["subItemLevel"] ([int]$pSub.Range.ListFormat.ListLevelNumber)
        } else {
            Check "multilevelList" "subItemLevel" $expected["multilevelList"]["subItemLevel"] 0
        }

        # --- 10. Bảng 3×3: ô nền xám #D9D9D9, chữ ô tiêu đề đậm căn giữa, bề rộng cột 1 = 3cm ---
        if ($doc.Tables.Count -ge 1) {
            $tbl = $doc.Tables.Item(1)
            Check "table" "rows" $expected["table"]["rows"] $tbl.Rows.Count
            Check "table" "cols" $expected["table"]["cols"] $tbl.Columns.Count
            $c11 = $tbl.Cell(1,1)
            $bg = try { & $hex ([int]$c11.Shading.BackgroundPatternColor) } catch { "" }
            Check "table" "headerBgColor" $expected["table"]["headerBgColor"] $bg
            Check "table" "headerBold" $expected["table"]["headerBold"] (GetFontBold $c11.Range)
            Check "table" "headerAlignment" $expected["table"]["headerAlignment"] (GetAlignment $c11.Range)
            $w1 = try { [math]::Round([double]$tbl.Cell(1,1).Width, 1) } catch { 0 }
            Check "table" "col1WidthPt" $expected["table"]["col1WidthPt"] $w1
        } else {
            Check "table" "rows" $expected["table"]["rows"] 0
            Check "table" "cols" $expected["table"]["cols"] 0
            Check "table" "headerBgColor" $expected["table"]["headerBgColor"] "missing"
            Check "table" "headerBold" $expected["table"]["headerBold"] "missing"
            Check "table" "headerAlignment" $expected["table"]["headerAlignment"] "missing"
            Check "table" "col1WidthPt" $expected["table"]["col1WidthPt"] 0
        }

        # --- 11. Trang ngang (landscape) cho mục 2 ---
        if ($doc.Sections.Count -ge 2) {
            $sec2 = $doc.Sections.Item(2)
            $sec2Orient = if ([int]$sec2.PageSetup.Orientation -eq 1) { "landscape" } else { "portrait" }
            Check "section2" "orientation" $expected["section2"]["orientation"] $sec2Orient
        } else {
            Check "section2" "orientation" $expected["section2"]["orientation"] "missing section 2"
        }

        # --- 12. Cỡ trang Letter, lề 2cm 4 phía ---
        $sec1 = $doc.Sections.Item(1)
        $setup = $sec1.PageSetup
        $pw = [math]::Round([double]$setup.PageWidth, 0)
        $ph = [math]::Round([double]$setup.PageHeight, 0)
        $tm = [math]::Round([double]$setup.TopMargin, 1)
        $bm = [math]::Round([double]$setup.BottomMargin, 1)
        $lm = [math]::Round([double]$setup.LeftMargin, 1)
        $rm = [math]::Round([double]$setup.RightMargin, 1)
        Check "pageSetup" "pageWidthPt" $expected["pageSetup"]["pageWidthPt"] $pw
        Check "pageSetup" "pageHeightPt" $expected["pageSetup"]["pageHeightPt"] $ph
        Check "pageSetup" "topMarginPt" $expected["pageSetup"]["topMarginPt"] $tm
        Check "pageSetup" "bottomMarginPt" $expected["pageSetup"]["bottomMarginPt"] $bm
        Check "pageSetup" "leftMarginPt" $expected["pageSetup"]["leftMarginPt"] $lm
        Check "pageSetup" "rightMarginPt" $expected["pageSetup"]["rightMarginPt"] $rm

        # --- 13. Ngắt trang thường (Ctrl+Enter, không ngắt mục) ---
        $pNorm = FindParagraphByText $doc "Đoạn sau ngắt trang thường"
        if ($pNorm) {
            $pg = [int]$pNorm.Range.Information(3)  # wdActiveEndPageNumber
            Check "normalPageBreak" "pageNumber" $expected["normalPageBreak"]["pageNumber"] $pg
        } else {
            Check "normalPageBreak" "pageNumber" $expected["normalPageBreak"]["pageNumber"] 0
        }

        # --- 15. Ký tự đặc biệt / tiếng Việt có dấu tổ hợp: "Nguyễn Văn Ơn – ĐẠI HỌC" (NFC) ---
        $pNfc = FindParagraphByText $doc "Nguyễn Văn Ơn"
        if ($pNfc) {
            $txt = (NormalizeTableCellText $pNfc.Range.Text).Trim()
            Check "nfcText" "text" $expected["nfcText"]["text"] $txt
        } else {
            Check "nfcText" "text" $expected["nfcText"]["text"] "missing"
        }

        # --- 16. Tab stop 5cm + đoạn dùng Tab ---
        $pTab = FindParagraphByText $doc "sau Tab 5cm"
        if ($pTab) {
            $tabPos = 0.0
            if ($pTab.ParagraphFormat.TabStops.Count -ge 1) {
                $tabPos = [math]::Round([double]$pTab.ParagraphFormat.TabStops.Item(1).Position, 1)
            }
            Check "tabStop" "positionPt" $expected["tabStop"]["positionPt"] $tabPos
        } else {
            Check "tabStop" "positionPt" $expected["tabStop"]["positionPt"] 0
        }
    } else {
        # --- Title (Heading 1) ---
    $titlePara = $doc.Paragraphs.Item(1)
    $titleRange = $titlePara.Range
    Check "title" "text" $expected["title"]["text"] $titleRange.Text.Trim()
    Check "title" "font" $expected["title"]["font"] (GetFontName $titleRange)
    Check "title" "size" $expected["title"]["size"] (GetFontSize $titleRange)
    Check "title" "bold" $expected["title"]["bold"] (GetFontBold $titleRange)
    Check "title" "alignment" $expected["title"]["alignment"] (GetAlignment $titleRange)

    # --- Para 1: normal 13pt, line spacing 1.5 ---
    $p1 = $doc.Paragraphs.Item(2).Range
    Check "para1" "text" $expected["para1"]["text"] $p1.Text.Trim()
    Check "para1" "size" $expected["para1"]["size"] (GetFontSize $p1)
    Check "para1" "lineSpacing" $expected["para1"]["lineSpacing"] (GetLineSpacing $p1)
    Check "para1" "lineSpacingRule" $expected["para1"]["lineSpacingRule"] (GetLineSpacingRule $p1)

    # --- Para 2: italic, underline, red ---
    $p2 = $doc.Paragraphs.Item(3).Range
    Check "para2" "text" $expected["para2"]["text"] $p2.Text.Trim()
    Check "para2" "italic" $expected["para2"]["italic"] (GetFontItalic $p2)
    Check "para2" "underline" $expected["para2"]["underline"] (GetFontUnderline $p2)
    Check "para2" "color" $expected["para2"]["color"] (GetFontColor $p2)

    # --- Para 3: first line indent 1.27 cm ---
    $p3 = $doc.Paragraphs.Item(4).Range
    Check "para3" "text" $expected["para3"]["text"] $p3.Text.Trim()
    Check "para3" "firstLineIndentCm" $expected["para3"]["firstLineIndentCm"] (GetFirstLineIndentCm $p3)

    # --- Bullet List (paragraphs 5,6,7) ---
    $bulletItems = @()
    for ($i = 5; $i -le 7; $i++) {
        $r = $doc.Paragraphs.Item($i).Range
        $bulletItems += $r.Text.Trim()
    }
    Check "bulletList" "items" ($expected["bulletList"]["items"] -join "|") ($bulletItems -join "|")
    $listType1 = GetListType $doc.Paragraphs.Item(5).Range
    Check "bulletList" "listType" $expected["bulletList"]["listType"] $listType1

    # --- Numbered List (paragraphs 8,9,10) ---
    $numberedItems = @()
    for ($i = 8; $i -le 10; $i++) {
        $r = $doc.Paragraphs.Item($i).Range
        $numberedItems += $r.Text.Trim()
    }
    Check "numberedList" "items" ($expected["numberedList"]["items"] -join "|") ($numberedItems -join "|")
    $listType2 = GetListType $doc.Paragraphs.Item(8).Range
    Check "numberedList" "listType" $expected["numberedList"]["listType"] $listType2

    # --- Table ---
    if ($doc.Tables.Count -ge 1) {
        $table = $doc.Tables.Item(1)
        Check "table" "rows" $expected["table"]["rows"] $table.Rows.Count
        Check "table" "cols" $expected["table"]["cols"] $table.Columns.Count
        $cell11 = $table.Cell(1,1)
        $hasBorders = ($cell11.Borders.Item(1).LineStyle -ne 0) -and ($cell11.Borders.Item(2).LineStyle -ne 0) -and ($cell11.Borders.Item(3).LineStyle -ne 0) -and ($cell11.Borders.Item(4).LineStyle -ne 0)
        Check "table" "borders" $expected["table"]["borders"] ([bool]$hasBorders)
        $mergedText = GetTableCellText $table 1 1
        Check "table" "mergedCell.text" $expected["table"]["mergedCell"]["text"] $mergedText
        $row1Cells = $table.Rows.Item(1).Cells.Count
        Check "table" "mergedCell.colspan" $expected["table"]["mergedCell"]["colspan"] $row1Cells
    } else {
        $script:checks += 4; $script:diffs += 4
        Write-Host "table: expected table found [0] Word [no tables]"
    }

    # --- Image ---
    Check "image" "inlineShapesCount" $expected["image"]["inlineShapesCount"] $doc.InlineShapes.Count

    # --- Page Break / Page Count ---
    $pageCount = GetPrintPageCount $doc
    Check "pageBreak" "pageCount" $expected["pageBreak"]["pageCount"] $pageCount
    $page2Text = ""
    for ($i = 1; $i -le $doc.Paragraphs.Count; $i++) {
        $range = $doc.Paragraphs.Item($i).Range
        $t = NormalizeTableCellText $range.Text
        if ($t.Trim() -eq $expected["pageBreak"]["page2Text"]) {
            $paragraphPage = $range.Information(3)  # wdActiveEndPageNumber
            $page2Text = if ($paragraphPage -eq 2) { $t.Trim() } else { "$($t.Trim()) (page $paragraphPage)" }
            break
        }
    }
    Check "pageBreak" "page2Text" $expected["pageBreak"]["page2Text"] $page2Text

    # --- Header ---
    $headerRange = $doc.Sections.Item(1).Headers.Item(1).Range
    $headerText = $headerRange.Text.Trim()
    Check "header" "text" $expected["header"]["text"] $headerText
    Check "header" "alignment" $expected["header"]["alignment"] (GetAlignment $headerRange)

    # --- Footer ---
    $footerRange = $doc.Sections.Item(1).Footers.Item(1).Range
    $footerText = $footerRange.Text.Trim()
    $hasPageNum = $footerText -like "*Trang*" -or $footerRange.Fields.Count -gt 0
    Check "footer" "hasPageNumber" $expected["footer"]["hasPageNumber"] ([bool]$hasPageNum)

    # --- Page Setup ---
    $setup = $doc.Sections.Item(1).PageSetup
    $topMm = [math]::Round($setup.TopMargin * 0.0352778 * 10)
    $bottomMm = [math]::Round($setup.BottomMargin * 0.0352778 * 10)
    $leftMm = [math]::Round($setup.LeftMargin * 0.0352778 * 10)
    $rightMm = [math]::Round($setup.RightMargin * 0.0352778 * 10)
    $widthMm = [math]::Round($setup.PageWidth * 0.0352778 * 10)
    $heightMm = [math]::Round($setup.PageHeight * 0.0352778 * 10)
    Check "pageSetup" "topMarginMm" $expected["pageSetup"]["topMarginMm"] $topMm
    Check "pageSetup" "bottomMarginMm" $expected["pageSetup"]["bottomMarginMm"] $bottomMm
    Check "pageSetup" "leftMarginMm" $expected["pageSetup"]["leftMarginMm"] $leftMm
    Check "pageSetup" "rightMarginMm" $expected["pageSetup"]["rightMarginMm"] $rightMm
    Check "pageSetup" "pageWidthMm" $expected["pageSetup"]["pageWidthMm"] $widthMm
    Check "pageSetup" "pageHeightMm" $expected["pageSetup"]["pageHeightMm"] $heightMm
    }

    $doc.Close($false)
} finally { $word.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }

"CHECKS=$script:checks DIFFS=$script:diffs"
