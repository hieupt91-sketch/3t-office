param()

$ErrorActionPreference = 'Stop'

function Retry([scriptblock]$b) {
    $last = $null
    for ($k = 0; $k -lt 25; $k++) {
        try {
            return (& $b)
        } catch {
            $last = $_
            if ($_.Exception.Message -notmatch 'rejected|busy|RPC') { break }
            Start-Sleep -Milliseconds 700
        }
    }
    throw ("Word loi: " + $last.Exception.Message + " @ " + $b.ToString().Trim())
}

# Tao file docx test bang python tu d03.docx
$py = @"
import zipfile, io, os, shutil
from adapters.libreoffice.common import ooxml_zip_patch as patcher

src_docx = r'E:\VNOffice-landocx\d03.docx'
out_file = os.path.join(os.environ.get('TEMP', '.'), 'vno-test-tabs.docx')
shutil.copyfile(src_docx, out_file)

html = '<p data-vno-tabs="5:l:n;8:c:d;11:r:h;14:dec:u;16:bar:n">CÔNG TY TNHH ĐẦU TƯ CÔNG NGHỆ VÀ XÂY LẮP 3T</p>'

with zipfile.ZipFile(out_file, 'r') as z:
    doc_xml = z.read('word/document.xml').decode('utf-8')

patched_doc = patcher._writer_restore_created_paragraph_css(doc_xml, html)

# Ghi lai vao docx
tmp_out = out_file + '.tmp'
with zipfile.ZipFile(out_file, 'r') as zin, zipfile.ZipFile(tmp_out, 'w') as zout:
    for item in zin.infolist():
        if item.filename == 'word/document.xml':
            zout.writestr(item, patched_doc.encode('utf-8'))
        else:
            zout.writestr(item, zin.read(item.filename))
os.replace(tmp_out, out_file)
print(out_file)
"@

$testDocx = (python -c $py).Trim()
Write-Host "Created test docx: $testDocx"

$before = @(Get-Process WINWORD -ErrorAction SilentlyContinue | % Id)

$word = $null
for ($a = 0; $a -lt 30 -and -not $word; $a++) {
    try {
        $word = New-Object -ComObject Word.Application
    } catch {
        Start-Sleep -Milliseconds 700
    }
}
if (-not $word) { throw "Khong khoi dong duoc Word" }

$mine = @(Get-Process WINWORD -ErrorAction SilentlyContinue | % Id | ? { $before -notcontains $_ })

try {
    $doc = Retry { $word.Documents.Open($testDocx) }
    $p = Retry { $doc.Paragraphs.Item(1) }
    $count = Retry { $p.TabStops.Count }
    Write-Host "Word read TabStops Count: $count"
    for ($i = 1; $i -le $count; $i++) {
        $ts = Retry { $p.TabStops.Item($i) }
        $pos = Retry { $ts.Position }
        $align = Retry { $ts.Alignment }
        $leader = Retry { $ts.Leader }
        Write-Host "Tab $($i): Pos=$pos pt, Align=$align, Leader=$leader"
    }
    $saveChanges = 0
    Retry { $doc.Close([ref]$saveChanges) } | Out-Null
} finally {
    try { $word.Quit() } catch {}
    foreach ($p in $mine) {
        Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    }
}
