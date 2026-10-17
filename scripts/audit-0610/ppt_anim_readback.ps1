param([string]$Path)
$ErrorActionPreference = "Stop"
function Retry([scriptblock]$b) { $last = $null; for ($k = 0; $k -lt 25; $k++) { try { return (& $b) } catch { $last = $_; if ($_.Exception.Message -notmatch 'rejected|busy|RPC') { break }; Start-Sleep -Milliseconds 700 } }; throw ("PowerPoint loi: " + $last.Exception.Message) }
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id)
$app = $null
for ($a = 0; $a -lt 30 -and -not $app; $a++) { try { $app = New-Object -ComObject PowerPoint.Application } catch { Start-Sleep -Milliseconds 700 } }
$mine = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
$res = @()
try {
  $pres = Retry { $app.Presentations.Open($Path, -1, 0, 0) }
  $i = 0
  foreach ($slide in $pres.Slides) {
    $i++; $j = 0
    foreach ($e in $slide.TimeLine.MainSequence) {
      $j++
      $res += [pscustomobject]@{ slide=$i; idx=$j; text=[string](Retry { $e.Shape.TextFrame.TextRange.Text }); effectType=[int](Retry { $e.EffectType }); exit=[int](Retry { $e.Exit }); duration=[double](Retry { $e.Timing.Duration }); trigger=[int](Retry { $e.Timing.TriggerType }) }
    }
  }
  Retry { $pres.Close() } | Out-Null
} finally { try { $app.Quit() } catch {}; foreach ($p in $mine) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }
$res | ConvertTo-Json -Depth 4