# Tạo bộ slide thử chuyển tiếp bằng PowerPoint 2016 thật (-Mode make) hoặc đọc lại EntryEffect/Duration/AdvanceOnClick/AdvanceTime (-Mode read -Path ...).
# PowerPoint chạy ẩn, tự đóng; không SendKeys.
param([string]$Mode="make",[string]$Path="E:\VNOffice-profiles\claude-slidetrans\trans_src.pptx")
$ErrorActionPreference="Stop"
$app=New-Object -ComObject PowerPoint.Application
try {
 if($Mode -eq "make"){
  $p=$app.Presentations.Add(0)
  $cfg=@(@(257,0.5,$true,$false,0),@(3849,1.0,$true,$true,3),@(2817,0.7,$false,$true,5),@(1281,0.5,$true,$true,2),@(3585,1.5,$true,$false,0),@(1537,0.5,$false,$false,0))
  $i=1
  foreach($c in $cfg){ $s=$p.Slides.Add($i,12); $t=$s.SlideShowTransition; $t.EntryEffect=$c[0]; try{$t.Duration=$c[1]}catch{}; $t.AdvanceOnClick=[int]$c[2]; $t.AdvanceOnTime=[int]$c[3]; if($c[3]){$t.AdvanceTime=$c[4]}; $i++ }
  $p.SaveAs($Path,24); $p.Close()
  "made"
 } else {
  $p=$app.Presentations.Open($Path,-1,0,0)
  foreach($s in $p.Slides){ $t=$s.SlideShowTransition; "{0}: effect={1} dur={2} click={3} timeOn={4} time={5} hidden={6}" -f $s.SlideIndex,$t.EntryEffect,$t.Duration,$t.AdvanceOnClick,$t.AdvanceOnTime,$t.AdvanceTime,$t.Hidden }
  $p.Close()
 }
} finally { $app.Quit() }

