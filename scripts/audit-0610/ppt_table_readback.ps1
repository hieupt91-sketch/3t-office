# Doc lai bang trong PPTX bang PowerPoint that (COM, chi doc): so hang/cot, o gop, noi dung o.
# Dung: powershell -File scripts\audit-0610\ppt_table_readback.ps1 -Pptx <tep.pptx> [-Out ket-qua.json]
param([Parameter(Mandatory = $true)][string]$Pptx, [string]$Out = "")
$ErrorActionPreference = "Stop"
function Retry([scriptblock]$b) { $last = $null; for ($k = 0; $k -lt 25; $k++) { try { return (& $b) } catch { $last = $_; if ($_.Exception.Message -notmatch 'rejected|busy|RPC') { break }; Start-Sleep -Milliseconds 700 } }; throw ("PowerPoint loi: " + $last.Exception.Message) }
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id)
$app = $null
for ($a = 0; $a -lt 30 -and -not $app; $a++) { try { $app = New-Object -ComObject PowerPoint.Application } catch { Start-Sleep -Milliseconds 700 } }
if (-not $app) { throw "Khong khoi dong duoc PowerPoint" }
$mine = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
$result = [ordered]@{ file = $Pptx; tables = @() }
try {
    # ReadOnly=-1, Untitled=0, WithWindow=0 (khong dat Visible)
    $pres = Retry { $app.Presentations.Open($Pptx, -1, 0, 0) }
    foreach ($slide in $pres.Slides) {
        foreach ($shape in $slide.Shapes) {
            if (-not $shape.HasTable) { continue }
            $tbl = $shape.Table
            $rows = $tbl.Rows.Count; $cols = $tbl.Columns.Count
            $cells = @(); $merged = @()
            for ($r = 1; $r -le $rows; $r++) {
                for ($c = 1; $c -le $cols; $c++) {
                    $cell = $tbl.Cell($r, $c)
                    $text = [string]$cell.Shape.TextFrame.TextRange.Text
                    $isMerged = [bool]$cell.Merged
                    $sh = $cell.Shape; $cells += [pscustomobject]@{ r = $r; c = $c; text = ($text -replace "`r", "|"); merged = $isMerged; left = [math]::Round($sh.Left, 1); top = [math]::Round($sh.Top, 1); width = [math]::Round($sh.Width, 1); height = [math]::Round($sh.Height, 1) }
                    if ($isMerged) { $merged += "$r,$c" }
                }
            }
            # Vung gop = cac o co cung hinh hoc (Left/Top/Width/Height) vi COM tra ve cung mot Shape cho moi o thuoc vung gop.
            $regions = @($cells | Group-Object { "$($_.left),$($_.top),$($_.width),$($_.height)" } | ? { $_.Count -gt 1 } | % { $rs = $_.Group | % { $_.r }; $cs = $_.Group | % { $_.c }; "r$(($rs | Measure -Minimum).Minimum)-$(($rs | Measure -Maximum).Maximum) c$(($cs | Measure -Minimum).Minimum)-$(($cs | Measure -Maximum).Maximum)" })
            $result.tables += [pscustomobject]@{ slide = $slide.SlideIndex; rows = $rows; cols = $cols; mergedRegions = $regions; mergedCells = $merged; cells = $cells }
        }
    }
    Retry { $pres.Close() } | Out-Null
} finally {
    try { $app.Quit() } catch {}
    foreach ($p in $mine) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
}
$json = $result | ConvertTo-Json -Depth 8
if ($Out) { Set-Content -LiteralPath $Out -Value $json -Encoding UTF8 }
$json
