"""Generate the Slides ribbon button comparison matrix from the scan JSON.

Usage: python -X utf8 scripts/audit-0610/gen_slides_button_matrix.py \
    docs/ribbon-scan-slides-1011.json docs/SLIDES-BUTTON-MATRIX-1011.md
"""
import json
import sys
from collections import Counter
from pathlib import Path


MATCH = "KHỚP POWERPOINT"
INTENTIONAL = "KHÁC CÓ CHỦ Ý"
KNOWN_GAP = "LỆCH ĐÃ BIẾT"
UNCHECKED = "CHƯA ĐỐI CHIẾU"

# Each entry is scoped to what the cited COM and app evidence actually measured.
# A result for one value/fixture is not generalized to the entire feature.
EVIDENCE = {
    "slides.font.family": (MATCH, "FIX-L4: chỉnh sửa văn bản trong deck thật; tập font hiển thị trước/sau qua PowerPoint COM đều là Calibri, Calibri Light. Alias Arial1 được unit test, không có trong deck nguồn. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo)"),
    "slides.font.size": (MATCH, "FIX-L4: chuỗi đổi cỡ chữ trong app; PowerPoint COM đọc cỡ cuối 18 pt. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo)"),
    "slides.font.grow": (MATCH, "FIX-L4: app chạy thang 18→20→24→28→32→36 pt; COM đọc cỡ cuối 18 pt sau cả chuỗi tăng/giảm. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo)"),
    "slides.font.shrink": (MATCH, "FIX-L4: app chạy thang giảm theo điểm chuẩn PowerPoint; COM đọc cỡ cuối 18 pt sau cả chuỗi tăng/giảm. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo)"),
    "slides.text.bold": (MATCH, "FIX-L4: thao tác trong app; PowerPoint COM đọc Bold=true trên textbox audit. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo)"),
    "slides.para.alignCenter": (MATCH, "FIX-L4: thao tác trong app; PowerPoint COM đọc Alignment=2 (center). [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo)"),
    "slides.shape.insert": (MATCH, "FIX-L6: chèn shape trong app, lưu/mở bằng PowerPoint; COM đọc shape cùng fill/line RGB, kích thước và rotation được đo. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.text.insert": (MATCH, "FIX-L6: chèn textbox trong app, lưu/mở bằng PowerPoint COM; đọc được đối tượng msoTextBox. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.image.insert": (MATCH, "FIX-L6: chèn ảnh trong app, lưu/mở bằng PowerPoint COM; đọc được đối tượng ảnh. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.insert.table": (MATCH, "FIX-L6: chèn bảng trong app, lưu/mở bằng PowerPoint COM; đọc được bảng 3×3. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.insert.chart": (MATCH, "FIX-L6: chèn chart trong app, lưu/mở bằng PowerPoint COM; đọc được đối tượng chart (ChartType 51). [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.diagram.insert": (KNOWN_GAP, "FIX-L6: sơ đồ tạo trong app mở thành bảy shape riêng trong PowerPoint, không phải đối tượng SmartArt native. Chưa so sánh các thao tác/chủng loại sơ đồ khác. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.design.themeGallery": (KNOWN_GAP, "FIX-L4 ghi nhận theme chọn trong app không giữ giá trị qua mở lại (`minimal-dark` thành `modern-blue`); FIX-L6 COM thấy Design.Name=Office. Native theme chưa được xác nhận. Không sửa semantics nếu chưa được duyệt. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#ma-trận-fix-l4-mở-rộng), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.layout.apply": (KNOWN_GAP, "FIX-L6: Hai nội dung được lưu nhưng PowerPoint COM đọc Layout=1; fixture Two-Column Text đọc Layout=3. Thay native layout semantics cần quyết định chủ sở hữu trước. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.transition.apply": (KNOWN_GAP, "FIX-L4 xác nhận Push Right/0.8 s; FIX-L6 đo Zoom thành EntryEffect=3073 (BoxOut), nên nhãn Zoom đang lệch/chưa xác định mapping. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md#kết-quả-đã-đo), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.animation.apply": (MATCH, "FIX-L6 sau sửa adapter: PowerPoint COM đọc lại Fade, Fade, Fly đúng thứ tự; EffectType 10,10,2, TriggerType=click, duration 0.8/0.8/0.5 s. Chưa suy rộng tới mọi preset. [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.slide.toggleHidden": (MATCH, "FIX-L5/L6: ẩn slide qua lệnh app; PowerPoint COM đọc Hidden=-1 và PPTX có show=0. [FIX-L5 handoff](AGENT-HANDOFF-FIX-L5-CODEX.md), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
    "slides.notes.toggle": (MATCH, "FIX-L4/L6: ghi chú diễn giả nhập qua app; PowerPoint COM đọc lại đúng nội dung. [FIX-L4 audit](AUDIT-SLIDES-OFFICE-PARITY-1011.md), [FIX-L6 results](tickets-0710/FIX-L6-RESULTS.md#kiểm-tra)"),
}


def main():
    source, output = map(Path, sys.argv[1:3])
    rows = json.loads(source.read_text(encoding="utf-8"))
    result = []
    for row in rows:
        feature_id = row["id"]
        state, note = EVIDENCE.get(feature_id, (UNCHECKED, ""))
        if row["tab"].startswith("Trợ lý 3T AI"):
            state = INTENTIONAL
            note = "Lệnh AI là năng lực riêng của VN Office, không có lệnh tương ứng trực tiếp trong ribbon PowerPoint cơ bản; không chạy lệnh AI trong lượt audit tài liệu này."
        elif row.get("reaction", "").startswith("disabled"):
            note = (note + " " if note else "") + "Scan 1011 ghi nút disabled trong trạng thái ban đầu; chưa có phép đo hành vi PowerPoint."
        elif row.get("reaction", "").startswith("skipped(dangerous)"):
            note = (note + " " if note else "") + "Scan 1011 bỏ qua thao tác có thể phá huỷ/chuyển trạng thái; cần kịch bản fixture an toàn trước khi kiểm."
        result.append((row["tab"], feature_id, row["label"], state, note))

    counts = Counter(row[3] for row in result)
    lines = [
        "# Slides: ma trận đối chiếu từng nút ribbon với PowerPoint (11/10/2026)",
        "",
        "Nguồn danh sách nút: [`ribbon-scan-slides-1011.json`](ribbon-scan-slides-1011.json). Ma trận giữ đủ từng dòng scan (kể cả ID xuất hiện ở nhiều tab); trạng thái chỉ áp dụng tới thuộc tính/kịch bản ghi trong bằng chứng.",
        "",
        f"Tổng: {len(result)} dòng. " + ", ".join(f"**{key}**: {value}" for key, value in counts.items()) + ".",
        "",
        f"- **{MATCH}**: thao tác VN Slides được thực hiện; PowerPoint COM đọc lại cùng thuộc tính và kết quả khớp.",
        f"- **{INTENTIONAL}**: khác biệt sản phẩm có chủ ý hoặc không có nút đối ứng; nêu rõ lý do.",
        f"- **{KNOWN_GAP}**: có lệch/giới hạn đã đo; không ngụ ý đã sửa.",
        f"- **{UNCHECKED}**: chưa có phép đo app + PowerPoint đủ để kết luận.",
        "",
        "Các kết quả kế thừa được giới hạn theo báo cáo FIX-L4/L5/L6; lỗi harness, kết quả unit test hoặc giá trị mặc định COM không được tính là xác minh parity.",
        "",
        "| Tab | Lệnh | Nút | Trạng thái | Bằng chứng / ghi chú |",
        "|---|---|---|---|---|",
    ]
    for tab, feature_id, label, state, note in result:
        label = label.replace("|", "\\|")
        note = note.replace("|", "\\|")
        lines.append(f"| {tab} | `{feature_id}` | {label} | {state} | {note} |")
    output.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    print(f"Wrote {output}: {len(result)} rows; " + ", ".join(f"{key}={value}" for key, value in counts.items()))


if __name__ == "__main__":
    main()
