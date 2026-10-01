param(
    [Parameter(Mandatory=$true)]
    [string]$FilePath
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"
$before = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })

$word = $null
$doc = $null
$ownedPid = $null

try {
    $word = New-Object -ComObject Word.Application
    $ownedPids = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id })
    if ($ownedPids.Count -gt 0) {
        $ownedPid = [int]$ownedPids[0].Id
    }

    $word.Visible = $false
    $word.DisplayAlerts = 0

    $fullPath = (Resolve-Path -LiteralPath $FilePath).Path
    $doc = $word.Documents.Open($fullPath, $false, $true)

    function NormalizeText($t) {
        if (-not $t) { return "" }
        return ("$t".TrimEnd([char]13, [char]7, [char]10)).Trim()
    }

    function RemoveDiacritics($text) {
        if (-not $text) { return "" }
        $norm = "$text".Normalize([System.Text.NormalizationForm]::FormD)
        $sb = New-Object System.Text.StringBuilder
        for ($k = 0; $k -lt $norm.Length; $k++) {
            $ch = $norm[$k]
            $cat = [System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch)
            if ($cat -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) {
                [void]$sb.Append($ch)
            }
        }
        return ($sb.ToString()).Replace("đ", "d").Replace("Đ", "D").ToLowerInvariant()
    }

    function FindParagraphBySubstring($d, $sub) {
        $cleanSub = RemoveDiacritics $sub
        for ($i = 1; $i -le $d.Paragraphs.Count; $i++) {
            $p = $d.Paragraphs.Item($i)
            $t = RemoveDiacritics (NormalizeText $p.Range.Text)
            if ($t -like "*$cleanSub*") {
                return $p
            }
        }
        return $null
    }

    # B2: Character properties
    $pBold = FindParagraphBySubstring $doc "in dam"
    $isBold = if ($pBold) { [bool]$pBold.Range.Font.Bold } else { $false }

    $pItalic = FindParagraphBySubstring $doc "in nghieng"
    $isItalic = if ($pItalic) { [bool]$pItalic.Range.Font.Italic } else { $false }

    $pUnderline = FindParagraphBySubstring $doc "gach chan"
    $isUnderline = if ($pUnderline) { [int]$pUnderline.Range.Font.Underline -ne 0 } else { $false }

    $pStrike = FindParagraphBySubstring $doc "gach ngang"
    $isStrike = if ($pStrike) { [bool]$pStrike.Range.Font.StrikeThrough } else { $false }

    $pSuper = FindParagraphBySubstring $doc "chi so tren"
    $isSuper = if ($pSuper) {
        $hasSuper = $false
        for ($c = 1; $c -le $pSuper.Range.Characters.Count; $c++) {
            if ($pSuper.Range.Characters.Item($c).Font.Superscript) { $hasSuper = $true; break }
        }
        $hasSuper
    } else { $false }

    $pSub = FindParagraphBySubstring $doc "chi so duoi"
    $isSub = if ($pSub) {
        $hasSub = $false
        for ($c = 1; $c -le $pSub.Range.Characters.Count; $c++) {
            if ($pSub.Range.Characters.Item($c).Font.Subscript) { $hasSub = $true; break }
        }
        $hasSub
    } else { $false }

    $pColor = FindParagraphBySubstring $doc "mau chu do"
    $colorHex = ""
    if ($pColor) {
        $col = [int]$pColor.Range.Font.Color
        if ($col -ge 0) {
            $r = $col -band 0xFF
            $g = ($col -shr 8) -band 0xFF
            $b = ($col -shr 16) -band 0xFF
            $colorHex = "#{0:X2}{1:X2}{2:X2}" -f $r, $g, $b
        }
    }

    $pHighlight = FindParagraphBySubstring $doc "to nen vang"
    $highlightIndex = if ($pHighlight) { [int]$pHighlight.Range.HighlightColorIndex } else { 0 }

    $pSize16 = FindParagraphBySubstring $doc "co chu 16 pt"
    $fontSize16 = if ($pSize16) { [double]$pSize16.Range.Font.Size } else { 0 }

    # B3: Paragraph formatting
    $alignMap = @{ 0="left"; 1="center"; 2="right"; 3="justify" }
    
    $pLeft = FindParagraphBySubstring $doc "can trai"
    $alignLeft = if ($pLeft) { $alignMap[[int]$pLeft.Range.ParagraphFormat.Alignment] } else { "" }

    $pCenter = FindParagraphBySubstring $doc "can giua"
    $alignCenter = if ($pCenter) { $alignMap[[int]$pCenter.Range.ParagraphFormat.Alignment] } else { "" }

    $pRight = FindParagraphBySubstring $doc "can phai"
    $alignRight = if ($pRight) { $alignMap[[int]$pRight.Range.ParagraphFormat.Alignment] } else { "" }

    $pJustify = FindParagraphBySubstring $doc "can deu hai ben"
    $alignJustify = if ($pJustify) { $alignMap[[int]$pJustify.Range.ParagraphFormat.Alignment] } else { "" }

    $pLine15 = FindParagraphBySubstring $doc "gian dong 1.5"
    $lineSpacingRule = if ($pLine15) { [int]$pLine15.Range.ParagraphFormat.LineSpacingRule } else { -1 }
    $lineSpacingVal = if ($pLine15) { [double]$pLine15.Range.ParagraphFormat.LineSpacing } else { 0 }

    $pSpacing = FindParagraphBySubstring $doc "khoang cach truoc 12pt"
    $spaceBefore = if ($pSpacing) { [double]$pSpacing.Range.ParagraphFormat.SpaceBefore } else { 0 }
    $spaceAfter = if ($pSpacing) { [double]$pSpacing.Range.ParagraphFormat.SpaceAfter } else { 0 }

    $pIndent = FindParagraphBySubstring $doc "thut le dong dau"
    $firstLineIndent = if ($pIndent) { [double]$pIndent.Range.ParagraphFormat.FirstLineIndent } else { 0 }

    # B4: Numbering formats (1., a), i.)
    $pList1 = FindParagraphBySubstring $doc "danh sach so 1"
    $listString1 = if ($pList1) { "$($pList1.Range.ListFormat.ListString)" } else { "" }

    $pListA = FindParagraphBySubstring $doc "danh so a"
    $listStringA = if ($pListA) { "$($pListA.Range.ListFormat.ListString)" } else { "" }

    $pListI = FindParagraphBySubstring $doc "danh so la ma i"
    $listStringI = if ($pListI) { "$($pListI.Range.ListFormat.ListString)" } else { "" }

    # B5: Heading styles & TOC
    $pH1 = FindParagraphBySubstring $doc "tieu de cap 1"
    $h1Style = if ($pH1) { "$($pH1.Range.Style.NameLocal)" } else { "" }

    $pH2 = FindParagraphBySubstring $doc "tieu de cap 2"
    $h2Style = if ($pH2) { "$($pH2.Range.Style.NameLocal)" } else { "" }

    $tocCount = [int]$doc.TablesOfContents.Count
    $fieldsCount = [int]$doc.Fields.Count
    $hasTocField = $false
    for ($f = 1; $f -le $fieldsCount; $f++) {
        try {
            if ($doc.Fields.Item($f).Type -eq 13) {
                $hasTocField = $true; break
            }
        } catch {}
    }

    # B6: Table
    $tableCount = [int]$doc.Tables.Count
    $tableRows = 0
    $tableCols = 0
    $cell11Text = ""
    if ($tableCount -ge 1) {
        $tbl = $doc.Tables.Item(1)
        $tableRows = [int]$tbl.Rows.Count
        $tableCols = [int]$tbl.Columns.Count
        try {
            $cell11Text = NormalizeText $tbl.Cell(1,1).Range.Text
        } catch {
            $cell11Text = ""
        }
    }

    # B7: Page setup
    $paperSize = [int]$doc.PageSetup.PaperSize
    $orientation = [int]$doc.PageSetup.Orientation
    $pageWidth = [double]$doc.PageSetup.PageWidth
    $pageHeight = [double]$doc.PageSetup.PageHeight
    $leftMargin = [double]$doc.PageSetup.LeftMargin
    $rightMargin = [double]$doc.PageSetup.RightMargin

    $result = @{
        status = "ok"
        ownedPid = $ownedPid
        characters = @{
            isBold = $isBold
            isItalic = $isItalic
            isUnderline = $isUnderline
            isStrike = $isStrike
            isSuperscript = $isSuper
            isSubscript = $isSub
            colorHex = $colorHex
            highlightIndex = $highlightIndex
            fontSize16 = $fontSize16
        }
        paragraphs = @{
            alignLeft = $alignLeft
            alignCenter = $alignCenter
            alignRight = $alignRight
            alignJustify = $alignJustify
            lineSpacingRule = $lineSpacingRule
            lineSpacingVal = $lineSpacingVal
            spaceBefore = $spaceBefore
            spaceAfter = $spaceAfter
            firstLineIndent = $firstLineIndent
        }
        lists = @{
            listString1 = $listString1
            listStringA = $listStringA
            listStringI = $listStringI
        }
        headings = @{
            h1Style = $h1Style
            h2Style = $h2Style
            tocCount = $tocCount
            hasTocField = $hasTocField
        }
        table = @{
            count = $tableCount
            rows = $tableRows
            cols = $tableCols
            cell11Text = $cell11Text
        }
        pageSetup = @{
            paperSize = $paperSize
            orientation = $orientation
            pageWidth = $pageWidth
            pageHeight = $pageHeight
            leftMargin = $leftMargin
            rightMargin = $rightMargin
        }
    }

    Write-Output (ConvertTo-Json $result -Depth 5)
} catch {
    $errResult = @{
        status = "error"
        message = $_.Exception.Message
        ownedPid = $ownedPid
    }
    Write-Output (ConvertTo-Json $errResult)
} finally {
    if ($doc) {
        try { $doc.Close(0) } catch {}
    }
    if ($word) {
        try { $word.Quit() } catch {}
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null } catch {}
    }
    if ($ownedPid -and $before -notcontains $ownedPid) {
        Start-Sleep -Milliseconds 300
        $p = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
        if ($p) {
            try { Stop-Process -Id $ownedPid -Force -ErrorAction SilentlyContinue } catch {}
        }
    }
}
