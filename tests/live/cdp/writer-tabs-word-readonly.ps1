param([ValidateSet('Read','Create')][string]$Mode='Read', [Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
$word = $null
$doc = $null
try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  if ($Mode -eq 'Create') {
    $doc = $word.Documents.Add()
    $doc.Content.Text = "Tab giua`tTab phai`tKet thuc`r"
    $p = $doc.Paragraphs.Item(1)
    $p.TabStops.ClearAll()
    [void]$p.TabStops.Add((7 * 72 / 2.54), 1, 0)
    [void]$p.TabStops.Add((14 * 72 / 2.54), 2, 1)
    $doc.SaveAs2($Path, 16)
    $saveChanges = 0
    $doc.Close([ref]$saveChanges)
    $doc = $null
    [pscustomobject]@{ Path = $Path; Created = $true } | ConvertTo-Json -Compress
    return
  }
  $doc = $word.Documents.Open((Resolve-Path -LiteralPath $Path).Path, $false, $true)
  $paragraphs = @()
  for ($i = 1; $i -le $doc.Paragraphs.Count; $i++) {
    $p = $doc.Paragraphs.Item($i)
    $tabs = @()
    for ($j = 1; $j -le $p.TabStops.Count; $j++) {
      $stop = $p.TabStops.Item($j)
      $tabs += [pscustomobject]@{
        PositionPt = [double]$stop.Position
        Alignment = [int]$stop.Alignment
        Leader = [int]$stop.Leader
      }
    }
    if ($tabs.Count -gt 0) {
      $paragraphs += [pscustomobject]@{ Index = $i; Text = $p.Range.Text.Trim(); Tabs = $tabs }
    }
  }
  [pscustomobject]@{ Paragraphs = $paragraphs } | ConvertTo-Json -Depth 5 -Compress
} finally {
  if ($doc) { $saveChanges = 0; $doc.Close([ref]$saveChanges) | Out-Null }
  if ($word) { $word.Quit() }
}
