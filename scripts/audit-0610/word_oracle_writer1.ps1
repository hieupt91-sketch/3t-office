param(
    [string]$Out = 'docs/word-oracle-writer1-1710.json'
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
    
    # 1. Tab Stops (ParagraphFormat.TabStops)
    $p = Retry { $doc.Paragraphs.Item(1) }
    Retry { $p.Range.Text = "Kiem tra diem dung Tab trong Word 2016.`n" } | Out-Null
    $defaultTab = Retry { $doc.DefaultTabStop }
    
    # Them tab: Right (2), Dots (1), Pos = 144 pt (~5.08 cm)
    # Alignment: 0=Left, 1=Center, 2=Right, 3=Decimal, 4=Bar
    # Leader: 0=None, 1=Dots, 2=Dashes, 3=Lines
    Retry { $p.TabStops.Add(144, 2, 1) } | Out-Null
    Retry { $p.TabStops.Add(216, 3, 2) } | Out-Null # Decimal, Dashes
    Retry { $p.TabStops.Add(288, 4, 0) } | Out-Null # Bar, None
    $tabCount = Retry { $p.TabStops.Count }
    $tab1 = Retry { $p.TabStops.Item(1) }
    $tab1Pos = Retry { $tab1.Position }
    $tab1Align = Retry { $tab1.Alignment }
    $tab1Leader = Retry { $tab1.Leader }
    $results += [pscustomobject]@{
        ten_phep_do = "1_tab_stops"
        thuoc_tinh = "Paragraph.TabStops"
        count = [int]$tabCount
        defaultTabStop = [double]$defaultTab
        tab1_position_pt = [double]$tab1Pos
        tab1_alignment = [int]$tab1Align
        tab1_leader = [int]$tab1Leader
        y_nghia = "DefaultTabStop = $defaultTab pt (36 pt = 1.27 cm); Tab1: Pos=$tab1Pos pt, Align=$tab1Align (2=Right), Leader=$tab1Leader (1=Dots)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 2. Table Split (Tach bang)
    $tblRange = Retry { $doc.Paragraphs.Add().Range }
    $tbl = Retry { $doc.Tables.Add($tblRange, 4, 3) }
    $initTblCount = Retry { $doc.Tables.Count }
    # Tach bang tai hang 3: trong Word SplitTable bang cach goi Split tren hang hoac Selection
    $row3 = Retry { $tbl.Rows.Item(3) }
    $splitTbl = Retry { $tbl.Split(3) }
    $afterSplitCount = Retry { $doc.Tables.Count }
    $tbl1Rows = Retry { $tbl.Rows.Count }
    $tbl2Rows = Retry { $splitTbl.Rows.Count }
    $results += [pscustomobject]@{
        ten_phep_do = "2_split_table"
        thuoc_tinh = "Tables.Count"
        initial_tables = [int]$initTblCount
        after_split_tables = [int]$afterSplitCount
        table1_rows = [int]$tbl1Rows
        table2_rows = [int]$tbl2Rows
        y_nghia = "Tach bang 4 hang tai hang 3 tao ra 2 bang: bang 1 co $tbl1Rows hang, bang 2 co $tbl2Rows hang"
        thoi_diem = (Get-Date -Format "o")
    }

    # 3. Cell Text Direction / Orientation (Huong chu trong o)
    # wdTextOrientationHorizontal = 0
    # wdTextOrientationUpward = 2 (bottom to top, 270 deg)
    # wdTextOrientationDownward = 3 (top to bottom, 90 deg)
    $cell1 = Retry { $tbl.Cell(1, 1) }
    $initOrient = Retry { $cell1.Range.Orientation }
    Retry { $cell1.Range.Orientation = 3 } | Out-Null # Downward 90 deg
    $downOrient = Retry { $cell1.Range.Orientation }
    Retry { $cell1.Range.Orientation = 2 } | Out-Null # Upward 270 deg
    $upOrient = Retry { $cell1.Range.Orientation }
    Retry { $cell1.Range.Orientation = 0 } | Out-Null # Horizontal
    $horizOrient = Retry { $cell1.Range.Orientation }
    $results += [pscustomobject]@{
        ten_phep_do = "3_cell_text_direction"
        thuoc_tinh = "Cell.Range.Orientation"
        initial = [int]$initOrient
        downward_90 = [int]$downOrient
        upward_270 = [int]$upOrient
        horizontal = [int]$horizOrient
        y_nghia = "0=wdTextOrientationHorizontal, 3=wdTextOrientationDownward (90 deg), 2=wdTextOrientationUpward (270 deg)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 4. Table Properties (Can le, thut le, le o padding, spacing)
    # Can le bang: wdAlignRowLeft = 0, wdAlignRowCenter = 1, wdAlignRowRight = 2
    Retry { $tbl.Rows.Alignment = 1 } | Out-Null # Center
    $tblAlign = Retry { $tbl.Rows.Alignment }
    Retry { $tbl.Rows.LeftIndent = 18 } | Out-Null # 18 pt = 0.25 in
    $tblIndent = Retry { $tbl.Rows.LeftIndent }
    # Padding le o (pt):
    Retry { $tbl.TopPadding = 5.67 } | Out-Null # ~2 mm
    Retry { $tbl.BottomPadding = 5.67 } | Out-Null
    Retry { $tbl.LeftPadding = 8.5 } | Out-Null # ~3 mm
    Retry { $tbl.RightPadding = 8.5 } | Out-Null
    Retry { $tbl.Spacing = 2.83 } | Out-Null # ~1 mm cell spacing
    $topPad = Retry { $tbl.TopPadding }
    $botPad = Retry { $tbl.BottomPadding }
    $leftPad = Retry { $tbl.LeftPadding }
    $rightPad = Retry { $tbl.RightPadding }
    $spacing = Retry { $tbl.Spacing }
    $results += [pscustomobject]@{
        ten_phep_do = "4_table_properties"
        thuoc_tinh = "Table.Padding_Spacing_Alignment"
        alignment = [int]$tblAlign
        left_indent_pt = [double]$tblIndent
        top_padding_pt = [double]$topPad
        bottom_padding_pt = [double]$botPad
        left_padding_pt = [double]$leftPad
        right_padding_pt = [double]$rightPad
        cell_spacing_pt = [double]$spacing
        y_nghia = "Table.Rows.Alignment=1 (Center), LeftIndent=$tblIndent pt; Top/BottomPad=$topPad pt, Left/RightPad=$leftPad pt, Spacing=$spacing pt"
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
Write-Host "XONG: Da do $($results.Count) phep do Word 2016 COM va ghi vao $Out"
