param([string]$Source, [string]$Saved)
# For every floating shape, ask Word which page its anchor renders on (read-only, hidden Word).
$job = Start-Job -ScriptBlock {
  param($files)
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false; $word.DisplayAlerts = 0
  $result = @{}
  try {
    foreach ($f in $files) {
      $doc = $word.Documents.Open($f, $false, $true, $false)
      $doc.Repaginate()
      $map = @{}
      foreach ($sh in $doc.Shapes) {
        try { $map[$sh.Name] = $sh.Anchor.Information(3) } catch { $map[$sh.Name] = -1 }
      }
      $result[$f] = $map
      $doc.Close(0)
    }
  } finally { $word.Quit() }
  $result
} -ArgumentList (,@($Source, $Saved))
if (-not (Wait-Job $job -Timeout 300)) { "timeout"; Stop-Job $job; return }
$r = Receive-Job $job
$src = $r[$Source]; $dst = $r[$Saved]
$diff = 0
foreach ($name in ($src.Keys | Sort-Object)) {
  $a = $src[$name]; $b = $dst[$name]
  if ($null -eq $b) { "MISSING {0} (source page {1})" -f $name, $a; $diff++ }
  elseif ($a -ne $b) { "PAGE {0}: source {1} -> saved {2}" -f $name, $a, $b; $diff++ }
}
"shapes source={0} saved={1} page-mismatch/missing={2}" -f $src.Count, $dst.Count, $diff
