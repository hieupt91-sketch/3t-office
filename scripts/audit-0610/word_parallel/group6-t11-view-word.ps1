param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$doc = $word.Documents.Add()
try {
  $view = $word.ActiveWindow.View
  $before = [ordered]@{
    SpellCheck = [bool]$word.Options.CheckSpellingAsYouType
    ViewType = [int]$view.Type
    ReadingLayout = [bool]$view.ReadingLayout
    Zoom = [int]$view.Zoom.Percentage
    Rulers = [bool]$word.ActiveWindow.DisplayRulers
    VerticalRuler = [bool]$word.ActiveWindow.DisplayVerticalRuler
    Gridlines = [bool]$word.Options.DisplayGridLines
    NavigationPane = [bool]$word.CommandBars.Item('Navigation').Visible
  }

  $word.Options.CheckSpellingAsYouType = $false
  $spellOff = -not [bool]$word.Options.CheckSpellingAsYouType
  $word.Options.CheckSpellingAsYouType = $true

  $view.Type = 7 # wdReadingView
  $readMode = [bool]$view.ReadingLayout -or ([int]$view.Type -eq 7)
  $view.Type = 6 # wdWebView
  $webLayout = [int]$view.Type -eq 6
  $view.Type = 3 # wdPrintView
  $printLayout = [int]$view.Type -eq 3

  $word.CommandBars.Item('Navigation').Visible = $true
  $navigationPane = [bool]$word.CommandBars.Item('Navigation').Visible
  $word.ActiveWindow.DisplayRulers = $false
  $rulersHidden = -not [bool]$word.ActiveWindow.DisplayRulers
  $word.ActiveWindow.DisplayVerticalRuler = $false
  $verticalRulerHidden = -not [bool]$word.ActiveWindow.DisplayVerticalRuler
  $word.ActiveWindow.DisplayRulers = $true
  $word.ActiveWindow.DisplayVerticalRuler = $true

  $word.Options.DisplayGridLines = $true
  $gridlines = [bool]$word.Options.DisplayGridLines
  $word.Options.DisplayGridLines = $false

  $view.Zoom.Percentage = 110
  $zoomIn = [int]$view.Zoom.Percentage
  $view.Zoom.Percentage = 100
  $zoomOut = [int]$view.Zoom.Percentage
  $view.Zoom.Percentage = 100
  $zoom100 = [int]$view.Zoom.Percentage

  $result = [ordered]@{
    Before = $before
    SpellOff = $spellOff
    ReadMode = $readMode
    WebLayout = $webLayout
    PrintLayout = $printLayout
    NavigationPane = $navigationPane
    RulersHidden = $rulersHidden
    VerticalRulerHidden = $verticalRulerHidden
    Gridlines = $gridlines
    ZoomIn = $zoomIn
    ZoomOut = $zoomOut
    Zoom100 = $zoom100
  }
  $result | ConvertTo-Json -Depth 5 | Write-Output
  [System.IO.File]::WriteAllText((Join-Path $Dir 't11_group6_view_word.json'), ($result | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding($false)))
} finally {
  $doc.Close(0)
  $word.Quit()
  [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
}
