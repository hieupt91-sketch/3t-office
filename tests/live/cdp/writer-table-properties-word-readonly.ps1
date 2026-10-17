param([Parameter(Mandatory=$true)][string]$Path)
$word = New-Object -ComObject Word.Application
$doc = $null
try {
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $doc = $word.Documents.Open($Path, $false, $true)
    $table = $doc.Tables.Item(1)
    $cell = $table.Cell(1, 1)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
    try {
        $entry = $archive.GetEntry('word/document.xml')
        $reader = New-Object System.IO.StreamReader($entry.Open())
        try { $documentXml = $reader.ReadToEnd() } finally { $reader.Dispose() }
    } finally { $archive.Dispose() }
    $tableWidth = [regex]::Match($documentXml, '<w:tblW\b[^>]*>')
    $widthValue = [regex]::Match($tableWidth.Value, '\bw:w="(\d+)"').Groups[1].Value
    $widthType = [regex]::Match($tableWidth.Value, '\bw:type="(\w+)"').Groups[1].Value
    [pscustomobject]@{
        tables = [int]$doc.Tables.Count
        rowsByTable = @($doc.Tables | ForEach-Object { [int]$_.Rows.Count })
        rows = [int]$table.Rows.Count
        alignment = [int]$table.Rows.Alignment
        orientation = [int]$cell.Range.Orientation
        verticalAlignment = [int]$cell.VerticalAlignment
        topPadding = [double]$table.TopPadding
        bottomPadding = [double]$table.BottomPadding
        leftPadding = [double]$table.LeftPadding
        rightPadding = [double]$table.RightPadding
        leftIndent = [double]$table.Rows.LeftIndent
        preferredWidth = [double]$table.PreferredWidth
        preferredWidthType = [int]$table.PreferredWidthType
        ooxmlPreferredWidth = [int]$widthValue
        ooxmlPreferredWidthType = $widthType
        firstColumnWidth = [double]$table.Columns.Item(1).Width
        rowHeight = [double]$table.Rows.Item(1).Height
        rowHeightRule = [int]$table.Rows.Item(1).HeightRule
    } | ConvertTo-Json -Compress
} finally {
    if ($doc) { $doc.Close(0) }
    $word.Quit()
}
