# Agent Handoff

TASK: VN Slides — Animation Pane + Set Up Slide Show
AGENT/ROLE: Grok — Slides implementation
BRANCH: `feature/slides-animation-pane-slideshow-setup`
WORKTREE: `E:\VNOffice-grok-slides-animation-slideshow` (tách từ `main` `ecc37b0`, **KHÔNG merge vào main**)
OBJECTIVE: Bổ sung 2 gap Medium trên `docs/PLAN-RIBBON-GAPS-ROUND3.md`: Ngăn hoạt hình (list/reorder/start/xóa) và hộp thoại Thiết lập trình chiếu (loop đến Esc, không thuyết minh, màu bút/laser).

---

## Plan gate

Thay đổi shared command/i18n/help, >3 file, document model (thêm `order`/`start` trên animation object; `slideShowSettings` presentation-level), FODP import/export. Không đụng Writer/Sheet source, Core, build system, không gửi nội dung tài liệu ra cloud.

- **Objective:** Pane liệt kê mọi animation trên slide đang chọn, đổi thứ tự thật khi F5, đổi Bắt đầu, xóa hiệu ứng (không xóa đối tượng); dialog Set Up với loop thật khi hết slide cuối.
- **Current capability trước task:** Chỉ `slides.animation.apply` (một dialog gắn 1 hiệu ứng cho 1 đối tượng). Không có `animationPane`/`setupShow`. F5 `advanceShow` đóng overlay khi hết slide cuối.
- **Files/modules:** `apps/slides/*`, `adapters/libreoffice/slides/slides-adapter.js`, `platform/commands/command-definitions.js` (thêm dòng `slides.*`), `platform/i18n/*`, `platform/ui-kit/icons.js`, `platform/help/entries-slides.js` (entry mới). Thêm `command-dispatch-mapper.js` vì UNO mapping bắt buộc theo kiến trúc command bus (ngoài danh sách file gốc nhưng cần).
- **Dependency:** Playwright Edge cho live test. Không thư viện trả phí.
- **Risk:** Đổi cách tính delay F5 (timeline theo thứ tự + start) so với delay lưu sẵn trên từng object — object cũ không có `order` vẫn chạy theo thứ tự mặc định title → body → body2 → shapes.
- **Test plan:** `node tests/run-tests.js` <90s; unit 3 animation + reorder đổi `playDelay` thật; xóa không mất object; loop F5 về slide 1; Playwright live click ribbon.
- **Rollback:** revert branch, không merge main.

---

## 1. Findings — cơ chế animation hiện có (đọc trước khi thiết kế)

Đọc thật `apps/slides/slides-canvas.js`, `adapters/libreoffice/slides/slides-adapter.js`, `docs/HANDOFF-SLIDES-ANIMATIONS-NOTES.md`. Grep `command-definitions.js`: **không có** `animationPane` / `setupShow`.

### Model lưu animation (không có mảng `slide.animations`)

Hiệu ứng **gắn trên từng đối tượng**, không phải list theo slide:

| Chỗ lưu | Đối tượng |
|---|---|
| `slide.titleAnimation` | Tiêu đề |
| `slide.bodyAnimation` | Nội dung / cột 1 |
| `slide.body2Animation` | Cột 2 (layout two-content) |
| `shape.animation` | Từng shape trong `slide.shapes` |

Mỗi config trước task: `{ type, duration, delay }` với `type` ∈ `none` / `fadeIn` / `flyIn` / `zoomIn` / `bounceIn` / `slideLeft`.

`setObjectAnimation(target, cfg)` ghi vào một trong các trường trên. Dialog `showAnimationDialog()` chọn 1 target rồi apply. Canvas editor hiện badge `★ type` trên shape có hiệu ứng.

**Không có:** thứ tự chạy tường minh, kiểu bắt đầu (on click / with previous / after previous), pane list, xóa-khỏi-danh-sách riêng.

### Playback F5 trước task

`startSlideShow` → `renderShow` gắn CSS `animation: keyframe duration ease-out delay forwards` **ngay khi slide hiện**, dùng `delay` lưu trên từng object. Mọi hiệu ứng trên trang chạy song song (lệch nhau nhờ delay), không click-step. `advanceShow` / click / Space: `nextVisible()`; hết slide cuối thì `closeShow()`.

