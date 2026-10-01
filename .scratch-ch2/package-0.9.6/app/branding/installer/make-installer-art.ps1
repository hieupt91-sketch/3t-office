# Generates the installer artwork from the 3T brand mark (branding\3t\3t-mark.png, from the owner's 3T Reader brand).
#   welcome.bmp 164x314 (welcome / finish / uninstall pages), header.bmp 150x57 (top-right of inner pages), plus PNG previews.
# ASCII-only source; Vietnamese text is built from code points so Windows PowerShell 5.1 reads this file correctly.
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
$here = $PSScriptRoot
$mark = [System.Drawing.Image]::FromFile((Join-Path (Split-Path -Parent $here) "3t\3t-mark.png"))

function U([int[]]$codes) { -join ($codes | ForEach-Object { [char]$_ }) }
# "Bo ung dung van phong Viet" with Vietnamese diacritics
$tagline = "B" + (U 0x1ED9) + " " + (U 0x1EE9) + "ng d" + (U 0x1EE5) + "ng v" + (U 0x0103) + "n ph" + (U 0x00F2) + "ng Vi" + (U 0x1EC7) + "t"
$apps = @(
    @{ Name = "3T Doc";   Desc = "So" + (U 0x1EA1) + "n th" + (U 0x1EA3) + "o v" + (U 0x0103) + "n b" + (U 0x1EA3) + "n"; Color = [System.Drawing.Color]::FromArgb(30, 94, 180) },
    @{ Name = "3T Sheet"; Desc = "B" + (U 0x1EA3) + "ng t" + (U 0x00ED) + "nh";                                          Color = [System.Drawing.Color]::FromArgb(22, 128, 74) },
    @{ Name = "3T Slide"; Desc = "Tr" + (U 0x00EC) + "nh chi" + (U 0x1EBF) + "u";                                       Color = [System.Drawing.Color]::FromArgb(214, 96, 28) }
)
$navy = [System.Drawing.Color]::FromArgb(24, 40, 72)
$muted = [System.Drawing.Color]::FromArgb(88, 104, 130)

function New-Canvas([int]$w, [int]$h) {
    $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = "AntiAlias"; $g.InterpolationMode = "HighQualityBicubic"; $g.TextRenderingHint = "ClearTypeGridFit"
    return @($bmp, $g)
}

# ---- welcome.bmp 164 x 314 ----
$bmp, $g = New-Canvas 164 314
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Rectangle 0, 0, 164, 314), ([System.Drawing.Color]::White), ([System.Drawing.Color]::FromArgb(232, 241, 253)), 90
$g.FillRectangle($bg, 0, 0, 164, 314)
# brand mark (crop the "3T" letters out of the app icon: x 55..455, y 30..300 of 512)
$src = New-Object System.Drawing.Rectangle 55, 30, 400, 270
$g.DrawImage($mark, (New-Object System.Drawing.Rectangle 17, 22, 130, 88), $src, [System.Drawing.GraphicsUnit]::Pixel)
$fmt = New-Object System.Drawing.StringFormat; $fmt.Alignment = "Center"
$g.DrawString("3T OFFICE", (New-Object System.Drawing.Font "Segoe UI", 15, ([System.Drawing.FontStyle]::Bold)), (New-Object System.Drawing.SolidBrush $navy), (New-Object System.Drawing.RectangleF 0, 116, 164, 28), $fmt)
$g.DrawString($tagline, (New-Object System.Drawing.Font "Segoe UI", 8), (New-Object System.Drawing.SolidBrush $muted), (New-Object System.Drawing.RectangleF 0, 145, 164, 18), $fmt)
$orange = [System.Drawing.Color]::FromArgb(255, 142, 0)
$g.FillRectangle((New-Object System.Drawing.SolidBrush $orange), 52, 168, 60, 2)
$y = 186
foreach ($app in $apps) {
    $tile = New-Object System.Drawing.Drawing2D.GraphicsPath
    $tile.AddArc(18, $y, 8, 8, 180, 90); $tile.AddArc(38, $y, 8, 8, 270, 90); $tile.AddArc(38, $y + 20, 8, 8, 0, 90); $tile.AddArc(18, $y + 20, 8, 8, 90, 90); $tile.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush $app.Color), $tile)
    $letter = $app.Name.Substring(3, 1)
    $g.DrawString($letter, (New-Object System.Drawing.Font "Segoe UI", 11, ([System.Drawing.FontStyle]::Bold)), [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 18, ($y + 4), 28, 22), $fmt)
    $g.DrawString($app.Name, (New-Object System.Drawing.Font "Segoe UI", 9.5, ([System.Drawing.FontStyle]::Bold)), (New-Object System.Drawing.SolidBrush $navy), 52, ($y + 1))
    $g.DrawString($app.Desc, (New-Object System.Drawing.Font "Segoe UI", 7.5), (New-Object System.Drawing.SolidBrush $muted), 52, ($y + 16))
    $y += 40
}
$g.Dispose()
$bmp.Save((Join-Path $here "welcome.bmp"), [System.Drawing.Imaging.ImageFormat]::Bmp)
$bmp.Save((Join-Path $here "welcome-preview.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

# ---- header.bmp 150 x 57 ----
$bmp, $g = New-Canvas 150 57
$g.Clear([System.Drawing.Color]::White)
$g.DrawImage($mark, (New-Object System.Drawing.Rectangle 6, 10, 55, 37), $src, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString("3T OFFICE", (New-Object System.Drawing.Font "Segoe UI", 11, ([System.Drawing.FontStyle]::Bold)), (New-Object System.Drawing.SolidBrush $navy), 64, 18)
$g.Dispose()
$bmp.Save((Join-Path $here "header.bmp"), [System.Drawing.Imaging.ImageFormat]::Bmp)
$bmp.Save((Join-Path $here "header-preview.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
$mark.Dispose()
"installer art written to $here"
