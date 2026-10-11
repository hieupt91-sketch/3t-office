param([Parameter(Mandatory=$true)][string]$Dir)
$ErrorActionPreference = 'Stop'
$existing = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | ForEach-Object { [int]$_.ProcessId })
$owned = @()
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
  $control = $word.Documents.Add()
  $owned = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existing } | ForEach-Object { [int]$_.ProcessId })
  if (-not $owned.Count) { throw 'Word COM PID missing' }
  $control.Content.Text = 'Alpha comment target.'
  $range = $control.Range($control.Content.Start, $control.Content.Start + 5)
  $parent = $control.Comments.Add($range, 'Parent comment')
  $parent.Author = '3T Office'
  $replyRange = $control.Range($control.Content.Start, $control.Content.Start + 5)
  $parent.Replies.Add($replyRange, 'Reply body') | Out-Null
  $control.SaveAs2("$Dir\comments-reply-word-t10.docx", 16)
  $control.Close(0)

  foreach ($name in @('comments-reply-t10.docx', 'comments-reply-word-t10.docx')) {
    $document = $word.Documents.Open("$Dir\$name", $false, $true)
    try {
      $rootCount = $document.Comments.Count
      $parentComment = $document.Comments.Item(1)
      $replyText = if ($parentComment.Replies.Count) { $parentComment.Replies.Item(1).Range.Text -replace '[\r\a]', '' } else { '' }
      Write-Output ("{0}: comments including replies={1}; parent={2}; replyCount={3}; reply={4}" -f $name, $rootCount, ($parentComment.Range.Text -replace '[\r\a]', ''), $parentComment.Replies.Count, $replyText)
      if ($rootCount -ne 2 -or $document.Comments.Item(1).Replies.Count -ne 1 -or ($document.Comments.Item(1).Replies.Item(1).Range.Text -replace '[\r\a]', '') -ne 'Reply body') {
        throw "Word COM mismatch for $name"
      }
    } finally { $document.Close(0) }
  }
} finally {
  if ($word) { $word.Quit(); [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }
  $owned = @($owned + @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { [int]$_.ProcessId -notin $existing } | ForEach-Object { [int]$_.ProcessId }) | Select-Object -Unique)
  foreach ($ownedPid in $owned) {
    $process = Get-Process -Id $ownedPid -ErrorAction SilentlyContinue
    if ($process) { $process | Wait-Process -Timeout 3 -ErrorAction SilentlyContinue }
    if (Get-Process -Id $ownedPid -ErrorAction SilentlyContinue) { Stop-Process -Id $ownedPid -Force -ErrorAction SilentlyContinue }
  }
}
