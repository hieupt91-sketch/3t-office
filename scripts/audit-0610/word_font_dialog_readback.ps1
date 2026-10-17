# Đọc lại bằng Word 2016 thật (ẩn, chỉ đọc) tệp do tests/live/cdp/writer-font-dialog-effects.desktop.mjs lưu ra.
# Tự mở Word riêng và chỉ đóng chính tiến trình đó; không đặt Visible; không SendKeys.
param([string]$Path = "E:\VNOffice-profiles\claude-wordpar\fontdlg_effects.docx")
$ErrorActionPreference = "Stop"
$w = New-Object -ComObject Word.Application
try {
  $w.Visible = $false
  $w.DisplayAlerts = 0
  $d = $w.Documents.Open($Path, $false, $true)
  $r = $d.Range()
  $f = $r.Find
  $row = [ordered]@{}
  foreach ($word in "Beta", "Delta", "Dau", "Gamma") {
    $rr = $d.Range()
    if ($rr.Find.Execute($word)) {
      $row[$word] = [ordered]@{
        doubleStrike = $rr.Font.DoubleStrikeThrough
        strike = $rr.Font.StrikeThrough
        underline = $rr.Font.Underline
        underlineColor = $rr.Font.UnderlineColor
        smallCaps = $rr.Font.SmallCaps
        spacing = $rr.Font.Spacing
        position = $rr.Font.Position
        hidden = $rr.Font.Hidden
      }
    } else { $row[$word] = "KHONG_TIM_THAY" }
  }
  # Chữ ẩn: Find của Word không thấy chữ ẩn, nên kiểm bằng nội dung document.xml (w:vanish ngay trước chữ "Cuoi")
  $d.Close(0)
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $zip = [IO.Compression.ZipFile]::OpenRead($Path)
  $reader = New-Object IO.StreamReader($zip.GetEntry("word/document.xml").Open())
  $xml = $reader.ReadToEnd(); $reader.Close(); $zip.Dispose()
  $row["hiddenCuoiInXml"] = [bool]($xml -match '<w:vanish/>(?:(?!</w:r>)[\s\S])*?Cuoi')
  $row["hiddenDeltaInXml"] = [bool]($xml -match '<w:vanish/>(?:(?!</w:r>)[\s\S])*?Delta')
  $row | ConvertTo-Json -Depth 4
} finally {
  $w.Quit()
}
