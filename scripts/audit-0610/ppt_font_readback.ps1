# Doc dinh dang chu (Font.Shadow/Bold/Italic) tung chu cua mot doan trong PPTX bang PowerPoint that (COM, chi doc).
param([Parameter(Mandatory = $true)][string]$Pptx, [string]$Out = "")
$ErrorActionPreference = "Stop"
function Retry([scriptblock]$b) { $last = $null; for ($k = 0; $k -lt 25; $k++) { try { return (& $b) } catch { $last = $_; if ($_.Exception.Message -notmatch 'rejected|busy|RPC') { break }; Start-Sleep -Milliseconds 700 } }; throw ("PowerPoint loi: " + $last.Exception.Message) }
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id)
$app = $null
for ($a = 0; $a -lt 30 -and -not $app; $a++) { try { $app = New-Object -ComObject PowerPoint.Application } catch { Start-Sleep -Milliseconds 700 } }
if (-not $app) { throw "Khong khoi dong duoc PowerPoint" }
$mine = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
$runsOut = @()
try {
    $pres = Retry { $app.Presentations.Open($Pptx, -1, 0, 0) }
    foreach ($slide in $pres.Slides) {
        foreach ($shape in $slide.Shapes) {
            if (-not $shape.HasTextFrame) { continue }
            $tr = $shape.TextFrame.TextRange
            if (-not $tr.Text) { continue }
            $n = $tr.Runs().Count
            for ($i = 1; $i -le $n; $i++) {
                $run = $tr.Runs($i)
                $run2 = $null; try { $run2 = $shape.TextFrame2.TextRange.Runs($i) } catch {}
                $shadow2 = if ($run2) { [int]$run2.Font.Shadow.Visible } else { $null }; $blur2 = if ($run2) { [double]$run2.Font.Shadow.Blur } else { $null }
                $runsOut += [pscustomobject]@{ slide = $slide.SlideIndex; shape = $shape.Name; text = ($run.Text -replace "`r", "|"); shadow = [int]$run.Font.Shadow; shadowVisible = $shadow2; shadowBlur = $blur2; bold = [int]$run.Font.Bold; italic = [int]$run.Font.Italic }
            }
        }
    }
    Retry { $pres.Close() } | Out-Null
} finally {
    try { $app.Quit() } catch {}
    foreach ($p in $mine) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
}
$json = $runsOut | ConvertTo-Json -Depth 4
if ($Out) { Set-Content -LiteralPath $Out -Value $json -Encoding UTF8 }
$json