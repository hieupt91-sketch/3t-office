param([string]$Out = "E:\VNOffice-profiles\excel2016-contextmenus.json")
# Doc cac menu chuot phai cua Excel 2016 that qua CommandBars (CHI DOC, khong sua gi).
$names = @("Cell","Row","Column","Ply","Workbook tabs","List Range Popup","Chart Area","Plot Area","Series","Axis","Legend","Drawing Object","Picture","Shape","Text Box","Table")
$x = New-Object -ComObject Excel.Application
$res = [ordered]@{}
function Dump($ctl,$depth){
  $o = [ordered]@{ caption = [string]$ctl.Caption; id = $ctl.Id; enabled = $ctl.Enabled; visible = $ctl.Visible; begin = $ctl.BeginGroup; type = $ctl.Type }
  if ($depth -lt 3 -and ($ctl.Type -eq 10 -or $ctl.Type -eq 12 -or $ctl.Type -eq 14)) {
    try { $o.items = @(); foreach($c in $ctl.Controls){ $o.items += ,(Dump $c ($depth+1)) } } catch {}
  }
  return $o
}
try {
  $x.Visible = $false
  foreach ($n in $names) {
    try { $cb = $x.CommandBars.Item($n) } catch { $res[$n] = "(khong co)"; continue }
    $list = @()
    foreach ($c in $cb.Controls) { $list += ,(Dump $c 0) }
    $res[$n] = $list
  }
} finally { try { $x.Quit() } catch {} }
$res | ConvertTo-Json -Depth 8 | Out-File -FilePath $Out -Encoding utf8
"xong: " + (($res.Keys | ForEach-Object { "$_=" + @($res[$_]).Count }) -join "; ")