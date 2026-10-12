$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.Office.Interop.PowerPoint
$enumType = [Microsoft.Office.Interop.PowerPoint.PpEntryEffect]
$names = [Enum]::GetNames($enumType) | Where-Object { $_ -match '^ppEffectZoom' -or $_ -in @('ppEffectBoxOut', 'ppEffectBoxIn') }
$app = New-Object -ComObject PowerPoint.Application
$presentation = $null
$results = @()
try {
    $presentation = $app.Presentations.Add(-1)
    $slide = $presentation.Slides.Add(1, 12)
    foreach ($name in $names) {
        $value = [int][Enum]::Parse($enumType, $name)
        $entry = [ordered]@{ name = $name; value = $value; accepted = $false; readback = $null; error = $null }
        try {
            $slide.SlideShowTransition.EntryEffect = $value
            $entry.accepted = $true
            $entry.readback = [int]$slide.SlideShowTransition.EntryEffect
        } catch {
            $entry.error = $_.Exception.Message
        }
        $results += [pscustomobject]$entry
    }
    [pscustomobject]@{
        officeVersion = [string]$app.Version
        property = 'Slide.SlideShowTransition.EntryEffect'
        candidates = $results
    } | ConvertTo-Json -Depth 5
} finally {
    if ($presentation) { $presentation.Close() }
    if ($app) { $app.Quit() }
}
