param(
  [Parameter(Mandatory = $true)][string]$File,
  [Parameter(Mandatory = $true)][string]$Out,
  [Parameter(Mandatory = $true)][string[]]$Targets
)

$ErrorActionPreference = "Stop"
$wNs = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"

function Read-ZipText($Zip, [string]$Name) {
  $entry = $Zip.GetEntry($Name)
  if (-not $entry) { return "" }
  $reader = [System.IO.StreamReader]::new($entry.Open())
  try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Attr([System.Xml.XmlElement]$Node, [string]$Name) {
  if (-not $Node) { return $null }
  $value = $Node.GetAttribute($Name, $wNs)
  if ($value -eq "") { return $null }
  return $value
}

function Child([System.Xml.XmlNode]$Node, [string]$Name, [System.Xml.XmlNamespaceManager]$Ns) {
  return $Node.SelectSingleNode("./w:$Name", $Ns)
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$resolved = (Resolve-Path -LiteralPath $File).Path
$stream = [System.IO.File]::OpenRead($resolved)
$zip = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Read)
try {
  $documentText = Read-ZipText $zip "word/document.xml"
  if (-not $documentText) { throw "word/document.xml not found in $resolved" }
  $xml = [System.Xml.XmlDocument]::new()
  $xml.PreserveWhitespace = $true
  $xml.LoadXml($documentText)
  $ns = [System.Xml.XmlNamespaceManager]::new($xml.NameTable)
  $ns.AddNamespace("w", $wNs)

  $wanted = @{}
  foreach ($target in $Targets) {
    if ($target -notmatch '^(\d+):(\d+)$') { throw "Invalid target '$target'; expected TABLE:ROW" }
    $wanted["$([int]$Matches[1]):$([int]$Matches[2])"] = $true
  }

  $tables = @($xml.SelectNodes("//w:body//w:tbl[not(ancestor::w:tbl)]", $ns))
  $result = @()
  for ($ti = 0; $ti -lt $tables.Count; $ti++) {
    $table = $tables[$ti]
    $grid = @($table.SelectNodes("./w:tblGrid/w:gridCol", $ns) | ForEach-Object { [int](Attr $_ "w") })
    $tblPr = Child $table "tblPr" $ns
    $tblW = if ($tblPr) { Child $tblPr "tblW" $ns } else { $null }
    $tblCellMar = if ($tblPr) { Child $tblPr "tblCellMar" $ns } else { $null }
    $rows = @($table.SelectNodes("./w:tr", $ns))
    for ($ri = 0; $ri -lt $rows.Count; $ri++) {
      $key = "$($ti + 1):$($ri + 1)"
      if (-not $wanted.ContainsKey($key)) { continue }
      $row = $rows[$ri]
      $trPr = Child $row "trPr" $ns
      $trHeight = if ($trPr) { Child $trPr "trHeight" $ns } else { $null }
      $cells = @()
      $cellNodes = @($row.SelectNodes("./w:tc", $ns))
      for ($ci = 0; $ci -lt $cellNodes.Count; $ci++) {
        $cell = $cellNodes[$ci]
        $tcPr = Child $cell "tcPr" $ns
        $tcW = if ($tcPr) { Child $tcPr "tcW" $ns } else { $null }
        $gridSpan = if ($tcPr) { Child $tcPr "gridSpan" $ns } else { $null }
        $vMerge = if ($tcPr) { Child $tcPr "vMerge" $ns } else { $null }
        $vAlign = if ($tcPr) { Child $tcPr "vAlign" $ns } else { $null }
        $tcMar = if ($tcPr) { Child $tcPr "tcMar" $ns } else { $null }
        $paras = @()
        $paraNodes = @($cell.SelectNodes("./w:p", $ns))
        for ($pi = 0; $pi -lt $paraNodes.Count; $pi++) {
          $p = $paraNodes[$pi]
          $pPr = Child $p "pPr" $ns
          $spacing = if ($pPr) { Child $pPr "spacing" $ns } else { $null }
          $indent = if ($pPr) { Child $pPr "ind" $ns } else { $null }
          $jc = if ($pPr) { Child $pPr "jc" $ns } else { $null }
          $numPr = if ($pPr) { Child $pPr "numPr" $ns } else { $null }
          $pRPr = if ($pPr) { Child $pPr "rPr" $ns } else { $null }
          $pStyle = if ($pPr) { Child $pPr "pStyle" $ns } else { $null }
          $runs = @($p.SelectNodes("./w:r", $ns))
          $runSizes = @($runs | ForEach-Object {
            $rp = Child $_ "rPr" $ns
            $sz = if ($rp) { Child $rp "sz" $ns } else { $null }
            if ($sz) { Attr $sz "val" }
          } | Where-Object { $_ } | Select-Object -Unique)
          $runFonts = @($runs | ForEach-Object {
            $rp = Child $_ "rPr" $ns
            $rf = if ($rp) { Child $rp "rFonts" $ns } else { $null }
            if ($rf) { (Attr $rf "ascii"), (Attr $rf "hAnsi"), (Attr $rf "eastAsia") }
          } | Where-Object { $_ } | Select-Object -Unique)
          $text = [string]::Concat(@($p.SelectNodes(".//w:t", $ns) | ForEach-Object { $_.InnerText }))
          $paras += [ordered]@{
            index = $pi + 1
            text = $text
            empty = ($text.Length -eq 0)
            style = if ($pStyle) { Attr $pStyle "val" } else { $null }
            spacing = [ordered]@{
              before = if ($spacing) { Attr $spacing "before" } else { $null }
              after = if ($spacing) { Attr $spacing "after" } else { $null }
              beforeAutospacing = if ($spacing) { Attr $spacing "beforeAutospacing" } else { $null }
              afterAutospacing = if ($spacing) { Attr $spacing "afterAutospacing" } else { $null }
              line = if ($spacing) { Attr $spacing "line" } else { $null }
              lineRule = if ($spacing) { Attr $spacing "lineRule" } else { $null }
            }
            indentation = [ordered]@{
              left = if ($indent) { Attr $indent "left" } else { $null }
              right = if ($indent) { Attr $indent "right" } else { $null }
              firstLine = if ($indent) { Attr $indent "firstLine" } else { $null }
              hanging = if ($indent) { Attr $indent "hanging" } else { $null }
            }
            alignment = if ($jc) { Attr $jc "val" } else { $null }
            numbering = if ($numPr) {
              $numId = Child $numPr "numId" $ns
              $ilvl = Child $numPr "ilvl" $ns
              [ordered]@{ numId = if ($numId) { Attr $numId "val" } else { $null }; level = if ($ilvl) { Attr $ilvl "val" } else { $null } }
            } else { $null }
            paragraphFontHalfPoints = if ($pRPr) { $sz = Child $pRPr "sz" $ns; if ($sz) { Attr $sz "val" } } else { $null }
            runFontHalfPoints = $runSizes
            runFonts = $runFonts
            breaks = @($p.SelectNodes(".//w:br", $ns)).Count
            tabs = @($p.SelectNodes(".//w:tab", $ns)).Count
          }
        }
        $marginObject = [ordered]@{}
        foreach ($side in @("top", "right", "bottom", "left", "start", "end")) {
          $node = if ($tcMar) { Child $tcMar $side $ns } else { $null }
          if ($node) { $marginObject[$side] = [ordered]@{ w = Attr $node "w"; type = Attr $node "type" } }
        }
        $cells += [ordered]@{
          index = $ci + 1
          tcW = if ($tcW) { [ordered]@{ w = Attr $tcW "w"; type = Attr $tcW "type" } } else { $null }
          gridSpan = if ($gridSpan) { Attr $gridSpan "val" } else { $null }
          vMerge = if ($vMerge) { $value = Attr $vMerge "val"; if ($value) { $value } else { "continue" } } else { $null }
          vAlign = if ($vAlign) { Attr $vAlign "val" } else { $null }
          tcMar = $marginObject
          paragraphCount = $paras.Count
          paragraphs = $paras
        }
      }
      $tableMargins = [ordered]@{}
      foreach ($side in @("top", "right", "bottom", "left", "start", "end")) {
        $node = if ($tblCellMar) { Child $tblCellMar $side $ns } else { $null }
        if ($node) { $tableMargins[$side] = [ordered]@{ w = Attr $node "w"; type = Attr $node "type" } }
      }
      $result += [ordered]@{
        table = $ti + 1
        row = $ri + 1
        tableWidth = if ($tblW) { [ordered]@{ w = Attr $tblW "w"; type = Attr $tblW "type" } } else { $null }
        tableGrid = $grid
        tableCellMargins = $tableMargins
        trHeight = if ($trHeight) { [ordered]@{ val = Attr $trHeight "val"; points = [math]::Round(([double](Attr $trHeight "val")) / 20, 2); rule = Attr $trHeight "hRule" } } else { $null }
        cantSplit = [bool]($trPr -and (Child $trPr "cantSplit" $ns))
        cellCount = $cells.Count
        cells = $cells
      }
    }
  }
  $result | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $Out -Encoding utf8
  "OK targets=$($result.Count) tables=$($tables.Count) out=$Out"
} finally {
  $zip.Dispose()
  $stream.Dispose()
}
