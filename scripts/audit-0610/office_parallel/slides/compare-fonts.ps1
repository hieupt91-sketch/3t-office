param(
  [string]$Source = $env:VNO_FIX_L4_FONT_SOURCE,
  [string]$Dir = $env:VNO_CDP_LOCALAPPDATA
)
$ErrorActionPreference = 'Stop'
if (-not $Source) {
  $candidate = Get-ChildItem -LiteralPath 'E:\VN OFice\file test\lan' -Filter '*2021.pptx' | Select-Object -First 1
  if (-not $candidate) { throw 'Set VNO_FIX_L4_FONT_SOURCE to the business sample PPTX.' }
  $Source = $candidate.FullName
}
if (-not $Dir) { throw 'Set VNO_CDP_LOCALAPPDATA or pass -Dir.' }
$roundtrip = Join-Path $Dir 'fix-l4-font\business-roundtrip.pptx'
if (-not (Test-Path -LiteralPath $Source)) { throw "Missing source presentation: $Source" }
if (-not (Test-Path -LiteralPath $roundtrip)) { throw "Missing app roundtrip: $roundtrip" }
$existing = @(Get-CimInstance Win32_Process -Filter "Name='POWERPNT.EXE'" | ForEach-Object { [int]$_.ProcessId })
$pp = $null; $pres = $null; $ownPid = 0
function Get-FontReport([object]$Presentation) {
  $fonts = [System.Collections.Generic.List[string]]::new()
  $bySlide = [System.Collections.Generic.List[object]]::new()
  $byShape = [System.Collections.Generic.List[object]]::new()
  for ($slideIndex = 1; $slideIndex -le $Presentation.Slides.Count; $slideIndex++) {
    $slide = $Presentation.Slides.Item($slideIndex)
    $slideFonts = [System.Collections.Generic.List[string]]::new()
    for ($shapeIndex = 1; $shapeIndex -le $slide.Shapes.Count; $shapeIndex++) {
      $shape = $slide.Shapes.Item($shapeIndex)
      $shapeFonts = [System.Collections.Generic.List[string]]::new()
      try {
        if (-not $shape.TextFrame.HasText) { continue }
        $textRange = $shape.TextFrame.TextRange
        $runs = $textRange.Runs(1, $textRange.Length)
        for ($runIndex = 1; $runIndex -le $runs.Count; $runIndex++) {
          $run = $runs.Item($runIndex)
          $runText = [string]$run.Text
          if ($runText.Length -gt 0 -and $runText -match '^[ \t\r\n]+$') { continue }
          $name = [string]$run.Font.Name
          if ($name -and $name -notin @('0', 'Mixed')) { $fonts.Add($name); $slideFonts.Add($name); $shapeFonts.Add($name) }
        }
      } catch {
        $name = [string]$shape.TextFrame.TextRange.Font.Name
        if ($name -and $name -notin @('0', 'Mixed')) { $fonts.Add($name); $slideFonts.Add($name); $shapeFonts.Add($name) }
        elseif ($shape.TextFrame.HasText) {
          $textRange = $shape.TextFrame.TextRange
          for ($charIndex = 1; $charIndex -le $textRange.Length; $charIndex++) {
            $character = [string]$textRange.Characters($charIndex, 1).Text
            if ($character.Length -gt 0 -and [int][char]$character[0] -in @(10, 13)) { continue }
            if ($character -eq ' ' -and $charIndex -lt $textRange.Length) {
              $nextCharacter = [string]$textRange.Characters($charIndex + 1, 1).Text
              if ($nextCharacter.Length -gt 0 -and [int][char]$nextCharacter[0] -in @(10, 13)) { continue }
            }
            $charFont = [string]$textRange.Characters($charIndex, 1).Font.Name
            if ($charFont -and $charFont -notin @('0', 'Mixed')) { $fonts.Add($charFont); $slideFonts.Add($charFont); $shapeFonts.Add($charFont) }
          }
        }
      }
      if ($shape.TextFrame.HasText) {
        $sampleText = [string]$shape.TextFrame.TextRange.Text
        $byShape.Add([pscustomobject]@{ slide=$slideIndex; index=$shapeIndex; name=[string]$shape.Name; text=$sampleText.Substring(0, [Math]::Min(80, $sampleText.Length)); fonts=@($shapeFonts | Sort-Object -Unique) })
      }
    }
    $bySlide.Add([pscustomobject]@{ index=$slideIndex; fonts=@($slideFonts | Sort-Object -Unique) })
  }
  return [pscustomobject]@{ fonts=@($fonts | Sort-Object -Unique); slides=@($bySlide); shapes=@($byShape) }
}
try {
  $pp = New-Object -ComObject PowerPoint.Application
  $new = @(Get-CimInstance Win32_Process -Filter "Name='POWERPNT.EXE'" | Where-Object { [int]$_.ProcessId -notin $existing } | ForEach-Object { [int]$_.ProcessId })
  if ($new.Count -ne 1) { throw "Expected one new PowerPoint PID, found $($new -join ',')." }
  $ownPid = [int]$new[0]
  "PowerPoint COM PID: $ownPid"
  try { $pp.DisplayAlerts = 1 } catch {}
  $pres = $pp.Presentations.Open($Source, $true, $false, $false)
  $sourceReport = Get-FontReport $pres
  $pres.Close(); $pres = $null
  $pres = $pp.Presentations.Open($roundtrip, $true, $false, $false)
  $roundtripReport = Get-FontReport $pres
  $sourceFonts = @($sourceReport.fonts)
  $roundtripFonts = @($roundtripReport.fonts)
  $same = (@($sourceFonts) -join "`n") -ceq (@($roundtripFonts) -join "`n")
  [pscustomobject]@{ source=$Source; appRoundtrip=$roundtrip; sourceFonts=$sourceFonts; appFonts=$roundtripFonts; sameFonts=$same; sourceBySlide=$sourceReport.slides; appBySlide=$roundtripReport.slides; sourceShapes=$sourceReport.shapes; appShapes=$roundtripReport.shapes } |
    ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Dir 'font-compare.json') -Encoding UTF8
  [pscustomobject]@{ SourceFonts=($sourceFonts -join ', '); AppFonts=($roundtripFonts -join ', '); Same=$same } | Format-List
  if (-not $same) { throw 'PowerPoint font-family set changed after the VN Office roundtrip.' }
} finally {
  if ($pres) { try { $pres.Close() } catch {} }
  if ($pp) { try { $pp.Quit() } catch {}; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($pp) }
  if ($ownPid) {
    $proc = Get-Process -Id $ownPid -ErrorAction SilentlyContinue
    if ($proc) { $proc | Wait-Process -Timeout 5 -ErrorAction SilentlyContinue }
    if (Get-Process -Id $ownPid -ErrorAction SilentlyContinue) { Stop-Process -Id $ownPid -Force -ErrorAction SilentlyContinue }
  }
}
