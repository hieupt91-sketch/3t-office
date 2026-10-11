# Word that doc lai cac tinh nang trong tep DOCX do app luu: chu thich, binh luan, thay doi, truong, khung drop cap, lien ket, dau trang...
# Dung: powershell -File word_inspect_features.ps1 "a.docx" ["b.docx" ...]  -> moi tep mot dong JSON. Chay kem word_dialog_dismisser.ps1.
param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Files)
function Invoke-Retry([scriptblock]$Block, [int]$Attempts = 30) {
    for ($i = 0; $i -lt $Attempts; $i++) {
        try { return (& $Block) } catch {
            if ($_.Exception.Message -notmatch 'rejected|busy|RPC|0x8001010A|0x80010001') { throw }
            Start-Sleep -Milliseconds 700
        }
    }
    throw "Word van tu choi"
}
foreach ($file in $Files) {
    $word = $null
    try {
        $word = New-Object -ComObject Word.Application
        Start-Sleep -Seconds 3
        Invoke-Retry { $word.Visible = $false } | Out-Null
        Invoke-Retry { $word.DisplayAlerts = 0 } | Out-Null
        $doc = Invoke-Retry { $word.Documents.Open($file, $false, $true, $false) }
        try { $word.ActiveWindow.View.Type = 3 } catch { }
        Invoke-Retry { $doc.Repaginate() } | Out-Null
        $fieldTypes = @{}
        foreach ($f in $doc.Fields) { $t = [string]$f.Type; if ($fieldTypes.ContainsKey($t)) { $fieldTypes[$t]++ } else { $fieldTypes[$t] = 1 } }
        $frameDrop = 0
        try { foreach ($fr in $doc.Frames) { $frameDrop++ } } catch { }
        $bookmarks = @(); try { foreach ($b in $doc.Bookmarks) { $bookmarks += $b.Name } } catch { }
        $pageBorderOn = "n/a"
        try { $pageBorderOn = ($doc.Sections.Item(1).Borders.Item(-1).LineStyle -ne 0) } catch { }
        $result = [ordered]@{
            file = (Split-Path $file -Leaf)
            pages = Invoke-Retry { $doc.Content.Information(4) }
            footnotes = $doc.Footnotes.Count
            endnotes = $doc.Endnotes.Count
            comments = $doc.Comments.Count
            revisions = $doc.Revisions.Count
            hyperlinks = $doc.Hyperlinks.Count
            fields = ($fieldTypes.GetEnumerator() | ForEach-Object { "$($_.Key)x$($_.Value)" }) -join ","
            frames = $frameDrop
            bookmarks = $bookmarks -join ","
            tables = $doc.Tables.Count
            inlineShapes = $doc.InlineShapes.Count
            shapes = $doc.Shapes.Count
            sections = $doc.Sections.Count
            lineNumbering = $doc.PageSetup.LineNumbering.Active
            pageBorderOn = $pageBorderOn
            columns = $doc.PageSetup.TextColumns.Count
            trackRevisions = $doc.TrackRevisions
        }
        $result | ConvertTo-Json -Compress
        try { $doc.Saved = $true } catch { }
    } catch {
        "{0}`tERROR`t{1}" -f (Split-Path $file -Leaf), $_.Exception.Message
    } finally {
        if ($word) { try { Invoke-Retry { $word.Quit(0) } 10 | Out-Null } catch { } }
    }
}
