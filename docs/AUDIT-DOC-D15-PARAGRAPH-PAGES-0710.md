# Audit d15: trang bắt đầu của đoạn (07/10/2026)

## Phạm vi và phương pháp

- Nhánh: `fix/writer-d15-paragraph-pages-codex`; worktree: `E:\VNOffice-codex-wf3`.
- Tệp nguồn chỉ được đọc tại chỗ; báo cáo không chứa nội dung thật của tài liệu.
- Oracle Word: Microsoft Word COM thật qua `word_paragraph_pages.ps1` và phép đo điểm ký tự bằng `Range.Information`.
- App: desktop thật do `main.py` tự khởi động, profile `LOCALAPPDATA` riêng, đo qua CDP; không dùng `scripts/serve.js`, `pywebview.evaluate_js` hoặc OS input.
- Baseline HEAD `75c8e04f`: Word/app đều 10 trang; 30/173 đoạn cấp cao nhất khác trang bắt đầu.

## Đoạn đầu tiên lệch

Không ghi nội dung đoạn; định danh bằng chỉ số và phạm vi Word đủ để tái lập.

| Số đo | Word COM | App desktop |
|---|---:|---:|
| Chỉ số đoạn so sánh | Word 34 | app 1 |
| Trang bắt đầu do harness báo | 1 | 2 |
| Cỡ chữ | 13 pt | 17,333 px (13 pt) |
| Giãn dòng | 18 pt | 29,900 px |
| Khoảng trước/sau | 0/0 pt | 0/0 px |
| Keep / widow / pageBreakBefore | false / true / false | không keep / `break-before: page` |
| Ảnh / bảng trong đoạn | 0 / 0 | 0 / 0 |

OOXML của đúng đoạn có `w:br w:type="page"` ở run đầu, sau đó mới tới run chữ; không có `w:pageBreakBefore`. Word COM xác nhận:

| Điểm trong `Range` đoạn 34 | Mã ký tự | Trang | Y từ đỉnh trang |
|---|---:|---:|---:|
| offset 0 | 12 (manual page break) | 1 | 785,25 pt |
| offset 1 | ký tự chữ đầu | 2 | 57,00 pt |
| offset 140 | ký tự chữ cuối | 2 | 79,50 pt |

Kết luận có số đo: chênh đầu tiên không do dòng, khoảng đoạn, bảng hay ảnh. Word định nghĩa `Range.Start` ở trước ký tự ngắt nên báo trang 1; LibreOffice HTML biểu diễn ngắt ở đầu đoạn bằng `break-before: page`, do đó DOM đặt cả hộp đoạn ở trang 2. Nội dung nhìn thấy trong cả hai đều bắt đầu ở trang 2. Không được xóa ngắt hoặc kéo chữ về trang 1 chỉ để làm xanh phép đo.

## Ranh giới tự động đầu tiên và footer

Sau ca ngắt thủ công trên, lệch đầu tiên ở phân trang tự động là cặp Word 63 / app 30.

| Đoạn quanh ranh giới | Word (trang, Y, line) | App (trang, top, cao, line) |
|---:|---|---|
| 27 | 2; 606,75 pt; 14,4 pt | 2; 749,25 px; 23,91 px; 23,92 px |
| 28 | 2; 624,75 pt; 21 pt | 2; 773,16 px; 55,94 px; 27,97 px |
| 29 | 2; 672,75 pt; 14,4 pt | 2; 837,02 px; 23,91 px; 24,69 px |
| 30 | **2; 696,75 pt; 14,4 pt** | **3; 16 px; 71,72 px; 23,92 px** |
| 31 | 3; 57 pt; 14,4 pt | 3; 95,64 px; 23,91 px; 23,92 px |

Page setup Word là 841,70 pt, lề trên/dưới 56,70 pt, footer distance 2,85 pt. Footer Word có 6 đoạn, mỗi đoạn `LineSpacing=12 pt`, tổng pitch 72 pt = 96 px. App đo 6 đoạn, mỗi đoạn cao 21,16 px, footer cao 128 px; `--vno-lh:1` đang bị nhân tiếp với font-ratio. Vì footer vượt lề dưới, app trừ thêm 55,78 px và chỉ còn vùng thân 915,22 px. Chênh footer khoảng 32 px giải thích việc đoạn 30 không còn vừa cuối trang app dù vừa trong Word.

Các cụm lệch baseline theo chỉ số app: 1; 30; 46–48; 63–66; 82–84; 99–102; 119–128; 149–152. Mẫu lặp ở đáy trang phù hợp trực tiếp với vùng thân bị rút ngắn; không có bằng chứng quy lỗi cho bảng/ảnh ở đoạn đầu các cụm này.

## Plan gate trước khi sửa

- **Objective:** giữ ngắt thủ công đúng hình ảnh, đồng thời phục hồi single line-height của header/footer để vùng thân d15 khớp Word.
- **Current capability:** importer đã giữ font/đoạn rỗng vùng header/footer, nhưng `_encodeProportionalLineHeights` đổi `line-height:100%` thành hệ số rồi nhân font-ratio.
- **Files/modules dự kiến:** Writer adapter; unit test header/footer; probe CDP không chứa nội dung; báo cáo/handoff.
- **Dependency:** chỉ API/DOM sẵn có và LibreOffice adapter hiện hữu; không thêm dependency, không sửa Core/export/file semantics.
- **Risk:** line-height header/footer của tài liệu khác có thể đổi ranh giới trang.
- **Test plan:** unit mục tiêu; đo d15 Word/app; corpus 43 tệp trước/sau, yêu cầu 43/43 tổng trang và mismatch không tăng ở bất kỳ tệp nào; full Node và Python suite.
- **Rollback:** revert commit sửa riêng; commit chẩn đoán vẫn độc lập.

Thay đổi được phép thử là hẹp: trong header/footer, giữ `line-height:100%` là CSS single thay vì biến nó thành `--vno-lh:1 × font-ratio`. Không sửa mô hình ngắt trang nội bộ ở đoạn 34 vì đó là khác biệt định nghĩa phép đo và thay đổi mô hình sẽ vượt phạm vi sửa nhỏ.
