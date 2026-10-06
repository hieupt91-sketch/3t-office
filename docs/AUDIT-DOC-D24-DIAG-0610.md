# D25b — Chẩn đoán D24: live pagination 17 trang, Word 16 trang

## Agent handoff

- TASK: D25b — chỉ chẩn đoán, không sửa mã sản phẩm
- AGENT/ROLE: Codex / diagnostic audit
- BRANCH: `audit/doc-d24-page-diag-codex`
- WORKTREE: `E:\VNOffice-codex-d25b`
OBJECTIVE: tìm trang đầu tiên live pagination lệch Word và nguyên nhân có số đo.

## Kết luận

- **Trang lệch đầu tiên là trang 8.** Trang 1–7 ghép đúng. Word đặt `Picture 7938` (anchor range 20) ở trang 8; app để trang 8 chỉ có đoạn rỗng cao **20,58 px** và đẩy khối ảnh tương ứng cao **613,03 px** sang trang 9. Từ đó mọi trang nội dung còn lại của app lệch `+1`, kết thúc ở trang 17 thay vì 16.
- Nguyên nhân trực tiếp tạo trang dư là đoạn `<p><br></p>` tổng hợp được nối sau marker section khi import tại `writer-adapter.js:2922`. `_recomputeLivePagination()` đổi sang section 3 (usable **613 px**), đặt đoạn rỗng 20,58 px làm `pageStartTop`, rồi thấy `20,58 + 613,03 = 633,61 px > 613 px` nên chèn soft gap trước ảnh. Đối chứng CDP chỉ bỏ đoạn tổng hợp này làm kết quả đổi **17/16 gap → 16/15 gap**.
- Có thêm một lỗi metadata cần sửa đúng trong ticket sau: marker `section-3` nằm trước trang app 8, nhưng Word COM xác nhận section 3 thật chỉ bắt đầu ở trang 16. Dù bỏ spacer đã sửa được số đếm, không được coi marker trang 8 là đúng semantics.

## Phương pháp và tính toàn vẹn nguồn

- Nguồn chỉ đọc: `E:\VN OFice\file test\landocx\d24.docx` (23.771.853 byte).
- Word thật: chạy `word_pages.ps1` đồng thời `word_dialog_dismisser.ps1`; Print Layout (`View.Type = 3`), `Repaginate()`, tổng trang bằng `Content.Information(4)`, trang đối tượng bằng `Range.Information(3)`, sau đo đặt `Saved = $true` và `Quit(0)`. Không dùng SendKeys, không kill theo tên tiến trình.
- App thật: `main.py` qua `launchApp('writer', { filePath })`, WebView2 remote debugging và CDP. Mỗi lượt dùng `LOCALAPPDATA` tạm riêng do harness tạo. Không dùng `pywebview.evaluate_js`, không lưu tài liệu.
- Dữ liệu thô ở ngoài Git: `E:\VNOffice-profiles\d25b\d24-word-layout.json` và `E:\VNOffice-profiles\d25b\d24-app-layout-proof.json`.

## Số đo Word

| Chỉ số | Word |
|---|---:|
| Tổng trang (`Content.Information(4)`) | 16 |
| Paragraphs theo Word COM | 18 |
| Tables | 0 |
| Floating shapes | 14 |
| Inline shapes | 2 |
| Keep-with-next / keep-together / page-break-before trên 18 paragraph | 0 / 0 / 0 |

| Section Word | Range | Trang | Lề trên / dưới | Vùng dùng được quy đổi |
|---:|---:|---:|---:|---:|
| 1 | 0–6 | 1–2 | 72 / 72 pt | 613 px |
| 2 | 6–41 | 3–15 | 16,2 / 16,3 pt | 761 px |
| 3 | 41–43 | 16 | 72 / 72 pt | 613 px |

Không có bảng, nên loại trừ chiều cao dòng bảng/cant-split. Toàn bộ paragraph có `keepWithNext=false`, `keepTogether=false`, `pageBreakBefore=false`; widow/orphan không tạo khác biệt này. Nội dung chủ yếu là hình toàn trang neo vào các paragraph ngắn/rỗng.

## Ghép trang Word ↔ app

