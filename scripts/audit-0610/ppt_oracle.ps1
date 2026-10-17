param(
    [string]$Out = 'docs/ppt-oracle-1710.json'
)

$ErrorActionPreference = 'Stop'

function Retry([scriptblock]$b) {
    $last = $null
    for ($k = 0; $k -lt 25; $k++) {
        try {
            return (& $b)
        } catch {
            $last = $_
            if ($_.Exception.Message -notmatch 'rejected|busy|RPC') { break }
            Start-Sleep -Milliseconds 700
        }
    }
    throw ("PowerPoint loi: " + $last.Exception.Message + " @ " + $b.ToString().Trim())
}

$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id)

$ppt = $null
for ($a = 0; $a -lt 30 -and -not $ppt; $a++) {
    try {
        $ppt = New-Object -ComObject PowerPoint.Application
    } catch {
        Start-Sleep -Milliseconds 700
    }
}
if (-not $ppt) { throw "Khong khoi dong duoc PowerPoint" }

$mine = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })
$results = @()

try {
    # Mở bản trình chiếu tạm thời trống (KHÔNG đặt Visible = $false)
    $pres = Retry { $ppt.Presentations.Add([Microsoft.Office.Core.MsoTriState]::msoFalse) }
    
    # 1. Bố cục slide (ppLayoutTitle = 1, ppLayoutText = 2)
    $s1 = Retry { $pres.Slides.Add(1, 1) }
    $layoutVal = Retry { $s1.Layout }
    $results += [pscustomobject]@{
        ten_phep_do = "1_bo_cuc_trang_chieu"
        thuoc_tinh = "Slide.Layout"
        gia_tri_doc = [int]$layoutVal
        y_nghia = "ppLayoutTitle (1=Title Slide, 2=Title and Content, 3=Two Content)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 2. Thêm slide mới
    $s2 = Retry { $pres.Slides.Add(2, 2) }
    $slideCount = Retry { $pres.Slides.Count }
    $results += [pscustomobject]@{
        ten_phep_do = "2_them_trang_chieu_moi"
        thuoc_tinh = "Slides.Count"
        gia_tri_doc = [int]$slideCount
        y_nghia = "So luong slide sau khi them slide thu hai = 2"
        thoi_diem = (Get-Date -Format "o")
    }

    # 3. Nhân đôi slide (Duplicate)
    $dup = Retry { $s2.Duplicate() }
    $dupCount = Retry { $pres.Slides.Count }
    $results += [pscustomobject]@{
        ten_phep_do = "3_nhan_doi_trang_chieu"
        thuoc_tinh = "Slide.Duplicate / Slides.Count"
        gia_tri_doc = [int]$dupCount
        y_nghia = "So luong slide sau khi nhan doi slide 2 = 3"
        thoi_diem = (Get-Date -Format "o")
    }

    # 4. Di chuyển / sắp xếp thứ tự slide (MoveTo)
    Retry { $dup.MoveTo(1) } | Out-Null
    $newIndex = Retry { $dup.SlideIndex }
    $results += [pscustomobject]@{
        ten_phep_do = "4_sap_xep_thu_tu_slide"
        thuoc_tinh = "Slide.SlideIndex sau MoveTo"
        gia_tri_doc = [int]$newIndex
        y_nghia = "Slide ban dau o vi tri 3 duoc chuyen len dau deck (SlideIndex = 1)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 5. Xóa slide (Delete)
    Retry { $dup.Delete() } | Out-Null
    $afterDelCount = Retry { $pres.Slides.Count }
    $results += [pscustomobject]@{
        ten_phep_do = "5_xoa_trang_chieu"
        thuoc_tinh = "Slides.Count sau Delete"
        gia_tri_doc = [int]$afterDelCount
        y_nghia = "So luong slide sau khi xoa slide = 2"
        thoi_diem = (Get-Date -Format "o")
    }

    # 6. Kích thước trang chiếu / Tỷ lệ màn hình (PageSetup SlideWidth x SlideHeight)
    $sWidth = Retry { $pres.PageSetup.SlideWidth }
    $sHeight = Retry { $pres.PageSetup.SlideHeight }
    $results += [pscustomobject]@{
        ten_phep_do = "6_kich_thuoc_va_ty_le_slide"
        thuoc_tinh = "PageSetup.SlideWidth x SlideHeight"
        gia_tri_doc = "$sWidth x $sHeight pt"
        y_nghia = "Kich thuoc mac dinh 16:9 Widescreen trong PowerPoint 2016 (960 x 540 pt / 13.33 x 7.5 in)"
        thoi_diem = (Get-Date -Format "o")
    }

    # 7. Hiệu ứng chuyển tiếp slide (SlideShowTransition EntryEffect và Duration)
    Retry { $s1.SlideShowTransition.EntryEffect = 3849 } | Out-Null # ppEffectFade = 3849
    Retry { $s1.SlideShowTransition.Duration = 0.5 } | Out-Null
    $transEffect = Retry { $s1.SlideShowTransition.EntryEffect }
    $transDur = Retry { $s1.SlideShowTransition.Duration }
    $results += [pscustomobject]@{
        ten_phep_do = "7_hieu_ung_chuyen_tiep"
        thuoc_tinh = "SlideShowTransition.EntryEffect / Duration"
        gia_tri_doc = "$transEffect / $transDur s"
        y_nghia = "ppEffectFade (3849) voi thoi luong 0.5 giay"
        thoi_diem = (Get-Date -Format "o")
    }

    # 8. Ẩn trang chiếu (SlideShowTransition.Hidden)
    Retry { $s1.SlideShowTransition.Hidden = -1 } | Out-Null # msoTrue = -1
    $hiddenVal = Retry { $s1.SlideShowTransition.Hidden }
    $results += [pscustomobject]@{
        ten_phep_do = "8_an_trang_chieu"
        thuoc_tinh = "SlideShowTransition.Hidden"
        gia_tri_doc = [int]$hiddenVal
        y_nghia = "msoTrue (-1): Slide duoc an khi trinh chieu"
        thoi_diem = (Get-Date -Format "o")
    }

    # 9. Ghi chú diễn giả (Speaker Notes trong NotesPage)
    $notesShape = Retry { $s1.NotesPage.Shapes.Placeholders.Item(2) }
    Retry { $notesShape.TextFrame.TextRange.Text = "Kiem tra ghi chu dien gia qua PowerPoint COM" } | Out-Null
    $notesReadback = Retry { $notesShape.TextFrame.TextRange.Text }
    $results += [pscustomobject]@{
        ten_phep_do = "9_ghi_chu_dien_gia"
        thuoc_tinh = "NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text"
        gia_tri_doc = [string]$notesReadback
        y_nghia = "Noi dung ghi chu dien gia trong phan notes master/slide"
        thoi_diem = (Get-Date -Format "o")
    }

    # 10. Bảng biểu (Shapes.AddTable: 3 hàng, 4 cột)
    $tableShape = Retry { $s1.Shapes.AddTable(3, 4, 100, 100, 400, 200) }
    $tRows = Retry { $tableShape.Table.Rows.Count }
    $tCols = Retry { $tableShape.Table.Columns.Count }
    $results += [pscustomobject]@{
        ten_phep_do = "10_bang_bieu_cau_truc"
        thuoc_tinh = "Table.Rows.Count / Table.Columns.Count"
        gia_tri_doc = "$tRows x $tCols"
        y_nghia = "Bang bieu 3 hang x 4 cot tren trang chieu"
        thoi_diem = (Get-Date -Format "o")
    }

    # 11. Hình khối cơ bản và màu nền (Shapes.AddShape msoShapeRectangle = 1)
    $rect = Retry { $s1.Shapes.AddShape(1, 50, 50, 120, 80) }
    Retry { $rect.Fill.ForeColor.RGB = 255 } | Out-Null # Red
    $shpType = Retry { $rect.Type }
    $shpRgb = Retry { $rect.Fill.ForeColor.RGB }
    $results += [pscustomobject]@{
        ten_phep_do = "11_hinh_khoi_co_ban_va_mau_to"
        thuoc_tinh = "Shape.Type / Fill.ForeColor.RGB"
        gia_tri_doc = "Type=$shpType, RGB=$shpRgb"
        y_nghia = "msoAutoShape (1) voi mau to do RGB 255"
        thoi_diem = (Get-Date -Format "o")
    }

    # 12. Nhóm đối tượng (Shapes.Range.Group -> msoGroup = 6)
    $rectB = Retry { $s1.Shapes.AddShape(1, 200, 50, 120, 80) }
    [string[]]$grpNames = @($rect.Name, $rectB.Name)
    $groupRange = $s1.Shapes.Range($grpNames)
    $grp = $groupRange.Group()
    $grpType = $grp.Type
    $grpCount = $grp.GroupItems.Count
    $results += [pscustomobject]@{
        ten_phep_do = "12_nhom_doi_tuong"
        thuoc_tinh = "Shape.Type / GroupItems.Count"
        gia_tri_doc = "Type=$grpType, Items=$grpCount"
        y_nghia = "msoGroup (6) chua 2 doi tuong thanh vien"
        thoi_diem = (Get-Date -Format "o")
    }

    # 13. Căn chỉnh đối tượng (Shapes.Range.Align)
    $shp1 = Retry { $s2.Shapes.AddShape(1, 40, 80, 100, 60) }
    $shp2 = Retry { $s2.Shapes.AddShape(1, 120, 180, 100, 60) }
    [string[]]$alignNames = @($shp1.Name, $shp2.Name)
    $alignRange = $s2.Shapes.Range($alignNames)
    $alignRange.Align(0, 0) | Out-Null # 0 = msoAlignLefts, 0 = relative to each other
    $left1 = Retry { $shp1.Left }
    $left2 = Retry { $shp2.Left }
    $results += [pscustomobject]@{
        ten_phep_do = "13_can_chinh_doi_tuong"
        thuoc_tinh = "Shape.Left sau khi Align Left"
        gia_tri_doc = "Left1=$left1, Left2=$left2 pt"
        y_nghia = "msoAlignLefts (0) can le trai cac doi tuong bang nhau"
        thoi_diem = (Get-Date -Format "o")
    }

    # 14. Hoạt ảnh đối tượng (TimeLine.MainSequence.AddEffect msoAnimEffectFade = 10)
    $animEffect = Retry { $s2.TimeLine.MainSequence.AddEffect($shp1, 10, 0, 1) } # 10=Fade, 0=None, 1=OnClick
    $effType = Retry { $animEffect.EffectType }
    $seqCount = Retry { $s2.TimeLine.MainSequence.Count }
    $results += [pscustomobject]@{
        ten_phep_do = "14_hoat_anh_doi_tuong"
        thuoc_tinh = "TimeLine.MainSequence.AddEffect / EffectType"
        gia_tri_doc = "EffectType=$effType, SeqCount=$seqCount"
        y_nghia = "msoAnimEffectFade (10) duoc kich hoat khi click"
        thoi_diem = (Get-Date -Format "o")
    }

    # 15. Áp dụng chủ đề thiết kế (Design.Name)
    $themeName = Retry { $s1.Design.Name }
    $results += [pscustomobject]@{
        ten_phep_do = "15_chu_de_thiet_ke"
        thuoc_tinh = "Slide.Design.Name"
        gia_tri_doc = [string]$themeName
        y_nghia = "Chu de mac dinh Office Theme gan vao slide"
        thoi_diem = (Get-Date -Format "o")
    }

    Retry { $pres.Close() } | Out-Null
} finally {
    try { $ppt.Quit() } catch {}
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
    foreach ($p in $mine) {
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
}

$results | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 $Out
Write-Host "Hoan tat do oracle PowerPoint: $($results.Count) phep do ghi vao $Out"
