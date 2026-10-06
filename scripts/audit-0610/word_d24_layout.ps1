# Read-only Word COM probe for D25b. Emits paragraph/table/shape positions as JSON.
# Run beside word_dialog_dismisser.ps1; no SendKeys and no process-name termination.
param(
    [Parameter(Mandatory = $true)][string]$File,
    [Parameter(Mandatory = $true)][string]$Out
)

$ErrorActionPreference = "Stop"

function Invoke-WordRetry([scriptblock]$Block, [int]$Attempts = 30) {
    for ($i = 0; $i -lt $Attempts; $i++) {
        try { return (& $Block) } catch {
            if ($_.Exception.Message -notmatch "rejected|busy|RPC|0x8001010A|0x80010001") { throw }
            Start-Sleep -Milliseconds 700
        }
    }
    throw "Word van tu choi sau $Attempts lan thu"
}

function Get-RangePoint($Range, [bool]$AtEnd = $false) {
    $point = $Range.Duplicate
    if ($AtEnd) {
        $pos = [Math]::Max($point.Start, $point.End - 1)
        $point.SetRange($pos, $pos)
    } else {
        $point.SetRange($point.Start, $point.Start)
    }
    [pscustomobject]@{
        page = [int](Invoke-WordRetry { $point.Information(3) })
        yPt = [Math]::Round([double](Invoke-WordRetry { $point.Information(6) }), 2)
    }
}

function Get-ShortText($Range, [int]$Limit = 140) {
    $text = [string]$Range.Text
    $text = ($text -replace "[`r`n`a`t]+", " " -replace "\s+", " ").Trim()
    if ($text.Length -gt $Limit) { return $text.Substring(0, $Limit) }
    return $text
}

