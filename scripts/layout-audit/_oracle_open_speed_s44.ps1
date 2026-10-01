param(
  [Parameter(Mandatory = $true)][string]$Worktree,
  [Parameter(Mandatory = $true)][string]$OutCsv,
  [ValidateSet("All", "Office", "LibreOffice")][string]$Mode = "Office",
  [string]$OnlyFixture = "",
  [ValidateSet("All", "Word", "Excel")][string]$OnlyApp = "All"
)

$ErrorActionPreference = "Stop"
$worktreeRoot = (Resolve-Path -LiteralPath $Worktree).Path
if ($Mode -in @("All", "LibreOffice")) {
  throw "LibreOffice desktop/UIA mode is disabled by the owner rule. Run Mode Office for hidden COM measurements; use WebView2 CDP for VN Office."
}
$officeDir = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Office\16.0\Word\InstallRoot").Path
$wordExe = Join-Path $officeDir "WINWORD.EXE"
$excelExe = Join-Path $officeDir "EXCEL.EXE"
$sofficeExe = Join-Path $env:USERPROFILE "tools\libreoffice\program\soffice.exe"
if (-not (Test-Path -LiteralPath $sofficeExe)) { throw "LibreOffice executable not found at $sofficeExe" }

if ($Mode -in @("All", "Office")) {
  $activeOfficeProcesses = @(
    Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE' OR Name='EXCEL.EXE'" |
      Where-Object { $_.CommandLine -and $_.CommandLine -match "/automation|/Embedding" }
  )
  if ($activeOfficeProcesses.Count -gt 0) {
    throw "Hidden Office COM processes are already active; wait for the shared Office automation window before running this oracle."
  }
}

$fixtures = @(
  @{ App = "Word"; Path = Join-Path $worktreeRoot "file test\landocx\d03.docx" },
  @{ App = "Word"; Path = Join-Path $worktreeRoot "file test\landocx\d12.docx" },
  @{ App = "Word"; Path = Join-Path $worktreeRoot "file test\landocx\d24.docx" },
  @{ App = "Word"; Path = Join-Path $worktreeRoot "file test\lan-legacy\legacy01.doc" },
  @{ App = "Excel"; Path = Join-Path $worktreeRoot "file test\lan-legacy\legacy01.xls" },
  @{ App = "Excel"; Path = Join-Path $worktreeRoot "file test\lan\lan05.xlsx" },
  @{ App = "Excel"; Path = Join-Path $worktreeRoot "file test\lan\lan11.xlsx" },
  @{ App = "Excel"; Path = Join-Path $worktreeRoot "file test\lan\lan12.xlsx" },
  @{ App = "Excel"; Path = Join-Path $worktreeRoot "file test\lan\lan14.xlsx" }
)
foreach ($fixture in $fixtures) {
  if (-not (Test-Path -LiteralPath $fixture.Path)) { throw "Missing fixture: $($fixture.Path)" }
}
if ($OnlyFixture) {
  $fixtures = @($fixtures | Where-Object { [System.IO.Path]::GetFileName($_.Path) -eq $OnlyFixture })
  if ($fixtures.Count -ne 1) { throw "Fixture '$OnlyFixture' is not uniquely mapped in the S44 matrix." }
}
if ($OnlyApp -ne "All") {
  $fixtures = @($fixtures | Where-Object { $_.App -eq $OnlyApp })
  if ($fixtures.Count -eq 0) { throw "There are no $OnlyApp fixtures in the S44 matrix." }
}

$results = [System.Collections.Generic.List[object]]::new()
$rootOut = Split-Path -Parent $OutCsv
if ($rootOut -and -not (Test-Path -LiteralPath $rootOut)) { New-Item -ItemType Directory -Path $rootOut -Force | Out-Null }

