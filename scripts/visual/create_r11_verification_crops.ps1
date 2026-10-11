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

# --- L1-L9 VERIFICATION CROPS ---

# 1. L1: lan26 S1 row 5-15 (Crash check)
Crop-Image (Join-Path $outDir "visual_vnsheet_lan26_s1.png") 10 320 1100 450 (Join-Path $outDir "crop_r11_lan26_s1_l1_fixed.png")
Crop-Image (Join-Path $outDir "visual_excel_orig_lan26_s1.png") 10 180 1100 450 (Join-Path $outDir "crop_r11_lan26_s1_excel_orig.png")

# 2. L2: lan12 S1 rows 1-5 (Duplicated header check)
Crop-Image (Join-Path $outDir "visual_vnsheet_lan12_s1.png") 10 240 1050 350 (Join-Path $outDir "crop_r11_lan12_s1_l2_header.png")
Crop-Image (Join-Path $outDir "visual_excel_orig_lan12_s1.png") 10 100 1050 350 (Join-Path $outDir "crop_r11_lan12_s1_excel_header.png")

# 3. L3: lan02 S1 column A text overflow (A4, A7, A19, A20)
Crop-Image (Join-Path $outDir "visual_vnsheet_lan02_s1.png") 10 320 500 250 (Join-Path $outDir "crop_r11_lan02_s1_l3_overflow.png")
Crop-Image (Join-Path $outDir "visual_excel_orig_lan02_s1.png") 10 180 500 250 (Join-Path $outDir "crop_r11_lan02_s1_excel_overflow.png")

# 4. L3b & L9: lan28 S1 row 1 header and F1 (AutoFilter and truncation check)
Crop-Image (Join-Path $outDir "visual_vnsheet_lan28_s1.png") 10 240 950 150 (Join-Path $outDir "crop_r11_lan28_s1_l9_filter.png")
Crop-Image (Join-Path $outDir "visual_excel_orig_lan28_s1.png") 10 100 950 150 (Join-Path $outDir "crop_r11_lan28_s1_excel_header.png")

# 5. L4: lan02 S1 H10:H11 checkbox icon
Crop-Image (Join-Path $outDir "visual_vnsheet_lan02_s1.png") 250 470 500 180 (Join-Path $outDir "crop_r11_lan02_s1_l4_checkbox.png")
Crop-Image (Join-Path $outDir "visual_excel_orig_lan02_s1.png") 250 330 500 180 (Join-Path $outDir "crop_r11_lan02_s1_excel_checkbox.png")

# 6. L5a & L5b: lan02 S2 A1:F1 and A10:B13 fill color
Crop-Image (Join-Path $outDir "visual_vnsheet_lan02_s2.png") 10 240 850 120 (Join-Path $outDir "crop_r11_lan02_s2_l5_a1f1.png")
Crop-Image (Join-Path $outDir "visual_vnsheet_lan02_s2.png") 10 480 600 220 (Join-Path $outDir "crop_r11_lan02_s2_l5_yellow.png")
Crop-Image (Join-Path $outDir "visual_excel_orig_lan02_s2.png") 10 100 850 120 (Join-Path $outDir "crop_r11_lan02_s2_excel_a1f1.png")
Crop-Image (Join-Path $outDir "visual_excel_orig_lan02_s2.png") 10 340 600 220 (Join-Path $outDir "crop_r11_lan02_s2_excel_yellow.png")

# 7. L5c: lan03 S1 row 1 header color (blue vs gray)
Crop-Image (Join-Path $outDir "visual_vnsheet_lan03_s1.png") 10 240 1050 120 (Join-Path $outDir "crop_r11_lan03_s1_l5_row1.png")
Crop-Image (Join-Path $outDir "visual_excel_orig_lan03_s1.png") 10 100 1050 120 (Join-Path $outDir "crop_r11_lan03_s1_excel_row1.png")

# 8. L6: d13 Page 2 Section 2.1 (double text check)
Crop-Image (Join-Path $outDir "visual_vnwriter_d13_p2.png") 300 220 850 250 (Join-Path $outDir "crop_r11_d13_p2_l6_doubletext.png")
Crop-Image (Join-Path $outDir "visual_word_d13_p2.png") 300 150 850 250 (Join-Path $outDir "crop_r11_d13_p2_word.png")

# 9. L8: d09 Page 1 Section 1 & 2 (bullet hyphen check)
Crop-Image (Join-Path $outDir "visual_vnwriter_d09_p1.png") 300 450 850 350 (Join-Path $outDir "crop_r11_d09_p1_l8_bullet.png")
Crop-Image (Join-Path $outDir "visual_word_d09_p1.png") 300 350 850 350 (Join-Path $outDir "crop_r11_d09_p1_word_bullet.png")

Write-Host "L1-L9 crops completed."
