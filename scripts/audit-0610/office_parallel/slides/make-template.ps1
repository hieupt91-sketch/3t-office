param([string]$Dir = $env:VNO_CDP_LOCALAPPDATA)
$ErrorActionPreference = 'Stop'
if (-not $Dir) { throw 'Set VNO_CDP_LOCALAPPDATA or pass -Dir.' }
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
$out = Join-Path $Dir 'template.pptx'
$existing = @(Get-CimInstance Win32_Process -Filter "Name='POWERPNT.EXE'" | ForEach-Object { [int]$_.ProcessId })
$pp = $null; $pres = $null; $ownPid = 0
function Invoke-ComRetry([scriptblock]$Action, [string]$Step) {
  for ($attempt = 1; $attempt -le 30; $attempt++) {
    try { return (& $Action) }
    catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -eq 30) { throw "PowerPoint COM failed at $Step (attempt $attempt): $($_.Exception.Message)" }
      Start-Sleep -Milliseconds 300
    }
  }
}
try {
  $pp = New-Object -ComObject PowerPoint.Application
  $new = @(Get-CimInstance Win32_Process -Filter "Name='POWERPNT.EXE'" | Where-Object { [int]$_.ProcessId -notin $existing } | ForEach-Object { [int]$_.ProcessId })
  if ($new.Count -ne 1) { throw "Expected one new PowerPoint PID, found $($new -join ',')." }
  $ownPid = [int]$new[0]
  "PowerPoint COM PID: $ownPid"
  try { $pp.DisplayAlerts = 1 } catch {}
  $pres = Invoke-ComRetry { $pp.Presentations.Add(-1) } 'create presentation'
  $slide = Invoke-ComRetry { $pres.Slides.Add(1, 12) } 'add slide'
  $tb = Invoke-ComRetry { $slide.Shapes.AddTextbox(1, 70, 70, 430, 130) } 'add textbox'
  Invoke-ComRetry { $tb.TextFrame.TextRange.Text = 'FIX-L4 audit sample text' } 'insert text' | Out-Null
  Invoke-ComRetry { $tb.TextFrame.TextRange.Font.Name = 'Arial' } 'set textbox font' | Out-Null
  Invoke-ComRetry { $tb.TextFrame.TextRange.Font.Size = 24 } 'set textbox size' | Out-Null
  Invoke-ComRetry { $pres.SaveAs($out, 24) } 'save template' | Out-Null
  "Template: $out"
} finally {
  if ($pres) { try { $pres.Close() } catch {} }
  if ($pp) { try { $pp.Quit() } catch {}; [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($pp) }
  if ($ownPid) {
    $proc = Get-Process -Id $ownPid -ErrorAction SilentlyContinue
    if ($proc) { $proc | Wait-Process -Timeout 5 -ErrorAction SilentlyContinue }
    if (Get-Process -Id $ownPid -ErrorAction SilentlyContinue) { Stop-Process -Id $ownPid -Force -ErrorAction SilentlyContinue }
  }
}
