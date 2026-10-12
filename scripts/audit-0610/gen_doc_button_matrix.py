"""Sinh docs/DOC-BUTTON-MATRIX-1011.md: moi nut ribbon cua Doc da duoc doi chieu voi Word that chua.
Nguon su that: ribbon-scan (cong cu claude-ribbon-scan) + docs/AUDIT-DOC-WORD-PARALLEL-1011.md (Word COM).
Chay: python -X utf8 scripts/audit-0610/gen_doc_button_matrix.py <ribbon-scan-writer.json> <out.md>
"""
import json
import sys

KHOP = "KHỚP WORD (đã so Word COM)"
KHAC = "KHÁC CÓ CHỦ Ý"
CHUA = "CHƯA ĐỐI CHIẾU"
LECH = "LỆCH ĐÃ BIẾT"
NOTE_AUDIT = "AUDIT-DOC-WORD-PARALLEL-1011"

STATUS = {}
NOTE = {}


def mark(status, ids, note=""):
    for i in ids.split():
        STATUS[i] = status
        NOTE[i] = note


mark(KHOP, "writer.text.bold writer.text.italic writer.text.underline writer.text.strike writer.text.subscript writer.text.superscript writer.font.size writer.font.family writer.color.text writer.color.highlight writer.para.alignLeft writer.para.alignCenter writer.para.alignRight writer.para.justify writer.list.bullet writer.list.numbered writer.para.indentInc writer.text.changeCase writer.para.spacingBefore writer.para.spacingAfter", "20/20 phép thử định dạng")
mark(KHOP, "writer.table.insert", "bảng: chèn/thêm-xóa hàng cột/gộp-tách/căn/nền/viền/AutoFit/kích thước")
mark(KHOP, "writer.page.margins writer.page.orientation writer.page.size", "lề Normal/Narrow/Moderate/Wide, A4/A5/Letter, hướng")
mark(KHOP, "writer.page.columns writer.page.columns1 writer.page.columns2 writer.page.columns3", "3/3")
mark(KHOP, "writer.page.break", "ngắt trang/mục NextPage-Continuous-Even-Odd")
mark(KHOP, "writer.header.insert writer.footer.insert", "đầu/chân trang, trang đầu khác, chẵn/lẻ, số trang")
mark(KHOP, "writer.reference.tocInsert writer.reference.tocUpdate", "mục lục + Heading")
mark(KHOP, "writer.reference.footnoteInsert writer.reference.endnoteInsert", "chú thích trang/cuối")
mark(KHOP, "writer.insert.crossReference writer.reference.captionInsert writer.reference.tofInsert writer.reference.tofUpdate", "tham chiếu chéo, chú thích hình, danh mục hình")
mark(KHOP, "writer.comment.insert writer.review.commentDelete writer.review.commentResolve writer.review.commentNext writer.review.commentPrevious", "ghi chú: tạo/điều hướng/giải quyết/xóa; trả lời bình luận (T10)")
mark(KHOP, "writer.trackChanges.toggle writer.trackChanges.acceptOne writer.trackChanges.acceptAll writer.trackChanges.rejectOne writer.trackChanges.rejectAll writer.trackChanges.previous writer.trackChanges.next", "chèn+xóa, điều hướng, chấp nhận/từ chối")
mark(KHOP, "common.edit.find common.edit.replace", "phân biệt hoa/thường, toàn từ, Tìm trước, thay một")
mark(KHOP, "writer.insert.symbol", "©, ₫, ∑, →")
mark(KHOP, "writer.insert.textbox", "kích thước/lề/AutoSize sau lưu")
mark(KHOP, "writer.shape.insert", "hình chữ nhật: loại, kích thước, vị trí, màu/viền")
mark(KHOP, "writer.image.insert", "PNG: kích thước, wrap, vị trí")
mark(KHAC, "writer.style.gallery", "Normal/Title/Quote đã áp dụng; preset VN cố ý khác định dạng Word; Heading 1–3 khớp")
mark(KHOP, "common.edit.paste common.edit.cut common.edit.copy common.edit.formatPainter writer.edit.pasteSpecial writer.font.grow writer.font.shrink writer.text.clearFormat writer.para.indentDec writer.para.sort writer.para.showFormattingMarks writer.para.shading writer.para.borders", "FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần")
mark(KHOP, "writer.page.blank writer.table.fromText common.edit.hyperlink writer.insert.bookmark writer.format.dropCap writer.insert.dateTime writer.insert.equation", "FIX-T11 nhóm 2: 7 lệnh, thao tác CDP và Word COM khớp về đầu ra DOCX")
mark(KHOP, "writer.chart.insert writer.diagram.insert", "FIX-T12: Word COM đọc được một biểu đồ native chỉnh sửa được kèm workbook nhúng; sơ đồ là nhóm DrawingML chỉnh sửa được gồm 4 hình")
mark(KHOP, "writer.design.themeGallery writer.page.watermark writer.layout.lineNumbers", "FIX-T12: DOCX có bảng màu Modern/phông Be Vietnam Pro; Word COM đọc watermark PowerPlusWaterMarkObject1 trong header; line numbering Active=-1, CountBy=1, RestartMode=0")
mark(LECH, "writer.review.wordCount", "FIX-T13: ký tự đạt ngưỡng ≤0,2% trên 6/7 (d01 0,043%; d02/d06/d07/d13/d20 khớp); số từ còn lệch d01 -16, d02 +2, d07 +2, d13 -3, d20 -1; d24 Word COM -2, tài liệu mới 0/0, desktop crash khi mở d24")
mark(KHAC, "common.macro.recordToggle common.macro.manager", "FIX-T13: VN Office ghi/phát lại command ID qua Command Bus và lưu macro cục bộ; không đọc/chạy VBA Project như Word, đây là mô hình macro riêng có chủ ý")
mark(CHUA, "writer.insert.wordart", "FIX-T14 desktop save: DOCX có một DrawingML wps:wsp, a:prstTxWarp=textFadeRight và chữ nằm trong shape; không còn text phẳng/bookmark thừa. Đối chiếu Word COM Shape.TextEffect chưa chạy được do phiên Word ẩn có trước đang chiếm COM.")
mark(CHUA, "common.file.print", "Chưa chạy in đối chứng: chưa chọn đích in (máy in hoặc PDF); thao tác in có thể tạo đầu ra ngoài workspace")
mark(CHUA, "writer.file.printPreview", "FIX-T14 CDP: hộp thoại In dựng 1 trang A4 210×297 mm, ảnh xem trước 794×1123 px; chưa so trang/PDF với Word COM")
mark(CHUA, "writer.view.pageWidth", "FIX-T14 CDP: trang A4 rộng 1286 px trong vùng xem 1329 px ở zoom 162%; nút giữ chế độ vừa chiều rộng để tự căn lại khi đổi kích thước cửa sổ; chưa so Zoom.PageFit của Word COM")
mark(CHUA, "writer.view.zoomReset", "FIX-T14 CDP: sau khi tăng zoom và vừa chiều rộng, nút Đặt lại đưa zoom về 100%; chưa so Percentage của Word COM")
mark(KHAC, "writer.view.newWindow", "FIX-T14 CDP: tạo WebView desktop thứ hai với tài liệu Writer trắng; nội dung cửa sổ gốc không đồng bộ. Đây là thiết kế có chủ ý để mở tài liệu độc lập; Help ghi rõ khác với việc nhân bản cùng tài liệu của Word.")
mark(KHAC, "writer.help.open", "F1 mở Help catalog cục bộ trong app, dùng được offline; khác luồng trợ giúp bên ngoài của Word có chủ ý")
mark(KHAC, "common.help.about", "About hiển thị phiên bản, bản quyền và giấy phép của 3T Office; nội dung nhận diện sản phẩm khác Word có chủ ý")
mark(KHOP, "writer.page.color writer.page.border writer.para.firstLineIndent", "FIX-T11 nhóm 3: Word COM xác nhận màu trang #dbeafe, viền 3 pt nét đứt #dc2626 và thụt đầu dòng 14.15 pt khớp")
mark(KHOP, "writer.reference.citationInsert writer.reference.sourcesManage writer.reference.citationStyle writer.reference.bibliographyInsert", "FIX-T11 nhóm 4: CDP tạo nguồn, chọn MLA, chèn trích dẫn và Works Cited; Word COM xác nhận citation, tiêu đề, nhà xuất bản và năm")
mark(KHOP, "writer.mailMerge.open writer.mailMerge.insertField writer.mailMerge.ifRule writer.mailMerge.preview writer.mailMerge.prevRecord writer.mailMerge.nextRecord writer.mailMerge.finish writer.mailings.envelopes writer.mailings.labels", "FIX-T11 nhóm 5: 2 bản ghi, điều kiện yes/no, preview/điều hướng và tài liệu hợp nhất; Word COM xác nhận cả hai kết quả, phong bì và nhãn")
mark(KHOP, "writer.review.toggleSpellCheck writer.view.readMode writer.view.webLayout writer.view.printLayout writer.view.navigationPane writer.view.ruler writer.view.gridlines writer.view.zoomIn writer.view.zoomOut writer.view.zoom100", "FIX-T11 nhóm 6: CDP và Word COM xác nhận spell/view/ruler/grid/zoom; DOCX round-trip d01,d02,d06,d07,d13,d20,d24 = 7/7 PASS")

