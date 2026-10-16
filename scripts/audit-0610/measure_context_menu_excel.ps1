$ErrorActionPreference = "Stop"
$xl = New-Object -ComObject Excel.Application
$wb = $xl.Workbooks.Add()
$ws = $wb.Worksheets.Item(1)

function Dump-CommandBar($cbName) {
    try {
        $cb = $xl.CommandBars.Item($cbName)
        Write-Host "=========================================="
        Write-Host "COMMANDBAR: $($cb.Name) (Type: $($cb.Type), Index: $($cb.Index))"
        Write-Host "=========================================="
        for ($i = 1; $i -le $cb.Controls.Count; $i++) {
            $ctl = $cb.Controls.Item($i)
            $group = if ($ctl.BeginGroup) { "[--- GROUP BREAK ---]" } else { "" }
            if ($group) { Write-Host $group }
            Write-Host "[$i] Caption: '$($ctl.Caption)' | Id: $($ctl.Id) | Type: $($ctl.Type) | Enabled: $($ctl.Enabled) | Visible: $($ctl.Visible)"
            
            # If it's a popup (has sub-items, type 10 = msoControlPopup)
            if ($ctl.Type -eq 10) {
                for ($j = 1; $j -le $ctl.Controls.Count; $j++) {
                    $sub = $ctl.Controls.Item($j)
                    $subGroup = if ($sub.BeginGroup) { "  [--- SUB GROUP ---]" } else { "" }
                    if ($subGroup) { Write-Host $subGroup }
                    Write-Host "    [$j] Caption: '$($sub.Caption)' | Id: $($sub.Id) | Type: $($sub.Type)"
                }
            }
        }
    } catch {
        Write-Host "Error dumping $cbName : $_"
    }
}

try {
    Dump-CommandBar("Shapes")
    Dump-CommandBar("Pictures Context Menu")
    Dump-CommandBar("Chart")
    Dump-CommandBar("Object/Plot")
    Dump-CommandBar("Inactive Chart")
    Dump-CommandBar("WordArt Context Menu")
} finally {
    $wb.Close($false)
    $xl.Quit()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl) | Out-Null
}
