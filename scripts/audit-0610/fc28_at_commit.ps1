param([Parameter(Mandatory = $true)][string]$Commit, [string]$File = "lan28.xlsx")
# Chay bai do cong thuc vs cache cho 1 tep tren 1 commit (worktree tam). In ra dong ket qua.
$ErrorActionPreference = "Continue"
$short = $Commit.Substring(0, [Math]::Min(8, $Commit.Length))
$wt = "E:\VNOffice-bisect-$short"
if (-not (Test-Path $wt)) {
  git -C "E:\VN OFice" worktree add --detach $wt $Commit 2>&1 | Out-Null
  cmd /c mklink /J "$wt\file test" "E:\VN OFice\file test" | Out-Null
}
$env:VNO_APP_ROOT = $wt
$env:VNO_CDP_LOCALAPPDATA = "E:\VNOffice-profiles\bisect-$short"
New-Item -ItemType Directory -Force $env:VNO_CDP_LOCALAPPDATA | Out-Null
$report = "E:\VNOffice-profiles\bisect-$short.md"
Push-Location $wt
node --experimental-websocket scripts\audit-0610\sheet_formulas_vs_cache.mjs --file $File --report $report 2>&1 | Out-Null
Pop-Location
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match "bisect-$short" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
$stem = [IO.Path]::GetFileNameWithoutExtension($File)
$row = (Get-Content $report -Encoding UTF8 -ErrorAction SilentlyContinue | Select-String ('^\| \d+ \| `' + $stem + '\.') | Select-Object -First 1).Line
"$short : $row"
