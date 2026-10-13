param(
    [Parameter(Mandatory=$true)][string]$WorkbookPath,
    [Parameter(Mandatory=$true)][string]$OutputPath,
    [string]$SheetRangeFile
)
$ErrorActionPreference = 'Stop'
$resolved = (Resolve-Path -LiteralPath $WorkbookPath).Path
$out = [System.IO.Path]::GetFullPath($OutputPath)
$sheetRangeOverrides = @{}
if ($SheetRangeFile) {
    $rangePath = (Resolve-Path -LiteralPath $SheetRangeFile).Path
    $rangeDocument = Get-Content -LiteralPath $rangePath -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($property in $rangeDocument.PSObject.Properties) {
        $sheetRangeOverrides[[string]$property.Name] = [string]$property.Value
    }
}
$app = $null; $book = $null; $excelPid = $null
$existingExcelPids = @(Get-Process EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class VnoExcelDumpWindow {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@ -ErrorAction SilentlyContinue
function Safe-Value($obj, [string]$property) {
    try { return $obj.$property } catch { return $null }
}
function Safe-Color($obj, [string]$property) {
    try { $v = $obj.$property; if ($null -eq $v) { return $null }; return [int]$v } catch { return $null }
}
function Range-Value($values, [int]$row, [int]$column, [int]$rowCount, [int]$columnCount) {
    if ($values -isnot [Array]) { return $values }
    try { return $values.GetValue($row, $column) } catch { return $null }
}
try {
    $app = New-Object -ComObject Excel.Application
    $owner = [uint32]0
    [void][VnoExcelDumpWindow]::GetWindowThreadProcessId([IntPtr]$app.Hwnd, [ref]$owner)
    $excelPid = [int]$owner
    if (-not $excelPid -or $existingExcelPids -contains $excelPid) { throw 'Excel did not start a private process; existing Excel instances were left untouched.' }
    if ($app.Visible) { $app.Visible = $false }
    $app.DisplayAlerts = $false
    try { $app.AutomationSecurity = 3 } catch {}
    for ($attempt=0; $attempt -le 20; $attempt++) {
        try { $book = $app.Workbooks.Open($resolved, 0, $true); break }
        catch {
            if ($_.Exception.HResult -ne -2147418111 -or $attempt -ge 20) { throw }
            Start-Sleep -Milliseconds 500
        }
    }
    if (-not $book) { throw 'Excel Open returned no workbook object.' }
    $sheets = [System.Collections.Generic.List[object]]::new()
    for ($wi=1; $wi -le [int]$book.Worksheets.Count; $wi++) {
        $ws = $book.Worksheets.Item($wi)
        $originalUsed = $ws.UsedRange
        $used = $originalUsed
        $rangeKey = if ($sheetRangeOverrides.ContainsKey([string]$ws.Name)) { [string]$ws.Name } else { [string]$wi }
        if ($sheetRangeOverrides.ContainsKey($rangeKey)) {
            $used = $ws.Range([string]$sheetRangeOverrides[$rangeKey])
        }
        $cells = [System.Collections.Generic.List[object]]::new()
        $rowCount = [int]$used.Rows.Count; $colCount = [int]$used.Columns.Count
        $rangeValues = $used.Value2
        $rangeFormulas = $used.Formula
        $rangeStyles = $used.Style
        for ($ri=1; $ri -le $rowCount; $ri++) {
            for ($ci=1; $ci -le $colCount; $ci++) {
                $val = Range-Value $rangeValues $ri $ci $rowCount $colCount
                $formula = Range-Value $rangeFormulas $ri $ci $rowCount $colCount
                $hasValue = ($null -ne $val -and [string]$val -ne '')
                $hasFormula = ($null -ne $formula -and $formula -is [string] -and $formula.StartsWith('='))
                $style = [string](Range-Value $rangeStyles $ri $ci $rowCount $colCount)
                $cell = $null
                if ($null -eq $style -and $rowCount -gt 1 -and $colCount -gt 1) {
                    $cell = $used.Cells.Item($ri,$ci)
                    $style = [string](Safe-Value $cell 'Style')
                }
                if ($hasValue -or $hasFormula -or ($style -and $style -ne 'Normal')) {
                    if (-not $cell) { $cell = $used.Cells.Item($ri,$ci) }
                    $font = $cell.Font; $fill = $cell.Interior; $borders = [System.Collections.Generic.List[object]]::new()
                    foreach ($bi in 5,6,7,8,9,10,11,12) {
                        $b = $cell.Borders.Item($bi)
                        $borders.Add([pscustomobject]@{Index=$bi;LineStyle=(Safe-Value $b 'LineStyle');Weight=(Safe-Value $b 'Weight');Color=(Safe-Color $b 'Color')})
                    }
                    $cells.Add([pscustomobject]@{
                        Address=[string]$cell.Address($false,$false); Value=$val; Formula=$(if($hasFormula){$formula}else{$null});
                        NumberFormat=(Safe-Value $cell 'NumberFormat'); Style=$style;
                        Font=[pscustomobject]@{Name=(Safe-Value $font 'Name');Size=(Safe-Value $font 'Size');Bold=(Safe-Value $font 'Bold');Italic=(Safe-Value $font 'Italic');Underline=(Safe-Value $font 'Underline');Color=(Safe-Color $font 'Color')};
                        Fill=[pscustomobject]@{Color=(Safe-Color $fill 'Color');Pattern=(Safe-Value $fill 'Pattern');PatternColor=(Safe-Color $fill 'PatternColor')};
                        Alignment=[pscustomobject]@{Horizontal=(Safe-Value $cell 'HorizontalAlignment');Vertical=(Safe-Value $cell 'VerticalAlignment');Wrap=(Safe-Value $cell 'WrapText');Rotation=(Safe-Value $cell 'Orientation');Indent=(Safe-Value $cell 'IndentLevel')};
                        Borders=@($borders.ToArray())
                    })
                }
            }
        }
        $merges = [System.Collections.Generic.List[string]]::new()
        foreach ($area in $used.MergeAreas) { if ($area.MergeCells) { $merges.Add([string]$area.Address($false,$false)) } }
        $colWidths = [System.Collections.Generic.List[object]]::new()
        for ($ci=1; $ci -le $colCount; $ci++) { $col=$used.Columns.Item($ci); $colWidths.Add([pscustomobject]@{Index=([int]$used.Column+$ci-1);Width=(Safe-Value $col 'ColumnWidth');Hidden=(Safe-Value $col 'Hidden')}) }
        $rowHeights = [System.Collections.Generic.List[object]]::new()
        for ($ri=1; $ri -le $rowCount; $ri++) { $row=$used.Rows.Item($ri); $rowHeights.Add([pscustomobject]@{Index=([int]$used.Row+$ri-1);Height=(Safe-Value $row 'RowHeight');Hidden=(Safe-Value $row 'Hidden')}) }
        $filters = [System.Collections.Generic.List[object]]::new()
        try {
            if ($ws.AutoFilterMode) {
                $filterRange = $ws.AutoFilter.Range
                $filterItems = [System.Collections.Generic.List[object]]::new()
                for ($fi=1; $fi -le [int]$ws.AutoFilter.Filters.Count; $fi++) {
                    $filter = $ws.AutoFilter.Filters.Item($fi)
                    if ($filter.On) {
                        $filterItems.Add([pscustomobject]@{Field=$fi;Operator=(Safe-Value $filter 'Operator');Criteria1=(Safe-Value $filter 'Criteria1');Criteria2=(Safe-Value $filter 'Criteria2')})
                    }
                }
                $filters.Add([pscustomobject]@{Range=[string]$filterRange.Address($false,$false);FilterMode=[bool]$ws.FilterMode;Count=[int]$ws.AutoFilter.Filters.Count;Criteria=@($filterItems.ToArray())})
            }
        } catch {}
        $validations = [System.Collections.Generic.List[object]]::new()
        try { $validations.Add([pscustomobject]@{Type=(Safe-Value $used.Validation 'Type');Formula1=(Safe-Value $used.Validation 'Formula1');Formula2=(Safe-Value $used.Validation 'Formula2');AlertStyle=(Safe-Value $used.Validation 'AlertStyle')}) } catch {}
        $conditionals = [System.Collections.Generic.List[object]]::new()
        try { foreach($cf in $used.FormatConditions){$conditionals.Add([pscustomobject]@{Type=(Safe-Value $cf 'Type');Operator=(Safe-Value $cf 'Operator');Formula1=(Safe-Value $cf 'Formula1');Formula2=(Safe-Value $cf 'Formula2');NumberFormat=(Safe-Value $cf 'NumberFormat')})} } catch {}
        $tables = [System.Collections.Generic.List[object]]::new()
        foreach($table in $ws.ListObjects){$tables.Add([pscustomobject]@{Name=$table.Name;DisplayName=$table.DisplayName;Range=[string]$table.Range.Address($false,$false);Style=$table.TableStyle;ShowHeaders=$table.ShowHeaders;ShowTotals=$table.ShowTotals})}
        $charts = [System.Collections.Generic.List[object]]::new()
        foreach($chart in $ws.ChartObjects()){$charts.Add([pscustomobject]@{Name=$chart.Name;Left=$chart.Left;Top=$chart.Top;Width=$chart.Width;Height=$chart.Height;ChartType=$chart.Chart.ChartType;HasTitle=$chart.Chart.HasTitle;Title=$(if($chart.Chart.HasTitle){$chart.Chart.ChartTitle.Text}else{$null});HasLegend=$chart.Chart.HasLegend})}
        $images = [System.Collections.Generic.List[object]]::new()
        foreach($shape in $ws.Shapes){$images.Add([pscustomobject]@{Name=$shape.Name;Type=$shape.Type;Left=$shape.Left;Top=$shape.Top;Width=$shape.Width;Height=$shape.Height;AlternativeText=(Safe-Value $shape 'AlternativeText');OnAction=(Safe-Value $shape 'OnAction')})}
        $names = [System.Collections.Generic.List[object]]::new()
        foreach($name in $ws.Names){$names.Add([pscustomobject]@{Name=$name.Name;RefersTo=$name.RefersTo;Visible=$name.Visible})}
        $comments = [System.Collections.Generic.List[object]]::new()
        try { for($i=1; $i -le [int]$ws.Comments.Count; $i++) { $comment=$ws.Comments.Item($i); $comments.Add([pscustomobject]@{Cell=[string]$comment.Parent.Address($false,$false);Author=(Safe-Value $comment 'Author');Text=(Safe-Value $comment 'Text');Visible=(Safe-Value $comment 'Visible')}) } } catch {}
        $pivots = [System.Collections.Generic.List[object]]::new()
        try { for($i=1; $i -le [int]$ws.PivotTables().Count; $i++) { $pivot=$ws.PivotTables().Item($i); $pivots.Add([pscustomobject]@{Name=$pivot.Name;Range=[string]$pivot.TableRange2.Address($false,$false);SourceData=(Safe-Value $pivot 'SourceData');CacheIndex=(Safe-Value $pivot.PivotCache 'Index');RefreshOnOpen=(Safe-Value $pivot.PivotCache 'RefreshOnFileOpen')}) } } catch {}
        $sparklines = [System.Collections.Generic.List[object]]::new()
        try { for($i=1; $i -le [int]$ws.SparklineGroups.Count; $i++) { $group=$ws.SparklineGroups.Item($i); $sparklines.Add([pscustomobject]@{Location=[string]$group.Location.Address($false,$false);SourceData=(Safe-Value $group 'SourceData');Type=(Safe-Value $group 'Type');DisplayHidden=(Safe-Value $group 'DisplayHidden')}) } } catch {}
        $hyperlinks = [System.Collections.Generic.List[object]]::new()
        try { for($i=1; $i -le [int]$used.Hyperlinks.Count; $i++) { $link=$used.Hyperlinks.Item($i); $hyperlinks.Add([pscustomobject]@{Cell=[string]$link.Range.Address($false,$false);Address=(Safe-Value $link 'Address');SubAddress=(Safe-Value $link 'SubAddress');TextToDisplay=(Safe-Value $link 'TextToDisplay')}) } } catch {}
        $setup=$ws.PageSetup
        $window=$app.ActiveWindow
        $sheets.Add([pscustomobject]@{
            Name=$ws.Name;Visible=$ws.Visible;OriginalUsedRange=[string]$originalUsed.Address($false,$false);UsedRange=[string]$used.Address($false,$false);Cells=@($cells.ToArray());MergedAreas=@($merges.ToArray());
            Columns=@($colWidths.ToArray());Rows=@($rowHeights.ToArray());FreezePanes=[bool]$window.FreezePanes;SplitRow=[int]$window.SplitRow;SplitColumn=[int]$window.SplitColumn;
            AutoFilters=@($filters.ToArray());Validation=@($validations.ToArray());ConditionalFormatting=@($conditionals.ToArray());Tables=@($tables.ToArray());Charts=@($charts.ToArray());Shapes=@($images.ToArray());Names=@($names.ToArray());Comments=@($comments.ToArray());PivotTables=@($pivots.ToArray());Sparklines=@($sparklines.ToArray());Hyperlinks=@($hyperlinks.ToArray());
            Print=[pscustomobject]@{Area=(Safe-Value $setup 'PrintArea');Orientation=(Safe-Value $setup 'Orientation');PaperSize=(Safe-Value $setup 'PaperSize');Zoom=(Safe-Value $setup 'Zoom');FitToPagesWide=(Safe-Value $setup 'FitToPagesWide');FitToPagesTall=(Safe-Value $setup 'FitToPagesTall');LeftMargin=(Safe-Value $setup 'LeftMargin');RightMargin=(Safe-Value $setup 'RightMargin');TopMargin=(Safe-Value $setup 'TopMargin');BottomMargin=(Safe-Value $setup 'BottomMargin');PrintTitleRows=(Safe-Value $setup 'PrintTitleRows');PrintTitleColumns=(Safe-Value $setup 'PrintTitleColumns')}
        })
    }
    if ($sheets.Count -eq 0) { throw 'Excel opened the file but exposed no worksheets.' }
    $workbookNames=[System.Collections.Generic.List[object]]::new()
    foreach($name in $book.Names){$workbookNames.Add([pscustomobject]@{Name=$name.Name;RefersTo=$name.RefersTo;Visible=$name.Visible})}
    $result=[pscustomobject]@{Source=$resolved;ReadOnly=[bool]$book.ReadOnly;Date1904=[bool]$book.Date1904;CalculationVersion=(Safe-Value $book 'CalculationVersion');Names=@($workbookNames.ToArray());Sheets=@($sheets.ToArray())}
    $json=ConvertTo-Json -InputObject $result -Depth 100
    [System.IO.File]::WriteAllText($out,$json,[System.Text.UTF8Encoding]::new($false))
} catch {
    Write-Error $_
    exit 1
} finally {
    if ($book) { try { $book.Close($false) } catch {} }
    if ($app -and $excelPid -and $existingExcelPids -notcontains $excelPid) { try { $app.Quit() } catch {} }
    if ($book) { [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($book) }
    if ($app) { [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($app) }
    if ($excelPid -and $existingExcelPids -notcontains $excelPid) {
        $p=Get-Process -Id $excelPid -ErrorAction SilentlyContinue
        if($p){ Stop-Process -Id $excelPid -Force -ErrorAction SilentlyContinue }
    }
}