FODP: `_serializePageAnimXml` ghi SMIL `<anim:seq>` theo thứ tự cứng title → body → body2 → shapes, `presentation:node-type="on-click"`. Parse gán lại theo `smil:targetElement`.

### Pen / laser / narration

Grep `apps/slides`: **không có** bút, laser pointer, hay audio narration trong chế độ trình chiếu. Set Up Slide Show lưu màu + cờ “không thuyết minh” cho tương lai, không vẽ pointer.

### Undo

Slides dùng `undoStack` typed (`shape-add`, `hidden`, `slide-background`, …). Apply animation dialog **không** ghi undo. Pane reorder/xóa/start dùng type mới `animations` (snapshot before/after trên slide).

---

## 2. Quyết định thiết kế

| Câu hỏi | Quyết định |
|---|---|
| Kéo-thả hay nút lên/xuống? | **Chỉ nút ↑ / ↓.** Kéo-thả không làm — đủ cho reorder thật, tránh DnD trên list trong overlay. |
| Thêm `slide.animations[]`? | **Không.** Giữ model hiện có; thêm `order` (số) và `start` (`onClick` / `withPrevious` / `afterPrevious`) trên cùng object `{ type, duration, delay }`. Pane `collectSlideAnimations()` dựng list. |
| Thứ tự mặc định khi chưa có `order`? | title → body → body2 → shapes (thứ tự mảng). |
| Playback sau reorder? | `getAnimationTimeline()` tính `playDelay` CSS: phần tử đầu dùng `delay` sẵn; `withPrevious` = cùng thời điểm trước; `onClick` và `afterPrevious` = sau khi hiệu ứng trước kết thúc (`cursor + duration`). F5 ghi `data-vno-anim-delay` — test đọc attr này, không tin mỗi UI pane. |
| Click-step từng On Click như PowerPoint? | **Chưa.** F5 vẫn auto-play cả trang theo timeline (giữ Space = sang trang). `onClick` hiện **cùng nhịp afterPrevious** lúc chiếu. Ghi rõ để task sau làm click-advance nếu cần. |
| Lưu FODP? | **Có.** Thứ tự = thứ tự node trong `<anim:seq>`. `start` = `presentation:node-type` `on-click` / `with-previous` / `after-previous`. Loop = ODF `presentation:endless="true"` trên `<presentation:settings>`. Cờ không thuyết minh + màu pointer **không có thuộc tính ODF chuẩn** → `vno:without-narration` / `vno:pointer-color` trên cùng thẻ settings (session + round-trip FODP). |
| Pen/laser? | Chỉ lưu màu. Chưa vẽ. |

---

## 3. Implementation summary

### Animation Pane

- Lệnh `slides.animation.pane` (toggle), tab **Hoạt hình**, nhóm **Hiệu ứng đối tượng**, cạnh Hiệu ứng đối tượng.
- Panel phải `aside.vno-animation-pane` (giống comments): số thứ tự, tên đối tượng (preview text nếu có), kiểu, dropdown Bắt đầu, ↑ ↓, Xóa.
- Xóa: `type: "none"` — object/shape còn.
- Undo type `animations`.
- F5 dùng timeline, không còn delay “tĩnh” khi đã reorder.

### Set Up Slide Show

- Lệnh `slides.show.setupShow`, tab **Trình chiếu**, nhóm **Thiết lập**, cạnh Ẩn trang chiếu.
- Dialog: checkbox loop, checkbox không thuyết minh, `<input type="color">`.
- `slideShowSettings = { loopUntilEsc, showWithoutNarration, pointerColor }`.
- Loop: hết slide hiện cuối → `_firstVisibleSlideIndex()`, **không** đóng overlay. Esc vẫn thoát. Presenter View cũng loop. Tắt loop: hết trang cuối đóng như cũ.

### Help (AGENTS.md mục 10)

Hai entry tiếng Việt cụ thể: `slides.animation.pane`, `slides.show.setupShow` trong `platform/help/entries-slides.js`.

---

## 4. Phạm vi đã làm / chưa làm

