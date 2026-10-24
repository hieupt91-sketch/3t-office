/**
 * Trợ giúp tiếng Việt: phím tắt và thao tác chuột trên macOS (KEYS-1: MAC-4/5/10/14).
 * Bảng phím sinh trực tiếp từ `platform/commands/keymap-macos.js` để Trợ giúp luôn khớp hành vi.
 * Cột nguồn chỉ nằm trong tài liệu docs/macos, không đưa vào Trợ giúp.
 */
import { MACOS_KEYMAP, MACOS_SHORTCUTS, MACOS_RESERVED_SHORTCUTS } from "../commands/keymap-macos.js";

const byCommand = Object.fromEntries(MACOS_SHORTCUTS.map((entry) => [entry.commandId, entry.macos]));

/** Ghi chú có tham chiếu nguồn tài liệu (chỉ dành cho docs) thì không đưa vào Trợ giúp. */
function helpNote(note) {
  if (!note || /Office|HIG|xác minh/i.test(note)) return "";
  return ` ${note}`;
}

/** Gộp các dòng cùng lệnh (vd Lưu thành: F12 và Ctrl+Shift+S) thành một dòng Trợ giúp. */
function rowsForScope(scope) {
  const grouped = new Map();
  for (const row of MACOS_KEYMAP) {
    if (row.scope !== scope) continue;
    const item = grouped.get(row.commandId) || { task: row.task, macos: [], windows: [], notes: [] };
    for (const combo of row.macos) if (!item.macos.includes(combo)) item.macos.push(combo);
    if (!item.windows.includes(row.windows)) item.windows.push(row.windows);
    const note = helpNote(row.note).trim();
    if (note && !item.notes.includes(note)) item.notes.push(note);
    grouped.set(row.commandId, item);
  }
  return [...grouped.values()].map((item) => {
    const mac = item.macos.length ? item.macos.join(" hoặc ") : "không gán phím trên Mac";
    const notes = item.notes.length ? ` (${item.notes.join(" ")})` : "";
    return `${item.task}: Mac ${mac} — Windows ${item.windows.join(" / ")}.${notes}`;
  });
}

