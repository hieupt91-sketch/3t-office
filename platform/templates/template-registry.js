/**
 * 3T Office Platform — Template Registry
 * Danh mục và nội dung mẫu tài liệu tiêu chuẩn thuần Việt
 * Tuân thủ 01-architecture/ARCHITECTURE.md & 03-ui-ux/VIETNAMESE-I18N.md
 */

export const OFFICE_TEMPLATES = [
  {
    id: "blank",
    title: "Tài liệu trống",
    desc: "Khởi tạo trang trắng cho ứng dụng hiện tại",
    app: "current",
    badge: null,
    icon: "📄",
    borderColor: "var(--vno-border-default)"
  },
  {
    id: "admin_doc",
    title: "Văn bản hành chính",
    desc: "Chuẩn NĐ 30/2020/NĐ-CP",
    app: "writer",
    badge: "Chuẩn Quốc Gia",
    icon: "🏛️",
    borderColor: "var(--vno-writer-primary)"
  },
  {
    id: "budget_estimate",
    title: "Dự toán kinh phí",
    desc: "Bảng tính công thức VNĐ",
    app: "sheet",
    badge: "Công thức tự động",
    icon: "📊",
    borderColor: "var(--vno-sheet-primary)"
  },
  {
    id: "presentation_outline",
    title: "Đề cương thuyết trình",
    desc: "Trang chiếu ngang 16:9",
    app: "slides",
    badge: null,
    icon: "📽️",
    borderColor: "var(--vno-slides-primary)"
  }
];

export function getTemplateById(id) {
  return OFFICE_TEMPLATES.find(t => t.id === id) || null;
}
