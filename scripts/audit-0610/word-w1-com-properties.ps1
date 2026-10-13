param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

$ErrorActionPreference = "Stop"
$resolved = (Resolve-Path -LiteralPath $Path).Path
$word = $null
$document = $null
$properties = $null
function Get-BuiltInDocumentPropertyValue {
    param(
        [Parameter(Mandatory = $true)]$Properties,
        [Parameter(Mandatory = $true)][string]$Name
    )
    $item = $null
    try {
        $flags = [Reflection.BindingFlags]::GetProperty
        $item = [System.__ComObject].InvokeMember("Item", $flags, $null, $Properties, @($Name))
        return [System.__ComObject].InvokeMember("Value", $flags, $null, $item, $null)
    } finally {
        if ($item -ne $null -and [Runtime.InteropServices.Marshal]::IsComObject($item)) {
            [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($item)
        }
    }
}
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($resolved, $false, $true)
    $properties = $document.BuiltInDocumentProperties
    $result = [ordered]@{
        ReadOnly = [bool]$document.ReadOnly
        Title = [string](Get-BuiltInDocumentPropertyValue $properties "Title")
        Author = [string](Get-BuiltInDocumentPropertyValue $properties "Author")
        Subject = [string](Get-BuiltInDocumentPropertyValue $properties "Subject")
        Keywords = [string](Get-BuiltInDocumentPropertyValue $properties "Keywords")
        Comments = [string](Get-BuiltInDocumentPropertyValue $properties "Comments")
        Pages = [int]$document.ComputeStatistics(2)
    }
    $result | ConvertTo-Json -Compress
} finally {
    if ($properties -ne $null -and [Runtime.InteropServices.Marshal]::IsComObject($properties)) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($properties)
    }
    if ($document -ne $null) {
        $document.Close($false)
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($document)
    }
    if ($word -ne $null) {
        $word.Quit()
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
