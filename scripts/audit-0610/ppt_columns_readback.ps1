# Doc so cot / khoang cach cot cua hop van ban trong PPTX bang PowerPoint that (COM, chi doc).
param([Parameter(Mandatory = $true)][string]$Pptx, [string]$Out = "")
$ErrorActionPreference = "Stop"
function Retry([scriptblock]$b) { $last = $null; for ($k = 0; $k -lt 25; $k++) { try { return (& $b) } catch { $last = $_; if ($_.Exception.Message -notmatch 'rejected|busy|RPC') { break }; Start-Sleep -Milliseconds 700 } }; throw ("PowerPoint loi: " + $last.Exception.Message) }
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id)
$app = $null
for ($a = 0; $a -lt 30 -and -not $app; $a++) { try { $app = New-Object -ComObject PowerPoint.Application } catch { Start-Sleep -Milliseconds 700 } }
if (-not $app) { throw "Khong khoi dong duoc PowerPoint" }
$mine = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
$rows = @()
try {
    $pres = Retry { $app.Presentations.Open($Pptx, -1, 0, 0) }
    foreach ($slide in $pres.Slides) {
        foreach ($shape in $slide.Shapes) {
            if (-not $shape.HasTextFrame) { continue }
            $tf2 = $shape.TextFrame2
            $rows += [pscustomobject]@{ slide = $slide.SlideIndex; shape = $shape.Name; columns = [int]$tf2.Column.Number; spacingPt = [math]::Round([double]$tf2.Column.Spacing, 1); text = ([string]$shape.TextFrame.TextRange.Text).Substring(0, [Math]::Min(24, ([string]$shape.TextFrame.TextRange.Text).Length)) }
        }
    }
    Retry { $pres.Close() } | Out-Null
} finally { try { $app.Quit() } catch {}; foreach ($p in $mine) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }
$json = $rows | ConvertTo-Json -Depth 4
if ($Out) { Set-Content -LiteralPath $Out -Value $json -Encoding UTF8 }
$json