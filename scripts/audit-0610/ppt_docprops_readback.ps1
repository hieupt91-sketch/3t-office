param([string]$Path = "E:\VNOffice-temp\slides-document-properties\properties.pptx")
# Đọc lại thuộc tính tệp bằng PowerPoint thật (ẩn, chỉ đọc): Title, Author, Subject, Keywords, Comments, Content status.
$app = New-Object -ComObject PowerPoint.Application
try {
  $p = $app.Presentations.Open($Path, -1, 0, 0)
  $props = $p.BuiltInDocumentProperties
  $out = [ordered]@{}
  foreach ($n in "Title", "Author", "Subject", "Keywords", "Comments", "Content status") {
    try {
    $bf = [System.Reflection.BindingFlags]
    $item = [System.__ComObject].InvokeMember("Item", $bf::GetProperty, $null, $props, @($n))
    $out[$n] = [string][System.__ComObject].InvokeMember("Value", $bf::GetProperty, $null, $item, $null)
  } catch { $out[$n] = "<n/a>" }
  }
  $out | ConvertTo-Json -Compress
  $p.Close()
} finally { $app.Quit() }
