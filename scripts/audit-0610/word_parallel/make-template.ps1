param([string]$Dir)
$ErrorActionPreference="Stop"
$before=@(Get-Process WINWORD -ErrorAction SilentlyContinue | % Id)
$w=New-Object -ComObject Word.Application; $w.Visible=$false; $w.DisplayAlerts=0
try {
  $d=$w.Documents.Add()
  $d.Content.Text="Mot doan dau tien.`rAlpha beta gamma delta.`rDoan cuoi cung."
  $d.Paragraphs.Item(2).Range.Font.Name="Times New Roman"; $d.Paragraphs.Item(2).Range.Font.Size=12
  $d.SaveAs2("$Dir\template.docx",16); $d.Close(0)
} finally { $w.Quit() }
Start-Sleep -Milliseconds 800
$after=@(Get-Process WINWORD -ErrorAction SilentlyContinue | % Id) | ? { $_ -notin $before }; foreach($i in $after){ Stop-Process -Id $i -Force -ErrorAction SilentlyContinue }
"template ok"