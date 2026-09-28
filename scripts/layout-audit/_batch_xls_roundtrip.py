"""Usage: python _batch_xls_roundtrip.py <worktree> <xls-dir> <out-dir> [names...]
Legacy .xls (Excel 97-2003) round trip: open in the real app, Save As .xls, then let
Excel 2016 COM compare every used cell (Value2 + Formula) of every sheet between the
original and the saved file. Also checks the saved file is a real OLE2 .xls (D0 CF 11 E0).
One file at a time; writes <out-dir>/_batch_xls_report.md."""
import glob
import json
import os
import subprocess
import sys

ROOT, XLSDIR, OUTDIR = (os.path.abspath(a) for a in sys.argv[1:4])
names = sys.argv[4:] or sorted(os.path.basename(p) for p in glob.glob(os.path.join(XLSDIR, "*.xls")))
SP = os.path.dirname(os.path.abspath(__file__))
os.makedirs(OUTDIR, exist_ok=True)

COMPARE_PS = r"""
param([string]$A, [string]$B)
$job = Start-Job -ScriptBlock {
  param($a, $b)
  $xl = New-Object -ComObject Excel.Application
  $xl.Visible = $false; $xl.DisplayAlerts = $false; $xl.AskToUpdateLinks = $false
  function Dump($path) {
    $wb = $xl.Workbooks.Open($path, 0, $true)
    $out = @{}
    foreach ($ws in $wb.Worksheets) {
      $ur = $ws.UsedRange
      $vals = $ur.Value2; $forms = $ur.Formula
      $r0 = $ur.Row; $c0 = $ur.Column
      $cells = @{}
      if ($ur.Count -eq 1) { $vals = ,(,$vals); $forms = ,(,$forms) }
      for ($r = 1; $r -le $ur.Rows.Count; $r++) {
        for ($c = 1; $c -le $ur.Columns.Count; $c++) {
          $v = if ($ur.Count -eq 1) { $ur.Value2 } else { $vals[$r, $c] }
          $f = if ($ur.Count -eq 1) { $ur.Formula } else { $forms[$r, $c] }
          if ($null -ne $v -or ($f -and "$f".StartsWith("="))) {
            $key = "{0},{1}" -f ($r0 + $r - 1), ($c0 + $c - 1)
            $sv = if ($v -is [double]) { [math]::Round($v, 9).ToString([Globalization.CultureInfo]::InvariantCulture) } else { "$v" }
            $cells[$key] = $sv + "|" + $(if ("$f".StartsWith("=")) { "$f" } else { "" })
          }
        }
      }
      $out[$ws.Name] = $cells
    }
    $wb.Close($false)
    return $out
  }
  try {
    $da = Dump $a; $db = Dump $b
    $diff = 0; $total = 0; $examples = @()
    foreach ($s in $da.Keys) {
      if (-not $db.ContainsKey($s)) { $diff += $da[$s].Count; $examples += "missing sheet $s"; continue }
      foreach ($k in $da[$s].Keys) {
        $total++
        if ($db[$s][$k] -ne $da[$s][$k]) { $diff++; if ($examples.Count -lt 5) { $examples += "$s!$k src=[$($da[$s][$k])] saved=[$($db[$s][$k])]" } }
      }
      foreach ($k in $db[$s].Keys) { if (-not $da[$s].ContainsKey($k)) { $diff++; if ($examples.Count -lt 5) { $examples += "$s!$k extra=[$($db[$s][$k])]" } } }
    }
    "RESULT " + (@{ sheets = $da.Count; cells = $total; diff = $diff; examples = $examples } | ConvertTo-Json -Compress)
  } catch { "RESULT " + (@{ error = "$_" } | ConvertTo-Json -Compress) } finally { $xl.Quit() }
} -ArgumentList $A, $B
if (Wait-Job $job -Timeout 900) { Receive-Job $job } else { 'RESULT {"error":"timeout (Excel dialog?)"}'; Stop-Job $job }
"""
compare_path = os.path.join(OUTDIR, "_compare_xls.ps1")
with open(compare_path, "w", encoding="utf-8-sig") as handle:
    handle.write(COMPARE_PS)

rows = []
for name in names:
    src = os.path.join(XLSDIR, name)
    out = os.path.join(OUTDIR, "_rt_" + name)
    if os.path.exists(out):
        os.remove(out)
    run = subprocess.run([sys.executable, os.path.join(SP, "_roundtrip_save_sheet.py"), ROOT, src, out],
                         capture_output=True, text=True, cwd=ROOT, timeout=2400, encoding="utf-8", errors="replace")
    saved = os.path.exists(out) and os.path.getsize(out) > 0
    magic = open(out, "rb").read(4).hex().upper() if saved else "-"
    result = {}
    if saved:
        cmp = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", compare_path, "-A", src, "-B", out],
                             capture_output=True, text=True, timeout=1000)
        line = next((l for l in (cmp.stdout or "").splitlines() if l.startswith("RESULT ")), "RESULT {}")
        try:
            result = json.loads(line[7:])
        except ValueError:
            result = {"error": line[:120]}
    rows.append((name, "yes" if saved else "NO", magic, result.get("sheets", "-"), result.get("cells", "-"),
                 result.get("diff", "-"), (result.get("error") or "; ".join(result.get("examples") or []))[:300]))
    print(name, "saved", saved, "magic", magic, "cells", result.get("cells"), "diff", result.get("diff"), result.get("error", ""), flush=True)
    with open(os.path.join(OUTDIR, "_batch_xls_report.md"), "w", encoding="utf-8") as handle:
        handle.write("| file | saved | magic | sheets | cells | diff | examples |\n|---|---|---|---:|---:|---:|---|\n")
        for row in rows:
            handle.write("| " + " | ".join(str(x) for x in row) + " |\n")
print("report:", os.path.join(OUTDIR, "_batch_xls_report.md"))
