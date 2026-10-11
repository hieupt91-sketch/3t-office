param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = "Stop"
$existingWordPids = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | ForEach-Object { [int]$_.ProcessId })
$wordPids = @()
$w = New-Object -ComObject Word.Application
$w.Visible = $false; $w.DisplayAlerts = 0
function Set-Setup($document, $paper, $orientation, $margins) {
  $ps = $document.Sections.Item(1).PageSetup
  try { $ps.PaperSize = $paper } catch { Write-Output "PaperSize fallback: $($_.Exception.Message)" }
  $ps.Orientation = $orientation
  $dimensions = switch ([int]$paper) { 11 { @(419.53,595.28) } 1 { @(612,792) } default { @(595.28,841.89) } }
  if ($orientation -eq 1) { $ps.PageWidth = $dimensions[1]; $ps.PageHeight = $dimensions[0] }
  else { $ps.PageWidth = $dimensions[0]; $ps.PageHeight = $dimensions[1] }
  $ps.TopMargin = $margins[0]; $ps.BottomMargin = $margins[1]; $ps.LeftMargin = $margins[2]; $ps.RightMargin = $margins[3]
}
try {
  $bootstrap = $w.Documents.Add()
  $wordPids = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existingWordPids } | ForEach-Object { [int]$_.ProcessId })
  if ($wordPids.Count -eq 0) { throw "Không tìm thấy PID Word COM do script tạo." }
  Write-Output "Word COM PID: $($wordPids -join ',')"
  $bootstrap.Close(0)
  $cases = @(
    @{ name="a5_normal_landscape"; paper=11; orientation=1; margins=@(72,72,72,72) },
    @{ name="narrow"; paper=7; orientation=0; margins=@(36,36,36,36) },
    @{ name="moderate"; paper=7; orientation=0; margins=@(72,72,54,54) },
    @{ name="wide"; paper=7; orientation=0; margins=@(72,72,144,144) }
  )
  foreach ($case in $cases) {
    Write-Output "Creating reference $($case.name)"
    $d=$w.Documents.Add(); Set-Setup $d $case.paper $case.orientation $case.margins
    $d.Content.InsertAfter("Alpha")
    $d.SaveAs2("$Dir\word_page_t8_$($case.name).docx",16); $d.Close(0)
    Write-Output "Saved reference $($case.name)"
  }
  $d=$w.Documents.Open("$Dir\app_page_t8_letter.docx",$false,$false)
  $breakTexts = @("After page break","Next page section","Continuous section","Even page section","Odd page section")
  $r=$d.Range($d.Content.End-1,$d.Content.End-1); $r.InsertBreak(7); $r=$d.Range($d.Content.End-1,$d.Content.End-1); $r.InsertAfter($breakTexts[0])
  $sectionKinds = @(2,3,4,5)
  for ($i=0; $i -lt $sectionKinds.Count; $i++) { $r=$d.Range($d.Content.End-1,$d.Content.End-1); $r.InsertBreak($sectionKinds[$i]); $r=$d.Range($d.Content.End-1,$d.Content.End-1); $r.InsertAfter($breakTexts[$i+1]) }
  $d.Sections.Item(1).PageSetup.DifferentFirstPageHeaderFooter = $true
  $d.Sections.Item(1).Headers.Item(1).Range.Text = "Word parity header"
  $footer=$d.Sections.Item(1).Footers.Item(1).Range; $footer.Text="Page "
  $footer.Fields.Add($footer,33) | Out-Null; $footer.InsertAfter(" / "); $footer.Fields.Add($footer,26) | Out-Null
  $d.Sections.Item(1).Footers.Item(1).PageNumbers.RestartNumberingAtSection=$true
  $d.Sections.Item(1).Footers.Item(1).PageNumbers.StartingNumber=3
  $d.SaveAs2("$Dir\word_page_t8_final.docx",16); $d.Close(0)
  foreach ($name in @("a5_normal_landscape","narrow","moderate","wide","letter","final")) {
    $d=$w.Documents.Open("$Dir\app_page_t8_$name.docx",$false,$true)
    try {
      $details=@()
      foreach ($section in $d.Sections) {
        $p=$section.PageSetup
        $header=try { ($section.Headers.Item(1).Range.Text -replace '[\r\a]','').Trim() } catch { "" }
        $footer=try { ($section.Footers.Item(1).Range.Text -replace '[\r\a]','').Trim() } catch { "" }
        $pageStart=try { [int]$section.Footers.Item(1).PageNumbers.StartingNumber } catch { "N/A" }
        $details += "start=$($p.SectionStart),paper=$($p.PaperSize),orient=$($p.Orientation),size=$([math]::Round($p.PageWidth,1))x$([math]::Round($p.PageHeight,1)),margins=$([math]::Round($p.TopMargin,1))/$([math]::Round($p.BottomMargin,1))/$([math]::Round($p.LeftMargin,1))/$([math]::Round($p.RightMargin,1)),diffFirst=$($p.DifferentFirstPageHeaderFooter),pageStart=$pageStart,header='$header',footer='$footer'"
      }
      Write-Output ("app_{0}: sections={1}; {2}" -f $name,$d.Sections.Count,($details -join " | "))
    } finally { $d.Close(0) }
  }
  foreach ($name in @("a5_normal_landscape","narrow","moderate","wide","final")) {
    $d=$w.Documents.Open("$Dir\word_page_t8_$name.docx",$false,$true)
    try {
      $details=@(); foreach ($section in $d.Sections) { $p=$section.PageSetup; $details += "start=$($p.SectionStart),paper=$($p.PaperSize),orient=$($p.Orientation),size=$([math]::Round($p.PageWidth,1))x$([math]::Round($p.PageHeight,1)),margins=$([math]::Round($p.TopMargin,1))/$([math]::Round($p.BottomMargin,1))/$([math]::Round($p.LeftMargin,1))/$([math]::Round($p.RightMargin,1))" }
      Write-Output ("word_{0}: sections={1}; {2}" -f $name,$d.Sections.Count,($details -join " | "))
    } finally { $d.Close(0) }
  }
} finally {
  if ($w) { $w.Quit(); [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($w) }
  $wordPids=@($wordPids + @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existingWordPids } | ForEach-Object { [int]$_.ProcessId }) | Select-Object -Unique)
  foreach ($wordPid in $wordPids) { $own=Get-Process -Id $wordPid -ErrorAction SilentlyContinue; if ($own) {$own | Wait-Process -Timeout 3 -ErrorAction SilentlyContinue}; if (Get-Process -Id $wordPid -ErrorAction SilentlyContinue) { Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue } }
}


