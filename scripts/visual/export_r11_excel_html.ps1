$ErrorActionPreference = "Stop"

$pairs = @(
    # Verification files:
    @{ Src = "file test\lan\lan02.xlsx"; Out = "docs\screenshots\r11\orig_lan02.htm" },
    @{ Src = "file test\lan\lan03.xlsx"; Out = "docs\screenshots\r11\orig_lan03.htm" },
    @{ Src = "file test\lan\lan12.xlsx"; Out = "docs\screenshots\r11\orig_lan12.htm" },
    @{ Src = "file test\lan\lan26.xlsx"; Out = "docs\screenshots\r11\orig_lan26.htm" },
    @{ Src = "file test\lan\lan28.xlsx"; Out = "docs\screenshots\r11\orig_lan28.htm" },
    
    # 6 new workbooks:
    @{ Src = "file test\lan\lan04.xlsx"; Out = "docs\screenshots\r11\orig_lan04.htm" },
    @{ Src = "_rt_lan04.xlsx";           Out = "docs\screenshots\r11\rt_lan04.htm" },
    @{ Src = "file test\lan\lan07.xlsx"; Out = "docs\screenshots\r11\orig_lan07.htm" },
    @{ Src = "_rt_lan07.xlsx";           Out = "docs\screenshots\r11\rt_lan07.htm" },
    @{ Src = "file test\lan\lan08.xlsx"; Out = "docs\screenshots\r11\orig_lan08.htm" },
    @{ Src = "_rt_lan08.xlsx";           Out = "docs\screenshots\r11\rt_lan08.htm" },
    @{ Src = "file test\lan\lan10.xlsx"; Out = "docs\screenshots\r11\orig_lan10.htm" },
    @{ Src = "_rt_lan10.xlsx";           Out = "docs\screenshots\r11\rt_lan10.htm" },
    @{ Src = "file test\lan\lan13.xlsx"; Out = "docs\screenshots\r11\orig_lan13.htm" },
    @{ Src = "_rt_lan13.xlsx";           Out = "docs\screenshots\r11\rt_lan13.htm" },
    @{ Src = "file test\lan\lan16.xlsx"; Out = "docs\screenshots\r11\orig_lan16.htm" },
    @{ Src = "_rt_lan16.xlsx";           Out = "docs\screenshots\r11\rt_lan16.htm" }
)

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    foreach ($p in $pairs) {
        $srcFull = [System.IO.Path]::GetFullPath($p.Src)
        if (!(Test-Path $srcFull)) {
            Write-Warning "Source not found: $srcFull, skipping."
            continue
        }
        $outFull = [System.IO.Path]::GetFullPath($p.Out)
        if (Test-Path $outFull) {
            Write-Host "Already exists: $($p.Out)"
            continue
        }
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
