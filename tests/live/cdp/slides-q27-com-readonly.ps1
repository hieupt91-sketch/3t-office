param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'

function Read-ShapeInfo($shape) {
    $item = [ordered]@{ name = $shape.Name; type = $shape.Type; hasChart = $false; hasTable = $false; isConnector = $false; beginConnected = $false; endConnected = $false; groupItems = 0; children = @() }
    try {
        if ($shape.HasChart -eq -1) {
            $item.hasChart = $true
            $item.chartHasTitle = [bool]$shape.Chart.HasTitle
            $item.chartHasLegend = [bool]$shape.Chart.HasLegend
            $item.seriesCount = [int]$shape.Chart.SeriesCollection().Count
            if ($item.seriesCount -gt 0) { $item.firstSeriesHasDataLabels = [bool]$shape.Chart.SeriesCollection().Item(1).HasDataLabels }
        }
    } catch {}
    try {
        if ($shape.HasTable -eq -1) {
            $item.hasTable = $true
            $item.rows = [int]$shape.Table.Rows.Count
            $item.columns = [int]$shape.Table.Columns.Count
        }
    } catch {}
    try {
        if ($shape.Type -eq 9) {
            $item.isConnector = $true
            $item.beginConnected = [bool]$shape.ConnectorFormat.BeginConnected
            $item.endConnected = [bool]$shape.ConnectorFormat.EndConnected
            if ($item.beginConnected) { $item.beginName = $shape.ConnectorFormat.BeginConnectedShape.Name }
            if ($item.endConnected) { $item.endName = $shape.ConnectorFormat.EndConnectedShape.Name }
        }
    } catch {}
    try {
        if ($shape.Type -eq 6) {
            $item.groupItems = [int]$shape.GroupItems.Count
            $item.children = @($shape.GroupItems | ForEach-Object { Read-ShapeInfo $_ })
        }
    } catch {}
    [pscustomobject]$item
}

$app = New-Object -ComObject PowerPoint.Application
$presentation = $null
try {
    $presentation = $app.Presentations.Open($Path, -1, 0, 0)
    $slides = @($presentation.Slides | ForEach-Object {
        $slide = $_
        $shapes = @($slide.Shapes | ForEach-Object { Read-ShapeInfo $_ })
        $note = ''
        try { $note = [string]$slide.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text } catch {}
        $animationCount = 0
        try { $animationCount = [int]$slide.TimeLine.MainSequence.Count } catch {}
        [pscustomobject]@{
            index = [int]$slide.SlideIndex
            layout = [string]$slide.CustomLayout.Name
            hidden = [bool]($slide.SlideShowTransition.Hidden -eq -1)
            shapeCount = [int]$slide.Shapes.Count
            shapes = $shapes
            notes = $note.Trim()
            animationCount = $animationCount
            transition = [int]$slide.SlideShowTransition.EntryEffect
        }
    })
    $headers = @{}
    try {
        $hf = $presentation.SlideMaster.HeadersFooters
        $headers = @{
            slideNumber = [bool]($hf.SlideNumber.Visible -eq -1)
            dateTime = [bool]($hf.DateAndTime.Visible -eq -1)
            footer = [bool]($hf.Footer.Visible -eq -1)
            footerText = [string]$hf.Footer.Text
        }
    } catch { $headers = @{ error = $_.Exception.Message } }
    $sections = @()
    try {
        for ($i = 1; $i -le $presentation.SectionProperties.Count; $i++) {
            $sections += [pscustomobject]@{ index = $i; name = $presentation.SectionProperties.Name($i); slideCount = $presentation.SectionProperties.SlidesCount($i) }
        }
    } catch { $sections = @(@{ error = $_.Exception.Message }) }
    [pscustomobject]@{
        path = $Path
        readOnly = [bool]$presentation.ReadOnly
        slideCount = [int]$presentation.Slides.Count
        slideWidth = [double]$presentation.PageSetup.SlideWidth
        slideHeight = [double]$presentation.PageSetup.SlideHeight
        headersFooters = $headers
        sections = $sections
        slides = $slides
    } | ConvertTo-Json -Depth 10 -Compress
} finally {
    if ($presentation) { $presentation.Close() }
    $app.Quit()
}
