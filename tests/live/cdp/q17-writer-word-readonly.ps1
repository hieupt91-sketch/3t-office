param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$document = $null
try {
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($Path, $false, $true)
    $headingCount = @($document.Paragraphs | Where-Object { $_.Style.NameLocal -match '^Heading' }).Count
    $tableRows = 0
    $tableColumns = 0
    $tableHeaderRepeat = $false
    if ($document.Tables.Count -gt 0) {
        $table = $document.Tables.Item(1)
        $tableRows = $table.Rows.Count
        $tableColumns = $table.Columns.Count
        $tableHeaderRepeat = ($table.Rows.Item(1).HeadingFormat -eq -1)
    }
    [pscustomobject]@{
        pages = $document.ComputeStatistics(2)
        headings = $headingCount
        tablesOfContents = $document.TablesOfContents.Count
        tables = $document.Tables.Count
        tableRows = $tableRows
        tableColumns = $tableColumns
        tableHeaderRepeats = $tableHeaderRepeat
        footnotes = $document.Footnotes.Count
        endnotes = $document.Endnotes.Count
        comments = $document.Comments.Count
        readOnly = $document.ReadOnly
    } | ConvertTo-Json -Compress
} finally {
    if ($document) { $document.Close(0) }
    $word.Quit()
}
