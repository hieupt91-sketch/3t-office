# Plan: giao diện thích ứng iPhone/iPad

## Objective

Thay lớp trình bày iOS hiện tại bằng trải nghiệm cảm ứng thích ứng: iPhone ưu tiên vùng tài liệu và thanh công cụ ngữ cảnh; iPad dùng ribbon gọn, sidebar có thể thu gọn và hỗ trợ Split View. Không bê nguyên bố cục desktop.

## Current capability

Shell Swift/WKWebView đã chạy offline bằng tài nguyên đóng gói, có safe area và CSS breakpoint cơ bản. Chưa có điều phối riêng cho kích thước cửa sổ, Dynamic Type, bàn phím ngoài/ảo và điều khiển ngữ cảnh ở đáy màn hình.

## Files/modules

- `ports/ios/launcher/MobileOfficeViewController.swift`: phát hiện trait/keyboard, truyền trạng thái viewport và nạp lớp UI thích ứng.
- `ports/ios/Web/mobile-shell.css`: bố cục compact/regular, portrait/landscape, touch/keyboard/focus.
- `ports/ios/Web/mobile-adaptive.js`: chrome cảm ứng iPhone/iPad, chuyển app và chuyển tiếp command sang UI hiện hữu.
- `ports/ios/scripts/stage-web-assets.sh`: đóng gói lớp mobile mới.
- `tests/ios/**`: kiểm tra offline, accessibility/touch target và cấu hình adaptive.
- `docs/mobile/**`, `09-templates/AGENT-HANDOFF.md`: bằng chứng và handoff.

## Dependencies

Chỉ UIKit/WebKit và asset hiện có; không thêm package, server hoặc thay shared source. Command chưa có API public sẽ được chuyển tiếp vào control hiện hữu bằng DOM, ghi dependency để Shared Platform chuẩn hóa sau.

## Risks

- Selector desktop thay đổi có thể làm adapter UI mobile mất liên kết.
- WebKit contenteditable và bàn phím iOS có thể khác thiết bị thật.
- Simulator không chứng minh hiệu năng, Pencil hay bàn phím phần cứng thật.

## Test plan

1. Focused tests cho staging, offline boundary, 44pt, breakpoint và bridge.
2. Xcode Debug build cho iOS Simulator.
3. Cài/chạy native trên iPhone portrait/landscape và iPad regular/Split View; chụp ảnh và kiểm tra trực quan.
4. Kiểm tra log không có JavaScript error và app không cần Node/server.

## Rollback

Revert commit UI adaptive; shell offline ở commit `7d73f11` vẫn độc lập và có thể build lại.
