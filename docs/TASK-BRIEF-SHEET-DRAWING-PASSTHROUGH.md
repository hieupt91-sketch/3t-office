# Brief S16 — Giữ nguyên drawing (ảnh + shape) của sheet mà app không sửa

## Số đo (batch LAN vòng 7, 19/9/2026, `docs/MA-TRAN-SHEET-2026-09-19.md`, lớp `image` = 75 ô / 7 file)

Đo bằng `scripts/layout-audit/_image_probe.py` (neo `<xdr:from>` từng anchor trong `xl/drawings/drawingN.xml`, gốc vs bản lưu):

| File | Sheet | Gốc | Bản lưu | Lớp |
|---|---|---|---|---|
| lan26 | 6 sheet | 12/24/14/8/21/11 anchor, trong đó 3–8 `xdr:sp` (text box/shape) mỗi sheet | chỉ còn `xdr:pic` (8/19/10/3/17/3) | **shape bị bỏ hẳn** — app không có model cho shape |
| lan12 | 10 sheet | 117 pic (twoCellAnchor) | 117 pic nhưng neo lệch: B14→?, A52/A120/A88 mất, xuất hiện J3, F4, G8 không có trong gốc | **neo ảnh trôi**: app ghi ảnh theo toạ độ cm tuyệt đối, LibreOffice tính lại from/to theo chiều cao dòng của nó |
| lan04, lan09, lan11, lan15 | | | | cùng hai lớp trên |

## Quy ước đề xuất (S16)

Sheet nào app **không đụng tới ảnh** (tập ảnh lúc lưu = tập ảnh lúc mở: cùng số lượng, cùng bytes hoặc cùng id
`vno:image-id`) thì file lưu phải mang **nguyên** `xl/drawings/drawingN.xml` + `xl/drawings/_rels/drawingN.xml.rels`
+ `xl/media/*` của file gốc cho sheet đó (thay phần LibreOffice sinh), như S8/S9/S13 "khôi phục từ gốc khi không sửa".
Sheet có ảnh bị thêm/xoá/di chuyển trong app → giữ drawing của LibreOffice (như hiện nay).

## Yêu cầu

1. Phía mở (Python overlay khi `File → Mở` XLSX, `ooxml_zip_patch.py` — tìm hàm overlay ảnh/`draw:frame` hiện có):
   ghi lên mỗi `<draw:frame>` ảnh của sheet một `vno:image-id="<sheet>:<n>"` (thứ tự anchor trong drawing gốc) hoặc
   hash bytes. Nếu đã có cơ chế id ảnh thì dùng lại, không thêm cơ chế thứ hai.
2. Phía lưu (`postprocess_sheet_xlsx`, thêm bước `_restore_untouched_drawings_step(xlsx_bytes, source_fods, source_xlsx_bytes, replacements)`):
   - Với từng sheet có trong cả hai file: đọc danh sách ảnh app gửi trong FODS (các `draw:frame` + `vno:image-id`)
     và danh sách anchor `xdr:pic` trong drawing gốc. Nếu **khớp trọn** (mọi id gốc còn, không có ảnh mới, số lượng
     bằng) → sheet "không sửa ảnh".
   - Sheet không sửa ảnh: chép drawing gốc (drawing xml + rels + media được rels trỏ tới, đổi tên media để không
     đụng `image1.png` của LibreOffice, ví dụ tiền tố `vnosrc_`), sửa `<drawing r:id>` của worksheet + rels worksheet
     + `[Content_Types].xml` (Default cho đuôi ảnh, Override cho drawing). Xoá drawing LibreOffice của sheet đó khỏi
     zip (hoặc để nguyên nhưng không được tham chiếu — phải kiểm tra Excel không phàn nàn).
   - Sheet có sửa ảnh: không đụng.
   - Một lượt quét, không `re.sub` từng phần tử trên toàn bộ file.
3. Không làm chậm: lan04 117 ảnh, lan12 ~550 ảnh; đo bằng `scripts/layout-audit/_time_sheet_save_stages.py`.

## Nghiệm thu (tôi đo lại; báo cáo không kèm số đo thật thì không nhận)

- `python -m unittest discover -s tests -p "test_sheet*.py"` PASS; thêm `tests/test_sheet_drawing_passthrough.py`:
  fixture XLSX nhỏ có drawing 2 pic + 1 sp; (a) FODS có đủ 2 id → drawing gốc được chép, Content_Types/rels hợp lệ,
  parse minidom OK; (b) FODS thiếu 1 ảnh → không chép.
- `node tests/run-tests.js` không hồi quy (1775/1775). `node scripts/check-syntax.js` PASS.
- `python scripts/layout-audit/_batch_audit.py . lan26.xlsx lan12.xlsx lan04.xlsx lan15.xlsx` trong worktree: lớp
  `image` 13/8/18/4 → 0; Excel mở OK; lint (`_xlsx_lint.py`) clean.
- Ghi S16 vào `docs/QUY-UOC-DOI-CHIEU.md` (không ghi tên file/sheet thật, chỉ số).
