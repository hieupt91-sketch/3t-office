param([string]$Good = "win-v0.9.9", [string]$Bad = "win-v0.9.10", [string]$File = "lan28.xlsx", [string]$Log = "E:\VNOffice-profiles\fc28-bisect.log")
# Tim nhi phan commit lam ty le khop cong thuc cua tep $File tut xuong duoi 90%.
$commits = @(git -C "E:\VN OFice" rev-list --reverse "$Good..$Bad")
"tong commit: $($commits.Count)" | Tee-Object -FilePath $Log
$lo = -1; $hi = $commits.Count - 1   # lo = tot, hi = xau
while ($hi - $lo -gt 1) {
  $mid = [int](($lo + $hi) / 2)
  $c = $commits[$mid]
  $res = powershell -NoProfile -File "E:\VN OFice\scripts\audit-0610\fc28_at_commit.ps1" -Commit $c -File $File 2>&1 | Out-String
  $m = [regex]::Match($res, '\*\*([\d\.]+)%\*\*')
  $rate = if ($m.Success) { [double]$m.Groups[1].Value } else { -1 }
  "mid=$mid $($c.Substring(0,8)) rate=$rate :: " + $res.Trim().Substring(0, [Math]::Min(160, $res.Trim().Length)) | Tee-Object -FilePath $Log -Append
  if ($rate -lt 0) { "khong do duoc, dung" | Tee-Object -FilePath $Log -Append; break }
  if ($rate -ge 90) { $lo = $mid } else { $hi = $mid }
}
"KET QUA: commit xau dau tien = $($commits[$hi])" | Tee-Object -FilePath $Log -Append
git -C "E:\VN OFice" log -1 --format="%h %an %ad %s" $commits[$hi] | Tee-Object -FilePath $Log -Append
