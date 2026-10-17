# Doc kich thuoc trang chieu cua PPTX bang PowerPoint that (COM, chi doc). Dung: -Pptx <tep> [-Out ket-qua.json]
param([Parameter(Mandatory = $true)][string]$Pptx, [string]$Out = "")
$ErrorActionPreference = "Stop"
function Retry([scriptblock]$b) { $last = $null; for ($k = 0; $k -lt 25; $k++) { try { return (& $b) } catch { $last = $_; if ($_.Exception.Message -notmatch 'rejected|busy|RPC') { break }; Start-Sleep -Milliseconds 700 } }; throw ("PowerPoint loi: " + $last.Exception.Message) }
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id)
$app = $null
for ($a = 0; $a -lt 30 -and -not $app; $a++) { try { $app = New-Object -ComObject PowerPoint.Application } catch { Start-Sleep -Milliseconds 700 } }
if (-not $app) { throw "Khong khoi dong duoc PowerPoint" }
$mine = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
try {
    $pres = Retry { $app.Presentations.Open($Pptx, -1, 0, 0) }
    $ps = $pres.PageSetup
    $w = [double](Retry { $ps.SlideWidth }); $h = [double](Retry { $ps.SlideHeight })
    $res = [ordered]@{ file = $Pptx; widthPt = [math]::Round($w, 2); heightPt = [math]::Round($h, 2); widthCm = [math]::Round($w / 72 * 2.54, 2); heightCm = [math]::Round($h / 72 * 2.54, 2); slideSizeType = [int](Retry { $ps.SlideSize }); slides = [int]$pres.Slides.Count; at = (Get-Date -Format "o") }
    Retry { $pres.Close() } | Out-Null
} finally {
    try { $app.Quit() } catch {}
    foreach ($p in $mine) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
}
$json = $res | ConvertTo-Json
if ($Out) { Set-Content -LiteralPath $Out -Value $json -Encoding UTF8 }
$json