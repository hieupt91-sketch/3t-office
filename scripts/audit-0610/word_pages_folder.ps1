# So trang Word that cua moi tep .docx trong mot thu muc -> TSV (tuan tu), kem dismisser. Dung: powershell -File word_pages_folder.ps1 -Dir <thu-muc> -Out <tsv>
param([string]$Dir, [string]$Out)
$dismiss = Start-Job { powershell -NoProfile -File "E:\VN OFice\scripts\audit-0610\word_dialog_dismisser.ps1" -Seconds 3000 }
try {
    foreach ($file in (Get-ChildItem $Dir -File -Filter *.docx | Sort-Object Name)) {
        $line = (powershell -NoProfile -File "E:\VN OFice\scripts\audit-0610\word_pages.ps1" $file.FullName 2>&1 | Out-String).Trim()
        Add-Content -Path $Out -Value $line -Encoding utf8
        Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { $_.StartTime -lt (Get-Date).AddMinutes(-3) } | Stop-Process -Force -ErrorAction SilentlyContinue
    }
} finally {
    Stop-Job $dismiss -ErrorAction SilentlyContinue
    Remove-Job $dismiss -Force -ErrorAction SilentlyContinue
}
