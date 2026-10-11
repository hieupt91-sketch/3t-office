Add-Type -AssemblyName System.Drawing

$root = [System.IO.Path]::GetFullPath(".")
$outDir = Join-Path $root "docs\screenshots"

function Crop-Image {
    param(
        [string]$srcPath,
        [int]$x, [int]$y, [int]$w, [int]$h,
        [string]$dstPath
    )
    $src = [System.Drawing.Bitmap]::FromFile($srcPath)
    # Ensure crop rectangle is within image bounds
    $w = [Math]::Min($w, $src.Width - $x)
    $h = [Math]::Min($h, $src.Height - $y)
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

# 1. lan02 Sheet 1: Truncated text in column A ("Đơn vị/Ng", "Tại Ngân ")
Crop-Image (Join-Path $outDir "visual_vnsheet_lan02_s1.png") 10 320 450 250 (Join-Path $outDir "crop_lan02_s1_truncated_text.png")

# 2. lan02 Sheet 1: Broken image alt placeholder obscuring text
Crop-Image (Join-Path $outDir "visual_vnsheet_lan02_s1.png") 250 470 500 180 (Join-Path $outDir "crop_lan02_s1_broken_image_alt.png")

# 3. lan02 Sheet 2: Cell A1:F1 unexpected green fill and border
Crop-Image (Join-Path $outDir "visual_vnsheet_lan02_s2.png") 10 240 820 120 (Join-Path $outDir "crop_lan02_s2_a1f1_green_fill.png")

# 4. lan02 Sheet 2: Rows 10-13 missing yellow background fill
Crop-Image (Join-Path $outDir "visual_vnsheet_lan02_s2.png") 10 500 500 200 (Join-Path $outDir "crop_lan02_s2_missing_yellow_fill.png")

# 5. lan03 Sheet 1: Row 1 "SẢN PHẨM MỚI" gray fill vs Excel blue fill
Crop-Image (Join-Path $outDir "visual_vnsheet_lan03_s1.png") 10 240 1000 120 (Join-Path $outDir "crop_lan03_s1_row1_blue_vs_gray.png")

# 6. lan12 Sheet 1: Duplicated header rows injected from sheet 2
Crop-Image (Join-Path $outDir "visual_vnsheet_lan12_s1.png") 10 240 1000 350 (Join-Path $outDir "crop_lan12_s1_repeated_header_rows.png")

# 7. lan26 Sheet 1: Crash in renderImages causing table truncation below row 5
Crop-Image (Join-Path $outDir "visual_vnsheet_lan26_s1.png") 10 550 1100 350 (Join-Path $outDir "crop_lan26_s1_uncaught_error_crash.png")

# 8. lan28 Sheet 1: AutoFilter dropdown arrows truncating column header F
Crop-Image (Join-Path $outDir "visual_vnsheet_lan28_s1.png") 10 240 900 120 (Join-Path $outDir "crop_lan28_s1_autofilter_arrows_truncation.png")

# 9. d07 Page 1: Premature page break in VN Writer cutting off Điều 1 & 2
Crop-Image (Join-Path $outDir "visual_vnwriter_d07_p1.png") 300 750 820 200 (Join-Path $outDir "crop_d07_p1_premature_pagebreak.png")

# 10. d09 Page 1: Bullet list item 3 pushed off page 1
Crop-Image (Join-Path $outDir "visual_vnwriter_d09_p1.png") 300 750 820 200 (Join-Path $outDir "crop_d09_p1_hyphen_bullets_spacing.png")

# 11. d13 Page 2: Text overlap / collision on bullet item
Crop-Image (Join-Path $outDir "visual_vnwriter_d13_p2.png") 300 680 820 200 (Join-Path $outDir "crop_d13_p2_text_overlap.png")

Write-Host "All crops created successfully."
