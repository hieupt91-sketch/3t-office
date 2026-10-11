param([string[]]$Files)
$cellMap=@{ bold="B2"; fontGrow="B2"; fontShrink="B2"; italic="B2"; underline="B2"; size16="B2"; fontArial="B2"; fillDefault="B2"; textColorDefault="B2"; alignLeft="B2"; alignCenter="B2"; alignRight="B2"; alignTop="B2"; alignMiddle="B2"; alignBottom="B2"; wrap="B2"; currencyBtn="C2"; numNumber="C2"; numCurrency="C2"; numAccounting="C2"; numPercent="D2"; numDate="E2"; decInc="C2"; decDec="C2"; standard="C2"; percentBtn="D2"; bordersDefault="B2"; indentIncrease="B2"; indentDecrease="B2"; mergeCenter="A8"; mergeAcross="A8"; mergeCells="A8"; unmerge="A8"; autoSum="C7"; averageBtn="C7"; countNumbersBtn="C7"; maxBtn="C7"; minBtn="C7"; fillDown="B3"; fillRight="D2"; sortAsc="B2"; sortDesc="B2"; customSort="B2"; findReplacePack="A1"; pasteSpecialPack="F3"; filter="B1"; formulaSum="H2"; formulaAverage="H3"; formulaCount="H4"; formulaIf="H5"; formulaVlookup="H6"; formulaIndexMatch="H7"; formulaConcat="H8"; formulaText="H9"; formulaDate="H10"; textToColumns="B2"; flashFill="K2"; pivotTable="C2"; pivotRefresh="C2"; groupRows="A2"; ungroupRows="A2"; subtotal="A1"; consolidate="M1"; formulaPack="H2"; sheetVisibilityPack="A1"; sheetManagementPack="A1"; sheetVisibility_hidden="A1"; insertRow="A3"; deleteRow="A3"; insertCol="B2"; deleteCol="B2"; rowHeight="A3"; colWidth="B2"; hideRow="A3"; hideCol="B2"; unhideRow="A2"; unhideCol="C2"; freezePanes="B2"; zoomIn="A1"; zoomOut="A1"; zoomReset="A1"; formulaBar="A1"; normalView="A1"; pageBreakPreview="A1"; pageLayoutView="A1"; showFormulas="A1"; gridlines="A1"; headings="A1"; printArea="A1"; clearArea="A1"; pageSetup="A1"; definedName="B2"; validation="C2"; chart="A1"; chartBar="A1"; chartLine="A1"; chartPie="A1"; chartArea="A1"; removeDuplicates="A1"; conditional="C2"; formatAsTable="A1"; cellGood="B2"; widthControl="B2"; rotation90="B2"; hyperlink="G2"; image="B2"; commentInsert="C2"; commentDelete="C2"; commentSecond="D2"; commentPrevious="C2"; commentNext="D2"; defineName="B2"; formulaRecalculate="F2"; calculateSheet="F2"; errorChecking="H2"; pageSize="A1"; printTitles="A1"; headerFooter="A1"; pageScale="A1"; insertPageBreak="C5"; removePageBreak="C5"; sparklineLine="C6"; sparklineColumn="C6"; pivotChart="A1"; insertFunction="H2"; createNames="A1"; useInFormula="H2" }
$ErrorActionPreference = "Stop"

