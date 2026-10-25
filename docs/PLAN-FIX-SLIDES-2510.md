# PLAN — FIX-SLIDES-2510: sửa lỗi Slide D1 (critical), D7, D8 phát hiện trên macOS

Nguồn lỗi: `docs/EXPLORE-MAC-2510.md` (nhánh `mac/userflow-cl-2510`), mục D1, D7, D8.
Nhánh/worktree: `mac/slides-fix-cl-2510` tại `/Volumes/Data/Worktrees/mac-slides-fix-cl-2510` (gốc origin/vn-main 9c686d33).

## 1. Objective
1. **D1** — Mở lại PPTX do chính 3T Slide lưu: tiêu đề và nội dung chỉ vẽ MỘT lần (đúng khung Tiêu đề/Nội dung của bố cục).
2. **D7** — Dấu đầu dòng (`<ul>/<ol>`) hiện rõ khi soạn trong khung nội dung, tiêu đề và chữ trong hình.
3. **D8** — Chữ gõ vào hình dựng sẵn (vd. Mũi tên phải) hiện trên hình; lưu PPTX không co hình theo chiều cao chữ; mở lại vẫn vẽ là mũi tên.

## 2. Current capability / nguyên nhân gốc (đã xác minh trước khi sửa)
- **D1**: tệp lưu đúng (`<p:ph type="title"/>`, `<p:ph/>`, mỗi trang 2 `p:sp`). soffice PPTX→FODP trả về trang với
  `draw:master-page-name="VNOTitleContent"` (tên bố cục VN được giữ qua PPTX từ commit ea8d9c2a, 20-10) nhưng khung
  placeholder có `draw:name="PlaceHolder 1"` và `presentation:user-transformed="true"`.
  `SlidesAdapter.parseFodp()` khi đó (a) đặt bố cục `title-content` và nạp `slide.title/body` từ khung lớp
  `title`/`outline`, đồng thời (b) `_extractShapeFrames()` chỉ coi là placeholder khi tên là `title/body…` và KHÔNG
  user-transformed → giữ luôn 2 khung này thành shape `textbox` → canvas vẽ hai lần. Thuần JS dùng chung →
  **Windows cũng bị** (cùng adapter, cùng bộ lọc LibreOffice).
- **D7**: `platform/shell/shell.css` reset `* { padding:0; margin:0 }` → `ul` trong `.vno-slide-body` có
  `padding-left:0`, dấu đầu dòng (list-style-position: outside) nằm ngoài hộp và bị `overflow-y:auto` cắt.
  Slides CSS không đặt lại thụt lề danh sách. Dùng chung mọi nền tảng.
- **D8**: (a) `renderPresetGeometry()` chèn `<svg position:absolute>` làm con đầu của hình; khối chữ
  `.vno-shape-text` không được định vị → theo thứ tự vẽ CSS, phần tử định vị (SVG) vẽ ĐÈ lên chữ → chữ bị che.
  (b) Khi lưu, hình không có kiểu chữ riêng dùng style tô màu chung `gr<màu>` không có
  `draw:auto-grow-height="false"` → LibreOffice co hình theo chữ (`spAutoFit`, cao 0,96 cm thay vì 3,2 cm).
  (c) Khi mở lại, `ooxml-rightArrow` được nhập là `type:"arrow"`; canvas chỉ tra hình dựng sẵn khi `type==="rect"`
  → vẽ thành chữ nhật xanh. Dùng chung mọi nền tảng.

## 3. Files/modules
| Tệp | Chủ sở hữu | Thay đổi |
|---|---|---|
| `adapters/libreoffice/slides/slides-adapter.js` | Integration (được phiếu cho phép) | D1: trên trang có bố cục VN có tên (≠ blank) bỏ khung placeholder đầu tiên của mỗi vai trò khỏi `shapes`; D8b: hình ghi ra `draw:custom-shape` (hình dựng sẵn/mũi tên/lật) có chữ dùng style riêng có `auto-grow=false` + căn giữa dọc |
| `apps/slides/slides-canvas.js` | Slides | D8c: tra hình dựng sẵn cho cả `type:"arrow"` (helper `_presetForShape`) |
| `apps/slides/slides.css` | Slides | D7: thụt lề danh sách; D8a: chữ trong hình nằm trên lớp SVG |
| `platform/help/entries-slides.js` | Platform (Help) | Bổ sung hướng dẫn VI đúng hành vi mới |
| `tests/unit/slides-fix-2510.test.js`, `tests/run-tests.js` | QA | Unit test tái hiện D1/D7/D8 |
| `tests/live/cdp/slides-fix-2510.desktop.mjs` | QA | CDP desktop macOS (Qt) tái hiện + ảnh |

Không thêm `if mac` vào `apps/**`; không sửa LibreOffice core; không đổi `platform/shapes/shape-presets.js` (dùng chung với Sheet).

## 4. Dependency
Không thêm phụ thuộc. Cần soffice pilot (`VNOFFICE_SOFFICE_PATH`) cho CDP lưu/mở lại.

## 5. Risk
- D1: trang bố cục VN còn khung lớp title/outline THỪA (vd. trang nhập từ PowerPoint đổi bố cục) — chỉ bỏ khung đầu tiên của mỗi vai trò (title ×1, outline ×1 hoặc ×2 với two-content, subtitle tính như outline), phần thừa vẫn là shape. Trang `blank`/master không phải VN không đổi hành vi (test G8 cũ phủ).
- D8b: đổi tên style (`gr3b82f6` → `gr3b82f6_fixed`) chỉ với hình ghi ra `draw:custom-shape` có chữ; `draw:rect`/`draw:ellipse` không bị LibreOffice co (đo soffice) nên giữ tên cũ (test `slides-text-vertical-direction` khóa tên này).
- D7: thụt lề danh sách đổi vị trí chữ khi có đầu dòng (đúng như PowerPoint).

## 6. Test plan
1. Unit (fail trước, pass sau): FODP tổng hợp mô phỏng đầu ra soffice của tệp do Slide lưu (title-content và two-content); hình mũi tên có chữ → style có `auto-grow-height="false"`; `_presetForShape` cho `arrow/ooxml-rightArrow`; CSS có quy tắc thụt lề danh sách và định vị chữ trên SVG.
2. CDP desktop macOS (PYWEBVIEW_GUI=qt, HOME tạm, VNO_PYTHON=venv-dev, heavy-lock, giới hạn thời gian): soạn 2 trang + đầu dòng + mũi tên có chữ → đo dấu đầu dòng trong khung, chữ trên hình (elementFromPoint), lưu PPTX → mở lại → đếm phần tử chữ trùng, hình mũi tên còn SVG. Chụp ảnh trước/sau.
3. Cổng: `npm test` (mốc 3826/3826 + test mới), i18n parity 0/0, `verify_checklist_evidence.py --all --no-fix` 0/0/0.

## 7. Rollback
Mỗi lỗi một commit riêng; `git revert <hash>` từng commit. Không đổi định dạng tệp ngoài việc giữ kích thước hình.
