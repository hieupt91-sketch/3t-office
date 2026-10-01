# Generate comprehensive UI context and resolution proofs (Taskbar, Window Titlebar, Desktop Shortcuts)
# Saves proof images to $env:LOCALAPPDATA\Temp\vno-icon-proof (outside repository).
# ASCII only.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$repoRoot = Split-Path -Parent $PSScriptRoot
$tempProofDir = Join-Path ([System.IO.Path]::GetTempPath()) "vno-icon-proof"
if (-not (Test-Path -LiteralPath $tempProofDir)) { New-Item -ItemType Directory -Force $tempProofDir | Out-Null }
$shortcutDir = Join-Path $tempProofDir "shortcuts"
if (-not (Test-Path -LiteralPath $shortcutDir)) { New-Item -ItemType Directory -Force $shortcutDir | Out-Null }

Write-Host "Proof directory: $tempProofDir"

# 1. Create real Windows shortcuts (.lnk) pointing to the icons
$wsh = New-Object -ComObject WScript.Shell
$apps = @(
    @{ Id = "writer";   Name = "VN Writer";       Title = "VN Writer -- Soan thao van ban" },
    @{ Id = "sheet";    Name = "VN Sheet";        Title = "VN Sheet -- Bang tinh" },
    @{ Id = "slides";   Name = "VN Slides";       Title = "VN Slides -- Thuyet trinh" },
    @{ Id = "vnoffice"; Name = "VN Office Suite"; Title = "VN Office -- Bo Ung Dung Van Phong Viet" }
)

foreach ($app in $apps) {
    $icoPath = Join-Path $repoRoot "branding\icons\$($app.Id).ico"
    $lnkPath = Join-Path $shortcutDir "$($app.Name).lnk"
    $lnk = $wsh.CreateShortcut($lnkPath)
    $lnk.TargetPath = "$env:ComSpec"
    $lnk.Arguments = "/c echo $($app.Name)"
    $lnk.IconLocation = "$icoPath,0"
    $lnk.Description = "$($app.Name) - VN Office Pilot"
    $lnk.Save()
    Write-Host "Created shortcut: $lnkPath (Icon: $icoPath)"
}

function Get-IconFrameImage([string]$icoPath, [int]$targetSize) {
    $bytes = [System.IO.File]::ReadAllBytes($icoPath)
    $count = [BitConverter]::ToUInt16($bytes, 4)
    for ($i = 0; $i -lt $count; $i++) {
        $entryOffset = 6 + ($i * 16)
        $w = $bytes[$entryOffset]
        $wReal = if ($w -eq 0) { 256 } else { [int]$w }
        if ($wReal -eq $targetSize) {
            $len = [BitConverter]::ToUInt32($bytes, $entryOffset + 8)
            $offset = [BitConverter]::ToUInt32($bytes, $entryOffset + 12)
            $pngBytes = New-Object byte[] $len
            [Array]::Copy($bytes, $offset, $pngBytes, 0, $len)
            $ms = [System.IO.MemoryStream]::new($pngBytes)
            return [System.Drawing.Image]::FromStream($ms)
        }
    }
    return $null
}

# 2. Render multi-size resolution matrix image (16, 24, 32, 48, 64 px)
$matrixWidth = 920
$matrixHeight = 560
$matrixBmp = [System.Drawing.Bitmap]::new($matrixWidth, $matrixHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$mg = [System.Drawing.Graphics]::FromImage($matrixBmp)
$mg.Clear([System.Drawing.Color]::FromArgb(255, 24, 24, 27))

$headerFont = [System.Drawing.Font]::new("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$titleFont = [System.Drawing.Font]::new("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$subFont = [System.Drawing.Font]::new("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
$whiteBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
$mutedBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 161, 161, 170))

$mg.DrawString("VN OFFICE -- BANG CHUNG NHAN DIEN ICON O KICH THUOC NHO", $headerFont, $whiteBrush, 30.0, 24.0)
$mg.DrawString("Kiem tra do sac net, ro rang va do tuong phan tren Taskbar / Desktop / Shortcut (16, 24, 32, 48, 64 px)", $subFont, $mutedBrush, 30.0, 58.0)

# Table Header
$sizes = @(16, 24, 32, 48, 64)
$colX = @{ "Name" = 30; "16" = 250; "24" = 340; "32" = 450; "48" = 590; "64" = 750 }

$mg.DrawString("Ung dung", $titleFont, $mutedBrush, [float]$colX["Name"], 100.0)
foreach ($s in $sizes) {
    $mg.DrawString("$s x $s px", $titleFont, $mutedBrush, [float]$colX["$s"], 100.0)
}

$divPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 63, 63, 70), 1.0)
$mg.DrawLine($divPen, 30, 125, 890, 125)