$word = $null
$doc = $null
try {
    $word = New-Object -ComObject Word.Application
    Start-Sleep -Seconds 3
    Invoke-WordRetry { $word.Visible = $false } | Out-Null
    Invoke-WordRetry { $word.DisplayAlerts = 0 } | Out-Null
    $doc = Invoke-WordRetry { $word.Documents.Open($File, $false, $true, $false) }
    try { $word.ActiveWindow.View.Type = 3 } catch { }
    Invoke-WordRetry { $doc.Repaginate() } | Out-Null

    $paragraphs = New-Object System.Collections.Generic.List[object]
    $index = 0
    foreach ($paragraph in $doc.Paragraphs) {
        $index++
        $range = $paragraph.Range
        $start = Get-RangePoint $range
        $end = Get-RangePoint $range $true
        $paragraphs.Add([pscustomobject]@{
            index = $index
            rangeStart = [int]$range.Start
            rangeEnd = [int]$range.End
            pageStart = $start.page
            pageEnd = $end.page
            yStartPt = $start.yPt
            yEndPt = $end.yPt
            lines = [int](Invoke-WordRetry { $range.ComputeStatistics(1) })
            inTable = [bool](Invoke-WordRetry { $range.Information(12) })
            style = [string]$paragraph.Style.NameLocal
            spaceBeforePt = [Math]::Round([double]$paragraph.SpaceBefore, 2)
            spaceAfterPt = [Math]::Round([double]$paragraph.SpaceAfter, 2)
            lineSpacingRule = [int]$paragraph.LineSpacingRule
            lineSpacingPt = [Math]::Round([double]$paragraph.LineSpacing, 2)
            keepWithNext = [bool]$paragraph.KeepWithNext
            keepTogether = [bool]$paragraph.KeepTogether
            widowControl = [bool]$paragraph.WidowControl
            pageBreakBefore = [bool]$paragraph.PageBreakBefore
            text = Get-ShortText $range
        })
    }

    $tables = New-Object System.Collections.Generic.List[object]
    $index = 0
    foreach ($table in $doc.Tables) {
        $index++
        $range = $table.Range
        $start = Get-RangePoint $range
        $end = Get-RangePoint $range $true
        $rowInfo = New-Object System.Collections.Generic.List[object]
        $rowIndex = 0
        foreach ($row in $table.Rows) {
            $rowIndex++
            $rowRange = $row.Range
            $rowStart = Get-RangePoint $rowRange
            $rowEnd = Get-RangePoint $rowRange $true
            $rowInfo.Add([pscustomobject]@{
                index = $rowIndex
                pageStart = $rowStart.page
                pageEnd = $rowEnd.page
                yStartPt = $rowStart.yPt
                yEndPt = $rowEnd.yPt
                heightPt = [Math]::Round([double]$row.Height, 2)
                heightRule = [int]$row.HeightRule
                allowBreakAcrossPages = [bool]$row.AllowBreakAcrossPages
                text = Get-ShortText $rowRange 80
            })
        }
        $tables.Add([pscustomobject]@{
            index = $index
            rangeStart = [int]$range.Start
            rangeEnd = [int]$range.End
            pageStart = $start.page
            pageEnd = $end.page
            yStartPt = $start.yPt
            yEndPt = $end.yPt
            rows = [int]$table.Rows.Count
            columns = [int]$table.Columns.Count
            rowInfo = $rowInfo
            text = Get-ShortText $range
        })
    }

    $shapes = New-Object System.Collections.Generic.List[object]
    $index = 0
    foreach ($shape in $doc.Shapes) {
        $index++
        $anchor = $shape.Anchor
        $point = Get-RangePoint $anchor
        $shapes.Add([pscustomobject]@{
            index = $index
            name = [string]$shape.Name
            type = [int]$shape.Type
            anchorStart = [int]$anchor.Start
            anchorPage = $point.page
            anchorYPt = $point.yPt
            relativeVerticalPosition = [int]$shape.RelativeVerticalPosition
            topPt = [Math]::Round([double]$shape.Top, 2)
            heightPt = [Math]::Round([double]$shape.Height, 2)
            widthPt = [Math]::Round([double]$shape.Width, 2)
            wrapType = [int]$shape.WrapFormat.Type
            layoutInCell = [bool]$shape.LayoutInCell
            anchorText = Get-ShortText $anchor 80
        })
    }

    $inlineShapes = New-Object System.Collections.Generic.List[object]
    $index = 0
    foreach ($shape in $doc.InlineShapes) {
        $index++
        $range = $shape.Range
        $point = Get-RangePoint $range
        $inlineShapes.Add([pscustomobject]@{
            index = $index
            type = [int]$shape.Type
            rangeStart = [int]$range.Start
            page = $point.page
            yPt = $point.yPt
            heightPt = [Math]::Round([double]$shape.Height, 2)
            widthPt = [Math]::Round([double]$shape.Width, 2)
        })
    }

    $sections = New-Object System.Collections.Generic.List[object]
    $index = 0
    foreach ($section in $doc.Sections) {
        $index++
        $range = $section.Range
        $start = Get-RangePoint $range
        $end = Get-RangePoint $range $true
        $setup = $section.PageSetup
        $sections.Add([pscustomobject]@{
            index = $index
            rangeStart = [int]$range.Start
            rangeEnd = [int]$range.End
            pageStart = $start.page
            pageEnd = $end.page
            sectionStart = [int]$setup.SectionStart
            pageHeightPt = [Math]::Round([double]$setup.PageHeight, 2)
            pageWidthPt = [Math]::Round([double]$setup.PageWidth, 2)
            topMarginPt = [Math]::Round([double]$setup.TopMargin, 2)
            bottomMarginPt = [Math]::Round([double]$setup.BottomMargin, 2)
            headerDistancePt = [Math]::Round([double]$setup.HeaderDistance, 2)
            footerDistancePt = [Math]::Round([double]$setup.FooterDistance, 2)
        })
    }

    $result = [ordered]@{
        source = (Resolve-Path -LiteralPath $File).Path
        measuredAt = (Get-Date).ToString("o")
        viewType = $(try { [int]$word.ActiveWindow.View.Type } catch { $null })
        pages = [int](Invoke-WordRetry { $doc.Content.Information(4) })
        words = [int](Invoke-WordRetry { $doc.ComputeStatistics(0) })
        paragraphs = $paragraphs
        tables = $tables
        shapes = $shapes
        inlineShapes = $inlineShapes
        sections = $sections
    }
    $parent = Split-Path -Parent $Out
    if ($parent) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
    [System.IO.File]::WriteAllText($Out, ($result | ConvertTo-Json -Depth 12), (New-Object System.Text.UTF8Encoding($false)))
    "OK pages={0} paragraphs={1} tables={2} shapes={3} inline={4} out={5}" -f $result.pages, $paragraphs.Count, $tables.Count, $shapes.Count, $inlineShapes.Count, $Out
    try { $doc.Saved = $true } catch { }
} catch {
    Write-Error $_
} finally {
    if ($word) { try { Invoke-WordRetry { $word.Quit(0) } 10 | Out-Null } catch { } }
}
