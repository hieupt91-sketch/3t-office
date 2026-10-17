# Đọc lại từng đoạn chữ (Runs) của hình đầu trang 1 bằng PowerPoint thật (ẩn, chỉ đọc): phông, cỡ, đậm, màu, gạch chân, chỉ số trên/dưới.
param([string]$Path)
$app = New-Object -ComObject PowerPoint.Application
try { $p = $app.Presentations.Open($Path, -1, 0, 0)
 $sh = $p.Slides(1).Shapes(1)
 "text=" + $sh.TextFrame.TextRange.Text.Length + " runs=" + $sh.TextFrame.TextRange.Runs().Count
 foreach($r in $sh.TextFrame.TextRange.Runs()){ $f=$r.Font; "run '{0}': name={1} size={2} bold={3} rgb={4} ul={5} base={6}" -f $r.Text,$f.Name,$f.Size,$f.Bold,$f.Color.RGB,$f.Underline,$f.BaselineOffset }
 $p.Close() } finally { $app.Quit() }