NOTE_DEFAULT = {
    "common.edit.paste": "Dán thường: đã kiểm hành vi (U-series) nhưng chưa so Word COM",
    "common.edit.formatPainter": "Đã sửa lỗi hành vi (U20); chưa so Word COM",
    "writer.font.grow": "Chưa so (Word nhảy theo danh sách cỡ chuẩn)",
    "writer.font.shrink": "Chưa so",
    "writer.text.clearFormat": "Chưa so Word COM",
}

LABEL_AI = ("ai.",)

r = json.load(open(sys.argv[1], encoding="utf8"))
rows, seen = [], set()
for x in r:
    k = x["id"]
    if k in seen or x["tab"].startswith("Trợ lý") or k.startswith("ai."):
        continue
    seen.add(k)
    st = STATUS.get(k, CHUA)
    note = NOTE.get(k) or NOTE_DEFAULT.get(k, "")
    rows.append((x["tab"], k, x["label"], st, note, x["reaction"]))

from collections import Counter
cnt = Counter(r[3] for r in rows)
lines = [
    "# Doc: bảng đối chiếu từng nút ribbon với Word (11/10/2026)",
    "",
    "Nguồn: `claude-ribbon-scan` (nút nào có phản ứng) + `docs/AUDIT-DOC-WORD-PARALLEL-1011.md` (đối chiếu Word COM). Trạng thái:",
    f"- **{KHOP}**: đã chạy thao tác tương đương trong app và trong Word, so thuộc tính và khớp.",
    f"- **{KHAC}**: khác Word có chủ ý (ghi ở cột ghi chú).",
    f"- **{LECH}**: còn lệch đã đo.",
    f"- **{CHUA}**: nút có phản ứng (không phải nút câm) nhưng **chưa** so với Word thật — cần làm tiếp.",
    "",
    "Tổng kết: " + ", ".join(f"{k}: {v}" for k, v in cnt.most_common()) + f" (tổng {len(rows)} nút, không kể Trợ lý AI).",
    "",
    "| Tab | Lệnh | Nút | Trạng thái | Ghi chú |",
    "|---|---|---|---|---|",
]
for tab, k, lab, st, note, rx in rows:
    lines.append(f"| {tab} | `{k}` | {lab} | {st} | {note} |")
open(sys.argv[2], "w", encoding="utf8", newline="\n").write("\n".join(lines) + "\n")
print(dict(cnt), len(rows))
