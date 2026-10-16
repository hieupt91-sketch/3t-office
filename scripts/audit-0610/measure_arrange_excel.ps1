$ErrorActionPreference = "Stop"
$xl = New-Object -ComObject Excel.Application
$wb = $xl.Workbooks.Add()
$ws = $wb.Worksheets.Item(1)
try {
    Write-Host "=== 1. Z-ORDER MEASUREMENTS ==="
    $s1 = $ws.Shapes.AddShape(1, 50, 50, 100, 60) # msoShapeRectangle
    $s1.Name = "Rect1"
    $s2 = $ws.Shapes.AddShape(1, 80, 80, 100, 60)
    $s2.Name = "Rect2"
    $s3 = $ws.Shapes.AddShape(1, 120, 120, 100, 60)
    $s3.Name = "Rect3"

    Write-Host "Initial ZOrder:"
    Write-Host "Rect1: $($s1.ZOrderPosition), Rect2: $($s2.ZOrderPosition), Rect3: $($s3.ZOrderPosition)"

    $s1.ZOrder(2) # msoBringForward
    Write-Host "After Rect1 BringForward:"
    Write-Host "Rect1: $($s1.ZOrderPosition), Rect2: $($s2.ZOrderPosition), Rect3: $($s3.ZOrderPosition)"

    $s1.ZOrder(0) # msoBringToFront
    Write-Host "After Rect1 BringToFront:"
    Write-Host "Rect1: $($s1.ZOrderPosition), Rect2: $($s2.ZOrderPosition), Rect3: $($s3.ZOrderPosition)"

    $s1.ZOrder(3) # msoSendBackward
    Write-Host "After Rect1 SendBackward:"
    Write-Host "Rect1: $($s1.ZOrderPosition), Rect2: $($s2.ZOrderPosition), Rect3: $($s3.ZOrderPosition)"

    $s1.ZOrder(1) # msoSendToBack
    Write-Host "After Rect1 SendToBack:"
    Write-Host "Rect1: $($s1.ZOrderPosition), Rect2: $($s2.ZOrderPosition), Rect3: $($s3.ZOrderPosition)"

    # Clean up for Align tests
    $s1.Delete()
    $s2.Delete()
    $s3.Delete()

    Write-Host "`n=== 2. ALIGN & DISTRIBUTE MEASUREMENTS ==="
    function ResetShapes {
        foreach ($sh in $ws.Shapes) { $sh.Delete() }
        $r1 = $ws.Shapes.AddShape(1, 50, 40, 100, 60)
        $r1.Name = "S1"
        $r2 = $ws.Shapes.AddShape(1, 120, 100, 80, 50)
        $r2.Name = "S2"
        $r3 = $ws.Shapes.AddShape(1, 250, 180, 120, 70)
        $r3.Name = "S3"
        return ,@($r1, $r2, $r3)
    }

    # Align Left (msoAlignLefts = 0, relativeTo = 0: within selection)
    $shapes = ResetShapes
    $rng = $ws.Shapes.Range(@("S1", "S2", "S3"))
    $rng.Align(0, 0)
    Write-Host "Align Lefts: S1.Left=$($shapes[0].Left), S2.Left=$($shapes[1].Left), S3.Left=$($shapes[2].Left)"

    # Align Center (msoAlignCenters = 1)
    $shapes = ResetShapes
    $rng = $ws.Shapes.Range(@("S1", "S2", "S3"))
    $rng.Align(1, 0)
    Write-Host "Align Centers: S1.Left=$($shapes[0].Left), S2.Left=$($shapes[1].Left), S3.Left=$($shapes[2].Left)"

    # Align Right (msoAlignRights = 2)
    $shapes = ResetShapes
    $rng = $ws.Shapes.Range(@("S1", "S2", "S3"))
    $rng.Align(2, 0)
    Write-Host "Align Rights: S1.Left=$($shapes[0].Left), S2.Left=$($shapes[1].Left), S3.Left=$($shapes[2].Left)"

    # Align Top (msoAlignTops = 3)
    $shapes = ResetShapes
    $rng = $ws.Shapes.Range(@("S1", "S2", "S3"))
    $rng.Align(3, 0)
    Write-Host "Align Tops: S1.Top=$($shapes[0].Top), S2.Top=$($shapes[1].Top), S3.Top=$($shapes[2].Top)"

    # Align Middle (msoAlignMiddles = 4)
    $shapes = ResetShapes
    $rng = $ws.Shapes.Range(@("S1", "S2", "S3"))
    $rng.Align(4, 0)
    Write-Host "Align Middles: S1.Top=$($shapes[0].Top), S2.Top=$($shapes[1].Top), S3.Top=$($shapes[2].Top)"

    # Align Bottom (msoAlignBottoms = 5)
    $shapes = ResetShapes
    $rng = $ws.Shapes.Range(@("S1", "S2", "S3"))
    $rng.Align(5, 0)
    Write-Host "Align Bottoms: S1.Top=$($shapes[0].Top), S2.Top=$($shapes[1].Top), S3.Top=$($shapes[2].Top)"

    # Distribute Horizontally (msoDistributeHorizontally = 0)
    $shapes = ResetShapes
    $rng = $ws.Shapes.Range(@("S1", "S2", "S3"))
    $rng.Distribute(0, 0)
    Write-Host "Distribute H: S1.Left=$($shapes[0].Left), S2.Left=$($shapes[1].Left), S3.Left=$($shapes[2].Left)"

    # Distribute Vertically (msoDistributeVertically = 1)
    $shapes = ResetShapes
    $rng = $ws.Shapes.Range(@("S1", "S2", "S3"))
    $rng.Distribute(1, 0)
    Write-Host "Distribute V: S1.Top=$($shapes[0].Top), S2.Top=$($shapes[1].Top), S3.Top=$($shapes[2].Top)"

    Write-Host "`n=== 3. GROUP / UNGROUP MEASUREMENTS ==="
    $shapes = ResetShapes
    $rng = $ws.Shapes.Range(@("S1", "S2", "S3"))
    $grp = $rng.Group()
    Write-Host "Group Name: $($grp.Name), Type: $($grp.Type), Left: $($grp.Left), Top: $($grp.Top), Width: $($grp.Width), Height: $($grp.Height)"
    Write-Host "Group Items Count: $($grp.GroupItems.Count)"
    Write-Host "Child S1 Left: $($grp.GroupItems.Item('S1').Left), Top: $($grp.GroupItems.Item('S1').Top)"

    $grp.Left = $grp.Left + 50
    $grp.Top = $grp.Top + 30
    Write-Host "After Group Move (+50, +30):"
    Write-Host "Group: Left=$($grp.Left), Top=$($grp.Top)"
    Write-Host "Child S1: Left=$($grp.GroupItems.Item('S1').Left), Top=$($grp.GroupItems.Item('S1').Top)"

    $ungrp = $grp.Ungroup()
    Write-Host "After Ungroup: ws.Shapes.Count=$($ws.Shapes.Count)"
    foreach ($sh in $ws.Shapes) {
        Write-Host "  Shape $($sh.Name): Left=$($sh.Left), Top=$($sh.Top)"
    }

    Write-Host "`n=== 4. ROTATE & FLIP MEASUREMENTS ==="
    $shapes = ResetShapes
    $s1 = $shapes[0]
    Write-Host "Initial S1 Rotation: $($s1.Rotation), HFlip: $($s1.HorizontalFlip), VFlip: $($s1.VerticalFlip)"

    $s1.IncrementRotation(90)
    Write-Host "After +90 Rotation: $($s1.Rotation)"

    $s1.IncrementRotation(90)
    Write-Host "After another +90: $($s1.Rotation)"

    $s1.IncrementRotation(180)
    Write-Host "After +180: $($s1.Rotation)"

    $s1.Flip(0) # msoFlipHorizontal
    Write-Host "After Flip Horizontal: HFlip=$($s1.HorizontalFlip), VFlip=$($s1.VerticalFlip)"

    $s1.Flip(1) # msoFlipVertical
    Write-Host "After Flip Vertical: HFlip=$($s1.HorizontalFlip), VFlip=$($s1.VerticalFlip)"

    Write-Host "`n=== 5. SELECTION PANE & VISIBILITY MEASUREMENTS ==="
    Write-Host "S1 Visible: $($s1.Visible)"
    $s1.Visible = 0 # msoFalse
    Write-Host "After Visible=0: S1 Visible=$($s1.Visible)"
    $s1.Visible = -1 # msoTrue
    Write-Host "After Visible=-1: S1 Visible=$($s1.Visible)"
    $s1.Name = "MyRenamedShape"
    Write-Host "Renamed Shape: $($s1.Name)"

} finally {
    $wb.Close($false)
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
