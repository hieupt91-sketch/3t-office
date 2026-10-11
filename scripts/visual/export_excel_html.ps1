param(
    [Parameter(Mandatory=$true)][string]$xlsxPath,
    [Parameter(Mandatory=$true)][string]$outHtml
)

$fullXlsx = [System.IO.Path]::GetFullPath($xlsxPath)
$fullHtml = [System.IO.Path]::GetFullPath($outHtml)
$outDir = [System.IO.Path]::GetDirectoryName($fullHtml)
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$xl = New-Object -ComObject Excel.Application
$xl.Visible = $false
$xl.DisplayAlerts = $false

try {
    Write-Host "Opening Excel: $fullXlsx"
    $wb = $xl.Workbooks.Open($fullXlsx)
    Write-Host "Exporting HTML: $fullHtml"
    # 44 = xlHtml
    $wb.SaveAs($fullHtml, 44)
    $wb.Close($false)
    Write-Host "Excel HTML export success"
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
finally {
    $xl.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($xl) | Out-Null
}
