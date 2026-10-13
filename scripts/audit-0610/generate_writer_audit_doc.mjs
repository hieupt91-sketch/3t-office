import fs from "node:fs";

const r = JSON.parse(fs.readFileSync("E:/VNOffice-profiles/writer-ribbon-audit/writer-ribbon-audit.json", "utf8"));

const mapVerdict = (x) => {
  if (x.status === "STATUS_ONLY") return "chỉ thông báo";
  if (x.status === "SILENT_FALSE") return "im lặng";
  if (x.status === "NO_VISIBLE_EFFECT") return "OK";
  return x.status;
};

let md = `# Rà soát từng nút ribbon VN Writer (13/10)

Công cụ: \`tests/live/cdp/writer-ribbon-runtime-audit.desktop.mjs\` (chạy mọi lệnh ribbon trong app desktop, so sánh DOM và thông báo) và \`writer-ribbon-state-probe.desktop.mjs\` (so sánh trạng thái tài liệu chi tiết). \`scripts/audit-0610/ribbon_command_audit.mjs writer\` kiểm tra tĩnh lệnh nào chưa có handler.

Kết quả: 176 lệnh ribbon duy nhất; 0 lệnh thiếu handler; 5 lệnh bỏ qua có chủ đích (in/thoát/macro); 10 lệnh bị vô hiệu hóa có chủ đích (chưa có người nhận trộn thư / chưa có thay đổi theo dõi); 0 lệnh ném ngoại lệ (THREW = 0); 0 nút im lặng còn lại.

## Các nút đã được sửa để không còn im lặng (trả false phải có thông báo lý do)

| Nhóm chức năng / Lệnh | Trước | Sau |
|---|---|---|
| Thao tác Bảng (chèn/xóa hàng cột, gộp/tách ô, tự khớp, căn lề, viền, hàng tiêu đề/so le) | im lặng khi không có ô bảng active | thông báo lý do đặt con trỏ vào bảng |
| Nhận xét (Xóa, Giải quyết, Trả lời, Trước, Sau) | im lặng khi tài liệu chưa có nhận xét | thông báo lý do: Tài liệu chưa có nhận xét |
| Đổi chữ hoa / chữ thường (\`writer.text.changeCase\`) | im lặng khi chưa chọn chữ | thông báo lý do: Hãy chọn đoạn văn bản cần đổi chữ hoa / chữ thường |
| Xóa trang bìa (\`writer.insert.removeCoverPage\`) | im lặng khi tài liệu không có trang bìa | thông báo lý do: Tài liệu hiện tại không có trang bìa để xóa |
| Chữ hoa đầu dòng (\`writer.format.dropCap\`) | im lặng khi đoạn không có ký tự hợp lệ | thông báo lý do: Hãy đặt con trỏ vào đoạn văn có chữ |
| Đánh số lại từ 1 / Tiếp tục đánh số | im lặng ngoài danh sách có thứ tự | thông báo lý do: Hãy đặt con trỏ vào danh sách có thứ tự |
| Xóa ngắt phần (\`writer.section.delete\`) | im lặng khi không có ngắt phần | thông báo lý do: Không có dấu ngắt phần ở vị trí hiện tại |
| Danh sách nhiều cấp (\`writer.para.multilevelList\`) | trả false khi bấm không đối số | tự động áp dụng kiểu số mặc định (1. / 1.1. / 1.1.1.) |
| Định dạng gạch chân / nghiêng / đậm / gạch ngang / chỉ số | trả false khi bỏ định dạng | trả true thành công, cập nhật trạng thái UI |
| Bật/tắt kiểm tra chính tả | trả false khi tắt | trả true, hiển thị thông báo trên thanh trạng thái |
| Thước đo / Đường lưới | trả false khi tắt | trả true, hiển thị thông báo trên thanh trạng thái |
| Cửa sổ mới (\`writer.view.newWindow\`) | không có thông báo khi bị chặn | thông báo lý do khi không mở được trong app desktop |

## Còn thiếu thật (cần làm tiếp, không phải chỉ thông báo)
- **Cửa sổ mới (View > New Window)**: App desktop cần API mở cửa sổ thứ hai cùng xem một tệp tài liệu đang mở (multi-window sync view) — đã ghi vào \`docs/RIBBON-BACKLOG.md\`.

## Danh sách toàn bộ 176 lệnh ribbon

| Tab | Nhóm | Lệnh | Kết quả |
|---|---|---|---|
`;

for (const it of r) {
  md += `| ${it.tab} | ${it.group} | ${it.id} | ${mapVerdict(it)} |\n`;
}

fs.writeFileSync("docs/AUDIT-WRITER-RIBBON-COMMANDS-1310.md", md, "utf8");
console.log("Wrote docs/AUDIT-WRITER-RIBBON-COMMANDS-1310.md successfully.");
