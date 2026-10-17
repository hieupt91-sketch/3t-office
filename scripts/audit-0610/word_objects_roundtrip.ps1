param([string]$Mode="make",[string]$Path="E:\VNOffice-profiles\claude-wordpar\objects_src.docx")
$ErrorActionPreference="Stop"
$w = New-Object -ComObject Word.Application
try {
  $w.Visible = $false
  $w.DisplayAlerts = 0
  if ($Mode -eq "make") {
    $d = $w.Documents.Add()
    # Tạo các đoạn văn bản chuẩn
    $items = @(
      "P01 Tieu de van ban mau objects",
      "P02 Doan truoc bang se duoc sua de do",
      "P03 Cho chua bang",
      "P04 Doan ket thuc co truong: "
    )
    $first = $true
    foreach ($t in $items) {
      if (-not $first) { $d.Content.InsertParagraphAfter() }
      $first = $false
      $d.Paragraphs($d.Paragraphs.Count).Range.InsertBefore($t)
    }
    
    # 1. Chú thích cuối trang (Footnote) trên đoạn 1
    $fn = $d.Footnotes.Add($d.Paragraphs(1).Range.Characters(3), [Type]::Missing, "Chu thich chan trang so 1")
    
    # 2. Đầu trang và chân trang (Header & Footer)
    $header = $d.Sections(1).Headers(1).Range
    $header.Text = "Mau Dau Trang VN Office"
    $footer = $d.Sections(1).Footers(1).Range
    $footer.Text = "Trang "
    $footer.Collapse(0) # wdCollapseEnd
    $d.Fields.Add($footer, 33) | Out-Null # wdFieldPage = 33
    
    # 3. Bảng (Table): 3 hàng, 3 cột tại đoạn 3
    $tbl = $d.Tables.Add($d.Paragraphs(3).Range, 3, 3)
    $tbl.Borders.Enable = 1
    # Độ rộng cột
    $tbl.Columns(1).Width = 100
    $tbl.Columns(2).Width = 150
    $tbl.Columns(3).Width = 200
    
    # Điền nội dung
    $tbl.Cell(1,1).Range.Text = "R1C1"
    $tbl.Cell(1,2).Range.Text = "R1C2"
    $tbl.Cell(1,3).Range.Text = "R1C3"
    $tbl.Cell(2,1).Range.Text = "R2C1"
    $tbl.Cell(2,2).Range.Text = "R2C2"
    $tbl.Cell(2,3).Range.Text = "R2C3"
    $tbl.Cell(3,1).Range.Text = "R3C1"
    $tbl.Cell(3,2).Range.Text = "R3C2"
    $tbl.Cell(3,3).Range.Text = "R3C3"
    
    # Tô nền ô (Cell Shading)
    $tbl.Cell(1,1).Shading.BackgroundPatternColor = 16776960 # Yellow
    $tbl.Cell(2,2).Shading.BackgroundPatternColor = 16711680 # Blue
    
    # Viền ô riêng biệt (Cell Borders)
    $tbl.Cell(2,2).Borders.Item(-3).LineStyle = 1 # wdBorderBottom
    $tbl.Cell(2,2).Borders.Item(-3).LineWidth = 18 # 2.25 pt
    $tbl.Cell(2,2).Borders.Item(-3).Color = 255 # Red
    
    # Ô gộp ngang (Horizontal merge: Row 1, Col 2 & 3)
    $tbl.Cell(1,2).Merge($tbl.Cell(1,3))
    
    # 4. Thêm ảnh (Picture)
    $imgPath = "E:\VNOffice-agy-writer1\branding\3t\3t-mark.png"
    if (Test-Path $imgPath) {
      $d.Content.InsertParagraphAfter()
      $shape = $d.InlineShapes.AddPicture($imgPath, $false, $true, $d.Paragraphs($d.Paragraphs.Count).Range)
      $shape.Width = 120
      $shape.Height = 80
    }
    
    # 5. Thêm trường vào đoạn kết thúc
    $pEnd = $d.Paragraphs.Item(4).Range
    $pEnd.Collapse(0)
    $d.Fields.Add($pEnd, 25) | Out-Null # wdFieldDate = 25
    
    $d.SaveAs2($Path, 16)
    $d.Close(0)
    "made $Path"
  } else {
    $d = $w.Documents.Open($Path, $false, $true)
    $res = @{}
    
    # Đoán số đoạn
    $res["paras_count"] = $d.Paragraphs.Count
    
    # 1. Bảng
    $res["tables_count"] = $d.Tables.Count
    if ($d.Tables.Count -ge 1) {
      $t = $d.Tables(1)
      $res["tbl_rows"] = $t.Rows.Count
      $res["tbl_cols"] = $t.Columns.Count
      try {
        $r2w = @()
        for ($c = 1; $c -le $t.Rows(2).Cells.Count; $c++) {
          $r2w += [math]::Round($t.Cell(2, $c).Width, 1)
        }
        $res["r2_cell_widths"] = $r2w -join ","
      } catch {
        $res["r2_cell_widths"] = "err"
      }
      # Shading
      try { $res["c11_shd"] = $t.Cell(1,1).Shading.BackgroundPatternColor } catch { $res["c11_shd"] = "err" }
      try { $res["c22_shd"] = $t.Cell(2,2).Shading.BackgroundPatternColor } catch { $res["c22_shd"] = "err" }
      # Border
      try {
        $bdr = $t.Cell(2,2).Borders.Item(-3) # bottom
        $res["c22_bdr_bottom"] = "{0}:{1}:{2}" -f $bdr.LineStyle, $bdr.LineWidth, $bdr.Color
      } catch {
        $res["c22_bdr_bottom"] = "err"
      }
      # Ô gộp hàng 1: có 2 ô thay vì 3
      try {
        $res["r1_cells_count"] = $t.Rows(1).Cells.Count
      } catch {
        $res["r1_cells_count"] = "err"
      }
    }
    
    # 2. Đầu trang & Chân trang
    try {
      $sec = $d.Sections(1)
      $res["hdr_text"] = $sec.Headers(1).Range.Text.Trim()
      $res["ftr_text"] = $sec.Footers(1).Range.Text.Trim()
      $res["ftr_fields"] = $sec.Footers(1).Range.Fields.Count
    } catch {
      $res["hdr_text"] = "err"
      $res["ftr_text"] = "err"
    }
    
    # 3. Chú thích cuối trang (Footnotes)
    $res["footnotes_count"] = $d.Footnotes.Count
    if ($d.Footnotes.Count -ge 1) {
      $res["fn1_text"] = $d.Footnotes(1).Range.Text.Trim()
    }
    
    # 4. Ảnh (Images)
    $res["inline_shapes_count"] = $d.InlineShapes.Count
    if ($d.InlineShapes.Count -ge 1) {
      $s = $d.InlineShapes(1)
      $res["img1_size"] = "{0}x{1}" -f [math]::Round($s.Width, 1), [math]::Round($s.Height, 1)
    }
    
    # 5. Trường (Fields trong document body)
    $res["doc_fields_count"] = $d.Fields.Count
    
    # Format output
    foreach ($k in ($res.Keys | Sort-Object)) {
      "{0} = {1}" -f $k, $res[$k]
    }
    $d.Close(0)
  }
} finally {
  $w.Quit()
  [System.Runtime.Interopservices.Marshal]::ReleaseComObject($w) | Out-Null
}
