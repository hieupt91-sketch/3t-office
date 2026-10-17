param([string]$Mode="make",[string]$Path="E:\VNOffice-profiles\claude-slidetrans\rich2_src.pptx")
$ErrorActionPreference="Continue"
if(-not (Test-Path "E:\VNOffice-profiles\claude-slidetrans\pic.png")){ Add-Type -AssemblyName System.Drawing; New-Item -ItemType Directory -Force "E:\VNOffice-profiles\claude-slidetrans" | Out-Null; $bmp=New-Object System.Drawing.Bitmap 200,120; $g=[System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::Orange); $g.FillEllipse([System.Drawing.Brushes]::Navy,30,20,100,80); $g.Dispose(); $bmp.Save("E:\VNOffice-profiles\claude-slidetrans\pic.png",[System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose() }
$app=New-Object -ComObject PowerPoint.Application
function J($o){ ($o | ConvertTo-Json -Compress -Depth 4) }
try {
 if($Mode -eq "make"){
  $p=$app.Presentations.Add(0)
  $s=$p.Slides.Add(1,12)
  $pic=$s.Shapes.AddPicture("E:\VNOffice-profiles\claude-slidetrans\pic.png",0,-1,40,40,200,120); $pic.Name="Pic1"; $pic.PictureFormat.CropLeft=20; $pic.PictureFormat.CropTop=10; $pic.Rotation=15; $pic.Line.Visible=-1; $pic.Line.Weight=3; $pic.Line.ForeColor.RGB=255; $pic.AlternativeText="mo ta anh"
  $a=$s.Shapes.AddShape(1,300,40,80,60); $a.Name="GA"; $b=$s.Shapes.AddShape(9,400,40,80,60); $b.Name="GB"
  $grp=$s.Shapes.Range(@("GA","GB")).Group(); $grp.Name="Group1"
  $c=$s.Shapes.AddConnector(1,50,220,300,260); $c.Name="Conn1"; $c.Line.EndArrowheadStyle=2; $c.Line.Weight=2.5; $c.Line.ForeColor.RGB=32768
  $t=$s.Shapes.AddTextbox(1,40,300,420,160); $t.Name="Lvl"
  $t.TextFrame.TextRange.Text="Muc 1`rMuc 2 cap hai`rMuc 3 cap ba`rMuc 4"
  $t.TextFrame.TextRange.Paragraphs(2).IndentLevel=2; $t.TextFrame.TextRange.Paragraphs(3).IndentLevel=3
  $t.TextFrame.TextRange.Paragraphs(1).Font.Name="Georgia"; $t.TextFrame.TextRange.Paragraphs(4).Font.Size=28
  $t.TextFrame2.Column.Number=1; $t.TextFrame.WordWrap=-1; $t.TextFrame2.AutoSize=0
  $t.TextFrame.TextRange.Paragraphs(4).ActionSettings(1).Hyperlink.SubAddress="2,2,Slide 2"
  $tb=$s.Shapes.AddTable(3,3,500,300,300,120); $tb.Name="Tbl"
  $tb.Table.Cell(1,1).Merge($tb.Table.Cell(1,2)); $tb.Table.Cell(1,1).Shape.TextFrame.TextRange.Text="Gop"
  $tb.Table.Cell(2,1).Borders(1).ForeColor.RGB=255; $tb.Table.Cell(2,1).Borders(1).Weight=4
  $tb.Table.Columns(1).Width=150
  $s.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text="Ghi chu 2"
  $s2=$p.Slides.Add(2,12); $x=$s2.Shapes.AddShape(1,100,100,200,100); $x.Name="Box2"; $x.TextFrame.TextRange.Text="Trang hai"
  $p.SaveAs($Path,24); $p.Close(); "made"
 } else {
  $p=$app.Presentations.Open($Path,-1,0,0)
  foreach($s in $p.Slides){
   "--- slide $($s.SlideIndex) notes=[$($s.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text)]"
   foreach($sh in $s.Shapes){ try {
     $o=[ordered]@{ n=$sh.Name; type=$sh.Type; rot=[math]::Round($sh.Rotation,1); l=[math]::Round($sh.Left); t=[math]::Round($sh.Top); w=[math]::Round($sh.Width); h=[math]::Round($sh.Height); alt=$sh.AlternativeText }
     try{ $o.lineW=[math]::Round($sh.Line.Weight,1); $o.lineRGB=$sh.Line.ForeColor.RGB; $o.endArrow=$sh.Line.EndArrowheadStyle; $o.lineVis=$sh.Line.Visible }catch{}
     if($sh.Type -eq 13){ $o.cropL=[math]::Round($sh.PictureFormat.CropLeft,1); $o.cropT=[math]::Round($sh.PictureFormat.CropTop,1) }
     if($sh.Type -eq 6){ $o.items=$sh.GroupItems.Count }
     if($sh.HasTextFrame -and $sh.TextFrame.HasText){ $tr=$sh.TextFrame.TextRange; $ps=@(); foreach($pp in $tr.Paragraphs()){ $ps += ("{0}/{1}/{2}/{3}/{4}" -f $pp.IndentLevel,$pp.Font.Name,$pp.Font.Size,$pp.ActionSettings(1).Hyperlink.SubAddress,($pp.Text -replace "`r","")) }; $o.paras=$ps -join ";" }
     if($sh.HasTable){ $tbl=$sh.Table; $o.c11=$tbl.Cell(1,1).Shape.TextFrame.TextRange.Text; $o.c11w=[math]::Round($tbl.Columns(1).Width); $o.bord=$tbl.Cell(2,1).Borders(1).ForeColor.RGB; $o.bordW=$tbl.Cell(2,1).Borders(1).Weight; $o.merged=[int]$tbl.Cell(1,1).Merged }
     J $o
   } catch { "ERR shape $($sh.Name): $($_.Exception.Message)" } }
  }
  $p.Close()
 }
} finally { $app.Quit() }

