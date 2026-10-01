# Generate multi-resolution icons (.ico) and SVG assets for VN Office.
# Target sizes: 16, 24, 32, 48, 64, 128, 256 px.
# Uses Windows PowerShell 5.1 System.Drawing (standard .NET, zero external dependencies).
# ASCII only.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $repoRoot "branding\icons"
if (-not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Force $outDir | Out-Null }

$targetSizes = @(16, 24, 32, 48, 64, 128, 256)

function New-RoundedRectPath([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $d = $r * 2.0
    if ($d -gt $w) { $d = $w }
    if ($d -gt $h) { $d = $h }
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc(($x + $w - $d), $y, $d, $d, 270, 90)
    $path.AddArc(($x + $w - $d), ($y + $h - $d), $d, $d, 0, 90)
    $path.AddArc($x, ($y + $h - $d), $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function Render-VnOfficeIcon([int]$sz) {
    $bmp = [System.Drawing.Bitmap]::new($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = [float]$sz / 256.0
    $pad = if ($sz -le 24) { 1.0 } else { 16.0 * $scale }
    $w = [float]$sz - ($pad * 2.0)
    $r = if ($sz -le 24) { [Math]::Max(2.0, [float]$sz * 0.18) } else { 52.0 * $scale }

    # Base rounded tile
    $tilePath = New-RoundedRectPath $pad $pad $w $w $r
    $p1 = [System.Drawing.PointF]::new($pad, $pad)
    $p2 = [System.Drawing.PointF]::new(($pad + $w), ($pad + $w))
    $c1 = [System.Drawing.Color]::FromArgb(255, 211, 47, 47)
    $c2 = [System.Drawing.Color]::FromArgb(255, 154, 20, 15)
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($p1, $p2, $c1, $c2)
    $g.FillPath($bgBrush, $tilePath)

    if ($sz -ge 32) {
        $rimPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(50, 255, 255, 255), [Math]::Max(1.0, 1.5 * $scale))
        $g.DrawPath($rimPen, $tilePath)
        $rimPen.Dispose()
    }

    # Golden V Chevron
    $vPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $pts = @(
        [System.Drawing.PointF]::new((56 * $scale), (76 * $scale)),
        [System.Drawing.PointF]::new((128 * $scale), (200 * $scale)),
        [System.Drawing.PointF]::new((200 * $scale), (76 * $scale)),
        [System.Drawing.PointF]::new((162 * $scale), (76 * $scale)),
        [System.Drawing.PointF]::new((128 * $scale), (142 * $scale)),
        [System.Drawing.PointF]::new((94 * $scale), (76 * $scale))
    )
    $vPath.AddPolygon($pts)

    $vp1 = [System.Drawing.PointF]::new((56 * $scale), (76 * $scale))
    $vp2 = [System.Drawing.PointF]::new((128 * $scale), (200 * $scale))
    $vc1 = [System.Drawing.Color]::FromArgb(255, 252, 211, 77)
    $vc2 = [System.Drawing.Color]::FromArgb(255, 217, 119, 6)
    $goldBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($vp1, $vp2, $vc1, $vc2)
    $g.FillPath($goldBrush, $vPath)

    # Star Crest
    $starPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $starPts = @(
        [System.Drawing.PointF]::new((128 * $scale), (42 * $scale)),
        [System.Drawing.PointF]::new((132.5 * $scale), (54.5 * $scale)),
        [System.Drawing.PointF]::new((145 * $scale), (56 * $scale)),
        [System.Drawing.PointF]::new((136 * $scale), (65 * $scale)),
        [System.Drawing.PointF]::new((138 * $scale), (77.5 * $scale)),
        [System.Drawing.PointF]::new((128 * $scale), (71.5 * $scale)),
        [System.Drawing.PointF]::new((118 * $scale), (77.5 * $scale)),
        [System.Drawing.PointF]::new((120 * $scale), (65 * $scale)),
        [System.Drawing.PointF]::new((111 * $scale), (56 * $scale)),
        [System.Drawing.PointF]::new((123.5 * $scale), (54.5 * $scale))
    )
    $starPath.AddPolygon($starPts)
    $starBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(245, 255, 255, 255))
    $g.FillPath($starBrush, $starPath)

    $starBrush.Dispose(); $starPath.Dispose(); $goldBrush.Dispose(); $vPath.Dispose()
    $bgBrush.Dispose(); $tilePath.Dispose(); $g.Dispose()
    return $bmp
}

function Render-WriterIcon([int]$sz) {
    $bmp = [System.Drawing.Bitmap]::new($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = [float]$sz / 256.0
    $pad = if ($sz -le 24) { 1.0 } else { 16.0 * $scale }
    $w = [float]$sz - ($pad * 2.0)
    $r = if ($sz -le 24) { [Math]::Max(2.0, [float]$sz * 0.18) } else { 52.0 * $scale }

    # Base rounded tile
    $tilePath = New-RoundedRectPath $pad $pad $w $w $r
    $p1 = [System.Drawing.PointF]::new($pad, $pad)
    $p2 = [System.Drawing.PointF]::new(($pad + $w), ($pad + $w))
    $c1 = [System.Drawing.Color]::FromArgb(255, 27, 106, 184)
    $c2 = [System.Drawing.Color]::FromArgb(255, 11, 60, 110)
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($p1, $p2, $c1, $c2)
    $g.FillPath($bgBrush, $tilePath)

    if ($sz -ge 32) {
        $rimPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(50, 255, 255, 255), [Math]::Max(1.0, 1.5 * $scale))
        $g.DrawPath($rimPen, $tilePath)
        $rimPen.Dispose()
    }

    # Document Folio Sheet
    $sheetPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $sheetPts = @(
        [System.Drawing.PointF]::new((64 * $scale), (48 * $scale)),
        [System.Drawing.PointF]::new((152 * $scale), (48 * $scale)),
        [System.Drawing.PointF]::new((192 * $scale), (88 * $scale)),
        [System.Drawing.PointF]::new((192 * $scale), (204 * $scale)),
        [System.Drawing.PointF]::new((64 * $scale), (204 * $scale))
    )
    $sheetPath.AddPolygon($sheetPts)
    $sheetBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $g.FillPath($sheetBrush, $sheetPath)

    # Corner Fold Flap
    $foldPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $foldPts = @(
        [System.Drawing.PointF]::new((152 * $scale), (48 * $scale)),
        [System.Drawing.PointF]::new((192 * $scale), (88 * $scale)),
        [System.Drawing.PointF]::new((152 * $scale), (88 * $scale))
    )
    $foldPath.AddPolygon($foldPts)
    $foldBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 191, 219, 254))
    $g.FillPath($foldBrush, $foldPath)

    # Horizontal Text Paragraph Lines
    $line1Brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 29, 78, 216))
    $line2Brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 96, 165, 250))
    $lineH = [Math]::Max(1.5, 10.0 * $scale)

    $g.FillRectangle($line1Brush, (80 * $scale), (108 * $scale), (76 * $scale), $lineH)
    $g.FillRectangle($line2Brush, (80 * $scale), (132 * $scale), (68 * $scale), $lineH)
    $g.FillRectangle($line2Brush, (80 * $scale), (154 * $scale), (52 * $scale), $lineH)

    # Golden Quill Accent
    $quillPts = @(
        [System.Drawing.PointF]::new((166 * $scale), (142 * $scale)),
        [System.Drawing.PointF]::new((182 * $scale), (158 * $scale)),
        [System.Drawing.PointF]::new((160 * $scale), (200 * $scale)),
        [System.Drawing.PointF]::new((148 * $scale), (196 * $scale))
    )
    $quillPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $quillPath.AddPolygon($quillPts)
    $quillBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 245, 158, 11))
    $g.FillPath($quillBrush, $quillPath)

    $quillBrush.Dispose(); $quillPath.Dispose()
    $line1Brush.Dispose(); $line2Brush.Dispose(); $foldBrush.Dispose(); $foldPath.Dispose()
    $sheetBrush.Dispose(); $sheetPath.Dispose()
    $bgBrush.Dispose(); $tilePath.Dispose(); $g.Dispose()
    return $bmp
}

