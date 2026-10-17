param([string]$Path = "E:\VNOffice-profiles\claude-slidetrans\crop.pptx")
# Đọc lại cắt xén ảnh bằng PowerPoint thật (ẩn, chỉ đọc): CropLeft/Right/Top/Bottom (pt) và kích thước khung.
$app = New-Object -ComObject PowerPoint.Application
try {
  $p = $app.Presentations.Open($Path, -1, 0, 0)
  foreach ($s in $p.Slides) {
    foreach ($sh in $s.Shapes) {
      if ($sh.Type -eq 13) {
        $pf = $sh.PictureFormat
        "slide {0}: pic w={1:N1} h={2:N1} cropL={3:N1} cropR={4:N1} cropT={5:N1} cropB={6:N1}" -f $s.SlideIndex, $sh.Width, $sh.Height, $pf.CropLeft, $pf.CropRight, $pf.CropTop, $pf.CropBottom
      }
    }
  }
  $p.Close()
} finally { $app.Quit() }