| Trang Word | Đối tượng bắt đầu trang Word | App | Kết quả |
|---:|---|---:|---|
| 1 | `Group 7068`, anchor 0 | 1 | khớp |
| 2 | `Group 7075`, anchor 3 | 2 | khớp |
| 3 | inline shape, range 6 | 3 | khớp |
| 4 | `Group 7126`, anchor 8 | 4 | khớp |
| 5 | `Group 7297`, anchor 11 | 5 | khớp |
| 6 | `Group 7125`, anchor 14 | 6 | khớp |
| 7 | `Group 7061`, anchor 17 | 7 | khớp |
| **8** | **`Picture 7938`, anchor 20** | **9** | **lệch đầu tiên; app trang 8 chỉ có spacer 20,58 px** |
| 9 | `Group 7120`, anchor 23 | 10 | lệch +1 |
| 10 | `Picture 7948`, anchor 26 | 11 | lệch +1 |
| 11 | `Picture 7953`, anchor 29 | 12 | lệch +1 |
| 12 | `Group 7735`, anchor 32 | 13 | lệch +1 |
| 13 | `Group 7338`, anchor 34 | 14 | lệch +1 |
| 14 | `Group 7419`, anchor 36 | 15 | lệch +1 |
| 15 | inline shape, range 38 | 16 | lệch +1 |
| 16 | `Group 7319`, anchor 41 | 17 | lệch +1 |

## Chuỗi gây lỗi trong app

```text
marker section-3 (app đặt trước trang 8; Word: section 3 bắt đầu trang 16)
  ↓ _recomputeLivePagination đổi usable height: section-2 761 px → section-3 613 px
<p><br></p> tổng hợp: 20,58 px
  ↓ pageStartTop được đặt tại spacer
khối ảnh Picture 7938: 613,03 px
  ↓ extent 633,61 px > 613 px
soft gap được chèn trước ảnh
  ↓
app trang 8 rỗng; ảnh sang trang 9; tổng 17 trang
```

Các điểm mã liên quan:

- `adapters/libreoffice/writer/writer-adapter.js:2922`: importer tạo `markerHtml` rồi nối thêm `<p><br></p>`.
- `adapters/libreoffice/writer/writer-adapter.js:15679`: paginator đổi `pageSetup` ngay khi gặp marker section.
- `adapters/libreoffice/writer/writer-adapter.js:15689`: phần tử đầu sau marker thiết lập `pageStartTop`; hiện phần tử đó là spacer thay vì khối ảnh.

Marker section 3 bị đặt sớm vì hai paragraph chứa `sectPr` thật không có text; đường fallback phải tìm một paragraph `page-break-before` trong HTML. Với tài liệu nhiều ngắt trang và floating frame, fallback ghép marker thứ hai vào ngắt trước trang 8 thay vì biên section thật trước trang 16.

## Đối chứng nhân quả qua CDP

| Lượt | Thao tác chỉ trong session tạm | Trang | Gap |
|---|---|---:|---:|
| Baseline | Không thay đổi DOM | 17 | 16 |
| Counterfactual A | Chỉ bỏ `<p><br></p>` ngay sau marker section 3; chạy lại chính `_recomputeLivePagination()` | **16** | **15** |
| Counterfactual B | Không có spacer; chuyển marker section 3 tới trước khối cuối như Word và bỏ ngắt trang bị marker thay thế | **16** | **15** |

Counterfactual không lưu file và không phải sửa mã sản phẩm. Kết quả A chứng minh spacer là điều kiện đủ tạo trang dư; kết quả B chứng minh số đếm vẫn 16 khi biên section được đặt đúng.

## Đề xuất cho ticket sửa sau (một dòng)

Đổi dòng 2922 thành `const markerHtml = this._buildSectionBreakMarker(boundarySection.type || "nextPage", nextSec.id);` (không sinh paragraph rỗng sau marker import), đồng thời regression phải assert marker section 3 ở trang 16 chứ không chỉ assert tổng 16 trang.

## Trạng thái kiểm chứng

- FILES CHANGED: `docs/AUDIT-DOC-D24-DIAG-0610.md`; `scripts/audit-0610/word_d24_layout.ps1`; `scripts/audit-0610/d24_live_pagination_probe.mjs`. Không sửa mã sản phẩm.
- COMMANDS RUN: Word COM `word_pages.ps1` + `word_dialog_dismisser.ps1`; `word_d24_layout.ps1`; app desktop/CDP `d24_live_pagination_probe.mjs`; syntax check PowerShell/Node; `git diff --check`.
- BUILD RESULT: NOT RUN — task chẩn đoán, không thay đổi sản phẩm/build.
- TEST RESULTS: PASS — Word oracle 16; app baseline tái lập 17; ghép trang tìm được lệch đầu tiên trang 8; counterfactual 16.
- KNOWN FAILURES: mã sản phẩm vẫn cho D24 17 trang; marker section 3 vẫn sai vị trí.
- RISKS: bỏ spacer có thể ảnh hưởng tài liệu section khác; ticket sửa phải chạy unit section import và corpus live-page đầy đủ, đồng thời kiểm tra thao tác bàn phím tại đầu section.
- ROLLBACK: xóa hai script probe và báo cáo này; không có thay đổi runtime để rollback.
- CORE PATCH ID: N/A.
- HELP/I18N: N/A — không thêm tính năng người dùng.
