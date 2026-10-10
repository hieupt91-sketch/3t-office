# Agent Handoff
TASK: RB-L2 — audit chức năng VN Slides và PPTX roundtrip
AGENT/ROLE: Codex / audit + sửa lỗi nhỏ đã tái hiện
BRANCH: audit/slides-functional-codex
WORKTREE: E:\VNOffice-codex-rl2
OBJECTIVE: Kiểm 6 nhóm chức năng Slides bằng app desktop qua CDP, fixture PPTX bản sao, đo model/XML và mở lại để xác minh; ghi audit, UI issues, backlog và sửa lỗi nhỏ được ticket cho phép.
FINDINGS: Nhóm 1–6 có kết quả trong `docs/AUDIT-SLIDES-FUNCTIONAL-1010.md`. U-L30 lỗi hộp thoại Biểu đồ đã sửa. U-L31 themeId Slide Master trở lại modern-blue sau roundtrip; U-L32 Ctrl+P không bật bút; U-L33 groupId của cả shape nhập và shape mới mất sau PPTX roundtrip. Các mục NOT RUN còn font family/cỡ chữ, giãn dòng, đánh số, một số layout/xóa biên và z-order roundtrip.
IMPLEMENTATION SUMMARY: Sửa `slides-chart.js` để tái dùng `normalizeSlidesChart`, tránh `ReferenceError: numeric is not defined`; thêm assertion vào live Playwright cho preview mặc định. Cập nhật audit 7 cột, UI log U-L30–U-L33 và backlog U-L33. Tệp gốc `sample-3.pptx` không bị sửa; các fixture/kết quả audit nằm ngoài repo trong profile riêng.
FILES CHANGED: `apps/slides/slides-chart.js`; `tests/live/slides-charts.playwright.mjs`; `docs/AUDIT-SLIDES-FUNCTIONAL-1010.md`; `docs/UI-TEST-SLIDES-1010.md`; `docs/RIBBON-BACKLOG.md`; handoff này.
COMMANDS RUN: CDP desktop qua `tests/live/cdp/session.mjs` và `tests/live/cdp/actions.mjs`, luôn đặt `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-rl2`; cổng CDP riêng được harness cấp cho mỗi phiên. Lưu qua `window.__vnoAppInstance.adapter.save()`, kiểm OOXML bằng Python `zipfile`/ElementTree, mở lại và đợi source path khớp + 10 slide. `node --check` cho chart source và Playwright test; gọi `runSlidesChartTests()`; `git diff --check`. Không chạy bộ 28 XLSX.
BUILD RESULT: NOT RUN — không đổi build system.
TEST RESULTS: PASS — unit Slides Chart 5/5; `node --check` chart source/test; CDP đã xác nhận chart, ảnh, bảng, textbox, nền, transition, animation, slideshow, move/resize/rotate, arrange, align, undo, group/ungroup in-memory và các thao tác slide đã ghi trong báo cáo; XML có `<p:transition>`, `<p:timing>`, chart part và ảnh. FAIL — U-L31/U-L32/U-L33 nêu trên. NOT RUN — font family/cỡ chữ, giãn dòng, đánh số và các trường hợp biên ghi ở audit. BLOCKED — `tests/live/slides-charts.playwright.mjs`: thiếu `playwright-core` tại đường dẫn cấu hình. PowerPoint COM được kích hoạt thử nhưng trả Slides.Count=0 nên không dùng làm oracle; đối chiếu bằng XML và model app.
KNOWN FAILURES: Slide Master `themeId` mất sau roundtrip; Ctrl+P không bật bút dù Ctrl+L bật laser; nhóm shape không ghi `p:grpSp`, mất groupId khi mở lại. Theme carousel, bảng màu, bullets gallery, v.v. đã có backlog trước đó; không thêm tính năng mới trong ticket.
RISKS: Chưa chạy live Playwright do dependency thiếu; kết quả cho font family/cỡ chữ, line spacing, numbered list và vài edge cases còn NOT RUN. Theme visual parity qua PowerPoint chưa được xác nhận bằng COM.
DEPENDENCIES/BLOCKERS: Cần môi trường có `playwright-core` để chạy live test chart; lỗi theme/group cần owner adapter/Slides điều tra roundtrip; Ctrl+P cần kiểm tra xung đột phím tắt ở chế độ trình chiếu.
CORE PATCH ID (if any): N/A — không sửa LibreOffice Core.
NEXT ACTION: Theo dõi U-L31/U-L32/U-L33; chạy tiếp các mục NOT RUN khi có môi trường tương tác phù hợp; cài đặt/định vị Playwright hiện có rồi chạy live chart test.