function Render-SheetIcon([int]$sz) {
    $bmp = [System.Drawing.Bitmap]::new($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = [float]$sz / 256.0
    $pad = if ($sz -le 24) { 1.0 } else { 16.0 * $scale }
    $w = [float]$sz - ($pad * 2.0)
    $r = if ($sz -le 24) { [Math]::Max(2.0, [float]$sz * 0.18) } else { 52.0 * $scale }

    # Base rounded tile
    $tilePath = New-RoundedRectPath $pad $pad $w $w $r
    $p1 = [System.Drawing.PointF]::new($pad, $pad)
    $p2 = [System.Drawing.PointF]::new(($pad + $w), ($pad + $w))
    $c1 = [System.Drawing.Color]::FromArgb(255, 22, 128, 61)
    $c2 = [System.Drawing.Color]::FromArgb(255, 10, 80, 36)
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($p1, $p2, $c1, $c2)
    $g.FillPath($bgBrush, $tilePath)

    if ($sz -ge 32) {
        $rimPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(50, 255, 255, 255), [Math]::Max(1.0, 1.5 * $scale))
        $g.DrawPath($rimPen, $tilePath)
        $rimPen.Dispose()
    }

    # Table Card
    $cardR = if ($sz -le 24) { 2.0 } else { 14.0 * $scale }
    $cardPath = New-RoundedRectPath (52 * $scale) (48 * $scale) (152 * $scale) (160 * $scale) $cardR
    $cardBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $g.FillPath($cardBrush, $cardPath)

    # Header Bar
    $headerBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 21, 128, 61))
    $g.FillRectangle($headerBrush, (52 * $scale), (48 * $scale), (152 * $scale), (36 * $scale))

    # Grid Lines
    $gridPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 220, 252, 231), [Math]::Max(1.0, 3.0 * $scale))
    $g.DrawLine($gridPen, (102 * $scale), (84 * $scale), (102 * $scale), (208 * $scale))
    $g.DrawLine($gridPen, (154 * $scale), (84 * $scale), (154 * $scale), (208 * $scale))
    $g.DrawLine($gridPen, (52 * $scale), (124 * $scale), (204 * $scale), (124 * $scale))
    $g.DrawLine($gridPen, (52 * $scale), (164 * $scale), (204 * $scale), (164 * $scale))

    # Data Analytics Bars
    $bar1Brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 134, 239, 172))
    $bar2Brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 34, 197, 94))
    $bar3Brush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 21, 128, 61))

    $g.FillRectangle($bar1Brush, (64 * $scale), (168 * $scale), (26 * $scale), (28 * $scale))
    $g.FillRectangle($bar2Brush, (114 * $scale), (142 * $scale), (26 * $scale), (54 * $scale))
    $g.FillRectangle($bar3Brush, (166 * $scale), (104 * $scale), (26 * $scale), (92 * $scale))

    # Trend Indicator Accent Line
    $trendPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 245, 158, 11), [Math]::Max(1.5, 4.0 * $scale))
    $g.DrawLine($trendPen, (77 * $scale), (160 * $scale), (127 * $scale), (132 * $scale))
    $g.DrawLine($trendPen, (127 * $scale), (132 * $scale), (179 * $scale), (96 * $scale))

    $trendPen.Dispose(); $bar1Brush.Dispose(); $bar2Brush.Dispose(); $bar3Brush.Dispose()
    $gridPen.Dispose(); $headerBrush.Dispose(); $cardBrush.Dispose(); $cardPath.Dispose()
    $bgBrush.Dispose(); $tilePath.Dispose(); $g.Dispose()
    return $bmp
}

