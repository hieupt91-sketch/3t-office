# Doc lai file DOCX bang Word 2016 COM va doi chieu voi <file>.expected.json (sinh boi _create_new_writer.py).
# Usage: powershell -File _word_readback.ps1 -File out.docx
param([string]$File)
Add-Type -AssemblyName System.Web.Extensions
$json = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$expected = $json.DeserializeObject([IO.File]::ReadAllText("$File.expected.json", [Text.Encoding]::UTF8))
$word = New-Object -ComObject Word.Application
$word.Visible = $false; $word.DisplayAlerts = 0  # wdAlertsNone = 0
$hex = { param($v) "#{0:X2}{1:X2}{2:X2}" -f ($v -band 0xFF), (($v -shr 8) -band 0xFF), (($v -shr 16) -band 0xFF) }
$pt2cm = 0.0352778  # 1 pt = 0.0352778 cm
$twip2cm = 0.00176389  # 1 twip = 0.00176389 cm
$script:diffs = 0; $script:checks = 0

function Check($key, $prop, $want, $got) {
    $script:checks++
    if ("$got" -ne "$want") {
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
function GetLineSpacing($range) {
    try { return [double]$range.ParagraphFormat.LineSpacing / [double]$range.Font.Size } catch { return 0 }
}
function GetLineSpacingRule($range) {
    try { return [int]$range.ParagraphFormat.LineSpacingRule } catch { return 0 }
}
function GetFirstLineIndentCm($range) {
    try { return [math]::Round($range.ParagraphFormat.FirstLineIndent * $twip2cm, 2) } catch { return 0 }
}
function GetListType($range) {
    try {
        $lt = $range.ListFormat.ListType
        if ($lt -eq 0) { return "none" }
        elseif ($lt -eq 2) { return "bullet" }
        else { return "numbered" }
    } catch { return "error" }
}
function GetTableCellText($table, $row, $col) {
    try { return $table.Cell($row,$col).Range.Text.Trim() } catch { return "" }
}

try {
    $doc = $word.Documents.Open((Resolve-Path $File).Path, 0, $true)
    
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
        Check "table" "borders" $expected["table"]["borders"] [bool]$hasBorders
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
    $pageCount = $doc.ComputeStatistics(2)  # wdStatisticPages = 2
    Check "pageBreak" "pageCount" $expected["pageBreak"]["pageCount"] $pageCount
    $page2Text = ""
    if ($doc.Paragraphs.Count -gt 10) {
        for ($i = 11; $i -le $doc.Paragraphs.Count; $i++) {
            $t = $doc.Paragraphs.Item($i).Range.Text.Trim()
            if ($t) { $page2Text = $t; break }
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
    Check "footer" "hasPageNumber" $expected["footer"]["hasPageNumber"] [bool]$hasPageNum

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

    $doc.Close($false)
} finally { $word.Quit(); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) }

"CHECKS=$script:checks DIFFS=$script:diffs"