$ErrorActionPreference = "Stop"

$pairs = @(
    @{ Src = "file test\lan\lan02.xlsx"; Out = "docs\screenshots\orig_lan02.htm" },
    @{ Src = "_rt_lan02.xlsx";           Out = "docs\screenshots\rt_lan02.htm" },
    @{ Src = "file test\lan\lan03.xlsx"; Out = "docs\screenshots\orig_lan03.htm" },
    @{ Src = "_rt_lan03.xlsx";           Out = "docs\screenshots\rt_lan03.htm" },
    @{ Src = "file test\lan\lan09.xlsx"; Out = "docs\screenshots\orig_lan09.htm" },
    @{ Src = "_rt_lan09.xlsx";           Out = "docs\screenshots\rt_lan09.htm" },
    @{ Src = "file test\lan\lan12.xlsx"; Out = "docs\screenshots\orig_lan12.htm" },
    @{ Src = "_rt_lan12.xlsx";           Out = "docs\screenshots\rt_lan12.htm" },
    @{ Src = "file test\lan\lan26.xlsx"; Out = "docs\screenshots\orig_lan26.htm" },
    @{ Src = "_rt_lan26.xlsx";           Out = "docs\screenshots\rt_lan26.htm" },
    @{ Src = "file test\lan\lan28.xlsx"; Out = "docs\screenshots\orig_lan28.htm" },
    @{ Src = "_rt_lan28.xlsx";           Out = "docs\screenshots\rt_lan28.htm" }
)

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    foreach ($p in $pairs) {
        $srcFull = [System.IO.Path]::GetFullPath($p.Src)
        $outFull = [System.IO.Path]::GetFullPath($p.Out)
        $outDir = [System.IO.Path]::GetDirectoryName($outFull)
        if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
        
        Write-Host "Processing: $($p.Src) -> $($p.Out)"
        $wb = $xl.Workbooks.Open($srcFull, $false, $true) # read-only
        
        # We only need up to 4 sheets per brief
        while ($wb.Worksheets.Count -gt 4) {
            $lastWs = $wb.Worksheets.Item($wb.Worksheets.Count)
            $lastWs.Delete()
        }
        for ($i = 1; $i -le $wb.Worksheets.Count; $i++) {
            try { $wb.Worksheets.Item($i).Unprotect("") } catch {}
        }
        
        $wb.SaveAs($outFull, 44) # 44 = xlHtml
        $wb.Close($false)
        Write-Host "Done: $($p.Out)"
    }
}
catch {
    Write-Error "Error during Excel HTML export: $($_.Exception.Message)"
}
finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
    Write-Host "Excel COM released."
}
