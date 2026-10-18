# Đọc lại bằng Word 2016 thật (ẩn, chỉ đọc) tệp do tests/live/cdp/writer-underline-styles.desktop.mjs lưu ra.
# Mã Font.Underline: 0 không, 1 đơn, 3 đôi, 4 chấm, 6 đậm, 7 gạch ngang, 11 lượn sóng.
param([string]$Path = "E:\VNOffice-profiles\claude-wordpar\underline_styles.docx")
$ErrorActionPreference = "Stop"
$w = New-Object -ComObject Word.Application
try {
  $w.Visible = $false
  $w.DisplayAlerts = 0
  $d = $w.Documents.Open($Path, $false, $true)
  $row = [ordered]@{}
  foreach ($word in "Aaa", "Bbb", "Ccc", "Ddd", "Eee", "Thuong") {
    $rr = $d.Range()
    if ($rr.Find.Execute($word)) { $row[$word] = $rr.Font.Underline } else { $row[$word] = "KHONG_TIM_THAY" }
  }
  $d.Close(0)
  $row | ConvertTo-Json
} finally {
  $w.Quit()
}
