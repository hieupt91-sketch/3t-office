/** Lightweight Sheet style data shared by the grid and its lazy style dialogs. */
export const CELL_STYLE_PRESETS = [
  {
    id: "normal",
    nameKey: "sheetStyles.normal",
    defaultName: "Bình thường (Normal)",
    style: {
      backgroundColor: "",
      color: "#0f172a",
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      border: "",
      borderTop: "",
      borderBottom: "",
      fontSize: "13px"
    },
    previewText: "Normal (Mặc định)",
    description: "Định dạng ô mặc định, xóa mọi màu và hiệu ứng"
  },
  {
    id: "good",
    nameKey: "sheetStyles.good",
    defaultName: "Tốt (Good)",
    style: {
      backgroundColor: "#c6efce",
      color: "#006100",
      fontWeight: "normal",
      border: "1px solid #86efac"
    },
    previewText: "Tốt / Đạt (100%)",
    description: "Nền xanh lá nhạt, chữ xanh lá đậm — dùng cho chỉ số tốt"
  },
  {
    id: "bad",
    nameKey: "sheetStyles.bad",
    defaultName: "Kém / Xấu (Bad)",
    style: {
      backgroundColor: "#ffc7ce",
      color: "#9c0006",
      fontWeight: "normal",
      border: "1px solid #fca5a5"
    },
    previewText: "Cảnh báo / Kém",
    description: "Nền đỏ nhạt, chữ đỏ sẫm — dùng cho số liệu cảnh báo, sụt giảm"
  },
  {
    id: "neutral",
    nameKey: "sheetStyles.neutral",
    defaultName: "Trung tính (Neutral)",
    style: {
      backgroundColor: "#ffeb9c",
      color: "#9c6500",
      fontWeight: "normal",
      border: "1px solid #fde047"
    },
    previewText: "Chờ xử lý / Đang xem xét",
    description: "Nền vàng kem nhạt, chữ nâu vàng đậm — dùng cho số liệu trung tính"
  },
  {
    id: "heading1",
    nameKey: "sheetStyles.heading1",
    defaultName: "Tiêu đề 1 (Heading 1)",
    style: {
      color: "#1e3a8a",
      fontWeight: "bold",
      fontSize: "16px",
      borderBottom: "2px solid #1e3a8a",
      backgroundColor: ""
    },
    previewText: "Tiêu đề lớn cấp 1",
    description: "Chữ lớn 16px in đậm màu xanh đậm, có gạch chân dày"
  },
  {
    id: "heading2",
    nameKey: "sheetStyles.heading2",
    defaultName: "Tiêu đề 2 (Heading 2)",
    style: {
      color: "#1e3a8a",
      fontWeight: "bold",
      fontSize: "14px",
      borderBottom: "1px solid #1e3a8a",
      backgroundColor: ""
    },
    previewText: "Tiêu đề mục cấp 2",
    description: "Chữ vừa 14px in đậm có viền dưới"
  },
  {
    id: "input",
    nameKey: "sheetStyles.input",
    defaultName: "Ô nhập liệu (Input)",
    style: {
      backgroundColor: "#fff2cc",
      color: "#3f3f76",
      fontWeight: "normal",
      border: "1px solid #94a3b8"
    },
    previewText: "Nhập dữ liệu vào đây",
    description: "Nền vàng kem viền xám mỏng — đánh dấu ô để người dùng nhập"
  },
  {
    id: "currency",
    nameKey: "sheetStyles.currency",
    defaultName: "Tiền tệ (Currency)",
    style: {
      fontWeight: "normal",
      textAlign: "right",
      backgroundColor: "#f8fafc"
    },
    numberFormat: {
      category: "currency",
      decimals: 0,
      currencySymbol: "₫",
      symbolPosition: "after"
    },
    previewText: "1.250.000 ₫",
    description: "Định dạng số tiền chuẩn VNĐ kèm nền nhẹ"
  },
  {
    id: "total",
    nameKey: "sheetStyles.total",
    defaultName: "Tổng cộng (Total)",
    style: {
      fontWeight: "bold",
      color: "#0f172a",
      borderTop: "1px solid #0f172a",
      borderBottom: "3px double #0f172a",
      backgroundColor: ""
    },
    previewText: "Tổng cộng: 15.800.000",
    description: "Chữ đậm, viền trên nét đơn, viền dưới nét đôi kế toán"
  },
  {
    id: "accent",
    nameKey: "sheetStyles.accent",
    defaultName: "Điểm nhấn (Accent)",
    style: {
      backgroundColor: "#dbeafe",
      color: "#1e40af",
      fontWeight: "bold",
      border: "1px solid #93c5fd"
    },
    previewText: "Nổi bật quan trọng",
    description: "Nền xanh lam nhạt, chữ xanh dương đậm nổi bật"
  }
];

