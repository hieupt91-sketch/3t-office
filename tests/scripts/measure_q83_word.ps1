param(
    [string]$FixturesDir = "$PSScriptRoot\..\fixtures\q83-numbering",
    [string]$OutputFile = "$PSScriptRoot\..\fixtures\q83-numbering\word_oracle_results.json"
)

$ErrorActionPreference = 'Stop'
$word = $null
$results = @{}

try {
    Write-Host "Starting Word 2016 COM (Visible=False)..."
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    $docxFiles = Get-ChildItem -Path $FixturesDir -Filter "*.docx" | Sort-Object Name
    Write-Host "Found $($docxFiles.Count) DOCX files to measure."

    foreach ($file in $docxFiles) {
        Write-Host "Opening $($file.Name)..."
        $doc = $word.Documents.Open($file.FullName, $false, $true)
        $paraList = @()

        try {
            $count = $doc.Paragraphs.Count
            for ($i = 1; $i -le $count; $i++) {
                $p = $doc.Paragraphs.Item($i)
                $rawText = $p.Range.Text
                $cleanText = if ($rawText) { $rawText.Trim("`r", "`n") } else { "" }
                $listString = $p.Range.ListFormat.ListString
                $listValue = $p.Range.ListFormat.ListValue

                $paraList += [pscustomobject]@{
                    Index = $i
                    Text = $cleanText
                    ListString = $listString
                    ListValue = $listValue
                }
            }
        } finally {
            $saveChanges = 0
            $doc.Close([ref]$saveChanges)
            $doc = $null
        }

        $results[$file.Name] = $paraList
    }

    $json = $results | ConvertTo-Json -Depth 5
    if ($OutputFile) {
        $json | Set-Content -LiteralPath $OutputFile -Encoding UTF8
        Write-Host "Results saved to: $OutputFile"
    }

    # Print markdown table
    Write-Host "`n=== WORD 2016 ORACLE MEASUREMENT TABLE ==="
    foreach ($fileName in ($results.Keys | Sort-Object)) {
        Write-Host "`nFile: $fileName"
        Write-Host "| Index | ListString | ListValue | Paragraph Text |"
        Write-Host "|-------|------------|-----------|----------------|"
        foreach ($p in $results[$fileName]) {
            Write-Host "| $($p.Index) | '$($p.ListString)' | $($p.ListValue) | $($p.Text) |"
        }
    }
} finally {
    if ($word) {
        Write-Host "`nQuitting Word COM..."
        $word.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
        $word = $null
        Write-Host "Word COM closed cleanly."
    }
}
