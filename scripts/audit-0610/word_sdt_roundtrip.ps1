param([string]$Mode = "make", [string]$Path = "E:\VNOffice-profiles\claude-wordpar\sdt_src.docx")
# make: tài liệu có content control (văn bản, danh sách thả) trong đoạn. read: đếm content control mỗi đoạn.
$w = New-Object -ComObject Word.Application
try {
  $w.Visible = $false; $w.DisplayAlerts = 0
  if ($Mode -eq "make") {
    $d = $w.Documents.Add()
    $d.Content.Text = "Ho va ten nguoi nop don: [HOTEN] xin gui don de nghi xem xet." + [char]13 + "Loai don: [LOAI] trong thoi gian ba ngay lien tiep." + [char]13 + "Doan van binh thuong khong co content control de doi chung ket qua."
    $r = $d.Content; $f1 = $r.Find; if ($f1.Execute("[HOTEN]")) { $r.Text = "Nguyen Van A"; $cc = $d.ContentControls.Add(1, $r); $cc.Title = "Ho ten" }
    $r = $d.Content; $f2 = $r.Find; if ($f2.Execute("[LOAI]")) { $r.Text = "Nghi phep"; $dd = $d.ContentControls.Add(4, $r); $dd.Title = "Loai"; $dd.DropdownListEntries.Add("Nghi phep") | Out-Null; $dd.DropdownListEntries.Add("Nghi om") | Out-Null }    $d.SaveAs2($Path, 16); $d.Close(0)
    "made $Path"
  } else {
    $d = $w.Documents.Open($Path, $false, $true)
    $i = 0
    foreach ($p in $d.Paragraphs) { $i++; "{0}: cc={1} text={2}" -f $i, $p.Range.ContentControls.Count, $p.Range.Text.Trim() }
    "total cc=" + $d.ContentControls.Count
    $d.Close(0)
  }
} finally { $w.Quit() }
