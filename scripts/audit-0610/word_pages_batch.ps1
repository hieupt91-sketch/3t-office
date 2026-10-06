# So trang Word that cua mot thu muc .doc/.docx (tuan tu, moi tep mot tien trinh Word) -> TSV; chay kem word_dialog_dismisser.ps1.
# Dung: powershell -File scripts/audit-0610/word_pages_batch.ps1 -Out <tsv> [-Skip <so tep da do>]
param([string]$Out = "E:\VNOffice-profiles\word-pages-originals.tsv", [int]$Skip = 0)
$files = @()
foreach ($dir in "E:\VN OFice\file test\landocx", "E:\VN OFice\file test\lan-legacy") {
    $files += Get-ChildItem $dir -File | Where-Object { $_.Extension -in ".doc", ".docx" } | Sort-Object Name
}
New-Item -ItemType Directory -Force (Split-Path $Out) | Out-Null
$dismiss = Start-Job { powershell -NoProfile -File "E:\VN OFice\scripts\audit-0610\word_dialog_dismisser.ps1" -Seconds 5400 }
try {
    foreach ($file in ($files | Select-Object -Skip $Skip)) {
        $line = (powershell -NoProfile -File "E:\VN OFice\scripts\audit-0610\word_pages.ps1" $file.FullName 2>&1 | Out-String).Trim()
        Add-Content -Path $Out -Value $line -Encoding utf8
        Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -lt (Get-Date).AddMinutes(-3) } | Stop-Process -Force -ErrorAction SilentlyContinue
    }
} finally {
    Stop-Job $dismiss -ErrorAction SilentlyContinue
    Remove-Job $dismiss -Force -ErrorAction SilentlyContinue
}
