$ErrorActionPreference = "Stop"
$xl = New-Object -ComObject Excel.Application
$wb = $xl.Workbooks.Add()
try {
    $cb53 = $xl.CommandBars.Item(53)
    Write-Host "Index 53: Name = $($cb53.Name), Type = $($cb53.Type)"
    for ($i = 1; $i -le $cb53.Controls.Count; $i++) {
        $c = $cb53.Controls.Item($i)
        Write-Host "  [$i] $($c.Caption) (Id: $($c.Id), Type: $($c.Type), BeginGroup: $($c.BeginGroup))"
    }

    # Also check if there is "Chart Area"
    for ($i = 1; $i -le $xl.CommandBars.Count; $i++) {
        $cb = $xl.CommandBars.Item($i)
        if ($cb.Name -like "*Chart*") {
            Write-Host "Found: [$i] $($cb.Name) (Type: $($cb.Type))"
        }
    }
} finally {
    $wb.Close($false)
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
