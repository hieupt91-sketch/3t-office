# Đọc lại bằng PowerPoint 2016 thật (ẩn, chỉ đọc): cách chuyển trang khi chiếu. AdvanceMode: 1 = thủ công (ppSlideShowManualAdvance), 2 = theo thời gian đã đặt (ppSlideShowUseSlideTimings).
param([string]$Path = "E:\VNOffice-profiles\claude-slidetrans\use_timings.pptx")
$ErrorActionPreference = "Stop"
$p = New-Object -ComObject PowerPoint.Application
try {
  $d = $p.Presentations.Open($Path, -1, 0, 0)
  [ordered]@{ advanceMode = $d.SlideShowSettings.AdvanceMode; loopUntilStopped = $d.SlideShowSettings.LoopUntilStopped; showNarration = $d.SlideShowSettings.ShowWithNarration } | ConvertTo-Json
  $d.Close()
} finally {
  $p.Quit()
}