const reservedList = MACOS_RESERVED_SHORTCUTS
  .filter((item) => /^(Cmd\+H|Cmd\+M|Cmd\+Q|Cmd\+,|Cmd\+Space|Ctrl\+Space|Cmd\+`|Cmd\+Option\+D|Cmd\+Shift\+[345]|F11)$/.test(item.combo))
  .map((item) => `${item.combo} (${item.owner})`)
  .join(", ");

export const MACOS_SHORTCUT_HELP_ENTRIES = [
  {
    id: "common.help.macosShortcuts",
    app: "common",
    commandIds: MACOS_SHORTCUTS.map((entry) => entry.commandId),
    title: "Bảng phím tắt trên macOS",
    summary: "Trên máy Mac, phím Command (Cmd, ⌘) thay cho Ctrl trong hầu hết tổ hợp, Option (⌥) thay cho Alt. Một số lệnh dùng phím Control (⌃) hoặc tổ hợp khác vì tổ hợp Windows trùng phím hệ thống macOS. Lệnh chỉ chạy trong đúng ứng dụng đang mở (Doc, Sheet hoặc Slide).",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt" },
    keywords: ["macos", "mac", "cmd", "command", "option", "control", "phím tắt", "tiêu đề", "bộ lọc", "ngăn chọn", "theo dõi thay đổi", "fn"],
    steps: [
      `Doc — Tiêu đề: ${byCommand["writer.style.heading1"]}, ${byCommand["writer.style.heading2"]}, ${byCommand["writer.style.heading3"]} áp dụng lần lượt Tiêu đề 1, 2 và 3 cho đoạn đang đặt con trỏ.`,
      `Doc — Danh sách: ${byCommand["writer.list.bullet"]} bật hoặc tắt dấu đầu dòng cho đoạn đang chọn.`,
      `Doc — Xem lại: ${byCommand["writer.trackChanges.toggle"]} bật hoặc tắt Theo dõi thay đổi; nội dung thêm/xóa tiếp theo sẽ được đánh dấu.`,
      `Sheet — Dữ liệu: ${byCommand["sheet.data.filter"]} bật hoặc tắt bộ lọc ở hàng tiêu đề của vùng dữ liệu hiện tại. Cùng tổ hợp này trong Doc chỉ điều khiển dấu đầu dòng.`,
      `Slide — Chỉnh sửa: ${byCommand["slides.edit.selectionPane"]} mở hoặc đóng Ngăn chọn. Trên bàn phím Mac có hàng phím chức năng, giữ thêm Fn để gửi F10 (hoặc bật «Dùng F1, F2… làm phím chức năng tiêu chuẩn» trong Cài đặt hệ thống > Bàn phím).`,
      `3T Office không bao giờ chiếm phím hệ thống macOS: ${reservedList}. Ví dụ Thay thế dùng Control+H vì Cmd+H là Ẩn ứng dụng; Tăng thụt lề trong Doc dùng Control+Shift+M và Thêm trang chiếu trong Slide dùng Cmd+Shift+N vì Cmd+M là Thu nhỏ cửa sổ.`,
      "Bảng đầy đủ theo từng ứng dụng nằm ở các bài «Phím tắt macOS — chung», «— Doc», «— Sheet», «— Slide» trong Trợ giúp (gõ «mac» vào ô tìm kiếm của ngăn Trợ giúp).",
      "Các phím tắt chỉ tác động trong cửa sổ 3T Office đang được chọn. Nếu một tiện ích khác đã chiếm tổ hợp, hãy tắt xung đột đó trong Cài đặt hệ thống > Bàn phím > Phím tắt bàn phím."
    ]
  },
  {
    id: "common.help.macosShortcutsCommon",
    app: "common",
    commandIds: [],
    title: "Phím tắt macOS — chung cho Doc, Sheet, Slide",
    summary: "Danh sách lệnh dùng chung (Tệp, Chỉnh sửa, Xem, Trợ lý AI, Macro) với tổ hợp trên Mac và tổ hợp tương ứng trên Windows. Đọc theo dạng: tác vụ: Mac … — Windows ….",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt" },
    keywords: ["macos", "mac", "cmd", "phím tắt chung", "lưu", "in", "hoàn tác", "dán văn bản thuần", "toàn màn hình"],
    steps: rowsForScope("common")
  },
  {
    id: "writer.help.macosShortcuts",
    app: "writer",
    commandIds: [],
    title: "Phím tắt macOS — Doc",
    summary: "Danh sách phím tắt soạn thảo văn bản trong Doc trên Mac: định dạng chữ, đoạn, kiểu tiêu đề, dàn ý, tham chiếu và xem lại, kèm tổ hợp tương ứng trên Windows.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt" },
    keywords: ["macos", "mac", "cmd", "doc", "phím tắt văn bản", "tiêu đề", "thụt lề", "dàn ý", "chú thích"],
    steps: rowsForScope("writer")
  },
  {
    id: "sheet.help.macosShortcuts",
    app: "sheet",
    commandIds: [],
    title: "Phím tắt macOS — Sheet",
    summary: "Danh sách phím tắt bảng tính trong Sheet trên Mac: định dạng số, công thức, chèn ngày giờ, bộ lọc, điền và di chuyển, kèm tổ hợp tương ứng trên Windows. Cmd+mũi tên nhảy tới ranh giới vùng dữ liệu (Ctrl+mũi tên trên Windows).",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt" },
    keywords: ["macos", "mac", "cmd", "sheet", "phím tắt bảng tính", "định dạng số", "công thức", "bộ lọc", "điền xuống"],
    steps: [
      ...rowsForScope("sheet"),
      "Di chuyển trong lưới: Cmd+mũi tên tới ô cuối của vùng dữ liệu, Cmd+Shift+mũi tên mở rộng vùng chọn tới đó (Windows: Ctrl+mũi tên). Control+mũi tên được macOS dành cho Mission Control."
    ]
  },
  {
    id: "slides.help.macosShortcuts",
    app: "slides",
    commandIds: [],
    title: "Phím tắt macOS — Slide",
    summary: "Danh sách phím tắt trình chiếu trong Slide trên Mac: thêm/nhân đôi trang, trình chiếu, nhóm đối tượng, căn lề và Ngăn chọn, kèm tổ hợp tương ứng trên Windows.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt" },
    keywords: ["macos", "mac", "cmd", "slide", "phím tắt trình chiếu", "trang chiếu mới", "trình chiếu", "nhóm"],
    steps: rowsForScope("slides")
  },
  {
    id: "common.help.macosMouse",
    app: "common",
    commandIds: [],
    title: "Chuột và bàn di chuột trên macOS: menu ngữ cảnh, chọn thêm, kéo sao chép",
    summary: "Trên Mac, Control+nhấp hoặc nhấp/chạm hai ngón trên bàn di chuột mở menu ngữ cảnh giống nhấp chuột phải; Cmd+nhấp chọn thêm; Option+kéo sao chép; Shift+kéo chèn.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt" },
    keywords: ["macos", "mac", "control nhấp", "ctrl click", "chạm hai ngón", "chuột phải", "menu ngữ cảnh", "cmd nhấp", "option kéo", "sao chép bằng chuột", "nhóm trang tính"],
    steps: [
      "Mở menu ngữ cảnh: giữ Control (⌃) rồi nhấp, hoặc nhấp/chạm bằng hai ngón trên bàn di chuột (bật «Nhấp phụ» trong Cài đặt hệ thống > Bàn di chuột). Dùng được ở ô, tiêu đề hàng/cột và thẻ trang tính của Sheet, ở hình, ảnh, hộp văn bản của Doc/Sheet/Slide và ở nút trên Ribbon/thanh truy nhanh. Control+nhấp chỉ mở menu, không chọn thêm ô hay nhóm trang tính.",
      "Bằng bàn phím: chọn đối tượng rồi nhấn Shift+F10 (giữ thêm Fn nếu cần). Trên thanh truy nhanh, dùng Tab tới nút rồi nhấn Shift+F10 để mở menu Xóa khỏi thanh / Đặt lại mặc định.",
      "Chọn thêm vùng rời trong Sheet hoặc nhiều đối tượng: giữ Command (⌘) rồi nhấp (Windows: Ctrl+nhấp). Nhóm trang tính: giữ Command rồi nhấp từng thẻ trang tính; Shift+nhấp chọn dải thẻ liền nhau.",
      "Kéo-thả sao chép: trong Sheet kéo viền vùng chọn hoặc chốt điền, trong Doc kéo đoạn chữ đã chọn — giữ Option (⌥) trong lúc kéo để SAO CHÉP thay vì di chuyển (Windows: Ctrl). Con trỏ hiện dấu cộng khi đang ở chế độ sao chép.",
      "Kéo-thả chèn trong Sheet: giữ Shift khi kéo viền để chèn vùng vào giữa, đẩy ô cũ sang (giống Windows); giữ Option+Shift để chèn một bản sao. Cmd+Z hoàn tác mọi thao tác kéo-thả."
    ]
  },
  {
    id: "common.help.macosKeyboardAccess",
    app: "common",
    commandIds: [],
    title: "KeyTips, Trợ giúp F1 và thanh truy nhanh bằng bàn phím trên macOS",
    summary: "Trên Mac, nhấn F10 (Fn+F10) để hiện KeyTips trên Ribbon; nhấn F1 (Fn+F1) hoặc Cmd+? để mở Trợ giúp; phím Option đơn không bật KeyTips vì Option dùng để gõ ký tự đặc biệt.",
    ribbon: { tab: "Trợ giúp", tabId: "help", group: "Phím tắt" },
    keywords: ["macos", "mac", "keytips", "f10", "fn", "f1", "trợ giúp", "cmd+?", "thanh truy nhanh", "tab", "điều hướng bàn phím"],
    steps: [
      "KeyTips: nhấn F10 (trên bàn phím Mac: Fn+F10) — các chữ cái hiện trên tab Ribbon; nhấn chữ của tab (ví dụ D cho Trang đầu) rồi chữ của nút để chạy lệnh; Esc lùi một cấp. Bấm-thả Option đơn không bật KeyTips trên Mac (Option dùng gõ ký tự như «ƒ», «∆»).",
      "Trợ giúp theo ngữ cảnh: nhấn F1 (Fn+F1) hoặc Cmd+? (Cmd+Shift+/) — ngăn Trợ giúp mở đúng bài của nút hoặc vùng đang chọn. Cũng có thể mở tab Trợ giúp trên Ribbon.",
      "Phím F1–F12 trên Mac mặc định điều khiển độ sáng, âm lượng… Muốn dùng F1–F12 trực tiếp, bật «Dùng F1, F2, v.v. làm phím chức năng tiêu chuẩn» trong Cài đặt hệ thống > Bàn phím; nếu không, giữ Fn khi bấm.",
      "Thanh truy nhanh và Ribbon: nhấn Tab/Shift+Tab để di chuyển giữa các nút, vòng sáng quanh nút cho biết vị trí đang chọn; Enter hoặc Space để bấm. Nếu Tab bỏ qua nút, bật «Điều hướng bàn phím» trong Cài đặt hệ thống > Bàn phím.",
      "Thu gọn/mở rộng Ribbon: Cmd+Option+R (Windows: Ctrl+F1, trên Mac Control+F1 thuộc về hệ thống)."
    ]
  }
];
