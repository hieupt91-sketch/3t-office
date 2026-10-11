param([string]$Dir)
$ops=[ordered]@{
 bold='E2'; italic='E2'; underline='E2'; size16='E2'; fontArial='E2'; fillDefault='E2'; textColorDefault='E2'; alignCenter='E2'; alignRight='E2'; wrap='E2';
 numNumber='B2'; numCurrency='B2'; numAccounting='B2'; numPercent='C2'; numDate='D2'; decInc='B2'; decDec='B2'; thousands='B2'; percentBtn='C2'; bordersDefault='E2'
}
$before=@(Get-Process EXCEL -ErrorAction SilentlyContinue | % Id)
$x=New-Object -ComObject Excel.Application; $x.Visible=$false; $x.DisplayAlerts=$false
try {
  foreach($op in $ops.Keys){
    $cell=$ops[$op]; $out="$Dir\excel_$op.xlsx"; Copy-Item "$Dir\template.xlsx" $out -Force
    $wb=$null; for($i=0;$i -le 30;$i++){ try { $wb=$x.Workbooks.Open($out,0,$false); if($wb){break} } catch { Start-Sleep -Milliseconds 700 } }
    $c=$wb.Worksheets.Item(1).Range($cell)
    switch($op){
      'bold'{$c.Font.Bold=$true}; 'italic'{$c.Font.Italic=$true}; 'underline'{$c.Font.Underline=2}; 'size16'{$c.Font.Size=16}; 'fontArial'{$c.Font.Name='Arial'}
      'fillDefault'{$c.Interior.Color=65535}; 'textColorDefault'{$c.Font.Color=255}
      'alignCenter'{$c.HorizontalAlignment=-4108}; 'alignRight'{$c.HorizontalAlignment=-4152}; 'wrap'{$c.WrapText=$true}
      'numNumber'{$c.NumberFormat='0.00'}; 'numCurrency'{$c.NumberFormat='$#,##0.00'}; 'numAccounting'{$c.NumberFormat='_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)'}
      'numPercent'{$c.NumberFormat='0.00%'}; 'numDate'{$c.NumberFormat='m/d/yyyy'}
      'decInc'{$c.NumberFormat='0.00'}; 'decDec'{$c.NumberFormat='0'}; 'thousands'{$c.NumberFormat='#,##0'}; 'percentBtn'{$c.NumberFormat='0%'}
      'bordersDefault'{ foreach($k in 7,8,9,10){ $c.Borders.Item($k).LineStyle=1 } }
    }
    $wb.Save(); $wb.Close($false)
  }
  $rows=@()
  foreach($op in $ops.Keys){
    $cell=$ops[$op]; $res=@{}
    foreach($side in 'app','excel'){
      $path="$Dir\${side}_$op.xlsx"; if(-not (Test-Path $path)){ $res[$side]=$null; continue }
      $wb=$null; for($i=0;$i -le 30;$i++){ try { $wb=$x.Workbooks.Open($path,0,$true); if($wb){break} } catch { Start-Sleep -Milliseconds 700 } }
      $c=$wb.Worksheets.Item(1).Range($cell)
      $res[$side]=[ordered]@{ Text=[string]$c.Text; NumFmt=[string]$c.NumberFormat; Bold=[int]$c.Font.Bold; Italic=[int]$c.Font.Italic; Underline=[int]$c.Font.Underline; Size=[double]$c.Font.Size; Name=[string]$c.Font.Name; FontColor=[int]$c.Font.Color; Fill=[int]$c.Interior.Color; HAlign=[int]$c.HorizontalAlignment; Wrap=[int]$c.WrapText; BdrBottom=[int]$c.Borders.Item(9).LineStyle; BdrTop=[int]$c.Borders.Item(8).LineStyle; BdrLeft=[int]$c.Borders.Item(7).LineStyle; BdrRight=[int]$c.Borders.Item(10).LineStyle }
      $wb.Close($false)
    }
    if(-not $res['app']){ $rows += [pscustomobject]@{op=$op; ket_qua='THIEU'; khac=''}; continue }
    $diff=@(); foreach($k in $res['excel'].Keys){ if("$($res['app'][$k])" -ne "$($res['excel'][$k])"){ $diff += "$k app=$($res['app'][$k]) | Excel=$($res['excel'][$k])" } }
    $rows += [pscustomobject]@{op=$op; ket_qua=$(if($diff.Count -eq 0){'KHOP'}else{'LECH'}); khac=($diff -join ' ; ')}
  }
  $rows | Format-Table -AutoSize -Wrap | Out-String -Width 260
} finally { try { $x.Quit() } catch {} }
Start-Sleep -Milliseconds 800; $after=@(Get-Process EXCEL -ErrorAction SilentlyContinue | % Id) | ? { $_ -notin $before }; foreach($i in $after){ Stop-Process -Id $i -Force -ErrorAction SilentlyContinue }