param(
    [Parameter(Mandatory=$true)][string]$docxPath,
    [Parameter(Mandatory=$true)][string]$outPrefix
)

$fullDocx = [System.IO.Path]::GetFullPath($docxPath)
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    Write-Host "Opening Word: $fullDocx"
    $doc = $word.Documents.Open($fullDocx, $false, $true, $false)
    $pdfAll = [System.IO.Path]::GetFullPath("${outPrefix}_pages1_3.pdf")
    Write-Host "Exporting pages 1-3 to $pdfAll"
    # wdExportFormatPDF = 17, wdExportFromTo = 3
    $doc.ExportAsFixedFormat($pdfAll, 17, $false, 0, 3, 1, 3)

    for ($p = 1; $p -le 3; $p++) {
        $pdfPage = [System.IO.Path]::GetFullPath("${outPrefix}_page${p}.pdf")
        Write-Host "Exporting page $p to $pdfPage"
        $doc.ExportAsFixedFormat($pdfPage, 17, $false, 0, 3, $p, $p)
    }
    $doc.Close(0)
    Write-Host "Word PDF export success"
}
catch {
    Write-Error $_.Exception.Message
    exit 1
}
finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
}
