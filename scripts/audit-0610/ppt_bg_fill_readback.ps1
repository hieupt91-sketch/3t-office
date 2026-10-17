# Đọc lại kiểu nền từng trang (màu đơn=1, chuyển sắc=3, hình ảnh=6) bằng PowerPoint thật (ẩn, chỉ đọc).
param([string]$Path)
$app = New-Object -ComObject PowerPoint.Application
try { $p = $app.Presentations.Open($Path, -1, 0, 0)
 foreach($s in $p.Slides){ $f=$s.Background.Fill; "slide {0}: followMaster={1} fillType={2} fore={3}" -f $s.SlideIndex,$s.FollowMasterBackground,$f.Type,$f.ForeColor.RGB }
 $p.Close() } finally { $app.Quit() }

