param(
  [string[]]$Fonts = @("Times New Roman", "Arial", "Calibri"),
  [double[]]$Sizes = @(8, 9, 10, 10.5, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24),
  [string]$Out = "",
  [string]$Chars = "",
  [int]$Repeat = 100,
  [string]$NormalFont = "",
  [double]$NormalSize = 0
)
# Do be rong tung ky tu Excel 2016 dung khi ve/ngat dong o (DirectWrite GDI_NATURAL, khong phai GDI nguyen px):
# AutoFit cot voi n va 2n ban sao ky tu -> (w2n - wn)/n (px @96dpi; AutoFit lam tron px nguyen nen n=100 -> 0.01px). Excel khong kerning.
# Ket qua JSON: { "<font>": { "<size>": { "r": {"<codepoint>": px}, "b": {...} } } }
$ErrorActionPreference = "Stop"
if (-not $Chars) {
  $sb = New-Object System.Text.StringBuilder
  for ($i = 32; $i -le 126; $i++) { [void]$sb.Append([char]$i) }
  # Latin-1 + Latin Extended-A/B + Vietnamese (Latin Extended Additional 1EA0-1EF9), dau nhay/gach/ngoac thong dung
  # + dau ket hop (tieng Viet dang to hop: 14/26 file LAN), Hy Lap, mui ten, toan, hinh hoc, fullwidth (mau LAN)
  foreach ($r in @(@(0xA0, 0xFF), @(0x100, 0x17F), @(0x1A0, 0x1B0), @(0x1EA0, 0x1EF9), @(0x2010, 0x2026), @(0x20AB, 0x20AC), @(0x2030, 0x2030), @(0x2122, 0x2122),
                   @(0x300, 0x303), @(0x309, 0x309), @(0x323, 0x323), @(0x278, 0x278), @(0x2B9, 0x2BC), @(0x391, 0x3A9), @(0x3B1, 0x3C9), @(0x1D49, 0x1D49),
                   @(0x2070, 0x2079), @(0x2080, 0x2089), @(0x2103, 0x2103), @(0x2190, 0x2195), @(0x2202, 0x2202), @(0x2206, 0x2206), @(0x2211, 0x2211), @(0x221A, 0x221A),
                   @(0x221E, 0x221E), @(0x2248, 0x2248), @(0x2260, 0x2267), @(0x25A0, 0x25A1), @(0x25AA, 0x25AB), @(0x25B2, 0x25B2), @(0x25BA, 0x25BA), @(0x25C6, 0x25C6),
                   @(0x25CB, 0x25CF), @(0x2605, 0x2606), @(0x2610, 0x2612), @(0x2713, 0x2714), @(0x3001, 0x3002), @(0x33A1, 0x33A1), @(0xFF01, 0xFF5E))) {
    for ($i = $r[0]; $i -le $r[1]; $i++) { [void]$sb.Append([char]$i) }
  }
  $Chars = $sb.ToString()
}
$excel = New-Object -ComObject Excel.Application; $excel.Visible = $false; $excel.DisplayAlerts = $false; $excel.ScreenUpdating = $false
$result = @{}
function ToHash($obj) { $h = @{}; foreach ($p in $obj.PSObject.Properties) { $h[$p.Name] = $p.Value }; return $h }
if ($Out -and (Test-Path $Out)) {
  # JSON -> font -> size -> {r, b, mr, mb} (2 muc hashtable de ContainsKey; r/b giu PSCustomObject, doc qua PSObject.Properties)
  $json = Get-Content $Out -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($fp in $json.PSObject.Properties) {
    $sizesHash = @{}
    foreach ($sp in $fp.Value.PSObject.Properties) { $sizesHash[$sp.Name] = ToHash $sp.Value }
    $result[$fp.Name] = $sizesHash
  }
}
try {
  $wb = $excel.Workbooks.Add(); $ws = $wb.Worksheets.Item(1)
  if ($NormalFont) { $wb.Styles.Item("Normal").Font.Name = $NormalFont }
  if ($NormalSize -gt 0) { $wb.Styles.Item("Normal").Font.Size = $NormalSize }
  Write-Host ("Normal font: {0} {1}, standard width {2}" -f $wb.Styles.Item("Normal").Font.Name, $wb.Styles.Item("Normal").Font.Size, $ws.StandardWidth)
  $cell = $ws.Cells.Item(1, 3); $cell.NumberFormat = "@"; $cell.WrapText = $false
  foreach ($font in $Fonts) {
    if (-not $result.ContainsKey($font)) { $result[$font] = @{} }
    foreach ($size in $Sizes) {
      $key = [string]$size
      if (-not $result[$font].ContainsKey($key)) { $result[$font][$key] = @{} }
      foreach ($bold in $false, $true) {
        $bk = if ($bold) { "b" } else { "r" }
        $widths = New-Object 'System.Collections.Generic.Dictionary[string,double]' ([StringComparer]::Ordinal)  # phan biet hoa/thuong
        $hadMargin = $result[$font][$key].ContainsKey("m" + $bk)
        if ($result[$font][$key].ContainsKey($bk)) {
          $old = $result[$font][$key][$bk]
          if ($old -is [System.Collections.IDictionary]) { foreach ($k in $old.Keys) { $widths[[string]$k] = [double]$old[$k] } }
          else { foreach ($p in $old.PSObject.Properties) { $widths[[string]$p.Name] = [double]$p.Value } }
        }
        $todo = @($Chars.ToCharArray() | Where-Object { -not $widths.ContainsKey([string][int]$_) })
        if ($todo.Count -eq 0 -and $hadMargin) { continue }
        $cell.Font.Name = $font; $cell.Font.Size = $size; $cell.Font.Bold = $bold
        $sw = [Diagnostics.Stopwatch]::StartNew()
        # 2n ban sao phai < be rong cot toi da (255 ky tu ~ 1785px): n = 600px / co chu px
        $n = [Math]::Max(8, [Math]::Min($Repeat, [int][Math]::Floor(600 / ($size * 96 / 72))))
        foreach ($ch in $todo) {
          $s = [string]$ch
          # dau ket hop (Mn): do ("a"+dau)*n tru "a"*n -> be rong them vao chu goc (thuong 0)
          $combining = [char]::GetUnicodeCategory($ch) -eq [Globalization.UnicodeCategory]::NonSpacingMark
          if ($combining) {
            $cell.Value2 = ("a" * $n); $ws.Columns.Item(3).AutoFit() | Out-Null; $w1 = $ws.Columns.Item(3).Width
            $cell.Value2 = (("a" + $s) * $n); $ws.Columns.Item(3).AutoFit() | Out-Null; $w2 = $ws.Columns.Item(3).Width
          } else {
            $cell.Value2 = ($s * $n); $ws.Columns.Item(3).AutoFit() | Out-Null; $w1 = $ws.Columns.Item(3).Width
            $cell.Value2 = ($s * (2 * $n)); $ws.Columns.Item(3).AutoFit() | Out-Null; $w2 = $ws.Columns.Item(3).Width
          }
          $widths[[string][int]$ch] = [Math]::Round((($w2 - $w1) / 0.75) / $n, 4)  # khoa = ma ky tu (JSON PS 5.1 khong phan biet hoa/thuong)
        }
        $result[$font][$key][$bk] = $widths
        if ($hadMargin) {
          Write-Host ("{0} {1} {2}: +{3} chars in {4:0}s" -f $font, $size, $bk, $todo.Count, $sw.Elapsed.TotalSeconds)
          if ($Out) { $result | ConvertTo-Json -Depth 6 -Compress | Out-File $Out -Encoding UTF8 }
          continue
        }
        # Le kha dung khi boc chu: o cot 200px, tim chuoi "W"*a + "i"*b + "."*c + " X" vua khit / vua tran (AutoFit hang)
        # -> margin = colPx - be rong natural; ghi khoang (lo, hi] vao "m" (hi = fit, lo = wrap).
        $wc = $ws.Cells.Item(3, 5); $wc.Clear() | Out-Null; $wc.NumberFormat = "@"; $wc.WrapText = $true
        $wc.Font.Name = $font; $wc.Font.Size = $size; $wc.Font.Bold = $bold
        $ws.Columns.Item(5).ColumnWidth = [double]((200 - 5) / 7); $colPx = $ws.Columns.Item(5).Width / 0.75
        $wc.Value2 = "Xg"; $ws.Rows.Item(3).AutoFit() | Out-Null; $h1 = $ws.Rows.Item(3).RowHeight
        $wW = $widths[[string][int][char]"W"]; $wi = $widths[[string][int][char]"i"]; $wd = $widths[[string][int][char]"."]
        $tail = $widths[[string][int][char]" "] + $widths[[string][int][char]"X"]
        $nW = [int][Math]::Floor((($colPx - $tail) / $wW)) + 1
        while ($nW -gt 0) {
          $wc.Value2 = ("W" * $nW) + " X"; $ws.Rows.Item(3).AutoFit() | Out-Null
          if ($ws.Rows.Item(3).RowHeight -le $h1 + 0.1) { break }
          $nW--
        }
        $fitMax = $nW * $wW + $tail; $wrapMin = ($nW + 1) * $wW + $tail
        # Ky tu don vi co be rong khac nhau de to hop phu kin khoang (fitMax, wrapMin) toi ~0.5px
        $units = @(); foreach ($uc in @("i", ".", "1", "r", "t", ":", "I", "-")) { $units += , @([string]$uc, [double]$widths[[string][int][char]$uc]) }
        $cands = New-Object System.Collections.ArrayList; $tested = 0
        foreach ($a in ($nW - 1)..$nW) {
          if ($a -lt 0) { continue }
          $base = $a * $wW + $tail
          foreach ($u1 in 0..3) { foreach ($u2 in 0..3) { foreach ($u3 in 0..2) { foreach ($u4 in 0..2) { foreach ($u5 in 0..2) { foreach ($u6 in 0..1) { foreach ($u7 in 0..1) { foreach ($u8 in 0..1) {
            $cnt = @($u1, $u2, $u3, $u4, $u5, $u6, $u7, $u8)
            $nat = $base; $txt = "W" * $a
            for ($q = 0; $q -lt 8; $q++) { if ($cnt[$q] -gt 0) { $nat += $cnt[$q] * $units[$q][1]; $txt += ([string]$units[$q][0]) * $cnt[$q] } }
            if ($nat -gt $fitMax -and $nat -lt $wrapMin) { [void]$cands.Add([pscustomobject]@{ t = ($txt + " X"); n = $nat }) }
          } } } } } } } }
        }
        $mid = ($fitMax + $wrapMin) / 2; foreach ($k in ($cands | Sort-Object { [Math]::Abs($_.n - $mid) })) {
          $nat = $k.n
          if ($nat -ge $wrapMin -or $nat -le $fitMax) { continue }
          $tested++; $wc.Value2 = $k.t; $ws.Rows.Item(3).AutoFit() | Out-Null
          if ($ws.Rows.Item(3).RowHeight -le $h1 + 0.1) { if ($nat -gt $fitMax) { $fitMax = $nat } } else { if ($nat -lt $wrapMin) { $wrapMin = $nat } }
          if ($wrapMin - $fitMax -lt 0.4) { break }
        }
        $result[$font][$key]["m" + $bk] = @([Math]::Round($colPx - $wrapMin, 3), [Math]::Round($colPx - $fitMax, 3))
        Write-Host ("{0} {1} {2}: {3} chars, margin ({4}, {5}] in {6:0}s" -f $font, $size, $bk, $widths.Count, ($colPx - $wrapMin), ($colPx - $fitMax), $sw.Elapsed.TotalSeconds)
        if ($Out) { $result | ConvertTo-Json -Depth 6 -Compress | Out-File $Out -Encoding UTF8 }
      }
    }
  }
} finally { $wb.Close($false); $excel.Quit() }
if (-not $Out) { $result | ConvertTo-Json -Depth 6 -Compress }
