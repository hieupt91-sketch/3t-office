#!/usr/bin/env python3
"""Create a small PowerPoint-authored looping media fixture (Windows + PowerPoint)."""

from __future__ import annotations

import json
import math
import re
import shutil
import struct
import subprocess
import tempfile
import wave
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tests" / "fixtures" / "ooxml" / "pptx" / "media-loop"
PPTX = OUT / "powerpoint-media-loop.pptx"
WAV = OUT / "tone-2s.wav"
MP4 = OUT / "color-2s.mp4"


def make_wav(path: Path) -> None:
    rate = 22050
    frames = bytearray()
    for i in range(rate * 2):
        sample = int(5000 * math.sin(2 * math.pi * 440 * i / rate))
        frames.extend(struct.pack("<h", sample))
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        out.writeframes(frames)


def ps_quote(path: Path) -> str:
    return "'" + str(path).replace("'", "''") + "'"


def create_in_powerpoint(video_path: Path | None) -> dict:
    # The PowerShell process snapshots POWERPNT PIDs and may stop only its own new PID.
    script = r'''
$ErrorActionPreference = 'Stop'
$pptxPath = __PPTX__
$wavPath = __WAV__
$videoPath = __VIDEO__
$before = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | ForEach-Object Id)
$app = $null; $presentation = $null; $reopened = $null; $ownedPid = $null
try {
  $app = New-Object -ComObject PowerPoint.Application
  $after = @(Get-Process POWERPNT -ErrorAction SilentlyContinue | ForEach-Object Id)
  $new = @($after | Where-Object { $_ -notin $before })
  if ($new.Count -ne 1) { throw "Expected exactly one new PowerPoint PID, found $($new -join ',')." }
  $ownedPid = [int]$new[0]
  $version = [string]$app.Version
  $presentation = $app.Presentations.Add(0)
  while ($presentation.Slides.Count -lt 3) { [void]$presentation.Slides.Add($presentation.Slides.Count + 1, 12) }
  for ($i = 1; $i -le 3; $i++) {
    $slide = $presentation.Slides.Item($i)
    $box = $slide.Shapes.AddTextbox(1, 48, 42, 600, 50)
    $box.TextFrame.TextRange.Text = @('Âm thanh tự lặp đến khi dừng','Video phát khi bấm và lặp lại; âm thanh chạy qua trang chiếu','Trang chiếu tiếp tục phát âm thanh nền')[($i - 1)]
  }
  $s1 = $presentation.Slides.Item(1)
  $audioLoop = $s1.Shapes.AddMediaObject2($wavPath, 0, -1, 70, 130, 110, 70)
  $audioLoop.AnimationSettings.PlaySettings.PlayOnEntry = -1
  $audioLoop.AnimationSettings.PlaySettings.LoopUntilStopped = -1
  $audioLoop.AnimationSettings.PlaySettings.HideWhileNotPlaying = -1
  if ($videoPath) {
    $s2 = $presentation.Slides.Item(2)
    $video = $s2.Shapes.AddMediaObject2($videoPath, 0, -1, 220, 130, 320, 180)
    $video.AnimationSettings.PlaySettings.PlayOnEntry = 0
    $video.AnimationSettings.PlaySettings.LoopUntilStopped = -1
  }
  $s2 = $presentation.Slides.Item(2)
  $audioAcross = $s2.Shapes.AddMediaObject2($wavPath, 0, -1, 70, 330, 110, 70)
  $audioAcross.AnimationSettings.PlaySettings.PlayOnEntry = -1
  $audioAcross.AnimationSettings.PlaySettings.StopAfterSlides = 2
  $presentation.SaveAs($pptxPath, 24)
  $presentation.Close(); $presentation = $null
  $reopened = $app.Presentations.Open($pptxPath, -1, 0, 0)
  $read = @()
  for ($si = 1; $si -le $reopened.Slides.Count; $si++) {
    $slide = $reopened.Slides.Item($si)
    for ($sh = 1; $sh -le $slide.Shapes.Count; $sh++) {
      $shape = $slide.Shapes.Item($sh)
      if ($shape.Type -eq 16) {
        $ps = $shape.AnimationSettings.PlaySettings
        $read += [pscustomobject]@{ slide=$si; name=[string]$shape.Name; playOnEntry=[int]$ps.PlayOnEntry; loopUntilStopped=[int]$ps.LoopUntilStopped; hideWhileNotPlaying=[int]$ps.HideWhileNotPlaying; stopAfterSlides=[int]$ps.StopAfterSlides; mediaType=[int]$shape.MediaFormat.MediaType }
      }
    }
  }
  [pscustomobject]@{ version=$version; slides=[int]$reopened.Slides.Count; media=$read } | ConvertTo-Json -Depth 6 -Compress
} finally {
  if ($reopened) { $reopened.Close() }
  if ($presentation) { $presentation.Close() }
  if ($app) { $app.Quit() }
  if ($ownedPid -and (Get-Process -Id $ownedPid -ErrorAction SilentlyContinue)) { Stop-Process -Id $ownedPid -Force }
}
'''
    script = (script.replace("__PPTX__", ps_quote(PPTX))
                    .replace("__WAV__", ps_quote(WAV))
                    .replace("__VIDEO__", ps_quote(video_path) if video_path else "$null"))
    with tempfile.NamedTemporaryFile("w", suffix=".ps1", encoding="utf-8", delete=False) as tmp:
        tmp.write("\ufeff" + script)
        ps_path = Path(tmp.name)
    try:
        result = subprocess.run(
            ["powershell.exe", "-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps_path)],
            capture_output=True, text=True, encoding="utf-8",
        )
        if result.returncode:
            raise RuntimeError(f"PowerPoint COM failed ({result.returncode}): {result.stderr.strip() or result.stdout.strip()}")
        lines = [line for line in result.stdout.splitlines() if line.strip()]
        if not lines:
            raise RuntimeError("PowerPoint automation returned no readback JSON")
        return json.loads(lines[-1])
    finally:
        ps_path.unlink(missing_ok=True)


def extract_xml(path: Path) -> tuple[str, list[str]]:
    excerpts = []
    with zipfile.ZipFile(path) as archive:
        names = archive.namelist()
        media = [n for n in names if n.startswith("ppt/media/") and n.lower().endswith((".wav", ".mp3", ".mp4", ".wmv", ".m4a"))]
        for name in names:
            if not name.startswith("ppt/slides/slide") or not name.endswith(".xml"):
                continue
            source = archive.read(name).decode("utf-8")
            for tag in ("p:timing", "p14:media", "a:audioFile", "a:videoFile"):
                for match in re.finditer(fr"<{tag}(?:\s[^>]*)?>.*?</{tag}>|<{tag}(?:\s[^>]*)?/>", source, re.DOTALL):
                    excerpts.append(f"<!-- {name} | {tag} -->\n{match.group(0)}")
        for name in names:
            if name.startswith("ppt/slides/_rels/slide") and name.endswith(".rels"):
                data = archive.read(name).decode("utf-8")
                if any(token in data for token in ("media", "video", "audio")):
                    excerpts.append(f"<!-- {name} -->\n{data}")
        return ", ".join(media), excerpts


def main() -> None:
    if shutil.which("powershell.exe") is None:
        raise SystemExit("BLOCKED: Windows PowerShell is required for PowerPoint COM automation")
    OUT.mkdir(parents=True, exist_ok=True)
    make_wav(WAV)
    ffmpeg = shutil.which("ffmpeg")
    video_path = None
    if ffmpeg:
        command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i",
                   "color=c=blue:s=320x180:d=2:r=10", "-an", "-c:v", "mpeg4", "-q:v", "8", "-y", str(MP4)]
        subprocess.run(command, check=True)
        video_path = MP4
    else:
        MP4.unlink(missing_ok=True)
    readback = create_in_powerpoint(video_path)
    media_list, excerpts = extract_xml(PPTX)
    size = PPTX.stat().st_size
    if readback["slides"] != 3:
        raise RuntimeError(f"PowerPoint reopened {readback['slides']} slides, expected 3")
    if size >= 500 * 1024:
        raise RuntimeError(f"PPTX is too large: {size} bytes")
    if len(readback["media"]) < (3 if video_path else 2):
        raise RuntimeError(f"PowerPoint media readback incomplete: {readback['media']}")
    if not excerpts:
        raise RuntimeError("No PowerPoint media timing XML found in saved file")
    status = "PASS" if video_path else "BLOCKED for video (ffmpeg unavailable); audio fixture PASS"
    readback_path = json.dumps(readback, ensure_ascii=False, indent=2)
    readme = f'''# Fixture media lặp do PowerPoint tạo

- Tạo lại: `python scripts/fixtures/make_pptx_media_loop.py` trên Windows có PowerPoint; WAV được sinh tại chỗ bằng Python. Nếu `ffmpeg` có trong PATH, script cũng sinh video màu 2 giây.
- PowerPoint: phiên bản COM `{readback['version']}`. Tệp được lưu rồi mở lại bằng PowerPoint COM để đọc các thuộc tính phát.
- Kết quả media: {status}. PPTX: {size} byte. Tệp phương tiện trong gói: `{media_list}`.
- Slide 1: âm thanh tự phát, `LoopUntilStopped=True`, `HideWhileNotPlaying=True`.
- Slide 2: video phát khi bấm và lặp lại (nếu có video); âm thanh bắt đầu tự động với `StopAfterSlides=2`, tiếp tục qua slide 3.

Đọc lại từ PowerPoint COM:
```json
{readback_path}
```

Đoạn XML timing/relationships trích từ PPTX:
```xml
{chr(10).join(excerpts)}
```
'''
    (OUT / "README.md").write_text(readme, encoding="utf-8", newline="\n")
    print(f"{status}; PowerPoint={readback['version']}; slides={readback['slides']}; PPTX={size} bytes")
    for item in readback["media"]:
        print(json.dumps(item, ensure_ascii=False))


if __name__ == "__main__":
    main()
