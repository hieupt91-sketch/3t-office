param([string]$Path="E:\VNOffice-profiles\claude-slidetrans\shape_format.pptx")
$app=New-Object -ComObject PowerPoint.Application
try { $p=$app.Presentations.Open($Path,-1,0,0)
 foreach($sh in $p.Slides.Item(1).Shapes){ if($sh.Type -eq 1){ [pscustomobject]@{ name=$sh.Name; fillRGB=$sh.Fill.ForeColor.RGB; fillVisible=$sh.Fill.Visible; lineVisible=$sh.Line.Visible; lineRGB=$sh.Line.ForeColor.RGB; lineWeight=[math]::Round($sh.Line.Weight,2); dash=$sh.Line.DashStyle; rotation=$sh.Rotation; hflip=$sh.HorizontalFlip; vflip=$sh.VerticalFlip; shadow=$sh.Shadow.Visible; shadowX=[math]::Round($sh.Shadow.OffsetX,1); shadowY=[math]::Round($sh.Shadow.OffsetY,1) } | ConvertTo-Json -Compress } }
 $p.Close() } finally { $app.Quit() }
