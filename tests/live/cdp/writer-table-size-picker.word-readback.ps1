param([Parameter(Mandatory=$true)][string]$DocumentPath)
$ErrorActionPreference = 'Stop'
$word = $null
$document = $null
try {
    if (-not (Test-Path -LiteralPath $DocumentPath)) { throw "DOCX not found: $DocumentPath" }
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($DocumentPath, $false, $true, $false)
    $actual = @()
    for ($index = 1; $index -le $document.Tables.Count; $index++) {
        $table = $document.Tables.Item($index)
        $actual += [pscustomobject]@{ table = $index; rows = $table.Rows.Count; columns = $table.Columns.Count }
    }
    $actual | ConvertTo-Json -Compress
    $ok = $actual.Count -eq 2 -and $actual[0].rows -eq 3 -and $actual[0].columns -eq 5 -and $actual[1].rows -eq 4 -and $actual[1].columns -eq 6
    if (-not $ok) { throw 'Word readback dimensions did not match 5x3 and 6x4.' }
    Write-Output 'PASS | Word DOCX table dimensions 5x3 and 6x4'
} catch {
    Write-Error $_
    exit 1
} finally {
    if ($document -ne $null) { $document.Close([ref]$false) | Out-Null }
    if ($word -ne $null) { $word.Quit() | Out-Null }
    if ($document -ne $null) { [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($document) }
    if ($word -ne $null) { [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
}