| Mục | Trạng thái |
|---|---|
| Pane list mọi animation trên slide đang chọn | Xong |
| Nút lên/xuống đổi thứ tự chạy F5 thật | Xong |
| Dropdown Bắt đầu (3 kiểu) đổi `playDelay` | Xong |
| Xóa hiệu ứng, giữ đối tượng | Xong |
| Undo/Redo pane | Xong |
| Set Up dialog + loop F5 về slide 1 | Xong |
| Help 2 bài tiếng Việt | Xong |
| FODP order + `presentation:endless` | Xong |
| Kéo-thả trong pane | **Chưa** (cố ý, nút ↑↓) |
| Click-advance từng On Click khi F5 | **Chưa** (auto-play theo timeline) |
| Vẽ bút/laser trên màn hình chiếu | **Chưa** — chỉ lưu màu |
| Tắt audio thuyết minh | **Chưa có narration** — chỉ lưu cờ |

Cả hai tính năng làm xong trong task này, không hoãn Set Up Slide Show.

---

## 5. Files changed

1. `apps/slides/slides-canvas.js` — collect/timeline/pane/undo, F5 delay + loop, dialog setup
2. `apps/slides/slides-ribbon.js` — nút pane + setupShow
3. `apps/slides/slides.css` — panel pane
4. `adapters/libreoffice/slides/slides-adapter.js` — dispatch, serialize thứ tự SMIL, `presentation:settings`
5. `adapters/libreoffice/common/command-dispatch-mapper.js` — `.uno:AnimationPane`, `.uno:PresentationDialog` (cần cho UNO; không đụng `.uno:CustomAnimation` của apply)
6. `platform/commands/command-definitions.js` — `slides.animation.pane`, `slides.show.setupShow`
7. `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`
8. `platform/ui-kit/icons.js` — `animationPane`, `setupShow`
9. `platform/help/entries-slides.js` — 2 entry mới + bổ sung bước pane vào bài apply
10. `tests/unit/slides-animation-pane-setup-show.test.js`
11. `tests/unit/slides-help.test.js` — required ids
12. `tests/live/slides-animation-pane-setup-show.playwright.mjs`
13. `tests/run-tests.js` — suite 98
14. `docs/HANDOFF-SLIDES-ANIMATION-PANE-SLIDESHOW-SETUP.md`

Không sửa `apps/writer/**`, `apps/sheet/**`.

---

## 6. Commands run

```
git worktree add -b feature/slides-animation-pane-slideshow-setup E:\VNOffice-grok-slides-animation-slideshow main
node --check (các file JS đã sửa)
node tests/run-tests.js
node tests/live/slides-animation-pane-setup-show.playwright.mjs
```

---

## 7. Build / Test results

- **BUILD:** không đổi build system. `node --check` PASS.
- **TEST `node tests/run-tests.js`:** **PASS** — `1026/1026` PASS, 0 FAIL, ~72s (<90s). Suite 98: 13/13.
- **LIVE Playwright** (không SendKeys, click ribbon + pane + dialog + `show.next()`): **PASS** — `LIVE PASS: Animation Pane list/reorder/delete + F5 delay order + Set Up loop to slide 1`.
- Không disable test, không nuốt exception.

---

## 8. Known failures

Không.

---

## 9. Risks

- F5 của slide cũ (nhiều animation, không `order`) chạy **nối tiếp** theo title→body→shapes thay vì chồng delay độc lập như trước. Hành vi gần PowerPoint hơn; delay field vẫn lưu và dùng cho phần tử đầu timeline.
- `vno:without-narration` / `vno:pointer-color` là custom namespace đã dùng sẵn (`xmlns:vno`). LibreOffice có thể bỏ khi convert PPTX — loop `presentation:endless` là chuẩn ODF, bền hơn.

---

## 10. Dependencies / blockers

Không. Pen/laser renderer và narration audio là task riêng.

---

## 11. Core patch ID

Không. Không sửa LibreOffice Core.

---

## 12. Next action

- **Không merge vào `main`.** Người phụ trách review branch `feature/slides-animation-pane-slideshow-setup`.
- Task sau (tuỳ chọn): click-advance On Click khi F5; vẽ laser/pen dùng `pointerColor`; kéo-thả pane.
