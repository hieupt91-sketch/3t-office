param(
    [string]$xlsxPath = "_rt_lan02_integrated.xlsx",
    [string]$outPrefix = "docs\screenshots\rt_lan02"
)

$fullXlsx = [System.IO.Path]::GetFullPath($xlsxPath)
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    Write-Host "Opening: $fullXlsx"
    $wb = $xl.Workbooks.Open($fullXlsx)
    for ($i = 1; $i -le $wb.Worksheets.Count; $i++) {
        $ws = $wb.Worksheets.Item($i)
        $sheetName = $ws.Name
        $safeName = $sheetName -replace '[\\/:*?"<>| ]', '_'
        $pdfPath = [System.IO.Path]::GetFullPath("${outPrefix}_sheet${i}_${safeName}.pdf")
        Write-Host "Exporting Sheet $i ($sheetName) to $pdfPath"
        $ws.ExportAsFixedFormat(0, $pdfPath)
    }
    $wb.Close($false)
    Write-Host "Export completed successfully."
}
catch {
    Write-Error $_.Exception.Message
}
finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
}
