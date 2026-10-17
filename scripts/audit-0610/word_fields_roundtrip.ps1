param([string]$Mode = "make", [string]$Path = "E:\VNOffice-profiles\claude-wordpar\fields_src.docx")
# make: tạo tài liệu có trường REF/DATE/PAGE, tab, bookmark bằng Word COM ẩn. read: đếm trường/tab/bookmark mỗi đoạn.
$w = New-Object -ComObject Word.Application
try {
  $w.Visible = $false; $w.DisplayAlerts = 0
  if ($Mode -eq "make") {
    $d = $w.Documents.Add()
    $sel = $w.Selection
    $sel.TypeText("Muc mot tieu de quan trong"); $sel.TypeParagraph()
    $br = $d.Paragraphs.Item(1).Range; $br.MoveEnd(1, -1) | Out-Null; $d.Bookmarks.Add("MucMot", $br) | Out-Null
    $sel.TypeText("Xem lai noi dung o muc "); $d.Fields.Add($sel.Range, -1, 'REF MucMot \h', $false) | Out-Null
    $sel.EndKey(5) | Out-Null; $sel.TypeText(" de biet them chi tiet."); $sel.TypeParagraph()
    $sel.TypeText("Ngay lap bao cao: "); $d.Fields.Add($sel.Range, 31) | Out-Null
    $sel.EndKey(5) | Out-Null; $sel.TypeText(" theo quy dinh hien hanh."); $sel.TypeParagraph()
    $sel.TypeText("Ten hang" + [char]9 + "So luong" + [char]9 + "Don gia ghi chu dai"); $sel.TypeParagraph()
    $sel.TypeText("Trang so "); $d.Fields.Add($sel.Range, 33) | Out-Null
    $sel.EndKey(5) | Out-Null; $sel.TypeText(" tren tong so trang cua tai lieu nay."); $sel.TypeParagraph()
    $d.SaveAs2($Path, 16); $d.Close(0)
    "made $Path"
  } else {
    $d = $w.Documents.Open($Path, $false, $true)
    $i = 0
    foreach ($p in $d.Paragraphs) {
      $i++
      $tabs = ([regex]::Matches($p.Range.Text, "`t")).Count
      "{0}: fields={1} tabs={2} bookmarks={3} text={4}" -f $i, $p.Range.Fields.Count, $tabs, $p.Range.Bookmarks.Count, $p.Range.Text.Trim()
    }
    $d.Close(0)
  }
} finally { $w.Quit() }