$rowY = 140
foreach ($app in $apps) {
    $icoFile = Join-Path $repoRoot "branding\icons\$($app.Id).ico"

    # Row label
    $mg.DrawString($app.Name, $titleFont, $whiteBrush, [float]$colX["Name"], [float]($rowY + 14))

    # Dark background pill
    foreach ($s in $sizes) {
        $x = [int]$colX["$s"]
        $boxW = [Math]::Max($s + 16, 44)
        $boxH = 68
        
        $bgDark = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 39, 39, 42))
        $mg.FillRectangle($bgDark, ($x - 8), $rowY, $boxW, $boxH)
        $bgDark.Dispose()

        # Load specific icon frame via exact PNG stream
        $frameImg = Get-IconFrameImage $icoFile $s
        if ($frameImg -ne $null) {
            $drawX = $x - 8 + [int](($boxW - $s) / 2)
            $drawY = $rowY + [int]((44 - $s) / 2)
            $mg.DrawImage($frameImg, $drawX, $drawY, $s, $s)
            $frameImg.Dispose()
        }

        # Label pixel size
        $mg.DrawString("${s}p", $subFont, $mutedBrush, [float]($x - 4), [float]($rowY + 48))
    }

    $mg.DrawLine($divPen, 30, ($rowY + 76), 890, ($rowY + 76))
    $rowY += 88
}

$divPen.Dispose()
$headerFont.Dispose(); $titleFont.Dispose(); $subFont.Dispose()
$whiteBrush.Dispose(); $mutedBrush.Dispose(); $mg.Dispose()

$matrixPath = Join-Path $tempProofDir "icon-resolutions-matrix.png"
$matrixBmp.Save($matrixPath, [System.Drawing.Imaging.ImageFormat]::Png)
$matrixBmp.Dispose()
Write-Host "Saved resolution matrix proof: $matrixPath"

# 3. TASKBAR CONTEXT PROOF (Windows 11 Centered Taskbar, 48px height)
$tbWidth = 1000
$tbHeight = 120
$tbBmp = [System.Drawing.Bitmap]::new($tbWidth, $tbHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$tg = [System.Drawing.Graphics]::FromImage($tbBmp)
$tg.Clear([System.Drawing.Color]::FromArgb(255, 15, 23, 42))

$headerFont2 = [System.Drawing.Font]::new("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$smFont2 = [System.Drawing.Font]::new("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
$whiteBrush2 = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)

$tg.DrawString("CHUNG MINH ICON TREN THANH TASKBAR WINDOWS (KICH THUOC 24x24 VA 32x32 PX)", $headerFont2, $whiteBrush2, 20.0, 10.0)

# Taskbar background strip
$barY = 48
$barBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(240, 28, 28, 30))
$tg.FillRectangle($barBrush, 0, $barY, $tbWidth, 54)

# Center container
$startX = 340
$iconSz = 32

# Windows Start Button icon
$winBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 0, 164, 239))
$tg.FillRectangle($winBrush, $startX, ($barY + 16), 8, 8)
$tg.FillRectangle($winBrush, ($startX + 10), ($barY + 16), 8, 8)
$tg.FillRectangle($winBrush, $startX, ($barY + 26), 8, 8)
$tg.FillRectangle($winBrush, ($startX + 10), ($barY + 26), 8, 8)

$curX = $startX + 44
foreach ($app in $apps) {
    $icoFile = Join-Path $repoRoot "branding\icons\$($app.Id).ico"
    $img = Get-IconFrameImage $icoFile $iconSz

    if ($app.Id -eq "writer") {
        $activeBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(50, 255, 255, 255))
        $tg.FillRectangle($activeBrush, ($curX - 6), ($barY + 6), 44, 42)
        $activeBrush.Dispose()
        $pillBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 96, 165, 250))
        $tg.FillRectangle($pillBrush, ($curX + 6), ($barY + 47), 20, 3)
        $pillBrush.Dispose()
    } else {
        $dotBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(180, 255, 255, 255))
        $tg.FillRectangle($dotBrush, ($curX + 13), ($barY + 47), 6, 2)
        $dotBrush.Dispose()
    }

    if ($img -ne $null) {
        $tg.DrawImage($img, $curX, ($barY + 11), $iconSz, $iconSz)
        $img.Dispose()
    }
    $curX += 48
}

