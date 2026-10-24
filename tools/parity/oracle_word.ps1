param(
  [Parameter(Mandatory=$true)][string]$File,
  [string]$OwnedPidFile
)
# Oracle Word an (hidden COM) cho parity gate W2.
# - So trang lay bang ExportAsFixedFormat ra PDF tam + dem /Type /Page (cach do
#   bat dong bo cua ComputeStatistics nen khong dung — theo oracle cua repo).
# - So doan, so bang, so hinh (inline), so section, so header/footer non-empty
#   nh hash SHA-256 cua toan van ban (hash chi co so lieu, khong leak text).
# - Kill chi PID cua minh (compare.py do pidFile neu timeout).
$ErrorActionPreference = "Stop"
$File = [System.IO.Path]::GetFullPath($File)
if (-not $OwnedPidFile) {
  $OwnedPidFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "vno_parity_wd_" + [guid]::NewGuid().ToString("N") + ".pid")
}
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class ParityWordWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

function Invoke-ComWithRetry([scriptblock]$Action, [string]$Operation, [int]$Retries = 20, [int]$RetryDelayMilliseconds = 2500) {
  for ($attempt = 0; $attempt -le $Retries; $attempt++) {
    try { return (& $Action) }
    catch {
      $hr = $_.Exception.HResult
      if ($hr -ne -2147418111 -or $attempt -ge $Retries) {
        throw ("{0}: {1}" -f $Operation, $_.Exception.Message)
      }
      Start-Sleep -Milliseconds $RetryDelayMilliseconds
    }
  }
}

$before = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$word = $null
try {
  $word = Invoke-ComWithRetry { New-Object -ComObject Word.Application } "Create Word"
  # Word Application KHONG co .Hwnd (khac Excel); co thi doc, khong thi dua vao diff tien trinh
  $ownedPid = 0
  $hwndVal = $null
  try { $hwndVal = Invoke-ComWithRetry { $word.Hwnd } "Read Word Hwnd" } catch { $hwndVal = $null }
  if ($hwndVal) {
    try {
      $handle = [IntPtr]([int64]$hwndVal)
      $owner = [uint32]0
      [void][ParityWordWindow]::GetWindowThreadProcessId($handle, [ref]$owner)
      $ownedPid = [int]($owner + 0)
    } catch { $ownedPid = 0 }
  }
  if ($ownedPid -le 0 -or $before -contains $ownedPid) {
    for ($attempt = 0; $attempt -lt 40; $attempt++) {
      $created = @(Get-Process -Name WINWORD -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id })
      if ($created.Count -ge 1) { $ownedPid = [int]($created[0].Id); break }
      Start-Sleep -Milliseconds 100
    }
  }
  [System.IO.File]::WriteAllText($OwnedPidFile, [string]$ownedPid)
  Invoke-ComWithRetry { $word.Visible = $false } "Hide Word" | Out-Null
  Invoke-ComWithRetry { $word.DisplayAlerts = 0 } "Word alerts off" | Out-Null

  $doc = Invoke-ComWithRetry { $word.Documents.Open($File, $false, $true, $false) } "Open document"
  $paras = [int](Invoke-ComWithRetry { $doc.Paragraphs.Count } "Paragraphs")
  $tables = [int](Invoke-ComWithRetry { $doc.Tables.Count } "Tables")
  $inlines = [int](Invoke-ComWithRetry { $doc.InlineShapes.Count } "InlineShapes")
  $shapes = [int](Invoke-ComWithRetry { $doc.Shapes.Count } "Shapes")
  $sections = [int](Invoke-ComWithRetry { $doc.Sections.Count } "Sections")
  $headers = 0
  $footers = 0
  for ($s = 1; $s -le $sections; $s++) {
    $sec = Invoke-ComWithRetry { $doc.Sections.Item($s) } "Section"
    # Lang nghe ca 3 loai (1=Primary,2=EvenPages,3=FirstPage); mot so tai lieu co the
    # khong moi loai deu ton tai trong Section.Headers/Footers — bo qua loi tung loai.
    foreach ($idx in 1, 2, 3) {
      try {
        $hf = Invoke-ComWithRetry { $sec.Headers.Item($idx) } "HeaderItem"
        $len = [int](Invoke-ComWithRetry { $hf.Range.Text.Length } "HeaderTextLen")
        if ($len -gt 0) { $headers++ }
      } catch {}
    }
    foreach ($idx in 1, 2, 3) {
      try {
        $ff = Invoke-ComWithRetry { $sec.Footers.Item($idx) } "FooterItem"
        $len = [int](Invoke-ComWithRetry { $ff.Range.Text.Length } "FooterTextLen")
        if ($len -gt 0) { $footers++ }
      } catch {}
    }
    Invoke-ComWithRetry { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($sec) } "Release section" | Out-Null
  }
  $text = Invoke-ComWithRetry { $doc.Content.Text } "Content text"
  $sha = ""
  if ($text -ne $null) {
    $bytes = [System.Text.Encoding]::Unicode.GetBytes($text)
    $hasher = [System.Security.Cryptography.SHA256CryptoServiceProvider]::new()
    $sha = [BitConverter]::ToString($hasher.ComputeHash($bytes)).Replace("-", "").ToLowerInvariant()
  }
  Invoke-ComWithRetry { $doc.Close(0) } "Close document" | Out-Null

  $pdf = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "vno_parity_pdf_" + [guid]::NewGuid().ToString("N") + ".pdf")
  $doc2 = Invoke-ComWithRetry { $word.Documents.Open($File, $false, $true, $false) } "Reopen for PDF"
  Invoke-ComWithRetry { $doc2.ExportAsFixedFormat($pdf, 17) } "Export PDF" | Out-Null
  Invoke-ComWithRetry { $doc2.Close(0) } "Close doc2" | Out-Null
  $pages = 0
  $pdfBytes = [System.IO.File]::ReadAllBytes($pdf)
  $pdfText = [System.Text.Encoding]::GetEncoding(28591).GetString($pdfBytes)
  $pages = ([regex]::Matches($pdfText, "/Type\s*/Page[^s]")).Count
  Remove-Item -LiteralPath $pdf -ErrorAction SilentlyContinue

  @{ status = "PASS"; pages = $pages; paragraphs = $paras; tables = $tables; inlineShapes = $inlines;
     shapes = $shapes; sections = $sections; headers_nonempty = $headers; footers_nonempty = $footers;
     textSha256 = $sha } | ConvertTo-Json -Compress -Depth 4 | Write-Output
} catch {
  @{ status = "FAIL"; error = $_.Exception.Message; pidFile = $OwnedPidFile } | ConvertTo-Json -Compress -Depth 4 | Write-Output
} finally {
  if ($word) {
    try { Invoke-ComWithRetry { $word.Quit() } "Quit Word" 2>$null | Out-Null } catch {}
    try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($word) } catch {}
  }
  [System.GC]::Collect() | Out-Null
  [System.GC]::WaitForPendingFinalizers() | Out-Null
  [System.GC]::Collect() | Out-Null
}
