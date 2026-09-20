Add-Type -AssemblyName System.Drawing

$root = [System.IO.Path]::GetFullPath(".")
$outDir = Join-Path $root "docs\screenshots\r11"

function Crop-Image {
    param(
        [string]$srcPath,
        [int]$x, [int]$y, [int]$w, [int]$h,
        [string]$dstPath
    )
    if (!(Test-Path $srcPath)) {
        Write-Warning "Source not found: $srcPath"
        return
    }
    $src = [System.Drawing.Bitmap]::FromFile($srcPath)
    $w = [Math]::Min($w, $src.Width - $x)
    $h = [Math]::Min($h, $src.Height - $y)
    if ($w -le 0 -or $h -le 0) {
        $src.Dispose()
        return
    }
    $rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.DrawImage($src, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $src.Dispose()
    $bmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Saved crop: $([System.IO.Path]::GetFileName($dstPath))"
}

# --- 1. lan04 Sheet 1 (Phụ kiện) ---
Crop-Image (Join-Path $outDir "visual_excel_orig_lan04_s1.png") 10 100 1100 450 (Join-Path $outDir "crop_r11_lan04_s1_excel.png")
Crop-Image (Join-Path $outDir "visual_excel_rt_lan04_s1.png")   10 100 1100 450 (Join-Path $outDir "crop_r11_lan04_s1_rt.png")
Crop-Image (Join-Path $outDir "visual_vnsheet_lan04_s1.png")    10 240 1100 450 (Join-Path $outDir "crop_r11_lan04_s1_vnsheet.png")

# --- 2. lan07 Sheet 1 (D1) ---
Crop-Image (Join-Path $outDir "visual_excel_orig_lan07_s1.png") 10 100 1100 450 (Join-Path $outDir "crop_r11_lan07_s1_excel.png")
Crop-Image (Join-Path $outDir "visual_excel_rt_lan07_s1.png")   10 100 1100 450 (Join-Path $outDir "crop_r11_lan07_s1_rt.png")
Crop-Image (Join-Path $outDir "visual_vnsheet_lan07_s1.png")    10 240 1100 450 (Join-Path $outDir "crop_r11_lan07_s1_vnsheet.png")

# --- 3. lan08 Sheet 1 (BANG GIA MANHINH) ---
Crop-Image (Join-Path $outDir "visual_excel_orig_lan08_s1.png") 10 100 1100 450 (Join-Path $outDir "crop_r11_lan08_s1_excel.png")
Crop-Image (Join-Path $outDir "visual_excel_rt_lan08_s1.png")   10 100 1100 450 (Join-Path $outDir "crop_r11_lan08_s1_rt.png")
Crop-Image (Join-Path $outDir "visual_vnsheet_lan08_s1.png")    10 240 1100 450 (Join-Path $outDir "crop_r11_lan08_s1_vnsheet.png")

# --- 4. lan10 Sheet 1 (Thông báo) & Sheet 2 (Khóa điện tử) ---
Crop-Image (Join-Path $outDir "visual_excel_orig_lan10_s1.png") 10 100 1100 450 (Join-Path $outDir "crop_r11_lan10_s1_excel.png")
Crop-Image (Join-Path $outDir "visual_vnsheet_lan10_s1.png")    10 240 1100 450 (Join-Path $outDir "crop_r11_lan10_s1_vnsheet.png")
Crop-Image (Join-Path $outDir "visual_excel_orig_lan10_s2.png") 10 100 1100 450 (Join-Path $outDir "crop_r11_lan10_s2_excel.png")
Crop-Image (Join-Path $outDir "visual_vnsheet_lan10_s2.png")    10 240 1100 450 (Join-Path $outDir "crop_r11_lan10_s2_vnsheet.png")

# --- 5. lan13 Sheet 1 (D1) ---
Crop-Image (Join-Path $outDir "visual_excel_orig_lan13_s1.png") 10 100 1100 450 (Join-Path $outDir "crop_r11_lan13_s1_excel.png")
Crop-Image (Join-Path $outDir "visual_excel_rt_lan13_s1.png")   10 100 1100 450 (Join-Path $outDir "crop_r11_lan13_s1_rt.png")
Crop-Image (Join-Path $outDir "visual_vnsheet_lan13_s1.png")    10 240 1100 450 (Join-Path $outDir "crop_r11_lan13_s1_vnsheet.png")

# --- 6. lan16 Sheet 1 (Thông báo SP mới) & Sheet 4 (Camera IP) ---
Crop-Image (Join-Path $outDir "visual_excel_orig_lan16_s1.png") 10 100 1100 450 (Join-Path $outDir "crop_r11_lan16_s1_excel.png")
Crop-Image (Join-Path $outDir "visual_vnsheet_lan16_s1.png")    10 240 1100 450 (Join-Path $outDir "crop_r11_lan16_s1_vnsheet.png")
Crop-Image (Join-Path $outDir "visual_excel_orig_lan16_s3.png") 10 100 1100 450 (Join-Path $outDir "crop_r11_lan16_s4_excel.png")
Crop-Image (Join-Path $outDir "visual_vnsheet_lan16_s4.png")    10 240 1100 450 (Join-Path $outDir "crop_r11_lan16_s4_vnsheet.png")

Write-Host "New workbooks crops generated."
