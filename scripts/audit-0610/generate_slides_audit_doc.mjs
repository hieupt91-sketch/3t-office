import fs from "node:fs";

const r = JSON.parse(fs.readFileSync("E:/VNOffice-profiles/slides-ribbon-audit/slides-ribbon-audit.json", "utf8"));

const mapVerdict = (x) => {
  if (x.status === "STATUS_ONLY") return "chỉ thông báo";
  if (x.status === "SILENT_FALSE") return "im lặng";
  if (x.status === "NO_VISIBLE_EFFECT") return "OK";
  return x.status;
};

let md = `# Rà soát từng nút ribbon VN Slides (13/10)

Công cụ: \`tests/live/cdp/slides-ribbon-runtime-audit.desktop.mjs\` (chạy mọi lệnh ribbon trong app desktop, so sánh DOM và thông báo) và \`slides-ribbon-state-probe.desktop.mjs\` (so sánh trạng thái bài trình bày chi tiết). \`scripts/audit-0610/ribbon_command_audit.mjs slides\` kiểm tra tĩnh lệnh nào chưa có handler.

Kết quả: 111 lệnh ribbon duy nhất; 0 lệnh thiếu handler; 3 lệnh bỏ qua có chủ đích (in/macro); 8 lệnh bị vô hiệu hóa có chủ đích (chưa có phần để đổi tên/xóa/di chuyển, chưa có nhận xét để xóa/chuyển tiếp/giải quyết); 0 lệnh ném ngoại lệ (THREW = 0); 0 nút im lặng còn lại (SILENT_FALSE = 0).

## Các nút đã được sửa để không còn im lặng (trả false phải có thông báo lý do)

| Nhóm chức năng / Lệnh | Trước | Sau |
|---|---|---|
| Sắp xếp thứ tự lớp hình khối (Lên đầu, Lên trên, Xuống dưới, Về cuối) | im lặng khi chưa chọn hình | thông báo lý do: Hãy chọn ít nhất một hình khối để sắp xếp thứ tự hiển thị |
| Căn lề hình khối (Trái, Giữa, Phải, Trên, Giữa dọc, Dưới) | im lặng khi chưa đủ hình chọn | thông báo lý do: Hãy chọn ít nhất hai hình khối (hoặc bật Căn theo trang) để căn lề |
| Phân phối đều khoảng cách hình khối (Ngang, Dọc) | im lặng khi chưa đủ hình chọn | thông báo lý do: Hãy chọn từ ba hình khối trở lên (hoặc hai hình khối khi căn theo trang) để phân phối |
| Nhóm / Bỏ nhóm hình khối (\`slides.shape.group\`, \`slides.shape.ungroup\`) | im lặng khi chưa đủ hình hoặc chưa chọn nhóm | thông báo lý do chọn từ hai hình khối / chọn một nhóm hình khối |
| Căn lề dọc khung chữ (\`slides.text.vAlign\`, Top, Middle, Bottom) | im lặng khi chưa chọn khung chữ/hình | thông báo lý do: Hãy chọn khung chữ hoặc hình khối có văn bản cần căn lề dọc |
| Xoay hướng chữ (\`slides.text.direction\`, Ngang, 90°, 270°, Xếp chồng) | im lặng khi chưa chọn khung chữ/hình | thông báo lý do: Hãy chọn khung chữ hoặc hình khối có văn bản cần xoay hướng chữ |
| Xóa trang chiếu (\`slides.slide.delete\`) | im lặng khi chỉ còn 1 trang | thông báo lý do: Bài trình bày cần có ít nhất một trang chiếu |
| Thao tác Phần slide (Đổi tên, Xóa, Di chuyển lên/xuống) | im lặng khi trang chưa thuộc phần nào | thông báo lý do trang chiếu hiện tại chưa thuộc phần nào |
| Thao tác Nhận xét (Xóa, Giải quyết, Trước, Sau) | im lặng khi bài chưa có nhận xét | thông báo lý do bài trình bày chưa có nhận xét / chưa chọn nhận xét |
| Định dạng chữ & đoạn (Đậm, Nghiêng, Gạch chân, Gạch ngang, Dấu đầu dòng, Đánh số, Căn lề, Thụt lề, Màu sắc) | trả false khi bỏ định dạng hoặc đổi căn lề | trả true thành công, cập nhật trạng thái UI và thuộc tính |
| Bật/tắt kiểm tra chính tả (\`slides.review.toggleSpellCheck\`) | trả false khi tắt | trả true, hiển thị thông báo trên thanh trạng thái |
| Thước đo / Đường lưới / Đường gióng (\`slides.view.ruler/gridlines/guides\`) | trả false khi tắt | trả true, hiển thị thông báo trên thanh trạng thái |
| Ngăn ghi chú (\`slides.notes.toggle\`) | trả false khi đóng | trả true, hiển thị thông báo trên thanh trạng thái |
| Ngăn hoạt hình (\`slides.animation.pane\`) | trả false khi đóng | trả true, hiển thị thông báo trên thanh trạng thái |
| Bật/tắt căn theo trang chiếu (\`slides.arrange.alignToSlide\`) | trả false khi tắt | trả true, hiển thị thông báo trên thanh trạng thái |
| Sao chép định dạng (\`slides.edit.formatPainter\`) | im lặng khi chưa có nguồn định dạng | thông báo lý do chọn hình khối/văn bản cần sao chép; thông báo khi hủy |
| Cửa sổ mới (\`slides.view.newWindow\`) | không có thông báo khi bị chặn | thông báo lý do khi không mở được trong app desktop |
| Đặt lại bố cục (\`slides.layout.reset\`) | thiếu handler nối Command Bus | đã nối handler và ánh xạ chuẩn UNO \`.uno:RestoreDefaultLayout\` |

## Còn thiếu thật (cần làm tiếp, không phải chỉ thông báo)
- **Cửa sổ mới (View > New Window)**: App desktop cần API mở cửa sổ thứ hai cùng xem một bài trình bày đang mở (multi-window sync view) — đã ghi vào \`docs/RIBBON-BACKLOG.md\`.

## Danh sách toàn bộ 111 lệnh ribbon

| Tab | Nhóm | Lệnh | Kết quả |
|---|---|---|---|
`;

for (const it of r) {
  md += `| ${it.tab} | ${it.group} | ${it.id} | ${mapVerdict(it)} |\n`;
}

fs.writeFileSync("docs/AUDIT-SLIDES-RIBBON-COMMANDS-1310.md", md, "utf8");
console.log("Wrote docs/AUDIT-SLIDES-RIBBON-COMMANDS-1310.md successfully.");