function Get-ExcelOpen($app, [string]$path) {
  $watch = [System.Diagnostics.Stopwatch]::StartNew()
  $attempt = 0
  while ($true) {
    $attempt++
    try {
      $book = $app.Workbooks.Open($path, 0, $true)
      $watch.Stop()
      return @{ Document = $book; WallMs = [math]::Round($watch.Elapsed.TotalMilliseconds, 1); Attempts = $attempt }
    } catch {
      $hresult = $_.Exception.HResult
      if (($hresult -eq -2147418111 -or $_.Exception.Message -match "RPC_E_CALL_REJECTED") -and $attempt -lt 20) {
        Start-Sleep -Milliseconds 250
        continue
      }
      $watch.Stop()
      throw
    }
  }
}

function Get-WordOpen($app, [string]$path) {
  $watch = [System.Diagnostics.Stopwatch]::StartNew()
  $attempt = 0
  while ($true) {
    $attempt++
    try {
      $doc = $app.Documents.Open($path, $false, $true, $false)
      $watch.Stop()
      return @{ Document = $doc; WallMs = [math]::Round($watch.Elapsed.TotalMilliseconds, 1); Attempts = $attempt }
    } catch {
      $hresult = $_.Exception.HResult
      if (($hresult -eq -2147418111 -or $_.Exception.Message -match "RPC_E_CALL_REJECTED") -and $attempt -lt 20) {
        Start-Sleep -Milliseconds 250
        continue
      }
      $watch.Stop()
      throw
    }
  }
}

function New-OfficeApp([string]$kind) {
  if ($kind -eq "Word") {
    $app = New-Object -ComObject Word.Application
    $app.Visible = $false
    $app.DisplayAlerts = 0
    $app.ScreenUpdating = $false
  } else {
    $app = New-Object -ComObject Excel.Application
    $app.Visible = $false
    $app.DisplayAlerts = $false
    $app.AskToUpdateLinks = $false
  }
  return $app
}

function Wait-ForFreeRam {
  while ($true) {
    $freeGb = [math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB, 2)
    if ($freeGb -ge 5) { return }
    Write-Host "RAM guard: free $freeGb GB (<5 GB); waiting 15 seconds before the next open."
    Start-Sleep -Seconds 15
  }
}

function Open-OfficeFixture($fixture) {
  $path = $fixture.Path
  $app = New-OfficeApp $fixture.App
  try {
    $open = if ($fixture.App -eq "Word") { Get-WordOpen $app $path } else { Get-ExcelOpen $app $path }
    return @{ App = $app; Document = $open.Document; WallMs = $open.WallMs; Attempts = $open.Attempts }
  } catch {
    try { $app.Quit() } catch {}
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($app)
    throw
  }
}

function Close-OfficeDocument($app, $document, [string]$kind) {
  $idleDeadline = (Get-Date).AddSeconds(20)
  while ((Get-Date) -lt $idleDeadline) {
    try {
      if ($app.Ready) { break }
    } catch {
      if ($_.Exception.HResult -ne -2147418111 -and $_.Exception.Message -notmatch "RPC_E_CALL_REJECTED") { break }
    }
    Start-Sleep -Milliseconds 200
  }
  $attempt = 0
  while ($true) {
    $attempt++
    try {
      if ($kind -eq "Word") { $document.Close(0) } else { $document.Close($false) }
      break
    } catch {
      $hresult = $_.Exception.HResult
      if (($hresult -eq -2147418111 -or $_.Exception.Message -match "RPC_E_CALL_REJECTED") -and $attempt -lt 16) {
        Start-Sleep -Milliseconds 250
        continue
      }
      throw
    }
  }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document)
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

