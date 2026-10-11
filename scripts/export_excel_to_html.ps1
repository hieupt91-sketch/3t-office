param(
    [string]$xlsxPath = "_rt_lan02_integrated.xlsx",
    [string]$outHtml = "docs\screenshots\rt_lan02.htm"
)

$fullXlsx = [System.IO.Path]::GetFullPath($xlsxPath)
$fullHtml = [System.IO.Path]::GetFullPath($outHtml)
$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    Write-Host "Opening: $fullXlsx"
    $wb = $xl.Workbooks.Open($fullXlsx)
    Write-Host "Saving as HTML: $fullHtml"
    # 44 = xlHtml
    $wb.SaveAs($fullHtml, 44)
    $wb.Close($false)
    Write-Host "Excel HTML export success!"
}
catch {
    Write-Error $_.Exception.Message
}
finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
}
