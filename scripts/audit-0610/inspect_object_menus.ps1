Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"
$xl = New-Object -ComObject Excel.Application
$wb = $xl.Workbooks.Add()
$ws = $wb.Worksheets.Item(1)

try {
    # 1. Add Shape
    $shape = $ws.Shapes.AddShape(1, 50, 50, 100, 60)
    $shape.Select()
    Write-Host "Shape selected. Selection Type: $($xl.Selection.ShapeRange.Type)"

    # 2. Add TextBox
    $tb = $ws.Shapes.AddTextbox(1, 150, 50, 100, 60) # 1 = msoTextOrientationHorizontal
    $tb.Select()
    Write-Host "TextBox selected. Selection Type: $($xl.Selection.ShapeRange.Type)"

    # 3. Add Picture
    $tempBmp = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "test_dot.bmp")
    $bmp = New-Object System.Drawing.Bitmap(10, 10)
    $bmp.Save($tempBmp)
    $bmp.Dispose()
    
    $pic = $ws.Pictures().Insert($tempBmp)
    $pic.Select()
    Write-Host "`nPicture selected. Selection Type: $($xl.Selection.ShapeRange.Type)"

    $cbPic = $xl.CommandBars.Item("Pictures Context Menu")
    Write-Host "`nWhen Picture selected, Pictures Context Menu controls:"
    for ($i = 1; $i -le $cbPic.Controls.Count; $i++) {
        $c = $cbPic.Controls.Item($i)
        Write-Host "  [$i] $($c.Caption) (Id: $($c.Id), Enabled: $($c.Enabled), Visible: $($c.Visible), BeginGroup: $($c.BeginGroup))"
        if ($c.Type -eq 10) {
            for ($j = 1; $j -le $c.Controls.Count; $j++) {
                $sub = $c.Controls.Item($j)
                Write-Host "      [$j] $($sub.Caption) (Id: $($sub.Id), Enabled: $($sub.Enabled), Visible: $($sub.Visible), BeginGroup: $($sub.BeginGroup))"
            }
        }
    }
    
    # 4. Add Chart
    $chObj = $ws.ChartObjects().Add(250, 50, 200, 150)
    $chObj.Select()
    Write-Host "`nChart selected. Selection Type: $($xl.Selection.ShapeRange.Type)"
    
    # Check what CommandBars are associated with Chart
    foreach ($name in @("Chart", "Object/Plot", "Inactive Chart")) {
        $cb = $xl.CommandBars.Item($name)
        Write-Host "`nCommandBar $name controls:"
        for ($i = 1; $i -le $cb.Controls.Count; $i++) {
            $c = $cb.Controls.Item($i)
            Write-Host "  [$i] $($c.Caption) (Id: $($c.Id), Enabled: $($c.Enabled), Visible: $($c.Visible), BeginGroup: $($c.BeginGroup))"
            if ($c.Type -eq 10) {
                for ($j = 1; $j -le $c.Controls.Count; $j++) {
                    $sub = $c.Controls.Item($j)
                    Write-Host "      [$j] $($sub.Caption) (Id: $($sub.Id), Enabled: $($sub.Enabled), Visible: $($sub.Visible), BeginGroup: $($sub.BeginGroup))"
                }
            }
        }
    }

    Remove-Item -Force $tempBmp -ErrorAction SilentlyContinue
} finally {
    $wb.Close($false)
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
