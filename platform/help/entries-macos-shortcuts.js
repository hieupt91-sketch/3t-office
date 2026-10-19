import { MACOS_SHORTCUTS } from "../commands/keymap-macos.js";

const byCommand = Object.fromEntries(MACOS_SHORTCUTS.map((entry) => [entry.commandId, entry.macos]));

export const MACOS_SHORTCUT_HELP_ENTRIES = [
  {
    id: "common.help.macosShortcuts",
    app: "common",
    commandIds: MACOS_SHORTCUTS.map((entry) => entry.commandId),
    title: "Bảng phím tắt trên macOS",
    summary: "Trên máy Mac, dùng phím Command (Cmd) thay cho Ctrl và Option thay cho Alt trong các tổ hợp dưới đây. Lệnh chỉ chạy trong đúng ứng dụng đang mở.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt" },
    keywords: ["macos", "mac", "cmd", "command", "option", "phím tắt", "tiêu đề", "bộ lọc", "ngăn chọn", "theo dõi thay đổi"],
    steps: [
      `Doc — Tiêu đề: ${byCommand["writer.style.heading1"]}, ${byCommand["writer.style.heading2"]}, ${byCommand["writer.style.heading3"]} áp dụng lần lượt Tiêu đề 1, 2 và 3 cho đoạn đang đặt con trỏ.`,
      `Doc — Danh sách: ${byCommand["writer.list.bullet"]} bật hoặc tắt dấu đầu dòng cho đoạn đang chọn.`,
      `Doc — Xem lại: ${byCommand["writer.trackChanges.toggle"]} bật hoặc tắt Theo dõi thay đổi; nội dung thêm/xóa tiếp theo sẽ được đánh dấu.`,
      `Sheet — Dữ liệu: ${byCommand["sheet.data.filter"]} bật hoặc tắt bộ lọc ở hàng tiêu đề của vùng dữ liệu hiện tại. Cùng tổ hợp này trong Doc chỉ điều khiển dấu đầu dòng.`,
      `Slide — Chỉnh sửa: ${byCommand["slides.edit.selectionPane"]} mở hoặc đóng Ngăn chọn. Trên bàn phím Mac có hàng phím chức năng, có thể cần giữ thêm Fn để gửi F10.`,
      "Các phím tắt chỉ tác động trong cửa sổ 3T Office đang được chọn. Nếu macOS hoặc tiện ích hệ thống đã chiếm một tổ hợp, hãy tắt xung đột đó trong Cài đặt hệ thống > Bàn phím > Phím tắt bàn phím."
    ]
  }
];
