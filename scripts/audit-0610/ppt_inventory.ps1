# Kiem ke PPTX bang PowerPoint that (COM, chi doc): so slide, so hinh, kieu hinh, chu moi hinh (rut gon), kich thuoc trang.
param([Parameter(Mandatory = $true)][string]$Pptx, [string]$Out = "")
$ErrorActionPreference = "Stop"
function Retry([scriptblock]$b) { $last = $null; for ($k = 0; $k -lt 25; $k++) { try { return (& $b) } catch { $last = $_; if ($_.Exception.Message -notmatch 'rejected|busy|RPC') { break }; Start-Sleep -Milliseconds 700 } }; throw ("PowerPoint loi: " + $last.Exception.Message) }
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id)
$app = $null
for ($a = 0; $a -lt 30 -and -not $app; $a++) { try { $app = New-Object -ComObject PowerPoint.Application } catch { Start-Sleep -Milliseconds 700 } }
if (-not $app) { throw "Khong khoi dong duoc PowerPoint" }
$mine = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
$res = [ordered]@{ file = (Split-Path -Leaf $Pptx); slides = 0; widthPt = 0; heightPt = 0; perSlide = @() }
try {
    $pres = Retry { $app.Presentations.Open($Pptx, -1, 0, 0) }
    $res.slides = [int]$pres.Slides.Count; $res.widthPt = [math]::Round([double]$pres.PageSetup.SlideWidth, 1); $res.heightPt = [math]::Round([double]$pres.PageSetup.SlideHeight, 1)
    foreach ($slide in $pres.Slides) {
        $shapes = @(); $textChars = 0
        foreach ($shape in $slide.Shapes) {
            $t = ""
            if ($shape.HasTextFrame) { $t = [string]$shape.TextFrame.TextRange.Text; $textChars += $t.Length }
            $shapes += [pscustomobject]@{ type = [int]$shape.Type; hasTable = [bool]$shape.HasTable; hasChart = [bool]$shape.HasChart }
        }
        $res.perSlide += [pscustomobject]@{ index = $slide.SlideIndex; shapes = $shapes.Count; tables = @($shapes | ? { $_.hasTable }).Count; charts = @($shapes | ? { $_.hasChart }).Count; textChars = $textChars; hidden = [int]$slide.SlideShowTransition.Hidden }
    }
    Retry { $pres.Close() } | Out-Null
} finally { try { $app.Quit() } catch {}; foreach ($p in $mine) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }
$json = $res | ConvertTo-Json -Depth 6
if ($Out) { Set-Content -LiteralPath $Out -Value $json -Encoding UTF8 }
$json