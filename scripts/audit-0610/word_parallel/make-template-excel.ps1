param([string]$Dir)
$before=@(Get-Process EXCEL -ErrorAction SilentlyContinue | % Id)
$x=New-Object -ComObject Excel.Application; $x.Visible=$false; $x.DisplayAlerts=$false
try { $wb=$x.Workbooks.Add(); $ws=$wb.Worksheets.Item(1)
  $ws.Range("B2").Value2=1234.5; $ws.Range("C2").Value2=0.075; $ws.Range("D2").Value2=45123; $ws.Range("E2").Value2="Nguyen Van A"; $ws.Range("B3").Value2=-56.789
  $ws.Range("B2:E3").Font.Name="Calibri"; $ws.Range("B2:E3").Font.Size=11
  $wb.SaveAs("$Dir\template.xlsx",51); $wb.Close($false) } finally { $x.Quit() }
Start-Sleep -Milliseconds 800; $after=@(Get-Process EXCEL -ErrorAction SilentlyContinue | % Id) | ? { $_ -notin $before }; foreach($i in $after){ Stop-Process -Id $i -Force -ErrorAction SilentlyContinue }; "template ok"