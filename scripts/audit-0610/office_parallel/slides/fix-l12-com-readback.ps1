param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][string]$OutputPath
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.Office.Interop.PowerPoint
$app = New-Object -ComObject PowerPoint.Application
$presentation = $null
try {
    $presentation = $app.Presentations.Open((Resolve-Path -LiteralPath $Path).Path, $true, $false, $false)
    $slides = @()
    foreach ($slide in $presentation.Slides) {
        $shapes = @()
        foreach ($shape in $slide.Shapes) {
            $text = ''
            try { if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) { $text = [string]$shape.TextFrame.TextRange.Text } } catch {}
            $groupCount = $null
            try { if ([int]$shape.Type -eq 6) { $groupCount = [int]$shape.GroupItems.Count } } catch {}
            $mediaType = $null
            try { if ([int]$shape.Type -eq 16) { $mediaType = [int]$shape.MediaType } } catch {}
            $textEffectText = $null
            $textEffectPreset = $null
            try { $textEffectText = [string]$shape.TextEffect.Text } catch {}
            try { $textEffectPreset = [int]$shape.TextEffect.PresetTextEffect } catch {}
            $shapes += [pscustomobject]@{
                name = [string]$shape.Name
                type = [int]$shape.Type
                text = $text
                groupItemCount = $groupCount
                mediaType = $mediaType
                textEffectText = $textEffectText
                textEffectPreset = $textEffectPreset
            }
        }
        $headerFooter = $slide.HeadersFooters
        $entryEffect = $null
        try { $entryEffect = [int]$slide.SlideShowTransition.EntryEffect } catch {}
        $slides += [pscustomobject]@{
            index = [int]$slide.SlideIndex
            layout = [int]$slide.Layout
            transitionEntryEffect = $entryEffect
            slideNumberVisible = [int]$headerFooter.SlideNumber.Visible
            dateAndTimeVisible = [int]$headerFooter.DateAndTime.Visible
            dateAndTimeFormat = [int]$headerFooter.DateAndTime.Format
            footerVisible = [int]$headerFooter.Footer.Visible
            footerText = [string]$headerFooter.Footer.Text
            shapes = $shapes
        }
    }
    $theme = $presentation.SlideMaster.Theme
    $themeColors = @()
    for ($index = 1; $index -le 12; $index++) {
        try { $themeColors += [int]$theme.ThemeColorScheme.Colors($index).RGB } catch { $themeColors += $null }
    }
    $themeFonts = @{}
    foreach ($family in @('MajorFont', 'MinorFont')) {
        $fontNames = @()
        try {
            $fontCollection = $theme.ThemeFontScheme.$family
            for ($index = 1; $index -le $fontCollection.Count; $index++) { $fontNames += [string]$fontCollection.Item($index).Name }
        } catch {}
        $themeFonts[$family] = $fontNames
    }
    $result = [pscustomobject]@{
        officeVersion = [string]$app.Version
        path = (Resolve-Path -LiteralPath $Path).Path
        slidesCount = [int]$presentation.Slides.Count
        designName = [string]$presentation.Designs.Item(1).Name
        themeColors = $themeColors
        themeFonts = $themeFonts
        slideWidth = [double]$presentation.PageSetup.SlideWidth
        slideHeight = [double]$presentation.PageSetup.SlideHeight
        slides = $slides
    }
    $json = $result | ConvertTo-Json -Depth 8
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) $OutputPath), $json + "`n", $utf8NoBom)
} finally {
    if ($presentation) { $presentation.Close() }
    if ($app) { $app.Quit() }
}
