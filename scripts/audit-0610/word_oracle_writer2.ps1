param(
    [string]$Out = 'docs/word-oracle-writer2-1710.json'
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
    $doc = Retry { $word.Documents.Add() }
    
    # 1. Selection Pane: Visibility, Name, Z-Order
    # In Word 2016, shapes can be created in document or canvas
    $canvas = Retry { $doc.Shapes.AddCanvas(50, 50, 250, 180) }
    $s1 = Retry { $canvas.CanvasItems.AddShape(1, 10, 10, 80, 50) } # msoShapeRectangle = 1
    $s2 = Retry { $canvas.CanvasItems.AddShape(9, 100, 40, 70, 70) } # msoShapeOval = 9
    
    $initCount = Retry { $canvas.CanvasItems.Count }
    $name1 = Retry { $s1.Name }
    $name2 = Retry { $s2.Name }
    $visBefore = Retry { $s1.Visible } # msoTrue = -1
    
    # Toggle visibility
    Retry { $s1.Visible = 0 } | Out-Null # msoFalse = 0
    $visHidden = Retry { $s1.Visible }
    Retry { $s1.Visible = -1 } | Out-Null
    $visRestored = Retry { $s1.Visible }
    
    # Rename shape
    Retry { $s1.Name = "SoDoKhoi" } | Out-Null
    $renamed = Retry { $s1.Name }
    
    # Z-Order: msoBringToFront = 0, msoSendToBack = 1
    $zBefore = Retry { $s1.ZOrderPosition }
    Retry { $s1.ZOrder(0) } | Out-Null
    $zAfter = Retry { $s1.ZOrderPosition }
    
    $results += [pscustomobject]@{
        ten_phep_do = "1_selection_pane"
        thuoc_tinh = "Shapes.Visible_Name_ZOrder"
        initial_shapes_count = [int]$initCount
        shape1_name = [string]$name1
        shape2_name = [string]$name2
        renamed_shape = [string]$renamed
        visible_initial = [int]$visBefore
        visible_hidden = [int]$visHidden
        visible_restored = [int]$visRestored
        zorder_before = [int]$zBefore
        zorder_after = [int]$zAfter
        y_nghia = "Selection Pane quan ly shapes: Visible (-1=Hien, 0=An), Name ('$name1' -> '$renamed'), ZOrder ($zBefore -> $zAfter)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 2. Group / Ungroup Shapes
    # Group shapes into msoGroup (Type = 6)
    $indices = [object[]]@(1, 2)
    $grp = Retry {
        $itemRange = $canvas.CanvasItems.Range([ref]$indices)
        $itemRange.Group()
    }
    $grpType = Retry { $grp.Type } # msoGroup = 6
    $grpItemsCount = Retry { $grp.GroupItems.Count }
    $countAfterGroup = Retry { $canvas.CanvasItems.Count }
    
    # Ungroup back
    Retry { $grp.Ungroup() } | Out-Null
    $countAfterUngroup = Retry { $canvas.CanvasItems.Count }
    
    $results += [pscustomobject]@{
        ten_phep_do = "2_group_ungroup"
        thuoc_tinh = "Shapes.Group_Ungroup"
        group_type = [int]$grpType
        group_items_count = [int]$grpItemsCount
        shapes_count_grouped = [int]$countAfterGroup
        shapes_count_ungrouped = [int]$countAfterUngroup
        y_nghia = "Nhom 2 shapes thanh 1 group shape (Type=6, GroupItems.Count=2); Bo nhom tra lai $countAfterUngroup shapes doc lap"
        thoi_diem = (Get-Date -Format "o")
    }

    # 3. Split Window (Chia cua so soan thao)
    $activeWin = Retry { $doc.ActiveWindow }
    $panesBefore = Retry { $activeWin.Panes.Count }
    Retry { $activeWin.Split = $true } | Out-Null
    $panesAfterSplit = Retry { $activeWin.Panes.Count }
    $splitPercent = Retry { $activeWin.SplitVertical }
    Retry { $activeWin.Split = $false } | Out-Null
    $panesAfterRemove = Retry { $activeWin.Panes.Count }
    
    $results += [pscustomobject]@{
        ten_phep_do = "3_split_window"
        thuoc_tinh = "ActiveWindow.Split"
        panes_before = [int]$panesBefore
        panes_after_split = [int]$panesAfterSplit
        split_vertical_percent = [int]$splitPercent
        panes_after_remove = [int]$panesAfterRemove
        y_nghia = "Chia cua so: Panes.Count tu $panesBefore -> $panesAfterSplit (SplitVertical=$splitPercent%); Bo chia tro ve $panesAfterRemove pane"
        thoi_diem = (Get-Date -Format "o")
    }

    # 4. Table Styles Gallery
    $p2 = Retry { $doc.Paragraphs.Add().Range }
    $tbl = Retry { $doc.Tables.Add($p2, 4, 4) }
    $defaultStyle = Retry { $tbl.Style.NameLocal }
    
    # Apply style: Table Grid / Light Shading / Medium Shading
    Retry { $tbl.Style = "Table Grid" } | Out-Null
    $gridStyle = Retry { $tbl.Style.NameLocal }
    
    # Style options
    Retry { $tbl.ApplyStyleHeadingRows = $true } | Out-Null
    Retry { $tbl.ApplyStyleRowBands = $true } | Out-Null
    Retry { $tbl.ApplyStyleFirstColumn = $true } | Out-Null
    Retry { $tbl.ApplyStyleLastColumn = $false } | Out-Null
    
    $hdrApplied = Retry { $tbl.ApplyStyleHeadingRows }
    $bandedApplied = Retry { $tbl.ApplyStyleRowBands }
    $firstColApplied = Retry { $tbl.ApplyStyleFirstColumn }
    $lastColApplied = Retry { $tbl.ApplyStyleLastColumn }
    
    $results += [pscustomobject]@{
        ten_phep_do = "4_table_styles"
        thuoc_tinh = "Table.Style"
        default_style = [string]$defaultStyle
        applied_style = [string]$gridStyle
        heading_rows = [bool]$hdrApplied
        banded_rows = [bool]$bandedApplied
        first_column = [bool]$firstColApplied
        last_column = [bool]$lastColApplied
        y_nghia = "Table Style '$gridStyle', HeadingRows=$hdrApplied, BandedRows=$bandedApplied, FirstCol=$firstColApplied, LastCol=$lastColApplied"
        thoi_diem = (Get-Date -Format "o")
    }

    # 5. Table Formula (=SUM(ABOVE), =SUM(LEFT))
    # Populating values for SUM(ABOVE)
    Retry { $tbl.Cell(1, 1).Range.Text = "120" } | Out-Null
    Retry { $tbl.Cell(2, 1).Range.Text = "80" } | Out-Null
    # Row 3 Cell 1: Formula =SUM(ABOVE)
    Retry { $tbl.Cell(3, 1).Formula("=SUM(ABOVE)", "#,##0") } | Out-Null
    $sumAboveText = (Retry { $tbl.Cell(3, 1).Range.Text }) -replace "[\r\x07]", ""
    $sumAboveField = Retry { $tbl.Cell(3, 1).Range.Fields.Item(1) }
    $sumAboveType = Retry { $sumAboveField.Type } # wdFieldFormula = 49
    $sumAboveCode = (Retry { $sumAboveField.Code.Text }).Trim()
    
    # Populating values for SUM(LEFT)
    Retry { $tbl.Cell(1, 2).Range.Text = "30" } | Out-Null
    Retry { $tbl.Cell(1, 3).Range.Text = "70" } | Out-Null
    # Row 1 Cell 4: Formula =SUM(LEFT)
    Retry { $tbl.Cell(1, 4).Formula("=SUM(LEFT)", "#,##0") } | Out-Null
    $sumLeftText = (Retry { $tbl.Cell(1, 4).Range.Text }) -replace "[\r\x07]", ""
    $sumLeftField = Retry { $tbl.Cell(1, 4).Range.Fields.Item(1) }
    $sumLeftType = Retry { $sumLeftField.Type } # wdFieldFormula = 49
    $sumLeftCode = (Retry { $sumLeftField.Code.Text }).Trim()
    
    $results += [pscustomobject]@{
        ten_phep_do = "5_table_formulas"
        thuoc_tinh = "Table.Cell.Formula"
        sum_above_formula = [string]$sumAboveCode
        sum_above_field_type = [int]$sumAboveType
        sum_above_result = [string]$sumAboveText
        sum_left_formula = [string]$sumLeftCode
        sum_left_field_type = [int]$sumLeftType
        sum_left_result = [string]$sumLeftText
        y_nghia = "=SUM(ABOVE) (120+80) = '$sumAboveText'; =SUM(LEFT) (30+70) = '$sumLeftText' (wdFieldFormula=49)"
        thoi_diem = (Get-Date -Format "o")
    }

    # Close doc without saving
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
