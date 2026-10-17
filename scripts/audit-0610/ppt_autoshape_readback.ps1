# Đọc lại AutoShapeType của từng hình trang 1 bằng PowerPoint thật (ẩn, chỉ đọc): 9=elip, 92=sao 5 cánh, 33=mũi tên phải, 21=trái tim.
param([string]$Path)
$app = New-Object -ComObject PowerPoint.Application
try { $p = $app.Presentations.Open($Path, -1, 0, 0)
 foreach($sh in $p.Slides(1).Shapes){ if($sh.Type -eq 1){ "{0}: autoShapeType={1}" -f $sh.Name,$sh.AutoShapeType } }
 $p.Close() } finally { $app.Quit() }

