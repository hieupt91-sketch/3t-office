# Harness đối chiếu VN Slides với PowerPoint COM — FIX-L4

Chạy trên Windows đã cài PowerPoint. Tất cả file đầu ra ở profile riêng; app khởi chạy từ worktree được chọn và lấy cổng CDP trống riêng qua `tests/live/cdp/session.mjs`.

```powershell
$env:VNO_APP_ROOT = 'E:\VNOffice-codex-rl4'
$env:VNO_CDP_LOCALAPPDATA = 'E:\VNOffice-profiles\codex-rl4'
$env:VNO_FIX_L4_FONT_SOURCE = 'E:\VN OFice\file test\lan\BÁO CÁO KẾT QUẢ KINH DOANH NĂM 2021.pptx'

& .\scripts\audit-0610\office_parallel\slides\make-template.ps1 -Dir $env:VNO_CDP_LOCALAPPDATA
node --experimental-websocket scripts/audit-0610/office_parallel/slides/app-ops.desktop.mjs
& .\scripts\audit-0610\office_parallel\slides\compare.ps1 -Dir $env:VNO_CDP_LOCALAPPDATA
node --experimental-websocket scripts/audit-0610/office_parallel/slides/font-roundtrip.desktop.mjs
& .\scripts\audit-0610\office_parallel\slides\compare-fonts.ps1 -Dir $env:VNO_CDP_LOCALAPPDATA -Source $env:VNO_FIX_L4_FONT_SOURCE
```

`make-template.ps1`, `compare.ps1`, and `compare-fonts.ps1` snapshot the existing `POWERPNT.EXE` PID list, require exactly one new PID, close the COM presentation/application, and only stop that PID if it remains alive. They do not terminate pre-existing PowerPoint instances.

`app-ops.desktop.mjs` applies font size, grow/shrink, bold, alignment, and shape insertion through the app command bus, saves the PPTX through `SlidesAdapter.save()`, then leaves the output under the dedicated profile. `font-roundtrip.desktop.mjs` opens the real 2021 business deck, edits a formatted text run through the Slides canvas model, and saves the copy through the app. Both set the current source root explicitly and use a unique CDP port.

The COM compare scripts report readback values; a read of a default value does not prove the matching app operation. Mark an operation KHỚP/LECH only after applying it in the app and comparing the same property in PowerPoint. See `docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md` for the measured matrix and gaps.
