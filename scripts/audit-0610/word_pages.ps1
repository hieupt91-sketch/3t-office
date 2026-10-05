# Số trang theo Word thật (COM, chạy ẩn). Mỗi tệp một tiến trình Word riêng, thoát bằng Quit (Close hay bị từ chối khi Word bận).
# Dùng: powershell -File scripts/audit-0610/word_pages.ps1 "a.docx" "b.docx"   -> in "tên<TAB>số trang<TAB>số từ" mỗi dòng.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Files)

function Invoke-Retry([scriptblock]$Block, [int]$Attempts = 30) {
    for ($i = 0; $i -lt $Attempts; $i++) {
        try { return (& $Block) } catch {
            if ($_.Exception.Message -notmatch 'rejected|busy|RPC|0x8001010A|0x80010001') { throw }
            Start-Sleep -Milliseconds 700
        }
    }
    throw "Word van tu choi sau $Attempts lan thu"
}

foreach ($file in $Files) {
    $word = $null
    try {
        $word = New-Object -ComObject Word.Application
        Start-Sleep -Seconds 3
        Invoke-Retry { $word.Visible = $false } | Out-Null
        Invoke-Retry { $word.DisplayAlerts = 0 } | Out-Null
        $doc = Invoke-Retry { $word.Documents.Open($file, $false, $true, $false) }
        Invoke-Retry { $doc.Repaginate() } | Out-Null
        $pages = Invoke-Retry { $doc.ComputeStatistics(2) }
        $words = Invoke-Retry { $doc.ComputeStatistics(0) }
        "{0}`t{1}`t{2}" -f (Split-Path $file -Leaf), $pages, $words
    } catch {
        "{0}`tERROR`t{1}" -f (Split-Path $file -Leaf), $_.Exception.Message
    } finally {
        if ($word) { try { Invoke-Retry { $word.Quit() } 10 | Out-Null } catch { } }
        Start-Sleep -Milliseconds 500
    }
}
