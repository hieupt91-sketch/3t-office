"""Desktop acceptance probe for G7; needs pywebview, LibreOffice, and Office COM on Windows.

Copies small Office fixtures from E:\\VN OFice\\file test into the system temp directory,
drives VN Office through pywebview/evaluate_js, and leaves the source corpus untouched.
It never uses SendKeys. Run with: python scripts/test_g7_file_basics.py
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS = Path(r"E:\VN OFice\file test")
FIXTURES = {
    "writer": Path("landocx/d05.docx"),
    "sheet": Path("lan/lan25.xlsx"),
    "slides": Path("lan/BÁO CÁO KẾT QUẢ KINH DOANH NĂM 2021.pptx"),
}
COM_SCRIPT = r'''
param([string]$App, [string]$File, [string]$Marker)
$ErrorActionPreference = "Stop"
# Office COM rejects calls while busy (RPC_E_CALL_REJECTED): wait and retry the same call.
function Invoke-Com([scriptblock]$Call) {
  for ($attempt = 0; $attempt -lt 120; $attempt++) {
    try { return & $Call }
    catch {
      if ($_.Exception.Message -match "0x80010001|0x8001010A|RPC_E_CALL_REJECTED|RETRYLATER") { Start-Sleep -Milliseconds 500 }
      else { throw }
    }
  }
  throw "Office COM stayed busy (RPC_E_CALL_REJECTED) after 60 seconds"
}
$obj = $null
$stage = "start"
$officeNames = @{ writer = "WINWORD"; sheet = "EXCEL"; slides = "POWERPNT" }
$before = @(Get-Process $officeNames[$App] -ErrorAction SilentlyContinue | ForEach-Object Id)
try {
  switch ($App) {
    "writer" {
      $stage = "word.open"
      $obj = New-Object -ComObject Word.Application
      $obj.Visible = $false; $obj.DisplayAlerts = 0
      $doc = Invoke-Com { $obj.Documents.Open((Resolve-Path $File).Path, $false, $true, $false) }
      $stage = "word.read"
      $text = [string](Invoke-Com { $doc.Content.Text })
      $found = $text.Contains($Marker)
      $doc.Close(0)
    }
    "sheet" {
      $stage = "excel.open"
      $obj = New-Object -ComObject Excel.Application
      $obj.Visible = $false; $obj.DisplayAlerts = $false
      $book = Invoke-Com { $obj.Workbooks.Open((Resolve-Path $File).Path, 0, $true) }
      $found = $false
      $stage = "excel.read"
      $sheetCount = Invoke-Com { $book.Worksheets.Count }
      if (-not $sheetCount) { throw "Excel returned no readable workbook (Office blocked, e.g. activation prompt)" }
      for ($index = 1; $index -le $sheetCount; $index++) {
        $values = Invoke-Com { $book.Worksheets.Item($index).UsedRange.Value2 }
        if ($null -ne $values) {
          foreach ($value in $values) {
            if ([string]$value -eq $Marker) { $found = $true; break }
          }
        }
        if ($found) { break }
      }
      Invoke-Com { $book.Close($false) } | Out-Null
    }
    "slides" {
      $stage = "powerpoint.open"
      $obj = New-Object -ComObject PowerPoint.Application
      $deck = $obj.Presentations.Open((Resolve-Path $File).Path, $true, $false, $false)
      $found = $false
      $stage = "powerpoint.read"
      foreach ($slide in $deck.Slides) {
        foreach ($shape in $slide.Shapes) {
          if ($shape.HasTextFrame -and $shape.TextFrame.HasText -and ([string]$shape.TextFrame.TextRange.Text).Contains($Marker)) { $found = $true }
        }
      }
      $deck.Close()
    }
  }
  if ($found) { "COM_PASS" } else { "COM_FAIL marker not found" }
} catch { "COM_ERROR stage=$stage " + ($_.Exception.Message -replace "`r|`n", " ") }
finally {
  $quitOk = $false
  if ($null -ne $obj) { try { $obj.Quit(); $quitOk = $true } catch {} }
  if (-not $quitOk) {
    # A blocked instance (e.g. an Office activation prompt) cannot Quit; never leave it running.
    Get-Process $officeNames[$App] -ErrorAction SilentlyContinue | Where-Object { $before -notcontains $_.Id } |
      ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
  }
}
'''

PRINT_UIA_SCRIPT = r'''
param([string]$AppTitle, [string]$OutputPath, [int]$ExpectedPages = 0, [string]$PrinterName = "Microsoft Print to PDF")
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class G7Mouse {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hwnd);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
}
'@
function Bring-AppToFront() {
  try { [G7Mouse]::SetForegroundWindow([IntPtr]$appWindow.Current.NativeWindowHandle) | Out-Null } catch {}
  try { $appWindow.SetFocus() } catch {}
  Start-Sleep -Milliseconds 150
}
function Find-First($root, [System.Windows.Automation.Condition]$condition, $scope = [System.Windows.Automation.TreeScope]::Descendants) {
  return $root.FindFirst($scope, $condition)
}
function Find-Id($root, [string]$id) {
  return Find-First $root (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::AutomationIdProperty, $id))
}
function Click-Element($element) {
  $bounds = $element.Current.BoundingRectangle
  if ($bounds.Width -le 0 -or $bounds.Height -le 0) { throw "Control has no clickable area: $($element.Current.Name)" }
  [G7Mouse]::SetCursorPos([int]($bounds.X + $bounds.Width / 2), [int]($bounds.Y + $bounds.Height / 2)) | Out-Null
  [G7Mouse]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
  [G7Mouse]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
}
function Wait-First($root, [System.Windows.Automation.Condition]$condition, [int]$seconds = 25, $scope = [System.Windows.Automation.TreeScope]::Descendants, [string]$label = "UI Automation element") {
  $deadline = [DateTime]::UtcNow.AddSeconds($seconds)
  while ([DateTime]::UtcNow -lt $deadline) {
    $element = $root.FindFirst($scope, $condition)
    if ($null -ne $element) { return $element }
    Start-Sleep -Milliseconds 250
  }
  if ($label -eq "Save Print Output As dialog") {
    $desktopWindows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
      [System.Windows.Automation.TreeScope]::Children, $windowType)
    $windowNames = @()
    for ($index = 0; $index -lt $desktopWindows.Count; $index++) {
      $item = $desktopWindows.Item($index)
      $windowNames += "$($item.Current.Name) [pid=$($item.Current.ProcessId)]"
    }
    throw "Timed out waiting for $label. Desktop windows: $($windowNames -join ' | ')"
  }
  throw "Timed out waiting for $label"
}
function Get-PrintWindow($root) {
  $name = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "Print")
  $elements = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $name)
  for ($i = 0; $i -lt $elements.Count; $i++) {
    if ($elements.Item($i).Current.ControlType -eq [System.Windows.Automation.ControlType]::Window) { return $elements.Item($i) }
  }
  return $null
}
$root = [System.Windows.Automation.AutomationElement]::RootElement
$nameCondition = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, $AppTitle)
$windowType = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Window)
$appWindow = Wait-First $root (New-Object System.Windows.Automation.AndCondition($nameCondition, $windowType)) 20 ([System.Windows.Automation.TreeScope]::Children)
Bring-AppToFront
trap {
  $failure = $_
  try {
    $activePrint = Get-PrintWindow $appWindow
    if ($null -ne $activePrint) {
      $buttons = $activePrint.FindAll([System.Windows.Automation.TreeScope]::Descendants,
        (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)))
      for ($i = 0; $i -lt $buttons.Count; $i++) {
        if ($buttons.Item($i).Current.Name -eq "Cancel") {
          try { $buttons.Item($i).GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() }
          catch { Click-Element $buttons.Item($i) }
          break
        }
      }
    }
  } catch {}
  throw $failure
}
$printWindow = Wait-First $appWindow (New-Object System.Windows.Automation.AndCondition(
  (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "Print")),
  (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Window))
)) 45 ([System.Windows.Automation.TreeScope]::Descendants) "Print dialog"
$comboType = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::ComboBox)
$printerGroupCondition = New-Object System.Windows.Automation.AndCondition(
  (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "Printer")),
  (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Group))
)
$printerGroup = Wait-First $printWindow $printerGroupCondition 60 ([System.Windows.Automation.TreeScope]::Descendants) "Printer group"
$printer = Wait-First $printerGroup $comboType 30 ([System.Windows.Automation.TreeScope]::Descendants) "Printer selector"
$printerValue = $printer.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value
function Click-ComboDropdown($element) {
  Bring-AppToFront
  $bounds = $element.Current.BoundingRectangle
  [G7Mouse]::SetCursorPos([int]($bounds.X + $bounds.Width - 6), [int]($bounds.Y + $bounds.Height / 2)) | Out-Null
  [G7Mouse]::mouse_event(2, 0, 0, 0, [UIntPtr]::Zero)
  [G7Mouse]::mouse_event(4, 0, 0, 0, [UIntPtr]::Zero)
}
if ($printerValue -notlike "*$PrinterName*") {
  try { $printer.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).SetValue($PrinterName) } catch {}
  Start-Sleep -Milliseconds 400
  $printer = $printWindow.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $comboType)
  $printerValue = $printer.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value
}
if ($printerValue -notlike "*$PrinterName*") {
  try { $printer.GetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern).Expand() }
  catch { Click-ComboDropdown $printer }
  $printerItem = $null
  $deadline = [DateTime]::UtcNow.AddSeconds(15)
  do {
    $items = $printWindow.FindAll([System.Windows.Automation.TreeScope]::Descendants,
      (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::ListItem)))
    for ($i = 0; $i -lt $items.Count; $i++) {
      if ($items.Item($i).Current.Name -like "*$PrinterName*" -or $items.Item($i).Current.AutomationId -eq $PrinterName) {
        $printerItem = $items.Item($i); break
      }
    }
    if ($null -eq $printerItem) { Start-Sleep -Milliseconds 250 }
  } while ($null -eq $printerItem -and [DateTime]::UtcNow -lt $deadline)
  if ($null -eq $printerItem) { throw "Printer list has no $PrinterName item" }
  # Click the visible native list item; its SelectionItem pattern is exposed by Edge
  # but does not consistently commit the selected printer to the print dialog.
  try { $printerItem.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() }
  catch { Click-Element $printerItem }
  Start-Sleep -Milliseconds 350
  $printer = $printWindow.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $comboType)
  $printerValue = $printer.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value
  if ($printerValue -notlike "*$PrinterName*") { Click-Element $printerItem }
  $deadline = [DateTime]::UtcNow.AddSeconds(15)
  do {
    Start-Sleep -Milliseconds 250
    $printer = $printWindow.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $comboType)
    $printerValue = $printer.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value
  } while ($printerValue -notlike "*$PrinterName*" -and [DateTime]::UtcNow -lt $deadline)
  if ($printerValue -notlike "*$PrinterName*") { throw "Printer selection did not update: $printerValue" }
}

$paperCountText = ""
$textType = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Text)
$deadline = [DateTime]::UtcNow.AddSeconds(45)
do {
  $texts = $printWindow.FindAll([System.Windows.Automation.TreeScope]::Descendants, $textType)
  for ($i = 0; $i -lt $texts.Count; $i++) {
    if ($texts.Item($i).Current.Name -match '^Total:\s+(\d+)\s+sheets? of paper$') {
      $paperCountText = $texts.Item($i).Current.Name
      if ($ExpectedPages -le 0 -or [int]$Matches[1] -eq $ExpectedPages) { break }
    }
  }
  $countMatches = $paperCountText -match 'Total:\s+(\d+)\s+sheets? of paper'
  $countReady = $countMatches -and ($ExpectedPages -le 0 -or [int]$Matches[1] -eq $ExpectedPages)
  if (-not $countReady) { Start-Sleep -Milliseconds 350 }
} while (-not $countReady -and [DateTime]::UtcNow -lt $deadline)
if ($paperCountText -notmatch '(\d+)\s+sheets? of paper') { throw "Print page count unavailable: $paperCountText" }
$dialogPages = [int]$Matches[1]

$copies = Wait-First $printWindow (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Spinner)) 30 ([System.Windows.Automation.TreeScope]::Descendants) "Copies control"
$copiesPattern = $copies.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
$copiesPattern.SetValue("2")
$rangeGroup = Wait-First $printWindow (New-Object System.Windows.Automation.AndCondition(
    (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "Pages")),
    (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Group))
  )) 30 ([System.Windows.Automation.TreeScope]::Descendants) "Pages group"
$radioType = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::RadioButton)
$radios = $rangeGroup.FindAll([System.Windows.Automation.TreeScope]::Descendants, $radioType)
$rangeRadio = $null
for ($i = 0; $i -lt $radios.Count; $i++) {
  if ([string]::IsNullOrWhiteSpace($radios.Item($i).Current.Name)) { $rangeRadio = $radios.Item($i); break }
}
if ($null -eq $rangeRadio) { throw "Custom page range radio button not found" }
$rangeRadio.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select()
$rangeEdit = $rangeGroup.FindFirst([System.Windows.Automation.TreeScope]::Descendants,
  (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)))
$rangeEdit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).SetValue("1")
Start-Sleep -Milliseconds 300
$copiesValue = $copies.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value
$rangeValue = $rangeEdit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).Current.Value
$rangeSelected = $rangeRadio.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Current.IsSelected
$copiesAccepted = $copiesValue -eq "2"
$rangeAccepted = $rangeSelected -and $rangeValue -eq "1"
if (-not $copiesAccepted -or -not $rangeAccepted) {
  throw "Copies/range values were not retained: copies=$copiesValue accepted=$copiesAccepted; range=$rangeValue selected=$rangeSelected accepted=$rangeAccepted"
}

# Print the whole document once after proving copies and a custom page range are usable.
$copiesPattern.SetValue("1")
$allPages = $null
$allPages = $rangeGroup.FindFirst([System.Windows.Automation.TreeScope]::Descendants,
  (New-Object System.Windows.Automation.AndCondition(
    (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "All")),
    $radioType
  )))
if ($null -eq $allPages) { throw "All pages radio button not found" }
try { $allPages.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Select() }
catch { Click-Element $allPages }
$allPages = $rangeGroup.FindFirst([System.Windows.Automation.TreeScope]::Descendants,
  (New-Object System.Windows.Automation.AndCondition(
    (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "All")),
    $radioType
  )))
Start-Sleep -Milliseconds 300
$allAccepted = $allPages.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern).Current.IsSelected
if (-not $allAccepted) { throw "Could not restore the All pages option" }
[ordered]@{ printer = $printerValue; pages = $dialogPages; copiesControl = $copiesAccepted; pageRangeControl = $rangeAccepted } |
  ConvertTo-Json -Compress | ForEach-Object { "PRINT_UIA_OPTIONS=$_" }
$buttonType = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Button)
$buttons = $printWindow.FindAll([System.Windows.Automation.TreeScope]::Descendants, $buttonType)
$printButton = $null
for ($i = 0; $i -lt $buttons.Count; $i++) {
  if ($buttons.Item($i).Current.Name -eq "Print") { $printButton = $buttons.Item($i); break }
}
if ($null -eq $printButton) { throw "Print button not found" }
Bring-AppToFront
Click-Element $printButton
$saveName = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "Save Print Output As")
$saveDialog = Wait-First $root (New-Object System.Windows.Automation.AndCondition($saveName, $windowType)) 60 ([System.Windows.Automation.TreeScope]::Descendants) "Save Print Output As dialog"
$fileName = $saveDialog.FindFirst([System.Windows.Automation.TreeScope]::Descendants,
  (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, [System.Windows.Automation.ControlType]::Edit)))
$fileName.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern).SetValue($OutputPath)
$saveButton = $saveDialog.FindFirst([System.Windows.Automation.TreeScope]::Descendants,
  (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, "Save")))
try { $saveButton.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern).Invoke() } catch { Click-Element $saveButton }
$deadline = [DateTime]::UtcNow.AddSeconds(45)
while (-not (Test-Path -LiteralPath $OutputPath) -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 250 }
if (-not (Test-Path -LiteralPath $OutputPath)) { throw "Microsoft Print to PDF did not create $OutputPath" }
[ordered]@{ printer = $printerValue; pages = $dialogPages; copiesControl = $copiesAccepted; pageRangeControl = $rangeAccepted; output = $OutputPath } | ConvertTo-Json -Compress | ForEach-Object { "PRINT_UIA_RESULT=$_" }
'''


def package_has_marker(path: Path, marker: str) -> str:
    """Independent evidence (not a replacement for Office): is the marker inside the saved OOXML XML?"""
    import zipfile
    try:
        with zipfile.ZipFile(path) as package:
            for name in package.namelist():
                if name.endswith(".xml") and marker.encode("utf-8") in package.read(name):
                    return f"yes ({name})"
        return "no"
    except (OSError, zipfile.BadZipFile) as error:
        return f"unreadable ({error})"


def office_com_check(app: str, path: Path, marker: str) -> tuple[str, str]:
    status, detail = _office_com_check(app, path, marker)
    return status, f"{detail} | package-xml marker: {package_has_marker(path, marker)}"


def _office_com_check(app: str, path: Path, marker: str) -> tuple[str, str]:
    helper = path.parent / "_verify_g7_office.ps1"
    if not helper.exists():
        helper.write_text(COM_SCRIPT, encoding="utf-8")
    try:
        output = ""
        for attempt in range(2):
            completed = subprocess.run(
                ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(helper), "-App", app, "-File", str(path), "-Marker", marker],
                capture_output=True, text=True, timeout=180, encoding="utf-8", errors="replace",
            )
            output = (completed.stdout or completed.stderr).strip()
            if "RPC_E_CALL_REJECTED" not in output or attempt == 1:
                break
            time.sleep(2)
        if "COM_PASS" in output:
            return "PASS", output
        if "COM_ERROR" in output and any(name in output.lower() for name in ("class not registered", "80040154", "cannot create activex")):
            return "BLOCKED", output
        if "RPC_E_CALL_REJECTED" in output or "Office blocked" in output or "0x800AC472" in output:
            return "BLOCKED", "Office COM server kept rejecting calls during verification after retries: " + output
        return "FAIL", output or f"PowerShell exit={completed.returncode}"
    except subprocess.TimeoutExpired:
        return "BLOCKED", "Office COM probe exceeded 180 seconds"
    except OSError as error:
        return "BLOCKED", str(error)


def pdf_page_count(path: Path) -> int:
    data = path.read_bytes()
    return len(re.findall(rb"/Type\s*/Page(?!s)\b", data))


def print_to_microsoft_pdf(window, app: str, output_path: Path, expected_pages: int) -> dict:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    print_methods = {
        "writer": "adapter.print()",
        "sheet": "grid.print()",
        "slides": "canvasController.print()",
    }
    close_methods = {
        "writer": "adapter.closePrintPreview()",
        "sheet": "grid.closePrintPreview()",
        "slides": "canvasController.closePrintPreview()",
    }
    try:
        output_path.unlink(missing_ok=True)
        container_id = {"writer": "vno-print-preview-overlay", "sheet": "vno-sheet-print-only", "slides": "vno-slides-print-only"}[app]
        page_class = {"writer": "vno-print-preview-sheet", "sheet": "vno-sheet-print-page", "slides": "vno-slides-print-page"}[app]
        window.evaluate_js(f"""(() => {{
          window.__g7PrintMediaDiagnostics = null;
          window.addEventListener('beforeprint', () => {{
            const target = document.getElementById({json.dumps(container_id)});
            const describe = element => {{
              if (!element) return null;
              const style = getComputedStyle(element), rect = element.getBoundingClientRect();
              return {{tag: element.tagName, id: element.id, className: String(element.className || ''), display: style.display,
                position: style.position, overflow: style.overflow, width: Math.round(rect.width), height: Math.round(rect.height),
                breakAfter: style.breakAfter, pageBreakAfter: style.pageBreakAfter}};
            }};
            window.__g7PrintMediaDiagnostics = {{matches: matchMedia('print').matches, body: describe(document.body),
              children: [...document.body.children].map(describe), target: describe(target),
              pageCount: target?.querySelectorAll('.{page_class}').length || 0,
              pages: [...(target?.querySelectorAll('.{page_class}') || [])].slice(0, 3).map(describe)}};
          }}, {{once: true}});
        }})()""")
        scheduled = window.evaluate_js(f"setTimeout(() => window.__vnoAppInstance.{print_methods[app]}, 250); 'scheduled'")
        if scheduled != "scheduled":
            raise RuntimeError(f"window.print was not scheduled: {scheduled!r}")
        helper = output_path.parent / "_g7_print_uia.ps1"
        if not helper.exists():
            helper.write_text(PRINT_UIA_SCRIPT, encoding="utf-8")
        app_title = str(getattr(window, "title", ""))
        completed = subprocess.run(
            ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(helper),
             "-AppTitle", app_title, "-OutputPath", str(output_path), "-ExpectedPages", str(expected_pages)],
            capture_output=True, text=True, timeout=240, encoding="utf-8", errors="replace",
        )
        # Printing opens the same preview overlay used by the app's Preview command.
        # Close it after the native dialog finishes so later probe shortcuts reach the editor.
        try:
            media_diagnostics = evaluate_js_json(window, "window.__g7PrintMediaDiagnostics")
        except Exception:
            media_diagnostics = None
        window.evaluate_js(f"window.__vnoAppInstance.{close_methods[app]}; true")
        output = (completed.stdout or "") + "\n" + (completed.stderr or "")
        line = next((item for item in output.splitlines() if item.startswith("PRINT_UIA_RESULT=")), "")
        if completed.returncode != 0 or not line:
            options_line = next((item for item in output.splitlines() if item.startswith("PRINT_UIA_OPTIONS=")), "")
            if options_line:
                partial = json.loads(options_line.split("=", 1)[1])
                partial.update({"error": output.strip(), "output": str(output_path)})
                partial["renderDiagnostics"] = media_diagnostics
                return partial
            raise RuntimeError(output.strip() or f"UI Automation exit={completed.returncode}")
        result = json.loads(line.split("=", 1)[1])
        result["pdfPages"] = pdf_page_count(output_path)
        result["pdfBytes"] = output_path.stat().st_size
        result["renderDiagnostics"] = media_diagnostics
        return result
    except Exception as error:
        return {"error": f"{type(error).__name__}: {error}", "output": str(output_path)}






def copy_fixtures(temp_root: Path) -> dict[str, tuple[Path, Path]]:
    copied = {}
    for app, relative in FIXTURES.items():
        source = CORPUS / relative
        if not source.is_file():
            raise FileNotFoundError(f"Required fixture missing: {source}")
        first = temp_root / f"{app}_open{source.suffix.lower()}"
        second = temp_root / f"{app}_replacement{source.suffix.lower()}"
        shutil.copy2(source, first)
        shutil.copy2(source, second)
        copied[app] = (first, second)
    return copied


def run_probe(app: str, first: Path, second: Path, out_dir: Path) -> tuple[dict, str]:
    result_path = out_dir / f"{app}.json"
    command = [sys.executable, str(Path(__file__).resolve()), "--probe", str(ROOT), app, str(first), str(second), str(out_dir), str(result_path)]
    try:
        completed = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=900, encoding="utf-8", errors="replace")
    except subprocess.TimeoutExpired as error:
        return {"status": "BLOCKED", "error": "pywebview session exceeded 900 seconds"}, str(error)
    if not result_path.exists():
        return {"status": "FAIL", "error": "probe did not write a result"}, (completed.stdout + "\n" + completed.stderr)[-4000:]
    try:
        payload = json.loads(result_path.read_text(encoding="utf-8"))
    except Exception as error:
        return {"status": "FAIL", "error": str(error)}, (completed.stdout + "\n" + completed.stderr)[-4000:]
    return payload, (completed.stdout + "\n" + completed.stderr)[-4000:]


def evaluate_js_json(window, expression: str):
    result = window.evaluate_js(f"JSON.stringify(({expression}))")
    if isinstance(result, str):
        return json.loads(result)
    return result


def wait_for(window, expression: str, predicate, timeout: float = 80, interval: float = 0.5):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        try:
            last = evaluate_js_json(window, expression)
            if predicate(last):
                return last
        except Exception:
            pass
        time.sleep(interval)
    raise TimeoutError(f"Timed out waiting for JavaScript state: {expression}; last={last!r}")


def wait_for_window_count(webview_module, expected_count: int, timeout: float = 45):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if len(webview_module.windows) == expected_count:
            return list(webview_module.windows)
        time.sleep(0.25)
    raise TimeoutError(f"Timed out waiting for {expected_count} pywebview windows; saw {len(webview_module.windows)}")


def start_promise(window, expression: str) -> str:
    js = """(() => {
      window.__g7Runs ||= {}; const id = `g7-${Date.now()}-${Math.random()}`;
      window.__g7Runs[id] = { done: false };
      Promise.resolve().then(() => (EXPRESSION)).then(value => {
        window.__g7Runs[id] = { done: true, ok: true, value: value === undefined ? null : value };
      }, error => { window.__g7Runs[id] = { done: true, ok: false, error: String(error?.stack || error) }; });
      return id;
    })()""".replace("EXPRESSION", expression)
    return str(window.evaluate_js(js))


def await_promise(window, run_id: str, timeout: float = 240):
    state = wait_for(window, f"window.__g7Runs[{json.dumps(run_id)}]", lambda value: bool(value and value.get("done")), timeout)
    if not state.get("ok"):
        raise RuntimeError(state.get("error", "page promise failed"))
    return state.get("value")


def run_command(window, command: str, timeout: float = 240):
    run_id = start_promise(window, f"import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute({json.dumps(command)}))")
    return await_promise(window, run_id, timeout)


def trigger_shortcut(window, key: str, *, ctrl: bool = False, shift: bool = False):
    window.evaluate_js(
        "window.dispatchEvent(new KeyboardEvent('keydown', {key: " + json.dumps(key) +
        f", ctrlKey: {str(ctrl).lower()}, shiftKey: {str(shift).lower()}, bubbles: true, cancelable: true}})); true"
    )


def wait_app(window):
    return wait_for(window, "!!window.__vnoAppInstance?.adapter", bool, timeout=90)


def inspect_blank(window, app: str) -> dict:
    state = evaluate_js_json(window, f"""(() => {{
      const app = window.__vnoAppInstance, adapter = app?.adapter, shell = app?.shell;
      const common = {{ name: shell?.documentName || "", tab: document.querySelector('.vno-doc-tab span')?.textContent || "",
        title: document.title, dirty: !!adapter?.isDirty,
        recent: JSON.parse(localStorage.getItem('vno_recent_documents') || '[]').filter(item => item?.path).length }};
      if ({json.dumps(app)} === "writer") {{
        const body = adapter?.bodyDom;
        return {{...common, text: body?.innerText || "", html: body?.innerHTML || "", pages: adapter?.paginateContent?.()?.length || 0}};
      }}
      if ({json.dumps(app)} === "sheet") {{
        const grid = app.grid;
        return {{...common, sheets: grid?.sheets || [], active: grid?.activeSheet || "", selected: grid?.selectedCoord || null,
          dataCount: grid?.cellsData?.size ?? -1}};
      }}
      const slides = app.canvasController?.slides || [];
      return {{...common, slideCount: slides.length, slides: slides.map(slide => ({{title: slide.title || "", body: slide.body || "", notes: slide.notes || ""}}))}};
    }})()""")
    state["windowTitle"] = str(getattr(window, "title", ""))
    return state


def insert_marker(window, app: str, marker: str) -> None:
    escaped = json.dumps(marker)
    if app == "writer":
        expression = f"""(() => {{ const a=window.__vnoAppInstance.adapter, b=a.bodyDom;
          b.insertAdjacentHTML('beforeend', '<p>' + {escaped} + '</p>');
          b.dispatchEvent(new InputEvent('input', {{bubbles:true, inputType:'insertText', data:{escaped}}})); a.isDirty=true; return true; }})()"""
    elif app == "sheet":
        close_marker = "-close-save" in marker
        col = "B" if close_marker else "A"
        expression = f"""(() => {{ const a=window.__vnoAppInstance; a.grid.setCellValue('{col}', 1, {escaped}, false); a.adapter.isDirty=true; return true; }})()"""
    else:
        close_marker = "-close-save" in marker
        target_index = "Math.min(1, c.slides.length - 1)" if close_marker else "c.currentSlideIndex"
        expression = f"""(() => {{ const a=window.__vnoAppInstance, c=a.canvasController;
          const targetIndex={target_index}; if (targetIndex !== c.currentSlideIndex) c.selectSlide(targetIndex);
          const slide=c.slides[targetIndex], shape=slide?.shapes?.find(item => String(item.text || '').trim());
          if (shape) {{ shape.text={escaped}; delete shape.textHtml; }}
          c.titleEl.innerText={escaped}; c._syncEditableFieldsFromDom(); slide.title={escaped}; delete slide.titleHtml;
          c._renderShapesLayer();
          a.adapter.isDirty=true; return true; }})()"""
    if not window.evaluate_js(expression):
        raise RuntimeError(f"Could not insert marker into {app}")


def preview_info(window, app: str) -> dict:
    fonts_ready = start_promise(
        window,
        "Promise.resolve(document.fonts?.ready).then(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))))",
    )
    await_promise(window, fonts_ready, 30)
    methods = {"writer": "adapter.openPrintPreview()", "sheet": "grid.openPrintPreview()", "slides": "canvasController.openPrintPreview()"}
    window.evaluate_js(f"window.__vnoAppInstance.{methods[app]}; 'opened'")
    if app == "writer":
        selector = ".vno-print-preview-sheet"
        total_selector = ".vno-print-preview-total-pages"
    elif app == "sheet":
        selector = ".vno-sheet-print-preview-page"
        total_selector = ".vno-sheet-pp-total"
    else:
        selector = ".vno-slides-print-preview-page"
        total_selector = ".vno-slides-pp-total"
    info = evaluate_js_json(window, f"""(() => {{ const el=document.querySelector({json.dumps('.vno-print-preview-overlay' if app == 'writer' else '.vno-sheet-print-preview-overlay' if app == 'sheet' else '.vno-slides-print-preview-overlay')});
      return {{count: document.querySelectorAll({json.dumps(selector)}).length,
        totalPages: Number(document.querySelector({json.dumps(total_selector)})?.textContent || 0),
        text: (el?.innerText || '').slice(0,30000)}}; }})()""")
    close_methods = {"writer": "adapter.closePrintPreview()", "sheet": "grid.closePrintPreview()", "slides": "canvasController.closePrintPreview()"}
    try:
        window.evaluate_js(f"window.__vnoAppInstance.{close_methods[app]}; 'closed'")
    except Exception:
        pass
    return info


def desktop_probe(app: str, first: Path, second: Path, out_dir: Path, result_path: Path) -> int:
    # Keep this automation isolated from the developer's real VN Office profile and prior probe runs.
    profile_root = Path(os.environ.get("VNO_G7_PROFILE_ROOT") or out_dir) / app
    local_app_data = profile_root / "LocalAppData"
    roaming_app_data = profile_root / "AppData"
    local_app_data.mkdir(parents=True, exist_ok=True)
    roaming_app_data.mkdir(parents=True, exist_ok=True)
    os.environ["LOCALAPPDATA"] = str(local_app_data)
    os.environ["APPDATA"] = str(roaming_app_data)
    import webview
    import main as vnmain

    server, port = vnmain._start_static_server()
    vnmain._DOCUMENT_SEQUENCE[app] = 1
    api = vnmain.VnOfficeApi(app_kind=app, server_port=port)
    window = webview.create_window(
        title=f"G7 {app}", url=vnmain.build_launch_url(app, None, port=port),
        width=1366, height=900, min_size=(960, 640), js_api=api, text_select=True,
    )
    vnmain._register_app_window(api, window)
    open_queue = [str(first), str(second)]
    save_queue = [str(out_dir / f"{app}_saveas.pdf")]
    dialog_calls = []

    def fake_dialog(dialog_type, *args, **kwargs):
        dialog_calls.append({"type": int(dialog_type), "kwargs": {key: list(value) if isinstance(value, tuple) else value for key, value in kwargs.items()}})
        if dialog_type == webview.OPEN_DIALOG:
            return [open_queue.pop(0)] if open_queue else []
        if dialog_type == webview.SAVE_DIALOG:
            return [save_queue.pop(0)] if save_queue else []
        return []

    def after_loaded(win):
        outcome = {"app": app, "checks": {}, "errors": [], "dialogCalls": dialog_calls}
        def checkpoint(step: str):
            outcome["step"] = step
            result_path.write_text(json.dumps(outcome, ensure_ascii=False, indent=2), encoding="utf-8")
        try:
            wait_app(win)
            blank = inspect_blank(win, app)
            outcome["blank"] = blank
            preview = preview_info(win, app)
            outcome["blankPreview"] = preview
            outcome["checks"]["blank"] = is_blank_ok(app, blank)
            outcome["checks"]["blankPreview"] = preview["count"] > 0 and not any(
                sample in preview["text"] for sample in ("Dự toán kinh phí", "Kế hoạch Q3", "Tiêu đề trang chiếu", "Nhập nội dung chính", "QUYẾT ĐỊNH")
            )

            initial_window = win
            checkpoint("blank")
            initial_before_new = blank
            trigger_shortcut(win, "n", ctrl=True)
            wait_for_window_count(webview, 2, timeout=35)
            child = next(candidate for candidate in webview.windows if candidate.uid != win.uid)
            wait_for(child, "!!window.__vnoAppInstance?.adapter", bool, timeout=90)
            child_blank = inspect_blank(child, app)
            after_new = inspect_blank(initial_window, app)
            outcome["new"] = {"first": after_new, "second": child_blank}
            outcome["checks"]["new"] = is_blank_ok(app, child_blank, number=2) and after_new == initial_before_new
            checkpoint("new")

            # A clean close must close the child without ever rendering the three-choice prompt.
            # The bridge Promise is torn down with the WebView, so observe native window removal instead.
            start_promise(child, "window.__vnoAppInstance.shell.requestCloseDocument()")
            wait_for_window_count(webview, 1, timeout=30)
            outcome["checks"]["cleanClose"] = True
            checkpoint("cleanClose")

            # New document + Ctrl+S must open Save As with "<Tên> 3.<ext>" and write a real Office file.
            ext = {"writer": "docx", "sheet": "xlsx", "slides": "pptx"}[app]
            new_target = out_dir / f"{app}_new_saved.{ext}"
            new_calls = []

            def new_doc_dialog(dialog_type, *args, **kwargs):
                new_calls.append({"type": int(dialog_type), "kwargs": {key: list(value) if isinstance(value, tuple) else value for key, value in kwargs.items()}})
                return [str(new_target)] if dialog_type == webview.SAVE_DIALOG else []

            trigger_shortcut(win, "n", ctrl=True)
            wait_for_window_count(webview, 2, timeout=35)
            new_child = next(candidate for candidate in webview.windows if candidate.uid != win.uid)
            wait_app(new_child)
            new_child.create_file_dialog = new_doc_dialog
            new_marker = f"VNOfficeG7-{app}-new-save"
            insert_marker(new_child, app, new_marker)
            trigger_shortcut(new_child, "s", ctrl=True)
            wait_for(new_child, "!window.__vnoAppInstance.adapter.isDirty", bool, timeout=240)
            new_state = inspect_blank(new_child, app)
            outcome["newSave"] = {"state": new_state, "calls": new_calls, "path": str(new_target)}
            outcome["checks"]["newCtrlSOpensSaveAs"] = (
                len(new_calls) == 1 and new_calls[0]["kwargs"].get("save_filename") == {
                    "writer": "Tài liệu 3.docx", "sheet": "Bảng tính 3.xlsx", "slides": "Bản trình bày 3.pptx"}[app]
                and new_target.is_file() and new_state["name"] == new_target.name and not new_state["dirty"]
            )
            start_promise(new_child, "window.__vnoAppInstance.shell.requestCloseDocument()")
            wait_for_window_count(webview, 1, timeout=30)
            checkpoint("newSave")

            # Route native dialogs to copied fixtures and capture their actual filter/default-name arguments.
            win.create_file_dialog = fake_dialog
            trigger_shortcut(win, "o", ctrl=True)
            wait_for(win, "!!window.__vnoAppInstance.adapter.isDirty || !!window.__vnoAppInstance.adapter._sourcePath || !!window.__vnoAppInstance.adapter.sourceFilePath", bool, timeout=300)
            wait_for(win, f"window.__vnoAppInstance.shell.documentName === {json.dumps(first.name)}", bool, timeout=60)
            first_state = inspect_blank(win, app)
            first_path = read_source_path(win, app)
            outcome["openedFirst"] = {"state": first_state, "path": first_path}
            outcome["checks"]["openFilter"] = dialog_has_filter(dialog_calls, app)
            checkpoint("openedFirst")

            marker1 = f"VNOfficeG7-{app}-replace-save"
            insert_marker(win, app, marker1)
            # Opening another file while dirty must show Save / Don't Save / Cancel; choose Save.
            trigger_shortcut(win, "o", ctrl=True)
            wait_for(win, "!!document.querySelector('[data-unsaved-choice=save]')", bool, timeout=25)
            win.evaluate_js("document.querySelector('[data-unsaved-choice=save]').click(); true")
            wait_for(win, f"window.__vnoAppInstance.shell.documentName === {json.dumps(second.name)} && !window.__vnoAppInstance.adapter.isDirty", bool, timeout=300)
            outcome["checks"]["dirtyOpenSaveChoice"] = True
            checkpoint("dirtyOpenSaveChoice")

            marker2 = f"VNOfficeG7-{app}-cancel-then-save"
            insert_marker(win, app, marker2)
            outcome["insertedMarker"] = inspect_blank(win, app)
            if app == "slides":
                outcome["slideShapesAfterInsert"] = evaluate_js_json(win, "window.__vnoAppInstance.canvasController.slides[0].shapes.filter(shape => shape.text).map(({id,type,text,x,y}) => ({id,type,text,x,y})).slice(0,8)")
            title_before_cancel = inspect_blank(win, app)["title"]
            trigger_shortcut(win, "o", ctrl=True)
            wait_for(win, "!!document.querySelector('[data-unsaved-choice=cancel]')", bool, timeout=25)
            win.evaluate_js("document.querySelector('[data-unsaved-choice=cancel]').click(); true")
            wait_for(win, "window.__vnoAppInstance.adapter.isDirty", bool, timeout=25)
            after_cancel = inspect_blank(win, app)
            outcome["cancelOpen"] = after_cancel
            outcome["checks"]["dirtyOpenCancel"] = after_cancel["dirty"] and after_cancel["title"] == title_before_cancel and read_source_path(win, app) == str(second)

            trigger_shortcut(win, "s", ctrl=True)
            wait_for(win, "!window.__vnoAppInstance.adapter.isDirty", bool, timeout=300)
            outcome["checks"]["saveInPlace"] = not inspect_blank(win, app)["dirty"] and read_source_path(win, app) == str(second)
            outcome["afterInPlaceSave"] = inspect_blank(win, app)
            if app == "slides":
                outcome["slideShapesAfterSave"] = evaluate_js_json(win, "window.__vnoAppInstance.canvasController.slides[0].shapes.filter(shape => shape.text).map(({id,type,text,x,y}) => ({id,type,text,x,y})).slice(0,8)")
            checkpoint("saveInPlace")

            # Canceling the native Open picker leaves the current file, title, and dirty flag untouched.
            before_open_cancel = inspect_blank(win, app)
            open_cancel_id = start_promise(win, "window.__vnoAppInstance.adapter.open()")
            open_cancel_result = await_promise(win, open_cancel_id, 30)
            after_open_cancel = inspect_blank(win, app)
            outcome["checks"]["openDialogCancel"] = (
                open_cancel_result is False and after_open_cancel == before_open_cancel
                and read_source_path(win, app) == str(second)
            )
            checkpoint("openDialogCancel")

            # Save As (F12) proposes the current name/format first; choosing PDF only exports a copy
            # (Word/Excel/PowerPoint keep the open document's name, format and path).
            pdf_target = Path(save_queue[0])
            before_pdf = inspect_blank(win, app)
            trigger_shortcut(win, "F12")
            pdf_deadline = time.time() + 180
            while time.time() < pdf_deadline and not (pdf_target.is_file() and pdf_target.stat().st_size > 0):
                time.sleep(0.5)
            time.sleep(1.0)
            final_state = inspect_blank(win, app)
            outcome["saveAsStatus"] = evaluate_js_json(win, "document.getElementById('vno-status-docinfo')?.textContent || ''")
            save_calls = [call for call in dialog_calls if call["type"] == int(webview.SAVE_DIALOG)]
            outcome["saveAs"] = {"state": final_state, "path": read_source_path(win, app), "pdf": str(pdf_target),
                                 "suggested": [call["kwargs"].get("save_filename") for call in save_calls],
                                 "firstFilter": [(call["kwargs"].get("file_types") or [""])[0] for call in save_calls],
                                 "directory": [call["kwargs"].get("directory") for call in save_calls]}
            suggested = outcome["saveAs"]["suggested"]
            outcome["checks"]["saveAsProposesCurrent"] = bool(suggested) and suggested[-1] == second.name
            outcome["checks"]["saveAsCurrentFormatFirst"] = outcome["saveAs"]["firstFilter"][-1].endswith(f"(*{second.suffix.lower()})")
            outcome["checks"]["saveAsStartsInFileFolder"] = outcome["saveAs"]["directory"][-1] == str(second.parent)
            outcome["checks"]["saveAsPdfExportsCopy"] = (
                pdf_target.is_file() and pdf_target.read_bytes()[:5] == b"%PDF-"
                and final_state["name"] == before_pdf["name"] and final_state["dirty"] == before_pdf["dirty"]
                and read_source_path(win, app) == str(second)
            )
            checkpoint("saveAs")

            # Reopen the saved source through the native Open path, then compare preview pages with the model.
            open_queue.append(str(second))
            trigger_shortcut(win, "o", ctrl=True)
            wait_for(win, f"window.__vnoAppInstance.shell.documentName === {json.dumps(second.name)} && !window.__vnoAppInstance.adapter.isDirty", bool, timeout=240)
            reopened = win
            reopened_state = inspect_blank(reopened, app)
            outcome["reopened"] = reopened_state
            if app == "slides":
                outcome["slideShapesAfterReopen"] = evaluate_js_json(reopened, "window.__vnoAppInstance.canvasController.slides[0].shapes.filter(shape => shape.text).map(({id,type,text,x,y}) => ({id,type,text,x,y})).slice(0,8)")
            if app == "sheet":
                outcome["checks"]["reopenSaved"] = evaluate_js_json(
                    reopened, f"window.__vnoAppInstance.grid.cellsData.get('A1')?.val === {json.dumps(marker2)}"
                )
            elif app == "slides":
                outcome["checks"]["reopenSaved"] = evaluate_js_json(
                    reopened,
                    f"window.__vnoAppInstance.canvasController.slides.some(slide => (slide.title || '') === {json.dumps(marker2)} || (slide.shapes || []).some(shape => (shape.text || '') === {json.dumps(marker2)}))",
                )
            else:
                outcome["checks"]["reopenSaved"] = marker2 in json.dumps(reopened_state, ensure_ascii=False)
            if app == "slides":
                outcome["printModel"] = evaluate_js_json(
                    reopened,
                    "(() => { const c=window.__vnoAppInstance.canvasController; return {slideCount:c.slides.length, hiddenCount:c.slides.filter(slide => slide.hidden).length, pageCount:c.computePrintPages().totalPages}; })()",
                )
            reopened_preview = preview_info(reopened, app)
            outcome["openedDocumentPreview"] = reopened_preview
            outcome["checks"]["openedDocumentPreview"] = (
                reopened_preview["count"] > 0
                and reopened_preview["totalPages"] > 0
                and marker2 in reopened_preview["text"]
            )
            print_path = out_dir / f"{app}_microsoft-print-to-pdf.pdf"
            print_result = print_to_microsoft_pdf(reopened, app, print_path, reopened_preview["totalPages"])
            outcome["microsoftPrintToPdf"] = print_result
            outcome["checks"]["printDialogOptions"] = (
                print_result.get("printer") == "Microsoft Print to PDF"
                and print_result.get("copiesControl") is True
                and print_result.get("pageRangeControl") is True
            )
            outcome["checks"]["printPageCount"] = (
                print_result.get("pages") == reopened_preview["totalPages"]
                and print_result.get("pdfPages") == reopened_preview["totalPages"]
            )
            outcome["printPdfOfficeContent"] = office_com_check("writer", print_path, marker2)
            outcome["checks"]["printPdfContent"] = outcome["printPdfOfficeContent"][0] == "PASS"
            recent_paths = evaluate_js_json(
                reopened,
                "JSON.parse(localStorage.getItem('vno_recent_documents') || '[]').map(x => x.path)",
            )
            outcome["recentPaths"] = recent_paths
            outcome["checks"]["recentOnlyRealPaths"] = bool(recent_paths) and all(
                isinstance(path, str) and Path(path).is_file() for path in recent_paths
            )
            checkpoint("reopen")

            corrupt = out_dir / f"{app}_corrupt{first.suffix.lower()}"
            corrupt.write_bytes(b"not a valid Office document package")
            open_queue.append(str(corrupt))
            title_before_bad_open = inspect_blank(win, app)["title"]
            source_before_bad_open = read_source_path(win, app)
            trigger_shortcut(win, "o", ctrl=True)
            wait_for(win, "!!document.querySelector('.vno-dialog-overlay')", bool, timeout=300)
            error_text = evaluate_js_json(win, "document.querySelector('.vno-dialog-overlay')?.innerText || ''")
            outcome["badOpen"] = {"message": error_text}
            win.evaluate_js("document.querySelector('.vno-dialog-ok-btn')?.click(); true")
            wait_for(win, "!document.querySelector('.vno-dialog-overlay')", bool, timeout=30)
            current_has_marker = evaluate_js_json(win, f"""(() => {{ const a=window.__vnoAppInstance;
              if ({json.dumps(app)} === 'writer') return (a.adapter.bodyDom?.innerText || '').includes({json.dumps(marker2)});
              if ({json.dumps(app)} === 'sheet') return a.grid.cellsData.get('A1')?.val === {json.dumps(marker2)};
              return a.canvasController.slides.some(slide => [slide.title, slide.body].some(text => String(text || '').includes({json.dumps(marker2)}))
                || (slide.shapes || []).some(shape => String(shape.text || '').includes({json.dumps(marker2)})));
            }})()""")
            after_bad_open = inspect_blank(win, app)
            outcome["checks"]["badOpenKeepsCurrent"] = (
                "Không thể mở" in error_text and after_bad_open["title"] == title_before_bad_open
                and read_source_path(win, app) == source_before_bad_open and current_has_marker
            )
            checkpoint("badOpen")

            # Exercise all three Office choices for a dirty document close.
            marker_close = f"VNOfficeG7-{app}-close-save"
            insert_marker(win, app, marker_close)
            close_cancel = start_promise(win, "window.__vnoAppInstance.shell.requestCloseDocument()")
            wait_for(win, "!!document.querySelector('[data-unsaved-choice=cancel]')", bool, timeout=25)
            win.evaluate_js("document.querySelector('[data-unsaved-choice=cancel]').click(); true")
            close_cancel_result = await_promise(win, close_cancel, 30)
            outcome["checks"]["dirtyCloseCancel"] = close_cancel_result is False and bool(inspect_blank(win, app)["dirty"])

            trigger_shortcut(win, "n", ctrl=True)
            wait_for_window_count(webview, 2, timeout=35)
            discard_window = next(candidate for candidate in webview.windows if candidate.uid != win.uid)
            wait_app(discard_window)
            insert_marker(discard_window, app, f"VNOfficeG7-{app}-close-discard")
            start_promise(discard_window, "window.__vnoAppInstance.shell.requestCloseDocument()")
            wait_for(discard_window, "!!document.querySelector('[data-unsaved-choice=discard]')", bool, timeout=25)
            discard_window.evaluate_js("document.querySelector('[data-unsaved-choice=discard]').click(); true")
            wait_for_window_count(webview, 1, timeout=30)
            outcome["checks"]["dirtyCloseDiscard"] = True

            close_save = start_promise(win, "window.__vnoAppInstance.shell.requestCloseDocument()")
            wait_for(win, "!!document.querySelector('[data-unsaved-choice=save]')", bool, timeout=25)
            win.evaluate_js("document.querySelector('[data-unsaved-choice=save]').click(); true")
            wait_for_window_count(webview, 0, timeout=90)
            outcome["checks"]["dirtyCloseSave"] = True
            outcome["dirtyCloseSavePath"] = str(second)

        except Exception as error:
            outcome["errors"].append(f"{type(error).__name__}: {error}")
        finally:
            try:
                for active_api in list(vnmain._APP_WINDOW_APIS.values()):
                    active_api._allow_window_close = True
                for extra in list(webview.windows):
                    try:
                        extra.destroy()
                    except Exception:
                        pass
            except Exception:
                pass
            try:
                result_path.write_text(json.dumps(outcome, ensure_ascii=False, indent=2), encoding="utf-8")
                print("G7_RESULT " + json.dumps(outcome, ensure_ascii=False), flush=True)
            except Exception as error:
                print(f"G7_WRITE_ERROR {error}", flush=True)

    webview.start(after_loaded, window, debug=False)
    return 0


def is_blank_ok(app: str, state: dict, number: int = 1) -> bool:
    expected_names = {"writer": f"Tài liệu {number}.docx", "sheet": f"Bảng tính {number}.xlsx", "slides": f"Bản trình bày {number}.pptx"}
    if (state.get("name") != expected_names[app] or state.get("tab") != expected_names[app]
        or not state.get("title", "").startswith(expected_names[app])
        or not state.get("windowTitle", "").startswith(expected_names[app]) or state.get("dirty")):
        return False
    if app == "writer":
        return not state.get("text", "").strip() and "<p><br" in state.get("html", "").lower()
    if app == "sheet":
        return state.get("sheets") == ["Sheet1"] and state.get("active") == "Sheet1" and state.get("selected") == {"r": 1, "c": "A"} and state.get("dataCount") == 0
    slides = state.get("slides", [])
    return len(slides) == 1 and not slides[0].get("title") and not slides[0].get("body") and not slides[0].get("notes")


def read_source_path(window, app: str) -> str:
    field = {"writer": "_sourcePath", "sheet": "sourceFilePath", "slides": "sourceFilePath"}[app]
    return str(window.evaluate_js(f"window.__vnoAppInstance.adapter.{field} || ''"))


def dialog_has_filter(calls: list[dict], app: str) -> bool:
    open_call = next((call for call in calls if "file_types" in call["kwargs"] and "save_filename" not in call["kwargs"]), None)
    types = open_call["kwargs"].get("file_types", []) if open_call else []
    extensions = {"writer": ("*.docx", "*.doc", "*.odt", "*.rtf", "*.txt"), "sheet": ("*.xlsx", "*.xls", "*.ods", "*.csv"), "slides": ("*.pptx", "*.ppt", "*.odp")}[app]
    return bool(types) and all(any(ext in item for item in types) for ext in extensions)


def main() -> int:
    if len(sys.argv) > 1 and sys.argv[1] == "--probe":
        _, _, root, app, first, second, out_dir, result = sys.argv
        sys.path.insert(0, root)
        return desktop_probe(app, Path(first), Path(second), Path(out_dir), Path(result))

    selected_app = sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == "--app" else None
    if selected_app is not None and selected_app not in {"writer", "sheet", "slides"}:
        print(f"FAIL: unknown app {selected_app}")
        return 1

    if os.name != "nt":
        print("BLOCKED: this G7 desktop probe needs Windows and pywebview.")
        return 2
    with tempfile.TemporaryDirectory(prefix="vno-g7-file-basics-", ignore_cleanup_errors=True) as temp:
        temp_root = Path(temp)
        fixtures = copy_fixtures(temp_root)
        report = {"fixtureDirectory": str(temp_root), "sourceCorpus": str(CORPUS), "apps": {}, "status": "PASS"}
        for app, (first, second) in fixtures.items():
            if selected_app is not None and app != selected_app:
                continue
            payload, output = run_probe(app, first, second, temp_root)
            report["apps"][app] = payload
            print(f"{app}: pywebview probe complete; errors={payload.get('errors', [])}")
            if payload.get("errors"):
                print(f"{app} probe log: {output[-5000:]}")
            marker1 = f"VNOfficeG7-{app}-replace-save"
            marker2 = f"VNOfficeG7-{app}-cancel-then-save"
            for label, target, marker in (("replacement save", first, marker1), ("in-place save", second, marker2)):
                status, detail = office_com_check(app, target, marker)
                payload.setdefault("officeCom", {})[label] = {"status": status, "detail": detail}
                print(f"{app} {label}: {status} ({detail})")
            close_marker = f"VNOfficeG7-{app}-close-save"
            close_status, close_detail = office_com_check(app, second, close_marker)
            payload.setdefault("officeCom", {})["dirty close save"] = {"status": close_status, "detail": close_detail}
            payload.setdefault("checks", {})["dirtyCloseSaveContentVerified"] = (
                True if close_status == "PASS" else "BLOCKED" if close_status == "BLOCKED" else False
            )
            print(f"{app} dirty-close save: {close_status} ({close_detail})")
            new_path = Path(payload.get("newSave", {}).get("path") or "")
            if new_path.is_file():
                new_status, new_detail = office_com_check(app, new_path, f"VNOfficeG7-{app}-new-save")
            else:
                new_status, new_detail = "FAIL", "new document Save As file was not written"
            payload.setdefault("officeCom", {})["new document save"] = {"status": new_status, "detail": new_detail}
            print(f"{app} new-document save: {new_status} ({new_detail})")
            failures = [key for key, value in payload.get("checks", {}).items() if value is not True and value != "BLOCKED"]
            print(f"{app} checks: {json.dumps(payload.get('checks', {}), ensure_ascii=False)}")
            if payload.get("microsoftPrintToPdf"):
                print(f"{app} Microsoft Print to PDF: {json.dumps(payload['microsoftPrintToPdf'], ensure_ascii=False)}")
            if payload.get("printModel"):
                print(f"{app} print model: {json.dumps(payload['printModel'], ensure_ascii=False)}")
            if payload.get("openedDocumentPreview"):
                print(f"{app} document print preview: {json.dumps(payload['openedDocumentPreview'], ensure_ascii=False)}")
            print(f"{app} failed checks: {failures}")
            if app == "slides":
                print("slides marker state: " + json.dumps({
                    key: payload.get(key) for key in (
                        "insertedMarker", "slideShapesAfterInsert", "afterInPlaceSave",
                        "slideShapesAfterSave", "reopened", "slideShapesAfterReopen"
                    )
                }, ensure_ascii=False)[:1200])

            if payload.get("errors") or failures or any(item["status"] == "FAIL" for item in payload.get("officeCom", {}).values()):
                report["status"] = "FAIL"
            if any(item["status"] == "BLOCKED" for item in payload.get("officeCom", {}).values()):
                report["status"] = "BLOCKED" if report["status"] == "PASS" else report["status"]
            payload["failedChecks"] = failures
            payload["probeLog"] = output

        report_path = temp_root / "g7-file-basics-report.json"
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        keep_dir = os.environ.get("VNO_G7_PROFILE_ROOT")
        if keep_dir:
            # The fixture directory is temporary; keep a copy of the JSON report for the handoff.
            Path(keep_dir).mkdir(parents=True, exist_ok=True)
            report_path = Path(keep_dir) / f"g7-file-basics-report-{selected_app or 'all'}.json"
            report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"G7 desktop report: {report_path}")
        print(f"G7 desktop probe status: {report['status']} (printing is verified by the print work package, not here)")
        return 0 if report["status"] == "PASS" else 2 if report["status"] in {"NOT RUN", "BLOCKED"} else 1


if __name__ == "__main__":
    raise SystemExit(main())
