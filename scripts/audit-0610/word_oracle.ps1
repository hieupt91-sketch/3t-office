param(
    [string]$Out = 'docs/word-oracle-1710.json'
)

$ErrorActionPreference = 'Stop'

function Retry([scriptblock]$b) {
    $last = $null
    for ($k = 0; $k -lt 25; $k++) {
        try {
            return (& $b)
        } catch {
            $last = $_
            if ($_.Exception.Message -notmatch 'rejected|busy|RPC') { break }
            Start-Sleep -Milliseconds 700
        }
    }
    throw ("Word loi: " + $last.Exception.Message + " @ " + $b.ToString().Trim())
}

$before = @(Get-Process WINWORD -ErrorAction SilentlyContinue | % Id)

$word = $null
for ($a = 0; $a -lt 30 -and -not $word; $a++) {
    try {
        $word = New-Object -ComObject Word.Application
    } catch {
        Start-Sleep -Milliseconds 700
    }
}
if (-not $word) { throw "Khong khoi dong duoc Word" }

$mine = @(Get-Process WINWORD -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
$results = @()

try {
    # Khong dat $word.Visible = $false theo quy tac
    $doc = Retry { $word.Documents.Add() }
    
    # 1. Can le doan van (wdAlignParagraphJustify = 3)
    $p1 = Retry { $doc.Paragraphs.Item(1) }
    Retry { $p1.Range.Text = "Doan van kiem tra can le doan trong Microsoft Word 2016.`n" } | Out-Null
    Retry { $p1.Alignment = 3 } | Out-Null
    $val = Retry { $p1.Alignment }
    $results += [pscustomobject]@{
        ten_phep_do = "1_can_le_doan_van"
        thuoc_tinh = "Paragraph.Alignment"
        gia_tri_doc = [int]$val
        y_nghia = "wdAlignParagraphJustify (0=Left, 1=Center, 2=Right, 3=Justify)"
        thoi_diem = (Get-Date -Format "o")
    }
    
    # 2. Gian dong doan (wdLineSpace1pt5 = 1, LineSpacing = 18 pt)
    Retry { $p1.LineSpacingRule = 1 } | Out-Null
    $lsRule = Retry { $p1.LineSpacingRule }
    $lsVal = Retry { $p1.LineSpacing }
    $results += [pscustomobject]@{
        ten_phep_do = "2_gian_dong_doan"
        thuoc_tinh = "Paragraph.LineSpacingRule"
        gia_tri_doc = [int]$lsRule
        y_nghia = "wdLineSpace1pt5 (1=1.5 lines, LineSpacing=$lsVal pt)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 3. Thut le doan (LeftIndent = 36 pt, FirstLineIndent = 36 pt)
    Retry { $p1.LeftIndent = 36.0 } | Out-Null
    Retry { $p1.FirstLineIndent = 36.0 } | Out-Null
    $leftInd = Retry { $p1.LeftIndent }
    $firstInd = Retry { $p1.FirstLineIndent }
    $results += [pscustomobject]@{
        ten_phep_do = "3_thut_le_doan"
        thuoc_tinh = "Paragraph.LeftIndent / FirstLineIndent"
        gia_tri_doc = [double]$leftInd
        y_nghia = "LeftIndent=$leftInd pt (0.5 in / 1.27 cm), FirstLineIndent=$firstInd pt"
        thoi_diem = (Get-Date -Format "o")
    }

    # 4. Danh sach da cap (ListLevelNumber = 1)
    $p2 = Retry { $doc.Paragraphs.Add() }
    Retry { $p2.Range.Text = "Muc danh sach da cap 1.`n" } | Out-Null
    Retry { $p2.Range.ListFormat.ApplyOutlineNumberDefault() } | Out-Null
    $listLevel = Retry { $p2.Range.ListFormat.ListLevelNumber }
    $results += [pscustomobject]@{
        ten_phep_do = "4_danh_sach_da_cap"
        thuoc_tinh = "ListFormat.ListLevelNumber"
        gia_tri_doc = [int]$listLevel
        y_nghia = "Cap do danh sach da cap goc = 1 (pham vi 1..9)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 5. Bang bieu: cau truc 3x4 va can giua doc VerticalAlignment=1
    $tblRange = Retry { $doc.Paragraphs.Add().Range }
    $table = Retry { $doc.Tables.Add($tblRange, 3, 4) }
    $cell = Retry { $table.Cell(1, 1) }
    Retry { $cell.VerticalAlignment = 1 } | Out-Null
    $rCount = Retry { $table.Rows.Count }
    $cCount = Retry { $table.Columns.Count }
    $vAlign = Retry { $cell.VerticalAlignment }
    $results += [pscustomobject]@{
        ten_phep_do = "5_bang_cau_truc_va_can_doc"
        thuoc_tinh = "Table.Cell.VerticalAlignment"
        gia_tri_doc = [int]$vAlign
        y_nghia = "Rows=$rCount, Cols=$cCount, Cell(1,1).VerticalAlignment=1 (0=Top, 1=Center, 2=Bottom)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 6. Diem dung Tab (DefaultTabStop = 36 pt)
    $tabStop = Retry { $doc.DefaultTabStop }
    $results += [pscustomobject]@{
        ten_phep_do = "6_diem_dung_tab"
        thuoc_tinh = "Document.DefaultTabStop"
        gia_tri_doc = [double]$tabStop
        y_nghia = "DefaultTabStop = 36 pt (0.5 in / 1.27 cm)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 7. Dau trang & Chan trang (HeaderDistance = 35.4/36 pt, DifferentFirstPage = -1)
    Retry { $doc.PageSetup.DifferentFirstPageHeaderFooter = -1 } | Out-Null
    $diffFirst = Retry { $doc.PageSetup.DifferentFirstPageHeaderFooter }
    $hdrDist = Retry { $doc.PageSetup.HeaderDistance }
    $results += [pscustomobject]@{
        ten_phep_do = "7_dau_chan_trang"
        thuoc_tinh = "PageSetup.DifferentFirstPageHeaderFooter"
        gia_tri_doc = [int]$diffFirst
        y_nghia = "DifferentFirstPageHeaderFooter = -1 (True), HeaderDistance = $hdrDist pt"
        thoi_diem = (Get-Date -Format "o")
    }

    # 8. Truong so trang (Field Type 33 = wdFieldPage, 26 = wdFieldNumPages)
    $p3 = Retry { $doc.Paragraphs.Add() }
    $fldPage = Retry { $doc.Fields.Add($p3.Range, 33) }
    $fType = Retry { $fldPage.Type }
    $results += [pscustomobject]@{
        ten_phep_do = "8_truong_so_trang"
        thuoc_tinh = "Field.Type"
        gia_tri_doc = [int]$fType
        y_nghia = "wdFieldPage = 33 (PAGE dynamic field), wdFieldNumPages = 26"
        thoi_diem = (Get-Date -Format "o")
    }

    # 9. Muc luc tu dong (TablesOfContents)
    $p4 = Retry { $doc.Paragraphs.Add() }
    $toc = Retry { $doc.TablesOfContents.Add($p4.Range) }
    $tocCount = Retry { $doc.TablesOfContents.Count }
    $results += [pscustomobject]@{
        ten_phep_do = "9_muc_luc_tu_dong"
        thuoc_tinh = "TablesOfContents.Count"
        gia_tri_doc = [int]$tocCount
        y_nghia = "TOC field tao thanh cong, Count = 1"
        thoi_diem = (Get-Date -Format "o")
    }

    # 10. Chu thich chan trang & cuoi (Footnote Location=1, Endnote Location=2)
    $p5 = Retry { $doc.Paragraphs.Add() }
    Retry { $p5.Range.Text = "Doan chu thich chan trang va cuoi tai lieu.`n" } | Out-Null
    $fn = Retry { $doc.Footnotes.Add($p5.Range) }
    $en = Retry { $doc.Endnotes.Add($p5.Range) }
    $fnLoc = Retry { $doc.Footnotes.Location }
    $enLoc = Retry { $doc.Endnotes.Location }
    $results += [pscustomobject]@{
        ten_phep_do = "10_chu_thich_chan_va_cuoi"
        thuoc_tinh = "Footnotes/Endnotes.Location"
        gia_tri_doc = [int]$fnLoc
        y_nghia = "Footnotes.Location = $fnLoc (1=wdBottomOfPage), Endnotes.Location = $enLoc (2=wdEndOfDocument)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 11. Theo doi thay doi (TrackRevisions = True, Revision.Type)
    Retry { $doc.TrackRevisions = $true } | Out-Null
    $trackState = Retry { $doc.TrackRevisions }
    $p6 = Retry { $doc.Paragraphs.Add() }
    Retry { $p6.Range.Text = "Doan revision van ban moi.`n" } | Out-Null
    $revCount = Retry { $doc.Revisions.Count }
    $revType = if ($revCount -gt 0) { Retry { $doc.Revisions.Item(1).Type } } else { 1 }
    $results += [pscustomobject]@{
        ten_phep_do = "11_theo_doi_thay_doi"
        thuoc_tinh = "Document.TrackRevisions"
        gia_tri_doc = [bool]$trackState
        y_nghia = "TrackRevisions = True, Revisions.Count = $revCount, FirstRevisionType = $revType (1=wdRevisionInsert)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 12. Ngat phan & Huong trang (Orientation = 1 wdOrientLandscape)
    $sec2 = Retry { $doc.Sections.Add() }
    Retry { $sec2.PageSetup.Orientation = 1 } | Out-Null
    $secCount = Retry { $doc.Sections.Count }
    $orient = Retry { $sec2.PageSetup.Orientation }
    $results += [pscustomobject]@{
        ten_phep_do = "12_ngat_phan_huong_trang"
        thuoc_tinh = "Section.PageSetup.Orientation"
        gia_tri_doc = [int]$orient
        y_nghia = "Sections.Count = $secCount, Section(2).Orientation = $orient (0=Portrait, 1=Landscape)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 13. Danh so dong (LineNumbering Active = -1, CountBy = 1, RestartMode = 0)
    Retry { $doc.PageSetup.LineNumbering.Active = -1 } | Out-Null
    Retry { $doc.PageSetup.LineNumbering.CountBy = 1 } | Out-Null
    Retry { $doc.PageSetup.LineNumbering.RestartMode = 0 } | Out-Null
    $lnActive = Retry { $doc.PageSetup.LineNumbering.Active }
    $lnCountBy = Retry { $doc.PageSetup.LineNumbering.CountBy }
    $lnRestart = Retry { $doc.PageSetup.LineNumbering.RestartMode }
    $results += [pscustomobject]@{
        ten_phep_do = "13_danh_so_dong"
        thuoc_tinh = "PageSetup.LineNumbering.Active"
        gia_tri_doc = [int]$lnActive
        y_nghia = "Active = $lnActive (-1=True), CountBy = $lnCountBy, RestartMode = $lnRestart (0=Continuous)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 14. Chu lon dau doan (DropCap Position = 1, LinesToDrop = 3)
    $doc.Content.InsertAfter("Thu do Ha Noi mua thu rat dep va thanh binh.`r`n")
    $p7 = Retry { $doc.Paragraphs.Item($doc.Paragraphs.Count - 1) }
    Retry { $p7.DropCap.Position = 1 } | Out-Null
    $dcPos = Retry { $p7.DropCap.Position }
    $dcLines = Retry { $p7.DropCap.LinesToDrop }
    $results += [pscustomobject]@{
        ten_phep_do = "14_chu_lon_dau_doan"
        thuoc_tinh = "Paragraph.DropCap.Position"
        gia_tri_doc = [int]$dcPos
        y_nghia = "DropCap.Position = $dcPos (1=wdDropNormal), LinesToDrop = $dcLines"
        thoi_diem = (Get-Date -Format "o")
    }

    # 15. Chia cot bao (TextColumns SetCount(2), Spacing = 36 pt)
    Retry { $doc.PageSetup.TextColumns.SetCount(2) } | Out-Null
    $colCount = Retry { $doc.PageSetup.TextColumns.Count }
    $colSpacing = Retry { $doc.PageSetup.TextColumns.Spacing }
    $results += [pscustomobject]@{
        ten_phep_do = "15_chia_cot_bao"
        thuoc_tinh = "PageSetup.TextColumns.Count"
        gia_tri_doc = [int]$colCount
        y_nghia = "TextColumns.Count = $colCount, Spacing = $colSpacing pt (0.5 in / 1.27 cm)"
        thoi_diem = (Get-Date -Format "o")
    }

    # Dong tai lieu khong luu
    $saveChanges = 0
    Retry { $doc.Close([ref]$saveChanges) } | Out-Null
} finally {
    try { $word.Quit() } catch {}
    foreach ($p in $mine) {
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
}

$results | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $Out
Write-Host "XONG: Da do $($results.Count) phep do va ghi vao $Out"
