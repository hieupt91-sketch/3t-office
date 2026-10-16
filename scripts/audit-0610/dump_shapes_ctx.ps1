$ErrorActionPreference = "Stop"
$xl = New-Object -ComObject Excel.Application
$wb = $xl.Workbooks.Add()
try {
    $cb = $xl.CommandBars.Item("Shapes")
    Write-Host "COMMANDBAR: $($cb.Name)"
    for ($i = 1; $i -le $cb.Controls.Count; $i++) {
        $ctl = $cb.Controls.Item($i)
        Write-Host "[$i] $($ctl.Caption) | Id: $($ctl.Id) | Type: $($ctl.Type) | BeginGroup: $($ctl.BeginGroup) | Visible: $($ctl.Visible)"
        if ($ctl.Type -eq 10) {
            for ($j = 1; $j -le $ctl.Controls.Count; $j++) {
                $sub = $ctl.Controls.Item($j)
                Write-Host "    [$j] $($sub.Caption) | Id: $($sub.Id) | BeginGroup: $($sub.BeginGroup) | Visible: $($sub.Visible)"
            }
        }
    }
} finally {
    $wb.Close($false)
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