function Render-SlidesIcon([int]$sz) {
    $bmp = [System.Drawing.Bitmap]::new($sz, $sz, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = [float]$sz / 256.0
    $pad = if ($sz -le 24) { 1.0 } else { 16.0 * $scale }
    $w = [float]$sz - ($pad * 2.0)
    $r = if ($sz -le 24) { [Math]::Max(2.0, [float]$sz * 0.18) } else { 52.0 * $scale }

    # Base rounded tile
    $tilePath = New-RoundedRectPath $pad $pad $w $w $r
    $p1 = [System.Drawing.PointF]::new($pad, $pad)
    $p2 = [System.Drawing.PointF]::new(($pad + $w), ($pad + $w))
    $c1 = [System.Drawing.Color]::FromArgb(255, 217, 83, 30)
    $c2 = [System.Drawing.Color]::FromArgb(255, 143, 38, 10)
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($p1, $p2, $c1, $c2)
    $g.FillPath($bgBrush, $tilePath)

    if ($sz -ge 32) {
        $rimPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(50, 255, 255, 255), [Math]::Max(1.0, 1.5 * $scale))
        $g.DrawPath($rimPen, $tilePath)
        $rimPen.Dispose()
    }

    # Easel Stand
    $standPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 254, 215, 170), [Math]::Max(1.5, 6.0 * $scale))
    $g.DrawLine($standPen, (128 * $scale), (168 * $scale), (128 * $scale), (196 * $scale))
    $g.DrawLine($standPen, (96 * $scale), (204 * $scale), (160 * $scale), (204 * $scale))

    # Widescreen Display (16:9)
    $screenWidth = 168.0 * $scale
    $screenHeight = 116.0 * $scale
    $screenR = if ($sz -le 24) { 2.0 } else { 12.0 * $scale }
    $screenPath = New-RoundedRectPath (44 * $scale) (52 * $scale) $screenWidth $screenHeight $screenR
    $screenBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $g.FillPath($screenBrush, $screenPath)

    # Slide Top Title Bar
    $titleBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 194, 65, 12))
    $g.FillRectangle($titleBrush, (56 * $scale), (66 * $scale), (56 * $scale), [Math]::Max(1.5, 8.0 * $scale))

    # Slide Graphic: Presentation Triangle (Play / Spotlight Prism)
    $triPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $triPts = @(
        [System.Drawing.PointF]::new((106 * $scale), (90 * $scale)),
        [System.Drawing.PointF]::new((154 * $scale), (116 * $scale)),
        [System.Drawing.PointF]::new((106 * $scale), (142 * $scale))
    )
    $triPath.AddPolygon($triPts)
    $triBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 234, 88, 12))
    $g.FillPath($triBrush, $triPath)

    # Slide Lower Detail Blocks
    if ($sz -ge 32) {
        $blockBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 253, 186, 116))
        $g.FillRectangle($blockBrush, (58 * $scale), (134 * $scale), (28 * $scale), (6 * $scale))
        $g.FillRectangle($blockBrush, (58 * $scale), (144 * $scale), (36 * $scale), (6 * $scale))
        $blockBrush.Dispose()
    }

    $triBrush.Dispose(); $triPath.Dispose(); $titleBrush.Dispose()
    $screenBrush.Dispose(); $screenPath.Dispose(); $standPen.Dispose()
    $bgBrush.Dispose(); $tilePath.Dispose(); $g.Dispose()
    return $bmp
}