$taskbarPath = Join-Path $tempProofDir "proof-taskbar-context.png"
$tbBmp.Save($taskbarPath, [System.Drawing.Imaging.ImageFormat]::Png)
$tbBmp.Dispose(); $tg.Dispose()
Write-Host "Saved Taskbar proof: $taskbarPath"

# 4. WINDOW TITLEBAR PROOF (16x16 px title bar icon)
$wndWidth = 900
$wndHeight = 360
$wndBmp = [System.Drawing.Bitmap]::new($wndWidth, $wndHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$wg = [System.Drawing.Graphics]::FromImage($wndBmp)
$wg.Clear([System.Drawing.Color]::FromArgb(255, 241, 245, 249))

$wg.DrawString("CHUNG MINH ICON CUA SO UNG DUNG TREN THANH TIEU DE (16x16 PX)", $headerFont2, [System.Drawing.Brushes]::Black, 20.0, 16.0)

$rowY = 54
foreach ($app in $apps) {
    $icoFile = Join-Path $repoRoot "branding\icons\$($app.Id).ico"
    $img16 = Get-IconFrameImage $icoFile 16

    $barBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 226, 232, 240), 1.0)
    $wg.FillRectangle($barBrush, 20, $rowY, 860, 36)
    $wg.DrawRectangle($borderPen, 20, $rowY, 860, 36)

    if ($img16 -ne $null) {
        $wg.DrawImage($img16, 32, ($rowY + 10), 16, 16)
        $img16.Dispose()
    }

    $wg.DrawString($app.Title, $smFont2, [System.Drawing.Brushes]::Black, 56.0, [float]($rowY + 9))

    $btnFont = [System.Drawing.Font]::new("Segoe UI", 8, [System.Drawing.FontStyle]::Regular)
    $wg.DrawString("-", $btnFont, [System.Drawing.Brushes]::Gray, 770.0, [float]($rowY + 9))
    $wg.DrawString("[ ]", $btnFont, [System.Drawing.Brushes]::Gray, 804.0, [float]($rowY + 9))
    $wg.DrawString("X", $btnFont, [System.Drawing.Brushes]::Gray, 842.0, [float]($rowY + 9))
    $btnFont.Dispose()

    $barBrush.Dispose(); $borderPen.Dispose()
    $rowY += 66
}

$titlebarPath = Join-Path $tempProofDir "proof-window-titlebar.png"
$wndBmp.Save($titlebarPath, [System.Drawing.Imaging.ImageFormat]::Png)
$wndBmp.Dispose(); $wg.Dispose()
Write-Host "Saved Window Titlebar proof: $titlebarPath"

# 5. DESKTOP SHORTCUTS PROOF (48x48 px standard desktop icon view)
$deskWidth = 900
$deskHeight = 260
$deskBmp = [System.Drawing.Bitmap]::new($deskWidth, $deskHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$dg = [System.Drawing.Graphics]::FromImage($deskBmp)
$dg.Clear([System.Drawing.Color]::FromArgb(255, 30, 41, 59))

$dg.DrawString("CHUNG MINH ICON SHORTCUT DESKTOP (.LNK) (48x48 PX)", $headerFont2, $whiteBrush2, 20.0, 16.0)

$iconSz = 48
$curX = 60
$shortcutY = 64
foreach ($app in $apps) {
    $icoFile = Join-Path $repoRoot "branding\icons\$($app.Id).ico"
    $img48 = Get-IconFrameImage $icoFile $iconSz

    if ($img48 -ne $null) {
        $dg.DrawImage($img48, ($curX + 16), $shortcutY, $iconSz, $iconSz)
        $img48.Dispose()
    }

    $arrowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(230, 255, 255, 255))
    $dg.FillRectangle($arrowBrush, ($curX + 16), ($shortcutY + 36), 12, 12)
    $arrowBrush.Dispose()

    $format = [System.Drawing.StringFormat]::new()
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $textRect = [System.Drawing.RectangleF]::new($curX, ($shortcutY + 54), 80.0, 36.0)
    $dg.DrawString($app.Name, $smFont2, $whiteBrush2, $textRect, $format)
    $format.Dispose()

    $curX += 200
}

$deskPath = Join-Path $tempProofDir "proof-desktop-shortcuts.png"
$deskBmp.Save($deskPath, [System.Drawing.Imaging.ImageFormat]::Png)
$deskBmp.Dispose(); $dg.Dispose()
Write-Host "Saved Desktop Shortcuts proof: $deskPath"

$headerFont2.Dispose(); $smFont2.Dispose(); $whiteBrush2.Dispose()
Write-Host "All context proof images generated successfully."
