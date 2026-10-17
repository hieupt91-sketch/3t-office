param([string]$Mode="make",[string]$Path="E:\VNOffice-profiles\claude-slidetrans\rich_src.pptx")
$ErrorActionPreference="Continue"
$app=New-Object -ComObject PowerPoint.Application
function J($o){ ($o | ConvertTo-Json -Compress -Depth 4) }
try {
 if($Mode -eq "make"){
  $p=$app.Presentations.Add(0)
  $s=$p.Slides.Add(1,12)
  # 1 hinh chu nhat xoay + lat + do bong + vien
  $r=$s.Shapes.AddShape(1,50,50,200,100); $r.Name="Rect1"; $r.Rotation=25; $r.Flip(0); $r.Fill.ForeColor.RGB=255; $r.Line.Weight=4; $r.Line.DashStyle=4; $r.Line.ForeColor.RGB=65280; $r.Shadow.Visible=-1; $r.Shadow.OffsetX=6
  $r.TextFrame.TextRange.Text="Hinh xoay"; $r.TextFrame.TextRange.Font.Bold=-1; $r.TextFrame.TextRange.Font.Size=20
  # 2 textbox: bullet, spacing, sub/superscript, hyperlink
  $t=$s.Shapes.AddTextbox(1,300,50,300,150); $t.Name="Text1"
  $t.TextFrame.TextRange.Text="Dong mot`rDong hai co link`rDong ba"
  $t.TextFrame.TextRange.Paragraphs(1).ParagraphFormat.Bullet.Visible=-1
  $t.TextFrame.TextRange.Paragraphs(1).ParagraphFormat.SpaceBefore=12
  $t.TextFrame.TextRange.Paragraphs(2).ParagraphFormat.Alignment=2
  $t.TextFrame.TextRange.Paragraphs(2).ActionSettings(1).Hyperlink.Address="https://example.com/abc"
  $t.TextFrame.TextRange.Paragraphs(3).Font.Italic=-1
  $t.TextFrame.TextRange.Paragraphs(3).Font.Color.RGB=16711680
  # 3 anim
  $e=$s.TimeLine.MainSequence.AddEffect($r,10,0,1)   # fade entrance on click
  $e2=$s.TimeLine.MainSequence.AddEffect($t,2,0,2)   # fly with previous
  # 4 action settings on shape
  $b=$s.Shapes.AddShape(5,50,250,150,60); $b.Name="Btn"; $b.TextFrame.TextRange.Text="Nut"; $b.ActionSettings(1).Action=2 # next slide
  # 5 table
  $tb=$s.Shapes.AddTable(3,3,300,250,300,100); $tb.Name="Tbl"; $tb.Table.Cell(1,1).Shape.TextFrame.TextRange.Text="A"; $tb.Table.Cell(2,2).Shape.Fill.ForeColor.RGB=65535
  # 6 notes
  $s.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text="Ghi chu dien gia"
  $s2=$p.Slides.Add(2,12); $s2.FollowMasterBackground=0; $s2.Background.Fill.ForeColor.RGB=13434879
  $pic=$s2.Shapes.AddShape(9,60,60,120,120); $pic.Name="Oval1"; $pic.Fill.TwoColorGradient(1,1); $pic.Fill.ForeColor.RGB=255; $pic.Fill.BackColor.RGB=16711680
  $s2.SlideShowTransition.Hidden=-1
  $p.SaveAs($Path,24); $p.Close(); "made"
 } else {
  $p=$app.Presentations.Open($Path,-1,0,0)
  foreach($s in $p.Slides){
   "--- slide $($s.SlideIndex) hidden=$($s.SlideShowTransition.Hidden) followBg=$($s.FollowMasterBackground) bg=$($s.Background.Fill.ForeColor.RGB) notes=[$($s.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text)]"
   foreach($sh in $s.Shapes){
     $o=[ordered]@{ n=$sh.Name; type=$sh.Type; rot=[math]::Round($sh.Rotation,1); hflip=$sh.HorizontalFlip; l=[math]::Round($sh.Left); t=[math]::Round($sh.Top); w=[math]::Round($sh.Width); h=[math]::Round($sh.Height); hasT=[int]$sh.HasTable; hasC=[int]$sh.HasChart }
     try{ $o.fill=$sh.Fill.ForeColor.RGB }catch{}; try{ $o.lineW=$sh.Line.Weight; $o.dash=$sh.Line.DashStyle; $o.lineRGB=$sh.Line.ForeColor.RGB }catch{}; try{ $o.shadow=$sh.Shadow.Visible }catch{}
     try{ $o.action=$sh.ActionSettings(1).Action }catch{}
     if($sh.HasTextFrame -and $sh.TextFrame.HasText){ $tr=$sh.TextFrame.TextRange; $o.text=($tr.Text -replace "`r","|"); $o.bold=$tr.Font.Bold; $o.size=$tr.Font.Size
       $ps=@(); foreach($pp in $tr.Paragraphs()){ $ps += ("{0}/{1}/{2}/{3}/{4}/{5}" -f $pp.ParagraphFormat.Bullet.Visible,$pp.ParagraphFormat.Alignment,$pp.ParagraphFormat.SpaceBefore,$pp.Font.Italic,$pp.Font.Color.RGB,$pp.ActionSettings(1).Hyperlink.Address) }; $o.paras=$ps -join ";" }
     if($sh.HasTable){ $o.cell11=$sh.Table.Cell(1,1).Shape.TextFrame.TextRange.Text; $o.cell22fill=$sh.Table.Cell(2,2).Shape.Fill.ForeColor.RGB }
     J $o
   }
   $effs=@(); foreach($e in $s.TimeLine.MainSequence){ $effs += ("{0}:{1}:{2}:{3}" -f $e.Shape.Name,$e.EffectType,$e.Timing.TriggerType,$e.Exit) }; "anim: " + ($effs -join ",")
  }
  $p.Close()
 }
} finally { $app.Quit() }

