# PLAN — SLIDES-2-3110: các lỗi Slide còn lại trên macOS + bài CDP FIX-SLIDES chạy được trên Windows

Nguồn: `docs/HANDOFF-FIX-SLIDES-2510.md` (RISKS 4 — «chưa sửa»), `docs/EXPLORE-MAC-2510.md` (D1 phụ),
`docs/sync/INBOX-MAC.md` #13 (phản hồi Windows).
Nhánh/worktree: `mac/slides2-cl-3110` tại `/Volumes/Data/Worktrees/mac-slides2-cl-3110` (gốc origin/vn-main 4c7da4c8).

## 1. Objective
1. **T1 — Bài test di động**: `tests/live/cdp/slides-fix-2510.desktop.mjs` không treo ở bước «mở lại» trên Windows
   (tên 8.3 `3TCOMP~1` ≠ tên dài); bộ CDP macOS không dùng bộ nhớ đệm HTTP QtWebEngine chung giữa các worktree.
2. **a** — Mở lại PPTX do 3T Slide lưu: thanh nhấn chủ đề (accent) hiện lại, đúng màu chủ đề đã lưu.
3. **b** — Mở lại: khung trang chiếu nằm gọn trong vùng nhìn (không bị thanh trạng thái/ghi chú che).
4. **c** — Hình thu nhỏ (ngăn trái, Sắp xếp trang), trình chiếu, in/xem trước in vẽ hình dựng sẵn (mũi tên…) đúng
   hình như trình soạn — dùng chung `_presetForShape()`.
5. **d** — Chữ nhật/elip thường lưu PPTX chữ căn GIỮA theo chiều dọc như trình soạn (không `anchor="t"`), vẫn giữ
   tên style `gr3b82f6` cho chữ nhật thường (test `slides-text-vertical-direction`/`slides-fix-2510` khóa tên này).

## 2. Current capability / nguyên nhân gốc (đã xác minh trên mã gốc 4c7da4c8)
- **T1 đường dẫn**: bước chờ mở lại so chuỗi đường dẫn TRONG trang (`replace(\\→/).toLowerCase()`), không realpath →
  tên 8.3 của `os.tmpdir()` trên Windows không bao giờ khớp tên dài app trả về → hết 240 s.
- **T1 bộ nhớ đệm**: pywebview Qt tạo `QWebEngineProfile('pywebview')` chỉ đặt persistent storage; HTTP cache theo
  `QStandardPaths::CacheLocation` = `~/Library/Caches/main.py/QtWebEngine`. CoreFoundation trên macOS bỏ qua `$HOME`
  nên HOME tạm của `session.mjs` KHÔNG cô lập cache (đo: 110 tệp cache chung bị ghi trong một lượt CDP).
  Đã đo `QTWEBENGINE_CHROMIUM_FLAGS=--disk-cache-dir=… --disk-cache-size=1`: QtWebEngine 6.12 bỏ qua (cache chung
  vẫn bị ghi). `CFFIXED_USER_HOME=<HOME tạm>`: cache nằm trong HOME tạm, cache chung 0 tệp bị ghi.
- **a**: `SlidesAdapter.loadFromFodp()` đặt `canvas.imported = true` cho MỌI tệp mở (`slides-adapter.js:5515`) →
  `selectSlide()` ẩn `masterAccentEl` (`slides-canvas.js:7592-7593`), hình thu nhỏ bỏ thanh nhấn (`:7325-7326`), và
  lần lưu sau `_serializeMasterPageXml()` bỏ luôn thanh nhấn khỏi master (`:4918`). Tệp 3T lưu VẪN có thanh nhấn
  trong master (soffice PPTX→FODP: `draw:custom-shape` ooxml-rect tại 0,0 rộng bằng trang, cao 0,249 cm, tô accent1)
  và `loext:theme` mang đúng bảng màu chủ đề VN (`apply_native_slides_theme`). Không thể dùng «trang có master VNO*»
  làm dấu hiệu vì tệp PowerPoint mở rồi lưu bằng 3T cũng có master VNO* nhưng KHÔNG có thanh nhấn.
- **b**: tài liệu mới 1 px = 1 pt (960×540 px); tệp mở `ptPerPx = 0.75` (`slides-adapter.js:5517`) → trang 1280×720 px
  ở thu phóng 100 % (không tự vừa cửa sổ) → tràn xuống dưới thanh trạng thái (ảnh `before`, cả tệp PowerPoint).
- **c**: `_shapeSorterHtml()` (Sắp xếp trang, in, trang ghi chú — `slides-canvas.js:4768`) chỉ vẽ `rect/ellipse`
  bằng div nền (hình dựng sẵn thành chữ nhật; `arrow` mở lại không vẽ gì); `_shapePresentationHtml()` (trình chiếu
  `:4650`) vẽ mọi hình bằng div nền; ngăn trái `_renderThumbnails()` (`:7310`) không vẽ hình nào.
  Chỉ trình soạn (`_renderShapesLayer`, `:5766`) dùng `_presetForShape()` + `renderPresetGeometry()`.
- **d**: chữ nhật/elip không có tùy chọn chữ dùng style tô màu chung `gr<màu>` (`slides-adapter.js:3153-3158`)
  không có `draw:textarea-vertical-align` → LibreOffice mặc định «trên» → PPTX `anchor="t"` (đo tệp thật: slide2
  `anchor="t"` cho khung nội dung, `ctr` cho mũi tên). `gr<màu>` dùng chung cả cho hộp chữ có nền (hộp chữ đúng là
  căn trên).