export const TABLE_STYLE_PRESETS = [
  {
    id: "tableBlue",
    nameKey: "sheetTableStyles.blue",
    defaultName: "Bảng Xanh Lam (Blue)",
    primaryColor: "#2563eb",
    headerStyle: {
      backgroundColor: "#2563eb",
      color: "#ffffff",
      fontWeight: "bold",
      border: "1px solid #1d4ed8"
    },
    evenRowStyle: {
      backgroundColor: "#f0f7ff",
      color: "#0f172a",
      border: "1px solid #cbd5e1"
    },
    oddRowStyle: {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      border: "1px solid #cbd5e1"
    }
  },
  {
    id: "tableGreen",
    nameKey: "sheetTableStyles.green",
    defaultName: "Bảng Xanh Lá (Green)",
    primaryColor: "#16a34a",
    headerStyle: {
      backgroundColor: "#16a34a",
      color: "#ffffff",
      fontWeight: "bold",
      border: "1px solid #15803d"
    },
    evenRowStyle: {
      backgroundColor: "#f0fdf4",
      color: "#0f172a",
      border: "1px solid #bbf7d0"
    },
    oddRowStyle: {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      border: "1px solid #bbf7d0"
    }
  },
  {
    id: "tableDark",
    nameKey: "sheetTableStyles.dark",
    defaultName: "Bảng Xám Đậm (Dark Slate)",
    primaryColor: "#334155",
    headerStyle: {
      backgroundColor: "#334155",
      color: "#ffffff",
      fontWeight: "bold",
      border: "1px solid #1e293b"
    },
    evenRowStyle: {
      backgroundColor: "#f8fafc",
      color: "#0f172a",
      border: "1px solid #e2e8f0"
    },
    oddRowStyle: {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      border: "1px solid #e2e8f0"
    }
  },
  {
    id: "tableOrange",
    nameKey: "sheetTableStyles.orange",
    defaultName: "Bảng Cam Ấm (Warm Orange)",
    primaryColor: "#ea580c",
    headerStyle: {
      backgroundColor: "#ea580c",
      color: "#ffffff",
      fontWeight: "bold",
      border: "1px solid #c2410c"
    },
    evenRowStyle: {
      backgroundColor: "#fff7ed",
      color: "#0f172a",
      border: "1px solid #fed7aa"
    },
    oddRowStyle: {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      border: "1px solid #fed7aa"
    }
  },
  {
    id: "tablePurple",
    nameKey: "sheetTableStyles.purple",
    defaultName: "Bảng Tím Hiện Đại (Purple)",
    primaryColor: "#7c3aed",
    headerStyle: {
      backgroundColor: "#7c3aed",
      color: "#ffffff",
      fontWeight: "bold",
      border: "1px solid #6d28d9"
    },
    evenRowStyle: {
      backgroundColor: "#f5f3ff",
      color: "#0f172a",
      border: "1px solid #ddd6fe"
    },
    oddRowStyle: {
      backgroundColor: "#ffffff",
      color: "#0f172a",
      border: "1px solid #ddd6fe"
    }
  }
];

