$ErrorActionPreference = "Stop"
$xl = New-Object -ComObject Excel.Application
$wb = $xl.Workbooks.Add()
try {
    Write-Host "Total CommandBars: $($xl.CommandBars.Count)"
    $relevant = @()
    for ($i = 1; $i -le $xl.CommandBars.Count; $i++) {
        $cb = $xl.CommandBars.Item($i)
        $name = $cb.Name
        if ($name -match "Shape|Picture|Text|Chart|Drawing|Object") {
            $relevant += [PSCustomObject]@{ Index = $i; Name = $name; Type = $cb.Type }
        }
    }
    $relevant | Format-Table -AutoSize | Out-String | Write-Host
} finally {
    $wb.Close($false)
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
