param([string]$Mode="make",[string]$Path="E:\VNOffice-profiles\claude-wordpar\rich_src.docx")
$ErrorActionPreference="Continue"
$w=New-Object -ComObject Word.Application
try {
 $w.Visible=$false; $w.DisplayAlerts=0
 if($Mode -eq "make"){
  $d=$w.Documents.Add()
  $items=@(
   "P01 highlight yellow","P02 run shading blue","P03 char border","P04 emphasis dot","P05 scale 150","P06 kerning","P07 char spacing 3pt","P08 font color theme","P09 underline thick red",
   "P10 keep with next","P11 widow off","P12 tab stops","P13 first line indent","P14 hanging indent","P15 exact line spacing","P16 space before after","P17 outline level","P18 para shading","P19 para border","P20 right to left align",
   "P21 numbered list","P22 bullet list","P23 east asian text","P24 language english","P25 hidden-ish normal","P26 all caps","P27 bold italic mix","P28 font arial 13","P29 superscript","P30 strike through")
  $first=$true
  foreach($t in $items){ if(-not $first){ $d.Content.InsertParagraphAfter() }; $first=$false; $d.Paragraphs($d.Paragraphs.Count).Range.InsertBefore($t) }
  function P($i){ $d.Paragraphs($i) }
  (P 1).Range.HighlightColorIndex=7
  (P 2).Range.Font.Shading.BackgroundPatternColor=16711680
  (P 3).Range.Font.Borders.Item(-1).LineStyle=1
  (P 4).Range.Font.EmphasisMark=1
  (P 5).Range.Font.Scaling=150
  (P 6).Range.Font.Kerning=14
  (P 7).Range.Font.Spacing=3
  (P 8).Range.Font.TextColor.ObjectThemeColor=5
  (P 9).Range.Font.Underline=6; (P 9).Range.Font.UnderlineColor=255
  (P 10).Format.KeepWithNext=-1
  (P 11).Format.WidowControl=0
  (P 12).Format.TabStops.ClearAll(); [void](P 12).Format.TabStops.Add(150,0,1); [void](P 12).Format.TabStops.Add(300,2,2)
  (P 13).Format.FirstLineIndent=36
  (P 14).Format.LeftIndent=40; (P 14).Format.FirstLineIndent=-30
  (P 15).Format.LineSpacingRule=4; (P 15).Format.LineSpacing=24
  (P 16).Format.SpaceBefore=18; (P 16).Format.SpaceAfter=6
  (P 17).Format.OutlineLevel=2
  (P 18).Shading.BackgroundPatternColor=13434879
  (P 19).Borders.Item(-3).LineStyle=1; (P 19).Borders.Item(-3).LineWidth=12
  (P 20).Format.Alignment=2
  (P 21).Range.ListFormat.ApplyListTemplate($w.ListGalleries.Item(2).ListTemplates.Item(1))
  (P 22).Range.ListFormat.ApplyListTemplate($w.ListGalleries.Item(1).ListTemplates.Item(1))
  (P 24).Range.LanguageID=1033
  (P 26).Range.Font.AllCaps=-1
  (P 27).Range.Font.Bold=-1; (P 27).Range.Words(1).Font.Italic=-1
  (P 28).Range.Font.Name="Arial"; (P 28).Range.Font.Size=13
  (P 29).Range.Characters(1).Font.Superscript=-1
  (P 30).Range.Font.StrikeThrough=-1
  $d.SaveAs2($Path,16); $d.Close(0); "made"
 } else {
  $d=$w.Documents.Open($Path,$false,$true)
  $i=0
  foreach($p in $d.Paragraphs){ $i++; $r=$p.Range; $f=$r.Font; $pf=$p.Format
   $tabs=@(); foreach($ts in $pf.TabStops){ $tabs += ("{0}:{1}:{2}" -f [math]::Round($ts.Position),$ts.Alignment,$ts.Leader) }
   "{0:D2} hl={1} shd={2} bdr={3} em={4} sc={5} kern={6} sp={7} thc={8} ul={9}/{10} kwn={11} wid={12} tabs={13} fli={14} li={15} ls={16}/{17} sb={18} sa={19} ol={20} pshd={21} pbdr={22}/{23} al={24} list={25} lang={26} caps={27} b={28} i={29} fn={30}/{31} sup={32} st={33}" -f $i,$r.HighlightColorIndex,$f.Shading.BackgroundPatternColor,$f.Borders.Item(-1).LineStyle,$f.EmphasisMark,$f.Scaling,$f.Kerning,$f.Spacing,$f.TextColor.ObjectThemeColor,$f.Underline,$f.UnderlineColor,$pf.KeepWithNext,$pf.WidowControl,($tabs -join ","),$pf.FirstLineIndent,$pf.LeftIndent,$pf.LineSpacingRule,$pf.LineSpacing,$pf.SpaceBefore,$pf.SpaceAfter,$pf.OutlineLevel,$p.Shading.BackgroundPatternColor,$p.Borders.Item(-3).LineStyle,$p.Borders.Item(-3).LineWidth,$pf.Alignment,$r.ListFormat.ListType,$r.LanguageID,$f.AllCaps,$f.Bold,$f.Italic,$f.Name,$f.Size,$f.Superscript,$f.StrikeThrough
  }
  $d.Close(0)
 }
} finally { $w.Quit() }

