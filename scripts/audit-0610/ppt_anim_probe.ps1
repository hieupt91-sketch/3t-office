# Do cach PowerPoint luu hieu ung hoat anh: tao slide tam, them hieu ung vao mot hinh, luu PPTX tam, in EffectType/Exit/Timing.
param([string]$OutDir = "")
$ErrorActionPreference = "Stop"
function Retry([scriptblock]$b) { $last = $null; for ($k = 0; $k -lt 25; $k++) { try { return (& $b) } catch { $last = $_; if ($_.Exception.Message -notmatch 'rejected|busy|RPC') { break }; Start-Sleep -Milliseconds 700 } }; throw ("PowerPoint loi: " + $last.Exception.Message) }
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id)
$app = $null
for ($a = 0; $a -lt 30 -and -not $app; $a++) { try { $app = New-Object -ComObject PowerPoint.Application } catch { Start-Sleep -Milliseconds 700 } }
$mine = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
$res = @()
try {
  $pres = Retry { $app.Presentations.Add(0) }
  $slide = Retry { $pres.Slides.AddSlide(1, $pres.SlideMaster.CustomLayouts.Item(7)) }
  $shape = Retry { $slide.Shapes.AddShape(1, 100, 100, 200, 100) }
  # msoAnimEffect: Appear=1, Fade=10, FlyIn=2, Zoom=53 (vao); Pulse=? Spin=? (nhan manh); Disappear/FadeOut/FlyOut (thoat)
  $cases = @(
    @{ name='Appear (entrance)'; type=1;  exit=0 },
    @{ name='Fade (entrance)';   type=10; exit=0 },
    @{ name='Fly In (entrance)'; type=2;  exit=0 },
    @{ name='Fade (exit)';       type=10; exit=-1 },
    @{ name='Disappear (exit)';  type=1;  exit=-1 },
    @{ name='Fly Out (exit)';    type=2;  exit=-1 },
    @{ name='Pulse (emphasis)';  type=0;  exit=0; emph=$true },
    @{ name='Spin (emphasis)';   type=61; exit=0 },
    @{ name='GrowShrink (emph)'; type=59; exit=0 }
  )
  foreach ($c in $cases) {
    try {
      $eff = Retry { $slide.TimeLine.MainSequence.AddEffect($shape, $c.type, 0, 1) }
      if ($c.exit -ne 0) { Retry { $eff.Exit = -1 } | Out-Null }
      $res += [pscustomobject]@{ name=$c.name; requestedType=$c.type; effectType=[int]$eff.EffectType; exit=[int]$eff.Exit; duration=[double]$eff.Timing.Duration; trigger=[int]$eff.Timing.TriggerType }
    } catch { $res += [pscustomobject]@{ name=$c.name; error=$_.Exception.Message } }
  }
  if ($OutDir) { Retry { $pres.SaveAs((Join-Path $OutDir "ppt_anim_probe.pptx")) } | Out-Null }
  Retry { $pres.Close() } | Out-Null
} finally { try { $app.Quit() } catch {}; foreach ($p in $mine) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }
$res | ConvertTo-Json -Depth 4