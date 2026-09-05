# Agent Handoff

TASK: Morph-style transition cho VN Slides
AGENT/ROLE: Codex (Slides UI/engine + LibreOffice adapter + test)
BRANCH: `feature/slides-morph-transition`
WORKTREE: `E:\VNOffice-codex-morph-transition`
OBJECTIVE: Thêm Morph thật ở mức đơn giản cho F5, fallback crossfade an toàn, chọn được trong UI và lưu metadata trung thực qua FODP.

FINDINGS:

- Trước task, F5 thay toàn bộ `innerHTML` của `.vno-slideshow-content` rồi chạy một CSS keyframe Fade/Slide/Zoom/Flip trên cả slide. Shape trình chiếu có geometry tuyệt đối từ `x/y/w/h` nhưng không có định danh DOM.
- Adapter đã lưu transition chuẩn qua `style:drawing-page-properties` và `anim:transitionFilter`. ODF/SMIL không có loại Morph tương đương.
- Morph Microsoft dùng extension PPTX `p159:morph` trong namespace PowerPoint 2015/09, không phải transition ECMA/SMIL thông thường.
- Probe thật bằng LibreOffice 26.2.1 headless:
  - FODP chứa `vno:transition="morph"` parse trực tiếp bằng VN adapter: giữ Morph 800ms.
  - LibreOffice rewrite FODP: loại thuộc tính/namespace `vno`.
  - VN FODP → PPTX: không sinh `p159:morph`; sinh `<p:fade>` fallback.
  - PPTX được chèn `p159:morph` hợp lệ → LibreOffice → FODP: không còn token Morph và adapter không nhận được transition.

IMPLEMENTATION SUMMARY:

- UI transition picker có option `Morph`; preview dialog dùng Fade có chú thích vì preview không có cặp slide/shape để match.
- Shape trình chiếu có `data-vno-shape-id` và type.
- Khi slide đích chọn Morph, engine match duy nhất shape có cùng chuỗi `id`, cùng `type`, geometry hữu hạn và không phải connector.
- Shape đích được render ở geometry đích, sau đó dùng FLIP transform từ geometry nguồn: translate + scale chuyển về identity trong đúng duration; `background-color` và `opacity` cùng transition. Reflow + delay 32ms bảo đảm browser thực sự tạo CSS transition.
- Entrance animation riêng trên shape được tắt trong nhánh Morph để không tranh chấp thuộc tính `transform`.
- Shape mới không match fade-in. Nếu toàn bộ cặp không có match, cả slide chạy `vnoTransitionFade`; code comment ghi rõ đây là safe Morph fallback.
- Serializer ghi `vno:transition="morph"` trên `draw:page` và đồng thời ghi SMIL Fade/duration chuẩn. Parser ưu tiên custom value khi còn tồn tại.

MỨC ĐỘ “THẬT”:

- Có animation CSS thật, đo được khi F5: transform ở trạng thái trung gian, transition 1000ms đang chạy, resize bằng scale và màu chuyển từ nguồn sang đích.
- Chỉ hỗ trợ trường hợp đơn giản 1–2 shape có cùng ID và cùng loại. Không suy đoán shape theo vị trí/tên/text, không morph connector, path, text run, crop ảnh hoặc topology.
- Không phải thuật toán matching phức tạp/pixel-identical của PowerPoint. Không có match rõ ràng thì cố ý crossfade thay vì bịa match hoặc đứng hình.

FILES CHANGED:

- `apps/slides/slides-canvas.js`
- `apps/slides/slides.css`
- `adapters/libreoffice/slides/slides-adapter.js`
- `tests/unit/slides-animations-notes.test.js`
- `tests/live/slides-morph-transition.playwright.mjs`
- `tests/live/fodp-morph-persistence-real-conversion.mjs`
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-SLIDES-MORPH-TRANSITION.md`

COMMANDS RUN:

```text
node --check apps/slides/slides-canvas.js
node --check adapters/libreoffice/slides/slides-adapter.js
node tests/live/slides-morph-transition.playwright.mjs
node tests/live/fodp-morph-persistence-real-conversion.mjs
node tests/run-tests.js
git diff --check
```

BUILD RESULT: PASS — không đổi build system/dependency; syntax nằm trong master suite PASS.

TEST RESULTS:

- `node tests/run-tests.js`: **763/763 PASS, 0 FAIL, 53.263s** (dưới 60 giây).
- `node tests/live/slides-morph-transition.playwright.mjs`: **PASS** — UI chọn Morph thật; Playwright nhấn F5/ArrowRight thật, không SendKeys; đo transform CSS đang chạy cho same-ID và `vnoTransitionFade` đang chạy cho no-match fallback.
- `node tests/live/fodp-morph-persistence-real-conversion.mjs`: **PASS** — ba hop soffice thật, kết quả compatibility đúng như phần Findings.

KNOWN FAILURES:

- Không có test failure đã biết.
- Metadata custom `vno:transition` không sống qua LibreOffice rewrite hoặc PPTX. File được xuất qua LibreOffice vẫn mở được và chạy Fade fallback, nhưng không thể phục hồi Morph khi nhập lại.
- Morph của VN hiện không tương thích round-trip với PowerPoint Morph native `p159:morph`.
- Presenter Console không dùng engine transition F5 này; task chỉ yêu cầu trình chiếu F5.

RISKS:

- Matching theo ID phụ thuộc ID được giữ giữa hai slide; thao tác nhân đôi/import có thể tạo ID khác và sẽ fallback Fade.
- Shape có entrance animation riêng sẽ không chạy entrance animation ở slide Morph vì cả hai cùng cần `transform`; ưu tiên Morph để tránh xung đột CSS.

DEPENDENCIES/BLOCKERS: Không dependency mới, không thư viện trả phí. Không blocker cho phạm vi đã giao; giới hạn nằm ở filter LibreOffice/extension Morph độc quyền Microsoft.
CORE PATCH ID (if any): N/A — không sửa LibreOffice Core.
NEXT ACTION: Review các commit trên branch này. **KHÔNG merge vào main** trong task này. Nếu cần fidelity cao hơn, mở task riêng cho matching theo tên/text/geometry và chiến lược sidecar metadata ngoài pipeline LibreOffice.
