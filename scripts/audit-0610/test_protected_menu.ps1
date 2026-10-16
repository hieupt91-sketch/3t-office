$ErrorActionPreference = "Stop"
$xl = New-Object -ComObject Excel.Application
$wb = $xl.Workbooks.Add()
$ws = $wb.Worksheets.Item(1)

try {
    $shape = $ws.Shapes.AddShape(1, 50, 50, 100, 60)
    $ws.Protect("password", $true, $true, $true) # Protect(Password, DrawingObjects, Contents, Scenarios)
    
    $cb = $xl.CommandBars.Item("Shapes")
    Write-Host "When Sheet is Protected, Shapes CommandBar controls:"
    for ($i = 1; $i -le $cb.Controls.Count; $i++) {
        $c = $cb.Controls.Item($i)
        Write-Host "  [$i] $($c.Caption) | Enabled: $($c.Enabled) | Visible: $($c.Visible)"
        if ($c.Type -eq 10) {
            for ($j = 1; $j -le $c.Controls.Count; $j++) {
                $sub = $c.Controls.Item($j)
                Write-Host "      [$j] $($sub.Caption) | Enabled: $($sub.Enabled) | Visible: $($sub.Visible)"
            }
        }
    }
} finally {
    $wb.Close($false)
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