function Invoke-ComWithRetry([scriptblock]$Action, [string]$Operation, [int]$Retries = 20) {
  for ($attempt = 0; $attempt -le $Retries; $attempt++) {
    try { return (& $Action) }
    catch {
      $hr = $_.Exception.HResult
      if ($hr -ne -2147418111 -or $attempt -ge $Retries) {
        throw ("{0}: {1}" -f $Operation, $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 500
    }
  }
}

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoExcelAuditWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue

$before = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$excel = $null
$owned = $false
$ownedPid = 0
$failed = $false
try {
  # Keep the Application COM object in this scope too. Returning Office COM
  # automation objects through a PowerShell function can enumerate/coerce them.
  for ($attempt = 0; $attempt -le 20; $attempt++) {
    try {
      $excel = New-Object -ComObject Excel.Application
      break
    } catch {
      if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
        throw ("Create Excel: {0}" -f $_.Exception.Message)
      }
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $excel) { throw "Create Excel returned no application object." }
  $handle = [IntPtr](Invoke-ComWithRetry { [int]$excel.Hwnd } "Read Excel window")
  $owner = [uint32]0
  [void][VnoExcelAuditWindow]::GetWindowThreadProcessId($handle, [ref]$owner)
  $ownedPid = [int]$owner
  $owned = $ownedPid -gt 0 -and $before -notcontains $ownedPid
  if (-not $owned) {
    throw "Excel did not start a private process; existing Excel instances were left untouched."
  }

  if ($excel.Visible) {
    Invoke-ComWithRetry { $excel.Visible = $false } "Hide Excel" | Out-Null
  }
  Invoke-ComWithRetry { $excel.DisplayAlerts = $false } "Disable Excel alerts" | Out-Null
  foreach ($file in $Files) {
    $workbook = $null
    $name = Split-Path $file -Leaf
    try {
      # Do not return a Workbook COM object through Invoke-ComWithRetry:
      # PowerShell enumerates that automation object at the function boundary
      # and can turn it into $null. Open in this scope and retry only transient
      # RPC_E_CALL_REJECTED responses.
      for ($attempt = 0; $attempt -le 20; $attempt++) {
        try {
          $workbook = $excel.Workbooks.Open($file, 0, $true)
          break
        } catch {
          if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
            throw ("Open {0}: {1}" -f $name, $_.Exception.Message)
          }
          Start-Sleep -Milliseconds 500
        }
      }
      if (-not $workbook) { throw "Open $name returned no workbook object." }
      $count = 0
      for ($attempt = 0; $attempt -le 20; $attempt++) {
        try {
          $count = [int]$workbook.Worksheets.Count
        } catch {
          if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) {
            throw ("Read {0} sheet count: {1}" -f $name, $_.Exception.Message)
          }
        }
        if ($count -gt 0) { break }
        if ($attempt -ge 20) { throw "Read $name sheet count returned $count." }
        Start-Sleep -Milliseconds 500
      }
      $baseName=[IO.Path]::GetFileNameWithoutExtension($file); $opn=($cellMap.Keys | Where-Object { $baseName -eq ("app_" + $_) -or $baseName.EndsWith("_" + $_,[StringComparison]::OrdinalIgnoreCase) } | Sort-Object Length -Descending | Select-Object -First 1); if(-not $opn -and $baseName -eq "test_sheet_home"){$opn="widthControl"}; if(-not $opn){throw "No cell mapping for output $baseName"}; $ws=$workbook.Worksheets.Item(1); if($opn -in @("commentPrevious","commentNext")){"  Excel comment nav ActiveCell=$($excel.ActiveCell.Address($false,$false)) Notes=$([int]$ws.Comments.Count)"}; if($opn -eq "pivotChart"){for($wi=1;$wi -le $count;$wi++){$candidate=$workbook.Worksheets.Item($wi);try{if([int]$candidate.PivotTables().Count -gt 0){$ws=$candidate;break}}catch{}}}; $cc=$ws.Range($cellMap[$opn]); $columnWidth=$ws.Columns.Item($cc.Column).ColumnWidth; $rowHeight=$ws.Rows.Item($cc.Row).RowHeight; $rowHidden=[int]$ws.Rows.Item($cc.Row).Hidden; $colHidden=[int]$ws.Columns.Item($cc.Column).Hidden; $freeze=""; try{$freeze="{0}/{1}" -f $excel.ActiveWindow.SplitRow,$excel.ActiveWindow.SplitColumn}catch{}; $printArea=[string]$ws.PageSetup.PrintArea; $sortValues=if($opn -eq "sortAsc" -or $opn -eq "sortDesc"){@(2..6 | ForEach-Object { [string]$ws.Range("B$_").Value2 }) -join " / "}else{""}; $neighborCell=switch($opn){ "insertRow" {"A4"} "deleteRow" {"A3"} "insertCol" {"C2"} "deleteCol" {"B2"} default {""} }; $neighborValue=if($neighborCell){$ws.Range($neighborCell).Value2}else{""}; "{0,-17} {1} | Text='{2}' | Value2='{3}' | Formula='{4}' | Neighbor({5})='{6}' | Fmt='{7}' | B={8} I={9} U={10} Size={11} Font={12} Color={13} Fill={14} HAl={15} Wrap={16} Indent={17} Orient={18} Merge={19} ColWidth={20} RowHeight={21} RowHidden={22} ColHidden={23} Freeze={24} PrintArea='{25}' Filter={26} Sort(B2:B6)='{27}' Brd(B/T/L/R)={28}/{29}/{30}/{31}" -f $opn,$cellMap[$opn],$cc.Text,$cc.Value2,$cc.Formula,$neighborCell,$neighborValue,$cc.NumberFormat,[int]$cc.Font.Bold,[int]$cc.Font.Italic,[int]$cc.Font.Underline,$cc.Font.Size,$cc.Font.Name,[int]$cc.Font.Color,[int]$cc.Interior.Color,[int]$cc.HorizontalAlignment,[int]$cc.WrapText,[int]$cc.IndentLevel,[int]$cc.Orientation,[int]$cc.MergeCells,$columnWidth,$rowHeight,$rowHidden,$colHidden,$freeze,$printArea,[int]$ws.AutoFilterMode,$sortValues,[int]$cc.Borders.Item(9).LineStyle,[int]$cc.Borders.Item(8).LineStyle,[int]$cc.Borders.Item(7).LineStyle,[int]$cc.Borders.Item(10).LineStyle
      "  Excel VerticalAlignment({0})={1} | DisplayGridlines={2} | DisplayHeadings={3}" -f $cellMap[$opn],[int]$cc.VerticalAlignment,[int]$excel.ActiveWindow.DisplayGridlines,[int]$excel.ActiveWindow.DisplayHeadings; "  Excel ActiveWindow.Zoom="+[int]$excel.ActiveWindow.Zoom; "  Excel DisplayFormulaBar="+[int]$excel.DisplayFormulaBar; "  Excel ActiveWindow.View="+[int]$excel.ActiveWindow.View; "  Excel ActiveWindow.DisplayFormulas="+[int]$excel.ActiveWindow.DisplayFormulas; "  Excel Rows 2:6 OutlineLevel="+[int]$ws.Rows("2:6").OutlineLevel
      $cfCount=0; $cfFormula=""; $cfType=""; $cfOperator=""; $cfColor=""; try{$cfCount=[int]$ws.Range("C2:C6").FormatConditions.Count; if($cfCount){$cf=$ws.Range("C2:C6").FormatConditions.Item(1);$cfFormula=[string]$cf.Formula1;$cfType=[string]$cf.Type;$cfOperator=[string]$cf.Operator;$cfColor=[string]$cf.Interior.Color}}catch{}; $tableCount=[int]$ws.ListObjects.Count; $validationType=""; $validationFormula=""; try{$validationType=[string]$ws.Range("C2").Validation.Type;$validationFormula=[string]$ws.Range("C2").Validation.Formula1}catch{}; $nameCount=[int]$workbook.Names.Count; $chartCount=[int]$ws.ChartObjects().Count; $chartType=""; $chartSeries=0; if($chartCount){try{$chartType=[string]$ws.ChartObjects().Item(1).Chart.ChartType;$chartSeries=[int]$ws.ChartObjects().Item(1).Chart.SeriesCollection().Count}catch{}}; "  Excel ColumnWidth A:C = {0} / {1} / {2} | CF(C2:C6)={3} type={4} op={5} formula={6} color={7} | Tables={8} A1Fill={9} B2Fill={10} | Validation(C2)={11}/{12} Names={13} Charts={14} type={15} series={16}" -f [double]$ws.Columns.Item(1).ColumnWidth,[double]$ws.Columns.Item(2).ColumnWidth,[double]$ws.Columns.Item(3).ColumnWidth,$cfCount,$cfType,$cfOperator,$cfFormula,$cfColor,$tableCount,[int]$ws.Range("A1").Interior.Color,[int]$ws.Range("B2").Interior.Color,$validationType,$validationFormula,$nameCount,$chartCount,$chartType,$chartSeries; if($opn -eq "image"){ $shapeDetails=@(); for($si=1;$si -le [int]$ws.Shapes.Count;$si++){try{$sh=$ws.Shapes.Item($si);$shapeDetails+="Name=$($sh.Name);Type=$($sh.Type);TopLeft=$($sh.TopLeftCell.Address($false,$false))"}catch{}}; "  Shapes.Count=$($ws.Shapes.Count) $($shapeDetails -join " | ")" }; if($opn -eq "hyperlink"){ $linkCount=[int]$cc.Hyperlinks.Count; $links=@(); for($li=1;$li -le $linkCount;$li++){$h=$cc.Hyperlinks.Item($li);$links+="Address=$($h.Address);Text=$($h.TextToDisplay)"}; "  Hyperlinks.Count=$linkCount $($links -join " | ")" }; if($opn -in @("commentInsert","commentDelete","commentSecond","commentPrevious","commentNext")){ $commentText=""; $commentAuthor=""; try{$commentText=[string]$cc.Comment.Text();$commentAuthor=[string]$cc.Comment.Author}catch{}; $commentCells=@(); foreach($addr in @("C2","D2")){try{$cm=$ws.Range($addr).Comment;if($cm){$commentCells+="$addr=$($cm.Text())"}}catch{}}; "  ActiveCell=$($excel.ActiveCell.Address($false,$false)) Comment=$commentText Author=$commentAuthor Comments=$($commentCells -join " | ")" }; if($opn -in @("pageSize","pageScale","printTitles","headerFooter","insertPageBreak","removePageBreak")){"  PaperSize=$([int]$ws.PageSetup.PaperSize) Zoom=$($ws.PageSetup.Zoom) FitWide=$($ws.PageSetup.FitToPagesWide) FitTall=$($ws.PageSetup.FitToPagesTall) HBreaks=$(@($ws.HPageBreaks|ForEach-Object{$_.Location.Row}) -join ",") VBreaks=$(@($ws.VPageBreaks|ForEach-Object{$_.Location.Column}) -join ",") TitlesRows=$($ws.PageSetup.PrintTitleRows) TitlesColumns=$($ws.PageSetup.PrintTitleColumns) HeaderRight=$($ws.PageSetup.RightHeader) HeaderCenter=$($ws.PageSetup.CenterHeader) FooterCenter=$($ws.PageSetup.CenterFooter)"}; if($opn -eq "pivotTable" -or $opn -eq "pivotRefresh"){try{"  Excel PivotTables.Count="+[int]$ws.PivotTables().Count}catch{"  Excel PivotTables.Count=ERROR $($_.Exception.Message)"}}; if($opn -eq "pivotTable" -or $opn -eq "pivotRefresh"){ $pivotRead=@(1..$count|ForEach-Object{$sw=$workbook.Worksheets.Item($_);$pc=[int]$sw.PivotTables().Count;"$($sw.Name):PivotTables=${pc}:A1=$($sw.Range("A1").Value2):B1=$($sw.Range("B1").Value2):A2=$($sw.Range("A2").Value2):B2=$($sw.Range("B2").Value2):A6=$($sw.Range("A6").Value2):B6=$($sw.Range("B6").Value2):C2=$($sw.Range("C2").Value2)"});"  Excel workbook sheets: "+($pivotRead -join " / ")}; if($opn -eq "consolidate"){"  Consolidate M1:O2="+(@(1..2|ForEach-Object{"$($ws.Range("M$_").Value2)|$($ws.Range("N$_").Value2)|$($ws.Range("O$_").Value2)"}) -join " / ")}; if($opn -eq "subtotal"){"  Subtotal A1:C12="+(@(1..12|ForEach-Object{"$($ws.Range("A$_").Value2)|$($ws.Range("B$_").Value2)|$($ws.Range("C$_").Value2)"}) -join " / ")}; if($opn -eq "pivotRefresh"){ $psheet=$workbook.Worksheets.Item(2); "  Refreshed Pivot A1:B10="+(@(1..10|ForEach-Object{"$($psheet.Range("A$_").Value2)|$($psheet.Range("B$_").Value2)"}) -join " / ")}; if($opn -eq "flashFill"){"  FlashFill J2:J6 / K2:K6="+(@(2..6|ForEach-Object{"$($ws.Range("J$_").Value2)|$($ws.Range("K$_").Value2)"}) -join " / ")}; if($opn -eq "textToColumns"){"  TextToColumns B2:D6="+(@(2..6|ForEach-Object{"$($ws.Range("B$_").Value2)|$($ws.Range("C$_").Value2)|$($ws.Range("D$_").Value2)"}) -join " / ")}; if($opn -eq "definedName" -or $opn -eq "defineName" -or $opn -eq "createNames"){$nameDetails=@(1..$workbook.Names.Count | ForEach-Object {$n=$workbook.Names.Item($_); "{0} RefersTo={1}" -f $n.Name,$n.RefersTo}); "  Excel Names.Count={0} | {1}" -f $workbook.Names.Count,($nameDetails -join " ; ")}; if($opn -in @("sparklineLine","sparklineColumn")){$sparkCount=0;$sparkTypes=@();try{$sg=$ws.Range($cc.Address($false,$false)).SparklineGroups;$sparkCount=[int]$sg.Count;for($sgi=1;$sgi -le $sparkCount;$sgi++){$sparkTypes+=[string]$sg.Item($sgi).Type}}catch{};"  Sparklines($($cc.Address($false,$false)))=$sparkCount Types=$($sparkTypes -join ",")"}; $ps=$ws.PageSetup; "  PageSetup Orientation="+[int]$ps.Orientation+" | Margins L/R/T/B="+([double]$ps.LeftMargin/72)+"/"+([double]$ps.RightMargin/72)+"/"+([double]$ps.TopMargin/72)+"/"+([double]$ps.BottomMargin/72)+"in | FillRight C2='"+$ws.Range("C2").Formula+"' D2='"+$ws.Range("D2").Formula+"' | IDs A2:A6='"+(@(2..6 | ForEach-Object { [string]$ws.Range("A$_").Value2 }) -join " / ")+"'"
      if($opn -like "chart*"){for($ci=1;$ci -le $chartCount;$ci++){try{$ch=$ws.ChartObjects().Item($ci).Chart;$chartTitle=if($ch.HasTitle){[string]$ch.ChartTitle.Text}else{""};$axisX="";$axisY="";$hasXAxis=$false;$hasYAxis=$false;try{$hasXAxis=[bool]$ch.HasAxis(1,1);if($hasXAxis -and $ch.Axes(1,1).HasTitle){$axisX=[string]$ch.Axes(1,1).AxisTitle.Text}}catch{};try{$hasYAxis=[bool]$ch.HasAxis(2,1);if($hasYAxis -and $ch.Axes(2,1).HasTitle){$axisY=[string]$ch.Axes(2,1).AxisTitle.Text}}catch{};$series=@(1..$ch.SeriesCollection().Count|ForEach-Object{$sr=$ch.SeriesCollection().Item($_);"Name=$($sr.Name); Formula=$($sr.Formula)"}) -join " | ";"  Chart[$ci] type=$($ch.ChartType) title=[$chartTitle] axes=$hasXAxis/$hasYAxis axisTitles=[$axisX]/[$axisY] series=[$series]"}catch{"  Chart[$ci] FAIL $($_.Exception.Message)"}}}
      if($opn -eq "pivotChart"){$sheetSummary=@(1..$count|ForEach-Object{$sw=$workbook.Worksheets.Item($_);"$($sw.Name):Pivots=$([int]$sw.PivotTables().Count):Charts=$([int]$sw.ChartObjects().Count)"});"  Workbook layout: "+($sheetSummary -join " / ");$pc=[int]$ws.ChartObjects().Count;$ptName="";$sheetPt="";$ct="";$pivotFields=-1;try{$sheetPt=[string]$ws.PivotTables().Item(1).Name}catch{};if($pc){try{$ch=$ws.ChartObjects().Item(1).Chart;$ct=[string]$ch.ChartType;$layout=$ch.PivotLayout;$ptName=[string]$layout.PivotTable.Name;$pivotFields=[int]$layout.PivotFields.Count}catch{$ptName="NO_PIVOT_LAYOUT"}};"  Pivot sheet=$($ws.Name) Charts=$pc ChartType=$ct SheetPivot=$sheetPt ChartPivot=$ptName PivotFields=$pivotFields"}; if($opn -eq "formulaPack" -or $opn -eq "formulaRecalculate" -or $opn -eq "calculateSheet" -or $opn -eq "insertFunction" -or $opn -eq "useInFormula"){foreach($r in 2..30){$c=$ws.Range("H$r");"  $($c.Address($false,$false)) Formula='$($c.Formula)' Value2='$($c.Value2)' Text='$($c.Text)'"}}
      if($opn -like "sheetVisibility*"){$states=@(1..$count|ForEach-Object{$s=$workbook.Worksheets.Item($_);"$($s.Name):$([int]$s.Visible)"});"  Excel sheet visibility: "+($states -join " / ")}
      if($opn -eq "customSort"){"  Excel multi-sort B2:C6: "+(@(2..6|ForEach-Object{"$($ws.Range("B$_").Value2)/$($ws.Range("C$_").Value2)"}) -join " | ")}
      if($opn -eq "pasteSpecialPack"){"  Paste readback I2=$($ws.Range("I2").Value2) I2Formula='$($ws.Range("I2").Formula)' F3Formula='$($ws.Range("F3").Formula)' F3=$($ws.Range("F3").Value2) I3=$($ws.Range("I3").Value2) B1Style=$($ws.Range("B1").Style) I3Style=$($ws.Range("I3").Style) B1Fmt=$($ws.Range("B1").NumberFormat) I3Fmt=$($ws.Range("I3").NumberFormat) B1Fill=$([int]$ws.Range("B1").Interior.Color) I3Fill=$([int]$ws.Range("I3").Interior.Color) B1Bold=$([int]$ws.Range("B1").Font.Bold) I3Bold=$([int]$ws.Range("I3").Font.Bold)"}
      if($opn -eq "sheetManagementPack"){$names=@(1..$count|ForEach-Object{$workbook.Worksheets.Item($_).Name});"  Sheet order: "+($names -join " / ")}
      if($opn -eq "findReplacePack"){"  Workbook replace readback: "+(@(1..$count|ForEach-Object{$s=$workbook.Worksheets.Item($_);"$($s.Name):G2='$($s.Range("G2").Value2)' A1='$($s.Range("A1").Value2)'"}) -join " / ")}
    } catch {
      $failed = $true
      "$name FAIL " + ($_.Exception.Message -replace '[\r\n]', ' ')
    } finally {
      if ($workbook) {
        try { Invoke-ComWithRetry { $workbook.Close($false) } "Close $name" | Out-Null }
        catch {
          $failed = $true
          "$name FAIL " + ($_.Exception.Message -replace '[\r\n]', ' ')
        }
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($workbook)
      }
    }
  }
} catch {
  $failed = $true
  "BLOCKED " + ($_.Exception.Message -replace '[\r\n]', ' ')
} finally {
  if ($excel) {
    if ($owned) {
      try { Invoke-ComWithRetry { $excel.Quit() } "Quit Excel" | Out-Null }
      catch { "WARN Excel quit failed for owned PID $ownedPid; no other process was stopped." }
    }
    [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
if ($failed) { exit 1 }
