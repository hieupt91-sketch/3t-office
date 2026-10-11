param([string]$Dir)
$before=@(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id)
$p=New-Object -ComObject PowerPoint.Application
try { $pr=$p.Presentations.Add(0); $s=$pr.Slides.Add(1,12)
  $tb=$s.Shapes.AddTextbox(1,60,60,360,50); $tb.Name="TB1"; $tb.TextFrame.TextRange.Text="Alpha beta gamma delta"; $tb.TextFrame.TextRange.Font.Name="Arial"; $tb.TextFrame.TextRange.Font.Size=18
  $rc=$s.Shapes.AddShape(1,60,200,200,100); $rc.Name="RC1"; $rc.Fill.ForeColor.RGB=16777215; $rc.Line.ForeColor.RGB=0
  $pr.SaveAs("$Dir\template.pptx"); $pr.Close() } finally { try{$p.Quit()}catch{} }
Start-Sleep -Milliseconds 800; $after=@(Get-Process POWERPNT -ErrorAction SilentlyContinue | % Id) | ? { $_ -notin $before }; foreach($i in $after){ Stop-Process -Id $i -Force -ErrorAction SilentlyContinue }; "template ok"