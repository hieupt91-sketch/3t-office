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
mark(LECH, "writer.review.wordCount", "chữ khớp, 'ký tự có khoảng trắng' lệch 0.5–7% (tài liệu mẫu); đoạn/dòng gần khớp")
mark(KHOP, "common.edit.paste common.edit.cut common.edit.copy common.edit.formatPainter writer.edit.pasteSpecial writer.font.grow writer.font.shrink writer.text.clearFormat writer.para.indentDec writer.para.sort writer.para.showFormattingMarks writer.para.shading writer.para.borders", "FIX-T11 nhóm 1: 13 lệnh, thao tác CDP và Word COM khớp; Dán đặc biệt đã so cả định dạng nguồn và văn bản thuần")
mark(KHOP, "writer.page.blank writer.table.fromText common.edit.hyperlink writer.insert.bookmark writer.format.dropCap writer.insert.dateTime writer.insert.equation", "FIX-T11 nhóm 2: 7 lệnh, thao tác CDP và Word COM khớp về đầu ra DOCX")
mark(LECH, "writer.chart.insert writer.diagram.insert", "FIX-T11 nhóm 2: DOCX mở trong Word có 0 Chart/SmartArt native; hiện là minh họa tĩnh, lệch chức năng có thể chỉnh sửa")

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
