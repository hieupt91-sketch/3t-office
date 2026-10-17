# Kế hoạch: Slides "Thêm hoạt ảnh" (nhiều hiệu ứng trên một đối tượng) và "Kích hoạt"

Trạng thái: **kế hoạch, chưa code** (cổng kế hoạch AGENTS.md mục 6: đụng mô hình hoạt ảnh + lưu/mở PPTX).

## 1. Mục tiêu
- Một đối tượng có nhiều hiệu ứng nối tiếp (ví dụ Vào rồi Thoát), như nút **Thêm hoạt ảnh** của PowerPoint 2016.
- **Kích hoạt**: hiệu ứng chạy khi bấm vào một đối tượng khác (trigger), không chỉ theo thứ tự bấm chuột.
- Lưu PPTX rồi mở lại (và PowerPoint COM đọc lại) phải đủ số hiệu ứng, đúng loại, đúng thứ tự.

## 2. Hiện trạng (đã đọc mã)
- Mô hình: mỗi đối tượng có đúng MỘT `animation = {type,duration,delay,start,order,direction}` (`apps/slides/slides-canvas.js` ~2060–2350); tiêu đề/nội dung dùng `titleAnimation/bodyAnimation/body2Animation` trên trang.
- Cả 3 nhóm Vào/Nhấn mạnh/Thoát đã có (`apps/slides/slide-animation-classes.js`).
- Mọi chỗ dựng danh sách đều khóa theo `target` (một mục/đối tượng): `collectSlideAnimations`, `getAnimationTimeline`, `_timelineByTarget`, ngăn Hoạt ảnh, kéo đổi thứ tự (`_assignAnimationOrders`), vẽ huy hiệu ★ (`~5332`), chạy xem trước, snapshot hoàn tác (`_snapshotSlideAnimations`).
- Lưu: `adapters/libreoffice/slides/slides-adapter.js` `_serializeEntranceAnimation` (~2497–2526) ghi một nút cho mỗi slot; mở: ~2713/2750 gán một hiệu ứng cho mỗi đối tượng.

## 3. Thiết kế
1. **Mô hình**: giữ `shape.animation` (hiệu ứng đầu, tương thích tài liệu cũ) và thêm `shape.extraAnimations: []` (cùng cấu trúc, thêm `trigger?: {shapeId}`). Tiêu đề/nội dung tương tự (`titleExtra...` hoặc gom về hàm `_animationSlotsOf(slide,target)` để chỉ một chỗ biết cách lưu).
2. **Slot có khóa riêng**: `collectSlideAnimations` trả mục với `slotId = "<target>#<n>"`; mọi chỗ khóa theo `target` đổi sang `slotId` (pane, timeline, reorder, huy hiệu, xem trước). `target` giữ để biết đối tượng.
3. **Lệnh**: `slides.animation.add` (nút "Thêm hoạt ảnh" + thư viện kiểu) thêm hiệu ứng mới vào đối tượng; `slides.animation.setType` vẫn thay hiệu ứng đang chọn trong ngăn. Xóa một hiệu ứng ở ngăn Hoạt ảnh (nút/Delete).
4. **Kích hoạt** (`slides.animation.trigger`): menu "Khi bấm vào…" liệt kê các đối tượng của trang; lưu `trigger.shapeId`; phát: bấm đối tượng đó trong chế độ trình chiếu thì chạy hiệu ứng.
5. **Lưu PPTX**: ghi mỗi slot thành một nút `anim:par` tuần tự theo `order`; trigger ghi `presentation:preset...`/`anim:begin="<id>.click"` (cần xác nhận bằng PowerPoint COM `TimeLine.InteractiveSequences`). Nhập: nhiều nút cùng `smil:targetElement` → phần tử đầu vào `animation`, các nút sau vào `extraAnimations`.
6. **Hoàn tác**: snapshot mở rộng gồm `extraAnimations`.

## 4. Tệp ảnh hưởng
`apps/slides/slides-canvas.js`, `apps/slides/slides-ribbon.js`, `adapters/libreoffice/slides/slides-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py` (nếu soffice làm mất hiệu ứng thứ hai), `platform/commands/command-definitions.js`, `platform/i18n/strings-{vi,en}.js`, `platform/help/entries-slides.js`, `tests/unit/help-coverage.test.js` (đếm lệnh).

## 5. Rủi ro
- Soffice có thể gộp/bỏ hiệu ứng thứ hai trên cùng đối tượng khi xuất PPTX → thử nghiệm sớm bằng FODP tay (bước 0).
- Trigger tương tác dễ mất khi lưu; nếu soffice không ghi được thì báo rõ "chưa lưu được" thay vì giả vờ (không nút vô hiệu im lặng).
- Tài liệu cũ chỉ có một hiệu ứng phải đọc/ghi không đổi (kiểm bằng bộ mở-sửa-lưu hiện có).

## 6. Kế hoạch kiểm thử
- Bước 0: dựng PPTX bằng PowerPoint COM có đối tượng với Vào + Thoát + trigger; mở bằng ứng dụng, xem model; lưu lại; COM đọc lại số hiệu ứng.
- Unit: thu thập slot, đổi thứ tự, snapshot hoàn tác, tương thích mô hình cũ.
- CDP: Thêm hoạt ảnh x2 trên một hình, ngăn Hoạt ảnh hiện 2 dòng, xem trước, lưu, mở lại.
- Cổng: `npm test`, `i18n_parity`, `verify_checklist_evidence.py --all --no-fix`, `pytest tests/test_slides_*`.

## 7. Hoàn nguyên
Thay đổi nằm sau trường mới `extraAnimations`; xóa nhánh hoặc revert commit thì tài liệu cũ vẫn chạy như trước.

## 8. Trợ giúp
Mục Hướng dẫn mới: "Thêm hoạt ảnh" và "Kích hoạt" (tab Hoạt hình, nhóm Hoạt hình nâng cao), bước dùng cụ thể.
