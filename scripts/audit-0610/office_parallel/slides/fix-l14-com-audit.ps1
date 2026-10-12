param(
    [Parameter(Mandatory = $true)][string]$SourcePath,
    [Parameter(Mandatory = $true)][string]$AuditPath,
    [Parameter(Mandatory = $true)][string]$OutputPath
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.Office.Interop.PowerPoint
$app = New-Object -ComObject PowerPoint.Application
if ([int]$app.Presentations.Count -ne 0) {
    throw 'Safety stop: PowerPoint already has an open presentation; no presentation was opened or closed.'
}
Copy-Item -LiteralPath $SourcePath -Destination $AuditPath -Force
$presentation = $null
$showWindow = $null
$extraWindow = $null
$result = [ordered]@{
    officeVersion = [string]$app.Version
    applicationHwnd = [int64]$app.HWND
    baselinePresentationCount = [int]$app.Presentations.Count
    operations = [ordered]@{}
    cleanup = [ordered]@{ ownerApplicationQuit = $false; ownPresentationClosed = $false; ownShowEnded = $false; ownExtraWindowClosed = $false }
}
try {
    $presentation = $app.Presentations.Open((Resolve-Path -LiteralPath $AuditPath).Path, $false, $false, $true)
    $window = $app.ActiveWindow
    if ([int]$app.Presentations.Count -ne 1) { throw 'Safety stop: expected only the audit presentation to be open.' }
    $result.window = [ordered]@{ presentations = [int]$app.Presentations.Count; windows = [int]$app.Windows.Count; slides = [int]$presentation.Slides.Count; viewType = [int]$window.ViewType; zoom = [int]$window.View.Zoom }

    $ops = $result.operations
    $beforeZoom = [int]$window.View.Zoom
    $window.View.Zoom = [Math]::Min(200, $beforeZoom + 10)
    $ops.zoomIn = [ordered]@{ before = $beforeZoom; after = [int]$window.View.Zoom }
    $window.View.Zoom = [Math]::Max(10, [int]$window.View.Zoom - 10)
    $ops.zoomOut = [ordered]@{ after = [int]$window.View.Zoom }
    $window.View.Zoom = 100
    $ops.zoomReset = [int]$window.View.Zoom
    try { $window.View.ZoomToFit = $true; $ops.fitToWindow = [ordered]@{ supported = $true; enabled = [bool]$window.View.ZoomToFit; zoom = [int]$window.View.Zoom }; $window.View.ZoomToFit = $false }
    catch { $ops.fitToWindow = [ordered]@{ supported = $false; error = $_.Exception.Message } }

    # PowerPoint's COM View/DocumentWindow interfaces expose no ruler/gridline/guide
    # visibility properties. Probe documented Fluent command IDs in this isolated,
    # unsaved copy; call an accepted toggle twice so the copy returns to its baseline.
    foreach ($key in @('ruler', 'gridlines', 'guides')) {
        $candidates = switch ($key) {
            'ruler' { @('ViewRuler', 'ViewShowRuler', 'ShowRuler') }
            'gridlines' { @('ViewGridlines', 'ViewShowGridlines', 'ShowGridlines') }
            'guides' { @('ViewGuides', 'ViewShowGuides', 'ShowGuides') }
        }
        $accepted = $null
        foreach ($commandId in $candidates) {
            try { $app.CommandBars.ExecuteMso($commandId); $accepted = $commandId; $app.CommandBars.ExecuteMso($commandId); break }
            catch {}
        }
        $ops[$key] = [ordered]@{ directComVisibilityProperty = $false; commandIdAccepted = $accepted; note = 'No stable COM visibility property is exposed by PowerPoint View/DocumentWindow.' }
    }

    $viewRows = @()
    foreach ($viewType in @(9, 7, 9)) {
        $window.ViewType = $viewType
        $viewRows += [ordered]@{ requested = $viewType; readback = [int]$window.ViewType }
    }
    $ops.viewType = $viewRows
    $viewEnum = [Enum]::GetNames([Microsoft.Office.Interop.PowerPoint.PpViewType])
    $ops.readingView = [ordered]@{ supportedByPpViewType = ($viewEnum -contains 'ppViewReading'); availableViewTypes = $viewEnum }

    $commentRows = @()
    try {
        $slide = $presentation.Slides.Item(1)
        $slideComments = $slide.Comments
        if ($null -eq $slideComments) { throw 'PowerPoint returned no Slide.Comments collection for an empty legacy-comments list.' }
        $first = $slideComments.Add(120, 100, 'FIX-L14 audit', 'F14', 'Audit comment Alpha')
        $second = $slideComments.Add(160, 150, 'FIX-L14 audit', 'F14', 'Audit comment Beta')
        $commentRows += [ordered]@{ step = 'insert'; count = [int]$slideComments.Count; texts = @($slideComments | ForEach-Object { [string]$_.Text }) }
        foreach ($commandId in @('ReviewNextComment', 'ReviewPreviousComment', 'ReviewResolveComment')) {
            $entry = [ordered]@{ id = $commandId; label = $null; error = $null }
            try { $entry.label = [string]$app.CommandBars.GetLabelMso($commandId) } catch { $entry.error = $_.Exception.Message }
            $commentRows += [pscustomobject]$entry
        }
        try { $commentRows += [ordered]@{ step = 'resolvedReadback'; resolved = [bool]$second.Resolved; error = $null } }
        catch { $commentRows += [ordered]@{ step = 'resolvedReadback'; resolved = $null; error = $_.Exception.Message } }
        $ops.comments = $commentRows
    } catch { $ops.comments = [ordered]@{ supported = $false; error = $_.Exception.Message } }

    $textShape = $null
    foreach ($slide in $presentation.Slides) {
        foreach ($shape in $slide.Shapes) {
            if ($shape.HasTextFrame -eq -1 -and $shape.TextFrame.HasText -eq -1) { $textShape = $shape; break }
        }
        if ($textShape) { break }
    }
    if ($textShape) {
        $paragraph = $textShape.TextFrame.TextRange.ParagraphFormat
        $beforeSpace = [double]$paragraph.SpaceWithin
        try { $paragraph.SpaceWithin = 1.5; $ops.lineSpacing = [ordered]@{ before = $beforeSpace; requested = 1.5; readback = [double]$paragraph.SpaceWithin; text = [string]$textShape.TextFrame.TextRange.Text }; $paragraph.SpaceWithin = $beforeSpace }
        catch { $ops.lineSpacing = [ordered]@{ supported = $false; error = $_.Exception.Message } }
    } else { $ops.lineSpacing = [ordered]@{ supported = $false; reason = 'No text shape in audit deck.' } }

    try { $ops.presenter = [ordered]@{ showPresenterView = [bool]$presentation.SlideShowSettings.ShowPresenterView } }
    catch { $ops.presenter = [ordered]@{ supported = $false; error = $_.Exception.Message } }
    $extraWindow = $presentation.NewWindow()
    $ops.newWindow = [ordered]@{ countAfterOpen = [int]$app.Windows.Count; returnedHwnd = [int64]$extraWindow.HWND }
    $extraWindow.Close()
    $extraWindow = $null
    $ops.newWindow.countAfterClose = [int]$app.Windows.Count

    $presentation.SlideShowSettings.AdvanceMode = 1
    $presentation.SlideShowSettings.StartingSlide = 1
    $showWindow = $presentation.SlideShowSettings.Run()
    $ops.showFromBegin = [ordered]@{ slideShowWindows = [int]$app.SlideShowWindows.Count; currentPosition = [int]$showWindow.View.CurrentShowPosition }
    $showWindow.View.Exit()
    $showWindow = $null
    $result.cleanup.ownShowEnded = $true

    $window.ViewType = 9
    $presentation.SlideShowSettings.StartingSlide = 2
    $showWindow = $presentation.SlideShowSettings.Run()
    $ops.showFromCurrent = [ordered]@{ slideShowWindows = [int]$app.SlideShowWindows.Count; requestedCurrentSlide = 2; currentPosition = [int]$showWindow.View.CurrentShowPosition }
    $showWindow.View.Exit()
    $showWindow = $null
    $result.cleanup.ownShowEnded = $true
} catch {
    $result.error = $_.Exception.Message
} finally {
    if ($showWindow) { try { $showWindow.View.Exit(); $result.cleanup.ownShowEnded = $true } catch {} }
    if ($extraWindow) { try { $extraWindow.Close(); $result.cleanup.ownExtraWindowClosed = $true } catch {} }
    if ($presentation) { $presentation.Close(); $result.cleanup.ownPresentationClosed = $true }
}
$result.cleanup.presentationsAfterClose = [int]$app.Presentations.Count
$result.cleanup.slideshowWindowsAfterClose = [int]$app.SlideShowWindows.Count
$result | ConvertTo-Json -Depth 10 | ForEach-Object {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) $OutputPath), $_ + "`n", $utf8NoBom)
    Write-Output $_
}
if ($result.error) { throw $result.error }
