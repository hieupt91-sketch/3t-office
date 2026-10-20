param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$document = $null
try {
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($Path, $false, $true)
    $sections = @($document.Sections | ForEach-Object {
        $setup = $_.PageSetup
        [pscustomobject]@{
            orientation = $setup.Orientation
            pageWidthPoints = [math]::Round($setup.PageWidth, 2)
            pageHeightPoints = [math]::Round($setup.PageHeight, 2)
            marginsMm = [pscustomobject]@{
                top = [math]::Round($setup.TopMargin * 25.4 / 72, 2)
                right = [math]::Round($setup.RightMargin * 25.4 / 72, 2)
                bottom = [math]::Round($setup.BottomMargin * 25.4 / 72, 2)
                left = [math]::Round($setup.LeftMargin * 25.4 / 72, 2)
            }
            differentFirstPage = $setup.DifferentFirstPageHeaderFooter
        }
    })
    $tables = @($document.Tables | ForEach-Object {
        [pscustomobject]@{
            rows = $_.Rows.Count
            columns = $_.Columns.Count
            firstRowRepeats = ($_.Rows.Item(1).HeadingFormat -eq -1)
            mergedCellCount = @($_.Range.Cells | Where-Object { $_.ColumnSpan -gt 1 -or $_.RowSpan -gt 1 }).Count
        }
    })
    $first = $document.Paragraphs.Item(1).Range.Font
    $section = $document.Sections.Item(1)
    [pscustomobject]@{
        path = $Path
        pages = $document.ComputeStatistics(2)
        paragraphCount = $document.Paragraphs.Count
        firstParagraphFont = $first.Name
        firstParagraphSize = $first.Size
        firstParagraphBold = $first.Bold
        sections = $sections
        differentOddEvenPages = [bool]$document.PageSetup.OddAndEvenPagesHeaderFooter
        evenHeaderExists = [bool]$section.Headers.Item(3).Exists
        evenHeaderText = $section.Headers.Item(3).Range.Text.Trim()
        tables = $tables
        readOnly = $document.ReadOnly
    } | ConvertTo-Json -Depth 8 -Compress
} finally {
    if ($document) { $document.Close(0) }
    $word.Quit()
}