function Save-MultiSizeIco([string]$filePath, [System.Collections.ArrayList]$bitmaps) {
    $pngStreams = @()
    foreach ($bmp in $bitmaps) {
        $ms = [System.IO.MemoryStream]::new()
        $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $pngStreams += ,@($bmp.Width, $ms.ToArray())
        $ms.Dispose()
    }

    $fs = [System.IO.File]::Create($filePath)
    $bw = [System.IO.BinaryWriter]::new($fs)

    # ICONDIR
    $bw.Write([uint16]0) # Reserved
    $bw.Write([uint16]1) # Type 1 = ICO
    $bw.Write([uint16]$pngStreams.Count)

    # ICONDIRENTRY list
    $offset = 6 + (16 * $pngStreams.Count)
    foreach ($entry in $pngStreams) {
        $w = if ($entry[0] -ge 256) { [byte]0 } else { [byte]$entry[0] }
        $h = if ($entry[0] -ge 256) { [byte]0 } else { [byte]$entry[0] }
        $bytes = $entry[1]

        $bw.Write([byte]$w)
        $bw.Write([byte]$h)
        $bw.Write([byte]0)   # ColorCount
        $bw.Write([byte]0)   # Reserved
        $bw.Write([uint16]1) # Planes
        $bw.Write([uint16]32)# BitCount
        $bw.Write([uint32]$bytes.Length)
        $bw.Write([uint32]$offset)
        $offset += $bytes.Length
    }

    # Image Data
    foreach ($entry in $pngStreams) {
        $bw.Write($entry[1])
    }

    $bw.Flush()
    $fs.Close()
}

$apps = @(
    @{ Name = "vnoffice"; Render = { param($s) Render-VnOfficeIcon $s } },
    @{ Name = "writer";   Render = { param($s) Render-WriterIcon $s } },
    @{ Name = "sheet";    Render = { param($s) Render-SheetIcon $s } },
    @{ Name = "slides";   Render = { param($s) Render-SlidesIcon $s } }
)

foreach ($app in $apps) {
    Write-Host "Rendering $($app.Name).ico with sizes: $($targetSizes -join ', ') px..."
    $bmps = [System.Collections.ArrayList]::new()
    foreach ($sz in $targetSizes) {
        $bmp = & $app.Render $sz
        [void]$bmps.Add($bmp)
    }

    $icoPath = Join-Path $outDir "$($app.Name).ico"
    Save-MultiSizeIco $icoPath $bmps
    Write-Host "Saved: $icoPath ($([int]((Get-Item $icoPath).Length / 1024)) KB)"

    foreach ($bmp in $bmps) { $bmp.Dispose() }
}

Write-Host "Icon generation completed successfully."