## 3. Files/modules
| Tệp | Chủ sở hữu | Thay đổi |
|---|---|---|
| `tests/live/cdp/session.mjs`, `session.test.mjs` | QA | macOS: `CFFIXED_USER_HOME` = HOME tạm (cache QtWebEngine theo phiên) |
| `tests/live/cdp/output-path.mjs`, `cdp-platform-helpers.test.mjs` | QA | `canonicalPath()/samePath()` (resolve + realpathSync.native + «/» + chữ thường win32) |
| `tests/live/cdp/slides-fix-2510.desktop.mjs` | QA | bước chờ mở lại so đường dẫn phía Node bằng `samePath()`; KHÔNG đổi các ca kiểm |
| `adapters/libreoffice/slides/slides-adapter.js` | Integration | a: nhận diện thanh nhấn 3T trong master + bảng màu `loext:theme` → không coi là tệp ngoài, khôi phục màu chủ đề; b: gọi vừa cửa sổ sau khi mở; d: `gr<màu>` của hình có `textarea-vertical-align="middle"`, hộp chữ có nền dùng style riêng, hình không nền có chữ dùng `_m`; đọc lại `middle` của hình = mặc định |
| `apps/slides/slides-canvas.js` | Slides | a: `applySlideMaster` nhận tên/ID chủ đề VN từ tệp; b: `fitToWindowIfOverflowing()`; c: `_presetGeometryHtml()` dùng `_presetForShape()` cho Sắp xếp trang/in/ghi chú/ngăn trái/trình chiếu |
| `apps/slides/slides.css` | Slides | c: lớp hình trong hình thu nhỏ ngăn trái, SVG hình dựng sẵn trong trình chiếu/hình thu nhỏ |
| `platform/help/entries-slides.js` (+ i18n nếu cần) | Platform (Help) | Hướng dẫn VI cho hành vi người dùng thấy |
| `tests/unit/slides-2-3110.test.js`, `tests/run-tests.js` | QA | Unit tái hiện a/b/c/d (fail trước, pass sau) |
| `tests/live/cdp/slides-2-3110.desktop.mjs` | QA | CDP desktop: soạn → lưu PPTX → kiểm XML → mở lại: thanh nhấn, vừa khung, hình thu nhỏ/trình chiếu là SVG |

Không `if mac` trong `apps/**`; không sửa `main.py` (Windows giữ Q69 Cache-Control); không sửa LibreOffice core;
không đổi `platform/shapes/shape-presets.js` (dùng chung Sheet).

## 4. Dependency
Không thêm phụ thuộc. CDP cần soffice pilot (`VNOFFICE_SOFFICE_PATH`).

## 5. Risk
- a: dấu hiệu «3T gốc» chỉ là thanh nhấn trong master (tên `grMasterAccent` hoặc hình chữ nhật tô màu ở 0,0 rộng
  ≥ 95 % trang, cao ≤ 0,4 cm). Tệp PowerPoint thật có đúng một dải như vậy trên master sẽ được coi là tệp 3T
  (hiện thanh nhấn của chính nó — màu lấy từ tệp, không phải màu VN). Chấp nhận; có test PowerPoint/không dải.
- b: chỉ thu nhỏ khi trang TRÀN vùng nhìn (không phóng to tài liệu vừa sẵn); chỉ khi có layout thật (clientWidth > 0).
- c: hình thu nhỏ ngăn trái giờ vẽ cả hình (trước không có) — dùng chung hàm của Sắp xếp trang, nhẹ (chuỗi HTML).
- d: hộp chữ CÓ nền đổi tên style `gr<màu>` → `gr<màu>_box` (nội dung style y như cũ); hình không nền có chữ
  `grNone` → `grNone_m`. Đọc lại: `middle` của hình (không phải hộp chữ) là mặc định canvas → không ghi thuộc tính.
- Tệp do bản cũ lưu với mũi tên đã bị co (200×27): KHÔNG tự sửa ngầm — không phân biệt được với hình người dùng cố ý
  vẽ dẹt; ghi rõ trong handoff + Help (kéo lại kích thước).

## 6. Test plan
1. Unit `tests/unit/slides-2-3110.test.js` (chạy trên mã gốc phải FAIL, sau sửa PASS): FODP mô phỏng đúng đầu ra
   soffice của tệp 3T (đo 31-10: master VNOTitleContent có custom-shape ooxml-rect 33,866×0,249 cm, `loext:theme`
   bảng màu) → `canvas.imported=false`, màu nhấn/tiêu đề khôi phục; FODP PowerPoint/không dải → vẫn imported;
   `fitToWindowIfOverflowing`; `_shapeSorterHtml`/`_shapePresentationHtml`/ngăn trái có SVG path của preset cho
   `rect+geomType` và `arrow`; serialize rect/ellipse → style có `textarea-vertical-align="middle"` và tên vẫn
   `gr3b82f6`, hộp chữ có nền không bị căn giữa; soffice FODP→PPTX thật (nếu có soffice) `anchor="ctr"`.
2. `node --test tests/live/cdp/session.test.mjs tests/live/cdp/cdp-platform-helpers.test.mjs`.
3. CDP macOS (heavy-lock, ≤ 10 phút/lượt): `slides-fix-2510.desktop.mjs` vẫn 18/18; `slides-2-3110.desktop.mjs`
   chạy trên mã gốc (FAIL) và mã sửa (PASS); xem ảnh trước/sau.
4. Cổng: `npm test` (mốc 3852/3852 ghi trước khi sửa), i18n parity 0/0, `verify_checklist_evidence.py --all --no-fix` 0/0/0.

## 7. Rollback
Mỗi phần một commit (T1 / a+b / c / d / Help+docs); `git revert <hash>` từng commit. Không đổi định dạng tệp ngoài
thuộc tính căn dọc của style và tên style hộp chữ có nền.
