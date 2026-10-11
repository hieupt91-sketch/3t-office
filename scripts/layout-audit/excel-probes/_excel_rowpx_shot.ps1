param([string]$File, [int]$Rows = 28, [string]$Out = "")
# Do chieu cao hang THAT (px man hinh) cua Excel: chup cua so Excel (PrintWindow), tim cac duong luoi ngang o cot A.
Add-Type @"
using System; using System.Runtime.InteropServices;
public class PW2 {
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
Add-Type -AssemblyName System.Drawing
$excel = New-Object -ComObject Excel.Application; $excel.Visible = $true; $excel.DisplayAlerts = $false
try {
  $wb = $excel.Workbooks.Open($File); $ws = $wb.Worksheets.Item(1)
  $excel.WindowState = -4137  # xlMaximized
  $win = $excel.ActiveWindow; $win.Zoom = 100; $win.ScrollRow = 1; $win.ScrollColumn = 1; $win.DisplayGridlines = $true
  $ws.Cells.Item(1, 1).Select() | Out-Null
  Start-Sleep -Milliseconds 800
  $h = [IntPtr]$excel.Hwnd
  $r = New-Object PW2+RECT; [PW2]::GetWindowRect($h, [ref]$r) | Out-Null
  $w = $r.Right - $r.Left; $hh = $r.Bottom - $r.Top
  $b = New-Object System.Drawing.Bitmap $w, $hh
  $g = [System.Drawing.Graphics]::FromImage($b); $hdc = $g.GetHdc(); [PW2]::PrintWindow($h, $hdc, 2) | Out-Null; $g.ReleaseHdc($hdc)
  if ($Out) { $b.Save($Out) }
  # Tim cot x: ben trong cot B (tranh chu o cot A): dung 1/2 chieu rong cot A+B theo px? Don gian: quet nhieu x, lay x co nhieu duong luoi nhat
  $best = $null
  foreach ($x in 200, 260, 320, 380, 440) {
    $lines = @()
    for ($y = 222; $y -lt ($hh - 60); $y++) {
      $c = $b.GetPixel($x, $y)
      if ($c.R -lt 250 -or $c.G -lt 250 -or $c.B -lt 250) { $lines += $y }
    }
    if ($null -eq $best -or $lines.Count -gt $best.Count) { $best = $lines; $bestX = $x }
  }
  $g.Dispose(); $b.Dispose()
  # Cac duong luoi lien tiep -> chieu cao hang = hieu
  $ys = @($best | Sort-Object -Unique)
  $diffs = @(); for ($i = 1; $i -lt $ys.Count; $i++) { $diffs += ($ys[$i] - $ys[$i - 1]) }
  "x=$bestX gridlines=$($ys.Count) first=$($ys[0..5] -join ',')"
  "heights=" + (($diffs | Select-Object -First $Rows) -join ",")
} finally { $wb.Close($false); $excel.Quit() }
