$ErrorActionPreference = "Stop"
$xl = New-Object -ComObject Excel.Application
$wb = $xl.Workbooks.Add()
try {
    for ($i = 1; $i -le $xl.CommandBars.Count; $i++) {
        $cb = $xl.CommandBars.Item($i)
        if ($cb.Type -eq 2) {
            Write-Host "[$i] $($cb.Name)"
        }
    }
} finally {
    $wb.Close($false)
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