function Stop-OfficeApp($app) {
  $attempt = 0
  while ($attempt -lt 8) {
    $attempt++
    try { $app.Quit(); break }
    catch {
      $hresult = $_.Exception.HResult
      if ($hresult -eq -2147418111 -or $_.Exception.Message -match "RPC_E_CALL_REJECTED") {
        Start-Sleep -Milliseconds 250
      } else { break }
    }
  }
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($app)
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

function Add-OfficeResult($fixture, [string]$condition, [int]$run, $opened) {
  $results.Add([pscustomobject]@{
    App = $fixture.App; Fixture = [System.IO.Path]::GetFileName($fixture.Path); Condition = $condition
    Run = $run; OpenWallMs = $opened.WallMs; Retries = ($opened.Attempts - 1); WindowTitle = "hidden COM document"
    Status = "PASS"; Error = ""
  })
  Write-Host "$($fixture.App) $([System.IO.Path]::GetFileName($fixture.Path)) $condition/$run $($opened.WallMs) ms (retries=$($opened.Attempts - 1))"
}

function Add-OfficeFailure($fixture, [string]$condition, [int]$run, [string]$message) {
  $status = if ($message -match "RPC_E_CALL_REJECTED|Call was rejected by callee") { "BLOCKED" } else { "FAIL" }
  $retrySummary = if ($status -eq "BLOCKED") { "20 attempts / 19 retries" } else { "up to 20 attempts" }
  $results.Add([pscustomobject]@{
    App = $fixture.App; Fixture = [System.IO.Path]::GetFileName($fixture.Path); Condition = $condition
    Run = $run; OpenWallMs = ""; Retries = $retrySummary; WindowTitle = ""
    Status = $status; Error = ($message -replace "\s+", " ").Trim()
  })
  Write-Host "$($fixture.App) $([System.IO.Path]::GetFileName($fixture.Path)) $condition/$run $status`: $message"
  $results | Export-Csv -LiteralPath $OutCsv -NoTypeInformation -Encoding UTF8
}

function Run-OfficeFixture($fixture) {
  # Cold-ish: close the owned Office instance after each first-open call.
  for ($run = 1; $run -le 2; $run++) {
    Wait-ForFreeRam
    $opened = $null
    try {
      $opened = Open-OfficeFixture $fixture
      Add-OfficeResult $fixture "cold-ish" $run $opened
    } catch {
      Add-OfficeFailure $fixture "cold-ish" $run $_.Exception.Message
    }
    if ($opened) {
      try { Close-OfficeDocument $opened.App $opened.Document $fixture.App }
      catch { Write-Host "Office close after $($fixture.App) $([System.IO.Path]::GetFileName($fixture.Path)) failed: $($_.Exception.Message)" }
      Stop-OfficeApp $opened.App
    }
    Start-Sleep -Milliseconds 350
  }
  # Warm: retain one hidden application instance between the two Open calls.
  Wait-ForFreeRam
  $app = New-OfficeApp $fixture.App
  $keeper = $null
  try {
    if ($fixture.App -eq "Word") {
      # Word exits its COM server when the last document closes. Keep a blank
      # document open so both warm calls reuse the same hidden process.
      $keeper = $app.Documents.Add()
    }
    for ($run = 1; $run -le 2; $run++) {
      Wait-ForFreeRam
      $opened = $null
      try {
        $opened = if ($fixture.App -eq "Word") { Get-WordOpen $app $fixture.Path } else { Get-ExcelOpen $app $fixture.Path }
        Add-OfficeResult $fixture "warm" $run $opened
      } catch {
        Add-OfficeFailure $fixture "warm" $run $_.Exception.Message
      }
      if ($opened) {
        try { Close-OfficeDocument $app $opened.Document $fixture.App }
        catch { Write-Host "Office close after $($fixture.App) $([System.IO.Path]::GetFileName($fixture.Path)) failed: $($_.Exception.Message)" }
      }
    }
  } finally {
    if ($keeper) {
      try { Close-OfficeDocument $app $keeper $fixture.App } catch {}
    }
    Stop-OfficeApp $app
  }
}

function Get-DocumentWindow([string]$fileName, [string]$profileUri) {
  $condition = [System.Windows.Automation.Condition]::TrueCondition
  try {
    $windows = [System.Windows.Automation.AutomationElement]::RootElement.FindAll(
      [System.Windows.Automation.TreeScope]::Children, $condition)
  } catch {
    return $null
  }
  $ownedProcessIds = @((Get-ProfileProcesses $profileUri | ForEach-Object { [int]$_.ProcessId }))
  if ($ownedProcessIds.Count -eq 0) { return $null }
  $escaped = [regex]::Escape($fileName)
  foreach ($window in $windows) {
    try {
      if ($ownedProcessIds -notcontains [int]$window.Current.ProcessId) { continue }
      $name = $window.Current.Name
      if ($name -and $name -match $escaped) { return $window }
    } catch {}
  }
  return $null
}

function Wait-DocumentWindow([string]$fileName, [string]$profileUri, [int]$timeoutSeconds = 180) {
  $watch = [System.Diagnostics.Stopwatch]::StartNew()
  while ($watch.Elapsed.TotalSeconds -lt $timeoutSeconds) {
    $window = Get-DocumentWindow $fileName $profileUri
    if ($window) {
      $watch.Stop()
      return @{ Window = $window; WallMs = [math]::Round($watch.Elapsed.TotalMilliseconds, 1); Title = $window.Current.Name }
    }
    Start-Sleep -Milliseconds 30
  }
  throw "LibreOffice document window title containing '$fileName' did not appear within $timeoutSeconds s"
}

function Close-DocumentWindow($window) {
  try {
    $pattern = $null
    if ($window.TryGetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern, [ref]$pattern)) {
      ([System.Windows.Automation.WindowPattern]$pattern).Close()
    }
  } catch {}
}

