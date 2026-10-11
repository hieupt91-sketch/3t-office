/** Vietnamese guidance for launching each app from the installed Windows shortcuts. */

const apps = [
  { app: "writer", name: "Doc", kind: "soạn thảo văn bản" },
  { app: "sheet", name: "Sheet", kind: "bảng tính" },
  { app: "slides", name: "Slide", kind: "bản trình chiếu" }
];

export const LAUNCHER_HELP_ENTRIES = apps.map(({ app, name, kind }) => ({
  id: `${app}.app.launcher`,
  app,
  commandIds: [],
  title: `Mở ${name} từ lối tắt`,
  summary: `Mở ${kind} bằng lối tắt ${name} trong thư mục Start Menu > 3T Office hoặc trên Màn hình nền. Tra cứu mục này ở tab Trợ giúp hoặc nhấn F1.`,
  ribbon: { tab: "Trợ giúp", tabId: "help", group: "Khởi động ứng dụng" },
  keywords: ["mở ứng dụng", "khởi động", "lối tắt", "shortcut", "Start Menu", "Màn hình nền", name.toLowerCase()],
  steps: [
    "Mở tab Trợ giúp rồi nhấn Trợ giúp hoặc F1 để tra cứu hướng dẫn này.",
    `Mở Start Menu của Windows, vào thư mục 3T Office rồi chọn ${name}. Lối tắt này mở ${name}.`,
    `Nếu đã chọn tạo lối tắt trên Màn hình nền khi cài đặt, nhấp đúp ${name} trên Màn hình nền để mở ứng dụng.`,
    "Để mở một tài liệu có sẵn, chọn Tệp > Mở tệp hoặc nhấn Ctrl+O trong ứng dụng."
  ]
}));
