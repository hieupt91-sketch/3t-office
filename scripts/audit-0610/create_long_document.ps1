param(
  [string]$OutputPath = "E:\VNOffice-profiles\ribbon-shots\doc-home\long30.docx"
)

$ErrorActionPreference = "Stop"
$before = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$pidOwned = (Get-Process -Name WINWORD | Where-Object { $before -notcontains $_.Id } | Select-Object -First 1).Id

try {
  $parent = Split-Path -Parent $OutputPath
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Force -Path $parent | Out-Null }
  $doc = $word.Documents.Add()
  
  $range = $doc.Content
  $range.Text = "TAI LIEU KIEM THU RIBBON TRANG DAU - 30 TRANG`r"
  
  for ($page = 1; $page -le 35; $page++) {
    $end = $doc.Content
    $end.Collapse(0)
    $end.InsertBreak(7)
    $end.Collapse(0)
    $end.Text = "Chuong " + $page + ": Tieu de chuong so " + $page + "`r"
    
    $end.Collapse(0)
    $end.Text = "Doan van mo dau cho trang " + $page + " cua tai lieu kiem thu quy mo lon. Doan nay chua van ban binh thuong de kiem tra cac chuc nang dinh dang phong chu, can le, gian dong va thut le tren tai lieu dai.`r"
    
    if ($page % 3 -eq 0) {
      $end.Collapse(0)
      $tbl = $doc.Tables.Add($end, 3, 3)
      $tbl.Borders.Enable = 1
      $tbl.Cell(1,1).Range.Text = "Hang 1 O 1"
      $tbl.Cell(1,2).Range.Text = "Hang 1 O 2"
      $tbl.Cell(1,3).Range.Text = "Hang 1 O 3"
      $tbl.Cell(2,1).Range.Text = "Du lieu A"
      $tbl.Cell(2,2).Range.Text = "Du lieu B"
      $tbl.Cell(2,3).Range.Text = "Du lieu C"
      $tbl.Cell(3,1).Range.Text = "Ket luan 1"
      $tbl.Cell(3,2).Range.Text = "Ket luan 2"
      $tbl.Cell(3,3).Range.Text = "Ket luan 3"
    } elseif ($page % 3 -eq 1) {
      $end.Collapse(0)
      $end.Text = "Muc danh sach A trang " + $page + "`rMuc danh sach B trang " + $page + "`rMuc danh sach C trang " + $page + "`r"
      $end.ListFormat.ApplyBulletDefault()
    } else {
      $end.Collapse(0)
      $end.Text = "Doan van kiem tra so 1 tren trang " + $page + " voi nhieu noi dung chi tiet.`rDoan van kiem tra so 2 tren trang " + $page + " de tao do dai tu nhien cho trang tai lieu.`rDoan van kiem tra so 3 tren trang " + $page + " de kiem thu con tro va vung chon.`r"
    }
  }
  
  $doc.SaveAs2($OutputPath)
  Write-Output "Saved to: $OutputPath"
  Write-Output "Pages: $($doc.ComputeStatistics(2))"
  Write-Output "Paragraphs: $($doc.Paragraphs.Count)"
  Write-Output "Tables: $($doc.Tables.Count)"
  $saveChanges = 0
  $doc.Close([ref]$saveChanges)
} finally {
  $saveChanges = 0
  $word.Quit([ref]$saveChanges)
  [System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) | Out-Null
  if ($pidOwned) {
    Start-Sleep -Milliseconds 200
    Stop-Process -Id $pidOwned -Force -ErrorAction SilentlyContinue
  }
}
