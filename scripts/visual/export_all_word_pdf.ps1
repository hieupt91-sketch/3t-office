$ErrorActionPreference = "Stop"

$docs = @(
    @{ Src = "file test\landocx\d07.docx"; Prefix = "docs\screenshots\word_d07" },
    @{ Src = "file test\landocx\d09.docx"; Prefix = "docs\screenshots\word_d09" },
    @{ Src = "file test\landocx\d13.docx"; Prefix = "docs\screenshots\word_d13" }
)

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0

try {
    foreach ($d in $docs) {
        $fullDocx = [System.IO.Path]::GetFullPath($d.Src)
        Write-Host "Opening Word: $fullDocx"
        $doc = $word.Documents.Open($fullDocx, $false, $true, $false)
        
        for ($p = 1; $p -le 3; $p++) {
            $pdfPage = [System.IO.Path]::GetFullPath("$($d.Prefix)_page${p}.pdf")
            Write-Host "Exporting page $p to $pdfPage"
            # wdExportFormatPDF = 17, wdExportFromTo = 3
            $doc.ExportAsFixedFormat($pdfPage, 17, $false, 0, 3, $p, $p)
        }
        $doc.Close(0)
        Write-Host "Done: $($d.Prefix)"
    }
}
catch {
    Write-Error "Error during Word export: $($_.Exception.Message)"
}
finally {
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    Write-Host "Word COM released."
}
