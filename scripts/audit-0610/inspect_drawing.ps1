$ErrorActionPreference = "Stop"
$xl = New-Object -ComObject Excel.Application
$wb = $xl.Workbooks.Add()
$ws = $wb.Worksheets.Item(1)
$tempPath = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "test_drawing_" + [System.Guid]::NewGuid().ToString() + ".xlsx")
try {
    # Shape 1
    $s1 = $ws.Shapes.AddShape(1, 50, 50, 100, 60)
    $s1.Name = "Rect1"
    $s1.Rotation = 90
    $s1.Flip(0) # Horizontal flip

    # Shape 2
    $s2 = $ws.Shapes.AddShape(1, 100, 100, 80, 50)
    $s2.Name = "Rect2"

    # Shape 3
    $s3 = $ws.Shapes.AddShape(1, 200, 200, 70, 70)
    $s3.Name = "Rect3"

    # Group s2 and s3
    $grp = $ws.Shapes.Range(@("Rect2", "Rect3")).Group()
    $grp.Name = "Group1"

    $wb.SaveAs($tempPath, 51)
} finally {
    $wb.Close($false)
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($tempPath)
$entry = $zip.GetEntry("xl/drawings/drawing1.xml")
if ($entry) {
    $sr = New-Object System.IO.StreamReader($entry.Open())
    $xml = $sr.ReadToEnd()
    $sr.Close()
    Write-Host "=== drawing1.xml ==="
    Write-Host $xml
}
$zip.Dispose()
Remove-Item $tempPath -Force
