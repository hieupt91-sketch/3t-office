param([string]$Dir, [int]$Count)
# So kiểu đoạn, số đoạn, số trang giữa bản gốc (srcN.docx) và bản đã sửa-lưu (editedN.docx) bằng Word COM (ẩn).
$w = New-Object -ComObject Word.Application
try {
  $w.Visible = $false; $w.DisplayAlerts = 0
  for ($k = 0; $k -lt $Count; $k++) {
    $src = Join-Path $Dir "src$k.docx"; $out = Join-Path $Dir "edited$k.docx"
    if (-not (Test-Path $out)) { "$k : thiếu bản lưu"; continue }
    $a = $w.Documents.Open($src, $false, $true); $b = $w.Documents.Open($out, $false, $true)
    $pa = $a.Paragraphs.Count; $pb = $b.Paragraphs.Count
    $pages = "{0}->{1}" -f $a.ComputeStatistics(2), $b.ComputeStatistics(2)
    $diff = 0; $bodyText = 0; $n = [Math]::Min($pa, $pb)
    for ($i = 1; $i -le $n; $i++) {
      $sa = $a.Paragraphs.Item($i).Style.NameLocal; $sb = $b.Paragraphs.Item($i).Style.NameLocal
      if ($sa -ne $sb) { $diff++; if ($diff -le 12) { "   p$i : $sa -> $sb | " + $a.Paragraphs.Item($i).Range.Text.Substring(0,[Math]::Min(40,$a.Paragraphs.Item($i).Range.Text.Length)) }; if ($sb -eq "Body Text") { $bodyText++ } }
    }
    "{0}: paragraphs {1}->{2} pages {3} styleDiff={4} (Body Text={5})" -f $k, $pa, $pb, $pages, $diff, $bodyText
    $a.Close(0); $b.Close(0)
  }
} finally { $w.Quit() }