function Get-ProfileProcesses([string]$profileUri) {
  if ([string]::IsNullOrWhiteSpace($profileUri)) { return @() }
  $profileKey = [System.IO.Path]::GetFileName(([System.Uri]::new($profileUri)).LocalPath)
  Get-CimInstance Win32_Process -Filter "Name='soffice.exe' OR Name='soffice.bin'" |
    Where-Object { $_.CommandLine -and $_.CommandLine.Contains($profileKey) }
}

function Stop-OwnedLibreOffice([string]$profileUri) {
  foreach ($process in @(Get-ProfileProcesses $profileUri)) {
    Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
  }
  $deadline = (Get-Date).AddSeconds(12)
  while ((Get-Date) -lt $deadline -and @(Get-ProfileProcesses $profileUri).Count -gt 0) { Start-Sleep -Milliseconds 150 }
}

function Start-LibreOfficeFixture([string]$filePath, [string]$profileUri) {
  $arguments = "-env:UserInstallation=$profileUri `"$filePath`""
  Start-Process -FilePath $sofficeExe -ArgumentList $arguments -PassThru
}

function Add-LoResult($fixture, [string]$condition, [int]$run, $opened) {
  $results.Add([pscustomobject]@{
    App = "LibreOffice"; Fixture = [System.IO.Path]::GetFileName($fixture.Path); Condition = $condition
    Run = $run; OpenWallMs = $opened.WallMs; Retries = 0; WindowTitle = $opened.Title
    Status = "PASS"; Error = ""
  })
  Write-Host "LibreOffice $([System.IO.Path]::GetFileName($fixture.Path)) $condition/$run $($opened.WallMs) ms [$($opened.Title)]"
}

function Run-LibreOfficeFixture($fixture, [string]$rootTemp) {
  $fixtureName = [System.IO.Path]::GetFileNameWithoutExtension($fixture.Path)
  $warmupPath = Join-Path $rootTemp ("$fixtureName-lo-profile-warmup" + [System.IO.Path]::GetExtension($fixture.Path))
  Copy-Item -LiteralPath $fixture.Path -Destination $warmupPath -Force
  $warmProfile = Join-Path $rootTemp ("profile-warm-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $warmProfile -Force | Out-Null
  $warmProfileUri = ([System.Uri]::new($warmProfile)).AbsoluteUri
  $ownedProfileUris = [System.Collections.Generic.List[string]]::new()
  $ownedProfileUris.Add($warmProfileUri)
  try {
    # Cold-ish: a closed application, with the fresh profile already initialized once.
    for ($run = 1; $run -le 2; $run++) {
      $coldProfile = Join-Path $rootTemp ("profile-cold-" + [guid]::NewGuid().ToString("N"))
      New-Item -ItemType Directory -Path $coldProfile -Force | Out-Null
      $coldProfileUri = ([System.Uri]::new($coldProfile)).AbsoluteUri
      $ownedProfileUris.Add($coldProfileUri)
      Wait-ForFreeRam
      $coldWarm = Start-Process -FilePath $sofficeExe -ArgumentList "--headless --terminate_after_init -env:UserInstallation=$coldProfileUri" -PassThru -Wait
      if ($coldWarm.ExitCode -ne 0) { throw "LibreOffice cold-ish profile prewarm failed with exit $($coldWarm.ExitCode)" }
      $coldPath = Join-Path $rootTemp ("$fixtureName-lo-cold-$run" + [System.IO.Path]::GetExtension($fixture.Path))
      Copy-Item -LiteralPath $fixture.Path -Destination $coldPath -Force
      Wait-ForFreeRam
      $before = [System.Diagnostics.Stopwatch]::StartNew()
      [void](Start-LibreOfficeFixture $coldPath $coldProfileUri)
      $opened = Wait-DocumentWindow $fixtureName $coldProfileUri
      $before.Stop()
      $opened.WallMs = [math]::Round($before.Elapsed.TotalMilliseconds, 1)
      Add-LoResult $fixture "cold-ish" $run $opened
      Close-DocumentWindow $opened.Window
      Start-Sleep -Milliseconds 250
      Stop-OwnedLibreOffice $coldProfileUri
    }

    # Warm: keep a separate visible warm-up document open so each timed target
    # gets a new UIA title while reusing the same LibreOffice process/profile.
    Wait-ForFreeRam
    $warm = Start-Process -FilePath $sofficeExe -ArgumentList "--headless --terminate_after_init -env:UserInstallation=$warmProfileUri" -PassThru -Wait
    if ($warm.ExitCode -ne 0) { throw "LibreOffice warm profile prewarm failed with exit $($warm.ExitCode)" }
    Wait-ForFreeRam
    [void](Start-LibreOfficeFixture $warmupPath $warmProfileUri)
    $warmupWindow = Wait-DocumentWindow ([System.IO.Path]::GetFileNameWithoutExtension($warmupPath)) $warmProfileUri
    for ($run = 1; $run -le 2; $run++) {
      $copyPath = Join-Path $rootTemp ("$fixtureName-lo-warm-$run" + [System.IO.Path]::GetExtension($fixture.Path))
      Copy-Item -LiteralPath $fixture.Path -Destination $copyPath -Force
      Wait-ForFreeRam
      $before = [System.Diagnostics.Stopwatch]::StartNew()
      [void](Start-LibreOfficeFixture $copyPath $warmProfileUri)
      $opened = Wait-DocumentWindow ([System.IO.Path]::GetFileNameWithoutExtension($copyPath)) $warmProfileUri
      $before.Stop()
      $opened.WallMs = [math]::Round($before.Elapsed.TotalMilliseconds, 1)
      Add-LoResult $fixture "warm" $run $opened
      Close-DocumentWindow $opened.Window
    }
    Close-DocumentWindow $warmupWindow.Window
    Stop-OwnedLibreOffice $warmProfileUri
  } finally {
    foreach ($profileUri in $ownedProfileUris) { Stop-OwnedLibreOffice $profileUri }
    Remove-Item -LiteralPath $warmupPath -Force -ErrorAction SilentlyContinue
  }
}

$scratch = Join-Path $env:TEMP ("VNOffice-S44-Oracle-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $scratch -Force | Out-Null
try {
  foreach ($fixture in $fixtures) {
    if ($Mode -in @("All", "Office")) { Run-OfficeFixture $fixture }
    if ($Mode -in @("All", "LibreOffice")) { Run-LibreOfficeFixture $fixture $scratch }
    $results | Export-Csv -LiteralPath $OutCsv -NoTypeInformation -Encoding UTF8
  }
} finally {
  if ($results.Count -gt 0) { $results | Export-Csv -LiteralPath $OutCsv -NoTypeInformation -Encoding UTF8 }
  Get-ChildItem -LiteralPath $scratch -Filter "*-warm-*" -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $scratch -Recurse -Force -ErrorAction SilentlyContinue
}
